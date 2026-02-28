# Lifecycle Flows — Leave Group, Smart Notifications, Platform Exit

**Status:** Reference Document
**Date:** February 28, 2026
**Covers:** Sprint 2 (v0.2.34), Sprint 3 (v0.2.35), Sprint 4 (v0.2.36)
**Related:** [Leave Group Core](./leave-group-core.md) | [Smart Notifications](./smart-notifications.md) | [Platform Exit](./platform-exit.md)

---

## Purpose

This document describes the **end-to-end flows** for three interconnected lifecycle features. Each flow is written as a sequence of events — some triggered by user actions, some happening automatically inside the database.

**Legend:**
- **USER** — an action taken by a person (clicking a button, making a choice)
- **SYSTEM** — something the database does automatically (triggered by the previous step)
- **NOTIFY** — a notification created and delivered to someone's bell icon

---

## Flow 1: Regular Member Leaves a Group (L1)

> A member who is NOT the sole Steward decides to leave.

| # | Who | What happens |
|---|-----|--------------|
| 1 | **USER** | Member calls `leave_group(group_id)` (future: clicks "Leave Group" button) |
| 2 | **SYSTEM** | Validates: user is authenticated, group is active engagement group, user is an active member |
| 3 | **SYSTEM** | Counts members and Stewards → determines this is a **regular leave** (multiple members remain, user is not the sole Steward) |
| 4 | **SYSTEM** | Freezes the member's active enrollments in non-public journeys owned by this group (status → `frozen`, reason: `left_group`) |
| 5 | **SYSTEM** | Deletes all of the member's roles in this group |
| 6 | **SYSTEM** | Deletes the member's group membership |
| 7 | **NOTIFY** | Existing notification trigger fires → Stewards of the group receive a `member_left` notification |

**Result:** The member is out. The group continues normally. The member's enrollments in private group journeys are frozen (can be unfrozen if they rejoin later — not yet implemented).

---

## Flow 2: Sole Steward Leaves via Nomination (L4 → Accept)

> The only Steward wants to leave, but first nominates successors. One of them accepts.

### Phase A — Nomination

| # | Who | What happens |
|---|-----|--------------|
| 1 | **USER** | Sole Steward calls `nominate_steward(group_id, [nominee_1, nominee_2, nominee_3])` |
| 2 | **SYSTEM** | Validates: caller is sole Steward, no nomination already in progress, all nominees are active members, self-nomination blocked |
| 3 | **NOTIFY** | First nominee receives an **actionable** `stewardship_nomination` notification with Accept/Decline buttons. Expires in 7 days. |

*The Steward now waits. They remain in the group as Steward until someone accepts or all nominees decline.*

### Phase B — Nominee Accepts

| # | Who | What happens |
|---|-----|--------------|
| 4 | **USER** | First nominee clicks **Accept** in their notification bell |
| 5 | **SYSTEM** | `handle_notification_action()` validates: notification belongs to caller, not expired, not already actioned |
| 6 | **SYSTEM** | Marks the notification as actioned (`action_taken = 'accepted'`) |
| 7 | **SYSTEM** | Grants the Steward role to the nominee |
| 8 | **SYSTEM** | Deletes the original Steward's roles in this group |
| 9 | **SYSTEM** | Freezes the original Steward's enrollments in non-public group journeys |
| 10 | **SYSTEM** | Deletes the original Steward's membership |
| 11 | **NOTIFY** | All remaining members (except the new Steward) receive a `stewardship_transferred` notification: *"{Name} has accepted stewardship of {Group}."* |

**Result:** Clean handover. The old Steward is out, the new Steward is in charge. No admin intervention needed.

---

## Flow 3: Sole Steward Leaves via Nomination (L4 → All Decline → DeusEx Fallback)

> The only Steward nominates successors, but they all decline. The system falls back to DeusEx (platform admin group).

### Phase A — Nomination (same as Flow 2)

| # | Who | What happens |
|---|-----|--------------|
| 1 | **USER** | Sole Steward calls `nominate_steward(group_id, [nominee_1, nominee_2])` |
| 2 | **SYSTEM** | Validates and creates actionable notification for first nominee |
| 3 | **NOTIFY** | First nominee receives `stewardship_nomination` (Accept/Decline, 7-day expiry) |

### Phase B — First Nominee Declines

| # | Who | What happens |
|---|-----|--------------|
| 4 | **USER** | First nominee clicks **Decline** |
| 5 | **SYSTEM** | Marks notification as actioned (`action_taken = 'declined'`) |
| 6 | **SYSTEM** | Checks: is there a next nominee in the ranked list? **Yes** → |
| 7 | **NOTIFY** | Second nominee receives a new `stewardship_nomination` notification (Accept/Decline, fresh 7-day expiry) |

