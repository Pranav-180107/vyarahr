import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Send, Calendar as CalIcon, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getScopedKey } from '../../utils/tenantHelper';

const Leaves = () => {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Admin view state: all employee leave requests from DB
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');

  // Leave balance: total allocation minus approved days used
  const LEAVE_ALLOCATIONS: Record<string, { label: string; total: number; color: string; barColor: string }> = {
    casual:  { label: 'Casual Leave',  total: 12, color: 'text-brand-teal',    barColor: 'bg-brand-teal' },
    sick:    { label: 'Sick Leave',    total: 7,  color: 'text-status-amber',  barColor: 'bg-status-amber' },
    earned:  { label: 'Earned Leave',  total: 18, color: 'text-brand-navy',    barColor: 'bg-brand-navy' },
    unpaid:  { label: 'Unpaid Leave',  total: 0,  color: 'text-rose-500',      barColor: 'bg-rose-400' },
  };
  const [leaveBalance, setLeaveBalance] = useState<Record<string, number>>({});
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminRequests();
    } else {
      fetchRequests();
    }
    fetchUpcomingHolidays();
    if (!isAdmin) fetchLeaveBalance();
  }, [isAdmin, profile]);

  const fetchLeaveBalance = async () => {
    if (!profile?.id) return;
    setBalanceLoading(true);
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd   = `${year}-12-31`;

    const { data, error } = await supabase
      .from('leave_requests')
      .select('type, start_date, end_date')
      .eq('user_id', profile.id)
      .eq('status', 'approved')
      .gte('start_date', yearStart)
      .lte('end_date', yearEnd);

    const used: Record<string, number> = {};
    if (!error && data) {
      data.forEach((req: any) => {
        const days = Math.max(1,
          Math.round((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000) + 1
        );
        used[req.type] = (used[req.type] || 0) + days;
      });
    }
    setLeaveBalance(used);
    setBalanceLoading(false);
  };

  const fetchUpcomingHolidays = async () => {
    setHolidaysLoading(true);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    // Last day of the current month
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, date, description')
      .eq('category', 'Company Holidays')
      .gte('date', todayStr)
      .lte('date', lastDayStr)
      .order('date', { ascending: true });
    if (!error && data) {
      setUpcomingHolidays(data);
    }
    setHolidaysLoading(false);
  };

  const fetchAdminRequests = async () => {
    setLoading(true);

    // Fetch Supabase requests
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    let finalRequests: any[] = [];

    if (!leaveError && leaveData) {
      const userIds = [...new Set(leaveData.map((r: any) => r.user_id))];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, designation, hired_by')
        .in('id', userIds)
        .ilike('hired_by', profile?.email?.trim() || ''); // Only get profiles hired by this admin

      const profileMap = (profileData || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      finalRequests = leaveData
        .filter((r: any) => profileMap[r.user_id]) // Only keep requests where profile matches admin
        .map((r: any) => ({
          ...r,
          profiles: profileMap[r.user_id] || null,
        }));
    }

    // Fetch localStorage mock requests
    const mockLeavesKey = getScopedKey('hr_leave_requests', profile, user);
    const mockLeaves = localStorage.getItem(mockLeavesKey);
    if (mockLeaves) {
      const parsed = JSON.parse(mockLeaves);
      const formattedMocks = parsed.map((m: any) => ({
        ...m,
        is_mock: true,
        profiles: {
          full_name: m.name,
          employee_id: m.empId,
          designation: m.designation || 'New Hire'
        }
      }));
      finalRequests = [...formattedMocks, ...finalRequests];
    }

    setAdminRequests(finalRequests);
    setLoading(false);
  };

  const fetchRequests = async () => {
    if (!profile) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const isAllLeavesFullyUsed = !balanceLoading && Object.entries(LEAVE_ALLOCATIONS)
    .filter(([type]) => type !== 'unpaid')
    .every(([type, cfg]) => (leaveBalance[type] || 0) >= cfg.total);

  const getRequestedDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const requestedDays = getRequestedDays();
  const selectedTypeRemaining = formData.type && formData.type !== 'unpaid'
    ? Math.max(0, (LEAVE_ALLOCATIONS[formData.type]?.total || 0) - (leaveBalance[formData.type] || 0))
    : Infinity;
  const isBalanceInsufficient = !!(formData.type && formData.type !== 'unpaid' && requestedDays > selectedTypeRemaining);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (isAllLeavesFullyUsed) {
      setToast('❌ You have fully reached all your leave allocations.');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    if (formData.type !== 'unpaid') {
      const remaining = (LEAVE_ALLOCATIONS[formData.type]?.total || 0) - (leaveBalance[formData.type] || 0);
      if (remaining <= 0) {
        setToast(`❌ You have no remaining balance for ${LEAVE_ALLOCATIONS[formData.type]?.label}.`);
        setTimeout(() => setToast(''), 3000);
        return;
      }
      const days = getRequestedDays();
      if (days > remaining) {
        setToast(`❌ Requested days (${days}) exceed remaining balance (${remaining} days) for ${LEAVE_ALLOCATIONS[formData.type]?.label}.`);
        setTimeout(() => setToast(''), 3500);
        return;
      }
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: profile.id,
          type: formData.type,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
          status: 'pending'
        });

      if (error) {
        setToast('❌ Error submitting request. Please try again.');
        console.error('Leave apply error:', error);
      } else {
        setToast('✓ Leave request submitted successfully!');
        setFormData({ type: '', startDate: '', endDate: '', reason: '' });
        await fetchRequests();
        await fetchLeaveBalance();
      }
    } catch (err) {
      setToast('❌ Unexpected error.');
    } finally {
      setLoading(false);
    }
    
    setLoading(false);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => {
    setActionLoading(true);
    
    const request = adminRequests.find(r => r.id === id);
    
    if (request?.is_mock) {
      const mockLeavesKey = getScopedKey('hr_leave_requests', profile, user);
      const mockLeaves = JSON.parse(localStorage.getItem(mockLeavesKey) || '[]');
      const updated = mockLeaves.map((l: any) => l.id === id ? { 
        ...l, 
        status: newStatus,
        rejection_reason: newStatus === 'rejected' ? rejectionReason : null
      } : l);
      localStorage.setItem(mockLeavesKey, JSON.stringify(updated));
      
      setToast(`✓ Mock request ${newStatus} successfully`);
      await fetchAdminRequests();
      setSelectedRequest(null);
    } else {
      const updateData: any = { status: newStatus };
      if (newStatus === 'rejected') {
        updateData.rejection_reason = rejectionReason || '';
      }
      const { error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Action error:', error.message, error.details, error.hint);
        setToast(`❌ Failed: ${error.message}`);
      } else {
        setToast(`✓ Request ${newStatus} successfully`);
        await fetchAdminRequests();
        setSelectedRequest(null);
      }
    }
    setActionLoading(false);
    setTimeout(() => setToast(''), 3500);
  };

  if (isAdmin) {
    return (
      <div className="space-y-6 max-w-7xl">
        {toast && (
          <div className="fixed top-20 right-8 bg-brand-navy text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4 border-l-4 border-brand-teal">
            <CheckCircle className="text-brand-teal" size={20} />
            {toast}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-brand-navy">Leave Management Portal</h2>
          <Badge variant="blue" className="px-3 py-1">Admin Control Panel</Badge>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Pending Leave Requests</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Review and action employee leave submissions.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold">Employee Name</th>
                    <th className="px-6 py-4 font-bold">Employee ID</th>
                    <th className="px-6 py-4 font-bold">Leave Type</th>
                    <th className="px-6 py-4 font-bold text-center">Duration (Days)</th>
                    <th className="px-6 py-4 font-bold text-center">Available Balance</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading leave requests...</td></tr>
                ) : adminRequests.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No leave requests found.</td></tr>
                ) : adminRequests.map((req) => {
                  const start = new Date(req.start_date);
                  const end = new Date(req.end_date);
                  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 cursor-pointer transition-colors group" onClick={() => setSelectedRequest(req)}>
                      <td className="px-6 py-4 font-semibold text-brand-navy">{req.profiles?.full_name || '—'}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{req.profiles?.employee_id || '—'}</td>
                      <td className="px-6 py-4 capitalize">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${req.type === 'sick' ? 'bg-status-amber' : req.type === 'casual' ? 'bg-brand-teal' : 'bg-brand-navy'}`}></span>
                        {req.type}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-brand-navy">{days}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{req.start_date} → {req.end_date}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={req.status === 'approved' ? 'green' : req.status === 'rejected' ? 'red' : 'neutral'}>
                            {req.status}
                          </Badge>
                          {req.status === 'rejected' && req.rejection_reason && (
                            <span className="text-[11px] text-rose-500 font-medium max-w-[150px] truncate block mt-0.5" title={req.rejection_reason}>
                              Reason: {req.rejection_reason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 transition-all">
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-10 w-10 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100" 
                             onClick={(e) => { e.stopPropagation(); handleAction(req.id, 'approved'); }}
                             disabled={actionLoading || req.status !== 'pending'}
                             title="Approve"
                           >
                             <CheckCircle size={22} className="text-emerald-500" />
                           </Button>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-10 w-10 p-0 rounded-full hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100" 
                             onClick={(e) => { e.stopPropagation(); setRejectingRequestId(req.id); }}
                             disabled={actionLoading || req.status !== 'pending'}
                             title="Reject"
                           >
                             <span className="text-xl font-bold text-red-500">✕</span>
                           </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selectedRequest && (
          <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Leave Reason</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-lg">
                    {selectedRequest?.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-navy">{selectedRequest?.profiles?.full_name || '—'}</h4>
                    <p className="text-xs text-gray-500">{selectedRequest?.profiles?.employee_id || '—'} · {selectedRequest?.profiles?.designation || 'Employee'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Type</p>
                    <p className="font-bold text-brand-navy capitalize mt-1">{selectedRequest?.type}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">From</p>
                    <p className="font-bold text-brand-navy mt-1">{selectedRequest?.start_date}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">To</p>
                    <p className="font-bold text-brand-navy mt-1">{selectedRequest?.end_date}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border italic text-gray-700 text-sm">
                  "{selectedRequest?.reason || 'No reason provided.'}"
                </div>
                {selectedRequest?.status === 'rejected' && selectedRequest?.rejection_reason && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 text-sm">
                    <span className="font-bold">Rejection Reason:</span> "{selectedRequest.rejection_reason}"
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <Button 
                     className="bg-emerald-500 hover:bg-emerald-600 w-full gap-2 border-none h-11 shadow-md shadow-emerald-100" 
                     onClick={() => handleAction(selectedRequest.id, 'approved')}
                     disabled={actionLoading || selectedRequest?.status !== 'pending'}
                   >
                     <CheckCircle size={18} /> Approve Request
                   </Button>
                   <Button 
                     variant="outline" 
                     className="border-red-500 text-red-500 hover:bg-red-50 w-full gap-2 h-11" 
                     onClick={() => setRejectingRequestId(selectedRequest.id)}
                     disabled={actionLoading || selectedRequest?.status !== 'pending'}
                   >
                     <span className="font-bold">✕</span> Reject Request
                   </Button>
                </div>
                {selectedRequest?.status !== 'pending' && (
                  <p className="text-center text-xs text-gray-400">This request has already been {selectedRequest?.status}.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {rejectingRequestId && (
          <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <CardHeader className="border-b">
                <CardTitle className="text-lg text-brand-navy font-bold">Reason for Rejection</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please provide a reason for rejecting this leave request:
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal text-sm resize-none"
                    placeholder="Enter reason..."
                    value={rejectionInput}
                    onChange={(e) => setRejectionInput(e.target.value)}
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectingRequestId(null);
                      setRejectionInput('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white"
                    disabled={!rejectionInput.trim() || actionLoading}
                    onClick={() => {
                      handleAction(rejectingRequestId, 'rejected', rejectionInput.trim());
                      setRejectingRequestId(null);
                      setRejectionInput('');
                    }}
                  >
                    Submit Rejection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && (
        <div className="fixed top-20 right-8 bg-brand-teal text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} />
          {toast}
        </div>
      )}

      <h2 className="text-4xl font-bold text-brand-navy tracking-tight">Leaves Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Balances ({new Date().getFullYear()})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {balanceLoading ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading balances...</p>
              ) : (
                Object.entries(LEAVE_ALLOCATIONS)
                  .filter(([, cfg]) => cfg.total > 0) // skip unpaid (no cap)
                  .map(([type, cfg]) => {
                    const used = leaveBalance[type] || 0;
                    const remaining = Math.max(0, cfg.total - used);
                    const pct = Math.min(100, Math.round((remaining / cfg.total) * 100));
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="font-semibold text-gray-700">{cfg.label}</span>
                          <span className={`${cfg.color} font-bold`}>{remaining} / {cfg.total} Days</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className={`${cfg.barColor} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{used} day{used !== 1 ? 's' : ''} used</p>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-bold">Leave Type</th>
                      <th className="px-4 py-3 font-bold">Start Date</th>
                      <th className="px-4 py-3 font-bold">End Date</th>
                      <th className="px-4 py-3 font-bold text-center">Duration (Days)</th>
                      <th className="px-4 py-3 font-bold">Reason</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Loading requests...</td></tr>
                    ) : requests.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">No requests found.</td></tr>
                    ) : (
                      requests.map((req, i) => {
                        const start = new Date(req.start_date);
                        const end = new Date(req.end_date);
                        const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 capitalize font-semibold text-brand-navy">{req.type} Leave</td>
                            <td className="px-4 py-3 text-gray-600">{req.start_date}</td>
                            <td className="px-4 py-3 text-gray-600">{req.end_date}</td>
                            <td className="px-4 py-3 text-center font-bold text-brand-navy">{duration}</td>
                            <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={req.reason}>{req.reason || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-start gap-1">
                                <Badge variant={req.status === 'approved' ? 'green' : (req.status === 'rejected' ? 'red' : 'neutral')}>
                                  {req.status}
                                </Badge>
                                {req.status === 'rejected' && req.rejection_reason && (
                                  <span className="text-[11px] text-rose-500 font-medium max-w-xs block mt-0.5" title={req.rejection_reason}>
                                    Reason: {req.rejection_reason}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Apply for Leave</CardTitle>
            </CardHeader>
            <CardContent>
              {isAllLeavesFullyUsed ? (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg font-medium">
                    ⚠️ You have fully reached all your paid leave allocations. You are not able to request more leave.
                  </div>
                  <Button className="w-full gap-2" disabled={true}>
                    <Send size={16}/> Apply Leave (Disabled)
                  </Button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleApply}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                    <select 
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal text-sm" 
                      required
                      title="Leave Type"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="">Select leave type</option>
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="earned">Earned Leave</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                    {formData.type && formData.type !== 'unpaid' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Remaining balance: {selectedTypeRemaining} day{selectedTypeRemaining !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal" 
                        required 
                        title="Start Date"
                        placeholder="Start Date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input 
                        type="date" 
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal" 
                        required 
                        title="End Date"
                        placeholder="End Date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      />
                    </div>
                  </div>

                  {formData.startDate && formData.endDate && (
                    <p className="text-xs text-gray-600 font-medium">
                      Requested Duration: {requestedDays} day{requestedDays !== 1 ? 's' : ''}
                    </p>
                  )}

                  {isBalanceInsufficient && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md">
                      ⚠️ Requested duration exceeds your remaining balance ({selectedTypeRemaining} days).
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea 
                      rows={2} 
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal text-sm resize-none" 
                      placeholder="Brief reason for leave..."
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    ></textarea>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading || isBalanceInsufficient}>
                    <Send size={16}/> Apply Leave
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>
                Holidays — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {holidaysLoading ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading holidays...</p>
              ) : upcomingHolidays.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic">No holidays this month.</p>
              ) : (
                <ul className="space-y-3">
                  {upcomingHolidays.map((holiday) => {
                    const dateObj = new Date(holiday.date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <li key={holiday.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-100">
                        <div className="flex gap-3 items-center">
                          <CalIcon size={18} className="text-brand-teal shrink-0" />
                          <div>
                            <span className="font-medium text-brand-navy text-sm">{holiday.title}</span>
                            {holiday.description && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{holiday.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-semibold text-gray-700">{formattedDate}</p>
                          <p className="text-xs text-gray-500">{dayName}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaves;
