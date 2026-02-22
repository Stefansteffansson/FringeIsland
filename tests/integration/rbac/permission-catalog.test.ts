/**
 * Integration Tests: RBAC - Permission Catalog
 *
 * Tests: B-RBAC-001: Permission Catalog Integrity
 *
 * Verifies the permission catalog has exactly 31 permissions across 6 categories,
 * with D22 changes applied (rename, remove, add).
 *
 * These tests MUST FAIL initially (RED) — the D22 migration hasn't been applied yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-RBAC-001: Permission Catalog Integrity', () => {
  const admin = createAdminClient();
  let testUser: any;
  let userClient: ReturnType<typeof createTestClient>;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'RBAC Perm Catalog Test' });
    userClient = createTestClient();
    await signInWithRetry(userClient, testUser.email, testUser.password);
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should have exactly 44 permissions in the catalog', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(44);
  });

  it('should have 15 group_management permissions', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'group_management');

    expect(error).toBeNull();
    expect(data).toHaveLength(15);
  });

  it('should have 10 journey_management permissions', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'journey_management');

    expect(error).toBeNull();
    expect(data).toHaveLength(10);
  });

  it('should have 6 journey_participation permissions', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'journey_participation');

    expect(error).toBeNull();
    expect(data).toHaveLength(6);
  });

  it('should have 5 communication permissions', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'communication');

    expect(error).toBeNull();
    expect(data).toHaveLength(5);
  });

  it('should have 3 feedback permissions', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'feedback');

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });

  it('should have 5 platform_admin permissions', async () => {
    const { data, error } = await admin
      .from('permissions')
      .select('name')
      .eq('category', 'platform_admin');

    expect(error).toBeNull();
    expect(data).toHaveLength(5);
  });

  it('should have both track_group_progress and view_group_progress', async () => {
    const { data: trackPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'track_group_progress');

    const { data: viewPerm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'view_group_progress');

    expect(trackPerm).toHaveLength(1);
    expect(viewPerm).toHaveLength(1);
  });

  it('should have view_member_feedback permission', async () => {
    const { data } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'view_member_feedback');

    expect(data).toHaveLength(1);
  });

  it('should have added browse_journey_catalog permission', async () => {
    const { data } = await admin
      .from('permissions')
      .select('id, category')
      .eq('name', 'browse_journey_catalog');

    expect(data).toHaveLength(1);
    expect(data![0].category).toBe('journey_management');
  });

  it('should have added browse_public_groups permission', async () => {
    const { data } = await admin
      .from('permissions')
      .select('id, category')
      .eq('name', 'browse_public_groups');

    expect(data).toHaveLength(1);
    expect(data![0].category).toBe('group_management');
  });

  it('should not allow authenticated users to INSERT permissions', async () => {
    const { error } = await userClient
      .from('permissions')
      .insert({
        name: 'fake_permission',
        description: 'Should not be allowed',
        category: 'group_management',
      });

    expect(error).not.toBeNull();
  });
});
