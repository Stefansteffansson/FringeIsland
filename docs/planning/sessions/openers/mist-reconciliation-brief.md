# Brief — Mist reconciliation (Shadow -> Mist rename + re-scope; repo-wide)

**Authored:** 2026-06-21, in conversation with Stefan (Claude.ai design session that locked Statements 47-48).
**Shape:** interactive reconciliation pass — NOT an autonomous L1->L3 template instance and NOT an amendment-session template instance. CC audits first and reports; Stefan gates the inventory; CC then rectifies cluster-by-cluster. Precedent: `spec-alignment-challenge-brief.md` and the breach-response spike (top-level briefs, no STATUS.md entity row).
**Start prompt:** `Read docs/planning/sessions/openers/mist-reconciliation-brief.md and proceed.`
**Blocks:** the Hub v2 Phase-1 gate (see "Sequencing" below). Do this before that gate closes.

---

## Why this exists

A 2026-06-21 universe-discovery resume added **Statements 47-48** to the canonical discovery log
(`docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`,
commit `28cc770`). They rework the anonymous tier and the Whisp/cord origin. The discovery log is
the single source of truth and **outranks every other artifact in the repo** (docs, ADRs, specs,
code); on conflict, those artifacts are corrected to match the discovery, never the reverse.

The change has two moves, and the second is what makes this dangerous to automate naively:

1. **Rename.** The anonymous entrant — until now called the **Shadow** — is renamed the **Mist**
   (a translucent, drifting becoming-figure in the *hyaline* state that accretes form as it answers
   the founding questions, condensing into the glowing ball only at metamorphosis = all questions
   complete AND consent given).
2. **Re-scope (the trap).** "Shadow" is **not retired**. It is **reassigned** to mean the
   **place-3 / sleep-paralysis menace** (the hostile face of the Fringe). So "Shadow" still appears
   in canon — with a *different* meaning. A blind find-and-replace of Shadow -> Mist would corrupt
   every legitimate place-3 reference. **Every occurrence must be read and classified by sense.**

Read Statements 47 and 48 in full before doing anything. They are the authority for every decision
in this pass. Also read the 2026-06-21 frontmatter resume paragraph and the 2026-06-21 Divergences
bullet in the same file — the Divergences bullet already names this rectification as a required
follow-up.

---

## The decision rule (apply per occurrence)

For each hit on "Shadow" (and the adjacent anonymous-tier vocabulary), assign exactly one:

- **RENAME -> Mist** — the occurrence means *the anonymous, pre-signup entrant / its lifecycle /
  its data / its access*. Rewrite to Mist and, where the surrounding text models the tier, fold in
  the new mechanics (see "Mechanics that must propagate" below).
- **KEEP (place-3 menace)** — the occurrence already means, or should now mean, the hostile place-3
  / sleep-paralysis entity. Leave the word; if the text is ambiguous, make the place-3 sense
  explicit.
- **NEEDS-MECHANICS-UPDATE** — the file models the anonymous tier's behaviour (auth, ephemerality,
  access gating, transcendence) and needs more than a token swap: the new mechanics must be folded
  in. (Usually co-occurs with RENAME.)
- **NOVEL-FLAG-ONLY** — occurrences under `docs/novel/`. Do **not** edit the manuscript. The novel
  binds to canon via its conformance register; its "Shadow" usage is now divergent and is corrected
  at a future novel-reconciliation, never by overriding the discovery. Record, do not touch.
- **HISTORICAL — LEAVE** — append-only logs and provenance whose integrity depends on not being
  rewritten: the universe-discovery log itself (47-48 already supersede by addition; earlier
  statements are never edited), session bridges under `docs/planning/sessions/`, closing bridges,
  archived openers, retrospectives, ADR *bodies* of superseded ADRs. These are the record of what
  was decided when; they stay as-is. (The ADR *status line* is the one exception — see U027 below.)
- **AMBIGUOUS -> ASK STEFAN** — anything you cannot confidently place. Do not guess.

When in doubt between RENAME and KEEP, the discriminator is: *does this passage describe someone
arriving / being anonymous / not-yet-committed / transcending?* -> Mist. *Does it describe a hostile
force, place 3, the dark face, sleep paralysis, danger from the Beyond?* -> Shadow (keep).

---

## Mechanics that must propagate (not just the noun)

