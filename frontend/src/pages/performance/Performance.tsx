import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmployeeOverview from '../../components/performance/EmployeeOverview';
import AttendanceAnalytics from '../../components/performance/AttendanceAnalytics';
import LeaveAnalytics from '../../components/performance/LeaveAnalytics';
import PayrollSummary from '../../components/performance/PayrollSummary';
import PerformanceMetrics from '../../components/performance/PerformanceMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  Star, 
  TrendingUp, 
  Lock, 
  Award, 
  CheckCircle2, 
  ShieldCheck, 
  Briefcase 
} from 'lucide-react';

const Performance = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
    const navigate = useNavigate();
    
    // Sub-tabs for "Company Performance"
    const [companySubTab, setCompanySubTab] = useState('Employee Overview');

    const companyTabs = [
        { name: 'Employee Overview', icon: Users },
        { name: 'Attendance Analytics', icon: Clock },
        { name: 'Leave Analytics', icon: Calendar },
        { name: 'Payroll Summary', icon: DollarSign },
        { name: 'Performance Metrics', icon: Star },
    ];

    useEffect(() => {
        // Auto-logout/Session Management for Performance Dashboard (30 mins inactivity)
        let timeoutId: any;
        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.warn('Session expired due to inactivity on Performance Tab');
                navigate('/dashboard');
            }, 30 * 60 * 1000); // 30 minutes
        };

        if (isAdmin) {
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('keydown', resetTimer);
            resetTimer();
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
        };
    }, [isAdmin, navigate]);

    const renderCompanyContent = () => {
        switch (companySubTab) {
            case 'Employee Overview': return <EmployeeOverview />;
            case 'Attendance Analytics': return <AttendanceAnalytics />;
            case 'Leave Analytics': return <LeaveAnalytics />;
            case 'Payroll Summary': return <PayrollSummary />;
            case 'Performance Metrics': return <PerformanceMetrics />;
            default: return <EmployeeOverview />;
        }
    };

    // Employee Performance View (for non-admin members)
    if (!isAdmin) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1 px-3 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-bold uppercase tracking-widest border border-brand-orange/20 flex items-center gap-1">
                                <Award size={12} /> Member Space
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">My Performance & Goals</h2>
                        <p className="text-gray-500 text-sm mt-0.5">Track your official employment achievements and attendance metrics.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xs uppercase text-gray-500">Attendance Standing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-extrabold text-brand-navy">100%</p>
                                    <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                        <CheckCircle2 size={13} /> On-Time Baseline
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <Clock size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xs uppercase text-gray-500">Official Designation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-bold text-brand-navy truncate max-w-[180px]">
                                        {profile?.designation || (profile?.role ? String(profile.role).toUpperCase() : 'Team Member')}
                                    </p>
                                    <p className="text-xs text-brand-orange font-semibold mt-1">
                                        {profile?.department || 'Operations'}
                                    </p>
                                </div>
                                <div className="p-3 bg-brand-orange/10 rounded-2xl text-brand-orange">
                                    <Briefcase size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xs uppercase text-gray-500">Account Compliance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-bold text-emerald-600">Verified</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Employee ID: {profile?.employee_id || profile?.employeeId || 'Assigned'}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <ShieldCheck size={24} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Professional Growth & Targets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                            <TrendingUp className="text-brand-orange mt-0.5 shrink-0" size={18} />
                            <div>
                                <h4 className="text-sm font-bold text-brand-navy">Quarterly Performance Cycle Active</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    Your metrics, daily check-ins, and leave approvals are tracked live by your management. For performance appraisals and reviews, reach out through Help Desk.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Admin / Super Admin / Owner Company Performance View
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-8 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1 px-3 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-bold uppercase tracking-widest border border-brand-orange/20 flex items-center gap-1">
                            <Lock size={10} /> Management Console
                        </div>
                        <h2 className="text-3xl font-bold text-brand-navy">Company Performance Dashboard</h2>
                    </div>
                    <p className="text-gray-500 font-medium">Holistic real-time analytics for your organization.</p>
                </div>
            </header>

            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-2 rounded-2xl flex flex-wrap gap-2 border border-gray-200/60 shadow-lg shadow-brand-navy/5">
                    {companyTabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setCompanySubTab(tab.name)}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-sm cursor-pointer
                                ${companySubTab === tab.name 
                                    ? 'bg-brand-orange text-white shadow-md scale-105' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-brand-navy'
                                }
                            `}
                        >
                            <tab.icon size={18} />
                            {tab.name}
                        </button>
                    ))}
                </div>
                <div className="mt-4 transition-all duration-500">
                    {renderCompanyContent()}
                </div>
            </div>
        </div>
    );
};

export default Performance;
