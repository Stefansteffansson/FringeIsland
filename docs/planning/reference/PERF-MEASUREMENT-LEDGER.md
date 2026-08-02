# Performance measurement ledger — the durable ADR-U043 record

**Purpose (ADR-U052 §5, board AB-1d):** every ADR-U043 measurement pass — area-gate cold/warm runs, deep-cold spot checks, investigation baselines — gets one row here, so numbers stop living only in session bridges. Planning artifact, deliberately not a database table.

**Append discipline:** one row per pass, appended in the same PR as the gate/bridge that produced it. Columns: date · scope (page/flow + class) · headline numbers · verdict vs budget · source (the doc holding the full protocol run). Never edit old rows; corrections append.

## Ledger

| Date | Scope | Headline | Verdict | Source |
|---|---|---|---|---|
| 2026-07-06 | `/groups` first load (A-GRP) | first-load waterfall investigated; fan-out lever identified | investigation baseline | [`2026-07-06-groups-first-load-perf.md`](../hub-v2/2026-07-06-groups-first-load-perf.md) |
| 2026-07-07 | Journeys J-A `/journeys` waterfall | waterfall recorded at area open | investigation baseline | [`2026-07-07-journeys-j-a-waterfall.md`](../hub-v2/2026-07-07-journeys-j-a-waterfall.md) |
| 2026-07-09 | Cold-load regression analysis | deep-cold provisioning per-instance, runtime-independent (fed ADR-U036 A2) | analysis | [`2026-07-09-cold-load-regression-analysis.md`](../hub-v2/2026-07-09-cold-load-regression-analysis.md) |
| 2026-07-10 | J-E onboarding arrival (deep-cold spot check) | one bundle request; `n:1` 599 ms server-side; zero standalone arrival calls | PASS (labelled exception regime) | phase-3 journeys plan, J-E row |
| 2026-07-19 | Journeys area gate (J-O3) | full ADR-U043 pass at the gate | PASS with labelled cold exception | [`2026-07-19-journeys-area-gate.md`](../hub-v2/2026-07-19-journeys-area-gate.md) |
| 2026-07-21 | Communication area gate | full ADR-U043 pass at the gate | PASS | [`2026-07-21-communication-area-gate.md`](../hub-v2/2026-07-21-communication-area-gate.md) |
| 2026-07-27 | A-NTF gate measurements | cold + warm protocol run; 937 ms warm ceiling investigated → fan-out lever REFUTED by measurement (2026-07-28) | PASS with findings | [`2026-07-27-antf-gate-measurements.md`](../hub-v2/2026-07-27-antf-gate-measurements.md) · [`2026-07-28-antf-warm-ceiling-investigation.md`](../hub-v2/2026-07-28-antf-warm-ceiling-investigation.md) |
| 2026-08-02 | A-ADM area gate — the eight admin surfaces, B2/B3 (justified standalone reads) | cold 3 638 / 4 395 ms (provisioning-dominated; extends the standing exception, better than the ~5.5 s A-NTF era) · warm fresh-context 415–964 ms PASS · **detail pages cross the 1.0 s ceiling in 3 of 5 runs (1 036–1 127 ms)** — carried finding for the gate verdict | PASS with carried finding + labelled cold exception | [`2026-08-02-adm-gate-measurements.md`](../hub-v2/2026-08-02-adm-gate-measurements.md) |

*Seeded 2026-07-31 (Cycle ADM-A, TASK-ADMA-05) from the existing gate/investigation records — headline-and-pointer rows; the full protocol numbers stay in the cited source docs. Rows before this date are backfill; the append discipline binds from here.*
