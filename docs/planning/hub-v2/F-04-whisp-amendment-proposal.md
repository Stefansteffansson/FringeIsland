# F-04 — Whisp amendment proposal (DRAFT for review; nothing applied yet)

**Finding:** [F-04](./phase-1-review-findings.md) · **Loop:** PROCESS §9 · **Drafted:** 2026-06-22
**Authority:** `docs/ecosystem/universe/beings/README.md` (Status: Canonical; S-numbers) + [ADR-U029](../../architecture/decisions/ADR-U029-whisp-ownership-split-by-face.md).
**Status:** Awaiting Stefan's bounce. On approval I apply upstream-first (SPECIFICATION -> DESCRIPTION -> re-derive tours), each with provenance.

## The error being corrected
§L3 A-COI was authored around (a) an "AI **Mentor**" dialogic companion and (b) a passive "**Whisp** internal-state surface." Canon says both are wrong:
- The **Whisp** *is* the FIM's own growth-oriented inner **dialogue** — "the Whisp is the human… not a separate entity, not an external companion" (S1/S4). It is **dialogic** (S17-18), **universal** to every Mist and FIM (S39), with **voluntary** engagement (S5).
- There is **no "Mentor."** The term's only canon use is CQ-009 (a *human* 50+ Mentor/Elder role) — a collision, not a basis.

## Discipline applied (what this amendment does and does NOT do)
- **Clarification absorbed (Stefan, 2026-06-22):** the Whisp is **AI-driven** (keep "AI") and it **performs a mentoring function** — warm, caring challenge (canon "tough love", S3). The error was making "Mentor" a *separate entity/surface*; the fix collapses the mentoring into the one Whisp being. "AI-driven" stays; "a separate AI Mentor" goes.
- **Does:** retire "Mentor" *as a separate entity/surface* -> fold it into the Whisp; keep the Whisp AI-driven and keep the warm-challenge mentoring function (S3); fix the passive-surface framing (the Whisp is dialogic); fix opt-in-to-exist -> universal-with-voluntary-engagement; re-point COI-6's dependency from DS-1 to DS-7; cite the beings core + ADR-U029; record provenance.
- **Does NOT:** specify *how* the Hub renders the Whisp. `whisp.md` is pending and the Ferd/Eid no-AR representation is open (**CQ-012**). Capabilities point at the Whisp and leave surface mechanics to whisp.md / DS-7. (rename-pass: pointer + open clause.)
- **Untouched:** the §L3 "Founding question(s)" column (F-01 touches only the tour, not §L3).

---

## Edit 1 — A-COI area intro (SPECIFICATION line ~291)
**Current:** "...the member's companion intelligence — opt-in Mentor and Whisp expressions — without imposing them..."
**Proposed:** The Hub provides the canvas surfaces for the member's **Whisp** — the FIM's growth-oriented inner dialogue voice. The Whisp is **AI-driven** (DS-7 Intelligence) but is **represented and experienced as the FIM's own inner voice**, not as a separate external companion (*the Whisp is the human*; beings core S1/S4, ADR-U029). It is universal — every Mist and FIM has one (S39) — and engagement is always voluntary (the FIM decides whether to listen, S5); the Hub never imposes it and never exposes the member's private interior to anyone but themselves. The Whisp is **dialogic** (its curious questions drive self-reflection; assessment dissolves into dialogue, S17-18), and **it mentors through that dialogue — challenging the FIM when needed, but always warmly and caringly** (canon "tough love", S3: it wants its human well yet never avoids what holds them back, and disagrees with compassion). **"Mentor" is therefore a function the Whisp performs, never a separate entity or surface.** Private reflective/insight views are a second face of the same being, not a replacement for the dialogue. Per ADR-U029 the Whisp is split across **DS-7 Intelligence** (the being-face: dialogue, growth-driven filling, the senses model, maturity) and **DS-1 World Model** (the world-presence / avatar face). A-COI **surfaces** the Whisp; it does not define it — the canonical statement is the beings core (and the pending `whisp.md`), and the Hub's no-AR representation in Ferd/Eid is an open question (CQ-012). Builds only once DS-7/DS-1 enter consumption (post-Ferd).

