# J-A close-out — E2E journeys, the performance-budget assertions, the type gate, 6-done

---
id: TASK-JA-09
title: J-A close-out — E2E journeys, performance-budget assertions, next-build type gate, 6-done maturity
status: done
assigned_to: Claude
priority: high
feature: FEAT-H019
owner: hub
wave: ferd
cycle: J-A
depends_on: [TASK-JA-04, TASK-JA-06, TASK-JA-07, TASK-JA-08]
estimated_hours: 4
---

## Description
The pyramid's top + the ADR-U043 Performance DoD + close-out bookkeeping for all three features.

## Acceptance criteria
- [ ] Playwright spec(s): catalogue renders for the authed FIM → open detail → self-enrol → withdrawn via ConfirmModal; group-enrol via the picker; the group page shows its journeys section. Serial, storageState auth per house config.
- [ ] Performance DoD test rows (ADR-U043): first-paint request behaviour for `/journeys` and `/journeys/[id]` — call count ≤ the spec's stated N, zero duplicate fetches across auth-event churn; the B6 loading-state rule asserted (nothing <1 s, skeleton not spinner).
- [ ] `next build` green — the type gate before any 6-done (ts-jest/eslint do not full-type-check).
- [ ] Full suites green: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run lint`.
- [ ] Implementation notes in all three specs record red → green evidence honestly (any test-after labelled as such); route-policy + API-boundary + Performance DoD rows checked.
- [ ] Maturity `6-done` for FEAT-PD002 / FEAT-H019 / FEAT-PC016 + the three L4 summary rows + three features/README indexes, same commit; `CHANGELOG.md` updated (user-visible).
- [ ] The J-O3 area-gate waterfall (production, authenticated, cold+warm, ≥3 runs — Stefan's live walk) is scheduled/recorded per the completion-plan exit checklist — the area gate itself rides the area close, not this cycle's DoD, but the J-A pages join its protocol.

## Technical notes
E2E prior art: `hub/tests/e2e/journal.spec.ts` + `tests/e2e/helpers/auth.ts`; config `hub/playwright.config.ts` (dev server on :3000 required). Budgets: FEAT-H019 §Performance budget (B2/B3/B4 pages, B5 interactions, B6 rule). Auth-churn duplicate-fetch prior art: the groups-page effect keyed on stable `user.id`.

## Verification
All suites + `next build` green locally; maturity/L4/index edits in one commit; CHANGELOG entry present.
