import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PD008 (Communication Cycle C-A) — conversation & message contracts.
 *
 * Red-first:
 *  - All eight contracts fail PGRST202 (function absent) until the C-A
 *    migration lands; every refusal assertion checks its exact SQLSTATE
 *    (42501 / 22023 / P0002), so an absent function can NOT satisfy a
 *    refusal test — red pre-apply, green-for-the-right-reason post-apply.
 *  - STORY-8 direct-write probes assert 42501 (write-narrowing): red against
 *    the legacy policies / absent `messages` table, green after the same
 *    migration drops the write policies and renames the table.
 *
 * Labelled honestly (genuine greens in the red run — regression guards, not
 * red-first): the two read-scoping probes (Mist reads nothing; a bystander
 * sees no rows) verify EXISTING RLS and must stay green after the narrowing.
 * Area-gate additions (2026-07-21, oracle-parity probes): the B-MSG-004
 * inbox-ordering and B-MSG-005 zero-notification-rows tests are regression
 * guards over shipped behaviour — green by nature, closing the two spine
 * assertions the port had left implicit.
 *
 * Oracle spine carried (B-MSG-001..006): group-keyed authorship, one
 * conversation per pair, inbox by last_message_at, unread = read-state
 * (never notifications), empty message rejected, non-participants blocked.
 */
