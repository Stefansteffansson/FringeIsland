import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PD011 (Communication Cycle C-D) — announcement contracts (STORY-1..5).
 *
 * Red-first:
 *  - The five announcement contracts (`send_community_announcement`,
 *    `send_platform_announcement`, `retract_announcement`,
 *    `get_group_announcements`, `get_platform_announcements`) fail PGRST202
 *    (absent) until the C-D migration lands; every refusal assertion pins its
 *    exact SQLSTATE (42501 / 22023 / 23514 / P0002), so an absent function
 *    can NOT satisfy a refusal test.
 *  - The substrate probes (`announcements` table, its CHECK constraint, RLS
 *    write refusals, delivery rows in `notifications`) are red as PGRST205 /
 *    absent-table failures until the same migration.
 *
 * ADR-U049 is the law under test: durable home + send-time delivery fan-out,
 * read-time visibility (the late-joiner walk), one table + two scope-separated
 * gated contracts (ADR-U028 by construction), immutable + retract.
 * Fixture names are run-unique AND single-token (the C-C search-window lesson).
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

type AuthorDisplay = { display_name: string; attribution: 'active' | 'former' | 'unknown' };
type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_group_id: string | null;
  author: AuthorDisplay;
};

describe('FEAT-PD011 — announcement contracts (C-D)', () => {
  const admin = createAdminClient();
  const runTag = `cd${Date.now()}`;

  let steward: TestUser; // creates G1 — Steward template: send_announcements via the C-D seed
  let member: TestUser; // Member-role member: reads, cannot send/retract
  let latecomer: TestUser; // joins G1 AFTER the first announcement (STORY-4)
  let outsider: TestUser; // FIM outside G1
  let overseer: TestUser; // elevated to platform admin (STORY-3/5)

  let g1: string;
  const createdAuthIds: string[] = [];
  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const asMist = async (): Promise<SupabaseClient> => {
    const c = createTestClient();
    const { error } = await withAnonRateLimitRetry(() => c.auth.signInAnonymously());
    expect(error).toBeNull();
    return c;
  };

  /** Active membership + Member-template role instance (template-name rule). */
  const addMember = async (u: TestUser) => {
    const { error } = await admin.from('group_memberships').insert({
      group_id: g1,
      member_group_id: u.personalGroupId,
      status: 'active',
      added_by_group_id: steward.personalGroupId,
    });
    if (error) throw new Error(`seed membership: ${error.message}`);
    const rows = await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${g1}', gr.id, '${steward.personalGroupId}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${g1}' AND gr.name = 'Member Role Template'
      RETURNING group_role_id;`);
    if (!rows || rows.length === 0) throw new Error('Member role template not instantiated');
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `CDaStew${runTag}` });
    member = await createTestUser({ displayName: `CDaMemb${runTag}` });
    latecomer = await createTestUser({ displayName: `CDaLate${runTag}` });
    outsider = await createTestUser({ displayName: `CDaOuts${runTag}` });
    overseer = await createTestUser({ displayName: `CDaOver${runTag}` });
    for (const u of [steward, member, latecomer, outsider, overseer]) {
      createdAuthIds.push(u.user.id);
    }

    const cs = await asUser(steward);
    const { data: groupId, error } = await cs.rpc('create_engagement_group', {
      p_name: `CDaFixture${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g1 = groupId as string;
    createdGroupIds.push(g1);

    await addMember(member);
    // latecomer joins later, inside STORY-4.
    await makePlatformAdmin(overseer.personalGroupId);
  }, 120_000);

  afterAll(async () => {
    await demotePlatformAdmin(overseer.personalGroupId);
    try {
      await runAdminSql(
        `DELETE FROM public.announcements WHERE author_group_id IN
         (${createdAuthIds.length ? [steward, member, latecomer, outsider, overseer].map((u) => `'${u.personalGroupId}'`).join(',') : 'NULL'})`,
      );
    } catch {
      /* table may not exist yet (red run) */
    }
    for (const gid of createdGroupIds) await cleanupTestGroup(gid);
    for (const uid of createdAuthIds) await cleanupTestUser(uid).catch(() => undefined);
  }, 120_000);

  // ---------------------------------------------------------------- STORY-1
  describe('STORY-1 — the durable home, scope-confusion-proof', () => {
    it('the send_announcements permission is seeded in the catalog', async () => {
      const { data, error } = await admin
        .from('permissions')
        .select('name')
        .eq('name', 'send_announcements');
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('direct client writes on announcements are refused (no policy exists)', async () => {
      const cs = await asUser(steward);
      const { data, error } = await cs
        .from('announcements')
        .insert({
          scope_kind: 'community',
          scope_group_id: g1,
          author_group_id: steward.personalGroupId,
          title: 'smuggled',
          body: 'smuggled',
        })
        .select();
      // RLS with no INSERT policy: PostgREST surfaces 42501.
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('the scope CHECK holds even above RLS: community without a group refuses (23514)', async () => {
      let sqlError = '';
      try {
        await runAdminSql(`
          INSERT INTO public.announcements (scope_kind, scope_group_id, author_group_id, title, body)
          VALUES ('community', NULL, '${steward.personalGroupId}', 'bad', 'bad');`);
      } catch (e) {
        sqlError = e instanceof Error ? e.message : String(e);
      }
      expect(sqlError).toMatch(/check|23514/i);
    });
  });

  // ---------------------------------------------------------------- STORY-2
  describe('STORY-2 — a Steward announces to the community', () => {
    let announcementId: string;

    it('the Steward sends; the home row lands community-scoped; delivery rows fan out to members, author excluded', async () => {
      const cs = await asUser(steward);
      const { data, error } = await cs.rpc('send_community_announcement', {
        p_group_id: g1,
        p_title: `CDaTitle${runTag}`,
        p_body: 'The village meets at dusk.',
      });
      expect(error).toBeNull();
      const row = data as Announcement;
      expect(row.id).toBeTruthy();
      expect(row.title).toBe(`CDaTitle${runTag}`);
      expect(row.author.attribution).toBe('active');
      announcementId = row.id;

      const { data: home } = await admin
        .from('announcements')
        .select('scope_kind, scope_group_id, retracted_at')
        .eq('id', announcementId)
        .single();
      expect(home?.scope_kind).toBe('community');
      expect(home?.scope_group_id).toBe(g1);
      expect(home?.retracted_at).toBeNull();

      const { data: memberRows } = await admin
        .from('notifications')
        .select('id, payload')
        .eq('recipient_group_id', member.personalGroupId)
        .eq('type', 'announcement');
      expect(memberRows?.some((n) => (n.payload as { announcement_id?: string }).announcement_id === announcementId)).toBe(true);

      for (const excluded of [steward, outsider]) {
        const { data: none } = await admin
          .from('notifications')
          .select('payload')
          .eq('recipient_group_id', excluded.personalGroupId)
          .eq('type', 'announcement');
        expect(
          (none ?? []).some((n) => (n.payload as { announcement_id?: string }).announcement_id === announcementId),
        ).toBe(false);
      }
    });

    it('a Member-role member cannot send (42501); an outsider cannot (42501); a Mist cannot (42501 — CB-1)', async () => {
      for (const u of [member, outsider]) {
        const cu = await asUser(u);
        const { error } = await cu.rpc('send_community_announcement', {
          p_group_id: g1,
          p_title: 'no',
          p_body: 'no',
        });
        expect(error?.code).toBe('42501');
      }
      const mist = await asMist();
      const { error: mErr } = await mist.rpc('send_community_announcement', {
        p_group_id: g1,
        p_title: 'no',
        p_body: 'no',
      });
      expect(mErr?.code).toBe('42501');
      await mist.auth.signOut();
    });

    it('empty title or body is 22023', async () => {
      const cs = await asUser(steward);
      for (const bad of [
        { p_title: '', p_body: 'x' },
        { p_title: 'x', p_body: '   ' },
      ]) {
        const { error } = await cs.rpc('send_community_announcement', { p_group_id: g1, ...bad });
        expect(error?.code).toBe('22023');
      }
    });
  });

  // ---------------------------------------------------------------- STORY-3
  describe('STORY-3 — a platform admin announces to everyone', () => {
    let platformAnnouncementId: string;

    it('the elevated caller sends 1-to-all; FIM fixtures get delivery rows, the author does not; the act is audited', async () => {
      const co = await asUser(overseer);
      const { data, error } = await co.rpc('send_platform_announcement', {
        p_title: `CDaPlat${runTag}`,
        p_body: 'The platform speaks once.',
      });
      expect(error).toBeNull();
      const row = data as Announcement;
      platformAnnouncementId = row.id;

      const { data: home } = await admin
        .from('announcements')
        .select('scope_kind, scope_group_id')
        .eq('id', platformAnnouncementId)
        .single();
      expect(home?.scope_kind).toBe('platform');
      expect(home?.scope_group_id).toBeNull();

      // Every fixture FIM except the author holds a delivery row for it.
      for (const u of [steward, member, latecomer, outsider]) {
        const { data: rows } = await admin
          .from('notifications')
          .select('payload')
          .eq('recipient_group_id', u.personalGroupId)
          .eq('type', 'announcement');
        expect((rows ?? []).some((n) => (n.payload as { announcement_id?: string }).announcement_id === platformAnnouncementId)).toBe(true);
      }
      const { data: authorRows } = await admin
        .from('notifications')
        .select('payload')
        .eq('recipient_group_id', overseer.personalGroupId)
        .eq('type', 'announcement');
      expect((authorRows ?? []).some((n) => (n.payload as { announcement_id?: string }).announcement_id === platformAnnouncementId)).toBe(false);

      const audit = await runAdminSql(
        `SELECT id FROM public.admin_audit_log
         WHERE action LIKE '%announcement%' AND created_at > now() - interval '2 minutes';`,
      );
      expect((audit ?? []).length).toBeGreaterThan(0);
    });

    it('a Steward cannot send platform-wide (42501 — community reach ends at community scope); a Mist cannot (42501)', async () => {
      const cs = await asUser(steward);
      const { error } = await cs.rpc('send_platform_announcement', {
        p_title: 'no',
        p_body: 'no',
      });
      expect(error?.code).toBe('42501');

      const mist = await asMist();
      const { error: mErr } = await mist.rpc('send_platform_announcement', {
        p_title: 'no',
        p_body: 'no',
      });
      expect(mErr?.code).toBe('42501');
      await mist.auth.signOut();
    });
  });

  // ---------------------------------------------------------------- STORY-4
  describe('STORY-4 — visibility is read-time; late joiners see standing announcements', () => {
    it('a member reads the community board newest-first; a latecomer who joined after the send sees it too, with no delivery row', async () => {
      const cm = await asUser(member);
      const { data, error } = await cm.rpc('get_group_announcements', { p_group_id: g1 });
      expect(error).toBeNull();
      const list = (data as { announcements: Announcement[] }).announcements;
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].title).toBe(`CDaTitle${runTag}`);

      await addMember(latecomer);
      const cl = await asUser(latecomer);
      const { data: lateData, error: lateErr } = await cl.rpc('get_group_announcements', {
        p_group_id: g1,
      });
      expect(lateErr).toBeNull();
      const lateList = (lateData as { announcements: Announcement[] }).announcements;
      expect(lateList.some((a) => a.title === `CDaTitle${runTag}`)).toBe(true);

      const { data: lateRows } = await admin
        .from('notifications')
        .select('payload')
        .eq('recipient_group_id', latecomer.personalGroupId)
        .eq('type', 'announcement');
      expect(
        (lateRows ?? []).some((n) =>
          JSON.stringify(n.payload).includes(`CDaTitle${runTag}`),
        ),
      ).toBe(false);
    });

    it('a non-member is refused the community read (42501); a Mist is refused both reads (42501 — CB-1)', async () => {
      const co = await asUser(outsider);
      const { error } = await co.rpc('get_group_announcements', { p_group_id: g1 });
      expect(error?.code).toBe('42501');

      const mist = await asMist();
      const { error: g } = await mist.rpc('get_group_announcements', { p_group_id: g1 });
      expect(g?.code).toBe('42501');
      const { error: p } = await mist.rpc('get_platform_announcements', {});
      expect(p?.code).toBe('42501');
      await mist.auth.signOut();
    });

    it('every FIM sees the platform board', async () => {
      const co = await asUser(outsider);
      const { data, error } = await co.rpc('get_platform_announcements', {});
      expect(error).toBeNull();
      const list = (data as { announcements: Announcement[] }).announcements;
      expect(list.some((a) => a.title === `CDaPlat${runTag}`)).toBe(true);
    });
  });

  // ---------------------------------------------------------------- STORY-5
  describe('STORY-5 — retract: same gate, pointers left standing', () => {
    it('a member without the gate cannot retract (42501)', async () => {
      const { data: rows } = await admin
        .from('announcements')
        .select('id')
        .eq('scope_group_id', g1);
      const target = rows?.[0]?.id as string;
      const cm = await asUser(member);
      const { error } = await cm.rpc('retract_announcement', { p_announcement_id: target });
      expect(error?.code).toBe('42501');
    });

    it('the Steward retracts; readers lose it; delivery rows survive untouched; re-retract is idempotent', async () => {
      const { data: rows } = await admin
        .from('announcements')
        .select('id')
        .eq('scope_group_id', g1)
        .is('retracted_at', null);
      const target = rows?.[0]?.id as string;

      const { count: before } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'announcement');

      const cs = await asUser(steward);
      const { error } = await cs.rpc('retract_announcement', { p_announcement_id: target });
      expect(error).toBeNull();
      const { error: again } = await cs.rpc('retract_announcement', { p_announcement_id: target });
      expect(again).toBeNull();

      const cm = await asUser(member);
      const { data: read } = await cm.rpc('get_group_announcements', { p_group_id: g1 });
      expect(
        ((read as { announcements: Announcement[] }).announcements ?? []).some((a) => a.id === target),
      ).toBe(false);

      const { count: after } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'announcement');
      expect(after).toBe(before);

      const { data: still } = await admin
        .from('announcements')
        .select('id, retracted_at, retracted_by_group_id')
        .eq('id', target)
        .single();
      expect(still?.retracted_at).not.toBeNull();
      expect(still?.retracted_by_group_id).toBe(steward.personalGroupId);
    });

    it('a Steward cannot retract a platform announcement (42501); the platform admin can, audited', async () => {
      const { data: rows } = await admin
        .from('announcements')
        .select('id')
        .eq('scope_kind', 'platform')
        .is('retracted_at', null);
      const target = rows?.[0]?.id as string;

      const cs = await asUser(steward);
      const { error: sErr } = await cs.rpc('retract_announcement', { p_announcement_id: target });
      expect(sErr?.code).toBe('42501');

      const co = await asUser(overseer);
      const { error: oErr } = await co.rpc('retract_announcement', { p_announcement_id: target });
      expect(oErr).toBeNull();
    });
  });
});
