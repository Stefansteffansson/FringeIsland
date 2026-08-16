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
 * FEAT-PD019 tranche 1 (TASK-PD019-1) — wielded forum contracts + the widened
 * attribution ladder.
 *
 * Red-first:
 *  - Every cell passing `p_acting` fails PGRST202 today (no matching function
 *    signature) — the three forum contracts do not accept an acting group
 *    until the PD019 tranche-1 migration lands. Refusal cells pin exact
 *    SQLSTATE 42501 plus limb-naming copy, so an absent signature can NOT
 *    satisfy them.
 *  - The ladder cells (STORY-3) use direct-inserted group-authored rows where
 *    isolation matters: today `ds5_resolve_author_display`'s identity gate is
 *    personal-only, so an engagement-group author folds to 'Unknown' — red
 *    against the expected `{name, 'active'|'former', kind: 'group'}` objects.
 *  - Person-author cells expect the additive `kind: 'person'` key — red today
 *    (author objects carry no kind).
 *
 * Labelled honestly (genuine greens in the red run — guards, not TDD):
 *  - S1e: the no-acting member read (additive-default regression — the old
 *    named-arg call shape must survive the DROP + CREATE re-issue);
 *  - S3e: sentinel/system-group authors stay rung-3
 *    `{display_name: 'Unknown', attribution: 'unknown'}` byte-identical — the
 *    widened gate admits engagement groups only, and rung 3 carries no `kind`
 *    ('Unknown' claims no kind).
 *
 * Cast: B is the context group; A is the represented engagement group (active
 * member of B via the invited→active auto-role edge — Member instance:
 * view_forum/post/reply); C is an engagement group with NO membership in B
 * (limb-2 standing negative); D is a member of B whose role instance was
 * removed (limb-2 permission negative). The wielder holds `act_as_group` in
 * A, C, and D but is NOT a member of B — the hat is the only door.
 */

jest.setTimeout(180_000);

type AuthorDisplay = {
  display_name: string;
  attribution: 'active' | 'former' | 'unknown';
  kind?: 'person' | 'group';
};
type ForumPost = {
  id: string;
  parent_post_id: string | null;
  content: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_group_id: string;
  author: AuthorDisplay;
  replies: ForumPost[];
};

