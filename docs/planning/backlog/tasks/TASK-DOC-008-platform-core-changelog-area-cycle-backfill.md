# Backfill the platform-core CHANGELOG for the 2026-07-19 → 2026-07-31 area-cycle Core migrations

---
id: TASK-DOC-008
title: Second platform-core CHANGELOG backfill — Core substrate changes made inside area cycles (COR-A, C-A..C-E, W-cycles, N-A..N-D, A-NTF gate, COR-C W1/W2/W3), unowned by any PC spec
status: done
assigned_to: unassigned
priority: low
feature: none
owner: platform/core
wave: ferd
cycle: none
depends_on: []
estimated_hours: 3
---

## Description

Found at the TASK-DOC-007 backfill (2026-08-01): the PC-feature span 2026-06-26 → 2026-07-21 is now fully recorded (17 entries incl. two audit-owned migrations), but roughly 20 Core migrations between 2026-07-19 and 2026-07-31 belong to **area cycles**, not PC feature specs, and remain recorded only in their owning ledgers and the root `CHANGELOG.md`. The register's narrowed note names this task; removing that note is this task's exit.

The migration set (from the TASK-DOC-007 draft's notes): the COR-A pair (`20260719190205`, `20260719201718`) · the A-COM C-A..C-E migrations (`20260719230500` through `20260721100000`) · `20260721220000_area_gate_export_grant_reproducibility.sql` · `20260722100000` · `20260722170000` · `20260722190000_w4_get_role_templates_contract.sql` · the A-NTF N-A..N-D migrations (`20260723120000`–`20260727120000`) · the A-NTF gate migrations (`20260727180000`–`20260728080000`) · `20260728190000` · `20260728200000` · `20260730200000` · the COR-C W1/W2/W3 migrations (`20260730210000`, `20260731120000`, `20260731140000`).

## Acceptance criteria

- [x] One entry per owning cycle/audit (the register's per-cycle precedent), each citing migration filenames and the owning record (area completion plan, conformance ledger, or paired PD/H spec).
- [x] Sources: migration headers + the owning cycle's records — never memory.
- [x] The narrowed register note removed in the same commit; the register then reads continuously PC001 → ADM-B.

## Verification

`docs/platform/core/CHANGELOG.md` carries no register note; every live migration dated 2026-06-26 → 2026-07-31 is attributable to an entry.

**Closed 2026-08-01:** nine backfill entries added (COR-A · C-A..C-E · A-COM gate · A-COM riders · COR-B W4 · N-A..N-D · A-NTF gate · A-NTF walk follow-ups · COR-C W1/W2/W3); the register note removed. Verified mechanically: all 31 live migrations dated 2026-07-19 → 2026-07-31 are timestamp-attributable to an entry and every relative `.md` link in the changelog resolves on disk. The verification sweep caught and fixed two omissions the task's own list had (the `20260720003000` C-A rider and `20260728060000` bootstrap-self retirement) and six mis-guessed PD spec filenames — headers and `ls`, never memory.
