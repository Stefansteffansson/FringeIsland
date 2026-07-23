/**
 * Auth Admin-API ES256 flake probe — TASK-INT-01.
 *
 * WHAT IT DOES
 * Runs N concurrent create-then-delete cycles against the Supabase Admin API
 * using this project's `sb_secret_*` service key, and reports how many hit the
 * intermittent kid-less-JWT rejection:
 *   "unrecognized JWT kid <nil> for algorithm ES256"
 *
 * WHY IT EXISTS
 * This is the measuring stick for the flake escalated to Supabase support
 * (ticket filed 2026-07-23). The baseline it established is ~5-8% failures.
 * When Supabase ships a fix or advises retiring the legacy HS256 secret, run
 * this again and compare: the flake is resolved only when the ES256-flake
 * count reaches 0 across a couple of runs. Do NOT remove the
 * `decorateAuthAdminError` fence in tests/helpers/supabase.ts until it does.
 *
 * HOW TO RUN
 *   cd hub
 *   npm run probe:auth            # default 90 cycles
 *   npm run probe:auth -- 30      # custom cycle count
 *   node scripts/auth-admin-es256-probe.mjs 60
 *
 * SAFETY
 * Creates and immediately deletes throwaway users (emails
 * intprobe-...@fringeisland.test), exactly as the integration suite does in
 * setup/teardown. Nothing persists. It uses SUPABASE_SERVICE_ROLE_KEY from
 * hub/.env.local. It only ever touches auth test users — no app data.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const g = (k) => (env.match(new RegExp(`^${k}\\s*=\\s*(\\S+)`, 'm')) || [])[1];

const url = g('NEXT_PUBLIC_SUPABASE_URL');
const secret = g('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in hub/.env.local');
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  await admin.auth.admin.deleteUser(data.user.id);
  return { ok: true };
}

let ok = 0, es256 = 0, other = 0;
const otherMsgs = new Set();
for (let base = 0; base < N; base += WAVE) {
  const count = Math.min(WAVE, N - base);
  const res = await Promise.all(Array.from({ length: count }, (_, k) => cycle(base + k)));
  for (const r of res) {
    if (r.ok) ok++;
    else if (r.es256) es256++;
    else { other++; otherMsgs.add(r.msg); }
  }
}

const rate = ((es256 / N) * 100).toFixed(1);
console.log('');
console.log(`Auth Admin-API ES256 probe (TASK-INT-01) — ${N} cycles, ${WAVE}-wide waves`);
console.log(`  ok           : ${ok}`);
console.log(`  ES256 flake  : ${es256}  (${rate}%)`);
console.log(`  other errors : ${other}${otherMsgs.size ? '  :: ' + [...otherMsgs].join(' | ') : ''}`);
console.log('');
console.log(`  Baseline established 2026-07-23: ~5-8% ES256 flake.`);
console.log(
  es256 === 0
    ? '  => 0 flakes this run. If reproducible across a couple of runs, the fix held — safe to remove the test fence.'
    : '  => Flake still present. Keep the decorateAuthAdminError fence; do not close TASK-INT-01.',
);
