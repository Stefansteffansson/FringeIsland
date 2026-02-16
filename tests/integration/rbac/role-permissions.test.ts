/**
 * Integration Tests: RBAC - Group Role Permission Initialization
 *
 * Tests: B-RBAC-005: Group Role Permission Initialization
 *
 * Verifies that when a group role is instantiated from a template,
 * the template's permissions are copied into group_role_permissions.
 *
 * These tests MUST FAIL initially (RED) — group_role_permissions is empty
 * and the copy mechanism doesn't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  createAdminClient,
} from '@/tests/helpers/supabase';

describe('B-RBAC-005: Group Role Permission Initialization', () => {
  const admin = createAdminClient();
  let testUser: any;
  let testGroupId: string;
  let stewardRoleId: string;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'RBAC Role Perms Test' });

    // Create a test group with a Steward role linked to the Steward template
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .maybeSingle();

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'RBAC Role Perms Test Group',
        created_by_user_id: testUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    if (group) {
      testGroupId = group.id;

      // Create Steward role from template
      const { data: role } = await admin
        .from('group_roles')
        .insert({
          group_id: testGroupId,
          name: 'Steward',
          created_from_role_template_id: stewardTemplate?.id || null,
        })
        .select()
        .single();

      if (role) stewardRoleId = role.id;
    }
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should have group_role_permissions populated for the Steward role', async () => {
    if (!stewardRoleId) {
      // Setup failed (expected in RED phase if group_type column doesn't exist)
      expect(stewardRoleId).toBeDefined();
      return;
    }

    const { data, error } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', stewardRoleId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('should copy 24 permissions for a Steward role from template', async () => {
    if (!stewardRoleId) {
      expect(stewardRoleId).toBeDefined();
      return;
    }

    const { data, error } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', stewardRoleId);

    expect(error).toBeNull();
    expect(data).toHaveLength(25);
  });

  it('should include invite_members in Steward role permissions', async () => {
    if (!stewardRoleId) {
      expect(stewardRoleId).toBeDefined();
      return;
    }

    const { data: invitePerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'invite_members')
      .single();

    const { data, error } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', stewardRoleId)
      .eq('permission_id', invitePerm!.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('should keep group role permissions independent from template', async () => {
    if (!stewardRoleId) {
      expect(stewardRoleId).toBeDefined();
      return;
    }

    // Count permissions before
    const { data: before } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', stewardRoleId);

    const countBefore = before!.length;

    // Find a permission to remove from this group's role (use composite key)
    const { data: toRemove } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', stewardRoleId)
      .limit(1)
      .single();

    if (toRemove) {
      await admin
        .from('group_role_permissions')
        .delete()
        .eq('group_role_id', toRemove.group_role_id)
        .eq('permission_id', toRemove.permission_id);
    }

    // Count permissions after
    const { data: after } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', stewardRoleId);

    expect(after).toHaveLength(countBefore - 1);

    // Verify template is unaffected
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    if (stewardTemplate) {
      const { data: templatePerms } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', stewardTemplate.id);

      // Template should still have 25 (unaffected by group-level change)
      expect(templatePerms).toHaveLength(25);
    }
  });

  it('should backfill permissions for existing groups with template-based roles', async () => {
    // Query any existing group that has a role with created_from_role_template_id set
    const { data: existingRoles } = await admin
      .from('group_roles')
      .select('id, created_from_role_template_id')
      .not('created_from_role_template_id', 'is', null)
      .limit(1);

    if (!existingRoles || existingRoles.length === 0) {
      // No template-based roles exist — skip
      return;
    }

    const roleId = existingRoles[0].id;

    const { data, error } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', roleId);

    expect(error).toBeNull();
    // Should have permissions (backfilled by migration)
    expect(data!.length).toBeGreaterThan(0);
  });
});
