# Direct Messaging System

**Status:** Phase 0 - Feature Context (ready for behavior specs)
**Phase:** 1.5-B (Communication - Direct Messaging)
**Date:** February 15, 2026
**Dependencies:** Notification system (Phase 1.5-A, complete), existing user/auth infrastructure

---

## Context

Phase 1.5-B adds direct messaging between users. This is 1:1 private communication — not group chat (deferred). The notification system from Phase 1.5-A will be leveraged to alert users of new messages.

Direct messaging is also infrastructure for RBAC (D13): membership flow conversations, Steward-to-member communication, and group-joins-group coordination all require private user-to-user messaging.

---

## What Users Can Do

### Send a Direct Message
A logged-in user can send a text message to any other user on the platform. The message is private — only the sender and recipient can see it.

### View Conversations
Users see a list of their conversations (inbox), sorted by most recent message. Each conversation is between exactly two users. Tapping a conversation opens the full message history.

### Read/Unread Status
Unread conversations are visually distinguished in the inbox. Opening a conversation marks its messages as read. The navigation bar shows an unread message count (similar to the notification bell).

### Receive Notifications
When a user receives a new message, a notification is created (type: `new_direct_message`). If the user is online, Supabase Realtime delivers it instantly.

---

## Scope

### In Scope (Phase 1.5-B)
- 1:1 text messaging between any two users
- Conversation list (inbox) at `/messages`
- Conversation detail view at `/messages/[conversationId]`
- Read/unread tracking per conversation
- Unread count in navigation bar
- Notification on new message (integrates with existing notification system)
- Real-time message delivery via Supabase Realtime

### Out of Scope (deferred)
- Group chat / multi-user conversations — Phase 2+
- File/image attachments — Phase 2+
- Message editing after send — Phase 2+
- Message deletion — Phase 2+ (soft delete pattern exists in forum_posts if needed)
- Typing indicators — Phase 2+
- Message search — Phase 2+
- Block/mute users — Phase 2+
- Message reactions (emoji) — Phase 2+

---

## User Flows

### Flow 1: Starting a New Conversation
1. User navigates to another user's profile (or member list in a group)
2. Clicks "Send Message" button
3. Redirected to `/messages/new?to=<userId>` or conversation opens inline
4. Types and sends first message
5. Conversation is created, recipient notified

### Flow 2: Viewing Inbox
1. User clicks Messages icon in navigation bar
2. Sees list of conversations, sorted by most recent
3. Unread conversations highlighted
4. Each row shows: other user's name/avatar, last message preview, timestamp
5. Unread count badge on nav icon clears as conversations are opened

### Flow 3: Replying to a Message
1. User opens a conversation from inbox
2. Sees full message history (chronological, oldest first)
3. Types reply in input at bottom
4. Sends — message appears immediately, recipient notified

### Flow 4: Real-time Delivery
1. User A sends message to User B
2. If User B has the conversation open: message appears instantly (Realtime subscription)
3. If User B is on another page: unread count in nav increments, notification bell fires
4. If User B is offline: message is stored, visible on next login

---

## Data Model (High-Level)

Two tables are needed:

### conversations
- Represents a 1:1 conversation between two users
- Ensures only one conversation exists per user pair
- Tracks last message timestamp for inbox sorting

### direct_messages
- Individual messages within a conversation
- Links to conversation and sender
- Read tracking at the message level or conversation level (design decision for Phase 3)

**Note:** Detailed schema design happens in Phase 3 (Architect Agent). This section provides intent only.

---

## Integration Points

### Notification System (Phase 1.5-A)
- New message triggers a `new_direct_message` notification via SECURITY DEFINER function
- Payload includes: sender name, message preview (truncated), conversation ID
- Follows existing notification trigger pattern from `notification-system.md`

### Navigation Bar
- Add Messages icon with unread count badge (alongside existing notification bell)
- Uses Supabase Realtime subscription for live count updates

### User Profiles / Group Member Lists
- "Send Message" button on user profile pages
- "Send Message" option in group member action menus

---

## Success Criteria

- [ ] Users can send and receive 1:1 messages
- [ ] Inbox shows all conversations sorted by recency
- [ ] Unread conversations are visually distinct
- [ ] Nav bar shows unread message count
- [ ] New messages trigger notifications
- [ ] Messages are private (RLS enforced — only sender and recipient can see)
- [ ] Real-time delivery works for online users
- [ ] Message history persists and loads correctly

---

## Related Documentation

- [Notification System](./notification-system.md) — Notification integration pattern
- [Group Forum System](./group-forum-system.md) — Similar messaging patterns (threading, RLS)
- [Dynamic Permissions System](./dynamic-permissions-system.md) — D13: messaging as RBAC infrastructure
- [Communication Behaviors](../../specs/behaviors/communication.md) — Existing B-COMM specs
