# Session bridge — Cycle D decomposed: the Journal routed to DS-7, FEAT-PD001 + FEAT-H011 at 4-ready

**Date:** 2026-07-03
**Session type:** Cycle D (IDN-5 private Journal) decomposition — L4 entry with a routing adjudication surfaced mid-descent.
**Status:** **Complete.** Journal primitive routed to DS-7 Intelligence (ratified); paired specs FEAT-PD001 (the first Domain-tier feature) + FEAT-H011 at `4-ready`. Cycle D is ready for its build session.
**Participants:** Stefan + Claude

---

## What the session set out to do

Kick off Cycle D of the Phase-3 Identity-completion plan: confirm whether the "PC-2 Journal substrate" exists or is net-new (the plan's explicit don't-assume flag), then decompose IDN-5 to 4-ready feature spec(s).

## The load-bearing finding

The substrate check answered more than asked. **Net-new, and ownerless:**

- Zero journal tables/RPCs/code anywhere (`supabase/`, app, lib); the only trace is the FORWARD-SEAM comment in the export migration (`20260630161155_feat_pc008_data_export.sql:14`). PC-2's stress-test finding C1-1 recorded the same.
- The Hub L3 row said IDN-5 depends on "PC-2 (Journal primitive)" — **stale**: PC-2 had adjudicated the Journal out of Core at its Step 3 Q1, carrying it to "whichever Domain Service receives Journal (TBD)". All seven DS descents then closed **without any of them picking up the routing** (the pickup was addressed to a TBD recipient, so no descent owned answering it). L4 paused per the skill's upstream-inadequacy rule.

## The routing adjudication (ratified by Stefan, 2026-07-03)

**The Journal primitive is DS-7 Intelligence's.** Rationale: the Journal is member-authored private reflection, adjacent to the profile-accumulation store that already holds member-authored self-defined intentions (the ADR-U005 bucket/source shape) under DS-7's strictest-privacy posture; the Whisp is the natural future consumer. Considered and rejected per the sub-tier discipline: **DS-4 Content** (capability-mismatch — its charter is universe-renderable substance served to referrers; private entries are never presented, have no referrers) and **a new dedicated service** (no capability-mismatch with the Profile accumulation area to justify one). Recorded as an **L3 adjudication note** (no ADR) — the shape PC-2's pickup anticipated. Full rationale: `intelligence.md` Sources-status amendment.

Companion scope decisions (also ratified): **erasure + export both in v1** (no live GDPR gap ships — hard-delete cascade, never sentinel-reassigned, plus a Domain-side `get_own_journal_export()` composed with the PC008 document at the surface, preserving the one-way Core→Domain boundary); **FIM-only v1** (ADR-U031 Mist ephemerality stays out); sharing (S43) and Whisp integration are No-gos.

## Artifacts

**New (both `4-ready`):**
- `docs/platform/domain/features/FEAT-PD001-personal-journal-primitive.md` — `journal_entries` table, no direct client-role grants, five own-subject RPCs, FIM-only gate, erasure cascade, export contract. **The first Domain-tier feature spec.**
- `docs/products/hub/features/FEAT-H011-private-journal.md` — the `/journal` surface (list/write/edit/delete, ConfirmModal delete, Mist nav hidden) + the export-composition story (closes FEAT-H010's journal forward-seam at the surface).

**Amended (the ratified backward-edit batch):**
- `intelligence.md` — §L3 `Personal Journal store` row (Profile accumulation) + dependency-chain sentence + Sources-status adjudication amendment + §L4 summary (FEAT-PD001 row; fourteen→fifteen).
- `hub/SPECIFICATION.md` — IDN-5 row external-dep cell PC-2→DS-7; external-dependency table row moved to the DS-7 block; §L4 FEAT-H011 row + coverage-note update.
- `identity-specification.md` — the Journal removal note now names DS-7; the pickup marked **RESOLVED 2026-07-03** with both items landed.
- `platform/domain/README.md` — DS-7 inventory line gains the Journal store.
- Both `features/README.md` indexes (the domain index gains its first row).

## Follow-ups

- **Build session next:** `feature-development` on FEAT-PD001 (platform half first — the **schema-review gate pauses the merge**: new table + RLS + column-grant posture + the ADR-U038 direct-caller question), then FEAT-H011.
- **At Cycle D close:** FEAT-H010 gets a short provenance amendment when the export composition ships (its courier claim "future sections flow through with no Hub change" is superseded by the composition approach — the download route composes two contracts).
- Cycle E (IDN-11 session edges — feasibility-gate Supabase per-device sessions first) and Cycle F (IDN-10 seam) remain as sequenced.

**Final state:** eight files changed/added on top of `main` @ `9effc29`; committed via the fuller-auto cycle (this bridge included).
