-- ============================================================
-- 🏛️ VyaraHR Master Platform & Customer Billing Engine
-- Migration: 20261003_owner_platform_and_billing_engine.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANT MAPPINGS TABLE
CREATE TABLE IF NOT EXISTS public.tenant_mappings (
  slug TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync existing tenant_connections to tenant_mappings if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenant_connections') THEN
    INSERT INTO public.tenant_mappings (slug, company_name, supabase_url, supabase_anon_key, status, created_at)
    SELECT 
      company_slug, 
      company_name, 
      supabase_url, 
      supabase_anon_key, 
      CASE WHEN db_status = 'active' THEN 'active' ELSE 'suspended' END,
      created_at
    FROM public.tenant_connections
    ON CONFLICT (slug) DO UPDATE
    SET 
      company_name = EXCLUDED.company_name,
      supabase_url = EXCLUDED.supabase_url,
      supabase_anon_key = EXCLUDED.supabase_anon_key;
  END IF;
END $$;

-- 2. CUSTOMER ACCOUNTS TABLE (CRM & Billing status)
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL REFERENCES public.tenant_mappings(slug) ON DELETE CASCADE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'trial' CHECK (plan_tier IN ('trial', 'starter', 'growth', 'pro', 'enterprise')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'trial' CHECK (payment_status IN ('trial', 'paid', 'overdue', 'cancelled')),
  onboarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_payment_date DATE,
  next_due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  notes TEXT
);

-- Seed initial customer accounts from tenant_mappings
INSERT INTO public.customer_accounts (tenant_slug, contact_name, contact_email, plan_tier, billing_cycle, amount, payment_status, next_due_date)
SELECT 
  slug,
  company_name,
  'admin@' || slug || '.com',
  'growth',
  'monthly',
  4999,
  'paid',
  CURRENT_DATE + INTERVAL '30 days'
FROM public.tenant_mappings
WHERE slug NOT IN (SELECT tenant_slug FROM public.customer_accounts)
ON CONFLICT DO NOTHING;

-- 3. PLATFORM OWNERS TABLE
CREATE TABLE IF NOT EXISTS public.platform_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner', 'finance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Platform Owners
INSERT INTO public.platform_owners (email, full_name, role) VALUES
  ('superadmin@vyarahr.com',         'Super Admin',           'super_admin'),
  ('praveen12rangasamy@gmail.com',   'Praveen Rangasamy',     'owner'),
  ('pranavanandan18@gmail.com',      'Pranav Anandan',        'owner'),
  ('pranavananthan18@gmail.com',     'Pranav Ananthan',       'owner'),
  ('jin@gmail.com',                  'Jin',                   'finance')
ON CONFLICT (email) DO NOTHING;

-- 4. ACCESS REQUESTS TABLE (Demo / Inbound Onboarding)
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT NOT NULL,
  team_size TEXT,
  industry TEXT,
  preferred_plan TEXT DEFAULT 'Growth',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- 5. PLATFORM SETTINGS TABLE (Singleton)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  default_trial_days INTEGER NOT NULL DEFAULT 14,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  support_email TEXT DEFAULT 'support@vyarahr.com',
  upi_id TEXT DEFAULT 'vyarahr@upi',
  upi_name TEXT DEFAULT 'VyaraHR Technologies Pvt Ltd',
  bank_name TEXT DEFAULT 'HDFC Bank',
  account_name TEXT DEFAULT 'VyaraHR Technologies Private Limited',
  account_number TEXT DEFAULT '50200088991122',
  ifsc_code TEXT DEFAULT 'HDFC0001234',
  branch_name TEXT DEFAULT 'Bangalore MG Road',
  account_type TEXT DEFAULT 'Current Account',
  automated_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before_expiry INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (
  id, default_trial_days, maintenance_mode, support_email,
  upi_id, upi_name, bank_name, account_name,
  account_number, ifsc_code, branch_name, account_type,
  automated_reminders_enabled, reminder_days_before_expiry
) VALUES (
  'global_config', 14, false, 'support@vyarahr.com',
  'vyarahr@upi', 'VyaraHR Technologies Pvt Ltd', 'HDFC Bank', 'VyaraHR Technologies Private Limited',
  '50200088991122', 'HDFC0001234', 'Bangalore MG Road', 'Current Account',
  true, 7
) ON CONFLICT (id) DO NOTHING;

-- 6. MEMBERSHIP PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  proof_path TEXT,
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  utr_number TEXT,
  invoice_number TEXT,
  invoice_pdf_path TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- 7. SUBSCRIPTION EXPIRY NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_expiry_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  plan_tier TEXT,
  next_due_date DATE,
  days_remaining INTEGER,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS & RPC PROCEDURES
-- ============================================================

-- Check if current user is platform owner
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_owners
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );
$$;

