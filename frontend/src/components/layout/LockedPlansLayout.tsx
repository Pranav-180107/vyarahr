import React from 'react';
import { ShieldAlert, CreditCard, ArrowRight } from 'lucide-react';
import type { CustomerAccount } from '../../types/tenant';
import type { SubscriptionState } from '../../utils/billing';

interface LockedPlansLayoutProps {
  customer: CustomerAccount;
  state: SubscriptionState;
}

const REASONS: Partial<Record<SubscriptionState, string>> = {
  trial_expired: 'Free trial ended',
  overdue: 'Subscription overdue',
  cancelled: 'Subscription cancelled',
};

export const LockedPlansLayout: React.FC<LockedPlansLayoutProps> = ({ customer, state }) => (
  <div className="min-h-screen bg-brand-bg text-brand-navy flex items-center justify-center p-4 font-sans">
    <div className="max-w-lg w-full bg-white border border-gray-200 rounded-3xl p-8 shadow-2xl text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
        <ShieldAlert size={32} />
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block">
          {REASONS[state] || 'Subscription inactive'}
        </span>
        <h2 className="text-xl font-bold text-brand-navy mt-3">Operational Access Temporarily Locked</h2>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          Your free trial or commercial subscription for workspace{' '}
          <strong className="text-brand-orange font-mono">/{customer.tenant_slug}</strong> is no longer active.
          Operational modules (invoices, expenses, banking, accounting, HR and payroll) require an active plan.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left text-xs space-y-2">
        <div className="flex justify-between text-gray-500">
          <span>Account Status:</span>
          <strong className="text-red-600 uppercase font-bold">{state.replace('_', ' ')}</strong>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Plan Tier:</span>
          <strong className="text-brand-navy capitalize font-bold">{customer.plan_tier}</strong>
        </div>
        {customer.next_due_date && (
          <div className="flex justify-between text-gray-500">
            <span>Last Due Date:</span>
            <strong className="text-brand-navy">{customer.next_due_date}</strong>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <a
          href="/plans"
          className="w-full py-3 px-4 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs shadow-lg shadow-brand-orange/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <CreditCard size={15} />
          <span>Renew Subscription via Indian Rails (UPI / Bank)</span>
          <ArrowRight size={14} />
        </a>
        <a href="/" className="block text-xs text-gray-500 hover:text-brand-navy transition-colors">
          &larr; Switch Organization
        </a>
      </div>
    </div>
  </div>
);

export default LockedPlansLayout;
