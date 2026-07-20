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
 * FEAT-PD011 (Communication Cycle C-D) — windowed own-edit/delete + content
 * reports (STORY-6..8).
 *
 * Red-first:
 *  - `edit_own_forum_post`, `delete_own_forum_post`, `submit_content_report`
 *    fail PGRST202 (absent) until the C-D migration lands; refusal assertions
 *    pin exact SQLSTATEs (42501 / 22023 / P0002) so absence can't satisfy them.
 *  - `content_reports` probes are PGRST205/absent-table red until the same
 *    migration.
 *
 * Labelled honestly (genuine greens in the red run — regression guards):
 *  - the DM-immutability probes (direct UPDATE/DELETE on `messages` touch zero
 *    rows; no message-edit contract exists) verify the EXISTING oracle spine
 *    and must stay green verbatim after the migration (CB-3: DMs immutable);
 *  - the "content edits emit no forum hint" probe verifies the EXISTING C-C
 *    trigger topology (INSERT + is_deleted-transition only) and stays green.
 *
 * The self-delete hint assertion rides the EXISTING C-C moderation trigger
 * (`WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted)`)
 * — no new channel, no new emission function (the C-D carry rule).
 */

jest.setTimeout(120_000);

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

type ForumPost = {
  id: string;
  content: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_group_id: string;
};