describe('FEAT-PD008 — conversation & message contracts (C-A)', () => {
  const admin = createAdminClient();
  const runTag = `ca-${Date.now()}`;

  let steward: TestUser; // creates G1 (Steward template holds create_group_conversations post-seed)
  let member: TestUser; // active member of G1, NO role (join-by-membership; create-refusal fixture)
  let outsider: TestUser; // FIM outside G1 (DM partner + refusal fixture)
  let bystander: TestUser; // FIM in no conversation (leak probes; inactive-recipient fixture)

  // public.users.id per fixture (contract param) — resolved in beforeAll.
  const publicIds = new Map<string, string>();
  const pubId = (u: TestUser): string => {
    const v = publicIds.get(u.user.id);
    if (!v) throw new Error('public id not resolved');
    return v;
  };

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

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `CA Steward ${runTag}` });
    member = await createTestUser({ displayName: `CA Member ${runTag}` });
    outsider = await createTestUser({ displayName: `CA Outsider ${runTag}` });
    bystander = await createTestUser({ displayName: `CA Bystander ${runTag}` });
    for (const u of [steward, member, outsider, bystander]) {
      createdAuthIds.push(u.user.id);
      const { data, error } = await admin
        .from('users')
        .select('id')
        .eq('auth_user_id', u.user.id)
        .single();
      if (error) throw new Error(`resolve public id: ${error.message}`);
      publicIds.set(u.user.id, data!.id as string);
    }

    const c = await asUser(steward);
    const { data: groupId, error } = await c.rpc('create_engagement_group', {
      p_name: `C-A Comm Fixture ${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g1 = groupId as string;
    createdGroupIds.push(g1);
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: g1,
      member_group_id: member.personalGroupId,
      status: 'active',
      added_by_group_id: steward.personalGroupId,
    });
    if (mErr) throw new Error(`seed membership: ${mErr.message}`);
  }, 120_000);

  afterAll(async () => {
    // Fixture conversations cascade with groups/personal-groups; sweep any
    // group-kind rows first so no cross-run debris outlives the fixtures.
    try {
      await admin.from('conversations').delete().in('group_id', createdGroupIds);
    } catch {
      /* table shape pre-migration — nothing to sweep */
    }
    for (const gid of createdGroupIds) await cleanupTestGroup(gid);
    for (const uid of createdAuthIds) await cleanupTestUser(uid);
  }, 120_000);

  // ---------------------------------------------------------------- STORY-4
  describe('STORY-4 — one DM per pair, FIM-only', () => {
    it('creates exactly one dm conversation per pair, from either side', async () => {
      const cm = await asUser(member);
      const co = await asUser(outsider);
      const { data: id1, error: e1 } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      expect(e1).toBeNull();
      const { data: id2, error: e2 } = await co.rpc('get_or_create_dm_conversation', {
        p_other_group_id: member.personalGroupId,
      });
      expect(e2).toBeNull();
      expect(id2).toBe(id1);
    });

    it('refuses a conversation with yourself (22023)', async () => {
      const cm = await asUser(member);
      const { error } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: member.personalGroupId,
      });
      expect(error?.code).toBe('22023');
    });

    it('refuses a Mist caller (42501 — CB-1: communication is FIM-only)', async () => {
      const mist = await asMist();
      const { error } = await mist.rpc('get_or_create_dm_conversation', {
        p_other_group_id: member.personalGroupId,
      });
      expect(error?.code).toBe('42501');
      await mist.auth.signOut();
    });

    it('refuses an inactive recipient (42501)', async () => {
      await admin.from('users').update({ is_active: false }).eq('id', pubId(bystander));
      try {
        const cm = await asUser(member);
        const { error } = await cm.rpc('get_or_create_dm_conversation', {
          p_other_group_id: bystander.personalGroupId,
        });
        expect(error?.code).toBe('42501');
      } finally {
        await admin.from('users').update({ is_active: true }).eq('id', pubId(bystander));
      }
    });
  });

  // ------------------------------------------------------------ STORY-3 + 1 + 7
  describe('STORY-3/1/7 — send through one door; the inbox and read-state are honest', () => {
    let dmId: string;

    beforeAll(async () => {
      const cm = await asUser(member);
      const { data } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      dmId = data as string;
    });

    it('sends with the sender personal group as author', async () => {
      const cm = await asUser(member);
      const { data, error } = await cm.rpc('send_message', {
        p_conversation_id: dmId,
        p_content: `hello from member ${runTag}`,
      });
      expect(error).toBeNull();
      expect((data as { sender_group_id: string }).sender_group_id).toBe(member.personalGroupId);
    });

    it('rejects empty and whitespace-only content (22023)', async () => {
      const cm = await asUser(member);
      for (const bad of ['', '   ']) {
        const { error } = await cm.rpc('send_message', {
          p_conversation_id: dmId,
          p_content: bad,
        });
        expect(error?.code).toBe('22023');
      }
    });

    it('refuses a non-participant sender (42501)', async () => {
      const cb = await asUser(bystander);
      const { error } = await cb.rpc('send_message', {
        p_conversation_id: dmId,
        p_content: 'should never land',
      });
      expect(error?.code).toBe('42501');
    });

    it('recipient inbox shows has_unread; reading clears it; only my own cursor moves', async () => {
      const co = await asUser(outsider);
      const { data: inbox1, error: e1 } = await co.rpc('get_my_conversations');
      expect(e1).toBeNull();
      const rows1 = (inbox1 as { conversations: Array<Record<string, unknown>> }).conversations;
      const mine1 = rows1.find((r) => r.id === dmId);
      expect(mine1).toBeDefined();
      expect(mine1!.kind).toBe('dm');
      expect(mine1!.has_unread).toBe(true);
      expect(mine1!.other_participant_name).toBeTruthy();

      const { error: eRead } = await co.rpc('mark_conversation_read', {
        p_conversation_id: dmId,
      });
      expect(eRead).toBeNull();
      const { data: inbox2 } = await co.rpc('get_my_conversations');
      const mine2 = (inbox2 as { conversations: Array<Record<string, unknown>> }).conversations.find(
        (r) => r.id === dmId,
      );
      expect(mine2!.has_unread).toBe(false);

      // the other side's cursor is untouched by my read: send back, member unread
      await co.rpc('send_message', { p_conversation_id: dmId, p_content: `reply ${runTag}` });
      const cm = await asUser(member);
      const { data: inboxM } = await cm.rpc('get_my_conversations');
      const mineM = (inboxM as { conversations: Array<Record<string, unknown>> }).conversations.find(
        (r) => r.id === dmId,
      );
      expect(mineM!.has_unread).toBe(true);
    });

    it('creates zero notification rows on send — unread lives in read-state, never notifications (B-MSG-005)', async () => {
      const countFor = async (): Promise<number> => {
        const { count, error } = await admin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .in('recipient_group_id', [member.personalGroupId, outsider.personalGroupId]);
        expect(error).toBeNull();
        return count ?? 0;
      };
      const before = await countFor();
      const cm = await asUser(member);
      const { error } = await cm.rpc('send_message', {
        p_conversation_id: dmId,
        p_content: `no notification rides this ${runTag}`,
      });
      expect(error).toBeNull();
      expect(await countFor()).toBe(before);
    });

    it('orders the inbox most-recent-first by last_message_at (B-MSG-004)', async () => {
      // Second conversation for the member: a steward DM — the bystander must
      // stay conversation-free (the STORY-8 leak probes depend on it).
      const cm = await asUser(member);
      const { data: stewardDm, error: eDm } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: steward.personalGroupId,
      });
      expect(eDm).toBeNull();
      const { error: e1 } = await cm.rpc('send_message', {
        p_conversation_id: stewardDm as string,
        p_content: `steward dm now newest ${runTag}`,
      });
      expect(e1).toBeNull();

      const order = async (): Promise<string[]> => {
        const { data, error } = await cm.rpc('get_my_conversations');
        expect(error).toBeNull();
        return (data as { conversations: Array<{ id: string }> }).conversations.map((r) => r.id);
      };
      const first = await order();
      expect(first.indexOf(stewardDm as string)).toBeLessThan(first.indexOf(dmId));

      // The order flips when the other conversation receives the newest message.
      const { error: e2 } = await cm.rpc('send_message', {
        p_conversation_id: dmId,
        p_content: `outsider dm newest again ${runTag}`,
      });
      expect(e2).toBeNull();
      const second = await order();
      expect(second.indexOf(dmId)).toBeLessThan(second.indexOf(stewardDm as string));
    });
  });

  // ---------------------------------------------------------------- STORY-2
  describe('STORY-2 — detail: chronological, paged, every page sender resolved', () => {
    let dmId: string;

    beforeAll(async () => {
      const cm = await asUser(member);
      const { data } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      dmId = data as string;
      for (let i = 1; i <= 4; i++) {
        await cm.rpc('send_message', { p_conversation_id: dmId, p_content: `page-msg ${i} ${runTag}` });
      }
    });

    it('messages ascend; keyset pagination has no dupes across the boundary', async () => {
      const cm = await asUser(member);
      const { data: p1, error } = await cm.rpc('get_conversation_detail', {
        p_conversation_id: dmId,
        p_limit: 3,
      });
      expect(error).toBeNull();
      const doc1 = p1 as {
        messages: Array<{ id: string; created_at: string }>;
        my_last_read_at: string;
      };
      expect(doc1.messages.length).toBeGreaterThan(0);
      const asc = doc1.messages.map((m) => m.created_at);
      expect(asc).toEqual([...asc].sort());
      expect(doc1.my_last_read_at).toBeTruthy();

      const { data: p2 } = await cm.rpc('get_conversation_detail', {
        p_conversation_id: dmId,
        p_before: doc1.messages[0].created_at,
        p_limit: 3,
      });
      const ids1 = new Set(doc1.messages.map((m) => m.id));
      for (const m of (p2 as { messages: Array<{ id: string }> }).messages) {
        expect(ids1.has(m.id)).toBe(false);
      }
    });

    it('resolves every sender appearing in the page (senders map)', async () => {
      const cm = await asUser(member);
      const { data } = await cm.rpc('get_conversation_detail', { p_conversation_id: dmId });
      const doc = data as {
        messages: Array<{ sender_group_id: string | null }>;
        senders: Record<string, string | null>;
      };
      for (const m of doc.messages) {
        if (m.sender_group_id) expect(doc.senders).toHaveProperty(m.sender_group_id);
      }
    });

    it('refuses a non-participant (42501), not an empty result', async () => {
      const cb = await asUser(bystander);
      const { data, error } = await cb.rpc('get_conversation_detail', {
        p_conversation_id: dmId,
      });
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('unknown conversation is P0002, not a leak-shaped 42501', async () => {
      const cm = await asUser(member);
      const { error } = await cm.rpc('get_conversation_detail', {
        p_conversation_id: '00000000-0000-0000-0000-00000000dead',
      });
      expect(error?.code).toBe('P0002');
    });
  });

  // ------------------------------------------------------------ STORY-5 + 6
  describe('STORY-5/6 — group conversations: permission-gated create, membership-gated join, leave/rejoin', () => {
    let gcId: string;

    it('a Steward creates (template permission); creator is first participant', async () => {
      const cs = await asUser(steward);
      const { data, error } = await cs.rpc('create_group_conversation', {
        p_group_id: g1,
        p_title: `Fireside ${runTag}`,
      });
      expect(error).toBeNull();
      gcId = data as string;
      const { data: listing } = await cs.rpc('get_group_conversations', { p_group_id: g1 });
      const mine = (listing as { conversations: Array<Record<string, unknown>> }).conversations.find(
        (r) => r.id === gcId,
      );
      expect(mine).toBeDefined();
      expect(mine!.am_i_participant).toBe(true);
    });

    it('a role-less member cannot create (42501 — permission, never role-string)', async () => {
      const cm = await asUser(member);
      const { error } = await cm.rpc('create_group_conversation', { p_group_id: g1 });
      expect(error?.code).toBe('42501');
    });

    it('join (idempotent) → send → leave (history closes, 42501) → rejoin (history + attribution survive)', async () => {
      const cm = await asUser(member);
      const { error: j1e } = await cm.rpc('join_group_conversation', { p_conversation_id: gcId });
      expect(j1e).toBeNull();
      const { error: j2e } = await cm.rpc('join_group_conversation', { p_conversation_id: gcId });
      expect(j2e).toBeNull();

      const { data: sent, error: se } = await cm.rpc('send_message', {
        p_conversation_id: gcId,
        p_content: `group hello ${runTag}`,
      });
      expect(se).toBeNull();
      const sentId = (sent as { id: string }).id;

      const { error: le } = await cm.rpc('leave_group_conversation', { p_conversation_id: gcId });
      expect(le).toBeNull();
      const { error: goneE } = await cm.rpc('get_conversation_detail', { p_conversation_id: gcId });
      expect(goneE?.code).toBe('42501');
      const { error: sendGoneE } = await cm.rpc('send_message', {
        p_conversation_id: gcId,
        p_content: 'should refuse — left',
      });
      expect(sendGoneE?.code).toBe('42501');

      const { error: rj } = await cm.rpc('join_group_conversation', { p_conversation_id: gcId });
      expect(rj).toBeNull();
      const { data: back } = await cm.rpc('get_conversation_detail', { p_conversation_id: gcId });
      const old = (back as { messages: Array<{ id: string; sender_group_id: string }> }).messages.find(
        (m) => m.id === sentId,
      );
      expect(old).toBeDefined();
      expect(old!.sender_group_id).toBe(member.personalGroupId);
    });

    it('a non-member can neither list (42501) nor join (42501); joining a DM is P0002', async () => {
      const co = await asUser(outsider);
      const { error: listErr } = await co.rpc('get_group_conversations', { p_group_id: g1 });
      expect(listErr?.code).toBe('42501');
      const { error: joinErr } = await co.rpc('join_group_conversation', { p_conversation_id: gcId });
      expect(joinErr?.code).toBe('42501');

      const cm = await asUser(member);
      const { data: dmId } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      const { error: dmJoinErr } = await cm.rpc('join_group_conversation', {
        p_conversation_id: dmId as string,
      });
      expect(dmJoinErr?.code).toBe('P0002');
    });
  });

  // ---------------------------------------------------------------- STORY-8
  describe('STORY-8 — no path around the contracts (ADR-U038 direct-caller)', () => {
    let dmId: string;

    beforeAll(async () => {
      const cm = await asUser(member);
      const { data } = await cm.rpc('get_or_create_dm_conversation', {
        p_other_group_id: outsider.personalGroupId,
      });
      dmId = data as string;
    });

    it('direct INSERT into conversations is a 42501 for an authenticated FIM', async () => {
      const cm = await asUser(member);
      const { error } = await cm
        .from('conversations')
        .insert({ kind: 'dm', dm_pair_key: `x:${runTag}` });
      expect(error?.code).toBe('42501');
    });

    it('direct INSERT into messages is a 42501, participant or not', async () => {
      const cm = await asUser(member);
      const { error } = await cm.from('messages').insert({
        conversation_id: dmId,
        sender_group_id: member.personalGroupId,
        content: 'bypassing the door',
      });
      expect(error?.code).toBe('42501');
    });

    it('direct UPDATE of my own read cursor touches zero rows (no UPDATE policy)', async () => {
      const cm = await asUser(member);
      const { data, error } = await cm
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', dmId)
        .eq('participant_group_id', member.personalGroupId)
        .select();
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('an anonymous-session Mist: RPC refused (42501), direct write refused, reads empty', async () => {
      const mist = await asMist();
      const { error: rpcErr } = await mist.rpc('get_my_conversations');
      expect(rpcErr?.code).toBe('42501');
      const { error: insErr } = await mist.from('messages').insert({
        conversation_id: dmId,
        content: 'mist write',
      });
      expect(insErr).not.toBeNull();
      // Regression guard (green by design pre- and post-migration): reads scoped.
      const { data: rows } = await mist.from('conversations').select('id');
      expect(rows ?? []).toHaveLength(0);
      await mist.auth.signOut();
    });

    it('regression guard — a bystander sees no rows of other people’s conversations', async () => {
      // Green by design (existing RLS); must STAY green after the narrowing.
      const cb = await asUser(bystander);
      const { data: convs } = await cb.from('conversations').select('id');
      expect(convs ?? []).toHaveLength(0);
      const { data: msgs } = await cb.from('messages').select('id');
      expect(msgs ?? []).toHaveLength(0);
    });
  });

  describe('RIDER-1 (live walk 2026-07-22) — permission backfill invariant', () => {
    // Red-first against the live defect: C-A seeded create_group_conversations
    // into the Steward/Guide TEMPLATES only; has_permission() resolves through
    // role INSTANCES, so every pre-C-A group lacked the grant (the walk found
    // the "New conversation" affordance missing for a steward). Green once
    // 20260722100000 backfills the instances; stays green for new groups
    // because instantiation copies template grants.
    it('every Steward/Guide-template-derived role instance holds create_group_conversations', async () => {
      const { data: templates } = await admin
        .from('role_templates')
        .select('id, name')
        .in('name', ['Steward Role Template', 'Guide Role Template']);
      expect(templates ?? []).toHaveLength(2);

      const { data: perm } = await admin
        .from('permissions')
        .select('id')
        .eq('name', 'create_group_conversations')
        .single();
      expect(perm).not.toBeNull();

      const { data: roles } = await admin
        .from('group_roles')
        .select('id')
        .in(
          'created_from_role_template_id',
          (templates ?? []).map((t) => t.id)
        );
      const roleIds = (roles ?? []).map((r) => r.id);
      expect(roleIds.length).toBeGreaterThan(0);

      const { data: grants } = await admin
        .from('group_role_permissions')
        .select('group_role_id')
        .eq('permission_id', perm!.id)
        .in('group_role_id', roleIds);
      const granted = new Set((grants ?? []).map((g) => g.group_role_id));
      const missing = roleIds.filter((id) => !granted.has(id));
      expect(missing).toHaveLength(0);
    });
  });
});
