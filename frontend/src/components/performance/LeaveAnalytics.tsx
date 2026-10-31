import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#00C2B2', '#FFB020', '#00C48C', '#FF4560', '#775DD0'];

const LeaveAnalytics = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    rejected: 0
  });
  const [typeData, setTypeData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchLeaveData();
  }, [profile]);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [leavesRes, profilesRes] = await Promise.all([
        supabase.from('leave_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      if (leavesRes.error) throw leavesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const leaves = (leavesRes.data || []).map((l: any) => ({
        ...l,
        profiles: profilesMap.get(l.user_id) || { full_name: 'Employee', department: 'Operations', role: 'employee' }
      }));

        // Metrics (Current Month)
        const currentMonthLeaves = leaves.filter(l => new Date(l.created_at) >= firstDayOfMonth);
        
        setMetrics({
          total: currentMonthLeaves.filter(l => l.status === 'approved').length,
          pending: leaves.filter(l => l.status === 'pending').length,
          rejected: currentMonthLeaves.filter(l => l.status === 'rejected').length
        });

        // Type Breakdown
        const types: Record<string, number> = {};
        leaves.forEach(l => {
          types[l.leave_type] = (types[l.leave_type] || 0) + 1;
        });
        setTypeData(Object.entries(types).map(([name, value]) => ({ name, value })));

        // Real Trend (Current Month data only)
        setTrendData([
          { month: now.toLocaleString('en-US', { month: 'short' }), total: leaves.length, avg: leaves.length }
        ]);

        // Pending Table
        setPendingRequests(leaves.filter(l => l.status === 'pending').slice(0, 5));
    } catch (err) {
      console.error('Error fetching leave analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchLeaveData();
    } catch (err) {
      console.error('Error updating leave status:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-teal" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-brand-teal bg-white border-gray-100 shadow-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Approved (Month)</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{metrics.total}</h3>
            </div>
            <div className="p-4 bg-brand-teal/10 rounded-2xl text-brand-teal">
              <Calendar size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-amber bg-white border-gray-100 shadow-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Requests</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{metrics.pending}</h3>
            </div>
            <div className="p-4 bg-status-amber/10 rounded-2xl text-status-amber">
              <CheckCircle size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-white border-gray-100 shadow-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Denied Applications</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{metrics.rejected}</h3>
            </div>
            <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
              <XCircle size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Leave Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Leave Velocity Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" stroke="#5E718D" fontSize={11} />
                <YAxis stroke="#5E718D" fontSize={11} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="total" stroke="#00C2B2" strokeWidth={4} dot={{ r: 5, fill: '#00C2B2' }} name="Total Requests" />
                <Line type="monotone" dataKey="avg" stroke="#5E718D" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Benchmarks" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Time-Off Distribution</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-7 gap-1.5 text-center">
               {['S','M','T','W','T','F','S'].map((day, idx) => (
                 <div key={`${day}-${idx}`} className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">{day}</div>
               ))}
               {Array.from({ length: 35 }).map((_, i) => (
                 <div key={i} className={`h-9 rounded-xl flex flex-col items-center justify-center border border-gray-100 transition-all cursor-pointer hover:bg-gray-50 ${i > 5 && i < 32 && (i % 7 === 0 || i % 7 === 6) ? 'bg-gray-100/55' : 'bg-gray-50/50'}`}>
                    <span className={`text-[10px] font-bold ${i > 5 && i < 32 ? 'text-gray-600' : 'text-gray-300'}`}>{i > 5 && i < 32 ? i - 5 : ''}</span>
                 </div>
               ))}
             </div>
             <p className="text-[10px] text-gray-500 mt-6 italic text-center font-medium">Visualization of current month workforce availability.</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white border-gray-100 shadow-lg shadow-brand-navy/5 overflow-hidden">
          <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
            <CardTitle className="text-brand-navy text-lg font-bold">Leave Approval Queue</CardTitle>
            <Badge variant="amber" className="font-black uppercase text-[9px] tracking-widest px-3">Attention Needed</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 font-black tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5">Employee</th>
                    <th className="px-6 py-5">Time Frame</th>
                    <th className="px-6 py-5 text-center">Duration</th>
                    <th className="px-6 py-5 text-right">Direct Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingRequests.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-black text-brand-navy group-hover:text-brand-teal transition-colors">{row.profiles?.full_name}</div>
                        <div className="text-[10px] text-brand-teal font-black uppercase tracking-tighter">{row.leave_type} • {row.profiles?.department}</div>
                      </td>
                      <td className="px-6 py-5 text-gray-500 font-mono text-xs">
                        {new Date(row.start_date).toLocaleDateString()} - {new Date(row.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-center font-black text-brand-navy bg-gray-50/50">{row.total_days || 1} Day(s)</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={() => handleAction(row.id, 'approved')}
                            className="bg-brand-teal hover:bg-emerald-600 text-brand-navy font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl border-none shadow-md shadow-brand-teal/10"
                          >
                            Approve
                          </Button>
                          <Button 
                            onClick={() => handleAction(row.id, 'rejected')}
                            variant="outline" 
                            className="border-red-500/30 text-red-500 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl"
                          >
                            Deny
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingRequests.length === 0 && (
                     <tr><td colSpan={4} className="py-12 text-center text-gray-500 italic">No leaves currently awaiting administrative action.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaveAnalytics;
