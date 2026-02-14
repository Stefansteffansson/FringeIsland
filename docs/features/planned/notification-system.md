# Notification System Design

**Status:** Design Complete - Ready for Database Agent Implementation
**Author:** Architect Agent
**Date:** February 14, 2026
**Phase:** 1.5-A (Infrastructure for RBAC/Communication)
**Related:** [Dynamic Permissions System](./dynamic-permissions-system.md) (D13) | [ARCHITECTURE](../../architecture/ARCHITECTURE.md)

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
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
| `recipient_user_id` | UUID, NOT NULL, FK users | Who receives this notification. FK to `users.id` (not `auth.users`), consistent with all other user references. CASCADE on user deletion. |
| `type` | TEXT, NOT NULL | Notification type identifier (see "Notification Types" section below). TEXT not ENUM so new types can be added without migration. |
| `title` | TEXT, NOT NULL | Human-readable short title for display (e.g., "New Group Invitation"). Pre-rendered at creation time, not computed at read time. |
| `body` | TEXT, nullable | Optional longer description (e.g., "Stefan invited you to join Alpha Team"). Pre-rendered. |
| `payload` | JSONB | Structured data for the client: group_id, group_name, actor_name, journey_id, etc. Allows the UI to render links and actions without extra queries. |
| `group_id` | UUID, nullable, FK groups | Optional group context. SET NULL on group deletion (notification remains readable but unlinked). Used for filtering "notifications about group X". |
| `is_read` | BOOLEAN, default false | Read/unread state. Simple boolean, not a timestamp-based "seen" model. |
| `read_at` | TIMESTAMPTZ, nullable | When the notification was marked as read. NULL if unread. Useful for analytics and "recently read" queries. |
| `created_at` | TIMESTAMPTZ | When the notification was created. No `updated_at` -- notifications are append-only (only `is_read` and `read_at` change). |

### Design Decisions

**Why no `notification_preferences` table (yet)?**
For Phase 1.5-A, all notification types are delivered to all users. Preferences (mute a group, disable a type) add complexity with minimal value when the system has <100 users. When preferences are needed, add a `notification_preferences` table with `(user_id, type, enabled)` rows. The `notifications` table design is forward-compatible -- the notification creation function can check preferences before inserting.

**Why pre-rendered `title` and `body`?**
Alternative: store only type + payload, render in the UI. Problem: if group names or user names change after notification creation, the notification text would retroactively change, which is confusing. Pre-rendering at creation time captures the state at the moment of the event. The `payload` JSONB still has IDs for navigation/linking.

**Why `recipient_user_id` not `recipient_group_id`?**
In the D15 future model, users are represented by personal groups. However, the current schema still uses `user_id` in most places. Notifications are fundamentally per-user (each human sees their own notification bell). Using `user_id` keeps things simple. When D15 migration happens, this column can be migrated to reference personal groups -- but the notification-per-human model stays the same.

**Why TEXT not ENUM for `type`?**
Adding new notification types is a common operation (new feature = new notification). TEXT avoids a migration each time. A CHECK constraint is not used either -- validation happens in the creation function. Invalid types won't be created because only controlled SECURITY DEFINER functions create notifications.

---

## Indexes

```sql
-- Primary query: "get my unread notifications, newest first"
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_user_id, created_at DESC)
  WHERE is_read = false;

-- Secondary query: "get all my notifications, newest first" (paginated)
CREATE INDEX idx_notifications_recipient_created
  ON notifications (recipient_user_id, created_at DESC);

-- Filter by group context
CREATE INDEX idx_notifications_group
  ON notifications (group_id)
  WHERE group_id IS NOT NULL;
```

---

## RLS Policies

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  recipient_user_id = get_current_user_profile_id()
);

-- INSERT: Only SECURITY DEFINER functions can insert.
-- No INSERT policy for 'authenticated' role.

-- UPDATE: Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
  recipient_user_id = get_current_user_profile_id()
)
WITH CHECK (
  recipient_user_id = get_current_user_profile_id()
);

-- DELETE: Users can dismiss/delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
  recipient_user_id = get_current_user_profile_id()
);
```

---

## Supabase Realtime Strategy

### Channel Model

Each authenticated user subscribes to a single Realtime channel filtered by their `recipient_user_id`:

```
Channel: postgres_changes
Table:   notifications
Event:   INSERT
Filter:  recipient_user_id=eq.<current_user_profile_id>
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
      filter: `recipient_user_id=eq.${userProfileId}`,
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

### Future Types (Not Phase 1.5-A)

| Type | Feature | Phase |
|------|---------|-------|
| `group_joined_group` | D7/D13 | RBAC |
| `journey_enrolled` | Group enrolled in journey | 1.5-B |
| `forum_reply` | Reply to your post | 1.5-C |

---

## Migration Plan

Single migration file, ordered by dependency:

1. Create `notifications` table + indexes
2. Enable RLS + create policies (SELECT, UPDATE, DELETE only)
3. Ensure `get_current_user_profile_id()` exists
4. Create 6 notification trigger functions (SECURITY DEFINER)
5. Create 5 triggers on `group_memberships` and `user_group_roles`
6. Verification block

---

## Client-Side Architecture (Guidance for UI Agent)

### NotificationProvider (React Context)

1. On mount (authenticated): fetch unread count via REST, subscribe to Realtime channel
2. Expose: `unreadCount`, `notifications[]`, `markAsRead(id)`, `markAllAsRead()`, `deleteNotification(id)`
3. On Realtime INSERT: prepend to `notifications[]`, increment `unreadCount`
4. On logout: unsubscribe, clear state

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
