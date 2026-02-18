/**
 * Integration Tests: Admin Notification Send
 *
 * Covers:
 * - B-ADMIN-011: Admin Notification Send
 *
 * Tests that admins can send notifications to users via RPC,
 * notifications are created with correct type, non-admins are blocked,
 * and empty target lists return 0.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-011: Admin Notification Send', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser1: any;
  let targetUser2: any;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'Notify Admin' });
    targetUser1 = await createTestUser({ displayName: 'Notify Target 1' });
    targetUser2 = await createTestUser({ displayName: 'Notify Target 2' });
    normalUser = await createTestUser({ displayName: 'Notify Normal' });

    // Look up DeusEx group and role
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('DeusEx system group not found');
    deusexGroupId = deusexGroup.id;

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    if (!deusexRole) throw new Error('DeusEx role not found');
    deusexRoleId = deusexRole.id;

    // Add deusexUser to DeusEx group
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      user_id: deusexUser.profile.id,
      added_by_user_id: deusexUser.profile.id,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      user_id: deusexUser.profile.id,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_user_id: deusexUser.profile.id,
    });

    // Sign in clients
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up notifications created by tests
    await admin.from('notifications').delete()
      .eq('type', 'admin_notification');

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('user_id', deusexUser.profile.id)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser1) await cleanupTestUser(targetUser1.user.id);
    if (targetUser2) await cleanupTestUser(targetUser2.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should have admin_send_notification RPC', async () => {
    // Call with empty array to verify function exists
    const { data, error } = await deusexClient.rpc('admin_send_notification', {
      target_user_ids: [],
      title: 'Test',
      message: 'Test message',
    });

    // Should succeed (return 0), not "function does not exist"
    expect(error).toBeNull();
    expect(data).toBe(0);
  });

  it('should send notifications to multiple users', async () => {
    const { data, error } = await deusexClient.rpc('admin_send_notification', {
      target_user_ids: [targetUser1.profile.id, targetUser2.profile.id],
      title: 'Important Update',
      message: 'This is an admin notification test.',
    });

    expect(error).toBeNull();
    expect(data).toBe(2);

    // Verify notifications exist in the table
    const { data: notifs } = await admin
      .from('notifications')
      .select('*')
      .eq('type', 'admin_notification')
      .eq('title', 'Important Update');

    expect(notifs).not.toBeNull();
    expect(notifs!.length).toBe(2);

    // Verify both users received the notification
    const recipientIds = notifs!.map((n: any) => n.recipient_user_id);
    expect(recipientIds).toContain(targetUser1.profile.id);
    expect(recipientIds).toContain(targetUser2.profile.id);
  });

  it('should create notifications with correct type and content', async () => {
    const { error } = await deusexClient.rpc('admin_send_notification', {
      target_user_ids: [targetUser1.profile.id],
      title: 'Type Check',
      message: 'Checking notification fields.',
    });

    expect(error).toBeNull();

    // Verify notification structure
    const { data: notif } = await admin
      .from('notifications')
      .select('*')
      .eq('type', 'admin_notification')
      .eq('title', 'Type Check')
      .single();

    expect(notif).not.toBeNull();
    expect(notif!.type).toBe('admin_notification');
    expect(notif!.title).toBe('Type Check');
    expect(notif!.body).toBe('Checking notification fields.');
    expect(notif!.recipient_user_id).toBe(targetUser1.profile.id);
    expect(notif!.is_read).toBe(false);
  });

  it('should return 0 for empty target list', async () => {
    const { data, error } = await deusexClient.rpc('admin_send_notification', {
      target_user_ids: [],
      title: 'Empty Test',
      message: 'Should not create any notifications.',
    });

    expect(error).toBeNull();
    expect(data).toBe(0);
  });

  it('should block non-admin from calling send notification RPC', async () => {
    const { error } = await normalClient.rpc('admin_send_notification', {
      target_user_ids: [targetUser1.profile.id],
      title: 'Unauthorized',
      message: 'This should fail.',
    });

    // Should fail — non-admin doesn't have manage_all_groups permission
    expect(error).not.toBeNull();

    // Verify no notification was created with this title
    const { data: notifs } = await admin
      .from('notifications')
      .select('id')
      .eq('title', 'Unauthorized')
      .eq('type', 'admin_notification');

    expect(notifs).toEqual([]);
  });
});
