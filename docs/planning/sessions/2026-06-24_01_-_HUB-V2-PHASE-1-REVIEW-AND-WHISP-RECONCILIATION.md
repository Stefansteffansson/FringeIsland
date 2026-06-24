# Session bridge — Hub v2 Phase-1 gate brief + build-informed review (Whisp reconciliation)

**Date:** 2026-06-24 (session spanned 2026-06-21 → 2026-06-24)
**Session type:** review
**Status:** Closed — Phase-1 gate verdict + push pending (see Open items)
**Participants:** Stefan + Claude

> Durable artifact so the next session can pick up without re-reading the transcript.

---

## Session summary

Opened on the Hub v2 dashboard and the Phase-1 gate status. Confirmed Phase 0 done / Phase 1 "deliverables done, gate review pending," and produced a one-page **Phase-1 gate brief** (`phase-1-gate-brief.md`, recommendation: **PASS** with two non-blocking cleanups).

Stefan then read the Hub **human tour** and raised substantive feedback, which we ran through the **build-informed spec-evolution loop** (PROCESS §9): capture → triage → resolve-with-provenance → propagate. That produced a findings register (`phase-1-review-findings.md`) with seven findings, **all now resolved or routed**. The headline was **F-04**: §L3's A-COI area had drifted into a separate "AI Mentor" companion entity, which contradicts canon — the **Whisp** *is* the FIM's AI-driven inner-dialogue voice (beings core; ADR-U029), and "mentoring" is a *function* it performs, not a second entity. We recast A-COI onto the Whisp across the spec + both tours, with provenance.

Along the way we also fixed root `CLAUDE.md` drift (a stale ADR range), added a missing admin capability (**ADM-18**), stripped the founding-question sermons from the tour, framed the Hub's deeper experiential-scope question as **CQ-016** (routed to a discovery session), ran a tree-wide Mentor check + a scoped **doc-health pass**, and closed out with commits + this bridge.

## What was decided

- **The Whisp is the AI-driven inner-dialogue companion; "Mentor" is a function it performs, not a separate entity.** Canon (beings core S1/S3/S4/S5/S17-18/S39; ADR-U029). The §L3 "AI Mentor" was a derivation that drifted. *Locked* (F-04, committed).
- **The first Hub build (Ferd) is deliberately the platform fundamentals; higher-purpose experiential mechanics layer on in later waves.** Sequencing by design, not omission. *Locked* (Stefan).
- **ADM-18 added** — admin removal of member(s) from a specific group/groups (DeusEx override of MEM-5). *Locked* (F-05).
- **Founding-question sermons removed from the human tour**; the three questions stay canonical in VISION/§L3 — the FIM works them with their Whisp. *Locked* (F-01).
- **Journal (IDN-5) kept as-is** — specified, Partial-Ferd, but build-new (no substrate, no oracle). *Locked* (Stefan, option a).
- **pointer-not-snapshot** for growing counts in routing/index docs (applied to root `CLAUDE.md` ADR range + `thinking/README.md`). *Locked* (also saved to memory).
- **CQ-016** frames the open part: the Hub's experiential trajectory across waves + whether the DESCRIPTION conveys the ambition → **discovery session**. *Proposed / Open.*

## What was produced

- commit `d8f7bfa` + `28c435b` — root `CLAUDE.md`: stale ADR range fixed, then de-numberized (pointer-not-snapshot)
- commit `a34f87b` — **F-04** Whisp reconciliation (SPEC §L3 A-COI + DESCRIPTION + OPEN_QUESTIONS + both tours); folds in F-02 (GDPR hard-delete final) + F-03 (Journey-Studio-set player)
- commit `09ab786` — **F-01** founding-question sermons stripped from HUMAN.md
- commit `b0c5bbb` — **F-05** ADM-18 (+ both tours, scorecard 105→106)
- commit `5aa7a80` — **F-07** CQ-016 + findings register closed
- commit `d04165f` — doc-health: Mentor residuals (substrate-audit + 2 SVG DS-7 labels) + thinking/README de-snapshot + OQ date + skill §1.5 row
- commit `690bd02` — the Phase-1 gate brief
- `docs/planning/hub-v2/phase-1-review-findings.md` — the review register (Closed) · `F-04-whisp-amendment-proposal.md` — the print-before-gate draft
- memory: `feedback_pointer_not_snapshot.md`

