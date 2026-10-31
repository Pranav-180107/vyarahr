import type { PlanTier } from './billing';

export const TIER_LABEL: Record<PlanTier, string> = {
  trial: 'Free Trial',
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
};
