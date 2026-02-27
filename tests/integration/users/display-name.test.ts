/**
 * Integration Tests: Display Name System — Core DB Behaviors
 *
 * Tests: B-DISP-001 through B-DISP-005, B-DISP-009
 *
 * Verifies nickname defaulting, display preference toggle, sync trigger,
 * and database constraints for the display name / nickname system.
 *
 * These tests MUST FAIL initially (RED) — the nickname column, sync trigger,
 * and updated handle_new_user() don't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  createAdminClient,
} from '@/tests/helpers/supabase';

// ──────────────────────────────────────────────────────────────────
// B-DISP-001: Nickname Defaults to First Name on Signup
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-001: Nickname defaults to first name on signup', () => {
  const admin = createAdminClient();
  let twoWordUser: any;
  let singleWordUser: any;
  let multiWordUser: any;

  beforeAll(async () => {
    twoWordUser = await createTestUser({ displayName: 'Stefan Stefansson' });
    singleWordUser = await createTestUser({ displayName: 'Madonna' });
    multiWordUser = await createTestUser({ displayName: 'Mary Jo Smith' });
  });

  afterAll(async () => {
    if (twoWordUser) await cleanupTestUser(twoWordUser.user.id);
    if (singleWordUser) await cleanupTestUser(singleWordUser.user.id);
    if (multiWordUser) await cleanupTestUser(multiWordUser.user.id);
  });

  it('should set nickname to first word of full_name (two-word name)', async () => {
    const { data: profile } = await admin
      .from('users')
      .select('nickname, display_preference')
      .eq('auth_user_id', twoWordUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.nickname).toBe('Stefan');
    expect(profile!.display_preference).toBe('nickname');
  });

  it('should set personal group name to nickname (not full_name) on signup', async () => {
    const { data: personalGroup } = await admin
      .from('groups')
      .select('name')
      .eq('id', twoWordUser.personalGroupId)
      .single();

    expect(personalGroup).not.toBeNull();
    expect(personalGroup!.name).toBe('Stefan');
  });

  it('should handle single-word full_name (no space)', async () => {
    const { data: profile } = await admin
      .from('users')
      .select('nickname')
      .eq('auth_user_id', singleWordUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.nickname).toBe('Madonna');

    const { data: personalGroup } = await admin
      .from('groups')
      .select('name')
      .eq('id', singleWordUser.personalGroupId)
      .single();

    expect(personalGroup).not.toBeNull();
    expect(personalGroup!.name).toBe('Madonna');
  });

  it('should use first word only for multi-word names', async () => {
    const { data: profile } = await admin
      .from('users')
      .select('nickname')
      .eq('auth_user_id', multiWordUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.nickname).toBe('Mary');

    const { data: personalGroup } = await admin
      .from('groups')
      .select('name')
      .eq('id', multiWordUser.personalGroupId)
      .single();

    expect(personalGroup).not.toBeNull();
    expect(personalGroup!.name).toBe('Mary');
  });

  it('should default show_real_name to false', async () => {
    const { data: profile } = await admin
      .from('users')
      .select('show_real_name')
      .eq('auth_user_id', twoWordUser.user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile!.show_real_name).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-002: Display Preference Toggle Syncs Personal Group Name
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-002: Display preference toggle syncs personal group name', () => {
  const admin = createAdminClient();
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Toggle Test User' });

    // Set a distinct nickname so we can tell which is active
    await admin
      .from('users')
      .update({ nickname: 'Mogwai' })
      .eq('auth_user_id', testUser.user.id);
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should update personal group name to full_name when preference set to real_name', async () => {
    // Act: switch to real_name
    const { error } = await admin
      .from('users')
      .update({ display_preference: 'real_name' })
      .eq('auth_user_id', testUser.user.id);

    expect(error).toBeNull();

    // Assert: personal group name should be the full_name
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(group).not.toBeNull();
    expect(group!.name).toBe('Toggle Test User');
  });

  it('should update personal group name to nickname when preference set to nickname', async () => {
    // Act: switch back to nickname
    const { error } = await admin
      .from('users')
      .update({ display_preference: 'nickname' })
      .eq('auth_user_id', testUser.user.id);

    expect(error).toBeNull();

    // Assert: personal group name should be the nickname
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(group).not.toBeNull();
    expect(group!.name).toBe('Mogwai');
  });

  it('should not update personal group name when unrelated column changes', async () => {
    // First, confirm current personal group name
    const { data: before } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    const nameBefore = before!.name;

    // Act: update an unrelated column (bio)
    await admin
      .from('users')
      .update({ bio: 'Updated bio text' })
      .eq('auth_user_id', testUser.user.id);

    // Assert: personal group name unchanged
    const { data: after } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(after!.name).toBe(nameBefore);
  });

  it('should reject invalid display_preference values', async () => {
    const { error } = await admin
      .from('users')
      .update({ display_preference: 'invalid_value' } as any)
      .eq('auth_user_id', testUser.user.id);

    expect(error).not.toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-003: Nickname Edit Syncs When Preference Is Nickname
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-003: Nickname edit syncs when preference = nickname', () => {
  const admin = createAdminClient();
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Sync Test User' });

    // Set up: nickname = Mogwai, display_preference = nickname
    await admin
      .from('users')
      .update({ nickname: 'Mogwai', display_preference: 'nickname' })
      .eq('auth_user_id', testUser.user.id);
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should update personal group name when nickname changes (preference=nickname)', async () => {
    // Act: change nickname
    const { error } = await admin
      .from('users')
      .update({ nickname: 'Gizmo' })
      .eq('auth_user_id', testUser.user.id);

    expect(error).toBeNull();

    // Assert: personal group name reflects new nickname
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(group).not.toBeNull();
    expect(group!.name).toBe('Gizmo');
  });

  it('should NOT update personal group name when nickname changes but preference=real_name', async () => {
    // Setup: switch to real_name
    await admin
      .from('users')
      .update({ display_preference: 'real_name' })
      .eq('auth_user_id', testUser.user.id);

    // Confirm personal group name is now the full_name
    const { data: before } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(before!.name).toBe('Sync Test User');

    // Act: change nickname (should not affect personal group name)
    await admin
      .from('users')
      .update({ nickname: 'Stripe' })
      .eq('auth_user_id', testUser.user.id);

    // Assert: personal group name still the full_name
    const { data: after } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(after!.name).toBe('Sync Test User');
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-004: Real Name Edit Syncs When Preference Is Real Name
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-004: Real name edit syncs when preference = real_name', () => {
  const admin = createAdminClient();
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Real Name Sync User' });

    // Set up: display_preference = real_name
    await admin
      .from('users')
      .update({ display_preference: 'real_name', nickname: 'TestNick' })
      .eq('auth_user_id', testUser.user.id);
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should update personal group name when full_name changes (preference=real_name)', async () => {
    // Act: change full_name
    const { error } = await admin
      .from('users')
      .update({ full_name: 'Stefan S.' })
      .eq('auth_user_id', testUser.user.id);

    expect(error).toBeNull();

    // Assert: personal group name reflects new full_name
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(group).not.toBeNull();
    expect(group!.name).toBe('Stefan S.');
  });

  it('should NOT update personal group name when full_name changes but preference=nickname', async () => {
    // Setup: switch to nickname preference
    await admin
      .from('users')
      .update({ display_preference: 'nickname' })
      .eq('auth_user_id', testUser.user.id);

    // Confirm personal group name is now the nickname
    const { data: before } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(before!.name).toBe('TestNick');

    // Act: change full_name (should not affect personal group name)
    await admin
      .from('users')
      .update({ full_name: 'Completely Different Name' })
      .eq('auth_user_id', testUser.user.id);

    // Assert: personal group name still the nickname
    const { data: after } = await admin
      .from('groups')
      .select('name')
      .eq('id', testUser.personalGroupId)
      .single();

    expect(after!.name).toBe('TestNick');
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-005: Nickname Cannot Be Blank
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-005: Nickname cannot be blank', () => {
  const admin = createAdminClient();
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Blank Nick Test' });
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should reject update setting nickname to empty string', async () => {
    const { error } = await admin
      .from('users')
      .update({ nickname: '' })
      .eq('auth_user_id', testUser.user.id);

    expect(error).not.toBeNull();
    // CHECK constraint violation
    expect(error!.message).toMatch(/nickname_not_empty|check|constraint|violat/i);
  });

  it('should reject update setting nickname to null', async () => {
    const { error } = await admin
      .from('users')
      .update({ nickname: null } as any)
      .eq('auth_user_id', testUser.user.id);

    expect(error).not.toBeNull();
    // NOT NULL constraint violation
    expect(error!.message).toMatch(/null|not-null|constraint|violat/i);
  });
});

// ──────────────────────────────────────────────────────────────────
// B-DISP-009: Forum Posts Show Display Name (Smoke Test)
// ──────────────────────────────────────────────────────────────────

describe('B-DISP-009: Forum posts show display name via personal group', () => {
  const admin = createAdminClient();
  let testUser: any;
  let engagementGroup: any;
  let forumPost: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Forum Author User' });

    // Set a distinctive nickname
    await admin
      .from('users')
      .update({ nickname: 'ForumNick', display_preference: 'nickname' })
      .eq('auth_user_id', testUser.user.id);

    // Create an engagement group for the forum post
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Forum Test Group',
        description: 'For display name forum test',
        is_public: false,
        group_type: 'engagement',
        created_by_group_id: testUser.personalGroupId,
      })
      .select()
      .single();

    engagementGroup = group;

    // Add user as member
    await admin
      .from('group_memberships')
      .insert({
        group_id: engagementGroup.id,
        member_group_id: testUser.personalGroupId,
        added_by_group_id: testUser.personalGroupId,
        status: 'active',
      });

    // Create a forum post
    const { data: post } = await admin
      .from('forum_posts')
      .insert({
        group_id: engagementGroup.id,
        author_group_id: testUser.personalGroupId,
        content: 'Test forum post for display name',
      })
      .select()
      .single();

    forumPost = post;
  });

  afterAll(async () => {
    // Clean up in order: post → group → user
    if (forumPost) {
      await admin.from('forum_posts').delete().eq('id', forumPost.id);
    }
    if (engagementGroup) {
      await admin.from('groups').delete().eq('id', engagementGroup.id);
    }
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should resolve author name from personal group name (not full_name)', async () => {
    // Query the forum post with author join (same pattern as ForumSection.tsx)
    const { data: post, error } = await admin
      .from('forum_posts')
      .select(`
        id, content,
        author:groups!author_group_id (id, name, avatar_url)
      `)
      .eq('id', forumPost.id)
      .single();

    expect(error).toBeNull();
    expect(post).not.toBeNull();

    // The author name should come from personal group name, which is the nickname
    const author = (post as any).author;
    expect(author).not.toBeNull();
    expect(author.name).toBe('ForumNick');
    // It should NOT be the full_name
    expect(author.name).not.toBe('Forum Author User');
  });
});
