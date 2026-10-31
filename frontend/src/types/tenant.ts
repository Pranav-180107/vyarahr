export interface TenantConnection {
  id: string;
  company_name: string;
  company_slug: string;
  schema_name?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  created_at: string;
}

export interface TenantMapping {
  slug: string;
  company_name: string;
  schema_name?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  status: 'active' | 'blocked' | 'suspended' | 'inactive';
  created_at: string;
}

export interface CustomerAccount {
  id: string;
  tenant_slug: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  plan_tier: 'trial' | 'starter' | 'growth' | 'enterprise';
  billing_cycle: 'monthly' | 'annual';
  amount: number;
  payment_status: 'trial' | 'paid' | 'overdue' | 'cancelled';
  onboarded_at: string;
  last_payment_date?: string;
  next_due_date?: string;
  notes?: string;
  // Join properties
  tenant?: TenantMapping;
}

export interface PlatformOwner {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'owner' | 'finance';
  created_at?: string;
}

export interface AccessRequest {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company_name: string;
  team_size?: string;
  industry?: string;
  preferred_plan?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_slug?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface PlatformSettings {
  id: string;
  default_trial_days: number;
  maintenance_mode: boolean;
  support_email: string;
  upi_id: string;
  upi_name: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  automated_reminders_enabled: boolean;
  reminder_days_before_expiry: number;
  updated_at?: string;
}

export interface MembershipPayment {
  id: string;
  tenant_slug: string;
  plan_tier: string;
  billing_cycle: string;
  amount: number;
  proof_path?: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  status: 'pending' | 'approved' | 'rejected';
  utr_number?: string;
  invoice_number?: string;
  invoice_pdf_path?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface SubscriptionExpiryNotification {
  id: string;
  tenant_slug: string;
  recipient_email: string;
  plan_tier?: string;
  next_due_date?: string;
  days_remaining?: number;
  status: string;
  sent_at: string;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  country?: string;
  timezone?: string;
  currency?: string;
  logo_url?: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'trial' | 'starter' | 'growth' | 'pro' | 'enterprise';
  payment_status: 'paid' | 'unpaid' | 'overdue' | 'trialing';
  supabase_project_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type?: string;
  target_id?: string;
  metadata?: any;
  created_at: string;
}