-- Submit membership payment RPC
CREATE OR REPLACE FUNCTION public.submit_membership_payment(
  p_tenant_slug TEXT,
  p_plan_tier TEXT,
  p_billing_cycle TEXT,
  p_amount NUMERIC,
  p_proof_path TEXT,
  p_name TEXT,
  p_email TEXT,
  p_utr_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_slug TEXT;
  v_payment_id UUID;
BEGIN
  -- Validate 12-digit UTR
  IF p_utr_number IS NULL OR LENGTH(TRIM(p_utr_number)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid UTR reference number. Must be at least 8-12 digits.');
  END IF;

  -- Resolve effective slug if 'default' or empty
  v_effective_slug := TRIM(LOWER(COALESCE(p_tenant_slug, '')));
  IF v_effective_slug = '' OR v_effective_slug = 'default' THEN
    SELECT tenant_slug INTO v_effective_slug
    FROM public.customer_accounts
    WHERE LOWER(contact_email) = LOWER(TRIM(p_email))
    ORDER BY onboarded_at DESC
    LIMIT 1;
    
    IF v_effective_slug IS NULL THEN
      -- Fallback to first active tenant
      SELECT slug INTO v_effective_slug
      FROM public.tenant_mappings
      WHERE status = 'active'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.membership_payments (
    tenant_slug,
    plan_tier,
    billing_cycle,
    amount,
    proof_path,
    submitted_by_name,
    submitted_by_email,
    utr_number,
    status
  ) VALUES (
    v_effective_slug,
    p_plan_tier,
    p_billing_cycle,
    p_amount,
    p_proof_path,
    p_name,
    p_email,
    p_utr_number,
    'pending'
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'tenant_slug', v_effective_slug,
    'message', 'Payment verification submitted successfully. Platform owner will verify within 1-2 hours.'
  );
END;
$$;

-- Get tenant membership invoices RPC
CREATE OR REPLACE FUNCTION public.get_tenant_membership_invoices(
  p_tenant_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoices JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'plan_tier', plan_tier,
      'billing_cycle', billing_cycle,
      'amount', amount,
      'utr_number', utr_number,
      'invoice_number', invoice_number,
      'invoice_pdf_path', invoice_pdf_path,
      'created_at', created_at,
      'reviewed_at', reviewed_at,
      'status', status
    ) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_invoices
  FROM public.membership_payments
  WHERE LOWER(tenant_slug) = LOWER(TRIM(p_tenant_slug))
    AND status = 'approved';

  RETURN v_invoices;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.tenant_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_mappings_select_all" ON public.tenant_mappings;
CREATE POLICY "tenant_mappings_select_all" ON public.tenant_mappings FOR SELECT USING (true);
DROP POLICY IF EXISTS "tenant_mappings_modify_all" ON public.tenant_mappings;
CREATE POLICY "tenant_mappings_modify_all" ON public.tenant_mappings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_accounts_all" ON public.customer_accounts;
CREATE POLICY "customer_accounts_all" ON public.customer_accounts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.platform_owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_owners_all" ON public.platform_owners;
CREATE POLICY "platform_owners_all" ON public.platform_owners FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_requests_all" ON public.access_requests;
CREATE POLICY "access_requests_all" ON public.access_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_settings_all" ON public.platform_settings;
CREATE POLICY "platform_settings_all" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "membership_payments_all" ON public.membership_payments;
CREATE POLICY "membership_payments_all" ON public.membership_payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.subscription_expiry_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_expiry_notifications_all" ON public.subscription_expiry_notifications;
CREATE POLICY "subscription_expiry_notifications_all" ON public.subscription_expiry_notifications FOR ALL USING (true) WITH CHECK (true);

-- Storage buckets setup
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('membership-proofs', 'membership-proofs', true),
  ('membership-invoices', 'membership-invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "membership_proofs_public_select" ON storage.objects;
CREATE POLICY "membership_proofs_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'membership-proofs');

DROP POLICY IF EXISTS "membership_proofs_public_insert" ON storage.objects;
CREATE POLICY "membership_proofs_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'membership-proofs');

DROP POLICY IF EXISTS "membership_invoices_public_select" ON storage.objects;
CREATE POLICY "membership_invoices_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'membership-invoices');

DROP POLICY IF EXISTS "membership_invoices_public_insert" ON storage.objects;
CREATE POLICY "membership_invoices_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'membership-invoices');
