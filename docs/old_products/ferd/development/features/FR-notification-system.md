# Notification System Design

**Status:** ✅ Implemented (v0.2.14, smart notifications v0.2.35)
**Author:** Architect Agent
**Date:** February 14, 2026
**Last Updated:** February 28, 2026 (Sprint 3 — smart notification schema, RPCs, UI)
**Phase:** Ferd 1.5-A (Infrastructure for RBAC/Communication)
**Related:** [Dynamic Permissions System](./AR-dynamic-permissions-system.md) (D13) | [Platform Exit](./FR-platform-exit.md) | [ARCHITECTURE](../../../../universe/architecture/ARCHITECTURE_ANATOMY.md)

---

## Context

D13 in the RBAC design specifies that group membership notifications use an **in-app notification system**, not email. Email is reserved for platform-level authentication only (signup, password reset). The notification system is infrastructure that unblocks:

- Membership flow notifications (invitations, acceptance, removal)
- Group-joins-group notifications (D7/D13: all users in Group A notified when Group A joins Group B)
- Future: journey progress events, forum activity, feedback received

The current system has a rudimentary "invitation badge" in `components/Navigation.tsx` that polls `group_memberships` for rows where `status = 'invited'`. This design replaces that pattern with a proper notification table backed by Supabase Realtime for live push delivery.

---

## Table: notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB DEFAULT '{}',
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Column Rationale

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key, consistent with all other tables |
| `recipient_group_id` | UUID, NOT NULL, FK groups | Who receives this notification. FK to `groups.id` — references the recipient's personal group (D15 universal group pattern). CASCADE on group deletion. |
| `type` | TEXT, NOT NULL | Notification type identifier (see "Notification Types" section below). TEXT not ENUM so new types can be added without migration. |
| `title` | TEXT, NOT NULL | Human-readable short title for display (e.g., "New Group Invitation"). Pre-rendered at creation time, not computed at read time. |
| `body` | TEXT, nullable | Optional longer description (e.g., "Stefan invited you to join Alpha Team"). Pre-rendered. |
| `payload` | JSONB | Structured data for the client: group_id, group_name, actor_name, journey_id, etc. Allows the UI to render links and actions without extra queries. |
| `group_id` | UUID, nullable, FK groups | Optional group context. SET NULL on group deletion (notification remains readable but unlinked). Used for filtering "notifications about group X". |
| `is_read` | BOOLEAN, default false | Read/unread state. Simple boolean, not a timestamp-based "seen" model. |
| `read_at` | TIMESTAMPTZ, nullable | When the notification was marked as read. NULL if unread. Useful for analytics and "recently read" queries. |
| `created_at` | TIMESTAMPTZ | When the notification was created. No `updated_at` -- notifications are append-only (only `is_read`, `read_at`, `action_taken`, and `action_taken_at` change). |

### Smart Notification Columns (Sprint 3, v0.2.35)

| Column | Type | Purpose |
|--------|------|---------|
| `action_type` | TEXT, nullable | Type of action expected: `accept_decline`, `multi_choice`, `acknowledge`, or NULL (passive). NULL means a standard passive notification. |
| `action_data` | JSONB, nullable | Action-specific context data (e.g., group name, nominator name, nominee rank). Rendered in the UI alongside action buttons. |
| `action_taken` | TEXT, nullable | User's response: `accepted`, `declined`, etc. NULL until the user responds. |
| `action_taken_at` | TIMESTAMPTZ, nullable | When the user responded. NULL until actioned. |
| `expires_at` | TIMESTAMPTZ, nullable | When the notification action expires. Used for timeout handling (e.g., 7-day stewardship nomination window). |

**Consistency constraint:** `notifications_action_consistency` — `action_taken` can only be set when `action_type` is not NULL. Prevents passive notifications from having an action response.

