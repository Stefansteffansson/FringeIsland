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
 * FEAT-PD010 (Communication Cycle C-C) — realtime hint emission & receipt
 * policies. The ADR-U039 live-delivery layer for conversations, the unread
 * badge, and group forums.
 *
 * Red-first (absent triggers/policies CANNOT satisfy these assertions):
 *  - Emission (STORY-1/2): after a `send_message` / `create_forum_post` /
 *    `reply_to_forum_post` / `moderate_forum_post`, a broadcast row must exist
 *    in `realtime.messages` on the exact topic (queried via `runAdminSql`).
 *    Pre-apply no trigger fires -> zero rows -> every `toBe(1)` / `> 0` fails.
 *    Payload freedom is asserted at the KEY-SET level (ids only).
 *  - Receipt (STORY-3): a WebSocket subscribe probe (the sessions.test.ts S3
 *    precedent) — the faithful gate, because `realtime.topic()` only resolves
 *    inside Realtime's join-time authorization. Pre-apply no receive policy
 *    exists, so RLS-enabled `realtime.messages` denies every C-C subscribe ->
 *    the "own topic SUBSCRIBED" / "member SUBSCRIBED" assertions fail.
 *  - No client-send (STORY-4): a structural pg_policies assertion — the two
 *    C-C receive policies must exist (red pre-apply) and NO INSERT/ALL policy
 *    may exist (the invariant guard: signals are server-originated).
 *
 * Labelled honestly (green pre- AND post-apply — regression/invariant guards,
 * not red-first):
 *  - the session-channel probe (`account:<uid>:sessions` still admits its
 *    owner) verifies the PC009 policy is untouched;
 *  - the emit-helper / trigger-fn direct-rpc refusals (STORY-5) refuse either
 *    way — PGRST202 (absent) pre-apply, 42501/PGRST202 (revoked / trigger-
 *    typed) post-apply;
 *  - the `is_active_group_member` caller-granted boolean (STORY-5) is the
 *    pre-existing Q1 helper — green throughout.
 *
 * Why the receipt gate is a subscribe probe, not a SQL SELECT: the receive
 * policies key on `realtime.topic()`, which returns NULL outside Realtime's
 * authorization context, and `realtime.messages` is not PostgREST-exposed —
 * a plain SELECT would deny everyone and prove nothing. The WebSocket probe
 * exercises the actual join-time policy evaluation (sessions.test.ts:294-336).
 *
 * Fixtures use `createTestUser` (fresh per run -> fresh personal groups ->
 * fresh conversation/post ids, so `realtime.messages` rows from prior runs
 * never collide). `markArrivedOnce` is an E2E-only helper
 * (hub/tests/e2e/helpers/auth.ts) — the integration comm suites don't use it,
 * and arrival (FEAT-H023) doesn't gate the DS-5 contracts.
 */

jest.setTimeout(180_000);

type SqlRows = Array<Record<string, unknown>>;

