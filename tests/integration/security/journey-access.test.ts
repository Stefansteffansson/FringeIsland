/**
 * Integration Tests: Security - Journey Access Control
 *
 * Tests: B-SEC-001 (Non-Public Journey Visibility) + B-SEC-002 (Non-Public Journey Enrollment Gating)
 *
 * Verifies that:
 * - Non-public journeys are only visible to members of the owning group (RLS)
 * - Non-public journeys are also visible to users enrolled in them
 * - Public journeys remain visible to all authenticated users
 * - Enrollment in non-public journeys is blocked for non-members (RLS)
 * - Direct Supabase API calls respect RLS (not just UI gating)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestJourney,
  cleanupTestGroup,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';
import { testJourney } from '@/tests/helpers/fixtures';

describe('B-SEC-001 + B-SEC-002: Non-Public Journey Access Control', () => {
  // Users
  let ownerUser: any;      // Member of owning group — should see non-public journey
  let outsiderUser: any;   // NOT a member — should NOT see non-public journey
  let enrolledUser: any;   // Not a member, but enrolled — should see non-public journey

  // Groups
  let owningGroup: any;    // Engagement group that owns the non-public journey

  // Journeys
  let publicJourney: any;     // is_public = true, is_published = true
  let nonPublicJourney: any;  // is_public = false, is_published = true
  let unpublishedJourney: any; // is_public = false, is_published = false

  const admin = createAdminClient();

  beforeAll(async () => {
    // Create test users
    ownerUser = await createTestUser({ displayName: 'SEC Owner' });
    outsiderUser = await createTestUser({ displayName: 'SEC Outsider' });
    enrolledUser = await createTestUser({ displayName: 'SEC Enrolled' });

    // Create an engagement group (the owning group for non-public journeys)
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'SEC Test Owning Group',
        description: 'Group that owns non-public journeys',
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: ownerUser.personalGroupId,
      })
      .select()
      .single();

    owningGroup = group;

    // Add ownerUser as member of owning group
    await admin
      .from('group_memberships')
      .insert({
        group_id: owningGroup.id,
        member_group_id: ownerUser.personalGroupId,
        added_by_group_id: ownerUser.personalGroupId,
        status: 'active',
      });

    // Create Steward role and assign to ownerUser
    const { data: role } = await admin
      .from('group_roles')
      .insert({
        group_id: owningGroup.id,
        name: 'Steward',
      })
      .select()
      .single();

    await admin
      .from('user_group_roles')
      .insert({
        member_group_id: ownerUser.personalGroupId,
        group_id: owningGroup.id,
        group_role_id: role!.id,
        assigned_by_group_id: ownerUser.personalGroupId,
      });

    // Create a PUBLIC, published journey (visible to everyone)
    const { data: pubJ } = await admin
      .from('journeys')
      .insert({
        ...testJourney,
        title: 'SEC Public Journey',
        is_published: true,
        is_public: true,
        created_by_group_id: owningGroup.id,
      })
      .select()
      .single();

    publicJourney = pubJ;

    // Create a NON-PUBLIC, published journey (visible only to owning group members + enrolled users)
    const { data: npJ } = await admin
      .from('journeys')
      .insert({
        ...testJourney,
        title: 'SEC Non-Public Journey',
        is_published: true,
        is_public: false,
        created_by_group_id: owningGroup.id,
      })
      .select()
      .single();

    nonPublicJourney = npJ;

    // Create an UNPUBLISHED, non-public journey (visible to nobody)
    const { data: unJ } = await admin
      .from('journeys')
      .insert({
        ...testJourney,
        title: 'SEC Unpublished Journey',
        is_published: false,
        is_public: false,
        created_by_group_id: owningGroup.id,
      })
      .select()
      .single();

    unpublishedJourney = unJ;

    // Enroll the enrolledUser in the non-public journey (via admin, simulating prior enrollment)
    await admin
      .from('journey_enrollments')
      .insert({
        journey_id: nonPublicJourney.id,
        group_id: enrolledUser.personalGroupId,
        enrolled_by_group_id: enrolledUser.personalGroupId,
        status: 'active',
        progress_data: {},
      });
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation
    if (publicJourney) await cleanupTestJourney(publicJourney.id);
    if (nonPublicJourney) await cleanupTestJourney(nonPublicJourney.id);
    if (unpublishedJourney) await cleanupTestJourney(unpublishedJourney.id);
    if (owningGroup) await cleanupTestGroup(owningGroup.id);
    if (ownerUser) await cleanupTestUser(ownerUser.user.id);
    if (outsiderUser) await cleanupTestUser(outsiderUser.user.id);
    if (enrolledUser) await cleanupTestUser(enrolledUser.user.id);
  });

  // ─── B-SEC-001: Non-Public Journey Visibility ───────────────────────

  describe('B-SEC-001: Non-Public Journey Visibility (RLS)', () => {
    it('should allow any authenticated user to see PUBLIC published journeys', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, outsiderUser.email, outsiderUser.password);

      const { data: journeys, error } = await supabase
        .from('journeys')
        .select('id, title, is_public, is_published')
        .eq('id', publicJourney.id);

      expect(error).toBeNull();
      expect(journeys).toHaveLength(1);
      expect(journeys![0].title).toBe('SEC Public Journey');
      expect(journeys![0].is_public).toBe(true);

      await supabase.auth.signOut();
    });

    it('should HIDE non-public journeys from non-members (RLS enforcement)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, outsiderUser.email, outsiderUser.password);

      const { data: journeys, error } = await supabase
        .from('journeys')
        .select('id, title, is_public')
        .eq('id', nonPublicJourney.id);

      expect(error).toBeNull();
      // Non-member should NOT see the non-public journey
      expect(journeys).toHaveLength(0);

      await supabase.auth.signOut();
    });

    it('should SHOW non-public journeys to members of the owning group', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, ownerUser.email, ownerUser.password);

      const { data: journeys, error } = await supabase
        .from('journeys')
        .select('id, title, is_public')
        .eq('id', nonPublicJourney.id);

      expect(error).toBeNull();
      expect(journeys).toHaveLength(1);
      expect(journeys![0].title).toBe('SEC Non-Public Journey');

      await supabase.auth.signOut();
    });

    it('should SHOW non-public journeys to users with active enrollment', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, enrolledUser.email, enrolledUser.password);

      const { data: journeys, error } = await supabase
        .from('journeys')
        .select('id, title, is_public')
        .eq('id', nonPublicJourney.id);

      expect(error).toBeNull();
      // Enrolled user should see the non-public journey even though they're not a group member
      expect(journeys).toHaveLength(1);
      expect(journeys![0].title).toBe('SEC Non-Public Journey');

      await supabase.auth.signOut();
    });

    it('should HIDE unpublished journeys from everyone (even group members)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, ownerUser.email, ownerUser.password);

      const { data: journeys, error } = await supabase
        .from('journeys')
        .select('id, title')
        .eq('id', unpublishedJourney.id);

      expect(error).toBeNull();
      // Unpublished = not visible to anyone (is_published = false takes precedence)
      expect(journeys).toHaveLength(0);

      await supabase.auth.signOut();
    });

    it('should prevent direct UUID access to non-public journeys by non-members', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, outsiderUser.email, outsiderUser.password);

      // Try to access by exact UUID (simulating a direct API call)
      const { data: journey, error } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', nonPublicJourney.id)
        .maybeSingle();

      // RLS should filter it out — no error, just null
      expect(journey).toBeNull();

      await supabase.auth.signOut();
    });
  });

  // ─── B-SEC-002: Non-Public Journey Enrollment Gating ────────────────

  describe('B-SEC-002: Non-Public Journey Enrollment Gating (RLS)', () => {
    it('should allow enrollment in PUBLIC journeys by any authenticated user', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, outsiderUser.email, outsiderUser.password);

      const { data: enrollment, error } = await supabase
        .from('journey_enrollments')
        .insert({
          journey_id: publicJourney.id,
          group_id: outsiderUser.personalGroupId,
          enrolled_by_group_id: outsiderUser.personalGroupId,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(enrollment).toBeDefined();
      expect(enrollment!.journey_id).toBe(publicJourney.id);

      // Cleanup
      await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
      await supabase.auth.signOut();
    });

    it('should BLOCK enrollment in non-public journeys by non-members (RLS)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, outsiderUser.email, outsiderUser.password);

      // Outsider tries to enroll in non-public journey — should be blocked by RLS
      const { data: enrollment, error } = await supabase
        .from('journey_enrollments')
        .insert({
          journey_id: nonPublicJourney.id,
          group_id: outsiderUser.personalGroupId,
          enrolled_by_group_id: outsiderUser.personalGroupId,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      // RLS should block this — non-member cannot enroll in non-public journey
      expect(error).not.toBeNull();
      expect(enrollment).toBeNull();

      await supabase.auth.signOut();
    });

    it('should ALLOW enrollment in non-public journeys by owning group members', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, ownerUser.email, ownerUser.password);

      // Owner (member of owning group) enrolls in non-public journey
      const { data: enrollment, error } = await supabase
        .from('journey_enrollments')
        .insert({
          journey_id: nonPublicJourney.id,
          group_id: ownerUser.personalGroupId,
          enrolled_by_group_id: ownerUser.personalGroupId,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(enrollment).toBeDefined();
      expect(enrollment!.journey_id).toBe(nonPublicJourney.id);

      // Cleanup
      await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
      await supabase.auth.signOut();
    });

    it('should BLOCK group enrollment in non-public journeys by non-member groups', async () => {
      // Create a separate group that outsiderUser leads
      const { data: outsiderGroup } = await admin
        .from('groups')
        .insert({
          name: 'SEC Outsider Group',
          description: 'Group not related to owning group',
          group_type: 'engagement',
          created_by_group_id: outsiderUser.personalGroupId,
        })
        .select()
        .single();

      // Add outsiderUser as member + Steward
      await admin
        .from('group_memberships')
        .insert({
          group_id: outsiderGroup!.id,
          member_group_id: outsiderUser.personalGroupId,
          added_by_group_id: outsiderUser.personalGroupId,
          status: 'active',
        });

      const { data: role } = await admin
        .from('group_roles')
        .insert({
          group_id: outsiderGroup!.id,
          name: 'Steward',
        })
        .select()
        .single();

      await admin
        .from('user_group_roles')
        .insert({
          member_group_id: outsiderUser.personalGroupId,
          group_id: outsiderGroup!.id,
          group_role_id: role!.id,
          assigned_by_group_id: outsiderUser.personalGroupId,
        });

      const supabase = createTestClient();
      await signInWithRetry(supabase, outsiderUser.email, outsiderUser.password);

      // Outsider's group tries to enroll in non-public journey owned by a different group
      const { data: enrollment, error } = await supabase
        .from('journey_enrollments')
        .insert({
          journey_id: nonPublicJourney.id,
          group_id: outsiderGroup!.id,
          enrolled_by_group_id: outsiderUser.personalGroupId,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      // Should be blocked — outsider's group is not the owning group
      expect(error).not.toBeNull();
      expect(enrollment).toBeNull();

      // Cleanup
      await cleanupTestGroup(outsiderGroup!.id);
      await supabase.auth.signOut();
    });
  });
});
