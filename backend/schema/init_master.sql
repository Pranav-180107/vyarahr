-- =============================================================================
-- VyaraHR Self-Hosted Multi-Tenant Master Database Schema
-- Native PostgreSQL 16 Architecture (Hostinger VPS / Linux)
-- Public schema handles Tenant routing and Platform Administration
-- Isolated "tenant_<slug>" schemas handle all Operational HR Data
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. PLATFORM ROUTER & TENANT DIRECTORY (public schema)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_mappings (
    slug VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, blocked, suspended
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_accounts (
    id VARCHAR(128) PRIMARY KEY,
    tenant_slug VARCHAR(64) NOT NULL REFERENCES public.tenant_mappings(slug) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    plan_tier VARCHAR(64) NOT NULL DEFAULT 'enterprise',
    billing_cycle VARCHAR(32) NOT NULL DEFAULT 'annual',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'paid', -- paid, trial, pending, cancelled
    onboarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'superadmin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    work_email VARCHAR(255),
    email VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    company_size VARCHAR(64),
    phone VARCHAR(64),
    requested_slug VARCHAR(64),
    offer_letter_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.hr_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    org_name VARCHAR(255),
    org_email VARCHAR(255),
    phone VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    offer_letter_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(64) DEFAULT 'India',
    timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
    currency VARCHAR(16) DEFAULT 'INR',
    logo_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    plan VARCHAR(32) DEFAULT 'enterprise',
    payment_status VARCHAR(32) DEFAULT 'paid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_slug VARCHAR(64),
    actor_email VARCHAR(255),
    action VARCHAR(128) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default platform owner if empty (password: Admin@123)
-- bcrypt hash for 'Admin@123': $2b$10$WqB8w5q3m8L8QeQeKzWpXeFjG1r9k2l3m4n5o6p7q8r9s0t1u2v3w
INSERT INTO public.platform_owners (email, password_hash, role)
VALUES ('admin@vyarahr.com', '$2a$10$7Z2v8t5uV8t3qgXk5Z1p8.YVvR6Q5p9yY2v0m1L8o9q3m8L8QeQeK', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- Seed initial master settings
INSERT INTO public.global_settings (key, value)
VALUES 
    ('system_config', '{"allow_self_registration": true, "enforce_schema_isolation": true, "environment": "production"}'::jsonb),
    ('maintenance_mode', '{"enabled": false, "message": "VyaraHR is undergoing scheduled maintenance."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. TENANT PROVISIONING TEMPLATE FUNCTION
-- Automatically creates isolated schema and all operational HR tables
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.provision_new_tenant(
    p_slug TEXT,
    p_company_name TEXT,
    p_admin_name TEXT,
    p_admin_email TEXT,
    p_admin_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_schema TEXT;
    v_admin_id UUID := gen_random_uuid();
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    v_schema := 'tenant_' || lower(regexp_replace(p_slug, '[^a-zA-Z0-9_]', '', 'g'));

    -- 1. Create isolated schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema);

    -- 2. Register mapping in public directory
    INSERT INTO public.tenant_mappings (slug, company_name, schema_name, status)
    VALUES (p_slug, p_company_name, v_schema, 'active')
    ON CONFLICT (slug) DO UPDATE
    SET company_name = EXCLUDED.company_name, schema_name = EXCLUDED.schema_name, status = 'active';

    -- 3. Register customer account
    INSERT INTO public.customer_accounts (id, tenant_slug, contact_name, contact_email, plan_tier, billing_cycle, payment_status)
    VALUES ('crm-' || p_slug, p_slug, p_admin_name, p_admin_email, 'enterprise', 'annual', 'paid')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Create profiles table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id VARCHAR(64) UNIQUE,
            first_name VARCHAR(128) DEFAULT ''Admin'',
            last_name VARCHAR(128) DEFAULT ''User'',
            full_name VARCHAR(255) DEFAULT ''Admin User'',
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT,
            password_hash TEXT,
            phone VARCHAR(64),
            role VARCHAR(64) NOT NULL DEFAULT ''employee'',
            department VARCHAR(128) DEFAULT ''General'',
            designation VARCHAR(128) DEFAULT ''Associate'',
            gross_salary NUMERIC(12, 2) DEFAULT 0,
            hired_by VARCHAR(255),
            date_of_joining DATE DEFAULT CURRENT_DATE,
            avatar_url TEXT,
            emergency_contact JSONB DEFAULT ''{}''::jsonb,
            employment_status VARCHAR(32) DEFAULT ''active'',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_%s_profiles_email ON %I.profiles (lower(email));
        CREATE INDEX IF NOT EXISTS idx_%s_profiles_role ON %I.profiles (role);
    ', v_schema, v_schema, v_schema, v_schema, v_schema);

    -- 5. Create attendance table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.attendance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            check_in TIMESTAMPTZ,
            check_out TIMESTAMPTZ,
            status VARCHAR(32) NOT NULL DEFAULT ''present'',
            work_hours NUMERIC(4, 2),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_%s_attendance_date ON %I.attendance (date);
        CREATE INDEX IF NOT EXISTS idx_%s_attendance_emp ON %I.attendance (employee_id);
    ', v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);

    -- 6. Create leave_requests table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.leave_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            leave_type VARCHAR(64) NOT NULL DEFAULT ''Casual Leave'',
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_count NUMERIC(4, 1) NOT NULL DEFAULT 1,
            reason TEXT,
            status VARCHAR(32) NOT NULL DEFAULT ''pending'',
            applied_on TIMESTAMPTZ DEFAULT NOW(),
            reviewed_by UUID REFERENCES %I.profiles(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMPTZ,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_%s_leave_emp ON %I.leave_requests (employee_id);
        CREATE INDEX IF NOT EXISTS idx_%s_leave_status ON %I.leave_requests (status);
    ', v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);

    -- 7. Create payroll_runs table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payroll_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            month VARCHAR(32) NOT NULL,
            year INT NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT ''draft'',
            total_gross NUMERIC(12, 2) DEFAULT 0,
            total_deductions NUMERIC(12, 2) DEFAULT 0,
            total_net NUMERIC(12, 2) DEFAULT 0,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema);

    -- 8. Create loans table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.loans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            amount NUMERIC(12, 2) NOT NULL,
            term_months INT NOT NULL DEFAULT 12,
            monthly_emi NUMERIC(12, 2) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT ''pending'',
            disbursed_at DATE,
            reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_%s_loans_emp ON %I.loans (employee_id);
    ', v_schema, v_schema, v_schema, v_schema);

    -- 9. Create tax_declarations table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.tax_declarations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            financial_year VARCHAR(32) NOT NULL,
            regime VARCHAR(32) NOT NULL DEFAULT ''new'',
            status VARCHAR(32) NOT NULL DEFAULT ''draft'',
            details JSONB DEFAULT ''{}''::jsonb,
            submitted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_%s_tax_emp ON %I.tax_declarations (employee_id);
    ', v_schema, v_schema, v_schema, v_schema);

    -- 10. Create calendar_events table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.calendar_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_type VARCHAR(64) DEFAULT ''general'',
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            is_company_wide BOOLEAN DEFAULT TRUE,
            created_by UUID REFERENCES %I.profiles(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema, v_schema);

    -- 11. Create assets table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.assets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            asset_name VARCHAR(255) NOT NULL,
            serial_number VARCHAR(128),
            category VARCHAR(128) DEFAULT ''Hardware'',
            assigned_to UUID REFERENCES %I.profiles(id) ON DELETE SET NULL,
            status VARCHAR(32) DEFAULT ''assigned'',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema, v_schema);

    -- 12. Create resignations table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.resignations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            notice_date DATE NOT NULL DEFAULT CURRENT_DATE,
            last_working_day DATE NOT NULL,
            reason TEXT,
            status VARCHAR(32) DEFAULT ''submitted'',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema, v_schema);

    -- 13. Create employee_documents table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.employee_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            document_name VARCHAR(255) NOT NULL,
            file_url TEXT NOT NULL,
            category VARCHAR(128) DEFAULT ''General'',
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema, v_schema);

    -- 14. Create support_tickets table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.support_tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            subject VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(64) DEFAULT ''general'',
            priority VARCHAR(32) DEFAULT ''medium'',
            status VARCHAR(32) DEFAULT ''open'',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema, v_schema);

    -- 15. Create notifications table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            recipient_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', v_schema, v_schema);

    -- 16. Insert primary Tenant Owner profile
    v_first_name := split_part(coalesce(p_admin_name, 'Admin'), ' ', 1);
    v_last_name := nullif(split_part(coalesce(p_admin_name, 'User'), ' ', 2), '');
    IF v_last_name IS NULL THEN
        v_last_name := 'Admin';
    END IF;

    EXECUTE format('
        INSERT INTO %I.profiles (id, employee_id, first_name, last_name, email, password_hash, role, designation, department)
        VALUES (%L, ''EMP-001'', %L, %L, %L, %L, ''owner'', ''Managing Director'', ''Executive'')
        ON CONFLICT (email) DO UPDATE
        SET role = ''owner'', password_hash = EXCLUDED.password_hash;
    ', v_schema, v_admin_id, v_first_name, v_last_name, p_admin_email, p_admin_password_hash);

    RETURN jsonb_build_object(
        'success', true,
        'slug', p_slug,
        'schema_name', v_schema,
        'admin_id', v_admin_id
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. PERMANENT BASELINE TENANT: MARBANU WORKSPACE
-- -----------------------------------------------------------------------------
SELECT public.provision_new_tenant(
    'marabanu',
    'Marbanu',
    'Praveen Rangasamy',
    'praveen12rangasamy@gmail.com',
    '$2a$12$K1.G0yW0O3zT8lFk0j.N6uQ38t3m2nK.Z/2j1L3z6p4a5s6d7f8g9'
);

INSERT INTO public.tenant_mappings (slug, company_name, schema_name, status)
VALUES ('marabanu', 'Marbanu', 'tenant_marabanu', 'active')
ON CONFLICT (slug) DO UPDATE SET company_name = 'Marbanu', schema_name = 'tenant_marabanu', status = 'active';

INSERT INTO public.organizations (slug, name, country, status, plan, payment_status)
VALUES ('marabanu', 'Marbanu', 'India', 'active', 'enterprise', 'paid')
ON CONFLICT (slug) DO UPDATE SET name = 'Marbanu', status = 'active', payment_status = 'paid';

INSERT INTO public.customer_accounts (id, tenant_slug, contact_name, contact_email, plan_tier, billing_cycle, payment_status)
VALUES ('crm-marabanu', 'marabanu', 'Praveen Rangasamy', 'praveen12rangasamy@gmail.com', 'enterprise', 'annual', 'paid')
ON CONFLICT (tenant_slug) DO UPDATE SET payment_status = 'paid';

