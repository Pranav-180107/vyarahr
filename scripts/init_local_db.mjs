import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initLocalDb() {
  console.log('Connecting to PostgreSQL using default postgres user...');
  const adminPool = new pg.Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
  });

  try {
    // 1. Create database vyarahr_db if it doesn't exist
    const dbRes = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'vyarahr_db'");
    if (dbRes.rows.length === 0) {
      await adminPool.query('CREATE DATABASE vyarahr_db');
      console.log('✅ Created database vyarahr_db');
    } else {
      console.log('ℹ️ Database vyarahr_db already exists');
    }

    // 2. Ensure role vyarahr_user exists
    const roleRes = await adminPool.query("SELECT 1 FROM pg_roles WHERE rolname = 'vyarahr_user'");
    if (roleRes.rows.length === 0) {
      await adminPool.query("CREATE ROLE vyarahr_user WITH LOGIN SUPERUSER PASSWORD 'vyarahr_password'");
      console.log('✅ Created role vyarahr_user with password vyarahr_password');
    } else {
      await adminPool.query("ALTER ROLE vyarahr_user WITH LOGIN SUPERUSER PASSWORD 'vyarahr_password'");
      console.log('ℹ️ Role vyarahr_user updated with password');
    }

    await adminPool.query('GRANT ALL PRIVILEGES ON DATABASE vyarahr_db TO vyarahr_user');
  } catch (err) {
    console.error('Error in admin setup:', err.message);
  } finally {
    await adminPool.end();
  }

  // 3. Connect to vyarahr_db and apply schema
  console.log('Connecting to vyarahr_db to apply schema...');
  const appPool = new pg.Pool({
    connectionString: 'postgresql://vyarahr_user:vyarahr_password@127.0.0.1:5432/vyarahr_db'
  });

  try {
    const schemaFile = path.join(__dirname, '..', 'backend', 'schema', 'init_master.sql');
    if (fs.existsSync(schemaFile)) {
      const sql = fs.readFileSync(schemaFile, 'utf8');
      await appPool.query(sql);
      console.log('✅ Applied master schema from backend/schema/init_master.sql');
    }

    // Ensure access_requests and hr_registrations have all needed columns
    await appPool.query(`
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
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
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
    `);
    console.log('✅ Verified public.access_requests and public.hr_registrations tables');
  } catch (err) {
    console.error('Error applying schema:', err.message);
  } finally {
    await appPool.end();
  }

  console.log('🎉 Local PostgreSQL initialized successfully!');
}

initLocalDb();
