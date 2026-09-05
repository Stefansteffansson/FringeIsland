#!/usr/bin/env node
/**
 * Read-only catalog sanity: prints the columns of a handful of core tables on
 * the target project (test by default; `--production` + ALLOW_PRODUCTION=1 for
 * production — read-only, but the fuse still names the intent, ADR-U053 §3).
 * Registry: scripts/README.md.
 */
const { loadTarget } = require('./lib/target');

let target;
try {
  target = loadTarget({ argv: process.argv });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const projectRef = target.ref;
const accessToken = target.accessToken;

async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}

async function main() {
  console.log(`Target: ${target.target} (${projectRef})`);
  const tables = ['users', 'groups', 'group_memberships', 'user_group_roles', 'journey_enrollments', 'conversations'];
  for (const t of tables) {
    const d = await query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${t}' ORDER BY ordinal_position;`);
    console.log(`${t}: ${Array.isArray(d) ? d.map(r => r.column_name).join(', ') : JSON.stringify(d).slice(0, 200)}`);
  }
}
main().catch(console.error);
