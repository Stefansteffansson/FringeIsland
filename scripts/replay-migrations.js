#!/usr/bin/env node
/**
 * Replay the migration chain onto a project, in timestamp order, via the
 * Supabase management API — and record each applied version in
 * `supabase_migrations.schema_migrations` exactly as `supabase migration repair
 * --status applied` would, so `migration list` and the drift check agree.
 *
 * ADR-U053 §1: "Two projects, one migration history. FringeIsland-test is
 * created empty and built from supabase/migrations alone." This is the build.
 * It is idempotent: versions already recorded on the target are skipped, so a
 * re-run after a failure resumes at the failing file.
 *
 * Usage (from the repo root):
 *   node scripts/replay-migrations.js                 # target = test (default)
 *   node scripts/replay-migrations.js --dry-run       # list what would run
 *   node scripts/replay-migrations.js --stop-after=<version>
 *   ALLOW_PRODUCTION=1 node scripts/replay-migrations.js --production   # never needed today: production's history is complete
 *
 * Registry: scripts/README.md.
 */
const fs = require('fs');
const path = require('path');
const { loadTarget } = require('./lib/target');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
// Migrations that cannot execute on an empty project and are recorded as
// applied instead (the `migration repair --status applied` semantics) — each
// with its reason. See the file's $schema-note before adding an entry.
const EXCEPTIONS_PATH = path.join(MIGRATIONS_DIR, 'REPLAY-EXCEPTIONS.json');
const SEEDS_DIR = path.join(__dirname, '..', 'supabase', 'seeds');
const exceptions = fs.existsSync(EXCEPTIONS_PATH) ? JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf8')) : {};
const recordOnly = exceptions.recordOnly || {};
const seedsBefore = exceptions.seedsBefore || {};
const seedsAfterAll = (exceptions.seedsAfterAll && exceptions.seedsAfterAll.seeds) || [];
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const stopAfter = (argv.find((a) => a.startsWith('--stop-after=')) || '').split('=')[1] || null;

const target = loadTarget({ argv: process.argv });
console.log(`Target: ${target.target} (${target.ref}) via ${path.basename(target.envFile)}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function query(sql, attempt = 1) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${target.ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${target.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { message: text }; }
  if (res.status === 429 || /ThrottlerException|Too Many Requests/.test(text)) {
    if (attempt > 6) throw new Error(`management API throttled after ${attempt} attempts`);
    const wait = 2000 * 2 ** (attempt - 1);
    console.log(`  RATE-LIMITED — waiting ${wait / 1000}s`);
    await sleep(wait);
    return query(sql, attempt + 1);
  }
  if (!res.ok || (body && !Array.isArray(body) && body.error)) {
    throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 1500)}`);
  }
  return body;
}

(async () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{14}_.*\.sql$/.test(f)).sort();
  console.log(`Migration files: ${files.length} (${files[0]} … ${files[files.length - 1]})`);

  await query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
  const applied = new Set((await query('select version from supabase_migrations.schema_migrations')).map((r) => r.version));
  console.log(`Already recorded on target: ${applied.size}`);

  let done = 0;
  for (const file of files) {
    const version = file.slice(0, 14);
    const name = file.slice(15).replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    if (dryRun) { console.log(`  would ${recordOnly[version] ? 'RECORD (not execute)' : 'apply'} ${file}`); continue; }
    const t0 = Date.now();
    if (recordOnly[version]) {
      await query(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name.replace(/'/g, "''")}') on conflict (version) do nothing`);
      console.log(`  recorded ${file} (not executed — REPLAY-EXCEPTIONS: ${String(recordOnly[version].reason).slice(0, 80)}…)`);
      done++;
      continue;
    }
    if (seedsBefore[version]) {
      // The seeds production received by hand before this migration (REPLAY-EXCEPTIONS
      // seedsBefore). Runs only when the anchor is about to be applied, never on resume.
      for (const seed of seedsBefore[version].seeds) {
        process.stdout.write(`  seeding ${seed} (before ${version}) … `);
        try {
          await query(fs.readFileSync(path.join(SEEDS_DIR, seed), 'utf8'));
          console.log('ok');
        } catch (e) {
          console.log('FAILED');
          console.error(`\nseed ${seed} failed:\n${e.message}\n`);
          process.exit(1);
        }
      }
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`  applying ${file} … `);
    try {
      await query(sql);
    } catch (e) {
      console.log('FAILED');
      console.error(`\n${file} failed:\n${e.message}\n`);
      console.error(`Applied ${done} new migration(s) before the failure; the target's history stops at the last recorded version. Fix forward (a new migration, never an edit), then re-run — this script resumes.`);
      process.exit(1);
    }
    await query(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name.replace(/'/g, "''")}') on conflict (version) do nothing`);
    console.log(`ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    done++;
    if (stopAfter && version >= stopAfter) { console.log(`Stopping after ${version} as asked.`); break; }
  }
  const final = await query('select count(*)::int as n, max(version) as last from supabase_migrations.schema_migrations');
  console.log(`\nDone. Applied ${done} new; target history now ${final[0].n} versions, last ${final[0].last}.`);
  if (!dryRun && final[0].n === files.length) {
    // The idempotent post-chain seeds (REPLAY-EXCEPTIONS seedsAfterAll).
    for (const seed of seedsAfterAll) {
      process.stdout.write(`  seeding ${seed} (after the chain) … `);
      try { await query(fs.readFileSync(path.join(SEEDS_DIR, seed), 'utf8')); console.log('ok'); }
      catch (e) { console.log('FAILED'); console.error(`\nseed ${seed} failed:\n${e.message}\n`); process.exit(1); }
    }
  }
})().catch((e) => { console.error('replay-migrations:', e.message); process.exit(1); });
