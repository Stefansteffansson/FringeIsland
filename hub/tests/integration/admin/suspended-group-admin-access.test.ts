import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
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

jest.setTimeout(300_000); // real-substrate gate suite: four users, four groups

/**
 * FEAT-PC026 (Cycle ADM-G) — suspended-group admin access contracts.
 * WF-2 per the settled G-board: suspended-only, purpose-bound admin sight on
 * the communication read doors + the conversations RLS chokepoint, the
 * members-email payload re-issue, and the audited acts. "Suspended" in this
 * suite is GROUP-suspension (groups.status) throughout — never the
 * account-state family.
 *
 * RED AT HEAD (pre-migration), by class:
 *  - SIGHT ARMS: the three armed doors refuse the non-member admin at head
 *    (42501 'Group membership required' / 'Not a member of this group' /
 *    'Not a participant') — every admitted-admin cell fails red.
 *  - RLS NEW ARM: direct SELECTs on conversations / messages /
 *    conversation_participants for the non-participant admin on the
 *    suspended group return 0 rows at head — the three >=1-row cells red.
 *  - PAYLOAD: admin_get_group_detail members rows carry no `email` at head.
 *  - ACTS: admin_moderate_group_forum_post absent at head (PGRST202) — every
 *    wrapper cell red (incl. the non-admin/anon refusal-shape cells, which
 *    assert the post-apply refusal copy, not just any error);
 *    admin_remove_member_from_group refuses the suspended group at head
 *    ('group is not active') — the remove-cascade cell red.
 *
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - get_group_forum admits the non-member admin at head already: the
 *    Tier-1 pass PC026 STORY-3 pins as LAW. Mechanism (named per spec):
 *    has_permission()'s system-tier arm is context-free
 *    (20260222000000:436-453) and auto_grant_to_deusex grants DeusEx every
 *    permission, so has_permission(admin, any group, any permission) is
 *    unconditionally TRUE — recorded AB-6 audit material. Same at RLS
 *    (forum_select admin arm). Two pins: the admin pass + the member
 *    quarantine unchanged.
 *  - Member-plane quarantine continuity: a suspended group's member still
 *    refuses 'group is suspended' on all four doors; member RLS still
 *    0-rows on the suspended conversation family.
 *  - Suspended-only: the admin stays refused on the ACTIVE control group's
 *    doors and 0-rows on its conversation family (non-participant).
 *  - Group-kind-only: the DM between the suspended group's members stays
 *    outside admin sight (door refusal + 0 rows) in every status.
 *  - Admin-participant continuity: an admin who IS a participant in a
 *    suspended group's conversation keeps reading (the A-or-not-S conjunct).
 *  - The remove door still refuses a RESTING group ('group is not active')
 *    — pinning that the gate-finding amendment admits 'suspended' only.
 */

const SUSPENDED_MSG = 'group is suspended';

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

