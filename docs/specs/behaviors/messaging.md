# Direct Messaging Behaviors

> **Purpose:** Document the fundamental rules and guarantees for 1:1 direct messaging between users.
> **Domain Code:** MSG
> **Phase:** 1.5-B

---

## B-MSG-001: Send a Direct Message

**Rule:** Any authenticated user MUST be able to send a text message to any other user on the platform. The message is stored with the sender's ID, the conversation ID, and a non-empty content body.

**Why:** Direct messaging is the core 1:1 communication channel. It enables private conversations between users, supports RBAC membership flows (D13), and provides Steward-to-member communication.

**Acceptance Criteria:**
- [ ] Authenticated user can INSERT a direct_message with valid conversation_id and content
- [ ] Message is created with sender_id = current user's profile ID (enforced by RLS)
- [ ] Message content must not be empty (CHECK constraint)
- [ ] Message is timestamped with created_at on INSERT
- [ ] Sender cannot impersonate another user (sender_id enforced via RLS WITH CHECK)

**Examples:**

Valid:
- User A sends message to User B: `INSERT INTO direct_messages { conversation_id, sender_id, content }` -> succeeds
- Message is stored with correct sender_id, conversation_id, and content

Invalid:
- User A tries to INSERT with sender_id = User B's ID -> BLOCKED (RLS WITH CHECK enforces sender_id = current user)
- User A tries to INSERT with empty content -> BLOCKED (CHECK constraint)
- Unauthenticated request -> BLOCKED (no authenticated role)

**Edge Cases:**

- **Scenario:** Very long message content
  - **Behavior:** Allowed (TEXT type has no length limit by default)
  - **Why:** No business requirement to limit message length in Phase 1.5-B

- **Scenario:** User sends message to themselves
  - **Behavior:** Allowed if a self-conversation exists (no business rule prevents it)
  - **Why:** Edge case with no harm; may be useful for notes

**Related Behaviors:**
- B-MSG-002: Message Privacy
- B-MSG-003: Conversation Creation
- B-MSG-005: New Message Notification

**Testing Priority:** CRITICAL (core messaging functionality)

---

## B-MSG-002: Message Privacy (RLS)

**Rule:** Users MUST only be able to read messages in conversations they are a participant of. No user may access messages in a conversation they do not belong to.

**Why:** Direct messages are private. Cross-user access would expose personal communication. RLS must enforce that only the two participants of a conversation can SELECT its messages.

**Acceptance Criteria:**
- [ ] User who is a participant in a conversation can SELECT messages from that conversation
- [ ] User who is NOT a participant in a conversation gets empty results when querying its messages (RLS silent filter)
- [ ] Both participants (sender and recipient) can read all messages in their shared conversation
- [ ] RLS check uses conversation membership, not message sender_id (both sides read all messages)

**Examples:**

Valid:
- User A (participant) queries `SELECT * FROM direct_messages WHERE conversation_id = <their_conv>` -> returns all messages in conversation
- User B (other participant) queries same conversation -> also returns all messages

Invalid:
- User C (not a participant) queries `SELECT * FROM direct_messages WHERE conversation_id = <A_and_B_conv>` -> returns empty (RLS silent filter)
- User C queries by message ID directly -> returns empty (RLS filters on conversation membership)

**Edge Cases:**

- **Scenario:** User is removed from platform (soft deleted, is_active=false)
  - **Behavior:** Messages remain in database; conversation is still accessible by the other participant
  - **Why:** Soft delete doesn't remove data; message history is preserved for the remaining user

- **Scenario:** User queries all direct_messages without filtering by conversation
  - **Behavior:** Returns only messages from conversations they participate in
  - **Why:** RLS applies per-row; any query is filtered to own conversations

**Related Behaviors:**
- B-MSG-001: Send a Direct Message
- B-MSG-003: Conversation Creation

**Testing Priority:** CRITICAL (privacy, security)

---

## B-MSG-003: Conversation Creation and Uniqueness

**Rule:** A conversation between two users MUST be unique — only one conversation can exist per user pair. Creating a conversation with the same two users (in either order) MUST return or reuse the existing conversation.

