# D15 Hardening Behaviors

> **Purpose:** Document guarantees added during the D15 Universal Group Pattern hardening sprint.
> **Domain Code:** D15
> **Date:** 2026-02-23

---

## B-D15-001: personal_group_id Immutability

**Rule:** Once `personal_group_id` is set on a `public.users` row, it can NEVER be changed by UPDATE.

**Why:** Personal group ID is the user's identity in the universal group pattern. Changing it would orphan all memberships, roles, permissions, and audit trails. This is a security invariant.

**Verified by:**
- **Test:** `tests/integration/rbac/d15-hardening.test.ts`
- **Trigger:** `enforce_personal_group_id_immutability()` on `public.users`

**Acceptance Criteria:**
- [x] UPDATE that changes `personal_group_id` to a different UUID raises an error
- [x] UPDATE that sets `personal_group_id` to NULL raises an error
- [x] UPDATE of other fields (e.g., `bio`) succeeds normally
- [x] Initial set from NULL → UUID by `handle_new_user()` trigger is allowed

**Testing Priority:** 🔴 CRITICAL (security invariant)

---

## B-D15-002: Groups-Join-Groups

**Rule:** An engagement group can be a member of another engagement group via `member_group_id` in `group_memberships`.

**Why:** The universal group pattern treats all actors as groups. Engagement groups joining other groups enables organizational hierarchies.

**Verified by:**
- **Test:** `tests/integration/rbac/groups-join-groups.test.ts`

**Acceptance Criteria:**
- [x] Engagement group inserted as `member_group_id` in `group_memberships` succeeds
- [x] Membership is visible to host group members via RLS

**Testing Priority:** 🟡 HIGH (architectural guarantee)

---

## B-D15-003: has_permission() with Engagement Group Actor

**Rule:** `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` works when `p_acting_group_id` is an engagement group (not just personal groups).

**Why:** The function must be generic — any group that has a membership and role assignment can check permissions.

**Verified by:**
- **Test:** `tests/integration/rbac/groups-join-groups.test.ts`

**Acceptance Criteria:**
- [x] `has_permission(engagementGroupA, engagementGroupB, 'invite_members')` → true (if A is Steward in B)
- [x] `has_permission(engagementGroupA, unrelatedGroup, 'view_member_list')` → false (no membership)

**Testing Priority:** 🟡 HIGH (permission system generality)

---

## B-D15-004: Myself Role Has Zero Permissions

**Rule:** The "Myself" role template (used for personal group self-membership) has zero `group_role_permissions` entries.

**Why:** Personal group permissions come from FI Members (system group), not from the Myself role. The Myself role exists only to establish the self-membership relationship.

**Verified by:**
- **Test:** `tests/integration/rbac/personal-groups.test.ts`

**Acceptance Criteria:**
- [x] `group_role_permissions` for a Myself role has 0 rows
- [x] `has_permission(personalGroupId, personalGroupId, 'invite_members')` → false

**Testing Priority:** 🟢 MEDIUM (correctness guarantee)

---

## B-D15-005: Admin Auth Resolution Chain

**Rule:** DeusEx admin permissions resolve through the chain: JWT `auth_user_id` → `personal_group_id` → DeusEx membership → permissions.

**Why:** Even admins use the universal group pattern. This verifies the full chain works end-to-end.

**Verified by:**
- **Test:** `tests/integration/admin/deusex-bootstrap.test.ts`

**Acceptance Criteria:**
- [x] Admin's `personal_group_id` resolves from JWT
- [x] `has_permission(personalGroupId, anyGroup, 'manage_all_groups')` → true

**Testing Priority:** 🟢 MEDIUM (admin path verification)

---

## Notes

**All behaviors added:** 2026-02-23 (D15 Hardening Sprint)
**Related migration:** D15 Universal Group Pattern (`20260222000000_rebuild_universal_group_pattern.sql`)
