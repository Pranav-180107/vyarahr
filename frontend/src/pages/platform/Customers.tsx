import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  Ban, 
  CheckCircle2, 
  Trash2, 
  ChevronRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Mail,
  UserCheck,
  Building2,
  ArrowUpRight,
  Lock,
  Key,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { ownerPlatformService } from '../../services/ownerPlatformService';
import type { CustomerAccount, AccessRequest } from '../../types/tenant';

export const PlatformCustomers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [wsFilter, setWsFilter] = useState('all');

  // Confirmation Modals
  const [actionCustomer, setActionCustomer] = useState<CustomerAccount | null>(null);
  const [actionType, setActionType] = useState<'block' | 'unblock' | 'remove' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Owner Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<AccessRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    slug: '',
    company_name: '',
    admin_name: '',
    admin_email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<any | null>(null);

  // Load Data
  const loadData = async () => {
    try {
      const [custData, reqData] = await Promise.all([
        ownerPlatformService.getAllCustomers(),
        ownerPlatformService.getAccessRequests()
      ]);
      setCustomers(custData);
      setAccessRequests(reqData);
    } catch (err) {
      console.error('Failed to load owner dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // KPI Calculations
  const totalCustomers = customers.length;
  const mrr = customers.reduce((sum, c) => {
    if (c.payment_status === 'paid') {
      const monthly = c.billing_cycle === 'annual' ? (c.amount / 12) : c.amount;
      return sum + (Number(monthly) || 0);
    }
    return sum;
  }, 0);

  const pendingRequestsCount = accessRequests.filter(r => r.status === 'pending').length;

  const expiringCount = customers.filter(c => {
    if (c.payment_status === 'paid' && c.next_due_date) {
      const diff = Math.ceil((new Date(c.next_due_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      return diff <= 7 && diff >= 0;
    }
    return false;
  }).length;

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = 
        !q ||
        c.tenant_slug.toLowerCase().includes(q) ||
        (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || c.payment_status === statusFilter;
      const matchPlan = planFilter === 'all' || c.plan_tier === planFilter;
      const isBlocked = c.tenant?.status === 'blocked' || c.tenant?.status === 'suspended';
      const matchWs = 
        wsFilter === 'all' ||
        (wsFilter === 'active' && !isBlocked) ||
        (wsFilter === 'blocked' && isBlocked);

      return matchSearch && matchStatus && matchPlan && matchWs;
    });
  }, [customers, search, statusFilter, planFilter, wsFilter]);

  // Execute Block / Unblock / Remove Actions
  const handleConfirmAction = async () => {
    if (!actionCustomer || !actionType) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (actionType === 'block') {
        await ownerPlatformService.blockWorkspace(actionCustomer.tenant_slug);
      } else if (actionType === 'unblock') {
        // DB restores payment_status to 'paid' (or 'trial') atomically
        await ownerPlatformService.unblockWorkspace(actionCustomer.tenant_slug);
      } else if (actionType === 'remove') {
        await ownerPlatformService.removeCustomer(actionCustomer.tenant_slug);
      }

      await loadData();
      setActionCustomer(null);
      setActionType(null);
    } catch (err: any) {
      console.error(`Failed to ${actionType} customer:`, err);
      setActionError(err.message || `Failed to ${actionType} customer.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open interactive Approval Modal (Multi-Tenant Custom Auth & Provisioning Plan)
  const handleOpenApproveModal = (req: AccessRequest) => {
    const rawSlug = (req.requested_slug || req.company_name || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace';

    setRequestToApprove(req);
    setApprovalForm({
      slug: rawSlug,
      company_name: req.company_name || '',
      admin_name: req.full_name || '',
      admin_email: req.email || '',
      password: '',
      confirmPassword: ''
    });
    setApprovalError(null);
    setApprovalSuccess(null);
    setShowPassword(false);
    setApproveModalOpen(true);
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestToApprove) return;

    const trimmedSlug = approvalForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!trimmedSlug) {
      setApprovalError('Please provide a valid workspace slug.');
      return;
    }

    if (!approvalForm.password) {
      setApprovalError('Please explicitly set the initial administrator password (manual password entry required).');
      return;
    }

    if (approvalForm.password.length < 6) {
      setApprovalError('Password must be at least 6 characters.');
      return;
    }

    if (approvalForm.password !== approvalForm.confirmPassword) {
      setApprovalError('Passwords do not match. Please ensure both fields match.');
      return;
    }

    setApproving(true);
    setApprovalError(null);

    try {
      const res = await ownerPlatformService.approveAccessRequestWithPassword(
        requestToApprove,
        trimmedSlug,
        approvalForm.password
      );

      const workspaceUrl = `${window.location.origin}/login?workspace=${trimmedSlug}`;
      setApprovalSuccess({
        workspace_url: res?.credentials?.workspace_url || workspaceUrl,
        email: approvalForm.admin_email,
        password: approvalForm.password,
        role: 'Super Admin',
        company_name: approvalForm.company_name
      });
      await loadData();
    } catch (err: any) {
      console.error('Failed to provision customer workspace:', err);
      setApprovalError(err.message || 'Failed to provision customer workspace.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy flex items-center gap-2">
            Founder & Platform Control Hub
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time workspace provisioning, access security, and Indian payment rail metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-brand-navy hover:bg-gray-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => navigate('/platform/customers/new')}
            className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold shadow-lg shadow-brand-orange/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Provision Workspace</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 relative overflow-hidden ">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Workspaces</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-brand-navy tracking-tight">{totalCustomers}</span>
            <span className="text-[11px] text-gray-500 block mt-1">Configured tenant workspaces</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 relative overflow-hidden ">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Workspaces</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">
              {customers.filter(c => c.tenant?.status !== 'blocked' && c.tenant?.status !== 'suspended').length}
            </span>
            <span className="text-[11px] text-gray-500 block mt-1">Live running tenant schemas</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 relative overflow-hidden ">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Mail size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-brand-navy tracking-tight">{pendingRequestsCount}</span>
            <span className="text-[11px] text-gray-500 block mt-1">Onboarding / demo inquiries</span>
          </div>
        </div>
      </div>

      {/* Access Requests Drawer / Mini-Queue */}
      {accessRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 -brand-orange/20 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-ping" />
              <h2 className="text-sm font-bold text-brand-navy">Pending Inbound Access Requests</h2>
            </div>
            <span className="text-xs text-emerald-600 font-semibold">
              {accessRequests.filter(r => r.status === 'pending').length} Inbound
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accessRequests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-brand-navy text-sm">{req.company_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-semibold">
                      New Inbound
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{req.full_name} · {req.email}</p>
                  {req.message && (
                    <p className="text-[11px] text-gray-500 italic mt-2 line-clamp-2">"{req.message}"</p>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenApproveModal(req)}
                    className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UserCheck size={13} />
                    <span>Approve Workspace</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer CRM Table Section */}
      <div className="bg-white  border border-gray-200 rounded-2xl p-6 shadow-xl">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, email, or workspace slug..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-10 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={wsFilter}
              onChange={(e) => setWsFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-orange cursor-pointer"
            >
              <option value="all">All Workspaces</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked / Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-xs">Loading customer workspaces...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm font-semibold">No customers found matching your criteria</p>
            <p className="text-xs mt-1">Try clearing filters or provision a new customer workspace.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Workspace & Company</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Database Schema</th>
                  <th className="py-3 px-4">Workspace State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredCustomers.map(cust => {
                  const isBlocked = cust.tenant?.status === 'blocked' || cust.tenant?.status === 'suspended';

                  return (
                    <tr key={cust.id || cust.tenant_slug} className="hover:bg-gray-50 transition-colors">
                      {/* Workspace Slug & Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isBlocked ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {cust.tenant?.company_name?.charAt(0) || cust.tenant_slug.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-brand-navy block text-sm">
                              {cust.tenant?.company_name || cust.contact_name || cust.tenant_slug}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              /{cust.tenant_slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <p className="text-brand-navy font-medium">{cust.contact_name || 'Admin'}</p>
                        <p className="text-gray-500 text-[11px]">{cust.contact_email}</p>
                      </td>

                      {/* Isolated Database Schema */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-gray-100 text-brand-navy font-mono text-[11px] border border-gray-200">
                          tenant_{cust.tenant_slug}
                        </span>
                      </td>

                      {/* Workspace State */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          isBlocked 
                            ? 'bg-red-500/20 text-red-600 border border-red-500/30' 
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}>
                          {isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      {/* Inline Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open Workspace Action */}
                          {isBlocked ? (
                            <span 
                              title="Workspace is blocked. Unblock to launch session."
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
                            >
                              <ExternalLink size={14} />
                            </span>
                          ) : (
                            <a
                              href={`/?workspace=${cust.tenant_slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open workspace live"
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-brand-navy transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}

                          {/* Block / Unblock Action */}
                          {isBlocked ? (
                            <button
                              onClick={() => {
                                setActionCustomer(cust);
                                setActionType('unblock');
                              }}
                              title="Unblock workspace & restore customer access"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActionCustomer(cust);
                                setActionType('block');
                              }}
                              title="Block workspace access"
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 transition-colors cursor-pointer"
                            >
                              <Ban size={14} />
                            </button>
                          )}

                          {/* Customer Details */}
                          <button
                            onClick={() => navigate(`/platform/customers/${cust.tenant_slug}`)}
                            title="Manage Workspace"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-brand-navy transition-colors cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>

                          {/* Remove Customer */}
                          <button
                            onClick={() => {
                              setActionCustomer(cust);
                              setActionType('remove');
                            }}
                            title="Delete customer permanently"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-500/20 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionCustomer && actionType && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                actionType === 'block' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                actionType === 'unblock' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                'bg-red-500/20 text-red-600 border border-red-500/30'
              }`}>
                {actionType === 'block' && <Ban size={20} />}
                {actionType === 'unblock' && <CheckCircle2 size={20} />}
                {actionType === 'remove' && <Trash2 size={20} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-navy capitalize">
                  {actionType} Workspace: {actionCustomer.tenant_slug}
                </h3>
                <span className="text-xs text-gray-500">
                  {actionCustomer.tenant?.company_name || actionCustomer.contact_name}
                </span>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                {actionError}
              </div>
            )}

            <p className="text-xs text-gray-700 leading-relaxed mb-6">
              {actionType === 'block' && 
                'Blocking this workspace immediately invalidates all active employee and admin logins, shows the access suspended screen, and marks subscription status as cancelled.'}
              {actionType === 'unblock' && 
                'Unblocking this workspace immediately restores live platform access and automatically updates customer payment status to active (paid/trial), clearing all lockout screens.'}
              {actionType === 'remove' && 
                'Are you sure you want to permanently delete this customer? This action deletes tenant mapping, CRM records, membership payments, and cannot be undone.'}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setActionCustomer(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  actionType === 'unblock'
                    ? 'bg-brand-orange hover:bg-brand-orange shadow-brand-orange/20'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/25'
                }`}
              >
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                <span className="capitalize">{actionType} Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Owner Approval Modal (Section 2.1 of Multi-Tenant Custom Auth & Provisioning Plan) */}
      {approveModalOpen && requestToApprove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => {
                setApproveModalOpen(false);
                setRequestToApprove(null);
                setApprovalSuccess(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>

            {approvalSuccess ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-navy">Workspace Provisioned Successfully!</h3>
                    <p className="text-xs text-gray-500">Welcome email with credentials dispatched to applicant.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">🏢 Organization:</span>
                    <span className="font-bold text-brand-navy">{approvalSuccess.company_name || approvalForm.company_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-semibold">🔗 Workspace URL:</span>
                    <a
                      href={approvalSuccess.workspace_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-brand-orange hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>{approvalSuccess.workspace_url}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">👤 Admin Email:</span>
                    <span className="font-mono text-brand-navy">{approvalSuccess.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">🔑 Password Set:</span>
                    <span className="font-mono font-bold text-brand-navy bg-orange-100 px-2 py-0.5 rounded text-orange-900">{approvalSuccess.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">👑 Assigned Role:</span>
                    <span className="font-bold text-emerald-700">Super Admin / Owner</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setApproveModalOpen(false);
                      setRequestToApprove(null);
                      setApprovalSuccess(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-brand-navy hover:bg-black text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                  >
                    Done & Return
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmApproval} className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-brand-navy">Approve & Provision Workspace</h3>
                    <p className="text-xs text-gray-500">Explicitly configure workspace slug & administrator password</p>
                  </div>
                </div>

                {approvalError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                    <ShieldAlert size={14} className="flex-shrink-0" />
                    <span>{approvalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Applicant Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={approvalForm.admin_name}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={approvalForm.company_name}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Super Admin Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={approvalForm.admin_email}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-mono cursor-not-allowed"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Workspace Slug <span className="text-brand-orange">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={approvalForm.slug}
                    onChange={(e) => setApprovalForm({ ...approvalForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="e.g. acme-traders"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-brand-navy font-mono focus:outline-none focus:border-brand-orange"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Workspace URL: <strong className="text-gray-600">{window.location.origin}/login?workspace={approvalForm.slug || 'slug'}</strong>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/60 text-[11px] text-orange-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-orange-800">
                    <Key size={13} />
                    <span>Owner Manual Password Policy</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    NO auto-random password. As Platform Owner, explicitly type the password. It will be hashed using <strong>Bcrypt (Cost 12)</strong> directly into the isolated PostgreSQL tenant database.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Set Admin Password <span className="text-brand-orange">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={approvalForm.password}
                        onChange={(e) => setApprovalForm({ ...approvalForm, password: e.target.value })}
                        placeholder="Type password..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3.5 pr-8 py-2 text-brand-navy focus:outline-none focus:border-brand-orange font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Confirm Password <span className="text-brand-orange">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={approvalForm.confirmPassword}
                      onChange={(e) => setApprovalForm({ ...approvalForm, confirmPassword: e.target.value })}
                      placeholder="Confirm password..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-brand-navy focus:outline-none focus:border-brand-orange font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={approving}
                    onClick={() => {
                      setApproveModalOpen(false);
                      setRequestToApprove(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={approving}
                    className="px-5 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold shadow-lg shadow-brand-orange/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {approving && <Loader2 size={13} className="animate-spin" />}
                    <span>{approving ? 'Provisioning...' : 'Approve & Provision Workspace'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformCustomers;
