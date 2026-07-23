# N-A: red integration suites for the PD013 contracts and registries

---
id: TASK-NA-01
title: Red integration suites for FEAT-PD013 (registries, list, count, read-state, export)
status: todo
assigned_to: claude
priority: high
feature: FEAT-PD013
owner: platform/domain/communication
wave: ferd
cycle: N-A
depends_on: []
estimated_hours: 3
---

## Description
Write the failing (demonstrated-red) integration suite for every FEAT-PD013 story before any migration exists: registries + FK enforcement (STORY-1), `get_own_notifications` keyset list with the exact N-A payload keys (STORY-2), `get_own_unread_notification_count` incl. the EXPLAIN partial-index check (STORY-3), `mark_notification_read`/`mark_all_notifications_read` + write-narrowing proof (STORY-4), export section (STORY-5). Adversarial cases per story (other-actor invisibility, other-actor mark refusal, anon refusal, unregistered-type INSERT rejection, direct UPDATE affecting zero rows).

## Acceptance criteria
- [ ] One suite file under `hub/tests/integration/notifications/` covering every PD013 AC, each traceable to its story.
- [ ] Suite runs RED against the current dev DB (contracts/tables absent) — red state demonstrated and recorded in the PR body.
- [ ] Oracle spine ported and labelled: B-COMM-002 (RLS: own-only read, no direct INSERT) and B-COMM-003 (read-state default, mark-own, unread-count accuracy) adapted from `hub-legacy/tests/integration/communication/notifications.test.ts` to the contract door.

## Technical notes
Follow the C-E suite shape (FEAT-PD012 tests) for actor setup; four-hop actor resolution; `createTestUser` may hit the ES256 flake — the `decorateAuthAdminError` fence stands, re-run not investigate (TASK-INT-01). Never run two integration suites concurrently against the shared dev DB.

## Verification
`cd hub && npx jest tests/integration/notifications --runInBand` → all tests fail for absence-of-contract reasons (not setup errors).
