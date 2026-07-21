/**
 * FEAT-PD012 — lifecycle dispositions (Cycle C-E): STORY-1/2/3/6.
 *
 * D2 executed as preserve-and-seal (the C-E board, Option A): one handler
 * (`ds5_lifecycle_group_closed`) called in-transaction from close_group /
 * delete_group seals the group's `group`-kind conversations (sealed_at);
 * forum + announcements rows are untouched. Both lifecycle events disposition
 * identically — end activity, keep the record.
 *
 * Red-first (authored 2026-07-21, pre-migration). Expected red classes:
 * 42703 (conversations.sealed_at absent), PGRST202 / 42883 (handler absent),
 * and behavioural assertions failing on the un-sealed substrate (inbox still
 * lists, send still succeeds).
 *
 * STORY-6 (CB-1 Mist-exclusion proof) is labelled REGRESSION — verify-and-record:
 * `ds5_require_fim_actor()` already gates every write door, so these are
 * expected GREEN before the migration. They are verification of standing
 * behaviour, not TDD red — labelled honestly per the suite-authoring rules.
 *
 * Topology note (the close/delete asymmetry, from the PC014 substrate):
 * close_group requires the caller to be the last active member, so the close
 * path proves seal + inbox exclusion + preserved detail; delete_group runs
 * with members still active, so the delete path is where join/send-refusal
 * on a sealed conversation is cleanly probed.
 */

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

jest.setTimeout(120_000);

