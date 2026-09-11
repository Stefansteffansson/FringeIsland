# Planning Reference

**Purpose:** Point-in-time snapshots and analyses that inform planning cycles.

**This is for:** Gap analyses, current-state assessments, capability maps, folder structure snapshots — any document that captures "what is true right now" to support a planning decision. These are temporal, not permanent. They may become stale as the system evolves.

**This is NOT for:** Structural models and binding decisions (→ `docs/architecture/`), ecosystem strategy (→ `docs/ecosystem/`), or the way of working (→ `docs/planning/PROCESS.md`).

---

## Structure

```
docs/planning/reference/
├── README.md                              ← you are here
├── ANATOMY-CONFORMANCE-AUDIT.md           ← full-codebase anatomy conformance audit + deviation register (July 2026; CLOSED — all findings dispositioned via Cycle COR-A)
├── ANATOMY-CONFORMANCE-AUDIT-2.md         ← the delta pass (July 2026): rings found conformant; five gate-coverage findings (AC2-1..AC2-5), AC2-1..3 closed by Cycle COR-B. Carries the table-ownership map.
├── ANATOMY-CONFORMANCE-AUDIT-3.md         ← audit III (July 2026, Cycle COR-C): the composition column (GC-14) + findings AC3-*; cited by every per-RPC gate roll-up since
├── ANATOMY-CONFORMANCE-AUDIT-4.md         ← audit IV (2026-08-10, Cycle COR-D): ring-focused, full Hub v2 census; findings AC4-*, GC-15..23; the declared-composition class (ADR-U047 A3); CLOSED 2026-08-11
├── ANATOMY-CONFORMANCE-AUDIT-5.md         ← audit V (2026-09-05, Cycle COR-E): whole repository post-cutover — code rings conformant and gate-green; the drift is in docs/steering/tooling; findings AC5-*, GC-24..27; board OPEN
├── PERF-MEASUREMENT-LEDGER.md             ← the durable ADR-U043 record — one row per measurement pass (ADR-U052 §5; append-only from 2026-07-31)
├── supabase-support-es256-admin-api.md    ← ready-to-send Supabase support ticket for the Admin-API ES256 flake (TASK-INT-01)
├── mist-reconciliation-register.md        ← Shadow -> Mist rename + re-scope worklist (June 2026; Step 1 ratified 2026-06-21, ADR-U031)
├── ADMIN-DEUSEX-GAP-ANALYSIS.md           ← admin/DeusEx capability gaps (April 2026)
├── GROUP-MODEL-CURRENT-STATE.md           ← group model assessment (April 2026)
├── PLATFORM-EXIT-GAP-ANALYSIS.md          ← platform exit gaps (April 2026)
├── FOLDER_STRUCTURE.md                    ← repo folder structure snapshot (April 2026)
├── legacy-feature-docs/                   ← pre-Model-A Ferd feature docs (historical evidence; from docs/TMP/OLDFEAT)
└── 2026-04_hub-l3-working-set/            ← Hub L3 derivation working inputs (April 2026; superseded-model caveat inside)
```
