import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SalaryComputation from '../../components/payroll/SalaryComputation';
import PayslipPreview from '../../components/payroll/PayslipPreview';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const PayDocs = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payrollSummary, setPayrollSummary] = useState({ total: 0, count: 0, pending: 0 });
  const [selectedPayrollData, setSelectedPayrollData] = useState<any>(null);
  const [payrollStatus, setPayrollStatus] = useState<'draft' | 'paid' | 'locked'>('draft');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!profile?.email) return;

      console.log("Fetching employees from Supabase for admin:", profile.email);
      
      // Fetch profiles
      let query = supabase.from('profiles').select('*');
      if (profile.email !== 'praveen12rangasamy@gmail.com') {
          query = query.ilike('hired_by', profile.email.trim());
      }
      
      const { data: empData, error: empError } = await query;
        
      if (empError) throw empError;

      if (empData) {
        // Filter out self if ID is different but email is same (edge case)
        let filteredEmps = empData.filter(e => e.email !== profile?.email);
        
        // If primary admin, exclude fake profiles
        if (profile.email === 'praveen12rangasamy@gmail.com') {
          const fakeNames = ['mukesh', 'sanjay', 'kanmani'];
          filteredEmps = filteredEmps.filter(e => !fakeNames.includes(e.full_name?.toLowerCase() || '') && e.role === 'employee');
        } else {
          filteredEmps = filteredEmps.filter(e => e.role === 'employee');
        }

        setEmployees(filteredEmps);

        // 2. Fetch Payroll Summary for current month
        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
        const currentYear = new Date().getFullYear().toString();
        
        const employeeIds = filteredEmps.map(e => e.id);
        const { data: runs, error: runError } = await supabase
          .from('payroll_runs')
          .select('net_salary, status')
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .in('employee_id', employeeIds);

        if (runs) {
          const total = runs.reduce((acc, run) => acc + Number(run.net_salary), 0);
          const paid = runs.filter(r => r.status === 'paid').length;
          setPayrollSummary({ 
            total, 
            count: paid, 
            pending: Math.max(0, filteredEmps.length - paid) 
          });
        }
      } else {
        setError("No profiles returned from database.");
      }
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to connect to database");
    } finally {
      setLoading(false);
    }
  };

  const handlePayrollComplete = (data: any) => {
    setSelectedPayrollData(data);
    setPayrollStatus('draft');
  };

  const handleApprove = async () => {
    if (!selectedPayrollData) return;

    try {
      const { error } = await supabase.from('payroll_runs').insert({
        employee_id: selectedPayrollData.employee.id,
        month: selectedPayrollData.month,
        year: selectedPayrollData.year,
        gross_earnings: selectedPayrollData.earnings.grossEarnings,
        total_deductions: selectedPayrollData.deductions.totalDeductions,
        net_salary: selectedPayrollData.netSalary,
        status: 'paid',
        earnings_breakdown: selectedPayrollData.earnings,
        deductions_breakdown: selectedPayrollData.deductions,
        payment_mode: selectedPayrollData.paymentMode,
        paid_at: new Date().toISOString()
      });

      if (error) throw error;

      setPayrollStatus('paid');
      alert(`Payroll for ${selectedPayrollData.employee.full_name} disbursed successfully!`);
      fetchData(); 
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-orange" size={48} />
        <p className="text-gray-400 font-bold animate-pulse">Connecting to VyaraHR Cloud...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-brand-navy mb-1">Payroll Management</h1>
          <p className="text-gray-500 text-sm">Calculate, approve and disburse employee salaries</p>
        </div>
        <button onClick={fetchData} className="w-full sm:w-auto justify-center flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4 text-red-600">
          <AlertCircle size={32} />
          <div>
            <p className="font-bold">Database Error</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* ADMIN VIEW: Management Console */}
      {isAdmin && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Disbursed (Month)" value={`₹ ${payrollSummary.total.toLocaleString()}`} color="text-brand-orange" />
            <StatCard label="Employees Paid" value={`${payrollSummary.count} / ${employees.length}`} color="text-emerald-600" />
            <StatCard label="Remaining to Pay" value={`${payrollSummary.pending}`} color="text-rose-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-7">
              <SalaryComputation 
                employees={employees} 
                onPayrollComplete={handlePayrollComplete} 
              />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <PayslipPreview 
                data={selectedPayrollData} 
                onApprove={handleApprove}
                status={payrollStatus}
              />
            </div>
          </div>
        </>
      )}

      {/* EMPLOYEE VIEW: Personal Payroll History */}
      {!isAdmin && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-brand-navy mb-6">Your Payroll History</h3>
              <EmployeePayrollHistory />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-brand-navy rounded-3xl p-6 text-white text-center">
              <div className="w-16 h-16 bg-brand-orange/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-orange">
                <RefreshCw size={32} />
              </div>
              <h4 className="font-bold text-lg mb-2">Request Assistance?</h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                If you find a mistake in your payslip or have queries regarding deductions, contact the finance team.
              </p>
              <button 
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-3 rounded-xl text-xs font-bold transition-all"
                onClick={() => window.location.href='/dashboard/myspace/helpdesk'}
              >
                Raise Finance Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// New internal component for employee view
const EmployeePayrollHistory = () => {
  const { profile } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyPayroll = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('employee_id', profile.id)
        .order('paid_at', { ascending: false });
      
      setRuns(data || []);
      setLoading(false);
    };
    fetchMyPayroll();
  }, [profile]);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading your payslips...</div>;
  if (runs.length === 0) return (
    <div className="py-20 text-center">
      <div className="text-gray-300 mb-2">No payroll records found yet.</div>
      <p className="text-xs text-gray-400">Your payslips will appear here once disbursed by the HR admin.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <div key={run.id} className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-orange/40 transition-all group">
          <div className="flex items-center gap-4">
            <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center text-brand-navy border border-gray-100 font-bold shadow-sm shrink-0">
              {run.month.substring(0, 3)}
            </div>
            <div>
              <p className="font-bold text-brand-navy">{run.month} {run.year}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Disbursed on {new Date(run.paid_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-display font-bold text-brand-navy text-lg">₹{run.net_salary.toLocaleString()}</p>
            <button className="text-brand-orange text-[10px] font-bold uppercase tracking-widest hover:underline">Download PDV/PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-white border border-gray-100 rounded-[14px] p-6 shadow-sm transition-all hover:shadow-md">
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</p>
    <h2 className={`font-display text-3xl font-extrabold ${color}`}>{value}</h2>
  </div>
);

export default PayDocs;
