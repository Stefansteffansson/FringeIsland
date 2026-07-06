# E2E journey + finalize FEAT-H018

---
id: TASK-H018-03
title: E2E group-of-groups journey + 6-done close
status: done
assigned_to: claude
priority: high
feature: FEAT-H018
owner: hub
wave: ferd
cycle: G-F
depends_on: [TASK-H018-02]
estimated_hours: 3
---

## Description

Playwright journey(s): Steward invites a group; the wielder answers as the group; badges + non-system counts render honestly (the Gracy case: last human alone with the caretaker sees Close). Then the 6-done close: Implementation notes, Hub §L4 summary row + features/README same-commit, root + Hub CHANGELOG bundled G-F entry, Groups plan row, task statuses.

## Acceptance criteria

- [ ] E2E green on dedicated spec-created fixtures; full unit + integration + E2E suites green
- [ ] `next build` clean (the type gate — ts-jest/eslint don't full-type-check)
- [ ] FEAT-H018 6-done with red→green evidence recorded honestly; all indexes/summaries updated same-commit

## Technical notes

E2E fixtures may seed the second group + key-holder via the admin client (house pattern). The Gracy-case fixture: one human + DeusEx active member.

## Verification

Full suite green; PR merged (no schema — fuller-auto applies); `main` synced.