**Index:** `idx_notifications_pending_actions` — partial index on `(recipient_group_id, created_at DESC) WHERE action_type IS NOT NULL AND action_taken IS NULL AND (expires_at IS NULL OR expires_at > NOW())` for efficient queries of pending actionable notifications.

### Design Decisions

**Why no `notification_preferences` table (yet)?**
For Ferd 1.5-A, all notification types are delivered to all users. Preferences (mute a group, disable a type) add complexity with minimal value when the system has <100 users. When preferences are needed, add a `notification_preferences` table with `(user_id, type, enabled)` rows. The `notifications` table design is forward-compatible -- the notification creation function can check preferences before inserting.

**Why pre-rendered `title` and `body`?**
Alternative: store only type + payload, render in the UI. Problem: if group names or user names change after notification creation, the notification text would retroactively change, which is confusing. Pre-rendering at creation time captures the state at the moment of the event. The `payload` JSONB still has IDs for navigation/linking.

**Why `recipient_group_id` (personal group) not `recipient_user_id`?**
D15 established the universal group pattern where every user is represented by a personal group. Notifications reference `recipient_group_id` (the recipient's personal group UUID) rather than a user ID. This is consistent with all other D15 tables. Notifications are fundamentally per-user (each human sees their own notification bell) — the personal group is the user's identity anchor.

**Why TEXT not ENUM for `type`?**
Adding new notification types is a common operation (new feature = new notification). TEXT avoids a migration each time. A CHECK constraint is not used either -- validation happens in the creation function. Invalid types won't be created because only controlled SECURITY DEFINER functions create notifications.

---

## Indexes

```sql
-- Primary query: "get my unread notifications, newest first"
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_group_id, created_at DESC)
  WHERE is_read = false;

-- Secondary query: "get all my notifications, newest first" (paginated)
CREATE INDEX idx_notifications_recipient_created
  ON notifications (recipient_group_id, created_at DESC);

-- Filter by group context
CREATE INDEX idx_notifications_group
  ON notifications (group_id)
  WHERE group_id IS NOT NULL;
```

---

## RLS Policies

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only read their own notifications (D15: personal group)
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  recipient_group_id = get_current_personal_group_id()
);

-- INSERT: Only SECURITY DEFINER functions can insert.
-- No INSERT policy for 'authenticated' role.

-- UPDATE: Users can mark their own notifications as read (D15: personal group)
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
  recipient_group_id = get_current_personal_group_id()
)
WITH CHECK (
  recipient_group_id = get_current_personal_group_id()
);

-- DELETE: Users can dismiss/delete their own notifications (D15: personal group)
CREATE POLICY "Users can delete own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
  recipient_group_id = get_current_personal_group_id()
);
```

---

## Supabase Realtime Strategy

### Channel Model

Each authenticated user subscribes to a single Realtime channel filtered by their `recipient_group_id`:

```
Channel: postgres_changes
Table:   notifications
Event:   INSERT
Filter:  recipient_group_id=eq.<current_personal_group_id>
```

Supabase Realtime Postgres Changes respects RLS, so a user cannot subscribe to another user's notifications.

### Client Subscription Pattern

```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_group_id=eq.${personalGroupId}`,
    },
    (payload) => {
      handleNewNotification(payload.new);
    }
  )
  .subscribe();

// On logout or unmount:
supabase.removeChannel(channel);
```

### Subscription Lifecycle

| Event | Action |
|-------|--------|
| **User logs in** | Fetch unread count (REST query). Subscribe to Realtime channel. |
| **New notification arrives** | Realtime pushes INSERT event. Increment badge, optionally show toast. |
| **User marks notification read** | Local state update. REST query to UPDATE `is_read = true, read_at = NOW()`. |
| **User logs out** | Unsubscribe from channel. Clear local notification state. |
| **Connection drops** | Supabase client auto-reconnects. On reconnect, fetch unread count to catch missed notifications. |

### Fallback Strategy

1. **On reconnect:** Fetch unread notifications via REST. Compare with local state.
2. **On page navigation:** Hook into existing `refreshNavigation` event pattern.
3. **No polling:** Reconnect + page-navigation fetches are sufficient.

