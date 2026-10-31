import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, User, Menu } from 'lucide-react';
import { getScopedKey } from '../../utils/tenantHelper';

interface HeaderProps {
  isMobile?: boolean;
  onOpenMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMobile, onOpenMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const path = location.pathname;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'owner';
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const checkNotifications = () => {
      const notifKey = getScopedKey('hr_notifications', profile, user);
      const notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
      const lastCheckedKey = getScopedKey('hr_notifications_last_checked', profile, user);
      const lastChecked = localStorage.getItem(lastCheckedKey) || '0';
      
      const unreadCount = notifications.filter((n: any) => {
        if (!n) return false;
        const timestampStr = n.time_iso || (n.id && typeof n.id === 'string' ? n.id.replace('NOTIF-', '') : '');
        if (!timestampStr) return false;
        
        const timestamp = isNaN(Number(timestampStr)) ? new Date(timestampStr).getTime() : parseInt(timestampStr);
        return !isNaN(timestamp) && timestamp > parseInt(lastChecked || '0');
      }).length;
      
      setNotifCount(unreadCount);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    
    if (path === '/dashboard/updates') {
      localStorage.setItem('hr_notifications_last_checked', Date.now().toString());
      setNotifCount(0);
    }

    return () => clearInterval(interval);
  }, [path]);

  let subMenuItems: {name: string, path: string}[] = [];

  // Home Section
  if (path === '/dashboard' || path.startsWith('/dashboard/home') || path.startsWith('/dashboard/updates') || path.startsWith('/dashboard/hiring') || path.startsWith('/dashboard/offboarding') || path.startsWith('/dashboard/admins') || path.startsWith('/dashboard/employees')) {
    subMenuItems = [
      { name: 'Dashboard', path: '/dashboard' },
      ...(isAdmin ? [
        { name: 'Post Job', path: '/dashboard/updates' },
        { name: 'Hiring & Onboarding', path: '/dashboard/hiring' },
        { name: 'Offboarding', path: '/dashboard/offboarding' }
      ] : []),
      ...(isSuperAdmin ? [
        { name: 'Admin Management', path: '/dashboard/admins' },
        { name: 'Post Job', path: '/dashboard/updates' },
        { name: 'Hiring & Onboarding', path: '/dashboard/hiring' },
        { name: 'Employee Management', path: '/dashboard/employees' },
        { name: 'Offboarding', path: '/dashboard/offboarding' }
      ] : [])
    ];
  } 
  else if (path.includes('/finance')) {
    subMenuItems = [
      { name: 'Pay & Docs', path: '/dashboard/finance' },
      { name: 'Loans', path: '/dashboard/finance/loans' },
      { name: 'Tax Info', path: '/dashboard/finance/tax' }
    ];
  } 
  else if (path.includes('/myspace')) {
    subMenuItems = [
      { name: 'My Profile', path: '/dashboard/myspace/profile' },
      { name: 'Attendance', path: '/dashboard/myspace/attendance' },
      { name: 'Leaves', path: '/dashboard/myspace/leaves' },
      ...(!isAdmin && !isSuperAdmin ? [{ name: 'Offboarding', path: '/dashboard/myspace/resignation' }] : []),
      { name: 'Help Desk', path: '/dashboard/myspace/helpdesk' }
    ];
  }
  else if (path.includes('/assets')) {
    subMenuItems = [
      { name: 'My Equipment', path: '/dashboard/assets' },
      ...(isAdmin ? [{ name: 'Asset Queries', path: '/dashboard/assets/query' }] : [])
    ];
  }
  else if (path.includes('/performance')) {
    subMenuItems = [
      { name: 'Performance Overview', path: '/dashboard/performance' }
    ];
  }
  else if (path.includes('/settings')) {
    subMenuItems = [
      { name: 'Security & Access', path: '/dashboard/settings?tab=security' },
      { name: 'Notifications', path: '/dashboard/settings?tab=notifications' }
    ];
  }

  const checkIsItemActive = (itemPath: string) => {
    if (itemPath.includes('?tab=')) {
      const targetTab = itemPath.split('?tab=')[1];
      const currentTab = new URLSearchParams(location.search).get('tab') || 'security';
      return path === '/dashboard/settings' && currentTab === targetTab;
    }
    return path === itemPath || (itemPath !== '/dashboard' && path.startsWith(itemPath));
  };

  return (
    <div className={`sticky top-0 z-[100] w-full ${isMobile ? 'flex flex-col' : ''}`}>
      {/* MAIN TOPBAR */}
      <header className={`bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-8 justify-between w-full shadow-sm`}>
        {/* Mobile Left: Menu hamburger button */}
        {isMobile && (
          <button 
            type="button"
            onClick={onOpenMenu}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-navy flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-sm"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Center: Logo (Mobile) or Nav (Desktop) */}
        {!isMobile ? (
          <nav className="flex space-x-8 h-full items-center">
            {subMenuItems.map(item => {
              const isActive = checkIsItemActive(item.path);
              return (
                <Link 
                  key={item.name} 
                  to={item.path}
                  className={`text-sm font-medium transition-all border-b-2 h-full flex items-center px-1 ${
                    isActive ? 'border-brand-orange text-brand-navy' : 'border-transparent text-gray-500 hover:text-brand-navy hover:border-gray-200'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        ) : (
          <div className="flex items-center">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-brand-navy">Vyara</span><span className="text-brand-orange">HR</span>
            </h1>
          </div>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard/updates" className="relative p-2 text-gray-400 hover:text-brand-orange transition-all">
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-red text-[8px] font-bold text-white ring-1 ring-white">
                {notifCount}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <div className={`rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold ${isMobile ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-[10px]'}`}>
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            {!isMobile && (
              <span className="text-sm font-semibold text-brand-navy truncate max-w-[100px]">
                {profile?.full_name || 'User'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SUBMENU TABS (Below Topbar) */}
      {isMobile && subMenuItems.length > 0 && (
        <nav className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
          {subMenuItems.map(item => {
            const isActive = checkIsItemActive(item.path);
            return (
              <Link 
                key={item.name} 
                to={item.path}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive 
                    ? 'bg-brand-orange/15 text-brand-orange border-brand-orange/30' 
                    : 'bg-gray-50 text-gray-400 border-transparent'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  );
}

export default Header;