describe('FEAT-PC026 — suspended-group admin access contracts (ADM-G)', () => {
  const admin = createAdminClient();

  let ada: TestUser; // platform admin — NEVER a member of gSusp/gActive
  let stella: TestUser; // steward of all groups
  let mona: TestUser; // member of gSusp + gActive (Doorholder)
  let paula: TestUser; // member of gSusp — the remove target
  const users: TestUser[] = [];

  let adaC: SupabaseClient;
  let stellaC: SupabaseClient;
  let monaC: SupabaseClient;
  let anonC: SupabaseClient;

  let gSusp: string; // the suspended target (content laid while active)
  let gActive: string; // active control — byte-identical refusals pinned
  let gSusp2: string; // ada participates BEFORE the flip (A/P/S truth row)
  let gResting: string; // the remove-door resting pin

  let paulaUserId: string; // public.users.id (NOT the auth id)

  let pS1: string; // gSusp forum posts (moderate target / spare)
  let pS2: string;
  let pA1: string; // gActive post (purpose-bound refusal target)
  let aS1: string; // gSusp announcement
  let cSusp: string; // gSusp conversation (mona+stella; ada NOT participant)
  let cActive: string; // gActive conversation (mona+stella; ada NOT participant)
  let c2: string; // gSusp2 conversation (ada IS participant)
  let dm: string; // mona<->stella DM

  const expectRefusal = async (
    client: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
    msg: string,
  ) => {
    const { error } = await client.rpc(fn, args);
    expect(error).not.toBeNull();
    expect(String(error?.message)).toContain(msg);
  };

  const expectOk = async (
    client: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
  ): Promise<unknown> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(`${fn} expected ok: ${error.message}`);
    return data;
  };

  const auditCount = async (action: string, target: string): Promise<number> => {
    const { count, error } = await admin
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', action)
      .eq('target', target);
    if (error) throw new Error(`auditCount(${action}): ${error.message}`);
    return count ?? 0;
  };

  /** Direct PostgREST SELECT row count — the RLS verdict as the client sees it. */
  const rlsRows = async (
    client: SupabaseClient,
    table: string,
    column: string,
    value: string,
  ): Promise<number> => {
    const { data, error } = await client.from(table).select('id').eq(column, value);
    if (error) throw new Error(`rls ${table}: ${error.message}`);
    return (data ?? []).length;
  };

  /** A role carrying EVERY catalog permission except rest_group (house idiom). */
  const grantDoorholder = async (groupId: string, memberPg: string, tag: string) => {
    await runAdminSql(`
      DO $$
      DECLARE v_role uuid;
      BEGIN
        INSERT INTO public.group_roles (group_id, name, description)
        VALUES ('${groupId}', 'ADMG Doorholder ${tag}', 'every door permission except rest_group')
        RETURNING id INTO v_role;
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT v_role, p.id FROM public.permissions p WHERE p.name <> 'rest_group'
        ON CONFLICT DO NOTHING;
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${memberPg}', '${groupId}', v_role, '${memberPg}')
        ON CONFLICT DO NOTHING;
      END $$;`);
  };

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'AdmgAda' });
    stella = await createTestUser({ displayName: 'AdmgStella' });
    mona = await createTestUser({ displayName: 'AdmgMona' });
    paula = await createTestUser({ displayName: 'AdmgPaula' });
    users.push(ada, stella, mona, paula);
    await makePlatformAdmin(ada.personalGroupId);

    const signIn = async (u: TestUser) => {
      const c = createTestClient();
      await signInWithRetry(c, u.email, u.password);
      return c;
    };
    adaC = await signIn(ada);
    stellaC = await signIn(stella);
    monaC = await signIn(mona);
    anonC = createTestClient(); // never signed in

    const mkGroup = async (name: string): Promise<string> => {
      const { data, error } = await stellaC.rpc('create_engagement_group', { p_name: name });
      if (error) throw new Error(`create ${name}: ${error.message}`);
      return data as string;
    };
    gSusp = await mkGroup('ADMG Suspended Target');
    gActive = await mkGroup('ADMG Active Control');
    gSusp2 = await mkGroup('ADMG Admin Participant');
    gResting = await mkGroup('ADMG Resting Pin');

    // Members (active) — the house admin-insert idiom.
    for (const [g, members] of [
      [gSusp, [mona, paula]],
      [gActive, [mona]],
      [gSusp2, [ada]],
      [gResting, [mona]],
    ] as Array<[string, TestUser[]]>) {
      for (const m of members) {
        const { error } = await admin.from('group_memberships').insert({
          group_id: g,
          member_group_id: m.personalGroupId,
          status: 'active',
          added_by_group_id: stella.personalGroupId,
        });
        if (error) throw new Error(`membership ${g}: ${error.message}`);
      }
    }
    await grantDoorholder(gSusp, mona.personalGroupId, 'S');
    await grantDoorholder(gActive, mona.personalGroupId, 'A');
    await grantDoorholder(gSusp2, ada.personalGroupId, 'P');

    // public.users.id for the remove contract (NOT the auth id).
    const { data: pu, error: puErr } = await admin
      .from('users')
      .select('id')
      .eq('personal_group_id', paula.personalGroupId)
      .single();
    if (puErr) throw new Error(`paula users row: ${puErr.message}`);
    paulaUserId = (pu as { id: string }).id;

    // Content laid while active.
    const post = async (c: SupabaseClient, g: string, content: string): Promise<string> => {
      const data = (await expectOk(c, 'create_forum_post', { p_group_id: g, p_content: content })) as {
        id: string;
      };
      return data.id;
    };
    pS1 = await post(monaC, gSusp, 'ADMG moderate target');
    pS2 = await post(monaC, gSusp, 'ADMG spare post');
    pA1 = await post(monaC, gActive, 'ADMG active post');

    aS1 = ((await expectOk(stellaC, 'send_community_announcement', {
      p_group_id: gSusp,
      p_title: 'ADMG suspended announcement',
      p_body: 'laid while active',
    })) as { id: string }).id;
    await expectOk(stellaC, 'send_community_announcement', {
      p_group_id: gActive,
      p_title: 'ADMG active announcement',
      p_body: 'control',
    });

    cSusp = (await expectOk(monaC, 'create_group_conversation', {
      p_group_id: gSusp,
      p_title: 'ADMG susp conversation',
    })) as string;
    await expectOk(stellaC, 'join_group_conversation', { p_conversation_id: cSusp });
    await expectOk(monaC, 'send_message', { p_conversation_id: cSusp, p_content: 'evidence body' });

    cActive = (await expectOk(monaC, 'create_group_conversation', {
      p_group_id: gActive,
      p_title: 'ADMG active conversation',
    })) as string;
    await expectOk(stellaC, 'join_group_conversation', { p_conversation_id: cActive });
    await expectOk(monaC, 'send_message', { p_conversation_id: cActive, p_content: 'control body' });

    c2 = (await expectOk(adaC, 'create_group_conversation', {
      p_group_id: gSusp2,
      p_title: 'ADMG admin-participant conversation',
    })) as string;
    await expectOk(adaC, 'send_message', { p_conversation_id: c2, p_content: 'admin as participant' });

    dm = (await expectOk(monaC, 'get_or_create_dm_conversation', {
      p_other_group_id: stella.personalGroupId,
    })) as string;
    await expectOk(monaC, 'send_message', { p_conversation_id: dm, p_content: 'dm while active' });

    // The flips — fixture-level status writes (the doors under test read
    // groups.status; the transition ceremonies have their own PC023 suite).
    await runAdminSql(`
      UPDATE public.groups SET status = 'suspended' WHERE id IN ('${gSusp}', '${gSusp2}');
      UPDATE public.groups SET status = 'resting' WHERE id = '${gResting}';`);
  });

  afterAll(async () => {
    for (const g of [gSusp, gActive, gSusp2, gResting]) {
      if (g) await cleanupTestGroup(g).catch(() => undefined);
    }
    await demotePlatformAdmin(ada.personalGroupId);
    for (const u of users) {
      await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  });

  // =========================================================================
  // STORY-1 — the admin reads a suspended group's communications.
  // RED AT HEAD: the three armed doors refuse the non-member admin.
  // =========================================================================
  describe('the sight arms (suspended group, non-member admin)', () => {
    it('get_group_announcements admits the admin', async () => {
      const data = (await expectOk(adaC, 'get_group_announcements', { p_group_id: gSusp })) as {
        announcements: Array<{ id: string }>;
      };
      expect(data.announcements.map((a) => a.id)).toContain(aS1);
    });

    it('get_group_conversations admits the admin', async () => {
      const data = (await expectOk(adaC, 'get_group_conversations', { p_group_id: gSusp })) as {
        conversations: Array<{ id: string }>;
      };
      expect(data.conversations.map((c) => c.id)).toContain(cSusp);
    });

    it('get_conversation_detail returns the message bodies (group-kind)', async () => {
      const data = (await expectOk(adaC, 'get_conversation_detail', {
        p_conversation_id: cSusp,
      })) as { messages: Array<{ content: string }>; my_last_read_at: string | null };
      expect(data.messages.length).toBeGreaterThanOrEqual(1);
      expect(data.messages.map((m) => m.content)).toContain('evidence body');
      expect(data.my_last_read_at).toBeNull(); // non-participant admin — no read row
    });

    it('get_group_forum admits the admin — LABELLED GREEN, the Tier-1 pass pinned as law (STORY-3)', async () => {
      const data = (await expectOk(adaC, 'get_group_forum', { p_group_id: gSusp })) as {
        posts: Array<{ id: string }>;
      };
      expect(data.posts.map((p) => p.id)).toContain(pS1);
    });

    it('member quarantine is byte-identical — all four doors still refuse the member (LABELLED GREEN)', async () => {
      await expectRefusal(monaC, 'get_group_announcements', { p_group_id: gSusp }, SUSPENDED_MSG);
      await expectRefusal(monaC, 'get_group_conversations', { p_group_id: gSusp }, SUSPENDED_MSG);
      await expectRefusal(monaC, 'get_conversation_detail', { p_conversation_id: cSusp }, SUSPENDED_MSG);
      await expectRefusal(monaC, 'get_group_forum', { p_group_id: gSusp }, SUSPENDED_MSG);
    });
  });

  // =========================================================================
  // STORY-2 — suspended-only and group-kind-only.
  // LABELLED GREEN pins except the RLS new-arm cells (red at head).
  // =========================================================================
  describe('suspended-only, group-kind-only', () => {
    it('the admin stays refused on the ACTIVE control group (LABELLED GREEN)', async () => {
      await expectRefusal(adaC, 'get_group_announcements', { p_group_id: gActive }, 'Group membership required');
      await expectRefusal(adaC, 'get_group_conversations', { p_group_id: gActive }, 'Not a member of this group');
      await expectRefusal(adaC, 'get_conversation_detail', { p_conversation_id: cActive }, 'Not a participant');
    });

    it('the DM stays outside admin sight in every status (LABELLED GREEN)', async () => {
      await expectRefusal(adaC, 'get_conversation_detail', { p_conversation_id: dm }, 'Not a participant');
    });

    it('RLS truth table — the new arm: non-participant admin reads the suspended family (RED at head)', async () => {
      expect(await rlsRows(adaC, 'conversations', 'id', cSusp)).toBe(1);
      expect(await rlsRows(adaC, 'messages', 'conversation_id', cSusp)).toBeGreaterThanOrEqual(1);
      expect(await rlsRows(adaC, 'conversation_participants', 'conversation_id', cSusp)).toBeGreaterThanOrEqual(1);
    });

    it('RLS truth table — the five unchanged rows hold (LABELLED GREEN)', async () => {
      // participant / non-admin / active -> rows
      expect(await rlsRows(monaC, 'messages', 'conversation_id', cActive)).toBeGreaterThanOrEqual(1);
      // participant / non-admin / suspended -> quarantined
      expect(await rlsRows(monaC, 'messages', 'conversation_id', cSusp)).toBe(0);
      // admin / participant / suspended -> preserved
      expect(await rlsRows(adaC, 'messages', 'conversation_id', c2)).toBeGreaterThanOrEqual(1);
      // admin / non-participant / active -> suspended-only holds
      expect(await rlsRows(adaC, 'messages', 'conversation_id', cActive)).toBe(0);
      // admin / non-participant / DM -> never
      expect(await rlsRows(adaC, 'messages', 'conversation_id', dm)).toBe(0);
    });

    it('forum RLS: the admin reads the suspended group posts directly (LABELLED GREEN — forum_select admin arm)', async () => {
      expect(await rlsRows(adaC, 'forum_posts', 'group_id', gSusp)).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // STORY-4 — the members payload carries the unique identifier.
  // RED AT HEAD: no `email` key on members rows.
  // =========================================================================
  describe('admin_get_group_detail members email (W-4 echo law)', () => {
    it('every members row is {personal_group_id, display_name, email, is_steward}', async () => {
      const data = (await expectOk(adaC, 'admin_get_group_detail', { p_group_id: gSusp })) as {
        status: string;
        stewards: unknown[];
        members: Array<{
          personal_group_id: string;
          display_name: string;
          email: string;
          is_steward: boolean;
        }>;
      };
      expect(data.status).toBe('suspended');
      expect(Array.isArray(data.stewards)).toBe(true); // rest of payload intact
      const emails = new Map(data.members.map((m) => [m.personal_group_id, m.email]));
      expect(emails.get(mona.personalGroupId)).toBe(mona.email);
      expect(emails.get(paula.personalGroupId)).toBe(paula.email);
      expect(emails.get(stella.personalGroupId)).toBe(stella.email);
      for (const m of data.members) {
        expect(typeof m.display_name).toBe('string');
        expect(typeof m.is_steward).toBe('boolean');
      }
    });
  });

  // =========================================================================
  // STORY-5 + STORY-6 — the audited acts and direct-caller honesty.
  // RED AT HEAD: the wrapper is absent (PGRST202 — the refusal-shape cells
  // assert post-apply copy, failing red at head too); the remove door
  // refuses the suspended group.
  // =========================================================================
  describe('admin_moderate_group_forum_post (the "clean forums" act)', () => {
    it('refuses a non-admin: platform administrator required (42501)', async () => {
      await expectRefusal(
        monaC,
        'admin_moderate_group_forum_post',
        { p_post_id: pS2, p_reason: 'not yours to use' },
        'platform administrator required',
      );
    });

    it('refuses anon at the grant layer (EXECUTE revoked)', async () => {
      const { error } = await anonC.rpc('admin_moderate_group_forum_post', {
        p_post_id: pS2,
        p_reason: 'anon',
      });
      expect(error).not.toBeNull();
      expect(String(error?.message)).toMatch(/permission denied/i);
    });

    it('refuses off group-suspension: P0001 group is not suspended (purpose-bound)', async () => {
      await expectRefusal(
        adaC,
        'admin_moderate_group_forum_post',
        { p_post_id: pA1, p_reason: 'active group' },
        'group is not suspended',
      );
    });

    it('refuses an unknown post: P0002', async () => {
      await expectRefusal(
        adaC,
        'admin_moderate_group_forum_post',
        { p_post_id: randomUUID(), p_reason: 'ghost' },
        'Post not found',
      );
    });

    it('refuses an empty reason: 22023', async () => {
      await expectRefusal(
        adaC,
        'admin_moderate_group_forum_post',
        { p_post_id: pS2, p_reason: '   ' },
        'Reason required',
      );
    });

    it('moderates the post under the existing law and writes the audit row', async () => {
      const result = (await expectOk(adaC, 'admin_moderate_group_forum_post', {
        p_post_id: pS1,
        p_reason: 'ADMG gate: offending content',
      })) as { post_id: string; group_id: string; author_group_id: string; is_deleted: boolean };
      expect(result.post_id).toBe(pS1);
      expect(result.group_id).toBe(gSusp);
      expect(result.author_group_id).toBe(mona.personalGroupId);
      expect(result.is_deleted).toBe(true);

      const { data: row } = await admin
        .from('forum_posts')
        .select('is_deleted')
        .eq('id', pS1)
        .single();
      expect((row as { is_deleted: boolean }).is_deleted).toBe(true);

      expect(await auditCount('moderation.forum_post_moderated', pS1)).toBe(1);
      const { data: audit } = await admin
        .from('admin_audit_log')
        .select('metadata, actor_group_id')
        .eq('action', 'moderation.forum_post_moderated')
        .eq('target', pS1)
        .single();
      const meta = (audit as { metadata: Record<string, unknown> }).metadata;
      expect(meta.group_id).toBe(gSusp);
      expect(meta.author_group_id).toBe(mona.personalGroupId);
      expect(meta.reason).toBe('ADMG gate: offending content');
      expect((audit as { actor_group_id: string }).actor_group_id).toBe(ada.personalGroupId);
    });
  });

  describe('admin_remove_member_from_group on the held group (the gate finding)', () => {
    it('still refuses a RESTING group — the amendment admits suspended only (LABELLED GREEN)', async () => {
      const { data: mu } = await admin
        .from('users')
        .select('id')
        .eq('personal_group_id', mona.personalGroupId)
        .single();
      await expectRefusal(
        adaC,
        'admin_remove_member_from_group',
        { p_group_id: gResting, p_target_user_id: (mu as { id: string }).id },
        'group is not active',
      );
    });

    it('completes the full removal cascade on the suspended group (RED at head: group is not active)', async () => {
      const result = (await expectOk(adaC, 'admin_remove_member_from_group', {
        p_group_id: gSusp,
        p_target_user_id: paulaUserId,
      })) as { success: boolean; scenario: string };
      expect(result.success).toBe(true);
      expect(result.scenario).toBe('regular_leave');

      const { count: membership } = await admin
        .from('group_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', gSusp)
        .eq('member_group_id', paula.personalGroupId);
      expect(membership ?? 0).toBe(0);

      const { count: roles } = await admin
        .from('user_group_roles')
        .select('group_role_id', { count: 'exact', head: true })
        .eq('group_id', gSusp)
        .eq('member_group_id', paula.personalGroupId);
      expect(roles ?? 0).toBe(0);

      expect(await auditCount('member.remove_from_group', paulaUserId)).toBeGreaterThanOrEqual(1);
    });
  });
});
