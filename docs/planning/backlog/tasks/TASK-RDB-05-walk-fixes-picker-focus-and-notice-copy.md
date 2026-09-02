# RD-B walk fixes — the named-group picker, the landing focus, and the notice copy

---
id: TASK-RDB-05
title: RD-B live-walk fixes — W-1 focus landing, W-2/W-3/W-4 section behaviour, W-5 named-group picker, W-8 notice copy
status: done  # closed 2026-09-02 backlog-truth pass: RD-B closed 2026-08-09 (bridge 2026-08-09_02), migration 20260808120000 applied, FEAT-H044 + FEAT-PC028 at 6-done — was: review
assigned_to: claude
priority: high
feature: FEAT-H044
owner: hub
wave: ferd
cycle: RD-B
depends_on: [TASK-RDB-03]
estimated_hours: 5
---

## Description

Six of the ten [RD-B walk findings](../../hub-v2/2026-08-07-rd-b-desk-walk-findings.md),
built. Two were acceptance criteria that had shipped **unbuilt** — W-5 and W-8 — which is
why `FEAT-H044` and `FEAT-PC028` are both back at `5-in-cycle`.

**HELD AT THE SCHEMA GATE.** `20260808120000` (W-8) is written and red-proven; it is not
applied.

## What was built

| | Fix |
|---|---|
| **W-1** | Roles notices land on `?focus=roles`; the section expands, scrolls into view, rings once. `notificationTarget()` gained the three kinds; the param is read behind a Suspense boundary (the `useSearchParams` CSR-bailout rule, the `/groups` precedent). |
| **W-2** | Availability gating removed from the section — `canManage` alone, matching Add role / Edit grants / Delete beside it. **Amends STORY-1's AC.** |
| **W-3** | Adopted-and-current entries hidden; the "nothing new is offered" line becomes reachable. |
| **W-4** | The holder sentence stops saying "0 members hold this role. They keep the role…". |
| **W-5** | **Publish to named groups, built** — a searchable picker inside `ConfirmModal` (`ReactNode` message + `confirmDisabled`), already-published groups shown rather than re-offered, `filter=engagement` because personal groups are never publication targets. |
| **W-8** | Migration `20260808120000`: the three notice bodies interpolate `g.name`. Fan-out unchanged. |

## Not built — ruled or routed elsewhere

- **W-6** (publish ceremony does not state its blast radius) — open, unruled.
- **W-7** (integration cell C3 fans out across the whole group table) — open, unruled.
- **W-9** (a guaranteed refusal is offered as a button) — **RD-A's behaviour**, not this
  cycle's; routed to FEAT-H043's owner. Stefan already ruled the pattern at the ADM-E walk
  (WA-1: guaranteed no-ops disable).
- **W-10** (a clone can never leave the catalogue) — observation, no decision yet.

## Acceptance criteria

- [x] W-1 target + landing, with the section **expanded** (a collapsed disclosure would
      half-solve the complaint), and no scroll-jack for a member who cannot manage roles
- [x] W-2/W-3/W-4 with their unit cells **inverted and labelled** — ruled behaviour
      changes, not weakened assertions
- [x] W-5 picker, driven by its own tests **written first**
- [x] W-8 migration, three literals patched programmatically with an assertion that each
      matched exactly once and no `your group` survived
- [x] Integration W8a–W8d demonstrated **red** against the live stack
- [x] The E2E creates named reach **through the picker**, not by inserting the row
- [x] Unit 1403/1403 · lint 0 errors · `next build` green · `role-distribution.spec.ts` 3/3
- [x] **Migration applied on a named approval**, then W8a–W8d green — done by RD-B close 2026-08-09 (bridge `2026-08-09_02`); ticked at the 2026-09-02 backlog-truth pass
- [x] `FEAT-H044` and `FEAT-PC028` return to `6-done`; §L4 rows follow — both read `maturity: 6-done` (verified 2026-09-02)

## Apply commands

```bash
node scripts/apply-migration-temp.js 20260808120000_rd_b_walk_w8_notices_name_their_group.sql
bash supabase-cli.sh migration repair --status applied 20260808120000
cd hub && npx jest tests/integration/groups/role-publication-and-diff.test.ts --runInBand -t "W8"
```

## The two rules this task encodes in the suite

Both come from W-5 and W-8 sharing one root cause — **a fixture that invents a payload the
substrate never produces**:

1. **When copy is server-authored, the copy check reads the migration's literal**, never
   the component's fixture. A component test can prove the surface renders what it is
   given; it can never prove the server gives it that.
2. **When a feature adds a write door, at least one test must reach the state through that
   door.** A fixture may set up everything the door is not responsible for — never the
   thing it produces.

Both were violated by tests that were green at `6-done`, and Stefan found both defects on
his first two clicks of the surface.
