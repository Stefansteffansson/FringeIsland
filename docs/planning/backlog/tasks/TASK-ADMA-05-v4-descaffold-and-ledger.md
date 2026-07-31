# De-scaffold the V4 spec (G-03), seed the perf ledger, close TASK-OBS-01

---
id: TASK-ADMA-05
title: Docs tail of Cycle ADM-A — V4 Observability spec de-scaffolded per ADR-U052, PERF-MEASUREMENT-LEDGER.md seeded, TASK-OBS-01 closed
status: todo
assigned_to: claude
priority: medium
feature: none  # documentation obligations from ADR-U052 / board AB-1
owner: platform
wave: ferd
cycle: ADM-A
depends_on: [TASK-ADMA-02]
estimated_hours: 3
---

## Description
The ADR-U052 consequences made real: (1) rewrite the V4 Observability vertical spec's scaffold sections (§§3–6) into the obligation inventory the decision implies — emit discipline (existing) + sink (FEAT-PC018) + retention + review cadence — closing or explicitly narrowing G-03 in `gaps.md`; (2) seed `docs/planning/reference/PERF-MEASUREMENT-LEDGER.md` (AB-1d) and backfill the area-gate measurements recorded in bridges since ADR-U043 so history starts populated, each row citing its source bridge; (3) close TASK-OBS-01 (all four ACs now discharged) and annotate AC3-O6/AC3-O7 CLOSED in the Audit III register, same-day.

## Acceptance criteria
- [ ] V4 spec §§3–6 de-scaffolded; per-spec Observability rows can cite obligation IDs; G-03 updated in `gaps.md`.
- [ ] Ledger seeded with the historical ADR-U043 passes (source-cited) and a stated append discipline.
- [ ] TASK-OBS-01 deleted/closed per the task lifecycle; register annotations landed.
- [ ] doc-health-check consulted if the V4 rewrite proves cross-cutting (it edits a vertical spec other specs cite).

## Verification
gaps.md, V4 spec, ledger, and the audit register all consistent in one PR; no dangling references to the scaffold sections.