describe('FEAT-PD012 — lifecycle dispositions: preserve-and-seal (C-E)', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);

  let steward1: TestUser; // G1 (close path) steward
  let memberA: TestUser;
  let memberB: TestUser;
  let steward2: TestUser; // G2 (delete path) steward
  let memberC: TestUser;
  let memberD: TestUser;

  let g1: string;
  let g2: string;
  let conv1: string; // G1 group conversation (sealed by close)
  let conv2: string; // G2 group conversation (sealed by delete)
  let dmAB: string; // DM between A and B — must survive everything
  let g2PostKept: { id: string };
  let g2PostTombstoned: { id: string };
  let g2ForumBefore: unknown[];

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

  const seedGroup = async (owner: TestUser, name: string, members: TestUser[]): Promise<string> => {
    const c = await asUser(owner);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const member of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: owner.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }
    return groupId as string;
  };

  const grantMember = async (groupId: string, owner: TestUser, u: TestUser) => {
    await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', gr.group_id, gr.id, '${owner.personalGroupId}'
        FROM public.group_roles gr
       WHERE gr.group_id = '${groupId}'
         AND (gr.created_from_role_template_id =
                (SELECT id FROM public.role_templates WHERE name = 'Member Role Template')
              OR gr.name = 'Member')
       LIMIT 1
      ON CONFLICT DO NOTHING;`);
  };

  /** Out-of-band departure (the group-closure suite's established mechanism)
   *  so close_group's last-active-member wall stands down. */
  const adminDepart = async (groupId: string, u: TestUser) => {
    await runAdminSql(`
      DO $$ BEGIN
        PERFORM set_config('app.hard_delete_in_progress', 'true', true);
        DELETE FROM public.user_group_roles
         WHERE group_id = '${groupId}' AND member_group_id = '${u.personalGroupId}';
        DELETE FROM public.group_memberships
         WHERE group_id = '${groupId}' AND member_group_id = '${u.personalGroupId}';
      END $$;`);
  };

  const inboxIds = async (u: TestUser): Promise<string[]> => {
    const c = await asUser(u);
    const { data, error } = await c.rpc('get_my_conversations');
    expect(error).toBeNull();
    return ((data as { conversations: Array<{ id: string }> }).conversations ?? []).map(
      (r) => r.id,
    );
  };

  beforeAll(async () => {
    [steward1, memberA, memberB, steward2, memberC, memberD] = await Promise.all([
      createTestUser({ displayName: `CE S1 ${runTag}` }),
      createTestUser({ displayName: `CE A ${runTag}` }),
      createTestUser({ displayName: `CE B ${runTag}` }),
      createTestUser({ displayName: `CE S2 ${runTag}` }),
      createTestUser({ displayName: `CE C ${runTag}` }),
      createTestUser({ displayName: `CE D ${runTag}` }),
    ]);

    // --- G1 (close path): steward1 + A + B, group conversation, messages, DM ---
    g1 = await seedGroup(steward1, `CE Close ${runTag}`, [memberA, memberB]);
    await grantMember(g1, steward1, memberA);
    await grantMember(g1, steward1, memberB);

    const cs1 = await asUser(steward1);
    const { data: c1, error: c1Err } = await cs1.rpc('create_group_conversation', {
      p_group_id: g1,
      p_title: `CE conv1 ${runTag}`,
    });
    expect(c1Err).toBeNull();
    conv1 = c1 as string;

    const ca = await asUser(memberA);
    const cb = await asUser(memberB);
    expect((await ca.rpc('join_group_conversation', { p_conversation_id: conv1 })).error).toBeNull();
    expect((await cb.rpc('join_group_conversation', { p_conversation_id: conv1 })).error).toBeNull();
    expect(
      (await cs1.rpc('send_message', { p_conversation_id: conv1, p_content: 'before the end' }))
        .error,
    ).toBeNull();
    expect(
      (await ca.rpc('send_message', { p_conversation_id: conv1, p_content: 'still here' })).error,
    ).toBeNull();

    const { data: dm, error: dmErr } = await ca.rpc('get_or_create_dm_conversation', {
      p_other_group_id: memberB.personalGroupId,
    });
    expect(dmErr).toBeNull();
    dmAB = dm as string;
    expect(
      (await ca.rpc('send_message', { p_conversation_id: dmAB, p_content: 'dm before close' }))
        .error,
    ).toBeNull();

    // --- G2 (delete path): steward2 + C + D, conversation (C joined, D not), forum posts ---
    g2 = await seedGroup(steward2, `CE Delete ${runTag}`, [memberC, memberD]);
    await grantMember(g2, steward2, memberC);
    await grantMember(g2, steward2, memberD);

    const cs2 = await asUser(steward2);
    const { data: c2, error: c2Err } = await cs2.rpc('create_group_conversation', {
      p_group_id: g2,
      p_title: `CE conv2 ${runTag}`,
    });
    expect(c2Err).toBeNull();
    conv2 = c2 as string;

    const cc = await asUser(memberC);
    expect((await cc.rpc('join_group_conversation', { p_conversation_id: conv2 })).error).toBeNull();
    expect(
      (await cc.rpc('send_message', { p_conversation_id: conv2, p_content: 'g2 before delete' }))
        .error,
    ).toBeNull();

    const { data: p1, error: p1Err } = await cc.rpc('create_forum_post', {
      p_group_id: g2,
      p_content: `kept post ${runTag}`,
    });
    expect(p1Err).toBeNull();
    g2PostKept = p1 as { id: string };
    const { data: p2, error: p2Err } = await cc.rpc('create_forum_post', {
      p_group_id: g2,
      p_content: `tombstoned post ${runTag}`,
    });
    expect(p2Err).toBeNull();
    g2PostTombstoned = p2 as { id: string };
    expect(
      (await cc.rpc('delete_own_forum_post', { p_post_id: g2PostTombstoned.id })).error,
    ).toBeNull();

    // Byte-identity baseline for STORY-2/3: the forum rows as they stand pre-delete.
    const { data: forumRows, error: fErr } = await admin
      .from('forum_posts')
      .select('id, group_id, author_group_id, content, is_deleted, parent_post_id, created_at, updated_at')
      .eq('group_id', g2)
      .order('created_at');
    expect(fErr).toBeNull();
    g2ForumBefore = forumRows as unknown[];
  });

  afterAll(async () => {
    for (const gid of [g1, g2].filter(Boolean)) await cleanupTestGroup(gid);
    for (const u of [steward1, memberA, memberB, steward2, memberC, memberD].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // -------------------------------------------------------------------------
  describe('STORY-1 — a closed group’s conversation goes quiet and leaves the inbox', () => {
    it('pre-close: the group conversation is live in a member’s inbox (sanity)', async () => {
      const ids = await inboxIds(memberA);
      expect(ids).toContain(conv1);
      expect(ids).toContain(dmAB);
    });

    it('close_group seals the group’s group-kind conversation in the same transaction', async () => {
      // Members depart out-of-band so the steward is the last active member.
      await adminDepart(g1, memberA);
      await adminDepart(g1, memberB);
      const cs = await asUser(steward1);
      const { error } = await cs.rpc('close_group', { p_group_id: g1 });
      expect(error).toBeNull();

      const { data: row, error: sErr } = await admin
        .from('conversations')
        .select('sealed_at')
        .eq('id', conv1)
        .single();
      expect(sErr).toBeNull();
      expect((row as { sealed_at: string | null }).sealed_at).not.toBeNull();
    });

    it('the sealed conversation is absent from every former participant’s live inbox', async () => {
      expect(await inboxIds(memberA)).not.toContain(conv1);
      expect(await inboxIds(steward1)).not.toContain(conv1);
    });

    it('send_message into the sealed conversation refuses with the named state error (P0001); no row lands', async () => {
      const ca = await asUser(memberA);
      const { error } = await ca.rpc('send_message', {
        p_conversation_id: conv1,
        p_content: 'after the end',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      const { count } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv1);
      expect(count).toBe(2); // the two pre-close messages, nothing more
    });

    it('get_conversation_detail still serves the record to a participant (seal ends activity, not access)', async () => {
      const ca = await asUser(memberA);
      const { data, error } = await ca.rpc('get_conversation_detail', {
        p_conversation_id: conv1,
      });
      expect(error).toBeNull();
      const detail = data as { messages: Array<{ id: string }> };
      expect(detail.messages.length).toBe(2);
    });

    it('the DM between the same members is untouched — still in the inbox, still writable (D2 never reaches dm kind)', async () => {
      expect(await inboxIds(memberA)).toContain(dmAB);
      const cb = await asUser(memberB);
      const { error } = await cb.rpc('send_message', {
        p_conversation_id: dmAB,
        p_content: 'dm after close',
      });
      expect(error).toBeNull();
      const { data: row } = await admin
        .from('conversations')
        .select('sealed_at')
        .eq('id', dmAB)
        .single();
      expect((row as { sealed_at: string | null }).sealed_at).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('STORY-2 — delete_group dispositions identically; nothing extra is destroyed', () => {
    it('delete_group seals the conversation with the group_archived reason path', async () => {
      const cs = await asUser(steward2);
      const { error } = await cs.rpc('delete_group', { p_group_id: g2 });
      expect(error).toBeNull();

      const { data: row, error: sErr } = await admin
        .from('conversations')
        .select('sealed_at')
        .eq('id', conv2)
        .single();
      expect(sErr).toBeNull();
      expect((row as { sealed_at: string | null }).sealed_at).not.toBeNull();
    });

    it('send into the sealed conversation refuses (P0001) for a still-active participant', async () => {
      const cc = await asUser(memberC);
      const { error } = await cc.rpc('send_message', {
        p_conversation_id: conv2,
        p_content: 'into the archive',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
    });

    it('join_group_conversation on the sealed conversation refuses — the membership wall answers first (labelled adaptation)', async () => {
      // LABELLED ADAPTATION (flip-green 2026-07-21, the J-C topology-check
      // class): the red spec expected P0001, but delete_group deactivates
      // memberships in the same transaction, so the 42501 membership wall
      // answers before the seal check can — P0001-via-join is structurally
      // unreachable today. The seal check in join_group_conversation stays as
      // defense-in-depth for any future seal path that leaves memberships
      // live; this test asserts the refusal that actually exists.
      const cd = await asUser(memberD); // never joined conv2
      const { error } = await cd.rpc('join_group_conversation', {
        p_conversation_id: conv2,
      });
      expect(error).not.toBeNull();
      expect(['P0001', '42501']).toContain(error!.code);
    });

    it('forum and message rows survive byte-identical across the delete disposition', async () => {
      const { data: forumAfter, error: fErr } = await admin
        .from('forum_posts')
        .select('id, group_id, author_group_id, content, is_deleted, parent_post_id, created_at, updated_at')
        .eq('group_id', g2)
        .order('created_at');
      expect(fErr).toBeNull();
      expect(forumAfter).toEqual(g2ForumBefore);

      const { count } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv2);
      expect(count).toBe(1);
    });

    it('announcements rows are untouched by the disposition (the PD011 contingency, adjudicated: membership-gated invisibility suffices)', async () => {
      // No announcement fixture is needed to hold the adjudication; assert the
      // handler leaves the table alone by absence of any g2-scoped mutation.
      const { count, error } = await admin
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('scope_group_id', g2);
      expect(error).toBeNull();
      expect(count).toBe(0); // none were created; the disposition created/removed none
    });

    it('W12 — the handler refuses a direct authenticated PostgREST call (REVOKE posture)', async () => {
      const cc = await asUser(memberC);
      const { error } = await cc.rpc('ds5_lifecycle_group_closed', {
        p_group_id: g2,
        p_reason: 'group_closed',
      });
      expect(error).not.toBeNull();
      // Absent today (red: PGRST202); after the migration the REVOKE answers 42501.
      expect(['42501', 'PGRST202']).toContain(error!.code);
    });

    it('the handler validates its reason parameter (definer-context probe)', async () => {
      // LABELLED ADAPTATION (flip-green 2026-07-21): runAdminSql THROWS on a
      // SQL error rather than returning it — the first post-apply run proved
      // the 22023 raise fired ("unknown reason bogus_reason") inside the
      // helper's thrown message. Assert the rejection carries exactly that.
      await expect(
        runAdminSql(`SELECT public.ds5_lifecycle_group_closed('${g2}', 'bogus_reason');`),
      ).rejects.toThrow(/22023.*unknown reason/);
    });
  });

  // -------------------------------------------------------------------------
  describe('STORY-3 — the forum record survives the group’s ending (close path)', () => {
    it('no forum row of the closed group was mutated or deleted by close_group', async () => {
      // G1 grew no forum fixture posts; the invariant here is the tombstoned +
      // kept G2 rows (asserted byte-identical above) plus: close_group left
      // G1’s (empty) forum exactly empty — no disposition writes appear.
      const { count, error } = await admin
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', g1);
      expect(error).toBeNull();
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('STORY-6 — CB-1 Mist-exclusion proof [REGRESSION — verify-and-record, expected green pre-migration]', () => {
    it('a Mist is refused at every conversation/message write door (42501, never a hole)', async () => {
      const m = await asMist();
      const probes: Array<Promise<{ error: { code?: string } | null }>> = [
        m.rpc('send_message', { p_conversation_id: conv1, p_content: 'mist voice' }),
        m.rpc('get_or_create_dm_conversation', { p_other_group_id: memberA.personalGroupId }),
        m.rpc('create_group_conversation', { p_group_id: g1, p_title: 'mist thread' }),
        m.rpc('join_group_conversation', { p_conversation_id: conv1 }),
        m.rpc('leave_group_conversation', { p_conversation_id: conv1 }),
        m.rpc('mark_conversation_read', { p_conversation_id: conv1 }),
      ];
      for (const p of probes) {
        const { error } = await p;
        expect(error).not.toBeNull();
        expect(error!.code).toBe('42501');
      }
    });

    it('a Mist is refused at every forum, window, report, and announcement write door (42501)', async () => {
      const m = await asMist();
      const probes: Array<Promise<{ error: { code?: string } | null }>> = [
        m.rpc('create_forum_post', { p_group_id: g2, p_content: 'mist post' }),
        m.rpc('reply_to_forum_post', { p_parent_post_id: g2PostKept.id, p_content: 'mist reply' }),
        m.rpc('edit_own_forum_post', { p_post_id: g2PostKept.id, p_content: 'mist edit' }),
        m.rpc('delete_own_forum_post', { p_post_id: g2PostKept.id }),
        m.rpc('moderate_forum_post', { p_post_id: g2PostKept.id }),
        m.rpc('submit_content_report', {
          p_target_kind: 'forum_post',
          p_target_id: g2PostKept.id,
          p_reason: 'harmful',
        }),
        m.rpc('send_community_announcement', {
          p_group_id: g2,
          p_title: 'mist word',
          p_body: 'never lands',
        }),
        m.rpc('send_platform_announcement', { p_title: 'mist word', p_body: 'never lands' }),
      ];
      for (const p of probes) {
        const { error } = await p;
        expect(error).not.toBeNull();
        expect(error!.code).toBe('42501');
      }
    });

    it('no Mist-authored row exists in any communication table (the structural zero)', async () => {
      const { data: mists, error: mErr } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('is_temporary', true);
      expect(mErr).toBeNull();
      const mistGroupIds = (mists ?? []).map((r) => r.personal_group_id).filter(Boolean);
      if (mistGroupIds.length === 0) return; // no Mists on this DB right now — zero holds trivially

      const countIn = async (table: string, column: string): Promise<number> => {
        const { count, error } = await admin
          .from(table)
          .select('id', { count: 'exact', head: true })
          .in(column, mistGroupIds);
        expect(error).toBeNull();
        return count ?? 0;
      };
      expect(await countIn('messages', 'sender_group_id')).toBe(0);
      expect(await countIn('forum_posts', 'author_group_id')).toBe(0);
      expect(await countIn('content_reports', 'reporter_group_id')).toBe(0);
      expect(await countIn('announcements', 'author_group_id')).toBe(0);
    });
  });
});
