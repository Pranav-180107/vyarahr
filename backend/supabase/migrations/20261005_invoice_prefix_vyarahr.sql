-- Invoice numbers use the VYR/INV/YYYY-YY/XXXX format. Renames any already-issued numbers
-- and re-creates the approve function with the new prefix.
UPDATE public.membership_payments
SET invoice_number = REPLACE(invoice_number, 'RUV/INV/', 'VYR/INV/')
WHERE invoice_number LIKE 'RUV/INV/%';

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

