# N-A: flip green + conformance riders

---
id: TASK-NA-03
title: Flip the PD013 suite green; conformance-gate and manifest riders
status: done
assigned_to: claude
priority: high
feature: FEAT-PD013
owner: platform/domain/communication
wave: ferd
cycle: N-A
depends_on: [TASK-NA-02]
estimated_hours: 2
---

## Description
After the schema-gate apply: run the TASK-NA-01 suite to green; update the mechanical gates — `DS_OWNED_ALLOWLIST` += the four new RPCs + `get_own_notifications_export` in `hub/tests/integration/platform/internal-api-conformance.test.ts`; confirm `notifications` remains OUT of `DS_TABLES` (ADR-U048); ownership-manifest conformance green with the two registry tables classified; full platform conformance suite green. Advance FEAT-PD013 to `6-done` with Implementation notes; update the DS-5 §L4 row + feature READMEs in the same commit.

## Acceptance criteria
- [ ] `tests/integration/notifications` fully green; zero skips.
- [ ] `internal-api-conformance` + `ownership-manifest-conformance` + `outer-ring-conformance` suites green.
- [ ] FEAT-PD013 `maturity: 6-done` + Implementation notes; DS-5 §L4 row updated same commit.

## Technical notes
The conformance edits ride the same PR as the flip-green if the gate nod covers both; otherwise a follow-up PR. W12 citations (adversarial tests per RPC) recorded for the area gate roll-up.

## Verification
`npx jest tests/integration --runInBand` (notifications + platform) all green.
