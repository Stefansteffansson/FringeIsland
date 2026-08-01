# Build FEAT-PC022 — moderation and audit-read contracts (one schema gate)

---
id: TASK-ADMD-01
title: Build FEAT-PC022 — the moderation family, the audit family, and the AB-4 execution in one gate — red-first, HELD for named approval
status: todo
assigned_to: unassigned
priority: high
feature: FEAT-PC022
owner: platform/core/governance
wave: ferd
cycle: ADM-D
depends_on: []
estimated_hours: 8
---

## Description

The platform half of Cycle ADM-D, per [FEAT-PC022](../../../platform/core/features/FEAT-PC022-moderation-and-audit-read-contracts.md). One migration through one schema gate (board DB-1; the PR held with red evidence + apply commands in the body, merged only on Stefan's NAMED approval, never a generic go-ahead):

1. **The resolution substrate:** the four-column `ALTER TABLE content_reports` (resolved_by/at/kind/note; SET NULL on the resolver, no CHECKs).
2. **The moderation family:** `admin_get_content_reports(p_filter)` + `admin_get_content_report_detail(p_report_id)` (live author resolution, drift honesty) + `admin_resolve_content_report(p_report_id, p_resolution_kind, p_resolution_note)` (audit `moderation.report_resolved`; P0001 on second resolve writing nothing) + the `notify_report_resolved` trigger and the `report_resolved` kind registration (category `platform`, N-B idempotent-insert precedent).
3. **The audit family:** `admin_get_audit_log(p_limit, p_before, p_action_prefix)` (keyset, cap 200, open-namespace prefix) + DROP `audit_log_insert_admin` + re-issue `audit_log_select_admin` on `is_platform_admin()`.
4. **The AB-4 execution (same PR):** `get_own_data_export` gains the `audit_trail` own-actor section (schema_version bump); the manifest `admin_audit_log` entry rewritten per ADR-U052 §6; the `content_reports` representation gains the resolution-field disposition; the export-completeness invariant updated.

Red first: the integration suite (`hub/tests/integration/admin/moderation-and-audit-contracts.test.ts`) demonstrated red against the live substrate before the migration exists (function-absent / column-absent / policy-present shapes).

## Acceptance criteria

- [ ] Every contract per the spec's stories (STORY-1..8), producer-driven — including STORY-4's suppression branch through the real N-D preference path and STORY-6's closed-door proof (direct PostgREST INSERT refuses; SECURITY DEFINER writes land).
- [ ] **The sibling-assertion sweep executed fresh before the gate** (the four-catches class): the spec's named starting surface (C-D report suite, the three export suites, lifecycle dispositions, the three notification-catalog suites, any pg_policies enumeration on `admin_audit_log`, append-only catalog assertions) re-grepped at gate time; every hit listed in the migration header, each marked adapted or deliberately left.
- [ ] All four `admin_*` functions born classified PC-4 (the pin); `notify_report_resolved` registered with its `notify_*` sibling family (owner label verified — the functionOwner-defaults trap); manifest conformance suites green.
- [ ] Mist/erasure proofs at the gate (the NB-8 rule): a reporter's rows (all columns, including the four new ones) die with the reporter; an erased resolver anonymises via SET NULL; an erased reporter never blocks a resolve.
- [ ] The kind flows the registry FK + N-D dispatcher + N-C hint **by construction** — asserted structurally (no bespoke write path exists; the FK refuses an unregistered kind).
- [ ] AB-4 proven end-to-end (STORY-7): own-actor section exact, target rows absent, invariant green against the rewritten manifest entry.
- [ ] Audit rows proven producer-driven for every mutation; append-only holds post-change (STORY-8).
