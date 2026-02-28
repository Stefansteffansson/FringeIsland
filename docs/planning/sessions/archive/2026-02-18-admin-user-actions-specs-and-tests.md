# Session: Admin User Actions — Specs & Failing Tests

**Date:** 2026-02-18
**Duration:** ~2 hours
**Version:** 0.2.21 (no version bump — TDD RED phase only)
**Focus:** Define behaviors and write failing tests for Admin User Management Actions (Sub-Sprint 3)

---

## Summary

Continued work on the DeusEx Admin Foundation. This session focused on two major deliverables:

1. **Behavior specification** — Rewrote `docs/specs/behaviors/admin.md` with 19 total behaviors (7 unchanged from Sub-Sprints 1+2, 5 revised to add detail, 7 brand-new for user selection/actions). All 14 new/revised behaviors were discussed in detail with the user before writing.

2. **Failing tests (TDD RED phase)** — Wrote 28 integration tests across 5 new test files covering B-ADMIN-008 through B-ADMIN-012. All files confirmed RED (17 failing, 11 passing). The passing tests are either trivially true or fail "for the wrong reason" (e.g., RPC doesn't exist yet = error, which satisfies "non-admin blocked" assertions).

No database changes, no migrations, no UI changes. Pure spec + test work.

---

## Completed

- [x] Discussed and finalized all user management requirements with user
- [x] Wrote 19-behavior admin spec (complete rewrite of `docs/specs/behaviors/admin.md`)
- [x] Updated feature doc (`docs/features/active/deusex-admin-foundation.md`) with Sub-Sprint 3 scope
- [x] Created sprint plan: 16 steps across 3 sub-sprints (3A DB, 3B UI, 3C Wire)
- [x] Wrote 5 new test files (28 tests total)
- [x] Confirmed all test files are RED (17 failing)
- [x] Fixed false positive in admin-group-visibility tests (all 7 were passing — fixed by changing group creator and adding outsider user)

---

## Decisions Made (from user discussion)

1. **Panel rename:** "Active Users" → "Users" showing total count
2. **Selection scope:** Users panel only (not groups, journeys, enrollments)
3. **Selection model:** Click to toggle, Shift+click for range, header checkbox for select-all, cross-page persistence
4. **Action grouping:** Communication (Message, Notify) / Account (Deactivate, Activate, Delete soft, Delete hard, Logout) / Group (Invite to, Join to, Remove from)
5. **Context-sensitive actions:** Disable when irrelevant to selection state
6. **Remove from group:** Shows intersection of groups ALL selected users belong to (no personal/system groups)
7. **Visibility default:** Active + inactive users shown; decommissioned hidden by default with toggle
8. **Message action:** Creates individual DM to each selected user
9. **Soft delete = decommission:** `is_decommissioned = true, is_active = false`
10. **Logout action:** Invalidates session, user redirected to login page

---

## Test Results (RED Phase)

| Test File | Behavior | Failed | Passed | Total |
|---|---|---|---|---|
| `user-decommission.test.ts` | B-ADMIN-008 | 5 | 1 | 6 |
| `user-hard-delete.test.ts` | B-ADMIN-009 | 3 | 2 | 5 |
| `admin-user-management.test.ts` | B-ADMIN-010 | 4 | 1 | 5 |
| `admin-notification-send.test.ts` | B-ADMIN-011 | 4 | 1 | 5 |
| `admin-group-visibility.test.ts` | B-ADMIN-012 | 1 | 6 | 7 |
| **Total** | | **17** | **11** | **28** |

**Note:** Existing 349 tests were NOT re-verified this session (full suite run was interrupted). Should be verified at start of next session before proceeding to implementation.

---

## Files Changed

### Created
- `tests/integration/admin/user-decommission.test.ts` (B-ADMIN-008, 6 tests)
- `tests/integration/admin/user-hard-delete.test.ts` (B-ADMIN-009, 5 tests)
- `tests/integration/admin/admin-user-management.test.ts` (B-ADMIN-010, 5 tests)
- `tests/integration/admin/admin-notification-send.test.ts` (B-ADMIN-011, 5 tests)
- `tests/integration/admin/admin-group-visibility.test.ts` (B-ADMIN-012, 7 tests)

### Modified
- `docs/specs/behaviors/admin.md` — Complete rewrite (19 behaviors)
- `docs/features/active/deusex-admin-foundation.md` — Added Sub-Sprint 3 scope (decisions 7-14, sub-sprint breakdowns)

---

## Issues Discovered

1. **Current users UPDATE policy is too broad** — Normal users can update OTHER users' `is_active` field. The `admin-user-management.test.ts` "block non-admin" test exposed this. Needs to be fixed in implementation (restrict UPDATE to own row OR admin).

2. **Some tests pass "for wrong reason"** — `user-hard-delete` and `admin-notification-send` non-admin tests pass because the RPC functions don't exist yet (function-not-found = error). After implementation, these tests need monitoring to confirm they fail for the RIGHT reason (permission denied, not function-not-found).

3. **`is_decommissioned` column doesn't exist yet** — Confirmed by schema inspection. Needs migration in Step 5.

---

## Sprint Plan (for next session)

Currently at **Step 3 complete** (RED confirmed). Next steps:

### Sub-Sprint 3A: DB Foundation
- **Step 4:** Design — `is_decommissioned` column, admin UPDATE policy, RPCs, group visibility policy
- **Step 5:** Implement migrations
- **Step 6:** Verify GREEN

### Sub-Sprint 3B: UI Foundation
- **Step 7:** Write UI behavior tests (selection, action bar)
- **Step 8:** Run tests (RED)
- **Step 9:** Design UI components
- **Step 10:** Implement UI
- **Step 11:** Verify GREEN

### Sub-Sprint 3C: Wire Actions
- **Step 12:** Write action-wiring tests
- **Step 13:** Run tests (RED)
- **Step 14:** Implement action handlers
- **Step 15:** Verify GREEN
- **Step 16:** Document everything

---

## Context for Next Session

**What you need to know:**
- Read this bridge doc first
- All test files are written and confirmed RED
- The sprint plan has 16 steps; we completed steps 1-3
- Step 4 (Design) is next — Architect Agent designs the schema/RLS/RPC changes
- IMPORTANT: Run full test suite first to verify existing 349 tests still pass
- The `notification` type field is TEXT (not enum) — new type `admin_notification` is safe to add
- The `conversations` table has a `participant_1 < participant_2` constraint

**Useful docs:**
- `docs/features/active/deusex-admin-foundation.md` — Full feature doc with Sub-Sprint 3 scope
- `docs/specs/behaviors/admin.md` — All 19 admin behaviors
- `docs/agents/contexts/architect-agent.md` — For Step 4 design work
- `docs/agents/contexts/database-agent.md` — For Step 5 migration work
