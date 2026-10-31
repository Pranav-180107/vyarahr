-- ============================================================
-- Billing & Owner Console hardening (additive to 20261003)
--  * Owner-only RLS (anon: tenant_mappings + platform_settings read only)
--  * 12-digit UTR validation, strict tenant resolution, duplicate-UTR guard
--  * Atomic owner RPCs: approve payment, block/unblock, remove customer
--  * Sequential invoice numbers VYR/INV/YYYY-YY/XXXX (Indian FY)
--  * Anonymous-safe subscription status RPC for the tenant gate
-- ============================================================

-- 1. Plan tiers -------------------------------------------------
-- Tiers stay trial / starter / growth / enterprise (+ legacy 'pro'), as already
-- enforced by customer_accounts_plan_tier_check in 20261003.

-- 2. Invoice counter -------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  fy TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- Duplicate UTR guard (only pending/approved payments count)
CREATE UNIQUE INDEX IF NOT EXISTS membership_payments_utr_active_idx
  ON public.membership_payments (utr_number)
  WHERE status IN ('pending', 'approved');

-- 3. Row level security ----------------------------------------
-- tenant_mappings: anon read (router discovery / blocked page), owner full
DROP POLICY IF EXISTS "tenant_mappings_select_all" ON public.tenant_mappings;
DROP POLICY IF EXISTS "tenant_mappings_modify_all" ON public.tenant_mappings;
CREATE POLICY "tenant_mappings_anon_select" ON public.tenant_mappings FOR SELECT USING (true);
CREATE POLICY "tenant_mappings_owner_all" ON public.tenant_mappings FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

DROP POLICY IF EXISTS "customer_accounts_all" ON public.customer_accounts;
CREATE POLICY "customer_accounts_owner_all" ON public.customer_accounts FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

-- platform_owners: an owner may read their own row (login check); owners manage all
DROP POLICY IF EXISTS "platform_owners_all" ON public.platform_owners;
CREATE POLICY "platform_owners_self_select" ON public.platform_owners FOR SELECT
  USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));
CREATE POLICY "platform_owners_owner_all" ON public.platform_owners FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

-- access_requests: anyone may file a pending request; owners review
DROP POLICY IF EXISTS "access_requests_all" ON public.access_requests;
CREATE POLICY "access_requests_anon_insert" ON public.access_requests FOR INSERT
  WITH CHECK (status = 'pending');
CREATE POLICY "access_requests_owner_all" ON public.access_requests FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

-- platform_settings: payment rails are shown to payers, so readable; owners write
DROP POLICY IF EXISTS "platform_settings_all" ON public.platform_settings;
CREATE POLICY "platform_settings_anon_select" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "platform_settings_owner_all" ON public.platform_settings FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

-- membership_payments / notifications: owner only (tenants go through RPCs)
DROP POLICY IF EXISTS "membership_payments_all" ON public.membership_payments;
CREATE POLICY "membership_payments_owner_all" ON public.membership_payments FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

DROP POLICY IF EXISTS "subscription_expiry_notifications_all" ON public.subscription_expiry_notifications;
CREATE POLICY "subscription_notifications_owner_all" ON public.subscription_expiry_notifications FOR ALL
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

-- 4. Storage ----------------------------------------------------
-- Proofs are private: anyone may upload, only owners may read (via signed URL).
UPDATE storage.buckets SET public = false WHERE id = 'membership-proofs';
DROP POLICY IF EXISTS "membership_proofs_public_select" ON storage.objects;
CREATE POLICY "membership_proofs_owner_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'membership-proofs' AND public.is_platform_owner());

-- Invoices: tenants download via the path returned by get_tenant_membership_invoices.
-- Filenames carry a random token; only owners may write.
DROP POLICY IF EXISTS "membership_invoices_public_insert" ON storage.objects;
CREATE POLICY "membership_invoices_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'membership-invoices' AND public.is_platform_owner());
DROP POLICY IF EXISTS "membership_invoices_owner_update" ON storage.objects;
CREATE POLICY "membership_invoices_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'membership-invoices' AND public.is_platform_owner());

-- 5. Tenant-facing RPCs ----------------------------------------
-- Subscription status for the tenant gate (no contact details exposed)
CREATE OR REPLACE FUNCTION public.get_tenant_subscription(p_tenant_slug TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'tenant_slug', tenant_slug,
      'plan_tier', plan_tier,
      'billing_cycle', billing_cycle,
      'payment_status', payment_status,
      'onboarded_at', onboarded_at,
      'next_due_date', next_due_date,
      'contact_name', contact_name
    )
    FROM public.customer_accounts
    WHERE LOWER(tenant_slug) = LOWER(TRIM(p_tenant_slug))
    LIMIT 1
  ), 'null'::jsonb);
$$;
GRANT EXECUTE ON FUNCTION public.get_tenant_subscription(TEXT) TO anon, authenticated;

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
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_utr TEXT := TRIM(COALESCE(p_utr_number, ''));
  v_payment_id UUID;
