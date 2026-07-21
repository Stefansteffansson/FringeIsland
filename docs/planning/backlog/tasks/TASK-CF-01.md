# Red integration suites — account lifecycle self-service contracts

---
id: TASK-CF-01
title: Red integration suites for FEAT-PC017 + the FEAT-PC005 origin gate, demonstrated red pre-apply
status: done
assigned_to: claude
priority: high
feature: FEAT-PC017
owner: platform/core/identity
wave: ferd
cycle: C-F
depends_on: []
estimated_hours: 4
---

## Description

Write the demonstrated-red integration suites for every FEAT-PC017 story plus FEAT-PC005 STORY-6 (origin gate), before the migration exists. Expected red classes: 42703 (missing `deactivation_origin` column), PGRST202/42883 (missing `pause_own_account`/`delete_own_account`), behavioural fails on the un-split state read. Labelled greens are allowed only for invariant-holds proofs (e.g. the old path still exists pre-apply) — label them.

## Acceptance criteria

- [ ] Every PC017 story (S1–S9) has at least one failing test, run and shown red with the expected error class
- [ ] FEAT-PC005 STORY-6 (member-origin succeeds + clears; admin-origin rejects) red
- [ ] The delete walk's three scenarios each have a fixture (regular / steward-handover / sole-member closure incl. the ds5 seal assertion)
- [ ] F-2 split asserted both directions: private rows gone, communal rows untouched + readable by the other party
- [ ] W12 walls: session-less and Mist callers rejected on both new RPCs (STORY-9)
- [ ] Retirement probe: `admin_exit_user_from_platform` answers 42883 post-apply (red as "still exists" pre-apply, labelled)

## Technical notes

Suites under `tests/integration/` (auth/admin domains). Fixture care: use a dedicated deletable user per test — deletion is terminal; never the shared fixtures (manual-testing coexistence rules apply; no concurrent integration runs against the shared dev DB). PD007 STORY-1's erasure proofs are the oracle for the lived-record leg; the admin path's scenario loop (COR-A migration §2.8) is the oracle for the walk.

## Verification

`npm run test:integration:auth` (and the touched domains) — all new tests red with the named classes, labelled greens documented in the run output.