### Prerequisites

Realtime must be enabled for the `notifications` table in Supabase dashboard (Database > Replication).

---

## Notification Creation Approach: Database Triggers

**Decision:** Use `AFTER INSERT` / `AFTER UPDATE` / `AFTER DELETE` triggers on source tables via `SECURITY DEFINER` functions.

**Rationale:** Triggers guarantee every qualifying mutation creates a notification regardless of code path (UI, server component, API, migration). Application-layer creation risks missing notifications.

### Trigger Functions

```
group_memberships INSERT (status='invited')
    -> notify_invitation_received()
    -> creates notification for the invited user

group_memberships UPDATE (status: 'invited' -> 'active')
    -> notify_invitation_accepted()
    -> creates notification for the group leader(s)

group_memberships DELETE (was status='invited')
    -> notify_invitation_declined()
    -> creates notification for the group leader(s)

group_memberships DELETE (was status='active')
    -> notify_member_removed_or_left()
    -> creates notification for removed user OR group leader(s)

user_group_roles INSERT
    -> notify_role_assigned()
    -> creates notification for the user receiving the role

user_group_roles DELETE
    -> notify_role_removed()
    -> creates notification for the user losing the role
```

### Distinguishing `member_removed` vs. `member_left`

Both result from DELETE on `group_memberships` where `status = 'active'`. The trigger checks if `auth.uid()` maps to the deleted user:
- **Yes** = `member_left` (user removed themselves)
- **No** = `member_removed` (leader removed someone)

**Risk:** `auth.uid()` may be NULL in CASCADE/service role contexts. Default to `member_removed` type.

---

## Notification Types (Initial Set)

| Type | Trigger Source | Recipient | Title |
|------|---------------|-----------|-------|
| `group_invitation` | `group_memberships` INSERT, status='invited' | Invited user | "New Group Invitation" |
| `invitation_accepted` | `group_memberships` UPDATE, 'invited'->'active' | Group leader(s) | "Invitation Accepted" |
| `invitation_declined` | `group_memberships` DELETE, status was 'invited' | Group leader(s) | "Invitation Declined" |
| `member_removed` | `group_memberships` DELETE, status was 'active', by another user | Removed user | "Removed from Group" |
| `member_left` | `group_memberships` DELETE, status was 'active', by self | Group leader(s) | "Member Left Group" |
| `role_assigned` | `user_group_roles` INSERT | User receiving role | "New Role Assigned" |
| `role_removed` | `user_group_roles` DELETE | User losing role | "Role Removed" |

### Sprint 2 Types (Leave Group — v0.2.34)

These notifications are created directly by the `leave_group()` SECURITY DEFINER RPC, not by triggers:

| Type | Trigger Source | Recipient | Title |
|------|---------------|-----------|-------|
| `stewardship_transferred` | `leave_group()` RPC (L2 scenario) | All group members | "FringeIsland has temporarily assumed stewardship of [Group]." |
| `stewardship_required` | `leave_group()` RPC (L2 scenario) | DeusEx | "[Group] requires a permanent Steward. Please review and assign." |
| `group_closed` | `leave_group()` RPC (L3 scenario, orphaned journeys) | DeusEx | "[Group] has been closed. [N] non-public journey(s) require review." |

**Note:** The `member_left` notification type (from the initial set above) is still created by the existing `notify_invitation_declined_or_member_change` trigger when the `leave_group()` RPC deletes the membership row.

### Sprint 3 Types (Smart Notifications — v0.2.35)

These are **smart notifications** with `action_type` set, created by SECURITY DEFINER RPCs:

