#!/usr/bin/env node
/**
 * The migration-history drift check (ADR-U053 §2): the test project and
 * production must carry the SAME applied history, and both must equal the
 * files under supabase/migrations/. Exits non-zero on any difference.
 *
 * Read-only on both projects (one catalog query each). It reads production
 * deliberately and explicitly — the fuse is passed ALLOW_PRODUCTION=1 for that
 * single read, scoped to this process.
 *
 * Usage (from the repo root): node scripts/migration-drift.js
 * Run it at the end of every schema gate (docs/platform/CLAUDE.md, migrations).
 *
 * Registry: scripts/README.md.
 */
const fs = require('fs');
const path = require('path');
const { loadTarget, parseEnvFile } = require('./lib/target');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

async function history(ref, accessToken) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "select version from supabase_migrations.schema_migrations order by version" }),
  });
  const body = await res.json();
  if (!res.ok || (body && !Array.isArray(body) && body.error)) throw new Error(`${ref}: ${JSON.stringify(body).slice(0, 300)}`);
  return body.map((r) => r.version);
}

(async () => {
  const test = loadTarget({ target: 'test', env: { ...process.env } });
  const prodEnv = { ...process.env, ALLOW_PRODUCTION: '1' };
  const prod = loadTarget({ target: 'production', env: prodEnv });
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{14}_.*\.sql$/.test(f)).map((f) => f.slice(0, 14)).sort();

  const [t, p] = await Promise.all([history(test.ref, test.accessToken), history(prod.ref, prod.accessToken)]);
  const diff = (a, b) => a.filter((x) => !b.includes(x));
  const rows = [
    ['files → not on test', diff(files, t)],
    ['files → not on production', diff(files, p)],
    ['test → no file', diff(t, files)],
    ['production → no file', diff(p, files)],
    ['test → not on production', diff(t, p)],
    ['production → not on test', diff(p, t)],
  ];
  console.log(`files: ${files.length} · test (${test.ref}): ${t.length} · production (${prod.ref}): ${p.length}`);
  let bad = 0;
  for (const [label, d] of rows) {
    if (d.length) { bad += d.length; console.log(`  ${label}: ${d.length} — ${d.slice(0, 8).join(', ')}${d.length > 8 ? ' …' : ''}`); }
  }
  if (bad) { console.error('\nMIGRATION DRIFT — the histories disagree. The gate is not done until they agree (ADR-U053 §2).'); process.exitCode = 1; }
  console.log('No drift: files = test = production.');
})().catch((e) => { console.error('migration-drift:', e.message); process.exitCode = 1; });
