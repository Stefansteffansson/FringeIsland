# Smart Notifications (Sprint 3)

**Status:** ACTIVE
**Sprint:** 3 (Lifecycle Roadmap)
**Date:** February 28, 2026
**Version:** v0.2.35 (target)
**Phase:** 1.6 (Polish and Launch — lifecycle features)
**Dependencies:** Sprint 2 (v0.2.34) — COMPLETE
**Related:** [Notification System](../implemented/notification-system.md) | [Leave Group Core](../implemented/leave-group-core.md) | [Lifecycle Roadmap Decisions](../../planning/lifecycle-roadmap-decisions.md)

---

## Context

The existing notification system (v0.2.14, updated for D15) supports 12 passive notification types — they inform users of events but require no response. Sprint 3 extends this with **smart notifications**: actionable notifications that embed response buttons (Accept/Decline, Yes/No, multi-choice) and track user responses.

Smart notifications are infrastructure that unblocks:
- **Track 1 stewardship nomination** (L4) — sole Steward nominates successors, nominees accept/decline via notification
- **Future:** join requests, journey completion acknowledgments, consent flows

**Roadmap decision D-R1:** Smart notifications are a standalone feature, not part of leave-group. They have their own TDD cycle.

---

## Scope

### F3: Smart Notification Schema Extension

Add columns to the existing `notifications` table:

| Column | Type | Purpose |
|--------|------|---------|
| `action_type` | TEXT, nullable | Type of action: `accept_decline`, `multi_choice`, `acknowledge`, NULL (passive) |
| `action_data` | JSONB, nullable | Action-specific data: choices, context, metadata |
| `action_taken` | TEXT, nullable | User's response: `accepted`, `declined`, `choice_1`, etc. |
| `action_taken_at` | TIMESTAMPTZ, nullable | When the user responded |
| `expires_at` | TIMESTAMPTZ, nullable | When the notification action expires (for timeout handling) |

**Key rule:** Passive notifications (existing 12 types) have `action_type = NULL`. Smart notifications have `action_type` set.

**RLS updates:** Existing UPDATE policy must allow setting `action_taken` and `action_taken_at` on own notifications.

### F3-UI: Actionable Notification UI

Update `NotificationContext` and `NotificationBell` to:
- Detect `action_type` on notifications
- Render action buttons (Accept/Decline, custom choices)
- Disable buttons after response or expiry
- Show response status ("You accepted", "Expired")
- Visual differentiation for actionable vs. passive notifications

### F3-Handler: Server-Side Action Handler

Create RPC `handle_notification_action(p_notification_id, p_action)`:
- Validates notification belongs to caller
- Validates action is valid for the `action_type`
- Checks expiry (`expires_at`)
- Sets `action_taken` and `action_taken_at`
- Dispatches domain-specific side effects based on notification type + action
- Returns success/failure

### L4: Track 1 Stewardship Nomination

When the sole Steward of a group wants to leave:
1. Steward provides a ranked list of nominees (from active members)
2. System sends smart notification to nominee #1: "You've been nominated as Steward of [Group]. Accept or Decline?"
3. If nominee accepts → nominee gets Steward role, original Steward exits (L1 flow)
4. If nominee declines → next nominee notified
5. If all nominees decline or timeout (7 days) → DeusEx fallback (L2 flow)
6. If nominee doesn't respond within 7 days → auto-decline, next nominee

**Timeout mechanism:** Lazy client-side check. When any user views their notifications, expired nomination notifications are auto-declined and the next nominee is notified. Additionally, the `handle_notification_action` RPC checks expiry before processing.

---

## NOT in Scope

- Configurable timeout durations (hard-coded 7 days)
- Email notifications for smart notifications
- Notification preferences (mute types)
- Self-service platform exit (Sprint 4)

---

## Behaviors

| ID | Behavior | Spec |
|----|----------|------|
| B-NOTIF-001 | Smart Notification Schema | `docs/specs/behaviors/notifications.md` |
| B-NOTIF-002 | Actionable Notification UI | `docs/specs/behaviors/notifications.md` |
| B-NOTIF-003 | Notification Action Handler | `docs/specs/behaviors/notifications.md` |
| B-GRP-011 | Stewardship Nomination (Track 1) | `docs/specs/behaviors/groups.md` |

---

## Data Model Changes

### notifications table (ALTER)

```sql
ALTER TABLE notifications
  ADD COLUMN action_type TEXT,
  ADD COLUMN action_data JSONB,
  ADD COLUMN action_taken TEXT,
  ADD COLUMN action_taken_at TIMESTAMPTZ,
  ADD COLUMN expires_at TIMESTAMPTZ;

-- Constraint: action_taken only set on actionable notifications
ALTER TABLE notifications
  ADD CONSTRAINT notifications_action_consistency
  CHECK (
    (action_type IS NULL AND action_taken IS NULL AND action_taken_at IS NULL)
    OR (action_type IS NOT NULL)
  );
```

### New Notification Types

| Type | action_type | action_data | Created by |
|------|-------------|-------------|------------|
| `stewardship_nomination` | `accept_decline` | `{ group_id, group_name, nominator_name, nominee_rank, total_nominees }` | `nominate_steward()` RPC |

### New RPCs

| RPC | Purpose |
|-----|---------|
| `handle_notification_action(p_notification_id UUID, p_action TEXT)` | Process user response to smart notification |
| `nominate_steward(p_group_id UUID, p_nominee_ids UUID[])` | Initiate Track 1 stewardship nomination |

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-28 | Initial feature doc | Sprint Agent |
