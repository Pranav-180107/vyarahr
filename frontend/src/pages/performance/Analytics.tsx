import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, CheckCircle } from 'lucide-react';

const trendData = [
  { name: 'Jan', performance: 65 },
  { name: 'Feb', performance: 70 },
  { name: 'Mar', performance: 75 },
  { name: 'Apr', performance: 72 },
  { name: 'May', performance: 80 },
  { name: 'Jun', performance: 85 },
];

const deptData = [
  { name: 'Development', score: 88 },
  { name: 'Marketing', score: 76 },
  { name: 'Sales', score: 92 },
  { name: 'Testing', score: 85 },
];

const Analytics = () => {
  return (
    <div className="space-y-6 max-w-7xl">
      <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
        <TrendingUp size={24} className="text-brand-teal" /> Performance Analytics
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-brand-navy text-white">
          <CardContent className="p-6">
            <p className="text-sm text-gray-300 font-medium tracking-wide">Company Average</p>
            <div className="flex items-end gap-3 mt-2">
              <h3 className="text-4xl font-bold text-brand-teal">82%</h3>
              <span className="text-sm text-status-green flex items-center mb-1">+4% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Projects Completed</p>
              <h3 className="text-3xl font-bold mt-2 text-brand-navy">48</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-status-green flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Top Performer</p>
              <h3 className="text-xl font-bold mt-2 text-brand-navy leading-tight">Top Scoring Rep<br /><span className="text-sm font-normal text-brand-teal">Highest Performer</span></h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 text-status-amber flex items-center justify-center">
              <Award size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Trend Graph */}
        <Card>
          <CardHeader>
            <CardTitle>Company Performance Trend (H1)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="performance"
                    stroke="#00B4A6"
                    strokeWidth={3}
                    dot={{ fill: '#00B4A6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Department Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontWeight="500" />
                  <RechartsTooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" fill="#0F2D52" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#6b7280', fontSize: 12, formatter: (val: any) => `${val}%` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Performers (Leaderboard)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                <tr>
                  <th className="px-6 py-3 w-16 text-center">Rank</th>
                  <th className="px-6 py-3">Employee Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3 text-right">Award Metric</th>
                </tr>
              </thead>
              <tbody>
                {[].map((emp: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-center">
                      {emp.rank === 1 ? (
                        <div className="w-6 h-6 rounded-full bg-status-amber text-white flex justify-center items-center text-xs font-bold mx-auto">1</div>
                      ) : (
                        <div className="text-gray-500 font-bold">{emp.rank}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand-navy">{emp.name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.dept}</td>
                    <td className="px-6 py-4 font-bold text-brand-teal">{emp.score}%</td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant="green" className="cursor-pointer hover:bg-emerald-200">+ Bonus Points</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
