# N-A: registries + contracts migration (schema gate)

---
id: TASK-NA-02
title: Migration — notification registries, FK, read/serve contracts, write-narrowing, export section
status: review
assigned_to: claude
priority: high
feature: FEAT-PD013
owner: platform/domain/communication
wave: ferd
cycle: N-A
depends_on: [TASK-NA-01]
estimated_hours: 4
---

## Description
One migration realizing FEAT-PD013: `notification_categories` (key, label, lawful_basis CHECK transactional|consent, interruption_grade default 'badge') + `notification_kinds` (kind PK, category_key FK, label); seeds folding every realized kind (~19 enumerated at kickoff — verify with `SELECT DISTINCT type FROM notifications` before the FK; an unseeded stray gets an explicit row, never a catch-all); FK `notifications.type → notification_kinds(kind)`; the four contracts (`get_own_notifications`, `get_own_unread_notification_count`, `mark_notification_read`, `mark_all_notifications_read` — SECURITY DEFINER, `search_path=''`, P-O1 actor, REVOKE public/anon, GRANT authenticated); DROP `notifications_update_own` + `notifications_delete_own` policies; `get_own_notifications_export()` (ungated actor per CB-6) composed into `get_own_data_export()` as the `notifications` section.

## Acceptance criteria
- [ ] Migration applies clean on the dev DB (at the named schema-gate nod — see below).
- [ ] TASK-NA-01 suite flips green (TASK-NA-03 verifies).
- [ ] N-A payload keys exactly as PD013 STORY-2 (no `action_data`/`action_taken_at`).

## Technical notes
**SCHEMA GATE:** ship the PR held at the gate with the red suite + apply commands in the body; merge/apply only on an explicitly named approval ("ok merge"), never a generic go-ahead. Template: the C-E migration (`20260721100000`) for export composition; `ds3_lifecycle_*`/DS-5 contract shape for function hygiene. Registry tables classified in `supabase/ownership.manifest.json` in the same PR (unclassified fails red).

## Verification
Apply → `npx jest tests/integration/notifications --runInBand` green; `SELECT * FROM pg_policies WHERE tablename='notifications'` shows select_own only (plus any definer-internal paths untouched).
