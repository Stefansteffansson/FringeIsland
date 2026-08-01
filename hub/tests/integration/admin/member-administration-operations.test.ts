import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  runAdminSql,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(300_000); // real-substrate suite: eleven users + a Mist, three walk topologies

/**
 * FEAT-PC021 gate 2 (Cycle ADM-C, TASK-ADMC-01) — the member operations family,
 * producer-driven. Sibling of member-administration-contracts.test.ts (gate 1).
 *
 * Four re-issues: admin_update_user_status / admin_decommission_user (audit
 * writes member.suspend / member.reactivate / member.decommission + typed
 * 42501/P0002 + the no-op guard), admin_hard_delete_user (typed + action
 * member.hard_delete; cascade + audit-before-delete unchanged),
 * admin_force_logout (typed + member.force_logout; mechanism unchanged).
 * Four new contracts: admin_exit_user_from_platform (the ADM-6 full-exit walk
 * re-derived from delete_own_account — three scenarios, terminal decommission
 * origin='admin', session revocation, NO F-2 erasure legs, NO profile scrub),
 * admin_remove_member_from_group (ADM-18), admin_grant_platform_admin /
 * admin_revoke_platform_admin (ADM-12 — explicit role-row insert; the floor
 * triggers refuse verbatim on the last admin).
 *
 * RED AT HEAD (pre-migration 20260801190000), by case:
 *  - STORY-3/4 audit cells: the mutations succeed but write NO admin_audit_log
 *    row (walk finding 2) or write the LEGACY action string
 *    ('admin_hard_delete_user' / 'admin_force_logout') — the dotted-name
 *    assertions fail on zero rows.
 *  - STORY-3 typed-refusal cells: unknown target answers P0001 prose, the
 *    assertions pin P0002; non-admin answers P0001 'Unauthorized:
 *    manage_all_groups…', the assertions pin 42501 (walk finding 3).
 *  - STORY-3 no-op cells: re-running the same transition SUCCEEDS at head, the
 *    assertions pin P0001-and-writes-nothing.
 *  - STORY-5/6/7 cells: all four new contracts absent — PGRST202 per call;
 *    S7e (last-admin floor) red on 'does not exist' instead of the verbatim
 *    floor message.
 *  - STORY-8: the post-change action catalog has zero member.* /
 *    platform_admin.* rows for the fixture targets.
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - S3g (the existing decommission-reactivation wall) and S8c (append-only —
 *    no UPDATE/DELETE policies on admin_audit_log, the PC020 S5b invariant).
 *  - S8d re-pins the PC020 S5c tamper refusal but is RED at head for catalog
 *    reasons: its subject row (a member.suspend audit row) does not exist
 *    until this gate's audit writes land.
 * DEMONSTRATED RED 2026-08-01 pre-apply: 26 failed / 2 passed — the two greens
 * are exactly S3g and S8c.
 *
 * STORY-5's "no partial state (transactional)" clause is structural: each
 * contract is one plpgsql function = one transaction; the S7e cell additionally
 * demonstrates the family's abort property end-to-end (the floor refusal rolls
 * back the whole revoke).
 */

/** Authenticated DeusEx caller — the house platform-admin elevation. */
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

const GHOST_USER = '00000000-0000-4000-8000-000000000000';
const LAST_ADMIN_FLOOR_MESSAGE =
  'Cannot remove the last DeusEx member. Assign another DeusEx member first.';

