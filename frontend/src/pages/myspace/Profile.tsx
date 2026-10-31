import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  CreditCard, 
  FileText, 
  MapPin, 
  AlertCircle,
  Pencil, 
  Check, 
  X, 
  Loader2,
  Building,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const Profile = () => {
  const { profile, user, fetchProfile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || profile?.mobile || '',
    department: profile?.department || '',
    designation: profile?.designation || '',
    address: profile?.address || '',
    emergencyContact: profile?.emergency_contact || '',
    bankName: profile?.bank_name || '',
    bankAccount: profile?.bank_account || '',
    ifsc: profile?.ifsc || '',
    pan: profile?.pan || ''
  });

  const handleOpenEdit = () => {
    setFormData({
      fullName: profile?.full_name || '',
      phone: profile?.phone || profile?.mobile || '',
      department: profile?.department || '',
      designation: profile?.designation || '',
      address: profile?.address || '',
      emergencyContact: profile?.emergency_contact || '',
      bankName: profile?.bank_name || '',
      bankAccount: profile?.bank_account || '',
      ifsc: profile?.ifsc || '',
      pan: profile?.pan || ''
    });
    setSaveError(null);
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    setSaveError(null);

    try {
      const updatePayload: Record<string, any> = {
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        department: formData.department.trim() || 'Unassigned',
        designation: formData.designation.trim() || 'Team Member',
        address: formData.address.trim(),
        emergency_contact: formData.emergencyContact.trim(),
        bank_name: formData.bankName.trim(),
        bank_account: formData.bankAccount.trim(),
        ifsc: formData.ifsc.trim(),
        pan: formData.pan.trim().toUpperCase(),
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      let q = supabase.from('profiles').update(updatePayload);
      if (profile.id) {
        q = q.eq('id', profile.id);
      } else if (profile.email) {
        q = q.eq('email', profile.email.trim().toLowerCase());
      }
      const { error } = await q;

      if (error) throw error;

      if (user) {
        await fetchProfile(user);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setSaveError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for masked account
  const formatBankAccount = (acc?: string | null) => {
    if (!acc) return 'Not provided';
    const clean = acc.trim();
    if (clean.length <= 4) return clean;
    return `•••• •••• ${clean.slice(-4)}`;
  };

  // Date formatter
  const formatJoinedDate = () => {
    const raw = profile?.joining_date || profile?.date_of_joining || profile?.created_at;
    if (!raw) return 'Not provided';
    try {
      return new Date(raw).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Not provided';
    }
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">My Profile</h2>
          <p className="text-xs text-gray-500">Official employment profile & verified credentials</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Pencil size={14} />
            <span>Edit Profile</span>
          </button>
          {isAdmin ? (
            <Badge variant="blue" className="px-3.5 py-1.5 font-bold shadow-sm text-xs">
              Administrator
            </Badge>
          ) : (
            <Badge variant="green" className="px-3.5 py-1.5 font-bold shadow-sm text-xs">
              Verified Member
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="col-span-1">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6 flex flex-col items-center">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-md mb-4 border-4 border-white shadow-brand-orange/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-brand-navy">
                {profile?.full_name || 'Not provided'}
              </h3>
              <p className="text-brand-orange font-semibold text-xs mt-0.5">
                {profile?.designation || (profile?.role ? String(profile.role).toUpperCase() : 'Team Member')}
              </p>
              <div className="mt-3">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-mono font-medium">
                  ID: {profile?.employee_id || profile?.employeeId || 'Not Assigned'}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Account Status: Active</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personal & Work Information</CardTitle>
              <button
                onClick={handleOpenEdit}
                className="text-xs text-brand-orange hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Pencil size={12} />
                <span>Update</span>
              </button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex gap-3 items-start">
                  <Mail className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Work Email</p>
                    <p className="text-sm font-semibold text-brand-navy">{profile?.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Phone className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Mobile Number</p>
                    <p className="text-sm font-semibold text-brand-navy">
                      {profile?.phone || profile?.mobile || (
                        <span className="text-gray-400 italic font-normal">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Briefcase className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Department</p>
                    <p className="text-sm font-semibold text-brand-navy">
                      {profile?.department || (
                        <span className="text-gray-400 italic font-normal">Not specified</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Calendar className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Joined Date</p>
                    <p className="text-sm font-semibold text-brand-navy">
                      {formatJoinedDate()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CreditCard className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Bank Account</p>
                    <p className="text-sm font-semibold text-brand-navy font-mono">
                      {formatBankAccount(profile?.bank_account)}
                    </p>
                    {profile?.bank_name && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{profile.bank_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <FileText className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">PAN / Tax ID</p>
                    <p className="text-sm font-semibold text-brand-navy font-mono">
                      {profile?.pan || (
                        <span className="text-gray-400 italic font-normal">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <MapPin className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 font-medium">Current Address</p>
                    <p className="text-sm font-semibold text-brand-navy">
                      {profile?.address || (
                        <span className="text-gray-400 italic font-normal">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <UserCheck className="text-brand-orange mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Emergency Contact</p>
                    <p className="text-sm font-semibold text-brand-navy">
                      {profile?.emergency_contact || (
                        <span className="text-gray-400 italic font-normal">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200 text-brand-navy max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => !saving && setIsEditing(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-brand-navy text-lg font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                <Pencil size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-navy">Edit Profile Details</h3>
                <p className="text-xs text-gray-500">Update your verified contact and employment information</p>
              </div>
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                <Check size={15} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering, Sales, HR"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Designation / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Current Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Street address, City, State, PIN"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Emergency Contact (Name & Phone)</label>
                <input
                  type="text"
                  placeholder="e.g. John (Father) - +91 98765 00000"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banking & Tax Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600">Bank Account Number</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifsc}
                      onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600">PAN Card Number</label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
