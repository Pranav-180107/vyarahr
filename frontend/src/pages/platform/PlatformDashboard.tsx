import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users2, ShieldAlert, Cpu, Sparkles, Plus, TrendingUp, CreditCard } from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import { auditService } from '../../services/auditService';
import type { Organization, AuditLog } from '../../types/tenant';
import { masterSupabase } from '../../lib/supabase';

const PlatformDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [fetchedOrgs, fetchedLogs] = await Promise.all([
          organizationService.getAll(),
          auditService.getAll()
        ]);
        setOrgs(fetchedOrgs);
        setLogs(fetchedLogs.slice(0, 5));
      } catch (err) {
        console.error('Error loading platform dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();

    const channel = masterSupabase
      .channel('dashboard-audit-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs(prev => [payload.new as AuditLog, ...prev.slice(0, 4)]);
        }
      )
      .subscribe();

    return () => {
      masterSupabase.removeChannel(channel);
    };
  }, []);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600';
      case 'trialing':
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-600';
      case 'unpaid':
        return 'bg-red-500/10 border border-red-500/20 text-red-600';
      case 'overdue':
        return 'bg-rose-500/10 border border-rose-500/20 text-rose-600';
      default:
        return 'bg-gray-500/10 border border-gray-500/20 text-gray-600';
    }
  };

  const stats = [
    { name: 'Total Organizations', value: orgs.length.toString(), icon: Building2, color: 'text-brand-orange', bg: 'bg-[#FF5900]/10', path: '/platform/customers' },
    { name: 'Active Tenants', value: orgs.filter(o => o.status === 'active').length.toString(), icon: Cpu, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/platform/customers' },
    { name: 'Managed Workspaces', value: orgs.length.toString(), icon: Users2, color: 'text-brand-orange', bg: 'bg-[#FF5900]/10', path: '/platform/customers' },
    { name: 'System Logs', value: logs.length.toString(), icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', path: '/platform/audit-logs' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FF5900]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-brand-orange/10 border border-brand-orange/20 rounded-full text-xs font-bold text-brand-orange tracking-wider uppercase">
            Platform Operator
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-navy tracking-tight">
          VyaraHR Platform Control
        </h2>
        <p className="text-base text-gray-500 max-w-2xl">
          Provision new client organizations, manage tenant connections, and oversee system-wide audit records from a single administrative hub.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              onClick={() => navigate(stat.path)}
              className="p-6 bg-white border border-gray-200/80 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider group-hover:text-brand-orange transition-colors">{stat.name}</span>
                <p className="text-3xl font-black text-brand-navy">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-105 transition-transform`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Organizations */}
        <div className="p-6 bg-white border border-gray-200/80 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <Building2 size={20} className="text-brand-orange" />
              <span>Registered Organizations</span>
            </h3>
            <button
              onClick={() => navigate('/platform/customers')}
              className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-teal transition-colors"
            >
              <Plus size={14} />
              <span>Add New</span>
            </button>
          </div>

          <div className="space-y-4">
            {orgs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No organizations registered yet.</p>
            ) : (
              orgs.slice(0, 4).map((org) => (
                <div key={org.id} className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-brand-navy">{org.name}</p>
                    <p className="text-[10px] text-brand-orange font-mono tracking-wider uppercase font-bold">{org.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {org.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="p-6 bg-white border border-gray-200/80 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <ShieldAlert size={20} className="text-brand-orange" />
              <span>Recent Activity Logs</span>
            </h3>
            <button
              onClick={() => navigate('/platform/audit-logs')}
              className="text-xs font-bold text-brand-orange hover:text-brand-teal transition-colors"
            >
              View All Logs
            </button>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No platform activity logged yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-lg mt-0.5">
                    <ShieldAlert size={14} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-brand-navy truncate">{log.action}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-2">
                      <span className="text-brand-orange font-semibold">{log.actor_email}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;

