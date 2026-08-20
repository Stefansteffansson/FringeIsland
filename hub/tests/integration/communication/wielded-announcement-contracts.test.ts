import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PD019 tranche 3 (TASK-PD019-3) — wielded community-announcement
 * contracts + the FEAT-PD020 interplay proven by cell.
 *
 * Walk findings at pull (spec STORY-5, 2026-08-20): retraction is a role
 * power already (`send_announcements` in scope — no author-right posture
 * needed); the platform arm refuses wielding STRUCTURALLY (NULL scope group
 * fails limb 2a); the wielded send carries dual actor exclusion (A AND the
 * wielder) and a payload `sent_by_group_id = A` (the FIM-visible payload
 * must not leak the person behind the hat).
 *
 * Red-first: every cell passing `p_acting` fails PGRST202 today. Labelled
 * guards (green in the red run): G1 the personal send/read flow; G2 the
 * PD020 expansion for a PERSONAL send (shipped behaviour the wielded path
 * must preserve).
 *
 * Cast: B is the context group; A the represented group (Member instance —
 * no send_announcements: the natural limb-2b negative until granted); D a
 * second engagement-group member of B with key-holder holderD (the
 * expansion-proof instrument); wielder holds the key in A and C; C has no
 * standing in B.
 */

jest.setTimeout(180_000);

