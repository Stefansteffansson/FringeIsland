# Cycles

Cycles are **Shape Up betting periods** — typically 2–3 weeks of focused build work followed by a cooldown. They are **NOT sprints**. Build cycles run on Shaped Personal Kanban (see [`../PROCESS.md`](../PROCESS.md) Section 3).

## The front door: `cycle-current.md`

[`cycle-current.md`](./cycle-current.md) is the one fixed place to see **what is being built right now** — for Stefan first, and for every session that starts. It is a front door, never the plan itself, and it is **overwritten every cycle**: nothing is recorded here that is not linked from here. The plan is a **dated document** (today under [`../hub-v2/`](../hub-v2/); after Ferd, that directory's successor) written from [`../../templates/cycle-plan.md`](../../templates/cycle-plan.md); the bridges, the wave file, the retrospectives and the task files are the records.

**The shape is the template** [`../../templates/cycle-current.md`](../../templates/cycle-current.md), and the kickoff script writes it — `npm run cycle:kickoff -- "<cycle name>" <plan path>` (from the repo root; `--goal`, `--bridge`, `--next`, `--board`, `--dry-run`; see `scripts/README.md`). The dev dashboard renders the file as Markdown, so the layout is the file:

- a header table with the five fields, in this order: **Cycle** (name and goal in one sentence) · **Plan** (link to the dated plan document) · **Latest bridge** (link) · **Board** (`open` or `settled`, with the date) · **Next** (what follows this cycle);
- three sections, in this order: **In motion** (what is being built or walked right now) · **Waiting on Stefan** (decisions and actions only he can take) · **Landed this cycle** (what merged or closed, PR-linked) — one line per item, six at most per section;
- a size budget (60 lines) — link the record, never restate it.

Two rules keep it true (adopted 2026-09-05 — Audit V R-14, Stefan's ruling; PROCESS.md §3):

1. **At cycle kickoff, write `cycle-current.md` before decomposing anything** — run the script.
2. **At cycle close, repoint it to what is next.**

Two mechanisms make a stale or drifting front door impossible to miss: the session-start hook injects the file into every session (COR-E W2), and the unit gate `hub/tests/unit/platform/cycle-current-front-door.test.ts` (COR-E W8; the shape half added 2026-09-06) fails red when the linked plan carries a closed status, a link does not resolve, Next is empty, or the shape departs from the template.

Cycle retrospectives live in [`../retrospectives/`](../retrospectives/), not in this directory.
