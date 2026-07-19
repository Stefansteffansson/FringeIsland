# DS-5 contracts + conformance-gate extension + red-first integration suite

---
id: TASK-CA-02
title: The eight conversation/message contracts, conformance-gate DS-5 extension, red-first communication integration tests
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD008
owner: platform/domain/communication
wave: ferd
cycle: C-A
depends_on: [TASK-CA-01]
estimated_hours: 4
---

## Description
The eight PD008 contracts as PostgREST RPCs riding the TASK-CA-01 migration: `get_my_conversations`, `get_conversation_detail` (paged; per-sender display incl. departed/erased), `send_message`, `get_or_create_dm_conversation` (FIM-only both sides, one per pair), `create_group_conversation` (permission-gated), `get_group_conversations`, `join_group_conversation`/`leave_group_conversation`, `mark_conversation_read`. Extend `internal-api-conformance.test.ts`: `DS_TABLES` += conversations, messages, forum_posts, conversation_participants, conversation_kinds; `DS_OWNED_ALLOWLIST` += the DS-5 functions. Red-first integration suite (`hub/tests/integration/communication/`) covering PD008 STORY-1..8 including the STORY-8 adversarial direct-caller tests (authenticated Mist included) and the STORY-4 concurrent get-or-create race.

## Acceptance criteria
- [ ] Every PD008 acceptance criterion has an integration test demonstrated red first (red = substrate absent pre-apply is valid red; captured)
- [ ] Adversarial direct-call tests prove the substrate refuses what the BFF refuses (W12 / ADR-U038)
- [ ] Conformance gate green with the DS-5 extension; no core function references DS-5 tables
- [ ] Oracle spine ported from `hub-legacy/tests/integration/communication/messaging.test.ts` (B-MSG-001..006), labelled

## Technical notes
Serialize integration runs against the shared dev DB (house rule). Fixture hygiene: run-unique names (backlog standing item).

## Verification
`npm run test:integration:communication` green post-apply; conformance suite green.
