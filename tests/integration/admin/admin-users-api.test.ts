/**
 * Integration Tests: Admin Users API (Tier 1B Performance)
 *
 * Covers:
 * - B-PERF-001: Admin Users API with service_role
 *
 * Tests the server-side admin users query function that bypasses RLS
 * using service_role. This replaces the client-side Supabase query in
 * AdminDataPanel for the users card, eliminating per-row has_permission() costs.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  cleanupTestUser,
} from '@/tests/helpers/supabase';

// The module under test — does not exist yet (RED phase)
import { queryAdminUsers } from '@/lib/admin/admin-users-query';

describe('B-PERF-001: Admin Users API (service_role)', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let normalUser: any;
  let deusexGroupId: string;
  let deusexRoleId: string;

  beforeAll(async () => {
    deusexUser = await createTestUser({ displayName: 'Perf API Deusex' });
    normalUser = await createTestUser({ displayName: 'Perf API Normal' });

    // Look up Deusex group and role
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('Deusex system group not found');
    deusexGroupId = deusexGroup.id;

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    if (!deusexRole) throw new Error('Deusex role not found');
    deusexRoleId = deusexRole.id;

    // Add deusexUser to Deusex group with role
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      member_group_id: deusexUser.personalGroupId,
      added_by_group_id: deusexUser.personalGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: deusexUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: deusexUser.personalGroupId,
    });
  }, 30000);

  afterAll(async () => {
    // Clean up Deusex membership
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  // --- Authorization ---

  it('should reject non-admin caller with an error', async () => {
    const result = await queryAdminUsers({
      callerUserId: normalUser.profile.id,
      page: 0,
      pageSize: 10,
    });

    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it('should allow admin (Deusex) caller', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 10,
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.count).toBeGreaterThan(0);
  });

  // --- Data shape ---

  it('should return users with correct fields', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 10,
    });

    expect(result.error).toBeNull();
    expect(result.data!.length).toBeGreaterThan(0);

    const user = result.data![0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('full_name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('is_active');
    expect(user).toHaveProperty('is_decommissioned');
    expect(user).toHaveProperty('created_at');
  });

  // --- Pagination ---

  it('should respect page and pageSize parameters', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 2,
    });

    expect(result.error).toBeNull();
    expect(result.data!.length).toBeLessThanOrEqual(2);
    // count should be total (not just this page)
    expect(result.count).toBeGreaterThanOrEqual(result.data!.length);
  });

  it('should return different results for different pages', async () => {
    const page0 = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 2,
    });

    const page1 = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 1,
      pageSize: 2,
    });

    expect(page0.error).toBeNull();
    expect(page1.error).toBeNull();

    // If there are enough users, pages should have different content
    if (page0.count! > 2 && page1.data!.length > 0) {
      const ids0 = page0.data!.map((u: any) => u.id);
      const ids1 = page1.data!.map((u: any) => u.id);
      // No overlap between pages
      for (const id of ids1) {
        expect(ids0).not.toContain(id);
      }
    }
  });

  // --- Search ---

  it('should filter by search term (name match)', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 50,
      search: 'Perf API Deusex',
    });

    expect(result.error).toBeNull();
    expect(result.data!.length).toBeGreaterThanOrEqual(1);

    const names = result.data!.map((u: any) => u.full_name);
    expect(names).toContain('Perf API Deusex');
  });

  it('should filter by search term (email match)', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 50,
      search: deusexUser.email,
    });

    expect(result.error).toBeNull();
    expect(result.data!.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty results for non-matching search', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 10,
      search: 'zzz_nonexistent_user_zzz',
    });

    expect(result.error).toBeNull();
    expect(result.data!.length).toBe(0);
    expect(result.count).toBe(0);
  });

  // --- Decommissioned filter ---

  it('should exclude decommissioned users by default', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 100,
      showDecommissioned: false,
    });

    expect(result.error).toBeNull();
    const decommissioned = result.data!.filter((u: any) => u.is_decommissioned);
    expect(decommissioned.length).toBe(0);
  });

  it('should include decommissioned users when requested', async () => {
    // This test verifies the flag works — decommissioned users may or may not
    // exist, but the query should succeed and return a count
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 100,
      showDecommissioned: true,
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    // count with decommissioned should be >= count without
    const resultWithout = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 100,
      showDecommissioned: false,
    });
    expect(result.count).toBeGreaterThanOrEqual(resultWithout.count!);
  });

  // --- Ordering ---

  it('should return users ordered by created_at descending', async () => {
    const result = await queryAdminUsers({
      callerUserId: deusexUser.profile.id,
      page: 0,
      pageSize: 10,
    });

    expect(result.error).toBeNull();
    if (result.data!.length >= 2) {
      const dates = result.data!.map((u: any) => new Date(u.created_at).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    }
  });
});
