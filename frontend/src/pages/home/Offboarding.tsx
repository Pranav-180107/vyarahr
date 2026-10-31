import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, Trash2, LayoutList, UserMinus, Search, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import { supabase } from '../../lib/supabase';

const Offboarding = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        if (!profile?.email) return;
        let dbQuery = supabase
          .from('resignations')
          .select(`
            id,
            lwd,
            reason,
            status,
            checklist,
            user_id,
            profiles!inner (
              full_name,
              employee_id,
              designation,
              hired_by
            )
          `);
        
        if (profile?.email !== 'praveen12rangasamy@gmail.com') {
          dbQuery = dbQuery.ilike('profiles.hired_by', profile.email.trim());
        }

        const { data, error } = await dbQuery;
        
        if (error) throw error;

        const mapped = (data || []).map((r: any) => ({
          id: r.id,
          name: r.profiles?.full_name || 'N/A',
          employee_id: r.profiles?.employee_id || 'N/A',
          designation: r.profiles?.designation || 'Employee',
          lwd: new Date(r.lwd).toLocaleDateString(),
          status: r.status,
          reason: r.reason
        }));

        setRequests(mapped);

        // Map checklists
        const checklistMap: any = {};
        (data || []).forEach((r: any) => {
          checklistMap[r.id] = r.checklist;
        });
        setChecklists(checklistMap);
      } catch (err: any) {
        console.error("Error fetching resignations:", err.message);
      }
    };
    fetchRequests();
  }, []);

  const handleDownload = (itemName: string, employeeName: string) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('OFFBOARDING DOCUMENT', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Employee: ${employeeName}`, 20, 40);
    doc.text(`Document: ${itemName}`, 20, 50);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60);
    
    // Add placeholder content
    doc.rect(20, 70, 170, 100);
    doc.text('SUPPLIED DOCUMENT CONTENT (SIMULATED)', 105, 120, { align: 'center' });
    
    doc.save(`${employeeName.replace(' ', '_')}_${itemName.replace(' ', '_')}.pdf`);
  };

  const handleToggle = async (requestId: string, key: string) => {
    const updated = { ...checklists };
    if (!updated[requestId]) updated[requestId] = {};
    updated[requestId][key] = !updated[requestId][key];
    
    try {
      const { error } = await supabase
        .from('resignations')
        .update({ checklist: updated[requestId] })
        .eq('id', requestId);
      if (error) throw error;
      setChecklists(updated);
    } catch (err: any) {
      console.error("Error updating checklist:", err.message);
    }
  };

  const selectedReq = requests.find(r => r.id === selectedRequestId);
  const currentChecklist = checklists[selectedRequestId || ''] || {};

  const filteredRequests = requests.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-brand-navy">Offboarding Management</h2>
          <p className="text-gray-500 mt-1">Manage employee exits, clearance checklists, and final settlements.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search employee..." 
              className="pl-10 pr-4 py-2 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-brand-teal w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Top Section: Resignation Applicants Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-brand-navy text-white flex flex-row items-center gap-2 py-4">
          <LayoutList size={20} />
          <CardTitle className="text-lg text-white">Resignation Applicants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold">Employee ID</th>
                  <th className="px-6 py-4 font-bold">Employee Name</th>
                  <th className="px-6 py-4 font-bold">Designation</th>
                  <th className="px-6 py-4 font-bold">Last Working Day</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                      No resignation requests found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr 
                      key={r.id} 
                      className={`border-b transition-colors cursor-pointer group ${selectedRequestId === r.id ? 'bg-brand-teal/5' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedRequestId(r.id)}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-brand-navy">{r.employee_id || r.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-brand-navy">{r.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{r.designation}</td>
                      <td className="px-6 py-4 font-medium text-brand-navy">{r.lwd}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={r.status === 'Completed' ? 'green' : 'amber'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequestId(r.id);
                          }}
                        >
                          View Checklist
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Checklist Detail (Matches Screenshot) */}
      {selectedRequestId && selectedReq ? (
        <div className="flex justify-center animate-in slide-in-from-bottom duration-500">
          <Card className="max-w-xl w-full border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="pb-4 pt-8 sm:pt-10 px-4 sm:px-10">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-brand-navy tracking-tight">
                    Exit Checklist: <span className="text-brand-teal">{selectedReq.name}</span>
                  </h3>
                  <p className="text-gray-500 italic mt-1 font-medium text-sm sm:text-lg opacity-70">
                    " {selectedReq.reason} "
                  </p>
                </div>
                <Badge variant="amber" className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border-amber-100 shrink-0">
                  {selectedReq.status}
                </Badge>
              </div>
              <hr className="opacity-10" />
            </CardHeader>

            <CardContent className="px-4 sm:px-10 pb-8 sm:pb-10 pt-4 space-y-4">
              {[
                { label: 'Resignation Letter submitted', key: 'resignation_letter' },
                { label: 'Last Working Day confirmed (Notice period served)', key: 'lwd_confirmed' },
                { label: 'Assets Checklist (Laptop, ID Card, etc.) collected', key: 'assets_collected' },
                { label: 'Knowledge Transfer completed', key: 'kt_completed' },
                { label: 'No Dues verified (Finance)', key: 'no_dues_verified' },
                { label: 'No Loans pending', key: 'no_loans_pending' },
              ].map((item, i) => {
                const isSelected = currentChecklist[item.key];
                return (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all group ${
                      isSelected 
                        ? 'bg-emerald-50/30 border-emerald-100 shadow-sm' 
                        : 'bg-white border-brand-navy/5 hover:border-brand-navy/20'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 sm:gap-4 cursor-pointer flex-1"
                      onClick={() => handleToggle(selectedRequestId!, item.key)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        isSelected ? 'bg-emerald-100 text-status-green scale-110' : 'bg-gray-50 text-gray-300 border border-gray-100'
                      }`}>
                        {isSelected ? <CheckCircle size={22} /> : <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-200" />}
                      </div>
                      <span className={`text-sm sm:text-base font-bold transition-colors ${
                        isSelected ? 'text-gray-400' : 'text-brand-navy opacity-80 group-hover:opacity-100'
                      }`}>
                        {item.label}
                      </span>
                    </div>

                    {isSelected && item.key !== 'assets_collected' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-brand-teal hover:bg-brand-teal/10 font-bold gap-2 animate-in fade-in zoom-in duration-300"
                        onClick={() => handleDownload(item.label, selectedReq.name)}
                      >
                        <Download size={16} /> PDF
                      </Button>
                    )}
                  </div>
                );
              })}
              
              <div className="pt-8 border-t mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-7 rounded-2xl border-gray-200 text-brand-navy font-bold text-base hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shadow-sm"
                  onClick={() => window.print()}
                >
                  No Due Certificate
                </Button>
                 <Button 
                  className={`flex-1 py-7 rounded-2xl font-black text-base border-none shadow-xl active:scale-95 transition-all gap-2 ${
                    selectedReq.status === 'Completed'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : selectedReq.status === 'Approved'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        : 'bg-brand-teal hover:bg-[#14b8a6]/80 text-white shadow-brand-teal/20'
                  }`}
                  disabled={selectedReq.status === 'Completed'}
                  onClick={async () => {
                    if (!selectedRequestId) return;
                    try {
                      const nextStatus = selectedReq.status === 'Pending' ? 'Approved' : 'Completed';
                      const { error } = await supabase
                        .from('resignations')
                        .update({ status: nextStatus })
                        .eq('id', selectedRequestId);
                      if (error) throw error;
                      setRequests(requests.map(r => r.id === selectedRequestId ? { ...r, status: nextStatus } : r));
                      setSelectedRequestId(null);
                    } catch (err: any) {
                      console.error("Error updating resignation status:", err.message);
                    }
                  }}
                >
                  <Trash2 size={20} className="mb-0.5" />
                  {selectedReq.status === 'Pending' 
                    ? 'Approve Resignation Notice' 
                    : selectedReq.status === 'Approved'
                      ? 'Approve Final Exit & Offboard'
                      : 'Exit Approved & Archived'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 sm:p-20 bg-white rounded-[2rem] border-2 border-dashed border-brand-navy/10 text-gray-400 animate-in fade-in duration-700">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-navy/5 rounded-full flex items-center justify-center mb-6">
            <UserMinus size={36} className="text-brand-navy opacity-20" />
          </div>
          <h3 className="text-xl font-bold text-brand-navy opacity-40">No Record Selected</h3>
          <p className="text-gray-400 mt-2 text-center max-w-xs font-medium">Click on an applicant row to view and manage their exit checklist.</p>
        </div>
      )}
    </div>
  );
};

export default Offboarding;
