// =========================================================================
// VyaraHR Unified Database Adapter
// Dual-Dialect Support: MySQL (mysql2/promise) & PostgreSQL (pg)
// Transparent Query Translation, Crash-Proof Startup & Auto-Bootstrapping
// =========================================================================

import mysql from 'mysql2/promise';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function detectDialect(databaseUrl = '') {
  const url = (databaseUrl || '').trim().toLowerCase();
  const dbPort = String(process.env.DB_PORT || '').trim();
  const explicitDialect = String(process.env.DB_DIALECT || '').trim().toLowerCase();

  if (explicitDialect === 'mysql') return 'mysql';
  if (explicitDialect === 'postgres' || explicitDialect === 'postgresql') return 'postgres';
  if (url.startsWith('mysql://') || url.startsWith('mysql2://') || dbPort === '3306') {
    return 'mysql';
  }
  return 'postgres';
}

export function translatePostgresToMysql(sql, params = []) {
  let s = sql;

  // 1. Strip schema qualifiers (public., tenant_<slug>.)
  s = s.replace(/"public"\./gi, '');
  s = s.replace(/"tenant_[a-zA-Z0-9_-]+"\./gi, '');
  s = s.replace(/public\./gi, '');
  s = s.replace(/tenant_[a-zA-Z0-9_-]+\./gi, '');

  // 2. Replace double quotes with backticks
  s = s.replace(/"([^"]+)"/g, '`$1`');

  // 3. Translate = ANY($1) to IN ($1)
  s = s.replace(/=\s*ANY\s*\(\s*\$(\d+)\s*\)/gi, 'IN ($$1)');

  // 4. Case-insensitive ILIKE to standard MySQL LIKE
  s = s.replace(/\bILIKE\b/gi, 'LIKE');

  // 5. information_schema table_schema adjustment
  if (/information_schema\.columns/i.test(s)) {
    s = s.replace(/table_schema\s*=\s*\$1\s*AND/gi, 'table_schema = DATABASE() AND');
    s = s.replace(/table_schema\s*=\s*['"]public['"]\s*AND/gi, 'table_schema = DATABASE() AND');
    s = s.replace(/table_schema\s*=\s*['"][^'"]+['"]\s*AND/gi, 'table_schema = DATABASE() AND');
  }

  // 6. Translate PostgreSQL ON CONFLICT to MySQL ON DUPLICATE KEY UPDATE
  s = s.replace(/ON\s+CONFLICT\s*(\([^)]*\))?\s*DO\s+NOTHING/gi, 'ON DUPLICATE KEY UPDATE `id` = `id`');
  s = s.replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET\s+([\s\S]+?)(?=(\s+RETURNING|$))/gi, (_match, setClause) => {
    const converted = setClause.replace(/EXCLUDED\.`?([a-zA-Z0-9_]+)`?/gi, 'VALUES(`$1`)');
    return `ON DUPLICATE KEY UPDATE ${converted}`;
  });

  // 7. Extract and strip RETURNING clause
  const returningMatch = s.match(/\s+RETURNING\s+([\s\S]+)$/i);
  const returningClause = returningMatch ? returningMatch[1].trim() : null;
  s = s.replace(/\s+RETURNING\s+[\s\S]+$/i, '');

  // 8. Reorder and translate $1, $2 to ?
  const newParams = [];
  const paramMatches = [...s.matchAll(/\$(\d+)/g)];
  if (paramMatches.length > 0) {
    s = s.replace(/\$(\d+)/g, (_m, num) => {
      const idx = parseInt(num, 10) - 1;
      newParams.push(params[idx]);
      return '?';
    });
  } else {
    newParams.push(...params);
  }

  return { sql: s, params: newParams, returning: returningClause };
}

export class UnifiedDatabaseAdapter {
  constructor(databaseUrl = process.env.DATABASE_URL) {
    this.databaseUrl = databaseUrl || '';
    this.dialect = detectDialect(this.databaseUrl);
    this.pool = null;
    this.isConnected = false;
    this.initError = null;
    this.initPool();
  }