BEGIN
  IF v_utr !~ '^[0-9]{12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'UTR must be exactly 12 digits.');
  END IF;
  IF p_billing_cycle NOT IN ('monthly', 'annual') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid billing cycle.');
  END IF;
  IF LOWER(p_plan_tier) NOT IN ('starter', 'growth', 'pro', 'enterprise') OR COALESCE(p_amount, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan or amount.');
  END IF;

  v_slug := TRIM(LOWER(COALESCE(p_tenant_slug, '')));
  IF v_slug = '' OR v_slug = 'default' THEN
    SELECT tenant_slug INTO v_slug
    FROM public.customer_accounts
    WHERE LOWER(contact_email) = LOWER(TRIM(COALESCE(p_email, '')))
    ORDER BY onboarded_at DESC
    LIMIT 1;
  END IF;

  IF v_slug IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenant_mappings WHERE slug = v_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace could not be resolved. Please sign in to your workspace and retry.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.membership_payments
             WHERE utr_number = v_utr AND status IN ('pending', 'approved')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This UTR has already been submitted.');
  END IF;

  INSERT INTO public.membership_payments (
    tenant_slug, plan_tier, billing_cycle, amount, proof_path,
    submitted_by_name, submitted_by_email, utr_number, status
  ) VALUES (
    v_slug, LOWER(p_plan_tier), p_billing_cycle, p_amount, NULLIF(p_proof_path, ''),
    p_name, p_email, v_utr, 'pending'
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'tenant_slug', v_slug,
    'message', 'Payment verification submitted successfully. Platform owner will verify within 1-2 hours.'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_membership_payment(TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6. Owner-only atomic RPCs ------------------------------------
CREATE OR REPLACE FUNCTION public.owner_approve_payment(p_payment_id UUID, p_reviewed_by TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.membership_payments%ROWTYPE;
  v_acc public.customer_accounts%ROWTYPE;
  v_fy TEXT;
  v_seq INTEGER;
  v_invoice TEXT;
  v_start INTEGER;
  v_days INTEGER;
  v_base DATE;
BEGIN
  IF NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_pay FROM public.membership_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'Payment already %', v_pay.status; END IF;

  -- Indian financial year (Apr-Mar)
  v_start := CASE WHEN EXTRACT(MONTH FROM now()) >= 4
                  THEN EXTRACT(YEAR FROM now())::INT ELSE EXTRACT(YEAR FROM now())::INT - 1 END;
  v_fy := v_start || '-' || RIGHT((v_start + 1)::TEXT, 2);

  INSERT INTO public.invoice_counters (fy, last_value) VALUES (v_fy, 1)
  ON CONFLICT (fy) DO UPDATE SET last_value = public.invoice_counters.last_value + 1
  RETURNING last_value INTO v_seq;

  v_invoice := 'VYR/INV/' || v_fy || '/' || LPAD(v_seq::TEXT, 4, '0');

  UPDATE public.membership_payments
  SET status = 'approved', invoice_number = v_invoice,
      reviewed_at = now(), reviewed_by = p_reviewed_by
  WHERE id = p_payment_id;

  SELECT * INTO v_acc FROM public.customer_accounts WHERE tenant_slug = v_pay.tenant_slug FOR UPDATE;
  v_days := CASE WHEN v_pay.billing_cycle = 'annual' THEN 365 ELSE 30 END;
  v_base := CURRENT_DATE;
  IF FOUND AND v_acc.payment_status = 'paid' AND v_acc.next_due_date IS NOT NULL
     AND v_acc.next_due_date > CURRENT_DATE THEN
    v_base := v_acc.next_due_date;
  END IF;

  UPDATE public.customer_accounts
  SET payment_status = 'paid',
      plan_tier = v_pay.plan_tier,
      billing_cycle = v_pay.billing_cycle,
      amount = v_pay.amount,
      last_payment_date = CURRENT_DATE,
      next_due_date = v_base + v_days
  WHERE tenant_slug = v_pay.tenant_slug;

  RETURN jsonb_build_object('invoice_number', v_invoice, 'tenant_slug', v_pay.tenant_slug);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_attach_invoice_pdf(p_payment_id UUID, p_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_owner() THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE public.membership_payments SET invoice_pdf_path = p_path WHERE id = p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_set_workspace_status(p_slug TEXT, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc public.customer_accounts%ROWTYPE;
BEGIN
  IF NOT public.is_platform_owner() THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF p_status NOT IN ('active', 'blocked', 'suspended', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  UPDATE public.tenant_mappings SET status = p_status WHERE slug = p_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace % not found', p_slug; END IF;

  IF p_status = 'blocked' THEN
    UPDATE public.customer_accounts SET payment_status = 'cancelled' WHERE tenant_slug = p_slug;
  ELSIF p_status = 'active' THEN
    SELECT * INTO v_acc FROM public.customer_accounts WHERE tenant_slug = p_slug;
    IF FOUND AND v_acc.payment_status IN ('cancelled', 'overdue') THEN
      -- Restore to paid if the customer ever paid, otherwise back to trial
      UPDATE public.customer_accounts
      SET payment_status = CASE WHEN v_acc.last_payment_date IS NOT NULL THEN 'paid' ELSE 'trial' END,
          onboarded_at = CASE WHEN v_acc.last_payment_date IS NULL THEN now() ELSE v_acc.onboarded_at END,
          next_due_date = CASE WHEN v_acc.next_due_date IS NULL OR v_acc.next_due_date < CURRENT_DATE
                               THEN CURRENT_DATE + 30 ELSE v_acc.next_due_date END
      WHERE tenant_slug = p_slug;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_remove_customer(p_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_owner() THEN RAISE EXCEPTION 'Access denied'; END IF;
  DELETE FROM public.membership_payments WHERE tenant_slug = p_slug;
  DELETE FROM public.subscription_expiry_notifications WHERE tenant_slug = p_slug;
  DELETE FROM public.customer_accounts WHERE tenant_slug = p_slug;
  DELETE FROM public.tenant_mappings WHERE slug = p_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_approve_payment(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_attach_invoice_pdf(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_set_workspace_status(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_remove_customer(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_approve_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_attach_invoice_pdf(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_workspace_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_remove_customer(TEXT) TO authenticated;

-- Make is_platform_owner safe under SECURITY DEFINER
ALTER FUNCTION public.is_platform_owner() SET search_path = public;
