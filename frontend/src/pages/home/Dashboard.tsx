import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserMinus, Send, RefreshCw, Mail, Briefcase, Calendar, Clock, LogOut as OffboardIcon, Layout, Fingerprint, Search, Plus, X, Bell, Pencil, Trash2, Download, UserPlus } from 'lucide-react';
import { getRelativeTime } from '../../lib/timeHelper';
import { getScopedKey } from '../../utils/tenantHelper';

const Dashboard = () => {
  const { profile, user } = useAuth();
  const { name: tenantName } = useTenant();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [absences, setAbsences] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [empSearchTerm, setEmpSearchTerm] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState({ title: '', message: '', visibleTo: 'all' });
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [refreshNotifyTrack, setRefreshNotifyTrack] = useState(0);
  const [submission, setSubmission] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    dob: '',
    address: '',
    employeeId: '',
    jobTitle: '',
    joiningDate: '',
    manager: '',
    bankAcc: '',
    bankName: '',
    ifsc: '',
    pan: '',
    offerLetter: false,
    aadhar: false,
    degree: false,
    photo: false
  });
  const [draftDocs, setDraftDocs] = useState({
    offerLetter: false,
    aadhar: false,
    degree: false,
    photo: false
  });
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    designation: '',
    department: '',
    grossSalary: '0',
    bankName: '',
    bankAccount: ''
  });


  useEffect(() => {
    if (profile?.role === 'employee' || (profile && user)) {
      const submissionsKey = getScopedKey('hr_employee_submissions', profile, user);
      const allSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '{}');
      const empSub = (profile.employee_id ? allSubmissions[profile.employee_id] : null) || 
                     allSubmissions[profile.employeeId] || 
                     allSubmissions[profile.id] || {};
      
      const names = profile.full_name ? profile.full_name.split(' ') : ['', ''];
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      setSubmission(prev => ({ 
        ...prev,
        firstName: prev.firstName || empSub.firstName || firstName,
        lastName: prev.lastName || empSub.lastName || lastName,
        email: prev.email || empSub.email || profile.email || '',
        employeeId: prev.employeeId || empSub.employeeId || profile.employee_id || '',
        jobTitle: prev.jobTitle || empSub.jobTitle || profile.designation || '',
        ...empSub 
      }));
    }
  }, [profile]);

  const handleDocSubmit = () => {
    const submissionsKey = getScopedKey('hr_employee_submissions', profile, user);
    const allSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '{}');
    const empId = profile?.employee_id || profile?.employeeId || profile?.id;
    if (!empId) return;

    const dataToSave = {
      ...submission,
      bankAcc: submission.bankAcc || 'Uploaded',
      ifsc: submission.ifsc || 'Uploaded',
      pan: submission.pan || 'Uploaded',
      offerLetter: true,
      aadhar: true,
      degree: true,
      photo: true,
      submittedAt: new Date().toISOString()
    };

    allSubmissions[empId] = dataToSave;
    
    // Save under all fallback keys to guarantee admin can find it
    if (profile?.id) {
      allSubmissions[profile.id] = dataToSave;
    }
    if (profile?.employee_id) {
      allSubmissions[profile.employee_id] = dataToSave;
    }
    if (profile?.employeeId) {
      allSubmissions[profile.employeeId] = dataToSave;
    }
    
    localStorage.setItem(submissionsKey, JSON.stringify(allSubmissions));
    setSubmission(dataToSave);
    alert('Onboarding documents submitted successfully for review!');
  };

  const handleSaveProfile = async () => {
    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.fullName,
          designation: editFormData.designation,
          department: editFormData.department,
          gross_salary: editFormData.grossSalary,
          bank_name: editFormData.bankName,
          bank_account: editFormData.bankAccount
        })
        .eq('id', editingEmployee.id);

      if (error) {
        alert(`Failed to update profile: ${error.message}`);
        return;
      }

      setEditingEmployee(null);
      await fetchProfiles();
      alert('Profile and salary updated successfully!');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('An error occurred. Please try again.');
    }
  };


  const handleFileChange = (docType: keyof typeof draftDocs) => {
    setDraftDocs(prev => ({ ...prev, [docType]: true }));
  };

  const postBroadcast = () => {
    if (!newUpdate.title || !newUpdate.message) return;
    
    const notificationsKey = getScopedKey('hr_notifications', profile, user);
    const notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
    const notification = {
      id: `NOTIF-${Date.now()}`,
      type: 'broadcast',
      title: newUpdate.title,
      message: newUpdate.message,
      time: 'Just now',
      admin_context: profile?.email || 'praveen12rangasamy@gmail.com',
      visibleTo: newUpdate.visibleTo || 'all'
    };
    
    notifications.unshift(notification);
    localStorage.setItem(notificationsKey, JSON.stringify(notifications.slice(0, 15)));
    
    setNewUpdate({ title: '', message: '', visibleTo: 'all' });
    setShowBroadcastModal(false);
    setRefreshNotifyTrack(prev => prev + 1);
    alert(newUpdate.visibleTo === 'admin' ? 'Confidential update posted for Admins only! ✓' : 'Update broadcasted to all employees! ✓');
  };

  const handleDeleteAnnouncement = (id: any) => {
    const notificationsKey = getScopedKey('hr_notifications', profile, user);
    const updated = JSON.parse(localStorage.getItem(notificationsKey) || '[]').filter((a: any) => a.id !== id);
    localStorage.setItem(notificationsKey, JSON.stringify(updated));
    setRefreshNotifyTrack(prev => prev + 1);
  };

  const handleEditAnnouncementSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('editTitle') as string;
    const message = formData.get('editMessage') as string;
    const visibleTo = formData.get('editVisibleTo') as string;
    
    const notificationsKey = getScopedKey('hr_notifications', profile, user);
    const allNotifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
    const updated = allNotifications.map((a: any) => 
      a.id === editingAnnouncement.id ? { ...a, title, message, visibleTo } : a
    );
    
    localStorage.setItem(notificationsKey, JSON.stringify(updated));
    setEditingAnnouncement(null);
    setRefreshNotifyTrack(prev => prev + 1);
  };

  useEffect(() => {
    // Immediate fetch on mount to ensure no empty screen
    fetchAllData();
    
    if (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner') {
      const interval = setInterval(fetchAllData, 10000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  const fetchEmployeeData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setRecentActivity(data[0]);
      }
    } catch (err) {
      console.error('Error fetching employee stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchAbsences(),
      fetchProfiles()
    ]);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    try {
      setRefreshing(true);
      
      // Fetch completed resignations to filter out offboarded employees
      const { data: resignedData } = await supabase
        .from('resignations')
        .select('user_id')
        .eq('status', 'Completed');
      const resignedIds = new Set((resignedData || []).map(r => r.user_id));

      const { data: dbData, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'inactive')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      const filteredProfiles = (dbData || []).filter(p => 
        p.role !== 'inactive' && 
        (p.role !== 'employee' || !resignedIds.has(p.id))
      );
      setProfiles(filteredProfiles);
      
      // Update totalEmployees stat dynamically
      setStats(prev => ({
        ...prev,
        totalEmployees: filteredProfiles.filter(p => p.role === 'employee').length
      }));
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setRefreshing(false);
    }
  };


   const handleSync = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleDownloadCSV = () => {
    if (!profiles || profiles.length === 0) {
      alert("No employees to download.");
      return;
    }

    const headers = ["Employee ID", "Full Name", "Email", "Role", "Designation", "Onboarding Status"];
    const rows = profiles.map(p => [
      p.employee_id || p.id || '',
      p.full_name || '',
      p.email || '',
      p.role || '',
      p.designation || 'Staff',
      p.onboarding_status || 'Completed'
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vyarahr_employees_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restoreOwnership = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hired_by: 'praveen12rangasamy@gmail.com' })
        .is('hired_by', null); // Fix only orphans
      
      const { error: error2 } = await supabase
        .from('profiles')
        .update({ hired_by: 'praveen12rangasamy@gmail.com' })
        .neq('hired_by', 'praveen12rangasamy@gmail.com'); // Fix misassigned
        
      if (!error && !error2) {
        alert('All employee records have been successfully restored under your account.');
        fetchAllData();
      }
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAbsences = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id!inner (full_name, designation, hired_by)
        `)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .eq('profiles.hired_by', profile?.email || '');

      if (!error && data) {
        setAbsences(data);
      }
    } catch (err) {
      console.error('Error fetching absences:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch completed resignations to filter out offboarded employees
      const { data: resignedData } = await supabase
        .from('resignations')
        .select('user_id')
        .eq('status', 'Completed');
      const resignedIds = new Set((resignedData || []).map(r => r.user_id));

      // Operational Dashboard: show real tenant employees metrics
      const { data: empProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'employee');
      
      const employeeIds = (empProfiles || []).filter(p => !resignedIds.has(p.id)).map(p => p.id);
        
      const { count: presentToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('user_id', employeeIds)
        .not('clock_in', 'is', null);
        
      const { count: onLeave } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .in('user_id', employeeIds)
        .lte('start_date', today)
        .gte('end_date', today);

      setStats(prev => ({
        ...prev,
        totalEmployees: employeeIds.length,
        presentToday: presentToday || 0,
        onLeave: onLeave || 0
      }));
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin' && profile?.role !== 'owner') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="space-y-3">
          <h2 className="text-3xl sm:text-5xl font-bold text-brand-navy tracking-tight">Welcome back, {profile?.full_name?.split(' ')[0] || 'Employee'}! 👋</h2>
          <p className="text-base sm:text-lg text-gray-500">Here's what's happening in your workspace today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/dashboard/updates" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-brand-teal/5 to-white border-l-4 border-l-brand-teal overflow-hidden">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal group-hover:scale-110 transition-transform">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-navy">Updates</h3>
                  <p className="text-sm text-gray-500 mt-1">Check company announcements and new job openings.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/myspace/attendance" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-emerald-50/30 to-white border-l-4 border-l-status-green overflow-hidden">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-status-green group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-navy">Attendance</h3>
                  <p className="text-sm text-gray-500 mt-1">Mark your daily presence and track work hours.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/myspace/leaves" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50/30 to-white border-l-4 border-l-blue-500 overflow-hidden">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-navy">Leave</h3>
                  <p className="text-sm text-gray-500 mt-1">Request time off and view your remaining balance.</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Onboarding Document Center</CardTitle>
              <Badge variant="blue">Compliance Required</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-xl space-y-3 bg-gray-50/50 hover:border-brand-teal/50 transition-colors">
                    <label htmlFor="upload-offer-letter" className="text-xs font-bold text-brand-navy uppercase flex items-center justify-between">
                      Offer Letter
                      {submission.offerLetter ? (
                        <Badge variant="green">Uploaded</Badge>
                      ) : draftDocs.offerLetter ? (
                        <Badge variant="blue">Ready</Badge>
                      ) : (
                        <Badge variant="amber">Required</Badge>
                      )}
                    </label>
                    <input id="upload-offer-letter" type="file" className="w-full text-xs text-gray-400" onChange={() => handleFileChange('offerLetter')} />
                  </div>
                  <div className="p-4 border rounded-xl space-y-3 bg-gray-50/50 hover:border-brand-teal/50 transition-colors">
                    <label htmlFor="upload-aadhar" className="text-xs font-bold text-brand-navy uppercase flex items-center justify-between">
                      Aadhar Card
                      {submission.aadhar ? (
                        <Badge variant="green">Uploaded</Badge>
                      ) : draftDocs.aadhar ? (
                        <Badge variant="blue">Ready</Badge>
                      ) : (
                        <Badge variant="amber">Required</Badge>
                      )}
                    </label>
                    <input id="upload-aadhar" type="file" className="w-full text-xs text-gray-400" onChange={() => handleFileChange('aadhar')} />
                  </div>
                  <div className="p-4 border rounded-xl space-y-3 bg-gray-50/50 hover:border-brand-teal/50 transition-colors">
                    <label htmlFor="upload-degree" className="text-xs font-bold text-brand-navy uppercase flex items-center justify-between">
                      Degree Certificate
                      {submission.degree ? (
                        <Badge variant="green">Uploaded</Badge>
                      ) : draftDocs.degree ? (
                        <Badge variant="blue">Ready</Badge>
                      ) : (
                        <Badge variant="amber">Required</Badge>
                      )}
                    </label>
                    <input id="upload-degree" type="file" className="w-full text-xs text-gray-400" onChange={() => handleFileChange('degree')} />
                  </div>
                  <div className="p-4 border rounded-xl space-y-3 bg-gray-50/50 hover:border-brand-teal/50 transition-colors">
                    <label htmlFor="upload-photo" className="text-xs font-bold text-brand-navy uppercase flex items-center justify-between">
                      Photograph
                      {submission.photo ? (
                        <Badge variant="green">Uploaded</Badge>
                      ) : draftDocs.photo ? (
                        <Badge variant="blue">Ready</Badge>
                      ) : (
                        <Badge variant="amber">Required</Badge>
                      )}
                    </label>
                    <input id="upload-photo" type="file" className="w-full text-xs text-gray-400" onChange={() => handleFileChange('photo')} />
                  </div>
                </div>

                <div className="p-6 border rounded-2xl bg-brand-navy/5 space-y-6">
                  <h5 className="text-sm font-bold text-brand-navy">1. Personal Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">First Name</label>
                      <input 
                        type="text" 
                        placeholder="First Name" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.firstName}
                        onChange={(e) => setSubmission({...submission, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Last Name</label>
                      <input 
                        type="text" 
                        placeholder="Last Name" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.lastName}
                        onChange={(e) => setSubmission({...submission, lastName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="email@example.com" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.email}
                        onChange={(e) => setSubmission({...submission, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number</label>
                      <input 
                        type="tel" 
                        placeholder="+91 XXXXX XXXXX" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.mobile}
                        onChange={(e) => setSubmission({...submission, mobile: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="submission-dob" className="text-[10px] font-bold text-gray-500 uppercase">Date of Birth</label>
                      <input 
                        id="submission-dob"
                        type="date" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.dob}
                        onChange={(e) => setSubmission({...submission, dob: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="submission-address" className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
                      <input 
                        id="submission-address"
                        type="text" 
                        placeholder="Current Address" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.address}
                        onChange={(e) => setSubmission({...submission, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <h5 className="text-sm font-bold text-brand-navy pt-4 border-t">2. Employment Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="submission-empid" className="text-[10px] font-bold text-gray-500 uppercase">Employee ID</label>
                      <input 
                        id="submission-empid"
                        type="text" 
                        placeholder="e.g. VYR-001" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.employeeId}
                        onChange={(e) => setSubmission({...submission, employeeId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="submission-jobtitle" className="text-[10px] font-bold text-gray-500 uppercase">Job Title</label>
                      <input 
                        id="submission-jobtitle"
                        type="text" 
                        placeholder="e.g. Senior Developer" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.jobTitle}
                        onChange={(e) => setSubmission({...submission, jobTitle: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="submission-joining-date" className="text-[10px] font-bold text-gray-500 uppercase">Date of Joining</label>
                      <input 
                        id="submission-joining-date"
                        type="date" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.joiningDate}
                        onChange={(e) => setSubmission({...submission, joiningDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Reporting Manager</label>
                      <input 
                        type="text" 
                        placeholder="Assigned Manager" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.manager}
                        onChange={(e) => setSubmission({...submission, manager: e.target.value})}
                      />
                    </div>
                  </div>

                  <h5 className="text-sm font-bold text-brand-navy pt-4 border-t">3. Financial & ID Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">PAN Card Number</label>
                      <input 
                        type="text" 
                        placeholder="P-A-N Number" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.pan}
                        onChange={(e) => setSubmission({...submission, pan: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Bank Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. ICICI Bank" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.bankName}
                        onChange={(e) => setSubmission({...submission, bankName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Account Number</label>
                      <input 
                        type="text" 
                        placeholder="Enter 12-16 digit No" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.bankAcc}
                        onChange={(e) => setSubmission({...submission, bankAcc: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">IFSC Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g. ICIC0000123" 
                        className="w-full border p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-brand-teal"
                        value={submission.ifsc}
                        onChange={(e) => setSubmission({...submission, ifsc: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const isOfferLetterReady = draftDocs.offerLetter || submission.offerLetter;
                  const isAadharReady = draftDocs.aadhar || submission.aadhar;
                  const isDegreeReady = draftDocs.degree || submission.degree;
                  const isPhotoReady = draftDocs.photo || submission.photo;

                  const canSubmit = isOfferLetterReady && isAadharReady && isDegreeReady && isPhotoReady && 
                    submission.bankAcc && submission.ifsc && submission.pan && 
                    submission.firstName && submission.lastName && submission.email && 
                    submission.mobile && submission.dob && submission.address && 
                    submission.employeeId && submission.jobTitle && submission.bankName;

                  return (
                    <Button 
                      className={`w-full py-6 h-auto text-sm font-bold shadow-lg transition-all ${
                        canSubmit 
                        ? 'bg-brand-teal hover:bg-emerald-600 shadow-brand-teal/20' 
                        : 'bg-gray-300 cursor-not-allowed grayscale'
                      }`} 
                      onClick={handleDocSubmit}
                      disabled={!canSubmit}
                    >
                      {canSubmit 
                        ? 'Submit All Details & Documents' 
                        : 'Please fill all required fields & upload all 4 documents to submit'}
                    </Button>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>My Company Profile</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-teal flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-teal/20">
                  {profile?.full_name?.[0] || 'E'}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-brand-navy">{profile?.full_name || 'User'}</h4>
                  <p className="text-sm text-brand-teal font-medium uppercase tracking-wider">{profile?.designation || (profile?.role ? String(profile.role).toUpperCase() : 'Team Member')}</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm">
                  <Fingerprint size={18} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Employee ID</p>
                    <p className="font-mono font-bold text-brand-navy">{profile?.employeeId || profile?.employee_id || 'Not Assigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase size={18} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Organization</p>
                    <p className="font-medium text-brand-navy">{tenantName || profile?.organization_name || 'Organization'}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button variant="outline" className="w-full text-xs h-10 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">Download ID Card PDF</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Updates for Employees */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
            <div className="flex items-center gap-2">
              <Bell className="text-brand-teal" size={20} />
              <CardTitle>Company Updates</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
              {(() => {
                const notifKey = getScopedKey('hr_notifications', profile, user);
                const notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');

                if (notifications.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400">
                      <Bell className="mx-auto mb-2 opacity-20" size={32} />
                      <p className="italic text-sm">No recent updates from management.</p>
                    </div>
                  );
                }
                return notifications.map((n: any) => (
                  <div key={n.id} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand-teal/30 hover:bg-brand-teal/5 transition-all group">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${n.type === 'broadcast' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-navy/10 text-brand-navy'}`}>
                      {n.type === 'broadcast' ? <Bell size={20} /> : <Briefcase size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-brand-navy group-hover:text-black transition-colors">{n.title}</h4>
                        <div className="flex items-center gap-4">
                          {profile?.role === 'admin' && (
                             <div className="hidden group-hover:flex items-center gap-3 mr-3 border-r pr-4 border-gray-200">
                               <Button variant="ghost" size="sm" onClick={() => setEditingAnnouncement(n)} className="h-7 text-xs gap-1.5 text-gray-500 hover:text-brand-teal p-1 px-2">
                                 <Pencil size={12} /> Edit
                               </Button>
                               <Button variant="ghost" size="sm" onClick={() => handleDeleteAnnouncement(n.id)} className="h-7 text-xs gap-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 px-2">
                                 <Trash2 size={12} /> Delete
                               </Button>
                             </div>
                          )}
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{getRelativeTime(n.time)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4 sm:mb-8">
        <h2 className="text-2xl sm:text-4xl font-bold text-brand-navy tracking-tight">Dashboard Snapshot</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <Card className="border-l-4 border-l-brand-teal">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <h3 className="text-3xl font-bold mt-2 text-brand-navy">
                {loading ? '...' : stats.totalEmployees}
              </h3>
            </div>
            <div className="p-4 bg-brand-bg rounded-full text-brand-teal">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-green">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {profile?.role === 'superadmin' ? 'Total Admins' : 'Present Today'}
              </p>
              <h3 className="text-3xl font-bold mt-2 text-brand-navy">
                {loading ? '...' : stats.presentToday}
              </h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-full text-status-green">
              <UserCheck size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-amber">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">On Leave</p>
              <h3 className="text-3xl font-bold mt-2 text-brand-navy">
                {loading ? '...' : stats.onLeave}
              </h3>
            </div>
            <div className="p-4 bg-amber-50 rounded-full text-status-amber">
              <UserMinus size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {profile?.role !== 'superadmin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          <div onClick={() => document.getElementById('company-updates-section')?.scrollIntoView({ behavior: 'smooth' })} className="group cursor-pointer">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-brand-teal/5 to-white border-l-4 border-l-brand-teal overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal group-hover:scale-110 transition-transform">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Company Updates</h3>
                  <p className="text-xs text-gray-500 mt-1">Post announcements and manage job openings.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Link to="/dashboard/hiring" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50/30 to-white border-l-4 border-l-blue-500 overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Layout size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Hiring Pipeline</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage applicants, screening, and onboarding.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/offboarding" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-amber-50/30 to-white border-l-4 border-l-status-amber overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-status-amber group-hover:scale-110 transition-transform">
                  <OffboardIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Offboarding</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage exit processes and asset returns.</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {profile?.role === 'superadmin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6">
          <Link to="/dashboard/admins" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-brand-orange/5 to-white border-l-4 border-l-brand-orange overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Admin Management</h3>
                  <p className="text-xs text-gray-500 mt-1">Provision and delete company admin accounts.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/updates" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-purple-50/30 to-white border-l-4 border-l-purple-500 overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Post Job</h3>
                  <p className="text-xs text-gray-500 mt-1">Post job vacancies and updates to the portal.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/hiring" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-brand-teal/5 to-white border-l-4 border-l-brand-teal overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal group-hover:scale-110 transition-transform">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Hiring & Onboarding</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage applicants, ATS screening, and employee creation.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/employees" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50/30 to-white border-l-4 border-l-blue-500 overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Employee Management</h3>
                  <p className="text-xs text-gray-500 mt-1">Assign employees to respective HR admins.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/offboarding" className="group">
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-amber-50/30 to-white border-l-4 border-l-status-amber overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-status-amber group-hover:scale-110 transition-transform">
                  <OffboardIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">Offboarding</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage exit processes and asset returns.</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {profile?.role === 'superadmin' ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Box 1: Admins */}
          <Card className="border-t-4 border-t-brand-orange">
            <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-2">
              <CardTitle>Admins</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative group w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand-teal transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search admins..." 
                    className="pl-9 pr-4 py-2 border rounded-xl bg-gray-50/50 text-xs outline-none focus:ring-2 focus:ring-brand-teal w-full sm:w-48 transition-all"
                    value={adminSearchTerm}
                    onChange={(e) => setAdminSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = (profiles || []).filter(p => p.role === 'admin').filter(p => {
                        const searchStr = adminSearchTerm.toLowerCase();
                        return (p.full_name || '').toLowerCase().includes(searchStr) || 
                               (p.email || '').toLowerCase().includes(searchStr) || 
                               (p.employee_id || '').toLowerCase().includes(searchStr);
                      });
                      
                      if (filtered.length === 0) {
                        return <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">No admins found</td></tr>;
                      }

                      return filtered.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-brand-navy">
                            {p.full_name || 'N/A'}
                            <div className="text-[10px] text-gray-400 font-normal">{p.employee_id}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{p.email}</td>
                          <td className="px-4 py-3 text-gray-500">{p.designation || 'Administrator'}</td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-brand-teal border-brand-teal hover:bg-brand-teal hover:text-white"
                              onClick={() => {
                                const submissionsKey = getScopedKey('hr_employee_submissions', profile, user);
                                const allSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '{}');
                                const sub = (p.employee_id ? allSubmissions[p.employee_id] : null) || allSubmissions[p.id] || null;
                                setSelectedProfile({ ...p, submission: sub });
                              }}
                            >
                              View Profile
                            </Button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Box 2: Employees */}
          <Card className="border-t-4 border-t-brand-teal">
            <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-2">
              <CardTitle>Employees</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative group w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand-teal transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search employees..." 
                    className="pl-9 pr-4 py-2 border rounded-xl bg-gray-50/50 text-xs outline-none focus:ring-2 focus:ring-brand-teal w-full sm:w-48 transition-all"
                    value={empSearchTerm}
                    onChange={(e) => setEmpSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = (profiles || []).filter(p => p.role === 'employee').filter(p => {
                        const searchStr = empSearchTerm.toLowerCase();
                        return (p.full_name || '').toLowerCase().includes(searchStr) || 
                               (p.email || '').toLowerCase().includes(searchStr) || 
                               (p.employee_id || '').toLowerCase().includes(searchStr);
                      });
                      
                      if (filtered.length === 0) {
                        return <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">No employees found</td></tr>;
                      }

                      return filtered.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-brand-navy">
                            {p.full_name || 'N/A'}
                            <div className="text-[10px] text-gray-400 font-normal">{p.employee_id}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{p.email}</td>
                          <td className="px-4 py-3 text-gray-500">{p.designation || 'Staff'}</td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-brand-teal border-brand-teal hover:bg-brand-teal hover:text-white"
                              onClick={() => {
                                const submissionsKey = getScopedKey('hr_employee_submissions', profile, user);
                                const allSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '{}');
                                const sub = (p.employee_id ? allSubmissions[p.employee_id] : null) || allSubmissions[p.id] || null;
                                setSelectedProfile({ ...p, submission: sub });
                              }}
                            >
                              View Profile
                            </Button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div id="company-updates-section" className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-2">
              <CardTitle>Current Employees ({profiles.length})</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={restoreOwnership}
                  className="gap-2 text-status-amber hover:bg-status-amber/5 font-bold border border-status-amber/20 text-xs"
                >
                  Restore to My Account
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSync}
                  className="gap-2 text-brand-teal hover:bg-brand-teal/5 font-bold text-xs"
                >
                  <div className={refreshing ? 'animate-spin' : ''}>
                    <OffboardIcon size={16} /> 
                  </div>
                  Sync
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDownloadCSV}
                  className="gap-2 text-brand-teal hover:bg-brand-teal/5 font-bold text-xs"
                >
                  <Download size={16} /> 
                  Download CSV
                </Button>
                <div className="relative group w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand-teal transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search name or email..." 
                    className="pl-9 pr-4 py-2 border rounded-xl bg-gray-50/50 text-xs outline-none focus:ring-2 focus:ring-brand-teal w-full sm:w-64 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3 hidden md:table-cell">Email</th>
                      <th className="px-6 py-3 hidden md:table-cell">Role</th>
                      <th className="px-6 py-3">Designation</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = (profiles || []).filter(p => {
                        if (!p) return false;
                        const searchStr = (searchTerm || '').toLowerCase();
                        const name = (p.full_name || '').toLowerCase();
                        const email = (p.email || '').toLowerCase();
                        const eid = (p.employee_id || p.id || '').toLowerCase();
                        
                        return name.includes(searchStr) || email.includes(searchStr) || eid.includes(searchStr);
                      });
                      
                      if (filtered.length === 0) {
                        return <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">No employees found matching "{searchTerm}"</td></tr>;
                      }

                      return filtered.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-brand-navy">
                          {p.full_name || 'N/A'}
                          <div className="text-[10px] text-gray-400 font-normal">{p.employee_id}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <Mail size={12} /> {p.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Badge variant={p.role === 'admin' ? 'blue' : 'neutral'}>{p.role}</Badge> 
                            {p.onboarding_status && p.onboarding_status !== 'Completed' && (
                              <Badge variant="amber">Onboarding</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {p.designation || 'Staff'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-brand-teal border-brand-teal hover:bg-brand-teal hover:text-white"
                            onClick={() => {
                              const submissionsKey = getScopedKey('hr_employee_submissions', profile, user);
                              const allSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '{}');
                              const sub = (p.employee_id ? allSubmissions[p.employee_id] : null) || allSubmissions[p.id] || null;
                              setSelectedProfile({ ...p, submission: sub });
                            }}
                          >
                            View Profile
                          </Button>
                          {(profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'superadmin') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white flex items-center gap-1.5"
                              onClick={() => {
                                setEditingEmployee(p);
                                setEditFormData({
                                  fullName: p.full_name || '',
                                  designation: p.designation || '',
                                  department: p.department || '',
                                  grossSalary: p.gross_salary || '0',
                                  bankName: p.bank_name || '',
                                  bankAccount: p.bank_account || ''
                                });
                              }}
                            >
                              <Pencil size={12} /> Edit
                            </Button>
                          )}
                        </td>

                      </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
              <div className="flex items-center gap-2">
                <Bell className="text-brand-teal" size={20} />
                <CardTitle>New Update</CardTitle>
              </div>
              {(profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner') && (
                <Button 
                  size="sm" 
                  className="bg-brand-teal hover:bg-emerald-600 rounded-full w-8 h-8 p-0 flex items-center justify-center shadow-lg active:scale-95 transition-all"
                  onClick={() => setShowBroadcastModal(true)}
                >
                  <Plus size={20} />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {(() => {
                  const notificationsKey = getScopedKey('hr_notifications', profile, user);
                  const notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');

                  // Filter notifications based on role
                  const filtered = notifications.filter((n: any) => {
                    if (profile?.role === 'employee') {
                      return !n.visibleTo || n.visibleTo === 'all';
                    }
                    return true; // admin and superadmin see everything
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Bell className="mx-auto mb-2 opacity-20" size={48} />
                        <p className="italic">No recent updates for your organization.</p>
                      </div>
                    );
                  }
                  return filtered.map((n: any) => (
                    <div key={n.id} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand-teal/30 hover:bg-brand-teal/5 transition-all group">
                      <div className={`p-3 rounded-lg flex-shrink-0 ${n.type === 'broadcast' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-navy/10 text-brand-navy'}`}>
                        {n.type === 'broadcast' ? <Bell size={20} /> : <Briefcase size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-brand-navy group-hover:text-black transition-colors">{n.title}</h4>
                            {n.visibleTo === 'admin' && (
                              <Badge variant="amber" className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Confidential</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {(profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner') && (
                               <div className="hidden group-hover:flex items-center gap-3 mr-3 border-r pr-4 border-gray-200">
                                 <Button variant="ghost" size="sm" onClick={() => setEditingAnnouncement(n)} className="h-7 text-xs gap-1.5 text-gray-500 hover:text-brand-teal p-1 px-2">
                                   <Pencil size={12} /> Edit
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleDeleteAnnouncement(n.id)} className="h-7 text-xs gap-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 px-2">
                                   <Trash2 size={12} /> Delete
                                 </Button>
                               </div>
                            )}
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{getRelativeTime(n.time)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
      </div>

      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg border-none shadow-2xl animate-in zoom-in duration-300">
            <CardHeader className="flex flex-row justify-between items-center border-b">
              <CardTitle className="flex items-center gap-2">
                <Send size={18} className="text-brand-teal" />
                Broadcast New Update
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBroadcastModal(false)}>
                <X size={20} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Update Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mandatory Policy Change" 
                  className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Content / Message</label>
                <textarea 
                  rows={4} 
                  placeholder="Type the content of your update here..." 
                  className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal resize-none"
                  value={newUpdate.message}
                  onChange={(e) => setNewUpdate({ ...newUpdate, message: e.target.value })}
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Visible To</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="visibleTo" 
                      value="all"
                      checked={newUpdate.visibleTo === 'all'}
                      onChange={() => setNewUpdate({ ...newUpdate, visibleTo: 'all' })}
                      className="accent-brand-teal"
                    />
                    Everyone (Admins & Employees)
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="visibleTo" 
                      value="admin"
                      checked={newUpdate.visibleTo === 'admin'}
                      onChange={() => setNewUpdate({ ...newUpdate, visibleTo: 'admin' })}
                      className="accent-brand-teal"
                    />
                    Admins Only (Confidential)
                  </label>
                </div>
              </div>

              <Button 
                className="w-full py-6 text-base font-bold bg-brand-navy hover:bg-black shadow-lg"
                onClick={postBroadcast}
              >
                Post Update
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Edit Announcement</CardTitle>
              <button onClick={() => setEditingAnnouncement(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close modal" title="Close modal"><X size={20} /></button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleEditAnnouncementSave} className="space-y-4">
                <div>
                  <label htmlFor="edit-announce-title" className="text-xs font-bold text-gray-500 mb-1 block">Title</label>
                  <input id="edit-announce-title" name="editTitle" type="text" defaultValue={editingAnnouncement.title} className="w-full text-sm p-3 border rounded-lg" required />
                </div>
                <div>
                  <label htmlFor="edit-announce-msg" className="text-xs font-bold text-gray-500 mb-1 block">Message</label>
                  <textarea id="edit-announce-msg" name="editMessage" defaultValue={editingAnnouncement.message} className="w-full text-sm p-3 border rounded-lg h-32" required />
                </div>
                <div>
                  <label htmlFor="edit-announce-visibility" className="text-xs font-bold text-gray-500 mb-1 block">Visible To</label>
                  <select 
                    id="edit-announce-visibility"
                    name="editVisibleTo" 
                    defaultValue={editingAnnouncement.visibleTo || 'all'}
                    className="w-full text-sm p-3 border rounded-lg bg-white"
                    required
                  >
                    <option value="all">Everyone (Admins & Employees)</option>
                    <option value="admin">Admins Only (Confidential)</option>
                  </select>
                </div>
                <Button className="w-full bg-brand-navy shrink-0">Save Changes</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== PROFILE MODAL ===== */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <CardHeader className="bg-brand-navy text-white border-b flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-brand-teal flex items-center justify-center font-bold text-xl">
                   {selectedProfile.full_name?.[0]}
                 </div>
                 <div>
                   <CardTitle className="text-white">{selectedProfile.full_name}</CardTitle>
                   <p className="text-xs text-brand-teal font-medium uppercase">{selectedProfile.designation || 'Hired Professional'}</p>
                 </div>
              </div>
              <button 
                onClick={() => setSelectedProfile(null)} 
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Close profile"
                title="Close profile"
              >
                <X size={24} />
              </button>
            </CardHeader>
            <CardContent className="p-6 max-h-[80vh] overflow-y-auto">
              {selectedProfile.submission ? (
                <div className="space-y-8">
                  {/* Personal Section */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-brand-teal uppercase border-b pb-1">1. Personal Details</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">First Name</p><p className="font-medium">{selectedProfile.submission.firstName}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Last Name</p><p className="font-medium">{selectedProfile.submission.lastName}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Email</p><p className="font-medium">{selectedProfile.submission.email}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Mobile</p><p className="font-medium">{selectedProfile.submission.mobile}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Date of Birth</p><p className="font-medium">{selectedProfile.submission.dob}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Address</p><p className="font-medium">{selectedProfile.submission.address}</p></div>
                    </div>
                  </div>

                  {/* Employment Section */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-brand-teal uppercase border-b pb-1">2. Employment Details</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Employee ID</p><p className="font-medium">{selectedProfile.submission.employeeId}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Job Title</p><p className="font-medium">{selectedProfile.submission.jobTitle}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Joining Date</p><p className="font-medium">{selectedProfile.submission.joiningDate}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Manager</p><p className="font-medium">{selectedProfile.submission.manager}</p></div>
                    </div>
                  </div>

                  {/* Financial Section */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-brand-teal uppercase border-b pb-1">3. Financial & ID Details</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">PAN Number</p><p className="font-medium">{selectedProfile.submission.pan || 'N/A'}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Bank Name</p><p className="font-medium">{selectedProfile.submission.bankName || 'N/A'}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Account Number</p><p className="font-medium">{selectedProfile.submission.bankAcc || 'N/A'}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">IFSC Code</p><p className="font-medium">{selectedProfile.submission.ifsc || 'N/A'}</p></div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-brand-teal uppercase border-b pb-1">4. Verfied Documents</h5>
                    <div className="flex flex-wrap gap-3">
                      {['Offer Letter', 'Aadhar Card', 'Degree', 'Photograph'].map(doc => (
                        <div key={doc} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                          <Plus size={14} className="rotate-45" /> {doc}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <Users size={32} />
                  </div>
                  <p className="text-gray-500 italic">This employee hasn't submitted their onboarding details yet.</p>
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
               <Button onClick={() => setSelectedProfile(null)} className="px-6">Close Reference</Button>
            </div>
          </Card>
        </div>
      )}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
          <Card className="w-full max-w-lg border-none shadow-2xl animate-in zoom-in duration-300">
            <CardHeader className="flex flex-row justify-between items-center border-b pb-4 bg-brand-navy text-white">
              <CardTitle className="flex items-center gap-2 text-white">
                <Pencil size={20} className="text-brand-teal" />
                Edit Profile & Salary
              </CardTitle>
              <button 
                onClick={() => setEditingEmployee(null)} 
                title="Close"
                aria-label="Close"
                className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label htmlFor="edit-full-name" className="text-xs font-bold text-brand-navy uppercase pl-1">Full Name</label>
                <input 
                  id="edit-full-name"
                  type="text" 
                  title="Full Name"
                  placeholder="Enter full name"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="edit-designation" className="text-xs font-bold text-brand-navy uppercase pl-1">Designation</label>
                  <input 
                    id="edit-designation"
                    type="text" 
                    title="Designation"
                    placeholder="Enter designation"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-department" className="text-xs font-bold text-brand-navy uppercase pl-1">Department</label>
                  <input 
                    id="edit-department"
                    type="text" 
                    title="Department"
                    placeholder="Enter department"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase pl-1">Gross Salary (CTC - Monthly)</label>
                <input 
                  type="number" 
                  value={editFormData.grossSalary}
                  onChange={(e) => setEditFormData({ ...editFormData, grossSalary: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-bold text-brand-orange"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase pl-1">Bank Name</label>
                  <input 
                    type="text" 
                    value={editFormData.bankName}
                    onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase pl-1">Bank Account</label>
                  <input 
                    type="text" 
                    value={editFormData.bankAccount}
                    onChange={(e) => setEditFormData({ ...editFormData, bankAccount: e.target.value })}
                    placeholder="e.g. 50100293883"
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                  />
                </div>
              </div>
            </CardContent>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
              <Button onClick={handleSaveProfile} className="bg-brand-orange hover:bg-orange-600 font-bold px-6">Save Changes</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
