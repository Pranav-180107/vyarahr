import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Send, Eye, EyeOff, Shield, MonitorPlay, Laptop, AlertCircle, CheckCircle, Search, KeyRound, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getScopedKey } from '../../utils/tenantHelper';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface EquipmentItem {
  employee: string;
  item: string;
  model: string;
  date: string;
  status: string;
}

interface LicenseItem {
  employee: string;
  software: string;
  key: string;
  expiry: string;
  status: string;
}

const Equipment = () => {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const [showPwd, setShowPwd] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [toast, setToast] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Provisioning States
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [showSoftwareModal, setShowSoftwareModal] = useState(false);
  const [newHardware, setNewHardware] = useState({ employee: '', item: '', model: '', date: new Date().toISOString().split('T')[0] });
  const [newSoftware, setNewSoftware] = useState({ employee: '', software: '', key: '', expiry: '' });

  // Equipment and Licenses states
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchEmployees = async () => {
    try {
      const { data: supabaseProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, email, role, designation')
        .eq('role', 'employee');
      
      let unified = (supabaseProfiles || [])
        .map((p: any) => ({
          id: p.id,
          name: p.full_name,
          empId: p.employee_id,
          email: p.email
        }));

      // Exclude fake profiles
      const fakeNames = ['mukesh', 'sanjay', 'kanmani', 'angela martin', 'john doe'];
      unified = unified.filter((p: any) => !fakeNames.includes(p.name?.toLowerCase() || ''));

      // Deduplicate by name
      const empMap = new Map();
      unified.forEach(emp => {
        const key = emp.name;
        if (key) empMap.set(key, emp);
      });

      setEmployees(Array.from(empMap.values()));
    } catch (err) {
      console.error('Error fetching employee list:', err);
    }
  };

  useEffect(() => {
    if (profile || user) {
      const equipKey = getScopedKey('all_equipment', profile, user);
      const licKey = getScopedKey('software_licenses', profile, user);
      const storedEquip = localStorage.getItem(equipKey);
      const storedLic = localStorage.getItem(licKey);
      try {
        setEquipment(storedEquip ? JSON.parse(storedEquip) : []);
      } catch {
        setEquipment([]);
      }
      try {
        setLicenses(storedLic ? JSON.parse(storedLic) : []);
      } catch {
        setLicenses([]);
      }
      if (isAdmin) {
        fetchEmployees();
      }
    }
  }, [profile, user]);

  const handleReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const asset = (e.currentTarget.elements[0] as HTMLSelectElement).value;
    const userIdentifier = profile?.full_name || profile?.employeeId || profile?.employee_id || profile?.email || 'Staff';
    
    // Update local status for the employee
    const updated = equipment.map(item => 
      item.employee === userIdentifier && item.item === asset.split(':')[1]?.trim() 
      ? { ...item, status: 'Repairing' } 
      : item
    );
    setEquipment(updated);
    const equipKey = getScopedKey('all_equipment', profile, user);
    localStorage.setItem(equipKey, JSON.stringify(updated));

    setToast('Your issue has been reported. Asset status changed to Repairing.');
    setTimeout(() => setToast(''), 4000);
  };

  const handleAddHardware = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = { ...newHardware, status: 'Active' };
    const updated = [newRecord, ...equipment];
    setEquipment(updated);
    const equipKey = getScopedKey('all_equipment', profile, user);
    localStorage.setItem(equipKey, JSON.stringify(updated));
    setShowHardwareModal(false);
    setNewHardware({ employee: '', item: '', model: '', date: new Date().toISOString().split('T')[0] });
    setToast(`${newRecord.item} provided to ${newRecord.employee} successfully!`);
    setTimeout(() => setToast(''), 4000);
  };

  const handleAddSoftware = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = { ...newSoftware, status: 'Active' };
    const updated = [newRecord, ...licenses];
    setLicenses(updated);
    const licKey = getScopedKey('software_licenses', profile, user);
    localStorage.setItem(licKey, JSON.stringify(updated));
    setShowSoftwareModal(false);
    setNewSoftware({ employee: '', software: '', key: '', expiry: '' });
    setToast(`${newRecord.software} license provided to ${newRecord.employee} successfully!`);
    setTimeout(() => setToast(''), 4000);
  };

  const filteredEquip = equipment.filter(e => 
    e.employee.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLicenses = licenses.filter(l => 
    l.employee.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.software.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dynamic user identifier for filtering personal view
  const myEquipment = equipment.filter(e => {
    const empName = (e.employee || '').toLowerCase().trim();
    const curName = (profile?.full_name || '').toLowerCase().trim();
    const curId1 = (profile?.employee_id || '').toLowerCase().trim();
    const curId2 = (profile?.employeeId || '').toLowerCase().trim();
    return empName === curName || (curId1 && empName === curId1) || (curId2 && empName === curId2);
  });
  const myLicenses = licenses.filter(l => {
    const empName = (l.employee || '').toLowerCase().trim();
    const curName = (profile?.full_name || '').toLowerCase().trim();
    const curId1 = (profile?.employee_id || '').toLowerCase().trim();
    const curId2 = (profile?.employeeId || '').toLowerCase().trim();
    return empName === curName || (curId1 && empName === curId1) || (curId2 && empName === curId2);
  });

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500 pb-12">
      {toast && (
        <div className="fixed top-24 right-8 bg-brand-navy text-white px-6 py-3 rounded-xl shadow-2xl z-50 border border-brand-teal flex items-center gap-3 animate-in slide-in-from-right">
          <AlertCircle className="text-brand-teal" size={20} />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {/* Hardware Provisioning Modal */}
      {showHardwareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50">
              <CardTitle className="text-lg flex items-center gap-2"><Laptop size={20}/> Provision Hardware</CardTitle>
              <button onClick={() => setShowHardwareModal(false)} className="text-gray-400 hover:text-red-500" aria-label="Close modal" title="Close modal"><X size={20}/></button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddHardware} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="hw-employee" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Name or ID</label>
                  <select id="hw-employee" required title="Employee Name or ID" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm" 
                    value={newHardware.employee} onChange={e => setNewHardware({...newHardware, employee: e.target.value})}>
                    <option value="">Select Employee</option>
                    {employees.map((emp, index) => (
                      <option key={`hw-emp-${index}`} value={emp.name}>
                        {emp.name} ({emp.empId || 'No ID'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="hw-item" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</label>
                    <input id="hw-item" type="text" required placeholder="e.g. Laptop" title="Item Name" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" 
                      value={newHardware.item} onChange={e => setNewHardware({...newHardware, item: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="hw-model" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Model</label>
                    <input id="hw-model" type="text" required placeholder="e.g. Dell XPS 15" title="Model" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" 
                      value={newHardware.model} onChange={e => setNewHardware({...newHardware, model: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="hw-assigned-date" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Date</label>
                  <input id="hw-assigned-date" type="date" required title="Assigned Date" placeholder="Assigned Date" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" 
                    value={newHardware.date} onChange={e => setNewHardware({...newHardware, date: e.target.value})} />
                </div>
                <Button type="submit" className="w-full bg-brand-navy hover:bg-black mt-2">Provision Asset</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Software Provisioning Modal */}
      {showSoftwareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50">
              <CardTitle className="text-lg flex items-center gap-2"><KeyRound size={20}/> Assign License</CardTitle>
              <button onClick={() => setShowSoftwareModal(false)} className="text-gray-400 hover:text-red-500" aria-label="Close modal" title="Close modal"><X size={20}/></button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddSoftware} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="sw-employee" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Name</label>
                  <select id="sw-employee" required title="Employee Name" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none text-sm" 
                    value={newSoftware.employee} onChange={e => setNewSoftware({...newSoftware, employee: e.target.value})}>
                    <option value="">Select Employee</option>
                    {employees.map((emp, index) => (
                      <option key={`sw-emp-${index}`} value={emp.name}>
                        {emp.name} ({emp.empId || 'No ID'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="sw-name" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Software Name</label>
                  <input id="sw-name" type="text" required placeholder="e.g. IntelliJ IDEA" title="Software Name" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" 
                    value={newSoftware.software} onChange={e => setNewSoftware({...newSoftware, software: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="sw-key" className="text-xs font-bold text-gray-500 uppercase tracking-wider">License Key</label>
                    <input id="sw-key" type="text" required placeholder="Key or SSO" title="License Key" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" 
                      value={newSoftware.key} onChange={e => setNewSoftware({...newSoftware, key: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="sw-expiry" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry Date</label>
                    <input id="sw-expiry" type="text" required placeholder="e.g. Dec 2026" title="Expiry Date" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" 
                      value={newSoftware.expiry} onChange={e => setNewSoftware({...newSoftware, expiry: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-brand-navy hover:bg-black mt-2">Provision License</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <MonitorPlay size={24} className="text-brand-teal" /> 
          {isAdmin ? 'Global Asset Inventory' : 'My Equipment & Assets'}
        </h2>
        {isAdmin && (
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by employee or asset..." 
              title="Search by employee or asset"
              aria-label="Search by employee or asset"
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'gap-10' : 'lg:grid-cols-2 gap-8'}`}>
        
        {/* Hardware Card */}
        <Card className="h-full border-t-4 border-t-brand-navy shadow-xl shadow-brand-navy/5">
          <CardHeader className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Laptop size={20} className="text-brand-navy" /> {isAdmin ? 'Hardware Distributions' : 'Hardware Assigned'}</CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowHardwareModal(true)} className="w-full sm:w-auto justify-center gap-2 bg-brand-teal hover:bg-brand-teal/90">
                <Plus size={16}/> Provide Asset to New User
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50/50">
                  <tr>
                    {isAdmin && <th className="px-6 py-4">Employee</th>}
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Assigned Date</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(isAdmin ? filteredEquip : myEquipment).map((item, i) => (
                    <tr key={i} className="hover:bg-brand-teal/5 transition-colors group">
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                              {item.employee[0]}
                            </div>
                            <span className="font-bold text-brand-navy text-xs">{item.employee}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 font-semibold text-gray-700">{item.item}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{item.model}</td>
                      <td className="px-6 py-4 text-[10px] text-gray-400 font-medium italic">{item.date}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={item.status === 'Active' ? 'green' : 'amber'} className="font-bold shadow-sm">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(isAdmin ? filteredEquip : myEquipment).length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-400 italic">No asset records found matching your profile.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Software Licenses Card */}
        <Card className="h-full border-t-4 border-t-brand-teal shadow-xl shadow-brand-navy/5">
          <CardHeader className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2"><KeyRound size={20} className="text-brand-teal" /> {isAdmin ? 'Master Software Licenses' : 'Software Licenses'}</CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowSoftwareModal(true)} className="w-full sm:w-auto justify-center gap-2 bg-brand-navy hover:bg-black">
                <Plus size={16}/> Provide License to New User
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50/50">
                  <tr>
                    {isAdmin && <th className="px-6 py-4">Employee</th>}
                    <th className="px-6 py-4">Software</th>
                    <th className="px-6 py-4">License Key</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(isAdmin ? filteredLicenses : myLicenses).map((license, i) => (
                    <tr key={i} className="hover:bg-brand-teal/5 transition-colors group">
                      {isAdmin && (
                        <td className="px-6 py-4">
                           <span className="font-bold text-brand-navy text-xs">{license.employee}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 font-semibold text-gray-700">{license.software}</td>
                      <td className="px-6 py-4 font-mono text-[10px] tracking-tighter text-gray-400 bg-gray-50/30 rounded px-2 py-1 mx-6 my-4 inline-block">
                        {isAdmin || showKey ? license.key : '••••-••••-••••'}
                        {!isAdmin && (
                          <button onClick={() => setShowKey(!showKey)} className="ml-1 text-gray-400 hover:text-brand-teal" title="Toggle key visibility" aria-label="Toggle key visibility">
                            {showKey ? <EyeOff size={10} /> : <Eye size={10} />}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-gray-400 font-medium">
                        {license.expiry}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={license.status === 'Active' ? 'green' : 'red'} className="font-bold shadow-sm">
                          {license.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(isAdmin ? filteredLicenses : myLicenses).length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-400 italic">No license records found matching your profile.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Conditional Box 3 & 4 (Only for Employees) */}
        {!isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 col-span-1 lg:col-span-2">
            <Card className="h-full border-t-4 border-t-brand-navy">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield size={18} /> Credentials & Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">ID Card</span>
                  <span className="text-sm font-semibold">Active ({profile?.employeeId || profile?.employee_id || 'N/A'})</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">Login ID</span>
                  <span className="text-sm font-semibold">{profile?.email || 'jane.doe@vyarahr.com'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-500">System Password</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono tracking-wider">{showPwd ? 'Hunter*2026!' : '••••••••••••'}</span>
                    <button onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-brand-teal" title="Toggle password visibility" aria-label="Toggle password visibility">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-500">Building Badge</span>
                  <span className="text-sm font-semibold text-status-green items-center gap-1 flex"><CheckCircle size={14}/> Provisioned</span>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full bg-gray-50 border-dashed border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600"><AlertCircle size={18} /> Report an Issue</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleReport}>
                  <div>
                    <label htmlFor="report-asset" className="block text-sm font-medium text-gray-700 mb-1">Select Asset</label>
                    <select id="report-asset" title="Select Asset" className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal text-sm bg-white" required>
                      <option value="">-- Choose asset --</option>
                      {myEquipment.map((e, idx) => (
                        <option key={`hw-${idx}`} value={`Hardware: ${e.item}`}>Hardware: {e.item} ({e.model})</option>
                      ))}
                      {myLicenses.map((l, idx) => (
                        <option key={`sw-${idx}`} value={`Software: ${l.software}`}>Software: {l.software}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="report-issue-type" className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                    <select id="report-issue-type" title="Issue Type" className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal text-sm bg-white" required>
                      <option value="">-- Choose issue category --</option>
                      <option>Damaged / Broken</option>
                      <option>Not Working / Software Error</option>
                      <option>Lost / Stolen</option>
                      <option>Need Upgrade</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="report-desc" className="block text-sm font-medium text-gray-700 mb-1">Describe Issue</label>
                    <textarea id="report-desc" rows={3} title="Describe Issue" className="w-full border border-gray-300 bg-white rounded-md p-2 focus:ring-brand-teal resize-none text-sm" placeholder="Please provide details about what went wrong..." required></textarea>
                  </div>

                  <div className="pt-2">
                     <Button type="submit" className="w-full gap-2 bg-brand-navy hover:bg-black transition-all shadow-md"><Send size={16}/> Submit Report</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Equipment;
