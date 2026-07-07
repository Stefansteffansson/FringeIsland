# H020 E2E + performance DoD + close-out — J-B to 6-done

---
id: TASK-JB-06
title: H020 E2E + perf DoD rows + 6-done close-out
status: done
assigned_to: Claude
priority: high
feature: FEAT-H020
owner: hub
wave: ferd
cycle: J-B
depends_on: [TASK-JB-04, TASK-JB-05]
estimated_hours: 4
---

## Description

E2E (Playwright, `hub/tests/e2e/journeys.spec.ts` extension or a `player.spec.ts`): enrol → walk → complete steps → leave → resume, against the migrated dev substrate. Performance DoD rows asserted (one boot read, B5 optimistic advance, B6 skeleton deferral). `next build` (the type gate) + lint. Both specs to `6-done` with Implementation notes; §L4 rows + the three README indexes updated same-commit; CHANGELOGs. The production waterfall (player boot cold/warm + step nav) rides the J-O3 area-gate protocol with Stefan's live walk — recorded as pending at 6-done, per the H019 precedent.

## Acceptance criteria

- [ ] E2E green locally (flake-watch items noted if sweep-only)
- [ ] Perf DoD rows asserted and labelled; `next build` green; lint 0 errors
- [ ] FEAT-PD003 + FEAT-H020 at `6-done` with honest Implementation notes (red→green evidence, deviations labelled)
- [ ] §L4 (journeys.md + hub SPECIFICATION) + feature READMEs + tasks README updated in the same commits

## Verification

`npm run test:e2e` + `npm run test:integration` + `npm run build` (hub) all green; dashboard refresh at session close.
