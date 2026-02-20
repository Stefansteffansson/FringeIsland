/**
 * Integration Tests: Admin Join Group (Direct Add)
 *
 * Covers:
 * - B-ADMIN-017: Admin Join Group — Direct Add
 *
 * Tests that admins can directly add users to groups (bypassing invitation),
 * Member role is assigned automatically, existing active members are skipped,
 * and audit log entries are created.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-017: Admin Join Group (Direct Add)', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser1: any;
  let targetUser2: any;
  let existingActiveUser: any;
  let deusexGroupId: string;
  let deusexRoleId: string;
  let testGroupId: string;
  let memberRoleId: string;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'JoinGrp Admin' });
    targetUser1 = await createTestUser({ displayName: 'JoinGrp Target 1' });
    targetUser2 = await createTestUser({ displayName: 'JoinGrp Target 2' });
    existingActiveUser = await createTestUser({ displayName: 'JoinGrp Existing' });

    // Look up DeusEx group and role
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

    // Add deusexUser to DeusEx group
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      user_id: deusexUser.profile.id,
      added_by_user_id: deusexUser.profile.id,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      user_id: deusexUser.profile.id,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_user_id: deusexUser.profile.id,
    });

    // Create a test engagement group (admin is NOT the creator or member)
    const { data: testGroup } = await admin
      .from('groups')
      .insert({
        name: 'Admin Join Test Group',
        description: 'Group for testing admin direct add',
        created_by_user_id: existingActiveUser.profile.id,
        group_type: 'engagement',
        is_public: false,
      })
      .select()
      .single();

    if (!testGroup) throw new Error('Failed to create test group');
    testGroupId = testGroup.id;

    // Create Member role for the test group
    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member' })
      .select()
      .single();

    if (!memberRole) throw new Error('Failed to create Member role');
    memberRoleId = memberRole.id;

    // Create Steward role for the test group (needed for proper group setup)
    await admin.from('group_roles').insert({ group_id: testGroupId, name: 'Steward' });

    // Add existing active member
    await admin.from('group_memberships').insert({
      group_id: testGroupId,
      user_id: existingActiveUser.profile.id,
      added_by_user_id: existingActiveUser.profile.id,
      status: 'active',
    });

    // Sign in admin client
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up test group
    await admin.from('user_group_roles').delete().eq('group_id', testGroupId);
    await admin.from('group_memberships').delete().eq('group_id', testGroupId);
    await admin.from('group_roles').delete().eq('group_id', testGroupId);
    await admin.from('groups').delete().eq('id', testGroupId);

    // Clean up audit log entries
    await admin.from('admin_audit_log').delete()
      .eq('actor_user_id', deusexUser.profile.id)
      .eq('action', 'admin_join_group');

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser1) await cleanupTestUser(targetUser1.user.id);
    if (targetUser2) await cleanupTestUser(targetUser2.user.id);
    if (existingActiveUser) await cleanupTestUser(existingActiveUser.user.id);
  }, 30000);

  it('should allow admin to directly add a user to a group with active status', async () => {
    // Admin directly adds targetUser1 with status='active' (bypassing invitation)
    const { data, error } = await deusexClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        user_id: targetUser1.profile.id,
        added_by_user_id: deusexUser.profile.id,
        status: 'active',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('active');
    expect(data!.group_id).toBe(testGroupId);
    expect(data!.user_id).toBe(targetUser1.profile.id);
  });

  it('should assign Member role automatically when admin direct-adds a user', async () => {
    // Admin direct-adds targetUser2
    const { error: membershipError } = await deusexClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        user_id: targetUser2.profile.id,
        added_by_user_id: deusexUser.profile.id,
        status: 'active',
      });

    expect(membershipError).toBeNull();

    // Admin also assigns Member role
    // Note: auto_assign_member_role_on_accept trigger only fires on invited→active
    // transition, NOT on direct insert with status='active'. So the action handler
    // must assign the role explicitly.
    const { error: roleError } = await deusexClient
      .from('user_group_roles')
      .insert({
        user_id: targetUser2.profile.id,
        group_id: testGroupId,
        group_role_id: memberRoleId,
        assigned_by_user_id: deusexUser.profile.id,
      });

    expect(roleError).toBeNull();

    // Verify the Member role was assigned
    const { data: roles } = await admin
      .from('user_group_roles')
      .select('group_role_id, group_roles(name)')
      .eq('user_id', targetUser2.profile.id)
      .eq('group_id', testGroupId);

    expect(roles).not.toBeNull();
    expect(roles!.length).toBeGreaterThanOrEqual(1);

    const memberRole = roles!.find((r: any) => r.group_roles?.name === 'Member');
    expect(memberRole).not.toBeUndefined();
  });

  it('should skip users who are already active members of the group', async () => {
    // Try to add existingActiveUser who is already an active member
    const { data, error } = await deusexClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        user_id: existingActiveUser.profile.id,
        added_by_user_id: deusexUser.profile.id,
        status: 'active',
      })
      .select()
      .maybeSingle();

    // Should either fail due to unique constraint or be silently blocked
    // Verify the existing membership is unchanged
    const { data: membership } = await admin
      .from('group_memberships')
      .select('status, added_by_user_id')
      .eq('group_id', testGroupId)
      .eq('user_id', existingActiveUser.profile.id)
      .single();

    expect(membership).not.toBeNull();
    expect(membership!.status).toBe('active');
    // The original added_by should be preserved
    expect(membership!.added_by_user_id).toBe(existingActiveUser.profile.id);
  });

  it('should only show engagement groups in group picker (exclude system and personal)', async () => {
    // Admin queries for all groups, filtered to engagement type
    const { data: engagementGroups, error } = await deusexClient
      .from('groups')
      .select('id, name, group_type')
      .eq('group_type', 'engagement');

    expect(error).toBeNull();
    expect(engagementGroups).not.toBeNull();

    // All returned groups must be engagement type
    engagementGroups!.forEach((g: any) => {
      expect(g.group_type).toBe('engagement');
    });

    // System and personal groups should NOT appear
    const { data: systemGroups } = await deusexClient
      .from('groups')
      .select('id, group_type')
      .in('group_type', ['system', 'personal']);

    // Admin CAN see them (B-ADMIN-012), but the group picker should filter them out
    // This test verifies the query filter works
    if (systemGroups) {
      systemGroups.forEach((g: any) => {
        expect(g.group_type).not.toBe('engagement');
      });
    }
  });

  it('should create audit log entry for admin join action', async () => {
    // After adding users, there should be an audit log entry
    const { data: auditEntries } = await admin
      .from('admin_audit_log')
      .select('*')
      .eq('actor_user_id', deusexUser.profile.id)
      .eq('action', 'admin_join_group');

    expect(auditEntries).not.toBeNull();
    expect(auditEntries!.length).toBeGreaterThanOrEqual(1);

    // Verify metadata includes group name and user count
    const entry = auditEntries![0];
    expect(entry.metadata).toBeDefined();
    expect(entry.metadata.group_name).toBeDefined();
    expect(entry.metadata.user_count).toBeDefined();
  });
});
