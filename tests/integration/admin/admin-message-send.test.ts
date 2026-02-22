/**
 * Integration Tests: Admin Message Send (DM)
 *
 * Covers:
 * - B-ADMIN-015: Admin Message — DM to Selected Users
 *
 * Tests that admins can create/reuse DM conversations with target users,
 * send messages via the existing DM infrastructure, and that audit log
 * entries are created for the action.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-015: Admin Message Send (DM)', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let targetUser1: any;
  let targetUser2: any;
  let deusexGroupId: string;
  let deusexRoleId: string;
  const createdConversationIds: string[] = [];

  beforeAll(async () => {
    // Create users
    deusexUser = await createTestUser({ displayName: 'MsgSend Admin' });
    targetUser1 = await createTestUser({ displayName: 'MsgSend Target 1' });
    targetUser2 = await createTestUser({ displayName: 'MsgSend Target 2' });

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
      member_group_id: deusexUser.personalGroupId,
      added_by_group_id: deusexUser.personalGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: deusexUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: deusexUser.personalGroupId,
    });

    // Sign in admin client
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up conversations and messages
    for (const convId of createdConversationIds) {
      await admin.from('direct_messages').delete().eq('conversation_id', convId);
      await admin.from('conversations').delete().eq('id', convId);
    }

    // Clean up audit log entries from these tests
    await admin.from('admin_audit_log').delete()
      .eq('actor_group_id', deusexUser.personalGroupId)
      .eq('action', 'admin_message_sent');

    // Clean up DeusEx membership
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (targetUser1) await cleanupTestUser(targetUser1.user.id);
    if (targetUser2) await cleanupTestUser(targetUser2.user.id);
  }, 30000);

  it('should create a DM conversation and send a message to a target user', async () => {
    const adminPgId = deusexUser.personalGroupId;
    const targetPgId = targetUser1.personalGroupId;

    // Sort participant IDs (DB constraint: participant_1 < participant_2)
    const p1 = adminPgId < targetPgId ? adminPgId : targetPgId;
    const p2 = adminPgId < targetPgId ? targetPgId : adminPgId;

    // Create conversation
    const { data: conv, error: convError } = await deusexClient
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select('id')
      .single();

    expect(convError).toBeNull();
    expect(conv).not.toBeNull();
    createdConversationIds.push(conv!.id);

    // Send message
    const { data: msg, error: msgError } = await deusexClient
      .from('direct_messages')
      .insert({
        conversation_id: conv!.id,
        sender_group_id: adminPgId,
        content: 'Admin message to target user 1',
      })
      .select()
      .single();

    expect(msgError).toBeNull();
    expect(msg).not.toBeNull();
    expect(msg!.content).toBe('Admin message to target user 1');
    expect(msg!.sender_group_id).toBe(adminPgId);
  });

  it('should reuse existing conversation when messaging the same user again', async () => {
    const adminPgId = deusexUser.personalGroupId;
    const targetPgId = targetUser1.personalGroupId;
    const p1 = adminPgId < targetPgId ? adminPgId : targetPgId;
    const p2 = adminPgId < targetPgId ? targetPgId : adminPgId;

    // Check for existing conversation (should exist from previous test)
    const { data: existing } = await deusexClient
      .from('conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle();

    expect(existing).not.toBeNull();

    // Send another message to the same conversation
    const { data: msg, error } = await deusexClient
      .from('direct_messages')
      .insert({
        conversation_id: existing!.id,
        sender_group_id: adminPgId,
        content: 'Follow-up admin message',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(msg).not.toBeNull();

    // Verify conversation is reused (only 1 conversation between these two)
    const { data: allConvs } = await admin
      .from('conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2);

    expect(allConvs).toHaveLength(1);
  });

  it('should create individual conversations for each target user (not group chat)', async () => {
    const adminPgId = deusexUser.personalGroupId;
    const target2PgId = targetUser2.personalGroupId;

    // Create conversation with target user 2
    const p1 = adminPgId < target2PgId ? adminPgId : target2PgId;
    const p2 = adminPgId < target2PgId ? target2PgId : adminPgId;

    const { data: conv, error: convError } = await deusexClient
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select('id')
      .single();

    expect(convError).toBeNull();
    expect(conv).not.toBeNull();
    createdConversationIds.push(conv!.id);

    // Verify this is a DIFFERENT conversation from target user 1
    const target1PgId = targetUser1.personalGroupId;
    const t1p1 = adminPgId < target1PgId ? adminPgId : target1PgId;
    const t1p2 = adminPgId < target1PgId ? target1PgId : adminPgId;

    const { data: conv1 } = await admin
      .from('conversations')
      .select('id')
      .eq('participant_1', t1p1)
      .eq('participant_2', t1p2)
      .single();

    expect(conv!.id).not.toBe(conv1!.id);
  });

  it('should create audit log entry for admin message action', async () => {
    // After sending messages, there should be an audit log entry
    // The action handler should log: action='admin_message_sent'
    const { data: auditEntries } = await admin
      .from('admin_audit_log')
      .select('*')
      .eq('actor_group_id', deusexUser.personalGroupId)
      .eq('action', 'admin_message_sent');

    expect(auditEntries).not.toBeNull();
    expect(auditEntries!.length).toBeGreaterThanOrEqual(1);

    // Verify metadata includes user count
    const entry = auditEntries![0];
    expect(entry.metadata).toBeDefined();
    expect(entry.metadata.user_count).toBeDefined();
  });
});
