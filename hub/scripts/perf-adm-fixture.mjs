/**
 * Admin-plane measurement fixture — companion to perf-measure.mjs.
 *
 * The admin surfaces need the standing measurement FIM elevated (an active
 * DeusEx system-group membership — what is_platform_admin() checks) and the
 * moderation detail page needs one open report. Target is FABRICATED — the
 * drift-honesty render is a legitimate real read (2026-08-02 gate pass shape).
 *
 * Modes:
 *   up      elevate + seed one open report; prints {userId, personalGroupId, reportId}
 *   down    delete the seeded report(s) + the elevation row — run BEFORE perf-measure teardown
 *   verify  post-teardown residue check; prints {fimUsers, reports, elevations} — all should be 0
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const envPath = process.env.PERF_ENV ?? join(HERE, '..', '.env.local');
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

// ADR-U053 §3 — the fuse (companion to perf-measure.mjs: same PERF_ENV + ALLOW_PRODUCTION=1 for the production pass).
import target from '../../scripts/lib/target.js';
target.assertNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env);

const EMAIL = 'perf-antf@fringeisland.test';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const one = async (q, label) => {
  const { data, error } = await q;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const fim = async () => {
  const rows = await one(db.from('users').select('id, personal_group_id').eq('email', EMAIL), 'fim lookup');
  if (rows.length !== 1) throw new Error(`fim lookup: expected 1 row for ${EMAIL}, got ${rows.length}`);
  return rows[0];
};
const deusex = async () => {
  const rows = await one(
    db.from('groups').select('id').eq('name', 'DeusEx').eq('group_type', 'system'),
    'deusex lookup',
  );
  if (rows.length !== 1) throw new Error(`deusex lookup: expected 1 row, got ${rows.length}`);
  return rows[0].id;
};

const mode = process.argv[2];
if (mode === 'up') {
  const f = await fim();
  const dx = await deusex();
  await one(
    db.from('group_memberships').upsert(
      { group_id: dx, member_group_id: f.personal_group_id, status: 'active' },
      { onConflict: 'group_id,member_group_id' },
    ).select(),
    'elevation upsert',
  );
  const report = await one(
    db.from('content_reports').insert({
      reporter_group_id: f.personal_group_id,
      target_kind: 'message',
      target_id: randomUUID(),
      reason: 'perf-measurement seed (warm investigation, 2026-08-02)',
      details: 'Seeded open report for the ADM warm-ceiling investigation. Fabricated target.',
      content_snapshot: 'perf seed snapshot — fabricated target, drift-honesty render expected',
    }).select('id'),
    'report insert',
  );
  console.log(JSON.stringify({ userId: f.id, personalGroupId: f.personal_group_id, reportId: report[0].id }));
} else if (mode === 'down') {
  const f = await fim();
  const dx = await deusex();
  const reps = await one(
    db.from('content_reports').delete().eq('reporter_group_id', f.personal_group_id).select('id'),
    'report delete',
  );
  const elev = await one(
    db.from('group_memberships').delete().eq('group_id', dx).eq('member_group_id', f.personal_group_id).select('id'),
    'elevation delete',
  );
  console.log(JSON.stringify({ reportsDeleted: reps.length, elevationsDeleted: elev.length }));
} else if (mode === 'verify') {
  // Post-teardown the FIM row itself should be gone; if it somehow survives,
  // count its traces too so the residue is visible in one line.
  const users = await one(db.from('users').select('id').eq('email', EMAIL), 'users count');
  let reports = [];
  let elevations = [];
  if (users.length) {
    const f = await fim();
    const dx = await deusex();
    reports = await one(db.from('content_reports').select('id').eq('reporter_group_id', f.personal_group_id), 'reports count');
    elevations = await one(
      db.from('group_memberships').select('id').eq('group_id', dx).eq('member_group_id', f.personal_group_id),
      'elevations count',
    );
  }
  console.log(JSON.stringify({ fimUsers: users.length, reports: reports.length, elevations: elevations.length }));
} else {
  console.log('usage: node scripts/perf-adm-fixture.mjs up|down|verify');
}
