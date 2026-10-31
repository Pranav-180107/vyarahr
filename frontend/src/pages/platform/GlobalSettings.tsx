import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sparkles, CreditCard, Bell } from 'lucide-react';
import { masterSupabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';

const GlobalSettings: React.FC = () => {
  const { profile } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowNewSignups, setAllowNewSignups] = useState(true);
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);
  const [brandingName, setBrandingName] = useState('VyaraHR');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await masterSupabase
          .from('global_settings')
          .select('*');

        if (error) throw error;

        if (data) {
          data.forEach((item: any) => {
            if (item.key === 'maintenance_mode') setMaintenanceMode(item.value);
            if (item.key === 'allow_new_signups') setAllowNewSignups(item.value);
            if (item.key === 'default_trial_days') setDefaultTrialDays(Number(item.value) || 14);
            if (item.key === 'branding_name') setBrandingName(item.value);
          });
        }
      } catch (err: any) {
        console.error('Failed to load global settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const updates = [
        { key: 'maintenance_mode', value: maintenanceMode },
        { key: 'allow_new_signups', value: allowNewSignups },
        { key: 'default_trial_days', value: defaultTrialDays },
        { key: 'branding_name', value: brandingName }
      ];

      for (const update of updates) {
        const { error } = await masterSupabase
          .from('global_settings')
          .upsert(update as any);

        if (error) throw error;
      }

      await auditService.log(
        'Updated global settings configuration',
        profile?.email || 'unknown',
        'platform_admin'
      );

      setSuccess(true);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF5900]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300 text-brand-navy">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Global Platform Settings</h2>
        <p className="text-xs text-gray-500">Configure general parameters, branding defaults, and system operations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl text-xs font-semibold">
            Settings updated successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Platform Controls */}
          <div className="p-6 bg-white border border-gray-200/85 rounded-2xl space-y-6 shadow-sm">
            <h3 className="text-sm font-bold text-brand-orange flex items-center gap-2">
              <Shield size={16} />
              <span>Platform Gatekeeper Controls</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-brand-navy">Maintenance Mode</p>
                  <p className="text-[10px] text-gray-500">Block client logins during system upgrades.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-gray-200 border border-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-orange"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-brand-navy">Public HR Registrations</p>
                  <p className="text-[10px] text-gray-500">Allow new company creators to signup from landing page.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={allowNewSignups}
                    onChange={(e) => setAllowNewSignups(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-gray-200 border border-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-orange"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Branding Default Parameters */}
          <div className="p-6 bg-white border border-gray-200/85 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-brand-orange flex items-center gap-2">
              <Sparkles size={16} />
              <span>Branding & Trials</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-600 uppercase">Platform Brand Name</label>
              <input
                type="text"
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                value={brandingName}
                onChange={(e) => setBrandingName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-600 uppercase">Default Trial Duration (Days)</label>
              <input
                type="number"
                required
                min={1}
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(parseInt(e.target.value) || 14)}
              />
            </div>
          </div>
        </div>

        {/* Future Billing & Operations Placeholder */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl space-y-6 opacity-60 pointer-events-none relative overflow-hidden shadow-sm">
          <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange rounded-full text-[9px] font-bold uppercase tracking-wider">
            Future Placeholder
          </div>
          <h3 className="text-sm font-bold text-brand-orange flex items-center gap-2">
            <CreditCard size={16} />
            <span>Stripe Billing & Subscriptions Settings</span>
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Automatic Stripe webhook sync, tier configuration limits, and checkout redirect URLs will reside here once integrated.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md"
          >
            {saving ? 'Saving changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GlobalSettings;
