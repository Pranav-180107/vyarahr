-- ============================================================
-- Master Router: Platform Users & Organizations
-- Run this in your VyaraHR Platform (Master Router) Supabase project
-- ============================================================

-- 1. Platform Users table (replaces hardcoded email whitelist)
CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'platform_admin' CHECK (role IN ('platform_admin', 'platform_viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Seed existing platform admins
INSERT INTO platform_users (email, full_name, role) VALUES
  ('superadmin@vyarahr.com',         'Super Admin',           'platform_admin'),
  ('praveen12rangasamy@gmail.com',   'Praveen Rangasamy',     'platform_admin'),
  ('pranavanandan18@gmail.com',      'Pranav Anandan',        'platform_admin'),
  ('pranavananthan18@gmail.com',     'Pranav Ananthan',       'platform_admin'),
  ('jin@gmail.com',                  'Jin',                   'platform_admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'INR',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  supabase_project_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync existing connections to organizations table
INSERT INTO organizations (slug, name, country, plan, status, supabase_project_ref)
SELECT 
  company_slug, 
  company_name, 
  'India', 
  'pro', 
  'active', 
  COALESCE(SUBSTRING(supabase_url FROM 'https://(.*)\.supabase\.co'), '')
FROM tenant_connections
ON CONFLICT (slug) DO NOTHING;


-- 3. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS: Only authenticated platform users can read platform_users
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_users_select" ON platform_users
  FOR SELECT USING (true); -- anon can select (needed for login check)

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (true);
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (true);
CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (true);

-- 5. tenant_connections RLS policies (Gateway)
ALTER TABLE tenant_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_connections_select" ON tenant_connections;
CREATE POLICY "tenant_connections_select" ON tenant_connections FOR SELECT USING (true);
DROP POLICY IF EXISTS "tenant_connections_insert" ON tenant_connections;
CREATE POLICY "tenant_connections_insert" ON tenant_connections FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_connections_update" ON tenant_connections;
CREATE POLICY "tenant_connections_update" ON tenant_connections FOR UPDATE USING (true);
DROP POLICY IF EXISTS "tenant_connections_delete" ON tenant_connections;
CREATE POLICY "tenant_connections_delete" ON tenant_connections FOR DELETE USING (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (true);

