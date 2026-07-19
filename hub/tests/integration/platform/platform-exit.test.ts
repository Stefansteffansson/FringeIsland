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

jest.setTimeout(60_000); // real-substrate suite: sign-ins + fixtures per test

/**
 * W2 characterization (COR-A / spec A) — admin_exit_user_from_platform
 * (Sprint 4 platform exit, migration 20260228144747_sprint4_platform_exit.sql).
 *
 * GREEN-BEFORE, not red-first: these pin the RPC's CURRENT lifecycle-cascade
 * behaviour so the ADR-U047 relocation (W4) is provably behaviour-preserving.
 * The three per-group scenarios the RPC branches into (:154-160) — regular
 * leave (L1), sole-Steward → DeusEx handover (L2), last-member group closure
 * (L3) — plus the four safety guards (:53-105). No hub caller invokes this RPC
 * today; it is GRANTed to `authenticated` and gates internally on
 * manage_all_groups, so we drive it as a signed-in platform admin (the
 * erase_fim_account / DeusEx-promote pattern), never via service role (a
 * service-role caller has no auth.uid() and trips 'not authenticated').
 *
 * Dispositions pinned (the freeze reasons W4's DS-3 fact must carry):
 *   L1/L2 leaving member's non-public enrolment -> frozen 'left_group'
 *   L3 non-public + group-level enrolments      -> frozen 'group_closed'
 *   L3 non-public journeys -> DeusEx; public journeys UNCHANGED.
 */

/** Promote a personal group to platform admin: active DeusEx member + DeusEx
 *  role (Tier-1 grants manage_all_groups context-free). Direct active insert
 *  bypasses the invited->active auto-role trigger; the role is inserted
 *  explicitly. The invitation/closure suites' pattern, reused. */
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

