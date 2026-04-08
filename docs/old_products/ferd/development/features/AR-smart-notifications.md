# Smart Notifications (Sprint 3)

**Status:** IMPLEMENTED
**Sprint:** 3 (Lifecycle Roadmap)
**Date:** February 28, 2026
**Completed:** February 28, 2026
**Version:** v0.2.35
**Phase:** 1.6 (Polish and Launch — lifecycle features)
**Dependencies:** Sprint 2 (v0.2.34) — COMPLETE
**Related:** [Notification System](./FR-notification-system.md) | [Leave Group Core](./FR-leave-group-core.md) | [Platform Exit](./FR-platform-exit.md) | [Lifecycle Decisions](../../planning/LIFECYCLE_DECISIONS.md)

---

## Context

The existing notification system (v0.2.14, updated for D15) supports 10 passive notification types (7 initial + 3 Sprint 2) — they inform users of events but require no response. Sprint 3 extends this with **smart notifications**: actionable notifications that embed response buttons (Accept/Decline, Yes/No, multi-choice) and track user responses.

Smart notifications are infrastructure that unblocks:
- **Track 1 stewardship nomination** (L4) — sole Steward nominates successors, nominees accept/decline via notification
- **Future:** join requests, journey completion acknowledgments, consent flows

**Roadmap decision D-R1:** Smart notifications are a standalone feature, not part of leave-group. They have their own TDD cycle.

---

## Scope

### F3: Smart Notification Schema Extension

Adds 5 columns to the existing `notifications` table: `action_type`, `action_data`, `action_taken`, `action_taken_at`, `expires_at`. For the full column definitions, constraints, and indexes, see [Notification System — Smart Notification Columns](./FR-notification-system.md).

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
- ~~Self-service platform exit~~ — **Admin-assisted platform exit IMPLEMENTED (v0.2.36, Sprint 4).** Self-service remains deferred. See [platform-exit.md](./FR-platform-exit.md).

---

## Behaviors

| ID | Behavior | Spec |
|----|----------|------|
| B-NOTIF-001 | Smart Notification Schema | `docs/old_products/ferd/development/specs/notifications.md` |
| B-NOTIF-002 | Actionable Notification UI | `docs/old_products/ferd/development/specs/notifications.md` |
| B-NOTIF-003 | Notification Action Handler | `docs/old_products/ferd/development/specs/notifications.md` |
| B-GRP-011 | Stewardship Nomination (Track 1) | `docs/old_products/ferd/development/specs/groups.md` |

---

## Data Model Changes

### notifications table (ALTER)

Adds 5 columns + consistency constraint + pending-action index. Full DDL and column definitions: see [Notification System — Smart Notification Columns](./FR-notification-system.md).

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

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260228125730_sprint3_smart_notifications.sql` | Schema extension + RPCs |
| `lib/notifications/NotificationContext.tsx` | `handleAction()` method added |
| `components/notifications/NotificationBell.tsx` | Accept/Decline buttons, actioned/expired badges |
| `tests/integration/communication/smart-notifications.test.ts` | 11 tests (B-NOTIF-001, B-NOTIF-003) |
| `tests/integration/groups/stewardship-nomination.test.ts` | 8 tests (B-GRP-011) |
| `docs/old_products/ferd/development/specs/notifications.md` | B-NOTIF-001, B-NOTIF-002, B-NOTIF-003 |
| `docs/old_products/ferd/development/specs/groups.md` | B-GRP-011 |

## Test Results

- 19 new integration tests (11 smart-notifications + 8 stewardship-nomination)
- All 19/19 GREEN
- Full regression suite passing, zero regressions

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-28 | Initial feature doc | Sprint Agent |
| 2026-02-28 | Sprint 3 complete — status IMPLEMENTED, key files, test results, related link fix | Sprint Agent |
