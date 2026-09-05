#!/usr/bin/env node
/**
 * Apply ONE migration file from supabase/migrations/ to the project named by
 * .env.local, via the Supabase management API (database/query endpoint).
 *
 * Step 3 of the migration procedure in docs/platform/CLAUDE.md — always pair it
 * with step 4, `bash supabase-cli.sh migration repair --status applied <ts>`,
 * so the project's applied history records what this script applied. The
 * schema gate applies to everything it applies (schema tasks land at `review`).
 *
 * Renamed from apply-migration-temp.js on 2026-09-05 (COR-E W5, Audit V AC5-9):
 * it had been the canonical apply path since 2026-02 and was never temporary.
 * Registry: scripts/README.md.
 *
 * Usage: node scripts/apply-migration.js <migration-filename>
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-filename>');
  process.exit(1);
}

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(`Applying migration: ${migrationFile}`);
console.log(`Project: ${projectRef}`);

fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})
  .then(r => r.json())
  .then(d => {
    if (d.error) {
      console.error('API Error:', JSON.stringify(d, null, 2));
      process.exit(1);
    }
    if (Array.isArray(d) && d.some(item => item.error)) {
      console.error('Query Error:', JSON.stringify(d, null, 2));
      process.exit(1);
    }
    console.log('Migration applied successfully!');
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => {
    console.error('Fetch error:', e);
    process.exit(1);
  });
