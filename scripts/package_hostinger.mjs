// =========================================================================
// VyaraHR Hostinger Automated Packaging Script
// Compiles frontend, consolidates production artifacts into flat bundle,
// and generates ready-to-upload app-hostinger.zip archive.
// =========================================================================

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BUNDLE_DIR = path.join(ROOT_DIR, 'bundle');
const ZIP_OUTPUT = path.join(ROOT_DIR, 'app-hostinger.zip');

function logStep(msg) {
  console.log(`\n📦 [Hostinger Packager] ${msg}`);
}

async function packageForHostinger() {
  const startTime = Date.now();
  console.log('===========================================================');
  console.log('🚀 Starting Hostinger Single-Service Deployment Packaging');
  console.log('===========================================================');

  // 1. Build Frontend
  logStep('Step 1/5: Compiling frontend SPA bundle via "npm run build"...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✅ Frontend compiled successfully.');
  } catch (err) {
    console.error('❌ Frontend compilation failed:', err.message);
    process.exit(1);
  }

  const frontendDist = path.join(ROOT_DIR, 'frontend', 'dist');
  if (!fs.existsSync(frontendDist)) {
    console.error(`❌ Build output missing at: ${frontendDist}`);
    process.exit(1);
  }

  // 2. Clean & Prepare bundle directory
  logStep('Step 2/5: Preparing clean bundle/ staging directory...');
  if (fs.existsSync(BUNDLE_DIR)) {
    fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });

  // 3. Copy files into flat bundle structure
  logStep('Step 3/5: Assembling flat production structure...');

  // A. server.js (main entry point)
  const serverSource = path.join(ROOT_DIR, 'backend', 'server.mjs');
  const serverDest = path.join(BUNDLE_DIR, 'server.js');
  fs.copyFileSync(serverSource, serverDest);
  console.log('  -> Copied server.js');

  // B. dbAdapter.mjs (unified database adapter)
  const dbAdapterSource = path.join(ROOT_DIR, 'backend', 'dbAdapter.mjs');
  const dbAdapterDest = path.join(BUNDLE_DIR, 'dbAdapter.mjs');
  fs.copyFileSync(dbAdapterSource, dbAdapterDest);
  console.log('  -> Copied dbAdapter.mjs');

  // C. schema_mysql.sql (Hostinger MySQL schema + seeds)
  const schemaSource = path.join(ROOT_DIR, 'backend', 'schema', 'schema_mysql.sql');
  const schemaDest = path.join(BUNDLE_DIR, 'schema_mysql.sql');
  fs.copyFileSync(schemaSource, schemaDest);
  console.log('  -> Copied schema_mysql.sql');

  // D. Copy services directory (mailer.mjs) if present
  const servicesSource = path.join(ROOT_DIR, 'backend', 'services');
  if (fs.existsSync(servicesSource)) {
    const servicesDest = path.join(BUNDLE_DIR, 'services');
    fs.cpSync(servicesSource, servicesDest, { recursive: true });
    console.log('  -> Copied services/ directory (mailer)');
  }

  // E. dist/ (Compiled frontend static SPA)
  const distDest = path.join(BUNDLE_DIR, 'dist');
  fs.cpSync(frontendDist, distDest, { recursive: true });
  console.log('  -> Copied dist/ static frontend');

  // F. package.json (Production-only dependencies)
  const prodPackageJson = {
    name: 'vyarahr-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    main: 'server.js',
    scripts: {
      start: 'node server.js'
    },
    dependencies: {
      bcryptjs: '^3.0.3',
      cors: '^2.8.6',
      dotenv: '^18.0.6',
      express: '^5.2.1',
      jsonwebtoken: '^9.0.3',
      multer: '^2.4.0',
      mysql2: '^3.12.0',
      nodemailer: '^10.0.16',
      pg: '^8.23.1'
    },
    engines: {
      node: '>=18.0.0'
    }
  };
  fs.writeFileSync(
    path.join(BUNDLE_DIR, 'package.json'),
    JSON.stringify(prodPackageJson, null, 2),
    'utf8'
  );
  console.log('  -> Generated production package.json');

  // G. .env (Safe default pre-filled configuration)
  const defaultEnv = `# =============================================================================
# VyaraHR Hostinger Production Environment Configuration
# =============================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=production_secret_key_change_me_2026

# Hostinger Native MySQL Connection String
# Format: mysql://<username>:<password>@127.0.0.1:3306/<database_name>
DATABASE_URL=mysql://db_user:db_password@127.0.0.1:3306/db_name

# Optional SMTP Mailer (Leave empty to log emails to console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
`;
  fs.writeFileSync(path.join(BUNDLE_DIR, '.env'), defaultEnv, 'utf8');
  console.log('  -> Generated deployment .env with safe defaults');

  // Also sync root server files for convenient local testing
  fs.copyFileSync(serverSource, path.join(ROOT_DIR, 'server.js'));
  fs.copyFileSync(dbAdapterSource, path.join(ROOT_DIR, 'dbAdapter.mjs'));
  fs.copyFileSync(schemaSource, path.join(ROOT_DIR, 'schema_mysql.sql'));
  if (!fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
    fs.cpSync(frontendDist, path.join(ROOT_DIR, 'dist'), { recursive: true });
  }

  // 4. Archive into app-hostinger.zip
  logStep('Step 4/5: Compressing bundle into app-hostinger.zip...');
  if (fs.existsSync(ZIP_OUTPUT)) {
    fs.unlinkSync(ZIP_OUTPUT);
  }

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(ZIP_OUTPUT);
    
    let archive;
    if (typeof archiver === 'function') {
      archive = archiver('zip', { zlib: { level: 9 } });
    } else if (archiver.ZipArchive) {
      archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    } else if (archiver.create) {
      archive = archiver.create('zip', { zlib: { level: 9 } });
    } else {
      throw new Error('Could not instantiate archiver zip');
    }

    output.on('close', () => {
      const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ app-hostinger.zip generated successfully (${sizeMb} MB)`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Archive directory contents directly at root of the zip
    archive.directory(BUNDLE_DIR, false);

    archive.finalize();
  });

  // 5. Verification & Summary
  logStep('Step 5/5: Bundle integrity check...');
  const bundleFiles = fs.readdirSync(BUNDLE_DIR);
  console.log('Flat bundle root contents:', bundleFiles);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n===========================================================');
  console.log(`🎉 SUCCESS: Packaging completed in ${duration}s!`);
  console.log(`📦 Deployment archive: ${ZIP_OUTPUT}`);
  console.log('📁 Ready for 1-click upload to Hostinger File Manager!');
  console.log('===========================================================');
}

packageForHostinger().catch((err) => {
  console.error('Fatal packaging error:', err);
  process.exit(1);
});
