/**
 * Integration Tests: User Decommission (Soft Delete)
 *
 * Covers:
 * - B-ADMIN-008: User Decommission
 *
 * Tests that admins can decommission users (is_decommissioned = true, is_active = false),
 * records are preserved, decommissioned users are hidden from normal queries,
 * and non-admins cannot decommission users.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-008: User Decommission', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser: any;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;
  let testGroupId: string | null = null;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'Decommission Admin' });
    targetUser = await createTestUser({ displayName: 'Decommission Target' });
    normalUser = await createTestUser({ displayName: 'Decommission Normal' });

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

    // Create a test group and add targetUser as a member (to verify records preserved)
    const { data: testGroup } = await admin
      .from('groups')
      .insert({
        name: 'Decommission Test Group',
        description: 'Group to verify record preservation',
        created_by_user_id: deusexUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    if (testGroup) {
      testGroupId = testGroup.id;
      await admin.from('group_memberships').insert({
        group_id: testGroupId,
        user_id: targetUser.profile.id,
        added_by_user_id: deusexUser.profile.id,
        status: 'active',
      });
    }

    // Sign in clients
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Reset target user state (in case tests changed it)
    await admin
      .from('users')
      .update({ is_active: true })
      .eq('id', targetUser.profile.id);

    // Try to reset is_decommissioned if column exists
    try {
      await admin
        .from('users')
        .update({ is_decommissioned: false } as any)
        .eq('id', targetUser.profile.id);
    } catch {
      // Column may not exist yet
    }

    // Clean up test group
    if (testGroupId) {
      await admin.from('group_memberships').delete().eq('group_id', testGroupId);
      await admin.from('groups').delete().eq('id', testGroupId);
    }

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser) await cleanupTestUser(targetUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should have is_decommissioned column on users table', async () => {
    // Probe the column — this fails if is_decommissioned doesn't exist
    const { error } = await admin
      .from('users')
      .select('id, is_active, is_decommissioned')
      .limit(0);

    expect(error).toBeNull();
  });

  it('should allow admin to decommission a user', async () => {
    // Admin sets is_decommissioned = true and is_active = false
    const { error } = await deusexClient
      .from('users')
      .update({ is_decommissioned: true, is_active: false } as any)
      .eq('id', targetUser.profile.id);

    expect(error).toBeNull();

    // Verify via admin client
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetUser.profile.id)
      .single();

    expect(user).not.toBeNull();
    expect(user!.is_active).toBe(false);
    expect((user as any).is_decommissioned).toBe(true);
  });

  it('should preserve group memberships after decommission', async () => {
    // Target user's membership should still exist
    const { data: memberships, error } = await admin
      .from('group_memberships')
      .select('id, status')
      .eq('user_id', targetUser.profile.id);

    expect(error).toBeNull();
    expect(memberships).not.toBeNull();
    expect(memberships!.length).toBeGreaterThanOrEqual(1);
  });

  it('should hide decommissioned user from normal user queries', async () => {
    // Normal user queries users table — decommissioned user should be hidden
    const { data: users, error } = await normalClient
      .from('users')
      .select('id')
      .eq('id', targetUser.profile.id);

    expect(error).toBeNull();
    // Decommissioned user should not be visible to normal users
    expect(users).toHaveLength(0);
  });

  it('should allow admin to see decommissioned users', async () => {
    // Admin should still be able to see decommissioned users
    const { data: user, error } = await admin
      .from('users')
      .select('id, is_decommissioned')
      .eq('id', targetUser.profile.id)
      .single();

    expect(error).toBeNull();
    expect(user).not.toBeNull();
    expect((user as any).is_decommissioned).toBe(true);
  });

  it('should block non-admin from decommissioning a user', async () => {
    // Normal user tries to set is_decommissioned on another user
    const { error } = await normalClient
      .from('users')
      .update({ is_decommissioned: true } as any)
      .eq('id', deusexUser.profile.id);

    // Verify the user was NOT decommissioned
    const { data: user } = await admin
      .from('users')
      .select('is_decommissioned')
      .eq('id', deusexUser.profile.id)
      .single();

    expect((user as any).is_decommissioned).not.toBe(true);
  });
});
