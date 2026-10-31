import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AttendanceAnalytics = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    attendanceRate: 0,
    lateArrivals: 0,
    absenteeism: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [deptHeatmap, setDeptHeatmap] = useState<any[]>([]);

  useEffect(() => {
    fetchAttendanceData();
  }, [profile]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Fetch logs and profiles
      const [logsRes, profilesRes] = await Promise.all([
        supabase.from('attendance').select('*').gte('date', firstDayOfMonth.toISOString().split('T')[0]),
        supabase.from('profiles').select('*')
      ]);

      if (logsRes.error) throw logsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profiles = (profilesRes.data || []).filter(p => p.role === 'employee' || p.role === 'hr' || p.role === 'accountant');

      const profileIds = new Set(profiles.map(p => p.id));
      const logs = (logsRes.data || []).filter(l => profileIds.has(l.user_id));
      const totalEmployees = profiles.length;

      if (totalEmployees > 0) {
        // Calculate late arrivals from clock_in (e.g. hour >= 9:30 AM)
        const lateCount = logs.filter(l => {
          if (!l.clock_in) return false;
          const time = new Date(l.clock_in);
          const hours = time.getHours();
          const minutes = time.getMinutes();
          return hours > 9 || (hours === 9 && minutes > 30);
        }).length;

        // Distinct days in the logs
        const distinctDays = new Set(logs.map(l => l.date)).size || 1;
        const totalExpected = totalEmployees * distinctDays;
        
        // Present count: status is 'present'
        const presentCount = logs.filter(l => l.status === 'present').length;
        const attendanceRate = Math.min(100, (presentCount / totalExpected) * 100);
        
        const computedMetrics = {
          attendanceRate: Number(attendanceRate.toFixed(1)),
          lateArrivals: lateCount,
          absenteeism: Number((100 - attendanceRate).toFixed(1))
        };
        setMetrics(computedMetrics);

        // Chart Data (By Day)
        const days: Record<string, any> = {};
        logs.forEach(l => {
          const d = new Date(l.date).getDate();
          if (!days[d]) days[d] = { day: d, present: 0, partial: 0, absent: totalEmployees };
          if (l.status === 'present') {
            days[d].present++;
            days[d].absent--;
          }
        });
        setChartData(Object.values(days).sort((a,b) => a.day - b.day));

        // Dept Heatmap
        const depts: Record<string, any> = {};
        profiles.forEach(p => {
          if (!depts[p.department]) depts[p.department] = { name: p.department || 'General', total: 0, present: 0 };
          depts[p.department].total++;
        });
        logs.forEach(l => {
          if (l.status === 'present') {
            const prof = profiles.find(p => p.id === l.user_id);
            if (prof && depts[prof.department]) {
              depts[prof.department].present++;
            }
          }
        });

        setDeptHeatmap(Object.values(depts).map((d: any) => ({
          ...d,
          rate: Math.min(100, (d.present / (d.total * distinctDays)) * 100 || 0)
        })));

        // Real Trend (Current Month data only)
        setTrendData([
          { month: now.toLocaleString('en-US', { month: 'short' }), count: lateCount }
        ]);
      } else {
        setTrendData([]);
        setChartData([]);
        setDeptHeatmap([]);
      }

    } catch (err) {
      console.error('Error fetching attendance analytics:', err);
    } finally {
      setLoading(false);
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
        <Card className="border-l-4 border-l-status-green bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Attendance %</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{metrics.attendanceRate}%</h3>
            </div>
            <div className="p-4 bg-status-green/10 rounded-2xl text-status-green">
              <Calendar size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-amber bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Late Arrivals (MTD)</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{metrics.lateArrivals}</h3>
            </div>
            <div className="p-4 bg-status-amber/10 rounded-2xl text-status-amber">
              <Clock size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Absenteeism Rate</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{metrics.absenteeism}%</h3>
            </div>
            <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
              <AlertTriangle size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Daily Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="day" stroke="#5E718D" fontSize={11} label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="#5E718D" fontSize={11} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="present" stackId="a" fill="#00C48C" name="In Office" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" stackId="a" fill="rgba(255, 69, 96, 0.2)" name="Absent" radius={[0, 0, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Late Arrivals Trend</CardTitle>
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
                <Line type="monotone" dataKey="count" stroke="#FFB020" strokeWidth={4} dot={{ r: 6, fill: '#FFB020' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5 overflow-hidden">
        <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100">
          <CardTitle className="text-brand-navy font-bold flex justify-between items-center text-lg">
            Department Attendance Integrity
            <div className="flex gap-2 text-[10px] font-black uppercase tracking-tighter items-center">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div> &lt;70%</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></div> 85%+</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-brand-teal rounded-sm"></div> 95%+</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5 text-left">Department</th>
                    <th className="px-8 py-5 text-center">Avg. Turnout</th>
                    <th className="px-8 py-5 text-center">Total Force</th>
                    <th className="px-8 py-5 text-right">Health Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deptHeatmap.map((dept) => (
                    <tr key={dept.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-brand-navy uppercase tracking-tight">{dept.name}</td>
                      <td className="px-8 py-5 text-center">
                         <div className={`inline-block px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${
                           dept.rate >= 95 ? 'bg-brand-teal/20 text-brand-teal' : 
                           dept.rate >= 85 ? 'bg-emerald-500/20 text-emerald-500' : 
                           'bg-red-500/20 text-red-500'
                         }`}>
                           {dept.rate.toFixed(1)}% Present
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center font-mono text-gray-600 font-bold">{dept.total} Seats</td>
                      <td className="px-8 py-5 text-right">
                         <div className={`h-2 w-24 bg-gray-100 rounded-full overflow-hidden ml-auto`}>
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                dept.rate >= 95 ? 'bg-brand-teal' : 
                                dept.rate >= 85 ? 'bg-emerald-500' : 
                                'bg-red-500'
                              }`} 
                              style={{ width: `${dept.rate}%` }}
                            />
                         </div>
                      </td>
                    </tr>
                  ))}
                  {deptHeatmap.length === 0 && (
                     <tr><td colSpan={4} className="py-12 text-center text-gray-500 italic">No attendance data found for department analysis.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceAnalytics;
