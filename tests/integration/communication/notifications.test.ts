/**
 * Integration Tests: Communication - Notification System
 *
 * Tests:
 *   B-COMM-001: Notification Delivery
 *   B-COMM-002: Notification Privacy
 *   B-COMM-003: Notification Read Status
 *
 * Verifies that membership events create the correct notifications via
 * database triggers, that RLS enforces per-user privacy, and that users
 * can mark their own notifications as read.
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
// B-COMM-001: Notification Delivery
// ============================================================

describe('B-COMM-001: Notification Delivery — invitation triggers', () => {
  let leader: any;
  let invitee: any;
  let testGroup: any;
  let leaderRole: any;

  beforeAll(async () => {
    leader  = await createTestUser({ displayName: 'Notif Test - Leader' });
    invitee = await createTestUser({ displayName: 'Notif Test - Invitee' });

    // Create group
    const { data: group, error: gErr } = await admin
      .from('groups')
      .insert({
        name: 'Notification Test Group',
        description: 'Group for B-COMM-001 tests',
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

    // Create Group Leader role and assign it
    const { data: role, error: roleErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Group Leader' })
      .select()
      .single();
    expect(roleErr).toBeNull();
    leaderRole = role;

    const { error: assignErr } = await admin.from('user_group_roles').insert({
      user_id: leader.profile.id,
      group_id: testGroup.id,
      group_role_id: leaderRole.id,
      assigned_by_user_id: leader.profile.id,
    });
    expect(assignErr).toBeNull();
  });

  afterAll(async () => {
    // Clean up all notifications for the test group to avoid interference
    if (testGroup) {
      await admin.from('notifications').delete().eq('group_id', testGroup.id);
      await admin.from('user_group_roles').delete().eq('group_id', testGroup.id);
      await cleanupTestGroup(testGroup.id);
    }
    if (leader)  await cleanupTestUser(leader.user.id);
    if (invitee) await cleanupTestUser(invitee.user.id);
  });

  it('B-COMM-001: invitation INSERT creates a group_invitation notification for the invited user', async () => {
    // Clean up any pre-existing notifications from role_assigned trigger in beforeAll
    await admin.from('notifications').delete().eq('group_id', testGroup.id);

    // Act: create a group_memberships row with status='invited' via admin
    // (trigger fires regardless of who inserts — triggers test database-level guarantee)
    const { data: membership, error: mErr } = await admin
      .from('group_memberships')
      .insert({
        group_id: testGroup.id,
        user_id: invitee.profile.id,
        added_by_user_id: leader.profile.id,
        status: 'invited',
      })
      .select()
      .single();

    expect(mErr).toBeNull();
    expect(membership).not.toBeNull();

    // Assert: notification exists for invitee
    const { data: notifications, error: nErr } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', invitee.profile.id)
      .eq('type', 'group_invitation')
      .eq('group_id', testGroup.id);

    expect(nErr).toBeNull();
    expect(notifications).not.toBeNull();
    expect(notifications!.length).toBeGreaterThanOrEqual(1);

    const notif = notifications![0];
    expect(notif.type).toBe('group_invitation');
    expect(notif.title).toBe('New Group Invitation');
    expect(notif.body).toBeTruthy();
    expect(notif.payload).toMatchObject({
      group_id: testGroup.id,
      group_name: testGroup.name,
      membership_id: membership!.id,
    });
    expect(notif.is_read).toBe(false);
    expect(notif.read_at).toBeNull();

    // Cleanup: remove the invitation so subsequent tests start clean
    await admin.from('group_memberships').delete().eq('id', membership!.id);
    await admin.from('notifications').delete().eq('recipient_user_id', invitee.profile.id).eq('type', 'group_invitation');
  });

  it('B-COMM-001: acceptance UPDATE creates an invitation_accepted notification for Group Leaders', async () => {
    // Arrange: create invitation
    const { data: membership, error: mErr } = await admin
      .from('group_memberships')
      .insert({
        group_id: testGroup.id,
        user_id: invitee.profile.id,
        added_by_user_id: leader.profile.id,
        status: 'invited',
      })
      .select()
      .single();

    expect(mErr).toBeNull();

    // Clear the group_invitation notification created by the INSERT trigger
    await admin
      .from('notifications')
      .delete()
      .eq('recipient_user_id', invitee.profile.id)
      .eq('type', 'group_invitation');

    // Act: update status from 'invited' to 'active' — triggers invitation_accepted notification
    const { error: upErr } = await admin
      .from('group_memberships')
      .update({ status: 'active' })
      .eq('id', membership!.id);

    expect(upErr).toBeNull();

    // Assert: leader receives an invitation_accepted notification
    const { data: notifications, error: nErr } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', leader.profile.id)
      .eq('type', 'invitation_accepted')
      .eq('group_id', testGroup.id);

    expect(nErr).toBeNull();
    expect(notifications).not.toBeNull();
    expect(notifications!.length).toBeGreaterThanOrEqual(1);

    const notif = notifications![0];
    expect(notif.title).toBe('Invitation Accepted');
    expect(notif.body).toContain(testGroup.name);
    expect(notif.payload).toMatchObject({
      group_id: testGroup.id,
      group_name: testGroup.name,
      member_id: invitee.profile.id,
    });

    // Cleanup: remove invitee membership and notifications
    await admin.from('group_memberships').delete().eq('id', membership!.id);
    await admin.from('notifications').delete().eq('group_id', testGroup.id);
  });
});

// ============================================================
// B-COMM-002: Notification Privacy
// ============================================================

describe('B-COMM-002: Notification Privacy — RLS enforcement', () => {
  let userA: any;
  let userB: any;
  let notificationId: string | null = null;

  beforeAll(async () => {
    userA = await createTestUser({ displayName: 'Privacy Test - User A' });
    userB = await createTestUser({ displayName: 'Privacy Test - User B' });

    // Admin creates a notification directly for userA (bypassing RLS to set up test)
    const { data: notif, error: nErr } = await admin
      .from('notifications')
      .insert({
        recipient_user_id: userA.profile.id,
        type: 'group_invitation',
        title: 'Test Notification',
        body: 'This is a test notification for User A',
        payload: { test: true },
      })
      .select()
      .single();

    expect(nErr).toBeNull();
    notificationId = notif?.id ?? null;
  });

  afterAll(async () => {
    // Clean up notifications for these test users
    await admin.from('notifications').delete().eq('recipient_user_id', userA.profile.id);
    await admin.from('notifications').delete().eq('recipient_user_id', userB.profile.id);
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
  });

  it('B-COMM-002: User A can read their own notifications', async () => {
    expect(notificationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId!);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBe(1);
      expect(data![0].recipient_user_id).toBe(userA.profile.id);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-002: User B cannot see User A notifications (RLS silent filter)', async () => {
    expect(notificationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userB.email, userB.password);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId!);

      // RLS silently filters — no error, but empty result
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-002: Users cannot INSERT notifications directly (no INSERT policy)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      // Attempt to directly insert a notification
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_user_id: userA.profile.id,
          type: 'group_invitation',
          title: 'Self-created notification',
          body: 'This should not be allowed',
          payload: {},
        })
        .select()
        .single();

      // No INSERT policy for authenticated role → RLS blocks
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-002: User B cannot UPDATE User A notification (RLS blocks silently)', async () => {
    expect(notificationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userB.email, userB.password);

    try {
      // User B attempts to mark User A's notification as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId!);

      // RLS USING clause filters out the row — no rows updated, no error thrown
      expect(error).toBeNull();

      // Verify the notification is still unread via admin
      const { data: check } = await admin
        .from('notifications')
        .select('is_read')
        .eq('id', notificationId!)
        .single();

      expect(check!.is_read).toBe(false);
    } finally {
      await supabase.auth.signOut();
    }
  });
});

// ============================================================
// B-COMM-003: Notification Read Status
// ============================================================

describe('B-COMM-003: Notification Read Status — mark as read', () => {
  let testUser: any;
  let notifId: string | null = null;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Read Status Test User' });

    // Admin creates an unread notification for testUser
    const { data: notif, error } = await admin
      .from('notifications')
      .insert({
        recipient_user_id: testUser.profile.id,
        type: 'role_assigned',
        title: 'New Role Assigned',
        body: 'You have been assigned the role of Member in Test Group.',
        payload: { role_name: 'Member' },
        is_read: false,
      })
      .select()
      .single();

    expect(error).toBeNull();
    notifId = notif?.id ?? null;
  });

  afterAll(async () => {
    await admin.from('notifications').delete().eq('recipient_user_id', testUser.profile.id);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('B-COMM-003: newly created notification has is_read=false and read_at=NULL', async () => {
    expect(notifId).not.toBeNull();

    const { data, error } = await admin
      .from('notifications')
      .select('is_read, read_at')
      .eq('id', notifId!)
      .single();

    expect(error).toBeNull();
    expect(data!.is_read).toBe(false);
    expect(data!.read_at).toBeNull();
  });

  it('B-COMM-003: user can mark their own notification as read', async () => {
    expect(notifId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, testUser.email, testUser.password);

    const readAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: readAt })
        .eq('id', notifId!);

      expect(error).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }

    // Verify via admin
    const { data: updated, error: checkErr } = await admin
      .from('notifications')
      .select('is_read, read_at')
      .eq('id', notifId!)
      .single();

    expect(checkErr).toBeNull();
    expect(updated!.is_read).toBe(true);
    expect(updated!.read_at).not.toBeNull();

    // Timestamp comparison: Supabase returns +00:00, JS uses Z
    const readAtMs    = new Date(readAt).getTime();
    const storedAtMs  = new Date(updated!.read_at).getTime();
    // Allow a few seconds of clock difference
    expect(Math.abs(storedAtMs - readAtMs)).toBeLessThan(5000);
  });

  it('B-COMM-003: marked-as-read notification no longer appears in unread query', async () => {
    expect(notifId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, testUser.email, testUser.password);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_user_id', testUser.profile.id)
        .eq('is_read', false);

      expect(error).toBeNull();
      // The notification was marked read in the previous test; it should not be in unread results
      const ids = (data || []).map((n: any) => n.id);
      expect(ids).not.toContain(notifId!);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-COMM-003: unread count is accurate', async () => {
    // Create a fresh unread notification
    const { data: unreadNotif } = await admin
      .from('notifications')
      .insert({
        recipient_user_id: testUser.profile.id,
        type: 'group_invitation',
        title: 'Another Notification',
        body: 'Unread test notification',
        payload: {},
        is_read: false,
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, testUser.email, testUser.password);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('recipient_user_id', testUser.profile.id)
        .eq('is_read', false);

      expect(error).toBeNull();
      // Exactly 1 unread notification (the other was marked read above)
      expect(data).toHaveLength(1);
    } finally {
      await supabase.auth.signOut();
      // Clean up the extra notification
      if (unreadNotif) {
        await admin.from('notifications').delete().eq('id', unreadNotif.id);
      }
    }
  });
});
