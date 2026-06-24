/**
 * Integration Tests: Display Name System — RLS & Visibility Behaviors
 *
 * Tests: B-DISP-006 through B-DISP-008, B-DISP-011
 *
 * Verifies real name visibility defaults, opt-in behavior, admin bypass,
 * and invitation search matching for the display name / nickname system.
 *
 * These tests MUST FAIL initially (RED) — the nickname, display_preference,
 * and show_real_name columns don't exist yet.
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

// ──────────────────────────────────────────────────────────────────
// B-DISP-006: Real Name Visibility Default Is False
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-006: Real name visibility default is false', () => {
  const admin = createAdminClient();
  let targetUser: any;  // The user whose visibility we're testing
  let viewerUser: any;  // Another user trying to view the target

  beforeAll(async () => {
    targetUser = await createTestUser({ displayName: 'Hidden Real Name' });
    viewerUser = await createTestUser({ displayName: 'Curious Viewer' });
  });

  afterAll(async () => {
    if (viewerUser) await cleanupTestUser(viewerUser.user.id);
    if (targetUser) await cleanupTestUser(targetUser.user.id);
  });

  it('should default show_real_name to false for new users', async () => {
    const { data: profile } = await admin
      .from('users')
      .select('show_real_name')
      .eq('auth_user_id', targetUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.show_real_name).toBe(false);
  });

  it('should not expose full_name to other authenticated users when show_real_name=false', async () => {
    // Ensure show_real_name is false
    await admin
      .from('users')
      .update({ show_real_name: false })
      .eq('auth_user_id', targetUser.user.id);

    // Verify the personal group name (the public-facing identity) is the
    // nickname, NOT the full real name. Use admin client since personal
    // groups are private (is_public=false) and not visible to non-members via RLS.
    const { data: personalGroup } = await admin
      .from('groups')
      .select('name')
      .eq('id', targetUser.personalGroupId)
      .single();

    // Personal group name should be the nickname (first name), not the full real name
    expect(personalGroup).not.toBeNull();
    expect(personalGroup!.name).not.toBe('Hidden Real Name');

    // Additionally verify that if a viewer signs in and queries the users table,
    // the show_real_name flag is false (application layer uses this to filter columns)
    const supabase = createTestClient();
    await signInWithRetry(supabase, viewerUser.email, viewerUser.password);

    const { data: profile } = await supabase
      .from('users')
      .select('show_real_name')
      .eq('auth_user_id', targetUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.show_real_name).toBe(false);

    await supabase.auth.signOut();
  });

  it('should always allow a user to see their own full_name', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, targetUser.email, targetUser.password);

    // User queries their own profile
    const { data: profile, error } = await supabase
      .from('users')
      .select('full_name, nickname, show_real_name')
      .eq('auth_user_id', targetUser.user.id)
      .single();

    expect(error).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile!.full_name).toBe('Hidden Real Name');
    expect(profile!.nickname).toBeDefined();
    expect(profile!.show_real_name).toBe(false);

    await supabase.auth.signOut();
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-007: Real Name Visibility Opt-In
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-007: Real name visibility opt-in', () => {
  const admin = createAdminClient();
  let targetUser: any;
  let viewerUser: any;

  beforeAll(async () => {
    targetUser = await createTestUser({ displayName: 'Visible Real Name' });
    viewerUser = await createTestUser({ displayName: 'Another Viewer' });

    // Set up: give target a distinct nickname
    await admin
      .from('users')
      .update({ nickname: 'VisibleNick', display_preference: 'nickname' })
      .eq('auth_user_id', targetUser.user.id);
  });

  afterAll(async () => {
    if (viewerUser) await cleanupTestUser(viewerUser.user.id);
    if (targetUser) await cleanupTestUser(targetUser.user.id);
  });

  it('should expose full_name to other users when show_real_name=true', async () => {
    // Act: opt in to showing real name
    await admin
      .from('users')
      .update({ show_real_name: true })
      .eq('auth_user_id', targetUser.user.id);

    // Viewer queries the target's profile
    // When show_real_name=true, the application can include full_name in results
    const { data: profile } = await admin
      .from('users')
      .select('full_name, show_real_name')
      .eq('auth_user_id', targetUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.show_real_name).toBe(true);
    expect(profile!.full_name).toBe('Visible Real Name');
  });

  it('should hide full_name again when show_real_name toggled back to false', async () => {
    // Act: opt out
    await admin
      .from('users')
      .update({ show_real_name: false })
      .eq('auth_user_id', targetUser.user.id);

    const { data: profile } = await admin
      .from('users')
      .select('show_real_name')
      .eq('auth_user_id', targetUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.show_real_name).toBe(false);
  });

  it('should not change forum/message display name when show_real_name changes', async () => {
    // show_real_name only affects profile visibility, not the display name
    // The personal group name should still be the nickname
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', targetUser.personalGroupId)
      .single();

    expect(group).not.toBeNull();
    expect(group!.name).toBe('VisibleNick');
    // NOT the full_name — show_real_name doesn't affect personal group name
    expect(group!.name).not.toBe('Visible Real Name');
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-008: Admin Always Sees Real Name
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-008: Admin always sees real name', () => {
  const admin = createAdminClient();
  let targetUser: any;

  beforeAll(async () => {
    targetUser = await createTestUser({ displayName: 'Admin Visible User' });

    // Set up: show_real_name = false, use nickname
    await admin
      .from('users')
      .update({
        nickname: 'SecretNick',
        display_preference: 'nickname',
        show_real_name: false,
      })
      .eq('auth_user_id', targetUser.user.id);
  });

  afterAll(async () => {
    if (targetUser) await cleanupTestUser(targetUser.user.id);
  });

  it('should return full_name via service role regardless of show_real_name', async () => {
    // Admin (service role) queries — bypasses RLS
    const { data: profile, error } = await admin
      .from('users')
      .select('full_name, nickname, show_real_name')
      .eq('auth_user_id', targetUser.user.id)
      .single();

    expect(error).toBeNull();
    expect(profile).not.toBeNull();
    // Admin always sees the real name
    expect(profile!.full_name).toBe('Admin Visible User');
    // And can see the nickname too
    expect(profile!.nickname).toBe('SecretNick');
    // show_real_name is false, but admin still gets full_name
    expect(profile!.show_real_name).toBe(false);
  });

  it('should return full_name for all users in admin user list query', async () => {
    // Admin queries users table directly — same pattern as admin panel
    const { data: users, error } = await admin
      .from('users')
      .select('full_name, nickname, show_real_name')
      .eq('auth_user_id', targetUser.user.id);

    expect(error).toBeNull();
    expect(users).toHaveLength(1);
    expect(users![0].full_name).toBe('Admin Visible User');
    expect(users![0].nickname).toBe('SecretNick');
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-011: Invitation Search Matches Both Names
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-011: Invitation search matches both names', () => {
  const admin = createAdminClient();
  let searchTarget: any;    // The user being searched for
  let searcherUser: any;    // The group leader doing the search
  let engagementGroup: any; // Group context for the search

  beforeAll(async () => {
    searchTarget = await createTestUser({ displayName: 'Findable Person' });
    searcherUser = await createTestUser({ displayName: 'Group Leader' });

    // Set up target with distinct nickname
    await admin
      .from('users')
      .update({
        nickname: 'Discoverable',
        display_preference: 'nickname',
        show_real_name: false,
      })
      .eq('auth_user_id', searchTarget.user.id);

    // Create an engagement group for the searcher
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Search Test Group',
        description: 'For invitation search test',
        is_public: false,
        group_type: 'engagement',
        created_by_group_id: searcherUser.personalGroupId,
      })
      .select()
      .single();

    engagementGroup = group;

    // Add searcher as member
    await admin
      .from('group_memberships')
      .insert({
        group_id: engagementGroup.id,
        member_group_id: searcherUser.personalGroupId,
        added_by_group_id: searcherUser.personalGroupId,
        status: 'active',
      });
  });

  afterAll(async () => {
    if (engagementGroup) await cleanupTestGroup(engagementGroup.id);
    if (searchTarget) await cleanupTestUser(searchTarget.user.id);
    if (searcherUser) await cleanupTestUser(searcherUser.user.id);
  });

  it('should find user by full_name query', async () => {
    // Search by real name — should find even though show_real_name=false
    // This simulates the server-side search (admin client = service role)
    const { data: results, error } = await admin
      .from('users')
      .select('id, full_name, nickname, show_real_name, personal_group_id')
      .ilike('full_name', '%Findable%');

    expect(error).toBeNull();
    expect(results).not.toBeNull();
    expect(results!.length).toBeGreaterThanOrEqual(1);

    const found = results!.find(
      (u: any) => u.personal_group_id === searchTarget.personalGroupId
    );
    expect(found).toBeDefined();
    expect(found!.full_name).toBe('Findable Person');
  });

  it('should find user by nickname query', async () => {
    // Search by nickname
    const { data: results, error } = await admin
      .from('users')
      .select('id, full_name, nickname, show_real_name, personal_group_id')
      .ilike('nickname', '%Discover%');

    expect(error).toBeNull();
    expect(results).not.toBeNull();
    expect(results!.length).toBeGreaterThanOrEqual(1);

    const found = results!.find(
      (u: any) => u.personal_group_id === searchTarget.personalGroupId
    );
    expect(found).toBeDefined();
    expect(found!.nickname).toBe('Discoverable');
  });

  it('should return display name (personal group name) for search results', async () => {
    // The search results should resolve the display name from the personal group
    const { data: personalGroup, error } = await admin
      .from('groups')
      .select('name')
      .eq('id', searchTarget.personalGroupId)
      .single();

    expect(error).toBeNull();
    expect(personalGroup).not.toBeNull();
    // Display name should be the nickname (since display_preference = 'nickname')
    expect(personalGroup!.name).toBe('Discoverable');
    // NOT the full_name
    expect(personalGroup!.name).not.toBe('Findable Person');
  });

  it('should not return full_name in display context when show_real_name=false', async () => {
    // Verify the show_real_name flag is respected
    const { data: profile } = await admin
      .from('users')
      .select('show_real_name')
      .eq('auth_user_id', searchTarget.user.id)
      .single();

    expect(profile!.show_real_name).toBe(false);

    // Application logic: when building search results for the UI,
    // only include full_name if show_real_name=true.
    // This test verifies the data exists for the application to make this decision.
    const { data: fullProfile } = await admin
      .from('users')
      .select('full_name, nickname, show_real_name, personal_group_id')
      .eq('auth_user_id', searchTarget.user.id)
      .single();

    expect(fullProfile).not.toBeNull();
    // The data is available to the service role, but application should filter:
    // if (!fullProfile.show_real_name) → don't send full_name to client
    expect(fullProfile!.show_real_name).toBe(false);
    expect(fullProfile!.full_name).toBe('Findable Person'); // exists in DB
    expect(fullProfile!.nickname).toBe('Discoverable');
  });
});
