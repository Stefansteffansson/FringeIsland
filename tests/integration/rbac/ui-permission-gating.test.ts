/**
 * Integration Tests: RBAC UI Permission Gating
 *
 * Covers:
 * - B-RBAC-013: Group Detail Page — permission-gated actions
 * - B-RBAC-014: Edit Group Page — permission-gated access
 * - B-RBAC-015: Forum Moderation — permission-gated delete
 * - B-RBAC-016: Enrollment Modal — permission-based group enrollment
 * - B-RBAC-017: No remaining isLeader checks (verified by grep, not this test)
 *
 * These tests verify that the permission system correctly gates
 * each UI action at the database/RPC level. The UI components
 * will use usePermissions() + hasPermission() which ultimately
 * call get_user_permissions() — tested here.
 *
 * EXPECTED STATE: Should PASS (infrastructure from Sub-Sprint 1+2 exists)
 * The UI code hasn't been migrated yet, but the permission data is correct.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  createAdminClient,
  cleanupTestGroup,
} from '@/tests/helpers/supabase';

describe('RBAC UI Permission Gating', () => {
  const admin = createAdminClient();

  // Test users with different roles
  let stewardUser: any;   // Steward role (all management perms)
  let guideUser: any;     // Guide role (facilitation perms)
  let memberUser: any;    // Member role (participation perms)
  let observerUser: any;  // Observer role (view-only perms)

  let stewardProfile: any;
  let guideProfile: any;
  let memberProfile: any;
  let observerProfile: any;

  // Test group + roles
  let testGroup: any;
  let stewardRole: any;
  let guideRole: any;
  let memberRole: any;
  let observerRole: any;

  // Second group for enrollment tests
  let secondGroup: any;
  let secondGroupMemberRole: any;

  beforeAll(async () => {
    // Create four test users
    stewardUser = await createTestUser({ displayName: 'UIGate Steward' });
    guideUser = await createTestUser({ displayName: 'UIGate Guide' });
    memberUser = await createTestUser({ displayName: 'UIGate Member' });
    observerUser = await createTestUser({ displayName: 'UIGate Observer' });

    stewardProfile = stewardUser.profile;
    guideProfile = guideUser.profile;
    memberProfile = memberUser.profile;
    observerProfile = observerUser.profile;

    // Create test engagement group
    const { data: group, error: groupErr } = await admin
      .from('groups')
      .insert({
        name: 'UI Gating Test Group',
        description: 'Testing UI permission gating',
        group_type: 'engagement',
        created_by_user_id: stewardProfile.id,
      })
      .select()
      .single();

    if (groupErr) throw new Error(`Failed to create group: ${groupErr.message}`);
    testGroup = group;

    // Add all users as active members
    await admin.from('group_memberships').insert([
      { group_id: testGroup.id, user_id: stewardProfile.id, added_by_user_id: stewardProfile.id, status: 'active' },
      { group_id: testGroup.id, user_id: guideProfile.id, added_by_user_id: stewardProfile.id, status: 'active' },
      { group_id: testGroup.id, user_id: memberProfile.id, added_by_user_id: stewardProfile.id, status: 'active' },
      { group_id: testGroup.id, user_id: observerProfile.id, added_by_user_id: stewardProfile.id, status: 'active' },
    ]);

    // Get role templates
    const { data: templates } = await admin
      .from('role_templates')
      .select('id, name')
      .in('name', ['Steward Role Template', 'Guide Role Template', 'Member Role Template', 'Observer Role Template']);

    const templateMap = new Map(templates!.map((t: any) => [t.name, t.id]));

    // Create group roles from templates (triggers copy_template_permissions)
    const roleInserts = [
      { group_id: testGroup.id, name: 'Steward', created_from_role_template_id: templateMap.get('Steward Role Template') },
      { group_id: testGroup.id, name: 'Guide', created_from_role_template_id: templateMap.get('Guide Role Template') },
      { group_id: testGroup.id, name: 'Member', created_from_role_template_id: templateMap.get('Member Role Template') },
      { group_id: testGroup.id, name: 'Observer', created_from_role_template_id: templateMap.get('Observer Role Template') },
    ];

    const { data: roles } = await admin
      .from('group_roles')
      .insert(roleInserts)
      .select();

    const roleMap = new Map(roles!.map((r: any) => [r.name, r]));
    stewardRole = roleMap.get('Steward');
    guideRole = roleMap.get('Guide');
    memberRole = roleMap.get('Member');
    observerRole = roleMap.get('Observer');

    // Assign roles to users
    await admin.from('user_group_roles').insert([
      { user_id: stewardProfile.id, group_id: testGroup.id, group_role_id: stewardRole.id, assigned_by_user_id: stewardProfile.id },
      { user_id: guideProfile.id, group_id: testGroup.id, group_role_id: guideRole.id, assigned_by_user_id: stewardProfile.id },
      { user_id: memberProfile.id, group_id: testGroup.id, group_role_id: memberRole.id, assigned_by_user_id: stewardProfile.id },
      { user_id: observerProfile.id, group_id: testGroup.id, group_role_id: observerRole.id, assigned_by_user_id: stewardProfile.id },
    ]);

    // Create second group where steward is also Steward (for enrollment tests)
    const { data: group2 } = await admin
      .from('groups')
      .insert({
        name: 'UI Gating Second Group',
        description: 'Second group for enrollment tests',
        group_type: 'engagement',
        created_by_user_id: stewardProfile.id,
      })
      .select()
      .single();

    secondGroup = group2;

    await admin.from('group_memberships').insert([
      { group_id: secondGroup.id, user_id: stewardProfile.id, added_by_user_id: stewardProfile.id, status: 'active' },
      { group_id: secondGroup.id, user_id: memberProfile.id, added_by_user_id: stewardProfile.id, status: 'active' },
    ]);

    // Create roles in second group
    const { data: secondRoles } = await admin
      .from('group_roles')
      .insert([
        { group_id: secondGroup.id, name: 'Steward', created_from_role_template_id: templateMap.get('Steward Role Template') },
        { group_id: secondGroup.id, name: 'Member', created_from_role_template_id: templateMap.get('Member Role Template') },
      ])
      .select();

    const secondRoleMap = new Map(secondRoles!.map((r: any) => [r.name, r]));
    secondGroupMemberRole = secondRoleMap.get('Member');

    await admin.from('user_group_roles').insert([
      { user_id: stewardProfile.id, group_id: secondGroup.id, group_role_id: secondRoleMap.get('Steward')!.id, assigned_by_user_id: stewardProfile.id },
      { user_id: memberProfile.id, group_id: secondGroup.id, group_role_id: secondGroupMemberRole.id, assigned_by_user_id: stewardProfile.id },
    ]);
  }, 60000);

  afterAll(async () => {
    if (secondGroup) await cleanupTestGroup(secondGroup.id);
    if (testGroup) await cleanupTestGroup(testGroup.id);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (guideUser) await cleanupTestUser(guideUser.user.id);
    if (memberUser) await cleanupTestUser(memberUser.user.id);
    if (observerUser) await cleanupTestUser(observerUser.user.id);
  }, 30000);

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-013: Group Detail Page — Permission-Gated Actions
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-013: Group Detail Page — Permission-Gated Actions', () => {
    // Edit Group button: hasPermission('edit_group_settings')
    describe('edit_group_settings permission', () => {
      it('Steward has edit_group_settings', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: stewardProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'edit_group_settings',
        });
        expect(data).toBe(true);
      });

      it('Guide does NOT have edit_group_settings', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: guideProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'edit_group_settings',
        });
        expect(data).toBe(false);
      });

      it('Member does NOT have edit_group_settings', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: memberProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'edit_group_settings',
        });
        expect(data).toBe(false);
      });

      it('Observer does NOT have edit_group_settings', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: observerProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'edit_group_settings',
        });
        expect(data).toBe(false);
      });
    });

    // Invite Member button: hasPermission('invite_members')
    describe('invite_members permission', () => {
      it('Steward has invite_members', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: stewardProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'invite_members',
        });
        expect(data).toBe(true);
      });

      it('Guide does NOT have invite_members', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: guideProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'invite_members',
        });
        expect(data).toBe(false);
      });

      it('Member does NOT have invite_members', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: memberProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'invite_members',
        });
        expect(data).toBe(false);
      });
    });

    // Remove Member button: hasPermission('remove_members')
    describe('remove_members permission', () => {
      it('Steward has remove_members', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: stewardProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'remove_members',
        });
        expect(data).toBe(true);
      });

      it('Guide does NOT have remove_members', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: guideProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'remove_members',
        });
        expect(data).toBe(false);
      });
    });

    // Assign Role button: hasPermission('assign_roles')
    describe('assign_roles permission', () => {
      it('Steward has assign_roles', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: stewardProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'assign_roles',
        });
        expect(data).toBe(true);
      });

      it('Guide does NOT have assign_roles', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: guideProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'assign_roles',
        });
        expect(data).toBe(false);
      });

      it('Member does NOT have assign_roles', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: memberProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'assign_roles',
        });
        expect(data).toBe(false);
      });
    });

    // Remove Role button: hasPermission('remove_roles')
    describe('remove_roles permission', () => {
      it('Steward has remove_roles', async () => {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: stewardProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'remove_roles',
        });
        expect(data).toBe(true);
      });

      it('Non-steward roles do NOT have remove_roles', async () => {
        const { data: guideData } = await admin.rpc('has_permission', {
          p_user_id: guideProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'remove_roles',
        });
        const { data: memberData } = await admin.rpc('has_permission', {
          p_user_id: memberProfile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'remove_roles',
        });
        expect(guideData).toBe(false);
        expect(memberData).toBe(false);
      });
    });

    // Member list visibility: show_member_list OR hasPermission('view_member_list')
    describe('view_member_list permission', () => {
      it('all four roles have view_member_list', async () => {
        for (const profile of [stewardProfile, guideProfile, memberProfile, observerProfile]) {
          const { data } = await admin.rpc('has_permission', {
            p_user_id: profile.id,
            p_group_id: testGroup.id,
            p_permission_name: 'view_member_list',
          });
          expect(data).toBe(true);
        }
      });
    });

    // get_user_permissions returns the full permission set
    describe('get_user_permissions returns correct sets', () => {
      it('Steward gets 24+ permissions (Tier 2) plus Tier 1', async () => {
        const { data } = await admin.rpc('get_user_permissions', {
          p_user_id: stewardProfile.id,
          p_group_id: testGroup.id,
        });

        expect(data).toContain('edit_group_settings');
        expect(data).toContain('invite_members');
        expect(data).toContain('remove_members');
        expect(data).toContain('assign_roles');
        expect(data).toContain('remove_roles');
        expect(data).toContain('delete_group');
        expect(data).toContain('moderate_forum');
        expect(data).toContain('enroll_group_in_journey');
        // Also has Tier 1 (FI Members) permissions
        expect(data).toContain('create_group');
        expect(data).toContain('browse_journey_catalog');
      });

      it('Member gets 12 permissions (Tier 2) plus Tier 1', async () => {
        const { data } = await admin.rpc('get_user_permissions', {
          p_user_id: memberProfile.id,
          p_group_id: testGroup.id,
        });

        expect(data).toContain('view_member_list');
        expect(data).toContain('view_journey_content');
        expect(data).toContain('post_forum_messages');
        // Should NOT have management permissions
        expect(data).not.toContain('edit_group_settings');
        expect(data).not.toContain('invite_members');
        expect(data).not.toContain('moderate_forum');
        expect(data).not.toContain('enroll_group_in_journey');
      });

      it('Observer gets 7 permissions (Tier 2) plus Tier 1', async () => {
        const { data } = await admin.rpc('get_user_permissions', {
          p_user_id: observerProfile.id,
          p_group_id: testGroup.id,
        });

        expect(data).toContain('view_member_list');
        expect(data).toContain('view_forum');
        expect(data).toContain('view_journey_content');
        // Should NOT have post/edit/management permissions
        expect(data).not.toContain('post_forum_messages');
        expect(data).not.toContain('edit_group_settings');
        expect(data).not.toContain('moderate_forum');
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-014: Edit Group Page — Permission-Gated Access
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-014: Edit Group Page — Permission-Gated Access', () => {
    it('Steward has edit_group_settings (can access edit page)', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: stewardProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'edit_group_settings',
      });
      expect(data).toBe(true);
    });

    it('Steward has delete_group (can see Danger Zone)', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: stewardProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'delete_group',
      });
      expect(data).toBe(true);
    });

    it('Member does NOT have edit_group_settings (denied access)', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: memberProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'edit_group_settings',
      });
      expect(data).toBe(false);
    });

    it('Guide does NOT have delete_group', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: guideProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'delete_group',
      });
      expect(data).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-015: Forum Moderation — Permission-Gated Delete
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-015: Forum Moderation — Permission-Gated Delete', () => {
    it('Steward has moderate_forum (can delete others posts)', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: stewardProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'moderate_forum',
      });
      expect(data).toBe(true);
    });

    it('Guide does NOT have moderate_forum', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: guideProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'moderate_forum',
      });
      expect(data).toBe(false);
    });

    it('Member does NOT have moderate_forum', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: memberProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'moderate_forum',
      });
      expect(data).toBe(false);
    });

    it('Observer does NOT have moderate_forum', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: observerProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'moderate_forum',
      });
      expect(data).toBe(false);
    });

    // Posting permissions (Members can post, Observers cannot)
    it('Member has post_forum_messages', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: memberProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'post_forum_messages',
      });
      expect(data).toBe(true);
    });

    it('Observer does NOT have post_forum_messages', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: observerProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'post_forum_messages',
      });
      expect(data).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // B-RBAC-016: Enrollment Modal — Permission-Based Group Enrollment
  // ──────────────────────────────────────────────────────────────────

  describe('B-RBAC-016: Enrollment Modal — Permission-Based Group Enrollment', () => {
    it('Steward has enroll_group_in_journey in both groups', async () => {
      const { data: group1 } = await admin.rpc('has_permission', {
        p_user_id: stewardProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'enroll_group_in_journey',
      });
      const { data: group2 } = await admin.rpc('has_permission', {
        p_user_id: stewardProfile.id,
        p_group_id: secondGroup.id,
        p_permission_name: 'enroll_group_in_journey',
      });
      expect(group1).toBe(true);
      expect(group2).toBe(true);
    });

    it('Member does NOT have enroll_group_in_journey', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: memberProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'enroll_group_in_journey',
      });
      expect(data).toBe(false);
    });

    it('Member does NOT have enroll_group_in_journey in second group either', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: memberProfile.id,
        p_group_id: secondGroup.id,
        p_permission_name: 'enroll_group_in_journey',
      });
      expect(data).toBe(false);
    });

    it('Guide does NOT have enroll_group_in_journey', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: guideProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'enroll_group_in_journey',
      });
      expect(data).toBe(false);
    });

    it('Observer does NOT have enroll_group_in_journey', async () => {
      const { data } = await admin.rpc('has_permission', {
        p_user_id: observerProfile.id,
        p_group_id: testGroup.id,
        p_permission_name: 'enroll_group_in_journey',
      });
      expect(data).toBe(false);
    });

    // enroll_self_in_journey comes from FI Members (Tier 1)
    it('all users have enroll_self_in_journey via FI Members (Tier 1)', async () => {
      for (const profile of [stewardProfile, guideProfile, memberProfile, observerProfile]) {
        const { data } = await admin.rpc('has_permission', {
          p_user_id: profile.id,
          p_group_id: testGroup.id,
          p_permission_name: 'enroll_self_in_journey',
        });
        expect(data).toBe(true);
      }
    });
  });
});
