/**
 * Integration Tests: Communication - Group Forum System
 *
 * Tests:
 *   B-COMM-004: Forum Post Creation
 *   B-COMM-005: Forum Reply Threading
 *   B-COMM-006: Forum Moderation
 *   B-COMM-007: Forum Access Control
 *
 * Verifies that RLS policies enforce member-only access to group forums,
 * the flat threading trigger blocks replies-to-replies, and moderation
 * permissions are correctly scoped to Group Leaders.
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

const admin = createAdminClient();

// ============================================================
// Shared fixtures for B-COMM-004 through B-COMM-007
// ============================================================

describe('B-COMM-004 + B-COMM-005 + B-COMM-006 + B-COMM-007: Group Forum System', () => {
  let leader: any;      // Active member WITH Group Leader role
  let member: any;      // Active member WITH Member role
  let outsider: any;    // Not a member of testGroup at all
  let testGroup: any;
  let leaderRole: any;  // 'Group Leader' group_role for testGroup
  let memberRole: any;  // 'Member' group_role for testGroup

  beforeAll(async () => {
    leader   = await createTestUser({ displayName: 'Forum Test - Leader' });
    member   = await createTestUser({ displayName: 'Forum Test - Member' });
    outsider = await createTestUser({ displayName: 'Forum Test - Outsider' });

    // Create test group
    const { data: group, error: gErr } = await admin
      .from('groups')
      .insert({
        name: 'Forum Test Group',
        description: 'Group for forum system tests',
        is_public: false,
        created_by_user_id: leader.profile.id,
      })
      .select()
      .single();

    expect(gErr).toBeNull();
    testGroup = group;

    // Add leader as active member
    const { error: lmErr } = await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: leader.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });
    expect(lmErr).toBeNull();

    // Add regular member as active member
    const { error: mmErr } = await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      user_id: member.profile.id,
      added_by_user_id: leader.profile.id,
      status: 'active',
    });
    expect(mmErr).toBeNull();

    // Create Group Leader role and assign to leader
    const { data: lr, error: lrErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Steward' })
      .select()
      .single();
    expect(lrErr).toBeNull();
    leaderRole = lr;

    const { error: laErr } = await admin.from('user_group_roles').insert({
      user_id: leader.profile.id,
      group_id: testGroup.id,
      group_role_id: leaderRole.id,
      assigned_by_user_id: leader.profile.id,
    });
    expect(laErr).toBeNull();

    // Create Member role and assign to member
    const { data: mr, error: mrErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Member' })
      .select()
      .single();
    expect(mrErr).toBeNull();
    memberRole = mr;

    const { error: maErr } = await admin.from('user_group_roles').insert({
      user_id: member.profile.id,
      group_id: testGroup.id,
      group_role_id: memberRole.id,
      assigned_by_user_id: leader.profile.id,
    });
    expect(maErr).toBeNull();
  });

  afterAll(async () => {
    // Delete forum posts (CASCADE from group delete handles this, but be explicit)
    if (testGroup) {
      await admin.from('forum_posts').delete().eq('group_id', testGroup.id);
      await admin.from('notifications').delete().eq('group_id', testGroup.id);
      await admin.from('user_group_roles').delete().eq('group_id', testGroup.id);
      await cleanupTestGroup(testGroup.id);
    }
    if (leader)   await cleanupTestUser(leader.user.id);
    if (member)   await cleanupTestUser(member.user.id);
    if (outsider) await cleanupTestUser(outsider.user.id);
  });

  // ============================================================
  // B-COMM-004: Forum Post Creation
  // ============================================================

  it('B-COMM-004: active member with Member role can create a top-level forum post', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    let postId: string | null = null;
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          group_id: testGroup.id,
          author_user_id: member.profile.id,
          content: 'Hello from a member! This is a top-level post.',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.group_id).toBe(testGroup.id);
      expect(data!.author_user_id).toBe(member.profile.id);
      expect(data!.content).toBe('Hello from a member! This is a top-level post.');
      expect(data!.parent_post_id).toBeNull();
      expect(data!.is_deleted).toBe(false);
      postId = data?.id ?? null;
    } finally {
      if (postId) await admin.from('forum_posts').delete().eq('id', postId);
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-004: Group Leader can create a top-level forum post', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    let postId: string | null = null;
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          group_id: testGroup.id,
          author_user_id: leader.profile.id,
          content: 'Leader announcement post.',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      postId = data?.id ?? null;
    } finally {
      if (postId) await admin.from('forum_posts').delete().eq('id', postId);
      await supabase.auth.signOut();
    }
  });

  // ============================================================
  // B-COMM-005: Forum Reply Threading
  // ============================================================

  it('B-COMM-005: member can reply to a top-level post (flat threading — valid)', async () => {
    // Create a top-level post via admin
    const { data: parentPost, error: ppErr } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: leader.profile.id,
        content: 'Top-level post for reply test.',
      })
      .select()
      .single();

    expect(ppErr).toBeNull();
    expect(parentPost!.parent_post_id).toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    let replyId: string | null = null;
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          group_id: testGroup.id,
          author_user_id: member.profile.id,
          content: 'This is a reply to the top-level post.',
          parent_post_id: parentPost!.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.parent_post_id).toBe(parentPost!.id);
      replyId = data?.id ?? null;
    } finally {
      // Clean up reply then parent (CASCADE would also handle parent deletion)
      if (replyId) await admin.from('forum_posts').delete().eq('id', replyId);
      await admin.from('forum_posts').delete().eq('id', parentPost!.id);
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-005: reply to a reply is blocked by the enforce_flat_threading trigger', async () => {
    // Create a top-level post and a reply via admin
    const { data: topPost } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: leader.profile.id,
        content: 'Top-level post.',
      })
      .select()
      .single();

    const { data: firstReply } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: member.profile.id,
        content: 'First reply.',
        parent_post_id: topPost!.id,
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    try {
      // Try to reply to a reply — trigger should block this
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          group_id: testGroup.id,
          author_user_id: member.profile.id,
          content: 'Reply to a reply — should be blocked.',
          parent_post_id: firstReply!.id,  // firstReply has a parent_post_id, so it's not top-level
        })
        .select()
        .single();

      // Trigger raises EXCEPTION → PostgREST returns error
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Replies to replies are not allowed');
      expect(data).toBeNull();
    } finally {
      // Cleanup: delete reply first (CASCADE from topPost would also do this)
      if (firstReply) await admin.from('forum_posts').delete().eq('id', firstReply.id);
      if (topPost) await admin.from('forum_posts').delete().eq('id', topPost.id);
      await supabase.auth.signOut();
    }
  });

  // ============================================================
  // B-COMM-006: Forum Moderation
  // ============================================================

  it('B-COMM-006: Group Leader can soft-delete any post (set is_deleted=true)', async () => {
    // Create a post by the member via admin
    const { data: post, error: pErr } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: member.profile.id,
        content: 'Post to be moderated by leader.',
      })
      .select()
      .single();

    expect(pErr).toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, leader.email, leader.password);

    try {
      // Leader soft-deletes the member's post
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_deleted: true })
        .eq('id', post!.id);

      expect(error).toBeNull();

      // Verify via admin: post still exists but is_deleted=true
      const { data: check } = await admin
        .from('forum_posts')
        .select('is_deleted')
        .eq('id', post!.id)
        .single();

      expect(check!.is_deleted).toBe(true);
    } finally {
      await admin.from('forum_posts').delete().eq('id', post!.id);
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-006: non-leader cannot soft-delete another member post (RLS blocks)', async () => {
    // Create a post by the leader via admin
    const { data: leaderPost, error: pErr } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: leader.profile.id,
        content: "Leader's post that member should not be able to delete.",
      })
      .select()
      .single();

    expect(pErr).toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    try {
      // Regular member tries to soft-delete the leader's post
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_deleted: true })
        .eq('id', leaderPost!.id);

      // RLS: update_own policy requires author_user_id = current_user AND is_deleted=false
      // (member is not the author), moderate_forum requires Group Leader role
      // No matching policy → no rows updated, no error thrown (silent RLS block)
      expect(error).toBeNull();

      // Verify post is still NOT deleted
      const { data: check } = await admin
        .from('forum_posts')
        .select('is_deleted')
        .eq('id', leaderPost!.id)
        .single();

      expect(check!.is_deleted).toBe(false);
    } finally {
      await admin.from('forum_posts').delete().eq('id', leaderPost!.id);
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-006: author can edit their own post content while not deleted', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    let postId: string | null = null;
    try {
      // Member creates their own post
      const { data: post, error: cErr } = await supabase
        .from('forum_posts')
        .insert({
          group_id: testGroup.id,
          author_user_id: member.profile.id,
          content: 'Original content.',
        })
        .select()
        .single();

      expect(cErr).toBeNull();
      postId = post?.id ?? null;

      // Member edits their own post
      const { error: eErr } = await supabase
        .from('forum_posts')
        .update({ content: 'Edited content.' })
        .eq('id', postId!);

      expect(eErr).toBeNull();

      // Verify via admin
      const { data: updated } = await admin
        .from('forum_posts')
        .select('content')
        .eq('id', postId!)
        .single();

      expect(updated!.content).toBe('Edited content.');
    } finally {
      if (postId) await admin.from('forum_posts').delete().eq('id', postId);
      await supabase.auth.signOut();
    }
  });

  // ============================================================
  // B-COMM-007: Forum Access Control
  // ============================================================

  it('B-COMM-007: non-member cannot view forum posts (RLS returns empty result)', async () => {
    // Create a post in the group via admin so there is something to potentially find
    const { data: post, error: pErr } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: leader.profile.id,
        content: 'Visible to members only.',
      })
      .select()
      .single();

    expect(pErr).toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, outsider.email, outsider.password);

    try {
      // Outsider queries forum posts for the private group
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('group_id', testGroup.id);

      // RLS silently filters — no error but empty result
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await admin.from('forum_posts').delete().eq('id', post!.id);
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-007: non-member cannot create a forum post (RLS blocks INSERT)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, outsider.email, outsider.password);

    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          group_id: testGroup.id,
          author_user_id: outsider.profile.id,
          content: 'Outsider should not be able to post.',
        })
        .select()
        .single();

      // RLS WITH CHECK fails → PostgREST returns an error
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-007: active member can view forum posts in their group', async () => {
    // Create a post via admin
    const { data: post, error: pErr } = await admin
      .from('forum_posts')
      .insert({
        group_id: testGroup.id,
        author_user_id: leader.profile.id,
        content: 'Content visible to all active members.',
      })
      .select()
      .single();

    expect(pErr).toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('group_id', testGroup.id)
        .eq('id', post!.id);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBe(1);
      expect(data![0].id).toBe(post!.id);
    } finally {
      await admin.from('forum_posts').delete().eq('id', post!.id);
      await supabase.auth.signOut();
    }
  });
});
