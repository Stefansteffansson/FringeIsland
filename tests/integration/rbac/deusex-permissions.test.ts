/**
 * Integration Tests: Deusex System Group Permissions
 *
 * Covers:
 * - B-RBAC-012: Deusex Has All Permissions
 *
 * EXPECTED STATE: FAILING (RED phase)
 * The has_permission() SQL function does NOT exist yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  cleanupTestUser,
  cleanupTestGroup,
} from '@/tests/helpers/supabase';

describe('B-RBAC-012: Deusex Has All Permissions', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let normalUser: any;
  let testGroup: any;

  beforeAll(async () => {
    // Create test users
    deusexUser = await createTestUser({ displayName: 'Deusex Perm Test' });
    normalUser = await createTestUser({ displayName: 'Normal Perm Test' });

    // Get the Deusex system group
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'Deusex')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('Deusex system group not found');

    // Get the Deusex role in the Deusex group
    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroup.id)
      .eq('name', 'Deusex')
      .single();

    if (!deusexRole) throw new Error('Deusex role not found');

    // Add deusex user to Deusex system group
    await admin.from('group_memberships').insert({
      group_id: deusexGroup.id,
      user_id: deusexUser.profile.id,
      added_by_user_id: deusexUser.profile.id,
      status: 'active',
    });

    // Assign Deusex role
    await admin.from('user_group_roles').insert({
      user_id: deusexUser.profile.id,
      group_id: deusexGroup.id,
      group_role_id: deusexRole.id,
      assigned_by_user_id: deusexUser.profile.id,
    });

    // Create a test engagement group for context
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Deusex Test Engagement Group',
        description: 'For testing Deusex permissions in engagement context',
        group_type: 'engagement',
        created_by_user_id: normalUser.profile.id,
      })
      .select()
      .single();

    if (!group) throw new Error('Failed to create test group');
    testGroup = group;

    // Add normal user as active member with Member role
    await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: normalUser.profile.id,
      added_by_user_id: normalUser.profile.id,
      status: 'active',
    });

    const { data: memberTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Member Role Template')
      .single();

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({
        group_id: testGroup.id,
        name: 'Member',
        created_from_role_template_id: memberTemplate!.id,
      })
      .select()
      .single();

    await admin.from('user_group_roles').insert({
      user_id: normalUser.profile.id,
      group_id: testGroup.id,
      group_role_id: memberRole!.id,
      assigned_by_user_id: normalUser.profile.id,
    });
  }, 30000);

  afterAll(async () => {
    if (testGroup) await cleanupTestGroup(testGroup.id);
    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should grant Deusex user invite_members in engagement group', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_user_id: deusexUser.profile.id,
      p_group_id: testGroup.id,
      p_permission_name: 'invite_members',
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('should grant Deusex user delete_group in engagement group', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_user_id: deusexUser.profile.id,
      p_group_id: testGroup.id,
      p_permission_name: 'delete_group',
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('should grant Deusex user manage_all_groups (platform_admin permission)', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_user_id: deusexUser.profile.id,
      p_group_id: testGroup.id,
      p_permission_name: 'manage_all_groups',
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('should grant Deusex user ALL 42 permissions', async () => {
    // Get all permission names from the catalog
    const { data: allPerms } = await admin
      .from('permissions')
      .select('name');

    expect(allPerms).not.toBeNull();
    expect(allPerms!.length).toBe(42);

    // Check each permission
    const results = await Promise.all(
      allPerms!.map(async (perm: { name: string }) => {
        const { data, error } = await admin.rpc('has_permission', {
          p_user_id: deusexUser.profile.id,
          p_group_id: testGroup.id,
          p_permission_name: perm.name,
        });

        return { permission: perm.name, granted: data, error };
      })
    );

    const denied = results.filter((r) => r.granted !== true);
    expect(denied).toEqual([]);
  });

  it('should NOT grant normal user platform_admin permissions (control)', async () => {
    const { data: manageGroups } = await admin.rpc('has_permission', {
      p_user_id: normalUser.profile.id,
      p_group_id: testGroup.id,
      p_permission_name: 'manage_all_groups',
    });

    const { data: manageTemplates } = await admin.rpc('has_permission', {
      p_user_id: normalUser.profile.id,
      p_group_id: testGroup.id,
      p_permission_name: 'manage_role_templates',
    });

    expect(manageGroups).toBe(false);
    expect(manageTemplates).toBe(false);
  });

  it('should NOT grant normal user ALL permissions (control)', async () => {
    const { data: allPerms } = await admin
      .from('permissions')
      .select('name');

    const results = await Promise.all(
      allPerms!.map(async (perm: { name: string }) => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: normalUser.profile.id,
          p_group_id: testGroup.id,
          p_permission_name: perm.name,
        });

        return { permission: perm.name, granted: data };
      })
    );

    const granted = results.filter((r) => r.granted === true);

    // Normal user has SOME permissions (FI Members + Member role) but NOT all 41
    expect(granted.length).toBeGreaterThan(0);
    expect(granted.length).toBeLessThan(41);
  });
});
