# H022 E2E + perf DoD + 6-done close-out

---
id: TASK-JD-05
title: H022 E2E, perf DoD, and J-D close-out
status: done
assigned_to: Claude (delegated session + lead verification)
priority: high
feature: FEAT-H022
owner: hub
wave: ferd
cycle: J-D
depends_on: [TASK-JD-03, TASK-JD-04]
estimated_hours: 3
---

## Description
The J-D close-out gates: E2E arc (`frozen-and-group-progress.spec.ts`) — group enrol → member walks → leader expands panel ("not shared") → member shares → marks appear (the **effect** asserted, not the click) → member revokes → "not shared" again → freeze via close_group → traveller boots the frozen banner read-only; `next build`; lint; both specs to 6-done with honest Implementation notes (Q1–Q9 + red→green + the Q8 disposition + the IDN-10/G-36 record); CHANGELOGs; completion plan → v6; plain-English walkthrough at cycle close (bound); session bridge.

## Acceptance criteria
- [ ] E2E arc green + clean isolated re-run; every asserted interaction asserts its observable effect (retro-2026-07-08-j-c §4); sibling specs (`player.spec`, `journeys.spec`, `player-completion-review.spec`) unchanged green, lead-verified together.
- [ ] Perf ACs asserted (frozen boot = one read + cache; panel fetch on expand only; toggle B5) — frozen boot + panel expand recorded for the J-O3 area-gate waterfall list.
- [ ] `next build` green (the type gate — before 6-done, never after); lint 0 errors.
- [ ] Both specs 6-done: Implementation notes honest (including anything red that stayed red and why); §L4 rows + feature READMEs updated same-commit; IDN-10/G-36 what-this-closes recorded in PD005's notes and the plan row.
- [ ] Plain-English walkthrough written and walked against shipped behaviour (continuity questions: freeze→rejoin→unfreeze?, share→leave→rejoin, frozen+completed, legacy-completed member in the panel).
- [ ] CHANGELOGs (root + Hub); completion plan J-D row CLOSED (v6); session bridge under `docs/planning/sessions/`.

## Technical notes
Dev server on `localhost:3000` for E2E. Close-group freezing in E2E requires the last-member/Steward closure flow (H017 surfaces) or admin-driven fixture — prefer the real flow where feasible.

## Verification
All gates in one lead-verified pass: integration sweep + unit + E2E ×4 specs + build + lint.
