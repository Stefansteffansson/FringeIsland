/**
 * Integration Tests: RBAC - Role Renaming in Existing Groups
 *
 * Tests: B-RBAC-007: Role Renaming (Steward/Guide Terminology) — group_roles side
 *
 * Verifies that existing group_roles have been renamed from
 * "Group Leader" → "Steward" and "Travel Guide" → "Guide".
 * Also verifies that RLS helper functions and triggers are updated.
 *
 * Template renaming is covered in role-templates.test.ts.
 *
 * These tests MUST FAIL initially (RED) — roles haven't been renamed yet.
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

describe('B-RBAC-007: Role Renaming in Existing Groups', () => {
  const admin = createAdminClient();
  let steward: any;
  let member: any;
  let testGroupId: string;
  let stewardRoleId: string;
  let stewardTemplateId: string;

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'RBAC Rename - Steward' });
    member = await createTestUser({ displayName: 'RBAC Rename - Member' });

    // Look up the Steward template ID (trigger checks template, not name)
    const { data: template } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();
    stewardTemplateId = template!.id;

    // Create test group
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'RBAC Rename Test Group',
        created_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    if (group) {
      testGroupId = group.id;

      // Add steward as active member
      await admin.from('group_memberships').insert({
        group_id: testGroupId,
        member_group_id: steward.personalGroupId,
        added_by_group_id: steward.personalGroupId,
        status: 'active',
      });

      // Add member as active member
      await admin.from('group_memberships').insert({
        group_id: testGroupId,
        member_group_id: member.personalGroupId,
        added_by_group_id: steward.personalGroupId,
        status: 'active',
      });

      // Create Steward role (new name, linked to template for trigger)
      const { data: role } = await admin
        .from('group_roles')
        .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplateId })
        .select()
        .single();

      if (role) {
        stewardRoleId = role.id;

        // Assign steward role
        await admin.from('user_group_roles').insert({
          group_id: testGroupId,
          member_group_id: steward.personalGroupId,
          group_role_id: stewardRoleId,
          assigned_by_group_id: steward.personalGroupId,
        });
      }
    }
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (steward) await cleanupTestUser(steward.user.id);
    if (member) await cleanupTestUser(member.user.id);
  });

  it('should have no group_roles named "Group Leader" in any group', async () => {
    const { data } = await admin
      .from('group_roles')
      .select('id')
      .eq('name', 'Group Leader');

    expect(data).toHaveLength(0);
  });

  it('should have no group_roles named "Travel Guide" in any group', async () => {
    const { data } = await admin
      .from('group_roles')
      .select('id')
      .eq('name', 'Travel Guide');

    expect(data).toHaveLength(0);
  });

  it('should have Steward roles where Group Leader roles used to be', async () => {
    // At minimum, test group should have a Steward role
    const { data } = await admin
      .from('group_roles')
      .select('id, name')
      .eq('group_id', testGroupId)
      .eq('name', 'Steward');

    expect(data).toHaveLength(1);
  });

  it('should still protect the last Steward (like last Group Leader)', async () => {
    if (!stewardRoleId) {
      expect(stewardRoleId).toBeDefined();
      return;
    }

    // Find the user_group_role assignment for the steward
    const { data: assignment } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .eq('member_group_id', steward.personalGroupId)
      .eq('group_role_id', stewardRoleId)
      .single();

    if (!assignment) {
      expect(assignment).not.toBeNull();
      return;
    }

    // Try to remove the last Steward — should be blocked by trigger
    const { error } = await admin
      .from('user_group_roles')
      .delete()
      .eq('id', assignment.id);

    // Should fail with last-leader/last-steward protection
    expect(error).not.toBeNull();
  });

  it('should have updated RLS helper function to check Steward role', async () => {
    // The is_active_group_leader() or equivalent function should now check for 'Steward'
    // We test this by verifying that a user with the 'Steward' role can perform leader actions

    const stewardClient = createTestClient();
    await signInWithRetry(stewardClient, steward.email, steward.password);

    // Steward should be able to assign roles (this tests that RLS recognizes the Steward role)
    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member' })
      .select()
      .single();

    if (!memberRole) return;

    const { error } = await stewardClient
      .from('user_group_roles')
      .insert({
        group_id: testGroupId,
        member_group_id: member.personalGroupId,
        group_role_id: memberRole.id,
        assigned_by_group_id: steward.personalGroupId,
      });

    // Should succeed — Steward has permission to assign roles
    expect(error).toBeNull();
  });
});
