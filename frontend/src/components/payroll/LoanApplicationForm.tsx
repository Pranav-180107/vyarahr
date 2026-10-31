import React, { useState } from 'react';
import { DollarSign, Percent, Calendar, Send, HelpCircle } from 'lucide-react';
import { calculateLoanEMI } from '../../utils/salaryCalculator';

interface LoanApplicationFormProps {
  grossSalary: number;
  onSubmit: (data: any) => void;
}

const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ grossSalary, onSubmit }) => {
  const [amount, setAmount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(6);
  const [reason, setReason] = useState('Personal');
  const [notes, setNotes] = useState('');

  const maxEligible = grossSalary * 3;
  const emi = calculateLoanEMI(amount, duration);
  const emiPercentage = grossSalary > 0 ? (emi / grossSalary) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert('Enter a valid amount');
    if (amount > maxEligible) return alert(`Maximum eligible amount is ₹${maxEligible.toLocaleString()}`);
    
    onSubmit({
      amount,
      duration,
      reason,
      notes,
      emi,
      emiPercentage,
      appliedAt: new Date().toISOString()
    });
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-[18px] p-8">
      <div>
        <h3 className="font-display font-bold text-xl mb-1">Apply for a Loan</h3>
        <p className="text-brand-muted text-sm mb-8">Requests are reviewed within 2 working days</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] uppercase font-bold text-brand-muted">Loan Amount</label>
            <span className="text-[10px] uppercase font-bold text-brand-success">Max Eligible: ₹{maxEligible.toLocaleString()}</span>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-teal font-bold">₹</div>
            <input 
              type="number" 
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full bg-brand-input-bg border border-brand-border rounded-[9px] pl-8 pr-4 py-3.5 text-lg font-bold outline-none focus:border-brand-teal transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-brand-muted px-1">Repayment Period</label>
            <select 
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full bg-brand-input-bg border border-brand-border rounded-[9px] px-4 py-3.5 text-sm outline-none focus:border-brand-teal transition-all"
            >
              {[3, 6, 9, 12, 18, 24].map(m => (
                <option key={m} value={m}>{m} Months</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-brand-muted px-1">Reason for Loan</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-brand-input-bg border border-brand-border rounded-[9px] px-4 py-3.5 text-sm outline-none focus:border-brand-teal transition-all"
            >
              <option>Medical</option>
              <option>Personal</option>
              <option>Education</option>
              <option>Home Improvement</option>
              <option>Wedding</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-brand-muted px-1">Additional Notes</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Brief description of why you need this loan..."
            className="w-full bg-brand-input-bg border border-brand-border rounded-[9px] px-4 py-3 text-sm outline-none focus:border-brand-teal transition-all"
          />
        </div>

        {amount > 0 && (
          <div className="bg-brand-teal/5 border border-brand-teal/15 rounded-xl p-5 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase font-bold text-brand-teal mb-1">Your Monthly EMI will be</p>
                <h3 className="font-display text-2xl font-black text-brand-teal">₹ {emi.toLocaleString()}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-brand-muted mb-1">Impact on Salary</p>
                <p className={`text-sm font-bold ${emiPercentage > 30 ? 'text-brand-danger' : 'text-brand-success'}`}>
                  {emiPercentage.toFixed(1)}% of net salary
                </p>
              </div>
            </div>
          </div>
        )}

        <button 
          type="submit"
          className="w-full bg-brand-teal text-brand-navy font-bold rounded-[10px] py-4 hover:bg-brand-teal-hover transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,194,178,0.2)]"
        >
          <Send size={18} />
          Apply for Loan
        </button>
      </form>
    </div>
  );
};

export default LoanApplicationForm;
