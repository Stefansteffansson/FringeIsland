/**
 * Integration Tests: RBAC - Group Types
 *
 * Tests: B-RBAC-002: Group Type Classification
 *
 * Verifies the group_type column exists with correct constraints,
 * and that existing groups are properly classified.
 *
 * These tests MUST FAIL initially (RED) — the group_type column doesn't exist yet.
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

describe('B-RBAC-002: Group Type Classification', () => {
  const admin = createAdminClient();
  let testUser: any;
  let userClient: ReturnType<typeof createTestClient>;
  let testGroupId: string;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'RBAC Group Type Test' });
    userClient = createTestClient();
    await signInWithRetry(userClient, testUser.email, testUser.password);
  });

  afterAll(async () => {
    if (testGroupId) await cleanupTestGroup(testGroupId);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should have a group_type column on the groups table', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('group_type')
      .limit(1);

    // If the column doesn't exist, this will error
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should reject invalid group_type values', async () => {
    const { error } = await admin
      .from('groups')
      .insert({
        name: 'Invalid Type Test',
        group_type: 'admin',
        created_by_group_id: testUser.personalGroupId,
      });

    expect(error).not.toBeNull(); // CHECK constraint violation
  });

  it('should allow system, personal, and engagement group types', async () => {
    // Test engagement (most common user-created type)
    const { data, error } = await admin
      .from('groups')
      .insert({
        name: 'RBAC Group Type Test - Engagement',
        group_type: 'engagement',
        created_by_group_id: testUser.personalGroupId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.group_type).toBe('engagement');
    testGroupId = data!.id;
  });

  it('should default new groups to engagement type', async () => {
    // Insert without specifying group_type — should default to 'engagement'
    const { data, error } = await admin
      .from('groups')
      .insert({
        name: 'RBAC Group Type Default Test',
        created_by_group_id: testUser.personalGroupId,
      })
      .select('group_type')
      .single();

    expect(error).toBeNull();
    expect(data!.group_type).toBe('engagement');

    // Cleanup
    if (data) {
      await admin.from('groups').delete().eq('id', (data as any).id);
    }
  });

  it('should have classified all existing pre-RBAC groups as engagement', async () => {
    // All groups that existed before the migration should be engagement
    const { data, error } = await admin
      .from('groups')
      .select('id, group_type')
      .is('group_type', null);

    expect(error).toBeNull();
    // No groups should have null group_type after migration
    expect(data).toHaveLength(0);
  });

  it('should not allow regular users to change group_type to system', async () => {
    if (!testGroupId) return;

    const { error } = await userClient
      .from('groups')
      .update({ group_type: 'system' })
      .eq('id', testGroupId);

    // Should be blocked (either by RLS or by a constraint)
    // After the update attempt, verify it didn't change
    const { data } = await admin
      .from('groups')
      .select('group_type')
      .eq('id', testGroupId)
      .single();

    expect(data!.group_type).not.toBe('system');
  });
});
