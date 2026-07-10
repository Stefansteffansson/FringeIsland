# H023 deep-cold spot measurement of the arrival path (ADR-U043 Amendment 1)

---
id: TASK-JE-07
title: Deep-cold spot measurement of the arrival first paint (pre-6-done gate)
status: done
assigned_to: claude
priority: high
feature: FEAT-H023
owner: hub
wave: ferd
cycle: J-E
depends_on: [TASK-JE-05]
estimated_hours: 1
---

## Description

H023 adds a request on the arrival first-paint path, so it runs **one deep-cold spot measurement** of the landing before `6-done` (one scenario, one page — the J-O3 area gate remains the full pass). First measurement on the target Node/Fluid runtime (edge→Node migration landed 2026-07-10, bridge `_02` — measure once).

Protocol (ADR-U043 Amendment 1): production deploy complete → **≥ 20 minutes enforced zero traffic** (no synthetic warm-up; the pinger is retired, ADR-U036 Amendment 2) → one authenticated walk of the landing/arrival path → record per-request timings **with the idle depth stated**. Fresh-deploy or active-day samples are *shallow-cold* and satisfy nothing.

## Acceptance criteria

- [ ] Measurement taken after the H023 production deploy, idle depth ≥ 20 min recorded
- [ ] The arrival path's added request visible and within the B1 posture (rides the bundle → no added round-trip expected; verify)
- [ ] Numbers recorded in FEAT-H023's Implementation notes (and the cold-load analysis file if they move the picture)
- [ ] Only after this: FEAT-H023 → `6-done`

## Technical notes

- Requires the platform migration applied in production and the Hub half deployed — this task necessarily follows the schema-gate nod and the merges; it may be executed by Stefan or a follow-up session if this one can't deploy.
- Reference numbers (bridge `2026-07-10_02` §8): deep-cold `/journeys` fan-out 1 328–1 612 ms band, warm 410–429 ms, felt deep-cold worst ≈ 3.9 s.

## Verification

The recorded measurement in the spec's Implementation notes names date, idle depth, and per-request numbers.
