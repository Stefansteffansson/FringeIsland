# PD004 completion/timing contracts migration — through the schema gate

---
id: TASK-JC-02
title: PD004 completion & timing contracts migration (schema gate)
status: done
assigned_to: Claude
priority: high
feature: FEAT-PD004
owner: platform/domain/journeys
wave: ferd
cycle: J-C
depends_on: [TASK-JC-01]
estimated_hours: 4
---

## Description

Author the FEAT-PD004 migration: re-issue `complete_journey_step` (row-locked edge detection, solo flip, notification insert, transition-flag return, guard loosening), `enter_journey_step` (guard loosening only), `get_player_state` (additive `completion` + `timing` blocks). No new tables/columns/RLS. Open the gate PR with the Q1–Q6 board + dev pre-check evidence + apply commands; **hold at the gate for Stefan's explicit nod** (schema-review carve-out; task lands at `review`, never auto-merged).

## Acceptance criteria

- [ ] Migration authored; contract-only (function re-issues + notification insert path); comments carry the FEAT-PD004 story anchors.
- [ ] Gate PR body: Q1–Q6 board with defaults, dev pre-check evidence (current enrolment statuses, notification-row shape precedent, live seed counts), red-suite summary, apply commands.
- [ ] Post-nod: applied via `node scripts/apply-migration-temp.js` + `migration repair`; TASK-JC-01 suite green; sibling-suite adaptations labelled to STORY-4 (paired-suite adaptation budget), never weakened.
- [ ] Full integration sweep green (the 522 flake class documented if it fires).

## Technical notes

`SELECT … FOR UPDATE` on the enrolment row before the stamp. Solo predicate: `traveller_group_id = enrollment.group_id`. `completed_at` stamps only when null. Notification insert mirrors the PD002 fan-out pattern (recipient_group_id, type, title, body, payload). SECURITY DEFINER discipline: `SET search_path = ''`, comment the elevation.

## Verification

`npm run test:integration:journeys` green post-apply; `bash supabase-cli.sh migration list` shows the migration applied.
