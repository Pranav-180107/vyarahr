import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { OnboardingModal } from '../auth/OnboardingModal';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = () => {
  const { profile } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'owner';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false); // Close drawer on route change
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-brand-bg relative">
      {/* MOBILE DRAWER OVERLAY */}
      {isMobile && isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1150] transition-opacity animate-in fade-in"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* SIDEBAR / DRAWER */}
      <div className={`
        fixed left-0 top-0 h-screen z-[1200] transition-transform duration-300 ease-in-out
        ${isMobile ? (isDrawerOpen ? 'translate-x-0 w-[280px] max-w-[80%]' : '-translate-x-full w-[280px] invisible pointer-events-none') : 'translate-x-0'}
        ${!isMobile ? 'lg:w-[230px] md:w-[64px]' : ''}
      `}>
        <Sidebar 
          isTablet={!isMobile && window.innerWidth >= 768 && window.innerWidth < 1024} 
          isMobile={isMobile}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className={`
        flex flex-col min-h-screen transition-all duration-300
        ${!isMobile ? 'lg:ml-[230px] md:ml-[64px]' : 'ml-0 mt-0'}
      `}>
        <Header isMobile={isMobile} onOpenMenu={() => setIsDrawerOpen(true)} />
        <main className={`flex-1 ${isMobile ? 'p-4 pb-8' : 'p-8'}`}>
          <Outlet />
        </main>
      </div>

      {/* Onboarding Gate for new users needing to complete required profile details */}
      <OnboardingModal />
    </div>
  );
};

export default DashboardLayout;
