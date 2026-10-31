import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/vyarahr_db' });

async function inspect() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'platform_users'");
  console.log('Columns:', cols.rows);

  const rows = await pool.query("SELECT id, email, full_name, is_active FROM public.platform_users");
  console.log('Rows:', rows.rows);

  await pool.end();
}

inspect().catch(console.error);
