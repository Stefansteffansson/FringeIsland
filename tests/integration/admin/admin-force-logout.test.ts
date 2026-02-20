/**
 * Integration Tests: Admin Force Logout
 *
 * Covers:
 * - B-ADMIN-019: Admin Force Logout
 *
 * Tests that admins can force-logout users via an RPC that calls
 * the Supabase Auth Admin API, sessions are invalidated, the operation
 * works for all user states, non-admins are blocked, and audit log
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

describe('B-ADMIN-019: Admin Force Logout', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser: any;
  let targetClient: ReturnType<typeof createTestClient>;
  let inactiveUser: any;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'FrcLogout Admin' });
    targetUser = await createTestUser({ displayName: 'FrcLogout Target' });
    inactiveUser = await createTestUser({ displayName: 'FrcLogout Inactive' });
    normalUser = await createTestUser({ displayName: 'FrcLogout Normal' });

    // Deactivate the inactive user
    await admin
      .from('users')
      .update({ is_active: false })
      .eq('id', inactiveUser.profile.id);

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

    // Sign in clients
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    targetClient = createTestClient();
    await signInWithRetry(targetClient, targetUser.email, targetUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Reset inactive user
    await admin
      .from('users')
      .update({ is_active: true })
      .eq('id', inactiveUser.profile.id);

    // Clean up audit log entries
    await admin.from('admin_audit_log').delete()
      .eq('actor_user_id', deusexUser.profile.id)
      .eq('action', 'admin_force_logout');

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser) await cleanupTestUser(targetUser.user.id);
    if (inactiveUser) await cleanupTestUser(inactiveUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should have admin_force_logout RPC callable by admin', async () => {
    // Call the force logout RPC for the target user
    const { data, error } = await deusexClient.rpc('admin_force_logout', {
      target_user_ids: [targetUser.profile.id],
    });

    // Should succeed — RPC exists and admin has permission
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should invalidate user session after force logout', async () => {
    // Verify target user had a valid session before
    const { data: sessionBefore } = await targetClient.auth.getSession();
    expect(sessionBefore.session).not.toBeNull();

    // Force logout the target user
    const { error } = await deusexClient.rpc('admin_force_logout', {
      target_user_ids: [targetUser.profile.id],
    });

    expect(error).toBeNull();

    // After force logout, the target's refresh token is deleted.
    // JWT access tokens remain valid until expiry (Supabase default: 3600s),
    // but the user CANNOT refresh their session — effectively logged out.
    // Attempting to refresh should fail because the refresh token was deleted.
    const { data: refreshResult, error: refreshError } =
      await targetClient.auth.refreshSession();

    // Refresh should fail — tokens were revoked by admin_force_logout
    expect(
      refreshError !== null || refreshResult.session === null
    ).toBe(true);
  });

  it('should work for inactive users', async () => {
    // Force logout an inactive user
    const { data, error } = await deusexClient.rpc('admin_force_logout', {
      target_user_ids: [inactiveUser.profile.id],
    });

    // Should succeed regardless of user status
    expect(error).toBeNull();
  });

  it('should support batch logout of multiple users', async () => {
    const { data, error } = await deusexClient.rpc('admin_force_logout', {
      target_user_ids: [targetUser.profile.id, inactiveUser.profile.id],
    });

    // Should succeed for batch
    expect(error).toBeNull();
  });

  it('should block non-admin from calling force logout RPC', async () => {
    const { error } = await normalClient.rpc('admin_force_logout', {
      target_user_ids: [targetUser.profile.id],
    });

    // Should fail — non-admin doesn't have manage_all_groups permission
    expect(error).not.toBeNull();
  });

  it('should create audit log entry for force logout action', async () => {
    // After force logout, there should be audit log entries
    const { data: auditEntries } = await admin
      .from('admin_audit_log')
      .select('*')
      .eq('actor_user_id', deusexUser.profile.id)
      .eq('action', 'admin_force_logout');

    expect(auditEntries).not.toBeNull();
    expect(auditEntries!.length).toBeGreaterThanOrEqual(1);

    // Verify target is recorded
    const entry = auditEntries![0];
    expect(entry.target).toBeDefined();
  });
});
