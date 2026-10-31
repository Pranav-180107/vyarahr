import { useTenant } from './useTenant';
import { useRole } from './useRole';
import { isPlatformMode as checkIsPlatformMode } from '../lib/supabase';

export const usePlatform = () => {
  const { mode } = useTenant();
  const { isPlatformAdmin } = useRole();

  return {
    isPlatformMode: mode === 'platform' || checkIsPlatformMode(),
    isPlatformAdmin,
  };
};

