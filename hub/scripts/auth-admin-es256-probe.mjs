#!/usr/bin/env node
/**
 * TASK-INT-01 — Auth Admin-API ES256 flake probe.
 *
 * Exercises `auth.admin.createUser` N times in 10-wide waves and counts the
 * "unrecognized JWT kid" / "token is unverifiable" class of failure, so the
 * flake can be measured rather than guessed at.
 *
 * USAGE
 *   npm run probe:auth            # default 90 cycles
 *   npm run probe:auth -- 30      # custom cycle count
 *   node scripts/auth-admin-es256-probe.mjs 60
 *
 * SAFETY (Stefan, 2026-09-04: no test account survives any probe — ever)
 * Creates throwaway users (emails intprobe-...@fringeisland.test) and deletes
 * them. The per-cycle `deleteUser` is NOT enough on its own: the sign-up
 * trigger writes a consent record that RESTRICTs the personal group, so the
 * auth delete can be refused — which is exactly how two runs (2026-09-02 and
 * 2026-09-03) left 180 probe accounts behind. The run therefore ends with a
 * SWEEP in the house order (consent -> auth.users -> orphaned personal groups)
 * through the management API, the same path the integration teardown uses,
 * followed by a CENSUS that fails the run loudly if any intprobe account
 * remains. Needs SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ACCESS_TOKEN from
 * hub/.env.local. It only ever touches intprobe-* users — no app data.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import target from '../../scripts/lib/target.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const g = (k) => (env.match(new RegExp(`^${k}\\s*=\\s*(\\S+)`, 'm')) || [])[1];

const url = g('NEXT_PUBLIC_SUPABASE_URL');
const secret = g('SUPABASE_SERVICE_ROLE_KEY');
const accessToken = g('SUPABASE_ACCESS_TOKEN');
const projectRef = url?.match(/https:\/\/([^.]+)\./)?.[1];
// ADR-U053 §3 — the fuse: the probe creates accounts; never on production.
target.assertNotProduction(url, process.env);
if (!url || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in hub/.env.local');
  process.exit(1);
}
if (!accessToken || !projectRef) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in hub/.env.local — refusing to run: without it the probe cannot sweep its own accounts.');
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Management-API SQL as postgres — the integration teardown's path. */
async function adminSql(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`management API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const N = Number(process.argv[2] || 90);
const WAVE = 10;
const isEs256Flake = (msg) =>
  /unrecognized JWT kid|token is unverifiable/i.test(msg);

async function cycle(i) {
  const email = `intprobe-${Date.now()}-${i}@fringeisland.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'Probe12345!',
    email_confirm: true,
    user_metadata: { display_name: 'Probe', consent_accepted: 'true' },
  });
  if (error) {
    return { ok: false, es256: isEs256Flake(error.message), msg: error.message.slice(0, 80) };
  }
  // Best effort per cycle; the end-of-run sweep is the guarantee.
  const del = await admin.auth.admin.deleteUser(data.user.id);
  return { ok: true, deleteRefused: Boolean(del.error) };
}

let ok = 0, es256 = 0, other = 0, deleteRefused = 0;
const otherMsgs = new Set();
try {
  for (let base = 0; base < N; base += WAVE) {
    const count = Math.min(WAVE, N - base);
    const res = await Promise.all(Array.from({ length: count }, (_, k) => cycle(base + k)));
    for (const r of res) {
      if (r.ok) { ok++; if (r.deleteRefused) deleteRefused++; }
      else if (r.es256) es256++;
      else { other++; otherMsgs.add(r.msg); }
    }
  }
} finally {
  // TEARDOWN — runs even if the probe throws midway.
  await adminSql(`
    DO $$
    BEGIN
      PERFORM set_config('app.consent_erasure_in_progress', 'true', true);
      DELETE FROM public.consent_records cr USING public.users u
       WHERE cr.subject_group_id = u.personal_group_id AND u.email LIKE 'intprobe-%';
      DELETE FROM auth.users WHERE email LIKE 'intprobe-%';
      DELETE FROM public.groups g
       WHERE g.group_type = 'personal'
         AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id);
    END $$;`);
}

const census = await adminSql(`SELECT count(*)::int AS n FROM auth.users WHERE email LIKE 'intprobe-%'`);
const left = Array.isArray(census) && census[0] ? Number(census[0].n) : -1;

const rate = ((es256 / N) * 100).toFixed(1);
console.log('');
console.log(`Auth Admin-API ES256 probe (TASK-INT-01) — ${N} cycles, ${WAVE}-wide waves`);
console.log(`  ok           : ${ok}`);
console.log(`  ES256 flake  : ${es256}  (${rate}%)`);
console.log(`  other errors : ${other}${otherMsgs.size ? '  :: ' + [...otherMsgs].join(' | ') : ''}`);
console.log(`  delete refused per cycle : ${deleteRefused} (swept at the end)`);
console.log(`  teardown     : ${left === 0 ? 'clean — 0 intprobe accounts remain' : `FAILED — ${left} intprobe accounts remain`}`);
console.log('');
console.log(`  Baseline established 2026-07-23: ~5-8% ES256 flake.`);
console.log(
  es256 === 0
    ? '  => 0 flakes this run. If reproducible across a couple of runs, the fix held — safe to remove the test fence.'
    : '  => Flake still present. Keep the decorateAuthAdminError fence; do not close TASK-INT-01.',
);
if (left !== 0) process.exit(1);
