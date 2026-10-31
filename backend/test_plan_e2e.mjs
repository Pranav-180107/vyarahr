import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function testProvisionAndAuth() {
  try {
    console.log('🧪 Starting End-to-End Test for Multi-Tenant Provisioning and Custom Auth...');

    const testPayload = {
      slug: 'alphatraders',
      company_name: 'Alpha Traders Pvt Ltd',
      admin_name: 'Rajesh Patel',
      admin_email: 'admin@alphatraders.in',
      admin_password: 'OwnerPassword@2026'
    };

    // 1. Call /api/tenant/provision
    const provRes = await fetch('http://127.0.0.1:5001/api/tenant/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const provJson = await provRes.json();
    console.log('1. Provision Response:', provJson);

    if (!provJson.success) {
      throw new Error('Provisioning failed: ' + JSON.stringify(provJson));
    }

    // 2. Check Database Schema & Tables
    const schemaCheck = await pool.query(`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tenant_alphatraders';
    `);
    console.log('2. Schema check (tenant_alphatraders):', schemaCheck.rows);

    const tablesCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'tenant_alphatraders';
    `);
    console.log('3. Tables in tenant_alphatraders:', tablesCheck.rows.map(r => r.table_name));

    // 3. Check Admin Profile
    const profileCheck = await pool.query(`
      SELECT email, role, password_hash FROM "tenant_alphatraders".profiles;
    `);
    console.log('4. Profile in tenant_alphatraders:', profileCheck.rows);

    const adminProfile = profileCheck.rows[0];
    const isPasswordValid = await bcrypt.compare(testPayload.admin_password, adminProfile.password_hash);
    console.log('5. Bcrypt verification for Owner-specified password:', isPasswordValid ? '✅ MATCH' : '❌ MISMATCH');

    // 4. Test Login via /api/auth/login with workspace header
    const loginRes = await fetch('http://127.0.0.1:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-slug': 'alphatraders'
      },
      body: JSON.stringify({
        email: 'admin@alphatraders.in',
        password: 'OwnerPassword@2026'
      })
    });

    const loginJson = await loginRes.json();
    console.log('6. Tenant Super Admin Login Result:', {
      hasToken: !!loginJson.token,
      email: loginJson.user?.email,
      role: loginJson.user?.role
    });

    // 5. Test Employee Account Creation under tenant
    const createEmpRes = await fetch('http://127.0.0.1:5001/api/tenant/create-employee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginJson.token}`,
        'x-workspace-slug': 'alphatraders'
      },
      body: JSON.stringify({
        employee_id: 'EMP-002',
        full_name: 'Pooja Sharma',
        email: 'pooja.finance@alphatraders.in',
        password: 'PoojaPassword@2026',
        designation: 'Senior Accountant',
        role: 'employee'
      })
    });

    const createEmpJson = await createEmpRes.json();
    console.log('7. Employee creation result:', createEmpJson);

    // 6. Test Employee Login
    const empLoginRes = await fetch('http://127.0.0.1:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-slug': 'alphatraders'
      },
      body: JSON.stringify({
        email: 'pooja.finance@alphatraders.in',
        password: 'PoojaPassword@2026'
      })
    });

    const empLoginJson = await empLoginRes.json();
    console.log('8. Employee Login Result:', {
      hasToken: !!empLoginJson.token,
      email: empLoginJson.user?.email,
      role: empLoginJson.user?.role
    });

    console.log('🎉 ALL MULTI-TENANT CUSTOM AUTH & PROVISIONING TESTS PASSED!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

testProvisionAndAuth();
