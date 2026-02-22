/**
 * Integration Tests: Communication - Direct Messaging System
 *
 * Tests:
 *   B-MSG-001: Send a Direct Message
 *   B-MSG-002: Message Privacy (RLS)
 *   B-MSG-003: Conversation Creation and Uniqueness
 *   B-MSG-004: Conversation List (Inbox)
 *   B-MSG-005: New Message Notification
 *   B-MSG-006: Message Read Tracking
 *
 * Verifies that users can send 1:1 messages, RLS enforces privacy,
 * conversations are unique per user pair, inbox sorting works,
 * notifications are triggered, and read tracking functions correctly.
 *
 * NOTE: These tests are written BEFORE implementation (TDD Phase 2 — RED).
 * All tests are expected to FAIL until the database schema, RLS policies,
 * and triggers are implemented in Phase 4.
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
// B-MSG-001: Send a Direct Message
// B-MSG-002: Message Privacy (RLS)
// ============================================================

describe('B-MSG-001 + B-MSG-002: Send Messages and Message Privacy', () => {
  let userA: any;
  let userB: any;
  let userC: any; // outsider — not a participant
  let conversationId: string | null = null;

  beforeAll(async () => {
    userA = await createTestUser({ displayName: 'DM Test - User A' });
    userB = await createTestUser({ displayName: 'DM Test - User B' });
    userC = await createTestUser({ displayName: 'DM Test - Outsider C' });
    const pgA = userA.personalGroupId;
    const pgB = userB.personalGroupId;

    // Create a conversation between A and B via admin
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .insert({
        participant_1: pgA < pgB ? pgA : pgB,
        participant_2: pgA < pgB ? pgB : pgA,
      })
      .select()
      .single();

    expect(convErr).toBeNull();
    conversationId = conv?.id ?? null;
  });

  afterAll(async () => {
    // Clean up messages, conversation, then users
    if (conversationId) {
      await admin.from('direct_messages').delete().eq('conversation_id', conversationId);
      await admin.from('conversations').delete().eq('id', conversationId);
    }
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
    if (userC) await cleanupTestUser(userC.user.id);
  });

  // --- B-MSG-001 ---

  it('B-MSG-001: participant can send a message in their conversation', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId!,
          sender_group_id: userA.personalGroupId,
          content: 'Hello User B!',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.conversation_id).toBe(conversationId);
      expect(data!.sender_group_id).toBe(userA.personalGroupId);
      expect(data!.content).toBe('Hello User B!');
      expect(data!.created_at).toBeTruthy();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-001: sender cannot impersonate another user (RLS enforces sender_group_id)', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      // User A tries to send as User B
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId!,
          sender_group_id: userB.personalGroupId, // impersonation attempt
          content: 'Pretending to be User B',
        })
        .select()
        .single();

      // RLS WITH CHECK should block this
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-001: empty message content is rejected', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId!,
          sender_group_id: userA.personalGroupId,
          content: '',
        })
        .select()
        .single();

      // CHECK constraint should reject empty content
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  // --- B-MSG-002 ---

  it('B-MSG-002: participant can read messages in their conversation', async () => {
    expect(conversationId).not.toBeNull();

    // First, insert a message via admin so there's something to read
    const { data: msg } = await admin
      .from('direct_messages')
      .insert({
        conversation_id: conversationId!,
        sender_group_id: userA.personalGroupId,
        content: 'Message for privacy test',
      })
      .select()
      .single();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userB.email, userB.password);

    try {
      // User B (participant) should be able to read
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId!);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-002: non-participant cannot read messages (RLS silent filter)', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userC.email, userC.password);

    try {
      // User C (not a participant) queries the conversation
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId!);

      // RLS silently filters — no error, but empty result
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-002: non-participant cannot send messages in a conversation they do not belong to', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userC.email, userC.password);

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId!,
          sender_group_id: userC.personalGroupId,
          content: 'Outsider trying to send a message',
        })
        .select()
        .single();

      // RLS should block — user C is not a participant
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });
});

// ============================================================
// B-MSG-003: Conversation Creation and Uniqueness
// ============================================================

describe('B-MSG-003: Conversation Creation and Uniqueness', () => {
  let userA: any;
  let userB: any;
  let userC: any;
  const conversationIds: string[] = [];

  beforeAll(async () => {
    userA = await createTestUser({ displayName: 'Conv Test - User A' });
    userB = await createTestUser({ displayName: 'Conv Test - User B' });
    userC = await createTestUser({ displayName: 'Conv Test - User C' });
  });

  afterAll(async () => {
    // Clean up conversations
    for (const id of conversationIds) {
      await admin.from('direct_messages').delete().eq('conversation_id', id);
      await admin.from('conversations').delete().eq('id', id);
    }
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
    if (userC) await cleanupTestUser(userC.user.id);
  });

  it('B-MSG-003: can create a conversation between two users', async () => {
    const pgA = userA.personalGroupId;
    const pgB = userB.personalGroupId;
    const p1 = pgA < pgB ? pgA : pgB;
    const p2 = pgA < pgB ? pgB : pgA;

    const { data, error } = await admin
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.participant_1).toBe(p1);
    expect(data!.participant_2).toBe(p2);
    conversationIds.push(data!.id);
  });

  it('B-MSG-003: duplicate conversation between same user pair is rejected (unique constraint)', async () => {
    const pgA = userA.personalGroupId;
    const pgB = userB.personalGroupId;
    const p1 = pgA < pgB ? pgA : pgB;
    const p2 = pgA < pgB ? pgB : pgA;

    const { data, error } = await admin
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select()
      .single();

    // Unique constraint should reject the duplicate
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('B-MSG-003: conversation between different user pair succeeds', async () => {
    const pgA = userA.personalGroupId;
    const pgC = userC.personalGroupId;
    const p1 = pgA < pgC ? pgA : pgC;
    const p2 = pgA < pgC ? pgC : pgA;

    const { data, error } = await admin
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    conversationIds.push(data!.id);
  });

  it('B-MSG-003: non-participant cannot see a conversation (RLS)', async () => {
    // userC should not see the A-B conversation
    const supabase = createTestClient();
    await signInWithRetry(supabase, userC.email, userC.password);

    try {
      const pgA = userA.personalGroupId;
      const pgB = userB.personalGroupId;
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${pgA},participant_2.eq.${pgA}`)
        .or(`participant_1.eq.${pgB},participant_2.eq.${pgB}`);

      expect(error).toBeNull();
      // User C should only see conversations they participate in
      // The A-B conversation should NOT appear
      const abConv = (data || []).find(
        (c: any) =>
          (c.participant_1 === pgA || c.participant_2 === pgA) &&
          (c.participant_1 === pgB || c.participant_2 === pgB)
      );
      expect(abConv).toBeUndefined();
    } finally {
      await supabase.auth.signOut();
    }
  });
});

// ============================================================
// B-MSG-004: Conversation List (Inbox)
// ============================================================

describe('B-MSG-004: Conversation List (Inbox)', () => {
  let userA: any;
  let userB: any;
  let userC: any;
  let convAB: string | null = null;
  let convAC: string | null = null;

  beforeAll(async () => {
    userA = await createTestUser({ displayName: 'Inbox Test - User A' });
    userB = await createTestUser({ displayName: 'Inbox Test - User B' });
    userC = await createTestUser({ displayName: 'Inbox Test - User C' });

    // Create two conversations for User A
    const pgA = userA.personalGroupId;
    const pgB = userB.personalGroupId;
    const pgC = userC.personalGroupId;

    const pAB1 = pgA < pgB ? pgA : pgB;
    const pAB2 = pgA < pgB ? pgB : pgA;

    const { data: c1 } = await admin
      .from('conversations')
      .insert({ participant_1: pAB1, participant_2: pAB2 })
      .select()
      .single();
    convAB = c1?.id ?? null;

    const pAC1 = pgA < pgC ? pgA : pgC;
    const pAC2 = pgA < pgC ? pgC : pgA;

    const { data: c2 } = await admin
      .from('conversations')
      .insert({ participant_1: pAC1, participant_2: pAC2 })
      .select()
      .single();
    convAC = c2?.id ?? null;

    // Add a message to convAB first, then convAC (so convAC is more recent)
    if (convAB) {
      await admin.from('direct_messages').insert({
        conversation_id: convAB,
        sender_group_id: pgA,
        content: 'First message to B',
      });
    }

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    if (convAC) {
      await admin.from('direct_messages').insert({
        conversation_id: convAC,
        sender_group_id: pgA,
        content: 'First message to C',
      });
    }
  });

  afterAll(async () => {
    if (convAB) {
      await admin.from('direct_messages').delete().eq('conversation_id', convAB);
      await admin.from('conversations').delete().eq('id', convAB);
    }
    if (convAC) {
      await admin.from('direct_messages').delete().eq('conversation_id', convAC);
      await admin.from('conversations').delete().eq('id', convAC);
    }
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
    if (userC) await cleanupTestUser(userC.user.id);
  });

  it('B-MSG-004: user can list their conversations', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      // User A has 2 conversations
      expect(data!.length).toBe(2);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-004: conversations are sorted by last_message_at (most recent first)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBe(2);

      // convAC had a message sent after convAB, so it should be first
      expect(data![0].id).toBe(convAC);
      expect(data![1].id).toBe(convAB);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-004: last_message_at updates when a new message is sent', async () => {
    expect(convAB).not.toBeNull();

    // Get current last_message_at for convAB
    const { data: before } = await admin
      .from('conversations')
      .select('last_message_at')
      .eq('id', convAB!)
      .single();

    const beforeTime = before?.last_message_at ? new Date(before.last_message_at).getTime() : 0;

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send a new message in convAB
    await admin.from('direct_messages').insert({
      conversation_id: convAB!,
      sender_group_id: userB.personalGroupId,
      content: 'New message from B',
    });

    // Check last_message_at was updated
    const { data: after } = await admin
      .from('conversations')
      .select('last_message_at')
      .eq('id', convAB!)
      .single();

    const afterTime = after?.last_message_at ? new Date(after.last_message_at).getTime() : 0;
    expect(afterTime).toBeGreaterThan(beforeTime);
  });
});

// ============================================================
// B-MSG-005: New Message Notification
// ============================================================

describe('B-MSG-005: DMs do NOT create notifications (unread tracked via Messages badge)', () => {
  let sender: any;
  let recipient: any;
  let conversationId: string | null = null;

  beforeAll(async () => {
    sender = await createTestUser({ displayName: 'Notif Test - Sender' });
    recipient = await createTestUser({ displayName: 'Notif Test - Recipient' });

    // Create conversation
    const pgSender = sender.personalGroupId;
    const pgRecipient = recipient.personalGroupId;
    const p1 = pgSender < pgRecipient ? pgSender : pgRecipient;
    const p2 = pgSender < pgRecipient ? pgRecipient : pgSender;

    const { data: conv } = await admin
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select()
      .single();

    conversationId = conv?.id ?? null;
  });

  afterAll(async () => {
    if (conversationId) {
      await admin.from('direct_messages').delete().eq('conversation_id', conversationId);
      await admin.from('notifications').delete().eq('recipient_group_id', recipient.personalGroupId).eq('type', 'new_direct_message');
      await admin.from('notifications').delete().eq('recipient_group_id', sender.personalGroupId).eq('type', 'new_direct_message');
      await admin.from('conversations').delete().eq('id', conversationId);
    }
    if (sender) await cleanupTestUser(sender.user.id);
    if (recipient) await cleanupTestUser(recipient.user.id);
  });

  it('B-MSG-005: sending a DM does NOT create a notification for the recipient', async () => {
    expect(conversationId).not.toBeNull();

    // Clean any pre-existing notifications
    await admin.from('notifications').delete().eq('recipient_group_id', recipient.personalGroupId).eq('type', 'new_direct_message');

    // Send a message via admin
    await admin.from('direct_messages').insert({
      conversation_id: conversationId!,
      sender_group_id: sender.personalGroupId,
      content: 'Hello! This should NOT trigger a notification.',
    });

    // Verify NO notification was created for recipient
    const { data: notifications, error } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', recipient.personalGroupId)
      .eq('type', 'new_direct_message');

    expect(error).toBeNull();
    expect(notifications).toHaveLength(0);
  });

  it('B-MSG-005: sending a DM does NOT create a notification for the sender', async () => {
    expect(conversationId).not.toBeNull();

    // Clean notifications for sender
    await admin.from('notifications').delete().eq('recipient_group_id', sender.personalGroupId).eq('type', 'new_direct_message');

    // Send another message
    await admin.from('direct_messages').insert({
      conversation_id: conversationId!,
      sender_group_id: sender.personalGroupId,
      content: 'Another message — no notification at all.',
    });

    // Check no notification was created for the sender
    const { data: notifications, error } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', sender.personalGroupId)
      .eq('type', 'new_direct_message');

    expect(error).toBeNull();
    expect(notifications).toHaveLength(0);
  });
});

// ============================================================
// B-MSG-006: Message Read Tracking
// ============================================================

describe('B-MSG-006: Message Read Tracking', () => {
  let userA: any;
  let userB: any;
  let conversationId: string | null = null;

  beforeAll(async () => {
    userA = await createTestUser({ displayName: 'Read Track - User A' });
    userB = await createTestUser({ displayName: 'Read Track - User B' });

    // Create conversation
    const pgA = userA.personalGroupId;
    const pgB = userB.personalGroupId;
    const p1 = pgA < pgB ? pgA : pgB;
    const p2 = pgA < pgB ? pgB : pgA;

    const { data: conv } = await admin
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select()
      .single();

    conversationId = conv?.id ?? null;
  });

  afterAll(async () => {
    if (conversationId) {
      await admin.from('direct_messages').delete().eq('conversation_id', conversationId);
      await admin.from('conversations').delete().eq('id', conversationId);
    }
    if (userA) await cleanupTestUser(userA.user.id);
    if (userB) await cleanupTestUser(userB.user.id);
  });

  it('B-MSG-006: new conversation starts with last_read_at = NULL for both participants', async () => {
    expect(conversationId).not.toBeNull();

    const { data, error } = await admin
      .from('conversations')
      .select('participant_1_last_read_at, participant_2_last_read_at')
      .eq('id', conversationId!)
      .single();

    expect(error).toBeNull();
    expect(data!.participant_1_last_read_at).toBeNull();
    expect(data!.participant_2_last_read_at).toBeNull();
  });

  it('B-MSG-006: participant can update their own last_read_at', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    const readAt = new Date().toISOString();

    try {
      // Determine which participant column User A corresponds to
      const { data: conv } = await admin
        .from('conversations')
        .select('participant_1, participant_2')
        .eq('id', conversationId!)
        .single();

      const isP1 = conv!.participant_1 === userA.personalGroupId;
      const updateField = isP1 ? 'participant_1_last_read_at' : 'participant_2_last_read_at';

      const { error } = await supabase
        .from('conversations')
        .update({ [updateField]: readAt })
        .eq('id', conversationId!);

      expect(error).toBeNull();

      // Verify via admin
      const { data: updated } = await admin
        .from('conversations')
        .select(updateField)
        .eq('id', conversationId!)
        .single();

      const storedTime = new Date((updated as any)[updateField]).getTime();
      const sentTime = new Date(readAt).getTime();
      expect(Math.abs(storedTime - sentTime)).toBeLessThan(5000);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-006: participant cannot update the other participant last_read_at', async () => {
    expect(conversationId).not.toBeNull();

    const supabase = createTestClient();
    await signInWithRetry(supabase, userA.email, userA.password);

    try {
      // Determine which column is NOT User A's
      const { data: conv } = await admin
        .from('conversations')
        .select('participant_1, participant_2')
        .eq('id', conversationId!)
        .single();

      const isP1 = conv!.participant_1 === userA.personalGroupId;
      const otherField = isP1 ? 'participant_2_last_read_at' : 'participant_1_last_read_at';

      // Get current value of the other participant's field
      const { data: before } = await admin
        .from('conversations')
        .select(otherField)
        .eq('id', conversationId!)
        .single();

      // User A tries to update User B's last_read_at
      const { error } = await supabase
        .from('conversations')
        .update({ [otherField]: new Date().toISOString() })
        .eq('id', conversationId!);

      // RLS should either block or silently ignore
      // Check the value hasn't changed via admin
      const { data: after } = await admin
        .from('conversations')
        .select(otherField)
        .eq('id', conversationId!)
        .single();

      expect((after as any)[otherField]).toBe((before as any)[otherField]);
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('B-MSG-006: unread count reflects messages after last_read_at', async () => {
    expect(conversationId).not.toBeNull();

    // Determine which participant column User A is
    const { data: conv } = await admin
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId!)
      .single();

    const isP1 = conv!.participant_1 === userA.personalGroupId;
    const readField = isP1 ? 'participant_1_last_read_at' : 'participant_2_last_read_at';

    // Insert a "baseline" message first to get a DB-server timestamp
    const { data: baseline } = await admin
      .from('direct_messages')
      .insert({
        conversation_id: conversationId!,
        sender_group_id: userA.personalGroupId,
        content: 'Baseline message before read marker',
      })
      .select('created_at')
      .single();

    // Set last_read_at to the baseline message's DB-side timestamp
    // This avoids JS/DB clock skew since both timestamps come from the DB
    await admin
      .from('conversations')
      .update({ [readField]: baseline!.created_at })
      .eq('id', conversationId!);

    // Small delay then insert 2 messages from User B
    await new Promise(resolve => setTimeout(resolve, 200));

    await admin.from('direct_messages').insert({
      conversation_id: conversationId!,
      sender_group_id: userB.personalGroupId,
      content: 'Unread message 1',
    });
    await admin.from('direct_messages').insert({
      conversation_id: conversationId!,
      sender_group_id: userB.personalGroupId,
      content: 'Unread message 2',
    });

    // Count messages after the baseline's timestamp (used as last_read_at)
    const { data: unread, error } = await admin
      .from('direct_messages')
      .select('id')
      .eq('conversation_id', conversationId!)
      .gt('created_at', baseline!.created_at);

    expect(error).toBeNull();
    expect(unread).not.toBeNull();
    expect(unread!.length).toBe(2);
  });
});
