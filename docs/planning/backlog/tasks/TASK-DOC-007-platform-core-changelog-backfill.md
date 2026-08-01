# Backfill the Platform Core CHANGELOG register

---
id: TASK-DOC-007
title: Backfill docs/platform/core/CHANGELOG.md — entries between FEAT-PC001 (2026-06-26) and Cycle ADM-A are missing
status: done
assigned_to: unassigned
priority: low
feature: none
owner: platform/core
wave: ferd
cycle: none
depends_on: []
estimated_hours: 2
---

## Description

Found at the ADM-B doc-health-check (2026-08-01): the Platform Core changelog carried exactly ONE entry ever (FEAT-PC001, 2026-06-26). Core substrate changes from every cycle since — PC002 through PC017 (consent, export, roles, invitations, closure contracts, PC015 acting contracts, lifecycle producers, …) — were recorded only in the root `CHANGELOG.md` and the feature specs. The ADM-A and ADM-B entries were written at the ADM-B close, and a register note now marks the gap in-place.

## Acceptance criteria

- [ ] One entry per Core-substrate-changing cycle between 2026-06-26 and 2026-07-31, in the register's developer-facing shape (feature link, substrate change bullets, migration filename, consumer).
- [ ] The register note marking the gap is removed in the same commit.
- [ ] Source of truth: the feature specs' Implementation notes + `supabase/migrations/` — never memory.

## Verification

The register reads continuously from PC001 to ADM-B with no gap note.

## Resolution (2026-08-01, PR #367)

Done, with one deliberate AC deviation: **17 entries** landed (PC002–PC017 per-cycle plus two audit-owned migrations the drafter flagged — the 2026-07-06 anon EXECUTE lockdown and the 2026-07-05 `leave_group` copy fix, both sourced from their migration headers; the U038 tranches entry verified against the 2026-07-03 session bridge). The gap note was **narrowed, not removed**: ~20 Core migrations from the 2026-07-19 → 07-31 area cycles belong to no PC spec and remain unrecorded here — claiming continuity before it exists is the sin the note guards against. That second backfill is [TASK-DOC-008](./TASK-DOC-008-platform-core-changelog-area-cycle-backfill.md); the note's removal is its exit.
