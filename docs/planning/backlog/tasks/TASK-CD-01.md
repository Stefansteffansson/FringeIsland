# Red-first platform suite — announcements home, sends, fan-out, reads, retract

---
id: TASK-CD-01
title: Red-first platform integration suite — announcements (PD011 STORY-1..5)
status: done
assigned_to: claude
priority: high
feature: FEAT-PD011
owner: platform/domain/communication
wave: ferd
cycle: C-D
depends_on: []
estimated_hours: 4
---

## Description

Author the demonstrated-red integration suite for the announcements half of FEAT-PD011: the durable home's shape/RLS (STORY-1), `send_community_announcement` incl. the `send_announcements` seed + backfill assertions (STORY-2), `send_platform_announcement` incl. audit + FIM-only fan-out (STORY-3), read-time visibility incl. the late-joiner walk + attribution ladder (STORY-4), retract semantics (STORY-5). Fixture names run-unique AND single-token (the C-C membership-lifecycle lesson).

## Acceptance criteria

- [ ] Every STORY-1..5 acceptance criterion has at least one integration test, red for the right reason (missing table/function), red output captured
- [ ] Direct-caller probes included (Mist actor, anon, non-member, scope-crossing attempts)
- [ ] No concurrent run against the shared dev DB with any other integration suite

## Technical notes

`hub/tests/integration/communication/` — follow the C-B forum suite's fixture/cleanup house patterns (`cleanupTestUser` path). The scope-separation ACs assert 42501s and absence of rows.

## Verification

`npm run test:integration:communication` → new suite red with "function/table does not exist"-class failures only.
