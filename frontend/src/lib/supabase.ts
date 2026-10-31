// =========================================================================
// VyaraHR API Client Interface (Supabase-Compatible Facade)
// Routes all data, auth, and storage requests to our self-hosted backend
// Fully decoupled from @supabase/supabase-js with zero breaking changes
// =========================================================================

import { NativeApiClient, type ApiUser, type ApiSession } from './apiClient';

export type User = ApiUser;
export type Session = ApiSession;
export type SupabaseClient = NativeApiClient;

export const MASTER_URL = ((import.meta as any).env?.VITE_API_URL || '').trim();
export const MASTER_KEY = 'self-hosted-native';

export const DEFAULT_URL = ((import.meta as any).env?.VITE_API_URL || '').trim();
export const DEFAULT_KEY = 'self-hosted-native';

// Recognized slugs for platform / master router mode
export const PLATFORM_SLUGS = [
  'vyarahr-platform',
  'vyarahr',
  'master',
  'master-router',
  'masterrouter',
  'master router',
  'platform',
  'parent',
  'operator',
  'platform-admin',
  'admin',
  'owner'
];

export const isPlatformSlug = (slug: string): boolean => {
  if (!slug) return false;
  return PLATFORM_SLUGS.includes(slug.trim().toLowerCase());
};

// Master client to query tenant directory / platform tables
export const masterSupabase = new NativeApiClient({ isPlatform: true });
export const masterRouter = masterSupabase;

let activeUrl = (localStorage.getItem('selected_tenant_url') || DEFAULT_URL).trim();
let activeKey = (localStorage.getItem('selected_tenant_key') || DEFAULT_KEY).trim();
let activeClient = new NativeApiClient({
  workspaceSlug: localStorage.getItem('selected_tenant_slug') || undefined,
  isPlatform: isPlatformSlug(localStorage.getItem('selected_tenant_slug') || '')
});

export const platformDb: NativeApiClient = new Proxy({} as NativeApiClient, {
  get(_t, prop) {
    const target: any = isPlatformMode() ? activeClient : masterSupabase;
    const v = target[prop];
    return typeof v === 'function' ? v.bind(target) : v;
  }
});

type TenantChangeListener = (url: string, key: string) => void;
const tenantChangeListeners: TenantChangeListener[] = [];

export const onTenantChange = (listener: TenantChangeListener) => {
  tenantChangeListeners.push(listener);
  return () => {
    const idx = tenantChangeListeners.indexOf(listener);
    if (idx !== -1) tenantChangeListeners.splice(idx, 1);
  };
};

export const switchTenant = (url: string, key: string, slug?: string) => {
  const cleanUrl = url.trim();
  activeUrl = cleanUrl;
  activeKey = key.trim();
  localStorage.setItem('selected_tenant_url', cleanUrl);
  localStorage.setItem('selected_tenant_key', activeKey);
  
  if (slug) {
    localStorage.setItem('selected_tenant_slug', slug);
  }
  const currentSlug = slug || localStorage.getItem('selected_tenant_slug') || undefined;
  activeClient = new NativeApiClient({
    workspaceSlug: currentSlug,
    isPlatform: isPlatformSlug(currentSlug || '')
  });
  
  tenantChangeListeners.forEach(listener => listener(cleanUrl, activeKey));
};

export const setTenantClient = (url: string, anonKey: string, slug?: string, name?: string) => {
  if (slug) {
    localStorage.setItem('selected_tenant_slug', slug);
  }
  if (name) {
    localStorage.setItem('selected_tenant_name', name);
  }
  switchTenant(url, anonKey);
};

export const resolveEffectiveSlug = (): string => {
  const cachedSlug = localStorage.getItem('selected_tenant_slug');
  if (cachedSlug && cachedSlug !== 'default' && !isPlatformSlug(cachedSlug)) {
    return cachedSlug;
  }
  return '';
};

export const resetTenant = () => {
  localStorage.removeItem('selected_tenant_url');
  localStorage.removeItem('selected_tenant_key');
  localStorage.removeItem('selected_tenant_slug');
  localStorage.removeItem('selected_tenant_name');
  activeUrl = DEFAULT_URL;
  activeKey = DEFAULT_KEY;
  activeClient = new NativeApiClient();
  
  tenantChangeListeners.forEach(listener => listener(DEFAULT_URL, DEFAULT_KEY));
};

export const getSupabase = (): NativeApiClient => activeClient;
export const getActiveUrl = (): string => activeUrl;

export const getTenantMeta = () => ({
  url: activeUrl,
  key: activeKey,
  slug: localStorage.getItem('selected_tenant_slug') || '',
  name: localStorage.getItem('selected_tenant_name') || '',
});

export const isPlatformMode = (): boolean => {
  const currentSlug = (localStorage.getItem('selected_tenant_slug') || '').trim().toLowerCase();
  return isPlatformSlug(currentSlug);
};

// Dynamic client proxy delegating all operations to current active client
export const supabase: NativeApiClient = new Proxy({} as NativeApiClient, {
  get(_target, prop) {
    const client = activeClient;
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    if (value !== null && typeof value === 'object') {
      return new Proxy(value, {
        get(innerTarget, innerProp) {
          const freshClient = activeClient;
          const freshObj = (freshClient as any)[prop];
          const innerValue = freshObj[innerProp];
          if (typeof innerValue === 'function') {
            return innerValue.bind(freshObj);
          }
          return innerValue;
        }
      });
    }
    return value;
  },
  set(_target, prop, value) {
    (activeClient as any)[prop] = value;
    return true;
  }
});
