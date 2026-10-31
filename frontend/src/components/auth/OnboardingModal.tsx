import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  UserCheck, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  FileText, 
  AlertCircle, 
  Check, 
  Loader2, 
  ShieldCheck,
  Building
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { profile, user, fetchProfile } = useAuth();

  // If user is platform admin or has already completed onboarding, do not display
  if (!profile || profile.role === 'platform_admin' || profile.onboarding_completed) {
    return null;
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: profile.full_name || '',
    phone: profile.phone || profile.mobile || '',
    dob: profile.dob || '',
    address: profile.address || '',
    emergencyContact: profile.emergency_contact || '',
    department: profile.department || '',
    bankName: profile.bank_name || '',
    bankAccount: profile.bank_account || '',
    ifsc: profile.ifsc || '',
    pan: profile.pan || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide your official mobile number.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please provide your residential address.');
      return;
    }
    if (!formData.emergencyContact.trim()) {
      setError('Please provide an emergency contact name and phone number.');
      return;
    }

    setSaving(true);
    try {
      const updatePayload: Record<string, any> = {
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        dob: formData.dob || null,
        address: formData.address.trim(),
        emergency_contact: formData.emergencyContact.trim(),
        department: formData.department.trim() || profile.department || 'Operations',
        bank_name: formData.bankName.trim() || null,
        bank_account: formData.bankAccount.trim() || null,
        ifsc: formData.ifsc.trim() || null,
        pan: formData.pan.trim().toUpperCase() || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      let q = supabase.from('profiles').update(updatePayload);
      if (profile.id) {
        q = q.eq('id', profile.id);
      } else if (profile.email) {
        q = q.eq('email', profile.email.trim().toLowerCase());
      }
      const { error: updateErr } = await q;

      if (updateErr) throw updateErr;

      if (user) {
        await fetchProfile(user);
      }
    } catch (err: any) {
      console.error('Failed to complete onboarding details:', err);
      setError(err.message || 'Failed to submit profile details. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-brand-navy/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0">
            <UserCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                Action Required
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-brand-navy mt-1">
              Complete Your Employee Profile
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Please enter your required personal, emergency, and payroll details to activate your workspace and proceed with other pages.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Personal & Contact Details */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>1. Contact & Personal Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Sales, HR"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">Residential Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Permanent / Current Residence (Door No, Street, City, State, PIN)"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">Emergency Contact (Name & Relationship & Phone) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh (Brother) - +91 98765 12345"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>
            </div>
          </div>

          {/* 2. Banking & Tax Compliance */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              2. Payroll & Banking Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 50100234567890"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange uppercase font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">PAN Card Number</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange uppercase font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Your data is stored securely in your private tenant schema.</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{saving ? 'Saving Details...' : 'Save & Proceed to Platform'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
