import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  RefreshCw, 
  Smartphone, 
  Database, 
  BookOpen, 
  CreditCard,
  Check,
  X,
  Copy,
  CheckCheck,
  FileText,
  Download,
  ExternalLink,
  ArrowRight,
  Loader2,
  Sparkles,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { supabase, resolveEffectiveSlug } from '../../lib/supabase';
import { getScopedKey } from '../../utils/tenantHelper';
import { pickEffectiveSlug } from '../../utils/billing';
import { billingService } from '../../services/billingService';
import type { CustomerAccount, MembershipPayment } from '../../types/tenant';

const Settings: React.FC = () => {
  const { profile, user } = useAuth();
  const { slug: tenantSlug, name: tenantName } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'billing' | 'security' | 'notifications') || 'security';
  const [activeTab, setActiveTab] = useState<'billing' | 'security' | 'notifications'>(initialTab);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'owner';
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState('');

  // Password Update State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordState, setPasswordState] = useState({ old: '', new: '', confirm: '' });
  const [step, setStep] = useState(1);

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    payroll: true,
    hr: true,
    security: true
  });

  // Billing & Subscription State
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  // Invoices Modal State
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<MembershipPayment[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const effectiveSlug = pickEffectiveSlug(resolveEffectiveSlug(), tenantSlug);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Sync tab change with searchParams
  const handleTabChange = (tab: 'billing' | 'security' | 'notifications') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'security' || tabParam === 'notifications' || tabParam === 'billing') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load Billing Data
  const loadBillingData = async () => {
    try {
      const cust = await billingService.getCustomerAccount(effectiveSlug);
      setCustomer(cust);
    } catch (err) {
      console.error('Failed to load billing configuration in Settings:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [effectiveSlug]);

  const handleOpenInvoices = async () => {
    setInvoicesModalOpen(true);
    setLoadingInvoices(true);
    try {
      const data = await billingService.getTenantInvoices(effectiveSlug);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch past invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Password update handler
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;

    if (step === 1) {
      showToast('Verifying current password...');
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passwordState.old
      });

      if (error) {
        showToast('Incorrect old password! ✗');
      } else {
        setStep(2);
        showToast('Old password verified! ✓');
      }
    } else {
      if (passwordState.new.length < 8) {
        showToast('Password must be at least 8 characters! ✗');
      } else if (passwordState.new !== passwordState.confirm) {
        showToast('Passwords do not match! ✗');
      } else {
        showToast('Updating password...');
        const { error } = await supabase.auth.updateUser({ password: passwordState.new });

        if (error) {
          showToast(`Failed to update password: ${error.message} ✗`);
        } else {
          if (profile.role === 'employee') {
            await supabase
              .from('profiles')
              .update({ password: passwordState.new })
              .eq('id', profile.id);
          }
          
          showToast('Password updated successfully! ✓');
          setShowPasswordChange(false);
          setStep(1);
          setPasswordState({ old: '', new: '', confirm: '' });
        }
      }
    }
  };

  // System reset handler for primary admins
  const handleSystemReset = async () => {
    if (!window.confirm("CRITICAL WARNING: This will delete ALL employees, payroll history, loans, and tax records permanently. This cannot be undone. Are you absolutely sure?")) {
      return;
    }

    setIsResetting(true);
    try {
      const { error: profErr } = await supabase.from('profiles').delete().neq('id', profile?.id);
      if (profErr) throw profErr;

      await supabase.from('payroll_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('tax_declarations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('calendar_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const keysToWipe = [
        getScopedKey('hr_employee_credentials', profile, user), 
        getScopedKey('hr_employee_submissions', profile, user),
        getScopedKey('hr_loan_applications', profile, user),
        getScopedKey('hr_applicants', profile, user),
        getScopedKey('hr_leave_requests', profile, user),
        getScopedKey('hr_role_hierarchy', profile, user),
        getScopedKey('all_equipment', profile, user),
        getScopedKey('software_licenses', profile, user),
        getScopedKey('asset_queries', profile, user),
        getScopedKey('hr_notifications', profile, user),
        getScopedKey('hr_payroll_ledger', profile, user),
        getScopedKey('hr_courses_assigned', profile, user)
      ];
      keysToWipe.forEach(k => localStorage.removeItem(k));

      alert("System has been successfully reset. Your tenant's employee data has been wiped.");
      window.location.reload();
    } catch (err: any) {
      alert(`Error during reset: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const securityProtocols = [
    { label: 'Passwords', desc: '12+ Characters, No forced periodic resets.', icon: Key },
    { label: 'MFA', desc: 'Authenticator App or Biometrics (Required for Admins).', icon: Smartphone },
    { label: 'Encryption', desc: 'SSL/TLS in transit, AES-256 at rest.', icon: Lock },
    { label: 'Logging', desc: '100% Audit trail of all salary/document access.', icon: Database },
    { label: 'Compliance', desc: 'DPDP (India) / GDPR (Global) ready.', icon: BookOpen }
  ];



  return (
    <div className="space-y-6 max-w-6xl pb-12 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-8 bg-brand-navy text-white px-6 py-3 rounded-xl shadow-2xl z-50 border border-brand-teal flex items-center gap-3 animate-in slide-in-from-right">
          <CheckCircle className="text-brand-orange" size={20} />
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-orange/10 rounded-xl text-brand-orange">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-navy">Account Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage your workspace commercial subscriptions, billing, and security.</p>
        </div>
      </div>

      {/* Platform Native Underline Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap pb-1">
        {[
          { id: 'security', label: 'Security & Access', icon: Shield },
          { id: 'notifications', label: 'Notification Preferences', icon: Bell }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'border-brand-orange text-brand-navy'
                : 'border-transparent text-gray-400 hover:text-brand-navy hover:border-gray-200'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-brand-orange' : 'text-gray-400'} />
            <span>{tab.label}</span>
            {(tab as any).isLocked && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Locked
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BILLING & SUBSCRIPTION PLANS */}
      {/* ======================================================== */}
      {activeTab === 'billing' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Active Workspace Subscription Status Card */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold text-lg flex-shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-brand-navy">
                    {tenantName || customer?.tenant_slug || 'Organization Workspace'}
                  </h3>
                  <Badge variant="blue">
                    COMPLIMENTARY ACCESS
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Status: <strong className="text-brand-navy font-semibold">Active · No Expiry Date</strong>
                  {' · '}Plan: <strong className="text-brand-navy capitalize font-semibold">{customer?.plan_tier || 'Enterprise'} (Unlimited)</strong>
                </p>
                <span className="text-[11px] text-gray-400 font-mono mt-1 block">
                  Workspace Identifier: /{effectiveSlug}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInvoices}
                className="gap-2 text-xs font-bold border-gray-300 text-brand-navy hover:bg-gray-50"
              >
                <FileText size={14} className="text-brand-orange" />
                <span>GST Tax Invoices</span>
              </Button>
            </div>
          </div>

          {/* Commercial Plans & Billing Locked Banner */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  Commercial Plan Upgrades & Billing Locked
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Locked
                  </span>
                </h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                  Billing for plans is currently inactive with no renewal or billing dates tracked. All workspace operational features (Payroll, ATS Hiring, Attendance, and Documents) are fully unlocked with complimentary access for your team.
                </p>
              </div>
            </div>
          </div>

          {/* Included Platform Capabilities Overview - No Pricing, No Upgrade */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-brand-navy">Included Workspace Platform Capabilities</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                    Full Suite Unlocked
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  All enterprise modules and core HR workflows are activated for your organization at no commercial charge.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Automated Indian Payroll',
                  desc: 'Auto computation of PF, ESI, TDS, Professional Tax with instant payslip generation.',
                  icon: CheckCircle
                },
                {
                  title: 'ATS & Recruitment Pipeline',
                  desc: 'Job vacancy publishing, candidate tracking, interview stages, and direct offer letters.',
                  icon: CheckCircle
                },
                {
                  title: 'Time & Attendance Management',
                  desc: 'Real-time clock in/out, geofenced verification, break logging, and automated overtime.',
                  icon: CheckCircle
                },
                {
                  title: 'Leave & Absence Workflows',
                  desc: 'Configurable leave policies (Casual, Sick, Earned), balance ledger, and manager approvals.',
                  icon: CheckCircle
                },
                {
                  title: 'Digital Document Vault',
                  desc: 'Encrypted document management, identity KYC verification, and company policy archives.',
                  icon: CheckCircle
                },
                {
                  title: 'Direct Bank Disbursal Ready',
                  desc: 'Generate compliant bank payout schedules and statutory compliance remittance files.',
                  icon: CheckCircle
                }
              ].map((cap) => (
                <div key={cap.title} className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 mt-0.5">
                      <cap.icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-navy">{cap.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{cap.desc}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-2">
                        <Check size={12} className="text-emerald-600" />
                        <span>Complimentary · Active</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SECURITY & PASSWORDS (Existing Platform Feature) */}
      {/* ======================================================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-200">
          <Card className="border-t-4 border-t-brand-navy flex flex-col shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-3">
                  <Shield size={22} className="text-brand-navy" />
                  Security & Data Protection
                </CardTitle>
                {!showPasswordChange && (
                  <Button size="sm" variant="outline" onClick={() => setShowPasswordChange(true)} className="gap-2">
                    <RefreshCw size={14} /> Change Password
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              {!showPasswordChange ? (
                <div className="grid gap-4">
                  {securityProtocols.map((protocol, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-brand-orange/20 transition-all">
                      <div className="p-2 bg-white rounded-lg border shadow-sm h-fit">
                        <protocol.icon size={18} className="text-brand-navy" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-brand-navy">{protocol.label}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{protocol.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200">
                    <Key size={18} className="text-brand-navy" />
                    <h4 className="font-bold text-brand-navy">Change Account Password</h4>
                  </div>
                  <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                    {step === 1 ? (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Old Password</label>
                        <input type="password" className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none bg-white" value={passwordState.old} onChange={(e) => setPasswordState({...passwordState, old: e.target.value})} placeholder="Enter current password" required />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">New Password</label>
                          <input type="password" className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none bg-white" value={passwordState.new} onChange={(e) => setPasswordState({...passwordState, new: e.target.value})} placeholder="Min. 8 characters" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Confirm Password</label>
                          <input type="password" className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none bg-white" value={passwordState.confirm} onChange={(e) => setPasswordState({...passwordState, confirm: e.target.value})} placeholder="Repeat new password" required />
                        </div>
                      </>
                    )}
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1 bg-brand-navy hover:bg-black font-bold h-12">
                        {step === 1 ? 'Verify Old Password' : 'Update Password'}
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowPasswordChange(false); setStep(1); }} className="text-gray-400 h-12">Cancel</Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Reset for Admins */}
          {isAdmin && (
            <Card className="border-t-4 border-t-red-500 flex flex-col shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-600">
                  <AlertCircle size={22} className="text-red-500" />
                  Workspace Data Governance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Reset employee records, payroll test ledger, and attendance logs for this workspace. This action requires administrative confirmation.
                </p>
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-navy block">Tenant Database Wipe</span>
                    <span className="text-[11px] text-gray-400">Scoped to workspace /{effectiveSlug}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isResetting}
                    onClick={handleSystemReset}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {isResetting ? 'Resetting...' : 'System Reset'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: NOTIFICATIONS (Existing Platform Feature) */}
      {/* ======================================================== */}
      {activeTab === 'notifications' && (
        <div className="max-w-2xl animate-in fade-in duration-200">
          <Card className="border-t-4 border-t-brand-orange flex flex-col shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Bell size={22} className="text-brand-orange" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <p className="text-sm text-gray-500">Manage how you receive updates and operational system alerts.</p>
              <div className="space-y-4">
                {[
                  { key: 'payroll', label: 'Payroll Alerts', color: 'text-red-500', bg: 'bg-red-50', desc: 'Monthly disbursement and tax document availability.' },
                  { key: 'hr', label: 'HR Operations', color: 'text-brand-orange', bg: 'bg-brand-orange/10', desc: 'Policy updates and operational announcements.' },
                  { key: 'security', label: 'Security Alerts', color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Suspicious logins and account changes.' }
                ].map((notif) => (
                  <div key={notif.key} className="p-4 border border-gray-200 rounded-2xl hover:bg-gray-50/50 transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-brand-navy text-sm">{notif.label}</span>
                      <label className="relative inline-flex items-center h-4 w-8 shrink-0 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          title={notif.label}
                          aria-label={notif.label}
                          checked={notificationSettings[notif.key as keyof typeof notificationSettings]} 
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            [notif.key]: e.target.checked
                          })}
                        />
                        <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-brand-orange after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{notif.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-xl flex gap-3 items-start border border-blue-100">
                <AlertCircle className="text-blue-500 shrink-0" size={16} />
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                  Critical alerts (Security/Compliance) are enforced by system policy and cannot be disabled.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {/* ======================================================== */}
      {/* GST TAX INVOICES MODAL */}
      {/* ======================================================== */}
      {invoicesModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-navy">GST Tax Invoices & Billing History</h3>
                  <span className="text-xs text-gray-500">
                    Workspace: <strong className="text-brand-orange font-mono">/{effectiveSlug}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvoicesModalOpen(false)}
                className="text-gray-400 hover:text-brand-navy cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {loadingInvoices ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-7 h-7 text-brand-orange animate-spin mb-3" />
                <p className="text-xs">Fetching past tax invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                <p className="text-sm font-semibold text-brand-navy">No approved invoices found yet</p>
                <p className="text-xs mt-1">Approved payments will generate official B2B GST tax invoices here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] font-semibold">
                      <th className="py-3 px-3">Invoice Number</th>
                      <th className="py-3 px-3">Plan & Cycle</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Payment Ref (UTR)</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono font-bold text-brand-navy">
                          {inv.invoice_number || 'VYR/INV/PENDING'}
                        </td>
                        <td className="py-3 px-3 capitalize">
                          {inv.plan_tier} ({inv.billing_cycle})
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-brand-navy">
                          ₹{Number(inv.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-500">
                          {inv.utr_number || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {inv.invoice_pdf_path ? (
                            <a
                              href={billingService.getInvoiceUrl(inv.invoice_pdf_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Download size={12} />
                              <span>PDF</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Processing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
