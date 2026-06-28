# Session bridge — Identity-completion plan in place; clean handoff for Cycle A

**Date:** 2026-06-28 (planning + process-hardening session; follows `2026-06-28_03` which merged PC003 + H005)
**Session type:** Planning / sequencing (no feature code). Closes with a deliberate **fresh-session cut** before any building.
**Status:** **The Phase-3 Identity-completion plan is authored and merged to `main`.** No A-IDN long-tail code started yet — that begins next session, clean.
**Branch/PR:** `docs/phase3-identity-completion-plan` → PR (merged). `main` synced.
**Participants:** Stefan + Claude

---

## What this session produced

1. **The plan** — [`../hub-v2/phase-3-identity-completion-plan.md`](../hub-v2/phase-3-identity-completion-plan.md): the Foundation-first sequence to finish Identity (A-IDN), with IDN-10 as an explicit forward-seam. Decision: **finish Identity before Groups** (Option 1), de-risked by the cross-dependency analysis (lifecycle cascades are platform-tier; the substrate carries them forward, so the Groups/Journeys *Hub UIs* are not prerequisites).
2. **README refresh** — [`../hub-v2/README.md`](../hub-v2/README.md) status corrected (it was stale: IDN-1..4 are done, not "IDN-2 scoped / Groups next") and now links the completion plan.
3. **Earlier in the day (already merged):** PC003 schema gate cleared + merged (PR #10); FEAT-H005 built `6-done` + merged (PR #11) — **IDN-4 + the IDN-3 sign-out tail complete**; a `next build` break PC003 had left on `main` was fixed; and stale-snapshot inventory-drift guards landed (PR #13: banners + `doc-health-check` Section 3.7) after an Explore agent reported a superseded IDN-1..14 numbering. Orchestration + verification discipline captured in auto-memory.

## Where we are (by the files)

- **Phases 0–2 done; Phase 3 active, in the Identity area.** IDN-1/2/3/4 = `6-done` (FEAT-H001..H005 + FEAT-PC001/PC002/PC003). These are the capabilities every downstream area depends on.
- **Remaining in Identity:** IDN-5..12 (8 caps), per `docs/products/hub/SPECIFICATION.md` §L3:186–197 (the canonical inventory — IDN-1..12, not the superseded 2026-04 IDN-1..14 draft).

## Resume HERE — next session (clean) does Cycle A decomposition

**Goal:** author **Cycle A** (IDN-9 account-state render → IDN-12 self-service reactivation) to `4-ready`, paired-platform-first.

1. Load the `ecosystem-decomposition` skill.
2. Author the **platform halves first** (PC-2 account-state read + PC-2 state-transition / PC-4 audit for reactivation) to `4-ready`, then the **Hub halves** (FEAT-H### — IDs assigned at decomposition). Paired-spec rule: the Hub spec can't reach `4-ready` until its platform half is `4-ready`.
3. Then (subsequent build session) `feature-development`: platform first through the schema gate, then Hub, red-first → `6-done`.

**Read order for the next session:** root `CLAUDE.md` → `AGENTS.md` → `PROCESS.md` → `ecosystem-decomposition` skill → `docs/platform/CLAUDE.md` + `docs/platform/core/CLAUDE.md` → this bridge → [`../hub-v2/phase-3-identity-completion-plan.md`](../hub-v2/phase-3-identity-completion-plan.md) → `SPECIFICATION.md` §L3 (IDN-9, IDN-12 rows) → `identity-specification.md` (PC-2) + `governance-specification.md` (PC-4) → the FEAT-H005/PC003 pair as the freshest paired-spec exemplar.

## Carry-forward reminders

- **IDN-10 is a tracked forward-seam**, not dropped — four hooks (parked spec + ADR-U016 cascade spec + re-entry triggers on Journeys/Communication + a `gaps.md` G-NN). Full detail in the completion plan. Unblocks: enrollment-freeze after Journeys (DS-3); forum-content after Communication (DS-5); full close after Communication.
- **Confirm at decomposition (don't assume):** Journal substrate existence (Cycle D); Supabase per-device session feasibility (Cycle E); PC-4 Governance forward features for consent/export/exit don't exist as specs yet (Cycles B/C/F).
- **Delegated-fact discipline** (auto-memory): when researching with sub-agents, name one canonical source, canonical-wins, cite `file:line`, flag non-authoritative sources; verify load-bearing facts against canonical before planning. The canonical A-IDN inventory is `SPECIFICATION.md` §L3.
- **Minor pre-existing gap:** `hub/CHANGELOG.md` has no FEAT-H004 entry (out of scope; backlog).

## Close-ritual notes

`npm run dashboard` refreshed. No `doc-health-check` full run needed (no cross-cutting change beyond the drift-guards already applied). The next session starts fresh per Stefan's instruction — this bridge is the entry point.
