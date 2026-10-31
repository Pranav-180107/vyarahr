import type { User } from '../lib/supabase';

export const getAdminEmail = (profile: any, user: User | null): string => {
  if (!profile) return user?.email?.trim().toLowerCase() || 'admin';
  const role = profile.role;
  if (role === 'owner' || role === 'admin' || role === 'superadmin') {
    return profile.email?.trim().toLowerCase() || 'admin';
  }
  return profile.hired_by?.trim().toLowerCase() || profile.email?.trim().toLowerCase() || 'admin';
};

export const getScopedKey = (key: string, profile?: any, user?: User | null): string => {
  const tenantSlug = (typeof window !== 'undefined' ? (localStorage.getItem('selected_tenant_slug') || '') : '').trim().toLowerCase() || 'tenant';
  const adminEmail = profile || user ? getAdminEmail(profile, user || null) : 'shared';
  return `${key}_${tenantSlug}_${adminEmail}`;
};
