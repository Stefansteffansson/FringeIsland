#!/usr/bin/env node
/**
 * Apply ONE migration file from supabase/migrations/ to a project, via the
 * Supabase management API (database/query endpoint).
 *
 * ADR-U053 §2 — the schema gate runs twice, test first:
 *   node scripts/apply-migration.js <file>                              # test project (default)
 *   ALLOW_PRODUCTION=1 node scripts/apply-migration.js --production <file>   # the production leg, on the named approval
 *
 * Step 3 of the migration procedure in docs/platform/CLAUDE.md — always pair it
 * with step 4, `bash supabase-cli.sh migration repair --status applied <ts>`
 * on the SAME project, so the applied history records what this script
 * applied; then `node scripts/migration-drift.js` proves test = production =
 * files. The schema gate applies to everything it applies (schema tasks land
 * at `review`).
 *
 * The fuse (scripts/lib/target.js): without --production this cannot reach
 * production; with --production it still refuses unless ALLOW_PRODUCTION=1.
 * Renamed from apply-migration-temp.js on 2026-09-05 (COR-E W5, Audit V AC5-9).
 * Registry: scripts/README.md.
 */

const fs = require('fs');
const path = require('path');
const { loadTarget } = require('./lib/target');

const args = process.argv.slice(2);
const migrationFile = args.find((a) => !a.startsWith('--'));
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js [--production] <migration-filename>');
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

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(`Applying migration: ${migrationFile}`);
console.log(`Target: ${target.target} (${projectRef}) via ${path.basename(target.envFile)}`);

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
    console.log(`\nNext: bash supabase-cli.sh migration repair --status applied ${migrationFile.slice(0, 14)} --project-ref ${projectRef}`);
  })
  .catch(e => {
    console.error('Fetch error:', e);
    process.exit(1);
  });
