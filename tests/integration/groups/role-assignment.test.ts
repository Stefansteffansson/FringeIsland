/**
 * Integration Tests: Groups - Role Assignment Permissions
 *
 * Tests: B-ROL-001: Role Assignment Permissions
 *        B-ROL-003: Role Visibility Rules
 *
 * Covers the INSERT (assign) side of B-ROL-001 using an authenticated client,
 * which the existing last-leader.test.ts (admin-only) does not cover.
 *
 * Also covers B-ROL-003: members can see role assignments in their groups,
 * non-members cannot.
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

describe('B-ROL-001 + B-ROL-003: Role Assignment Permissions & Visibility', () => {
  // Shared fixtures
  let leader: any;    // Active member WITH Group Leader role
  let member: any;    // Active member WITHOUT leader role
  let outsider: any;  // Not a member of testGroup at all
  let testGroup: any;
  let leaderRole: any;  // "Group Leader" group_role for testGroup
  let memberRole: any;  // "Travel Guide" group_role for testGroup (used as target to assign)

  const admin = createAdminClient();

  beforeAll(async () => {
    leader   = await createTestUser({ displayName: 'Role Test - Leader' });
    member   = await createTestUser({ displayName: 'Role Test - Member' });
    outsider = await createTestUser({ displayName: 'Role Test - Outsider' });

    // Create test group
    const { data: group, error: gErr } = await admin
      .from('groups')
      .insert({
        name: 'Role Assignment Test Group',
        description: 'Tests for B-ROL-001 and B-ROL-003',
        is_public: false,
        created_by_user_id: leader.profile.id,
      })
      .select()
      .single();

    expect(gErr).toBeNull();
    testGroup = group;

    // Add leader as active member
    const { error: lmErr } = await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: leader.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });
    expect(lmErr).toBeNull();

    // Add regular member as active member
    const { error: mmErr } = await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: member.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });
    expect(mmErr).toBeNull();

    // Create Group Leader role and assign to leader
    const { data: lr, error: lrErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Steward' })
      .select()
      .single();

    expect(lrErr).toBeNull();
    leaderRole = lr;

    const { error: assignErr } = await admin.from('user_group_roles').insert({
      user_id: leader.profile.id,
      group_id: testGroup.id,
      group_role_id: leaderRole.id,
      assigned_by_user_id: leader.profile.id,
    });
    expect(assignErr).toBeNull();

    // Grant assign_roles permission to the Steward role (required by RBAC INSERT policy)
    const { data: assignRolesPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'assign_roles')
      .single();
    expect(assignRolesPerm).not.toBeNull();

    await admin.from('group_role_permissions').insert({
      group_role_id: leaderRole.id,
      permission_id: assignRolesPerm!.id,
      granted: true,
    });

    // Create a "Travel Guide" role (target for assignment tests)
    const { data: mr, error: mrErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Guide' })
      .select()
      .single();

    expect(mrErr).toBeNull();
    memberRole = mr;
  });

  afterAll(async () => {
    // Remove all user_group_roles first to avoid last-leader trigger
    if (testGroup) {
      await admin.from('user_group_roles').delete().eq('group_id', testGroup.id);
      await cleanupTestGroup(testGroup.id);
    }
    if (leader)   await cleanupTestUser(leader.user.id);
    if (member)   await cleanupTestUser(member.user.id);
    if (outsider) await cleanupTestUser(outsider.user.id);
  });

  // ============================================================
  // B-ROL-001: Role Assignment Permissions — INSERT side
  // ============================================================

  it('B-ROL-001: Group Leader can assign a role to an active member', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    let assignmentId: string | null = null;
    try {
      const { data, error } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: member.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: leader.profile.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.user_id).toBe(member.profile.id);
      expect(data!.group_role_id).toBe(memberRole.id);
      assignmentId = data?.id ?? null;
    } finally {
      if (assignmentId) await admin.from('user_group_roles').delete().eq('id', assignmentId);
      await supabase.auth.signOut();
    }
  });

  it('B-ROL-001: Regular member (non-leader) cannot assign roles (RLS blocks)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    try {
      const { data, error } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: leader.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: member.profile.id,
        })
        .select()
        .single();

      // RLS WITH CHECK fails → PostgREST returns error
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-ROL-001: Non-member cannot assign roles (RLS blocks)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, outsider.email, outsider.password);

    try {
      const { data, error } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: member.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: outsider.profile.id,
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-ROL-001: Bootstrap — creator self-assigns first Group Leader role when no leader exists', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    // Admin creates a fresh group and role but assigns NO user_group_roles
    const { data: bootstrapGroup } = await admin
      .from('groups')
      .insert({
        name: 'Bootstrap Test Group - Role Assignment',
        created_by_user_id: leader.profile.id,
      })
      .select()
      .single();

    const { data: bootstrapRole } = await admin
      .from('group_roles')
      .insert({ group_id: bootstrapGroup!.id, name: 'Steward' })
      .select()
      .single();

    // Add leader as active member (required for function calls within the policy context)
    await admin.from('group_memberships').insert({
      group_id: bootstrapGroup!.id,
      user_id: leader.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });

    try {
      // Leader self-assigns the Group Leader role (bootstrap path)
      const { data, error } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: leader.profile.id,
          group_id: bootstrapGroup!.id,
          group_role_id: bootstrapRole!.id,
          assigned_by_user_id: leader.profile.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.user_id).toBe(leader.profile.id);
    } finally {
      // Remove user_group_roles first to avoid last-leader trigger, then group
      await admin.from('user_group_roles').delete().eq('group_id', bootstrapGroup!.id);
      await cleanupTestGroup(bootstrapGroup!.id);
      await supabase.auth.signOut();
    }
  });

  it('B-ROL-001: Bootstrap blocked when group already has a leader', async () => {
    // testGroup already has `leader` as Group Leader.
    // `member` (non-leader) should NOT be able to self-assign via bootstrap.
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    try {
      const { data, error } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: member.profile.id,
          group_id: testGroup.id,
          group_role_id: leaderRole.id,
          assigned_by_user_id: member.profile.id,
        })
        .select()
        .single();

      // group_has_leader() returns true → bootstrap path denied; not a Group Leader → Case A denied
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-ROL-001: Duplicate role assignment blocked by UNIQUE constraint', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    // Admin creates the first assignment
    const { data: firstAssignment } = await admin
      .from('user_group_roles')
      .insert({
        user_id: member.profile.id,
        group_id: testGroup.id,
        group_role_id: memberRole.id,
        assigned_by_user_id: leader.profile.id,
      })
      .select()
      .single();

    try {
      // Leader tries to assign the same role to the same member again
      const { data, error } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: member.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: leader.profile.id,
        })
        .select()
        .single();

      // UNIQUE (user_id, group_id, group_role_id) violated
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      if (firstAssignment) await admin.from('user_group_roles').delete().eq('id', firstAssignment.id);
      await supabase.auth.signOut();
    }
  });

  // ============================================================
  // B-ROL-003: Role Visibility Rules — SELECT side
  // ============================================================

  it('B-ROL-003: Active member can see role assignments in their group', async () => {
    // member is an active member of testGroup; leader's Group Leader role exists
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    try {
      const { data, error } = await supabase
        .from('user_group_roles')
        .select('id, user_id, group_role_id')
        .eq('group_id', testGroup.id);

      expect(error).toBeNull();
      // At minimum, the leader's Group Leader assignment must be visible
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      const leaderAssignment = data!.find(r => r.user_id === leader.profile.id);
      expect(leaderAssignment).toBeDefined();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-ROL-003: Non-member cannot see role assignments (RLS filters to empty)', async () => {
    // outsider has no membership in testGroup
    const supabase = createTestClient();
    await signInWithRetry(supabase, outsider.email, outsider.password);

    try {
      const { data, error } = await supabase
        .from('user_group_roles')
        .select('id')
        .eq('group_id', testGroup.id);

      // No error (RLS silently filters) but result must be empty
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await supabase.auth.signOut();
    }
  });
});
