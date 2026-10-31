import { useAuth } from '../context/AuthContext';
import { isPlatformMode } from '../lib/supabase';

export const useRole = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'employee';

  return {
    role,
    isOwner: role === 'owner' || role === 'superadmin',
    isAdmin: role === 'admin' || role === 'owner' || role === 'superadmin',
    isEmployee: role === 'employee',
    isPlatformAdmin: role === 'platform_admin' || (isPlatformMode() && (role === 'superadmin' || role === 'owner')),
  };
};

