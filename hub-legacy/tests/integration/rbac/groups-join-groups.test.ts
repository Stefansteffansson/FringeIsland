/**
 * Integration Tests: Groups-Join-Groups + Engagement Group as Actor
 *
 * Covers:
 * - B-D15-002: Engagement group as member of another engagement group
 * - B-D15-003: has_permission() with engagement group as p_acting_group_id
 *
 * These tests verify that the universal group pattern generalises
 * beyond personal groups — engagement groups can join other groups
 * and have permissions checked via has_permission().
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  createAdminClient,
  cleanupTestGroup,
} from '@/tests/helpers/supabase';

describe('B-D15-002 + B-D15-003: Groups-Join-Groups & Engagement Group Actor', () => {
  const admin = createAdminClient();

  // Two test users (creators of engagement groups)
  let userA: any;
  let userB: any;

  // Two engagement groups
  let groupA: any; // Will join groupB as Steward
  let groupB: any; // Host group
  let unrelatedGroup: any; // Group that groupA has no connection to

  // Role templates + group roles
  let stewardRole: any; // Steward role in groupB

  beforeAll(async () => {
    // Create test users
    userA = await createTestUser({ displayName: 'GJG Test User A' });
    userB = await createTestUser({ displayName: 'GJG Test User B' });

    // Create engagement groups
    const { data: gA, error: gAErr } = await admin
      .from('groups')
      .insert({
        name: 'GJG Engagement Group A',
        group_type: 'engagement',
        created_by_group_id: userA.personalGroupId,
      })
      .select()
      .single();
    if (gAErr) throw new Error(`Failed to create group A: ${gAErr.message}`);
    groupA = gA;

    const { data: gB, error: gBErr } = await admin
      .from('groups')
      .insert({
        name: 'GJG Engagement Group B',
        group_type: 'engagement',
        created_by_group_id: userB.personalGroupId,
      })
      .select()
      .single();
    if (gBErr) throw new Error(`Failed to create group B: ${gBErr.message}`);
    groupB = gB;

    const { data: uG, error: uGErr } = await admin
      .from('groups')
      .insert({
        name: 'GJG Unrelated Group',
        group_type: 'engagement',
        created_by_group_id: userB.personalGroupId,
      })
      .select()
      .single();
    if (uGErr) throw new Error(`Failed to create unrelated group: ${uGErr.message}`);
    unrelatedGroup = uG;

    // Add userB's personal group as a member of groupB (so RLS can see it)
    await admin.from('group_memberships').insert({
      group_id: groupB.id,
      member_group_id: userB.personalGroupId,
      added_by_group_id: userB.personalGroupId,
      status: 'active',
    });

    // Add engagement group A as a member of group B
    await admin.from('group_memberships').insert({
      group_id: groupB.id,
      member_group_id: groupA.id,
      added_by_group_id: userB.personalGroupId,
      status: 'active',
    });

    // Get Steward role template
    const { data: stewardTemplate } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();

    // Create Steward role in groupB
    const { data: sRole } = await admin
      .from('group_roles')
      .insert({
        group_id: groupB.id,
        name: 'Steward',
        created_from_role_template_id: stewardTemplate!.id,
      })
      .select()
      .single();
    stewardRole = sRole;

    // Assign Steward role to groupA (the engagement group) in groupB
    await admin.from('user_group_roles').insert({
      member_group_id: groupA.id,
      group_id: groupB.id,
      group_role_id: stewardRole.id,
      assigned_by_group_id: userB.personalGroupId,
    });
  }, 30000);

  afterAll(async () => {
    if (unrelatedGroup) await cleanupTestGroup(unrelatedGroup.id);
    if (groupB) await cleanupTestGroup(groupB.id);
    if (groupA) await cleanupTestGroup(groupA.id);
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
  }, 30000);

  // ──────────────────────────────────────────────────────────────────
  // B-D15-002: Groups-Join-Groups
  // ──────────────────────────────────────────────────────────────────

  describe('B-D15-002: Engagement group as member of another group', () => {
    it('should have engagement group A as an active member of group B', async () => {
      const { data, error } = await admin
        .from('group_memberships')
        .select('id, status, member_group_id')
        .eq('group_id', groupB.id)
        .eq('member_group_id', groupA.id)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.status).toBe('active');
    });

    it('should have the membership visible alongside personal group members', async () => {
      const { data, error } = await admin
        .from('group_memberships')
        .select('member_group_id, status')
        .eq('group_id', groupB.id)
        .eq('status', 'active');

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(2);

      const memberGroupIds = data!.map((m: any) => m.member_group_id);
      expect(memberGroupIds).toContain(groupA.id); // engagement group
      expect(memberGroupIds).toContain(userB.personalGroupId); // personal group
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // B-D15-003: has_permission() with engagement group actor
  // ──────────────────────────────────────────────────────────────────

  describe('B-D15-003: has_permission() with engagement group as actor', () => {
    it('should return true when engagement group has Steward permission in host group', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_acting_group_id: groupA.id,
        p_context_group_id: groupB.id,
        p_permission_name: 'invite_members',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false when engagement group has no membership in unrelated group', async () => {
      const { data, error } = await admin.rpc('has_permission', {
        p_acting_group_id: groupA.id,
        p_context_group_id: unrelatedGroup.id,
        p_permission_name: 'view_member_list',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });
});
