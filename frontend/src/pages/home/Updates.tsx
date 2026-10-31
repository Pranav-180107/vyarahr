import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Linkedin, Briefcase, Bell, Info, Megaphone, Pencil, Trash2, X, FileText } from 'lucide-react';
import { getRelativeTime } from '../../lib/timeHelper';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';

import { getScopedKey } from '../../utils/tenantHelper';

interface Job {
  id: number;
  title: string;
  department: string;
  type: string;
  salary: string;
  status: string;
  Applied: number;
  description: string;
  summary?: string;
  eligibility?: string;
  vacancy?: string | number;
  experience?: string;
}

const Updates = () => {
  const { profile, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [postToLinkedin, setPostToLinkedin] = useState(false);
  const [customDept, setCustomDept] = useState('');
  const [deptValue, setDeptValue] = useState('Engineering');
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Scoped loading
  useEffect(() => {
    if (profile || user) {
      const jobsKey = getScopedKey('hr_jobs', profile, user);
      const notificationsKey = getScopedKey('hr_notifications', profile, user);
      
      const savedJobs = localStorage.getItem(jobsKey);
      setJobs(savedJobs ? JSON.parse(savedJobs) : []);
      
      const notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
      const filtered = notifications.filter((n: any) => {
        if (profile?.role === 'employee') {
          return !n.visibleTo || n.visibleTo === 'all';
        }
        return true;
      });
      setAnnouncements(filtered);
    }
  }, [profile, user]);

  // Scoped saving of jobs
  useEffect(() => {
    if ((profile || user) && jobs.length > 0) {
      const jobsKey = getScopedKey('hr_jobs', profile, user);
      localStorage.setItem(jobsKey, JSON.stringify(jobs));
    }
  }, [jobs, profile, user]);

  const salaryOptions = [
    '3,00,000', '4,00,000', '5,00,000', '6,00,000', '7,00,000', '8,00,000', 
    '10,00,000', '12,00,000', '15,00,000', '20,00,000', '25,00,000'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('jobTitle') as string;
    const minSalary = formData.get('minSalary') as string;
    const maxSalary = formData.get('maxSalary') as string;
    const department = deptValue === 'Custom' ? customDept : deptValue;

    setToast(postToLinkedin ? 'Job posted to LinkedIn & Portal! ✓' : 'Job posted to Portal! ✓');

    const newJob = {
      id: Date.now(),
      title,
      department,
      type: formData.get('type') as string,
      salary: `₹ ${minSalary} - ${maxSalary}`,
      status: 'Active',
      Applied: 0,
      description: formData.get('summary') as string || 'New job opening created by admin.',
      summary: formData.get('summary') as string,
      eligibility: formData.get('eligibility') as string,
      vacancy: formData.get('vacancy') as string,
      experience: formData.get('experience') as string
    };
    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    const jobsKey = getScopedKey('hr_jobs', profile, user);
    localStorage.setItem(jobsKey, JSON.stringify(updatedJobs));

    const notificationsKey = getScopedKey('hr_notifications', profile, user);
    const notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
    notifications.unshift({
      id: Date.now(),
      type: 'recruitment',
      title: 'New Job Opening',
      message: `${title} is now open for applications${postToLinkedin ? ' (Posted on LinkedIn)' : ''}.`,
      time: new Date().toISOString()
    });
    localStorage.setItem(notificationsKey, JSON.stringify(notifications));
    setAnnouncements(notifications);
    setDeptValue('Engineering');
    setCustomDept('');
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setToast(''), 3000);
  };

  const handleDelete = (id: number) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setToast('Job posting deleted.');
    setTimeout(() => setToast(''), 3000);
  };

  const handleToggleStatus = (id: number) => {
    setJobs(prev => prev.map(j =>
      j.id === id ? { ...j, status: j.status === 'Active' ? 'Closed' : 'Active' } : j
    ));
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    const formData = new FormData(e.target as HTMLFormElement);
    setJobs(prev => prev.map(j =>
      j.id === editingJob.id
        ? { ...j,
            title: formData.get('editTitle') as string,
            department: formData.get('editDept') as string,
            type: formData.get('editType') as string,
            salary: `₹ ${formData.get('editMin')} - ${formData.get('editMax')}`,
            vacancy: formData.get('editVacancy') as string,
            experience: formData.get('editExperience') as string
          }
        : j
    ));
    setToast('Job posting updated! ✓');
    setEditingJob(null);
    setTimeout(() => setToast(''), 3000);
  };

  const downloadJobPDF = (job: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(20, 40, 80); // brand-navy approximate
    doc.text("Job Vacancy Details", 20, 30);
    
    doc.setDrawColor(20, 40, 80);
    doc.line(20, 35, 190, 35);
    
    // Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const details = [
      ["Job Title:", job.title],
      ["Department:", job.department],
      ["Salary Range:", job.salary],
      ["Employment Type:", job.type],
      ["Experience:", job.experience || "N/A"],
      ["Vacancy Count:", String(job.vacancy || "N/A")],
    ];
    
    let yPos = 50;
    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), 60, yPos);
      yPos += 10;
    });
    
    yPos += 5;
    
    // Sections
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Job Summary", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(job.summary || job.description || "N/A", 170);
    doc.text(summaryLines, 20, yPos);
    yPos += (summaryLines.length * 6) + 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Eligibility Criteria", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const eligibilityLines = doc.splitTextToSize(job.eligibility || "N/A", 170);
    doc.text(eligibilityLines, 20, yPos);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | VyaraHR Platform`, 20, 280);
    
    doc.save(`${job.title.replace(/\s+/g, '_')}_details.pdf`);
    setToast('PDF downloaded successfully! ✓');
    setTimeout(() => setToast(''), 3000);
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="space-y-8 max-w-6xl">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <Megaphone className="text-brand-teal" size={24} />
            Company Updates & Announcements
          </h2>
          <p className="text-gray-500">Stay informed with the latest company news and career opportunities.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Announcements Feed */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-brand-navy text-white">
                  <CardTitle className="flex items-center gap-2 text-white"><Bell size={18} /> Recent Announcements</CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {announcements.length > 0 ? announcements.map((n) => (
                      <div key={n.id} className="p-6 hover:bg-gray-50 transition-colors group relative">
                        <div className="flex gap-4">
                          <div className={`p-3 rounded-xl shrink-0 ${n.type === 'recruitment' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-navy/5 text-brand-navy'}`}>
                            <Info size={24} />
                          </div>
                          <div className="space-y-1 w-full">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-brand-navy group-hover:text-black">{n.title}</h4>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{getRelativeTime(n.time)}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                            {n.type === 'recruitment' && (
                              <Button variant="outline" size="sm" className="mt-3 text-xs h-8 border-brand-teal text-brand-teal">View Details</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 text-center text-gray-400 italic">No announcements at the moment.</div>
                    )}
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Jobs List (mini) */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <Briefcase className="text-brand-teal" size={20} />
              Internal Vacancies
            </h3>
            <div className="space-y-4">
              {jobs.map((job, i) => (
                <Card key={i} className="hover:border-brand-teal/50 transition-all cursor-pointer group shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-brand-navy group-hover:text-brand-teal transition-colors leading-tight">{job.title}</h4>
                      <Badge variant="blue" className="text-[10px]">{job.type}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-brand-teal font-semibold">{job.department}</p>
                      <p className="text-xs text-gray-500 mt-1">{job.salary}</p>
                      {job.experience && <p className="text-[10px] text-gray-400 mt-1">Exp: {job.experience}</p>}
                      {job.vacancy && <p className="text-[10px] text-gray-400">Vacancy: {job.vacancy}</p>}
                    </div>
                    <Button className="w-full text-xs h-9 mt-2">Refer & Apply</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-brand-teal/5 border-dashed border-2 border-brand-teal/20 text-center p-6 mb-6">
              <CardContent className="p-0 space-y-2">
                <p className="text-xs font-bold text-brand-teal uppercase tracking-widest">Refer a Friend</p>
                <p className="text-xs text-gray-600">Get a referral bonus of ₹10,000 for successful hires.</p>
                <div className="pt-2">
                  <input type="text" placeholder="Friend's Name" className="w-full text-[10px] p-2 border border-brand-teal/20 rounded mb-2" />
                  <input type="email" placeholder="Friend's Email" className="w-full text-[10px] p-2 border border-brand-teal/20 rounded mb-4" />
                  <Button size="sm" className="w-full text-[10px] h-8 bg-brand-teal">Refer Now</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">🎂 Birthdays Today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Pam Beesly', dept: 'Admin' },
                  { name: 'Jim Halpert', dept: 'Sales' }
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-pink-50/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 text-[10px] font-bold">PB</div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">{b.name}</p>
                      <p className="text-[10px] text-gray-500">{b.dept}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">👋 New Joiners</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Dwight Schrute', role: 'Sales Lead', date: 'Today' }
                ].map((n, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-indigo-50/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-[10px] font-bold">DS</div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">{n.name}</p>
                      <p className="text-[10px] text-gray-500">{n.role} • {n.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <div className="fixed top-20 right-8 bg-brand-teal text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce z-50">
          <Linkedin size={20} />
          {toast}
        </div>
      )}

      {/* View Job Template Modal */}
      <h2 className="text-2xl font-bold text-brand-navy">Recruitment Updates (Admin)</h2>

      <Card>
        <CardHeader>
          <CardTitle>Create New Job Posting</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Side: LinkedIn Selector */}
              <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-start py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 gap-4">
                <div className={`p-4 rounded-xl transition-all cursor-pointer border-2 ${postToLinkedin ? 'bg-[#0077b5] border-[#0077b5] text-white' : 'bg-white border-gray-200 text-gray-400'}`} onClick={() => setPostToLinkedin(!postToLinkedin)}>
                  <Linkedin size={32} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold uppercase tracking-wider block mb-1">LinkedIn</span>
                  <Badge variant={postToLinkedin ? 'blue' : 'neutral'}>{postToLinkedin ? 'Enabled' : 'Disabled'}</Badge>
                </div>
                <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">Toggle to cross-post this vacancy to your LinkedIn company page automatically.</p>
              </div>

              {/* Right Side: Form Content */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="create-job-title" className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input id="create-job-title" name="jobTitle" type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal" placeholder="e.g. UX Designer" required />
                </div>
                
                <div>
                  <label htmlFor="create-job-dept" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    id="create-job-dept"
                    title="Department"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal"
                    value={deptValue}
                    onChange={e => setDeptValue(e.target.value)}
                  >
                    <option>Engineering</option>
                    <option>Design</option>
                    <option>Marketing</option>
                    <option>Sales</option>
                    <option>HR</option>
                    <option>Finance</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {deptValue === 'Custom' && (
                    <input
                      id="create-job-dept-custom"
                      aria-label="Custom Department Name"
                      type="text"
                      className="w-full border border-brand-teal rounded-md p-2 mt-2 text-sm focus:ring-brand-teal outline-none"
                      placeholder="Type custom department name..."
                      value={customDept}
                      onChange={e => setCustomDept(e.target.value)}
                      required
                    />
                  )}
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Salary Range (Annual)</span>
                  <div className="flex gap-2 items-center">
                    <select name="minSalary" aria-label="Minimum Annual Salary" title="Minimum Annual Salary" className="w-full border border-gray-300 rounded-md p-2 text-sm" required>
                      <option value="">Min</option>
                      {salaryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <span>-</span>
                    <select name="maxSalary" aria-label="Maximum Annual Salary" title="Maximum Annual Salary" className="w-full border border-gray-300 rounded-md p-2 text-sm" required>
                      <option value="">Max</option>
                      {salaryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="create-job-type" className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select id="create-job-type" name="type" title="Employment Type" className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal">
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Remote</option>
                    <option>Contract</option>
                    <option>Internship</option>
                    <option>Freelancer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-job-vacancy" className="block text-sm font-medium text-gray-700 mb-1">Vacancy</label>
                  <input id="create-job-vacancy" name="vacancy" type="number" min="1" className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal" placeholder="e.g. 3" required />
                </div>
                
                <div>
                  <label htmlFor="create-job-experience" className="block text-sm font-medium text-gray-700 mb-1">Experience Required</label>
                  <input id="create-job-experience" name="experience" type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal" placeholder="e.g. 2-5 years" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Summary</label>
                <textarea name="summary" rows={3} className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal resize-none" placeholder="Provide a short description..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility Criteria</label>
                <textarea name="eligibility" rows={3} className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal resize-none" placeholder="Required degrees, experience..."></textarea>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="submit" className="gap-2 px-8">
                <Briefcase size={18} /> {postToLinkedin ? 'Post to LinkedIn & Portal' : 'Post Job'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Job Postings</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Click the <span className="font-bold text-green-600">Active</span> badge to close a posting.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                <tr>
                  <th className="px-6 py-3">Job Title</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Salary</th>
                  <th className="px-6 py-3">Exp</th>
                  <th className="px-6 py-3">Vacancy</th>
                  <th className="px-6 py-3">Applied</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.filter(j => j.status === 'Active').length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No active job postings.</td></tr>
                ) : jobs.filter(j => j.status === 'Active').map((job) => (
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-brand-navy">{job.title}</td>
                    <td className="px-6 py-4">{job.department}</td>
                    <td className="px-6 py-4">{job.type}</td>
                    <td className="px-6 py-4 text-gray-600">{job.salary}</td>
                    <td className="px-6 py-4 text-gray-500">{job.experience || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500">{job.vacancy || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-brand-teal">{job.Applied}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(job.id)}
                        title="Click to close this posting"
                        className="group"
                      >
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 group-hover:bg-red-100 group-hover:text-red-600 transition-colors cursor-pointer">
                          <span className="group-hover:hidden">Active</span>
                          <span className="hidden group-hover:inline">Close?</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
                          onClick={() => setEditingJob(job)}
                        >
                          <Pencil size={13} /> Edit
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                          onClick={() => handleDelete(job.id)}
                        >
                          <Trash2 size={13} /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ===== PREVIOUS JOB POSTINGS ===== */}
      {jobs.some(j => j.status === 'Closed') && (
        <Card className="border-t-4 border-t-gray-300">
          <CardHeader>
            <CardTitle className="text-gray-600">Previous Job Postings</CardTitle>
            <p className="text-xs text-gray-400 mt-1">Closed postings are archived here.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                  <tr>
                    <th className="px-6 py-3">Job Title</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Salary</th>
                    <th className="px-6 py-3">Exp</th>
                    <th className="px-6 py-3">Vacancy</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.filter(j => j.status === 'Closed').map((job) => (
                    <tr key={job.id} className="border-b hover:bg-gray-50 opacity-75">
                      <td className="px-6 py-4 font-medium text-gray-600">{job.title}</td>
                      <td className="px-6 py-4 text-gray-500">{job.department}</td>
                      <td className="px-6 py-4 text-gray-500">{job.type}</td>
                      <td className="px-6 py-4 text-gray-400">{job.salary}</td>
                      <td className="px-6 py-4 text-gray-400">{job.experience || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-400">{job.vacancy || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 transition-colors">
                          Closed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
                          onClick={() => downloadJobPDF(job)}
                        >
                          <FileText size={13} /> Download PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editingJob && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Edit Job Posting</CardTitle>
                <button onClick={() => setEditingJob(null)} className="text-gray-400 hover:text-gray-700" aria-label="Close modal" title="Close modal"><X size={20} /></button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label htmlFor="edit-job-title" className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input id="edit-job-title" name="editTitle" defaultValue={editingJob.title} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-job-dept" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input id="edit-job-dept" name="editDept" defaultValue={editingJob.department} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal" required />
                  </div>
                  <div>
                    <label htmlFor="edit-job-type" className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <select id="edit-job-type" name="editType" title="Employment Type" defaultValue={editingJob.type} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal">
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Remote</option>
                      <option>Contract</option>
                      <option>Internship</option>
                      <option>Freelancer</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-job-min" className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                    <input id="edit-job-min" name="editMin" defaultValue={editingJob.salary?.split(' - ')[0]?.replace('₹ ','')} className="w-full border border-gray-300 rounded-md p-2 text-sm" required />
                  </div>
                  <div>
                    <label htmlFor="edit-job-max" className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                    <input id="edit-job-max" name="editMax" defaultValue={editingJob.salary?.split(' - ')[1]} className="w-full border border-gray-300 rounded-md p-2 text-sm" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-job-vacancy" className="block text-sm font-medium text-gray-700 mb-1">Vacancy</label>
                    <input id="edit-job-vacancy" name="editVacancy" type="number" min="1" defaultValue={editingJob.vacancy} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal" required />
                  </div>
                  <div>
                    <label htmlFor="edit-job-experience" className="block text-sm font-medium text-gray-700 mb-1">Experience Required</label>
                    <input id="edit-job-experience" name="editExperience" type="text" defaultValue={editingJob.experience} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-teal" required />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1">Save Changes</Button>
                  <Button type="button" variant="outline" onClick={() => setEditingJob(null)} className="flex-1">Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Updates;
