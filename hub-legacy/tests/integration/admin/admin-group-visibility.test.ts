/**
 * Integration Tests: Admin Group Visibility
 *
 * Covers:
 * - B-ADMIN-012: Admin Group Visibility
 *
 * Tests that admins with manage_all_groups permission can see ALL groups
 * (public, private, system, personal, engagement) while normal users
 * can only see public groups and groups they're members of.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-012: Admin Group Visibility', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let outsiderUser: any;
  let outsiderClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;
  let privateGroupId: string | null = null;
  let publicGroupId: string | null = null;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'GroupVis Admin' });
    normalUser = await createTestUser({ displayName: 'GroupVis Normal' });
    outsiderUser = await createTestUser({ displayName: 'GroupVis Outsider' });

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

    // Create a private engagement group where admin is NOT the creator and NOT a member
    // Use normalUser as creator so the admin has no ownership or membership
    const { data: privateGroup } = await admin
      .from('groups')
      .insert({
        name: 'Private Admin Test Group',
        description: 'Private group for visibility testing',
        created_by_group_id: normalUser.personalGroupId,
        group_type: 'engagement',
        is_public: false,
      })
      .select()
      .single();

    if (privateGroup) {
      privateGroupId = privateGroup.id;
      // Add normalUser as a member (not the admin)
      await admin.from('group_memberships').insert({
        group_id: privateGroupId,
        member_group_id: normalUser.personalGroupId,
        added_by_group_id: normalUser.personalGroupId,
        status: 'active',
      });
    }

    // Create a public engagement group (also owned by normalUser)
    const { data: publicGroup } = await admin
      .from('groups')
      .insert({
        name: 'Public Admin Test Group',
        description: 'Public group for visibility testing',
        created_by_group_id: normalUser.personalGroupId,
        group_type: 'engagement',
        is_public: true,
      })
      .select()
      .single();

    if (publicGroup) {
      publicGroupId = publicGroup.id;
    }

    // Sign in clients
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);

    outsiderClient = createTestClient();
    await signInWithRetry(outsiderClient, outsiderUser.email, outsiderUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up test groups
    if (privateGroupId) {
      await admin.from('group_memberships').delete().eq('group_id', privateGroupId);
      await admin.from('groups').delete().eq('id', privateGroupId);
    }
    if (publicGroupId) {
      await admin.from('group_memberships').delete().eq('group_id', publicGroupId);
      await admin.from('groups').delete().eq('id', publicGroupId);
    }

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
    if (outsiderUser) await cleanupTestUser(outsiderUser.user.id);
  }, 30000);

  it('should allow admin to see private groups they are not a member of', async () => {
    // Admin (DeusEx member) queries for the private group — not a normal member of it
    const { data: groups, error } = await deusexClient
      .from('groups')
      .select('id, name, is_public')
      .eq('id', privateGroupId!);

    expect(error).toBeNull();
    expect(groups).not.toBeNull();
    expect(groups!.length).toBe(1);
    expect(groups![0].name).toBe('Private Admin Test Group');
    expect(groups![0].is_public).toBe(false);
  });

  it('should allow admin to see system groups', async () => {
    // Admin queries for system groups
    const { data: groups, error } = await deusexClient
      .from('groups')
      .select('id, name, group_type')
      .eq('group_type', 'system');

    expect(error).toBeNull();
    expect(groups).not.toBeNull();
    expect(groups!.length).toBeGreaterThanOrEqual(1);

    // Should include the DeusEx system group
    const deusex = groups!.find((g: any) => g.name === 'DeusEx');
    expect(deusex).not.toBeUndefined();
  });

  it('should allow admin to see personal groups', async () => {
    // Admin queries for personal groups
    const { data: groups, error } = await deusexClient
      .from('groups')
      .select('id, name, group_type')
      .eq('group_type', 'personal');

    expect(error).toBeNull();
    expect(groups).not.toBeNull();
    // Should see personal groups (every user gets one via RBAC setup)
    expect(groups!.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow admin to see all group types', async () => {
    // Admin queries all groups
    const { data: groups, error } = await deusexClient
      .from('groups')
      .select('id, group_type');

    expect(error).toBeNull();
    expect(groups).not.toBeNull();

    // Should include system, personal, and engagement types
    const types = new Set(groups!.map((g: any) => g.group_type));
    expect(types.has('system')).toBe(true);
    expect(types.has('personal')).toBe(true);
    expect(types.has('engagement')).toBe(true);
  });

  it('should block normal user from seeing private groups they do not belong to', async () => {
    // Outsider user (not creator, not member) queries for the private group
    const { data: groups, error } = await outsiderClient
      .from('groups')
      .select('id, name')
      .eq('id', privateGroupId!);

    expect(error).toBeNull();
    // Should NOT see the private group
    expect(groups).toHaveLength(0);
  });

  it('should allow normal user to see public groups', async () => {
    // Normal user queries for the public group
    const { data: groups, error } = await normalClient
      .from('groups')
      .select('id, name')
      .eq('id', publicGroupId!);

    expect(error).toBeNull();
    expect(groups).not.toBeNull();
    expect(groups!.length).toBe(1);
    expect(groups![0].name).toBe('Public Admin Test Group');
  });

  it('should not change existing INSERT/UPDATE/DELETE policies', async () => {
    // Normal user should not be able to update the private group
    await normalClient
      .from('groups')
      .update({ name: 'Hacked Name' })
      .eq('id', privateGroupId!);

    // Verify name unchanged
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', privateGroupId!)
      .single();

    expect(group!.name).toBe('Private Admin Test Group');
  });
});
