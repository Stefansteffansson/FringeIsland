/**
 * Integration Tests: Admin User Management (Activate/Deactivate)
 *
 * Covers:
 * - B-ADMIN-010: Admin User Management
 *
 * Tests that admins can activate and deactivate users, decommissioned users
 * cannot be reactivated, non-admins cannot modify other users' status,
 * and existing self-update policy still works.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-010: Admin User Management (Activate/Deactivate)', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser: any;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'UserMgmt Admin' });
    targetUser = await createTestUser({ displayName: 'UserMgmt Target' });
    normalUser = await createTestUser({ displayName: 'UserMgmt Normal' });

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

    // Sign in clients
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Reset target user state
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

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser) await cleanupTestUser(targetUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should allow admin to deactivate a user', async () => {
    // Admin sets is_active = false via RLS-respecting client
    const { error } = await deusexClient
      .from('users')
      .update({ is_active: false })
      .eq('id', targetUser.profile.id);

    expect(error).toBeNull();

    // Verify via admin client
    const { data: user } = await admin
      .from('users')
      .select('is_active')
      .eq('id', targetUser.profile.id)
      .single();

    expect(user).not.toBeNull();
    expect(user!.is_active).toBe(false);
  });

  it('should allow admin to activate a deactivated user', async () => {
    // Ensure user is deactivated first
    await admin
      .from('users')
      .update({ is_active: false })
      .eq('id', targetUser.profile.id);

    // Admin activates the user
    const { error } = await deusexClient
      .from('users')
      .update({ is_active: true })
      .eq('id', targetUser.profile.id);

    expect(error).toBeNull();

    // Verify
    const { data: user } = await admin
      .from('users')
      .select('is_active')
      .eq('id', targetUser.profile.id)
      .single();

    expect(user).not.toBeNull();
    expect(user!.is_active).toBe(true);
  });

  it('should block activating a decommissioned user', async () => {
    // Decommission the user first (via admin service role)
    await admin
      .from('users')
      .update({ is_decommissioned: true, is_active: false } as any)
      .eq('id', targetUser.profile.id);

    // Admin tries to activate the decommissioned user
    const { error } = await deusexClient
      .from('users')
      .update({ is_active: true })
      .eq('id', targetUser.profile.id);

    // Verify the user is still decommissioned and inactive
    const { data: user } = await admin
      .from('users')
      .select('is_active, is_decommissioned')
      .eq('id', targetUser.profile.id)
      .single();

    expect(user).not.toBeNull();
    expect(user!.is_active).toBe(false);
    expect((user as any).is_decommissioned).toBe(true);

    // Reset for next tests
    await admin
      .from('users')
      .update({ is_decommissioned: false, is_active: true } as any)
      .eq('id', targetUser.profile.id);
  });

  it('should block non-admin from deactivating another user', async () => {
    // Normal user tries to deactivate the target user
    const { error } = await normalClient
      .from('users')
      .update({ is_active: false })
      .eq('id', targetUser.profile.id);

    // Verify the user was NOT deactivated (check via admin)
    const { data: user } = await admin
      .from('users')
      .select('is_active')
      .eq('id', targetUser.profile.id)
      .single();

    expect(user).not.toBeNull();
    expect(user!.is_active).toBe(true);
  });

  it('should still allow users to update their own profile', async () => {
    // Normal user updates their own name (self-update policy)
    const { error } = await normalClient
      .from('users')
      .update({ full_name: 'Updated Name' })
      .eq('id', normalUser.profile.id);

    expect(error).toBeNull();

    // Verify
    const { data: user } = await admin
      .from('users')
      .select('full_name')
      .eq('id', normalUser.profile.id)
      .single();

    expect(user).not.toBeNull();
    expect(user!.full_name).toBe('Updated Name');
  });
});
