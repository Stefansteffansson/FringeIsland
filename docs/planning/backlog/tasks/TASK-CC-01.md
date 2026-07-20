# Red integration suite: realtime hint emission & receipt policies

---
id: TASK-CC-01
title: Demonstrated-red integration suite for the PD010 hint layer — emission on every write path, ids-only payloads, receipt policies, no client-send door
status: review
assigned_to: claude
priority: critical
feature: FEAT-PD010
owner: platform/domain/communication
wave: ferd
cycle: C-C
depends_on: []
estimated_hours: 3
---

## Description
`hub/tests/integration/communication/realtime-hint-emission.test.ts` — every PD010 story pinned before the migration exists. Emission: `send_message` into a dm and a group conversation → `message_created` broadcast rows exist (queried via `runAdminSql` against `realtime.messages`) on exactly the active participants' `account:<auth_uid>:conversations` topics (departed participant excluded; sender included), payload exactly `{"conversation_id"}`; forum post/reply → one `forum_post_created` on `group:<group_id>:forum`; moderation → one `forum_post_moderated`; idempotent re-moderation emits nothing new. Receipt: SELECT against seeded broadcast rows under each actor's JWT — own conversations topic readable, another member's refused; forum topic readable by an active member, refused for non-member / other-group member / authenticated Mist. No client-send: direct INSERT into `realtime.messages` on the C-C topics under an authenticated role refused (no INSERT policy). Session-channel regression guard: the `session_signal_receive_own` policy behaviour unchanged (labelled pre-existing green).

## Acceptance criteria
- [ ] Suite demonstrated RED pre-apply (absent triggers/policies cannot satisfy the assertions); pre-existing greens labelled regression-guard
- [ ] Payload content-freedom asserted byte-level (ids only — no content, sender, or timestamps in any stored broadcast payload)
- [ ] Adversarial receipt coverage per topic pattern, Mist included; no-client-send proven per topic
- [ ] Fixture rules: run-unique names; `markArrivedOnce` for fixture FIMs; house erasure paths; red evidence captured for the PR body

## Technical notes
Mirror `forum-contracts.test.ts` (C-B, 21/21) structure. Emit precedent: `20260703154102_feat_pc009_session_contracts.sql:129-138` (`realtime.send(payload, event, topic, private)`, non-fatal wrap); policy precedent :161-169. Participants→auth-uid resolution is the P-O1 chain in reverse. Never run two integration suites concurrently against the shared dev DB.

## Verification
Red run recorded; flips green on TASK-CC-02's applied migration with zero test edits.
