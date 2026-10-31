import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Target, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Project Alpha', value: 35, color: '#10B981' }, // green
  { name: 'Q4 Marketing', value: 20, color: '#F59E0B' }, // amber
  { name: 'Website Redesign', value: 10, color: '#EF4444' }, // red
  { name: 'App V2', value: 35, color: '#0F2D52' }, // navy
];

const Goals = () => {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold text-brand-navy flex items-center gap-2">
          <Target size={24} className="text-brand-teal" /> Performance Goals
        </h2>
        <select className="border border-gray-300 rounded-md p-2 focus:ring-brand-teal text-sm min-w-[200px]">
          <option>Overall — All Projects</option>
          <option>Project Alpha</option>
          <option>Q4 Marketing</option>
          <option>App V2</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-status-green">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-bold uppercase flex justify-between">
              On Track <CheckCircle size={16} className="text-status-green"/>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-bold">12</h3>
            <p className="text-xs text-gray-400 mt-1">projects progressing smoothly</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-status-amber">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-bold uppercase flex justify-between">
              At Risk <AlertTriangle size={16} className="text-status-amber"/>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-bold">4</h3>
            <p className="text-xs text-gray-400 mt-1">projects behind schedule</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-status-red">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-bold uppercase flex justify-between">
              Overdue <AlertCircle size={16} className="text-status-red"/>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-bold text-status-red">1</h3>
            <p className="text-xs text-gray-400 mt-1">projects past deadline</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goal Progress by Project</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [`${value}% Completion`, name]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {data.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-sm font-medium">{entry.name} ({entry.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg border-l-4 border-l-status-red bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-status-red">Website Redesign Overdue</h4>
                  <span className="text-xs text-gray-500">2 days ago</span>
                </div>
                <p className="text-sm text-gray-700">The homepage mockup was due on Tuesday. Follow up with the design lead to remove blockers.</p>
              </div>
              <div className="p-4 border rounded-lg border-l-4 border-l-status-amber bg-amber-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-status-amber">Marketing Campaign At Risk</h4>
                  <span className="text-xs text-gray-500">Today</span>
                </div>
                <p className="text-sm text-gray-700">Ad copy approval is pending from the legal team. This could delay launch.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Goals;
