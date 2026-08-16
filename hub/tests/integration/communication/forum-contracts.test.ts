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
 * FEAT-PD009 (Communication Cycle C-B) — forum & attribution contracts.
 *
 * Red-first:
 *  - The four client contracts (`get_group_forum`, `create_forum_post`,
 *    `reply_to_forum_post`, `moderate_forum_post`) fail PGRST202 (absent)
 *    until the C-B migration lands; every refusal assertion pins its exact
 *    SQLSTATE (42501 / 22023 / P0002 / P0001-with-message), so an absent
 *    function can NOT satisfy a refusal test.
 *  - The COM-14 attribution assertions (author objects `{display_name,
 *    attribution}`; "Former member"; sentinel folding into "Unknown"; the
 *    upgraded `get_conversation_detail` sender map) are red against the C-A
 *    string-valued map / absent forum read.
 *  - STORY-7 direct-write probes assert refusals that the LIVE permissive
 *    policies (`forum_insert_post`, `forum_update_own`, `forum_update_moderate`)
 *    currently allow — red today, green when the same migration drops them.
 *
 * Labelled honestly (genuine greens in the red run — regression guards):
 *  - the read-scoping probes (Mist / outsider see no forum rows via direct
 *    SELECT) verify EXISTING RLS (`forum_select`) and must stay green;
 *  - the hard-delete sentinel characterization (author_group_id lands on the
 *    `[Deleted User]` system group via the house erasure path) is green today
 *    (the inline Core UPDATE) and must stay green verbatim after the
 *    ADR-U047 relocation into `ds5_lifecycle_user_hard_deleted`.
 *
 * Oracle spine carried (B-COMM-004..007): role-gated post/reply, flat 2-level
 * threading (trigger message pinned), Steward-only soft-delete moderation,
 * membership-gated reads, author-only-as-self.
 */

jest.setTimeout(120_000);

/** Authenticated DeusEx caller — the fim-account-erasure pattern (house
 *  erasure functions are manage_all_groups-gated; service_role has no auth.uid()). */
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
type ForumPost = {
  id: string;
  parent_post_id: string | null;
  content: string | null;
  is_deleted: boolean;
  created_at: string;
  author: AuthorDisplay;
  replies: ForumPost[];
};

