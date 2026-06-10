# DS-1 descent — Phase 0 ratified delta record (PC re-check)

**Date:** 2026-06-10
**Type:** Session artifact (Phase 0 gate record of the DS-1 World Model descent session).
**Work order:** the Session B conformance register (`2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`)
Section 3 (PC-1..PC-4 verdicts + the DS-1 constraint row) and Section 6 handoff item 2
(DS-1 unpause condition met). Phase 0 was folded in at Stefan's direction so DS-1 derives
against re-validated dependencies.
**All judgment calls below ratified by Stefan, 2026-06-10.**

---

## 1. PC-2 Identity — Shadow lifecycle decomposition (RATIFIED: keep single row)

The G-3 seed row stands as the full capability-grain answer. **No further PC-2 capability
rows.** Rationale: the row's grain matches its siblings (`Account lifecycle state machine`,
`Sign-up flow`); TTL configuration and the atomic transcendence migration are already named
*inside* the row, §9, and §8 Q10 as tested platform invariants resolving at FEAT-PC2
maturity — they are feature-grain mechanics, not capability-grain operations.

**Ball-grant linkage is NOT a PC-2 capability.** The ball is world-state (cosmology core §6);
the capability "ball grant at transcendence" belongs to **DS-1 World Model**, consuming PC-2's
transcendence event from the Domain side. Dependency direction Core <- Domain holds; PC-2
remains unaware of its Domain consumers. (A PC-2 §9 consumer-note cross-ref was offered and
NOT ratified — no PC-2 edit lands.)

## 2. PC-3 Organisation — Dreamineer authority templates (RATIFIED: demand-driven)

The G-3 treatment is confirmed as final: the four specialisations (Creator, Anthropologist,
Teller, Wayfinder) are **role-template entries** riding the existing `Role Template
management` capability — §6 of the PC-3 spec already states "no new capability is
introduced." This is consistent with the inventory's grain (Steward / Guide / Participant /
Observer likewise have no per-template rows). Re-check fires when the studios decompose
(studio L2/L3 work surfaces any need beyond `has_permission()` gating). The acquisition
route (earned / granted / applied-for) stays an open thread in the roles core. **No PC-3 edit.**

## 3. S43 per-region home-sharing seam (RATIFIED ownership split)

Walked once, deliberately, across the four areas. DS-1's Phase 1 derivation consumes this.

| Area | Owns | Capability impact |
|---|---|---|
| **DS-1 World Model** | The private home as a place; its region/part structure; the **share-state** (region -> audience, granted / revoked, default-locked, FIM holds the only key); enforcement at the read path | New DS-1 capability (lands in the DS-1 L3 inventory, Phase 1) |
| **PC-3 Organisation** | The **audience primitive**: the "who" of a grant is a personal group or group per ADR-U006/U007; grant resolution rides the universal group pattern | None — existing substrate, consumed by DS-1 |
| **PC-2 Identity** | Identity status only: home access is FIM-only intrinsically (a Shadow has no ball) — already specified at §9 | None |
| **Privacy vertical** | The obligations (default-locked; only-key; per-region, per-audience, revocable) — landed at G-3, deliberately owner-agnostic ("the service owning the FIM's private home") | None — DS-1's spec claims ownership explicitly |

Rejected alternative (recorded): modelling share-grants as PC-3 state would put a
FringeIsland-specific concern (home regions) inside domain-agnostic Core.

## 4. PC-1 Infrastructure — confirm-skim outcome (one RATIFIED edit)

- **Feature-flag -> Console routing: CONFIRMS.** PC-1 owns the `feature_flags` substrate;
  PC-4 §2 Ferd routing (locked per ADR-U028) routes the toggle *surface* to the Console.
  Consistent; no edit.
- **pg_cron TTL sweep: boundary gap found and closed.** PC-1's spec carried zero mention of
  pg_cron / scheduled jobs, while PC-2's Shadow row cites "PC-1 (pg_cron cleanup mechanism
  per ADR-U004)" as an external dependency — exactly the template's surface-as-boundary-question
  case. **RATIFIED edit (landed this commit):** PC-1 gains a **Scheduled-job substrate
  (pg_cron)** primitive — §3 primitive bullet, §L3 capability row, dependency-chain item 9,
  and the Privacy line of §L3 External dependencies. Marked real-as-need (the ADR-U004
  mechanism predates the row), same shape as PC-1's feature-flag substrate.

## 5. PC-4 Governance — Console check (verified; marker NOT ratified)

The Console is correctly placed (§1, §2 enterprise-plane sub-section, Ferd routing) and
correctly **absent from the L3 inventory** — not decomposed this session, per the work order.
Finding: the spec does not itself carry an explicit "decomposition pending / demand-driven"
marker; that statement lives only in ADR-U028's Neutral consequence. A one-sentence marker
edit was offered and **not ratified** — recorded here so the finding isn't lost; it can ride
a future PC-4 amendment or doc-health-check pickup.

## 6. Verified for Phase 1 (disk facts)

- **DS-1 spec target filename:** `docs/platform/domain/world-model.md` (flat file, slug
  `world-model`, per `docs/platform/domain/README.md` + `docs/templates/domain-service-spec.md`;
  no service spec files exist under `docs/platform/domain/` yet — verified by directory listing).
  The register's 2.6 row `platform/domain/world-model/` referred to the README's DS-1 label,
  already corrected at G-3.
- **Phase 0 gate: CLOSED.** DS-1 Phase 1 derivation may proceed against: the cosmology core
  (ground truth), the register's Section 3 DS-1 row, the seam decision (§3 above), and the
  ball-grant placement (§1 above).
