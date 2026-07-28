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

## The separate decision — MADE AND EXECUTED 2026-07-28 (migration `20260728200000`)

**It was a delete, for 10 598 of 11 272.** The characterisation above was right to stop the delete and wrong about its size — both halves matter, so both are recorded.

**What the blast-radius numbers actually meant, measured rather than inferred:**

- *"8 690 are active members of real groups"* — **8 808 of those memberships are of ONE group**, the `FringeIsland Members` system group every account joins. Removing a departed test account from the everyone-group is not damage to a member list; it is the correct state. Exactly **two** engagement groups held an orphan (one each), and only **three** groups in total also held a live member.
- *"401 authored messages"* — exactly **one** sat in a conversation any live user participates in.
- **0 RESTRICT referrers** — no consent records, no authored journeys. The delete could not half-fail.

**The trap that made the first strict pass say "zero are safe".** Every personal group is `created_by_group_id` / `added_by_group_id` / `assigned_by_group_id` of its own bootstrap rows, so a naive "does it attribute anything?" test keeps all 11 272. That is **self-referential attribution — the same shape NB-8 found**, where a Mist held a durable notification addressed to itself. Attribution to rows that cascade away with you is not attribution. The strict definition was wrong, not the data.

**The discriminator that works:** does this orphan attribute anything that *survives* the delete?

| | Count | Why |
|---|---|---|
| Orphaned | 11 272 | |
| **Kept** | **674** | 195 sent a message that outlives them · 413 are the actor on an `admin_audit_log` row (audit rows never cascade — each would be a real loss) · a handful attribute a surviving group / membership / role / enrolment / notification-context |
| **Deleted** | **10 598** | attribute nothing that survives |

**Reclaimed:** 10 598 groups · 18 783 memberships · 651 notifications · 526 enrolments. Personal groups **12 946 → 2 352**; orphan share **87% → 28.7%**, and every remaining orphan is there for a stated reason rather than by neglect.

**The control that mattered** — asserted in the migration, then verified independently afterwards: **messages 420, all 420 still carrying a sender.** Not one message lost its author. Audit actors (883) unchanged, forum posts unchanged, live personal groups unchanged.

**An audit trail that forgets who acted is worth more than the rows it would reclaim** — which is why the 674 stay, and why "delete the orphans" was never the right instruction, only "delete the ones that attribute nothing."

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
- [x] ~~Decide separately what to do with the 11 150 groups already orphaned~~ **DECIDED AND EXECUTED 2026-07-28** — migration `20260728200000`. It *was* a delete, for 10 598 of them. See below.

## Verification

Run any integration directory, counting `public.groups WHERE group_type = 'personal'` before and after. The delta must be zero. Before this task: +6 to +7 per notifications run. Before the 2026-07-28 partial fix: every cleanup leaked.
