import React from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PlatformHeaderProps {
  isMobile?: boolean;
  onOpenMenu?: () => void;
}

const PlatformHeader: React.FC<PlatformHeaderProps> = ({ isMobile, onOpenMenu }) => {
  const location = useLocation();
  const { profile } = useAuth();
  const path = location.pathname;

  const getPageTitle = () => {
    if (path === '/platform') return 'Platform Dashboard';
    if (path.startsWith('/platform/customers')) return 'Customers & CRM';
    if (path.startsWith('/platform/metrics')) return 'Revenue Metrics';
    if (path.startsWith('/platform/verifications')) return 'Payment Verifications';
    if (path.startsWith('/platform/billing-settings')) return 'Payment Rails & Billing';
    if (path.startsWith('/platform/users')) return 'Platform Administrators';
    if (path.startsWith('/platform/audit-logs')) return 'System Audit Logs';
    if (path.startsWith('/platform/settings')) return 'Global Platform Settings';
    return 'Platform Control';
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-8 justify-between w-full shadow-sm sticky top-0 z-30">
      {/* Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {isMobile && (
          <button 
            type="button"
            onClick={onOpenMenu}
            className="w-9 h-9 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-sm shrink-0"
            aria-label="Open Platform Menu"
            title="Open Platform Menu"
          >
            <Menu size={18} />
          </button>
        )}
        <Shield size={20} className="text-brand-orange shrink-0 hidden sm:block" />
        <h1 className="text-sm sm:text-lg font-bold tracking-tight text-brand-navy truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Connection Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Connected to VyaraHR Platform
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
          <div className="w-7 h-7 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-xs shrink-0">
            {profile?.full_name?.charAt(0) || 'P'}
          </div>
          <span className="text-xs font-semibold text-brand-navy max-w-[100px] sm:max-w-[120px] truncate hidden sm:inline">
            {profile?.full_name || 'Platform Admin'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default PlatformHeader;

