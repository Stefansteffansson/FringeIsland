/**
 * Integration Tests: RLS Policies - Groups
 *
 * Tests: B-GRP-003: Group Visibility Rules
 *
 * Verifies Row Level Security (RLS) policies on the groups table:
 * - Users can view groups they are active members of
 * - Users can view public groups
 * - Users CANNOT view private groups they are not members of
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestGroup,
  createAdminClient,
} from '@/tests/helpers/supabase';

describe('B-GRP-003: Group Visibility Rules (RLS)', () => {
  let user1: any; // Member of private group
  let user2: any; // Non-member (should not see private group)
  let privateGroup: any;
  let publicGroup: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    // Create test users
    user1 = await createTestUser({ displayName: 'Member User' });
    user2 = await createTestUser({ displayName: 'Non-Member User' });

    // Create private group
    const { data: privGroup } = await admin
      .from('groups')
      .insert({
        name: 'Private Test Group',
        description: 'RLS test - private',
        is_public: false,
        created_by_user_id: user1.profile.id,
      })
      .select()
      .single();

    privateGroup = privGroup;

    // Add user1 as active member
    await admin
      .from('group_memberships')
      .insert({
        group_id: privGroup!.id,
        user_id: user1.profile.id,
        added_by_user_id: user1.profile.id,
        status: 'active',
      });

    // Create public group
    const { data: pubGroup } = await admin
      .from('groups')
      .insert({
        name: 'Public Test Group',
        description: 'RLS test - public',
        is_public: true,
        created_by_user_id: user1.profile.id,
      })
      .select()
      .single();

    publicGroup = pubGroup;
  });

  afterAll(async () => {
    // Cleanup
    if (privateGroup) await cleanupTestGroup(privateGroup.id);
    if (publicGroup) await cleanupTestGroup(publicGroup.id);
    if (user1) await cleanupTestUser(user1.user.id);
    if (user2) await cleanupTestUser(user2.user.id);
  });

  it('should allow members to view private groups they belong to', async () => {
    // Create client authenticated as user1 (member)
    const supabase = createTestClient();

    // Sign in as user1
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user1.email,
      password: user1.password,
    });

    expect(signInError).toBeNull();

    // Act: Query private group
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', privateGroup.id);

    // Assert: Should see the private group
    expect(error).toBeNull();
    expect(groups).toHaveLength(1);
    expect(groups![0].id).toBe(privateGroup.id);
    expect(groups![0].is_public).toBe(false);

    await supabase.auth.signOut();
  });

  it('should prevent non-members from viewing private groups', async () => {
    // Create client authenticated as user2 (non-member)
    const supabase = createTestClient();

    // Sign in as user2
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user2.email,
      password: user2.password,
    });

    expect(signInError).toBeNull();

    // Act: Query private group
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', privateGroup.id);

    // Assert: Should NOT see the private group
    expect(error).toBeNull();
    expect(groups).toHaveLength(0); // RLS filters it out

    await supabase.auth.signOut();
  });

  it('should allow anyone to view public groups', async () => {
    // Test as user1 (member)
    const supabase1 = createTestClient();
    await supabase1.auth.signInWithPassword({
      email: user1.email,
      password: user1.password,
    });

    const { data: groups1 } = await supabase1
      .from('groups')
      .select('*')
      .eq('id', publicGroup.id);

    expect(groups1).toHaveLength(1);
    expect(groups1![0].is_public).toBe(true);

    await supabase1.auth.signOut();

    // Test as user2 (non-member)
    const supabase2 = createTestClient();
    await supabase2.auth.signInWithPassword({
      email: user2.email,
      password: user2.password,
    });

    const { data: groups2 } = await supabase2
      .from('groups')
      .select('*')
      .eq('id', publicGroup.id);

    expect(groups2).toHaveLength(1);
    expect(groups2![0].is_public).toBe(true);

    await supabase2.auth.signOut();
  });

  it('should filter group list to only authorized groups', async () => {
    // Sign in as user2 (non-member)
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: user2.email,
      password: user2.password,
    });

    // Act: Query all groups
    const { data: allGroups, error } = await supabase
      .from('groups')
      .select('*')
      .in('id', [privateGroup.id, publicGroup.id]);

    // Assert: Should only see public group, not private
    expect(error).toBeNull();
    expect(allGroups).toHaveLength(1);
    expect(allGroups![0].id).toBe(publicGroup.id);
    expect(allGroups![0].is_public).toBe(true);

    await supabase.auth.signOut();
  });

  it('should enforce visibility even with direct ID queries', async () => {
    // Sign in as user2 (non-member)
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: user2.email,
      password: user2.password,
    });

    // Act: Try to fetch private group by specific ID
    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', privateGroup.id)
      .single();

    // Assert: Should return null or error (RLS blocks access)
    expect(group).toBeNull();
    // Error might be "row not found" or similar
    expect(error).not.toBeNull();

    await supabase.auth.signOut();
  });

  it('should lose access immediately when membership status changes', async () => {
    // Create a new user and add to private group
    const user3 = await createTestUser({ displayName: 'Temp Member' });

    // Add user3 to private group
    const { data: membership } = await admin
      .from('group_memberships')
      .insert({
        group_id: privateGroup.id,
        user_id: user3.profile.id,
        added_by_user_id: user1.profile.id,
        status: 'active',
      })
      .select()
      .single();

    // Sign in as user3
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: user3.email,
      password: user3.password,
    });

    // Verify user3 can see the group
    const { data: before } = await supabase
      .from('groups')
      .select('*')
      .eq('id', privateGroup.id);

    expect(before).toHaveLength(1);

    // Act: Change status to 'removed'
    await admin
      .from('group_memberships')
      .update({ status: 'removed' })
      .eq('id', membership!.id);

    // Query again (RLS should re-evaluate immediately)
    const { data: after } = await supabase
      .from('groups')
      .select('*')
      .eq('id', privateGroup.id);

    // Assert: Should no longer see the group
    expect(after).toHaveLength(0);

    await supabase.auth.signOut();
    await cleanupTestUser(user3.user.id);
  });

  it('should prevent invited (not active) users from viewing private groups', async () => {
    // Create a new user
    const user4 = await createTestUser({ displayName: 'Invited User' });

    // Add user4 with status='invited' (not active)
    await admin
      .from('group_memberships')
      .insert({
        group_id: privateGroup.id,
        user_id: user4.profile.id,
        added_by_user_id: user1.profile.id,
        status: 'invited', // Not active yet!
      });

    // Sign in as user4
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: user4.email,
      password: user4.password,
    });

    // Act: Try to view private group
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .eq('id', privateGroup.id);

    // Assert: Should NOT see the group (only active members can)
    expect(groups).toHaveLength(0);

    await supabase.auth.signOut();
    await cleanupTestUser(user4.user.id);
  });
});
