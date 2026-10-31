const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/vyarahr_db' });
  await c.connect();

  const res = await c.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'");
  for (const r of res.rows) {
    const s = r.schema_name;
    try {
      await c.query(`
        ALTER TABLE "${s}".profiles 
          ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
          ADD COLUMN IF NOT EXISTS mobile VARCHAR(32),
          ADD COLUMN IF NOT EXISTS dob DATE,
          ADD COLUMN IF NOT EXISTS address TEXT,
          ADD COLUMN IF NOT EXISTS bank_name VARCHAR(128),
          ADD COLUMN IF NOT EXISTS bank_account VARCHAR(64),
          ADD COLUMN IF NOT EXISTS ifsc VARCHAR(32),
          ADD COLUMN IF NOT EXISTS pan VARCHAR(32),
          ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(64),
          ADD COLUMN IF NOT EXISTS avatar_url TEXT,
          ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
      `);
      console.log(`Schema ${s}.profiles updated successfully.`);
    } catch (e) {
      console.log(`Notice on ${s}:`, e.message);
    }
  }

  await c.end();
  console.log('All schemas updated.');
}

run().catch(console.error);
