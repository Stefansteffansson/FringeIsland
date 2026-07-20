# Red-first platform suite — windowed own-edit/delete + content reports

---
id: TASK-CD-02
title: Red-first platform integration suite — window + reports (PD011 STORY-6..8)
status: todo
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

Author the demonstrated-red integration suite for `edit_own_forum_post`/`delete_own_forum_post` (STORY-6: window edge, wrong-author, tombstone rules, idempotent delete, DM-immutability regression, existing moderation hint fires on self-delete) and `submit_content_report` + `content_reports` store (STORY-7: visibility validation, no existence oracle, snapshot, idempotent resubmit, reporter/admin SELECT split; STORY-8: W12 direct-caller probes + conformance riders assertions).

## Acceptance criteria

- [ ] Every STORY-6..8 acceptance criterion has at least one integration test, red for the right reason, red output captured
- [ ] Window-edge test manipulates `created_at` fixtures (no sleeps)
- [ ] DM-immutability asserted as regression (no UPDATE/DELETE policy on messages; no edit/delete contract exists)

## Technical notes

Reuse C-B forum fixtures; the hint assertion mirrors the C-C `realtime.send` stored-payload check (labelled adaptation precedent). Conformance riders: `DS_TABLES` += `announcements`,`content_reports`; allowlist += the new contracts — test-side edits ride TASK-CD-03's PR in lockstep.

## Verification

`npm run test:integration:communication` → red for missing contracts/table only.
