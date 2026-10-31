import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, AlertCircle, Send, FileText, Upload, ShieldCheck, User, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const Resignation = () => {
  const { profile } = useAuth();
  const [resigned, setResigned] = useState(false);
  const [toast, setToast] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [formData, setFormData] = useState({ lwd: '', reason: '' });
  const [checklist, setChecklist] = useState<any>({
    resignation_letter: false,
    lwd_confirmed: false,
    assets_collected: false,
    kt_completed: false,
    no_dues_verified: false,
    no_loans_pending: false
  });

  const handleResign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('resignations')
        .insert({
          user_id: profile.id,
          lwd: formData.lwd,
          reason: formData.reason,
          status: 'Pending'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) setRequestId(data.id);
      setResigned(true);
      setStatus('Pending');
      setToast('Resignation request sent for Admin approval! ✓');
      setTimeout(() => setToast(''), 4000);
    } catch (err: any) {
      console.error("Error submitting resignation:", err.message);
      setToast('Failed to submit: ' + err.message);
    }
  };

  const updateChecklist = async (newChecklist: any) => {
    if (!requestId) return;
    try {
      const { error } = await supabase
        .from('resignations')
        .update({ checklist: newChecklist })
        .eq('id', requestId);
      if (error) throw error;
      setChecklist(newChecklist);
    } catch (err: any) {
      console.error("Error updating checklist:", err.message);
    }
  };

  useEffect(() => {
    const fetchExisting = async () => {
      if (profile) {
        const { data, error } = await supabase
          .from('resignations')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (data) {
          setResigned(true);
          setRequestId(data.id);
          setStatus(data.status || 'Pending');
          setFormData({ lwd: data.lwd, reason: data.reason });
          if (data.checklist) {
            setChecklist(data.checklist);
          }
        }
      }
    };
    fetchExisting();
  }, [profile]);

  return (
    <div className="space-y-8 max-w-6xl animate-in fade-in duration-500 pb-12">
      {toast && (
        <div className="fixed top-24 right-8 bg-brand-navy text-white px-6 py-3 rounded-xl shadow-2xl z-50 border border-brand-teal animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <ShieldCheck className="text-brand-teal" size={28} />
          Employee Resignation Portal
        </h2>
        <p className="text-gray-500">Submit your formal notice, required documents, and track your clearance status.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resignation Form */}
        <Card className={`h-fit overflow-hidden border-none shadow-xl shadow-brand-navy/5 ${resigned ? 'opacity-70 grayscale' : ''}`}>
          <div className="h-2 bg-brand-teal w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send size={20} className="text-brand-teal" /> Submit Resignation Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleResign}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><User size={12}/> Employee Full Name</label>
                  <input type="text" readOnly title="Employee Full Name" value={profile?.full_name || 'N/A'} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-semibold text-brand-navy outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Employee ID</label>
                  <input type="text" readOnly title="Employee ID" value={profile?.employeeId || profile?.employee_id || 'N/A'} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-semibold text-brand-navy outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Proposed Last Working Day</label>
                <input 
                  type="date" 
                  disabled={resigned} 
                  title="Proposed Last Working Day"
                  value={formData.lwd}
                  onChange={(e) => setFormData({...formData, lwd: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-teal outline-none text-sm" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reason for Resignation</label>
                <textarea 
                  rows={3} 
                  disabled={resigned} 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-teal outline-none text-sm resize-none" 
                  placeholder="Briefly explain your reason for leaving..." 
                  required
                ></textarea>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12}/> Resignation Letter</label>
                    <input type="file" disabled={resigned} title="Upload Resignation Letter" accept=".pdf" className="w-full text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-brand-teal/10 file:text-brand-teal hover:file:bg-brand-teal/20" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12}/> ID Card Scan</label>
                    <input type="file" disabled={resigned} title="Upload ID Card Scan" accept="image/*,.pdf" className="w-full text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-brand-navy/5 file:text-brand-navy hover:file:bg-brand-navy/10" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Award size={12}/> Relieving/Experience Certificates</label>
                  <input type="file" disabled={resigned} title="Upload Relieving/Experience Certificates" accept=".pdf" className="w-full text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="text-status-amber shrink-0" size={18} />
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  By submitting, you confirm authorization of the notice period. The Admin/HR team will review your request and attached documents for clearance.
                </p>
              </div>

              <Button type="submit" className="w-full py-6 text-base font-bold bg-brand-navy hover:bg-black shadow-lg shadow-brand-navy/20" disabled={resigned}>
                {resigned ? 'Resignation Submitted ✓' : 'Submit & Notify Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
 
        {/* Status Tracker */}
        <div className="space-y-6">
          {resigned && (
            <Card className={`border-none shadow-lg overflow-hidden ${
              status === 'Completed' 
                ? 'bg-emerald-50 border-l-4 border-l-status-green' 
                : status === 'Approved' 
                  ? 'bg-blue-50 border-l-4 border-l-brand-teal' 
                  : 'bg-amber-50 border-l-4 border-l-status-amber'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-brand-navy">
                    Resignation Status: <span className={
                      status === 'Completed' 
                        ? 'text-status-green' 
                        : status === 'Approved' 
                          ? 'text-brand-teal' 
                          : 'text-status-amber'
                    }>{status || 'Submitted'}</span>
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {status === 'Completed' 
                      ? 'Exit approved. Clearance complete and relieving details archived.' 
                      : status === 'Approved' 
                        ? 'Resignation approved. Please submit the company items and documents below for final clearance.' 
                        : 'Notice submitted. Waiting for Admin to approve resignation notice to unlock exit checklist.'}
                  </p>
                </div>
                <Badge variant={status === 'Completed' ? 'green' : status === 'Approved' ? 'blue' : 'amber'} className="uppercase font-bold tracking-wider text-[10px]">
                  {status || 'Submitted'}
                </Badge>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle size={20} className="text-status-green" /> Exit Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === 'Pending' && (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 italic">
                  Exit checklist will unlock once resignation notice is approved by admin.
                </div>
              )}
              {[
                { label: 'Resignation Letter', key: 'resignation_letter', type: 'file' },
                { label: 'Last Working Day Confirmation', key: 'lwd_confirmed', type: 'file' },
                { label: 'Asset Return (Laptop, ID Card, etc.)', key: 'assets_collected', type: 'checkbox' },
                { label: 'Knowledge Transfer Document', key: 'kt_completed', type: 'file' },
                { label: 'No Dues Certificate (Finance)', key: 'no_dues_verified', type: 'file' },
                { label: 'No Loans Pending Statement', key: 'no_loans_pending', type: 'file' },
              ].map((item, i) => {
                const isItemCompleted = checklist[item.key];
                const isInteractionDisabled = status !== 'Approved' || isItemCompleted;
                return (
                  <div key={i} className={`p-4 rounded-xl border transition-all ${isItemCompleted ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50/50 border-gray-100'} ${status === 'Pending' ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {isItemCompleted ? <CheckCircle className="text-status-green" size={20} /> : <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />}
                        <span className={`text-sm font-semibold ${isItemCompleted ? 'text-emerald-700' : 'text-gray-600'}`}>{item.label}</span>
                      </div>
                      <Badge variant={isItemCompleted ? 'green' : 'neutral'} className="text-[10px] uppercase font-bold tracking-widest">{isItemCompleted ? 'Submitted' : 'Pending'}</Badge>
                    </div>
                    
                    {item.type === 'file' ? (
                      <div className="relative group">
                        <input 
                          type="file" 
                          disabled={isInteractionDisabled}
                          title={`Upload document for ${item.label}`}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const updated = { ...checklist, [item.key]: true };
                              updateChecklist(updated);
                            }
                          }}
                          className="w-full text-[10px] text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-brand-teal/10 file:text-brand-teal hover:file:bg-brand-teal/20 cursor-pointer disabled:cursor-not-allowed" 
                        />
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 group ${isInteractionDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input 
                          type="checkbox" 
                          checked={isItemCompleted}
                          disabled={isInteractionDisabled}
                          onChange={(e) => {
                            const updated = { ...checklist, [item.key]: e.target.checked };
                            updateChecklist(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal disabled:opacity-50"
                        />
                        <span className="text-xs text-gray-500 group-hover:text-brand-navy transition-colors">I confirm all company assets have been returned</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Resignation;
