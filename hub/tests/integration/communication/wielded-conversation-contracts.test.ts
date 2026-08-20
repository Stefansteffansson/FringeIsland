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
 * FEAT-PD019 tranche 2 (TASK-PD019-2) — wielded group-conversation contracts.
 *
 * Board ruled 2026-08-18 (recorded in the spec's STORY-4): all six contracts;
 * the shared group read-clock; STANDING PER ACT (every wielded act re-runs
 * the two-limb gate — a paused/removed acting group refuses despite its
 * surviving participant row); hint silence v1 (emitter untouched).
 *
 * Red-first:
 *  - Every cell passing `p_acting` fails PGRST202 today (no matching
 *    signature). Refusal cells pin SQLSTATE 42501 plus limb-naming copy, so
 *    an absent signature can NOT satisfy them.
 *
 * Labelled honestly (genuine greens in the red run — guards):
 *  - G1: the personal (no-acting) list + send flow is byte-identical today
 *    and must survive the DROP + CREATE re-issues unchanged.
 *
 * Cast: B is the context group (stewardB's); A is the represented engagement
 * group (stewardA's), active member of B via the invited→active auto-role
 * edge (Member instance — NO create_group_conversations, the natural create
 * negative); C is an engagement group with no standing in B. The wielder
 * holds act_as_group in A and C but is NOT a member of B; keyless is a
 * member of A without the key; memberB is an ordinary person Member in B.
 */

jest.setTimeout(180_000);

describe('FEAT-PD019 T2 — wielded group conversations (two-limb gate, standing per act)', () => {
  const runTag = Math.random().toString(36).slice(2, 8);
  const admin = createAdminClient();

  let stewardB: TestUser;
  let stewardA: TestUser;
  let steward2: TestUser;
  let wielder: TestUser;
  let keyless: TestUser;
  let memberB: TestUser;

  let gB: string;
  let gA: string;
  let gC: string;
  let gAName: string;
  let joinTargetConv: string; // stewardB-created group conversation in B
  let dmConv: string; // memberB <-> wielder DM (the person-anchored no-go)

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

  beforeAll(async () => {
    stewardB = await createTestUser({ displayName: `PDuStwB${runTag}` });
    stewardA = await createTestUser({ displayName: `PDuStwA${runTag}` });
    steward2 = await createTestUser({ displayName: `PDuStw2${runTag}` });
    wielder = await createTestUser({ displayName: `PDuWld${runTag}` });
    keyless = await createTestUser({ displayName: `PDuKey0${runTag}` });
    memberB = await createTestUser({ displayName: `PDuMemB${runTag}` });

    const cB = await asUser(stewardB);
    const { data: bId, error: bErr } = await cB.rpc('create_engagement_group', {
      p_name: `PDuCtxB${runTag}`,
    });
    if (bErr) throw new Error(`seed B: ${bErr.message}`);
    gB = bId as string;

    const cA = await asUser(stewardA);
    const { data: aId, error: aErr } = await cA.rpc('create_engagement_group', {
      p_name: `PDuRepA${runTag}`,
    });
    if (aErr) throw new Error(`seed A: ${aErr.message}`);
    gA = aId as string;
    gAName = `PDuRepA${runTag}`;

    const c2 = await asUser(steward2);
    const { data: cId, error: cErr } = await c2.rpc('create_engagement_group', {
      p_name: `PDuOutC${runTag}`,
    });
    if (cErr) throw new Error(`seed C: ${cErr.message}`);
    gC = cId as string;

    await addGroupMember(gA, gB, stewardB.personalGroupId);

    await addPersonMember(wielder, gA, stewardA.personalGroupId);
    await addPersonMember(keyless, gA, stewardA.personalGroupId);
    await grantActAsGroup(wielder, gA, `PDuHatA${runTag}`, stewardA.personalGroupId);
    await addPersonMember(wielder, gC, steward2.personalGroupId);
    await grantActAsGroup(wielder, gC, `PDuHatC${runTag}`, steward2.personalGroupId);

    await addPersonMember(memberB, gB, stewardB.personalGroupId);

    // The join/send target: a thread stewardB opens personally (Steward
    // instance carries create_group_conversations).
    const { data: convId, error: convErr } = await cB.rpc('create_group_conversation', {
      p_group_id: gB,
      p_title: `PDu thread ${runTag}`,
    });
    if (convErr) throw new Error(`seed conv: ${convErr.message}`);
    joinTargetConv = convId as string;

    // The person-anchored DM (the no-go the gate must refuse to wield).
    const cM = await asUser(memberB);
    const { data: dmId, error: dmErr } = await cM.rpc('get_or_create_dm_conversation', {
      p_other_group_id: wielder.personalGroupId,
    });
    if (dmErr) throw new Error(`seed dm: ${dmErr.message}`);
    dmConv = dmId as string;
  });

  afterAll(async () => {
    for (const gid of [gA, gC, gB].filter(Boolean)) {
      await admin.from('groups').delete().eq('id', gid);
    }
    for (const u of [stewardB, stewardA, steward2, wielder, keyless, memberB].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // ------------------------------------------------------------- the list door
  it('S4-list: both limbs hold — byte-shaped rows; am_i_participant is the GROUP\'s participation', async () => {
    const cw = await asUser(wielder);
    const { data, error } = await cw.rpc('get_group_conversations', {
      p_group_id: gB,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const rows = (data as { conversations: Array<Record<string, unknown>> }).conversations;
    const target = rows.find((r) => r.id === joinTargetConv);
    expect(target).toBeDefined();
    expect(target!.am_i_participant).toBe(false); // A has not joined yet

    const cM = await asUser(memberB);
    const { data: personal } = await cM.rpc('get_group_conversations', { p_group_id: gB });
    const personalRow = (personal as { conversations: Array<Record<string, unknown>> })
      .conversations.find((r) => r.id === joinTargetConv);
    expect(Object.keys(target!).sort()).toEqual(Object.keys(personalRow!).sort());
  });

  it('S4-list-keyless: refused 42501 naming the acting limb (S5 — learns nothing)', async () => {
    const ck = await asUser(keyless);
    const { error } = await ck.rpc('get_group_conversations', { p_group_id: gB, p_acting: gA });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/permission to act as this group/);
  });

  it('S4-list-nostanding: acting group without standing — 42501 naming the membership limb', async () => {
    const cw = await asUser(wielder);
    const { error } = await cw.rpc('get_group_conversations', { p_group_id: gB, p_acting: gC });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/not an active member/);
  });

  // ------------------------------------------------------------------- create
  it('S4-create-neg: A lacks create_group_conversations — 42501 naming the permission', async () => {
    const cw = await asUser(wielder);
    const { error } = await cw.rpc('create_group_conversation', {
      p_group_id: gB,
      p_title: `PDu wielded refused ${runTag}`,
      p_acting: gA,
    });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/create_group_conversations/);
  });

  it('S4-create-pos: with the permission granted to A, the thread is created with A as first participant', async () => {
    await runAdminSql(`
      INSERT INTO public.group_role_permissions (group_role_id, permission_id)
      SELECT gr.id, p.id FROM public.group_roles gr, public.permissions p
      WHERE gr.group_id = '${gB}' AND gr.name = 'Member Role Template'
        AND p.name = 'create_group_conversations'
      ON CONFLICT DO NOTHING;`);
    const cw = await asUser(wielder);
    const { data, error } = await cw.rpc('create_group_conversation', {
      p_group_id: gB,
      p_title: `PDu wielded thread ${runTag}`,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const rows = (await runAdminSql(
      `SELECT participant_group_id FROM public.conversation_participants
       WHERE conversation_id = '${data as string}';`
    )) as Array<{ participant_group_id: string }>;
    expect(rows.map((r) => r.participant_group_id)).toEqual([gA]);
  });

  // -------------------------------------------------------------- join + send
  it("S4-send-nopart: limbs hold but A never joined — 42501 'Not a participant' (the family's wall)", async () => {
    const cw = await asUser(wielder);
    const { error } = await cw.rpc('send_message', {
      p_conversation_id: joinTargetConv,
      p_content: `PDu premature ${runTag}`,
      p_acting: gA,
    });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/Not a participant/);
  });

  it("S4-join: A's participant row lands; the wielded list flips am_i_participant", async () => {
    const cw = await asUser(wielder);
    const { error } = await cw.rpc('join_group_conversation', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const { data } = await cw.rpc('get_group_conversations', { p_group_id: gB, p_acting: gA });
    const row = (data as { conversations: Array<Record<string, unknown>> }).conversations.find(
      (r) => r.id === joinTargetConv,
    );
    expect(row!.am_i_participant).toBe(true);
  });

  it('S4-send: the message lands sender_group_id = A and reads serve it as the group (kind: group)', async () => {
    const cw = await asUser(wielder);
    const { data, error } = await cw.rpc('send_message', {
      p_conversation_id: joinTargetConv,
      p_content: `PDu spoken for the group ${runTag}`,
      p_acting: gA,
    });
    expect(error).toBeNull();
    expect((data as { sender_group_id: string }).sender_group_id).toBe(gA);

    // A person participant reads it attributed to A through the widened ladder.
    const cM = await asUser(memberB);
    await cM.rpc('join_group_conversation', { p_conversation_id: joinTargetConv });
    const { data: detail } = await cM.rpc('get_conversation_detail', {
      p_conversation_id: joinTargetConv,
    });
    const senders = (detail as { senders: Record<string, { display_name: string; kind?: string }> })
      .senders;
    expect(senders[gA]).toEqual({ display_name: gAName, attribution: 'active', kind: 'group' });
    const participants = (detail as {
      participants: Array<{ participant_group_id: string; name: string }>;
    }).participants;
    expect(participants.some((p) => p.participant_group_id === gA && p.name === gAName)).toBe(true);
  });

  it("S4-read: the shared group clock — a wielded mark-read advances A's single row; wielded detail serves it", async () => {
    const cw = await asUser(wielder);
    const before = (await runAdminSql(
      `SELECT last_read_at FROM public.conversation_participants
       WHERE conversation_id = '${joinTargetConv}' AND participant_group_id = '${gA}';`
    )) as Array<{ last_read_at: string | null }>;
    const { error } = await cw.rpc('mark_conversation_read', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const after = (await runAdminSql(
      `SELECT last_read_at FROM public.conversation_participants
       WHERE conversation_id = '${joinTargetConv}' AND participant_group_id = '${gA}';`
    )) as Array<{ last_read_at: string | null }>;
    expect(after[0].last_read_at).not.toBeNull();
    expect(after[0].last_read_at).not.toEqual(before[0].last_read_at);

    const { data: detail, error: dErr } = await cw.rpc('get_conversation_detail', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(dErr).toBeNull();
    const myLastRead = (detail as { my_last_read_at: string | null }).my_last_read_at;
    expect(new Date(myLastRead!).getTime()).toBe(new Date(after[0].last_read_at!).getTime());
  });

  // ---------------------------------------------------------------- the no-gos
  it('S4-dm: a wielded act against a DM refuses 42501 — person-anchored by construction', async () => {
    const cw = await asUser(wielder);
    const { error: sendErr } = await cw.rpc('send_message', {
      p_conversation_id: dmConv,
      p_content: `PDu dm probe ${runTag}`,
      p_acting: gA,
    });
    expect(sendErr?.code).toBe('42501');
    const { error: detailErr } = await cw.rpc('get_conversation_detail', {
      p_conversation_id: dmConv,
      p_acting: gA,
    });
    expect(detailErr?.code).toBe('42501');
  });

  it('S4-mist: a Mist with p_acting is refused 42501 (FIM-only precedes the limbs)', async () => {
    const cm = await asMist();
    const { error } = await cm.rpc('get_group_conversations', { p_group_id: gB, p_acting: gA });
    expect(error?.code).toBe('42501');
  });

  // LABELLED GUARD (green in the red run): the additive default — the
  // personal flow must survive the DROP + CREATE re-issues byte-identically.
  it('G1: the personal list + join + send flow works unchanged without p_acting (guard)', async () => {
    const cM = await asUser(memberB);
    const { data, error } = await cM.rpc('get_group_conversations', { p_group_id: gB });
    expect(error).toBeNull();
    expect(Array.isArray((data as { conversations: unknown[] }).conversations)).toBe(true);
    // Self-sufficient: the guard joins personally here (never leaning on a
    // wielded cell's side effects — those are red until the migration lands).
    const { error: joinErr } = await cM.rpc('join_group_conversation', {
      p_conversation_id: joinTargetConv,
    });
    expect(joinErr).toBeNull();
    const { data: sent, error: sendErr } = await cM.rpc('send_message', {
      p_conversation_id: joinTargetConv,
      p_content: `PDu personal words ${runTag}`,
    });
    expect(sendErr).toBeNull();
    expect((sent as { sender_group_id: string }).sender_group_id).toBe(memberB.personalGroupId);
  });

  // --------------------------------------------------- the leave rider (T2R)
  // Found at the H047 consumer build (2026-08-20): leave_group_conversation
  // existed and tranche 2 missed it — the walk enumerated a hand-list instead
  // of sweeping the family. Wielded leave is KEY-ONLY (limb 1 + A's row): the
  // PC015 exit-family precedent (leave_group_as_group, 20260706120000) —
  // withdrawing A from a thread must never require A's standing, or a
  // removed group could not be cleaned up by its own key-holders.
  it("T2R-leave: a wielded leave sets A's left_at; a wielded rejoin reopens it (the family's own door)", async () => {
    const cw = await asUser(wielder);
    const { error } = await cw.rpc('leave_group_conversation', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(error).toBeNull();
    const rows = (await runAdminSql(
      `SELECT (left_at IS NOT NULL) AS left FROM public.conversation_participants
       WHERE conversation_id = '${joinTargetConv}' AND participant_group_id = '${gA}';`
    )) as Array<{ left: boolean }>;
    expect(rows[0].left).toBe(true);

    const { error: rejoinErr } = await cw.rpc('join_group_conversation', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(rejoinErr).toBeNull();
  });

  it('T2R-leave-keyless: refused 42501 naming the acting limb (S5 — learns nothing)', async () => {
    const ck = await asUser(keyless);
    const { error } = await ck.rpc('leave_group_conversation', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/permission to act as this group/);
  });

  // ------------------------------------------------- standing per act (RULED)
  it("S4-standing (LAST): A removed from B — every wielded act refuses despite A's surviving participant row", async () => {
    await runAdminSql(`
      DELETE FROM public.group_memberships
      WHERE group_id = '${gB}' AND member_group_id = '${gA}';`);
    // The participant row survives (verified fact: membership loss never
    // clears participation) — the refusal below is the GATE, not row loss.
    const rows = (await runAdminSql(
      `SELECT 1 AS present FROM public.conversation_participants
       WHERE conversation_id = '${joinTargetConv}' AND participant_group_id = '${gA}'
         AND left_at IS NULL;`
    )) as Array<{ present: number }>;
    expect(rows.length).toBe(1);

    const cw = await asUser(wielder);
    for (const call of [
      cw.rpc('get_group_conversations', { p_group_id: gB, p_acting: gA }),
      cw.rpc('send_message', {
        p_conversation_id: joinTargetConv,
        p_content: `PDu after removal ${runTag}`,
        p_acting: gA,
      }),
      cw.rpc('get_conversation_detail', { p_conversation_id: joinTargetConv, p_acting: gA }),
      cw.rpc('mark_conversation_read', { p_conversation_id: joinTargetConv, p_acting: gA }),
    ]) {
      const { error } = await call;
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/not an active member/);
    }

    // T2R: leave is the ONE act that still works after removal — key-only by
    // design (cleanup must not require standing; the exit-family precedent).
    const { error: leaveErr } = await cw.rpc('leave_group_conversation', {
      p_conversation_id: joinTargetConv,
      p_acting: gA,
    });
    expect(leaveErr).toBeNull();
    const leftRows = (await runAdminSql(
      `SELECT (left_at IS NOT NULL) AS left FROM public.conversation_participants
       WHERE conversation_id = '${joinTargetConv}' AND participant_group_id = '${gA}';`
    )) as Array<{ left: boolean }>;
    expect(leftRows[0].left).toBe(true);
  });
});
