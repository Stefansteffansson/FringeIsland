# Session bridge — Mist reconciliation (Shadow -> Mist rename + re-scope; repo-wide)

**Date:** 2026-06-21. **Shape:** interactive reconciliation pass (audit-first, gated, then rectify cluster-by-cluster).
**Brief:** [`openers/mist-reconciliation-brief.md`](./openers/mist-reconciliation-brief.md).
**Register (worklist):** [`../reference/mist-reconciliation-register.md`](../reference/mist-reconciliation-register.md).
**Authority:** discovery Statements 47-48 (`../../ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`, commit `28cc770`).

---

## What this pass did

Two moves locked by discovery Statements 47-48:

1. **Rename.** The anonymous, pre-signup entrant — until now the **Shadow** — is renamed the **Mist**
   (a translucent, drifting becoming-figure in the *hyaline* state that **accretes** form as it answers
   the founding questions, condensing into the glowing ball only at metamorphosis).
2. **Re-scope.** "Shadow" is **not retired** — it is **reassigned** to the **place-3 / sleep-paralysis
   menace** (the hostile face of the Fringe). Both senses now live in canon, cleanly separated, so the
   word was never blind-replaced — every occurrence was classified by sense.

Keystone: **ADR-U031 (Mist identity lifecycle)** authored, **superseding ADR-U027** (U027's body kept
intact as history; status flipped). Chain: U004 (Visitor) -> U027 (Shadow) -> U031 (Mist).

## How it ran

- **Step 1 — audit (read-only).** Classified all 510 "shadow" lines into a durable register; surfaced
  the inventory; **Stefan ratified** the inventory and ruled decisions A-F.
- **Step 2 — rectify.** Cluster-by-cluster in authority order, keystone first, one commit per cluster.
- **Step 3 — close.** Hub gate note; doc-health-check; this bridge.

## Decisions A-F (ratified by Stefan)

- **A — transcendence vs metamorphosis: ONE event, not two.** Metamorphosis = transcendence (lore name
  / platform term = two faces of one moment). Fires only when **both** conditions hold (all questions
  answered AND consent given); **consent is a precondition, not a separate event.** Path 2 (anonymous):
  both coincide. Path 1 (sign-up first): consent at the door, **completion** gates the event later (in
  that interval the person is a consented, persisted FIM whose Mist has not yet condensed — the ball /
  Whisp-delivery / cord-first-paying-out await completion). Landed as an explicit paragraph in
  ADR-U031's decision section; "transcendence" kept as the spec term, "metamorphosis" the lore term.
- **B — `ARCHITECTURE_ANATOMY_V1.md`:** HISTORICAL-LEAVE + one-line U031 pointer in its banner.
- **C — thinking tree:** left as exploratory record (the universe-discovery README reads as a LOG, not a
  current-orientation index, so no pointer added). The graduation **tracker** in that same file IS
  current-canon-tracking and WAS updated (see doc-health below) — distinct concern.
- **D — accepted-ADR cross-refs (U025, U029):** pointer-edit only, no status flip.
- **E — Hub tours:** RENAME; mechanics folded only where a tour describes tier behaviour.
- **F — schema identifiers (`Visitor`/`Guest`):** untouched this pass (no schema migration). The
  deferred build-time rename **destination is now Mist** (not Shadow).

## Commits (on `main`, local — push pending Stefan's disposition)

`26079cf` C0 keystone (ADR-U031 + U027 flip + index) · `7049028` C1 ADR cross-refs · `7ffa4fd` C2
universe cores (+ place-3 Shadow-menace introduced) · `912f6f7` C3 architecture · `0a55f8a` C4 platform
core (keystone identity spec §9) · `935a24c` C5 domain services (15 files; delegated mechanical rename)
· `f3da334` C6 products + Hub v2 Phase-1 trio (the gate blocker) · `ec54b27` C7 verticals · `b643d17`
C8 planning/reference · `c1fb068` sweep-fix · `b72fa26` close (gate note + doc-health).

## Verification

- Total "shadow" lines 510 -> 383; every remaining hit accounted for (HISTORICAL / NOVEL / research /
  ADR-U031 / register / ~10 intentional active-tree provenance + place-3-menace hits). **Zero
  active-tree misses on "shadow".**
- **Adjacent-vocabulary sweep caught one miss the noun-grep could not:** `infrastructure-specification.md:201`
  cited "ADR-U027" with no "shadow" token (a forward lifecycle cross-ref) -> fixed to ADR-U031. Validates
  the brief's insistence on sweeping `U027` / `Visitor` / `transcend`, not just the noun.
- NEEDS-MECHANICS landings: identity spec §9 (the lifecycle home — accretion, one-event transcendence
  with the Path-1 interval state, presence/assessment ephemerality), roles core, VISION, privacy §6.

## Doc-health-check (cross-cutting change)

- **Section 1 (terminology):** Shadow -> Mist verified clean across the active tree.
- **Section 3 (links):** all ADR-U031 links resolve; one broken link (`SPECIFICATION.md` §72, slug
  mismatch from the token bump) fixed during C6.
- **Section 9 (CLAUDE cascade):** intact (noun-only edits; no path changes).
- **Section 10 (graduation tracker):** ADR-U031 row added; U027 row marked superseded; roles-core row
  source updated to S47-48.
- **Section 1.5 (skill registry):** fed with the Shadow -> Mist rename + re-scope, recording the
  two-sense classification rule so future sweeps never blind-replace the menace-sense "Shadow".

## Named deferrals (open, tracked — not blockers)

- **Shadow menace characterization (force / entity / class) — OPEN.** S47-48 freed the word and pointed
  it at the place-3 menace but did **not** decide its nature; deferred to the **dark-origin mythology
  work**. Recorded in the register's "Named open items" and inline in the cosmology core (open-clause).
- **Novel reconciliation.** `docs/novel/` is NOVEL-FLAG-ONLY — its "Shadow" usage is now divergent;
  corrected at a future novel-reconciliation via the conformance register, never by editing the
  manuscript. (39 hits, left untouched.)
- **Schema-identifier rename (`Visitor`/`Guest` -> Mist).** Deferred code-correction target (decision F);
  carried by the Hub v2 substrate-audit.

## G-34

Not registered: the brief made G-34 conditional on the pass **spanning more than one session**. It
completed in one session and the register is fully dispositioned (with the named deferrals above
permitted to remain), so the multi-session worklist gap was unnecessary.

## State / next

- **Hub v2 Phase-1 gate canon dependency: CLEARED.** The trio (DESCRIPTION, SPECIFICATION,
  substrate-audit, behaviour-inventory) is re-grounded on Mist/U031; the gate may proceed to review.
- **Pre-existing drift noted (out of scope):** `decisions/README.md` is missing rows for ADR-U029 and
  ADR-U030 — flagged for a separate doc-health pass.
- **Push:** all commits are local; push is on Stefan's disposition (MCP git cannot push; the terminal does).