/** Best-effort demote (the founding DeusEx member remains, so the last-member
 *  guard never trips). */
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
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
    END $$;`).catch(() => undefined);
}

describe('W2 characterization — admin_exit_user_from_platform (Sprint 4 platform exit)', () => {
  const admin = createAdminClient();

  let adminUser: TestUser; // the signed-in platform admin (DeusEx) making the call
  let stewardL1: TestUser; // L1 group creator (holds Steward); also the non-admin caller
  let targetL1: TestUser; // L1 subject — plain member, regular leave
  let targetL2: TestUser; // L2 subject — sole Steward, handover
  let memberL2: TestUser; // L2 remaining member (receives the transfer notice)
  let inviteeL2: TestUser; // L2 pending FIM invitation issued by the sole Steward
  let targetL3: TestUser; // L3 subject — sole member, group closure
  let deusexMember: TestUser; // DeusEx member — the un-exitable guard target
  let bystander: TestUser; // untouched target for the non-admin caller guard

  let adminClient: SupabaseClient;
  let adminGroupId: string;
  let deusexMemberGroupId: string;
  let deusEx: string;

  // public.users PKs (the RPC takes p_target_user_id = users.id, not auth id).
  const pk: Record<string, string> = {};

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const deusExGroupId = async (): Promise<string> => {
    const rows = await runAdminSql(
      `SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';`,
    );
    return rows[0].id as string;
  };

  const usersPkOf = async (authUserId: string): Promise<string> => {
    const rows = await runAdminSql(
      `SELECT id FROM public.users WHERE auth_user_id = '${authUserId}';`,
    );
    return rows[0].id as string;
  };

  /** Create a private engagement group as `creator` (creator becomes active
   *  Steward), then seed the extra active members via admin. */
  const seedGroupAs = async (
    creator: TestUser,
    name: string,
    members: TestUser[],
  ): Promise<string> => {
    const c = await asUser(creator);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    await c.auth.signOut();
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const m of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: m.personalGroupId,
        status: 'active',
        added_by_group_id: creator.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }
    return groupId as string;
  };

  const seedJourney = async (groupId: string, isPublic: boolean): Promise<string> => {
    const { data, error } = await admin
      .from('journeys')
      .insert({ title: 'ExitFixture', created_by_group_id: groupId, is_public: isPublic })
      .select('id')
      .single();
    if (error) throw new Error(`journey fixture: ${error.message}`);
    createdJourneyIds.push(data!.id as string);
    return data!.id as string;
  };

  const seedEnrollment = async (
    journeyId: string,
    enrolleeGroupId: string,
    status = 'active',
  ): Promise<string> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .insert({ journey_id: journeyId, group_id: enrolleeGroupId, status })
      .select('id')
      .single();
    if (error) throw new Error(`enrollment fixture: ${error.message}`);
    return data!.id as string;
  };

  const enrollmentState = async (id: string) => {
    const { data } = await admin
      .from('journey_enrollments')
      .select('status, progress_data')
      .eq('id', id)
      .single();
    return data;
  };

  const journeyOwner = async (id: string): Promise<string> => {
    const { data } = await admin
      .from('journeys')
      .select('created_by_group_id')
      .eq('id', id)
      .single();
    return data!.created_by_group_id as string;
  };

  const groupRow = async (groupId: string) => {
    const rows = await runAdminSql(
      `SELECT id, status FROM public.groups WHERE id = '${groupId}';`,
    );
    return rows[0] ?? null;
  };

  const membershipRows = async (groupId: string) => {
    const rows = await runAdminSql(
      `SELECT member_group_id, status FROM public.group_memberships WHERE group_id = '${groupId}';`,
    );
    return rows as Array<{ member_group_id: string; status: string }>;
  };

  const roleBindingCount = async (groupId: string, memberGroupId: string): Promise<number> => {
    const rows = await runAdminSql(
      `SELECT count(*)::int AS n FROM public.user_group_roles
        WHERE group_id = '${groupId}' AND member_group_id = '${memberGroupId}';`,
    );
    return rows[0].n as number;
  };

  const notificationsOf = async (groupId: string, type: string) => {
    const { data } = await admin
      .from('notifications')
      .select('recipient_group_id, type')
      .eq('group_id', groupId)
      .eq('type', type);
    return data ?? [];
  };

  beforeAll(async () => {
    deusEx = await deusExGroupId();
    adminUser = await createTestUser({ displayName: 'Grace Hopper' });
    stewardL1 = await createTestUser({ displayName: 'StewardL1' });
    targetL1 = await createTestUser({ displayName: 'TargetL1' });
    targetL2 = await createTestUser({ displayName: 'TargetL2' });
    memberL2 = await createTestUser({ displayName: 'MemberL2' });
    inviteeL2 = await createTestUser({ displayName: 'InviteeL2' });
    targetL3 = await createTestUser({ displayName: 'TargetL3' });
    deusexMember = await createTestUser({ displayName: 'DeusExMember' });
    bystander = await createTestUser({ displayName: 'Bystander' });
    for (const u of [
      adminUser, stewardL1, targetL1, targetL2, memberL2, inviteeL2, targetL3,
      deusexMember, bystander,
    ]) {
      createdUserIds.push(u.user.id);
    }

    adminGroupId = adminUser.personalGroupId;
    deusexMemberGroupId = deusexMember.personalGroupId;
    await makePlatformAdmin(adminGroupId);
    await makePlatformAdmin(deusexMemberGroupId);

    pk.admin = await usersPkOf(adminUser.user.id);
    pk.targetL1 = await usersPkOf(targetL1.user.id);
    pk.targetL2 = await usersPkOf(targetL2.user.id);
    pk.targetL3 = await usersPkOf(targetL3.user.id);
    pk.deusexMember = await usersPkOf(deusexMember.user.id);
    pk.bystander = await usersPkOf(bystander.user.id);

    adminClient = createTestClient();
    await signInWithRetry(adminClient, adminUser.email, adminUser.password);
  }, 120_000);

  afterAll(async () => {
    for (const id of createdJourneyIds) {
      await admin.from('journey_enrollments').delete().eq('journey_id', id);
      await admin.from('journeys').delete().eq('id', id);
    }
    for (const id of createdGroupIds) await cleanupTestGroup(id);
    await demotePlatformAdmin(adminGroupId);
    await demotePlatformAdmin(deusexMemberGroupId);
    for (const id of createdUserIds) await cleanupTestUser(id);
  }, 120_000);

  // ==========================================================================
  // Guards (:53-105) — pinned before any mutation happens
  // ==========================================================================
  describe('safety guards', () => {
    it('a non-admin caller is refused (manage_all_groups required) — the bystander is untouched', async () => {
      const c = await asUser(stewardL1); // a plain FIM, not a DeusEx member
      const { error } = await c.rpc('admin_exit_user_from_platform', {
        p_target_user_id: pk.bystander,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001'); // RAISE with no ERRCODE -> raise_exception
      expect(error!.message).toContain('platform admin');
      await c.auth.signOut();

      const { data: survivor } = await admin
        .from('users')
        .select('is_decommissioned')
        .eq('id', pk.bystander)
        .single();
      expect(survivor!.is_decommissioned).toBe(false);
    });

    it('the admin cannot exit itself', async () => {
      const { error } = await adminClient.rpc('admin_exit_user_from_platform', {
        p_target_user_id: pk.admin,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect(error!.message).toContain('yourself');
    });

    it('a DeusEx member (platform admin) cannot be exited — remove from DeusEx first', async () => {
      const { error } = await adminClient.rpc('admin_exit_user_from_platform', {
        p_target_user_id: pk.deusexMember,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect(error!.message).toContain('platform admin');

      const { data: survivor } = await admin
        .from('users')
        .select('is_decommissioned')
        .eq('id', pk.deusexMember)
        .single();
      expect(survivor!.is_decommissioned).toBe(false);
    });
  });

  // ==========================================================================
  // L1 — regular leave (multi-member group, target not sole Steward)
  // ==========================================================================
  it('L1 regular leave: the target’s non-public enrolment freezes left_group, its membership+roles are gone, the group stays active', async () => {
    const groupId = await seedGroupAs(stewardL1, 'ExitL1', [targetL1]);
    const journeyId = await seedJourney(groupId, false);
    const enrollmentId = await seedEnrollment(journeyId, targetL1.personalGroupId, 'active');

    const { data, error } = await adminClient.rpc('admin_exit_user_from_platform', {
      p_target_user_id: pk.targetL1,
    });
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).groups_exited).toBe(1);
    expect((data as Record<string, unknown>).decommissioned).toBe(true);

    const enr = await enrollmentState(enrollmentId);
    expect(enr?.status).toBe('frozen');
    expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe('left_group');

    const members = await membershipRows(groupId);
    expect(members.find((m) => m.member_group_id === targetL1.personalGroupId)).toBeUndefined();
    expect(members.find((m) => m.member_group_id === stewardL1.personalGroupId)?.status).toBe(
      'active',
    );
    expect(await roleBindingCount(groupId, targetL1.personalGroupId)).toBe(0);
    expect((await groupRow(groupId))?.status).toBe('active');

    const { data: userRow } = await admin
      .from('users')
      .select('is_decommissioned, is_active')
      .eq('id', pk.targetL1)
      .single();
    expect(userRow!.is_decommissioned).toBe(true);
    expect(userRow!.is_active).toBe(false);
  });

  // ==========================================================================
  // L2 — sole Steward → DeusEx handover
  // ==========================================================================
  it('L2 steward handover: DeusEx becomes active member+Steward, pending invitations re-own to DeusEx, the target’s enrolment freezes left_group, remaining members + DeusEx are notified', async () => {
    const groupId = await seedGroupAs(targetL2, 'ExitL2', [memberL2]);
    const journeyId = await seedJourney(groupId, false);
    const enrollmentId = await seedEnrollment(journeyId, targetL2.personalGroupId, 'active');
    // a pending FIM invitation + a pending email invitation, both issued by the
    // sole Steward (targetL2) — the handover re-owns them to DeusEx.
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: inviteeL2.personalGroupId,
      status: 'invited',
      added_by_group_id: targetL2.personalGroupId,
    });
    await admin.from('pending_email_invitations').insert({
      group_id: groupId,
      invited_email: 'exit-l2-fixture@example.com',
      invited_by_group_id: targetL2.personalGroupId,
      status: 'pending',
    });

    const { error } = await adminClient.rpc('admin_exit_user_from_platform', {
      p_target_user_id: pk.targetL2,
    });
    expect(error).toBeNull();

    // DeusEx is now an active member + Steward
    const members = await membershipRows(groupId);
    expect(members.find((m) => m.member_group_id === deusEx)?.status).toBe('active');
    const deusExRoles = await runAdminSql(`
      SELECT gr.name FROM public.user_group_roles ugr
        JOIN public.group_roles gr ON gr.id = ugr.group_role_id
       WHERE ugr.group_id = '${groupId}' AND ugr.member_group_id = '${deusEx}';`);
    expect(
      deusExRoles.some((r) => r.name === 'Steward Role Template' || r.name === 'Steward'),
    ).toBe(true);

    // pending invitations re-owned by DeusEx
    expect(members.find((m) => m.member_group_id === inviteeL2.personalGroupId)?.status).toBe(
      'invited',
    );
    const { data: invRow } = await admin
      .from('group_memberships')
      .select('added_by_group_id')
      .eq('group_id', groupId)
      .eq('member_group_id', inviteeL2.personalGroupId)
      .single();
    expect(invRow?.added_by_group_id).toBe(deusEx);
    const { data: emailInv } = await admin
      .from('pending_email_invitations')
      .select('invited_by_group_id')
      .eq('group_id', groupId)
      .eq('invited_email', 'exit-l2-fixture@example.com')
      .single();
    expect(emailInv?.invited_by_group_id).toBe(deusEx);

    // the departing Steward's non-public enrolment froze as a leave
    const enr = await enrollmentState(enrollmentId);
    expect(enr?.status).toBe('frozen');
    expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe('left_group');

    // target departed
    expect(members.find((m) => m.member_group_id === targetL2.personalGroupId)).toBeUndefined();
    expect(await roleBindingCount(groupId, targetL2.personalGroupId)).toBe(0);

    // stewardship notifications present; the group survives active
    const transferred = await notificationsOf(groupId, 'stewardship_transferred');
    expect(transferred.some((n) => n.recipient_group_id === memberL2.personalGroupId)).toBe(true);
    const required = await notificationsOf(groupId, 'stewardship_required');
    expect(required.some((n) => n.recipient_group_id === deusEx)).toBe(true);
    expect((await groupRow(groupId))?.status).toBe('active');
  });

  // ==========================================================================
  // L3 — last member → group closure
  // ==========================================================================
  it('L3 group closure: the group closes, both non-public + group-level enrolments freeze group_closed, the non-public journey transfers to DeusEx (public journey UNCHANGED), DeusEx is notified', async () => {
    const groupId = await seedGroupAs(targetL3, 'ExitL3', []);
    const nonPublicJourneyId = await seedJourney(groupId, false);
    const publicJourneyId = await seedJourney(groupId, true);
    // the target's own enrolment + a group-level enrolment, both in the
    // non-public journey (the two sprint2 freeze shapes).
    const ownEnrollmentId = await seedEnrollment(
      nonPublicJourneyId,
      targetL3.personalGroupId,
      'active',
    );
    const groupEnrollmentId = await seedEnrollment(nonPublicJourneyId, groupId, 'active');

    const { error } = await adminClient.rpc('admin_exit_user_from_platform', {
      p_target_user_id: pk.targetL3,
    });
    expect(error).toBeNull();

    expect((await groupRow(groupId))?.status).toBe('closed');
    for (const id of [ownEnrollmentId, groupEnrollmentId]) {
      const enr = await enrollmentState(id);
      expect(enr?.status).toBe('frozen');
      expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe('group_closed');
    }
    expect(await journeyOwner(nonPublicJourneyId)).toBe(deusEx);
    expect(await journeyOwner(publicJourneyId)).toBe(groupId); // public journey unchanged

    const closed = await notificationsOf(groupId, 'group_closed');
    expect(closed.some((n) => n.recipient_group_id === deusEx)).toBe(true);
    expect(await membershipRows(groupId)).toEqual([]);
  });
});
