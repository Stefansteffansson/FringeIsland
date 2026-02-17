/**
 * Integration Tests: Deusex Bootstrap
 *
 * Covers:
 * - B-ADMIN-006: Deusex Bootstrap
 *
 * Tests that `deusex@fringeisland.com` has been bootstrapped as an
 * active Deusex member with the correct role and permissions.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  createAdminClient,
  createTestClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-006: Deusex Bootstrap', () => {
  const admin = createAdminClient();

  let deusexGroupId: string;
  let deusexUserId: string; // public.users.id
  let testGroup: any;
  let tempUser: any;

  beforeAll(async () => {
    // Look up the Deusex group
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('Deusex system group not found');
    deusexGroupId = deusexGroup.id;

    // Look up deusex@fringeisland.com user
    const { data: deusexUser } = await admin
      .from('users')
      .select('id, email')
      .eq('email', 'deusex@fringeisland.com')
      .single();

    if (!deusexUser) throw new Error('deusex@fringeisland.com user not found — has this user signed up?');
    deusexUserId = deusexUser.id;

    // Create a test engagement group for permission context checks
    tempUser = await createTestUser({ displayName: 'Bootstrap Context User' });
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Bootstrap Test Group',
        group_type: 'engagement',
        created_by_user_id: tempUser.profile.id,
      })
      .select()
      .single();
    testGroup = group;
  }, 30000);

  afterAll(async () => {
    if (testGroup) await cleanupTestGroup(testGroup.id);
    if (tempUser) await cleanupTestUser(tempUser.user.id);
  }, 30000);

  it('should have deusex@fringeisland.com as an active Deusex member', async () => {
    const { data: membership, error } = await admin
      .from('group_memberships')
      .select('id, status')
      .eq('group_id', deusexGroupId)
      .eq('user_id', deusexUserId)
      .eq('status', 'active')
      .single();

    expect(error).toBeNull();
    expect(membership).not.toBeNull();
    expect(membership!.status).toBe('active');
  });

  it('should have the Deusex role assigned', async () => {
    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    expect(deusexRole).not.toBeNull();

    const { data: roleAssignment, error } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('user_id', deusexUserId)
      .eq('group_id', deusexGroupId)
      .eq('group_role_id', deusexRole!.id)
      .single();

    expect(error).toBeNull();
    expect(roleAssignment).not.toBeNull();
  });

  it('should have manage_all_groups permission via has_permission()', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_user_id: deusexUserId,
      p_group_id: testGroup.id,
      p_permission_name: 'manage_all_groups',
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('should have ALL permissions (Tier 1 system group resolution)', async () => {
    const { data: allPerms } = await admin
      .from('permissions')
      .select('name');

    expect(allPerms).not.toBeNull();
    expect(allPerms!.length).toBeGreaterThanOrEqual(42);

    const results = await Promise.all(
      allPerms!.map(async (perm: { name: string }) => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: deusexUserId,
          p_group_id: testGroup.id,
          p_permission_name: perm.name,
        });
        return { permission: perm.name, granted: data };
      })
    );

    const denied = results.filter((r) => r.granted !== true);
    expect(denied).toEqual([]);
  });
});
