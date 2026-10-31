import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  PieChart as PieIcon, 
  Loader2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { ownerPlatformService } from '../../services/ownerPlatformService';
import type { RevenueMetrics } from '../../utils/metrics';
import { ANNUAL_PRICE, monthlyPrice, type PlanTier } from '../../utils/billing';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

export const PlatformRevenueMetrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await ownerPlatformService.getRevenueMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load revenue metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs">Computing revenue analytics and subscriber metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy flex items-center gap-2">
          Revenue & Commercial Analytics
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Deep financial metrics, recurring revenues, plan distributions, and customer retention.
        </p>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 ">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Monthly Recurring (MRR)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">₹{metrics.mrr.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[11px] text-emerald-600/80 flex items-center gap-1 mt-2">
            <ArrowUpRight size={13} />
            <span>Active contracted revenue</span>
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 ">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Annual Run Rate (ARR)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-brand-navy">₹{metrics.arr.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[11px] text-gray-500 block mt-2">MRR annualized × 12 months</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 ">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Average Revenue / Account</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">₹{metrics.arpu.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[11px] text-gray-500 block mt-2">Per paying tenant account</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 ">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Paying Workspaces</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-brand-navy">{metrics.activePaidCount}</span>
            <span className="text-xs text-gray-500">/ {metrics.totalCustomers} total</span>
          </div>
          <span className="text-[11px] text-gray-500 block mt-2">
            {metrics.trialCount} on trial · {metrics.overdueCount} overdue
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution Bar Chart */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 ">
          <h3 className="text-sm font-bold text-brand-navy mb-1">Subscriber Distribution by Plan</h3>
          <p className="text-xs text-gray-500 mb-6">Count of workspaces across each subscription tier</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.planDistribution}>
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#10B981' }}
                />
                <Bar dataKey="value" name="Workspaces" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Contribution Pie Chart */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 ">
          <h3 className="text-sm font-bold text-brand-navy mb-1">Contract Revenue by Tier</h3>
          <p className="text-xs text-gray-500 mb-6">Monthly cash generation segmented by commercial plan</p>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.planDistribution.filter(p => p.revenue > 0)}
                  dataKey="revenue"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {metrics.planDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Retention & Renewal Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 ">
          <h3 className="text-sm font-bold text-brand-navy mb-1">Subscriber Retention</h3>
          <p className="text-xs text-gray-500 mb-4">Paid accounts as a share of paid + overdue + cancelled</p>
          <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">{metrics.retentionRate}%</div>
          <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-brand-orange" style={{ width: `${metrics.retentionRate}%` }} />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 ">
          <h3 className="text-sm font-bold text-brand-navy mb-1">Renewal Funnel (30 days)</h3>
          <p className="text-xs text-gray-500 mb-4">Paid subscriptions due soon, through to verified renewals</p>
          {[
            { label: 'Renewals due', value: metrics.renewalFunnel.dueSoon },
            { label: 'Payment submitted', value: metrics.renewalFunnel.paymentSubmitted },
            { label: 'Renewed (verified, last 30d)', value: metrics.renewalFunnel.renewed }
          ].map(step => {
            const max = Math.max(metrics.renewalFunnel.dueSoon, metrics.renewalFunnel.renewed, 1);
            return (
              <div key={step.label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs text-gray-700 mb-1">
                  <span>{step.label}</span>
                  <span className="font-mono font-bold text-brand-navy">{step.value}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-brand-orange" style={{ width: `${(step.value / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Breakdown Table */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 ">
        <h3 className="text-sm font-bold text-brand-navy mb-4">Commercial Tier Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Plan Tier</th>
                <th className="py-2.5 px-3">Standard Price</th>
                <th className="py-2.5 px-3">Subscribed Workspaces</th>
                <th className="py-2.5 px-3">Monthly Recurring Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {metrics.planDistribution.map((p, idx) => {
                const tier = p.name as PlanTier;
                const standardPricing = ANNUAL_PRICE[tier] === 0
                  ? '₹0'
                  : `₹${ANNUAL_PRICE[tier].toLocaleString('en-IN')} / yr (₹${monthlyPrice(tier).toLocaleString('en-IN')} / mo)`;

                return (
                  <tr key={p.name} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-semibold text-brand-navy flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span>{p.label}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-500">{standardPricing}</td>
                    <td className="py-3 px-3">{p.value} workspaces</td>
                    <td className="py-3 px-3 font-bold text-emerald-600 font-mono">
                      ₹{p.revenue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlatformRevenueMetrics;