| Type | action_type | Created by | Recipient | Title |
|------|-------------|------------|-----------|-------|
| `stewardship_nomination` | `accept_decline` | `nominate_steward()` RPC | Nominee | "Stewardship Nomination: [Group]" |
| `stewardship_accepted` | NULL (passive) | `_handle_stewardship_nomination_action()` | All group members | "[Nominee] has accepted stewardship of [Group]" |
| `stewardship_declined_all` | NULL (passive) | `_handle_stewardship_nomination_action()` | DeusEx | "All nominees declined stewardship of [Group]" |

**RPCs (Sprint 3):**

| RPC | Type | Purpose |
|-----|------|---------|
| `handle_notification_action(p_notification_id UUID, p_action TEXT)` | PLPGSQL, SECURITY DEFINER | Validates ownership, actionability, expiry, action validity. Records response. Dispatches type-specific side effects (e.g., stewardship transfer on accept). |
| `nominate_steward(p_group_id UUID, p_nominee_ids UUID[])` | PLPGSQL, SECURITY DEFINER | Sole Steward nominates ranked successors. Sends smart notification to first nominee with 7-day expiry. Validates: sole Steward, active members, no self-nomination, no duplicate in-progress. |
| `_handle_stewardship_nomination_action(...)` | PLPGSQL, internal | Accept: grant Steward role, remove original Steward (L1 flow), notify group. Decline: advance to next nominee or DeusEx fallback (L2 flow). |

### Future Types

| Type | Feature | Phase |
|------|---------|-------|
| `group_joined_group` | D7/D13 | RBAC |
| `journey_enrolled` | Group enrolled in journey | 1.5-B |
| `forum_reply` | Reply to your post | 1.5-C |

---

## Migration Plan

> **Note:** Migration complete (v0.2.14). See `supabase/migrations/` for the applied migration file.

Originally implemented as a single migration with 6 steps: table + indexes, RLS policies, helper functions, trigger functions, triggers, verification. Post-D15 column renames applied in the D15 rebuild migration.

---

## Client-Side Architecture (Guidance for UI Agent)

### NotificationProvider (React Context)

1. On mount (authenticated): fetch unread count via REST, subscribe to Realtime channel
2. Expose: `unreadCount`, `notifications[]`, `markAsRead(id)`, `markAllAsRead()`, `deleteNotification(id)`, `handleAction(id, action)` (Sprint 3)
3. On Realtime INSERT: prepend to `notifications[]`, increment `unreadCount`
4. On logout: unsubscribe, clear state
5. `handleAction()` calls `handle_notification_action` RPC, updates local state (action_taken, is_read), dispatches `refreshNavigation` event

### Navigation Integration

Replace current invitation-count logic in `Navigation.tsx`:
- **Current:** Query `group_memberships` where `status = 'invited'`
- **New:** Use `unreadCount` from NotificationProvider

---

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Trigger overhead on hot tables | Low | Medium | Membership changes are infrequent |
| Notification spam from bulk ops | Low | Medium | No bulk ops in Phase 1 |
| `auth.uid()` NULL in CASCADE | Medium | High | Handle gracefully, default to `member_removed` |
| Existing triggers on same tables | Low | Low | BEFORE triggers block AFTER triggers if they raise exception |

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-14 | Initial design | Architect Agent |
| 2026-02-28 | Updated D15 column renames: `recipient_user_id` → `recipient_group_id`, `get_current_user_profile_id()` → `get_current_personal_group_id()` | Sprint 0 review |
| 2026-02-28 | Added Sprint 2 notification types: `stewardship_transferred`, `stewardship_required`, `group_closed` — created by `leave_group()` RPC | Sprint 2 |
| 2026-02-28 | Sprint 3: Smart notification columns (`action_type`, `action_data`, `action_taken`, `action_taken_at`, `expires_at`), consistency constraint, pending action index. New RPCs: `handle_notification_action`, `nominate_steward`, `_handle_stewardship_nomination_action`. New types: `stewardship_nomination` (smart), `stewardship_accepted`, `stewardship_declined_all`. NotificationContext `handleAction()` method, NotificationBell Accept/Decline UI. | Sprint 3 |
