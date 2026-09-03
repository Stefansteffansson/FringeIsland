---
id: TASK-E2E-04
title: journeys.spec + player.spec still walk the pre-reset seed titles — four E2E cells red since the 2026-08-12 reseed, found (not caused) at the #601 gate
status: done
assigned_to: claude
priority: medium
feature: FEAT-H019 (journeys.spec) + FEAT-H020 (player.spec) — test maintenance, no spec change
owner: hub
wave: ferd
cycle: none — filed 2026-09-03 at the TASK-JRN-PAUSE-01 gate walk
depends_on: []
estimated_hours: 1-2
---

# TASK-E2E-04 — two E2E specs walk journeys that no longer exist

**Found, not caused (2026-09-03, the #601 post-apply set).** `hub/tests/e2e/journeys.spec.ts` (2 cells) and `hub/tests/e2e/player.spec.ts` (2 cells) fail on the catalogue page: they look for the seed journeys **"Personal Development Kickstart"** and **"Leadership Fundamentals"**, and the live catalogue holds the post-cutover seed set — *Arrival on FringeIsland* (onboarding, not public), *Who am I?*, *What do I want?*, *How do I get there?* (all created 2026-08-12 at the Phase-4 DB reset + reseed). Both specs were last edited before the reseed and are untouched by #601; the failure is data-dependent and branch-independent. E2E is not in CI (the workflow is build · lint · unit), which is why three weeks passed unnoticed.

The later journey specs already follow the right pattern — `frozen-and-group-progress.spec.ts`, `player-completion-review.spec.ts`, `player-response-capture-review.spec.ts`, and `journey-pause.spec.ts` seed a **dedicated** journey by title in `beforeAll` and tear it down by title, never touching the live seed set (the J-B retro trap).

## What to do

- Convert `journeys.spec.ts` and `player.spec.ts` to seed their own fixture journeys (owner group + published journey + steps, the `seedFixture` / `teardownFixture` shape), keeping every assertion's intent: the catalogue card, the detail, self-enrol, Continue, the resume-at-step-2 arc, the gated step, the withdraw-then-re-enrol reactivation arc, the wielding walk.
- Do **not** re-seed the old titles into the live catalogue — the one database is production (memory `one-database-prod-equals-dev`).
- Run the two specs against the dev server; record the numbers in the specs' headers and in FEAT-H019 / FEAT-H020's notes (labelled test maintenance, not TDD).
- Consider (separately, a ruling): an E2E smoke job in CI, so a stale spec cannot sit red for weeks again.

## Verification

- `npx playwright test tests/e2e/journeys.spec.ts tests/e2e/player.spec.ts` green from `hub/` with the dev server on :3000, twice.
- `git grep -n "Personal Development Kickstart\|Leadership Fundamentals" hub/tests/e2e` returns nothing.

## Done (2026-09-03)

Both specs re-seeded on dedicated fixtures, the pattern the later journey specs use: `journeys.spec.ts` seeds an owner group + two public three-step journeys (*E2E H019 Solo Walk*, *E2E H019 Group Walk*) by title in `beforeAll` and tears them down by title; `player.spec.ts` seeds *E2E H020 Player Walk* (five required steps) and purges only the fixture's enrolments between its two arcs — the session FIM's onboarding enrolment is never touched, so the arrived-once re-arm is gone. Every assertion keeps its intent (the catalogue card, the steps overview, self-enrol, the badge scoped to the fixture card, withdraw, the wielding walk with the picker + the confirm naming the group, the group page's journeys section, the resume-at-step-2 arc, the gated step 3, the withdraw-then-re-enrol reactivation). **Green twice:** 4/4 (36.0 s), 4/4 (20.3 s), against the applied substrate on the dev server. `git grep` for the three old titles in `hub/tests/e2e` returns nothing. Labelled **test maintenance** (test-after by nature — the behaviour was already shipped), never claimed as TDD. FEAT-H019 / FEAT-H020 carry a revision line each. The CI smoke-job question is left as a ruling for Stefan.
