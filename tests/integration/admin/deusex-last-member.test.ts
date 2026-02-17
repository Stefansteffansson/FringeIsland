/**
 * Integration Tests: Last Deusex Member Protection
 *
 * Covers:
 * - B-ADMIN-005: Last Deusex Member Protection
 *
 * Tests that the database prevents removing the last member from the
 * Deusex system group (both role removal and membership removal).
 *
 * Strategy: Each "block last" test creates its own isolated user as the
 * sole Deusex member by temporarily removing all other role/membership
 * entries, then restoring them after the assertion.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  cleanupTestUser,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-005: Last Deusex Member Protection', () => {
  const admin = createAdminClient();

  let deusexGroupId: string;
  let deusexRoleId: string;
  let testUser: any;
  let testUserRoleId: string;
  let testUserMembershipId: string;

  /**
   * Helper: get all Deusex role assignment IDs except for a given user
   */
  async function getOtherRoleIds(excludeUserId: string) {
    const { data } = await admin
      .from('user_group_roles')
      .select('id, user_id')
      .eq('group_id', deusexGroupId)
      .eq('group_role_id', deusexRoleId)
      .neq('user_id', excludeUserId);
    return data || [];
  }

  /**
   * Helper: get all active Deusex membership IDs except for a given user
   */
  async function getOtherMembershipIds(excludeUserId: string) {
    const { data } = await admin
      .from('group_memberships')
      .select('id, user_id')
      .eq('group_id', deusexGroupId)
      .eq('status', 'active')
      .neq('user_id', excludeUserId);
    return data || [];
  }

  /**
   * Helper: restore a user's Deusex membership and role
   */
  async function restoreDeusexMember(userId: string) {
    // Re-add membership (idempotent via ON CONFLICT)
    await admin.from('group_memberships').upsert({
      group_id: deusexGroupId,
      user_id: userId,
      added_by_user_id: userId,
      status: 'active',
    }, { onConflict: 'group_id,user_id,member_group_id' });

    // Re-add role (idempotent via ON CONFLICT)
    await admin.from('user_group_roles').upsert({
      user_id: userId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_user_id: userId,
    }, { onConflict: 'user_id,group_id,group_role_id' });
  }

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Deusex Last Member Test' });

    // Look up the Deusex group and role
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('Deusex system group not found');
    deusexGroupId = deusexGroup.id;

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    if (!deusexRole) throw new Error('Deusex role not found');
    deusexRoleId = deusexRole.id;

    // Add test user as Deusex member
    const { data: membership } = await admin
      .from('group_memberships')
      .insert({
        group_id: deusexGroupId,
        user_id: testUser.profile.id,
        added_by_user_id: testUser.profile.id,
        status: 'active',
      })
      .select()
      .single();
    testUserMembershipId = membership!.id;

    const { data: role } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser.profile.id,
        group_id: deusexGroupId,
        group_role_id: deusexRoleId,
        assigned_by_user_id: testUser.profile.id,
      })
      .select()
      .single();
    testUserRoleId = role!.id;
  }, 30000);

  afterAll(async () => {
    // Clean up test user's Deusex data
    try {
      await admin.from('user_group_roles').delete().eq('id', testUserRoleId);
    } catch { /* may already be deleted or blocked by trigger */ }
    try {
      await admin.from('group_memberships').delete().eq('id', testUserMembershipId);
    } catch { /* may already be deleted or blocked by trigger */ }

    // Ensure bootstrap user is restored
    const { data: bootstrapUser } = await admin
      .from('users')
      .select('id')
      .eq('email', 'deusex@fringeisland.com')
      .maybeSingle();

    if (bootstrapUser) {
      await restoreDeusexMember(bootstrapUser.id);
    }

    if (testUser) await cleanupTestUser(testUser.user.id);
  }, 30000);

  it('should allow removing a Deusex role when others remain', async () => {
    // Pre-existing + testUser = at least 2 role holders
    // Remove testUser's role → others still remain
    const { error } = await admin
      .from('user_group_roles')
      .delete()
      .eq('id', testUserRoleId);

    expect(error).toBeNull();

    // Re-add for next test
    const { data: newRole } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser.profile.id,
        group_id: deusexGroupId,
        group_role_id: deusexRoleId,
        assigned_by_user_id: testUser.profile.id,
      })
      .select()
      .single();
    testUserRoleId = newRole!.id;
  });

  it('should block removing the last Deusex role', async () => {
    // Temporarily remove all OTHER Deusex role holders
    const others = await getOtherRoleIds(testUser.profile.id);
    for (const other of others) {
      await admin.from('user_group_roles').delete().eq('id', other.id);
    }

    // Now testUser is the ONLY Deusex role holder → should block
    const { error } = await admin
      .from('user_group_roles')
      .delete()
      .eq('id', testUserRoleId);

    expect(error).not.toBeNull();
    expect(error!.message).toContain('last DeusEx member');

    // Restore other role holders
    for (const other of others) {
      await restoreDeusexMember(other.user_id);
    }
  });

  it('should allow removing a Deusex membership when others remain', async () => {
    // Remove testUser's role first (FK constraint)
    await admin.from('user_group_roles').delete().eq('id', testUserRoleId);

    // Remove testUser's membership → others still remain
    const { error } = await admin
      .from('group_memberships')
      .delete()
      .eq('id', testUserMembershipId);

    expect(error).toBeNull();

    // Re-add membership and role
    const { data: newMembership } = await admin
      .from('group_memberships')
      .insert({
        group_id: deusexGroupId,
        user_id: testUser.profile.id,
        added_by_user_id: testUser.profile.id,
        status: 'active',
      })
      .select()
      .single();
    testUserMembershipId = newMembership!.id;

    const { data: newRole } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser.profile.id,
        group_id: deusexGroupId,
        group_role_id: deusexRoleId,
        assigned_by_user_id: testUser.profile.id,
      })
      .select()
      .single();
    testUserRoleId = newRole!.id;
  });

  it('should block removing the last active Deusex membership', async () => {
    // Temporarily remove all OTHER Deusex role holders
    const otherRoles = await getOtherRoleIds(testUser.profile.id);
    for (const other of otherRoles) {
      await admin.from('user_group_roles').delete().eq('id', other.id);
    }

    // Temporarily remove all OTHER Deusex memberships
    const otherMemberships = await getOtherMembershipIds(testUser.profile.id);
    for (const other of otherMemberships) {
      await admin.from('group_memberships').delete().eq('id', other.id);
    }

    // Remove testUser's role first (so only membership remains)
    await admin.from('user_group_roles').delete().eq('id', testUserRoleId);

    // Now testUser is the ONLY Deusex member → should block
    const { error } = await admin
      .from('group_memberships')
      .delete()
      .eq('id', testUserMembershipId);

    expect(error).not.toBeNull();
    expect(error!.message).toContain('last DeusEx member');

    // Restore testUser's role
    const { data: newRole, error: roleError } = await admin
      .from('user_group_roles')
      .insert({
        user_id: testUser.profile.id,
        group_id: deusexGroupId,
        group_role_id: deusexRoleId,
        assigned_by_user_id: testUser.profile.id,
      })
      .select()
      .single();

    if (roleError) {
      console.error('Failed to restore testUser role:', roleError);
      // If role already exists (e.g., trigger didn't actually remove it), query it
      const { data: existingRole } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('user_id', testUser.profile.id)
        .eq('group_id', deusexGroupId)
        .eq('group_role_id', deusexRoleId)
        .maybeSingle();
      if (existingRole) {
        testUserRoleId = existingRole.id;
      }
    } else {
      testUserRoleId = newRole!.id;
    }

    // Restore all other members
    for (const other of otherMemberships) {
      await restoreDeusexMember(other.user_id);
    }
  });
});
