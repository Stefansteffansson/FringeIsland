#!/usr/bin/env node
/**
 * Run an arbitrary SQL file against a project via the Supabase management API.
 *
 *   node scripts/run-sql.js <path-to-sql-file>                              # test project (default)
 *   ALLOW_PRODUCTION=1 node scripts/run-sql.js --production <path-to-sql-file>   # production, named on purpose
 *
 * It does whatever the file says. Use it for read-only investigation or a
 * reviewed one-off corrective — never as a side door around a migration. The
 * fuse (scripts/lib/target.js) keeps it off production unless ALLOW_PRODUCTION=1
 * names the intent (ADR-U053 §3). Registry: scripts/README.md.
 */

const fs = require('fs');
const path = require('path');
const { loadTarget } = require('./lib/target');

const args = process.argv.slice(2);
const sqlFile = args.find((a) => !a.startsWith('--'));
if (!sqlFile) {
  console.error('Usage: node scripts/run-sql.js [--production] <path-to-sql-file>');
  process.exit(1);
}

let target;
try {
  target = loadTarget({ argv: process.argv });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const projectRef = target.ref;
const accessToken = target.accessToken;

// Resolve path relative to cwd if not absolute
const resolvedPath = path.isAbsolute(sqlFile) ? sqlFile : path.resolve(process.cwd(), sqlFile);
const sql = fs.readFileSync(resolvedPath, 'utf8');

console.log(`Running SQL: ${path.basename(resolvedPath)}`);
console.log(`Target: ${target.target} (${projectRef})`);
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
