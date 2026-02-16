/**
 * Integration Tests: RBAC - Personal Groups
 *
 * Tests: B-RBAC-003: Personal Group Creation on Signup
 *
 * Verifies that a personal group is auto-created when a user registers,
 * with the correct group_type, membership, and "Myself" role.
 *
 * These tests MUST FAIL initially (RED) — the personal group trigger doesn't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  createAdminClient,
} from '@/tests/helpers/supabase';

describe('B-RBAC-003: Personal Group Creation on Signup', () => {
  const admin = createAdminClient();
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Personal Group Test User' });
  });

  afterAll(async () => {
    // Clean up personal group first (if it exists)
    if (testUser) {
      const { data: personalGroup } = await admin
        .from('groups')
        .select('id')
        .eq('group_type', 'personal')
        .eq('created_by_user_id', testUser.profile.id)
        .maybeSingle();

      if (personalGroup) {
        await admin.from('groups').delete().eq('id', personalGroup.id);
      }
      await cleanupTestUser(testUser.user.id);
    }
  });

  it('should auto-create a personal group on user signup', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('id, name, group_type')
      .eq('group_type', 'personal')
      .eq('created_by_user_id', testUser.profile.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].group_type).toBe('personal');
  });

  it('should name the personal group after the user', async () => {
    const { data } = await admin
      .from('groups')
      .select('name')
      .eq('group_type', 'personal')
      .eq('created_by_user_id', testUser.profile.id)
      .single();

    expect(data).not.toBeNull();
    expect(data!.name).toBe('Personal Group Test User');
  });

  it('should make the user the sole member of their personal group', async () => {
    const { data: personalGroup } = await admin
      .from('groups')
      .select('id')
      .eq('group_type', 'personal')
      .eq('created_by_user_id', testUser.profile.id)
      .single();

    expect(personalGroup).not.toBeNull();

    const { data: memberships, error } = await admin
      .from('group_memberships')
      .select('user_id, status')
      .eq('group_id', personalGroup!.id);

    expect(error).toBeNull();
    expect(memberships).toHaveLength(1);
    expect(memberships![0].user_id).toBe(testUser.profile.id);
    expect(memberships![0].status).toBe('active');
  });

  it('should create a "Myself" role in the personal group', async () => {
    const { data: personalGroup } = await admin
      .from('groups')
      .select('id')
      .eq('group_type', 'personal')
      .eq('created_by_user_id', testUser.profile.id)
      .single();

    expect(personalGroup).not.toBeNull();

    const { data: roles, error } = await admin
      .from('group_roles')
      .select('name')
      .eq('group_id', personalGroup!.id);

    expect(error).toBeNull();
    expect(roles).toHaveLength(1);
    expect(roles![0].name).toBe('Myself');
  });

  it('should assign the "Myself" role to the user', async () => {
    const { data: personalGroup } = await admin
      .from('groups')
      .select('id')
      .eq('group_type', 'personal')
      .eq('created_by_user_id', testUser.profile.id)
      .single();

    expect(personalGroup).not.toBeNull();

    const { data: myselfRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', personalGroup!.id)
      .eq('name', 'Myself')
      .single();

    expect(myselfRole).not.toBeNull();

    const { data: assignment, error } = await admin
      .from('user_group_roles')
      .select('user_id')
      .eq('group_id', personalGroup!.id)
      .eq('group_role_id', myselfRole!.id);

    expect(error).toBeNull();
    expect(assignment).toHaveLength(1);
    expect(assignment![0].user_id).toBe(testUser.profile.id);
  });

  it('should give each user exactly one personal group', async () => {
    const { data, error } = await admin
      .from('groups')
      .select('id')
      .eq('group_type', 'personal')
      .eq('created_by_user_id', testUser.profile.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1); // Exactly one, not zero, not two
  });
});
