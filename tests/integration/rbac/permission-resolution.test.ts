/**
 * Integration Tests: RBAC Permission Resolution
 *
 * Covers:
 * - B-RBAC-008: Engagement Group Permission Resolution
 * - B-RBAC-009: System Group Permission Resolution (Tier 1)
 * - B-RBAC-010: Permission Check Edge Cases
 *
 * EXPECTED STATE: FAILING (RED phase)
 * The has_permission() SQL function does NOT exist yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  createAdminClient,
  cleanupTestGroup,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('RBAC Permission Resolution', () => {
  const admin = createAdminClient();

  // Test users
  let userA: any; // Will be Steward
  let userB: any; // Will be Member
  let userAProfile: any;
  let userBProfile: any;

  // Test group + roles
  let testGroup: any;
  let stewardRole: any;
  let memberRole: any;

  beforeAll(async () => {
    // Create two test users
    userA = await createTestUser({ displayName: 'Perm Test Steward' });
    userB = await createTestUser({ displayName: 'Perm Test Member' });

    userAProfile = userA.profile;
    userBProfile = userB.profile;

    // Create test engagement group
    const { data: group, error: groupErr } = await admin
      .from('groups')
      .insert({
        name: 'Permission Resolution Test Group',
        description: 'Testing permission resolution',
        group_type: 'engagement',
        created_by_user_id: userAProfile.id,
      })
      .select()
      .single();

    if (groupErr) throw new Error(`Failed to create group: ${groupErr.message}`);
    testGroup = group;

    // Add both users as active members
    await admin.from('group_memberships').insert([
      {
        group_id: testGroup.id,
        user_id: userAProfile.id,
        added_by_user_id: userAProfile.id,
        status: 'active',
      },
      {
        group_id: testGroup.id,
        user_id: userBProfile.id,
        added_by_user_id: userAProfile.id,
        status: 'active',
      },
    ]);

    // Get role templates
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: memberTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Member Role Template')
      .single();

    // Create group roles (triggers copy_template_permissions)
    const { data: sRole } = await admin
      .from('group_roles')
      .insert({
        group_id: testGroup.id,
        name: 'Steward',
        created_from_role_template_id: stewardTemplate!.id,
      })
      .select()
      .single();

    const { data: mRole } = await admin
      .from('group_roles')
      .insert({
        group_id: testGroup.id,
        name: 'Member',
        created_from_role_template_id: memberTemplate!.id,
      })
      .select()
      .single();

    stewardRole = sRole;
    memberRole = mRole;

    // Assign roles
    await admin.from('user_group_roles').insert([
      {
        user_id: userAProfile.id,
        group_id: testGroup.id,
        group_role_id: stewardRole.id,
        assigned_by_user_id: userAProfile.id,
      },
      {
        user_id: userBProfile.id,
        group_id: testGroup.id,
        group_role_id: memberRole.id,
        assigned_by_user_id: userAProfile.id,
      },
    ]);
  }, 30000);

  afterAll(async () => {
    if (testGroup) await cleanupTestGroup(testGroup.id);
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
  }, 30000);

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-008: Engagement Group Permission Resolution
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-008: Engagement Group Permission Resolution', () => {
    it('should return true when Steward has invite_members', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userAProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'invite_members',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false when Member does NOT have invite_members', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'invite_members',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return true when Member has view_member_list', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'view_member_list',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return true when user with multiple roles gets union of permissions', async () => {
      // Get Observer template
      const { data: observerTemplate } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Observer Role Template')
        .single();

      // Create Observer role in group
      const { data: observerRole } = await admin
        .from('group_roles')
        .insert({
          group_id: testGroup.id,
          name: 'Observer',
          created_from_role_template_id: observerTemplate!.id,
        })
        .select()
        .single();

      // Give user A both Steward + Observer roles
      await admin.from('user_group_roles').insert({
        user_id: userAProfile.id,
        group_id: testGroup.id,
        group_role_id: observerRole!.id,
        assigned_by_user_id: userAProfile.id,
      });

      // Steward-only permission should still work (union semantics)
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userAProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'assign_roles',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false when user is not a member of the group', async () => {
      const userC = await createTestUser({ displayName: 'Perm Test NonMember' });

      try {
        const { data, error } = await admin.rpc('has_permission', {
          p_user_id: userC.profile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'view_member_list',
        });

        expect(error).toBeNull();
        expect(data).toBe(false);
      } finally {
        await cleanupTestUser(userC.user.id);
      }
    });

    it('should return false when user has status invited (not active)', async () => {
      const userD = await createTestUser({ displayName: 'Perm Test Invited' });

      try {
        // Add as invited (not active)
        await admin.from('group_memberships').insert({
          group_id: testGroup.id,
          user_id: userD.profile.id,
          added_by_user_id: userAProfile.id,
          status: 'invited',
        });

        // Assign Member role
        await admin.from('user_group_roles').insert({
          user_id: userD.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: userAProfile.id,
        });

        const { data, error } = await admin.rpc('has_permission', {
          p_user_id: userD.profile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'view_member_list',
        });

        expect(error).toBeNull();
        expect(data).toBe(false);
      } finally {
        await cleanupTestUser(userD.user.id);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-009: System Group Permission Resolution (Tier 1)
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-009: System Group Permission Resolution (Tier 1)', () => {
    it('should return true for create_group from FI Members (any authenticated user)', async () => {
      // User B is just a Member in testGroup but FI Members grants create_group
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'create_group',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return true for browse_journey_catalog from FI Members', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'browse_journey_catalog',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should not grant engagement-group permissions via FI Members alone', async () => {
      // User B is Member role — should NOT have invite_members
      // even though they're FI Members (invite_members is engagement-scoped)
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'invite_members',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should provide additive permissions from system + context groups', async () => {
      // User B should have create_group (Tier 1) AND view_member_list (Tier 2 Member role)
      const { data: systemPerm } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'create_group',
      });

      const { data: contextPerm } = await admin.rpc('has_permission', {
        p_user_id: userBProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'view_member_list',
      });

      expect(systemPerm).toBe(true);
      expect(contextPerm).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-010: Edge Cases and Error Handling
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-010: Edge Cases and Error Handling', () => {
    it('should return false for non-existent user_id', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_group_id: testGroup.id,
        p_permission_name: 'view_member_list',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for non-existent group_id', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userAProfile.id,
        p_group_id: '00000000-0000-0000-0000-000000000000',
        p_permission_name: 'view_member_list',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for non-existent permission_name', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userAProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'nonexistent_permission_xyz',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for NULL user_id', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: null,
        p_group_id: testGroup.id,
        p_permission_name: 'view_member_list',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for NULL group_id', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userAProfile.id,
        p_group_id: null,
        p_permission_name: 'view_member_list',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for NULL permission_name', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_user_id: userAProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: null,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false when user has status removed', async () => {
      const userE = await createTestUser({ displayName: 'Perm Test Removed' });

      try {
        await admin.from('group_memberships').insert({
          group_id: testGroup.id,
          user_id: userE.profile.id,
          added_by_user_id: userAProfile.id,
          status: 'active',
        });

        await admin.from('user_group_roles').insert({
          user_id: userE.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: userAProfile.id,
        });

        // Set status to removed
        await admin
          .from('group_memberships')
          .update({ status: 'removed' })
          .eq('group_id', testGroup.id)
          .eq('user_id', userE.profile.id);

        const { data, error } = await admin.rpc('has_permission', {
          p_user_id: userE.profile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'view_member_list',
        });

        expect(error).toBeNull();
        expect(data).toBe(false);
      } finally {
        await cleanupTestUser(userE.user.id);
      }
    });

    it('should return false when user has status paused', async () => {
      const userF = await createTestUser({ displayName: 'Perm Test Paused' });

      try {
        await admin.from('group_memberships').insert({
          group_id: testGroup.id,
          user_id: userF.profile.id,
          added_by_user_id: userAProfile.id,
          status: 'active',
        });

        await admin.from('user_group_roles').insert({
          user_id: userF.profile.id,
          group_id: testGroup.id,
          group_role_id: memberRole.id,
          assigned_by_user_id: userAProfile.id,
        });

        // Set status to paused
        await admin
          .from('group_memberships')
          .update({ status: 'paused' })
          .eq('group_id', testGroup.id)
          .eq('user_id', userF.profile.id);

        const { data, error } = await admin.rpc('has_permission', {
          p_user_id: userF.profile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'view_member_list',
        });

        expect(error).toBeNull();
        expect(data).toBe(false);
      } finally {
        await cleanupTestUser(userF.user.id);
      }
    });
  });
});