describe('FEAT-PC021 gate 2 — member administration operations family (ADM-3/4/5/6/12/18)', () => {
  const admin = createAdminClient();
  let oda: TestUser; // the platform-admin actor (DeusEx member)
  let nils: TestUser; // plain FIM — the non-admin caller
  let sten: TestUser; // STORY-3 sanction target (suspend/reactivate cycles)
  let dre: TestUser; // STORY-3 decommission target (one membership — preservation proof)
  let finn: TestUser; // STORY-4 force-logout target
  let hild: TestUser; // STORY-4 hard-delete target (authors a forum post + a journey)
  let rolf: TestUser; // STORY-5 exit target (three walk scenarios; exits under an admin hold)
  let tora: TestUser; // STORY-6 removal target (three one-group scenarios)
  let stig: TestUser; // steward of the regular_leave groups
  let berta: TestUser; // second member of the handover groups (notification recipient)
  let gerd: TestUser; // STORY-7 grant/revoke target

  let odaClient: SupabaseClient;
  let nilsClient: SupabaseClient;
  let mistClient: SupabaseClient | null = null;
  let mistAuthId: string | null = null;
  let mistUserId: string | null = null;

  const userIds = new Map<string, string>(); // TestUser.email -> public.users.id
  // rolf's exit topology
  let gx1 = ''; // stig stewards; rolf regular member -> regular_leave
  let gx2 = ''; // rolf sole steward; berta member    -> steward_handover
  let gx3 = ''; // rolf sole member                   -> group_closure
  // tora's removal topology
  let gr1 = ''; // stig stewards; tora regular member -> regular_leave
  let gr2 = ''; // tora sole steward; berta member    -> steward_handover
  let gr3 = ''; // tora sole member                   -> group_closure
  let gd = ''; // dre's membership (decommission preservation proof); hild's forum post lives here

  let deusexGroupId = '';
  let sentinelGroupId = '';
  let hildForumPostId = '';
  let hildJourneyId = '';
  let rolfJournalCountBefore = 0;

  const createdGroupIds: string[] = [];
  const users: TestUser[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const idOf = async (u: TestUser): Promise<string> => {
    const cached = userIds.get(u.email);
    if (cached) return cached;
    const { data, error } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', u.user.id)
      .single();
    if (error || !data) throw new Error(`idOf(${u.email}): ${error?.message}`);
    userIds.set(u.email, data.id);
    return data.id;
  };

  const lifecycleRowOf = async (u: TestUser) => {
    const { data, error } = await admin
      .from('users')
      .select('is_active, is_decommissioned, deactivation_origin, nickname, full_name')
      .eq('auth_user_id', u.user.id)
      .maybeSingle();
    if (error) throw new Error(`lifecycleRowOf(${u.email}): ${error.message}`);
    return data;
  };

  /** admin_audit_log rows for one dotted action + target (target = users.id::text). */
  const auditRows = async (action: string, target: string) =>
    runAdminSql(
      `SELECT actor_group_id, action, target, metadata FROM public.admin_audit_log
        WHERE action = '${action}' AND target = '${target}';`,
    );

  const sessionCountOf = async (authUserId: string): Promise<number> => {
    const rows = await runAdminSql(
      `SELECT count(*)::int AS n FROM auth.sessions WHERE user_id = '${authUserId}';`,
    );
    return rows[0].n as number;
  };

  const activeMembership = async (groupId: string, personalGroupId: string) => {
    const { data } = await admin
      .from('group_memberships')
      .select('status')
      .eq('group_id', groupId)
      .eq('member_group_id', personalGroupId)
      .maybeSingle();
    return data?.status === 'active';
  };

  const notifRows = async (recipientGroupId: string, type: string, groupId: string) => {
    const { data, error } = await admin
      .from('notifications')
      .select('id, type, payload')
      .eq('recipient_group_id', recipientGroupId)
      .eq('type', type)
      .eq('group_id', groupId);
    if (error) throw new Error(`notifRows(${type}): ${error.message}`);
    return data ?? [];
  };

  const seedGroup = async (
    creator: TestUser,
    name: string,
    members: TestUser[],
  ): Promise<string> => {
    const c = await asUser(creator);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const member of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: creator.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup(${name}) member: ${mErr.message}`);
    }
    return groupId as string;
  };

  beforeAll(async () => {
    oda = await createTestUser({ displayName: 'PC021ops Oda Admin' });
    nils = await createTestUser({ displayName: 'PC021ops Nils Nonadmin' });
    sten = await createTestUser({ displayName: 'PC021ops Sten Sanction' });
    dre = await createTestUser({ displayName: 'PC021ops Dre Decom' });
    finn = await createTestUser({ displayName: 'PC021ops Finn Forcedout' });
    hild = await createTestUser({ displayName: 'PC021ops Hild Harddeleted' });
    rolf = await createTestUser({ displayName: 'PC021ops Rolf Exit' });
    tora = await createTestUser({ displayName: 'PC021ops Tora Removed' });
    stig = await createTestUser({ displayName: 'PC021ops Stig Steward' });
    berta = await createTestUser({ displayName: 'PC021ops Berta Member' });
    gerd = await createTestUser({ displayName: 'PC021ops Gerd Granted' });
    users.push(oda, nils, sten, dre, finn, hild, rolf, tora, stig, berta, gerd);

    await makePlatformAdmin(oda.personalGroupId);
    odaClient = await asUser(oda);
    nilsClient = await asUser(nils);

    const [deusexRow] = await runAdminSql(
      `SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';`,
    );
    deusexGroupId = deusexRow.id as string;
    const [sentinelRow] = await runAdminSql(
      `SELECT id FROM public.groups WHERE name = '[Deleted User]' AND group_type = 'system';`,
    );
    sentinelGroupId = sentinelRow.id as string;

    // Walk topologies BEFORE any sanction (all actors active while arranging).
    gx1 = await seedGroup(stig, 'PC021ops gx1 regular', [rolf]);
    gx2 = await seedGroup(rolf, 'PC021ops gx2 handover', [berta]);
    gx3 = await seedGroup(rolf, 'PC021ops gx3 closure', []);
    gr1 = await seedGroup(stig, 'PC021ops gr1 regular', [tora]);
    gr2 = await seedGroup(tora, 'PC021ops gr2 handover', [berta]);
    gr3 = await seedGroup(tora, 'PC021ops gr3 closure', []);
    gd = await seedGroup(stig, 'PC021ops gd preserved', [dre]);

    // hild's attributions — the STORY-4 sentinel-cascade proof.
    const { data: post, error: postErr } = await admin
      .from('forum_posts')
      .insert({ group_id: gd, author_group_id: hild.personalGroupId, content: 'PC021ops hild post' })
      .select('id')
      .single();
    if (postErr) throw new Error(`hild forum post: ${postErr.message}`);
    hildForumPostId = post.id as string;
    const journeyRows = await runAdminSql(
      `INSERT INTO public.journeys (title, created_by_group_id, is_public, journey_type)
       VALUES ('PC021ops hild journey', '${hild.personalGroupId}', false, 'user_created')
       RETURNING id;`,
    );
    hildJourneyId = journeyRows[0].id as string;
    // hild is a consented FIM (createTestUser simulates a consented signup) and the
    // consent FKs are ON DELETE RESTRICT — the raw hard-delete would refuse 23503
    // (pinned by fim-account-erasure). Controlled test-teardown purge, the trigger's
    // sanctioned path, so STORY-4 exercises the cascade itself.
    await runAdminSql(
      `SELECT set_config('app.consent_erasure_in_progress', 'true', true);
       DELETE FROM public.consent_records WHERE subject_user_id = '${await idOf(hild)}';`,
    );

    // rolf: a journal entry (the no-F-2-erasure proof) + a live session.
    const rolfClient = await asUser(rolf);
    const { error: journalErr } = await rolfClient.rpc('create_journal_entry', {
      p_title: 'PC021ops rolf journal',
      p_body: 'survives the admin exit',
    });
    if (journalErr) throw new Error(`rolf journal: ${journalErr.message}`);
    const journalRows = await runAdminSql(
      `SELECT count(*)::int AS n FROM public.journal_entries
        WHERE owner_group_id = '${rolf.personalGroupId}';`,
    );
    rolfJournalCountBefore = journalRows[0].n as number;
    expect(rolfJournalCountBefore).toBeGreaterThanOrEqual(1);

    // finn: a live session to revoke.
    await asUser(finn);

    // A real Mist — is_temporary via handle_new_user on an anonymous session.
    mistClient = createTestClient();
    const anon = await withAnonRateLimitRetry(() => mistClient!.auth.signInAnonymously());
    const anonUser = (anon as { data?: { user?: { id: string } } }).data?.user;
    if (!anonUser) throw new Error('anonymous sign-in did not yield a user');
    mistAuthId = anonUser.id;
    const { data: mistRow } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', mistAuthId)
      .single();
    if (!mistRow) throw new Error('Mist users row not materialised');
    mistUserId = mistRow.id;
  });

  afterAll(async () => {
    if (mistAuthId) {
      await runAdminSql(`SELECT public._erase_mist('${mistAuthId}'::uuid);`).catch(() => undefined);
    }
    // Audit hygiene: this suite's fixture targets are fresh users, so their rows
    // are removable by target without touching anyone else's trail.
    const targetIds = [...userIds.values()];
    if (targetIds.length > 0) {
      await runAdminSql(
        `DELETE FROM public.admin_audit_log
          WHERE (action LIKE 'member.%' OR action LIKE 'platform_admin.%')
            AND target IN (${targetIds.map((t) => `'${t}'`).join(', ')});`,
      ).catch(() => undefined);
    }
    for (const gid of createdGroupIds) {
      await cleanupTestGroup(gid).catch(() => undefined);
    }
    await demotePlatformAdmin(gerd.personalGroupId); // in case a revoke cell failed mid-suite
    await demotePlatformAdmin(oda.personalGroupId);
    for (const u of users) {
      await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  });

  describe('STORY-3 — the sanction family, audited and typed', () => {
    it('S3a suspend writes the origin and the member.suspend audit row', async () => {
      const stenId = await idOf(sten);
      const { error } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: stenId,
        new_is_active: false,
      });
      expect(error).toBeNull();
      const row = await lifecycleRowOf(sten);
      expect(row?.is_active).toBe(false);
      expect(row?.deactivation_origin).toBe('admin');
      expect(await auditRows('member.suspend', stenId)).toHaveLength(1);
    });

    it('S3b re-running the same suspension refuses P0001 and writes nothing', async () => {
      const stenId = await idOf(sten);
      const { error } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: stenId,
        new_is_active: false,
      });
      expect(error?.code).toBe('P0001');
      expect(await auditRows('member.suspend', stenId)).toHaveLength(1);
    });

    it('S3c reactivate clears the origin and writes member.reactivate', async () => {
      const stenId = await idOf(sten);
      const { error } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: stenId,
        new_is_active: true,
      });
      expect(error).toBeNull();
      const row = await lifecycleRowOf(sten);
      expect(row?.is_active).toBe(true);
      expect(row?.deactivation_origin).toBeNull();
      expect(await auditRows('member.reactivate', stenId)).toHaveLength(1);
    });

    it('S3d re-running the reactivation refuses P0001 and writes nothing', async () => {
      const stenId = await idOf(sten);
      const { error } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: stenId,
        new_is_active: true,
      });
      expect(error?.code).toBe('P0001');
      expect(await auditRows('member.reactivate', stenId)).toHaveLength(1);
    });

    it('S3e decommission writes member.decommission, stamps the origin, and PRESERVES memberships (B-ADMIN-008)', async () => {
      const dreId = await idOf(dre);
      const { error } = await odaClient.rpc('admin_decommission_user', {
        target_user_id: dreId,
      });
      expect(error).toBeNull();
      const row = await lifecycleRowOf(dre);
      expect(row?.is_decommissioned).toBe(true);
      expect(row?.deactivation_origin).toBe('admin');
      expect(await auditRows('member.decommission', dreId)).toHaveLength(1);
      expect(await activeMembership(gd, dre.personalGroupId)).toBe(true); // history intact
    });

    it('S3f re-decommission refuses on the existing wall and writes nothing more', async () => {
      const dreId = await idOf(dre);
      const { error } = await odaClient.rpc('admin_decommission_user', {
        target_user_id: dreId,
      });
      expect(error?.code).toBe('P0001');
      expect(await auditRows('member.decommission', dreId)).toHaveLength(1);
    });

    it('S3g reactivating a decommissioned member holds the existing refusal', async () => {
      const { error } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: await idOf(dre),
        new_is_active: true,
      });
      expect(error?.code).toBe('P0001');
      expect(error?.message ?? '').toMatch(/decommissioned/i);
    });

    it('S3h unknown targets refuse P0002 on all three re-issued mutations', async () => {
      const upd = await odaClient.rpc('admin_update_user_status', {
        target_user_id: GHOST_USER,
        new_is_active: false,
      });
      expect(upd.error?.code).toBe('P0002');
      const dec = await odaClient.rpc('admin_decommission_user', { target_user_id: GHOST_USER });
      expect(dec.error?.code).toBe('P0002');
      const del = await odaClient.rpc('admin_hard_delete_user', { target_user_id: GHOST_USER });
      expect(del.error?.code).toBe('P0002');
    });
  });

  describe('STORY-4 — force-logout and hard-delete re-issues', () => {
    it('S4a force-logout revokes the session pair and writes member.force_logout; an inactive target is still valid (B-ADMIN-019)', async () => {
      const finnId = await idOf(finn);
      // Put finn under a hold first — inactive targets remain valid targets.
      const { error: holdErr } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: finnId,
        new_is_active: false,
      });
      expect(holdErr).toBeNull();
      expect(await sessionCountOf(finn.user.id)).toBeGreaterThanOrEqual(1);
      const { data, error } = await odaClient.rpc('admin_force_logout', {
        target_user_ids: [finnId],
      });
      expect(error).toBeNull();
      expect((data as { count: number }).count).toBe(1);
      expect(await sessionCountOf(finn.user.id)).toBe(0);
      expect(await auditRows('member.force_logout', 'users')).not.toHaveLength(0);
    });

    it('S4b hard-delete writes member.hard_delete BEFORE deletion and the sentinel cascade holds unchanged', async () => {
      const hildId = await idOf(hild);
      const { data, error } = await odaClient.rpc('admin_hard_delete_user', {
        target_user_id: hildId,
      });
      expect(error).toBeNull();
      expect((data as { success: boolean }).success).toBe(true);
      // The audit row survives the deletion of its subject — written before.
      expect(await auditRows('member.hard_delete', hildId)).toHaveLength(1);
      // Sentinel reassignment: forum authorship + journey attribution.
      const { data: post } = await admin
        .from('forum_posts')
        .select('author_group_id')
        .eq('id', hildForumPostId)
        .single();
      expect(post?.author_group_id).toBe(sentinelGroupId);
      const { data: journey } = await admin
        .from('journeys')
        .select('created_by_group_id')
        .eq('id', hildJourneyId)
        .maybeSingle();
      expect(journey?.created_by_group_id).toBe(sentinelGroupId);
      // The users + auth.users rows are gone.
      const { data: gone } = await admin
        .from('users')
        .select('id')
        .eq('id', hildId)
        .maybeSingle();
      expect(gone).toBeNull();
      const authRows = await runAdminSql(
        `SELECT count(*)::int AS n FROM auth.users WHERE id = '${hild.user.id}';`,
      );
      expect(authRows[0].n).toBe(0);
    });
  });

  describe('STORY-5 — the admin platform exit (the ADM-6 walk)', () => {
    it('S5a the three-scenario walk: departure, caretaker handover, closure; terminal decommission; sessions dead; NO erasure, NO scrub', async () => {
      const rolfId = await idOf(rolf);
      // An admin hold does NOT block the exit — the admin is the actor here.
      const { error: holdErr } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: rolfId,
        new_is_active: false,
      });
      expect(holdErr).toBeNull();
      expect(await sessionCountOf(rolf.user.id)).toBeGreaterThanOrEqual(1);

      const { data, error } = await odaClient.rpc('admin_exit_user_from_platform', {
        p_target_user_id: rolfId,
      });
      expect(error).toBeNull();
      const result = data as {
        success: boolean;
        groups_exited: number;
        group_details: Array<{ group_id: string; group_name: string; scenario: string }>;
        decommissioned: boolean;
      };
      expect(result.success).toBe(true);
      expect(result.decommissioned).toBe(true);
      expect(result.groups_exited).toBe(3);
      const byGroup = new Map(result.group_details.map((d) => [d.group_id, d.scenario]));
      expect(byGroup.get(gx1)).toBe('regular_leave');
      expect(byGroup.get(gx2)).toBe('steward_handover');
      expect(byGroup.get(gx3)).toBe('group_closure');

      // gx1 regular_leave: membership ended, the group lives on.
      expect(await activeMembership(gx1, rolf.personalGroupId)).toBe(false);
      const { data: gx1Row } = await admin.from('groups').select('status').eq('id', gx1).single();
      expect(gx1Row?.status).toBe('active');

      // gx2 steward_handover: DeusEx steps in as caretaker; the existing kinds fire.
      expect(await activeMembership(gx2, rolf.personalGroupId)).toBe(false);
      expect(await activeMembership(gx2, deusexGroupId)).toBe(true);
      expect(await notifRows(berta.personalGroupId, 'stewardship_transferred', gx2)).toHaveLength(1);
      expect(await notifRows(deusexGroupId, 'stewardship_required', gx2)).toHaveLength(1);

      // gx3 group_closure.
      const { data: gx3Row } = await admin.from('groups').select('status').eq('id', gx3).single();
      expect(gx3Row?.status).toBe('closed');

      // Terminal decommission with the admin origin; sessions revoked.
      const row = await lifecycleRowOf(rolf);
      expect(row?.is_decommissioned).toBe(true);
      expect(row?.deactivation_origin).toBe('admin');
      expect(await sessionCountOf(rolf.user.id)).toBe(0);

      // NO profile scrub, NO F-2 erasure legs: identity and journal survive.
      expect(row?.full_name).not.toBe('[Deleted User]');
      expect(row?.nickname).not.toBe('[Deleted User]');
      const journalRows = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.journal_entries
          WHERE owner_group_id = '${rolf.personalGroupId}';`,
      );
      expect(journalRows[0].n).toBe(rolfJournalCountBefore);

      // One audit row carrying the per-group scenarios.
      const audit = await auditRows('member.platform_exit', rolfId);
      expect(audit).toHaveLength(1);
      const detail = (audit[0].metadata as { group_details: Array<{ scenario: string }> })
        .group_details;
      expect(detail.map((d) => d.scenario).sort()).toEqual([
        'group_closure',
        'regular_leave',
        'steward_handover',
      ]);
    });

    it('S5b an already-terminal target refuses P0001 and writes nothing more', async () => {
      const rolfId = await idOf(rolf);
      const { error } = await odaClient.rpc('admin_exit_user_from_platform', {
        p_target_user_id: rolfId,
      });
      expect(error?.code).toBe('P0001');
      expect(await auditRows('member.platform_exit', rolfId)).toHaveLength(1);
    });

    it('S5c unknown and Mist targets are existence-hidden P0002', async () => {
      const ghost = await odaClient.rpc('admin_exit_user_from_platform', {
        p_target_user_id: GHOST_USER,
      });
      expect(ghost.error?.code).toBe('P0002');
      const mist = await odaClient.rpc('admin_exit_user_from_platform', {
        p_target_user_id: mistUserId,
      });
      expect(mist.error?.code).toBe('P0002');
    });
  });

  describe('STORY-6 — targeted removal (ADM-18)', () => {
    it('S6a regular_leave: the membership ends, the group lives, audit carries group + scenario', async () => {
      const toraId = await idOf(tora);
      const { data, error } = await odaClient.rpc('admin_remove_member_from_group', {
        p_group_id: gr1,
        p_target_user_id: toraId,
      });
      expect(error).toBeNull();
      expect((data as { scenario: string }).scenario).toBe('regular_leave');
      expect(await activeMembership(gr1, tora.personalGroupId)).toBe(false);
      const { data: g } = await admin.from('groups').select('status').eq('id', gr1).single();
      expect(g?.status).toBe('active');
      const audit = await auditRows('member.remove_from_group', toraId);
      expect(
        audit.filter((r) => (r.metadata as { group_id: string }).group_id === gr1),
      ).toHaveLength(1);
    });

    it('S6b steward_handover: DeusEx caretakership + the existing notification kinds', async () => {
      const toraId = await idOf(tora);
      const { data, error } = await odaClient.rpc('admin_remove_member_from_group', {
        p_group_id: gr2,
        p_target_user_id: toraId,
      });
      expect(error).toBeNull();
      expect((data as { scenario: string }).scenario).toBe('steward_handover');
      expect(await activeMembership(gr2, tora.personalGroupId)).toBe(false);
      expect(await activeMembership(gr2, deusexGroupId)).toBe(true);
      expect(await notifRows(berta.personalGroupId, 'stewardship_transferred', gr2)).toHaveLength(1);
      expect(await notifRows(deusexGroupId, 'stewardship_required', gr2)).toHaveLength(1);
    });

    it('S6c group_closure: the sole member leaves, the group closes', async () => {
      const toraId = await idOf(tora);
      const { data, error } = await odaClient.rpc('admin_remove_member_from_group', {
        p_group_id: gr3,
        p_target_user_id: toraId,
      });
      expect(error).toBeNull();
      expect((data as { scenario: string }).scenario).toBe('group_closure');
      const { data: g } = await admin.from('groups').select('status').eq('id', gr3).single();
      expect(g?.status).toBe('closed');
    });

    it('S6d a member not active in the named group refuses P0002', async () => {
      const again = await odaClient.rpc('admin_remove_member_from_group', {
        p_group_id: gr1,
        p_target_user_id: await idOf(tora),
      });
      expect(again.error?.code).toBe('P0002');
      const ghostGroup = await odaClient.rpc('admin_remove_member_from_group', {
        p_group_id: GHOST_USER,
        p_target_user_id: await idOf(tora),
      });
      expect(ghostGroup.error?.code).toBe('P0002');
    });
  });

  describe('STORY-7 — platform-administrator grant and revoke (ADM-12)', () => {
    it('S7a grant: membership + role rows explicit, the reads flip, role_assigned arrives, audit platform_admin.grant', async () => {
      const gerdId = await idOf(gerd);
      const { error } = await odaClient.rpc('admin_grant_platform_admin', {
        p_target_user_id: gerdId,
      });
      expect(error).toBeNull();
      expect(await activeMembership(deusexGroupId, gerd.personalGroupId)).toBe(true);
      const roleRows = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.user_group_roles ugr
          JOIN public.group_roles r ON r.id = ugr.group_role_id
         WHERE ugr.group_id = '${deusexGroupId}' AND r.name = 'DeusEx'
           AND ugr.member_group_id = '${gerd.personalGroupId}';`,
      );
      expect(roleRows[0].n).toBe(1); // explicit insert — the invited->active trigger never fired here
      const { data: list } = await odaClient.rpc('admin_get_users', {
        p_filter: 'platform_admins',
      });
      const gerdRow = (list as Array<{ id: string; is_platform_admin: boolean }>).find(
        (r) => r.id === gerdId,
      );
      expect(gerdRow?.is_platform_admin).toBe(true);
      expect(await notifRows(gerd.personalGroupId, 'role_assigned', deusexGroupId)).toHaveLength(1);
      expect(await auditRows('platform_admin.grant', gerdId)).toHaveLength(1);
    });

    it('S7b granting an existing admin refuses P0001 and writes nothing more', async () => {
      const gerdId = await idOf(gerd);
      const { error } = await odaClient.rpc('admin_grant_platform_admin', {
        p_target_user_id: gerdId,
      });
      expect(error?.code).toBe('P0001');
      expect(await auditRows('platform_admin.grant', gerdId)).toHaveLength(1);
    });

    it('S7c revoke (not the last): both rows gone, the reads flip back, audit platform_admin.revoke', async () => {
      const gerdId = await idOf(gerd);
      const { error } = await odaClient.rpc('admin_revoke_platform_admin', {
        p_target_user_id: gerdId,
      });
      expect(error).toBeNull();
      expect(await activeMembership(deusexGroupId, gerd.personalGroupId)).toBe(false);
      const roleRows = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.user_group_roles
          WHERE group_id = '${deusexGroupId}' AND member_group_id = '${gerd.personalGroupId}';`,
      );
      expect(roleRows[0].n).toBe(0);
      const { data: list } = await odaClient.rpc('admin_get_users', {
        p_filter: 'platform_admins',
      });
      expect(
        (list as Array<{ id: string }>).find((r) => r.id === gerdId),
      ).toBeUndefined();
      expect(await auditRows('platform_admin.revoke', gerdId)).toHaveLength(1);
    });

    it('S7d revoking a non-admin refuses P0001; unknown/Mist targets P0002; a non-active grant target refuses P0001', async () => {
      const again = await odaClient.rpc('admin_revoke_platform_admin', {
        p_target_user_id: await idOf(gerd),
      });
      expect(again.error?.code).toBe('P0001');
      const ghost = await odaClient.rpc('admin_grant_platform_admin', {
        p_target_user_id: GHOST_USER,
      });
      expect(ghost.error?.code).toBe('P0002');
      const mist = await odaClient.rpc('admin_grant_platform_admin', {
        p_target_user_id: mistUserId,
      });
      expect(mist.error?.code).toBe('P0002');
      const decommissioned = await odaClient.rpc('admin_grant_platform_admin', {
        p_target_user_id: await idOf(dre),
      });
      expect(decommissioned.error?.code).toBe('P0001');
    });

    it('S7e the LAST admin: the floor trigger refuses verbatim through the contract and nothing is written', async () => {
      // The founding DeusEx members share the dev DB, so the last-admin state is
      // arranged inside a rolled-back transaction: forge the caller's JWT claims
      // (auth.uid() reads request.jwt.claims), thin the DeusEx role rows down to
      // oda's, then drive the REAL contract into the floor. The raise aborts the
      // transaction — the founders' rows are untouched afterwards, which is also
      // the family's no-partial-state property demonstrated end-to-end.
      const odaId = await idOf(oda);
      const before = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.user_group_roles ugr
          JOIN public.group_roles r ON r.id = ugr.group_role_id
         WHERE ugr.group_id = '${deusexGroupId}' AND r.name = 'DeusEx';`,
      );
      let thrown = '';
      try {
        await runAdminSql(
          `BEGIN;
           SELECT set_config('request.jwt.claims',
             '{"sub":"${oda.user.id}","role":"authenticated"}', true);
           DELETE FROM public.user_group_roles ugr
            USING public.group_roles r
            WHERE r.id = ugr.group_role_id
              AND ugr.group_id = '${deusexGroupId}' AND r.name = 'DeusEx'
              AND ugr.member_group_id <> '${oda.personalGroupId}';
           SELECT public.admin_revoke_platform_admin('${odaId}');
           ROLLBACK;`,
          { maxRetries: 1 },
        );
      } catch (err) {
        thrown = err instanceof Error ? err.message : String(err);
      }
      expect(thrown).toContain(LAST_ADMIN_FLOOR_MESSAGE);
      const after = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.user_group_roles ugr
          JOIN public.group_roles r ON r.id = ugr.group_role_id
         WHERE ugr.group_id = '${deusexGroupId}' AND r.name = 'DeusEx';`,
      );
      expect(after[0].n).toBe(before[0].n); // nothing written, founders intact
    });
  });

  describe('STORY-1 clause — refusals hold for every contract in this feature', () => {
    it('R1 a non-admin caller refuses 42501 on all eight operations', async () => {
      const anyId = await idOf(sten);
      const cells: Array<[string, Record<string, unknown>]> = [
        ['admin_update_user_status', { target_user_id: anyId, new_is_active: false }],
        ['admin_decommission_user', { target_user_id: anyId }],
        ['admin_hard_delete_user', { target_user_id: anyId }],
        ['admin_force_logout', { target_user_ids: [anyId] }],
        ['admin_exit_user_from_platform', { p_target_user_id: anyId }],
        ['admin_remove_member_from_group', { p_group_id: gd, p_target_user_id: anyId }],
        ['admin_grant_platform_admin', { p_target_user_id: anyId }],
        ['admin_revoke_platform_admin', { p_target_user_id: anyId }],
      ];
      for (const [fn, args] of cells) {
        const { error } = await nilsClient.rpc(fn, args);
        expect({ fn, code: error?.code }).toEqual({ fn, code: '42501' });
      }
    });

    it('R2 an anon caller is refused EXECUTE on the four new contracts', async () => {
      const anon = createTestClient();
      const cells: Array<[string, Record<string, unknown>]> = [
        ['admin_exit_user_from_platform', { p_target_user_id: GHOST_USER }],
        ['admin_remove_member_from_group', { p_group_id: GHOST_USER, p_target_user_id: GHOST_USER }],
        ['admin_grant_platform_admin', { p_target_user_id: GHOST_USER }],
        ['admin_revoke_platform_admin', { p_target_user_id: GHOST_USER }],
      ];
      for (const [fn, args] of cells) {
        const { error } = await anon.rpc(fn, args);
        expect({ fn, code: error?.code }).toEqual({ fn, code: '42501' });
      }
    });
  });

  describe('STORY-8 — producer-driven audit proof against the post-change catalog', () => {
    it('S8a every mutation exercised above has its named admin_audit_log row', async () => {
      expect(await auditRows('member.suspend', await idOf(sten))).toHaveLength(1);
      expect(await auditRows('member.reactivate', await idOf(sten))).toHaveLength(1);
      expect(await auditRows('member.decommission', await idOf(dre))).toHaveLength(1);
      expect(await auditRows('member.force_logout', 'users')).not.toHaveLength(0);
      expect(await auditRows('member.hard_delete', await idOf(hild))).toHaveLength(1);
      expect(await auditRows('member.platform_exit', await idOf(rolf))).toHaveLength(1);
      expect(await auditRows('member.remove_from_group', await idOf(tora))).toHaveLength(3);
      expect(await auditRows('platform_admin.grant', await idOf(gerd))).toHaveLength(1);
      expect(await auditRows('platform_admin.revoke', await idOf(gerd))).toHaveLength(1);
    });

    it('S8b the audit actor is the admin, never the target', async () => {
      const rows = await auditRows('member.suspend', await idOf(sten));
      expect(rows[0].actor_group_id).toBe(oda.personalGroupId);
    });

    it('S8c (labelled green, carried forward): append-only — no UPDATE/DELETE policies on admin_audit_log', async () => {
      const rows = await runAdminSql(
        `SELECT cmd FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'admin_audit_log'
            AND cmd IN ('UPDATE', 'DELETE');`,
      );
      expect(rows).toHaveLength(0);
    });

    it('S8d an authenticated UPDATE on a post-change audit row lands nowhere (PC020 S5c re-pinned; red at head only because the subject row is)', async () => {
      const stenId = await idOf(sten);
      const { data } = await odaClient
        .from('admin_audit_log')
        .update({ action: 'tampered' })
        .eq('action', 'member.suspend')
        .eq('target', stenId)
        .select();
      expect(data ?? []).toHaveLength(0);
      expect(await auditRows('member.suspend', stenId)).toHaveLength(1); // row unchanged
    });
  });
});
