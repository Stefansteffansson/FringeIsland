# Cycle plan — the Eid kickoff (2026-09-07 to the first Eid build cycle)

**Cycle:** Eid-0 (the kickoff)
**Wave:** eid
**Length:** the kickoff session plus its decomposition — a cooldown-shaped cycle, not a build cycle
**Status:** Planned — opened 2026-09-07 at the Ferd close declaration; the kickoff itself runs in a fresh session under the `wave-planning` skill

> The first cycle of Wave 2. This document is the stub the front door points at from the moment Ferd closed; the kickoff session fills it in — the front door was written first (PROCESS.md §3), then this plan, then the wave file with its DoD, then the decomposition. Ferd-era plans live under `../hub-v2/`; Eid's live here, beside the front door.

---

## 1. Bets (1–2 max)

- **Bet 1 — the Eid wave file with its DoD, on day one.** `../waves/eid.md` written from `../../templates/wave-spec.md` with scope, carry-overs from the Ferd retro (§6 wave transition) and the wave-level Definition of Done — the retro's process change: the DoD is written at kickoff, not at close.
- **Bet 2 — the design-tools-and-narrative decomposition.** Journey Studio v1, the minimal design foundation, the Whisp — from the studies under `../waves/studies/eid/`, decomposed under `ecosystem-decomposition` to feature specs at maturity 4-ready for the first Eid build cycle.

## 2. Carry-overs from Ferd (the retro, §5 and §6)

- TASK-FORUM-01 — re-tag to Eid, bet on, or drop with a reason.
- The 2026-04 map's un-specced fundamentals (feature-flag infrastructure, the ADR-U005 flexible profile table, visitor activity transfer) — in or out, in writing.
- The E2E smoke job in CI — Eid's first tooling item (the test project exists; secrets and the one-consumer rule are the design questions).
- The latest-read-wins rule as a `feature-development` line.
- Leaked-password protection — plan-gated (Supabase Pro); a billing decision.
- Two walk observations: the player's Pause affordance is easy to miss; a Steward wanting to pause the group's walk has no door (FEAT-H019 STORY-8's no-go).
- The `next dev` agent-rules files (`hub/AGENTS.md`, `hub/CLAUDE.md`) — commit, disable, or ignore.

## 2b. Candidates raised after the close (not Ferd carry-overs)

- **Member email rectification** — raised 2026-09-11. No path exists today for anyone, admin or member, to change an account's email address; `FEAT-PC003` parked it as ADR-gated and ADR-U038 revoked the column grant. Investigation, the five stores it touches and the two-spec plan: [`../reference/EMAIL-CHANGE-GAP-ANALYSIS.md`](../reference/EMAIL-CHANGE-GAP-ANALYSIS.md). Board RULED 2026-09-11 — see [ADR-U054](../../architecture/decisions/ADR-U054-admin-email-rectification.md). The two feature specs are unblocked and unwritten.
- **Art. 16 rectification is absent from the Privacy vertical.** `../../verticals/privacy/SPECIFICATION.md` enumerates access (Art. 15) and erasure (Art. 17) and not rectification. True whatever the email decision is.

## 3. Definition of Done for this cycle

- [ ] `../waves/eid.md` exists with scope, carry-overs and a DoD
- [ ] the front door names the first Eid build cycle's plan
- [ ] every carry-over above has a written disposition
- [ ] the Eid studies are linked from the wave file
- [ ] the §2b candidates have a written in-or-out

## 4. Decisions for Stefan at the kickoff

- The Eid appetite: how many build cycles before the first live walk of a Journey Studio v1 slice
- Which of the three Eid themes goes first (Journey Studio v1 · the design foundation · the Whisp)
- Member email rectification — in or out of Eid (the capability itself is ruled, ADR-U054; only the scheduling is open)
