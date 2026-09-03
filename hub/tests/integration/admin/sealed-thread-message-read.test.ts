import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(300_000);

const GHOST = '00000000-0000-0000-0000-00000000dead';

/**
 * TASK-SEAL-02 — a platform admin READS a sealed thread's messages on a closed
 * group, bounded exactly as SEAL-01 (AB-6 ruling B1's motivation: the evidence
 * lives in the messages).
 *
 * RED AT HEAD (pre-migration 20260903110000): both contracts are absent, so
 * every cell calling `admin_get_group_conversation_detail` fails PGRST202, and
 * the seal-from-client-roles cell fails because a missing function reports
 * "not found" (PGRST202), not "permission denied" (42501).
 *
 * LABELLED GREEN (green before AND after, never claimed as red):
 *  - bound 4, the member detail door: `get_conversation_detail` keeps its
 *    participant wall + the PC026 suspended-only arm, so on a CLOSED group the
 *    admin is still refused there (42501). The new wrapper is the only door.
 *    Pinned so this migration can never be read as having widened the member
 *    plane sideways.
 */
describe('TASK-SEAL-02 — sealed-thread message read on the admin plane (closed-scope)', () => {
  const admin = createAdminClient();

  let ada: TestUser; // platform admin — never a member of the target groups
  let stella: TestUser; // steward of both groups; stays a member of the closed one
  let morgan: TestUser; // member who speaks, then LEAVES before the close — "Former member"
  const users: TestUser[] = [];
  const groupIds: string[] = [];

  let adaC: SupabaseClient;
  let stellaC: SupabaseClient;
  let morganC: SupabaseClient;

  let gClosed: string; // closed + its group thread sealed — the target
  let gActive: string; // active control — the scope refusal
  let sealedConvId: string;
  let activeConvId: string;
  let dmConvId: string; // a direct conversation — bound 2

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

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

  const rpcOk = async (c: SupabaseClient, fn: string, args: Record<string, unknown>) => {
    const { data, error } = await c.rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.message}`);
    return data as never;
  };

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'Seal2Ada' });
    stella = await createTestUser({ displayName: 'Seal2Stella' });
    morgan = await createTestUser({ displayName: 'Seal2Morgan' });
    users.push(ada, stella, morgan);

    await makePlatformAdmin(ada.personalGroupId);
    adaC = await asUser(ada);
    stellaC = await asUser(stella);
    morganC = await asUser(morgan);

    for (const name of ['SEAL2 Closed Cohort', 'SEAL2 Active Cohort']) {
      groupIds.push((await rpcOk(stellaC, 'create_engagement_group', { p_name: name })) as string);
    }
    [gClosed, gActive] = groupIds;

    // Morgan joins the closed-to-be cohort (admin-seeded membership, the fixture shape).
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: gClosed,
      member_group_id: morgan.personalGroupId,
      status: 'active',
      added_by_group_id: stella.personalGroupId,
    });
    if (mErr) throw new Error(`membership: ${mErr.message}`);

    // The evidence thread: Morgan speaks, Stella answers, Morgan LEAVES, then the
    // group closes through the REAL sealer + the real status (SEAL-01's recipe).
    const created = (await rpcOk(stellaC, 'create_group_conversation', {
      p_group_id: gClosed,
      p_title: 'SEAL2 evidence thread',
    })) as string | { id?: string };
    sealedConvId = typeof created === 'string' ? created : (created.id as string);
    await rpcOk(morganC, 'join_group_conversation', { p_conversation_id: sealedConvId });
    await rpcOk(morganC, 'send_message', {
      p_conversation_id: sealedConvId,
      p_content: 'SEAL2 the words that are the evidence',
    });
    await rpcOk(stellaC, 'send_message', {
      p_conversation_id: sealedConvId,
      p_content: 'SEAL2 the steward answers',
    });
    await rpcOk(morganC, 'leave_group', { p_group_id: gClosed });

    const active = (await rpcOk(stellaC, 'create_group_conversation', {
      p_group_id: gActive,
      p_title: 'SEAL2 active thread',
    })) as string | { id?: string };
    activeConvId = typeof active === 'string' ? active : (active.id as string);

    // A direct conversation between the two — bound 2's subject.
    const dm = (await rpcOk(stellaC, 'get_or_create_dm_conversation', {
      p_other_group_id: morgan.personalGroupId,
    })) as string | { id?: string; conversation_id?: string };
    dmConvId =
      typeof dm === 'string' ? dm : ((dm.id ?? dm.conversation_id) as string);

    await runAdminSql(`
      DO $$ BEGIN
        PERFORM public.ds5_lifecycle_group_closed('${gClosed}', 'group_closed');
        UPDATE public.groups SET status = 'closed' WHERE id = '${gClosed}';
      END $$;`);
  });

  afterAll(async () => {
    await demotePlatformAdmin(ada.personalGroupId);
    for (const id of groupIds) await cleanupTestGroup(id);
    for (const u of users) if (u) await cleanupTestUser(u.user.id);
  });

  it('premise: the fixture thread really is sealed, its group really is closed, and Morgan really left', async () => {
    const { data: conv } = await admin
      .from('conversations')
      .select('sealed_at, kind')
      .eq('id', sealedConvId)
      .single();
    expect(conv?.kind).toBe('group');
    expect(conv?.sealed_at).not.toBeNull();
    const { data: grp } = await admin.from('groups').select('status').eq('id', gClosed).single();
    expect(grp?.status).toBe('closed');
    const { data: gm } = await admin
      .from('group_memberships')
      .select('id')
      .eq('group_id', gClosed)
      .eq('member_group_id', morgan.personalGroupId);
    expect(gm ?? []).toHaveLength(0);
  });

  it('the admin reads the sealed thread: every message, oldest first, the sealed state explicit, a departed author as "Former member"', async () => {
    const { data, error } = await adaC.rpc('admin_get_group_conversation_detail', {
      p_conversation_id: sealedConvId,
    });
    expect(error).toBeNull();
    const d = data as {
      id: string;
      kind: string;
      group_id: string;
      group_status: string;
      is_sealed: boolean;
      sealed_at: string | null;
      message_count: number;
      truncated: boolean;
      messages: Array<{ sender_group_id: string | null; content: string; created_at: string }>;
      senders: Record<string, { display_name: string; attribution: string }>;
    };
    expect(d.id).toBe(sealedConvId);
    expect(d.kind).toBe('group');
    expect(d.group_id).toBe(gClosed);
    expect(d.group_status).toBe('closed');
    expect(d.is_sealed).toBe(true);
    expect(d.sealed_at).not.toBeNull();
    expect(d.truncated).toBe(false);
    expect(d.message_count).toBe(2);
    expect(d.messages.map((m) => m.content)).toEqual([
      'SEAL2 the words that are the evidence',
      'SEAL2 the steward answers',
    ]);
    // The evidence survives the author's departure, attributed by the ladder.
    expect(d.senders[morgan.personalGroupId]).toMatchObject({
      display_name: 'Former member',
      attribution: 'former',
    });
    expect(d.senders[stella.personalGroupId]).toMatchObject({ attribution: 'active' });
    expect(JSON.stringify(d)).not.toContain('[Deleted User]');
  });

  it('the read is audited: one admin_audit_log row, action sealed_thread.read, the admin as actor, ids only', async () => {
    await adaC.rpc('admin_get_group_conversation_detail', { p_conversation_id: sealedConvId });
    const rows = (await runAdminSql(
      `SELECT actor_group_id, action, target, metadata FROM public.admin_audit_log
        WHERE action = 'sealed_thread.read' AND target = '${sealedConvId}'
        ORDER BY created_at DESC LIMIT 5;`,
    )) as Array<{ actor_group_id: string; action: string; target: string; metadata: Record<string, unknown> }>;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].actor_group_id).toBe(ada.personalGroupId);
    expect(rows[0].metadata.group_id).toBe(gClosed);
    expect(JSON.stringify(rows[0].metadata)).not.toContain('SEAL2 the words');
  });

  it('a non-admin — even the closed group\'s own steward — is refused 42501', async () => {
    const { error } = await stellaC.rpc('admin_get_group_conversation_detail', {
      p_conversation_id: sealedConvId,
    });
    expect(error?.code).toBe('42501');
  });

  it('ruling A: a thread in an ACTIVE group refuses P0001 (scope is closed groups only)', async () => {
    const { error } = await adaC.rpc('admin_get_group_conversation_detail', {
      p_conversation_id: activeConvId,
    });
    expect(error?.code).toBe('P0001');
    expect(error?.message).toContain('closed');
  });

  it('bound 2: a direct conversation is P0002 for the admin — never a leak that it exists', async () => {
    const { error } = await adaC.rpc('admin_get_group_conversation_detail', {
      p_conversation_id: dmConvId,
    });
    expect(error?.code).toBe('P0002');
    const { error: ghostErr } = await adaC.rpc('admin_get_group_conversation_detail', {
      p_conversation_id: GHOST,
    });
    expect(ghostErr?.code).toBe('P0002');
  });

  it('the DS-5 body is sealed from client roles: an authenticated caller gets permission denied, never a payload', async () => {
    const { error } = await adaC.rpc('ds5_admin_conversation_detail', {
      p_conversation_id: sealedConvId,
    });
    expect(error?.code).toBe('42501');
  });

  it('[LABELLED GREEN] bound 4: the member detail door still refuses the admin on a closed group (42501) — this wrapper is the only door', async () => {
    const { error } = await adaC.rpc('get_conversation_detail', {
      p_conversation_id: sealedConvId,
    });
    expect(error?.code).toBe('42501');
  });
});