describe('FEAT-PD019 T3 — wielded announcements (two-limb gate + the PD020 interplay)', () => {
  const runTag = Math.random().toString(36).slice(2, 8);
  const admin = createAdminClient();

  let stewardB: TestUser;
  let stewardA: TestUser;
  let steward2: TestUser;
  let wielder: TestUser;
  let keyless: TestUser;
  let memberB: TestUser;
  let holderD: TestUser;

  let gB: string;
  let gA: string;
  let gC: string;
  let gD: string;
  let gAName: string;
  let platformAnnouncementId: string | null = null;

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

  const addPersonMember = async (u: TestUser, groupId: string, by: string) => {
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupId}', '${u.personalGroupId}', '${by}', 'active');
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${groupId}', gr.id, '${by}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${groupId}' AND gr.name = 'Member Role Template';`);
  };

  const addGroupMember = async (memberGroupId: string, hostId: string, addedBy: string) => {
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${hostId}', '${memberGroupId}', '${addedBy}', 'invited');
      UPDATE public.group_memberships SET status = 'active'
      WHERE group_id = '${hostId}' AND member_group_id = '${memberGroupId}';`);
  };

  const grantActAsGroup = async (u: TestUser, groupId: string, roleName: string, by: string) => {
    await runAdminSql(`
      WITH r AS (
        INSERT INTO public.group_roles (group_id, name)
        VALUES ('${groupId}', '${roleName}') RETURNING id
      ), p AS (
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT r.id, perm.id FROM r, public.permissions perm
        WHERE perm.name = 'act_as_group' RETURNING group_role_id
      )
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${groupId}', r.id, '${by}' FROM r;`);
  };

  const notifCount = async (where: string): Promise<number> => {
    const rows = (await runAdminSql(
      `SELECT count(*)::int AS n FROM public.notifications WHERE ${where};`
    )) as Array<{ n: number }>;
    return rows[0].n;
  };

  beforeAll(async () => {
    stewardB = await createTestUser({ displayName: `PDvStwB${runTag}` });
    stewardA = await createTestUser({ displayName: `PDvStwA${runTag}` });
    steward2 = await createTestUser({ displayName: `PDvStw2${runTag}` });
    wielder = await createTestUser({ displayName: `PDvWld${runTag}` });
    keyless = await createTestUser({ displayName: `PDvKey0${runTag}` });
    memberB = await createTestUser({ displayName: `PDvMemB${runTag}` });
    holderD = await createTestUser({ displayName: `PDvHold${runTag}` });

    const cB = await asUser(stewardB);
    const { data: bId, error: bErr } = await cB.rpc('create_engagement_group', {
      p_name: `PDvCtxB${runTag}`,
    });
    if (bErr) throw new Error(`seed B: ${bErr.message}`);
    gB = bId as string;

    const cA = await asUser(stewardA);
    const { data: aId, error: aErr } = await cA.rpc('create_engagement_group', {
      p_name: `PDvRepA${runTag}`,
    });
    if (aErr) throw new Error(`seed A: ${aErr.message}`);
    gA = aId as string;
    gAName = `PDvRepA${runTag}`;

    const c2 = await asUser(steward2);
    const { data: cId, error: cErr } = await c2.rpc('create_engagement_group', {
      p_name: `PDvOutC${runTag}`,
    });
    if (cErr) throw new Error(`seed C: ${cErr.message}`);
    gC = cId as string;
    const { data: dId, error: dErr } = await c2.rpc('create_engagement_group', {
      p_name: `PDvExpD${runTag}`,
    });
    if (dErr) throw new Error(`seed D: ${dErr.message}`);
    gD = dId as string;

    // A and D join B; C stays out. D carries key-holder holderD — the
    // PD020-expansion instrument for the interplay cells.
    await addGroupMember(gA, gB, stewardB.personalGroupId);
    await addGroupMember(gD, gB, stewardB.personalGroupId);
    await addPersonMember(holderD, gD, steward2.personalGroupId);
    await grantActAsGroup(holderD, gD, `PDvHatD${runTag}`, steward2.personalGroupId);

    await addPersonMember(wielder, gA, stewardA.personalGroupId);
    await addPersonMember(keyless, gA, stewardA.personalGroupId);
    await grantActAsGroup(wielder, gA, `PDvHatA${runTag}`, stewardA.personalGroupId);
    await addPersonMember(wielder, gC, steward2.personalGroupId);
    await grantActAsGroup(wielder, gC, `PDvHatC${runTag}`, steward2.personalGroupId);

    await addPersonMember(memberB, gB, stewardB.personalGroupId);
  });

  afterAll(async () => {
    if (platformAnnouncementId) {
      await admin.from('announcements').delete().eq('id', platformAnnouncementId);
    }
    for (const gid of [gA, gC, gD, gB].filter(Boolean)) {
      await admin.from('groups').delete().eq('id', gid);
    }
    for (const u of [stewardB, stewardA, steward2, wielder, keyless, memberB, holderD].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // -------------------------------------------------------------------- read
  it('A1-read: both limbs hold — the wielded board is byte-shaped like a member read', async () => {
    const cB = await asUser(stewardB);
    const { error: seedErr } = await cB.rpc('send_community_announcement', {
      p_group_id: gB,
      p_title: `PDv seed ${runTag}`,
      p_body: 'a member-authored announcement',
    });
    expect(seedErr).toBeNull();

    const cw = await asUser(wielder);
    const { data, error } = await cw.rpc('get_group_announcements', {
      p_group_id: gB,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const rows = (data as { announcements: Array<Record<string, unknown>> }).announcements;
    expect(rows.length).toBeGreaterThan(0);

    const cM = await asUser(memberB);
    const { data: personal } = await cM.rpc('get_group_announcements', { p_group_id: gB });
    const personalRows = (personal as { announcements: Array<Record<string, unknown>> })
      .announcements;
    expect(Object.keys(rows[0]).sort()).toEqual(Object.keys(personalRows[0]).sort());
  });

  it('A1-keyless: 42501 naming the acting limb; A1-nostanding: 42501 naming the membership limb', async () => {
    const ck = await asUser(keyless);
    const { error: keylessErr } = await ck.rpc('get_group_announcements', {
      p_group_id: gB,
      p_acting: gA,
    });
    expect(keylessErr?.code).toBe('42501');
    expect(keylessErr?.message).toMatch(/permission to act as this group/);

    const cw = await asUser(wielder);
    const { error: standErr } = await cw.rpc('get_group_announcements', {
      p_group_id: gB,
      p_acting: gC,
    });
    expect(standErr?.code).toBe('42501');
    expect(standErr?.message).toMatch(/not an active member/);
  });

  // -------------------------------------------------------------------- send
  it('A2-send-neg: A lacks send_announcements — 42501 naming the permission, no row', async () => {
    const cw = await asUser(wielder);
    const { error } = await cw.rpc('send_community_announcement', {
      p_group_id: gB,
      p_title: `PDv refused ${runTag}`,
      p_body: 'should not land',
      p_acting: gA,
    });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/send_announcements/);
    const rows = (await runAdminSql(
      `SELECT count(*)::int AS n FROM public.announcements WHERE title = 'PDv refused ${runTag}';`
    )) as Array<{ n: number }>;
    expect(rows[0].n).toBe(0);
  });

  it('A2-send + the PD020 interplay: author = A; persons hear (payload names A); neither identity of the act hears; zero group-addressed rows survive', async () => {
    await runAdminSql(`
      INSERT INTO public.group_role_permissions (group_role_id, permission_id)
      SELECT gr.id, p.id FROM public.group_roles gr, public.permissions p
      WHERE gr.group_id = '${gB}' AND gr.name = 'Member Role Template'
        AND p.name = 'send_announcements'
      ON CONFLICT DO NOTHING;`);

    const cw = await asUser(wielder);
    const title = `PDv wielded word ${runTag}`;
    const { data, error } = await cw.rpc('send_community_announcement', {
      p_group_id: gB,
      p_title: title,
      p_body: 'the group speaks to the harbour',
      p_acting: gA,
    });
    expect(error).toBeNull();
    expect((data as { author_group_id: string }).author_group_id).toBe(gA);
    expect((data as { author: { display_name: string; kind?: string } }).author).toEqual({
      display_name: gAName,
      attribution: 'active',
      kind: 'group',
    });

    // Person members hear, and the FIM-visible payload names A — never the
    // person behind the hat (the privacy posture carried into fan-out).
    expect(
      await notifCount(
        `title = '${title}' AND recipient_group_id = '${memberB.personalGroupId}'
         AND payload->>'sent_by_group_id' = '${gA}'`,
      ),
    ).toBe(1);
    expect(
      await notifCount(`title = '${title}' AND payload->>'sent_by_group_id' <> '${gA}'`),
    ).toBe(0);

    // Dual actor exclusion: neither A nor the wielder hears its own act.
    expect(await notifCount(`title = '${title}' AND recipient_group_id = '${gA}'`)).toBe(0);
    expect(
      await notifCount(`title = '${title}' AND recipient_group_id = '${wielder.personalGroupId}'`),
    ).toBe(0);

    // The FEAT-PD020 interplay: D's group-addressed row expanded to its
    // key-holder's personal row, and NO group-addressed row survives — the
    // dead-letter class stays retired under wielded authorship.
    expect(
      await notifCount(`title = '${title}' AND recipient_group_id = '${holderD.personalGroupId}'`),
    ).toBe(1);
    expect(
      await notifCount(
        `title = '${title}' AND recipient_group_id IN (
           SELECT g.id FROM public.groups g WHERE g.group_type = 'engagement')`,
      ),
    ).toBe(0);
  });

  // ----------------------------------------------------------------- retract
  it('A3-retract: A retracts under its own send_announcements — retracted_by = A; the board no longer serves it', async () => {
    const cw = await asUser(wielder);
    const title = `PDv wielded word ${runTag}`;
    const idRows = (await runAdminSql(
      `SELECT id FROM public.announcements WHERE title = '${title}';`
    )) as Array<{ id: string }>;
    const { error } = await cw.rpc('retract_announcement', {
      p_announcement_id: idRows[0].id,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const after = (await runAdminSql(
      `SELECT (retracted_at IS NOT NULL) AS retracted, retracted_by_group_id
       FROM public.announcements WHERE id = '${idRows[0].id}';`
    )) as Array<{ retracted: boolean; retracted_by_group_id: string }>;
    expect(after[0].retracted).toBe(true);
    expect(after[0].retracted_by_group_id).toBe(gA);

    const cM = await asUser(memberB);
    const { data } = await cM.rpc('get_group_announcements', { p_group_id: gB });
    const served = (data as { announcements: Array<{ title: string }> }).announcements;
    expect(served.some((a) => a.title === title)).toBe(false);
  });

  it('A4-platform-arm: a wielded act against a platform announcement refuses 42501 — structurally', async () => {
    // Elevate stewardB briefly to author a platform announcement (the house
    // makePlatformAdmin pattern), demote immediately.
    await runAdminSql(`
      DO $$
      DECLARE v_deusex uuid; v_role uuid;
      BEGIN
        SELECT id INTO v_deusex FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';
        SELECT id INTO v_role FROM public.group_roles WHERE group_id = v_deusex AND name = 'DeusEx';
        INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
          VALUES (v_deusex, '${stewardB.personalGroupId}', v_deusex, 'active')
          ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${stewardB.personalGroupId}', v_deusex, v_role, v_deusex)
          ON CONFLICT DO NOTHING;
      END $$;`);
    try {
      const cB = await asUser(stewardB);
      const { data, error: sendErr } = await cB.rpc('send_platform_announcement', {
        p_title: `PDv platform ${runTag}`,
        p_body: 'platform-wide',
      });
      expect(sendErr).toBeNull();
      platformAnnouncementId = (data as { id: string }).id;
    } finally {
      await runAdminSql(`
        DO $$
        DECLARE v_deusex uuid;
        BEGIN
          SELECT id INTO v_deusex FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';
          DELETE FROM public.user_group_roles
            WHERE member_group_id = '${stewardB.personalGroupId}' AND group_id = v_deusex;
          DELETE FROM public.group_memberships
            WHERE group_id = v_deusex AND member_group_id = '${stewardB.personalGroupId}';
        END $$;`);
    }

    const cw = await asUser(wielder);
    const { error } = await cw.rpc('retract_announcement', {
      p_announcement_id: platformAnnouncementId,
      p_acting: gA,
    });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/not an active member/);
  });

  it('A5-mist: a Mist with p_acting is refused 42501 (FIM-only precedes the limbs)', async () => {
    const cm = await asMist();
    const { error } = await cm.rpc('get_group_announcements', { p_group_id: gB, p_acting: gA });
    expect(error?.code).toBe('42501');
  });

  // LABELLED GUARDS (green in the red run):
  it('G1: the personal read + send flow works unchanged without p_acting (guard)', async () => {
    const cB = await asUser(stewardB);
    const { data, error } = await cB.rpc('send_community_announcement', {
      p_group_id: gB,
      p_title: `PDv personal ${runTag}`,
      p_body: 'a person speaks',
    });
    expect(error).toBeNull();
    expect((data as { author_group_id: string }).author_group_id).toBe(stewardB.personalGroupId);
    const cM = await asUser(memberB);
    const { data: board } = await cM.rpc('get_group_announcements', { p_group_id: gB });
    expect(
      (board as { announcements: Array<{ title: string }> }).announcements.some(
        (a) => a.title === `PDv personal ${runTag}`,
      ),
    ).toBe(true);
  });

  it("G2: a PERSONAL send's PD020 expansion still delivers to D's key-holder with zero group-addressed residue (guard — shipped behaviour)", async () => {
    expect(
      await notifCount(
        `title = 'PDv personal ${runTag}' AND recipient_group_id = '${holderD.personalGroupId}'`,
      ),
    ).toBe(1);
    expect(
      await notifCount(
        `title = 'PDv personal ${runTag}' AND recipient_group_id IN (
           SELECT g.id FROM public.groups g WHERE g.group_type = 'engagement')`,
      ),
    ).toBe(0);
  });
});
