---
id: TASK-ANN-01
title: REGRESSION — a platform admin can no longer read a suspended group's announcements; the PC026 sight arm was dropped when PD019 T3 re-issued get_group_announcements (2026-08-20)
status: review  # corrective built 2026-09-02, HELD at the schema gate
assigned_to: claude
priority: high
feature: FEAT-PC026 (ADM-G admin sight) ← broken by FEAT-PD019 T3 (wielded announcements)
owner: platform/domain (DS-5 contract) + platform/core (the admin arm)
wave: ferd
cycle: none — found 2026-09-02 by the first full integration run since 2026-08-20 (INT-01's close), during the Ferd leftovers pass
depends_on: []
estimated_hours: 1
---

# TASK-ANN-01 — restore the admin sight arm on `get_group_announcements`

**Found (2026-09-02, found-not-caused):** the first full `tests/integration` run since 2026-08-20 (run for TASK-INT-01's close) failed one cell in `admin/suspended-group-admin-access.test.ts` — *"get_group_announcements admits the admin"* — with `Group membership required` (42501). The control run of that suite alone fails identically at main HEAD. Not a flake.

**The mechanism, exactly.** FEAT-PC026 (ADM-G, migration `20260804230000`) armed the three content reads for the admin plane: a platform admin is admitted to a **suspended** group's forum, announcements and conversations without being a member — *"exactly where the admin plane has already acted"*. On 2026-08-20, FEAT-PD019 tranche 3 (migration `20260820150000`) re-issued `get_group_announcements` to add the wielded (`p_acting`) limb, and its personal branch reads:

```
IF p_acting IS NULL THEN
  IF NOT public.is_active_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Group membership required' USING ERRCODE = '42501';
```

— the PC026 arm `OR (public.is_platform_admin() AND <group is suspended>)` is gone. The PC023 STORY-8 quarantine below it still names `is_platform_admin()`, so the file *reads* as if admins are handled; they are refused two lines earlier. Forum and conversations kept their arms (their T1/T2 re-issues carried them); announcements alone lost it.

**Blast radius, plainly:** on production, `/admin/groups/[id]` for a suspended engagement group — the H041 wing's **Announcements** pane 404-collapses ("This section could not be loaded"). Forum and conversations panes work. Thirteen days, unnoticed: the T3 gate ran "slices 16 suites 178/178" and the wielded E2E journeys; the T3 migration header's sibling sweep named **only the announcement suites** — not `suspended-group-admin-access.test.ts`, and not `admin-suspended-content.spec.ts` (which asserts that pane). This is the class the platform tier's sibling-assertion rule and the Q1 rule (codified today, #585) exist for: a re-issue that changes a function must grep for every sibling naming it, and the affected E2E journeys join the post-apply set.

## The corrective — `20260902220000_task_ann01_restore_admin_announcement_sight.sql`

Re-issues `get_group_announcements` **byte-identical to the T3 body** except the personal branch, which regains the PC026 arm:

```
IF NOT public.is_active_group_member(p_group_id)
   AND NOT (public.is_platform_admin()
            AND (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended') THEN
  RAISE EXCEPTION 'Group membership required' USING ERRCODE = '42501';
```

The wielded limb (`p_acting`) is untouched — the admin plane does not wield. Nothing else in the body moves.

## Acceptance criteria

- [ ] `suspended-group-admin-access.test.ts` green (the red cell is the existing one — no new test needed; it was doing its job).
- [ ] `admin-suspended-content.spec.ts` green (the E2E that asserts the pane).
- [ ] The announcement suites (`communication` slice + `wielded-announcements` E2E) still green — the wielded limb untouched.
- [ ] FEAT-PC026 and FEAT-PD019 carry a dated corrective note; the T3 lesson recorded (a re-issue's sibling sweep must include every suite naming the function, not the feature's own).

## Verification (at the gate, on the named approval)

```
cd hub && node scripts/apply-migration-temp.js 20260902220000_task_ann01_restore_admin_announcement_sight.sql
npm run test:integration:admin
npm run test:integration:communication
npx playwright test tests/e2e/admin-suspended-content.spec.ts tests/e2e/wielded-announcements.spec.ts
```
