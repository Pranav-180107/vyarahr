import { describe, expect, it } from 'vitest';
import {
  buildUpiLink,
  daysUntil,
  extendDueDate,
  formatInvoiceNumber,
  getSubscriptionState,
  indianFinancialYear,
  isOperationalAccessAllowed,
  isValidUtr,
  normalizeTier,
  pickEffectiveSlug,
} from './billing';
import { computeRevenueMetrics } from './metrics';
import type { CustomerAccount, MembershipPayment } from '../types/tenant';

describe('UTR validation', () => {
  it('accepts exactly 12 digits', () => {
    expect(isValidUtr('428711892019')).toBe(true);
    expect(isValidUtr(' 428711892019 ')).toBe(true);
  });
  it('rejects anything else', () => {
    expect(isValidUtr('42871189201')).toBe(false);
    expect(isValidUtr('4287118920191')).toBe(false);
    expect(isValidUtr('42871189201A')).toBe(false);
    expect(isValidUtr('')).toBe(false);
    expect(isValidUtr(undefined)).toBe(false);
  });
});

describe('UPI deep link', () => {
  it('builds the expected URI', () => {
    expect(buildUpiLink({ upiId: 'vyarahr@upi', upiName: 'VyaraHR Pvt Ltd', amount: 4999, tier: 'Growth' })).toBe(
      'upi://pay?pa=vyarahr@upi&pn=VyaraHR%20Pvt%20Ltd&am=4999&cu=INR&tn=VyaraHR%20Subscription%20Growth'
    );
  });
});

describe('pickEffectiveSlug', () => {
  it('never returns default or empty values', () => {
    expect(pickEffectiveSlug('default', '', 'Acme ')).toBe('acme');
    expect(pickEffectiveSlug('DEFAULT', undefined, null)).toBe('');
    expect(pickEffectiveSlug('', 'acme')).toBe('acme');
  });
});

describe('invoice numbering', () => {
  it('uses the Indian financial year (April to March)', () => {
    expect(indianFinancialYear(new Date(2026, 9, 3))).toBe('2026-27');
    expect(indianFinancialYear(new Date(2027, 1, 1))).toBe('2026-27');
    expect(indianFinancialYear(new Date(2026, 3, 1))).toBe('2026-27');
    expect(indianFinancialYear(new Date(2026, 2, 31))).toBe('2025-26');
  });
  it('formats VYR/INV/YYYY-YY/XXXX', () => {
    expect(formatInvoiceNumber(new Date(2026, 9, 3), 7)).toBe('VYR/INV/2026-27/0007');
    expect(formatInvoiceNumber(new Date(2026, 9, 3), 1234)).toBe('VYR/INV/2026-27/1234');
  });
});

describe('extendDueDate', () => {
  const now = new Date('2026-10-03T10:00:00Z');
  it('extends 30 days (monthly) from today when lapsed or not paid', () => {
    expect(extendDueDate('monthly', '2026-09-01', true, now)).toBe('2026-11-02');
    expect(extendDueDate('monthly', null, false, now)).toBe('2026-11-02');
  });
  it('extends 365 days (annual)', () => {
    expect(extendDueDate('annual', null, false, now)).toBe('2027-10-03');
  });
  it('extends from the existing due date for an active paid renewal', () => {
    expect(extendDueDate('monthly', '2026-10-10', true, now)).toBe('2026-11-09');
  });
  it('ignores a future due date when the account was not paid (trial)', () => {
    expect(extendDueDate('monthly', '2026-10-10', false, now)).toBe('2026-11-02');
  });
});

describe('subscription gate state', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('paid has full access', () => {
    const s = getSubscriptionState({ payment_status: 'paid' }, 14, now);
    expect(s).toBe('paid');
    expect(isOperationalAccessAllowed(s)).toBe(true);
  });
  it('trial within the window is allowed, after it is locked', () => {
    expect(getSubscriptionState({ payment_status: 'trial', onboarded_at: '2026-10-10T00:00:00Z' }, 14, now)).toBe('trial');
    const expired = getSubscriptionState({ payment_status: 'trial', onboarded_at: '2026-10-01T00:00:00Z' }, 14, now);
    expect(expired).toBe('trial_expired');
    expect(isOperationalAccessAllowed(expired)).toBe(false);
  });
  it('honours default_trial_days', () => {
    const acct = { payment_status: 'trial', onboarded_at: '2026-10-01T00:00:00Z' };
    expect(getSubscriptionState(acct, 30, now)).toBe('trial');
  });
  it('overdue and cancelled are locked; missing record is allowed', () => {
    expect(isOperationalAccessAllowed(getSubscriptionState({ payment_status: 'overdue' }, 14, now))).toBe(false);
    expect(isOperationalAccessAllowed(getSubscriptionState({ payment_status: 'cancelled' }, 14, now))).toBe(false);
    expect(isOperationalAccessAllowed(getSubscriptionState(null, 14, now))).toBe(true);
  });
  it('block then unblock flips the lock (status cancelled -> restored paid)', () => {
    expect(isOperationalAccessAllowed(getSubscriptionState({ payment_status: 'cancelled' }, 14, now))).toBe(false);
    expect(isOperationalAccessAllowed(getSubscriptionState({ payment_status: 'paid' }, 14, now))).toBe(true);
  });
});

describe('misc helpers', () => {
  it('normalizes legacy tier names', () => {
    expect(normalizeTier('pro')).toBe('growth');
    expect(normalizeTier('Starter')).toBe('starter');
    expect(normalizeTier(undefined)).toBe('trial');
  });
  it('computes days until a date', () => {
    expect(daysUntil('2026-10-10', new Date('2026-10-03T00:00:00Z'))).toBe(7);
    expect(daysUntil(null)).toBeNull();
  });
});

describe('revenue metrics', () => {
  const now = new Date('2026-10-03T00:00:00Z');
  const acct = (o: Partial<CustomerAccount>): CustomerAccount => ({
    id: o.tenant_slug || 'x',
    tenant_slug: 'x',
    plan_tier: 'growth',
    billing_cycle: 'monthly',
    amount: 0,
    payment_status: 'paid',
    onboarded_at: '2026-01-01T00:00:00Z',
    ...o,
  });
  const customers = [
    acct({ tenant_slug: 'a', amount: 4999, next_due_date: '2026-10-10' }),
    acct({ tenant_slug: 'b', amount: 12000, billing_cycle: 'annual', plan_tier: 'starter', next_due_date: '2027-05-01' }),
    acct({ tenant_slug: 'c', payment_status: 'trial', plan_tier: 'trial' }),
    acct({ tenant_slug: 'd', payment_status: 'cancelled' }),
  ];
  const payments = [
    { id: '1', tenant_slug: 'a', status: 'pending' },
    { id: '2', tenant_slug: 'z', status: 'approved', reviewed_at: '2026-09-25T00:00:00Z' },
  ] as MembershipPayment[];

  it('normalizes annual contracts into MRR and derives ARR / ARPU', () => {
    const m = computeRevenueMetrics(customers, payments, now);
    expect(m.mrr).toBe(5999); // 4999 + 12000/12
    expect(m.arr).toBe(5999 * 12);
    expect(m.arpu).toBe(Math.round(5999 / 2));
    expect(m.totalCustomers).toBe(4);
  });
  it('computes retention and the renewal funnel', () => {
    const m = computeRevenueMetrics(customers, payments, now);
    expect(m.retentionRate).toBe(66.7); // 2 paid / (2 paid + 1 cancelled)
    expect(m.renewalFunnel).toEqual({ dueSoon: 1, paymentSubmitted: 1, renewed: 1 });
  });
});
