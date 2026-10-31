import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTenantMeta, isPlatformMode, onTenantChange, isPlatformSlug, resetTenant, masterRouter, supabase } from '../lib/supabase';
import { ShieldAlert, LogOut, Mail, ExternalLink, RefreshCw } from 'lucide-react';

interface TenantContextType {
  slug: string;
  name: string;
  mode: 'platform' | 'organization';
  supabaseUrl: string;
  isReady: boolean;
  workspaceStatus: 'active' | 'blocked' | 'suspended' | 'inactive';
  isBlocked: boolean;
  updateTenantInfo: (slug: string, name: string) => void;
  checkWorkspaceStatus: () => Promise<void>;
}

// Explicit access revocation: end the tenant user's session and purge cached tenant credentials.
// The workspace slug/name are kept so the suspended screen and re-check keep working.
const revokeTenantAccess = () => {
  localStorage.removeItem('selected_tenant_key');
  supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'platform' | 'organization'>('organization');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState<'active' | 'blocked' | 'suspended' | 'inactive'>('active');
  const [isBlocked, setIsBlocked] = useState(false);

  const checkWorkspaceStatus = async () => {
    const meta = getTenantMeta();
    if (!meta.slug || isPlatformSlug(meta.slug)) {
      setWorkspaceStatus('active');
      setIsBlocked(false);
      return;
    }

    try {
      // 1. Check tenant_mappings in master router
      const { data, error } = await masterRouter
        .from('tenant_mappings')
        .select('status, company_name')
        .eq('slug', meta.slug.toLowerCase().trim())
        .maybeSingle();

      if (!error && data) {
        setWorkspaceStatus(data.status);
        const blocked = data.status === 'blocked' || data.status === 'suspended';
        setIsBlocked(blocked);
        if (blocked) {
          revokeTenantAccess();
        }
        return;
      }

      // Fallback: check legacy tenant_connections or organizations
      const { data: orgData } = await masterRouter
        .from('organizations')
        .select('status')
        .eq('slug', meta.slug.toLowerCase().trim())
        .maybeSingle();

      if (orgData) {
        const blocked = orgData.status === 'cancelled' || orgData.status === 'suspended';
        setWorkspaceStatus(blocked ? 'blocked' : 'active');
        setIsBlocked(blocked);
      }
    } catch (err) {
      console.warn('Error checking workspace status:', err);
    }
  };

  const syncWithSupabaseMeta = () => {
    const meta = getTenantMeta();
    setSlug(meta.slug);
    setName(meta.name);
    setSupabaseUrl(meta.url);
    setMode(isPlatformMode() ? 'platform' : 'organization');
  };

  useEffect(() => {
    syncWithSupabaseMeta();
    checkWorkspaceStatus().finally(() => setIsReady(true));

    const unsubscribe = onTenantChange(() => {
      syncWithSupabaseMeta();
      checkWorkspaceStatus();
    });

    // Poll so block/unblock by the platform owner takes effect without a manual reload
    const poll = setInterval(() => { checkWorkspaceStatus(); }, 30_000);

    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, []);

  const updateTenantInfo = (newSlug: string, newName: string) => {
    if (isPlatformSlug(newSlug) || isPlatformMode()) {
      setSlug(newSlug);
      setName('VyaraHR Platform');
      setMode('platform');
      setWorkspaceStatus('active');
      setIsBlocked(false);
    } else {
      setSlug(newSlug);
      setName(newName);
      setMode('organization');
      checkWorkspaceStatus();
    }
    const meta = getTenantMeta();
    setSupabaseUrl(meta.url);
  };

  return (
    <TenantContext.Provider value={{ 
      slug, 
      name, 
      mode, 
      supabaseUrl, 
      isReady, 
      workspaceStatus, 
      isBlocked, 
      updateTenantInfo,
      checkWorkspaceStatus 
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// ==========================================
// TENANT GATE (LOCKOUT SCREEN FOR BLOCKED WORKSPACES)
// ==========================================
export const TenantGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isBlocked, slug, name, checkWorkspaceStatus } = useTenant();
  const [rechecking, setRechecking] = useState(false);

  const handleSwitchWorkspace = () => {
    resetTenant();
    window.location.href = '/';
  };

  const handleRecheck = async () => {
    setRechecking(true);
    await checkWorkspaceStatus();
    setRechecking(false);
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-2xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            Workspace Access Suspended
          </h2>
          <p className="text-xs text-red-400 font-mono mb-4">
            /{slug} · {name || 'Organization'}
          </p>

          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Access to this enterprise workspace has been halted by the platform administrator or due to an expired commercial agreement. All active client sessions have been terminated.
          </p>

          <div className="space-y-2.5">
            <a
              href="mailto:support@vyarahr.com?subject=Workspace%20Suspension%20Inquiry%20-%20"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Mail size={14} />
              <span>Contact Platform Support</span>
            </a>

            <button
              onClick={handleRecheck}
              disabled={rechecking}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={rechecking ? 'animate-spin' : ''} />
              <span>Re-check Access Status</span>
            </button>

            <button
              onClick={handleSwitchWorkspace}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Switch Workspace</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            <a href="/platform" className="hover:text-emerald-400 transition-colors">
              Platform Dashboard &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
