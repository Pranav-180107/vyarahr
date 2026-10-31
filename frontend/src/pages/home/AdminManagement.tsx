import { useState, useEffect } from 'react';
import { supabase, DEFAULT_URL } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AlertCircle, CheckCircle, ShieldAlert, UserPlus, Users, Trash2, User, RefreshCw } from 'lucide-react';

const AdminManagement = () => {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'Welcome@2024',
    designation: 'HR Administrator',
    empId: ''
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allProfiles = data || [];
      setAdmins(allProfiles.filter((p: any) => p.role === 'admin' || p.role === 'owner'));
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!id) return;
    if (!window.confirm(`Delete Admin "${email}"? This will permanently remove their profile.`)) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      showToast('Admin deleted successfully', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const empId = formData.empId.trim();
      if (!empId) {
        showToast('Employee ID is required.', 'error');
        setLoading(false);
        return;
      }

      showToast('Creating Admin account...', 'success');

      const session = (await supabase.auth.getSession()).data.session;
      const apiUrl = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
      const tenantSlug = localStorage.getItem('selected_tenant_slug') || '';
      const response = await fetch(`${apiUrl}/api/tenant/create-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-workspace-slug': tenantSlug
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          designation: formData.designation,
          employee_id: empId,
          role: 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        showToast(`Error: ${data.error || 'Failed to create admin account.'}`, 'error');
        return;
      }

      showToast(`✅ Admin created! Login ID: ${empId}`, 'success');
      setFormData({ name: '', email: '', password: 'Welcome@2024', designation: 'HR Administrator', empId: '' });
      await fetchAll();
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl animate-in fade-in duration-500 pb-12">
      {toast && (
        <div className={`fixed top-24 right-8 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-right border ${
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <ShieldAlert size={24} className="text-brand-orange" />
          Admin Management Portal
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="blue" className="px-3 py-1 font-bold">Super Admin Panel</Badge>
          <button
            onClick={fetchAll}
            className="p-2 text-gray-400 hover:text-brand-navy transition-colors rounded-lg hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Top Section: Create Admin Form */}
      <Card className="border-t-4 border-t-brand-orange">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus size={18} /> Provision New Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
              <input type="text" required placeholder="e.g. John Doe" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
              <input type="email" required placeholder="e.g. john@company.com" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="e.g. ADM-2026-001" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm"
                value={formData.empId} onChange={e => setFormData({ ...formData, empId: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
              <input type="password" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm"
                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</label>
              <input type="text" required placeholder="e.g. HR Manager" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm"
                value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full bg-brand-navy hover:bg-black">
                {loading ? 'Creating...' : 'Create Admin Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Admins List (Single Column Layout) */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-t-4 border-t-brand-orange">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><ShieldAlert size={18} className="text-brand-orange" /> Admins</span>
              <Badge variant="blue" className="text-xs">{admins.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dataLoading ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm italic">Loading...</div>
            ) : admins.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm italic">No admin accounts found.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {admins.map((adm) => (
                  <div key={adm.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-sm flex-shrink-0">
                        {adm.full_name?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-brand-navy">{adm.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{adm.email}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">ID: {adm.employee_id || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" className="text-[10px]">{adm.designation || (adm.role === 'owner' ? 'Owner / Director' : 'HR Admin')}</Badge>
                      {adm.role !== 'owner' && (
                        <button
                          onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete Admin"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminManagement;
