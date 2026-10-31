import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { BookOpen, Award, PlusCircle, Link as LinkIcon, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { getScopedKey } from '../../utils/tenantHelper';

interface CourseAssigned {
  id: number;
  employeeName: string;
  courseName: string;
  courseLink: string;
  description: string;
  status: 'Assigned' | 'Completed';
  certificateUrl?: string;
  dateAssigned: string;
}

const SkillsLearning = () => {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const [courses, setCourses] = useState<CourseAssigned[]>([]);
  const [courseInput, setCourseInput] = useState('');
  const [courseLinkInput, setCourseLinkInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [submittingCourseId, setSubmittingCourseId] = useState<number | null>(null);

  useEffect(() => {
    if (profile || user) {
      const key = getScopedKey('hr_courses_assigned', profile, user);
      const savedCourses = JSON.parse(localStorage.getItem(key) || '[]');
      setCourses(savedCourses);
    }
  }, [profile, user]);

  const saveCoursesToStorage = (newCourses: CourseAssigned[]) => {
    const key = getScopedKey('hr_courses_assigned', profile, user);
    localStorage.setItem(key, JSON.stringify(newCourses));
    setCourses(newCourses);
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseInput || !courseLinkInput || !descriptionInput) return;

    let employeeNames: string[] = [];

    // Fetch from tenant profiles table
    try {
      const { data } = await supabase.from('profiles').select('full_name, role').eq('role', 'employee');
      if (data) {
        employeeNames = data.map(p => p.full_name || '');
      }
    } catch (err) {
      console.error('Supabase fetch failed:', err);
    }

    let hierarchyNames: string[] = ['Admin'];
    const hierarchyKey = getScopedKey('hr_role_hierarchy', profile, user);
    const savedHierarchy = localStorage.getItem(hierarchyKey);
    if (savedHierarchy) {
      try {
        const rootNode = JSON.parse(savedHierarchy);
        const extractNames = (node: any): string[] => {
          let names = [node.name];
          if (node.children) {
            node.children.forEach((child: any) => {
               names = [...names, ...extractNames(child)];
            });
          }
          return names;
        };
        hierarchyNames = [...hierarchyNames, ...extractNames(rootNode)];
      } catch (err) {
        console.error(err);
      }
    }

    // Attempt to fetch from mock employee credentials storage
    let mockCredNames: string[] = [];
    const credentialsKey = getScopedKey('hr_employee_credentials', profile, user);
    const savedCreds = localStorage.getItem(credentialsKey);
    if (savedCreds) {
      try {
        const creds = JSON.parse(savedCreds);
        mockCredNames = creds.map((c: any) => c.full_name);
      } catch (err) {
        console.error(err);
      }
    }

    // Combine all lists and remove duplicates
    employeeNames = Array.from(new Set([...employeeNames, ...hierarchyNames, ...mockCredNames].filter(Boolean)));

    const newCourses: CourseAssigned[] = employeeNames.map((emp, idx) => ({
      id: Date.now() + idx,
      employeeName: emp,
      courseName: courseInput,
      courseLink: courseLinkInput,
      description: descriptionInput,
      status: 'Assigned',
      dateAssigned: new Date().toLocaleDateString()
    }));

    saveCoursesToStorage([...newCourses, ...courses]);
    setCourseInput('');
    setCourseLinkInput('');
    setDescriptionInput('');
  };

  const handleSubmitCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificateFile || !submittingCourseId) return;

    const updatedCourses = courses.map(c => {
      if (c.id === submittingCourseId) {
        return { ...c, status: 'Completed' as const, certificateUrl: certificateFile.name };
      }
      return c;
    });

    saveCoursesToStorage(updatedCourses);
    setCertificateFile(null);
    setSubmittingCourseId(null);
  };

  const handleDeleteCourseGlobally = (courseName: string) => {
    if (window.confirm(`Are you sure you want to completely remove the course "${courseName}" for ALL employees?`)) {
      const updatedCourses = courses.filter(c => c.courseName !== courseName);
      saveCoursesToStorage(updatedCourses);
    }
  };

  const myCourses = courses.filter(c => c.employeeName.toLowerCase() === profile?.full_name?.toLowerCase());

  const totalAssigned = courses.length;
  const totalCompleted = courses.filter(c => c.status === 'Completed').length;
  const completionPercentage = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="flex justify-between items-center sm:items-start gap-4">
        <div className="space-y-2 flex-1">
          <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <BookOpen className="text-brand-teal" size={24} />
            Skills & Learning Hub
          </h2>
          <p className="text-gray-500">
            {isAdmin ? 'Assign mandatory company courses to employees and track their certification progress.' : 'Access and complete courses assigned to you by the organization.'}
          </p>
        </div>
        {isAdmin && (
          <div className="bg-white rounded-xl p-3 flex flex-col items-center justify-center min-w-[140px] shadow-sm border-2 border-brand-teal/20 text-center shrink-0">
            <span className="text-3xl font-black text-brand-teal drop-shadow-sm">{completionPercentage}%</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-navy mt-1">Completion Rate</span>
          </div>
        )}
      </header>

      {isAdmin && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-brand-navy text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-white">
              <PlusCircle size={18} /> Offer a Course
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleAssignCourse} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                  <input 
                    type="text" 
                    value={courseInput}
                    onChange={e => setCourseInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal" 
                    placeholder="e.g. Advanced Cybersecurity" 
                    required 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Link (URL)</label>
                  <input 
                    type="url" 
                    value={courseLinkInput}
                    onChange={e => setCourseLinkInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal" 
                    placeholder="e.g. https://www.coursera.org/..." 
                    required 
                  />
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Description</label>
                  <textarea 
                    value={descriptionInput}
                    onChange={e => setDescriptionInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-teal focus:border-brand-teal resize-none" 
                    placeholder="What will they learn? (Assigned to ALL Employees)" 
                    rows={2}
                    required 
                  />
                </div>
                <Button type="submit" className="mt-6 h-[42px] px-8 bg-brand-teal hover:bg-brand-navy text-white">
                  Assign To All
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin View: All Assigned Courses */}
      {isAdmin && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-navy">All Assigned Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-gray-500 italic p-4 text-center">No courses have been assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-md border-b">
                    <tr>
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Course Name</th>
                      <th className="px-6 py-3">Date Assigned</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Certificate</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-brand-navy">{course.employeeName}</td>
                        <td className="px-6 py-4 font-medium">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1">
                              {course.courseName}
                              {course.courseLink && (
                                <a href={course.courseLink} target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:text-brand-navy">
                                  <LinkIcon size={12} />
                                </a>
                              )}
                            </span>
                            {course.description && <span className="text-[10px] text-gray-500 font-normal truncate max-w-[200px]" title={course.description}>{course.description}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{course.dateAssigned}</td>
                        <td className="px-6 py-4">
                          <Badge variant={course.status === 'Completed' ? 'green' : 'neutral'} className="text-xs px-2 py-1">
                            {course.status === 'Completed' ? <CheckCircle size={12} className="mr-1 inline-block" /> : <Clock size={12} className="mr-1 inline-block" />}
                            {course.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {course.status === 'Completed' && course.certificateUrl ? (
                            <span className="text-brand-teal flex items-center gap-1 font-bold text-xs bg-brand-teal/10 px-2 py-1 rounded truncate max-w-[150px]" title={course.certificateUrl}>
                              <BookOpen size={14} className="shrink-0" /> {course.certificateUrl}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Awaiting submission</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleDeleteCourseGlobally(course.courseName)} 
                            className="text-red-400 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 p-2 rounded-md shadow-sm"
                            title={`Delete ${course.courseName} for ALL Employees`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Employee View: My Assigned Courses */}
      {!isAdmin && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-brand-navy border-b pb-2">My Learning Path</h3>
          {myCourses.length === 0 ? (
            <Card className="border-none shadow-sm text-center p-12 bg-gray-50/50">
              <Award className="mx-auto text-gray-300 mb-3" size={48} />
              <h4 className="text-lg font-bold text-brand-navy">No Assigned Courses</h4>
              <p className="text-gray-500 mt-1">You are up to date! Check back later for new company assignments.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myCourses.map(course => (
                <Card key={course.id} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-4">
                        <h4 className="text-lg font-black text-brand-navy leading-tight flex items-center gap-2">
                          {course.courseName}
                          {course.courseLink && (
                            <a href={course.courseLink} target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:text-brand-navy transition-colors bg-brand-teal/10 p-1 rounded-md" title="Open Course Link">
                              <LinkIcon size={14} />
                            </a>
                          )}
                        </h4>
                        {course.description && <p className="text-sm text-gray-600 mt-2 font-medium bg-gray-50 p-2 rounded-md border border-gray-100">{course.description}</p>}
                        <p className="text-xs text-brand-teal font-bold mt-2">Assigned on: {course.dateAssigned}</p>
                      </div>
                      <Badge variant={course.status === 'Completed' ? 'green' : 'amber'} className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 shrink-0">
                        {course.status}
                      </Badge>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      {course.status === 'Completed' ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                          <CheckCircle size={18} /> Certificate Submitted
                        </div>
                      ) : (
                        submittingCourseId === course.id ? (
                          <form onSubmit={handleSubmitCertificate} className="flex gap-2 w-full animate-in slide-in-from-left-2 items-center">
                            <div className="relative flex-1">
                              <input
                                type="file"
                                accept="application/pdf"
                                required
                                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                                className="w-full pl-3 pr-3 py-1.5 border rounded text-xs focus:ring-brand-teal focus:border-brand-teal file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-teal/10 file:text-brand-teal hover:file:bg-brand-teal/20"
                              />
                            </div>
                            <Button type="submit" size="sm" className="bg-brand-teal text-white h-auto py-2 px-3 text-xs shadow-sm">
                              Upload
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => { setSubmittingCourseId(null); setCertificateFile(null); }} className="h-auto py-2 px-3 text-xs">
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <Button 
                            onClick={() => {
                              setSubmittingCourseId(course.id);
                              setCertificateFile(null);
                            }} 
                            variant="outline" 
                            className="w-full border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white transition-all font-bold gap-2"
                          >
                            <Award size={16} /> Submit Certificate Link
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillsLearning;