## What is still open

- **The Phase-1 gate verdict itself.** The gate brief recommends PASS and all review findings are resolved, but Stefan has not formally given the verdict or flipped the hub-v2 README (Phase 1 → Done, Phase 2 → Active). This is the key immediate item.
- **CQ-016 discovery session** — the Hub's experiential trajectory across waves (the substantive generative next step).
- **Gate-brief cleanups (non-blocking)** — still unfixed: SPEC §L3 Sources-status says "42 seeded permissions" (should be 44); substrate-audit header still calls the behaviour inventory "(deliverable 3, pending)" though it's done.
- **Commits are local, not pushed.**

## Tensions and contradictions

- **A-COI is specified-but-thin.** The full Whisp spec (`whisp.md`) is pending and the Hub's Whisp representation is itself open (CQ-012). A-COI points at the Whisp but does not yet define its surface mechanics — deliberately (rename-pass discipline; fundamentals-before-experience-design).
- **A cluster of "canon-true but build-new" capabilities** — the Whisp, the Mist lifecycle, and the Journal are all specified in canon yet have **no substrate and no oracle**. They share the "specify fresh from canon" build path.

## Non-obvious insights

- **The product layer ran ahead of the universe fundamentals.** The §L3 derivation drifted from canon on the highest-consequence concept (the Whisp). This is the clearest live instance of *fundamentals-before-experience-design*, and CQ-016 captures the broader version of the gap.
- **doc-health-check is blind to inline counts sitting beside a valid link** (the root CLAUDE.md ADR range; the thinking/README CQ count). The fix is structural — pointer, not snapshot — not a new check.
- **"Mentor" has at least three legitimate senses** — the function-word ("the Whisp mentors"), CQ-009's *human* 50+ Mentor/Elder role, and story/NPC mentors. Never blind-replace; the new §1.5 table row encodes this.

## For the next session

- **Read order:** `hub-v2/README.md` → `phase-1-gate-brief.md` → `phase-1-review-findings.md` (Closed) → `CQ-016` in OPEN_QUESTIONS.
- **Immediate focus:** Stefan's Phase-1 gate verdict. If PASS → flip the hub-v2 README (Phase 1 → Done, Phase 2 → Active) and begin Phase 2 (the walking skeleton: sign-in → land on `/groups`, over the conformant substrate).
- **Big generative thread:** the CQ-016 discovery session (Hub experiential trajectory) — best run fresh and focused.
- **Locked vs open:** the Whisp model + sequencing + ADM-18 are locked; the gate verdict + CQ-016 are open.

---

## Open items

### Immediate
- [ ] Stefan's **Phase-1 gate verdict** (gate brief recommends PASS) + flip hub-v2 README (Phase 1 → Done, Phase 2 → Active)
- [ ] **Push** this session's commits (local only)

### Near-term
- [ ] **CQ-016 discovery session** — Hub experiential trajectory across waves
- [ ] Gate-brief cleanups: SPEC "42 seeded permissions" → 44; substrate-audit "behaviour inventory (deliverable 3, pending)" → done
- [ ] If gate PASSes: begin **Phase 2 walking skeleton**

### Deferred
- [ ] Cascade-wide **growing-count sweep** (pointer-not-snapshot) — other hardcoded table/test/feature counts
- [ ] `ARCHITECTURE_ANATOMY_V1.md` pre-canon "AI Mentor = parallel self" reconciliation (larger; v1 reference doc)
