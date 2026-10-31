import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CheckCircle, AlertCircle, Users, Search, RefreshCw, X, Pencil, IndianRupee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EmployeeManagement = () => {
  const { profile } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [managementEmployees, setManagementEmployees] = useState<any[]>([]);
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [onboardingSearch, setOnboardingSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // Checkbox Selection & Bulk Assignment states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAdminEmail, setBulkAdminEmail] = useState('');

  // Individual Swap Modal states
  const [swapEmployee, setSwapEmployee] = useState<any | null>(null);
  const [swapAdminEmail, setSwapAdminEmail] = useState('');
  const [swapSalary, setSwapSalary] = useState('');

  // Inline salary edit state
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editingSalaryVal, setEditingSalaryVal] = useState('');

  // Salary-only modal state
  const [salaryModalEmp, setSalaryModalEmp] = useState<any | null>(null);
  const [salaryModalVal, setSalaryModalVal] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchManagementEmployees = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, email, role, designation, hired_by, gross_salary')
        .eq('role', 'employee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManagementEmployees(data || []);
    } catch (err) {
      console.error('Error fetching management employees:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchAllAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, designation')
        .in('role', ['admin', 'owner'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAllAdmins(data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const handleAssignAdmin = async (employeeId: string, adminEmail: string, newSalary?: string) => {
    try {
      const updatePayload: any = { hired_by: adminEmail || null };
      if (newSalary !== undefined && newSalary !== '') {
        updatePayload.gross_salary = Number(newSalary);
      }
      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', employeeId);

      if (error) throw error;
      showToast('Employee updated successfully!', 'success');
      await fetchManagementEmployees();
    } catch (err: any) {
      console.error('Error updating employee:', err);
      showToast(`Update failed: ${err.message}`, 'error');
    }
  };

  const handleSalaryUpdate = async (employeeId: string, newSalary: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gross_salary: Number(newSalary) })
        .eq('id', employeeId);
      if (error) throw error;
      showToast('Salary updated! Payroll will reflect this change.', 'success');
      setEditingSalaryId(null);
      setSalaryModalEmp(null);
      await fetchManagementEmployees();
    } catch (err: any) {
      showToast(`Salary update failed: ${err.message}`, 'error');
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) {
      showToast('Please select at least one employee.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hired_by: bulkAdminEmail || null })
        .in('id', selectedIds);

      if (error) throw error;
      showToast(`Successfully assigned ${selectedIds.length} employees to Admin!`, 'success');
      setSelectedIds([]);
      setBulkAdminEmail('');
      await fetchManagementEmployees();
    } catch (err: any) {
      console.error('Error in bulk assignment:', err);
      showToast(`Bulk assignment failed: ${err.message}`, 'error');
    }
  };

  const getAdminDisplayName = (email: string) => {
    if (!email) return 'Super Admin (Unassigned)';
    const superAdmins = ['praveen12rangasamy@gmail.com', 'pranavanandan18@gmail.com', 'pranavananthan18@gmail.com', 'jin@gmail.com'];
    if (superAdmins.includes(email.trim().toLowerCase())) {
      return 'Super Admin';
    }
    const foundAdmin = allAdmins.find(a => a.email?.toLowerCase() === email.toLowerCase());
    return foundAdmin ? `${foundAdmin.full_name} (${foundAdmin.email})` : email;
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredEmployees: any[]) => {
    const filteredIds = filteredEmployees.map(e => e.id);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  useEffect(() => {
    fetchManagementEmployees();
    fetchAllAdmins();
  }, []);

  const isSuperAdmin = profile?.role === 'superadmin';

  const filtered = managementEmployees.filter(emp => 
    emp.full_name?.toLowerCase().includes(onboardingSearch.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(onboardingSearch.toLowerCase()) ||
    emp.email?.toLowerCase().includes(onboardingSearch.toLowerCase())
  );

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
          <Users size={24} className="text-brand-teal" />
          Employee Management Portal
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="blue" className="px-3 py-1 font-bold">
            {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
          </Badge>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {isSuperAdmin && selectedIds.length > 0 && (
        <div className="bg-brand-orange/5 border-2 border-brand-orange/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-brand-orange text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </div>
            <div>
              <p className="font-bold text-brand-navy text-sm">Bulk Selection Mode Active</p>
              <p className="text-xs text-gray-500">Group and assign the selected employees to a single HR Admin.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              className="border border-brand-orange/30 bg-white rounded-lg p-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-orange w-full md:w-64 shadow-sm"
              value={bulkAdminEmail}
              onChange={(e) => setBulkAdminEmail(e.target.value)}
              title="Assign To Admin"
            >
              <option value="">-- Choose Admin to Assign --</option>
              <option value="superadmin@vyarahr.com">Super Admin (Unassign)</option>
              {allAdmins.map((adm) => (
                <option key={adm.id} value={adm.email}>
                  {adm.full_name} ({adm.email})
                </option>
              ))}
            </select>
            <Button 
              onClick={handleBulkAssign}
              disabled={!bulkAdminEmail}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white shrink-0 font-bold"
            >
              Assign Selected
            </Button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100 transition-colors"
              title="Clear Selection"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <Card className="border-t-4 border-t-brand-teal">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
          <div>
            <CardTitle>All Hired Employees</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {isSuperAdmin 
                ? 'Select checkboxes to bulk assign employees, or click Swap Admin to modify individually.' 
                : 'Reporting list of all onboarded employees.'}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Search by name, ID or email..." 
              className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none w-full shadow-sm bg-gray-50/50"
              value={onboardingSearch}
              onChange={(e) => setOnboardingSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/50">
                <tr>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 border-b text-center w-12">
                      <input 
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every(e => selectedIds.includes(e.id))}
                        onChange={() => handleSelectAll(filtered)}
                        className="rounded text-brand-teal focus:ring-brand-teal w-4 h-4 cursor-pointer"
                        title="Select All"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 border-b">Employee Name</th>
                  <th className="px-6 py-3 border-b">Employee ID</th>
                  <th className="px-6 py-3 border-b">Designation</th>
                  <th className="px-6 py-3 border-b">Salary (CTC / Yr)</th>
                  <th className="px-6 py-3 border-b">Creator / Assigned Admin</th>
                  {isSuperAdmin && <th className="px-6 py-3 border-b text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataLoading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 4} className="text-center py-20 text-gray-400 italic">Loading employee records...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 4} className="text-center py-20 text-gray-400 italic">No employees found.</td>
                  </tr>
                ) : (
                  filtered.map((emp) => {
                    const currentAdminEmail = emp.hired_by || '';

                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                        {isSuperAdmin && (
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedIds.includes(emp.id)}
                              onChange={() => handleToggleSelect(emp.id)}
                              className="rounded text-brand-teal focus:ring-brand-teal w-4 h-4 cursor-pointer"
                              title={`Select ${emp.full_name}`}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <p className="font-bold text-brand-navy">{emp.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{emp.employee_id || '—'}</td>
                        <td className="px-6 py-4">
                          <Badge variant="blue" className="text-xs font-semibold">{emp.designation || 'Employee'}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {editingSalaryId === emp.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 text-sm">₹</span>
                              <input
                                type="number"
                                className="w-24 border border-brand-teal rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-teal"
                                value={editingSalaryVal}
                                onChange={e => setEditingSalaryVal(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSalaryUpdate(emp.id, editingSalaryVal);
                                  if (e.key === 'Escape') setEditingSalaryId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSalaryUpdate(emp.id, editingSalaryVal)}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs px-1"
                                title="Save salary"
                              >✓</button>
                              <button
                                onClick={() => setEditingSalaryId(null)}
                                className="text-gray-400 hover:text-red-500 text-xs px-1"
                                title="Cancel"
                              >✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <div className={`flex items-center gap-1 font-bold text-sm ${
                                emp.gross_salary ? 'text-brand-orange' : 'text-gray-400 italic'
                              }`}>
                                {emp.gross_salary ? (
                                  <><IndianRupee size={12} />{Number(emp.gross_salary).toLocaleString('en-IN')}</>
                                ) : 'Not Set'}
                              </div>
                              <button
                                onClick={() => {
                                  setEditingSalaryId(emp.id);
                                  setEditingSalaryVal(emp.gross_salary ? String(emp.gross_salary) : '');
                                }}
                                className={`transition-opacity text-gray-400 hover:text-brand-orange p-0.5 rounded ${
                                  isSuperAdmin ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title="Edit salary"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">
                              {getAdminDisplayName(currentAdminEmail)}
                            </span>
                          </div>
                        </td>
                         {isSuperAdmin && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                onClick={() => {
                                  setSwapEmployee(emp);
                                  setSwapAdminEmail(currentAdminEmail);
                                  setSwapSalary(emp.gross_salary ? String(emp.gross_salary) : '');
                                }}
                                variant="ghost" 
                                size="sm"
                                className="text-brand-teal hover:bg-brand-teal/5 flex items-center gap-1.5 font-bold border border-brand-teal/20"
                              >
                                <RefreshCw size={12} /> Swap Admin
                              </Button>
                              <Button
                                onClick={() => {
                                  setSalaryModalEmp(emp);
                                  setSalaryModalVal(emp.gross_salary ? String(emp.gross_salary) : '');
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-brand-orange hover:bg-brand-orange/5 flex items-center gap-1.5 font-bold border border-brand-orange/30"
                              >
                                <IndianRupee size={12} /> {emp.gross_salary ? 'Edit Salary' : 'Set Salary'}
                              </Button>
                            </div>
                          </td>
                         )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Swap Admin Modal */}
      {isSuperAdmin && swapEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95 border-t-4 border-t-brand-teal">
            <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-bold text-brand-navy">Swap Assigned Admin</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Assign reporting ownership for this employee.</p>
              </div>
              <button 
                onClick={() => setSwapEmployee(null)} 
                className="text-gray-400 hover:text-gray-600" 
                aria-label="Close modal" 
                title="Close modal"
              >
                <X size={20} />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Employee Details</p>
                <p className="text-sm font-bold text-brand-navy mt-1">{swapEmployee.full_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{swapEmployee.email} · ID: {swapEmployee.employee_id}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="swap-admin-select" className="text-xs font-bold text-gray-500 block">Select Assigned Admin</label>
                <select
                  id="swap-admin-select"
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-semibold text-gray-700 bg-white"
                  value={swapAdminEmail}
                  onChange={(e) => setSwapAdminEmail(e.target.value)}
                >
                  <option value="">Super Admin (Unassigned)</option>
                  {allAdmins.map((adm) => (
                    <option key={adm.id} value={adm.email}>
                      {adm.full_name} ({adm.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="swap-salary-input" className="text-xs font-bold text-gray-500 block flex items-center gap-1">
                  <IndianRupee size={11} /> Gross Annual Salary (CTC)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    id="swap-salary-input"
                    type="number"
                    className="w-full border p-3 pl-7 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-semibold text-gray-700 bg-white"
                    placeholder="e.g. 600000"
                    value={swapSalary}
                    onChange={(e) => setSwapSalary(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-gray-400">Leave blank to keep current salary. Updating this will reflect in Payroll automatically.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => setSwapEmployee(null)}
                  className="text-gray-500 hover:bg-gray-100 font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    await handleAssignAdmin(swapEmployee.id, swapAdminEmail, swapSalary);
                    setSwapEmployee(null);
                    setSwapSalary('');
                  }}
                  className="bg-brand-navy hover:bg-black font-bold text-white"
                >
                  Confirm & Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* ─── Set Salary Modal ─── */}
      {isSuperAdmin && salaryModalEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120] animate-in fade-in duration-200">
          <Card className="max-w-sm w-full shadow-2xl animate-in zoom-in-95 border-t-4 border-t-brand-orange">
            <CardHeader className="border-b bg-brand-orange/5 flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                  <IndianRupee size={18} className="text-brand-orange" />
                  {salaryModalEmp.gross_salary ? 'Edit Salary' : 'Set Salary'}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Gross Annual CTC for this employee.</p>
              </div>
              <button
                onClick={() => setSalaryModalEmp(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
                title="Close"
              >
                <X size={20} />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Employee Info */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Employee</p>
                <p className="text-sm font-bold text-brand-navy mt-1">{salaryModalEmp.full_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{salaryModalEmp.email} · ID: {salaryModalEmp.employee_id}</p>
                {salaryModalEmp.gross_salary && (
                  <p className="text-xs text-brand-orange font-semibold mt-1">
                    Current CTC: ₹{Number(salaryModalEmp.gross_salary).toLocaleString('en-IN')} / yr
                  </p>
                )}
              </div>

              {/* Salary Input */}
              <div className="space-y-2">
                <label htmlFor="salary-modal-input" className="text-xs font-bold text-gray-600 block">
                  New Gross Annual Salary (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-orange" />
                  <input
                    id="salary-modal-input"
                    type="number"
                    min="0"
                    step="1000"
                    autoFocus
                    className="w-full border-2 border-brand-teal/40 focus:border-brand-orange p-3 pl-8 rounded-xl text-sm font-bold text-brand-navy outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all"
                    placeholder="e.g. 600000"
                    value={salaryModalVal}
                    onChange={(e) => setSalaryModalVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && salaryModalVal) handleSalaryUpdate(salaryModalEmp.id, salaryModalVal);
                      if (e.key === 'Escape') setSalaryModalEmp(null);
                    }}
                  />
                </div>
                {salaryModalVal && (
                  <p className="text-xs text-brand-orange font-semibold">
                    = ₹{Number(salaryModalVal).toLocaleString('en-IN')} per year &nbsp;·&nbsp; ₹{Math.round(Number(salaryModalVal) / 12).toLocaleString('en-IN')} per month
                  </p>
                )}
                <p className="text-[10px] text-gray-400">This will be automatically used in Payroll calculations.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setSalaryModalEmp(null)}
                  className="text-gray-500 hover:bg-gray-100 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSalaryUpdate(salaryModalEmp.id, salaryModalVal)}
                  disabled={!salaryModalVal}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <IndianRupee size={14} /> Confirm Salary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


export default EmployeeManagement;
