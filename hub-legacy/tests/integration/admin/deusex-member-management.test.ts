/**
 * Integration Tests: Deusex Member Management
 *
 * Covers:
 * - B-ADMIN-003: Deusex Member Management
 *
 * Tests the database operations for managing Deusex membership:
 * look up user by email, add to Deusex, remove from Deusex,
 * handle unknown emails, and audit logging.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-003: Deusex Member Management', () => {
  const admin = createAdminClient();

  let adminUser: any; // Deusex member performing management
  let targetUser: any; // User to be added/removed from Deusex
  let adminClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;

  beforeAll(async () => {
    adminUser = await createTestUser({ displayName: 'Deusex Admin Manager' });
    targetUser = await createTestUser({ displayName: 'Deusex Target User' });

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

    // Add adminUser to Deusex
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      member_group_id: adminUser.personalGroupId,
      added_by_group_id: adminUser.personalGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: adminUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: adminUser.personalGroupId,
    });

    // Sign in admin user
    adminClient = createTestClient();
    await signInWithRetry(adminClient, adminUser.email, adminUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up target user's Deusex data if any
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', targetUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', targetUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    // Clean up admin user's Deusex data
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', adminUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', adminUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    // Clean up audit log entries from tests
    await admin.from('admin_audit_log').delete()
      .eq('actor_group_id', adminUser.personalGroupId);

    if (adminUser) await cleanupTestUser(adminUser.user.id);
    if (targetUser) await cleanupTestUser(targetUser.user.id);
  }, 30000);

  it('should look up a user by email', async () => {
    // This is what the UI does when admin types an email
    const { data: user, error } = await admin
      .from('users')
      .select('id, email, full_name')
      .eq('email', targetUser.email)
      .maybeSingle();

    expect(error).toBeNull();
    expect(user).not.toBeNull();
    expect(user!.email).toBe(targetUser.email);
  });

  it('should return null for unknown email', async () => {
    const { data: user, error } = await admin
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'nonexistent-user@fringeisland.test')
      .maybeSingle();

    expect(error).toBeNull();
    expect(user).toBeNull();
  });

  it('should add a user to Deusex (membership + role)', async () => {
    // Add membership
    const { error: memberError } = await admin
      .from('group_memberships')
      .insert({
        group_id: deusexGroupId,
        member_group_id: targetUser.personalGroupId,
        added_by_group_id: adminUser.personalGroupId,
        status: 'active',
      });

    expect(memberError).toBeNull();

    // Add role
    const { error: roleError } = await admin
      .from('user_group_roles')
      .insert({
        member_group_id: targetUser.personalGroupId,
        group_id: deusexGroupId,
        group_role_id: deusexRoleId,
        assigned_by_group_id: adminUser.personalGroupId,
      });

    expect(roleError).toBeNull();

    // Verify: user now has manage_all_groups permission
    const { data: hasPerm } = await admin.rpc('has_permission', {
      p_acting_group_id: targetUser.personalGroupId,
      p_context_group_id: deusexGroupId,
      p_permission_name: 'manage_all_groups',
    });

    expect(hasPerm).toBe(true);
  });

  it('should write audit log entry when adding a member', async () => {
    // Simulate what the UI would do after adding a member
    const { error } = await adminClient
      .from('admin_audit_log')
      .insert({
        actor_group_id: adminUser.personalGroupId,
        action: 'add_deusex_member',
        target: targetUser.email,
        metadata: {
          target_user_id: targetUser.profile.id,
          target_email: targetUser.email,
        },
      });

    expect(error).toBeNull();

    // Verify audit log entry exists
    const { data: logs } = await adminClient
      .from('admin_audit_log')
      .select('*')
      .eq('action', 'add_deusex_member')
      .eq('target', targetUser.email);

    expect(logs).not.toBeNull();
    expect(logs!.length).toBeGreaterThanOrEqual(1);
  });

  it('should remove a user from Deusex (role + membership)', async () => {
    // Remove role first
    const { error: roleError } = await admin
      .from('user_group_roles')
      .delete()
      .eq('member_group_id', targetUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    expect(roleError).toBeNull();

    // Remove membership
    const { error: memberError } = await admin
      .from('group_memberships')
      .delete()
      .eq('member_group_id', targetUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    expect(memberError).toBeNull();

    // Verify: user no longer has manage_all_groups
    const { data: hasPerm } = await admin.rpc('has_permission', {
      p_acting_group_id: targetUser.personalGroupId,
      p_context_group_id: deusexGroupId,
      p_permission_name: 'manage_all_groups',
    });

    expect(hasPerm).toBe(false);
  });

  it('should write audit log entry when removing a member', async () => {
    const { error } = await adminClient
      .from('admin_audit_log')
      .insert({
        actor_group_id: adminUser.personalGroupId,
        action: 'remove_deusex_member',
        target: targetUser.email,
        metadata: {
          target_user_id: targetUser.profile.id,
          target_email: targetUser.email,
        },
      });

    expect(error).toBeNull();
  });

  it('should list Deusex members via group_memberships query', async () => {
    // Query pattern the UI will use
    const { data: members, error } = await admin
      .from('group_memberships')
      .select(`
        id,
        member_group_id,
        added_at,
        groups!group_memberships_member_group_id_fkey (
          id,
          users!inner (
            id,
            email,
            full_name
          )
        )
      `)
      .eq('group_id', deusexGroupId)
      .eq('status', 'active');

    expect(error).toBeNull();
    expect(members).not.toBeNull();
    expect(members!.length).toBeGreaterThanOrEqual(1); // At least adminUser

    // adminUser should be in the list
    const adminMember = members!.find(
      (m: any) => m.member_group_id === adminUser.personalGroupId
    );
    expect(adminMember).not.toBeUndefined();
  });
});
