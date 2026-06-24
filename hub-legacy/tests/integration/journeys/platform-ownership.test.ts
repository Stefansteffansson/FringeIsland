/**
 * Integration Tests: B-JRN-008 — Platform Journey Ownership
 *
 * Sprint 1: Foundation Schema (F2)
 *
 * Verifies that:
 * - "FringeIsland Journeys" engagement group exists with correct properties
 * - All 8 predefined journeys are owned by the FI Journeys group
 * - All 8 predefined journeys are public and published
 * - DeusEx has Steward role in the FI Journeys group
 * - FI Journeys group is visible to regular users (public + active)
 * - Existing enrollments are not broken by the ownership migration
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

// The 8 predefined journey titles (seeded in migration #9)
const PREDEFINED_JOURNEY_TITLES = [
  'Leadership Fundamentals',
  'Effective Communication Skills',
  'Building High-Performance Teams',
  'Personal Development Kickstart',
  'Strategic Decision Making',
  'Emotional Intelligence at Work',
  'Agile Team Collaboration',
  'Resilience and Stress Management',
];

describe('B-JRN-008: Platform Journey Ownership', () => {
  let regularUser: any;
  let fiJourneysGroup: any; // looked up, not created
  let predefinedJourneys: any[];

  const admin = createAdminClient();

  beforeAll(async () => {
    // Create a regular user for visibility checks
    regularUser = await createTestUser({ displayName: 'JRN-008 Regular' });

    // Look up the FringeIsland Journeys group (should exist after migration)
    const { data: fiGroup } = await admin
      .from('groups')
      .select('*')
      .eq('name', 'FringeIsland Journeys')
      .eq('group_type', 'engagement')
      .maybeSingle();

    fiJourneysGroup = fiGroup;

    // Look up predefined journeys
    const { data: journeys } = await admin
      .from('journeys')
      .select('id, title, is_public, is_published, created_by_group_id, journey_type')
      .in('title', PREDEFINED_JOURNEY_TITLES);

    predefinedJourneys = journeys || [];
  }, 30000);

  afterAll(async () => {
    if (regularUser) await cleanupTestUser(regularUser.user.id);
  });

  // ─── FringeIsland Journeys Group Existence ───────────────────────────

  it('should have a "FringeIsland Journeys" group with group_type=engagement', async () => {
    expect(fiJourneysGroup).not.toBeNull();
    expect(fiJourneysGroup.name).toBe('FringeIsland Journeys');
    expect(fiJourneysGroup.group_type).toBe('engagement');
  });

  it('should have FI Journeys group with is_public=true', async () => {
    expect(fiJourneysGroup).not.toBeNull();
    expect(fiJourneysGroup.is_public).toBe(true);
  });

  it('should have FI Journeys group with status=active', async () => {
    expect(fiJourneysGroup).not.toBeNull();
    expect(fiJourneysGroup.status).toBe('active');
  });

  // ─── Predefined Journey Ownership ────────────────────────────────────

  it('should have all 8 predefined journeys in the database', async () => {
    expect(predefinedJourneys).toHaveLength(8);

    const titles = predefinedJourneys.map((j: any) => j.title);
    for (const expectedTitle of PREDEFINED_JOURNEY_TITLES) {
      expect(titles).toContain(expectedTitle);
    }
  });

  it('should have all predefined journeys owned by the FI Journeys group', async () => {
    expect(fiJourneysGroup).not.toBeNull();

    for (const journey of predefinedJourneys) {
      expect(journey.created_by_group_id).toBe(fiJourneysGroup.id);
    }
  });

  it('should have all predefined journeys with is_public=true', async () => {
    for (const journey of predefinedJourneys) {
      expect(journey.is_public).toBe(true);
    }
  });

  it('should have all predefined journeys with is_published=true', async () => {
    for (const journey of predefinedJourneys) {
      expect(journey.is_published).toBe(true);
    }
  });

  // ─── DeusEx Steward Role ─────────────────────────────────────────────

  it('should have DeusEx as Steward of the FI Journeys group', async () => {
    expect(fiJourneysGroup).not.toBeNull();

    // Look up DeusEx system group
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    expect(deusexGroup).not.toBeNull();

    // Check DeusEx is a member of FI Journeys group
    const { data: membership } = await admin
      .from('group_memberships')
      .select('id, status')
      .eq('group_id', fiJourneysGroup.id)
      .eq('member_group_id', deusexGroup!.id)
      .maybeSingle();

    expect(membership).not.toBeNull();
    expect(membership!.status).toBe('active');

    // Check DeusEx has Steward role in FI Journeys group
    const { data: stewardRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', fiJourneysGroup.id)
      .eq('name', 'Steward')
      .maybeSingle();

    expect(stewardRole).not.toBeNull();

    const { data: roleAssignment } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_id', fiJourneysGroup.id)
      .eq('member_group_id', deusexGroup!.id)
      .eq('group_role_id', stewardRole!.id)
      .maybeSingle();

    expect(roleAssignment).not.toBeNull();
  });

  // ─── Public Visibility ───────────────────────────────────────────────

  it('should be visible to regular users as a public group', async () => {
    expect(fiJourneysGroup).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, regularUser.email, regularUser.password);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, is_public')
      .eq('id', fiJourneysGroup.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe('FringeIsland Journeys');
    expect(data![0].is_public).toBe(true);

    await supabase.auth.signOut();
  });

  // ─── Enrollment Integrity ────────────────────────────────────────────

  it('should not break existing enrollment records after ownership migration', async () => {
    // Enroll regularUser in a predefined journey, then verify ownership change didn't affect it
    if (predefinedJourneys.length === 0) {
      // Skip if no predefined journeys (migration not yet applied)
      expect(predefinedJourneys.length).toBeGreaterThan(0);
      return;
    }

    const targetJourney = predefinedJourneys[0];

    // Create enrollment via admin (simulating existing enrollment)
    const { data: enrollment, error: enrollError } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: targetJourney.id,
        group_id: regularUser.personalGroupId,
        enrolled_by_group_id: regularUser.personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    expect(enrollError).toBeNull();
    expect(enrollment).not.toBeNull();

    // Verify enrollment references the journey (not the owning group)
    expect(enrollment!.journey_id).toBe(targetJourney.id);

    // Verify the journey's owner is FI Journeys group
    const { data: journey } = await admin
      .from('journeys')
      .select('created_by_group_id')
      .eq('id', targetJourney.id)
      .single();

    expect(journey!.created_by_group_id).toBe(fiJourneysGroup.id);

    // Cleanup the test enrollment
    await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
  });
});
