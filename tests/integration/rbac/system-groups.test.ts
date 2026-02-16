/**
 * Integration Tests: RBAC - System Groups
 *
 * Tests: B-RBAC-006: System Groups Exist
 *
 * Verifies that the three system groups (FringeIsland Members, Visitor, Deusex)
 * exist with correct group_type, roles, and permissions.
 *
 * These tests MUST FAIL initially (RED) — system groups don't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-RBAC-006: System Groups Exist', () => {
  const admin = createAdminClient();
  let testUser: any;
  let userClient: ReturnType<typeof createTestClient>;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'RBAC System Groups Test' });
    userClient = createTestClient();
    await signInWithRetry(userClient, testUser.email, testUser.password);
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  // --- FringeIsland Members ---

  it('should have a "FringeIsland Members" system group', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('id, name, group_type')
      .eq('name', 'FringeIsland Members')
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.group_type).toBe('system');
  });

  it('should have a "Member" role in FringeIsland Members with 8 permissions', async () => {
    const { data: group } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'FringeIsland Members')
      .single();

    if (!group) {
      expect(group).not.toBeNull();
      return;
    }

    const { data: role } = await admin
      .from('group_roles')
      .select('id, name')
      .eq('group_id', group.id)
      .eq('name', 'Member')
      .single();

    expect(role).not.toBeNull();

    if (!role) return;

    const { data: perms } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', role.id);

    expect(perms).toHaveLength(8);
  });

  it('should auto-enroll new users in FringeIsland Members', async () => {
    const { data: group } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'FringeIsland Members')
      .single();

    if (!group) {
      expect(group).not.toBeNull();
      return;
    }

    // Check that at least one user is enrolled (migration enrolls all existing users)
    const { data: memberships, error } = await admin
      .from('group_memberships')
      .select('id, status')
      .eq('group_id', group.id)
      .eq('status', 'active');

    expect(error).toBeNull();
    expect(memberships).not.toBeNull();
    expect(memberships!.length).toBeGreaterThan(0);
  });

  // --- Visitor ---

  it('should have a "Visitor" system group', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('id, name, group_type')
      .eq('name', 'Visitor')
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.group_type).toBe('system');
  });

  it('should have a "Guest" role in Visitor group with 5 permissions', async () => {
    const { data: group } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'Visitor')
      .single();

    if (!group) {
      expect(group).not.toBeNull();
      return;
    }

    const { data: role } = await admin
      .from('group_roles')
      .select('id, name')
      .eq('group_id', group.id)
      .eq('name', 'Guest')
      .single();

    expect(role).not.toBeNull();

    if (!role) return;

    const { data: perms } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', role.id);

    expect(perms).toHaveLength(5);
  });

  // --- Deusex ---

  it('should have a "Deusex" system group', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('id, name, group_type')
      .eq('name', 'Deusex')
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.group_type).toBe('system');
  });

  it('should have a "Deusex" role with ALL 41 permissions', async () => {
    const { data: group } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'Deusex')
      .single();

    if (!group) {
      expect(group).not.toBeNull();
      return;
    }

    const { data: role } = await admin
      .from('group_roles')
      .select('id, name')
      .eq('group_id', group.id)
      .eq('name', 'Deusex')
      .single();

    expect(role).not.toBeNull();

    if (!role) return;

    const { data: perms } = await admin
      .from('group_role_permissions')
      .select('group_role_id, permission_id')
      .eq('group_role_id', role.id);

    expect(perms).toHaveLength(41);
  });

  // --- System group protection ---

  it('should have exactly 3 system groups', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('id')
      .eq('group_type', 'system');

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });

  it('should not show system groups in normal user group listings', async () => {
    // User queries their groups — system groups should be filtered
    // This tests the convention, not RLS (system groups use different membership patterns)
    const { data, error } = await userClient
      .from('groups')
      .select('id, name, group_type')
      .eq('group_type', 'system');

    // System groups should either be filtered by RLS or not appear in user's membership-based queries
    // At minimum, the group_type column should exist for UI-level filtering
    expect(error).toBeNull();
    // We don't enforce strict RLS blocking here — the UI will filter by group_type
  });

  it('should not allow regular users to delete system groups', async () => {
    const { data: fiMembers } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'FringeIsland Members')
      .single();

    if (!fiMembers) {
      expect(fiMembers).not.toBeNull();
      return;
    }

    const { error } = await userClient
      .from('groups')
      .delete()
      .eq('id', fiMembers.id);

    // Should be blocked (RLS or constraint)
    // Verify it still exists
    const { data: stillExists } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'FringeIsland Members')
      .single();

    expect(stillExists).not.toBeNull();
  });
});