describe('FEAT-PD019 T1 — wielded forum contracts (two-limb gate) + group-author ladder', () => {
  const runTag = Math.random().toString(36).slice(2, 8);
  const admin = createAdminClient();

  let stewardB: TestUser; // creates B (context group)
  let stewardA: TestUser; // creates A (the represented group)
  let steward2: TestUser; // creates C and D
  let wielder: TestUser; //  act_as_group in A/C/D; NOT a member of B
  let keyless: TestUser; //  member of A without the key (limb-1 negative)
  let memberB: TestUser; //  Member-role person in B (byte-shape + person-author)

  let gB: string;
  let gA: string;
  let gC: string;
  let gD: string;
  let gAName: string;
  let memberBName: string;
  let memberThreadId: string; // person-authored thread in B (reply target)

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

  /** Person joins a group with the Member-template role instance. */
  const addPersonMember = async (u: TestUser, groupId: string, by: string) => {
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupId}', '${u.personalGroupId}', '${by}', 'active');
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${groupId}', gr.id, '${by}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${groupId}' AND gr.name = 'Member Role Template';`);
  };

  /** Group joins a group via the invited→active two-step so the auto-role
   *  edge binds the Member instance exactly as the real join path does. */
  const addGroupMember = async (memberGroupId: string, hostId: string, addedBy: string) => {
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${hostId}', '${memberGroupId}', '${addedBy}', 'invited');
      UPDATE public.group_memberships SET status = 'active'
      WHERE group_id = '${hostId}' AND member_group_id = '${memberGroupId}';`);
  };

  /** A custom role carrying exactly act_as_group, assigned to one person. */
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

  beforeAll(async () => {
    stewardB = await createTestUser({ displayName: `PD19StwB${runTag}` });
    stewardA = await createTestUser({ displayName: `PD19StwA${runTag}` });
    steward2 = await createTestUser({ displayName: `PD19Stw2${runTag}` });
    wielder = await createTestUser({ displayName: `PD19Wld${runTag}` });
    keyless = await createTestUser({ displayName: `PD19Key0${runTag}` });
    memberB = await createTestUser({ displayName: `PD19MemB${runTag}` });

    const cB = await asUser(stewardB);
    const { data: bId, error: bErr } = await cB.rpc('create_engagement_group', {
      p_name: `PD19CtxB${runTag}`,
    });
    if (bErr) throw new Error(`seed B: ${bErr.message}`);
    gB = bId as string;

    const cA = await asUser(stewardA);
    const { data: aId, error: aErr } = await cA.rpc('create_engagement_group', {
      p_name: `PD19RepA${runTag}`,
    });
    if (aErr) throw new Error(`seed A: ${aErr.message}`);
    gA = aId as string;
    gAName = `PD19RepA${runTag}`;

    const c2 = await asUser(steward2);
    const { data: cId, error: cErr } = await c2.rpc('create_engagement_group', {
      p_name: `PD19OutC${runTag}`,
    });
    if (cErr) throw new Error(`seed C: ${cErr.message}`);
    gC = cId as string;
    const { data: dId, error: dErr } = await c2.rpc('create_engagement_group', {
      p_name: `PD19BareD${runTag}`,
    });
    if (dErr) throw new Error(`seed D: ${dErr.message}`);
    gD = dId as string;

    // A and D join B (Member instance via the auto-role edge); C stays out.
    await addGroupMember(gA, gB, stewardB.personalGroupId);
    await addGroupMember(gD, gB, stewardB.personalGroupId);

    // D keeps its membership but loses its role instance in B — a member
    // with no permissions there (the limb-2 permission negative).
    await runAdminSql(`
      DELETE FROM public.user_group_roles
      WHERE member_group_id = '${gD}' AND group_id = '${gB}';`);

    // The wielder and the keyless member join A; only the wielder gets the key.
    await addPersonMember(wielder, gA, stewardA.personalGroupId);
    await addPersonMember(keyless, gA, stewardA.personalGroupId);
    await grantActAsGroup(wielder, gA, `PD19HatA${runTag}`, stewardA.personalGroupId);

    // The wielder also holds the key in C and D (limb-2 negatives are about
    // the GROUP's standing, so limb 1 must hold).
    await addPersonMember(wielder, gC, steward2.personalGroupId);
    await grantActAsGroup(wielder, gC, `PD19HatC${runTag}`, steward2.personalGroupId);
    await addPersonMember(wielder, gD, steward2.personalGroupId);
    await grantActAsGroup(wielder, gD, `PD19HatD${runTag}`, steward2.personalGroupId);

    // memberB is an ordinary Member-role person in B.
    await addPersonMember(memberB, gB, stewardB.personalGroupId);
    const nameRows = (await runAdminSql(
      `SELECT name FROM public.groups WHERE id = '${memberB.personalGroupId}';`
    )) as Array<{ name: string }>;
    memberBName = nameRows[0].name;

    // A person-authored thread in B — the byte-shape reference and reply target.
    const cM = await asUser(memberB);
    const { data: thread, error: tErr } = await cM.rpc('create_forum_post', {
      p_group_id: gB,
      p_content: `PD19 member thread ${runTag}`,
    });
    if (tErr) throw new Error(`seed thread: ${tErr.message}`);
    memberThreadId = (thread as ForumPost).id;
  });

  afterAll(async () => {
    for (const gid of [gA, gC, gD, gB].filter(Boolean)) {
      await admin.from('groups').delete().eq('id', gid);
    }
    for (const u of [stewardB, stewardA, steward2, wielder, keyless, memberB].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // ---------------------------------------------------------------- STORY-1
  describe('STORY-1 — a wielder reads the forum as the group', () => {
    it('S1a: both limbs hold — the wielded read serves a byte-shaped payload', async () => {
      const cw = await asUser(wielder);
      const { data, error } = await cw.rpc('get_group_forum', {
        p_group_id: gB,
        p_acting: gA,
      });
      expect(error).toBeNull();
      const wieldedPosts = (data as { posts: ForumPost[] }).posts;
      const wieldedPost = wieldedPosts.find((p) => p.id === memberThreadId);
      expect(wieldedPost).toBeDefined();

      // Byte-shaped: same keys as a member's read of the same post.
      const cM = await asUser(memberB);
      const { data: memberData } = await cM.rpc('get_group_forum', { p_group_id: gB });
      const memberPost = (memberData as { posts: ForumPost[] }).posts.find(
        (p) => p.id === memberThreadId
      );
      expect(Object.keys(wieldedPost!).sort()).toEqual(Object.keys(memberPost!).sort());
      expect(wieldedPost!.content).toBe(memberPost!.content);
    });

    it('S1b: a keyless caller is refused 42501 naming the acting limb (S5 — learns nothing)', async () => {
      const ck = await asUser(keyless);
      const { error } = await ck.rpc('get_group_forum', { p_group_id: gB, p_acting: gA });
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/permission to act as this group/);
    });

    it("S1c: the acting group has no standing in the context — 42501 naming the group's membership", async () => {
      const cw = await asUser(wielder);
      const { error } = await cw.rpc('get_group_forum', { p_group_id: gB, p_acting: gC });
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/not an active member/);
    });

    it('S1d: the acting group is a member but lacks view_forum — 42501 naming the permission', async () => {
      const cw = await asUser(wielder);
      const { error } = await cw.rpc('get_group_forum', { p_group_id: gB, p_acting: gD });
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/view_forum/);
    });

    // LABELLED GUARD (green in the red run): the additive default — the old
    // named-arg call shape must survive the DROP + CREATE re-issue unchanged.
    it('S1e: a member read without p_acting is byte-identical to today (guard)', async () => {
      const cM = await asUser(memberB);
      const { data, error } = await cM.rpc('get_group_forum', { p_group_id: gB });
      expect(error).toBeNull();
      expect(Array.isArray((data as { posts: ForumPost[] }).posts)).toBe(true);
    });

    it('S1f: a Mist with p_acting is refused 42501 (FIM-only precedes the limbs — CB-1)', async () => {
      const cm = await asMist();
      const { error } = await cm.rpc('get_group_forum', { p_group_id: gB, p_acting: gA });
      expect(error?.code).toBe('42501');
    });
  });

  // ---------------------------------------------------------------- STORY-2
  describe('STORY-2 — a wielder posts and replies as the group', () => {
    it('S2a: a wielded post lands author_group_id = A and the read serves it as A', async () => {
      const cw = await asUser(wielder);
      const { data, error } = await cw.rpc('create_forum_post', {
        p_group_id: gB,
        p_content: `PD19 wielded thread ${runTag}`,
        p_acting: gA,
      });
      expect(error).toBeNull();
      const post = data as ForumPost;
      expect(post.author_group_id).toBe(gA);
      expect(post.author).toEqual({
        display_name: gAName,
        attribution: 'active',
        kind: 'group',
      });

      const cM = await asUser(memberB);
      const { data: readBack } = await cM.rpc('get_group_forum', { p_group_id: gB });
      const served = (readBack as { posts: ForumPost[] }).posts.find((p) => p.id === post.id);
      expect(served).toBeDefined();
      expect(served!.author_group_id).toBe(gA);
      expect(served!.author).toEqual({
        display_name: gAName,
        attribution: 'active',
        kind: 'group',
      });
    });

    it('S2b: a wielded reply lands author_group_id = A', async () => {
      const cw = await asUser(wielder);
      const { data, error } = await cw.rpc('reply_to_forum_post', {
        p_parent_post_id: memberThreadId,
        p_content: `PD19 wielded reply ${runTag}`,
        p_acting: gA,
      });
      expect(error).toBeNull();
      expect((data as ForumPost).author_group_id).toBe(gA);
      expect((data as ForumPost).author.kind).toBe('group');
    });

    it('S2c: a keyless wielded post is refused 42501 and writes no row', async () => {
      const ck = await asUser(keyless);
      const marker = `PD19 keyless probe ${runTag}`;
      const { error } = await ck.rpc('create_forum_post', {
        p_group_id: gB,
        p_content: marker,
        p_acting: gA,
      });
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/permission to act as this group/);
      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.forum_posts WHERE content = '${marker}';`
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(0);
    });

    it('S2d: acting group without post_forum_messages — 42501 naming the permission, no row', async () => {
      const cw = await asUser(wielder);
      const marker = `PD19 bare-D probe ${runTag}`;
      const { error } = await cw.rpc('create_forum_post', {
        p_group_id: gB,
        p_content: marker,
        p_acting: gD,
      });
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/post_forum_messages/);
      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.forum_posts WHERE content = '${marker}';`
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(0);
    });

    it('S2e: a wielded reply with a standing-less group is refused 42501', async () => {
      const cw = await asUser(wielder);
      const { error } = await cw.rpc('reply_to_forum_post', {
        p_parent_post_id: memberThreadId,
        p_content: `PD19 outsider reply probe ${runTag}`,
        p_acting: gC,
      });
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/not an active member/);
    });
  });

  // ---------------------------------------------------------------- STORY-3
  describe('STORY-3 — group authors are named and badged, never anonymous', () => {
    let directRowId: string;

    it('S3a: an engagement-group author resolves to {name, active, kind: group} (the payload-walk catch)', async () => {
      // Direct insert isolates the LADDER from the write door: today this row
      // folds to 'Unknown' (personal-only identity gate) — red for the
      // ladder's own reason.
      const rows = (await runAdminSql(`
        INSERT INTO public.forum_posts (group_id, author_group_id, content)
        VALUES ('${gB}', '${gA}', 'PD19 direct group row ${runTag}')
        RETURNING id;`)) as Array<{ id: string }>;
      directRowId = rows[0].id;

      const cM = await asUser(memberB);
      const { data } = await cM.rpc('get_group_forum', { p_group_id: gB, p_limit: 40 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === directRowId);
      expect(post!.author).toEqual({
        display_name: gAName,
        attribution: 'active',
        kind: 'group',
      });
    });

    it("S3b: after A leaves B its posts read {'Former member', former, kind: group} — the person rungs verbatim", async () => {
      // Leave/removal delete the membership row (ADR-U021).
      await runAdminSql(`
        DELETE FROM public.group_memberships
        WHERE group_id = '${gB}' AND member_group_id = '${gA}';`);
      const cM = await asUser(memberB);
      const { data } = await cM.rpc('get_group_forum', { p_group_id: gB, p_limit: 40 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === directRowId);
      expect(post!.author).toEqual({
        display_name: 'Former member',
        attribution: 'former',
        kind: 'group',
      });
    });

    it('S3c: a person author gains kind: person and is otherwise byte-identical', async () => {
      const cM = await asUser(memberB);
      const { data } = await cM.rpc('get_group_forum', { p_group_id: gB, p_limit: 40 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === memberThreadId);
      expect(post!.author).toEqual({
        display_name: memberBName,
        attribution: 'active',
        kind: 'person',
      });
    });

    // LABELLED GUARD (green in the red run): the widened gate admits
    // engagement groups only — system groups stay rung 3, and rung 3 stays
    // byte-identical (no kind — 'Unknown' claims no kind).
    it("S3e: a system-group author stays {'Unknown', unknown} with no kind key (guard)", async () => {
      const rows = (await runAdminSql(`
        INSERT INTO public.forum_posts (group_id, author_group_id, content)
        SELECT '${gB}', g.id, 'PD19 system row ${runTag}'
        FROM public.groups g
        WHERE g.name = 'DeusEx' AND g.group_type = 'system'
        RETURNING id;`)) as Array<{ id: string }>;
      const cM = await asUser(memberB);
      const { data } = await cM.rpc('get_group_forum', { p_group_id: gB, p_limit: 40 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === rows[0].id);
      expect(post!.author).toEqual({ display_name: 'Unknown', attribution: 'unknown' });
    });
  });
});
