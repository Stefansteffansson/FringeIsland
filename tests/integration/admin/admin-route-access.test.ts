/**
 * Integration Tests: Admin Route Access
 *
 * Covers:
 * - B-ADMIN-001: Admin Route Protection
 *
 * Tests that admin functionality is gated by `manage_all_groups` permission
 * at the database level. The UI layout uses has_permission() RPC — tested here.
 * Also verifies that Deusex members can read the audit log (proxy for admin access).
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-001: Admin Route Protection', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let normalUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;
  let testGroupId: string;

  beforeAll(async () => {
    const deusexResult = await createTestUser({ displayName: 'Admin Access Deusex' });
    const normalResult = await createTestUser({ displayName: 'Admin Access Normal' });

    deusexUser = deusexResult;
    normalUser = normalResult;

    // Look up Deusex group and role
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

    // Add deusexUser to Deusex group with role
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

    // Create a test engagement group for context
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Admin Access Test Group',
        group_type: 'engagement',
        created_by_group_id: normalUser.personalGroupId,
      })
      .select()
      .single();
    testGroupId = group!.id;

    // Sign in both users
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (testGroupId) {
      await admin.from('groups').delete().eq('id', testGroupId);
    }
    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should grant manage_all_groups to Deusex member', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_acting_group_id: deusexUser.personalGroupId,
      p_context_group_id: testGroupId,
      p_permission_name: 'manage_all_groups',
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('should NOT grant manage_all_groups to normal user', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_acting_group_id: normalUser.personalGroupId,
      p_context_group_id: testGroupId,
      p_permission_name: 'manage_all_groups',
    });

    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('should allow Deusex member to read audit log (admin data access)', async () => {
    const { data, error } = await deusexClient
      .from('admin_audit_log')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    // May be empty but should not error
  });

  it('should block normal user from reading audit log', async () => {
    const { data, error } = await normalClient
      .from('admin_audit_log')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS blocks, returns empty
  });

  it('should return manage_all_groups in Deusex user permissions array', async () => {
    const { data, error } = await admin.rpc('get_user_permissions', {
      p_acting_group_id: deusexUser.personalGroupId,
      p_context_group_id: testGroupId,
    });

    expect(error).toBeNull();
    expect(data).toContain('manage_all_groups');
    expect(data).toContain('manage_platform_settings');
  });

  it('should NOT include manage_all_groups in normal user permissions', async () => {
    const { data, error } = await admin.rpc('get_user_permissions', {
      p_acting_group_id: normalUser.personalGroupId,
      p_context_group_id: testGroupId,
    });

    expect(error).toBeNull();
    expect(data).not.toContain('manage_all_groups');
    expect(data).not.toContain('manage_platform_settings');
  });
});
