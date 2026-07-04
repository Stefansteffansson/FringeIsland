# E2E journeys + finalize (build gate, 6-done paperwork)

---
id: TASK-H015-03
title: E2E — the invitation arc (two FIMs) + the email-invited newcomer sign-up arc + decline/cancel; next build gate; 6-done paperwork
status: todo
assigned_to: claude
priority: high
feature: FEAT-H015
owner: hub
wave: ferd
cycle: Groups G-C
depends_on: [TASK-H015-02]
estimated_hours: 4
---

## Description

E2E journeys (Playwright, dev server on :3000), then the gates and paperwork.

Journeys (dedicated spec-created FIMs in their own contexts — the G-B suite-isolation default; the newcomer arc creates a fresh sign-up):
1. **The invitation arc:** Steward opens the group page → searches the second FIM by name → invites → pending list shows them → the invitee's `/groups` shows the invitation → accepts → group appears in their list; Steward's member list re-read shows the new member.
2. **The email-invited newcomer:** Steward invites a fresh email → pending list shows it with expiry → the person signs up with that email → their `/groups` shows the waiting invitation (substrate auto-claim) → accept joins.
3. **Decline + cancel:** invitee declines via ConfirmModal (entry gone, list unchanged); Steward cancels a pending email invitation via ConfirmModal (row gone).

## Acceptance criteria

- [ ] All three journeys green in the full E2E run (suite-isolation: own users, own contexts)
- [ ] `next build` clean (the type gate — memory: ts-jest/eslint don't full-type-check)
- [ ] Full unit + integration + E2E suites green; lint 0 errors
- [ ] 6-done paperwork in one batch: FEAT-H015 Implementation notes + maturity, hub SPECIFICATION §L4 row + coverage note, features README row, CHANGELOG (user-visible), Groups plan G-C row, session bridge

## Verification

`npm run test:e2e` full green; `npm run build`; paperwork per the feature-development skill Step 5.
