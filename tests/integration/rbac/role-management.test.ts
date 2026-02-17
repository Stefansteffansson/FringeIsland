/**
 * Integration Tests: RBAC - Role Management (Sub-Sprint 4)
 *
 * Tests: B-RBAC-018 through B-RBAC-025
 *
 * Covers: manage_roles permission, role CRUD (create/read/edit/delete),
 * permission picker data, anti-escalation guardrail, RLS policies.
 *
 * These tests MUST FAIL initially (RED) — the manage_roles permission,
 * RLS policy updates, and role management UI don't exist yet.
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

// ============================================================================
// B-RBAC-018: manage_roles Permission Exists in Catalog
// ============================================================================

describe('B-RBAC-018: manage_roles Permission in Catalog', () => {
  const admin = createAdminClient();

  it('should have manage_roles permission in the catalog', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('id, name, category, description')
      .eq('name', 'manage_roles');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].category).toBe('group_management');
    expect(data![0].description).toBeTruthy();
  });

  it('should have 42 total permissions after adding manage_roles', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(42);
  });

  it('should have 15 group_management permissions (was 14)', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'group_management');

    expect(error).toBeNull();
    expect(data).toHaveLength(15);
  });

  it('should include manage_roles in Steward role template', async () => {
    const { data: template } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    expect(template).not.toBeNull();

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'manage_roles')
      .single();

    expect(perm).not.toBeNull();

    const { data: mapping } = await admin
      .from('role_template_permissions')
      .select('role_template_id, permission_id')
      .eq('role_template_id', template!.id)
      .eq('permission_id', perm!.id);

    expect(mapping).toHaveLength(1);
  });

  it('should have Steward template with 25 permissions (was 24)', async () => {
    const { data: template } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: mappings } = await admin
      .from('role_template_permissions')
      .select('permission_id')
      .eq('role_template_id', template!.id);

    expect(mappings).toHaveLength(25);
  });

  it('should NOT include manage_roles in Guide template', async () => {
    const { data: template } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Guide Role Template')
      .single();

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'manage_roles')
      .single();

    if (!template || !perm) {
      expect(template).not.toBeNull();
      return;
    }

    const { data: mapping } = await admin
      .from('role_template_permissions')
      .select('role_template_id, permission_id')
      .eq('role_template_id', template.id)
      .eq('permission_id', perm.id);

    expect(mapping).toHaveLength(0);
  });

  it('should backfill manage_roles to existing Steward role instances', async () => {
    // Find any existing Steward role in an engagement group
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    if (!stewardTemplate) {
      expect(stewardTemplate).not.toBeNull();
      return;
    }

    const { data: existingRoles } = await admin
      .from('group_roles')
      .select('id')
      .eq('created_from_role_template_id', stewardTemplate.id)
      .limit(1);

    if (!existingRoles || existingRoles.length === 0) return; // No existing roles to check

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'manage_roles')
      .single();

    const { data: mapping } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', existingRoles[0].id)
      .eq('permission_id', perm!.id);

    expect(mapping).toHaveLength(1);
  });

  it('should include manage_roles in Deusex role', async () => {
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) {
      expect(deusexGroup).not.toBeNull();
      return;
    }

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroup.id)
      .eq('name', 'DeusEx')
      .single();

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'manage_roles')
      .single();

    const { data: mapping } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', deusexRole!.id)
      .eq('permission_id', perm!.id);

    expect(mapping).toHaveLength(1);
  });
});

// ============================================================================
// B-RBAC-019: View Roles in Group
// ============================================================================

describe('B-RBAC-019: View Roles in Group', () => {
  const admin = createAdminClient();
  let stewardUser: any;
  let memberUser: any;
  let stewardClient: ReturnType<typeof createTestClient>;
  let memberClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;

  beforeAll(async () => {
    stewardUser = await createTestUser({ displayName: 'Role View Steward' });
    memberUser = await createTestUser({ displayName: 'Role View Member' });
    stewardClient = createTestClient();
    memberClient = createTestClient();

    // Create a group and set up roles
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Role View Test Group',
        created_by_user_id: stewardUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    testGroupId = group!.id;

    // Add memberships
    await admin.from('group_memberships').insert([
      { group_id: testGroupId, user_id: stewardUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
      { group_id: testGroupId, user_id: memberUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
    ]);

    // Get Steward template and assign role
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

    // Create roles from templates
    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplate?.id })
      .select()
      .single();

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member', created_from_role_template_id: memberTemplate?.id })
      .select()
      .single();

    // Assign roles
    await admin.from('user_group_roles').insert([
      { user_id: stewardUser.profile.id, group_id: testGroupId, group_role_id: stewardRole!.id, assigned_by_user_id: stewardUser.profile.id },
      { user_id: memberUser.profile.id, group_id: testGroupId, group_role_id: memberRole!.id, assigned_by_user_id: stewardUser.profile.id },
    ]);

    await signInWithRetry(stewardClient, stewardUser.email, stewardUser.password);
    await signInWithRetry(memberClient, memberUser.email, memberUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (memberUser) await cleanupTestUser(memberUser.user.id);
  });

  it('should allow any active member to view roles in their group', async () => {
    const { data, error } = await memberClient
      .from('group_roles')
      .select('id, name, created_from_role_template_id')
      .eq('group_id', testGroupId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2);
  });

  it('should show permission count per role via admin query', async () => {
    const { data: roles } = await admin
      .from('group_roles')
      .select('id, name')
      .eq('group_id', testGroupId);

    expect(roles).not.toBeNull();

    for (const role of roles!) {
      const { data: perms } = await admin
        .from('group_role_permissions')
        .select('permission_id')
        .eq('group_role_id', role.id);

      // Each role should have permissions (from template copy)
      expect(perms!.length).toBeGreaterThan(0);
    }
  });

  it('should indicate which roles are template-originated vs custom', async () => {
    const { data: roles } = await admin
      .from('group_roles')
      .select('id, name, created_from_role_template_id')
      .eq('group_id', testGroupId);

    const templateRoles = roles!.filter(r => r.created_from_role_template_id !== null);
    expect(templateRoles.length).toBeGreaterThanOrEqual(2); // Steward + Member at minimum
  });
});

// ============================================================================
// B-RBAC-020: Create Custom Role
// ============================================================================

describe('B-RBAC-020: Create Custom Role', () => {
  const admin = createAdminClient();
  let stewardUser: any;
  let memberUser: any;
  let stewardClient: ReturnType<typeof createTestClient>;
  let memberClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;
  let stewardRoleId: string;

  beforeAll(async () => {
    stewardUser = await createTestUser({ displayName: 'Create Role Steward' });
    memberUser = await createTestUser({ displayName: 'Create Role Member' });
    stewardClient = createTestClient();
    memberClient = createTestClient();

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Create Role Test Group',
        created_by_user_id: stewardUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    testGroupId = group!.id;

    await admin.from('group_memberships').insert([
      { group_id: testGroupId, user_id: stewardUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
      { group_id: testGroupId, user_id: memberUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
    ]);

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

    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplate?.id })
      .select()
      .single();

    stewardRoleId = stewardRole!.id;

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member', created_from_role_template_id: memberTemplate?.id })
      .select()
      .single();

    await admin.from('user_group_roles').insert([
      { user_id: stewardUser.profile.id, group_id: testGroupId, group_role_id: stewardRoleId, assigned_by_user_id: stewardUser.profile.id },
      { user_id: memberUser.profile.id, group_id: testGroupId, group_role_id: memberRole!.id, assigned_by_user_id: stewardUser.profile.id },
    ]);

    await signInWithRetry(stewardClient, stewardUser.email, stewardUser.password);
    await signInWithRetry(memberClient, memberUser.email, memberUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (memberUser) await cleanupTestUser(memberUser.user.id);
  });

  it('should allow steward to create a custom role via RLS', async () => {
    const { data, error } = await stewardClient
      .from('group_roles')
      .insert({
        group_id: testGroupId,
        name: 'Mentor',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.name).toBe('Mentor');
    expect(data!.created_from_role_template_id).toBeNull(); // Custom role
  });

  it('should block member from creating a role via RLS', async () => {
    const { error } = await memberClient
      .from('group_roles')
      .insert({
        group_id: testGroupId,
        name: 'Unauthorized Role',
      });

    expect(error).not.toBeNull();
  });

  it('should enforce unique role names within a group', async () => {
    // First create should succeed (or already exists from previous test)
    await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Unique Test Role' });

    // Second create with same name should fail
    const { error } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Unique Test Role' });

    expect(error).not.toBeNull();
  });

  it('should allow creating a role with zero permissions', async () => {
    const { data: role, error } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Empty Role' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(role).not.toBeNull();

    // Verify no permissions
    const { data: perms } = await admin
      .from('group_role_permissions')
      .select('permission_id')
      .eq('group_role_id', role!.id);

    expect(perms).toHaveLength(0);
  });

  it('should allow adding permissions to a custom role', async () => {
    // Create custom role
    const { data: role } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Custom With Perms' })
      .select()
      .single();

    // Get a permission to add
    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'view_others_progress')
      .single();

    // Add permission to role
    const { error } = await admin
      .from('group_role_permissions')
      .insert({
        group_role_id: role!.id,
        permission_id: perm!.id,
      });

    expect(error).toBeNull();

    // Verify
    const { data: rolePerms } = await admin
      .from('group_role_permissions')
      .select('permission_id')
      .eq('group_role_id', role!.id);

    expect(rolePerms).toHaveLength(1);
  });
});

// ============================================================================
// B-RBAC-021: Edit Role (Name, Description, Permissions)
// ============================================================================

describe('B-RBAC-021: Edit Role', () => {
  const admin = createAdminClient();
  let stewardUser: any;
  let memberUser: any;
  let stewardClient: ReturnType<typeof createTestClient>;
  let memberClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;
  let customRoleId: string;

  beforeAll(async () => {
    stewardUser = await createTestUser({ displayName: 'Edit Role Steward' });
    memberUser = await createTestUser({ displayName: 'Edit Role Member' });
    stewardClient = createTestClient();
    memberClient = createTestClient();

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Edit Role Test Group',
        created_by_user_id: stewardUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    testGroupId = group!.id;

    await admin.from('group_memberships').insert([
      { group_id: testGroupId, user_id: stewardUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
      { group_id: testGroupId, user_id: memberUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
    ]);

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

    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplate?.id })
      .select()
      .single();

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member', created_from_role_template_id: memberTemplate?.id })
      .select()
      .single();

    // Create a custom role to edit
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Editable Role' })
      .select()
      .single();

    customRoleId = customRole!.id;

    await admin.from('user_group_roles').insert([
      { user_id: stewardUser.profile.id, group_id: testGroupId, group_role_id: stewardRole!.id, assigned_by_user_id: stewardUser.profile.id },
      { user_id: memberUser.profile.id, group_id: testGroupId, group_role_id: memberRole!.id, assigned_by_user_id: stewardUser.profile.id },
    ]);

    await signInWithRetry(stewardClient, stewardUser.email, stewardUser.password);
    await signInWithRetry(memberClient, memberUser.email, memberUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (memberUser) await cleanupTestUser(memberUser.user.id);
  });

  it('should allow steward to rename a role via RLS', async () => {
    const { data, error } = await stewardClient
      .from('group_roles')
      .update({ name: 'Renamed Role' })
      .eq('id', customRoleId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.name).toBe('Renamed Role');

    // Rename back for later tests
    await admin
      .from('group_roles')
      .update({ name: 'Editable Role' })
      .eq('id', customRoleId);
  });

  it('should block member from editing a role via RLS', async () => {
    const { error } = await memberClient
      .from('group_roles')
      .update({ name: 'Hacked Role' })
      .eq('id', customRoleId);

    // Should either error or return 0 rows affected
    // (RLS blocks the operation — behavior depends on policy type)
    if (!error) {
      // Verify the name didn't actually change
      const { data } = await admin
        .from('group_roles')
        .select('name')
        .eq('id', customRoleId)
        .single();

      expect(data!.name).toBe('Editable Role');
    }
  });

  it('should allow steward to add permissions to a role', async () => {
    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'view_forum')
      .single();

    const { error } = await stewardClient
      .from('group_role_permissions')
      .insert({
        group_role_id: customRoleId,
        permission_id: perm!.id,
      });

    expect(error).toBeNull();
  });

  it('should allow steward to remove permissions from a role', async () => {
    // First add a permission via admin
    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'post_forum_messages')
      .single();

    await admin.from('group_role_permissions').insert({
      group_role_id: customRoleId,
      permission_id: perm!.id,
    });

    // Now steward removes it
    const { error } = await stewardClient
      .from('group_role_permissions')
      .delete()
      .eq('group_role_id', customRoleId)
      .eq('permission_id', perm!.id);

    expect(error).toBeNull();
  });

  it('should block member from adding permissions to a role', async () => {
    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'moderate_forum')
      .single();

    const { error } = await memberClient
      .from('group_role_permissions')
      .insert({
        group_role_id: customRoleId,
        permission_id: perm!.id,
      });

    expect(error).not.toBeNull();
  });

  it('should not affect template when editing a group role', async () => {
    // Get a template-based role in the group
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: groupStewardRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .eq('name', 'Steward')
      .single();

    // Count template permissions before
    const { data: templatePermsBefore } = await admin
      .from('role_template_permissions')
      .select('permission_id')
      .eq('role_template_id', stewardTemplate!.id);

    const templateCount = templatePermsBefore!.length;

    // Remove a permission from the group's Steward role
    const { data: toRemove } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', groupStewardRole!.id)
      .limit(1)
      .single();

    if (toRemove) {
      await admin
        .from('group_role_permissions')
        .delete()
        .eq('group_role_id', toRemove.group_role_id)
        .eq('permission_id', toRemove.permission_id);
    }

    // Verify template is unaffected
    const { data: templatePermsAfter } = await admin
      .from('role_template_permissions')
      .select('permission_id')
      .eq('role_template_id', stewardTemplate!.id);

    expect(templatePermsAfter).toHaveLength(templateCount);
  });

  it('should still block last steward removal after renaming Steward role', async () => {
    // This tests Task #3: trigger should check template ID, not name
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: groupStewardRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .eq('created_from_role_template_id', stewardTemplate!.id)
      .single();

    // Rename the Steward role to something else
    await admin
      .from('group_roles')
      .update({ name: 'Group Admin' })
      .eq('id', groupStewardRole!.id);

    // Now try to remove the last "Group Admin" (formerly Steward) user's role
    const { data: stewardAssignment } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .eq('group_role_id', groupStewardRole!.id)
      .single();

    if (stewardAssignment) {
      const { error } = await admin
        .from('user_group_roles')
        .delete()
        .eq('id', stewardAssignment.id);

      // Should be blocked by trigger even though role name is no longer "Steward"
      expect(error).not.toBeNull();
      expect(error!.message).toContain('last');
    }

    // Restore the name for other tests
    await admin
      .from('group_roles')
      .update({ name: 'Steward' })
      .eq('id', groupStewardRole!.id);
  });
});

// ============================================================================
// B-RBAC-022: Delete Custom Role
// ============================================================================

describe('B-RBAC-022: Delete Custom Role', () => {
  const admin = createAdminClient();
  let stewardUser: any;
  let memberUser: any;
  let stewardClient: ReturnType<typeof createTestClient>;
  let memberClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;

  beforeAll(async () => {
    stewardUser = await createTestUser({ displayName: 'Delete Role Steward' });
    memberUser = await createTestUser({ displayName: 'Delete Role Member' });
    stewardClient = createTestClient();
    memberClient = createTestClient();

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Delete Role Test Group',
        created_by_user_id: stewardUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    testGroupId = group!.id;

    await admin.from('group_memberships').insert([
      { group_id: testGroupId, user_id: stewardUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
      { group_id: testGroupId, user_id: memberUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
    ]);

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

    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplate?.id })
      .select()
      .single();

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member', created_from_role_template_id: memberTemplate?.id })
      .select()
      .single();

    await admin.from('user_group_roles').insert([
      { user_id: stewardUser.profile.id, group_id: testGroupId, group_role_id: stewardRole!.id, assigned_by_user_id: stewardUser.profile.id },
      { user_id: memberUser.profile.id, group_id: testGroupId, group_role_id: memberRole!.id, assigned_by_user_id: stewardUser.profile.id },
    ]);

    await signInWithRetry(stewardClient, stewardUser.email, stewardUser.password);
    await signInWithRetry(memberClient, memberUser.email, memberUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (memberUser) await cleanupTestUser(memberUser.user.id);
  });

  it('should allow steward to delete a custom role via RLS', async () => {
    // Create a custom role to delete
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Deletable Role' })
      .select()
      .single();

    const { error } = await stewardClient
      .from('group_roles')
      .delete()
      .eq('id', customRole!.id);

    expect(error).toBeNull();

    // Verify it's gone
    const { data: check } = await admin
      .from('group_roles')
      .select('id')
      .eq('id', customRole!.id);

    expect(check).toHaveLength(0);
  });

  it('should block deletion of template-originated roles via RLS', async () => {
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: templateRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .eq('created_from_role_template_id', stewardTemplate!.id)
      .single();

    const { error } = await stewardClient
      .from('group_roles')
      .delete()
      .eq('id', templateRole!.id);

    // Should be blocked (template roles are protected)
    // Either RLS blocks it or we get 0 rows affected
    const { data: check } = await admin
      .from('group_roles')
      .select('id')
      .eq('id', templateRole!.id);

    expect(check).toHaveLength(1); // Still exists
  });

  it('should block member from deleting a role via RLS', async () => {
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member Cannot Delete' })
      .select()
      .single();

    const { error } = await memberClient
      .from('group_roles')
      .delete()
      .eq('id', customRole!.id);

    // Verify it still exists
    const { data: check } = await admin
      .from('group_roles')
      .select('id')
      .eq('id', customRole!.id);

    expect(check).toHaveLength(1);
  });

  it('should cascade delete role assignments when custom role is deleted', async () => {
    // Create custom role and assign to member
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Cascade Test Role' })
      .select()
      .single();

    await admin.from('user_group_roles').insert({
      user_id: memberUser.profile.id,
      group_id: testGroupId,
      group_role_id: customRole!.id,
      assigned_by_user_id: stewardUser.profile.id,
    });

    // Verify assignment exists
    const { data: assignmentBefore } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_role_id', customRole!.id);

    expect(assignmentBefore!.length).toBeGreaterThan(0);

    // Delete the role (via admin to bypass RLS for this specific test)
    await admin
      .from('group_roles')
      .delete()
      .eq('id', customRole!.id);

    // Verify assignment is cascaded
    const { data: assignmentAfter } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_role_id', customRole!.id);

    expect(assignmentAfter).toHaveLength(0);
  });
});

// ============================================================================
// B-RBAC-023: Permission Picker — Category-Grouped Selection
// ============================================================================

describe('B-RBAC-023: Permission Picker Data', () => {
  const admin = createAdminClient();

  it('should return all permissions grouped by category', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('id, name, description, category')
      .order('category')
      .order('name');

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // Group by category
    const categories = new Set(data!.map(p => p.category));
    expect(categories.size).toBe(6);
    expect(categories).toContain('group_management');
    expect(categories).toContain('journey_management');
    expect(categories).toContain('journey_participation');
    expect(categories).toContain('communication');
    expect(categories).toContain('feedback');
    expect(categories).toContain('platform_admin');
  });

  it('should have descriptions for all permissions', async () => {
    const { data } = await admin
      .from('permissions')
      .select('name, description');

    for (const perm of data!) {
      expect(perm.description).toBeTruthy();
    }
  });

  it('should have group_management as the largest category', async () => {
    const { data } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'group_management');

    expect(data!.length).toBe(15); // 14 original + manage_roles
  });

  it('should include manage_roles in group_management category', async () => {
    const { data } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'group_management')
      .eq('name', 'manage_roles');

    expect(data).toHaveLength(1);
  });
});

// ============================================================================
// B-RBAC-024: Anti-Escalation Guardrail
// ============================================================================

describe('B-RBAC-024: Anti-Escalation Guardrail', () => {
  const admin = createAdminClient();
  let stewardUser: any;
  let guideUser: any;
  let stewardClient: ReturnType<typeof createTestClient>;
  let guideClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;
  let customRoleId: string;

  beforeAll(async () => {
    stewardUser = await createTestUser({ displayName: 'Escalation Steward' });
    guideUser = await createTestUser({ displayName: 'Escalation Guide' });
    stewardClient = createTestClient();
    guideClient = createTestClient();

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Anti-Escalation Test Group',
        created_by_user_id: stewardUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    testGroupId = group!.id;

    await admin.from('group_memberships').insert([
      { group_id: testGroupId, user_id: stewardUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
      { group_id: testGroupId, user_id: guideUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
    ]);

    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: guideTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Guide Role Template')
      .single();

    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplate?.id })
      .select()
      .single();

    const { data: guideRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Guide', created_from_role_template_id: guideTemplate?.id })
      .select()
      .single();

    // Create custom role for testing
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Test Escalation Role' })
      .select()
      .single();

    customRoleId = customRole!.id;

    // Give guide user manage_roles so they can try to escalate
    // (In practice a Steward might delegate manage_roles to a Guide)
    const { data: manageRolesPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'manage_roles')
      .single();

    if (manageRolesPerm) {
      // Add manage_roles to the Guide role in this group
      await admin.from('group_role_permissions').insert({
        group_role_id: guideRole!.id,
        permission_id: manageRolesPerm.id,
      });
    }

    await admin.from('user_group_roles').insert([
      { user_id: stewardUser.profile.id, group_id: testGroupId, group_role_id: stewardRole!.id, assigned_by_user_id: stewardUser.profile.id },
      { user_id: guideUser.profile.id, group_id: testGroupId, group_role_id: guideRole!.id, assigned_by_user_id: stewardUser.profile.id },
    ]);

    await signInWithRetry(stewardClient, stewardUser.email, stewardUser.password);
    await signInWithRetry(guideClient, guideUser.email, guideUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (guideUser) await cleanupTestUser(guideUser.user.id);
  });

  it('should block guide from granting a permission they do not hold', async () => {
    // Guide does NOT have delete_group permission
    const { data: deleteGroupPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'delete_group')
      .single();

    // Guide tries to add delete_group to the custom role
    const { error } = await guideClient
      .from('group_role_permissions')
      .insert({
        group_role_id: customRoleId,
        permission_id: deleteGroupPerm!.id,
      });

    // Should be blocked by anti-escalation RLS or trigger
    expect(error).not.toBeNull();
  });

  it('should allow guide to grant a permission they DO hold', async () => {
    // Guide HAS view_journey_content (from Guide template)
    const { data: viewContentPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'view_journey_content')
      .single();

    const { error } = await guideClient
      .from('group_role_permissions')
      .insert({
        group_role_id: customRoleId,
        permission_id: viewContentPerm!.id,
      });

    expect(error).toBeNull();
  });

  it('should allow steward to grant any permission they hold', async () => {
    // Steward has delete_group
    const { data: deleteGroupPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'delete_group')
      .single();

    // Clean up any existing mapping first
    await admin
      .from('group_role_permissions')
      .delete()
      .eq('group_role_id', customRoleId)
      .eq('permission_id', deleteGroupPerm!.id);

    const { error } = await stewardClient
      .from('group_role_permissions')
      .insert({
        group_role_id: customRoleId,
        permission_id: deleteGroupPerm!.id,
      });

    expect(error).toBeNull();
  });
});

// ============================================================================
// B-RBAC-025: RLS Policies Use has_permission() for Role Management
// ============================================================================

describe('B-RBAC-025: RLS Policies for Role Management', () => {
  const admin = createAdminClient();
  let stewardUser: any;
  let memberUser: any;
  let nonMemberUser: any;
  let stewardClient: ReturnType<typeof createTestClient>;
  let memberClient: ReturnType<typeof createTestClient>;
  let nonMemberClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;

  beforeAll(async () => {
    stewardUser = await createTestUser({ displayName: 'RLS Steward' });
    memberUser = await createTestUser({ displayName: 'RLS Member' });
    nonMemberUser = await createTestUser({ displayName: 'RLS Non-Member' });
    stewardClient = createTestClient();
    memberClient = createTestClient();
    nonMemberClient = createTestClient();

    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'RLS Role Test Group',
        created_by_user_id: stewardUser.profile.id,
        group_type: 'engagement',
      })
      .select()
      .single();

    testGroupId = group!.id;

    await admin.from('group_memberships').insert([
      { group_id: testGroupId, user_id: stewardUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
      { group_id: testGroupId, user_id: memberUser.profile.id, added_by_user_id: stewardUser.profile.id, status: 'active' },
    ]);

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

    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Steward', created_from_role_template_id: stewardTemplate?.id })
      .select()
      .single();

    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member', created_from_role_template_id: memberTemplate?.id })
      .select()
      .single();

    await admin.from('user_group_roles').insert([
      { user_id: stewardUser.profile.id, group_id: testGroupId, group_role_id: stewardRole!.id, assigned_by_user_id: stewardUser.profile.id },
      { user_id: memberUser.profile.id, group_id: testGroupId, group_role_id: memberRole!.id, assigned_by_user_id: stewardUser.profile.id },
    ]);

    await signInWithRetry(stewardClient, stewardUser.email, stewardUser.password);
    await signInWithRetry(memberClient, memberUser.email, memberUser.password);
    await signInWithRetry(nonMemberClient, nonMemberUser.email, nonMemberUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (stewardUser) await cleanupTestUser(stewardUser.user.id);
    if (memberUser) await cleanupTestUser(memberUser.user.id);
    if (nonMemberUser) await cleanupTestUser(nonMemberUser.user.id);
  });

  it('should allow steward to INSERT into group_roles (has manage_roles)', async () => {
    const { data, error } = await stewardClient
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'RLS Insert Test Role' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('should block member from INSERT into group_roles (no manage_roles)', async () => {
    const { error } = await memberClient
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member Insert Attempt' });

    expect(error).not.toBeNull();
  });

  it('should block non-member from INSERT into group_roles', async () => {
    const { error } = await nonMemberClient
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Non-Member Insert Attempt' });

    expect(error).not.toBeNull();
  });

  it('should allow steward to UPDATE group_roles', async () => {
    const { data: role } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'RLS Update Target' })
      .select()
      .single();

    const { error } = await stewardClient
      .from('group_roles')
      .update({ name: 'RLS Updated Name' })
      .eq('id', role!.id);

    expect(error).toBeNull();

    const { data: check } = await admin
      .from('group_roles')
      .select('name')
      .eq('id', role!.id)
      .single();

    expect(check!.name).toBe('RLS Updated Name');
  });

  it('should block member from UPDATE on group_roles', async () => {
    const { data: role } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'Member Update Target' })
      .select()
      .single();

    await memberClient
      .from('group_roles')
      .update({ name: 'Member Hacked Name' })
      .eq('id', role!.id);

    // Verify name unchanged
    const { data: check } = await admin
      .from('group_roles')
      .select('name')
      .eq('id', role!.id)
      .single();

    expect(check!.name).toBe('Member Update Target');
  });

  it('should allow steward to DELETE custom roles only', async () => {
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'RLS Delete Target' })
      .select()
      .single();

    const { error } = await stewardClient
      .from('group_roles')
      .delete()
      .eq('id', customRole!.id);

    expect(error).toBeNull();

    const { data: check } = await admin
      .from('group_roles')
      .select('id')
      .eq('id', customRole!.id);

    expect(check).toHaveLength(0);
  });

  it('should block steward from DELETE on template-originated roles', async () => {
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    const { data: templateRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .eq('created_from_role_template_id', stewardTemplate!.id)
      .single();

    await stewardClient
      .from('group_roles')
      .delete()
      .eq('id', templateRole!.id);

    // Should still exist (RLS blocked deletion)
    const { data: check } = await admin
      .from('group_roles')
      .select('id')
      .eq('id', templateRole!.id);

    expect(check).toHaveLength(1);
  });

  it('should allow steward to INSERT into group_role_permissions', async () => {
    const { data: customRole } = await admin
      .from('group_roles')
      .insert({ group_id: testGroupId, name: 'RLS Perm Insert Role' })
      .select()
      .single();

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'view_forum')
      .single();

    const { error } = await stewardClient
      .from('group_role_permissions')
      .insert({
        group_role_id: customRole!.id,
        permission_id: perm!.id,
      });

    expect(error).toBeNull();
  });

  it('should block member from INSERT into group_role_permissions', async () => {
    const { data: roles } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .is('created_from_role_template_id', null)
      .limit(1);

    if (!roles || roles.length === 0) return;

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'send_direct_messages')
      .single();

    const { error } = await memberClient
      .from('group_role_permissions')
      .insert({
        group_role_id: roles[0].id,
        permission_id: perm!.id,
      });

    expect(error).not.toBeNull();
  });

  it('should allow steward to DELETE from group_role_permissions', async () => {
    // Find a custom role with at least one permission
    const { data: customRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .is('created_from_role_template_id', null)
      .limit(1)
      .single();

    if (!customRole) return;

    // Add a permission via admin
    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'reply_to_messages')
      .single();

    await admin.from('group_role_permissions').insert({
      group_role_id: customRole.id,
      permission_id: perm!.id,
    });

    // Steward deletes it
    const { error } = await stewardClient
      .from('group_role_permissions')
      .delete()
      .eq('group_role_id', customRole.id)
      .eq('permission_id', perm!.id);

    expect(error).toBeNull();
  });

  it('should allow members to SELECT from group_roles (view roles)', async () => {
    const { data, error } = await memberClient
      .from('group_roles')
      .select('id, name')
      .eq('group_id', testGroupId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('should allow members to SELECT from group_role_permissions (view permissions)', async () => {
    const { data: roles } = await memberClient
      .from('group_roles')
      .select('id')
      .eq('group_id', testGroupId)
      .limit(1);

    if (!roles || roles.length === 0) return;

    const { data, error } = await memberClient
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', roles[0].id);

    expect(error).toBeNull();
    // Should return data (even if empty array)
    expect(data).not.toBeNull();
  });

  it('should block non-member from SELECT on group_roles', async () => {
    const { data, error } = await nonMemberClient
      .from('group_roles')
      .select('id, name')
      .eq('group_id', testGroupId);

    // Should return empty (RLS filters out)
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
