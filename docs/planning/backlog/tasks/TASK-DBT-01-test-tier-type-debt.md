# Test-tier type debt — `tsc --noEmit` fails across test files

---
id: TASK-DBT-01
title: Test-tier type debt — ~1,300 lines of tsc errors in hub/tests (latent; ts-jest does not type-check, next build excludes tests)
status: todo
assigned_to: claude
priority: low
feature: none  # hygiene sweep
owner: products/hub
wave: ferd
cycle: unscheduled — a cooldown-week sweep, or ride the A-ADM area open
depends_on: []
estimated_hours: 6
---

## Description

Found during COR-C W3 (2026-07-31) when running `tsc --noEmit` over the whole
Hub: the TEST tier carries ~1,287 lines of type errors that no gate has ever
seen — `ts-jest` does not full-type-check (the PC003 lesson memory), and
`next build` (the type gate) excludes `tests/`. The app tier is clean.

Dominant shapes: NextResponse/Response mock typing in BFF route tests
(`group-leadership-routes.test.ts`, 39), loose fetch-mock bodies in
`GroupForumSection` suites (30+30), supabase-js `PostgrestFilterBuilder`
vs `Promise` shapes in `lifecycle-dispositions.test.ts`. The
`consent-read.test.ts` slice (14 errors, an over-narrow generic) was fixed at
COR-C W8 as the demonstrator.

## Acceptance criteria

- [ ] `npx tsc --noEmit` clean over the whole hub workspace (app + tests)
- [ ] A CI/gate decision: does `tsc --noEmit` join the DoD sweep so the debt
      cannot silently regrow? (Cheap once clean; decide at the sweep.)

## Verification

`npx tsc --noEmit` exit 0; the gate decision recorded in the cycle notes.
