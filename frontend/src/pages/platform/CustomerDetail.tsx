import React, { useEffect, useState } from 'react';
import { normalizeTier, planAmount, type PlanTier, type BillingCycle } from '../../utils/billing';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ArrowLeft, 
  Save, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  ExternalLink, 
  ShieldAlert, 
  Loader2, 
  Database,
  Calendar,
  CreditCard,
  Mail,
  User,
  Phone
} from 'lucide-react';
import { ownerPlatformService } from '../../services/ownerPlatformService';
import type { CustomerAccount } from '../../types/tenant';
import { DEFAULT_KEY, DEFAULT_URL } from '../../lib/supabase';

export const PlatformCustomerDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slug === 'new' || !slug;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    slug: '',
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    admin_password: '',
    plan_tier: 'growth' as PlanTier,
    billing_cycle: 'monthly' as 'monthly' | 'annual',
    amount: 0,
    payment_status: 'trial' as 'trial' | 'paid' | 'overdue' | 'cancelled',
    supabase_url: DEFAULT_URL,
    supabase_anon_key: DEFAULT_KEY,
    status: 'active' as 'active' | 'blocked' | 'suspended' | 'inactive',
    notes: ''
  });

  useEffect(() => {
    if (!isNew && slug) {
      const loadCustomer = async () => {
        try {
          const cust = await ownerPlatformService.getCustomerBySlug(slug);
          if (cust) {
            setFormData({
              slug: cust.tenant_slug,
              company_name: cust.tenant?.company_name || cust.contact_name || cust.tenant_slug,
              contact_name: cust.contact_name || '',
              contact_email: cust.contact_email || '',
              contact_phone: cust.contact_phone || '',
              admin_password: '',
              plan_tier: normalizeTier(cust.plan_tier),
              billing_cycle: cust.billing_cycle || 'monthly',
              amount: Number(cust.amount) || 0,
              payment_status: cust.payment_status || 'trial',
              supabase_url: cust.tenant?.supabase_url || DEFAULT_URL,
              supabase_anon_key: cust.tenant?.supabase_anon_key || DEFAULT_KEY,
              status: cust.tenant?.status || 'active',
              notes: cust.notes || ''
            });
          } else {
            setError(`No workspace found with slug "${slug}".`);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load customer details.');
        } finally {
          setLoading(false);
        }
      };
      loadCustomer();
    }
  }, [isNew, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (isNew) {
        await ownerPlatformService.provisionCustomer({
          slug: formData.slug,
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          admin_password: formData.admin_password,
          supabase_url: formData.supabase_url,
          supabase_anon_key: formData.supabase_anon_key,
          plan_tier: formData.plan_tier,
          billing_cycle: formData.billing_cycle,
          amount: formData.amount,
          payment_status: formData.payment_status
        });
        setSuccess('Customer workspace provisioned successfully!');
        setTimeout(() => navigate(`/platform/customers/${formData.slug}`), 1200);
      } else {
        await ownerPlatformService.updateCustomer(slug!, {
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          plan_tier: formData.plan_tier,
          billing_cycle: formData.billing_cycle,
          amount: formData.amount,
          payment_status: formData.payment_status,
          notes: formData.notes
        });
        await ownerPlatformService.setWorkspaceStatus(slug!, formData.status);
        setSuccess('Customer details updated successfully!');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save customer workspace.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!slug) return;
    setSaving(true);
    try {
      if (formData.status === 'blocked') {
        await ownerPlatformService.unblockWorkspace(slug);
        setFormData(prev => ({ ...prev, status: 'active', payment_status: 'paid' }));
        setSuccess('Workspace unblocked and payment status restored to active!');
      } else {
        await ownerPlatformService.blockWorkspace(slug);
        setFormData(prev => ({ ...prev, status: 'blocked', payment_status: 'cancelled' }));
        setSuccess('Workspace blocked and sessions halted.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle workspace status.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!slug) return;
    if (!window.confirm(`Permanently delete workspace "${slug}"? This cannot be undone.`)) return;

    setSaving(true);
    try {
      await ownerPlatformService.removeCustomer(slug);
      navigate('/platform/customers');
    } catch (err: any) {
      setError(err.message || 'Failed to delete workspace.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs">Loading customer workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/platform/customers')}
          className="text-xs text-gray-500 hover:text-brand-navy flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Workspaces</span>
        </button>

        {!isNew && (
          <div className="flex items-center gap-2">
            {formData.status === 'blocked' ? (
              <button
                onClick={handleToggleBlock}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Unblock Workspace</span>
              </button>
            ) : (
              <button
                onClick={handleToggleBlock}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ban size={14} />
                <span>Block Workspace</span>
              </button>
            )}

            <a
              href={`/?workspace=${formData.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Launch Live</span>
              <ExternalLink size={13} />
            </a>
          </div>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white  border border-gray-200 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold text-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-navy">
              {isNew ? 'Provision New Customer Workspace' : `Workspace: ${formData.company_name}`}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isNew ? 'Configure database routing, plan subscription, and initial administrator' : `Workspace Slug: /${formData.slug}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Workspace Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Company / Organization Name
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Acme Corp"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Workspace Slug (Unique identifier)
              </label>
              <input
                type="text"
                required
                disabled={!isNew}
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="acme"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Contact Person Name
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="John Doe"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Official Contact Email
              </label>
              <input
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="admin@acme.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            {isNew && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Set Admin Password (Explicit Entry)
                </label>
                <input
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="Owner enters password (min 6 chars)..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange font-mono"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Manual password input — NO auto-random password. Bcrypt (cost 12) is applied directly.
                </span>
              </div>
            )}
          </div>

          {/* Native Isolated Database Schema Details */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
            <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
              <Database size={14} className="text-brand-orange" />
              <span>Dedicated Native PostgreSQL Schema</span>
            </h3>

            <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Database Schema Name</span>
                <span className="text-xs font-mono font-semibold text-brand-navy bg-gray-100 px-2 py-0.5 rounded">
                  {formData.slug ? `tenant_${formData.slug}` : 'tenant_<slug>'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Isolation Architecture</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Self-Hosted Multi-Tenant Schema Isolation
                </span>
              </div>
              <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100 leading-relaxed">
                Workspaces are automatically provisioned into their own isolated PostgreSQL schema on the Linux VPS with cloned enterprise tables, zero cross-tenant data leakage, and automated bcrypt credential management.
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/platform/customers')}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold shadow-lg shadow-brand-orange/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isNew ? 'Provision Workspace' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Danger Zone (Existing Workspaces Only) */}
        {!isNew && (
          <div className="mt-12 pt-8 border-t border-red-500/20 space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert size={16} />
              <span>Danger Zone</span>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-brand-navy">Permanently Remove Workspace</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Deletes customer mapping, database association, payment history, and cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-200 hover:text-brand-navy text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
              >
                <Trash2 size={14} />
                <span>Delete Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformCustomerDetail;
