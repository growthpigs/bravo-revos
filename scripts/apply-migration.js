#!/usr/bin/env node

/**
 * Apply missing database tables migration to Supabase
 * This script uses the Supabase service role to execute SQL
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '../migrations/create-missing-tables.sql');
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ Migration file not found: ${sqlPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// Split SQL into statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log('🚀 Applying Database Migration');
console.log('═'.repeat(70));
console.log(`📊 Executing ${statements.length} SQL statements\n`);

const url = new URL(`${SUPABASE_URL}/rest/v1/rpc`);

async function executeViaRPC() {
  let completed = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      const response = await new Promise((resolve, reject) => {
        const postData = JSON.stringify({ sql: stmt });
        const options = {
          hostname: url.hostname,
          path: '/rest/v1/rpc/exec_sql',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      if (response.status === 200 || response.status === 201) {
        completed++;
        if (stmt.includes('CREATE TABLE')) {
          const m = stmt.match(/public\.(\w+)/);
          console.log(`   ✅ ${m ? m[1] : 'Table'} created`);
        } else if (stmt.includes('CREATE INDEX')) {
          console.log(`   ✅ Index created`);
        } else if (stmt.includes('ALTER TABLE')) {
          console.log(`   ✅ RLS enabled`);
        } else if (stmt.includes('CREATE POLICY')) {
          console.log(`   ✅ Policy created`);
        } else {
          completed++;
        }
      } else {
        failed++;
        console.log(`   ⚠️  Status ${response.status}: ${response.data.substring(0, 60)}`);
      }
    } catch (err) {
      failed++;
      console.log(`   ⚠️  Error: ${err.message.substring(0, 60)}`);
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ ${completed} statements executed, ⚠️  ${failed} failed\n`);
}

executeViaRPC().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
