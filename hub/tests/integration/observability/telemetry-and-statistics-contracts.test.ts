import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC018 — telemetry event store & platform statistics (Cycle ADM-A,
 * ADR-U052 §1–§4). WRITTEN RED-FIRST against a substrate with no
 * `telemetry_events` table and no statistics contract; green only after the
 * `20260731180000` migration applies (the schema gate).
 *
 * The four story surfaces:
 *   STORY-1 — durable, NON-FATAL capture (the recorder never raises; the
 *             deny-all table has exactly two doors);
 *   STORY-2 — bounded retention (90-day prune + the pinned cron job);
 *   STORY-3 — the admin-gated computed-on-read statistics document (the
 *             FEAT-H034 payload walk, key for key);
 *   STORY-4 — the Mist rule proven: an actor's rows die with its personal
 *             group (FK CASCADE — the terminal act of every erasure path).
 *
 * Fixture events are namespaced `admatest.*` and swept in afterAll.
 */

jest.setTimeout(120_000);

/** Authenticated DeusEx caller — the house manage_all_groups elevation. */
async function makePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid; v_role uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      SELECT id INTO v_role FROM public.group_roles
        WHERE group_id = v_deusex AND name = 'DeusEx';
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        VALUES (v_deusex, '${personalGroupId}', v_deusex, 'active')
        ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${personalGroupId}', v_deusex, v_role, v_deusex)
        ON CONFLICT DO NOTHING;
    END $$;`);
}

async function demotePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      DELETE FROM public.user_group_roles
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
      DELETE FROM public.group_memberships
        WHERE group_id = v_deusex AND member_group_id = '${personalGroupId}';
    END $$;`).catch(() => undefined);
}

type StatsDoc = {
  version: number;
  generated_at: string;
  members: { total: number; active: number; mists: number };
  groups: { total: number; engagement: number };
  journeys: { active_enrollments: number; completions_30d: number };
  activity_daily: { day: string; count: number }[];
};

