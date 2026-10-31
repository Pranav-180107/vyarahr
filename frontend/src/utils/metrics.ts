import type { CustomerAccount, MembershipPayment } from '../types/tenant';
import { PLAN_TIERS, normalizeTier, daysUntil } from './billing';
import { TIER_LABEL } from './planLabels';

export interface RevenueMetrics {
  totalCustomers: number;
  mrr: number;
  arr: number;
  arpu: number;
  activePaidCount: number;
  trialCount: number;
  overdueCount: number;
  cancelledCount: number;
  /** paid / (paid + overdue + cancelled), as a percentage */
  retentionRate: number;
  planDistribution: { name: string; label: string; value: number; revenue: number }[];
  /** Renewal funnel over the next 30 days */
  renewalFunnel: { dueSoon: number; paymentSubmitted: number; renewed: number };
  recentPayments: MembershipPayment[];
}

export function monthlyRevenueOf(c: Pick<CustomerAccount, 'amount' | 'billing_cycle'>): number {
  const amount = Number(c.amount) || 0;
  return c.billing_cycle === 'annual' ? amount / 12 : amount;
}

export function computeRevenueMetrics(
  customers: CustomerAccount[],
  payments: MembershipPayment[],
  now: Date = new Date()
): RevenueMetrics {
  let mrr = 0;
  let paid = 0, trial = 0, overdue = 0, cancelled = 0;
  const plans: Record<string, { count: number; revenue: number }> = {};
  PLAN_TIERS.forEach(t => (plans[t] = { count: 0, revenue: 0 }));

  for (const c of customers) {
    const tier = normalizeTier(c.plan_tier);
    plans[tier].count++;
    if (c.payment_status === 'paid') {
      paid++;
      const m = monthlyRevenueOf(c);
      mrr += m;
      plans[tier].revenue += m;
    } else if (c.payment_status === 'trial') trial++;
    else if (c.payment_status === 'overdue') overdue++;
    else if (c.payment_status === 'cancelled') cancelled++;
  }

  const churnBase = paid + overdue + cancelled;
  const dueSoonSlugs = new Set(
    customers
      .filter(c => c.payment_status === 'paid')
      .filter(c => {
        const d = daysUntil(c.next_due_date, now);
        return d !== null && d >= 0 && d <= 30;
      })
      .map(c => c.tenant_slug)
  );
  const thirtyAgo = now.getTime() - 30 * 86_400_000;

  return {
    totalCustomers: customers.length,
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    arpu: paid > 0 ? Math.round(mrr / paid) : 0,
    activePaidCount: paid,
    trialCount: trial,
    overdueCount: overdue,
    cancelledCount: cancelled,
    retentionRate: churnBase > 0 ? Math.round((paid / churnBase) * 1000) / 10 : 100,
    planDistribution: PLAN_TIERS.map(name => ({
      name,
      label: TIER_LABEL[name],
      value: plans[name].count,
      revenue: Math.round(plans[name].revenue)
    })),
    renewalFunnel: {
      dueSoon: dueSoonSlugs.size,
      paymentSubmitted: new Set(
        payments.filter(p => p.status === 'pending' && dueSoonSlugs.has(p.tenant_slug)).map(p => p.tenant_slug)
      ).size,
      renewed: payments.filter(
        p => p.status === 'approved' && p.reviewed_at && new Date(p.reviewed_at).getTime() >= thirtyAgo
      ).length
    },
    recentPayments: payments.slice(0, 10)
  };
}