describe('FEAT-PD011 — windowed own-edit/delete + content reports (C-D)', () => {
  const admin = createAdminClient();
  const runTag = `cdw${Date.now()}`;

  let steward: TestUser; // creates G2; moderate_forum holder
  let author: TestUser; // Member-role: posts, edits, deletes own
  let other: TestUser; // Member-role: the reporter / wrong-author fixture
  let outsider: TestUser; // FIM outside G2
  let overseer: TestUser; // platform admin for the ADM-10 read seam

  let g2: string;
  let dmConversationId: string;
  let dmMessageId: string;
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

  const addMember = async (u: TestUser) => {
    const { error } = await admin.from('group_memberships').insert({
      group_id: g2,
      member_group_id: u.personalGroupId,
      status: 'active',
      added_by_group_id: steward.personalGroupId,
    });
    if (error) throw new Error(`seed membership: ${error.message}`);
    const rows = await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${g2}', gr.id, '${steward.personalGroupId}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${g2}' AND gr.name = 'Member Role Template'
      RETURNING group_role_id;`);
    if (!rows || rows.length === 0) throw new Error('Member role template not instantiated');
  };

  const newPost = async (asClient: SupabaseClient, content: string): Promise<ForumPost> => {
    const { data, error } = await asClient.rpc('create_forum_post', {
      p_group_id: g2,
      p_content: content,
    });
    if (error) throw new Error(`fixture post: ${error.message}`);
    return data as ForumPost;
  };

  const backdate = async (postId: string, minutes: number) => {
    await runAdminSql(
      `UPDATE public.forum_posts
       SET created_at = created_at - interval '${minutes} minutes',
           updated_at = updated_at - interval '${minutes} minutes'
       WHERE id = '${postId}';`,
    );
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `CDwStew${runTag}` });
    author = await createTestUser({ displayName: `CDwAuth${runTag}` });
    other = await createTestUser({ displayName: `CDwOthr${runTag}` });
    outsider = await createTestUser({ displayName: `CDwOuts${runTag}` });
    overseer = await createTestUser({ displayName: `CDwOver${runTag}` });
    for (const u of [steward, author, other, outsider, overseer]) {
      createdAuthIds.push(u.user.id);
    }

    const cs = await asUser(steward);
    const { data: groupId, error } = await cs.rpc('create_engagement_group', {
      p_name: `CDwFixture${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g2 = groupId as string;
    createdGroupIds.push(g2);
    await addMember(author);
    await addMember(other);
    await makePlatformAdmin(overseer.personalGroupId);

    // DM fixture: author -> other, one message (the report target).
    const ca = await asUser(author);
    const { data: convId, error: convErr } = await ca.rpc('get_or_create_dm_conversation', {
      p_other_group_id: other.personalGroupId,
    });
    if (convErr) throw new Error(`fixture conversation: ${convErr.message}`);
    dmConversationId = convId as string;
    const { data: msg, error: msgErr } = await ca.rpc('send_message', {
      p_conversation_id: dmConversationId,
      p_content: `CDwDmTarget${runTag}`,
    });
    if (msgErr) throw new Error(`fixture message: ${msgErr.message}`);
    dmMessageId = (msg as { id: string }).id;
  }, 120_000);

  afterAll(async () => {
    await demotePlatformAdmin(overseer.personalGroupId);
    try {
      await runAdminSql(
        `DELETE FROM public.content_reports WHERE reporter_group_id IN
         ('${author.personalGroupId}','${other.personalGroupId}','${outsider.personalGroupId}')`,
      );
    } catch {
      /* table may not exist yet (red run) */
    }
    try {
      await admin.from('forum_posts').delete().in('group_id', createdGroupIds);
      await admin.from('messages').delete().eq('conversation_id', dmConversationId);
      await admin.from('conversations').delete().eq('id', dmConversationId);
    } catch {
      /* nothing to sweep */
    }
    for (const gid of createdGroupIds) await cleanupTestGroup(gid);
    for (const uid of createdAuthIds) await cleanupTestUser(uid).catch(() => undefined);
  }, 120_000);

  // ---------------------------------------------------------------- STORY-6
  describe('STORY-6 — fifteen minutes to fix it', () => {
    it('the author edits their fresh post; content updates and the row-doc returns', async () => {
      const ca = await asUser(author);
      const post = await newPost(ca, `CDwEditable${runTag}`);
      const { data, error } = await ca.rpc('edit_own_forum_post', {
        p_post_id: post.id,
        p_content: `CDwEdited${runTag}`,
      });
      expect(error).toBeNull();
      const updated = data as ForumPost;
      expect(updated.content).toBe(`CDwEdited${runTag}`);
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(updated.created_at).getTime(),
      );

      const { data: read } = await ca.rpc('get_group_forum', { p_group_id: g2 });
      const posts = (read as { posts: ForumPost[] }).posts;
      expect(posts.find((p) => p.id === post.id)?.content).toBe(`CDwEdited${runTag}`);
    });

    it('the author self-deletes within the window; the tombstone is idempotent and the EXISTING moderation hint fires', async () => {
      const ca = await asUser(author);
      const post = await newPost(ca, `CDwDeletable${runTag}`);
      const { data, error } = await ca.rpc('delete_own_forum_post', { p_post_id: post.id });
      expect(error).toBeNull();
      expect((data as ForumPost).is_deleted).toBe(true);

      const { error: again } = await ca.rpc('delete_own_forum_post', { p_post_id: post.id });
      expect(again).toBeNull();

      const { data: read } = await ca.rpc('get_group_forum', { p_group_id: g2 });
      const gone = (read as { posts: ForumPost[] }).posts.find((p) => p.id === post.id);
      expect(gone?.is_deleted).toBe(true);
      expect(gone?.content).toBeNull();

      // The C-C transition-gated trigger spoke on the existing channel.
      const hints = await runAdminSql(
        `SELECT payload::text AS p FROM realtime.messages
         WHERE topic = 'group:${g2}:forum'
           AND inserted_at > now() - interval '2 minutes';`,
      );
      expect(
        (hints ?? []).some(
          (r: { p: string }) => r.p.includes('forum_post_moderated') && r.p.includes(post.id),
        ),
      ).toBe(true);
    });

    it('at or past the window edge the edit and the delete refuse (42501, named as the window)', async () => {
      const ca = await asUser(author);
      const post = await newPost(ca, `CDwStale${runTag}`);
      await backdate(post.id, 16);

      const { error: editErr } = await ca.rpc('edit_own_forum_post', {
        p_post_id: post.id,
        p_content: 'too late',
      });
      expect(editErr?.code).toBe('42501');
      expect(editErr?.message ?? '').toMatch(/window/i);

      const { error: delErr } = await ca.rpc('delete_own_forum_post', { p_post_id: post.id });
      expect(delErr?.code).toBe('42501');
      expect(delErr?.message ?? '').toMatch(/window/i);
    });

    it("another member cannot edit or delete the author's live post (42501); unknown post is P0002; empty content is 22023", async () => {
      const ca = await asUser(author);
      const post = await newPost(ca, `CDwNotYours${runTag}`);

      const co = await asUser(other);
      const { error: e1 } = await co.rpc('edit_own_forum_post', {
        p_post_id: post.id,
        p_content: 'not mine',
      });
      expect(e1?.code).toBe('42501');
      const { error: e2 } = await co.rpc('delete_own_forum_post', { p_post_id: post.id });
      expect(e2?.code).toBe('42501');

      const { error: e3 } = await ca.rpc('edit_own_forum_post', {
        p_post_id: '00000000-0000-0000-0000-000000000001',
        p_content: 'ghost',
      });
      expect(e3?.code).toBe('P0002');
      const { error: e4 } = await ca.rpc('edit_own_forum_post', {
        p_post_id: post.id,
        p_content: '   ',
      });
      expect(e4?.code).toBe('22023');
    });

    it('a moderator-tombstoned post cannot be edited by its author (42501) and can never be un-deleted; author-delete on it stays terminal', async () => {
      const ca = await asUser(author);
      const post = await newPost(ca, `CDwModded${runTag}`);
      const cs = await asUser(steward);
      const { error: modErr } = await cs.rpc('moderate_forum_post', { p_post_id: post.id });
      expect(modErr).toBeNull();

      const { error: editErr } = await ca.rpc('edit_own_forum_post', {
        p_post_id: post.id,
        p_content: 'resurrect',
      });
      expect(editErr?.code).toBe('42501');

      const { error: delErr } = await ca.rpc('delete_own_forum_post', { p_post_id: post.id });
      expect(delErr).toBeNull(); // idempotent terminal state

      const { data: row } = await admin
        .from('forum_posts')
        .select('is_deleted')
        .eq('id', post.id)
        .single();
      expect(row?.is_deleted).toBe(true);
    });

    it('regression (green in the red run, labelled): DMs stay immutable — direct UPDATE/DELETE touch zero rows; no message-edit contract exists', async () => {
      const ca = await asUser(author);
      const { data: upd } = await ca
        .from('messages')
        .update({ content: 'rewritten history' })
        .eq('id', dmMessageId)
        .select();
      expect(upd ?? []).toHaveLength(0);

      const { data: del } = await ca.from('messages').delete().eq('id', dmMessageId).select();
      expect(del ?? []).toHaveLength(0);

      const { error: absent } = await ca.rpc('edit_own_message', {
        p_message_id: dmMessageId,
        p_content: 'x',
      });
      expect(absent?.code).toBe('PGRST202');

      const { data: detail } = await ca.rpc('get_conversation_detail', {
        p_conversation_id: dmConversationId,
      });
      const messages = (detail as { messages: { id: string; content: string }[] }).messages;
      expect(messages.find((m) => m.id === dmMessageId)?.content).toBe(`CDwDmTarget${runTag}`);
    });

    it('regression (green in the red run, labelled): a content edit emits no forum hint — the C-C topology is INSERT + tombstone-transition only', async () => {
      const ca = await asUser(author);
      const post = await newPost(ca, `CDwQuiet${runTag}`);
      const before = await runAdminSql(
        `SELECT count(*)::int AS n FROM realtime.messages WHERE topic = 'group:${g2}:forum';`,
      );
      // Direct UPDATE is write-narrowed away; this probes the trigger topology
      // via admin SQL (the only remaining update path besides the contracts).
      await runAdminSql(
        `UPDATE public.forum_posts SET content = 'CDwQuietEdit' WHERE id = '${post.id}';`,
      );
      const after = await runAdminSql(
        `SELECT count(*)::int AS n FROM realtime.messages WHERE topic = 'group:${g2}:forum';`,
      );
      expect((after?.[0] as { n: number }).n).toBe((before?.[0] as { n: number }).n);
    });
  });

  // ---------------------------------------------------------------- STORY-7
  describe('STORY-7 — a report lands somewhere durable', () => {
    let reportedPost: ForumPost;
    let reportId: string;

    beforeAll(async () => {
      const ca = await asUser(author);
      reportedPost = await newPost(ca, `CDwHarm${runTag}`);
    });

    it("a member reports another's forum post; the row carries reporter, group context, snapshot, status open; resubmit is idempotent", async () => {
      const co = await asUser(other);
      const { data, error } = await co.rpc('submit_content_report', {
        p_target_kind: 'forum_post',
        p_target_id: reportedPost.id,
        p_reason: 'harmful',
        p_details: 'context here',
      });
      expect(error).toBeNull();
      const receipt = data as { id: string; status: string };
      expect(receipt.status).toBe('open');
      reportId = receipt.id;

      const { data: row } = await admin
        .from('content_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      expect(row?.reporter_group_id).toBe(other.personalGroupId);
      expect(row?.target_kind).toBe('forum_post');
      expect(row?.target_group_id).toBe(g2);
      expect(row?.content_snapshot).toBe(`CDwHarm${runTag}`);

      const { data: again, error: againErr } = await co.rpc('submit_content_report', {
        p_target_kind: 'forum_post',
        p_target_id: reportedPost.id,
        p_reason: 'harmful again',
      });
      expect(againErr).toBeNull();
      expect((again as { id: string }).id).toBe(reportId);
      const { count } = await admin
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', reportedPost.id);
      expect(count).toBe(1);
    });

    it('the snapshot survives a within-window edit of the reported post (the COM-12/13 interplay)', async () => {
      const ca = await asUser(author);
      const { error } = await ca.rpc('edit_own_forum_post', {
        p_post_id: reportedPost.id,
        p_content: `CDwScrubbed${runTag}`,
      });
      expect(error).toBeNull();
      const { data: row } = await admin
        .from('content_reports')
        .select('content_snapshot')
        .eq('id', reportId)
        .single();
      expect(row?.content_snapshot).toBe(`CDwHarm${runTag}`);
    });

    it('a DM participant reports a message; snapshot lands; a non-participant and a nonexistent target refuse indistinguishably', async () => {
      const co = await asUser(other);
      const { data, error } = await co.rpc('submit_content_report', {
        p_target_kind: 'direct_message',
        p_target_id: dmMessageId,
        p_reason: 'harmful dm',
      });
      expect(error).toBeNull();
      const { data: row } = await admin
        .from('content_reports')
        .select('content_snapshot, target_kind')
        .eq('id', (data as { id: string }).id)
        .single();
      expect(row?.target_kind).toBe('direct_message');
      expect(row?.content_snapshot).toBe(`CDwDmTarget${runTag}`);

      const cu = await asUser(outsider);
      const { error: invisible } = await cu.rpc('submit_content_report', {
        p_target_kind: 'direct_message',
        p_target_id: dmMessageId,
        p_reason: 'probe',
      });
      const { error: ghost } = await cu.rpc('submit_content_report', {
        p_target_kind: 'direct_message',
        p_target_id: '00000000-0000-0000-0000-000000000002',
        p_reason: 'probe',
      });
      expect(invisible?.code).toBeTruthy();
      expect(ghost?.code).toBe(invisible?.code);
      expect(ghost?.message).toBe(invisible?.message);
    });

    it('own content, unknown kinds, and empty reasons refuse (22023-class); a Mist cannot report (42501)', async () => {
      const ca = await asUser(author);
      const { error: own } = await ca.rpc('submit_content_report', {
        p_target_kind: 'forum_post',
        p_target_id: reportedPost.id,
        p_reason: 'self-report',
      });
      expect(own?.code).toBe('22023');

      const co = await asUser(other);
      const { error: kind } = await co.rpc('submit_content_report', {
        p_target_kind: 'hologram',
        p_target_id: reportedPost.id,
        p_reason: 'x',
      });
      expect(kind?.code).toBe('22023');
      const { error: reason } = await co.rpc('submit_content_report', {
        p_target_kind: 'forum_post',
        p_target_id: reportedPost.id,
        p_reason: '   ',
      });
      expect(reason?.code).toBe('22023');

      const mist = await asMist();
      const { error: mErr } = await mist.rpc('submit_content_report', {
        p_target_kind: 'forum_post',
        p_target_id: reportedPost.id,
        p_reason: 'mist',
      });
      expect(mErr?.code).toBe('42501');
      await mist.auth.signOut();
    });

    it('the reporter sees exactly their own rows; the platform admin sees all (the ADM-10 seam); direct client writes refuse', async () => {
      const co = await asUser(other);
      const { data: mine } = await co.from('content_reports').select('id, reporter_group_id');
      expect((mine ?? []).length).toBeGreaterThan(0);
      expect((mine ?? []).every((r) => r.reporter_group_id === other.personalGroupId)).toBe(true);

      const ca = await asUser(author);
      const { data: theirs } = await ca.from('content_reports').select('id');
      expect(theirs ?? []).toHaveLength(0);

      const cAdmin = await asUser(overseer);
      const { data: all } = await cAdmin.from('content_reports').select('id');
      expect((all ?? []).length).toBeGreaterThanOrEqual(2);

      const { error: ins } = await co.from('content_reports').insert({
        reporter_group_id: other.personalGroupId,
        target_kind: 'forum_post',
        target_id: reportedPost.id,
        reason: 'smuggled',
      });
      expect(ins?.code).toBe('42501');
      const { data: updData } = await co
        .from('content_reports')
        .update({ status: 'resolved' })
        .eq('id', reportId)
        .select();
      expect(updData ?? []).toHaveLength(0);
    });
  });
});
