# Notification Behaviors

> **Purpose:** Document the rules and guarantees for the notification system, including smart (actionable) notifications.
> **Domain Code:** NOTIF

---

## B-NOTIF-001: Smart Notification Schema

**Rule:** Notifications MAY carry an `action_type` that signals to the UI that the notification requires a user response. Passive notifications have `action_type = NULL`. Actionable notifications have `action_type` set and optionally include `action_data`, `expires_at`.

**Why:** The stewardship nomination flow (Track 1) and future interactive features require notifications that embed Accept/Decline buttons. Without schema support, the UI cannot differentiate passive from actionable notifications, and responses cannot be tracked.

**Verified by:**
- **Test:** `tests/integration/communication/smart-notifications.test.ts`
- **Database:** Sprint 3 migration (ALTER TABLE notifications)
- **Feature:** [Smart Notifications](../../features/implemented/smart-notifications.md)

**Acceptance Criteria:**
- [ ] `action_type` column exists (TEXT, nullable, NULL for passive notifications)
- [ ] `action_data` column exists (JSONB, nullable)
- [ ] `action_taken` column exists (TEXT, nullable)
- [ ] `action_taken_at` column exists (TIMESTAMPTZ, nullable)
- [ ] `expires_at` column exists (TIMESTAMPTZ, nullable)
- [ ] Consistency constraint: if `action_type IS NULL` then `action_taken` and `action_taken_at` must also be NULL
- [ ] Existing passive notifications are unaffected (all new columns default to NULL)
- [ ] Smart notification can be created with `action_type = 'accept_decline'` and `action_data` populated
- [ ] RLS: users can read their own smart notifications (existing SELECT policy still works)
- [ ] RLS: users can update `action_taken` and `action_taken_at` on their own notifications

**Examples:**

✅ **Valid:**
- Admin inserts notification with `action_type = NULL` → passive notification (existing behavior unchanged)
- RPC inserts notification with `action_type = 'accept_decline'`, `action_data = { ... }` → smart notification
- User updates own notification: `action_taken = 'accepted'`, `action_taken_at = NOW()` → response recorded

❌ **Invalid:**
- Insert with `action_type = NULL` but `action_taken = 'accepted'` → **BLOCKED** (consistency constraint)
- User updates another user's notification → **BLOCKED** (RLS)

**Testing Priority:** 🔴 CRITICAL (schema foundation for all Sprint 3 work)

**History:**
- 2026-02-28: Documented (Sprint 3)

---

## B-NOTIF-002: Actionable Notification UI

**Rule:** The notification bell UI MUST render action buttons for notifications where `action_type` is not NULL. After the user responds, buttons are replaced with a response label. Expired notifications show "Expired" instead of buttons.

**Why:** Users need a clear, embedded way to respond to stewardship nominations and other actionable events without navigating away from their current page.

**Verified by:**
- **Code:** `components/notifications/NotificationBell.tsx`
- **Code:** `lib/notifications/NotificationContext.tsx`
- **Feature:** [Smart Notifications](../../features/implemented/smart-notifications.md)

**Acceptance Criteria:**
- [ ] Notifications with `action_type = 'accept_decline'` show Accept and Decline buttons
- [ ] Clicking Accept calls `handle_notification_action` RPC with `p_action = 'accepted'`
- [ ] Clicking Decline calls `handle_notification_action` RPC with `p_action = 'declined'`
- [ ] After response, buttons replaced with response label (e.g., "Accepted" or "Declined")
- [ ] Expired notifications (current time > `expires_at`) show "Expired" label, no buttons
- [ ] Actionable notifications are visually distinct from passive notifications (border/icon)
- [ ] Passive notifications (existing types) render identically to before (no regression)
- [ ] Loading state shown while action is being processed

**Testing Priority:** 🟡 HIGH (UI behavior, manual + visual testing)

**History:**
- 2026-02-28: Documented (Sprint 3)

---

## B-NOTIF-003: Notification Action Handler

**Rule:** The `handle_notification_action` RPC MUST validate ownership, action validity, and expiry before recording a response and dispatching side effects.

**Why:** Prevents unauthorized response submission, invalid action values, and processing of expired notifications. Side effects (e.g., granting Steward role after acceptance) must be atomic with the response recording.

**Verified by:**
- **Test:** `tests/integration/communication/smart-notifications.test.ts`
- **Database:** `handle_notification_action()` RPC (SECURITY DEFINER)
- **Feature:** [Smart Notifications](../../features/implemented/smart-notifications.md)

**Acceptance Criteria:**
- [ ] RPC accepts `(p_notification_id UUID, p_action TEXT)` and returns JSONB result
- [ ] Validates caller owns the notification (`recipient_group_id = get_current_personal_group_id()`)
- [ ] Validates notification has `action_type IS NOT NULL` (not a passive notification)
- [ ] Validates notification has not already been actioned (`action_taken IS NULL`)
- [ ] Validates notification has not expired (`expires_at IS NULL OR expires_at > NOW()`)
- [ ] Validates `p_action` is valid for the `action_type` (e.g., `accept_decline` only accepts `'accepted'` or `'declined'`)
- [ ] On success: sets `action_taken = p_action`, `action_taken_at = NOW()`
- [ ] On success: dispatches type-specific side effects (e.g., `stewardship_nomination` + `accepted` → grant Steward role)
- [ ] On failure: raises exception with clear error message
- [ ] Non-authenticated users cannot call the RPC

**Examples:**

✅ **Valid:**
- User calls with valid notification ID, action = 'accepted' → response recorded, side effects fired
- User calls with valid notification ID, action = 'declined' → response recorded, next nominee notified

❌ **Invalid:**
- User calls with notification belonging to another user → **BLOCKED** ("Not your notification")
- User calls on passive notification → **BLOCKED** ("Not an actionable notification")
- User calls on already-actioned notification → **BLOCKED** ("Already responded")
- User calls on expired notification → **BLOCKED** ("Notification expired")
- User calls with invalid action (e.g., 'maybe') → **BLOCKED** ("Invalid action")

**Edge Cases:**

- **Scenario:** Two users race to action the same notification (shouldn't happen since notifications are per-user, but defensive)
  - **Behavior:** First write wins; second gets "Already responded"
  - **Why:** `action_taken IS NULL` check prevents double-action

- **Scenario:** Notification expires between user opening dropdown and clicking Accept
  - **Behavior:** RPC rejects with "Notification expired"
  - **Why:** Server-side expiry check prevents stale actions

**Testing Priority:** 🔴 CRITICAL (security + data integrity)

**History:**
- 2026-02-28: Documented (Sprint 3)

---

## Notes

**Implemented Behaviors:**
- (none yet — Sprint 3 in progress)

**Planned Behaviors:**
- 🔄 B-NOTIF-001: Smart Notification Schema
- 🔄 B-NOTIF-002: Actionable Notification UI
- 🔄 B-NOTIF-003: Notification Action Handler

**Related Behavior Specs:**
- `groups.md` — B-GRP-011: Stewardship Nomination (Track 1)
- `groups.md` — B-GRP-008-010: Leave Group Core (Sprint 2, implemented)

**Last updated:** 2026-02-28
