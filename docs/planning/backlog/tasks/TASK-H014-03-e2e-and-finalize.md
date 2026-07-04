# E2E journeys + gates + 6-done paperwork (Cycle G-B close)

---
id: TASK-H014-03
title: E2E (Steward shapes a role, assigns it, assignee's "what I can do here" changes; escalation refusal; last-Steward refusal) + next build gate + 6-done paperwork for FEAT-PC011 + FEAT-H014
status: done
assigned_to: claude
priority: high
feature: FEAT-H014
owner: hub
wave: ferd
cycle: Groups G-B
depends_on: [TASK-H014-02]
estimated_hours: 3
---

## Description

The bridge-named E2E journeys on the real stack (dev server on :3000), then the cycle close.

## Acceptance criteria

- [ ] E2E 1 (the delegation journey): Steward creates a group, adds a custom role from the checklist, assigns it to a second FIM via the member list; the second FIM's "what I can do here" shows the new capability
- [ ] E2E 2 (escalation refusal): the wall's message surfaces in place, nothing changes visually
- [ ] E2E 3 (last-Steward refusal): removing the only Steward binding surfaces the invariant's message; the chip stays
- [ ] `npm run test:e2e` full suite green; full unit + integration green; `next build` clean (the type gate — memory: ts-jest/eslint don't full-type-check); lint clean
- [ ] 6-done paperwork in one batch: FEAT-PC011 + FEAT-H014 maturity `6-done`; org-spec + hub-spec §L4 rows; both features/README indexes; root + hub CHANGELOG cycle entry; Groups plan G-B row; session bridge; dashboard refresh

## Technical notes

E2E in `hub/tests/e2e/` extending `groups.spec.ts` patterns (spec-created second FIM per the H013 non-member matrix precedent — ADR-U038 S3 consent metadata required at creation). Second-FIM sign-in context via Playwright browser contexts (H012's two-context precedent).

## Verification

All gates green; paperwork committed in the close batch.
