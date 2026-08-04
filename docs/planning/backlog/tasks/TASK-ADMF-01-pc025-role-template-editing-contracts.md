# Build FEAT-PC025 — role-template editing contracts + the three walk-rider re-issues (one schema gate)

---
id: TASK-ADMF-01
title: Build FEAT-PC025 — versioning substrate + editor contract family + WA-2/WA-3/WA-4 re-issues, red-first, held at the schema gate
status: todo
assigned_to: Claude
priority: high
feature: FEAT-PC025
owner: platform/core/governance
wave: ferd
cycle: ADM-F
depends_on: []
estimated_hours: 6
---

## Description

The platform half of Cycle ADM-F, per [FEAT-PC025](../../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md). One migration carrying: the versioning substrate (`role_template_versions` + junction, `role_templates.default_version_id`, `permissions.is_protected`, seeded-state backfill), the five `admin_*` contracts (list/detail reads, clone, version-create, apply-as-repoint with the protected-set guard), and the three walk-rider re-issues (`admin_get_audit_log` target resolution + message-drift settle, `admin_hard_delete_user` consent-erasure leg, `admin_force_logout` per-session hints). Red-first at every tier; the PR holds at the schema gate with red evidence + apply commands for **named** approval (the standing rule — a generic "go on" does not unlock the merge).

## Acceptance criteria

- [ ] Migration + contracts implement the spec's Solution sketch exactly; zero changes to `create_engagement_group` / `copy_template_permissions`
- [ ] Gate suite red at head covering STORY-1..7, including the consented-member hard-delete cell (never existed before) and the synthetic-topology guard cell
- [ ] Sibling-assertion sweep enumerated in the migration header (`admin_get_audit_log`, `admin_hard_delete_user`, `admin_force_logout`, `get_role_templates`, the five template tables), each marked adapted or deliberately left
- [ ] New tables registered PC-3 / functions PC-4 in the ownership manifest; platform conformance suites green
- [ ] Protected-set membership settled against the live catalogue and enumerated in the migration header
- [ ] PR held at the schema gate with red evidence + apply commands; post-apply: full integration green + the affected-E2E-journey verification set + ADR-U043 pass

## Technical notes

Substrate facts and file:line cites live in the spec's Problem section and the [dossier](../../hub-v2/2026-08-04-admf-substrate-dossier.md). Copy `revoke_own_session`'s non-fatal `realtime.send` pattern verbatim for WA-4 (do not reuse `ds5_emit_hint` — trigger-path-only). Verify the consent-erasure GUC name cumulative-forward at build. Four-hop actor chain for `created_by`, never raw `auth.uid()`.

## Verification

Red demonstrated at head (suite output in the PR body); post-apply `npm run test:integration` green; conformance suites green; `migration list` consistent after repair.
