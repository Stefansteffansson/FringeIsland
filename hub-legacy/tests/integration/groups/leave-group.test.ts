/**
 * Integration Tests: B-GRP-008, B-GRP-009, B-GRP-010 — Leave Group Core
 *
 * Sprint 2: Leave Group Core
 *
 * Tests three leave-group scenarios:
 * - L1: Regular member leaves engagement group (B-GRP-008)
 * - L2: Sole Steward → DeusEx handover (B-GRP-009)
 * - L3: Last member leaves → group closure (B-GRP-010)
 *
 * All tests call the `leave_group(p_group_id)` RPC which must:
 * - Delete the caller's membership
 * - Cascade role removal
 * - Freeze non-public journey enrollments
 * - Handle DeusEx handover for sole Stewards
 * - Handle group closure for last members
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestGroup,
  cleanupTestJourney,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('Leave Group Core (Sprint 2)', () => {
  // Test users
  let steward: any;
  let member1: any;
  let member2: any;
  let loneUser: any; // For L3 (last member)

  // DeusEx system group
  let deusexGroupId: string;
  let deusexStewardRoleId: string; // The "DeusEx" role in the DeusEx system group

  // Shared setup
  const admin = createAdminClient();

  // Track created groups and journeys for cleanup
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];

  /**
   * Helper: Create an engagement group with a Steward
   */
  async function createEngagementGroup(
    name: string,
    stewardPersonalGroupId: string,
  ) {
    const { data: group } = await admin
      .from('groups')
      .insert({
        name,
        description: `Test group: ${name}`,
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: stewardPersonalGroupId,
      })
      .select()
      .single();

    createdGroupIds.push(group!.id);

    // Add membership
    await admin.from('group_memberships').insert({
      group_id: group!.id,
      member_group_id: stewardPersonalGroupId,
      added_by_group_id: stewardPersonalGroupId,
      status: 'active',
    });

    // Create Steward role
    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: group!.id, name: 'Steward' })
      .select()
      .single();

    // Create Member role
    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: group!.id, name: 'Member' })
      .select()
      .single();

    // Assign Steward role
    await admin.from('user_group_roles').insert({
      member_group_id: stewardPersonalGroupId,
      group_id: group!.id,
      group_role_id: stewardRole!.id,
      assigned_by_group_id: stewardPersonalGroupId,
    });

    return {
      group: group!,
      stewardRole: stewardRole!,
      memberRole: memberRole!,
    };
  }

  /**
   * Helper: Add a member to a group with Member role
   */
  async function addMember(
    groupId: string,
    memberPersonalGroupId: string,
    memberRoleId: string,
    addedByGroupId: string,
  ) {
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memberPersonalGroupId,
      added_by_group_id: addedByGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: memberPersonalGroupId,
      group_id: groupId,
      group_role_id: memberRoleId,
      assigned_by_group_id: addedByGroupId,
    });
  }

  /**
   * Helper: Create a non-public journey owned by a group
   */
  async function createNonPublicJourney(
    title: string,
    createdByGroupId: string,
  ) {
    const { data: journey } = await admin
      .from('journeys')
      .insert({
        title,
        description: `Test journey: ${title}`,
        created_by_group_id: createdByGroupId,
        is_published: true,
        is_public: false,
        journey_type: 'predefined',
        content: {
          version: '1.0',
          structure: 'linear',
          steps: [
            {
              id: 'step_1',
              title: 'Step 1',
              type: 'content',
              duration_minutes: 10,
              required: true,
            },
          ],
        },
      })
      .select()
      .single();

    createdJourneyIds.push(journey!.id);
    return journey!;
  }

  /**
   * Helper: Enroll a personal group in a journey (individual enrollment)
   */
  async function enrollInJourney(
    journeyId: string,
    personalGroupId: string,
  ) {
    const { data: enrollment } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journeyId,
        group_id: personalGroupId,
        enrolled_by_group_id: personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    return enrollment!;
  }

  beforeAll(async () => {
    // Create test users
    steward = await createTestUser({ displayName: 'LG Steward' });
    member1 = await createTestUser({ displayName: 'LG Member 1' });
    member2 = await createTestUser({ displayName: 'LG Member 2' });
    loneUser = await createTestUser({ displayName: 'LG Lone User' });

    // Look up DeusEx system group
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    deusexGroupId = deusexGroup!.id;

    // Look up DeusEx role (for verifying handover)
    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    deusexStewardRoleId = deusexRole!.id;
  }, 30000);

  afterAll(async () => {
    // Clean up journeys first (RESTRICT FK)
    for (const jId of createdJourneyIds) {
      await admin.from('journey_enrollments').delete().eq('journey_id', jId);
      await admin.from('journeys').delete().eq('id', jId);
    }

    // Clean up groups
    for (const gId of createdGroupIds) {
      await cleanupTestGroup(gId);
    }

    // Clean up any DeusEx memberships we created in test groups
    // (DeusEx might have been added to groups during L2 tests)

    // Clean up users
    if (loneUser) await cleanupTestUser(loneUser.user.id);
    if (member2) await cleanupTestUser(member2.user.id);
    if (member1) await cleanupTestUser(member1.user.id);
    if (steward) await cleanupTestUser(steward.user.id);
  }, 30000);

  // ─── L1: Regular Member Leaves ───────────────────────────────────────

  describe('B-GRP-008: Regular Member Leave', () => {
    it('should allow an active member to leave an engagement group', async () => {
      // Setup: group with steward + member1
      const { group, memberRole } = await createEngagementGroup(
        'LG-L1-Basic',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Act: member1 calls leave_group
      const supabase = createTestClient();
      await signInWithRetry(supabase, member1.email, member1.password);

      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: group.id,
      });

      expect(error).toBeNull();

      // Verify: membership deleted
      const { data: membership } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', group.id)
        .eq('member_group_id', member1.personalGroupId)
        .maybeSingle();

      expect(membership).toBeNull();

      await supabase.auth.signOut();
    });

    it('should cascade-delete roles when member leaves', async () => {
      // Setup: group with steward + member2 (member2 has Member role)
      const { group, memberRole } = await createEngagementGroup(
        'LG-L1-Roles',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member2.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Verify role exists before leave
      const { data: rolesBefore } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('group_id', group.id)
        .eq('member_group_id', member2.personalGroupId);

      expect(rolesBefore!.length).toBeGreaterThan(0);

      // Act: member2 leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, member2.email, member2.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: roles deleted
      const { data: rolesAfter } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('group_id', group.id)
        .eq('member_group_id', member2.personalGroupId);

      expect(rolesAfter).toHaveLength(0);

      await supabase.auth.signOut();
    });

    it('should freeze non-public journey enrollments on leave', async () => {
      // Setup: group with steward + member1, non-public journey, member1 enrolled
      const { group, memberRole } = await createEngagementGroup(
        'LG-L1-Freeze',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      const journey = await createNonPublicJourney(
        'LG-L1-NonPublic Journey',
        group.id,
      );
      const enrollment = await enrollInJourney(
        journey.id,
        member1.personalGroupId,
      );

      // Act: member1 leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, member1.email, member1.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: enrollment frozen with reason
      const { data: updatedEnrollment } = await admin
        .from('journey_enrollments')
        .select('status, progress_data')
        .eq('id', enrollment.id)
        .single();

      expect(updatedEnrollment!.status).toBe('frozen');
      expect(updatedEnrollment!.progress_data).toHaveProperty(
        'frozen_reason',
        'left_group',
      );

      await supabase.auth.signOut();
    });

    it('should NOT freeze public/platform journey enrollments on leave', async () => {
      // Setup: group with steward + member1, public journey, member1 enrolled
      const { group, memberRole } = await createEngagementGroup(
        'LG-L1-Public',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Create a PUBLIC journey owned by the group
      const { data: publicJourney } = await admin
        .from('journeys')
        .insert({
          title: 'LG-L1-Public Journey',
          description: 'Public journey - should NOT be frozen',
          created_by_group_id: group.id,
          is_published: true,
          is_public: true,
          journey_type: 'predefined',
          content: {
            version: '1.0',
            structure: 'linear',
            steps: [{ id: 'step_1', title: 'S1', type: 'content', duration_minutes: 5, required: true }],
          },
        })
        .select()
        .single();

      createdJourneyIds.push(publicJourney!.id);

      const enrollment = await enrollInJourney(
        publicJourney!.id,
        member1.personalGroupId,
      );

      // Act: member1 leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, member1.email, member1.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: public enrollment NOT frozen
      const { data: updatedEnrollment } = await admin
        .from('journey_enrollments')
        .select('status')
        .eq('id', enrollment.id)
        .single();

      expect(updatedEnrollment!.status).toBe('active');

      await supabase.auth.signOut();
    });

    it('should reject leaving a personal group', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, member1.email, member1.password);

      // Try to leave own personal group
      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: member1.personalGroupId,
      });

      expect(error).not.toBeNull();

      await supabase.auth.signOut();
    });

    it('should reject leaving a group you are not a member of', async () => {
      // Setup: group where member2 is NOT a member
      const { group } = await createEngagementGroup(
        'LG-L1-NotMember',
        steward.personalGroupId,
      );

      const supabase = createTestClient();
      await signInWithRetry(supabase, member2.email, member2.password);

      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: group.id,
      });

      expect(error).not.toBeNull();

      await supabase.auth.signOut();
    });

    it('should notify Steward(s) when a member leaves', async () => {
      // Setup: group with steward + member1
      const { group, memberRole } = await createEngagementGroup(
        'LG-L1-Notify',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Clear existing notifications for steward
      await admin
        .from('notifications')
        .delete()
        .eq('recipient_group_id', steward.personalGroupId)
        .eq('type', 'member_left');

      // Act: member1 leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, member1.email, member1.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: steward received notification
      const { data: notifications } = await admin
        .from('notifications')
        .select('type, title, body, payload')
        .eq('recipient_group_id', steward.personalGroupId)
        .eq('type', 'member_left')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(notifications).toHaveLength(1);
      expect(notifications![0].type).toBe('member_left');

      await supabase.auth.signOut();
    });
  });

  // ─── L2: Sole Steward → DeusEx Handover ──────────────────────────────

  describe('B-GRP-009: Sole Steward DeusEx Handover', () => {
    it('should transfer stewardship to DeusEx when sole Steward leaves', async () => {
      // Setup: group with steward (sole) + member1
      const { group, memberRole, stewardRole } = await createEngagementGroup(
        'LG-L2-Handover',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Act: sole steward leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, steward.email, steward.password);

      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: group.id,
      });

      expect(error).toBeNull();

      // Verify: DeusEx is now a member with Steward role
      const { data: deusexMembership } = await admin
        .from('group_memberships')
        .select('id, status')
        .eq('group_id', group.id)
        .eq('member_group_id', deusexGroupId)
        .maybeSingle();

      expect(deusexMembership).not.toBeNull();
      expect(deusexMembership!.status).toBe('active');

      // Verify: DeusEx has Steward role in this group
      const { data: deusexRoles } = await admin
        .from('user_group_roles')
        .select('id, group_roles!inner(name)')
        .eq('group_id', group.id)
        .eq('member_group_id', deusexGroupId);

      const hasstewardRole = deusexRoles!.some(
        (r: any) => r.group_roles?.name === 'Steward',
      );
      expect(hasstewardRole).toBe(true);

      // Verify: original steward's membership is deleted
      const { data: stewardMembership } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', group.id)
        .eq('member_group_id', steward.personalGroupId)
        .maybeSingle();

      expect(stewardMembership).toBeNull();

      await supabase.auth.signOut();
    });

    it('should transfer pending invitations to DeusEx on sole Steward leave', async () => {
      // Setup: group with steward + active member + pending invitation
      const { group, memberRole } = await createEngagementGroup(
        'LG-L2-Invites',
        steward.personalGroupId,
      );

      // Add member1 as active member (so this is steward_handover, not group_closure)
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Create a pending invitation for member2 (status='invited')
      await admin.from('group_memberships').insert({
        group_id: group.id,
        member_group_id: member2.personalGroupId,
        added_by_group_id: steward.personalGroupId,
        status: 'invited',
      });

      // Act: sole steward leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, steward.email, steward.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: pending invitation's added_by_group_id is now DeusEx
      const { data: invitation } = await admin
        .from('group_memberships')
        .select('added_by_group_id, status')
        .eq('group_id', group.id)
        .eq('member_group_id', member2.personalGroupId)
        .eq('status', 'invited')
        .maybeSingle();

      expect(invitation).not.toBeNull();
      expect(invitation!.added_by_group_id).toBe(deusexGroupId);

      await supabase.auth.signOut();
    });

    it('should notify group members when DeusEx assumes stewardship', async () => {
      // Setup: group with steward + member1
      const { group, memberRole } = await createEngagementGroup(
        'LG-L2-NotifyMembers',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Clear relevant notifications
      await admin
        .from('notifications')
        .delete()
        .eq('recipient_group_id', member1.personalGroupId)
        .like('type', '%stewardship%');

      // Act: sole steward leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, steward.email, steward.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: member1 received stewardship notification
      const { data: notifications } = await admin
        .from('notifications')
        .select('type, title, body')
        .eq('recipient_group_id', member1.personalGroupId)
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Should have a notification about stewardship change
      const hasstewardshipNotification = notifications!.some(
        (n: any) =>
          n.body?.toLowerCase().includes('stewardship') ||
          n.body?.toLowerCase().includes('fringeisland') ||
          n.type === 'stewardship_transferred',
      );
      expect(hasstewardshipNotification).toBe(true);

      await supabase.auth.signOut();
    });

    it('should use regular leave when other Stewards exist (no DeusEx handover)', async () => {
      // Setup: group with 2 stewards + member1
      const { group, stewardRole, memberRole } = await createEngagementGroup(
        'LG-L2-MultiSteward',
        steward.personalGroupId,
      );
      await addMember(
        group.id,
        member1.personalGroupId,
        memberRole.id,
        steward.personalGroupId,
      );

      // Promote member1 to Steward too
      await admin.from('user_group_roles').insert({
        member_group_id: member1.personalGroupId,
        group_id: group.id,
        group_role_id: stewardRole.id,
        assigned_by_group_id: steward.personalGroupId,
      });

      // Act: steward leaves (not sole steward — member1 is also steward)
      const supabase = createTestClient();
      await signInWithRetry(supabase, steward.email, steward.password);

      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: group.id,
      });

      expect(error).toBeNull();

      // Verify: DeusEx was NOT added to the group
      const { data: deusexMembership } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', group.id)
        .eq('member_group_id', deusexGroupId)
        .maybeSingle();

      expect(deusexMembership).toBeNull();

      // Verify: steward's membership deleted, member1 still there
      const { data: remaining } = await admin
        .from('group_memberships')
        .select('member_group_id')
        .eq('group_id', group.id)
        .eq('status', 'active');

      expect(remaining!.length).toBeGreaterThanOrEqual(1);
      expect(
        remaining!.some((m: any) => m.member_group_id === member1.personalGroupId),
      ).toBe(true);

      await supabase.auth.signOut();
    });
  });

  // ─── L3: Group Closure (Last Member Leaves) ──────────────────────────

  describe('B-GRP-010: Group Closure', () => {
    it('should set group status to closed when last member leaves', async () => {
      // Setup: group with only loneUser
      const { group } = await createEngagementGroup(
        'LG-L3-Close',
        loneUser.personalGroupId,
      );

      // Act: last member leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, loneUser.email, loneUser.password);

      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: group.id,
      });

      expect(error).toBeNull();

      // Verify: group status is 'closed'
      const { data: closedGroup } = await admin
        .from('groups')
        .select('status')
        .eq('id', group.id)
        .single();

      expect(closedGroup!.status).toBe('closed');

      await supabase.auth.signOut();
    });

    it('should freeze ALL group journey enrollments on closure', async () => {
      // Setup: group with loneUser + journey + enrollment
      const { group } = await createEngagementGroup(
        'LG-L3-FreezeAll',
        loneUser.personalGroupId,
      );

      const journey = await createNonPublicJourney(
        'LG-L3-Journey',
        group.id,
      );

      // Enroll loneUser's personal group
      const enrollment = await enrollInJourney(
        journey.id,
        loneUser.personalGroupId,
      );

      // Act: last member leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, loneUser.email, loneUser.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: enrollment frozen with reason 'group_closed'
      const { data: updatedEnrollment } = await admin
        .from('journey_enrollments')
        .select('status, progress_data')
        .eq('id', enrollment.id)
        .single();

      expect(updatedEnrollment!.status).toBe('frozen');
      expect(updatedEnrollment!.progress_data).toHaveProperty(
        'frozen_reason',
        'group_closed',
      );

      await supabase.auth.signOut();
    });

    it('should transfer non-public journeys to DeusEx on group closure', async () => {
      // Setup: group with loneUser + non-public journey owned by group
      const { group } = await createEngagementGroup(
        'LG-L3-Transfer',
        loneUser.personalGroupId,
      );

      const journey = await createNonPublicJourney(
        'LG-L3-NonPublic',
        group.id,
      );

      // Act: last member leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, loneUser.email, loneUser.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: journey transferred to DeusEx
      const { data: updatedJourney } = await admin
        .from('journeys')
        .select('created_by_group_id')
        .eq('id', journey.id)
        .single();

      expect(updatedJourney!.created_by_group_id).toBe(deusexGroupId);

      await supabase.auth.signOut();
    });

    it('should NOT transfer public journeys to DeusEx on group closure', async () => {
      // Setup: group with loneUser + PUBLIC journey owned by group
      const { group } = await createEngagementGroup(
        'LG-L3-PublicKeep',
        loneUser.personalGroupId,
      );

      const { data: publicJourney } = await admin
        .from('journeys')
        .insert({
          title: 'LG-L3-Public Journey',
          description: 'Public journey stays with closed group',
          created_by_group_id: group.id,
          is_published: true,
          is_public: true,
          journey_type: 'predefined',
          content: {
            version: '1.0',
            structure: 'linear',
            steps: [{ id: 'step_1', title: 'S1', type: 'content', duration_minutes: 5, required: true }],
          },
        })
        .select()
        .single();

      createdJourneyIds.push(publicJourney!.id);

      // Act: last member leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, loneUser.email, loneUser.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: public journey NOT transferred — still owned by the group
      const { data: updatedJourney } = await admin
        .from('journeys')
        .select('created_by_group_id')
        .eq('id', publicJourney!.id)
        .single();

      expect(updatedJourney!.created_by_group_id).toBe(group.id);

      await supabase.auth.signOut();
    });

    it('should notify DeusEx when non-public journeys are orphaned on closure', async () => {
      // Setup: group with loneUser + non-public journey
      const { group } = await createEngagementGroup(
        'LG-L3-NotifyDeusEx',
        loneUser.personalGroupId,
      );

      const journey = await createNonPublicJourney(
        'LG-L3-OrphanNotify',
        group.id,
      );

      // Clear DeusEx notifications
      await admin
        .from('notifications')
        .delete()
        .eq('recipient_group_id', deusexGroupId)
        .eq('group_id', group.id);

      // Act: last member leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, loneUser.email, loneUser.password);

      await supabase.rpc('leave_group', { p_group_id: group.id });

      // Verify: DeusEx received notification about orphaned journeys
      const { data: notifications } = await admin
        .from('notifications')
        .select('type, title, body')
        .eq('recipient_group_id', deusexGroupId)
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const hasClosureNotification = notifications!.some(
        (n: any) =>
          n.body?.toLowerCase().includes('closed') ||
          n.body?.toLowerCase().includes('journey') ||
          n.type === 'group_closed',
      );
      expect(hasClosureNotification).toBe(true);

      await supabase.auth.signOut();
    });

    it('should handle last member who is sole Steward (closure, no handover)', async () => {
      // Setup: group with only steward (sole member AND sole steward)
      const { group } = await createEngagementGroup(
        'LG-L3-SoleSteward',
        loneUser.personalGroupId,
      );

      // Act: last member (who is also sole steward) leaves
      const supabase = createTestClient();
      await signInWithRetry(supabase, loneUser.email, loneUser.password);

      const { data, error } = await supabase.rpc('leave_group', {
        p_group_id: group.id,
      });

      // Should succeed — group closes, no DeusEx handover needed
      expect(error).toBeNull();

      // Verify: group is closed (not just steward transferred)
      const { data: closedGroup } = await admin
        .from('groups')
        .select('status')
        .eq('id', group.id)
        .single();

      expect(closedGroup!.status).toBe('closed');

      await supabase.auth.signOut();
    });
  });
});
