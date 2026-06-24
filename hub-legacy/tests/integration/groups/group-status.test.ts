/**
 * Integration Tests: B-GRP-007 — Group Status Visibility
 *
 * Sprint 1: Foundation Schema (F1)
 *
 * Verifies that:
 * - groups.status column exists with CHECK constraint (active/closed/archived/suspended)
 * - New groups default to status='active'
 * - Non-admin users can ONLY see groups with status='active'
 * - Platform admins (DeusEx members) can see groups of ALL statuses
 * - Status filter takes precedence over is_public (public + archived = invisible to non-admins)
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

describe('B-GRP-007: Group Status Visibility', () => {
  let regularUser: any;
  let adminUser: any;

  // Groups with different statuses (created via admin, status set via admin)
  let activeGroup: any;
  let closedGroup: any;
  let archivedGroup: any;
  let suspendedGroup: any;
  let publicArchivedGroup: any; // is_public=true but status='archived'

  // DeusEx lookup
  let deusexGroupId: string;
  let deusexRoleId: string;

  const admin = createAdminClient();

  beforeAll(async () => {
    // Create test users
    regularUser = await createTestUser({ displayName: 'GRP-007 Regular' });
    adminUser = await createTestUser({ displayName: 'GRP-007 Admin' });

    // Look up DeusEx system group and role
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    deusexGroupId = deusexGroup!.id;

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    deusexRoleId = deusexRole!.id;

    // Add adminUser to DeusEx group with DeusEx role
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      member_group_id: adminUser.personalGroupId,
      added_by_group_id: adminUser.personalGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: adminUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: adminUser.personalGroupId,
    });

    // Create groups with different statuses
    // All groups have regularUser as a member so we can test visibility filtering

    // 1. Active group (default status)
    const { data: ag } = await admin
      .from('groups')
      .insert({
        name: 'GRP-007 Active Group',
        description: 'Test group with active status',
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: regularUser.personalGroupId,
      })
      .select()
      .single();
    activeGroup = ag;

    // Add regularUser as member
    await admin.from('group_memberships').insert({
      group_id: activeGroup.id,
      member_group_id: regularUser.personalGroupId,
      added_by_group_id: regularUser.personalGroupId,
      status: 'active',
    });

    // 2. Closed group
    const { data: cg } = await admin
      .from('groups')
      .insert({
        name: 'GRP-007 Closed Group',
        description: 'Test group with closed status',
        group_type: 'engagement',
        is_public: false,
        status: 'closed',
        created_by_group_id: regularUser.personalGroupId,
      })
      .select()
      .single();
    closedGroup = cg;

    // Add regularUser as member (even members shouldn't see closed groups)
    await admin.from('group_memberships').insert({
      group_id: closedGroup.id,
      member_group_id: regularUser.personalGroupId,
      added_by_group_id: regularUser.personalGroupId,
      status: 'active',
    });

    // 3. Archived group
    const { data: archg } = await admin
      .from('groups')
      .insert({
        name: 'GRP-007 Archived Group',
        description: 'Test group with archived status',
        group_type: 'engagement',
        is_public: false,
        status: 'archived',
        created_by_group_id: regularUser.personalGroupId,
      })
      .select()
      .single();
    archivedGroup = archg;

    await admin.from('group_memberships').insert({
      group_id: archivedGroup.id,
      member_group_id: regularUser.personalGroupId,
      added_by_group_id: regularUser.personalGroupId,
      status: 'active',
    });

    // 4. Suspended group
    const { data: sg } = await admin
      .from('groups')
      .insert({
        name: 'GRP-007 Suspended Group',
        description: 'Test group with suspended status',
        group_type: 'engagement',
        is_public: false,
        status: 'suspended',
        created_by_group_id: regularUser.personalGroupId,
      })
      .select()
      .single();
    suspendedGroup = sg;

    await admin.from('group_memberships').insert({
      group_id: suspendedGroup.id,
      member_group_id: regularUser.personalGroupId,
      added_by_group_id: regularUser.personalGroupId,
      status: 'active',
    });

    // 5. Public but archived group (status should override is_public)
    const { data: pag } = await admin
      .from('groups')
      .insert({
        name: 'GRP-007 Public Archived Group',
        description: 'Public group with archived status — should still be invisible to non-admins',
        group_type: 'engagement',
        is_public: true,
        status: 'archived',
        created_by_group_id: regularUser.personalGroupId,
      })
      .select()
      .single();
    publicArchivedGroup = pag;
  }, 30000);

  afterAll(async () => {
    // Clean up DeusEx membership for adminUser before deleting
    if (adminUser) {
      await admin
        .from('user_group_roles')
        .delete()
        .eq('member_group_id', adminUser.personalGroupId)
        .eq('group_id', deusexGroupId);

      await admin
        .from('group_memberships')
        .delete()
        .eq('member_group_id', adminUser.personalGroupId)
        .eq('group_id', deusexGroupId);
    }

    // Clean up groups
    if (publicArchivedGroup) await cleanupTestGroup(publicArchivedGroup.id);
    if (suspendedGroup) await cleanupTestGroup(suspendedGroup.id);
    if (archivedGroup) await cleanupTestGroup(archivedGroup.id);
    if (closedGroup) await cleanupTestGroup(closedGroup.id);
    if (activeGroup) await cleanupTestGroup(activeGroup.id);

    // Clean up users
    if (adminUser) await cleanupTestUser(adminUser.user.id);
    if (regularUser) await cleanupTestUser(regularUser.user.id);
  }, 30000);

  // ─── Column & Constraint Tests ───────────────────────────────────────

  it('should default new groups to status=active', async () => {
    // activeGroup was created without explicit status — should be 'active'
    const { data, error } = await admin
      .from('groups')
      .select('id, name, status')
      .eq('id', activeGroup.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('active');
  });

  it('should accept valid status values (closed, archived, suspended)', async () => {
    // Verify the groups with non-active statuses were created successfully
    const { data: closed } = await admin
      .from('groups')
      .select('status')
      .eq('id', closedGroup.id)
      .single();

    const { data: archived } = await admin
      .from('groups')
      .select('status')
      .eq('id', archivedGroup.id)
      .single();

    const { data: suspended } = await admin
      .from('groups')
      .select('status')
      .eq('id', suspendedGroup.id)
      .single();

    expect(closed!.status).toBe('closed');
    expect(archived!.status).toBe('archived');
    expect(suspended!.status).toBe('suspended');
  });

  it('should reject invalid status values via CHECK constraint', async () => {
    const { data, error } = await admin
      .from('groups')
      .insert({
        name: 'GRP-007 Invalid Status Group',
        group_type: 'engagement',
        status: 'invalid_status',
        created_by_group_id: regularUser.personalGroupId,
      })
      .select()
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  // ─── Non-Admin Visibility Tests ──────────────────────────────────────

  it('should allow non-admin user to see active groups they are a member of', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, regularUser.email, regularUser.password);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, status')
      .eq('id', activeGroup.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe('GRP-007 Active Group');
    expect(data![0].status).toBe('active');

    await supabase.auth.signOut();
  });

  it('should HIDE closed groups from non-admin users (even members)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, regularUser.email, regularUser.password);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', closedGroup.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filters it out

    await supabase.auth.signOut();
  });

  it('should HIDE archived groups from non-admin users (even members)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, regularUser.email, regularUser.password);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', archivedGroup.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filters it out

    await supabase.auth.signOut();
  });

  it('should HIDE suspended groups from non-admin users (even members)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, regularUser.email, regularUser.password);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', suspendedGroup.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filters it out

    await supabase.auth.signOut();
  });

  it('should HIDE public groups with non-active status from non-admin users', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, regularUser.email, regularUser.password);

    // This group is is_public=true but status='archived'
    // Status filter should take precedence over public visibility
    const { data, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', publicArchivedGroup.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0); // Status override: archived + public = still invisible

    await supabase.auth.signOut();
  });

  // ─── Admin Visibility Tests ──────────────────────────────────────────

  it('should allow platform admin to see groups of ALL statuses', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, adminUser.email, adminUser.password);

    // Admin should see all test groups regardless of status
    const testGroupIds = [
      activeGroup.id,
      closedGroup.id,
      archivedGroup.id,
      suspendedGroup.id,
      publicArchivedGroup.id,
    ];

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, status')
      .in('id', testGroupIds);

    expect(error).toBeNull();
    expect(data).toHaveLength(5); // Admin sees ALL groups

    // Verify each status is represented
    const statuses = data!.map((g: any) => g.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('closed');
    expect(statuses).toContain('archived');
    expect(statuses).toContain('suspended');

    await supabase.auth.signOut();
  });
});