### Phase C — Last Nominee Declines → DeusEx Fallback

| # | Who | What happens |
|---|-----|--------------|
| 8 | **USER** | Second (last) nominee clicks **Decline** |
| 9 | **SYSTEM** | Marks notification as actioned. Checks: any more nominees? **No** → DeusEx fallback triggers |
| 10 | **SYSTEM** | Adds DeusEx as a member of the group (if not already) |
| 11 | **SYSTEM** | Assigns the Steward role to DeusEx |
| 12 | **SYSTEM** | Transfers pending invitations from the old Steward to DeusEx |
| 13 | **SYSTEM** | Deletes the original Steward's roles |
| 14 | **SYSTEM** | Deletes the original Steward's membership |
| 15 | **NOTIFY** | All remaining members (except DeusEx) receive `stewardship_transferred`: *"FringeIsland has temporarily assumed stewardship of {Group}."* |
| 16 | **NOTIFY** | DeusEx receives `stewardship_required`: *"{Group} requires a permanent Steward. All nominees declined. Please review and assign."* |

**Result:** The old Steward is out. DeusEx is the temporary Steward. A platform admin needs to review and find a permanent Steward for the group.

---

## Flow 4: Sole Steward Leaves Without Nominating (L2 — Direct DeusEx Handover)

> The sole Steward calls `leave_group()` directly without nominating anyone first.

| # | Who | What happens |
|---|-----|--------------|
| 1 | **USER** | Sole Steward calls `leave_group(group_id)` without prior nomination |
| 2 | **SYSTEM** | Validates. Detects: caller IS the sole Steward → **steward_handover** scenario |
| 3 | **SYSTEM** | Adds DeusEx as a member of the group |
| 4 | **SYSTEM** | Assigns the Steward role to DeusEx |
| 5 | **SYSTEM** | Transfers pending invitations from the Steward to DeusEx |
| 6 | **SYSTEM** | Freezes the Steward's enrollments in non-public group journeys |
| 7 | **SYSTEM** | Deletes the Steward's roles |
| 8 | **SYSTEM** | Deletes the Steward's membership |
| 9 | **NOTIFY** | All remaining members (except DeusEx) receive `stewardship_transferred`: *"FringeIsland has temporarily assumed stewardship of {Group}."* |
| 10 | **NOTIFY** | DeusEx receives `stewardship_required`: *"{Group} requires a permanent Steward. Please review and assign."* |

**Result:** Same outcome as Flow 3 Phase C — DeusEx takes over. The difference is the Steward chose to leave immediately without giving anyone a chance to accept first.

---

## Flow 5: Last Member Leaves a Group (L3 — Group Closure)

> The only remaining member (regardless of role) leaves. The group shuts down.

| # | Who | What happens |
|---|-----|--------------|
| 1 | **USER** | Last member calls `leave_group(group_id)` |
| 2 | **SYSTEM** | Validates. Detects: only 1 active member → **group_closure** scenario |
| 3 | **SYSTEM** | Sets `groups.status = 'closed'` (this bypasses the "last leader" trigger) |
| 4 | **SYSTEM** | Freezes ALL active enrollments in non-public journeys owned by this group |
| 5 | **SYSTEM** | Freezes ALL group-level enrollments in this group |
| 6 | **SYSTEM** | If the group owned any non-public journeys → transfers ownership to DeusEx |
| 7 | **NOTIFY** | If journeys were transferred → DeusEx receives `group_closed`: *"{Group} has been closed. {N} Non-Public Journey(s) require review."* |
| 8 | **SYSTEM** | Deletes the member's roles |
| 9 | **SYSTEM** | Deletes the member's membership |

**Result:** The group is closed. No one can see or join it (RLS hides non-active groups). Enrollments are frozen. Non-public journeys are preserved under DeusEx for potential reuse or archival.

---

## Flow 6: Admin Exits a User from the Platform (Sprint 4)

> A platform admin removes a user from the entire platform. This is the only way to fully exit someone — there is no self-service platform exit.

| # | Who | What happens |
|---|-----|--------------|
| 1 | **USER** | Admin selects a user in the admin dashboard and clicks **"Exit Platform"** |
| 2 | **SYSTEM** | Shows a confirmation modal: *"This will remove {Name} from all groups and decommission their account. This action cannot be undone."* |
| 3 | **USER** | Admin confirms |
| 4 | **SYSTEM** | Calls `admin_exit_user_from_platform(target_user_id)` |
| 5 | **SYSTEM** | Safety checks: caller is admin, target exists, target is not self, target is not already decommissioned, target is not a DeusEx member |

