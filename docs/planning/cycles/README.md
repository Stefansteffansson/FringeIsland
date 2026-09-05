# Cycles

Cycles are **Shape Up betting periods** — typically 2–3 weeks of focused build work followed by a cooldown. They are **NOT sprints**. Build cycles run on Shaped Personal Kanban (see [`../PROCESS.md`](../PROCESS.md) Section 3).

## The front door: `cycle-current.md`

[`cycle-current.md`](./cycle-current.md) is the one fixed place to see **what is being built right now** — for Stefan first, and for every session that starts. It is a ten-line front door, never the plan itself. The plan is a **dated document** (today under [`../hub-v2/`](../hub-v2/); after Ferd, that directory's successor) written from [`../../templates/cycle-plan.md`](../../templates/cycle-plan.md).

Five fields, in this order: **Cycle** (name and goal in one sentence) · **Plan** (link to the dated plan document) · **Latest bridge** (link) · **Board** (open or settled, with the date) · **Next** (what follows this cycle).

Two rules keep it true (adopted 2026-09-05 — Audit V R-14, Stefan's ruling; the PROCESS.md §3 wording lands with Cycle COR-E W2):

1. **At cycle kickoff, write `cycle-current.md` before decomposing anything.**
2. **At cycle close, repoint it to what is next.**

Two mechanisms make a stale front door impossible to miss: the session-start hook injects the file into every session (COR-E W2), and the unit gate `hub/tests/unit/platform/cycle-current-front-door.test.ts` (COR-E W8) fails red when the linked plan carries a closed status or a link does not resolve.

Cycle retrospectives live in [`../retrospectives/`](../retrospectives/), not in this directory.
