import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Clock, CalendarDays, CheckCircle, BarChart2, RefreshCw, Search, Fingerprint, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProfileDetails {
  employee_id: string;
  full_name: string;
  designation: string;
  hired_by: string;
}

interface AttendanceLog {
  id?: string;
  user_id?: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  entry_type: string;
  profiles?: ProfileDetails | null;
}

const Attendance = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  const [searchDate, setSearchDate] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<AttendanceLog[]>([]);
  const [manualData, setManualData] = useState(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return { date: now.toISOString().split('T')[0], inTime: `${hh}:${mm}`, outTime: '' };
  });
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  // Admin: split into pending approvals and approved records
  const [adminLogs, setAdminLogs] = useState<AttendanceLog[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<AttendanceLog[]>([]);
  const [adminTab, setAdminTab] = useState<'pending' | 'approved'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  // ─── Admin fetch ───────────────────────────────────────────────────────────
  const fetchAdminEntranceLogs = useCallback(async () => {
    setLoading(true);
    let allLogs: AttendanceLog[] = [];

    try {
      if (!profile?.email) return;

      const isPrimaryAdmin = profile.email.trim().toLowerCase() === 'praveen12rangasamy@gmail.com';

      let query = supabase
        .from('attendance')
        .select(`
          id,
          date,
          clock_in,
          clock_out,
          status,
          entry_type,
          profiles!inner (
            employee_id,
            full_name,
            designation,
            hired_by
          )
        `)
        .order('date', { ascending: false })
        .order('clock_in', { ascending: false });

      if (!isPrimaryAdmin) {
        query = query.ilike('profiles.hired_by', profile.email.trim());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Admin logs fetch error:', error);
      } else if (data) {
        allLogs = (data as unknown as AttendanceLog[]).filter(
          log => log.profiles && log.profiles.full_name
        );
      }
    } catch (err) {
      console.error('Admin logs fetch error:', err);
    }

    setAdminLogs(allLogs);
    setFilteredEmployees(allLogs);
    setLoading(false);
  }, [profile?.email]);

  // ─── Employee fetch ────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    let dbLogs: AttendanceLog[] = [];
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false });
      if (error) {
        console.error('Error fetching attendance:', error);
      } else if (data) {
        dbLogs = data as unknown as AttendanceLog[];
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }

    setLogs(dbLogs);
    setFilteredLogs(dbLogs.slice(0, 10));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminEntranceLogs();
    } else {
      fetchAttendance();
    }
  }, [isAdmin, fetchAdminEntranceLogs, fetchAttendance]);

  // ─── Admin: approve/reject attendance ─────────────────────────────────────
  const handleApprove = async (log: AttendanceLog) => {
    if (!log.id) return;
    setActionLoading(log.id);
    const { error } = await supabase
      .from('attendance')
      .update({ status: 'present', entry_type: 'manual' })
      .eq('id', log.id);
    if (error) {
      showToast('Failed to approve attendance.', 'error');
    } else {
      showToast('Attendance approved — marked as Present.');
      await fetchAdminEntranceLogs();
    }
    setActionLoading(null);
  };

  const handleReject = async (log: AttendanceLog) => {
    if (!log.id) return;
    setActionLoading(log.id);
    // Clock-out rejection: keep clock-in approved, just clear clock_out
    // Clock-in rejection: mark absent and clear all times
    const isClockOutRejection = log.entry_type === 'manual' && log.status === 'absent' && log.clock_in !== null && log.clock_out !== null;
    let updatePayload: any;
    if (isClockOutRejection) {
      updatePayload = { clock_out: null, status: 'present', entry_type: 'manual' };
    } else {
      updatePayload = { status: 'absent', entry_type: 'manual', clock_in: null, clock_out: null };
    }
    const { error } = await supabase
      .from('attendance')
      .update(updatePayload)
      .eq('id', log.id);
    if (error) {
      showToast('Failed to reject attendance.', 'error');
    } else {
      showToast(isClockOutRejection ? 'Clock-out request rejected.' : 'Attendance request rejected.', 'error');
      await fetchAdminEntranceLogs();
    }
    setActionLoading(null);
  };

  // ─── Admin sync refresh ────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    if (isAdmin) {
      await fetchAdminEntranceLogs();
      setTimeout(() => setSyncing(false), 800);
      return;
    }
    setSyncing(false);
  };

  // ─── Employee: submit manual attendance (pending approval) ─────────────────
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    // Restrict to today only
    const todayStr = new Date().toISOString().split('T')[0];
    if (manualData.date !== todayStr) {
      showToast('You can only mark attendance for today.', 'error');
      return;
    }

    setSyncing(true);
    let toastMessage = 'Request submitted! Awaiting admin approval.';

    try {
      // Check if already submitted today
      const { data: existing } = await supabase
        .from('attendance')
        .select('id, status, entry_type, clock_in, clock_out')
        .eq('user_id', profile.id)
        .eq('date', manualData.date)
        .maybeSingle();

      if (existing) {
        const isClockInPendingNow = existing.entry_type === 'manual' && existing.status === 'absent' && existing.clock_in !== null && existing.clock_out === null;
        const isClockOutPendingNow = existing.entry_type === 'manual' && existing.status === 'absent' && existing.clock_in !== null && existing.clock_out !== null;
        const isClockInApprovedNow = existing.status === 'present' && existing.entry_type === 'manual' && !existing.clock_out;
        const isFullyApprovedNow = existing.status === 'present' && existing.entry_type === 'manual' && !!existing.clock_out;

        if (isClockInPendingNow) {
          showToast('Your clock-in request is already pending admin approval.', 'error');
          setSyncing(false);
          return;
        }
        if (isClockOutPendingNow) {
          showToast('Your clock-out request is already pending admin approval.', 'error');
          setSyncing(false);
          return;
        }
        if (isFullyApprovedNow) {
          showToast('Your attendance is already fully approved for today.', 'error');
          setSyncing(false);
          return;
        }
        if (isClockInApprovedNow) {
          // Clock-in is approved — submit clock-out for approval
          const clock_out = manualData.outTime
            ? new Date(`${manualData.date}T${manualData.outTime}:00`).toISOString()
            : null;
          if (!clock_out) {
            showToast('Please enter a clock-out time.', 'error');
            setSyncing(false);
            return;
          }
          const { error } = await supabase
            .from('attendance')
            .update({ clock_out, status: 'absent', entry_type: 'manual' })
            .eq('id', existing.id);
          if (error) throw error;
          toastMessage = 'Clock-out submitted! Awaiting admin approval.';
        } else {
          // Rejected — resubmit clock-in
          if (!manualData.inTime) {
            showToast('Please enter a clock-in time.', 'error');
            setSyncing(false);
            return;
          }
          const clock_in = new Date(`${manualData.date}T${manualData.inTime}:00`).toISOString();
          const { error } = await supabase
            .from('attendance')
            .update({ clock_in, clock_out: null, status: 'absent', entry_type: 'manual' })
            .eq('id', existing.id);
          if (error) throw error;
          toastMessage = 'Clock-in resubmitted! Awaiting admin approval.';
        }
      } else {
        // New submission — clock-in only (clock-out comes after approval)
        if (!manualData.inTime) {
          showToast('Please enter a clock-in time.', 'error');
          setSyncing(false);
          return;
        }
        const clock_in = new Date(`${manualData.date}T${manualData.inTime}:00`).toISOString();
        const { error } = await supabase
          .from('attendance')
          .insert({
            user_id: profile.id,
            date: manualData.date,
            clock_in,
            clock_out: null,
            status: 'absent',
            entry_type: 'manual'
          });
        if (error) throw error;
        toastMessage = 'Clock-in submitted! Awaiting admin approval.';
      }

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setManualData({ date: now.toISOString().split('T')[0], inTime: `${hh}:${mm}`, outTime: '' });
      await fetchAttendance();
      showToast(toastMessage);
    } catch (err: unknown) {
      const msg = (err as any)?.message || JSON.stringify(err);
      console.error('Manual attendance submission failed:', msg);
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchDate(term);

    if (isAdmin) {
      const source = adminLogs.filter(l =>
        adminTab === 'pending'
          ? (l.entry_type === 'manual' && l.status === 'absent' && l.clock_in !== null)
          : (l.status === 'present' && l.entry_type === 'manual')
      );
      if (!term) {
        setFilteredEmployees(source);
      } else {
        const lowerTerm = term.toLowerCase();
        setFilteredEmployees(source.filter(log =>
          log.profiles?.full_name?.toLowerCase().includes(lowerTerm) ||
          log.profiles?.employee_id?.toLowerCase().includes(lowerTerm) ||
          log.profiles?.designation?.toLowerCase().includes(lowerTerm)
        ));
      }
    } else {
      if (!term) {
        setFilteredLogs(logs.slice(0, 10));
      } else {
        setFilteredLogs(logs.filter(log => log.date.includes(term)));
      }
    }
  };

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const todayRecord = !isAdmin ? logs.find(l => l.date === new Date().toISOString().split('T')[0]) : null;

  // Prefill outTime with current device time when clock-in is approved
  useEffect(() => {
    if (!isAdmin && todayRecord && todayRecord.status === 'present' && todayRecord.entry_type === 'manual' && !todayRecord.clock_out) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setManualData(prev => {
        if (!prev.outTime) {
          return { ...prev, outTime: `${hh}:${mm}` };
        }
        return prev;
      });
    }
  }, [todayRecord, isAdmin]);

  // Derived lists for admin tabs
  const pendingLogs = adminLogs.filter(l =>
    l.entry_type === 'manual' && l.status === 'absent' && l.clock_in !== null
  );
  const approvedLogs = adminLogs.filter(l => l.status === 'present' && l.entry_type === 'manual');
  const displayedAdminLogs = searchDate
    ? filteredEmployees.filter(l => adminTab === 'pending'
        ? (l.entry_type === 'manual' && l.status === 'absent' && l.clock_in !== null)
        : (l.status === 'present' && l.entry_type === 'manual'))
    : (adminTab === 'pending' ? pendingLogs : approvedLogs);

  // ─── ADMIN VIEW ────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="space-y-6 max-w-6xl">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-24 right-8 text-white px-6 py-3 rounded-xl shadow-2xl z-50 border flex items-center gap-3 animate-in slide-in-from-right ${toastType === 'error' ? 'bg-rose-600 border-rose-400' : 'bg-brand-navy border-brand-teal'}`}>
            {toastType === 'error' ? <XCircle size={20} /> : <CheckCircle className="text-brand-teal" size={20} />}
            <span className="font-medium text-sm">{toast}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
              <Fingerprint className="text-brand-teal" size={28} />
              Attendance Approval
            </h2>
            <p className="text-xs text-gray-500 mt-1">Review and approve employee attendance requests before marking them present.</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="w-full sm:w-auto justify-center gap-2 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Summary stat pills */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
            <AlertCircle size={20} className="text-amber-500" />
            <div>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pending Approval</p>
              <p className="text-2xl font-extrabold text-amber-600">{pendingLogs.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
            <CheckCircle size={20} className="text-emerald-600" />
            <div>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Approved (Present)</p>
              <p className="text-2xl font-extrabold text-emerald-600">{approvedLogs.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => { setAdminTab('pending'); setSearchDate(''); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${adminTab === 'pending' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            ⏳ Pending Requests
            {pendingLogs.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingLogs.length}</span>
            )}
          </button>
          <button
            onClick={() => { setAdminTab('approved'); setSearchDate(''); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${adminTab === 'approved' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            ✅ Approved Records
          </button>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-2">
            <div>
              <CardTitle>{adminTab === 'pending' ? 'Pending Attendance Requests' : 'Approved Attendance Records'}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                {adminTab === 'pending'
                  ? 'Verify the employee was physically present, then approve or reject.'
                  : 'Attendance that has been approved and marked as Present.'}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-brand-teal focus:border-brand-teal"
                value={searchDate}
                onChange={handleSearch}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 font-bold text-center">Date</th>
                    <th className="px-4 py-4 font-bold">Employee ID</th>
                    <th className="px-4 py-4 font-bold">Employee Name</th>
                    <th className="px-4 py-4 font-bold">Role</th>
                    <th className="px-4 py-4 font-bold">Clock In</th>
                    <th className="px-4 py-4 font-bold">Clock Out</th>
                    {adminTab === 'pending' && <th className="px-4 py-4 font-bold text-center">Actions</th>}
                    {adminTab === 'approved' && <th className="px-4 py-4 font-bold text-center">Status</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
                  ) : displayedAdminLogs.length > 0 ? displayedAdminLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{log.date}</span>
                        {adminTab === 'pending' && (
                          <div className="mt-1">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              log.clock_out
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {log.clock_out ? 'Clock-Out' : 'Clock-In'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-bold text-brand-teal whitespace-nowrap">{log.profiles?.employee_id || 'N/A'}</td>
                      <td className="px-4 py-4 font-semibold text-brand-navy whitespace-nowrap">{log.profiles?.full_name || 'N/A'}</td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{log.profiles?.designation || 'Staff'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant="blue" className="bg-brand-navy/5 text-brand-navy border-none">{formatTime(log.clock_in)}</Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {log.clock_out
                          ? <Badge variant="green" className="bg-brand-teal/5 text-brand-teal border-none">{formatTime(log.clock_out)}</Badge>
                          : <span className="text-xs text-amber-500 font-medium">Not set</span>
                        }
                      </td>
                      {adminTab === 'pending' && (
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleApprove(log)}
                              disabled={actionLoading === log.id}
                              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={12} />
                              {actionLoading === log.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(log)}
                              disabled={actionLoading === log.id}
                              className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle size={12} />
                              {actionLoading === log.id ? '...' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      )}
                      {adminTab === 'approved' && (
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <Badge variant="green" className="bg-emerald-50 text-emerald-700 border-emerald-200">✓ Present</Badge>
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          {adminTab === 'pending'
                            ? <><AlertCircle size={36} className="text-amber-300" /><p className="font-medium">No pending attendance requests</p><p className="text-xs">Employees' requests will appear here for your review.</p></>
                            : <><CheckCircle size={36} className="text-emerald-300" /><p className="font-medium">No approved records yet</p></>
                          }
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── EMPLOYEE VIEW ─────────────────────────────────────────────────────────
  const todayStatusBadge = () => {
    if (!todayRecord) return { label: 'Not Submitted', color: 'bg-gray-400' };
    if (todayRecord.entry_type === 'manual' && todayRecord.status === 'absent' && todayRecord.clock_in !== null && todayRecord.clock_out === null) return { label: 'Clock-In Pending Approval', color: 'bg-amber-500' };
    if (todayRecord.entry_type === 'manual' && todayRecord.status === 'absent' && todayRecord.clock_in === null) return { label: 'Rejected', color: 'bg-rose-500' };
    if (todayRecord.entry_type === 'manual' && todayRecord.status === 'absent' && todayRecord.clock_in !== null && todayRecord.clock_out !== null) return { label: 'Clock-Out Pending Approval', color: 'bg-purple-500' };
    if (todayRecord.status === 'present' && !todayRecord.clock_out) return { label: 'Clock-In Approved', color: 'bg-emerald-500' };
    if (todayRecord.status === 'present' && todayRecord.clock_out) return { label: 'Fully Approved — Present', color: 'bg-emerald-600' };
    return { label: todayRecord.status, color: 'bg-gray-400' };
  };

  const badge = todayStatusBadge();
  const isClockInPending = todayRecord?.entry_type === 'manual' && todayRecord?.status === 'absent' && !!todayRecord?.clock_in && !todayRecord?.clock_out;
  const isClockInApproved = todayRecord?.status === 'present' && todayRecord?.entry_type === 'manual' && !todayRecord?.clock_out;
  const isClockOutPending = todayRecord?.entry_type === 'manual' && todayRecord?.status === 'absent' && !!todayRecord?.clock_in && !!todayRecord?.clock_out;
  const isFullyApproved = todayRecord?.status === 'present' && !!todayRecord?.clock_out && todayRecord?.entry_type === 'manual';

  return (
    <div className="space-y-6 max-w-6xl relative">
      {toast && (
        <div className={`fixed top-24 right-8 text-white px-6 py-3 rounded-xl shadow-2xl z-50 border flex items-center gap-3 animate-in slide-in-from-right ${toastType === 'error' ? 'bg-rose-600 border-rose-400' : 'bg-brand-navy border-brand-teal'}`}>
          {toastType === 'error' ? <XCircle size={20} /> : <CheckCircle className="text-brand-teal" size={20} />}
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <Fingerprint className="text-brand-teal" size={28} />
          My Attendance
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Today's status banner */}
          <Card className="bg-gradient-to-r from-brand-navy to-brand-navy-light text-white border-none overflow-hidden relative">
            <div className="absolute right-0 top-0 opacity-10 -mr-8 -mt-8">
              <Fingerprint size={160} />
            </div>
            <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md">
                  <Clock size={36} className="text-brand-teal" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Today's Status</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-white/60 text-xs sm:text-sm">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  {isClockInPending && (
                    <p className="text-amber-300 text-xs mt-2">Your clock-in request has been sent to admin for approval.</p>
                  )}
                  {todayRecord?.entry_type === 'manual' && todayRecord.status === 'absent' && todayRecord.clock_in === null && (
                    <p className="text-rose-300 text-xs mt-2">Your request was rejected. You may resubmit.</p>
                  )}
                  {isClockInApproved && (
                    <p className="text-emerald-300 text-xs mt-2">Clock-in approved. Please submit your clock-out time below.</p>
                  )}
                  {isClockOutPending && (
                    <p className="text-purple-300 text-xs mt-2">Your clock-out request has been sent to admin for approval.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-6 sm:gap-8 items-center border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8 w-full md:w-auto justify-around md:justify-start">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-brand-teal uppercase font-bold tracking-wider mb-1">In Time</p>
                  <p className="text-xl sm:text-2xl font-bold">{formatTime(todayRecord?.clock_in)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-brand-teal uppercase font-bold tracking-wider mb-1">Out Time</p>
                  <p className="text-xl sm:text-2xl font-bold">{formatTime(todayRecord?.clock_out)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-2">
              <CardTitle>Attendance History</CardTitle>
              <div className="relative w-full sm:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search date..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-full focus:ring-brand-teal focus:border-brand-teal"
                  value={searchDate}
                  onChange={handleSearch}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase border-b">
                    <tr>
                      <th className="px-6 py-4 font-bold">Date</th>
                      <th className="px-6 py-4 font-bold">Punch In</th>
                      <th className="px-6 py-4 font-bold">Punch Out</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Loading records...</td></tr>
                    ) : filteredLogs.length > 0 ? filteredLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-brand-navy">
                          {new Date(log.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatTime(log.clock_in)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatTime(log.clock_out)}</td>
                        <td className="px-6 py-4">
                          {log.status === 'present' && <Badge variant="green">✓ Approved</Badge>}
                          {log.entry_type === 'manual' && log.status === 'absent' && log.clock_in !== null && <Badge variant="amber">⏳ Pending</Badge>}
                          {log.entry_type === 'manual' && log.status === 'absent' && log.clock_in === null && <Badge variant="red">✗ Rejected</Badge>}
                          {!['present', 'absent'].includes(log.status) && (
                            <Badge variant="neutral">{log.status}</Badge>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                          {searchDate ? `No records found for "${searchDate}"` : 'No history found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Monthly snapshot */}
          <Card className="border-t-4 border-t-brand-teal">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="p-3 bg-white text-brand-teal shadow-sm rounded-lg"><CalendarDays size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Working Days</p>
                  <p className="text-lg font-bold">22</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div className="p-3 bg-white text-status-green shadow-sm rounded-lg"><CheckCircle size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Present Days</p>
                  <p className="text-lg font-bold">{logs.filter(l => l.status === 'present').length}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="p-3 bg-white text-amber-500 shadow-sm rounded-lg"><AlertCircle size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pending</p>
                  <p className="text-lg font-bold">{logs.filter(l => l.entry_type === 'manual' && l.status === 'absent' && l.clock_in !== null).length}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-brand-navy/5 rounded-xl border border-brand-navy/10">
                <div className="p-3 bg-white text-brand-navy shadow-sm rounded-lg"><BarChart2 size={20} /></div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Rejected</p>
                  <p className="text-lg font-bold text-rose-600">{logs.filter(l => l.entry_type === 'manual' && l.status === 'absent' && l.clock_in === null).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry form — state-aware */}
          <Card className="border-t-4 border-t-brand-navy">
            <CardHeader>
              <CardTitle className="text-lg">
                {isClockInApproved ? 'Submit Clock Out' : 'Request Attendance'}
              </CardTitle>
              <p className="text-xs text-gray-400">
                {isClockInApproved
                  ? <>Clock-in approved. Now submit your clock-out for <span className="font-semibold text-brand-navy">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>.</>
                  : <>Submit your attendance for <span className="font-semibold text-brand-navy">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>. Admin will verify and approve.</>
                }
              </p>
            </CardHeader>
            <CardContent>
              {/* Clock-out pending state */}
              {isClockOutPending ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={22} className="text-purple-500" />
                  </div>
                  <p className="text-sm font-semibold text-brand-navy">Clock-Out Pending Approval</p>
                  <p className="text-xs text-gray-500">Your clock-out has been submitted. Waiting for admin review.</p>
                </div>
              ) : isFullyApproved ? (
                /* Fully approved state */
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={22} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-brand-navy">Attendance Complete</p>
                  <p className="text-xs text-gray-500">Both clock-in and clock-out have been approved for today.</p>
                </div>
              ) : isClockInPending ? (
                /* Clock-in awaiting approval — block the form */
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={22} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-brand-navy">Clock-In Pending Approval</p>
                  <p className="text-xs text-gray-500">Waiting for admin to approve your clock-in. Clock-out will be available once approved.</p>
                </div>
              ) : (
                /* Active form — clock-in (new/rejected) or clock-out (approved) */
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  {/* Date — locked to today */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Date (Today Only)</label>
                    <div className="flex items-center gap-2 w-full border border-brand-teal/40 bg-brand-teal/5 rounded-lg p-2">
                      <CalendarDays size={14} className="text-brand-teal shrink-0" />
                      <span className="text-xs font-bold text-brand-navy flex-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-brand-teal font-bold uppercase bg-brand-teal/10 px-2 py-0.5 rounded-full">Locked</span>
                    </div>
                    <input type="hidden" value={manualData.date} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Clock In */}
                    <div className="space-y-1">
                      <label htmlFor="manual-clock-in" className="text-[10px] font-bold text-gray-500 uppercase">
                        Clock In {!isClockInApproved && '*'}
                      </label>
                      {isClockInApproved ? (
                        /* Locked — shows approved time */
                        <div className="flex items-center gap-2 w-full border border-emerald-200 bg-emerald-50 rounded-lg p-2">
                          <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-emerald-700 flex-1">{formatTime(todayRecord?.clock_in)}</span>
                          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Approved</span>
                        </div>
                      ) : (
                        <input
                          id="manual-clock-in"
                          type="time"
                          className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-brand-teal outline-none"
                          value={manualData.inTime}
                          onChange={(e) => setManualData({ ...manualData, inTime: e.target.value })}
                          required
                        />
                      )}
                    </div>

                    {/* Clock Out */}
                    <div className="space-y-1">
                      <label htmlFor="manual-clock-out" className="text-[10px] font-bold text-gray-500 uppercase">
                        Clock Out {isClockInApproved && '*'}
                      </label>
                      <input
                        id="manual-clock-out"
                        type="time"
                        className={`w-full border rounded-lg p-2 text-xs outline-none transition-colors ${
                          isClockInApproved
                            ? 'border-brand-teal/50 bg-white focus:ring-brand-teal'
                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                        value={manualData.outTime}
                        onChange={(e) => isClockInApproved && setManualData({ ...manualData, outTime: e.target.value })}
                        disabled={!isClockInApproved}
                        required={isClockInApproved}
                      />
                      {!isClockInApproved && (
                        <p className="text-[9px] text-gray-400 mt-0.5">Enabled after clock-in is approved</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={syncing} className="w-full text-xs font-bold py-2 bg-brand-navy hover:bg-black">
                    {syncing ? 'Submitting...' : isClockInApproved ? 'Submit Clock Out for Approval' : 'Submit Clock In for Approval'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
