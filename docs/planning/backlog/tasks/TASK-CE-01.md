# Red suites — seal, export, exclusion (demonstrated red)

---
id: TASK-CE-01
title: C-E red suites — D2 preserve-and-seal, communication export (incl. suspended), CB-1 Mist-exclusion proof
status: todo
assigned_to: claude
priority: high
feature: FEAT-PD012
owner: platform/domain/communication
wave: ferd
cycle: C-E
depends_on: []
estimated_hours: 3
---

## Description

Write the integration suites for every FEAT-PD012 story, red-first against the un-migrated dev DB (expected classes: PGRST202 absent-function, 42703 absent-column, plus labelled regression greens where behaviour already holds).

## Acceptance criteria

- [ ] STORY-1: seal on close (stamped in-transaction; inbox/group-list exclusion; send + join refuse; detail still readable; `dm`-kind untouched)
- [ ] STORY-2: delete dispositions identically (`'group_archived'` reason; forum/messages rows byte-identical; reason validation raises; W12 direct-call REVOKE check on the handler)
- [ ] STORY-3: forum record preserved across close→archive (no row mutation; posts present in author's export)
- [ ] STORY-4: `communication` section (4 sub-keys incl. `reports_submitted` with snapshot; own-data wall — no other participant's bodies; empty-shape stability; W12 direct-call own-rows check)
- [ ] STORY-5: suspended member's full composite export succeeds (no 42501 from any section) — red today via the walks section
- [ ] STORY-6: Mist actor refused at every DS-5 write door (send, DM get-or-create, group create/join/leave-write paths, forum post/reply/edit-own/delete-own, report submit, both announcement sends)
- [ ] Regression greens labelled as such (DM immutability untouched; existing exports' shapes unchanged)
- [ ] Full run demonstrates red with failure classes recorded in the run log

## Technical notes

Suites under `hub/tests/integration/communication/` (lifecycle + export) — follow the C-D suite shapes. Mist actor provisioning per the `mist-transcendence` suite's fixtures. Remember the dev-DB single-writer rule (no concurrent integration runs).

## Verification

`npm run test:integration:communication` — all new tests red for the expected classes, regressions green.
