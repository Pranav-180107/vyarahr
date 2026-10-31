import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../hooks/usePlatform';
import { useTenant } from '../../hooks/useTenant';
import { ShieldAlert, LogOut } from 'lucide-react';
import { resetTenant } from '../../lib/supabase';

interface PlatformRouteProps {
  children: React.ReactNode;
}

const PlatformRoute: React.FC<PlatformRouteProps> = ({ children }) => {
  const { session, profile, loading, signOut } = useAuth();
  const { isPlatformMode, isPlatformAdmin } = usePlatform();
  const { isReady } = useTenant();
  const location = useLocation();

  // If loading or tenant not ready, or session exists but profile is still in-flight
  if (loading || !isReady || (session && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A0D00]" style={{ backgroundColor: '#1A0D00' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5900]"></div>
          <p className="text-white/80 text-xs font-semibold tracking-wider uppercase">
            Verifying Master Router Credentials...
          </p>
        </div>
      </div>
    );
  }

  // If no auth session at all, send to landing
  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Verify they are in Platform Mode and have Platform Admin role
  if (!isPlatformMode || !isPlatformAdmin) {
    console.warn('Access denied: User is not a Platform Administrator or not in platform mode.', {
      isPlatformMode,
      isPlatformAdmin,
      profileRole: profile?.role
    });

    const handleExit = async () => {
      try {
        await signOut();
        resetTenant();
      } catch (err) {
        console.error('Sign out error:', err);
      }
      window.location.href = '/';
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-900">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center space-y-5">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Access Restricted</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your account (<span className="font-semibold text-gray-800">{session?.user?.email}</span>) does not have Platform Administrator permissions for the VyaraHR Master Router portal.
            </p>
          </div>
          <div className="pt-3">
            <button
              onClick={handleExit}
              className="w-full py-3 px-4 bg-[#FF5900] hover:bg-[#e04f00] text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-[#FF5900]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign Out & Return Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PlatformRoute;

