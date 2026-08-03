# Implement FEAT-PC023 — group suspension enforcement contracts

---
id: TASK-HYGA-01
title: Implement FEAT-PC023 — group suspension enforcement contracts
status: todo
assigned_to: claude
priority: high
feature: FEAT-PC023
owner: platform/core/organisation
wave: ferd
cycle: HYG-A
depends_on: []
estimated_hours: 6
---

## Description

The platform half of cycle HYG-A: one schema-gate migration delivering `assert_group_writable()`, the ~28 one-line guard re-issues per the PC023 matrix (frozen/open/already-guarded tables are canonical in the spec), the `leave_group` amendment (admit `'suspended'`; `closed`/`archived` refusals unchanged), the legacy RLS write-door closure on the four membership/role tables, and the additive `get_member_groups.status` key.

## Acceptance criteria

- [ ] Red-first: the gate suite demonstrates red pre-apply for every frozen door, the leave-group trap, the legacy-door closure, and the round-trip (STORY-8), with the labelled-green exceptions being exactly the already-guarded seven.
- [ ] All eight PC023 stories green post-apply; full integration green; the signup + invitation-accept E2E journeys green post-apply (the Q1 standing rule — STORY-6's bootstrap-vestigial proof).
- [ ] Sibling-assertion sweep run pre-gate (the `leave_group` non-active refusal is pinned somewhere with near-certainty — adapt in the gate PR).
- [ ] Manifest untouched-or-updated correctly: no new function beyond `assert_group_writable` (register PC-3); re-issued functions keep their owners; signatures byte-identical.
- [ ] Schema-gate PR held with red evidence + apply commands for **named** approval; never applied in-session without it.

## Technical notes

Enumeration dossier is embedded in PC023 §Problem/§Solution (migration file:line per door). Guard: single indexed read, `P0001`, canonical message `'group is suspended'` (contract surface — H038 copy keys on it). Follow the COR-A re-issue pattern (replace-in-place, byte-identical signatures). Live-DB policy/grant state verified 2026-08-03 (13 policies + authenticated/anon write grants).

## Verification

Gate suite red→green across apply; `npm run test:integration` full; the two E2E journeys; live `pg_policies`/`role_table_grants` re-query shows zero member write paths on the four tables.