**Why:** Duplicate conversations would split message history, confuse the inbox, and create a poor UX. The uniqueness constraint ensures all messages between two users are in one thread.

**Acceptance Criteria:**
- [ ] Creating a conversation between User A and User B succeeds
- [ ] Attempting to create a second conversation between User A and User B is prevented (unique constraint or application logic)
- [ ] Conversation between (A, B) and (B, A) is treated as the same conversation (order-independent)
- [ ] Only participants of a conversation can SELECT it (RLS)
- [ ] Non-participants cannot see the conversation in their inbox (RLS silent filter)

**Examples:**

Valid:
- User A initiates conversation with User B -> conversation created with participant_1=A, participant_2=B (or min/max ordering)
- User B later initiates conversation with User A -> returns existing conversation (no duplicate)

Invalid:
- User C queries conversations table -> does not see A-B conversation (RLS)
- Attempting to create duplicate conversation -> BLOCKED (unique constraint)

**Edge Cases:**

- **Scenario:** Both users simultaneously try to create a conversation with each other
  - **Behavior:** One succeeds, the other gets a unique constraint violation (application retries with existing)
  - **Why:** Database constraint handles race condition; application layer should handle gracefully

- **Scenario:** Participant ordering
  - **Behavior:** Always store as (min(user_id), max(user_id)) or use a normalized unique constraint
  - **Why:** Ensures (A,B) and (B,A) are treated identically at the database level

**Related Behaviors:**
- B-MSG-001: Send a Direct Message
- B-MSG-004: Conversation List (Inbox)

**Testing Priority:** CRITICAL (data integrity, prevents duplicate conversations)

---

## B-MSG-004: Conversation List (Inbox)

**Rule:** Users MUST be able to retrieve a list of all their conversations, sorted by most recent message. Each conversation entry MUST include the other participant's identity and the last message metadata.

**Why:** The inbox is the primary entry point for messaging. Without sorted, enriched conversation listings, users cannot find or resume conversations efficiently.

**Acceptance Criteria:**
- [ ] User can SELECT their conversations and get results including the other participant's info
- [ ] Conversations are sortable by last_message_at (most recent first)
- [ ] last_message_at is updated whenever a new message is sent in the conversation
- [ ] User only sees conversations they participate in (RLS)
- [ ] A conversation with no messages still appears after creation (but with NULL last_message_at)

**Examples:**

Valid:
- User A has 3 conversations -> query returns all 3, sorted by last_message_at DESC
- User A sends a new message in conversation 2 -> conversation 2 moves to top of inbox

Invalid:
- User C queries conversations -> does not see User A's conversations (RLS)

**Edge Cases:**

- **Scenario:** User has no conversations
  - **Behavior:** SELECT returns empty array, no error
  - **Why:** Valid state for new users

- **Scenario:** Conversation exists but all messages are from the other user
  - **Behavior:** Conversation still appears in both users' inbox
  - **Why:** Participation is based on conversation membership, not authorship

**Related Behaviors:**
- B-MSG-003: Conversation Creation and Uniqueness
- B-MSG-005: New Message Notification

**Testing Priority:** HIGH (core UX — inbox is the primary messaging surface)

---

## B-MSG-005: New Message Notification

**Rule:** When a user sends a direct message, a notification of type `new_direct_message` MUST be created for the recipient (the other participant in the conversation). The notification payload MUST include the sender's name, a message preview, and the conversation ID.

**Why:** Users need to know when they receive new messages, especially if they are not currently viewing the conversation. This integrates with the existing notification system (Phase 1.5-A) for consistent delivery via the notification bell and Realtime subscriptions.

**Acceptance Criteria:**
- [ ] Sending a message creates a `new_direct_message` notification for the recipient
- [ ] Notification is NOT created for the sender (only the other participant is notified)
- [ ] Notification payload includes: sender_name, message_preview (truncated), conversation_id
- [ ] Notification is created via SECURITY DEFINER function (follows existing notification pattern)
- [ ] If recipient is online, notification is delivered via Supabase Realtime (existing infrastructure)

**Examples:**