**Then, for EACH of the target user's active engagement group memberships:**

| # | Who | What happens |
|---|-----|--------------|
| 6 | **SYSTEM** | Counts members and Stewards in this group → determines scenario |
| 7a | | **If regular member (L1):** freezes non-public enrollments, deletes roles, deletes membership |
| 7b | | **If sole Steward (L2):** adds DeusEx as member + Steward, transfers pending invitations, freezes enrollments, deletes target's roles + membership |
| 7c | | **If last member (L3):** closes group, freezes all enrollments, transfers non-public journeys to DeusEx, deletes roles + membership |
| 8 | **NOTIFY** | For L2 groups: remaining members get `stewardship_transferred` ("Platform Exit"), DeusEx gets `stewardship_required` ("Platform Exit") |
| 9 | **NOTIFY** | For L3 groups: DeusEx gets `group_closed` ("Platform Exit") if non-public journeys exist |

**After all groups are processed:**

| # | Who | What happens |
|---|-----|--------------|
| 10 | **SYSTEM** | Decommissions the user: `is_decommissioned = true`, `is_active = false` |
| 11 | **SYSTEM** | Deletes all auth sessions and refresh tokens (force logout) |
| 12 | **SYSTEM** | Writes an audit log entry with full per-group details |
| 13 | **SYSTEM** | Returns summary: `{groups_exited: N, group_details: [...], decommissioned: true}` |

**Key design decision:** L4 (stewardship nomination) is **never** triggered during admin exit. If the target is a sole Steward, the system always goes straight to L2 (DeusEx handover). This is because admin exit is immediate — there is no time for a 7-day nomination process.

**Result:** The user is completely removed from the platform. All their group memberships are cleanly unwound. All groups continue functioning (with DeusEx stepping in where needed). The user cannot log in again.

---

## How the Three Features Connect

```
                    ┌─────────────────────────┐
                    │  User wants to leave     │
                    │  a single group          │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  leave_group(group_id)   │
                    │  (Sprint 2 — L1/L2/L3)  │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼──────┐
     │ L1: Regular   │ │ L2: DeusEx   │ │ L3: Group   │
     │ member leave  │ │ handover     │ │ closure     │
     └───────────────┘ └──────────────┘ └─────────────┘
                               ▲
                               │ (fallback when
                               │  all nominees decline)
                    ┌──────────┴──────────────┐
                    │  nominate_steward()      │
                    │  (Sprint 3 — L4)         │
                    │                          │
                    │  Nominee 1 → Accept?     │──── Yes → handover to nominee
                    │            → Decline?    │
                    │  Nominee 2 → Accept?     │──── Yes → handover to nominee
                    │            → Decline?    │
                    │  ...all declined...       │──── DeusEx fallback (L2)
                    └─────────────────────────┘

                    ┌─────────────────────────┐
                    │  Admin wants to remove   │
                    │  user from platform      │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  admin_exit_user_from_   │
                    │  platform(user_id)       │
                    │  (Sprint 4)              │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  FOR EACH group:         │
                    │  → L1, L2, or L3         │
                    │  (NEVER L4 — no time     │
                    │   for nomination)         │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  Decommission user       │
                    │  + force logout          │
                    │  + audit log             │
                    └─────────────────────────┘
```

---

## Notification Summary

| Trigger | Type | Recipients | Actionable? |
|---------|------|------------|-------------|
| L1 regular leave | `member_left` | Group Stewards | No |
| L2 DeusEx handover | `stewardship_transferred` | All members (except DeusEx) | No |
| L2 DeusEx handover | `stewardship_required` | DeusEx | No |
| L3 group closure | `group_closed` | DeusEx (if journeys transferred) | No |
| L4 nomination created | `stewardship_nomination` | Current nominee | **Yes** (Accept/Decline, 7-day expiry) |
| L4 nominee accepted | `stewardship_transferred` | All members (except new Steward) | No |
| L4 all declined (fallback) | `stewardship_transferred` | All members (except DeusEx) | No |
| L4 all declined (fallback) | `stewardship_required` | DeusEx | No |
| Platform exit (L2 groups) | `stewardship_transferred` | All members (except DeusEx) | No |
| Platform exit (L2 groups) | `stewardship_required` | DeusEx | No |
| Platform exit (L3 groups) | `group_closed` | DeusEx (if journeys transferred) | No |
