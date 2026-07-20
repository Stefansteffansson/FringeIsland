# Red integration suite: forum & attribution contracts

---
id: TASK-CB-01
title: Demonstrated-red integration suite for the PD009 contracts, relocation, write-narrowing, and gate lockstep
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD009
owner: platform/domain/communication
wave: ferd
cycle: C-B
depends_on: []
estimated_hours: 3
---

## Description
`hub/tests/integration/communication/forum-contracts.test.ts` — every PD009 story pinned before the migration exists: the four client contracts (refusals pinned to exact SQLSTATEs — 42501 permission/actor, 22023 empty content, P0002 unknown parent/post, P0001 flat-threading with the oracle message text), the COM-14 attribution ladder in `get_group_forum` and the amended `get_conversation_detail` (active name / "Former member" / "Unknown"; the rejoin case; the sentinel folding into Unknown), `ds5_lifecycle_user_hard_deleted` (direct client call refused; hard-delete outcome byte-equivalent), and direct-write refusals after narrowing (42501/zero-row). Conformance-gate list edits ride TASK-CB-02, where their pre-apply red is expected and labelled.

## Acceptance criteria
- [ ] Suite demonstrated RED pre-apply with every refusal pinned to its SQLSTATE (absent functions cannot satisfy the assertions); any pre-existing green labelled as regression-guard
- [ ] W12 adversarial direct-call coverage per contract, Mist included (`ds5_require_fim_actor` 42501)
- [ ] Fixture rules: run-unique names; `markArrivedOnce` for any fixture FIM; house erasure/hard-delete paths (never bare deletes)
- [ ] Red evidence captured for the PR body

## Technical notes
Mirror `conversation-contracts.test.ts` (C-A, 21/21). Oracle: `hub-legacy/tests/integration/communication/forum.test.ts` (B-COMM-004..007 spine). Never run two integration suites concurrently against the shared dev DB.

## Verification
Red run recorded; flips green on TASK-CB-02's applied migration with zero test edits.