describe('FEAT-PD010 — realtime hint emission & receipt policies (C-C)', () => {
  const admin = createAdminClient();
  const runTag = `cc-${Date.now()}`;

  let steward: TestUser; // creates g1 (Steward template: all forum perms + create_group_conversations)
  let alice: TestUser; // Member of g1
  let bob: TestUser; // Member of g1 — departs the group conversation
  let outsider: TestUser; // FIM outside g1 (dm partner + forum non-member)
  let og: TestUser; // Steward/member of a DIFFERENT group g2 (forum receipt: other-group member)

  let g1: string;
  let g2: string;
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

  const tokenOf = async (c: SupabaseClient): Promise<string> => {
    const { data } = await c.auth.getSession();
    if (!data.session) throw new Error('no session token');
    return data.session.access_token;
  };

  /** Active membership + an instantiated group role (mirrors forum-contracts). */
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

  // ── realtime.messages query helpers (admin — the substrate's stored hint) ──
  // realtime.send() may nest the caller payload under a 'payload' key
  // (sessions.test.ts:221); COALESCE handles both envelope shapes.
  const countAccountHint = async (authUid: string, convId: string): Promise<number> => {
    const rows = (await runAdminSql(`
      SELECT count(*) AS n FROM realtime.messages
      WHERE topic = 'account:${authUid}:conversations'
        AND event = 'message_created'
        AND COALESCE(payload->'payload'->>'conversation_id', payload->>'conversation_id') = '${convId}';
    `)) as SqlRows;
    return Number(rows[0].n);
  };

  const accountHintPayloads = async (authUid: string, convId: string): Promise<SqlRows> => {
    const rows = (await runAdminSql(`
      SELECT payload FROM realtime.messages
      WHERE topic = 'account:${authUid}:conversations'
        AND event = 'message_created'
        AND COALESCE(payload->'payload'->>'conversation_id', payload->>'conversation_id') = '${convId}';
    `)) as SqlRows;
    return rows.map((r) => {
      const p = r.payload as { payload?: Record<string, unknown> } & Record<string, unknown>;
      return (p.payload ?? p) as Record<string, unknown>;
    });
  };

  const countForumHint = async (groupId: string, event: string, postId: string): Promise<number> => {
    const rows = (await runAdminSql(`
      SELECT count(*) AS n FROM realtime.messages
      WHERE topic = 'group:${groupId}:forum'
        AND event = '${event}'
        AND COALESCE(payload->'payload'->>'post_id', payload->>'post_id') = '${postId}';
    `)) as SqlRows;
    return Number(rows[0].n);
  };

  const forumHintPayloads = async (groupId: string, event: string, postId: string): Promise<SqlRows> => {
    const rows = (await runAdminSql(`
      SELECT payload FROM realtime.messages
      WHERE topic = 'group:${groupId}:forum'
        AND event = '${event}'
        AND COALESCE(payload->'payload'->>'post_id', payload->>'post_id') = '${postId}';
    `)) as SqlRows;
    return rows.map((r) => {
      const p = r.payload as { payload?: Record<string, unknown> } & Record<string, unknown>;
      return (p.payload ?? p) as Record<string, unknown>;
    });
  };

  // ── Realtime private-channel subscribe probe (sessions.test.ts:294-336) ────
  // jest-environment-node exposes no WebSocket global, so give realtime-js its
  // own `ws` transport. Authorization rides the raw JWT via realtime.setAuth.
  const probeSubscribe = async (accessToken: string, topic: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WS = require('ws');
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WS },
      },
    );
    await client.realtime.setAuth(accessToken);
    try {
      return await new Promise<string>((resolve) => {
        const channel = client.channel(topic, { config: { private: true } });
        const timer = setTimeout(() => resolve('TIMED_OUT'), 15000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            clearTimeout(timer);
            resolve(status);
          }
        });
      });
    } finally {
      client.realtime.disconnect();
    }
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `CC Steward ${runTag}` });
    alice = await createTestUser({ displayName: `CC Alice ${runTag}` });
    bob = await createTestUser({ displayName: `CC Bob ${runTag}` });
    outsider = await createTestUser({ displayName: `CC Outsider ${runTag}` });
    og = await createTestUser({ displayName: `CC OtherGroup ${runTag}` });
    for (const u of [steward, alice, bob, outsider, og]) createdAuthIds.push(u.user.id);

    const cs = await asUser(steward);
    const { data: gid, error } = await cs.rpc('create_engagement_group', {
      p_name: `C-C Hint Fixture ${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g1 = gid as string;
    createdGroupIds.push(g1);

    await addMemberWithRole(alice, 'Member');
    await addMemberWithRole(bob, 'Member');

    // A separate group for the "member of a different group" forum-receipt case.
    const cog = await asUser(og);
    const { data: gid2, error: e2 } = await cog.rpc('create_engagement_group', {
      p_name: `C-C Other Group ${runTag}`,
    });
    if (e2) throw new Error(`seed other group: ${e2.message}`);
    g2 = gid2 as string;
    createdGroupIds.push(g2);
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

  // ---------------------------------------------------------------- STORY-1
  describe('STORY-1 — a message lands, every active participant’s account channel whispers', () => {
    it('a dm send emits one message_created per participant (sender included), payload exactly {conversation_id}', async () => {
      const ca = await asUser(alice);
      const { data: dm } = await ca.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      const conv = dm as string;
      const { error } = await ca.rpc('send_message', {
        p_conversation_id: conv,
        p_content: `dm hint ${runTag}`,
      });
      expect(error).toBeNull();

      expect(await countAccountHint(alice.user.id, conv)).toBe(1); // sender included
      expect(await countAccountHint(outsider.user.id, conv)).toBe(1);

      const payloads = await accountHintPayloads(alice.user.id, conv);
      expect(payloads.length).toBe(1);
      // ids only — no content, no sender, no timestamps (key-set, not presence).
      // LABELLED ADAPTATION (2026-07-20, flip-green): the stored payload also
      // carries 'id' — realtime.send() stamps its generated broadcast-row UUID
      // into the payload (jsonb_set(payload,'{id}',generated_id); verified
      // against realtime.send prosrc). Substrate metadata, never domain data;
      // the content-free invariant is unchanged and still asserted exactly.
      expect(Object.keys(payloads[0]).sort()).toEqual(['conversation_id', 'id']);
      expect(payloads[0].conversation_id).toBe(conv);
      expect(payloads[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(payloads[0].id).not.toBe(conv);
    });

    it('a group-conversation send reaches active participants only — a departed participant is excluded', async () => {
      const cs = await asUser(steward);
      const { data: gc } = await cs.rpc('create_group_conversation', {
        p_group_id: g1,
        p_title: `hint gc ${runTag}`,
      });
      const conv = gc as string;

      const ca = await asUser(alice);
      const cb = await asUser(bob);
      await ca.rpc('join_group_conversation', { p_conversation_id: conv });
      await cb.rpc('join_group_conversation', { p_conversation_id: conv });
      // bob departs BEFORE the send — three participants, one left.
      await cb.rpc('leave_group_conversation', { p_conversation_id: conv });

      const { error } = await cs.rpc('send_message', {
        p_conversation_id: conv,
        p_content: `gc hint ${runTag}`,
      });
      expect(error).toBeNull();

      expect(await countAccountHint(steward.user.id, conv)).toBe(1); // creator, active
      expect(await countAccountHint(alice.user.id, conv)).toBe(1); // active
      expect(await countAccountHint(bob.user.id, conv)).toBe(0); // departed — excluded
    });

    it('the admin/direct insert path emits the same hints (the trigger catches every write path)', async () => {
      const ca = await asUser(alice);
      const { data: dm } = await ca.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      const conv = dm as string;
      const before = await countAccountHint(outsider.user.id, conv);
      // service_role direct insert bypasses the write-narrowing; the AFTER
      // INSERT trigger still fires (the PC-4-audited admin send path).
      const { error } = await admin.from('messages').insert({
        conversation_id: conv,
        sender_group_id: alice.personalGroupId,
        content: `admin-path ${runTag}`,
      });
      expect(error).toBeNull();
      expect(await countAccountHint(outsider.user.id, conv)).toBe(before + 1);
    });
  });

  // ---------------------------------------------------------------- STORY-2
  describe('STORY-2 — forum activity reaches the group’s channel', () => {
    let threadId: string;

    it('a top-level post emits one forum_post_created on the group topic, payload exactly {post_id}', async () => {
      const ca = await asUser(alice);
      const { data, error } = await ca.rpc('create_forum_post', {
        p_group_id: g1,
        p_content: `hint thread ${runTag}`,
      });
      expect(error).toBeNull();
      threadId = (data as { id: string }).id;

      expect(await countForumHint(g1, 'forum_post_created', threadId)).toBe(1);
      const payloads = await forumHintPayloads(g1, 'forum_post_created', threadId);
      expect(payloads.length).toBe(1);
      // LABELLED ADAPTATION (2026-07-20, flip-green): 'id' is the substrate-
      // stamped broadcast-row UUID (see the STORY-1 note) — never domain data.
      expect(Object.keys(payloads[0]).sort()).toEqual(['id', 'post_id']);
      expect(payloads[0].post_id).toBe(threadId);
      expect(payloads[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(payloads[0].id).not.toBe(threadId);
    });

    it('a reply emits forum_post_created too (both are inserts)', async () => {
      const ca = await asUser(alice);
      const { data, error } = await ca.rpc('reply_to_forum_post', {
        p_parent_post_id: threadId,
        p_content: `hint reply ${runTag}`,
      });
      expect(error).toBeNull();
      const replyId = (data as { id: string }).id;
      expect(await countForumHint(g1, 'forum_post_created', replyId)).toBe(1);
    });

    it('moderation emits one forum_post_moderated; re-moderating (idempotent) emits nothing new', async () => {
      const cs = await asUser(steward);
      const { error } = await cs.rpc('moderate_forum_post', { p_post_id: threadId });
      expect(error).toBeNull();
      expect(await countForumHint(g1, 'forum_post_moderated', threadId)).toBe(1);

      const before = await countForumHint(g1, 'forum_post_moderated', threadId);
      const { error: again } = await cs.rpc('moderate_forum_post', { p_post_id: threadId });
      expect(again).toBeNull();
      // no is_deleted transition -> no AFTER UPDATE emit (Q3 WHEN clause).
      expect(await countForumHint(g1, 'forum_post_moderated', threadId)).toBe(before);
    });
  });

  // ---------------------------------------------------------------- STORY-3
  describe('STORY-3 — receipt is policy, never a filter (subscribe probe)', () => {
    it('own conversations topic is receivable; another member’s is refused', async () => {
      const ca = await asUser(alice);
      const tokenA = await tokenOf(ca);

      const own = await probeSubscribe(tokenA, `account:${alice.user.id}:conversations`);
      expect(own).toBe('SUBSCRIBED');

      const foreign = await probeSubscribe(tokenA, `account:${bob.user.id}:conversations`);
      expect(foreign).not.toBe('SUBSCRIBED');
    }, 60_000);

    it('the group forum topic is receivable by an active member; refused for outsider, other-group member, and a Mist', async () => {
      const ca = await asUser(alice);
      const memberTopic = `group:${g1}:forum`;
      const member = await probeSubscribe(await tokenOf(ca), memberTopic);
      expect(member).toBe('SUBSCRIBED');

      const co = await asUser(outsider);
      expect(await probeSubscribe(await tokenOf(co), memberTopic)).not.toBe('SUBSCRIBED');

      const cog = await asUser(og); // active member of g2, not g1
      expect(await probeSubscribe(await tokenOf(cog), memberTopic)).not.toBe('SUBSCRIBED');

      const mist = await asMist();
      expect(await probeSubscribe(await tokenOf(mist), memberTopic)).not.toBe('SUBSCRIBED');
      await mist.auth.signOut();
    }, 90_000);
  });

  // ---------------------------------------------------------------- STORY-4
  describe('STORY-4 — no door for a forged signal', () => {
    it('the two C-C receive policies exist and NO client-send (INSERT/ALL) policy exists on realtime.messages', async () => {
      const rows = (await runAdminSql(`
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'realtime' AND tablename = 'messages'
        ORDER BY policyname;
      `)) as Array<{ policyname: string; cmd: string }>;
      const names = new Set(rows.map((r) => r.policyname));
      const cmds = rows.map((r) => r.cmd);

      // red-first: absent pre-apply.
      expect(names.has('ds5_conversations_receive_own')).toBe(true);
      expect(names.has('ds5_forum_receive_member')).toBe(true);
      // invariant guard (green pre- AND post-apply): server-originated only —
      // no client can broadcast onto any C-C topic.
      expect(cmds).not.toContain('INSERT');
      expect(cmds).not.toContain('ALL');
    });

    it('regression guard — the session channel policy still admits its owner', async () => {
      const ca = await asUser(alice);
      const own = await probeSubscribe(await tokenOf(ca), `account:${alice.user.id}:sessions`);
      expect(own).toBe('SUBSCRIBED');
    }, 60_000);
  });

  // ---------------------------------------------------------------- STORY-5
  describe('STORY-5 — no path around, nothing new to attack', () => {
    it('the emit helper and the trigger functions are not a client surface (direct rpc refused)', async () => {
      const ca = await asUser(alice);
      const { error: helperErr } = await ca.rpc('ds5_emit_hint', {
        p_payload: {},
        p_event: 'x',
        p_topic: 'y',
      });
      expect(helperErr).not.toBeNull();
      // Pre-apply: PGRST202 (absent). Post-apply: 42501 (EXECUTE revoked) or
      // PGRST202 (trigger-typed, not exposed) — refused either way.
      expect(['42501', 'PGRST202', 'PGRST203']).toContain(helperErr!.code);

      for (const fn of [
        'ds5_emit_message_hint',
        'ds5_emit_forum_post_hint',
        'ds5_emit_forum_moderation_hint',
      ]) {
        const { error } = await ca.rpc(fn);
        expect(error).not.toBeNull();
        expect(['42501', 'PGRST202', 'PGRST203']).toContain(error!.code);
      }
    });

    it('regression guard — the Q1 membership helper is caller-granted and returns only a boolean', async () => {
      const ca = await asUser(alice);
      const { data: mine, error } = await ca.rpc('is_active_group_member', { check_group_id: g1 });
      expect(error).toBeNull();
      expect(typeof mine).toBe('boolean');
      expect(mine).toBe(true);

      const co = await asUser(outsider);
      const { data: theirs } = await co.rpc('is_active_group_member', { check_group_id: g1 });
      expect(typeof theirs).toBe('boolean');
      expect(theirs).toBe(false);
    });
  });
});
