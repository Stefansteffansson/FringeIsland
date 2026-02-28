# Platform Exit Behaviors

> **Purpose:** Document the rules and guarantees for admin-assisted platform exit.
> **Domain Code:** EXIT
> **Sprint:** Sprint 4 — Platform Exit (Lifecycle Roadmap)

---

## B-EXIT-001: Admin Platform Exit — Group Cascade ✅

**Rule:** A platform admin MUST be able to exit a user from all engagement groups in a single action. For each group, the system applies the appropriate leave track (L1 regular, L2 sole-Steward→DeusEx, L3 group closure) automatically.

**Why:** When a user leaves the platform, their engagement group memberships must be properly unwound. Each group may require different handling depending on the user's role and whether they're the last member. Admin-assisted exit ensures all groups are handled consistently in a single transaction.

**Verified by:**
- **Test:** `tests/integration/admin/platform-exit.test.ts` ✅ **10/10 PASSING** **10/10 PASSING**
- **Database:** `supabase/migrations/20260228144747_sprint4_platform_exit.sql` ✅ **APPLIED**

**Acceptance Criteria:**
- [x] RPC `admin_exit_user_from_platform(p_target_user_id)` exists
- [x] Regular member in group → L1: roles deleted, membership deleted, non-public enrollments frozen
- [x] Sole Steward in group → L2: DeusEx gets membership + Steward role, pending invitations transferred, target roles + membership deleted
- [x] Last member in group → L3: group closed, all enrollments frozen, non-public journeys transferred to DeusEx
- [x] Multiple groups processed in a single transaction
- [x] L4 nomination is NEVER triggered (admin exit always uses L2 for sole Steward)
- [x] Returns detailed summary: groups exited count, per-group scenario

**Examples:**

✅ **Valid:**
- Admin exits user who is regular member of 3 groups → all 3 use L1 → user decommissioned
- Admin exits user who is sole Steward of 1 group and regular member of 2 → 1× L2 + 2× L1
- Admin exits user who is last member of 1 group → L3 (group closed)

❌ **Invalid:**
- Non-admin calls RPC → REJECTED (permission check)
- Admin exits themselves → REJECTED (self-exit guard)
- Admin exits DeusEx member → REJECTED (admin protection)

**Related Behaviors:**
- B-GRP-008: Leave Group Core (L1, L2, L3 logic)
- B-GRP-011: Stewardship Nomination (L4 — explicitly SKIPPED for admin exit)
- B-EXIT-002: Decommission after exit
- B-EXIT-003: Safety guards

**Testing Priority:** 🔴 CRITICAL

---

## B-EXIT-002: Admin Platform Exit — Decommission After Exit ✅

**Rule:** After all engagement groups are processed, the user MUST be decommissioned (`is_decommissioned = true`, `is_active = false`) and force-logged-out.

**Why:** Platform exit is a complete removal of the user from active participation. Decommission prevents reactivation, and force-logout ensures the user cannot continue using stale sessions.

**Verified by:**
- **Test:** `tests/integration/admin/platform-exit.test.ts` ✅ **10/10 PASSING**

**Acceptance Criteria:**
- [x] User's `is_decommissioned` is set to `true`
- [x] User's `is_active` is set to `false`
- [x] All auth sessions and refresh tokens are deleted
- [x] User cannot sign in after exit

**Examples:**

✅ **Valid:**
- Admin exits user → user is decommissioned → user cannot log in

❌ **Invalid:**
- Admin exits already-decommissioned user → REJECTED (already decommissioned)

**Related Behaviors:**
- B-EXIT-001: Group cascade (runs first)

**Testing Priority:** 🔴 CRITICAL

---

## B-EXIT-003: Admin Platform Exit — Safety Guards ✅

**Rule:** The platform exit RPC MUST prevent: (a) self-exit, (b) exiting already-decommissioned users, (c) exiting DeusEx members (platform admins).

**Why:** Self-exit could lock admins out of the system. Exiting decommissioned users is a no-op. Exiting DeusEx members could destabilize the admin system — they must be removed from DeusEx first via a separate action.

**Verified by:**
- **Test:** `tests/integration/admin/platform-exit.test.ts` ✅ **10/10 PASSING**

**Acceptance Criteria:**
- [x] Self-exit raises exception: "Cannot exit yourself from the platform"
- [x] Already-decommissioned user raises exception: "User is already decommissioned"
- [x] DeusEx member raises exception: "Cannot exit a platform admin"
- [x] Non-admin caller raises exception: "Unauthorized"
- [x] Non-existent user raises exception: "User not found"

**Testing Priority:** 🟡 HIGH

---

## B-EXIT-004: Admin Platform Exit — Audit Trail ✅

**Rule:** Every platform exit MUST be logged to `admin_audit_log` with the admin's identity, the target user, and a detailed summary of all groups processed.

**Why:** Platform exit is a high-impact, irreversible action. Full audit trail enables investigation and accountability.

**Verified by:**
- **Test:** `tests/integration/admin/platform-exit.test.ts` ✅ **10/10 PASSING**

**Acceptance Criteria:**
- [x] Audit log entry created with action = 'admin_exit_user_from_platform'
- [x] Metadata includes: groups_exited count, per-group details (group_id, name, scenario)
- [x] Actor is the admin who performed the action

**Testing Priority:** 🟢 MEDIUM

---

## Summary

| Behavior | Rule | Priority | Status |
|----------|------|----------|--------|
| B-EXIT-001 | Group cascade (L1/L2/L3 per group) | 🔴 CRITICAL | ✅ |
| B-EXIT-002 | Decommission + force logout after exit | 🔴 CRITICAL | ✅ |
| B-EXIT-003 | Safety guards (self, decommissioned, admin) | 🟡 HIGH | ✅ |
| B-EXIT-004 | Audit trail | 🟢 MEDIUM | ✅ |
