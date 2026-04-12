# Planning

**Purpose:** How work gets done — the temporal, operational counterpart to the ecosystem tree (which describes what we are building).

**This is for:** Waves, cycles, tasks, session records, retrospectives, reference snapshots, and process documentation. Everything here is operational and time-bound.

**This is NOT for:** What FringeIsland is (→ `docs/ecosystem/`), how it's structured (→ `docs/architecture/`), or what services do (→ `docs/platform/`).

---

## Structure

```
docs/planning/
├── README.md                              ← you are here
├── PROCESS.md                             ← canonical way of working (read this first)
├── DEFERRAL_PROTOCOL.md                   ← cross-wave deferral workflow (under review)
├── PLANNING_PROTOCOL.md                   ← research-first planning sequence (under review)
│
├── waves/                                 ← strategic focus periods
│   ├── ferd.md                            ← Wave 1 — current
│   └── FERD-CAPABILITY-MAP.md             ← 110 capabilities, launch blockers
│
├── cycles/                                ← Shape Up betting cycles (2-3 weeks + cooldown)
│
├── backlog/                               ← work items and ephemeral task files
│
├── sessions/                              ← design and decision session bridges
│   ├── 2026-04-12_-_SESSION-BRIDGE.md     ← most recent
│   └── ...
│
├── retrospectives/                        ← cycle and wave retrospectives
│
└── reference/                             ← point-in-time snapshots for planning decisions
    ├── README.md                          ← reference overview
    ├── ADMIN-DEUSEX-GAP-ANALYSIS.md       ← admin capability gaps
    ├── GROUP-MODEL-CURRENT-STATE.md       ← group model assessment
    ├── PLATFORM-EXIT-GAP-ANALYSIS.md      ← platform exit gaps
    └── FOLDER_STRUCTURE.md                ← repo folder structure snapshot
```

**Current wave:** Ferd

---

## Key principle

Features live in the ecosystem tree under their owner (e.g., `../products/hub/features/FEAT-H001-*.md`). Waves, cycles, and tasks **reference** those features — they never duplicate them.
