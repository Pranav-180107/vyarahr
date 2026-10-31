import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Mail, 
  Trash2, 
  CheckCircle2, 
  Ban, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';
import { masterSupabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import type { PlatformUser } from '../../types/auth';

const PlatformUsers: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for Add Admin
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', fullName: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await masterSupabase
        .from('platform_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUsers((data as unknown as PlatformUser[]) || []);
    } catch (err) {
      console.error('Failed to fetch platform users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    const email = newAdmin.email.trim().toLowerCase();
    const fullName = newAdmin.fullName.trim();

    if (!email || !fullName) {
      setError('Please fill in all fields.');
      setSubmitLoading(false);
      return;
    }

    try {
      const { error: insertErr } = await masterSupabase
        .from('platform_users')
        .insert({
          email,
          full_name: fullName,
          role: 'platform_admin'
        });

      if (insertErr) throw insertErr;

      await auditService.log(
        `Added platform admin: ${email}`,
        profile?.email || 'unknown',
        'platform_admin',
        'platform_user',
        email
      );

      setActionNotice({
        type: 'success',
        message: `Administrator "${fullName}" (${email}) added successfully.`
      });

      setIsModalOpen(false);
      setNewAdmin({ email: '', fullName: '' });
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to add platform admin:', err);
      setError(err.message || 'Failed to add admin. Make sure email is unique.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, email: string, fullName: string) => {
    setActionLoadingId(id);
    try {
      const { error } = await masterSupabase
        .from('platform_users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await auditService.log(
        `${!currentStatus ? 'Activated' : 'Deactivated'} platform admin: ${email}`,
        profile?.email || 'unknown',
        'platform_admin',
        'platform_user',
        email
      );

      setActionNotice({
        type: 'success',
        message: `Operator "${fullName}" (${email}) is now ${!currentStatus ? 'ACTIVE' : 'INACTIVE'}.`
      });

      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to update platform admin status:', err);
      setActionNotice({
        type: 'error',
        message: `Failed to update status: ${err.message || 'Unknown error'}`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const { error } = await masterSupabase
        .from('platform_users')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      await auditService.log(
        `Permanently deleted platform admin: ${deleteTarget.email}`,
        profile?.email || 'unknown',
        'platform_admin',
        'platform_user',
        deleteTarget.email
      );

      setActionNotice({
        type: 'success',
        message: `Administrator "${deleteTarget.full_name}" (${deleteTarget.email}) removed permanently.`
      });

      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to delete platform admin:', err);
      setDeleteError(err.message || 'Failed to delete administrator.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Platform Operators</h2>
          <p className="text-xs text-gray-500">Manage admin email logins that have master-level console access.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Administrator</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
            )}
            <span className="font-medium">{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-gray-400 hover:text-gray-600 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-orange"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No platform administrators found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-bold bg-gray-50/50">
                  <th className="p-5">Name & Email</th>
                  <th className="p-5">Role</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Added On</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((admin) => {
                  const isCurrentProfile = admin.email.toLowerCase() === profile?.email?.toLowerCase();
                  const isProcessing = actionLoadingId === admin.id;

                  return (
                    <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-xl">
                            <Shield size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-brand-navy">{admin.full_name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail size={12} className="text-brand-orange" />
                              <span>{admin.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="px-2.5 py-0.5 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange rounded-full text-xs font-bold uppercase tracking-wider">
                          {admin.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          admin.is_active 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600' 
                            : 'bg-red-500/10 border border-red-500/20 text-red-600'
                        }`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-5 text-gray-500 text-xs">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-5 text-right">
                        {isCurrentProfile ? (
                          <span 
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg text-xs font-semibold select-none"
                            title="You cannot deactivate or delete your own active platform session"
                          >
                            <Shield size={12} className="text-gray-400" />
                            <span>You</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle Active / Inactive Status */}
                            <button
                              disabled={isProcessing}
                              onClick={() => handleToggleActive(admin.id, admin.is_active, admin.email, admin.full_name)}
                              className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                                admin.is_active 
                                  ? 'border-amber-200 bg-amber-50/70 text-amber-600 hover:bg-amber-100' 
                                  : 'border-emerald-200 bg-emerald-50/70 text-emerald-600 hover:bg-emerald-100'
                              } disabled:opacity-50`}
                              title={admin.is_active ? 'Deactivate Operator' : 'Activate Operator'}
                            >
                              {isProcessing ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : admin.is_active ? (
                                <Ban size={15} />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                            </button>

                            {/* Permanently Delete Operator */}
                            <button
                              disabled={isProcessing}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(admin);
                              }}
                              className="p-2 rounded-xl border border-red-200 bg-red-50/70 text-red-600 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50"
                              title="Delete Operator permanently"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200 text-brand-navy">
            <button
              onClick={() => {
                if (!deleteLoading) setDeleteTarget(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-brand-navy text-lg font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-navy">
                  Delete Platform Administrator
                </h3>
                <p className="text-xs text-gray-500">
                  Permanently remove master console access
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                {deleteError}
              </div>
            )}

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-bold text-brand-navy">{deleteTarget.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono text-gray-700">{deleteTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role:</span>
                <span className="font-semibold text-brand-orange uppercase">{deleteTarget.role.replace('_', ' ')}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete this operator? All master console access for this account will be revoked immediately. This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 bg-transparent hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAdmin}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading && <Loader2 size={16} className="animate-spin" />}
                <span>{deleteLoading ? 'Deleting...' : 'Delete Administrator'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ADMIN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200 text-brand-navy">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-brand-navy text-lg font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-brand-navy mb-2 flex items-center gap-2">
              <Shield size={20} className="text-brand-orange" />
              <span>Register Operator</span>
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Create system admin credentials to access VyaraHR master console.
            </p>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs">{error}</div>}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  value={newAdmin.fullName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Operator Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-transparent hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  {submitLoading ? 'Registering...' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformUsers;
