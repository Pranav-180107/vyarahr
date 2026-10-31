import { masterRouter, resolveEffectiveSlug } from '../lib/supabase';
import { ANNUAL_PRICE, monthlyPrice, normalizeTier, isValidUtr, pickEffectiveSlug, type PlanTier } from '../utils/billing';
import type { CustomerAccount, MembershipPayment, PlatformSettings } from '../types/tenant';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  badge?: string;
  monthlyPrice: number;
  annualTotal: number;
  annualMonthlyPrice: number;
  description: string;
  employeeLimit: string;
  features: string[];
  notIncluded?: string[];
}

const mk = (tier: PlanTier) => ({
  monthlyPrice: monthlyPrice(tier),
  annualTotal: ANNUAL_PRICE[tier],
  annualMonthlyPrice: Math.round(ANNUAL_PRICE[tier] / 12),
});

export const PLATFORM_PLANS: PlanConfig[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    badge: 'Free Evaluation',
    ...mk('trial'),
    description: 'Explore digitized HR and automated workforce operations.',
    employeeLimit: 'Up to 25 Employees',
    features: [
      'Core Employee Directory',
      'Attendance Clock-In & Leaves',
      'Basic Organizational Hierarchy',
      'Sample Payroll Generator'
    ],
    notIncluded: ['Custom Roles & Workflows', 'Priority Support']
  },
  {
    id: 'starter',
    name: 'Starter',
    ...mk('starter'),
    description: 'For small teams getting started with digitized HR and compliance.',
    employeeLimit: 'Up to 25 Employees',
    features: [
      'Up to 25 Employees',
      'Core Dashboard & Live Calendar',
      'Attendance & Leave Management',
      'Expense & Loan Tracking',
      'Standard Email Support'
    ],
    notIncluded: ['AI Auto-shortlisting', 'Custom Audit Logs']
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'MOST POPULAR',
    ...mk('growth'),
    description: 'Everything you need to manage and scale a high-velocity organization.',
    employeeLimit: 'Up to 100 Employees',
    features: [
      'Up to 100 Employees',
      'AI Hiring & Candidate Scoring',
      'Automated Indian Payroll & Tax Slabs',
      'Goal Tracking & Performance Reviews',
      'Multi-department Role Hierarchy',
      'Priority Email & Chat Support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    ...mk('enterprise'),
    description: 'Advanced controls, compliance safeguards and custom infrastructure.',
    employeeLimit: 'Unlimited Employees',
    features: [
      'Unlimited Employees',
      'Dedicated Customer Success Manager',
      'Custom Approval Workflows',
      'Granular Audit Logs & Activity Trails',
      '24/7 Priority SLA Phone Support',
      'Custom Supabase Project Isolation'
    ]
  }
];

export const billingService = {
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

  async getCustomerAccount(slug?: string): Promise<CustomerAccount | null> {
    const effectiveSlug = pickEffectiveSlug(slug, resolveEffectiveSlug());
    if (!effectiveSlug) return null;

    const { data, error } = await masterRouter.rpc('get_tenant_subscription', {
      p_tenant_slug: effectiveSlug
    });

    if (error) {
      console.warn('Error fetching subscription:', error);
      return null;
    }
    if (!data) return null;
    const acc = data as CustomerAccount;
    return { ...acc, plan_tier: normalizeTier(acc.plan_tier) };
  },

  async uploadPaymentProof(file: File, tenantSlug: string): Promise<string> {
    const cleanTenant = (tenantSlug || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'png';
    const filename = `${cleanTenant}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    const { error } = await masterRouter.storage
      .from('membership-proofs')
      .upload(filename, file, { upsert: true });

    if (error) {
      console.error('Proof upload error:', error);
      throw new Error(`Failed to upload payment receipt: ${error.message}`);
    }

    return filename;
  },

  async submitPaymentVerification(payload: {
    tenant_slug: string;
    plan_tier: string;
    billing_cycle: 'monthly' | 'annual';
    amount: number;
    proof_path?: string;
    submitted_by_name: string;
    submitted_by_email: string;
    utr_number: string;
  }): Promise<{ success: boolean; message: string; payment_id?: string }> {
    // Never send 'default' / empty: fall back to the active workspace
    const effectiveSlug = pickEffectiveSlug(payload.tenant_slug, resolveEffectiveSlug());

    const cleanUtr = payload.utr_number?.trim();
    if (!isValidUtr(cleanUtr)) {
      throw new Error('Please enter a valid 12-digit UPI / Bank Reference (UTR) number.');
    }

    const { data, error } = await masterRouter.rpc('submit_membership_payment', {
      p_tenant_slug: effectiveSlug,
      p_plan_tier: payload.plan_tier,
      p_billing_cycle: payload.billing_cycle,
      p_amount: payload.amount,
      p_proof_path: payload.proof_path || '',
      p_name: payload.submitted_by_name,
      p_email: payload.submitted_by_email,
      p_utr_number: cleanUtr
    });

    if (error) throw new Error(error.message || 'Failed to submit payment verification.');

    const res = data as { success?: boolean; error?: string; message?: string; payment_id?: string } | null;
    if (!res || res.success === false) {
      throw new Error(res?.error || 'Payment submission failed.');
    }

    return {
      success: true,
      message: res.message || 'Payment verification submitted successfully.',
      payment_id: res.payment_id
    };
  },

  async getTenantInvoices(tenantSlug?: string): Promise<MembershipPayment[]> {
    const cleanSlug = pickEffectiveSlug(tenantSlug, resolveEffectiveSlug());
    if (!cleanSlug) return [];

    const { data, error } = await masterRouter.rpc('get_tenant_membership_invoices', {
      p_tenant_slug: cleanSlug
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  getInvoiceUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return masterRouter.storage.from('membership-invoices').getPublicUrl(path).data.publicUrl;
  }
};
