# Implement FEAT-PC023 — group suspension enforcement contracts

---
id: TASK-HYGA-01
title: Implement FEAT-PC023 — group suspension enforcement contracts
status: review
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

The platform half of cycle HYG-A, under the two-mode model (RB-6/RB-7 amendment + the Active/Resting/Suspended naming settle): one schema-gate migration delivering the `resting` status value (check-constraint change), the `rest_group` permission seed (Steward template + admin auto-grant; one key = toggle + act-during-rest), mode-aware `assert_group_writable()`, the ~28 guard re-issues per the PC023 matrix (resting = member freeze with the `rest_group` exemption; suspended = everyone below admin), the `leave_group` amendment (admit `'resting'`; refused under `'suspended'`; `closed`/`archived` unchanged), suspended-content read minimalization on the enumerated read doors, the transition contracts (`rest_group()`/`wake_group()` member-plane; `admin_rest_group`/`admin_wake_group` audited wrappers; `admin_suspend_group` amended `active|resting → suspended`), the legacy RLS write-door closure on the four membership/role tables, and the additive `get_member_groups.status` key.

## Acceptance criteria

- [ ] Red-first: the gate suite demonstrates red pre-apply for every frozen door, the leave-group trap, the legacy-door closure, and the round-trip (STORY-8), with the labelled-green exceptions being exactly the already-guarded seven.
- [ ] All PC023 stories green post-apply; full integration green; the signup + invitation-accept E2E journeys green post-apply (the Q1 standing rule — STORY-6's bootstrap-vestigial proof).
- [ ] Sibling-assertion sweep run pre-gate (the `leave_group` non-active refusal is pinned somewhere with near-certainty — adapt in the gate PR).
- [ ] Manifest untouched-or-updated correctly: no new function beyond `assert_group_writable` (register PC-3); re-issued functions keep their owners; signatures byte-identical.
- [ ] Schema-gate PR held with red evidence + apply commands for **named** approval; never applied in-session without it.

## Technical notes

Both enumeration dossiers are embedded in PC023 §Problem/§Solution (migration file:line per write AND read door). Guard: single indexed read (+ `has_permission()` on the resting arm), `P0001`, canonical messages `'group is resting'` / `'group is suspended'` (contract surface — H038 copy keys on them). Follow the COR-A re-issue pattern (replace-in-place, byte-identical signatures). Live-DB state verified 2026-08-03: 13 write policies + authenticated/anon write grants on the four tables; SELECT live for authenticated AND anon on all content tables — the RLS read-policy amendments are mandatory, with `is_conversation_participant()` as the conversations-family chokepoint. If the gate PR gets unwieldy, split write-plan / read-plan+ceremonies into two serial gates (PC023 §Appetite).

## Verification

Gate suite red→green across apply; `npm run test:integration` full; the two E2E journeys; live `pg_policies`/`role_table_grants` re-query shows zero member write paths on the four tables.
