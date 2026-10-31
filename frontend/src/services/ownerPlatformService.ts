import { platformDb as masterRouter } from '../lib/supabase';
import type { 
  TenantMapping, 
  CustomerAccount, 
  PlatformOwner, 
  AccessRequest, 
  PlatformSettings, 
  MembershipPayment 
} from '../types/tenant';
import { generateAndUploadInvoice } from '../utils/invoiceGenerator';
import { normalizeTier, type PlanTier } from '../utils/billing';
import { extendDueDate, formatInvoiceNumber, toDateOnly } from '../utils/billing';
import { computeRevenueMetrics, type RevenueMetrics } from '../utils/metrics';

// True when the hardening migration (20261004) has not been applied to the master DB yet.
const isMissingRpc = (err: { code?: string; message?: string } | null): boolean =>
  !!err && (err.code === 'PGRST202' || err.code === '42883' || /could not find the function|does not exist/i.test(err.message || ''));

export const ownerPlatformService = {
  // ==========================================
  // AUTH & OWNER VERIFICATION
  // ==========================================
  async verifyPlatformOwner(email: string): Promise<PlatformOwner | null> {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await masterRouter
      .from('platform_owners')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('Error verifying platform owner:', error);
      return null;
    }
    return data as unknown as PlatformOwner | null;
  },

  async getOwnerEmail(): Promise<string> {
    const { data } = await masterRouter.auth.getSession();
    return data.session?.user?.email || '';
  },

  // membership-proofs is a private bucket; owners view receipts through short-lived signed URLs
  async getProofSignedUrl(path: string): Promise<string> {
    if (path.startsWith('http')) return path;
    const { data, error } = await masterRouter.storage.from('membership-proofs').createSignedUrl(path, 300);
    if (error) throw error;
    return data?.signedUrl || '';
  },

  // ==========================================
  // CUSTOMER CRM & WORKSPACE MANAGEMENT
  // ==========================================
  async getAllCustomers(): Promise<CustomerAccount[]> {
    // Fetch customer accounts and tenant mappings
    const { data: accounts, error: accError } = await masterRouter
      .from('customer_accounts')
      .select('*')
      .order('onboarded_at', { ascending: false });

    if (accError) {
      console.warn('Error fetching customer_accounts:', accError);
    }

    const { data: mappings, error: mapError } = await masterRouter
      .from('tenant_mappings')
      .select('*');

    if (mapError) {
      console.warn('Error fetching tenant_mappings:', mapError);
    }

    const mapDict: Record<string, TenantMapping> = {};
    (mappings || []).forEach((m: any) => {
      mapDict[m.slug] = m;
    });

    // If customer_accounts table is empty or missing entries for tenant_mappings, synthesize records
    const result: CustomerAccount[] = [];
    const seenSlugs = new Set<string>();

    (accounts || []).forEach((acc: any) => {
      seenSlugs.add(acc.tenant_slug);
      result.push({
        ...acc,
        plan_tier: normalizeTier(acc.plan_tier),
        tenant: mapDict[acc.tenant_slug] || {
          slug: acc.tenant_slug,
          company_name: acc.contact_name || acc.tenant_slug,
          supabase_url: '',
          supabase_anon_key: '',
          status: 'active',
          created_at: acc.onboarded_at
        }
      });
    });

    // Add any tenant_mappings that don't have a customer_accounts row yet
    (mappings || []).forEach((m: any) => {
      if (!seenSlugs.has(m.slug)) {
        result.push({
          id: `crm-${m.slug}`,
          tenant_slug: m.slug,
          contact_name: m.company_name,
          contact_email: `admin@${m.slug}.com`,
          plan_tier: 'trial',
          billing_cycle: 'monthly',
          amount: 0,
          payment_status: m.status === 'blocked' ? 'cancelled' : 'trial',
          onboarded_at: m.created_at,
          next_due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          tenant: m
        });
      }
    });

    return result;
  },

  async getCustomerBySlug(slug: string): Promise<CustomerAccount | null> {
    const customers = await this.getAllCustomers();
    return customers.find(c => c.tenant_slug === slug) || null;
  },

  async provisionCustomer(payload: {
    slug: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    admin_password?: string;
    supabase_url?: string;
    supabase_anon_key?: string;
    plan_tier?: PlanTier;
    billing_cycle?: 'monthly' | 'annual';
    amount?: number;
    payment_status?: 'trial' | 'paid' | 'overdue' | 'cancelled';
  }): Promise<CustomerAccount> {
    const cleanSlug = payload.slug.trim().toLowerCase();

    // 1. Provision isolated schema on self-hosted PostgreSQL VPS
    let provisionResult: any = null;
    try {
      const apiUrl = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
      const token = localStorage.getItem('vyara_auth_token');
      const res = await fetch(`${apiUrl}/api/tenant/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
          'x-workspace-slug': cleanSlug
        },
        body: JSON.stringify({
          slug: cleanSlug,
          company_name: payload.company_name,
          admin_name: payload.contact_name,
          admin_email: payload.contact_email,
          phone: payload.contact_phone || '',
          admin_password: payload.admin_password
        })
      });
      provisionResult = await res.json().catch(() => null);
    } catch (provErr) {
      console.warn('Native schema provisioning call:', provErr);
    }

    // 2. Create or update tenant mapping in platform database
    const { error: mapError } = await masterRouter
      .from('tenant_mappings')
      .upsert({
        slug: cleanSlug,
        company_name: payload.company_name,
        schema_name: `tenant_${cleanSlug}`,
        supabase_url: 'self-hosted',
        supabase_anon_key: 'self-hosted',
        status: 'active'
      }, { onConflict: 'slug' });

    if (mapError) throw mapError;

    // 3. Register customer account
    const { data: customer, error: custError } = await masterRouter
      .from('customer_accounts')
      .upsert({
        id: `cust_${cleanSlug}`,
        tenant_slug: cleanSlug,
        contact_name: payload.contact_name,
        contact_email: payload.contact_email,
        contact_phone: payload.contact_phone || '',
        plan_tier: payload.plan_tier || 'growth',
        billing_cycle: payload.billing_cycle || 'monthly',
        amount: payload.amount || 0,
        payment_status: payload.payment_status || 'paid',
        onboarded_at: new Date().toISOString(),
        last_payment_date: new Date().toISOString().split('T')[0],
        next_due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      }, { onConflict: 'tenant_slug' })
      .select()
      .maybeSingle();

    if (custError) {
      console.warn('Customer account registration note:', custError);
    }

    return {
      ...(customer || {}),
      credentials: provisionResult?.credentials,
      provisionResult
    } as any;
  },

  async updateCustomer(slug: string, updates: Partial<CustomerAccount>): Promise<void> {
    const { error } = await masterRouter
      .from('customer_accounts')
      .update(updates)
      .eq('tenant_slug', slug);

    if (error) throw error;
  },

  // ==========================================
  // BLOCK & UNBLOCK WORKSPACE ACTIONS
  // ==========================================
  async blockWorkspace(slug: string): Promise<void> {
    await this.setWorkspaceStatus(slug, 'blocked');
  },

  async unblockWorkspace(slug: string): Promise<void> {
    await this.setWorkspaceStatus(slug, 'active');
  },

  // Atomic in the DB: block -> mapping 'blocked' + payment 'cancelled';
  // active -> mapping 'active' + payment restored to 'paid' (or 'trial').
  async setWorkspaceStatus(slug: string, status: 'active' | 'blocked' | 'suspended' | 'inactive'): Promise<void> {
    const { error } = await masterRouter.rpc('owner_set_workspace_status', {
      p_slug: slug,
      p_status: status
    });
    if (isMissingRpc(error)) {
      // Fallback: direct table updates (pre-migration schema)
      const { error: mapError } = await masterRouter.from('tenant_mappings').update({ status }).eq('slug', slug);
      if (mapError) throw mapError;
      if (status === 'blocked') {
        await masterRouter.from('customer_accounts').update({ payment_status: 'cancelled' }).eq('tenant_slug', slug);
      } else if (status === 'active') {
        const { data: acc } = await masterRouter.from('customer_accounts').select('*').eq('tenant_slug', slug).maybeSingle();
        if (acc && (acc.payment_status === 'cancelled' || acc.payment_status === 'overdue')) {
          const today = toDateOnly(new Date());
          await masterRouter.from('customer_accounts').update({
            payment_status: acc.last_payment_date ? 'paid' : 'trial',
            ...(acc.last_payment_date ? {} : { onboarded_at: new Date().toISOString() }),
            next_due_date: !acc.next_due_date || acc.next_due_date < today
              ? toDateOnly(new Date(Date.now() + 30 * 86400000))
              : acc.next_due_date
          }).eq('tenant_slug', slug);
        }
      }
    } else if (error) {
      throw error;
    }

    // Best-effort mirror to legacy tables
    try {
      await masterRouter.from('tenant_connections').update({ db_status: status === 'active' ? 'active' : 'blocked' }).eq('company_slug', slug);
      await masterRouter.from('organizations').update({
        status: status === 'active' ? 'active' : 'cancelled',
        payment_status: status === 'active' ? 'paid' : 'overdue'
      }).eq('slug', slug);
    } catch (legacyErr) {
      console.warn('Legacy sync bypassed on status change:', legacyErr);
    }
  },

  async removeCustomer(slug: string): Promise<void> {
    const { error } = await masterRouter.rpc('owner_remove_customer', { p_slug: slug });
    if (isMissingRpc(error)) {
      for (const [table, col] of [
        ['membership_payments', 'tenant_slug'],
        ['subscription_expiry_notifications', 'tenant_slug'],
        ['customer_accounts', 'tenant_slug'],
        ['tenant_mappings', 'slug']
      ] as const) {
        const { error: delError } = await masterRouter.from(table).delete().eq(col, slug);
        if (delError) throw delError;
      }
    } else if (error) {
      throw error;
    }

    try {
      await masterRouter.from('tenant_connections').delete().eq('company_slug', slug);
      await masterRouter.from('organizations').delete().eq('slug', slug);
    } catch (legacyErr) {
      console.warn('Legacy cleanup bypassed on remove:', legacyErr);
    }
  },

  // ==========================================
  // ACCESS REQUESTS (INBOUND DEMO / ONBOARDING)
  // ==========================================
  async getAccessRequests(): Promise<AccessRequest[]> {
    const { data, error } = await masterRouter
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching access requests:', error);
      return [];
    }
    return (data as unknown as AccessRequest[]) || [];
  },

  async approveAccessRequest(request: AccessRequest): Promise<void> {
    const generatedSlug = (request.requested_slug || request.company_name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'company';

    // Provision workspace automatically on self-hosted VPS
    await this.provisionCustomer({
      slug: generatedSlug,
      company_name: request.company_name,
      contact_name: request.full_name,
      contact_email: request.email,
      contact_phone: request.phone || ''
    });

    await masterRouter
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', request.id);
  },

  async approveAccessRequestWithPassword(request: AccessRequest, customSlug: string, customPassword: string): Promise<any> {
    const finalSlug = (customSlug || request.requested_slug || request.company_name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'company';

    // Provision workspace automatically on self-hosted VPS with owner-entered custom password
    const result = await this.provisionCustomer({
      slug: finalSlug,
      company_name: request.company_name,
      contact_name: request.full_name,
      contact_email: request.email,
      contact_phone: request.phone || '',
      admin_password: customPassword
    });

    await masterRouter
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    return result;
  },

  async rejectAccessRequest(requestId: string): Promise<void> {
    await masterRouter
      .from('access_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', requestId);
  },

  // ==========================================
  // PAYMENT VERIFICATIONS & INVOICING
  // ==========================================
  async getAllPayments(): Promise<MembershipPayment[]> {
    const { data, error } = await masterRouter
      .from('membership_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching membership payments:', error);
      return [];
    }
    return (data as unknown as MembershipPayment[]) || [];
  },

  async approvePayment(payment: MembershipPayment, reviewedBy: string): Promise<{ invoiceNumber: string; pdfUrl: string }> {
    // 1. Atomic in the DB: status, sequential invoice number, customer paid + due date extension
    let invoiceNumber: string;
    const { data, error } = await masterRouter.rpc('owner_approve_payment', {
      p_payment_id: payment.id,
      p_reviewed_by: reviewedBy
    });
    if (isMissingRpc(error)) {
      invoiceNumber = await this.approvePaymentDirect(payment, reviewedBy);
    } else if (error) {
      throw error;
    } else {
      invoiceNumber = (data as { invoice_number: string }).invoice_number;
    }

    // 2. Generate PDF, upload, and save the path (failure here leaves the approval intact)
    const [settings, customer] = await Promise.all([
      this.getPlatformSettings(),
      this.getCustomerBySlug(payment.tenant_slug)
    ]);
    const { pdfUrl, pdfPath } = await generateAndUploadInvoice({ invoiceNumber, payment, customer, settings });

    const { error: attachError } = await masterRouter.rpc('owner_attach_invoice_pdf', {
      p_payment_id: payment.id,
      p_path: pdfPath
    });
    if (isMissingRpc(attachError)) {
      const { error: updError } = await masterRouter
        .from('membership_payments').update({ invoice_pdf_path: pdfPath }).eq('id', payment.id);
      if (updError) throw updError;
    } else if (attachError) {
      throw attachError;
    }

    return { invoiceNumber, pdfUrl };
  },

  // Pre-migration fallback for approvePayment (client-side; not race-safe for invoice numbers)
  async approvePaymentDirect(payment: MembershipPayment, reviewedBy: string): Promise<string> {
    const now = new Date();
    const prefix = formatInvoiceNumber(now, 0).slice(0, -4);
    const { data: existing } = await masterRouter
      .from('membership_payments')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`);
    const maxSeq = (existing || []).reduce((m: number, r: any) => {
      const n = parseInt(String(r.invoice_number).slice(prefix.length), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const invoiceNumber = formatInvoiceNumber(now, maxSeq + 1);

    const { error: payError } = await masterRouter
      .from('membership_payments')
      .update({ status: 'approved', invoice_number: invoiceNumber, reviewed_at: now.toISOString(), reviewed_by: reviewedBy })
      .eq('id', payment.id)
      .eq('status', 'pending');
    if (payError) throw payError;

    const { data: acc } = await masterRouter.from('customer_accounts').select('*').eq('tenant_slug', payment.tenant_slug).maybeSingle();
    const cycle = payment.billing_cycle === 'annual' ? 'annual' : 'monthly';
    const { error: custError } = await masterRouter
      .from('customer_accounts')
      .update({
        payment_status: 'paid',
        plan_tier: payment.plan_tier,
        billing_cycle: cycle,
        amount: payment.amount,
        last_payment_date: toDateOnly(now),
        next_due_date: extendDueDate(cycle, acc?.next_due_date, acc?.payment_status === 'paid', now)
      })
      .eq('tenant_slug', payment.tenant_slug);
    if (custError) throw custError;
    return invoiceNumber;
  },

  async rejectPayment(paymentId: string, reason: string, reviewedBy: string): Promise<void> {
    const { error } = await masterRouter
      .from('membership_payments')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .eq('id', paymentId);

    if (error) throw error;
  },

  // ==========================================
  // PLATFORM SETTINGS & INDIAN RAILS
  // ==========================================
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data, error } = await masterRouter
      .from('platform_settings')
      .select('*')
      .eq('id', 'global_config')
      .maybeSingle();

    if (error || !data) {
      return {
        id: 'global_config',
        default_trial_days: 14,
        maintenance_mode: false,
        support_email: 'support@vyarahr.com',
        upi_id: 'vyarahr@upi',
        upi_name: 'VyaraHR Technologies Pvt Ltd',
        bank_name: 'HDFC Bank',
        account_name: 'VyaraHR Technologies Private Limited',
        account_number: '50200088991122',
        ifsc_code: 'HDFC0001234',
        branch_name: 'Bangalore MG Road',
        account_type: 'Current Account',
        automated_reminders_enabled: true,
        reminder_days_before_expiry: 7
      };
    }
    return data as unknown as PlatformSettings;
  },

  async updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<void> {
    const { error } = await masterRouter
      .from('platform_settings')
      .upsert({
        id: 'global_config',
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  // ==========================================
  // REVENUE METRICS & ANALYTICS
  // ==========================================
  async getRevenueMetrics(): Promise<RevenueMetrics> {
    const [customers, payments] = await Promise.all([this.getAllCustomers(), this.getAllPayments()]);
    return computeRevenueMetrics(customers, payments);
  },

  // Manual Trigger for Subscription Reminders
  async triggerReminderAudit(): Promise<{ sentCount: number }> {
    const customers = await this.getAllCustomers();
    const settings = await this.getPlatformSettings();
    const reminderDays = settings.reminder_days_before_expiry || 7;

    const now = new Date();
    let sentCount = 0;

    for (const cust of customers) {
      if (cust.next_due_date && cust.payment_status === 'paid') {
        const dueDate = new Date(cust.next_due_date);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= reminderDays && diffDays >= 0) {
          sentCount++;
          await masterRouter
            .from('subscription_expiry_notifications')
            .insert({
              tenant_slug: cust.tenant_slug,
              recipient_email: cust.contact_email || 'admin@company.com',
              plan_tier: cust.plan_tier,
              next_due_date: cust.next_due_date,
              days_remaining: diffDays,
              status: 'sent'
            });
        }
      }
    }

    return { sentCount };
  }
};
