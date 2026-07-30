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
├── SESSION-OPENER.md                      ← the session-start text injected by the `SessionStart` hook in `.claude/settings.json`
│
├── waves/                                 ← strategic focus periods
│   ├── ferd.md                            ← Wave 1 — current
│   └── FERD-CAPABILITY-MAP.md             ← 110 capabilities, launch blockers
│
├── cycles/                                ← Shape Up betting cycles (2-3 weeks + cooldown)
│
├── hub-v2/                                ← Hub v2 rebuild initiative — plan + substrate-audit + per-slice notes
│
├── backlog/                               ← ephemeral TASK-*.md files for the active cycle
│
├── sessions/                              ← design and decision session bridges
│   ├── 2026-04-17_-_WAY-OF-WORKING-REVIEW.md
│   └── ...
│
├── retrospectives/                        ← weekly, cycle, wave, and quarterly audit retros
│
└── reference/                             ← point-in-time snapshots for planning decisions
    ├── README.md                          ← reference overview
    ├── ADMIN-DEUSEX-GAP-ANALYSIS.md       ← admin capability gaps
    ├── GROUP-MODEL-CURRENT-STATE.md       ← group model assessment
    ├── PLATFORM-EXIT-GAP-ANALYSIS.md      ← platform exit gaps
    └── FOLDER_STRUCTURE.md                ← repo folder structure snapshot (April 2026 — dated, not current)
```

**Current wave:** Ferd

> **On deferral and research-first planning:** Both topics are covered directly in [`PROCESS.md`](./PROCESS.md). Deferral mechanics live in §3 (wave tags + the `parked` YAML flag + the betting table + `../ecosystem/thinking/OPEN_QUESTIONS.md` for homeless items). The research-first discipline is built into the maturity pipeline (§1): an item cannot be specified until it has been explored, and the "Why the pipeline matters" paragraph records the Ferd lesson that motivated the rule. There are no separate protocol files — PROCESS.md is the single source.

---

## Key principle

Features live in the ecosystem tree under their owner (e.g., `../products/hub/features/FEAT-H001-*.md`). Waves, cycles, and tasks **reference** those features — they never duplicate them.