describe('FEAT-PD009 — forum & attribution contracts (C-B)', () => {
  const admin = createAdminClient();
  const runTag = `cb-${Date.now()}`;

  let steward: TestUser; // creates G1 — Steward template: all four forum permissions
  let poster: TestUser; // Member-role member: view/post/reply, no moderate
  let watcher: TestUser; // Observer-role member: view only (post/reply refusal fixture)
  let leaver: TestUser; // Member-role member who posts, leaves, rejoins (COM-14)
  let outsider: TestUser; // FIM outside G1

  let g1: string;
  const createdAuthIds: string[] = [];
  const createdGroupIds: string[] = [];
  const publicIds = new Map<string, string>();

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

  /** Active membership + an instantiated group role.
   *  Engagement-group role instances are named by TEMPLATE name
   *  ('Member Role Template', 'Observer Role Template', …) — the
   *  create_engagement_group instantiation copies rt.name verbatim (see
   *  stewardship-succession.test.ts:74). Filtering on the bare 'Member'
   *  matches nothing and leaves the member permission-less. */
  const addMemberWithRole = async (u: TestUser, roleName: 'Member' | 'Observer') => {
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
      WHERE gr.group_id = '${g1}' AND gr.name = '${roleName} Role Template'
      RETURNING group_role_id;`);
    if (!rows || rows.length === 0) {
      throw new Error(`role '${roleName} Role Template' not instantiated on the fixture group`);
    }
  };

  const forumRead = async (c: SupabaseClient, groupId: string, extra?: Record<string, unknown>) =>
    c.rpc('get_group_forum', { p_group_id: groupId, ...(extra ?? {}) });

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `CB Steward ${runTag}` });
    poster = await createTestUser({ displayName: `CB Poster ${runTag}` });
    watcher = await createTestUser({ displayName: `CB Watcher ${runTag}` });
    leaver = await createTestUser({ displayName: `CB Leaver ${runTag}` });
    outsider = await createTestUser({ displayName: `CB Outsider ${runTag}` });
    for (const u of [steward, poster, watcher, leaver, outsider]) {
      createdAuthIds.push(u.user.id);
      const { data, error } = await admin
        .from('users')
        .select('id')
        .eq('auth_user_id', u.user.id)
        .single();
      if (error) throw new Error(`resolve public id: ${error.message}`);
      publicIds.set(u.user.id, data!.id as string);
    }

    const cs = await asUser(steward);
    const { data: groupId, error } = await cs.rpc('create_engagement_group', {
      p_name: `C-B Forum Fixture ${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g1 = groupId as string;
    createdGroupIds.push(g1);

    await addMemberWithRole(poster, 'Member');
    await addMemberWithRole(watcher, 'Observer');
    await addMemberWithRole(leaver, 'Member');
  }, 120_000);

  afterAll(async () => {
    try {
      await admin.from('forum_posts').delete().in('group_id', createdGroupIds);
      await admin.from('conversations').delete().in('group_id', createdGroupIds);
    } catch {
      /* nothing to sweep */
    }
    for (const gid of createdGroupIds) await cleanupTestGroup(gid);
    for (const uid of createdAuthIds) await cleanupTestUser(uid).catch(() => undefined);
  }, 120_000);

  // ---------------------------------------------------------------- STORY-2
  describe('STORY-2 — post through the door', () => {
    it('a Member-role member opens a thread; the row is authored as their personal group with resolved display', async () => {
      const cp = await asUser(poster);
      const { data, error } = await cp.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: `first thread ${runTag}`,
      });
      expect(error).toBeNull();
      const post = data as ForumPost & { author_group_id: string };
      expect(post.author_group_id).toBe(poster.personalGroupId);
      expect(post.parent_post_id).toBeNull();
      expect(post.author.attribution).toBe('active');
      expect(post.author.display_name).not.toBe('Unknown');
    });

    it('empty and whitespace-only content are 22023', async () => {
      const cp = await asUser(poster);
      for (const bad of ['', '   ']) {
        const { error } = await cp.rpc('create_forum_post', { p_group_id: g1, p_content: bad });
        expect(error?.code).toBe('22023');
      }
    });

    it('an Observer-role member cannot post (42501 — permission, never role-string)', async () => {
      const cw = await asUser(watcher);
      const { error } = await cw.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: 'observer should not post',
      });
      expect(error?.code).toBe('42501');
    });

    it('an outsider cannot post (42501); a Mist cannot post (42501 — CB-1)', async () => {
      const co = await asUser(outsider);
      const { error: oErr } = await co.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: 'outsider',
      });
      expect(oErr?.code).toBe('42501');

      const mist = await asMist();
      const { error: mErr } = await mist.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: 'mist',
      });
      expect(mErr?.code).toBe('42501');
      await mist.auth.signOut();
    });
  });

  // ---------------------------------------------------------------- STORY-3
  describe('STORY-3 — reply, flat forever', () => {
    let threadId: string;

    beforeAll(async () => {
      const cp = await asUser(poster);
      const { data, error } = await cp.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: `reply-fixture thread ${runTag}`,
      });
      if (error) throw new Error(`fixture thread: ${error.message}`);
      threadId = (data as { id: string }).id;
    });

    it('a reply lands under its top-level parent', async () => {
      const cw = await asUser(steward);
      const { data, error } = await cw.rpc('reply_to_forum_post', {
        p_parent_post_id: threadId,
        p_content: `steward reply ${runTag}`,
      });
      expect(error).toBeNull();
      expect((data as ForumPost).parent_post_id).toBe(threadId);
    });

    it('a reply to a reply is refused by the flat-threading trigger (P0001, oracle message pinned)', async () => {
      const cp = await asUser(poster);
      const { data: reply } = await cp.rpc('reply_to_forum_post', {
        p_parent_post_id: threadId,
        p_content: `depth-2 ${runTag}`,
      });
      const replyId = (reply as { id: string }).id;
      const { error } = await cp.rpc('reply_to_forum_post', {
        p_parent_post_id: replyId,
        p_content: 'depth-3 must refuse',
      });
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('Cannot reply to a reply');
    });

    it('unknown parent is P0002; an Observer-role member cannot reply (42501); empty reply is 22023', async () => {
      const cp = await asUser(poster);
      const { error: ghost } = await cp.rpc('reply_to_forum_post', {
        p_parent_post_id: '00000000-0000-0000-0000-00000000dead',
        p_content: 'no parent',
      });
      expect(ghost?.code).toBe('P0002');

      const cw = await asUser(watcher);
      const { error: obs } = await cw.rpc('reply_to_forum_post', {
        p_parent_post_id: threadId,
        p_content: 'observer reply',
      });
      expect(obs?.code).toBe('42501');

      const { error: empty } = await cp.rpc('reply_to_forum_post', {
        p_parent_post_id: threadId,
        p_content: '   ',
      });
      expect(empty?.code).toBe('22023');
    });
  });

  // ---------------------------------------------------------------- STORY-1
  describe('STORY-1 — the forum in one read', () => {
    beforeAll(async () => {
      const cp = await asUser(poster);
      for (let i = 1; i <= 4; i++) {
        const { error } = await cp.rpc('create_forum_post', {
          p_group_id: g1,
          p_content: `page thread ${i} ${runTag}`,
        });
        if (error) throw new Error(`fixture page thread: ${error.message}`);
      }
    });

    it('top-level newest-first with chronological replies; keyset paging has no dupes at the boundary', async () => {
      const cw = await asUser(watcher); // view_forum is enough to read
      const { data: p1, error } = await forumRead(cw, g1, { p_limit: 3 });
      expect(error).toBeNull();
      const page1 = (p1 as { posts: ForumPost[] }).posts;
      expect(page1.length).toBe(3);
      const desc = page1.map((p) => p.created_at);
      expect(desc).toEqual([...desc].sort().reverse());
      for (const p of page1) {
        expect(p.parent_post_id).toBeNull();
        const asc = p.replies.map((r) => r.created_at);
        expect(asc).toEqual([...asc].sort());
      }

      const { data: p2 } = await forumRead(cw, g1, {
        p_before: page1[page1.length - 1].created_at,
        p_limit: 3,
      });
      const ids1 = new Set(page1.map((p) => p.id));
      for (const p of (p2 as { posts: ForumPost[] }).posts) {
        expect(ids1.has(p.id)).toBe(false);
      }
    });

    it('a non-member is refused (42501), never an empty list; a Mist is refused (42501)', async () => {
      const co = await asUser(outsider);
      const { data, error } = await forumRead(co, g1);
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();

      const mist = await asMist();
      const { error: mErr } = await forumRead(mist, g1);
      expect(mErr?.code).toBe('42501');
      await mist.auth.signOut();
    });
  });

  // ---------------------------------------------------------------- STORY-4
  describe('STORY-4 — moderation is scoped care', () => {
    let targetId: string;

    beforeAll(async () => {
      const cp = await asUser(poster);
      const { data, error } = await cp.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: `to be moderated ${runTag}`,
      });
      if (error) throw new Error(`fixture moderation post: ${error.message}`);
      targetId = (data as { id: string }).id;
    });

    it('a member without moderate_forum cannot moderate (42501); unknown post is P0002', async () => {
      const cp = await asUser(poster);
      const { error } = await cp.rpc('moderate_forum_post', { p_post_id: targetId });
      expect(error?.code).toBe('42501');

      const cs = await asUser(steward);
      const { error: ghost } = await cs.rpc('moderate_forum_post', {
        p_post_id: '00000000-0000-0000-0000-00000000dead',
      });
      expect(ghost?.code).toBe('P0002');
    });

    it('the Steward soft-deletes; the read serves a tombstone with content withheld; a second call is idempotent', async () => {
      const cs = await asUser(steward);
      const { error } = await cs.rpc('moderate_forum_post', { p_post_id: targetId });
      expect(error).toBeNull();

      const { data } = await forumRead(cs, g1, { p_limit: 20 });
      const tomb = (data as { posts: ForumPost[] }).posts.find((p) => p.id === targetId);
      expect(tomb).toBeDefined();
      expect(tomb!.is_deleted).toBe(true);
      expect(tomb!.content).toBeNull(); // withheld platform-side, not client-hidden
      expect(tomb!.author.display_name).toBeTruthy(); // PD009 Q3 default: header stays

      const { error: again } = await cs.rpc('moderate_forum_post', { p_post_id: targetId });
      expect(again).toBeNull();
    });
  });

  // ---------------------------------------------------------------- STORY-5
  describe('STORY-5 — attribution follows membership, everywhere authorship displays (COM-14)', () => {
    let leaverPostId: string;
    let gcId: string;

    beforeAll(async () => {
      const cl = await asUser(leaver);
      const { data, error } = await cl.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: `leaver's words ${runTag}`,
      });
      if (error) throw new Error(`fixture leaver post: ${error.message}`);
      leaverPostId = (data as { id: string }).id;

      // group conversation for the conversation-scope half of the ladder
      const cs = await asUser(steward);
      const { data: gc, error: gcErr } = await cs.rpc('create_group_conversation', {
        p_group_id: g1,
        p_title: `Attribution fixture ${runTag}`,
      });
      if (gcErr) throw new Error(`fixture group conversation: ${gcErr.message}`);
      gcId = gc as string;
      const { error: jErr } = await cl.rpc('join_group_conversation', { p_conversation_id: gcId });
      if (jErr) throw new Error(`fixture join: ${jErr.message}`);
      const { error: sErr } = await cl.rpc('send_message', {
        p_conversation_id: gcId,
        p_content: `leaver in conversation ${runTag}`,
      });
      if (sErr) throw new Error(`fixture send: ${sErr.message}`);
    });

    it('a current member displays as their privacy-shaped name (attribution: active)', async () => {
      const cs = await asUser(steward);
      const { data } = await forumRead(cs, g1, { p_limit: 20 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === leaverPostId);
      expect(post!.author.attribution).toBe('active');
      expect(post!.author.display_name).not.toBe('Former member');
      expect(post!.author.display_name).not.toBe('Unknown');
    });

    it('leaving turns the display into "Former member" (name withheld) in forum AND group-conversation detail; rejoining restores the name with no data change', async () => {
      const cl = await asUser(leaver);
      const { error: leaveErr } = await cl.rpc('leave_group', { p_group_id: g1 });
      expect(leaveErr).toBeNull();

      const cs = await asUser(steward);
      const { data } = await forumRead(cs, g1, { p_limit: 20 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === leaverPostId);
      // ADAPTED (FEAT-PD019, 20260816120000): resolvable identities gain the
      // additive kind key — a rung-2 person author is kind: 'person'.
      expect(post!.author).toEqual({
        display_name: 'Former member',
        attribution: 'former',
        kind: 'person',
      });

      const { data: detail } = await cs.rpc('get_conversation_detail', {
        p_conversation_id: gcId,
      });
      const senders = (detail as { senders: Record<string, AuthorDisplay> }).senders;
      // ADAPTED (FEAT-PD019, 20260816120000): same widening on the sender map.
      expect(senders[leaver.personalGroupId]).toEqual({
        display_name: 'Former member',
        attribution: 'former',
        kind: 'person',
      });

      // stored rows untouched (ADR-U021 — display law, never data mutation)
      const { data: raw } = await admin
        .from('forum_posts')
        .select('author_group_id')
        .eq('id', leaverPostId)
        .single();
      expect(raw!.author_group_id).toBe(leaver.personalGroupId);

      // rejoin: membership row back → the name reappears, nothing else changed
      const { error: rejoinErr } = await admin.from('group_memberships').insert({
        group_id: g1,
        member_group_id: leaver.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      expect(rejoinErr).toBeNull();
      const { data: after } = await forumRead(cs, g1, { p_limit: 20 });
      const back = (after as { posts: ForumPost[] }).posts.find((p) => p.id === leaverPostId);
      expect(back!.author.attribution).toBe('active');
      expect(back!.author.display_name).not.toBe('Former member');
    });

    it('a DM sender resolves as an object too (the upgraded senders map, active side)', async () => {
      const cp = await asUser(poster);
      const { data: dm } = await cp.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      await cp.rpc('send_message', {
        p_conversation_id: dm as string,
        p_content: `dm attribution ${runTag}`,
      });
      const { data: detail } = await cp.rpc('get_conversation_detail', {
        p_conversation_id: dm as string,
      });
      const senders = (detail as { senders: Record<string, AuthorDisplay> }).senders;
      const mine = senders[poster.personalGroupId];
      expect(mine.attribution).toBe('active');
      expect(typeof mine.display_name).toBe('string');
    });

    it('a post authored by the [Deleted User] sentinel (no backing users row) folds to "Unknown" — rung 3', async () => {
      // Admin-insert a post owned by the sentinel system group directly (it has
      // no users row): the ladder must render "Unknown", never the sentinel's
      // literal group name. Red-first (get_group_forum absent pre-apply).
      const { data: sentinel } = await admin
        .from('groups')
        .select('id')
        .eq('name', '[Deleted User]')
        .eq('group_type', 'system')
        .single();
      const { data: inserted } = await admin
        .from('forum_posts')
        .insert({ group_id: g1, author_group_id: sentinel!.id, content: `sentinel-authored ${runTag}` })
        .select('id')
        .single();

      const cs = await asUser(steward);
      const { data } = await forumRead(cs, g1, { p_limit: 40 });
      const post = (data as { posts: ForumPost[] }).posts.find((p) => p.id === inserted!.id);
      expect(post!.author).toEqual({ display_name: 'Unknown', attribution: 'unknown' });
    });
  });

  // ---------------------------------------------------------------- STORY-6
  describe('STORY-6 — the hard-delete crossing comes home (ADR-U047)', () => {
    it('the DS-5 lifecycle handler is not a client surface (direct call refused)', async () => {
      const cp = await asUser(poster);
      const { error } = await cp.rpc('ds5_lifecycle_user_hard_deleted', {
        p_personal_group_id: poster.personalGroupId,
        p_reassign_to_group_id: poster.personalGroupId,
      });
      expect(error).not.toBeNull();
      // Pre-apply: PGRST202 (absent). Post-apply: 42501 (EXECUTE revoked) or
      // PGRST202 (hidden from the exposed schema) — refusal either way.
      expect(['42501', 'PGRST202', 'PGRST203']).toContain(error!.code);
    });

    it('regression guard (green pre- AND post-relocation): the house erasure path lands forum authorship on the [Deleted User] sentinel before the personal-group delete', async () => {
      // A pure ADR-U047 behavior-preservation guard: the forum post is
      // admin-inserted (NOT via the C-B contract), so this runs identically
      // pre-apply (inline UPDATE in admin_hard_delete_user) and post-apply
      // (relocated ds5_lifecycle_user_hard_deleted). The reassignment must beat
      // the personal-group delete's ON DELETE SET NULL — the outcome the
      // relocation must not change.
      const erasee = await createTestUser({ displayName: `CB Erasee ${runTag}` });
      createdAuthIds.push(erasee.user.id);
      const { data: profile } = await admin
        .from('users')
        .select('id')
        .eq('auth_user_id', erasee.user.id)
        .single();

      const { data: inserted } = await admin
        .from('forum_posts')
        .insert({ group_id: g1, author_group_id: erasee.personalGroupId, content: `erasee's words ${runTag}` })
        .select('id')
        .single();
      const postId = inserted!.id as string;

      const adminUser = await createTestUser({ displayName: `CB Eraser Admin ${runTag}` });
      createdAuthIds.push(adminUser.user.id);
      await makePlatformAdmin(adminUser.personalGroupId);
      const adminCaller = await asUser(adminUser);
      const { error: eraseErr } = await adminCaller.rpc('erase_fim_account', {
        p_user_id: profile!.id,
      });
      expect(eraseErr).toBeNull();
      await demotePlatformAdmin(adminUser.personalGroupId);

      const { data: sentinel } = await admin
        .from('groups')
        .select('id')
        .eq('name', '[Deleted User]')
        .eq('group_type', 'system')
        .single();
      const { data: raw } = await admin
        .from('forum_posts')
        .select('author_group_id')
        .eq('id', postId)
        .single();
      expect(raw!.author_group_id).toBe(sentinel!.id);
    });
  });

  // ---------------------------------------------------------------- STORY-7
  describe('STORY-7 — no path around the contracts (ADR-U038 direct-caller)', () => {
    it('direct INSERT into forum_posts is refused for a permission-holding member (42501 — the door is the contract)', async () => {
      const cp = await asUser(poster);
      const { error } = await cp.from('forum_posts').insert({
        group_id: g1,
        author_group_id: poster.personalGroupId,
        content: 'bypassing the door',
      });
      expect(error?.code).toBe('42501');
    });

    it('direct UPDATE of my own post touches zero rows (edit-own leaves with the narrowing; returns at C-D)', async () => {
      const cp = await asUser(poster);
      const { data: mine } = await admin
        .from('forum_posts')
        .select('id')
        .eq('author_group_id', poster.personalGroupId)
        .limit(1)
        .single();
      const { data, error } = await cp
        .from('forum_posts')
        .update({ content: 'edited around the door' })
        .eq('id', mine!.id)
        .select();
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('direct moderation UPDATE by the Steward touches zero rows (moderation goes through the contract)', async () => {
      const cs = await asUser(steward);
      const { data: any } = await admin
        .from('forum_posts')
        .select('id')
        .eq('group_id', g1)
        .limit(1)
        .single();
      const { data, error } = await cs
        .from('forum_posts')
        .update({ is_deleted: true })
        .eq('id', any!.id)
        .select();
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('regression guard — outsider and Mist direct SELECTs stay empty (existing RLS holds after the narrowing)', async () => {
      const co = await asUser(outsider);
      const { data: rows } = await co.from('forum_posts').select('id');
      expect(rows ?? []).toHaveLength(0);

      const mist = await asMist();
      const { data: mistRows } = await mist.from('forum_posts').select('id');
      expect(mistRows ?? []).toHaveLength(0);
      await mist.auth.signOut();
    });
  });
});
