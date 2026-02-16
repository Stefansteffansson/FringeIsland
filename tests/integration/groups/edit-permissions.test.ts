/**
 * Integration Tests: Groups - Group Editing Permissions
 *
 * Tests: B-GRP-004: Group Editing Permissions
 *
 * Verifies that only Group Leaders can update group settings,
 * and that regular members / non-members are blocked via RLS.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestGroup,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-GRP-004: Group Editing Permissions', () => {
  let leader: any;
  let member: any;
  let nonMember: any;
  let testGroup: any;
  let leaderRole: any;
  let leaderRoleAssignment: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    leader = await createTestUser({ displayName: 'Group Leader' });
    member = await createTestUser({ displayName: 'Regular Member' });
    nonMember = await createTestUser({ displayName: 'Non-Member' });

    // Create group
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Test Group - Edit Permissions',
        description: 'Original description',
        label: 'original-label',
        is_public: false,
        show_member_list: true,
        created_by_user_id: leader.profile.id,
      })
      .select()
      .single();

    testGroup = group;

    // Add leader as active member + Group Leader role
    await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: leader.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });

    const { data: role } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Steward' })
      .select()
      .single();

    leaderRole = role;

    const { data: assignment } = await admin
      .from('user_group_roles')
      .insert({
        user_id: leader.profile.id,
        group_id: testGroup.id,
        group_role_id: leaderRole.id,
        assigned_by_user_id: leader.profile.id,
      })
      .select()
      .single();

    leaderRoleAssignment = assignment;

    // Add regular member (no leader role)
    await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: member.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });
  });

  afterAll(async () => {
    // Delete user_group_roles manually first to avoid the last-leader trigger
    // blocking the cascade delete in cleanupTestGroup
    if (testGroup) {
      await admin.from('user_group_roles').delete().eq('group_id', testGroup.id);
      await cleanupTestGroup(testGroup.id);
    }
    if (leader) await cleanupTestUser(leader.user.id);
    if (member) await cleanupTestUser(member.user.id);
    if (nonMember) await cleanupTestUser(nonMember.user.id);
  });

  it('should allow Group Leaders to update group name', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    const { error } = await supabase
      .from('groups')
      .update({ name: 'Updated Group Name' })
      .eq('id', testGroup.id);

    expect(error).toBeNull();

    // Verify the change persisted
    const { data: updated } = await admin
      .from('groups')
      .select('name')
      .eq('id', testGroup.id)
      .single();

    expect(updated!.name).toBe('Updated Group Name');

    // Restore
    await admin.from('groups').update({ name: 'Test Group - Edit Permissions' }).eq('id', testGroup.id);

    await supabase.auth.signOut();
  });

  it('should allow Group Leaders to update description, label, and visibility', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    const { error } = await supabase
      .from('groups')
      .update({
        description: 'Updated description',
        label: 'updated-label',
        is_public: true,
        show_member_list: false,
      })
      .eq('id', testGroup.id);

    expect(error).toBeNull();

    const { data: updated } = await admin
      .from('groups')
      .select('description, label, is_public, show_member_list')
      .eq('id', testGroup.id)
      .single();

    expect(updated!.description).toBe('Updated description');
    expect(updated!.label).toBe('updated-label');
    expect(updated!.is_public).toBe(true);
    expect(updated!.show_member_list).toBe(false);

    // Restore
    await admin.from('groups').update({
      description: 'Original description',
      label: 'original-label',
      is_public: false,
      show_member_list: true,
    }).eq('id', testGroup.id);

    await supabase.auth.signOut();
  });

  it('should block regular members from updating group settings', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    const { error } = await supabase
      .from('groups')
      .update({ name: 'Hacked Name' })
      .eq('id', testGroup.id);

    // RLS blocks the update — either error or 0 rows affected
    if (!error) {
      const { data: check } = await admin
        .from('groups')
        .select('name')
        .eq('id', testGroup.id)
        .single();

      // Name should be unchanged
      expect(check!.name).toBe('Test Group - Edit Permissions');
    } else {
      expect(error).not.toBeNull();
    }

    await supabase.auth.signOut();
  });

  it('should block non-members from updating group settings', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, nonMember.email, nonMember.password);

    const { error } = await supabase
      .from('groups')
      .update({ name: 'Hacked by Outsider' })
      .eq('id', testGroup.id);

    if (!error) {
      const { data: check } = await admin
        .from('groups')
        .select('name')
        .eq('id', testGroup.id)
        .single();

      expect(check!.name).toBe('Test Group - Edit Permissions');
    } else {
      expect(error).not.toBeNull();
    }

    await supabase.auth.signOut();
  });

  it('should revoke edit permission immediately when user is demoted from leader', async () => {
    // To demote the leader we need a second leader first (last-leader trigger blocks
    // removing the only Group Leader). Create a temp second user with leader role.
    const secondLeader = await createTestUser({ displayName: 'Second Leader' });

    try {
      // Add second leader as active member + assign Group Leader role
      await admin.from('group_memberships').insert({
        group_id: testGroup.id,
        user_id: secondLeader.profile.id,
        added_by_user_id: leader.profile.id,
        status: 'active',
      });

      const { data: secondAssignment } = await admin
        .from('user_group_roles')
        .insert({
          user_id: secondLeader.profile.id,
          group_id: testGroup.id,
          group_role_id: leaderRole.id,
          assigned_by_user_id: leader.profile.id,
        })
        .select()
        .single();

      // Now safely remove the first leader's role (second leader still exists)
      const { error: removeErr } = await admin
        .from('user_group_roles')
        .delete()
        .eq('id', leaderRoleAssignment.id);

      expect(removeErr).toBeNull();

      const supabase = createTestClient();
      await signInWithRetry(supabase, leader.email, leader.password);

      // Demoted user tries to update
      const { error } = await supabase
        .from('groups')
        .update({ name: 'Should Not Work' })
        .eq('id', testGroup.id);

      if (!error) {
        const { data: check } = await admin
          .from('groups')
          .select('name')
          .eq('id', testGroup.id)
          .single();

        expect(check!.name).toBe('Test Group - Edit Permissions');
      } else {
        expect(error).not.toBeNull();
      }

      await supabase.auth.signOut();

      // Restore original leader role for cleanup
      const { data: restored } = await admin
        .from('user_group_roles')
        .insert({
          user_id: leader.profile.id,
          group_id: testGroup.id,
          group_role_id: leaderRole.id,
          assigned_by_user_id: leader.profile.id,
        })
        .select()
        .single();

      leaderRoleAssignment = restored;

      // Remove second leader's role (now safe since first leader is restored)
      if (secondAssignment) {
        await admin.from('user_group_roles').delete().eq('id', secondAssignment.id);
      }
    } finally {
      await cleanupTestUser(secondLeader.user.id);
    }
  });
});
