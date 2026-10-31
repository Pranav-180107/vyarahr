import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoanApplicationForm from '../../components/payroll/LoanApplicationForm';
import { supabase } from '../../lib/supabase';
import { Search, DollarSign, CheckCircle } from 'lucide-react';

const Loans = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      if (isAdmin) {
        const { data } = await supabase
          .from('loans')
          .select('*, profiles(full_name, employee_id, department)');
        if (data) setLoans(data);
      } else {
        const { data } = await supabase
          .from('loans')
          .select('*, profiles(full_name, employee_id, department)')
          .eq('employee_id', profile?.id);
        if (data) setLoans(data);
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const handleApply = async (loanData: any) => {
    try {
      const { error } = await supabase.from('loans').insert({
        employee_id: profile?.id,
        amount: loanData.amount,
        duration: loanData.duration,
        emi: loanData.emi,
        reason: loanData.reason,
        status: 'pending'
      });
      if (error) throw error;
      alert("Loan application submitted successfully!");
      fetchLoans();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    const { error } = await supabase.from('loans').update({ status }).eq('id', id);
    if (!error) {
      alert(`Loan ${status}`);
      fetchLoans();
    }
  };

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  return (
    <div className="space-y-8 min-h-screen">
      <div>
        <h1 className="font-display text-[1.8rem] font-bold text-brand-navy mb-1">Loan Management</h1>
        <p className="text-gray-500 text-sm">Review, approve and track employee loan requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={isAdmin ? "col-span-12 lg:col-span-4" : "col-span-12 lg:col-span-7"}>
          {isAdmin ? (
            <div className="bg-white border border-gray-100 rounded-[18px] overflow-hidden shadow-sm h-[400px] lg:h-[600px] flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-display font-bold text-sm text-brand-navy mb-4">Incoming Requests</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                  <input type="text" placeholder="Search..." className="w-full bg-white border border-gray-100 rounded-[8px] pl-9 pr-4 py-2 text-xs outline-none focus:border-brand-orange" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {loans.map(loan => (
                  <div key={loan.id} onClick={() => setSelectedLoanId(loan.id)} className={`p-5 cursor-pointer transition-all border-l-[3px] ${selectedLoanId === loan.id ? 'bg-orange-50 border-brand-orange' : 'hover:bg-gray-50 border-transparent'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-brand-navy">{loan.profiles?.full_name}</p>
                      <StatusBadge status={loan.status} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{loan.profiles?.department}</p>
                    <p className="text-sm font-bold text-brand-orange mt-2">₹ {Number(loan.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <LoanApplicationForm grossSalary={profile?.gross_salary || 50000} onSubmit={handleApply} />
          )}
        </div>

        <div className={isAdmin ? "col-span-12 lg:col-span-8" : "col-span-12 lg:col-span-5"}>
          {isAdmin ? (
            <div className="bg-white border border-gray-100 rounded-[18px] p-6 sm:p-8 min-h-[300px] lg:h-[600px] shadow-sm">
              {!selectedLoan ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <DollarSign size={64} className="mb-4 opacity-20" />
                  <p className="font-display text-lg font-bold">Select a loan to review</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-navy">{selectedLoan.profiles?.full_name}</h2>
                      <p className="text-xs font-bold text-gray-400 uppercase mt-1">ID: {selectedLoan.profiles?.employee_id || 'N/A'}</p>
                    </div>
                    {selectedLoan.status === 'pending' && (
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={() => handleStatusUpdate(selectedLoan.id, 'rejected')} className="flex-1 sm:flex-initial bg-red-50 text-red-500 font-bold px-6 py-2 rounded-xl text-xs hover:bg-red-100">Reject</button>
                        <button onClick={() => handleStatusUpdate(selectedLoan.id, 'approved')} className="flex-1 sm:flex-initial bg-brand-orange text-white font-bold px-6 py-2 rounded-xl text-xs hover:opacity-90">Approve</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-6 sm:pt-8 border-t border-gray-50">
                    <Stat label="Requested Amount" value={`₹ ${Number(selectedLoan.amount).toLocaleString()}`} />
                    <Stat label="Repayment Term" value={`${selectedLoan.duration} Months`} />
                    <Stat label="Monthly EMI" value={`₹ ${Number(selectedLoan.emi).toLocaleString()}`} />
                    <Stat label="Reason" value={selectedLoan.reason} />
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="bg-white border border-gray-100 rounded-[18px] p-8 shadow-sm h-full">
               <h3 className="font-display font-bold text-xl text-brand-navy mb-6">Recent Loan Status</h3>
               <div className="space-y-4">
                 {loans.length > 0 ? loans.map(l => (
                   <div key={l.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                     <div>
                       <p className="text-xs font-bold text-brand-navy">₹ {Number(l.amount).toLocaleString()}</p>
                       <p className="text-[10px] text-gray-400 mt-0.5">{l.reason}</p>
                     </div>
                     <StatusBadge status={l.status} />
                   </div>
                 )) : (
                   <div className="text-center py-12">
                     <CheckCircle size={48} className="text-gray-100 mx-auto mb-3" />
                     <p className="text-sm text-gray-400">No active or past loans</p>
                   </div>
                 )}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: any) => (
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-base font-bold text-brand-navy">{value}</p>
  </div>
);

const StatusBadge = ({ status }: any) => {
  const colors: any = {
    'pending': 'bg-orange-50 text-brand-orange border-orange-100',
    'approved': 'bg-green-50 text-green-600 border-green-100',
    'rejected': 'bg-red-50 text-red-600 border-red-100',
    'closed': 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${colors[status] || colors.pending}`}>{status}</span>;
};

export default Loans;
