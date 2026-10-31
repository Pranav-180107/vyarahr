import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PlatformSidebar from './PlatformSidebar';
import PlatformHeader from './PlatformHeader';
import { Menu } from 'lucide-react';

const PlatformLayout = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false); // Close drawer on route change
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-brand-bg relative text-brand-navy">
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
        ${!isMobile ? 'lg:w-[240px] md:w-[64px]' : ''}
      `}>
        <PlatformSidebar 
          isTablet={!isMobile && window.innerWidth >= 768 && window.innerWidth < 1024} 
          isMobile={isMobile}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className={`
        flex flex-col min-h-screen transition-all duration-300
        ${!isMobile ? 'lg:ml-[240px] md:ml-[64px]' : 'ml-0 mt-0'}
      `}>
        <PlatformHeader isMobile={isMobile} onOpenMenu={() => setIsDrawerOpen(true)} />
        <main className={`flex-1 ${isMobile ? 'p-4' : 'p-8'} relative z-0`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;

