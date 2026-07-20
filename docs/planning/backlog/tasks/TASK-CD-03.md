# The C-D migration — substrate, seed backfill, contracts, RLS, conformance riders

---
id: TASK-CD-03
title: C-D migration (announcements + content_reports + windowed contracts) — SCHEMA GATE
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD011
owner: platform/domain/communication
wave: ferd
cycle: C-D
depends_on: [TASK-CD-01, TASK-CD-02]
estimated_hours: 6
---

## Description

Author the C-D migration: `announcements` (scope CHECK, RLS incl. `ds5_is_fim_actor()` boolean helper), `content_reports` (UNIQUE resubmit key, reporter/admin RLS), the `send_announcements` permission seed + Steward-template grant + existing-Steward backfill, the eight contracts (two sends, retract, two reads, edit/delete-own, submit report), PC-4 audit writes for universe-scope acts, and the conformance-gate riders (`DS_TABLES` + allowlist, same PR). Flips TASK-CD-01/02 reds green on apply.

## Acceptance criteria

- [ ] Migration authored; PR holds red evidence + apply commands; **status `review` — held at the schema gate for Stefan's NAMED approval, never bypassed**
- [ ] On the nod: applied via `node scripts/apply-migration-temp.js` + `repair --status applied`; reds flip green; conformance gate green
- [ ] FEAT-PD011's three "Open spec questions (for the schema gate)" answered in the PR body for the gate review

## Technical notes

Direct-caller question (ADR-U038) is the gate's review lens. SECURITY DEFINER discipline (`search_path=''`, REVOKE anon/PUBLIC, migration comments justify each elevation). No edits to applied migrations — this is one new file.

## Verification

`npm run test:integration:communication` green post-apply; `test:integration:rls` + conformance green.