Valid:
- User A sends message to User B -> notification created for User B with type='new_direct_message'
- Notification payload: `{ sender_name: "User A", message_preview: "Hey, how are...", conversation_id: "<id>" }`

Invalid:
- User A sends message -> no notification created for User A (sender is excluded)
- Notification created with wrong conversation_id -> data integrity violation

**Edge Cases:**

- **Scenario:** Rapid-fire messages (User A sends 5 messages quickly)
  - **Behavior:** One notification per message (5 notifications created)
  - **Why:** Each message is an independent event; notification batching is deferred to Phase 2+

- **Scenario:** Recipient has the conversation open (already reading)
  - **Behavior:** Notification is still created (read status is handled separately by the UI)
  - **Why:** The database trigger cannot know if the recipient's UI is showing the conversation

**Related Behaviors:**
- B-COMM-001: Notification Delivery (existing notification infrastructure)
- B-COMM-002: Notification Privacy
- B-MSG-001: Send a Direct Message

**Testing Priority:** HIGH (notification integration, user awareness)

---

## B-MSG-006: Message Read Tracking

**Rule:** Each conversation MUST track the last-read position per participant. When a user opens a conversation, their read position is updated to the current time, and unread count is derived from messages newer than the read position.

**Why:** Read/unread status is essential UX — users need to see which conversations have new messages. The navigation bar shows a total unread count badge. Without tracking, users cannot distinguish new messages from old.

**Acceptance Criteria:**
- [ ] Each participant in a conversation has an independent last_read_at timestamp
- [ ] Opening a conversation updates the participant's last_read_at to NOW()
- [ ] Unread message count = messages in conversation WHERE created_at > participant's last_read_at
- [ ] New conversation starts with last_read_at = NULL (all messages are unread)
- [ ] User can only update their own last_read_at (RLS enforced)

**Examples:**

Valid:
- User A opens conversation -> last_read_at updated to NOW() -> unread count becomes 0
- User B sends 3 messages after User A's last_read_at -> User A's unread count = 3
- User A opens conversation again -> last_read_at updated -> unread count resets to 0

Invalid:
- User A tries to update User B's last_read_at -> BLOCKED (RLS)

**Edge Cases:**

- **Scenario:** User has never opened the conversation (last_read_at = NULL)
  - **Behavior:** All messages in the conversation count as unread
  - **Why:** NULL last_read_at means "never read" — all messages are newer than "never"

- **Scenario:** No new messages since last read
  - **Behavior:** Unread count = 0
  - **Why:** No messages with created_at > last_read_at

- **Scenario:** Timestamp comparison format
  - **Behavior:** Supabase returns `+00:00`, JS uses `Z`. Compare as `new Date(ts).getTime()`
  - **Why:** Known Supabase/JS timezone format difference (see MEMORY.md)

**Related Behaviors:**
- B-MSG-004: Conversation List (Inbox)
- B-COMM-003: Notification Read Status (similar pattern)

**Testing Priority:** HIGH (core UX — unread badges, inbox highlighting)

---

## Notes

**Planned Behaviors (Phase 1.5-B):**
- B-MSG-001: Send a Direct Message (RLS INSERT)
- B-MSG-002: Message Privacy (RLS SELECT)
- B-MSG-003: Conversation Creation and Uniqueness (unique constraint)
- B-MSG-004: Conversation List / Inbox (query pattern)
- B-MSG-005: New Message Notification (trigger integration)
- B-MSG-006: Message Read Tracking (per-participant read position)

**Test Coverage:** 6 / 6 behaviors tested ✅ (19 integration tests in `tests/integration/communication/messaging.test.ts`)

**Design Decisions (resolved in Phase 3):**
- Read tracking: per-conversation with `last_read_at` per participant ✅
- Conversation table structure: two FK columns (`participant_1`, `participant_2`) with sorted order ✅
- Unique constraint: `CHECK (participant_1 < participant_2)` + `UNIQUE(participant_1, participant_2)` ✅
- `last_message_at` update: AFTER INSERT trigger on `direct_messages` ✅

**Implementation:** v0.2.15, Migration `20260215134017_add_direct_messaging.sql`

**Last updated:** 2026-02-15
