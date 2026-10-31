import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  CreditCard, 
  Shield, 
  Bell, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building,
  QrCode,
  Send
} from 'lucide-react';
import { ownerPlatformService } from '../../services/ownerPlatformService';
import type { PlatformSettings } from '../../types/tenant';

export const PlatformBillingSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<string | null>(null);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const [formData, setFormData] = useState<PlatformSettings>({
    id: 'global_config',
    default_trial_days: 14,
    maintenance_mode: false,
    support_email: 'support@vyarahr.com',
    upi_id: 'vyarahr@upi',
    upi_name: 'VyaraHR Technologies Pvt Ltd',
    bank_name: 'HDFC Bank',
    account_name: 'VyaraHR Technologies Private Limited',
    account_number: '50200088991122',
    ifsc_code: 'HDFC0001234',
    branch_name: 'Bangalore MG Road',
    account_type: 'Current Account',
    automated_reminders_enabled: true,
    reminder_days_before_expiry: 7
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await ownerPlatformService.getPlatformSettings();
        setFormData(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await ownerPlatformService.updatePlatformSettings(formData);
      setSuccess('Platform settings and Indian Rails configuration saved successfully!');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save platform settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerReminders = async () => {
    setTriggeringReminders(true);
    setReminderResult(null);
    try {
      const { sentCount } = await ownerPlatformService.triggerReminderAudit();
      setReminderResult(`Audit complete: ${sentCount} upcoming subscription reminder notifications logged.`);
    } catch (err: any) {
      setReminderResult(`Error triggering reminders: ${err.message}`);
    } finally {
      setTriggeringReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs">Loading platform configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy flex items-center gap-2">
          Global Settings & Indian Payment Rails
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage zero-fee Indian Payment Rails (UPI, IMPS Bank Accounts), default trial policy, and automated renewal triggers.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Indian Payment Rails (UPI & Bank Accounts) */}
        <div className="bg-white  border border-gray-200 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-navy">Indian Payment Rails Configuration</h2>
              <p className="text-xs text-gray-500">
                These details are rendered live in customer checkout modals and dynamic QR codes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Merchant UPI ID (VPA)
              </label>
              <input
                type="text"
                required
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                placeholder="vyarahr@upi"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Payee Legal Name (UPI & Invoice)
              </label>
              <input
                type="text"
                required
                value={formData.upi_name}
                onChange={(e) => setFormData({ ...formData, upi_name: e.target.value })}
                placeholder="VyaraHR Technologies Pvt Ltd"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Bank Name
              </label>
              <input
                type="text"
                required
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="HDFC Bank"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="VyaraHR Technologies Private Limited"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Bank Account Number
              </label>
              <input
                type="text"
                required
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="50200088991122"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Bank IFSC Code
              </label>
              <input
                type="text"
                required
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Bank Branch Location
              </label>
              <input
                type="text"
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                placeholder="Bangalore MG Road"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Account Type
              </label>
              <input
                type="text"
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                placeholder="Current Account"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Operational Policy & Maintenance Mode */}
        <div className="bg-white  border border-gray-200 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-navy">Platform Policy & Operations</h2>
              <p className="text-xs text-gray-500">
                Configure trial periods, customer support emails, and platform maintenance status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Default Free Trial Length (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                required
                value={formData.default_trial_days}
                onChange={(e) => setFormData({ ...formData, default_trial_days: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Customer Support Email
              </label>
              <input
                type="email"
                required
                value={formData.support_email}
                onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                placeholder="support@vyarahr.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          {/* Maintenance Mode Toggle */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-brand-navy">Platform Maintenance Mode</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                When enabled, tenants see a maintenance screen and operations are restricted to platform owners.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.maintenance_mode}
                onChange={(e) => setFormData({ ...formData, maintenance_mode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
            </label>
          </div>
        </div>

        {/* Section 3: Renewal Reminders & Dispatch */}
        <div className="bg-white  border border-gray-200 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-navy">Subscription Expiry Reminders</h2>
              <p className="text-xs text-gray-500">
                Automated notice dispatch before subscription due dates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Reminder Days Before Expiry
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.reminder_days_before_expiry}
                onChange={(e) => setFormData({ ...formData, reminder_days_before_expiry: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-brand-navy focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={handleTriggerReminders}
                disabled={triggeringReminders}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-2 border border-gray-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {triggeringReminders ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Trigger Manual Expiry Audit</span>
              </button>
            </div>
          </div>

          {reminderResult && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-emerald-600 text-xs">
              {reminderResult}
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold shadow-lg shadow-brand-orange/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Platform Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlatformBillingSettings;
