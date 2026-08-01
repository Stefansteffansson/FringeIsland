# Cycle ADM-C opening hygiene — the two pre-existing lint errors on main

---
id: TASK-ADMC-00
title: Fix the two pre-existing react-hooks/set-state-in-effect lint errors on main (AdminDashboard.tsx:50, AccountMenu.tsx:35)
status: done
assigned_to: unassigned
priority: medium
feature: none
owner: hub
wave: ferd
cycle: ADM-C
depends_on: []
estimated_hours: 1
---

## Description

The ADM-B close found (not caused) two lint errors on main: `hub/components/admin/AdminDashboard.tsx:50` and `hub/components/ui/AccountMenu.tsx:35`, both `react-hooks/set-state-in-effect` — likely an eslint-plugin-react-hooks version bite (rule newly enforced over old patterns). Board CB-5 routed them to ADM-C's opening hygiene block: fix them before the build starts so the cycle's own lint runs are clean signals. TASK-DOC-007 (the platform-core CHANGELOG backfill, re-ID'd from the colliding TASK-DOC-005) rides the same opener as its docs half.

## Acceptance criteria

- [ ] Both errors fixed by restructuring the effect (derive state or move the set out of the effect body per the rule's intent) — not by disable comments, unless the pattern is genuinely legitimate, in which case a targeted disable with a reason comment and a note here.
- [ ] `npm run lint` clean in `hub/`.
- [ ] Unit suites for both components green; no behavioral change (these are admin dashboard + account menu render paths — verify with the existing suites, and eyeball both surfaces if in doubt).

## Technical notes

Run from `hub/` (the cwd discipline — bridge watch-item 5). The dashboard file is touched again later in the cycle (the "Member administration" card, TASK-ADMC-02) — fix lands first so that diff stays clean.

## Verification

`cd hub && npm run lint` exits clean; `cd hub && npx jest tests/unit --silent` green on the affected suites.
