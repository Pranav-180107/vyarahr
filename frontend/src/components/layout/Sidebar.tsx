import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, User, DollarSign, Monitor, TrendingUp, Calendar, Settings, LogOut, Users, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isTablet?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isTablet, isMobile, onClose }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'owner';

  const navItems = [
    { name: 'Home', icon: Home, path: '/dashboard' },
    { name: 'My Space', icon: User, path: '/dashboard/myspace' },
    { name: 'Finance', icon: DollarSign, path: '/dashboard/finance' },
    { name: 'Assets', icon: Monitor, path: '/dashboard/assets' },
    ...((isAdmin || isSuperAdmin) ? [{ name: 'Performance', icon: TrendingUp, path: '/dashboard/performance' }] : []),
    { name: 'Calendar', icon: Calendar, path: '/dashboard/calendar' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' }
  ];

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      <aside aria-label="Sidebar" className={`h-screen bg-brand-sidebar text-white flex flex-col border-r border-white/5 overflow-y-auto ${isTablet ? 'w-16' : 'w-full'}`}>
        <div className={`p-6 flex items-center border-b border-white/5 ${isTablet ? 'justify-center' : 'justify-between'}`}>
          <h1 className="text-xl font-bold flex items-center">
            <span className="text-white">V</span>
            {!isTablet && <><span className="text-white">yara</span><span className="text-brand-orange">HR</span></>}
          </h1>
          {isMobile && onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Sidebar"
              title="Close Sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        <nav className="flex-1 mt-6">
          <ul className="space-y-1.5 px-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.path} 
                  end={item.name === 'Home'}
                  title={isTablet ? item.name : ''}
                  className={({isActive}) => 
                    `flex items-center rounded-xl transition-all duration-200 group ${
                      isTablet ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                    } ${
                      isActive 
                        ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' 
                        : 'text-gray-200 hover:bg-brand-orange/20 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {!isTablet && <span className="font-semibold text-sm">{item.name}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/10">
          <div className={`flex items-center ${isTablet ? 'justify-center' : 'gap-3 px-2 py-2'}`}>
            <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center font-bold text-white shadow-lg shadow-brand-orange/20 flex-shrink-0">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            {!isTablet && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{profile?.full_name || 'User'}</p>
                <p className={`text-xs text-gray-400 truncate tracking-widest ${isSuperAdmin ? 'lowercase' : 'uppercase'}`}>
                  {isSuperAdmin ? 'super admin' : (profile?.role || 'Member')}
                </p>
              </div>
            )}
            {!isTablet && (
              <button 
                onClick={() => setShowLogoutModal(true)}
                title="Logout"
                aria-label="Logout"
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* LOGOUT CONFIRMATION MODAL - Portal to document.body for full-page centering */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isLoggingOut && setShowLogoutModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-gray-900 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => !isLoggingOut && setShowLogoutModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              aria-label="Close"
              disabled={isLoggingOut}
            >
              <X size={18} />
            </button>

            {/* Icon & Details */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <LogOut size={22} className="translate-x-0.5" />
              </div>
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-bold !text-gray-900 leading-snug">
                  Sign Out Confirmation
                </h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Are you sure you want to log out of VyaraHR? You will need to sign in again to access the dashboard.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Sidebar;
