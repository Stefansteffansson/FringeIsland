# Test fixtures still orphan personal groups — the universal blocker is fixed, two residual sources are not

---
id: TASK-INT-03
title: Test teardown leaks personal groups (sole-Steward guard + suites bypassing cleanupTestUser) — close the residual sources
status: open
assigned_to: unassigned
priority: medium
feature: none
owner: platform/core/organisation
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 3
---

## Impact — TEST-ONLY, but it accumulated to 87% of a production table

Raised at the A-NTF area gate (2026-07-28) while scoping the orphan cleanup.

**Measured before any fix:** 11 150 orphaned personal groups (groups of `group_type = 'personal'` that no `users` row points at) out of 12 687 total — **87%** — holding **36 961 notification rows**, which was **73% of `public.notifications`**. 2 248 of the orphans had been created in the preceding 7 days, so it was actively growing, not historical.

The rows were retired by migration `20260728080000`. **The groups themselves were deliberately left in place** — 8 690 are active members of real (non-personal) groups, 577 hold journey enrolments and 401 authored messages, so deleting them would cascade into real member lists and destroy message attribution (against ADR-U021's spirit). That is a separate decision with a separate blast radius.

No end-user exposure: an orphaned group is unreachable (every read door resolves the caller via `get_current_personal_group_id()`, and with no `users` row no caller can ever resolve it). The cost is table bloat and a badly misleading denominator in any count over `groups` or `notifications`.

## What was fixed (2026-07-28)

`cleanupTestUser` (`hub/tests/helpers/supabase.ts`) deleted the personal group **before** the auth user, and **ignored the result**. That delete could never succeed: `users` references the group, so deleting it fires the FK's `SET NULL` on `users.personal_group_id`, which an immutability trigger rejects —

```
personal_group_id cannot be changed after it has been set (old: <id>, new: <NULL>)
```

The discarded error was followed by the auth delete, which CASCADEd `public.users` away and left the group with nothing pointing at it. **Every single cleanup leaked.** The order is now auth-user-first (so `public.users` CASCADEs, leaving the group unreferenced), then the group, and the failure is logged loudly instead of swallowed.

The Mist teardown in `mist-posture-and-ask-delivery.test.ts` had the same shape and was fixed with it: deleting a Mist's auth user never removes its personal group, because `groups` carries no FK to `users`.

## What is still open

A full `tests/integration/notifications` run still leaks **~6 personal groups**, from two distinct sources:

1. **The sole-Steward guard, ~2 per run.** A test user who created an engagement group and remains its only Steward cannot have their personal group deleted — the domain rule is *"Cannot remove the last Steward from the group. Assign another Steward first."* **This rule is correct and must not be weakened.** The fix belongs in the fixtures: a suite that creates an engagement group should delete that group in its own teardown, before `cleanupTestUser` runs.
2. **The remainder, ~4 per run — unattributed.** Suites that create users or groups without going through `cleanupTestUser`, or that create secondary groups nothing tears down. Needs attribution before it can be fixed; the loud logging added above is the instrument for that.

## Acceptance

- [ ] Attribute the ~4 unexplained leaks per notifications run to specific suites (the `was NOT deleted` log lines and a before/after count of `groups WHERE group_type = 'personal'` are the instrument).
- [ ] Engagement groups created by a suite are torn down by that suite, so the sole-Steward guard is never hit at cleanup. The guard itself is unchanged.
- [ ] A full `tests/integration` run leaks **zero** personal groups, asserted by a before/after count rather than by inspection.
- [ ] Decide separately what to do with the 11 150 groups already orphaned — they hold live memberships, enrolments and message authorship, so this is not a delete.

## Verification

Run any integration directory, counting `public.groups WHERE group_type = 'personal'` before and after. The delta must be zero. Before this task: +6 to +7 per notifications run. Before the 2026-07-28 partial fix: every cleanup leaked.
