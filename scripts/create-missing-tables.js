#!/usr/bin/env node

/**
 * Creates missing database tables for Bravo revOS
 * Uses Supabase JavaScript SDK with service role authentication
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  console.error('   Make sure .env.local exists with these variables');
  process.exit(1);
}

// Create Supabase client with service role (can execute raw SQL)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: {
    schema: 'public'
  }
});

// Read SQL file with missing tables
const sqlPath = path.join(__dirname, '../migrations/create-missing-tables.sql');
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ SQL file not found: ${sqlPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// Split into statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log('🔧 Creating Missing Tables');
console.log('═'.repeat(70));
console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

async function executeStatements() {
  let successCount = 0;
  let failureCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    try {
      // Use rpc function to execute raw SQL
      // First, we need to create a function that can execute raw SQL
      // OR use the REST API rpc endpoint with a prepared function

      // Actually, Supabase doesn't allow raw SQL via JavaScript SDK client
      // We need to use the service role for this
      // Let's make a direct HTTP request instead

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_sql_execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql: stmt })
      });

      if (response.ok) {
        const data = await response.json();

        // Extract what was created
        if (stmt.includes('CREATE TABLE')) {
          const match = stmt.match(/public\.(\w+)\s*\(/);
          if (match) {
            console.log(`   ✅ Table "${match[1]}" created`);
          }
        } else if (stmt.includes('CREATE INDEX')) {
          const match = stmt.match(/idx_(\w+)/);
          if (match) {
            console.log(`   ✅ Index "idx_${match[1]}" created`);
          }
        } else if (stmt.includes('ALTER TABLE')) {
          const match = stmt.match(/public\.(\w+)/);
          if (match) {
            console.log(`   ✅ RLS enabled on "${match[1]}"`);
          }
        } else if (stmt.includes('CREATE POLICY')) {
          const match = stmt.match(/"([^"]+)"/);
          if (match) {
            console.log(`   ✅ Policy "${match[1]}" created`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed`);
        }
        successCount++;
      } else {
        const errorText = await response.text();
        errors.push(`Statement ${i + 1}: ${errorText.substring(0, 100)}`);
        failureCount++;
      }
    } catch (err) {
      errors.push(`Statement ${i + 1}: ${err.message}`);
      failureCount++;
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 Results: ✅ ${successCount} created, ⚠️  ${failureCount} failed\n`);

  if (errors.length > 0) {
    console.log('❌ Errors encountered:');
    errors.forEach(err => console.log(`   ${err}`));
  }

  return failureCount === 0;
}

executeStatements()
  .then(success => {
    if (!success) {
      console.error('\n⚠️  Some statements failed. This may be OK if tables already exist.');
      console.error('Run: npm run db:verify to check current state');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  });
