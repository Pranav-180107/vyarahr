import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  QrCode, 
  CreditCard, 
  Upload, 
  FileText, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Building2, 
  AlertCircle,
  ExternalLink,
  Download
} from 'lucide-react';
import { billingService, PLATFORM_PLANS, type PlanConfig } from '../services/billingService';
import { resolveEffectiveSlug } from '../lib/supabase';
import { buildUpiLink, getSubscriptionState, pickEffectiveSlug } from '../utils/billing';
import type { CustomerAccount, MembershipPayment, PlatformSettings } from '../types/tenant';
import { useTenant } from '../context/TenantContext';

export const Plans: React.FC = () => {
  const { slug: tenantSlug, name: tenantName } = useTenant();
  const [isAnnual, setIsAnnual] = useState(false);
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Checkout Modal State
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Invoices Modal State
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<MembershipPayment[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Copy Feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const effectiveSlug = pickEffectiveSlug(resolveEffectiveSlug(), tenantSlug);

  useEffect(() => {
    const initBilling = async () => {
      try {
        const [settingsData, custData] = await Promise.all([
          billingService.getPlatformSettings(),
          billingService.getCustomerAccount(effectiveSlug)
        ]);
        setSettings(settingsData);
        setCustomer(custData);
        if (custData) {
          setPayerName(custData.contact_name || '');
          setPayerEmail(custData.contact_email || '');
        }
      } catch (err) {
        console.error('Failed to load billing data:', err);
      } finally {
        setLoading(false);
      }
    };
    initBilling();
  }, [effectiveSlug]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenCheckout = (plan: PlanConfig) => {
    setSelectedPlan(plan);
    setSubmitError(null);
    setSubmitSuccess(null);
    setUtrNumber('');
    setProofFile(null);
    setCheckoutModalOpen(true);
  };

  const handleOpenInvoices = async () => {
    setInvoicesModalOpen(true);
    setLoadingInvoices(true);
    try {
      const data = await billingService.getTenantInvoices(effectiveSlug);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!effectiveSlug) {
      setSubmitError('No active workspace found. Please sign in to your workspace and try again.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const price = isAnnual ? selectedPlan.annualTotal : selectedPlan.monthlyPrice;

    try {
      let uploadedProofUrl = '';
      if (proofFile) {
        uploadedProofUrl = await billingService.uploadPaymentProof(proofFile, effectiveSlug);
      }

      const result = await billingService.submitPaymentVerification({
        tenant_slug: effectiveSlug,
        plan_tier: selectedPlan.id,
        billing_cycle: isAnnual ? 'annual' : 'monthly',
        amount: price,
        proof_path: uploadedProofUrl,
        submitted_by_name: payerName,
        submitted_by_email: payerEmail,
        utr_number: utrNumber
      });

      setSubmitSuccess(result.message);
    } catch (err: any) {
      console.error('Verification error:', err);
      setSubmitError(err.message || 'Failed to submit payment verification.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sprout (free evaluation) can't be re-selected once the trial lapsed or the account was cancelled
  const subState = getSubscriptionState(customer, settings?.default_trial_days ?? 14);
  const isTrialExpired = subState === 'trial_expired' || subState === 'overdue' || subState === 'cancelled';

  // Compute live UPI string
  const currentPrice = selectedPlan ? (isAnnual ? selectedPlan.annualTotal : selectedPlan.monthlyPrice) : 0;
  const upiId = settings?.upi_id || 'vyarahr@upi';
  const upiName = settings?.upi_name || 'VyaraHR Technologies Pvt Ltd';
  const upiDeepLink = buildUpiLink({ upiId, upiName, amount: currentPrice, tier: selectedPlan?.name || '' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles size={13} />
              <span>Zero Transaction Fees · Direct Indian Payment Rails</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Subscriptions & Commercial Plans
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Digitize employee records, automate Indian payroll, track attendance, and scale your workforce.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenInvoices}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileText size={14} className="text-emerald-400" />
              <span>Billing History & Invoices</span>
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>

        {/* Current Subscription Status Card if customer exists */}
        {customer && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                customer.payment_status === 'paid' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                <Building2 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {tenantName || customer.tenant_slug}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    customer.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {subState === 'trial_expired' ? 'trial expired' : customer.payment_status}
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Current Tier: <strong className="text-white">{customer.plan_tier}</strong> ({customer.billing_cycle || 'monthly'})
                  {customer.next_due_date && ` · Renewal Date: ${customer.next_due_date}`}
                </span>
              </div>
            </div>

            {customer.payment_status !== 'paid' && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                Payment Required for Operational Access
              </span>
            )}
          </div>
        )}

        {/* Monthly / Annual Billing Toggle */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isAnnual 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Billed Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isAnnual 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Billed Annually</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px]">
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLATFORM_PLANS.map((plan) => {
            const isPopular = plan.id === 'growth';
            const price = isAnnual ? plan.annualMonthlyPrice : plan.monthlyPrice;
            const isCurrent = customer?.plan_tier === plan.id;
            const isTrialBlocked = plan.id === 'trial' && isTrialExpired;

            return (
              <div
                key={plan.id}
                className={`
                  relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200
                  ${isPopular 
                    ? 'bg-slate-900/90 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 scale-102' 
                    : 'bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl'}
                `}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 min-h-[32px] leading-relaxed mb-4">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="py-4 border-y border-slate-800/80 mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-emerald-400">₹</span>
                      <span className="text-3xl font-extrabold text-white tracking-tight">
                        {price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month</span>
                    </div>
                    {isAnnual && plan.annualTotal > 0 && (
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Billed annually as ₹{plan.annualTotal.toLocaleString('en-IN')} / yr
                      </span>
                    )}
                    {plan.id === 'trial' && (
                      <span className="text-[11px] text-emerald-400 block mt-1 font-semibold">
                        Full access for {settings?.default_trial_days ?? 14} evaluation days
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Included Capabilities
                    </span>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {plan.notIncluded?.map((notFeat) => (
                        <li key={notFeat} className="flex items-start gap-2 text-slate-600">
                          <X size={14} className="flex-shrink-0 mt-0.5" />
                          <span>{notFeat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  {plan.id === 'trial' ? (
                    <button
                      type="button"
                      disabled
                      title={isTrialBlocked ? 'Free evaluation has ended - please upgrade to a paid plan' : undefined}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTrialBlocked ? 'Trial Ended - Upgrade Required' : isCurrent ? 'Active Evaluation' : 'Free on Signup'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(plan)}
                      className={`
                        w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer
                        ${isPopular 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white'}
                      `}
                    >
                      <span>{isCurrent && subState === 'paid' ? `Renew ${plan.name}` : `Upgrade to ${plan.name}`}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* INDIAN PAYMENT RAILS CHECKOUT MODAL */}
      {/* ======================================================== */}
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Indian Payment Rails Checkout: {selectedPlan.name} Plan
                  </h3>
                  <span className="text-xs text-slate-400">
                    Workspace: <strong className="text-emerald-400 font-mono">/{effectiveSlug}</strong> · Amount:{' '}
                    <strong className="text-white font-mono">₹{currentPrice.toLocaleString('en-IN')}</strong> ({isAnnual ? 'Annual' : 'Monthly'})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="text-lg font-bold text-white">Payment Verification Received!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  {submitSuccess}
                </p>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-xs text-slate-400 space-y-1">
                  <p><strong>UTR:</strong> {utrNumber}</p>
                  <p><strong>Workspace:</strong> /{effectiveSlug}</p>
                  <p><strong>Plan:</strong> {selectedPlan.name} ({isAnnual ? 'Annual' : 'Monthly'})</p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setCheckoutModalOpen(false);
                      window.location.reload();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-lg shadow-emerald-600/25"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                {/* Left Column: Interactive Dynamic UPI QR Code & Bank Transfer */}
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-3">
                      Scan via any UPI App (GPay / PhonePe / Paytm)
                    </span>

                    {/* QR Code Canvas */}
                    <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200">
                      <QRCodeCanvas
                        value={upiDeepLink}
                        size={170}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <p className="text-xs font-mono font-bold text-white mt-3">
                      ₹{currentPrice.toLocaleString('en-IN')}
                    </p>

                    {/* Copy UPI ID */}
                    <div className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="font-mono text-slate-300 truncate">{upiId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(upiId, 'upi')}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer ml-2 flex-shrink-0"
                      >
                        {copiedField === 'upi' ? <CheckCheck size={13} /> : <Copy size={13} />}
                        <span>{copiedField === 'upi' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Mobile UPI Deep Link */}
                    <a
                      href={upiDeepLink}
                      className="mt-3 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Open in UPI App</span>
                    </a>
                  </div>

                  {/* IMPS / NEFT Direct Bank Details */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block mb-2">
                      Direct IMPS / NEFT Bank Transfer
                    </span>
                    <div className="flex justify-between text-slate-400">
                      <span>Bank:</span>
                      <strong className="text-slate-200">{settings?.bank_name || 'HDFC Bank'}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Account No:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-200 font-mono">{settings?.account_number || '50200088991122'}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(settings?.account_number || '50200088991122', 'acc')}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          {copiedField === 'acc' ? <CheckCheck size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>IFSC Code:</span>
                      <strong className="text-slate-200 font-mono">{settings?.ifsc_code || 'HDFC0001234'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Payee:</span>
                      <strong className="text-slate-200 truncate max-w-[150px]">{settings?.account_name || 'VyaraHR Tech'}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Column: Verification Form */}
                <form onSubmit={handleSubmitVerification} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Submit Payment Verification</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Enter your 12-digit transaction UTR number to immediately dispatch verification to the platform owner.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      12-Digit Bank / UPI Reference (UTR) Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="e.g. 428711892019"
                      maxLength={12}
                      inputMode="numeric"
                      pattern="\d{12}"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Official Invoice Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="finance@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Upload Payment Screenshot / Receipt (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Verifying Reference...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit for Instant Activation</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-500 text-center">
                    Upon approval, an official GST Tax Invoice (18% Input Tax Credit compliant) is generated and dispatched to your email.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BILLING HISTORY & GST TAX INVOICES MODAL */}
      {/* ======================================================== */}
      {invoicesModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">GST Tax Invoices & Billing History</h3>
                  <span className="text-xs text-slate-400">
                    Workspace: <strong className="text-emerald-400 font-mono">/{effectiveSlug}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInvoicesModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {loadingInvoices ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-3" />
                <p className="text-xs">Fetching past tax invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-sm font-semibold">No invoices found for this workspace</p>
                <p className="text-xs mt-1">Approved payments will generate official B2B GST tax invoices here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                      <th className="py-3 px-3">Invoice Number</th>
                      <th className="py-3 px-3">Plan & Cycle</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Payment Ref (UTR)</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                          {inv.invoice_number || 'Pending'}
                        </td>
                        <td className="py-3 px-3 capitalize">
                          {inv.plan_tier} ({inv.billing_cycle})
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          ₹{Number(inv.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {inv.utr_number || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {inv.invoice_pdf_path ? (
                            <a
                              href={billingService.getInvoiceUrl(inv.invoice_pdf_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Download size={12} />
                              <span>PDF</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 italic">Processing</span>
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

export default Plans;
