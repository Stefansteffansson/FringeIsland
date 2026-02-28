/**
 * Integration Tests: Admin Platform Exit (Sprint 4)
 *
 * Covers:
 * - B-EXIT-001: Group cascade (L1/L2/L3 per group)
 * - B-EXIT-002: Decommission + force logout after exit
 * - B-EXIT-003: Safety guards (self, decommissioned, admin)
 * - B-EXIT-004: Audit trail
 *
 * Tests the admin_exit_user_from_platform RPC which exits a user from
 * all engagement groups and decommissions them.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-EXIT: Admin Platform Exit', () => {
  const admin = createAdminClient();

  // Admin user (DeusEx member)
  let adminUser: any;
  let adminClient: ReturnType<typeof createTestClient>;

  // Target users for various scenarios
  let targetNoGroups: any;
  let targetRegularMember: any;
  let targetSoleSteward: any;
  let targetLastMember: any;
  let targetMultiGroup: any;
  let targetDecommissioned: any;
  let targetDeusExMember: any;
  let otherMember: any; // stays in groups after target leaves

  // System references
  let deusexGroupId: string;
  let deusexRoleId: string;
  let stewardTemplateId: string;

  // Groups created for tests
  const createdGroupIds: string[] = [];

  // Helper: create an engagement group and return group + role IDs
  async function createEngagementGroup(
    name: string,
    createdByGroupId: string,
  ) {
    const { data: group } = await admin
      .from('groups')
      .insert({
        name,
        group_type: 'engagement',
        created_by_group_id: createdByGroupId,
        status: 'active',
      })
      .select()
      .single();

    if (!group) throw new Error(`Failed to create group: ${name}`);
    createdGroupIds.push(group.id);

    // Create standard roles: Steward, Member
    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({
        group_id: group.id,
        name: 'Steward',
        description: 'Group Steward',
        created_from_role_template_id: stewardTemplateId,
      })
      .select()
      .single();

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({
        group_id: group.id,
        name: 'Member',
        description: 'Regular member',
      })
      .select()
      .single();

    return {
      group,
      stewardRoleId: stewardRole!.id,
      memberRoleId: memberRole!.id,
    };
  }

  // Helper: add a member to a group with a specific role
  async function addMember(
    groupId: string,
    memberGroupId: string,
    roleId: string,
    addedByGroupId: string,
  ) {
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memberGroupId,
      added_by_group_id: addedByGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: memberGroupId,
      group_id: groupId,
      group_role_id: roleId,
      assigned_by_group_id: addedByGroupId,
    });
  }

  beforeAll(async () => {
    // Create all test users (9 users + group setup = needs extended timeout)
    adminUser = await createTestUser({ displayName: 'PlatformExit Admin' });
    targetNoGroups = await createTestUser({ displayName: 'PlatformExit NoGroups' });
    targetRegularMember = await createTestUser({ displayName: 'PlatformExit RegularMember' });
    targetSoleSteward = await createTestUser({ displayName: 'PlatformExit SoleSteward' });
    targetLastMember = await createTestUser({ displayName: 'PlatformExit LastMember' });
    targetMultiGroup = await createTestUser({ displayName: 'PlatformExit MultiGroup' });
    targetDecommissioned = await createTestUser({ displayName: 'PlatformExit Decommissioned' });
    targetDeusExMember = await createTestUser({ displayName: 'PlatformExit DeusExMember' });
    otherMember = await createTestUser({ displayName: 'PlatformExit OtherMember' });

    // Look up DeusEx group + role
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();
    if (!deusexGroup) throw new Error('DeusEx system group not found');
    deusexGroupId = deusexGroup.id;

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();
    if (!deusexRole) throw new Error('DeusEx role not found');
    deusexRoleId = deusexRole.id;

    // Look up Steward template
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();
    if (!stewardTemplate) throw new Error('Steward Role Template not found');
    stewardTemplateId = stewardTemplate.id;

    // --- Grant admin privileges to adminUser ---
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      member_group_id: adminUser.personalGroupId,
      added_by_group_id: adminUser.personalGroupId,
      status: 'active',
    });
    await admin.from('user_group_roles').insert({
      member_group_id: adminUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: adminUser.personalGroupId,
    });

    // --- Grant admin privileges to targetDeusExMember ---
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      member_group_id: targetDeusExMember.personalGroupId,
      added_by_group_id: adminUser.personalGroupId,
      status: 'active',
    });
    await admin.from('user_group_roles').insert({
      member_group_id: targetDeusExMember.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: adminUser.personalGroupId,
    });

    // --- Pre-decommission targetDecommissioned ---
    await admin
      .from('users')
      .update({ is_decommissioned: true, is_active: false })
      .eq('id', targetDecommissioned.profile.id);

    // --- Set up groups for L1 test (regular member) ---
    const g1 = await createEngagementGroup(
      'PE L1 Regular Leave Test',
      otherMember.personalGroupId,
    );
    await addMember(g1.group.id, otherMember.personalGroupId, g1.stewardRoleId, otherMember.personalGroupId);
    await addMember(g1.group.id, targetRegularMember.personalGroupId, g1.memberRoleId, otherMember.personalGroupId);

    // --- Set up groups for L2 test (sole Steward) ---
    const g2 = await createEngagementGroup(
      'PE L2 Steward Handover Test',
      targetSoleSteward.personalGroupId,
    );
    await addMember(g2.group.id, targetSoleSteward.personalGroupId, g2.stewardRoleId, targetSoleSteward.personalGroupId);
    await addMember(g2.group.id, otherMember.personalGroupId, g2.memberRoleId, targetSoleSteward.personalGroupId);

    // --- Set up group for L3 test (last member) ---
    const g3 = await createEngagementGroup(
      'PE L3 Group Closure Test',
      targetLastMember.personalGroupId,
    );
    await addMember(g3.group.id, targetLastMember.personalGroupId, g3.stewardRoleId, targetLastMember.personalGroupId);

    // --- Set up multiple groups for multi-group test ---
    const gM1 = await createEngagementGroup(
      'PE Multi Group A',
      otherMember.personalGroupId,
    );
    await addMember(gM1.group.id, otherMember.personalGroupId, gM1.stewardRoleId, otherMember.personalGroupId);
    await addMember(gM1.group.id, targetMultiGroup.personalGroupId, gM1.memberRoleId, otherMember.personalGroupId);

    const gM2 = await createEngagementGroup(
      'PE Multi Group B',
      targetMultiGroup.personalGroupId,
    );
    await addMember(gM2.group.id, targetMultiGroup.personalGroupId, gM2.stewardRoleId, targetMultiGroup.personalGroupId);
    await addMember(gM2.group.id, otherMember.personalGroupId, gM2.memberRoleId, targetMultiGroup.personalGroupId);

    // Set up admin client
    adminClient = createTestClient();
    await signInWithRetry(adminClient, adminUser.email, adminUser.password);
  }, 60000);

  afterAll(async () => {
    // Clean up notifications
    const allUsers = [
      adminUser, targetNoGroups, targetRegularMember, targetSoleSteward,
      targetLastMember, targetMultiGroup, targetDecommissioned,
      targetDeusExMember, otherMember,
    ];
    for (const user of allUsers) {
      if (user?.personalGroupId) {
        await admin.from('notifications').delete().eq('recipient_group_id', user.personalGroupId);
      }
    }

    // Clean up DeusEx memberships for test admins
    for (const user of [adminUser, targetDeusExMember]) {
      if (user?.personalGroupId) {
        await admin.from('user_group_roles').delete()
          .eq('group_id', deusexGroupId)
          .eq('member_group_id', user.personalGroupId);
        await admin.from('group_memberships').delete()
          .eq('group_id', deusexGroupId)
          .eq('member_group_id', user.personalGroupId);
      }
    }

    // Clean up test groups (reverse order for FKs)
    for (const gid of [...createdGroupIds].reverse()) {
      await admin.from('notifications').delete().eq('group_id', gid);
      await admin.from('journey_enrollments').delete().eq('group_id', gid);
      await admin.from('user_group_roles').delete().eq('group_id', gid);
      await admin.from('group_memberships').delete().eq('group_id', gid);
      await admin.from('group_roles').delete().eq('group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }

    // Clean up audit log entries
    await admin.from('admin_audit_log').delete()
      .eq('action', 'admin_exit_user_from_platform');

    // Clean up users
    // Un-decommission targetDecommissioned so cleanup works
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true })
      .eq('id', targetDecommissioned.profile.id);

    for (const user of allUsers) {
      if (user) await cleanupTestUser(user.user.id);
    }
  }, 60000);

  // ═══════════════════════════════════════════════════════════════
  // B-EXIT-003: Safety Guards
  // ═══════════════════════════════════════════════════════════════

  it('rejects non-admin callers', async () => {
    const normalClient = createTestClient();
    await signInWithRetry(normalClient, otherMember.email, otherMember.password);

    try {
      const { data, error } = await normalClient.rpc(
        'admin_exit_user_from_platform',
        { p_target_user_id: targetNoGroups.profile.id },
      );

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Unauthorized');
    } finally {
      await normalClient.auth.signOut();
    }
  });

  it('rejects self-exit', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: adminUser.profile.id },
    );

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Cannot exit yourself');
  });

  it('rejects already-decommissioned user', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetDecommissioned.profile.id },
    );

    expect(error).not.toBeNull();
    expect(error!.message).toContain('already decommissioned');
  });

  it('rejects DeusEx member (platform admin)', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetDeusExMember.profile.id },
    );

    expect(error).not.toBeNull();
    expect(error!.message).toContain('platform admin');
  });

  // ═══════════════════════════════════════════════════════════════
  // B-EXIT-001 + B-EXIT-002: Group Cascade + Decommission
  // ═══════════════════════════════════════════════════════════════

  it('exits user with no group memberships (just decommissions)', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetNoGroups.profile.id },
    );

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.success).toBe(true);
    expect(data.groups_exited).toBe(0);
    expect(data.decommissioned).toBe(true);

    // Verify user is decommissioned
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetNoGroups.profile.id)
      .single();

    expect(user!.is_decommissioned).toBe(true);
    expect(user!.is_active).toBe(false);

    // Restore for cleanup
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true })
      .eq('id', targetNoGroups.profile.id);
  });

  it('L1: exits regular member from group (regular leave)', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetRegularMember.profile.id },
    );

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.success).toBe(true);
    expect(data.groups_exited).toBe(1);
    expect(data.group_details[0].scenario).toBe('regular_leave');

    // Verify no active engagement group memberships remain
    const { data: memberships } = await admin
      .from('group_memberships')
      .select('id, groups!inner(group_type)')
      .eq('member_group_id', targetRegularMember.personalGroupId)
      .eq('status', 'active');

    const engagementMemberships = (memberships || []).filter(
      (m: any) => m.groups?.group_type === 'engagement',
    );
    expect(engagementMemberships.length).toBe(0);

    // Verify user is decommissioned
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetRegularMember.profile.id)
      .single();

    expect(user!.is_decommissioned).toBe(true);
    expect(user!.is_active).toBe(false);

    // Restore for cleanup
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true })
      .eq('id', targetRegularMember.profile.id);
  });

  it('L2: exits sole Steward from group (DeusEx handover)', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetSoleSteward.profile.id },
    );

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.success).toBe(true);
    expect(data.groups_exited).toBe(1);
    expect(data.group_details[0].scenario).toBe('steward_handover');

    // Verify DeusEx is now a Steward in the group
    const groupId = data.group_details[0].group_id;
    const { data: deusexRoles } = await admin
      .from('user_group_roles')
      .select('group_role_id, group_roles(name)')
      .eq('member_group_id', deusexGroupId)
      .eq('group_id', groupId);

    // Find the steward role specifically for this group
    const { data: groupDeusexRoles } = await admin
      .from('user_group_roles')
      .select(`
        id,
        group_roles!inner(name)
      `)
      .eq('member_group_id', deusexGroupId)
      .eq('group_id', groupId);

    const hasStewardRole = groupDeusexRoles?.some(
      (r: any) => r.group_roles?.name === 'Steward',
    );
    expect(hasStewardRole).toBe(true);

    // Verify target is no longer a member
    const { data: targetMembership } = await admin
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('member_group_id', targetSoleSteward.personalGroupId)
      .eq('status', 'active')
      .maybeSingle();

    expect(targetMembership).toBeNull();

    // Verify user is decommissioned
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetSoleSteward.profile.id)
      .single();

    expect(user!.is_decommissioned).toBe(true);

    // Restore for cleanup
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true })
      .eq('id', targetSoleSteward.profile.id);
  });

  it('L3: exits last member from group (group closure)', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetLastMember.profile.id },
    );

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.success).toBe(true);
    expect(data.groups_exited).toBe(1);
    expect(data.group_details[0].scenario).toBe('group_closure');

    // Verify group status is 'closed'
    const groupId = data.group_details[0].group_id;
    const { data: group } = await admin
      .from('groups')
      .select('status')
      .eq('id', groupId)
      .single();

    expect(group!.status).toBe('closed');

    // Verify user is decommissioned
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetLastMember.profile.id)
      .single();

    expect(user!.is_decommissioned).toBe(true);

    // Restore for cleanup
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true })
      .eq('id', targetLastMember.profile.id);
  });

  it('exits user from multiple groups with mixed scenarios', async () => {
    const { data, error } = await adminClient.rpc(
      'admin_exit_user_from_platform',
      { p_target_user_id: targetMultiGroup.profile.id },
    );

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.success).toBe(true);
    expect(data.groups_exited).toBe(2);

    // Should have both regular_leave and steward_handover scenarios
    const scenarios = data.group_details.map((d: any) => d.scenario);
    expect(scenarios).toContain('regular_leave');
    expect(scenarios).toContain('steward_handover');

    // Verify no active engagement memberships remain
    const { data: memberships } = await admin
      .from('group_memberships')
      .select('id, group_id, groups!inner(group_type)')
      .eq('member_group_id', targetMultiGroup.personalGroupId)
      .eq('status', 'active');

    const engagementMemberships = (memberships || []).filter(
      (m: any) => m.groups?.group_type === 'engagement',
    );
    expect(engagementMemberships.length).toBe(0);

    // Verify user is decommissioned
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetMultiGroup.profile.id)
      .single();

    expect(user!.is_decommissioned).toBe(true);

    // Restore for cleanup
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true })
      .eq('id', targetMultiGroup.profile.id);
  });

  // ═══════════════════════════════════════════════════════════════
  // B-EXIT-004: Audit Trail
  // ═══════════════════════════════════════════════════════════════

  it('creates audit log entry with detailed metadata', async () => {
    // The previous tests already triggered audit entries. Check one exists.
    const { data: auditEntries } = await admin
      .from('admin_audit_log')
      .select('*')
      .eq('action', 'admin_exit_user_from_platform')
      .eq('actor_group_id', adminUser.personalGroupId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(auditEntries).not.toBeNull();
    expect(auditEntries!.length).toBeGreaterThanOrEqual(1);

    const entry = auditEntries![0];
    expect(entry.action).toBe('admin_exit_user_from_platform');
    expect(entry.actor_group_id).toBe(adminUser.personalGroupId);
    expect(entry.metadata).toHaveProperty('groups_exited');
    expect(entry.metadata).toHaveProperty('group_details');
  });
});
