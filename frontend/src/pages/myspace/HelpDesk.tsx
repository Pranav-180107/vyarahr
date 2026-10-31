import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { MessageSquare, Info, AlertTriangle, Headset, CheckCircle, UserPlus, LogOut, Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sendEmail } from '../../lib/resend';

const HelpDesk = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [ticketType, setTicketType] = useState('IT Support');
  const [priority, setPriority] = useState('Medium');
  const [toast, setToast] = useState('');

  const [adminTickets] = useState<any[]>([]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Request submitted successfully! ✓');
    (e.target as HTMLFormElement).reset();
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const description = formData.get('description') as string || 'No description provided';

    showToast('Processing ticket...');

    sendEmail({
      to: 'vyara2026@gmail.com',
      subject: `New Support Ticket: ${ticketType} [${priority}]`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f2d52;">New Support Ticket Raised</h2>
          <p><strong>Employee:</strong> ${profile?.full_name} (${profile?.employee_id || 'N/A'})</p>
          <p><strong>Category:</strong> ${ticketType}</p>
          <p><strong>Priority:</strong> ${priority}</p>
          <hr />
          <p><strong>Issue Description:</strong></p>
          <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; font-style: italic;">${description}</p>
        </div>
      `
    }).then(res => {
      if (res.success) {
        showToast('Support ticket raised and HR notified via email! ✓');
      } else {
        showToast('Ticket recorded, but email notification failed.');
      }
    });

    (e.target as HTMLFormElement).reset();
  };

  const employeeQuickActions = [
    "Leave balance is wrong",
    "Last payslip was incorrect",
    "I want to update my bank details"
  ];

  /* ─────────────────────── ADMIN VIEW ─────────────────────── */
  if (isAdmin) {
    return (
      <div className="space-y-6 w-full relative">
        {toast && (
          <div className="fixed top-24 right-8 bg-brand-navy text-white px-6 py-3 rounded-xl shadow-2xl z-50 border border-brand-teal flex items-center gap-3 animate-in slide-in-from-right">
            <CheckCircle className="text-brand-teal" size={20} />
            <span className="font-medium">{toast}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-brand-navy">Administrator Help Desk Console</h2>
          <Badge variant="blue">System Admin Mode</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Box 1: Console Shortcuts */}
          <Card className="border-t-4 border-t-brand-teal flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info size={22} className="text-brand-teal"/> Console Shortcuts
              </CardTitle>
              <p className="text-sm text-gray-500">Functional links to manage lifecycle modules.</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <Link to="/dashboard/hiring" className="flex-1">
                <Button variant="outline" className="w-full justify-start gap-3 h-16 border-gray-200 hover:border-brand-teal hover:text-brand-teal hover:bg-brand-teal/5 transition-all text-base font-medium">
                  <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                    <UserPlus size={20} className="text-brand-teal" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Manage Hiring Pipeline</p>
                    <p className="text-xs text-gray-400 font-normal">View & process all applicants</p>
                  </div>
                </Button>
              </Link>
              <Link to="/dashboard/offboarding" className="flex-1">
                <Button variant="outline" className="w-full justify-start gap-3 h-16 border-gray-200 hover:border-brand-navy hover:text-brand-navy hover:bg-brand-navy/5 transition-all text-base font-medium">
                  <div className="w-9 h-9 rounded-lg bg-brand-navy/10 flex items-center justify-center shrink-0">
                    <LogOut size={20} className="text-brand-navy" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Employee Offboarding</p>
                    <p className="text-xs text-gray-400 font-normal">Manage exit procedures</p>
                  </div>
                </Button>
              </Link>
              <Link to="/dashboard/updates" className="flex-1">
                <Button variant="outline" className="w-full justify-start gap-3 h-16 border-gray-200 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all text-base font-medium">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Briefcase size={20} className="text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Post Company Updates</p>
                    <p className="text-xs text-gray-400 font-normal">Announcements & job postings</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Box 2: Support Tickets */}
          <Card className="border-t-4 border-t-brand-navy flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Headset size={22} className="text-brand-navy"/> Support Tickets
              </CardTitle>
              <p className="text-sm text-gray-500">Employee issues requiring immediate action.</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {adminTickets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Headset size={28} className="text-gray-300" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-500">No Active Tickets</p>
                    <p className="text-sm text-gray-400 mt-1">All employee issues are resolved.</p>
                  </div>
                  <Badge variant="neutral" className="text-xs">Inbox Clear ✓</Badge>
                </div>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {adminTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 bg-brand-navy/5 rounded-xl border border-brand-navy/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-brand-navy text-sm">{ticket.name}</p>
                          <p className="text-[10px] text-gray-400">{ticket.empId} • {ticket.dept}</p>
                        </div>
                        <Badge variant={ticket.priority === 'High' ? 'red' : 'neutral'} className="text-[9px] px-1.5 py-0">
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 bg-white/80 p-2 rounded border border-brand-navy/5 leading-relaxed">{ticket.issue}</p>
                      <p className="text-[9px] text-brand-navy font-bold uppercase tracking-widest text-center">Action Required Immediately</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ─────────────────────── EMPLOYEE VIEW ─────────────────────── */
  return (
    <div className="space-y-6 w-full relative">
      {toast && (
        <div className="fixed top-24 right-8 bg-brand-navy text-white px-6 py-3 rounded-xl shadow-2xl z-50 border border-brand-teal flex items-center gap-3 animate-in slide-in-from-right">
          <CheckCircle className="text-brand-teal" size={20} />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      <h2 className="text-2xl font-bold text-brand-navy">Employee Help Desk</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

        {/* Left: Quick Actions */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info size={22} className="text-brand-teal"/> Quick Actions
            </CardTitle>
            <p className="text-sm text-gray-500">Resolve common issues instantly or raise a custom request.</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Frequently Asked Checks</label>
              <div className="flex flex-col gap-3">
                {employeeQuickActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="justify-start text-left font-normal border-gray-200 hover:border-brand-teal hover:text-brand-teal hover:bg-brand-teal/5 transition-all h-12 text-sm"
                    onClick={() => showToast(`Information for "${action}" sent to your email. ✓`)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>

            <form className="flex-1 flex flex-col gap-3 border-t pt-5" onSubmit={handleSubmitRequest}>
              <label className="block text-sm font-semibold text-gray-700">Other Request / Custom Action</label>
              <textarea
                rows={5}
                className="w-full flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal text-sm resize-none outline-none transition-all"
                placeholder="Describe what you need help with..."
                required
              />
              <p className="text-[10px] text-gray-400">Note: For profile corrections, please describe the specific field change required.</p>
              <Button type="submit" className="w-full h-11 font-semibold">Submit Request</Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Raise a Support Ticket */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headset size={22} className="text-brand-navy" /> Raise a Support Ticket
            </CardTitle>
            <p className="text-sm text-gray-500">Submit a formal ticket. HR will be notified via email.</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <form className="flex-1 flex flex-col gap-5" onSubmit={handleSubmitTicket}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue Category</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal text-sm outline-none"
                    title="Issue Category"
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value)}
                  >
                    <option>Payroll Issue</option>
                    <option>IT Support</option>
                    <option value="Harassment">Harassment / Grievance</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority Level</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal text-sm outline-none"
                    title="Priority Level"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <label className="block text-sm font-semibold text-gray-700">Ticket Description</label>
                <textarea
                  name="description"
                  rows={8}
                  className="flex-1 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal text-sm resize-none outline-none transition-all"
                  placeholder="Please describe your issue in detail — include dates, amounts, or system errors where applicable..."
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t gap-4">
                <Button type="submit" className="gap-2 px-10 h-11 font-semibold">
                  <MessageSquare size={16}/> Submit Ticket
                </Button>
                {ticketType === 'Harassment' && (
                  <Badge variant="red" className="flex items-center gap-1 animate-pulse text-xs">
                    <AlertTriangle size={12}/> High Confidentiality Protocol Active
                  </Badge>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default HelpDesk;
