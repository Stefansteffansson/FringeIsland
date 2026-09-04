import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(120_000);

/**
 * FEAT-PC002 amendment — reaper_runs RETENTION (migration 20260904100000).
 * The Mist reaper's run log had no retention rule (7,400 rows by 2026-09-04,
 * ~100 a day, forever). `prune_reaper_runs()` deletes runs older than 30 days
 * and returns the count; cron job `reaper-runs-prune` runs it nightly at 03:45.
 *
 * RED AT HEAD (pre-migration): the function does not exist — PGRST202 for the
 * service role AND for the member (the member cell expects 42501, the grant's
 * refusal, not "not found"); the cron row is absent.
 *
 * LABELLED GREEN (never claimed red): the sibling jobs `mist-reaper` and
 * `telemetry-prune` are present before and after — the pin that this migration
 * adds a job and touches neither.
 */

const OLD_ID = '0c3a1b2e-4d5f-4a6b-8c7d-9e0f1a2b3c4d';
const NEW_ID = '1d4b2c3f-5e60-4b7c-9d8e-0f1a2b3c4d5e';

describe('FEAT-PC002 — reaper_runs retention (prune_reaper_runs + the nightly job)', () => {
  const admin = createAdminClient();
  let member: TestUser;
  let memberC: SupabaseClient;

  beforeAll(async () => {
    member = await createTestUser({ displayName: 'RrrMember' });
    memberC = createTestClient();
    await signInWithRetry(memberC, member.email, member.password);
    // Two synthetic runs: one 31 days old (must go), one a day old (must stay).
    await runAdminSql(`
      INSERT INTO public.reaper_runs (id, ran_at, swept_count, erased_count, skipped_count, outcome)
      VALUES ('${OLD_ID}', now() - interval '31 days', 0, 0, 0, 'success'),
             ('${NEW_ID}', now() - interval '1 day', 0, 0, 0, 'success')
      ON CONFLICT (id) DO UPDATE SET ran_at = EXCLUDED.ran_at;`);
  });

  afterAll(async () => {
    await runAdminSql(`DELETE FROM public.reaper_runs WHERE id IN ('${OLD_ID}', '${NEW_ID}');`).catch(
      () => undefined,
    );
    if (member) await cleanupTestUser(member.user.id).catch(() => undefined);
  });

  it('a member cannot execute prune_reaper_runs — the grant refuses (42501), an operations job is no member door', async () => {
    const { error } = await memberC.rpc('prune_reaper_runs');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('prune_reaper_runs removes runs older than 30 days, keeps the rest, and returns the count', async () => {
    const { data, error } = await admin.rpc('prune_reaper_runs');
    expect(error).toBeNull();
    expect(typeof data).toBe('number');
    expect(data as number).toBeGreaterThanOrEqual(1);

    const { data: rows, error: readErr } = await admin
      .from('reaper_runs')
      .select('id')
      .in('id', [OLD_ID, NEW_ID]);
    expect(readErr).toBeNull();
    expect((rows as Array<{ id: string }>).map((r) => r.id)).toEqual([NEW_ID]);

    const older = await runAdminSql(
      `SELECT count(*)::int AS n FROM public.reaper_runs WHERE ran_at < now() - interval '30 days';`,
    );
    expect(Number(older[0]?.n)).toBe(0);
  });

  it('the reaper-runs-prune cron job is present and scheduled nightly at 03:45', async () => {
    const jobs = (await runAdminSql(
      `SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'reaper-runs-prune';`,
    )) as Array<{ jobname: string; schedule: string; command: string }>;
    expect(jobs.length).toBe(1);
    expect(jobs[0].schedule).toBe('45 3 * * *');
    expect(jobs[0].command).toContain('prune_reaper_runs');
  });

  it('the sibling jobs mist-reaper and telemetry-prune are untouched — labelled green', async () => {
    const jobs = (await runAdminSql(
      `SELECT jobname FROM cron.job WHERE jobname IN ('mist-reaper', 'telemetry-prune') ORDER BY jobname;`,
    )) as Array<{ jobname: string }>;
    expect(jobs.map((j) => j.jobname)).toEqual(['mist-reaper', 'telemetry-prune']);
  });
});
