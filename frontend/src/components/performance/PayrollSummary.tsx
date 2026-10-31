import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IndianRupee, Eye, EyeOff, FileDown, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getScopedKey } from '../../utils/tenantHelper';

const PayrollSummary = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showAmounts, setShowAmounts] = useState(false);
  const [metrics, setMetrics] = useState({
    totalExpense: 0,
    deductions: 0,
    bonus: 0
  });
  const [deptPayroll, setDeptPayroll] = useState<any[]>([]);
  const [detailedPayroll, setDetailedPayroll] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  useEffect(() => {
    fetchPayrollData();
  }, [profile, user]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      // Fetch profiles with salaries hired by this admin
      const { data: rawProfiles, error } = await supabase.from('profiles').select('*');

      if (error) throw error;

      if (rawProfiles) {
        const profiles = (rawProfiles || []).filter(p => p.role === 'employee' || p.role === 'hr' || p.role === 'accountant');

        // Calculate Totals using gross_salary or salary
        const total = profiles.reduce((sum, p) => sum + (Number(p.gross_salary) || Number(p.salary) || 0), 0);
        const estDeductions = total * 0.12; // 12% PF/Tax estimate
        const estBonus = total * 0.05; // 5% avg bonus

        setMetrics({
          totalExpense: total,
          deductions: estDeductions,
          bonus: estBonus
        });

        // Dept Breakdown
        const depts: Record<string, number> = {};
        profiles.forEach(p => {
          const d = p.department || 'Unassigned';
          const sal = Number(p.gross_salary) || Number(p.salary) || 0;
          depts[d] = (depts[d] || 0) + sal;
        });
        setDeptPayroll(Object.entries(depts).map(([name, cost]) => ({ name, cost })));

        // Detailed Breakdown
        setDetailedPayroll(
          profiles
            .filter(p => (Number(p.gross_salary) || Number(p.salary) || 0) > 0)
            .map(p => {
              const sal = Number(p.gross_salary) || Number(p.salary) || 0;
              return {
                name: p.full_name,
                dept: p.department || 'Operations',
                gross: sal,
                deductions: sal * 0.1,
                bonus: sal * 0.05,
                net: sal * 0.95
              };
            })
        );

        // Real Trend (Current Month data only)
        const now = new Date();
        setMonthlyTrend([
          { month: now.toLocaleString('en-US', { month: 'short' }), gross: total, net: total - estDeductions }
        ]);
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    if (!showAmounts) return '₹ •••••••';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const logAction = (action: string) => {
    const logsKey = getScopedKey('admin_audit_logs', profile, user);
    const logs = JSON.parse(localStorage.getItem(logsKey) || '[]');
    logs.push({
      action,
      timestamp: new Date().toISOString(),
      adminId: profile?.full_name || 'ADMIN',
    });
    localStorage.setItem(logsKey, JSON.stringify(logs.slice(-100)));
  };

  const toggleShowAmounts = () => {
    const newState = !showAmounts;
    setShowAmounts(newState);
    if (newState) logAction('VIEWED_SENSITIVE_PAYROLL_DATA');
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
       <div className="flex justify-between items-center bg-gray-50 p-5 rounded-3xl border border-gray-100 shadow-md">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${showAmounts ? 'bg-brand-teal text-brand-navy' : 'bg-gray-200 text-gray-500'} transition-all shadow-sm`}>
             <IndicatorIcon size={20} active={showAmounts}/>
          </div>
          <div>
            <h4 className="text-brand-navy font-bold tracking-tight">Financial Confidentiality Mode</h4>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{showAmounts ? 'Unmasked Access Active' : 'Level 1 Data Masking Active'}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={toggleShowAmounts}
            className={`rounded-xl border-none font-bold text-xs uppercase tracking-widest px-6 h-11 transition-all ${showAmounts ? 'bg-brand-teal text-brand-navy hover:bg-brand-teal/80' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {showAmounts ? <EyeOff size={14} className="mr-2"/> : <Eye size={14} className="mr-2" />}
            {showAmounts ? 'Mask Salaries' : 'Reveal Data'}
          </Button>
          <Button className="bg-brand-navy hover:bg-black text-white border-none rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-11" onClick={() => logAction('EXPORTED_PAYROLL_REPORT')}>
            <FileDown size={14} className="mr-2" /> Download Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-brand-teal bg-white border-gray-100 shadow-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gross Monthly Liability</p>
              <h3 className="text-2xl font-black mt-2 text-brand-navy">{formatAmount(metrics.totalExpense)}</h3>
            </div>
            <div className="p-4 bg-brand-teal/10 rounded-2xl text-brand-teal">
              <IndianRupee size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-amber bg-white border-gray-100 shadow-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Statutory Deductions (Est.)</p>
              <h3 className="text-2xl font-black mt-2 text-brand-navy">{formatAmount(metrics.deductions)}</h3>
            </div>
            <div className="p-4 bg-status-amber/10 rounded-2xl text-status-amber">
              <AlertTriangle size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-green bg-white border-gray-100 shadow-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Net Payable Disbursement</p>
              <h3 className="text-2xl font-black mt-2 text-brand-navy">{formatAmount(metrics.totalExpense - metrics.deductions + metrics.bonus)}</h3>
            </div>
            <div className="p-4 bg-status-green/10 rounded-2xl text-status-green">
              <IndianRupee size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Historical Compensation Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" stroke="#5E718D" fontSize={11} />
                <YAxis stroke="#5E718D" fontSize={11} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                   formatter={(val: any) => showAmounts ? `₹${Number(val).toLocaleString()}` : '₹ •••••••'}
                />
                <Legend iconType="circle" />
                <Bar dataKey="gross" fill="#00C2B2" name="Gross Allocation" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" fill="rgba(0, 196, 140, 0.4)" name="Post-Deduction Net" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-brand-navy text-lg font-bold">Department Cost Allocation</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptPayroll} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" stroke="#5E718D" fontSize={10} hide />
                <YAxis type="category" dataKey="name" stroke="#5E718D" fontSize={11} width={100} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#131F35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                   formatter={(val: any) => showAmounts ? `₹${Number(val).toLocaleString()}` : '₹ •••••••'}
                />
                <Bar dataKey="cost" fill="#00C2B2" radius={[0, 4, 4, 0]} name="Total Salary Cost" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-gray-100 shadow-lg shadow-brand-navy/5 overflow-hidden">
        <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100">
          <CardTitle className="text-brand-navy text-lg font-bold">Salary Ledger (Individual Breakdown)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 font-black tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5">Talent Name</th>
                    <th className="px-8 py-5">Sub-Org / Dept</th>
                    <th className="px-8 py-5">Base Salary (CTC)</th>
                    <th className="px-8 py-5">Standard Deductions</th>
                    <th className="px-8 py-5 text-right">Settlement Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  {detailedPayroll.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5 font-bold text-brand-navy group-hover:text-brand-teal transition-colors uppercase">{row.name}</td>
                      <td className="px-8 py-5 text-gray-500 font-medium">{row.dept}</td>
                      <td className="px-8 py-5 font-mono">{formatAmount(row.gross)}</td>
                      <td className="px-8 py-5 text-status-amber font-mono">{formatAmount(row.deductions)}</td>
                      <td className="px-8 py-5 text-right text-brand-teal font-black text-sm">{formatAmount(row.net)}</td>
                    </tr>
                  ))}
                  {detailedPayroll.length === 0 && (
                     <tr><td colSpan={5} className="py-12 text-center text-gray-500 italic">No salary records found for active employees.</td></tr>
                  )}
                </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

const IndicatorIcon = ({ size, active }: { size: number; active: boolean }) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: active ? '#00dfc0' : '#9ca3af',
      borderRadius: '50%',
      boxShadow: active ? '0 0 10px #00dfc0' : 'none',
    }}
  />
);

export default PayrollSummary;
