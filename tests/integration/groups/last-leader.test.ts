/**
 * Integration Tests: Groups - Last Leader Protection
 *
 * Tests: B-GRP-001: Last Leader Protection
 *
 * Verifies that a group MUST always have at least one Group Leader.
 * Tests the database trigger: prevent_last_leader_removal()
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  createAdminClient,
} from '@/tests/helpers/supabase';

describe('B-GRP-001: Last Leader Protection', () => {
  let testUser1: any;
  let testUser2: any;
  let testGroup: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    // Create two test users
    testUser1 = await createTestUser({ displayName: 'Leader 1' });
    testUser2 = await createTestUser({ displayName: 'Leader 2' });
  });

  afterAll(async () => {
    // Cleanup
    if (testGroup) await cleanupTestGroup(testGroup.id);
    if (testUser1) await cleanupTestUser(testUser1.user.id);
    if (testUser2) await cleanupTestUser(testUser2.user.id);
  });

  it('should prevent removing the last Group Leader role', async () => {
    // Setup: Create group with one leader
    const { data: group, error: groupError } = await admin
      .from('groups')
      .insert({
        name: 'Test Group - Last Leader',
        description: 'Testing last leader protection',
        created_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    expect(groupError).toBeNull();
    testGroup = group;

    // Get the Group Leader role for this group
    const { data: leaderRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', group.id)
      .eq('name', 'Group Leader')
      .single();

    expect(leaderRole).toBeDefined();

    // Assign leader role to user1 (created by trigger usually, but let's be explicit)
    const { data: roleAssignment, error: assignError } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser1.profile.id,
        group_id: group.id,
        group_role_id: leaderRole!.id,
        assigned_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    expect(assignError).toBeNull();

    // Act: Try to remove the last (only) leader role
    const { error: deleteError } = await admin
      .from('user_group_roles')
      .delete()
      .eq('id', roleAssignment!.id);

    // Assert: Deletion should be blocked by trigger
    expect(deleteError).not.toBeNull();
    expect(deleteError?.message).toContain('last leader');
  });

  it('should allow removing a leader role when other leaders exist', async () => {
    // Setup: Create group with two leaders
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Test Group - Two Leaders',
        description: 'Testing with multiple leaders',
        created_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    const { data: leaderRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', group!.id)
      .eq('name', 'Group Leader')
      .single();

    // Assign leader role to both users
    const { data: role1 } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser1.profile.id,
        group_id: group!.id,
        group_role_id: leaderRole!.id,
        assigned_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    const { data: role2 } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser2.profile.id,
        group_id: group!.id,
        group_role_id: leaderRole!.id,
        assigned_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    // Act: Remove one leader role (another leader remains)
    const { error: deleteError } = await admin
      .from('user_group_roles')
      .delete()
      .eq('id', role1!.id);

    // Assert: Deletion should succeed
    expect(deleteError).toBeNull();

    // Verify one leader still exists
    const { data: remainingLeaders } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_id', group!.id)
      .eq('group_role_id', leaderRole!.id);

    expect(remainingLeaders).toHaveLength(1);
    expect(remainingLeaders![0].id).toBe(role2!.id);

    // Cleanup
    await cleanupTestGroup(group!.id);
  });

  it('should allow user account deletion even if they are the last leader', async () => {
    // Setup: Create group with one leader
    const testUser3 = await createTestUser({ displayName: 'Leader to Delete' });

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Test Group - Account Deletion',
        description: 'Testing account deletion as last leader',
        created_by_user_id: testUser3.profile.id,
      })
      .select()
      .single();

    const { data: leaderRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', group!.id)
      .eq('name', 'Group Leader')
      .single();

    await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser3.profile.id,
        group_id: group!.id,
        group_role_id: leaderRole!.id,
        assigned_by_user_id: testUser3.profile.id,
      });

    // Act: Delete user account (CASCADE should handle role deletion)
    const { error: deleteError } = await admin.auth.admin.deleteUser(
      testUser3.user.id
    );

    // Assert: Account deletion should succeed (CASCADE bypass)
    expect(deleteError).toBeNull();

    // Group becomes orphaned (acceptable - admin cleanup required)
    const { data: remainingLeaders } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_id', group!.id);

    expect(remainingLeaders).toHaveLength(0);

    // Cleanup
    await cleanupTestGroup(group!.id);
  });

  it('should block removing last leader even with multiple attempts', async () => {
    // Setup: Create group with one leader
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Test Group - Concurrent Removal',
        description: 'Testing concurrent removal attempts',
        created_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    const { data: leaderRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', group!.id)
      .eq('name', 'Group Leader')
      .single();

    const { data: roleAssignment } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser1.profile.id,
        group_id: group!.id,
        group_role_id: leaderRole!.id,
        assigned_by_user_id: testUser1.profile.id,
      })
      .select()
      .single();

    // Act: Try to remove the last leader multiple times
    const attempts = await Promise.all([
      admin.from('user_group_roles').delete().eq('id', roleAssignment!.id),
      admin.from('user_group_roles').delete().eq('id', roleAssignment!.id),
      admin.from('user_group_roles').delete().eq('id', roleAssignment!.id),
    ]);

    // Assert: All attempts should fail
    attempts.forEach(({ error }) => {
      expect(error).not.toBeNull();
    });

    // Verify leader still exists
    const { data: leader } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('id', roleAssignment!.id)
      .single();

    expect(leader).toBeDefined();

    // Cleanup
    await cleanupTestGroup(group!.id);
  });
});
