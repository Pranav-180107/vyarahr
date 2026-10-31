import React, { useState } from 'react';
import { Printer, Download, Mail, Lock, ShieldCheck, CreditCard, QrCode, ArrowLeft, Loader2, CheckCircle, X } from 'lucide-react';

interface PayslipPreviewProps {
  data: any;
  onApprove: () => void;
  status: 'draft' | 'paid' | 'locked';
}

const PayslipPreview: React.FC<PayslipPreviewProps> = ({ data, onApprove, status }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'none' | 'gpay' | 'phonepe' | 'upi' | 'card'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Card Form State
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  if (!data) return (
    <div className="bg-white border border-gray-100 rounded-[18px] p-8 h-full flex flex-col items-center justify-center text-center shadow-sm">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <Lock className="text-gray-300" size={32} />
      </div>
      <h3 className="font-display text-lg font-bold text-gray-400 font-display">No Preview Available</h3>
      <p className="text-gray-400 text-sm max-w-[200px]">Complete the computation on the left to see the payslip preview.</p>
    </div>
  );

  const handlePaymentSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        onApprove();
        setShowPaymentModal(false);
        setPaymentMethod('none');
        setPaymentSuccess(false);
        setCardData({ number: '', expiry: '', cvv: '', name: '' });
      }, 1500);
    }, 2000);
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
      alert('Please fill in all card details.');
      return;
    }
    handlePaymentSuccess();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[18px] flex flex-col h-full shadow-sm overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-brand-orange animate-pulse'}`}>
          ● {status.toUpperCase()}
        </span>
        <div className="flex gap-2">
          <button title="Print Payslip" aria-label="Print Payslip" className="p-2 text-gray-400 hover:text-brand-orange hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100"><Printer size={16} /></button>
          <button title="Download Payslip" aria-label="Download Payslip" className="p-2 text-gray-400 hover:text-brand-orange hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100"><Download size={16} /></button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto bg-white">
        <div className="border border-gray-100 p-8 rounded-sm shadow-sm max-w-sm mx-auto bg-white">
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-brand-navy uppercase tracking-tighter">VyaraHR</h2>
              <p className="text-[9px] text-gray-400">Payroll Certificate</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-brand-navy">{data.month} {data.year}</p>
              <p className="text-[8px] text-gray-400 uppercase">Payslip ID: #{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400 font-medium">Employee</span>
              <span className="text-brand-navy font-bold">{data.employee.full_name}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400 font-medium">Designation</span>
              <span className="text-brand-navy font-bold">{data.employee.role || 'Staff'}</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-100 pt-4">
            <Line label="Basic Pay" value={data.earnings.basic} />
            <Line label="HRA" value={data.earnings.hra} />
            {data.adjustments.bonus > 0 && <Line label="Bonus" value={data.adjustments.bonus} highlight />}
            <Line label="Total Deductions" value={data.deductions.totalDeductions} negative />
          </div>

          <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-end">
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Take Home</p>
              <p className="text-xl font-display font-black text-brand-navy">₹ {data.netSalary.toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-end opacity-20">
              <ShieldCheck size={24} className="text-brand-navy" />
              <p className="text-[7px] font-bold uppercase">Verified</p>
            </div>
          </div>
        </div>
      </div>

      {status === 'draft' && (
        <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto">
          <div className="flex gap-4">
            <button className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all font-sans text-xs">
              <Mail size={16} /> Send Email
            </button>
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="flex-1 bg-brand-orange text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all font-sans text-xs uppercase tracking-wider"
            >
              Pay Salary
            </button>
          </div>
        </div>
      )}

      {/* ===== PAYMENT MODAL ===== */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <style>{`
            @keyframes scan {
              0% { top: 5%; }
              50% { top: 95%; }
              100% { top: 5%; }
            }
            .scanner-line {
              animation: scan 2.2s infinite linear;
            }
          `}</style>
          
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in duration-300">
            <div className="flex justify-between items-center px-6 py-4 bg-brand-navy text-white">
              <div className="flex items-center gap-2">
                {paymentMethod !== 'none' && (
                  <button 
                    onClick={() => {
                      setPaymentMethod('none');
                      setIsProcessing(false);
                      setPaymentSuccess(false);
                    }}
                    title="Go Back"
                    aria-label="Go Back"
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {paymentMethod === 'none' && "Disburse Salary"}
                  {paymentMethod === 'card' && "Credit/Debit Card"}
                  {paymentMethod === 'gpay' && "Google Pay (GPay)"}
                  {paymentMethod === 'phonepe' && "PhonePe"}
                  {paymentMethod === 'upi' && "UPI Pay"}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMethod('none');
                  setIsProcessing(false);
                  setPaymentSuccess(false);
                }} 
                title="Close"
                aria-label="Close"
                className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              {/* Payment Success View */}
              {paymentSuccess ? (
                <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100 shadow-md">
                    <CheckCircle size={48} className="animate-bounce" />
                  </div>
                  <h4 className="text-xl font-bold text-brand-navy">Payment Successful!</h4>
                  <p className="text-xs text-gray-500">₹ {data.netSalary.toLocaleString()} transferred to {data.employee.full_name}</p>
                </div>
              ) : isProcessing ? (
                /* Processing View */
                <div className="py-12 text-center space-y-4">
                  <Loader2 size={48} className="animate-spin text-brand-orange mx-auto" />
                  <h4 className="font-bold text-brand-navy text-lg">Processing Transaction</h4>
                  <p className="text-xs text-gray-400">Verifying secure payment connection...</p>
                </div>
              ) : paymentMethod === 'none' ? (
                /* Method Selection Screen */
                <div className="space-y-6">
                  <div className="text-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Transferring net salary</p>
                    <h3 className="text-2xl font-black text-brand-orange">₹ {data.netSalary.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-brand-navy mt-1">To: {data.employee.full_name}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-brand-navy uppercase tracking-wider pl-1">Select Payment Mode</p>
                    
                    <button 
                      onClick={() => setPaymentMethod('gpay')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border hover:border-blue-500 hover:bg-blue-50/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                          <QrCode size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-brand-navy text-sm">Google Pay (GPay)</p>
                          <p className="text-[10px] text-gray-400">Pay instantly via GPay UPI QR</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-blue-500 font-bold uppercase tracking-wider">UPI</span>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('phonepe')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border hover:border-purple-500 hover:bg-purple-50/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                          <QrCode size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-brand-navy text-sm">PhonePe</p>
                          <p className="text-[10px] text-gray-400">Scan and pay using PhonePe App</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-purple-500 font-bold uppercase tracking-wider">UPI</span>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('upi')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border hover:border-teal-500 hover:bg-teal-50/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-xl">
                          <QrCode size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-brand-navy text-sm">BHIM / Any UPI App</p>
                          <p className="text-[10px] text-gray-400">Generate standard UPI QR Code</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-teal-500 font-bold uppercase tracking-wider">QR Code</span>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border hover:border-brand-navy hover:bg-brand-navy/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-navy/10 text-brand-navy rounded-xl">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-brand-navy text-sm">Credit / Debit Card</p>
                          <p className="text-[10px] text-gray-400">Pay using Visa, MasterCard, RuPay</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-brand-navy font-bold uppercase tracking-wider">Card</span>
                    </button>
                  </div>
                </div>
              ) : paymentMethod === 'card' ? (
                /* Card Input Form */
                <form onSubmit={handleCardSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-navy uppercase pl-1">Cardholder Name</label>
                    <input 
                      type="text" 
                      value={cardData.name}
                      onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                      placeholder="e.g. PRAVEEN RANGASAMY"
                      className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-bold uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-navy uppercase pl-1">Card Number</label>
                    <input 
                      type="text" 
                      value={cardData.number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').substring(0, 16);
                        const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                        setCardData({ ...cardData, number: formatted });
                      }}
                      placeholder="4111 2222 3333 4444"
                      className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-bold tracking-widest"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-navy uppercase pl-1">Expiry Date</label>
                      <input 
                        type="text" 
                        value={cardData.expiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                          const formatted = val.length > 2 ? `${val.substring(0, 2)}/${val.substring(2)}` : val;
                          setCardData({ ...cardData, expiry: formatted });
                        }}
                        placeholder="MM/YY"
                        className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-bold text-center"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-navy uppercase pl-1">CVV</label>
                      <input 
                        type="password" 
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').substring(0, 3) })}
                        placeholder="***"
                        className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-teal outline-none font-bold text-center"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-brand-navy hover:bg-black text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-6"
                  >
                    Pay ₹ {data.netSalary.toLocaleString()}
                  </button>
                </form>
              ) : (
                /* GPay, PhonePe, or UPI QR Scanner simulation */
                <div className="text-center space-y-6">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Scan & Pay CTC Salary</p>
                    
                    {/* QR Code Container with Red/Orange Scanner Line */}
                    <div className="relative p-3 bg-white rounded-2xl border shadow-inner">
                      <svg className="w-44 h-44 p-1 bg-white" viewBox="0 0 100 100">
                        <path d="M5,5 h30 v30 h-30 z M10,10 h20 v20 h-20 z" fill="#0A1128" />
                        <path d="M65,5 h30 v30 h-30 z M70,10 h20 v20 h-20 z" fill="#0A1128" />
                        <path d="M5,65 h30 v30 h-30 z M10,70 h20 v20 h-20 z" fill="#0A1128" />
                        <path d="M45,5 h10 v5 h-10 z M50,15 h5 v10 h-5 z M45,30 h15 v5 h-15 z" fill="#0A1128" />
                        <path d="M5,45 h15 v5 h-15 z M10,55 h10 v10 h-10 z M25,45 h10 v5 h-10 z" fill="#0A1128" />
                        <path d="M45,45 h15 v15 h-15 z M50,55 h5 v5 h-5 z" fill="#FF5900" />
                        <path d="M65,45 h10 v5 h-10 z M80,45 h15 v5 h-15 z M70,55 h20 v10 h-20 z" fill="#0A1128" />
                        <path d="M45,65 h5 v20 h-5 z M55,75 h20 v5 h-20 z M65,85 h10 v10 h-10 z M85,65 h10 v30 h-10 z" fill="#0A1128" />
                      </svg>
                      {/* Scanner Line */}
                      <div className="absolute left-3 right-3 h-0.5 bg-brand-orange shadow-[0_0_8px_#FF5900] scanner-line" />
                    </div>
                    
                    <p className="text-xs font-extrabold text-brand-navy mt-4">₹ {data.netSalary.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">UPI ID: vyarahr@axisbank</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 italic">Please scan the QR code above with your mobile payment app to transfer salary to {data.employee.full_name}.</p>
                    <button 
                      onClick={handlePaymentSuccess}
                      className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-2"
                    >
                      Simulate Payment Success
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const Line = ({ label, value, negative, highlight }: any) => (
  <div className="flex justify-between text-[10px]">
    <span className="text-gray-500 font-medium">{label}</span>
    <span className={`font-bold ${negative ? 'text-red-500' : highlight ? 'text-green-600' : 'text-brand-navy'}`}>
      {negative ? '-' : ''} ₹ {value.toLocaleString()}
    </span>
  </div>
);

export default PayslipPreview;
