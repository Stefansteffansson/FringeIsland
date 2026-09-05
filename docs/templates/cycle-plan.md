# Cycle plan — {YYYY-MM-DD to YYYY-MM-DD}

**Cycle:** {N}
**Wave:** {ferd · eid · hamn · heim · brim · urd}
**Length:** {3 weeks build + 1 week cooldown — or actual cadence}
**Status:** Planned · In progress · Closed

> The plan for one Shaped-Personal-Kanban cycle. Lives as a **dated document** for the whole cycle (today under `../planning/hub-v2/`; after Ferd, that directory's successor); `../planning/cycles/cycle-current.md` is the five-field **front door** that points at it (see `../planning/cycles/README.md`), never the plan itself (Audit V R-14, 2026-09-05). See `../planning/PROCESS.md` §3 for cadence rules.

---

## 1. Bets (1–2 max)

The shaped pieces of work this cycle commits to. Each bet has an appetite (the time-box you're willing to spend), not an estimate.

### Bet 1: {name}
- **Appetite:** {1 week / 2 weeks / 3 weeks}
- **Problem:** ...
- **Solution sketch:** ...
- **No-gos:** what is explicitly out of scope for this bet
- **Feature spec:** `../products/{owner}/features/FEAT-{id}-{slug}.md`

### Bet 2: {name}
- ...

## 2. Pulled work items

Items pulled from the backlog into this cycle. Each must be at maturity 4 (Ready) and pass DoR.

| ID | Title | Type | Owner | Status |
|----|-------|------|-------|--------|
| ... | ... | ... | ... | todo / doing / done |

WIP limit: 3 items in "doing" at any time (`../planning/PROCESS.md` §3).

## 3. Cooldown plan

What the cooldown week is reserved for. Bug fixes, tech debt, rest, retrospective, shaping next cycle's bets. Do not promise feature work for cooldown.

## 4. Risks and unknowns

What could derail this cycle. Each risk has a mitigation or a "we accept it" note.

## 5. Cycle metrics (filled in at close)

- **Throughput:** {items shipped}
- **Cycle time:** {avg time from "doing" to "done"}
- **Spillover:** {items not finished, where they go next}
- **Cooldown actually used for:** ...

## 6. Wave check

Waves are thematic focus buckets, not sequential gates (`../planning/PROCESS.md` §3). Items from multiple waves may coexist in a cycle. Note which wave(s) this cycle's items belong to and confirm total WIP stays within the limit of 3.
