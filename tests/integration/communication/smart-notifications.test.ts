/**
 * Integration Tests: Smart Notifications (Sprint 3)
 *
 * Tests:
 *   B-NOTIF-001: Smart Notification Schema
 *   B-NOTIF-003: Notification Action Handler
 *
 * Verifies that:
 * - Smart notification columns exist (action_type, action_data, action_taken, action_taken_at, expires_at)
 * - Consistency constraint enforces action_type/action_taken relationship
 * - handle_notification_action RPC validates ownership, expiry, and action validity
 * - RLS allows users to update action_taken on their own notifications
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

const admin = createAdminClient();

// ============================================================
// B-NOTIF-001: Smart Notification Schema
// ============================================================

describe('B-NOTIF-001: Smart Notification Schema', () => {
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Smart Notif Schema Test' });
  });

  afterAll(async () => {
    await admin.from('notifications').delete().eq('recipient_group_id', testUser.personalGroupId);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('can create a passive notification with all smart columns NULL', async () => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: testUser.personalGroupId,
        type: 'group_invitation',
        title: 'Passive Test',
        body: 'This is a passive notification',
        payload: {},
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.action_type).toBeNull();
    expect(data!.action_data).toBeNull();
    expect(data!.action_taken).toBeNull();
    expect(data!.action_taken_at).toBeNull();
    expect(data!.expires_at).toBeNull();

    // Cleanup
    await admin.from('notifications').delete().eq('id', data!.id);
  });

  it('can create a smart notification with action_type and action_data', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: testUser.personalGroupId,
        type: 'stewardship_nomination',
        title: 'Stewardship Nomination',
        body: 'You have been nominated as Steward of Test Group',
        payload: { group_id: '00000000-0000-0000-0000-000000000001' },
        action_type: 'accept_decline',
        action_data: { group_name: 'Test Group', nominator_name: 'Alice' },
        expires_at: expiresAt,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.action_type).toBe('accept_decline');
    expect(data!.action_data).toMatchObject({ group_name: 'Test Group' });
    expect(data!.action_taken).toBeNull();
    expect(data!.action_taken_at).toBeNull();
    expect(data!.expires_at).not.toBeNull();

    // Cleanup
    await admin.from('notifications').delete().eq('id', data!.id);
  });

  it('rejects passive notification with action_taken set (consistency constraint)', async () => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: testUser.personalGroupId,
        type: 'group_invitation',
        title: 'Bad Notification',
        body: 'This should fail',
        payload: {},
        action_type: null,
        action_taken: 'accepted', // Invalid: action_type is NULL but action_taken is set
      })
      .select()
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('allows smart notification with action_taken set (consistency constraint)', async () => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: testUser.personalGroupId,
        type: 'stewardship_nomination',
        title: 'Already Actioned',
        body: 'Pre-actioned notification',
        payload: {},
        action_type: 'accept_decline',
        action_taken: 'accepted',
        action_taken_at: new Date().toISOString(),
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.action_type).toBe('accept_decline');
    expect(data!.action_taken).toBe('accepted');

    // Cleanup
    await admin.from('notifications').delete().eq('id', data!.id);
  });

  it('user can read smart notification columns via RLS', async () => {
    // Create a smart notification
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: testUser.personalGroupId,
        type: 'stewardship_nomination',
        title: 'RLS Read Test',
        body: 'Test',
        payload: {},
        action_type: 'accept_decline',
        action_data: { test: true },
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, testUser.email, testUser.password);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, action_type, action_data, action_taken, expires_at')
        .eq('id', notif!.id)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.action_type).toBe('accept_decline');
      expect(data!.action_data).toMatchObject({ test: true });
      expect(data!.action_taken).toBeNull();
      expect(data!.expires_at).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
      await admin.from('notifications').delete().eq('id', notif!.id);
    }
  });
});

// ============================================================
// B-NOTIF-003: Notification Action Handler
// ============================================================

describe('B-NOTIF-003: Notification Action Handler', () => {
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    userA = await createTestUser({ displayName: 'Action Handler - User A' });
    userB = await createTestUser({ displayName: 'Action Handler - User B' });
  });

  afterAll(async () => {
    await admin.from('notifications').delete().eq('recipient_group_id', userA.personalGroupId);
    await admin.from('notifications').delete().eq('recipient_group_id', userB.personalGroupId);
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
  });

  it('user can action their own smart notification via RPC', async () => {
    // Create smart notification for userA (use generic type to avoid stewardship side effects)
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: userA.personalGroupId,
        type: 'test_action',
        title: 'Action Test',
        body: 'Accept or decline',
        payload: {},
        action_type: 'accept_decline',
        action_data: { test: true },
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase.rpc('handle_notification_action', {
        p_notification_id: notif!.id,
        p_action: 'accepted',
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data.success).toBe(true);
    } finally {
      await supabase.auth.signOut();
    }

    // Verify action was recorded
    const { data: updated } = await admin
      .from('notifications')
      .select('action_taken, action_taken_at')
      .eq('id', notif!.id)
      .single();

    expect(updated!.action_taken).toBe('accepted');
    expect(updated!.action_taken_at).not.toBeNull();

    // Cleanup
    await admin.from('notifications').delete().eq('id', notif!.id);
  });

  it('rejects action on notification belonging to another user', async () => {
    // Create notification for userA
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: userA.personalGroupId,
        type: 'stewardship_nomination',
        title: 'Wrong User Test',
        body: 'Accept or decline',
        payload: {},
        action_type: 'accept_decline',
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select()
      .single();

    // userB tries to action it
    const supabase = createTestClient();
    await signInWithRetry(supabase, userB.email, userB.password);

    try {
      const { data, error } = await supabase.rpc('handle_notification_action', {
        p_notification_id: notif!.id,
        p_action: 'accepted',
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
      await admin.from('notifications').delete().eq('id', notif!.id);
    }
  });

  it('rejects action on passive notification', async () => {
    // Create passive notification for userA
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: userA.personalGroupId,
        type: 'group_invitation',
        title: 'Passive Notification',
        body: 'No action possible',
        payload: {},
        action_type: null,
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase.rpc('handle_notification_action', {
        p_notification_id: notif!.id,
        p_action: 'accepted',
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
      await admin.from('notifications').delete().eq('id', notif!.id);
    }
  });

  it('rejects action on already-actioned notification', async () => {
    // Create already-actioned notification
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: userA.personalGroupId,
        type: 'stewardship_nomination',
        title: 'Already Actioned',
        body: 'Already responded',
        payload: {},
        action_type: 'accept_decline',
        action_taken: 'accepted',
        action_taken_at: new Date().toISOString(),
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase.rpc('handle_notification_action', {
        p_notification_id: notif!.id,
        p_action: 'declined',
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
      await admin.from('notifications').delete().eq('id', notif!.id);
    }
  });

  it('rejects action on expired notification', async () => {
    // Create expired notification (expired 1 day ago)
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: userA.personalGroupId,
        type: 'stewardship_nomination',
        title: 'Expired Notification',
        body: 'This has expired',
        payload: {},
        action_type: 'accept_decline',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase.rpc('handle_notification_action', {
        p_notification_id: notif!.id,
        p_action: 'accepted',
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
      await admin.from('notifications').delete().eq('id', notif!.id);
    }
  });

  it('rejects invalid action value for accept_decline type', async () => {
    const { data: notif } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: userA.personalGroupId,
        type: 'stewardship_nomination',
        title: 'Invalid Action Test',
        body: 'Try invalid action',
        payload: {},
        action_type: 'accept_decline',
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase.rpc('handle_notification_action', {
        p_notification_id: notif!.id,
        p_action: 'maybe', // Invalid action
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
      await admin.from('notifications').delete().eq('id', notif!.id);
    }
  });
});