## Edit 2 — COI capability rows (SPECIFICATION lines ~295-301)
| ID | Current | Proposed | Ext-dep change |
|----|---------|----------|----------------|
| COI-1 | Configure global opt-in / opt-out for AI Mentor | Configure the member's Whisp engagement + consent (the Whisp is universal — this governs voluntary engagement and data/persistence consent, not whether a Whisp exists) | DS-7 (Whisp being-face, ADR-U029), PC-4 |
| COI-2 | Configure per-context invocation preferences (per-journey-step granularity) | Configure per-context Whisp engagement preferences (per-journey-step granularity) | DS-7, PC-4 (unchanged) |
| COI-3 | Render Mentor presence within a journey step | Render the Whisp's dialogic presence within a journey step (when invited by step content and the member engages) | DS-7, DS-3 (step-level Whisp invitation hook) |
| COI-4 | Render standalone Mentor conversation surface | Render the standalone Whisp dialogue surface | DS-7 (unchanged) |
| COI-5 | Reset or delete Mentor memory at member's request | Reset or delete the Whisp's accumulated memory at the member's request (real deletion) | DS-7, PC-4 (unchanged) |
| COI-6 | Render Whisp internal-state surface (private to the member) | Render the member's private Whisp reflective view — the Whisp's growth-driven filling / state, visible only to the member (NOT a "not-conversational" surface; the Whisp is dialogic) | **DS-1 -> DS-7** (the being-face owns filling/senses/maturity per ADR-U029) |
| COI-7 | Render private insight portrait aggregated from member's engagement | Render the member's private insight portrait — a longer reflective narrative aggregated from the Whisp's accumulation | DS-7, PC-4 (unchanged) |

## Edit 3 — External dependencies (SPECIFICATION lines ~366, ~372)
- **DS-7 (line 372):** "AI Mentor lifecycle, perceptual aggregation, insight aggregation" -> **"the Whisp as a being (ADR-U029): dialogue, growth-driven filling, the senses model, maturity/internalisation; perceptual + insight aggregation."**
- **DS-1 (line 366):** "Whisp internal state primitives | A-COI (COI-6)" -> **"the Whisp's world-presence / avatar face (cord, anchoring, severance), ADR-U029 | A-COI only if/when the Hub canvas surfaces world-presence — open, CQ-012."** (COI-6's filling/state view moves to DS-7; whether the Hub canvas shows the avatar at all is open.)

## Edit 4 — Sources-status provenance entry (append to the SS block)
**2026-06-22 Whisp reconciliation (finding F-04; PROCESS §9).** A-COI was authored around a separate "AI Mentor" entity plus a passive "Whisp internal-state surface"; this diverged from canon (beings core S1/S3/S4/S5/S17-18/S39; ADR-U029): the **Whisp** is the FIM's inner dialogue voice — **AI-driven** (DS-7) but represented as the member's own voice — universal and voluntary, which **mentors through warm, caring challenge** ("tough love", S3). There is no separate "Mentor" *entity*; mentoring is a function the one Whisp performs. ("Mentor" as a noun is not ratified canon for the companion; its only canon use is CQ-009's distinct *human* Mentor/Elder role.) Capabilities recast onto the Whisp; COI-6 passive framing corrected; COI-6 dep re-pointed DS-1 -> DS-7. Per rename-pass discipline, surface mechanics left to the pending `whisp.md` + DS-7; Hub no-AR representation open (CQ-012). Authority: beings core + ADR-U029.

---

## Propagation (after Edits 1-4 land on SPECIFICATION)
1. **DESCRIPTION line 80:** "Intelligence (future: AI mentor, profile accumulation)" -> "Intelligence (future: the Whisp's being-face — dialogue + accumulation; ADR-U029)". (Line 77 "Whisp presence" via DS-1 is already canon-correct — leave.)
2. **Re-derive tours** (these are the F-04 part of the tour batch): HUMAN.md Ch. 6 + TECHNICAL.md COI rows and the `Mentor (Conversational) / Whisp (Reflective)` table (which hard-codes the inverted model).
3. **OPEN_QUESTIONS:** add a one-line note that "Mentor (AI companion)" is retired in favour of the Whisp, distinct from CQ-009's human Mentor/Elder role; CQ-012 remains the open thread for the Hub's Whisp representation.
4. **doc-health-check** propagation sweep at close.

## Open judgment calls for Stefan
1. **Depth:** correct vocabulary + framing now, defer surface mechanics to whisp.md/CQ-012 — agreed?
2. **COI-6 dep:** re-point DS-1 -> DS-7 (filling/state is the being-face) — agreed?
3. **DS-1 / avatar on the Hub canvas:** flag as open (CQ-012) rather than assert Hub consumption — agreed?