describe('FEAT-PC018 — telemetry event store & platform statistics', () => {
  let admin: TestUser;
  let member: TestUser;
  let adminClient: SupabaseClient;
  let memberClient: SupabaseClient;

  beforeAll(async () => {
    admin = await createTestUser({ displayName: 'AdmaStats' });
    member = await createTestUser({ displayName: 'AdmaMember' });
    await makePlatformAdmin(admin.personalGroupId);
    adminClient = createTestClient();
    await signInWithRetry(adminClient, admin.email, admin.password);
    memberClient = createTestClient();
    await signInWithRetry(memberClient, member.email, member.password);
  });

  afterAll(async () => {
    await runAdminSql(
      `DELETE FROM public.telemetry_events WHERE event_name LIKE 'admatest.%';`,
    ).catch(() => undefined);
    await demotePlatformAdmin(admin.personalGroupId);
    await cleanupTestUser(admin.user.id);
    await cleanupTestUser(member.user.id);
  });

  // ---------------------------------------------------------------- STORY-1

  it('S1: the recorder writes one row attributed to the caller, verbatim', async () => {
    const { error } = await memberClient.rpc('record_telemetry_event', {
      p_event_name: 'admatest.demo',
      p_props: { k: 1 },
    });
    expect(error).toBeNull();

    const rows = (await runAdminSql(`
      SELECT actor_group_id, event_name, props, created_at
        FROM public.telemetry_events
       WHERE event_name = 'admatest.demo';
    `)) as unknown as {
      actor_group_id: string;
      event_name: string;
      props: { k: number };
      created_at: string;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_group_id).toBe(member.personalGroupId);
    expect(rows[0].props).toEqual({ k: 1 });
    expect(new Date(rows[0].created_at).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('S1: the recorder never raises — a forced internal failure leaves the caller unharmed', async () => {
    // Force the insert path to fail by hiding the table, then restore it.
    await runAdminSql(`ALTER TABLE public.telemetry_events RENAME TO telemetry_events_hidden;`);
    try {
      const { error } = await memberClient.rpc('record_telemetry_event', {
        p_event_name: 'admatest.swallowed',
      });
      // ADR-U052 §2: an emit failure never fails (or even surfaces to) the caller.
      expect(error).toBeNull();
    } finally {
      await runAdminSql(
        `ALTER TABLE public.telemetry_events_hidden RENAME TO telemetry_events;`,
      );
    }
    const rows = (await runAdminSql(
      `SELECT 1 FROM public.telemetry_events WHERE event_name = 'admatest.swallowed';`,
    )) as unknown as unknown[];
    expect(rows).toHaveLength(0);
  });

  it('S1: anon EXECUTE on the recorder is refused', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('record_telemetry_event', {
      p_event_name: 'admatest.anon',
    });
    expect(error).not.toBeNull();
  });

  it('S1: telemetry_events is deny-all — RLS enabled with zero policies (deliberate, the ds5_config precedent)', async () => {
    const rows = (await runAdminSql(`
      SELECT c.relrowsecurity AS rls,
             (SELECT count(*)::int FROM pg_policies p
               WHERE p.schemaname = 'public' AND p.tablename = 'telemetry_events') AS policies
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'telemetry_events';
    `)) as unknown as { rls: boolean; policies: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].rls).toBe(true);
    expect(rows[0].policies).toBe(0);
  });

  // ---------------------------------------------------------------- STORY-2

  it('S2: the prune deletes only rows older than 90 days and reports the count', async () => {
    await runAdminSql(`
      INSERT INTO public.telemetry_events (event_name, created_at)
      VALUES ('admatest.prune-old', now() - interval '100 days'),
             ('admatest.prune-young', now() - interval '1 day');
    `);
    const pruned = (await runAdminSql(
      `SELECT public.prune_telemetry_events() AS n;`,
    )) as unknown as { n: number }[];
    expect(pruned[0].n).toBeGreaterThanOrEqual(1);

    const left = (await runAdminSql(`
      SELECT event_name FROM public.telemetry_events
       WHERE event_name LIKE 'admatest.prune-%';
    `)) as unknown as { event_name: string }[];
    expect(left.map((r) => r.event_name)).toEqual(['admatest.prune-young']);
  });

  it('S2: the telemetry-prune cron job is present and scheduled — removing it fails red', async () => {
    const rows = (await runAdminSql(`
      SELECT jobname, schedule FROM cron.job WHERE jobname = 'telemetry-prune';
    `)) as unknown as { jobname: string; schedule: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].schedule.trim().length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------- STORY-3

  it('S3: a platform admin reads the walked statistics document; activity moves with fresh events', async () => {
    const first = await adminClient.rpc('get_platform_statistics');
    expect(first.error).toBeNull();
    const doc = first.data as StatsDoc;

    expect(doc.version).toBe(1);
    expect(new Date(doc.generated_at).getTime()).toBeGreaterThan(0);
    for (const k of ['total', 'active', 'mists'] as const) {
      expect(typeof doc.members[k]).toBe('number');
    }
    for (const k of ['total', 'engagement'] as const) {
      expect(typeof doc.groups[k]).toBe('number');
    }
    for (const k of ['active_enrollments', 'completions_30d'] as const) {
      expect(typeof doc.journeys[k]).toBe('number');
    }
    expect(doc.members.total).toBeGreaterThanOrEqual(2); // the two fixtures exist
    expect(doc.groups.total).toBeGreaterThanOrEqual(doc.groups.engagement);
    expect(Array.isArray(doc.activity_daily)).toBe(true);
    expect(doc.activity_daily.length).toBeLessThanOrEqual(31);
    const days = doc.activity_daily.map((d) => d.day);
    expect([...days].sort()).toEqual(days); // ascending, oldest first

    const total = (s: StatsDoc) => s.activity_daily.reduce((a, d) => a + d.count, 0);
    await memberClient.rpc('record_telemetry_event', { p_event_name: 'admatest.tick' });
    await memberClient.rpc('record_telemetry_event', { p_event_name: 'admatest.tick' });
    const second = await adminClient.rpc('get_platform_statistics');
    expect(second.error).toBeNull();
    expect(total(second.data as StatsDoc)).toBeGreaterThanOrEqual(total(doc) + 2);
  });

  it('S3: a non-admin member is refused with the typed 42501', async () => {
    const { data, error } = await memberClient.rpc('get_platform_statistics');
    expect(data).toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('S3: anon EXECUTE on the statistics read is refused', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('get_platform_statistics');
    expect(error).not.toBeNull();
  });

  // ---------------------------------------------------------------- STORY-4

  it('S4: the Mist rule by construction — deleting an actor personal group cascades its telemetry away', async () => {
    // Every erasure path's terminal act deletes the subject's personal group
    // row (_erase_mist / erase_fim_account); the FK edge is what carries the
    // Mist rule for telemetry. Proven with a bare probe group so nothing else
    // is entangled, asserted by count — never inferred from the declaration.
    const probe = (await runAdminSql(`
      INSERT INTO public.groups (name, group_type)
      VALUES ('admatest-cascade-probe', 'personal')
      RETURNING id;
    `)) as unknown as { id: string }[];
    const probeId = probe[0].id;

    await runAdminSql(`
      INSERT INTO public.telemetry_events (actor_group_id, event_name)
      VALUES ('${probeId}', 'admatest.cascade');
    `);
    const before = (await runAdminSql(
      `SELECT 1 FROM public.telemetry_events WHERE actor_group_id = '${probeId}';`,
    )) as unknown as unknown[];
    expect(before).toHaveLength(1);

    await runAdminSql(`DELETE FROM public.groups WHERE id = '${probeId}';`);

    const after = (await runAdminSql(
      `SELECT 1 FROM public.telemetry_events WHERE event_name = 'admatest.cascade';`,
    )) as unknown as unknown[];
    expect(after).toHaveLength(0);
  });
});
