/**
 * Integration Tests: User Hard Delete
 *
 * Covers:
 * - B-ADMIN-009: User Hard Delete
 *
 * Tests that admins can hard-delete users via RPC, all records are cascade-removed
 * in FK-safe order, audit log entry is created before deletion, and non-admins
 * cannot call the RPC.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-009: User Hard Delete', () => {
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
    deusexUser = await createTestUser({ displayName: 'HardDelete Admin' });
    targetUser = await createTestUser({ displayName: 'HardDelete Target' });
    normalUser = await createTestUser({ displayName: 'HardDelete Normal' });

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

    // Create a test group and add targetUser to it (to verify cascade)
    const { data: testGroup } = await admin
      .from('groups')
      .insert({
        name: 'HardDelete Test Group',
        description: 'Group for cascade testing',
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

    // Clean up audit log entries
    await admin.from('admin_audit_log').delete()
      .eq('actor_user_id', deusexUser.profile.id);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    // targetUser may already be hard-deleted by the test — only clean up if still exists
    const { data: targetStillExists } = await admin
      .from('users')
      .select('id')
      .eq('id', targetUser.profile.id)
      .maybeSingle();
    if (targetStillExists) await cleanupTestUser(targetUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should have admin_hard_delete_user RPC', async () => {
    // Call the RPC with a non-existent user to verify it exists
    // The RPC should return an error about the user not existing, not about the function not existing
    const { error } = await admin.rpc('admin_hard_delete_user', {
      target_user_id: '00000000-0000-0000-0000-000000000000',
    });

    // We expect an error (user not found), but NOT a "function does not exist" error
    expect(error).not.toBeNull();
    expect(error!.message).not.toContain('function');
    expect(error!.message).not.toContain('does not exist');
  });

  it('should hard delete user and all their records', async () => {
    const targetProfileId = targetUser.profile.id;
    const targetAuthId = targetUser.user.id;

    // Call the RPC as signed-in DeusEx admin
    const { error } = await deusexClient.rpc('admin_hard_delete_user', {
      target_user_id: targetProfileId,
    });

    expect(error).toBeNull();

    // Verify: user gone from public.users
    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('id', targetProfileId)
      .maybeSingle();

    expect(userRow).toBeNull();

    // Verify: no group memberships remain
    const { data: memberships } = await admin
      .from('group_memberships')
      .select('id')
      .eq('user_id', targetProfileId);

    expect(memberships).toEqual([]);

    // Verify: no role assignments remain
    const { data: roles } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('user_id', targetProfileId);

    expect(roles).toEqual([]);
  });

  it('should create audit log entry before deletion', async () => {
    // Check for audit log entry about the deleted target user
    const { data: logs, error } = await admin
      .from('admin_audit_log')
      .select('*')
      .eq('action', 'user_hard_deleted')
      .eq('actor_user_id', deusexUser.profile.id);

    expect(error).toBeNull();
    expect(logs).not.toBeNull();
    expect(logs!.length).toBeGreaterThanOrEqual(1);

    // Audit entry should capture the deleted user's info
    const entry = logs!.find(
      (l: any) => l.metadata?.target_user_id === targetUser.profile.id
    );
    expect(entry).not.toBeUndefined();
    expect(entry!.metadata.target_email).toBe(targetUser.email);
  });

  it('should block non-admin from calling hard delete RPC', async () => {
    // Normal user tries to hard delete the deusex admin
    const { error } = await normalClient.rpc('admin_hard_delete_user', {
      target_user_id: deusexUser.profile.id,
    });

    // Should fail with permission error
    expect(error).not.toBeNull();

    // Verify deusex user still exists
    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('id', deusexUser.profile.id)
      .single();

    expect(user).not.toBeNull();
  });

  it('should error when target user does not exist', async () => {
    const { error } = await deusexClient.rpc('admin_hard_delete_user', {
      target_user_id: '00000000-0000-0000-0000-000000000000',
    });

    expect(error).not.toBeNull();
  });
});
