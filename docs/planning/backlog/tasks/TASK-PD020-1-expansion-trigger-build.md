---
id: TASK-PD020-1
title: Build the group-addressed expansion trigger, the writer-path proofs, and the disposition migration
status: in_progress
assigned_to: claude
priority: high
feature: FEAT-PD020
owner: platform/domain/communication (DS-5)
wave: unassigned
cycle: 2026-08-15 continuation session
depends_on: []
estimated_hours: one focused session (the spec's appetite)
---

# TASK-PD020-1 — the expansion trigger build

One task for the whole feature (it is one session's work): STORY-1/2/3 + the STORY-4 substrate leg.

## Build map (mechanism facts pinned 2026-08-15, this session)

- Trigger name **`trg_ds5_aa_expand_group_addressed`** — BEFORE INSERT triggers fire alphabetically and it must precede `trg_ds5_apply_notification_preference` (`20260726120000:248`); the hint is AFTER (`trg_notify_notification_hint`, `20260725120000:159`), so expanded personal rows get per-recipient suppression + hints for free.
- Expansion set: active personal-group members of the recipient engagement group holding `has_permission(pg, group, 'act_as_group')` **∪ Steward-role holders** (`created_from_role_template_id = Steward template OR name = 'Steward'` — the `delete_own_account` §2 house pattern); dedupe by personal group; exclude `get_current_personal_group_id()` (NULL-safe — service/cron writers have no actor).
- **GC-8 license REQUIRED** (spec's "n/a" line was wrong — corrected in this PR): DS-5 function on `notifications` (owner `vertical:notifications`) needs a cited `exceptions.triggerMounts` entry; the N-D suppression mount is the precedent shape.
- **Dev DB has 0 dead letters** (probed 2026-08-15) — the STORY-3 disposition is a prod-apply act; its counts are RAISE NOTICEd in migration output and verified at the gate. Suite cells create their own group-addressed shapes through real writers.

## Acceptance check

FEAT-PD020's ACs, red-first: writer-path expansion (announcement fan-out), dedupe (Steward who also holds the key gets one row), actor exclusion (an expansion-set member triggering the event hears nothing), the Steward floor (act_as_group stripped from a customized Steward role — Stewards still receive), category law per expanded recipient (news mutes, asks ring), personal-row byte-identical pass-through (incl. PD014's rows), and the suite-scoped residue instrument (zero group-addressed rows survive the writers). Sibling sweep + conformance slice green; migration held at the schema gate.
