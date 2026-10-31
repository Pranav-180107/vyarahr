// Pure billing helpers (no network / DOM) so they can be unit-tested.

export type PlanTier = 'trial' | 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export const PLAN_TIERS: PlanTier[] = ['trial', 'starter', 'growth', 'enterprise'];

/** Annual list price per tier (INR). */
export const ANNUAL_PRICE: Record<PlanTier, number> = {
  trial: 0,
  starter: 17988,
  growth: 44988,
  enterprise: 89988,
};

export const MONTHLY_PRICE: Record<PlanTier, number> = {
  trial: 0,
  starter: 1999,
  growth: 4999,
  enterprise: 9999,
};

export const ANNUAL_DISCOUNT = 0.25;

export function monthlyPrice(tier: PlanTier): number {
  return MONTHLY_PRICE[tier] || 0;
}

export function planAmount(tier: PlanTier, cycle: BillingCycle): number {
  return cycle === 'annual' ? ANNUAL_PRICE[tier] : (MONTHLY_PRICE[tier] || 0);
}

/** Maps legacy tier names onto current platform plans. */
export function normalizeTier(raw?: string | null): PlanTier {
  switch ((raw || '').trim().toLowerCase()) {
    case 'starter':
    case 'bloom':
      return 'starter';
    case 'growth':
    case 'flourish':
    case 'pro':
      return 'growth';
    case 'enterprise':
    case 'summit':
      return 'enterprise';
    default:
      return 'trial';
  }
}

export const UTR_PATTERN = /^\d{12}$/;

export function isValidUtr(utr?: string | null): boolean {
  return UTR_PATTERN.test((utr || '').trim());
}

export interface UpiLinkInput {
  upiId: string;
  upiName: string;
  amount: number;
  tier: string;
}

export function buildUpiLink({ upiId, upiName, amount, tier }: UpiLinkInput): string {
  const note = encodeURIComponent(`VyaraHR Subscription ${tier}`);
  return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${note}`;
}

/** Slug sent to billing RPCs must never be 'default' or empty. */
export function pickEffectiveSlug(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const s = (c || '').trim().toLowerCase();
    if (s && s !== 'default') return s;
  }
  return '';
}

/** Indian financial year label, e.g. 2026-10-03 -> "2026-27", 2027-02-01 -> "2026-27". */
export function indianFinancialYear(date: Date): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export function formatInvoiceNumber(date: Date, sequence: number): string {
  return `VYR/INV/${indianFinancialYear(date)}/${String(sequence).padStart(4, '0')}`;
}

const DAY_MS = 86_400_000;

export function toDateOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * New due date after an approved payment: extends from the current due date when
 * the subscription is still active, otherwise from today.
 */
export function extendDueDate(
  cycle: BillingCycle,
  currentDue: string | null | undefined,
  wasPaid: boolean,
  now: Date = new Date()
): string {
  const days = cycle === 'annual' ? 365 : 30;
  const today = new Date(toDateOnly(now));
  let base = today;
  if (wasPaid && currentDue) {
    const due = new Date(currentDue);
    if (due.getTime() > today.getTime()) base = due;
  }
  return toDateOnly(new Date(base.getTime() + days * DAY_MS));
}

export function daysUntil(dateStr: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / DAY_MS);
}

export type SubscriptionState = 'paid' | 'trial' | 'trial_expired' | 'overdue' | 'cancelled' | 'none';

export interface SubscriptionInput {
  payment_status?: string | null;
  onboarded_at?: string | null;
}

export function getSubscriptionState(
  account: SubscriptionInput | null | undefined,
  trialDays: number,
  now: Date = new Date()
): SubscriptionState {
  if (!account) return 'none';
  switch (account.payment_status) {
    case 'paid':
      return 'paid';
    case 'overdue':
      return 'overdue';
    case 'cancelled':
      return 'cancelled';
    case 'trial': {
      const onboarded = new Date(account.onboarded_at || now).getTime();
      const age = (now.getTime() - onboarded) / DAY_MS;
      return age <= trialDays ? 'trial' : 'trial_expired';
    }
    default:
      return 'none';
  }
}

export function isOperationalAccessAllowed(state: SubscriptionState): boolean {
  return state === 'paid' || state === 'trial' || state === 'none';
}
