import React, { useState, useEffect } from 'react';
import { Search, Calculator, AlertCircle } from 'lucide-react';
import { calculateSalary } from '../../utils/salaryCalculator';

interface SalaryComputationProps {
  employees: any[];
  onPayrollComplete: (data: any) => void;
}

const SalaryComputation: React.FC<SalaryComputationProps> = ({ employees, onPayrollComplete }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [overtime, setOvertime] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [emailPayslip, setEmailPayslip] = useState(true);

  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const [salaryData, setSalaryData] = useState<any>(null);

  useEffect(() => {
    if (selectedEmp) {
      const gross = Number(selectedEmp.gross_salary) || 0;
      const calc = calculateSalary({
        grossSalary: gross,
        performanceRating: 4, 
        lopDays: 0,
        workingDaysInMonth: 30,
        activeLoanEMI: 0, 
      });

      // Net salary calculation incorporating custom bonuses and overtime
      const finalNet = calc.netSalary + Number(overtime) + (Number(bonus) > 0 ? Number(bonus) - calc.earnings.performanceBonus : 0);
      
      setSalaryData({
        ...calc,
        netSalary: finalNet,
        adjustments: { overtime, bonus }
      });
    } else {
      setSalaryData(null);
    }
  }, [selectedEmp, overtime, bonus]);

  const handleRunPayroll = () => {
    if (!salaryData) return;
    if (!selectedEmp.gross_salary || selectedEmp.gross_salary === 0) {
      alert("Please update employee's salary in their profile before processing payroll.");
      return;
    }
    onPayrollComplete({
      ...salaryData,
      employee: selectedEmp,
      month,
      year,
      payDate,
      paymentMode,
      emailPayslip
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[18px] p-7 h-full overflow-y-auto shadow-sm">
      <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(255,89,0,0.5)]" />
        Configuration
      </h3>
      
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <select 
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            title="Select Employee"
            className="w-full bg-gray-50 border border-gray-100 rounded-[9px] pl-10 pr-4 py-2.5 text-sm focus:border-brand-orange outline-none transition-all font-bold"
          >
            <option value="">{employees.length === 0 ? 'No employees found in database' : 'Select Employee to Pay...'}</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id || 'No ID'})</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={handleRunPayroll}
          disabled={!selectedEmp}
          className="bg-brand-orange text-white font-bold rounded-[10px] px-6 py-2.5 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Calculator size={18} />
          Preview
        </button>
      </div>

      {selectedEmp && (!selectedEmp.gross_salary || selectedEmp.gross_salary === 0) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-pulse">
          <AlertCircle size={20} />
          <p className="text-xs font-bold">Salary for this employee is not set. Go to Settings &gt; Profiles to update.</p>
        </div>
      )}

      {salaryData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <section>
            <h3 className="text-gray-400 text-[10px] font-bold uppercase mb-4 tracking-widest flex justify-between px-1">
              <span>Monthly Earnings</span>
              <span className="text-brand-orange">CTC: ₹ {Number(selectedEmp.gross_salary).toLocaleString()}</span>
            </h3>
            <div className="bg-gray-50 border border-gray-100 rounded-[14px] overflow-hidden divide-y divide-gray-100">
              <Row label="Monthly Basic Pay" value={salaryData.earnings.basic} />
              <Row label="HRA" value={salaryData.earnings.hra} />
              <Row 
                label="Overtime Payout" 
                value={overtime} 
                editable 
                onChange={(val: string) => setOvertime(parseFloat(val) || 0)} 
              />
              <Row 
                label="Performance Incentives" 
                value={bonus} 
                editable 
                onChange={(val: string) => setBonus(parseFloat(val) || 0)} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-gray-400 text-[10px] font-bold uppercase mb-4 tracking-widest text-red-500 px-1">Deductions & Recoveries</h3>
            <div className="bg-gray-50 border border-gray-100 rounded-[14px] overflow-hidden divide-y divide-gray-100">
              <Row label="Provident Fund" value={salaryData.deductions.pf} negative />
              <Row label="Income Tax (TDS)" value={salaryData.deductions.tds} negative />
              <Row label="Professional Tax" value={salaryData.deductions.professionalTax} negative />
            </div>
          </section>

          <div className="bg-brand-orange/5 border border-brand-orange/10 rounded-[14px] p-6 text-center shadow-inner">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">Final Net Payout</p>
            <h2 className="text-4xl font-display font-bold text-brand-orange">₹ {salaryData.netSalary.toLocaleString()}</h2>
            <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase tracking-widest">
              Bank: {selectedEmp.bank_name || 'Not Set'} • A/C: {selectedEmp.bank_account ? `****${selectedEmp.bank_account.slice(-4)}` : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, editable, onChange, negative }: any) => (
  <div className="flex justify-between items-center p-4">
    <span className="text-xs text-gray-600 font-bold">{label}</span>
    {editable ? (
      <input 
        type="number" 
        defaultValue={value} 
        title={label}
        placeholder={label}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-200 rounded-[6px] w-28 px-2 py-1.5 text-right text-sm outline-none focus:border-brand-orange font-bold text-brand-navy shadow-sm"
      />
    ) : (
      <span className={`font-bold text-sm ${negative ? 'text-red-500' : 'text-brand-navy'}`}>
        {negative ? '-' : ''} ₹ {value.toLocaleString()}
      </span>
    )}
  </div>
);

export default SalaryComputation;
