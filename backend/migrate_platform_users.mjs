import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    console.log('🔄 Running migration for platform_users and schema templates...');

    // 1. Create public.platform_users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.platform_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        password_hash TEXT,
        role VARCHAR(64) NOT NULL DEFAULT 'platform_admin',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );
    `);
    console.log('✅ Created public.platform_users table');

    // 2. Ensure platform_owners columns
    await pool.query(`
      ALTER TABLE public.platform_owners ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE public.platform_owners ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE public.platform_owners ADD COLUMN IF NOT EXISTS role VARCHAR(64) DEFAULT 'superadmin';
    `);

    // 3. Generate default bcrypt hashes (Cost 12)
    const pinHash = await bcrypt.hash('123456', 12);
    const adminHash = await bcrypt.hash('Admin@123', 12);

    // 4. Seed Platform Users
    const initialUsers = [
      { email: 'praveen12rangasamy@gmail.com', name: 'Praveen Rangasamy', role: 'platform_admin', hash: pinHash },
      { email: 'admin@vyarahr.com', name: 'VyaraHR Admin', role: 'platform_admin', hash: adminHash },
      { email: 'superadmin@vyarahr.com', name: 'Super Admin', role: 'platform_admin', hash: adminHash },
      { email: 'superadmin@gmail.com', name: 'Super Admin Fallback', role: 'platform_admin', hash: adminHash },
      { email: 'pranavanandan18@gmail.com', name: 'Pranav Anandan', role: 'platform_admin', hash: pinHash },
      { email: 'pranavananthan18@gmail.com', name: 'Pranav Ananthan', role: 'platform_admin', hash: pinHash },
      { email: 'jin@gmail.com', name: 'Jin', role: 'platform_admin', hash: adminHash }
    ];

    for (const u of initialUsers) {
      await pool.query(`
        INSERT INTO public.platform_users (email, full_name, role, password_hash, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (email) DO UPDATE 
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = true,
            password_hash = COALESCE(public.platform_users.password_hash, EXCLUDED.password_hash);
      `, [u.email, u.name, u.role, u.hash]);

      await pool.query(`
        INSERT INTO public.platform_owners (email, full_name, password_hash, role)
        VALUES ($1, $2, $3, 'superadmin')
        ON CONFLICT (email) DO UPDATE 
        SET full_name = EXCLUDED.full_name,
            password_hash = COALESCE(public.platform_owners.password_hash, EXCLUDED.password_hash);
      `, [u.email, u.name, u.hash]);
    }
    console.log('✅ Seeded platform admins into platform_users and platform_owners');

    // 5. Ensure template tables in public schema for cloning and fallbacks
    const templateTables = [
      `CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR(64) UNIQUE,
        first_name VARCHAR(128) DEFAULT 'Staff',
        last_name VARCHAR(128) DEFAULT 'Member',
        full_name VARCHAR(255) DEFAULT 'Staff Member',
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT,
        password_hash TEXT,
        phone VARCHAR(64),
        role VARCHAR(64) NOT NULL DEFAULT 'employee',
        department VARCHAR(128) DEFAULT 'General',
        designation VARCHAR(128) DEFAULT 'Associate',
        date_of_joining DATE DEFAULT CURRENT_DATE,
        avatar_url TEXT,
        gross_salary NUMERIC(12, 2) DEFAULT 0,
        hired_by VARCHAR(255),
        emergency_contact JSONB DEFAULT '{}'::jsonb,
        employment_status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        check_in TIMESTAMPTZ,
        check_out TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL DEFAULT 'present',
        work_hours NUMERIC(4, 2),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        leave_type VARCHAR(64) NOT NULL DEFAULT 'Casual Leave',
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE NOT NULL DEFAULT CURRENT_DATE,
        days_count NUMERIC(4, 1) NOT NULL DEFAULT 1,
        reason TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        applied_on TIMESTAMPTZ DEFAULT NOW(),
        reviewed_by UUID,
        reviewed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.payroll_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        month VARCHAR(32) NOT NULL DEFAULT 'Current',
        year INT NOT NULL DEFAULT 2026,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        total_gross NUMERIC(12, 2) DEFAULT 0,
        total_deductions NUMERIC(12, 2) DEFAULT 0,
        total_net NUMERIC(12, 2) DEFAULT 0,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.loans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        term_months INT NOT NULL DEFAULT 12,
        monthly_emi NUMERIC(12, 2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        disbursed_at DATE,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.tax_declarations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        financial_year VARCHAR(32) NOT NULL DEFAULT '2026-2027',
        regime VARCHAR(32) NOT NULL DEFAULT 'new',
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        details JSONB DEFAULT '{}'::jsonb,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(64) DEFAULT 'general',
        start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_company_wide BOOLEAN DEFAULT TRUE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_name VARCHAR(255) NOT NULL,
        serial_number VARCHAR(128),
        category VARCHAR(128) DEFAULT 'Hardware',
        assigned_to UUID,
        status VARCHAR(32) DEFAULT 'assigned',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.resignations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        notice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        last_working_day DATE NOT NULL DEFAULT CURRENT_DATE,
        reason TEXT,
        status VARCHAR(32) DEFAULT 'submitted',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.employee_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        document_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        category VARCHAR(128) DEFAULT 'General',
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(64) DEFAULT 'general',
        priority VARCHAR(32) DEFAULT 'medium',
        status VARCHAR(32) DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id UUID,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    ];

    for (const ddl of templateTables) {
      await pool.query(ddl);
    }
    console.log('✅ Template operational tables created in public schema');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
