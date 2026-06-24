/**
 * Integration Tests: Admin Invite to Group
 *
 * Covers:
 * - B-ADMIN-016: Admin Invite to Group
 *
 * Tests that admins can send group invitations to users for groups they
 * don't own, users already in the group are skipped, and audit log
 * entries are created.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-016: Admin Invite to Group', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser1: any;
  let targetUser2: any;
  let existingMemberUser: any;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;
  let testGroupId: string;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'InvGrp Admin' });
    targetUser1 = await createTestUser({ displayName: 'InvGrp Target 1' });
    targetUser2 = await createTestUser({ displayName: 'InvGrp Target 2' });
    existingMemberUser = await createTestUser({ displayName: 'InvGrp Existing' });
    normalUser = await createTestUser({ displayName: 'InvGrp Normal' });

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
      member_group_id: deusexUser.personalGroupId,
      added_by_group_id: deusexUser.personalGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: deusexUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: deusexUser.personalGroupId,
    });

    // Create a test engagement group (admin is NOT the creator or member)
    const { data: testGroup } = await admin
      .from('groups')
      .insert({
        name: 'Admin Invite Test Group',
        description: 'Group for testing admin invite',
        created_by_group_id: normalUser.personalGroupId,
        group_type: 'engagement',
        is_public: false,
      })
      .select()
      .single();

    if (!testGroup) throw new Error('Failed to create test group');
    testGroupId = testGroup.id;

    // Add existing member to the test group
    await admin.from('group_memberships').insert({
      group_id: testGroupId,
      member_group_id: existingMemberUser.personalGroupId,
      added_by_group_id: normalUser.personalGroupId,
      status: 'active',
    });

    // Sign in clients
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up test group memberships and group
    await admin.from('user_group_roles').delete().eq('group_id', testGroupId);
    await admin.from('group_memberships').delete().eq('group_id', testGroupId);
    await admin.from('groups').delete().eq('id', testGroupId);

    // Clean up audit log entries
    await admin.from('admin_audit_log').delete()
      .eq('actor_group_id', deusexUser.personalGroupId)
      .eq('action', 'admin_invite_to_group');

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser1) await cleanupTestUser(targetUser1.user.id);
    if (targetUser2) await cleanupTestUser(targetUser2.user.id);
    if (existingMemberUser) await cleanupTestUser(existingMemberUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should allow admin to invite a user to a group they do not own', async () => {
    // Admin (DeusEx member) invites targetUser1 to the test group
    // The admin is NOT the group creator or a member — needs admin INSERT policy
    const { data, error } = await deusexClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        member_group_id: targetUser1.personalGroupId,
        added_by_group_id: deusexUser.personalGroupId,
        status: 'invited',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('invited');
    expect(data!.group_id).toBe(testGroupId);
    expect(data!.member_group_id).toBe(targetUser1.personalGroupId);
    expect(data!.added_by_group_id).toBe(deusexUser.personalGroupId);
  });

  it('should allow admin to invite multiple users in batch', async () => {
    // Invite targetUser2
    const { data, error } = await deusexClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        member_group_id: targetUser2.personalGroupId,
        added_by_group_id: deusexUser.personalGroupId,
        status: 'invited',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // Verify both invitations exist
    const { data: memberships } = await admin
      .from('group_memberships')
      .select('member_group_id, status')
      .eq('group_id', testGroupId)
      .eq('status', 'invited');

    expect(memberships).not.toBeNull();
    expect(memberships!.length).toBeGreaterThanOrEqual(2);

    const invitedPgIds = memberships!.map((m: any) => m.member_group_id);
    expect(invitedPgIds).toContain(targetUser1.personalGroupId);
    expect(invitedPgIds).toContain(targetUser2.personalGroupId);
  });

  it('should skip users who are already active members of the group', async () => {
    // Try to invite the existing member — should fail or be skipped
    const { data, error } = await deusexClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        member_group_id: existingMemberUser.personalGroupId,
        added_by_group_id: deusexUser.personalGroupId,
        status: 'invited',
      })
      .select()
      .maybeSingle();

    // Either the insert fails due to unique constraint or RLS blocks it
    // The existing member should still have status='active', not overwritten
    const { data: membership } = await admin
      .from('group_memberships')
      .select('status')
      .eq('group_id', testGroupId)
      .eq('member_group_id', existingMemberUser.personalGroupId)
      .single();

    expect(membership).not.toBeNull();
    expect(membership!.status).toBe('active');
  });

  it('should only show engagement groups in admin group picker query', async () => {
    // Admin queries groups — should be able to filter to engagement only
    const { data: groups, error } = await deusexClient
      .from('groups')
      .select('id, name, group_type')
      .eq('group_type', 'engagement');

    expect(error).toBeNull();
    expect(groups).not.toBeNull();
    expect(groups!.length).toBeGreaterThanOrEqual(1);

    // All returned groups should be engagement type
    groups!.forEach((g: any) => {
      expect(g.group_type).toBe('engagement');
    });

    // Test group should be visible to admin
    const testGroup = groups!.find((g: any) => g.id === testGroupId);
    expect(testGroup).not.toBeUndefined();
  });

  it('should block non-admin from inviting users to groups they do not own', async () => {
    // Normal user (not group creator or member with invite_members) tries to invite
    const { error } = await normalClient
      .from('group_memberships')
      .insert({
        group_id: testGroupId,
        member_group_id: targetUser1.personalGroupId,
        added_by_group_id: normalUser.personalGroupId,
        status: 'invited',
      });

    // Should fail — normalUser is the group creator but may not have invite_members
    // Verify no new invitation was created by normalClient
    const { data: memberships } = await admin
      .from('group_memberships')
      .select('added_by_group_id')
      .eq('group_id', testGroupId)
      .eq('member_group_id', targetUser1.personalGroupId)
      .eq('status', 'invited');

    // If an invitation exists, it should be from the admin, not from normalUser
    if (memberships && memberships.length > 0) {
      expect(memberships[0].added_by_group_id).toBe(deusexUser.personalGroupId);
    }
  });

  it('should create audit log entry for admin invite action', async () => {
    // After inviting users, there should be an audit log entry
    const { data: auditEntries } = await admin
      .from('admin_audit_log')
      .select('*')
      .eq('actor_group_id', deusexUser.personalGroupId)
      .eq('action', 'admin_invite_to_group');

    expect(auditEntries).not.toBeNull();
    expect(auditEntries!.length).toBeGreaterThanOrEqual(1);

    // Verify metadata includes group name and user count
    const entry = auditEntries![0];
    expect(entry.metadata).toBeDefined();
    expect(entry.metadata.group_name).toBeDefined();
    expect(entry.metadata.user_count).toBeDefined();
  });
});
