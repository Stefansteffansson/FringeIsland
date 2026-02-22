#!/usr/bin/env node
/**
 * Run an arbitrary SQL file against the Supabase management API.
 * Usage: node scripts/run-sql.js <path-to-sql-file>
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node run-sql.js <path-to-sql-file>');
  process.exit(1);
}

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

// Resolve path relative to cwd if not absolute
const resolvedPath = path.isAbsolute(sqlFile) ? sqlFile : path.resolve(process.cwd(), sqlFile);
const sql = fs.readFileSync(resolvedPath, 'utf8');

console.log(`Running SQL: ${path.basename(resolvedPath)}`);
console.log(`Project: ${projectRef}`);
console.log(`SQL length: ${sql.length} chars`);

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
      const errors = d.filter(item => item.error);
      console.error('Query Error(s):');
      errors.forEach(e => console.error('  -', e.error));
      process.exit(1);
    }
    console.log('SQL executed successfully!');
    if (Array.isArray(d)) {
      console.log(`${d.length} statement(s) executed.`);
    }
  })
  .catch(e => {
    console.error('Fetch error:', e);
    process.exit(1);
  });
