# PD003 schema-gate migration — steps to rows, registries, step-instances, contracts (HELD AT THE GATE)

---
id: TASK-JB-02
title: PD003 schema-gate migration (ADR-U044 substrate + player contracts)
status: todo
assigned_to: Claude
priority: critical
feature: FEAT-PD003
owner: platform/domain/journeys
wave: ferd
cycle: J-B
depends_on: [TASK-JB-01]
estimated_hours: 6
---

## Description

The Cycle J-B migration, authored against the red suite and **held at the schema-review gate** (fuller-auto carve-out — Stefan's nod required; task lands at `review`, never `done`, until nodded): `journey_steps` + `step_kinds` + `content_families` + `journey_step_instances` (all with RLS — no exception), the count-agnostic data migration of `content.steps[]` under the ADR-U044 §3 mapping, the same-migration re-point of `get_journey_catalog`/`get_journey_detail`, the three new contracts (`get_player_state`, `enter_journey_step`, `complete_journey_step`), the Q1 withdraw amendment, and the DML revocation on all four new tables.

## Acceptance criteria

- [ ] The FEAT-PD003 Open-Q board (Q1–Q6) presented at the gate with dev pre-check evidence (live seed set; `content->` reader enumeration; assessment-step family mapping table)
- [ ] All four tables carry RLS; SECURITY DEFINER functions carry `set search_path = ''` + migration comments justifying elevation
- [ ] The direct-caller question (ADR-U038) answered in the PR body for each new table/function
- [ ] Red suite goes green post-apply (`test:integration:journeys`), full integration sweep green
- [ ] Applied via the two-step apply + repair flow; if the session is autonomous, the PR ships held at the gate with apply commands in the body (never bypassed)

## Technical notes

ADR-U044 decision points 2–4 are the schema authority; the Designer beat record names the columns. Registries seed the seven Tier-1 kinds + six families. Withdraw per Q1 default: terminal `withdrawn` status (CHECK gains one value; instances preserved; `uq_journey_enrollments_active_party` already scopes actives). Default-privileges class fix (PR #105) means new functions are NOT born re-opened — but verify grants explicitly anyway (`anon-execute` regression test walks them).

## Verification

`npm run test:integration:journeys` green + `npm run test:integration` full sweep green + gate nod recorded in the PR thread.