Where a file models the tier (NEEDS-MECHANICS-UPDATE), reconcile these from Statements 47-48:

- The **Mist accretes** form (eyes -> mouth/features -> definition -> condensation) as it answers
  the founding questions; accretion tracks **progress, never which Big-5 trait** (stage legible,
  content private — a privacy invariant, not just flavour).
- **Two entry paths, one consent gate:** (1) sign up as FIM first, then mature as a Mist;
  (2) enter anonymously as a Mist, choose at the threshold. The glowing ball exists **only past
  consent**. **Metamorphosis fires only when all questions are complete AND consent is given.**
- **Dissipation = "not yet," never death.** A Mist that drifts away returns to potential; on return
  it forms anew (no resumed identity).
- **Ephemeral + unlinkable.** Anonymous Mist answers are held transiently and **no trait-profile is
  computed pre-consent**; presence is **session-ephemeral and unlinkable** (no client-visible
  identifier across sessions, no persisted interaction trail). Device-local-only persistence is a
  permitted kindness; a server-side anonymous token is explicitly NOT adopted without a hard
  retention clock and no pre-consent inference. (This *extends* ADR-U027's "ephemeral, erased on
  inactivity" to the assessment and presence layers — same posture, wider scope.)
- **Interaction gated by accretion; signup buys memory, not voice.** A Mist can perceive and respond
  live (gated by developmental level); every anonymous exchange is live and unrecorded. FIM signup
  unlocks not the *ability* to interact but the ability for interaction to be **remembered**
  (branches, names, DMs, journal, forums).
- **Whisp/cord origin (Statement 48, Option A — nothing in U027 is overturned).** The Mist already
  has its own Whisp and cord from the first moment (preserves S39 exactly); the cord is merely
  **unpaid-out** until metamorphosis, which is the cord's **first paying-out**, enabled by the ball
  as anchor-root. The cord is **kept, not severed** (umbilical inverted); cord length is
  developmental intimacy. U027's lifecycle (anon auth, ephemerality, atomic transcendence) is
  **preserved and renamed**, not redesigned.

---

## Sequencing — this goes in front of the Hub v2 Phase-1 gate

The active plan (`docs/planning/SESSION-OPENER.md`, `docs/planning/hub-v2/README.md`) has Hub v2 at
**Phase 1 deliverables done, gate review pending**. The Phase-1 substrate audit already names
**"the Shadow lifecycle is the one substantial gap"**, and the refreshed Hub SPECIFICATION
**"reconciled U027/U028."** Those three Phase-1 outputs (Hub DESCRIPTION + SPECIFICATION,
`substrate-audit.md`, `behaviour-inventory.md`) were written against the *old* Shadow meaning.

**The Phase-1 gate must not pass until those three outputs are re-grounded on Mist.** No Phase-2
code has been written yet, so catching this now prevents the old vocabulary/mechanics from
propagating into the walking skeleton and the area builds. Treat this brief as **Phase 1.5**,
blocking the gate.

---

## Order of work (keystone first, then by authority)

1. **ADR-U031 (new, superseding ADR-U027).** Write `ADR-U031-mist-identity-lifecycle.md`: the
   anonymous identity is the **Mist**; "Shadow" reassigned to the place-3 menace; the U027 lifecycle
   (anon auth, ephemerality, atomic transcendence) preserved and renamed; the assessment/presence
   ephemerality and the accretion/consent-gate mechanics added; cite discovery Statements 47-48 and
   predecessor ADR-U027 (which itself renamed ADR-U004's "Visitor"). Then flip **ADR-U027 status to
   "Superseded by ADR-U031"** and add a one-line pointer at its top — **U027's body stays intact as
   history** (forward-only correction; do not rewrite the decision record). Update the decisions
   `README.md` index and the retired-names table in the roles core.
2. **Universe cores** (`docs/ecosystem/universe/`): roles, beings, cosmology, community,
   personal-growth/privacy-model, and the universe README. These are canonical; correct the Shadow
   sense to Mist and make the place-3-menace sense explicit where it now lives.
3. **Architecture**: `ARCHITECTURE_ANATOMY_V1.md`, `DOMAIN_ENTITIES.md`, ADR-U025/U029 references,
   architecture README. (Check whether the canonical anatomy SVG carries "Shadow" — the memory of
   record names `ECOSYSTEM_ANATOMY` variants; verify on disk.)
4. **Platform specs + CLAUDE cascade**: `platform/core/identity-specification.md` (the keystone spec
   — this is where the lifecycle lives), `infrastructure-specification.md`, the seven Domain Service
   specs and their CLAUDE.md files, products/hub specs + the Hub v2 Phase-1 trio, the products and
   hub CLAUDE.md files, strategy docs.
5. **Verticals** — note Privacy is **active and already cites U027**: its closing bridge records
   "the four U027 Shadow bullets + S43 kept verbatim" in `verticals/privacy/SPECIFICATION.md §6`.
   Re-grounding those four bullets on Mist/U031 is required. Also administration, notifications,
   transactions specs where Shadow appears.
6. **Planning/reference + capability map**: `FERD-CAPABILITY-MAP.md`, `reference/` docs,
   `OPEN_QUESTIONS.md`. (Session bridges and archived openers are HISTORICAL — leave.)

Schema note: a repo grep shows **no active DB migration uses "shadow"** (one archived file only), so
this is a docs/spec/ADR reconciliation, **not a schema migration**. Do not rename schema
identifiers; if a specific one surfaces, flag it AMBIGUOUS rather than migrate it in this pass.

---

## Procedure

**Step 1 — Audit (read-only). Produce the inventory. STOP at the gate.**
- `git grep -in` for `shadow` across `docs/` (exclude nothing initially; classify `docs/novel/` as
  NOVEL-FLAG-ONLY and the historical logs as HISTORICAL). Also sweep the adjacent vocabulary that
  models the tier without the word "Shadow": `anonymous`, `transcend`/`transcendence`, `Visitor`,
  and anonymous-auth references. Use git grep (the reliable method; sandbox `find`/glob-grep have
  produced false empties in this repo — verify any zero by a second method).
- Build a classified inventory: file + line + quoted snippet + verdict (RENAME / KEEP /
  NEEDS-MECHANICS-UPDATE / NOVEL-FLAG-ONLY / HISTORICAL / AMBIGUOUS) + a one-line note.
- Write it to a durable register: `docs/planning/reference/mist-reconciliation-register.md`
  (the register IS the worklist; the session produces a worklist, not just a conversation).
- **Surface the inventory to Stefan and WAIT for ratification.** Do not edit any file in Step 1.

**Step 2 — Rectify (only after Stefan approves the inventory).**
- Work cluster-by-cluster in the authority order above, keystone (ADR-U031) first.
- Per file: dry-run the edit, verify the diff, apply (MCP edit discipline). ASCII-only. One logical
  cluster per commit.
- Commit messages: `docs(scope): ... (Shadow -> Mist; cites discovery S47-S48, ADR-U031)` with a
  body citing predecessors and the register. No `Co-Authored-By` (CC adds it).
- Register each cluster's completion in the register file; keep AMBIGUOUS items open for Stefan.

**Step 3 — Close.**
- Register a gap **G-34** in `docs/ecosystem/how-we-work/gaps.md` ("repo-wide Shadow -> Mist
  reconciliation") if the pass spans more than one session, so the worklist is canonical; resolve
  and close it when the register is fully dispositioned (novel + any AMBIGUOUS items may remain as
  named deferrals).
- Run the `doc-health-check` skill (cross-cutting change: a rename + re-scope) and fix what it flags.
- Update the Hub v2 Phase-1 gate note to record that the trio was re-grounded on Mist/U031, then the
  gate may proceed.
- Write a closing bridge under `docs/planning/sessions/`.
- Commit and push on Stefan's disposition (MCP git cannot push; the terminal does).

---

## Discipline

- Discovery (S47-48) outranks all. Specs/ADRs/anatomy are corrected to match; never the reverse.
- Cite actual file+line, never recall — verify-before-asserting binds at this volume (~100 files).
- Audit-first-then-gate is mandatory because "Shadow" now has two meanings; never blind-replace.
- Novel is flagged, never edited, in this pass. Historical logs are left intact (forward-only).
- ASCII-only labels and identifiers. Append-only to the discovery log (already done; do not touch).
- Schema identifiers untouched; surface any as AMBIGUOUS.

## Not in scope

No application code changes (this is docs/spec/ADR reconciliation). No schema migration. No edits to
the novel manuscript. No rewriting of historical bridges/logs. This brief does not run the Hub v2
build — it clears the Phase-1 gate's canon dependency so that build can proceed on true vocabulary.