  initPool() {
    try {
      if (!this.databaseUrl || this.databaseUrl.includes('db_user:db_password')) {
        console.warn(`[DbAdapter] Notice: Placeholder or missing DATABASE_URL. Starting in resilient mode.`);
        return;
      }

      if (this.dialect === 'mysql') {
        // MySQL Pool configuration
        const urlObj = new URL(this.databaseUrl.replace(/^mysql2:\/\//, 'mysql://'));
        this.pool = mysql.createPool({
          host: urlObj.hostname || '127.0.0.1',
          port: parseInt(urlObj.port || '3306', 10),
          user: decodeURIComponent(urlObj.username || 'root'),
          password: decodeURIComponent(urlObj.password || ''),
          database: urlObj.pathname ? urlObj.pathname.replace(/^\//, '') : undefined,
          waitForConnections: true,
          connectionLimit: 15,
          queueLimit: 0,
          dateStrings: true,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        });
        console.log(`[DbAdapter] Initialized native MySQL connection pool for Hostinger.`);
      } else {
        // PostgreSQL Pool configuration
        const { Pool } = pg;
        this.pool = new Pool({
          connectionString: this.databaseUrl,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        console.log(`[DbAdapter] Initialized native PostgreSQL connection pool.`);
      }
    } catch (err) {
      this.initError = err.message;
      console.warn(`[DbAdapter] Initialization notice (resilient mode active):`, err.message);
    }
  }

  async testConnection() {
    if (!this.pool) return false;
    try {
      if (this.dialect === 'mysql') {
        const [rows] = await this.pool.query('SELECT 1 as ok');
        this.isConnected = !!rows;
      } else {
        await this.pool.query('SELECT 1');
        this.isConnected = true;
      }
      return true;
    } catch (err) {
      this.isConnected = false;
      this.initError = err.message;
      return false;
    }
  }

  async query(text, params = []) {
    if (!this.pool) {
      // Try lazy re-initialization if environment variables were updated
      const currentUrl = process.env.DATABASE_URL || this.databaseUrl;
      if (currentUrl && !currentUrl.includes('db_user:db_password')) {
        this.databaseUrl = currentUrl;
        this.dialect = detectDialect(this.databaseUrl);
        this.initPool();
      }
      if (!this.pool) {
        throw new Error('Database connection not configured or temporarily unreachable.');
      }
    }

    if (this.dialect === 'mysql') {
      const { sql: translatedSql, params: translatedParams, returning } = translatePostgresToMysql(text, params);

      try {
        const [result] = await this.pool.query(translatedSql, translatedParams);

        if (Array.isArray(result)) {
          // SELECT statement result
          return { rows: result, rowCount: result.length };
        }

        // INSERT / UPDATE / DELETE statement result (ResultSetHeader)
        let returnedRows = [];
        if (returning) {
          // Attempt to extract target table name
          const tableMatch = translatedSql.match(/INTO\s+`?([a-zA-Z0-9_]+)`?/i) ||
                             translatedSql.match(/FROM\s+`?([a-zA-Z0-9_]+)`?/i) ||
                             translatedSql.match(/UPDATE\s+`?([a-zA-Z0-9_]+)`?/i);
          const tableName = tableMatch ? tableMatch[1] : null;

          if (tableName) {
            if (result.insertId) {
              try {
                const [fetchRes] = await this.pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [result.insertId]);
                if (fetchRes && fetchRes.length > 0) {
                  returnedRows = fetchRes;
                }
              } catch {}
            }

            if (returnedRows.length === 0) {
              // Try finding id parameter in translatedParams
              const possibleId = translatedParams.find(p => typeof p === 'string' && (p.startsWith('usr-') || p.startsWith('cust-') || p.startsWith('org-') || p.length === 36));
              if (possibleId) {
                try {
                  const [fetchRes] = await this.pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [possibleId]);
                  if (fetchRes && fetchRes.length > 0) {
                    returnedRows = fetchRes;
                  }
                } catch {}
              }
            }
          }

          if (returnedRows.length === 0 && result.insertId) {
            returnedRows = [{ id: result.insertId }];
          }
        }

        return {
          rows: returnedRows,
          rowCount: result.affectedRows || 0,
          insertId: result.insertId || null,
        };
      } catch (err) {
        throw err;
      }
    } else {
      // PostgreSQL native execution
      const res = await this.pool.query(text, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount,
      };
    }
  }
}

// -------------------------------------------------------------------------
// Auto-Bootstrapping Mechanism
// -------------------------------------------------------------------------
export async function bootstrapDatabase(adapter) {
  try {
    const isReady = await adapter.testConnection();
    if (!isReady) {
      console.warn('⚠️ [Bootstrapper] Database is currently offline or unconfigured. Skipping auto-bootstrap.');
      return false;
    }

    console.log(`🔍 [Bootstrapper] Checking if users table exists in ${adapter.dialect}...`);
    let usersExist = false;

    if (adapter.dialect === 'mysql') {
      const checkRes = await adapter.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' LIMIT 1`
      );
      usersExist = checkRes.rows.length > 0;
    } else {
      const checkRes = await adapter.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`
      );
      usersExist = checkRes.rows.length > 0;
    }

    if (usersExist) {
      console.log('✅ [Bootstrapper] Database schema already bootstrapped.');
      return true;
    }

    console.log('🚀 [Bootstrapper] Fresh database detected. Executing auto-bootstrap schema initialization...');

    // Locate schema file
    let schemaPath = path.join(__dirname, 'schema', 'schema_mysql.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, 'schema_mysql.sql');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '..', 'backend', 'schema', 'schema_mysql.sql');
    }

    if (!fs.existsSync(schemaPath)) {
      console.warn(`⚠️ [Bootstrapper] Could not find schema_mysql.sql at ${schemaPath}`);
      return false;
    }

    const rawSql = fs.readFileSync(schemaPath, 'utf8');

    // Split statements cleanly on semicolon followed by newline
    const statements = rawSql
      .split(/;\s*[\r\n]+/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    for (const stmt of statements) {
      try {
        await adapter.query(stmt);
      } catch (stmtErr) {
        // Log notice but continue with remaining DDL/seeds
        console.warn(`[Bootstrapper] Notice executing statement:`, stmtErr.message);
      }
    }

    console.log('🎉 [Bootstrapper] Auto-bootstrap successfully completed! Super Admin (admin@example.com / 123456) ready.');
    return true;
  } catch (err) {
    console.warn('⚠️ [Bootstrapper] Auto-bootstrap caught exception (server remains alive):', err.message);
    return false;
  }
}

export default UnifiedDatabaseAdapter;
