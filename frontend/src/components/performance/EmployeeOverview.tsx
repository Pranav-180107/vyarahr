import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#00C2B2', '#00C48C', '#FFB020', '#FF4560', '#775DD0', '#FEB019'];

const EmployeeOverview = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    newHires: 0,
    departures: 0
  });
  const [deptData, setDeptData] = useState<any[]>([]);
  const [recentHires, setRecentHires] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('*');

      if (error) throw error;

      if (profiles) {
        const employees = profiles.filter(p => p.role === 'employee' || p.role === 'hr' || p.role === 'accountant');
        const total = employees.length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newHiresCount = employees.filter(p => new Date(p.created_at) > thirtyDaysAgo).length;
        
        setStats({
          total,
          newHires: newHiresCount,
          departures: 0 // Departure tracking not implemented in profiles schema yet
        });

        // Dept Breakdown
        const depts: Record<string, number> = {};
        employees.forEach(p => {
          const d = p.department || 'Unassigned';
          depts[d] = (depts[d] || 0) + 1;
        });
        setDeptData(Object.entries(depts).map(([name, value]) => ({ name, value })));

        // Recent Hires
        setRecentHires(
          [...employees]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        );

        // Real growth trend based on employee profile creation dates
        const sortedEmployees = [...employees].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const monthlyGrowthMap: Record<string, { total: number; active: number }> = {};
        
        let runningTotal = 0;
        sortedEmployees.forEach(p => {
          const date = new Date(p.created_at);
          const monthYear = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          runningTotal++;
          monthlyGrowthMap[monthYear] = {
            total: runningTotal,
            active: runningTotal
          };
        });

        const growthChart = Object.entries(monthlyGrowthMap).map(([name, data]) => ({
          name,
          total: data.total,
          active: data.active
        }));

        setGrowthData(growthChart.length > 0 ? growthChart : [{ name: 'Current', total, active: total }]);
      }
    } catch (err) {
      console.error('Error fetching performance summary:', err);
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
        <Card className="border-l-4 border-l-brand-teal shadow-lg shadow-brand-navy/5 border-gray-100 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Workforce</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{stats.total}</h3>
            </div>
            <div className="p-4 bg-brand-teal/10 rounded-2xl text-brand-teal">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-lg shadow-brand-navy/5 border-gray-100 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">New Onboardings (30d)</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{stats.newHires}</h3>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <UserPlus size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-amber shadow-lg shadow-brand-navy/5 border-gray-100 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Employee Turnaround</p>
              <h3 className="text-3xl font-black mt-2 text-brand-navy">{stats.departures}</h3>
            </div>
            <div className="p-4 bg-status-amber/10 rounded-2xl text-status-amber">
              <UserMinus size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Workforce Growth Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" stroke="#5E718D" fontSize={11} />
                <YAxis stroke="#5E718D" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="total" stroke="#00C2B2" strokeWidth={4} dot={{ r: 5, fill: '#00C2B2' }} name="Total Headcount" />
                <Line type="monotone" dataKey="active" stroke="#00C48C" strokeWidth={4} dot={{ r: 5, fill: '#00C48C' }} name="Active Talent" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Department Allocation</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5 overflow-hidden">
        <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100">
          <CardTitle className="text-brand-navy text-lg font-bold">Recent Hires Registry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 font-black tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5">Employee Name</th>
                  <th className="px-8 py-5">Profile ID</th>
                  <th className="px-8 py-5">Department</th>
                  <th className="px-8 py-5">Role Assigned</th>
                  <th className="px-8 py-5">Onboarding Date</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentHires.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs uppercase">
                            {row.full_name?.[0]}
                         </div>
                         <span className="font-bold text-brand-navy group-hover:text-brand-teal transition-colors">{row.full_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs text-brand-teal/80 font-bold">{row.employee_id || 'VYR-GEN-1'}</td>
                    <td className="px-8 py-5 text-gray-600 font-medium">{row.department}</td>
                    <td className="px-8 py-5 text-gray-600 font-medium italic">{row.role}</td>
                    <td className="px-8 py-5 text-gray-500 font-medium">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-right">
                      <Badge variant="blue" className="px-3 py-1 font-black uppercase text-[9px] tracking-widest">Active</Badge>
                    </td>
                  </tr>
                ))}
                {recentHires.length === 0 && (
                   <tr><td colSpan={6} className="py-12 text-center text-gray-500 italic">No recent hires found in the registry.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeOverview;
