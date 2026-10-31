-- ============================================================
-- VyaraHR Parent Supabase Project Master Migration
-- Consolidates Platform Router Tables & HR Feature Tables
-- Run this in the VyaraHR Master Supabase project (nxtjqpehfdutqnvbaodb)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PLATFORM ROUTER & DIRECTORY TABLES
-- ============================================================

-- Platform Users table
CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'platform_admin' CHECK (role IN ('platform_admin', 'platform_viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Seed platform super admins
INSERT INTO platform_users (email, full_name, role) VALUES
  ('superadmin@vyarahr.com',         'Super Admin',           'platform_admin'),
  ('praveen12rangasamy@gmail.com',   'Praveen Rangasamy',     'platform_admin'),
  ('pranavanandan18@gmail.com',      'Pranav Anandan',        'platform_admin'),
  ('pranavananthan18@gmail.com',     'Pranav Ananthan',       'platform_admin'),
  ('jin@gmail.com',                  'Jin',                   'platform_admin')
ON CONFLICT (email) DO NOTHING;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'INR',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  supabase_project_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS supabase_project_ref TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Tenant Connections table
CREATE TABLE IF NOT EXISTS tenant_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_slug TEXT NOT NULL UNIQUE,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_project_ref TEXT,
  db_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure missing columns are added if tenant_connections table already exists
ALTER TABLE tenant_connections ADD COLUMN IF NOT EXISTS supabase_project_ref TEXT;
ALTER TABLE tenant_connections ADD COLUMN IF NOT EXISTS db_status TEXT DEFAULT 'active';

-- Seed default Parent & Tenant connection entries
INSERT INTO tenant_connections (company_name, company_slug, supabase_url, supabase_anon_key, supabase_project_ref, db_status) VALUES
  ('VyaraHR Parent Platform', 'vyarahr-platform', 'https://nxtjqpehfdutqnvbaodb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dGpxcGVoZmR1dHFudmJhb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzI1MDYsImV4cCI6MjA5OTQwODUwNn0.J4jb1IorRLAGoKTF80fIbToDkmCvNDjXVNXwha-W-vs', 'nxtjqpehfdutqnvbaodb', 'active'),
  ('Marbanu', 'marbanu', 'https://joqlxybxfivjpabvopxu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcWx4eWJ4Zml2anBhYnZvcHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzExNTEsImV4cCI6MjA4OTE0NzE1MX0.zxm1tXbZgeK_kf-A796ysDFREyS6thKW3DV8n-iBaNE', 'joqlxybxfivjpabvopxu', 'active')
ON CONFLICT (company_slug) DO NOTHING;

-- Audit Logs table
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

-- Global Settings table
CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO global_settings (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('allow_new_signups', 'true'::jsonb),
  ('default_trial_days', '14'::jsonb),
  ('branding_name', '"VyaraHR"'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 2. HR OPERATIONAL FEATURE TABLES (PARENTS & TENANTS)
-- ============================================================

-- Profiles (Employee & User Directory)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  designation TEXT,
  phone TEXT,
  joining_date DATE,
  avatar_url TEXT,
  hired_by TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hired_by TEXT;

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  work_location TEXT DEFAULT 'office',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(4, 1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  applied_on DATE DEFAULT CURRENT_DATE,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  basic_salary NUMERIC(12, 2) DEFAULT 0,
  allowances NUMERIC(12, 2) DEFAULT 0,
  deductions NUMERIC(12, 2) DEFAULT 0,
  net_salary NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  payment_status TEXT DEFAULT 'pending',
  paid_on TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS paid_on TIMESTAMPTZ;

-- Loans & Advances
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  purpose TEXT,
  tenure_months INTEGER NOT NULL DEFAULT 12,
  monthly_emi NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'repaid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax Declarations
CREATE TABLE IF NOT EXISTS tax_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL DEFAULT '2025-2026',
  regime TEXT NOT NULL DEFAULT 'new' CHECK (regime IN ('old', 'new')),
  declarations JSONB DEFAULT '{}'::jsonb,
  total_declared NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calendar Events & Holidays
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'holiday' CHECK (type IN ('holiday', 'event', 'meeting', 'company')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resignations & Offboarding
CREATE TABLE IF NOT EXISTS resignations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resignation_date DATE NOT NULL,
  last_working_day DATE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_users_all" ON platform_users;
CREATE POLICY "platform_users_all" ON platform_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_all" ON organizations;
CREATE POLICY "organizations_all" ON organizations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tenant_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_connections_all" ON tenant_connections;
CREATE POLICY "tenant_connections_all" ON tenant_connections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_all" ON audit_logs;
CREATE POLICY "audit_logs_all" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_settings_all" ON global_settings;
CREATE POLICY "global_settings_all" ON global_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_all" ON profiles;
CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_all" ON attendance;
CREATE POLICY "attendance_all" ON attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_requests_all" ON leave_requests;
CREATE POLICY "leave_requests_all" ON leave_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_runs_all" ON payroll_runs;
CREATE POLICY "payroll_runs_all" ON payroll_runs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loans_all" ON loans;
CREATE POLICY "loans_all" ON loans FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tax_declarations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_declarations_all" ON tax_declarations;
CREATE POLICY "tax_declarations_all" ON tax_declarations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_all" ON calendar_events;
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE resignations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resignations_all" ON resignations;
CREATE POLICY "resignations_all" ON resignations FOR ALL USING (true) WITH CHECK (true);
