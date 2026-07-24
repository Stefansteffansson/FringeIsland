# Flip-green + conformance (FEAT-PD014)

---
id: TASK-NB-03
title: Flip-green + conformance
status: done
assigned_to: Claude
priority: high
feature: FEAT-PD014
owner: platform/domain/communication
wave: ferd
cycle: N-B
depends_on: [TASK-NB-02]
estimated_hours: 2
---

## Description
After the schema gate applies: re-run the N-B integration suite to green, and run the platform conformance gates (internal-api, ownership-manifest, anon-execute-lockdown, outer-ring, direction-rule) + W12 per-RPC verification for `respond_to_acting_invitation`.

## Acceptance criteria
- [ ] `actionable-notifications.test.ts` green.
- [ ] Conformance suites green (respond_to_acting_invitation classified DS-5; notifications stays out of DS_TABLES).
- [ ] W12 adversarial direct-call coverage for `respond_to_acting_invitation` (other-actor P0002, missing-permission 42501, already-resolved convergence) — cited from STORY-3.

## Technical notes
Blocked on TASK-NB-02 (schema gate) and the active ES256 window (TASK-INT-01) clearing.

## Verification
`npx jest tests/integration/notifications/actionable-notifications.test.ts tests/integration/platform --runInBand`
