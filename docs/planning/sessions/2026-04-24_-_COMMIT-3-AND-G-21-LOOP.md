# Session Bridge — Commit 3 and the G-21 loop

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-24
**Session type:** Vertical-axis work — template restructure, documentation clarification, skill updates, gap register additions
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- `5b27f3d` — docs(sessions): add L2 compliance audit for 2026-04-24
- `381e180` — docs(templates): restructure SPECIFICATION templates for L2/L3/L4 ownership split (Commit 3)
- `daafc1e` — docs(how-we-work): clarify verticals' L2 file shape in chapter 01
- `111fb76` — skills: close the G-21 loop — prevention in ecosystem-decomposition and feature-development, detection in doc-health-check
- `4b6593b` — docs(gaps): log G-23, G-24, G-25 surfaced by 2026-04-24 session

---

## Session summary

The session was primary-scoped to Commit 3 — the template restructure foreshadowed by the 2026-04-22 decomposition skill refactor. It expanded opportunistically to address three adjacent issues that surfaced during the work: verticals' L2 file shape (left undefined in the prior documentation), the G-21 prevention-plus-detection loop (prevention named in prose but not operationalised; detection absent), and three new gaps added to the register.

The arc was: (1) L2 compliance audit confirmed Commit 3 had zero migration scope and surfaced that verticals' L2 shape needed clarification; (2) Commit 3 landed three restructured SPECIFICATION templates with the L2/L3/L4 ownership split now visible, including verticals' Obligation inventory as the L3 analogue to a capability inventory; (3) chapter 01 of the how-we-work set received a short clarifying paragraph making verticals' single-file shape explicit; (4) the G-21 loop was closed across three skills (prevention at write-time in `ecosystem-decomposition` and `feature-development`, detection at cycle boundary in `doc-health-check`'s new Section 8); (5) three new gap entries logged to `gaps.md`. The five commits pushed to `origin/main` in that order.

---

## What was decided

- **L-numbered section headings in SPECIFICATION templates.** Template section boundaries use the convention `L2 — Identity, boundaries, and technical shape` / `L3 — Capability inventory` / `L4 — Feature inventory summary`, matching the how-we-work chapter 01 convention and making ownership visible at the template level.

- **Verticals' L3 content is an Obligation inventory, not a Capability inventory.** Load-bearing structural difference: verticals do not own capabilities; they levy obligations on other entities' capabilities. Position in the document is the same (§L3); content type is different.

- **Verticals use a single-file L2 shape.** Rather than the DESCRIPTION / SPECIFICATION / ROADMAP triple used by products, domain services, studios, and design system, verticals fold L2 content (purpose, scope, tooling, failure modes) and L3 content (obligation inventory) into one `SPECIFICATION.md` file. The three-level authorship split still applies — it lives inside one document rather than being spread across files.

- **YAML frontmatter harmonisation for product-tier templates.** `product-specification.md` and `product-description.md` now both use YAML frontmatter (matching `domain-service-spec.md` and `vertical-spec.md`), replacing the bold-prose header blocks. Single source of machine-queryable metadata per file.

- **Commit 3 scope: three templates, not two.** The prompt named two (`product-specification.md`, `domain-service-spec.md`). Verticals' template was added to scope because the L2/L3/L4 ownership split applies there too — just with Obligation inventory in place of Capability inventory. `product-description.md`'s frontmatter harmonisation was added separately, same commit.

- **Audit-before-restructure sequencing.** The L2 compliance audit ran before Commit 3 to verify migration scope. Zero existing SPECIFICATION.md files anywhere in the repo meant Commit 3 was purely forward-looking — no migration of existing content needed. This sequencing pattern is worth repeating when restructuring templates that may or may not have existing instances.

---

## What was produced

**Template restructure (Commit 3, hash `381e180`).** Four templates touched:
- `product-specification.md` — L2/L3/L4 partitioning; YAML frontmatter; stale architecture reference updated to V4 anatomy / ADR-U023.
- `domain-service-spec.md` — same partitioning; old §7 "Cross-cutting concerns" removed (per-capability vertical impact now in L3's capability table); stale 2026-04-10 session bridge reference replaced with ADR-U023.
- `vertical-spec.md` — L3 named "Obligation inventory"; §5 Tooling and §6 Failure modes repositioned under L2; L4 section sparse-by-default with fallback language for verticals owning no V-prefix features.
- `product-description.md` — frontmatter harmonisation only (no body changes).

**Chapter 01 clarification (hash `daafc1e`).** One paragraph added to `docs/ecosystem/how-we-work/01-decomposition.md` §L2 making verticals' single-file shape explicit, with the Obligation-inventory-vs-Capability-inventory distinction named.

**G-21 prevention + detection loop (hash `111fb76`).** Three skills updated:
- `ecosystem-decomposition/SKILL.md` — L4 "Write scope" and "When L4 runs" bullets tightened to make the same-commit discipline operational. Cross-references to `feature-development` and `doc-health-check` added.
- `feature-development/SKILL.md` — Steps 3 and 5 each gained an explicit substep for updating the parent entity's SPECIFICATION.md §L4 summary row at maturity transitions 4→5 and 5→6.
- `doc-health-check/SKILL.md` — new Section 8 "Feature-inventory summary consistency" with four drift signals, procedure, interaction with Section 7's registry. Supporting edits to When-to-run table, Output format template, Related section.

**Gaps register expansion (hash `4b6593b`).** Three new entries added to `docs/ecosystem/how-we-work/gaps.md`, all Medium priority:
- G-23 — Stale references to superseded authorities across the repo
- G-24 — Missing SPECIFICATION templates for studios / Platform Core tiers / Design System
- G-25 — How-we-work rendered views drift between markdown updates

**Session artifact (hash `5b27f3d`).** `docs/planning/sessions/2026-04-24_-_L2-COMPLIANCE-AUDIT.md` — the L2 state snapshot across all 23 named ecosystem entities. Canonical reference for the current state of L2 artifacts.

---

## Open questions surfaced

- **G-23** — which specific stale references exist repo-wide beyond the single domain-service-spec instance caught in Commit 3. Pending an audit pass.
- **G-24** — the template-coverage question for studios / Platform Core tiers / Design System. Three sub-decisions involved (reuse existing templates, adapt, or author new); deferred until those entity categories actually need specifications written.
- **G-25** — how-we-work rendered views drift. Immediate instance: `_3.docx` needs regeneration after the 2026-04-24 chapter 01 edit. Underlying problem is the absence of a closed-loop mechanism.
- **README file naming inconsistency** — `docs/ecosystem/how-we-work/README.md` names `FringeIsland-how-we-work.docx` as the canonical file, but `_3.docx` is actually current. Captured under G-25 but worth flagging separately since it's a concrete correctness issue, not just a tooling gap.
- **Studios drawn as one box vs. listed as three entities.** Noticed during the V4 anatomy compliance check — the diagram aggregates Studios into a single container while Products are shown as three separate boxes. Probably a visual shorthand, not a structural claim, but worth revisiting if diagram-vs-documentation consistency becomes a concern.

---

## Tensions and non-obvious insights

**Orientation miss at session start.** The session prompt's "Read first" list named four files. I treated that list as a ceiling when it was actually a minimum floor. I did not read `docs/ecosystem/how-we-work/01-decomposition.md` until mid-session when Stefan pointed me at it after I asked whether the L# concept still existed. I did not see `docs/architecture/ECOSYSTEM_ANATOMY_V4.svg` until Stefan uploaded it mid-session. I did not read chapters 02–05 of the how-we-work set at all. Concrete symptoms of the miss: I called the anatomy "three-tier" (inherited from the old product-specification template's stale language) before Stefan corrected the framing; I asked whether L-numbers were still a concept when chapter 01 has an explicit section per level; I reached for "Ferd" as sequencing justification early in the session, contaminating vertical with horizontal, because chapter 02's cadence-and-waves framing wasn't loaded. **Next session: load the full orientation set up front, not just the explicit read-first list.** The token cost of loading more orientation is small compared to the cost of correcting mid-session contamination.

**Horizontal-axis contamination pressure is continuous.** Even with the session's "out of scope" guardrail visible in the prompt, I reached backward to wave-framing (Ferd) once and to existing-artifact framing (the session bridge) twice during the session. Each time Stefan flagged it. The pattern: when a vertical-axis question has an adjacent horizontal-axis answer that's easier to reach, the path of least resistance is to reach. Guard is still correct; it just needs to be active continuously, not set-and-forget.

**Template ownership split is visible but not enforced.** The three restructured templates now name which level owns which section. Nothing in the templates *prevents* an L2 author from writing into the L3 or L4 section, or vice versa. Enforcement is human discipline for now, with `doc-health-check` as the eventual backstop (Section 8 starts that but doesn't yet verify section-boundary integrity). This is acceptable for current solo operation but compounds at contributor-count scale. Candidate for future tightening.

**The audit-before-restructure pattern was valuable and cheap.** Twenty minutes of read-only walking confirmed Commit 3 had no migration scope, which meant it could be authored as pure forward-looking work without hedging for backward compatibility. A useful default when restructuring templates or shared schemas: run the audit first, derive the clean-slate-vs-migration posture, then do the work.

**Verticals' L2 resolution was undocumented before this session.** Chapter 01 listed verticals as L2 entities and the documentation skill said "each active entity has DESCRIPTION.md, SPECIFICATION.md, and ROADMAP.md" — but no source reconciled the two. Verticals' file shape was implicit in what lived on disk. This session made it explicit. Similar implicit-structure questions probably exist elsewhere (studios' authoring-surface shape; Platform Core tiers' spec expectations). Worth scanning for.

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** Directory migration of the five vertical files. Each `docs/verticals/{name}.md` becomes `docs/verticals/{name}/SPECIFICATION.md` restructured into the L2/L3/L4 shape the new `vertical-spec.md` template defines. Plus a `features/` subdirectory for each vertical (created empty or with a README placeholder) since the new structure supports V-prefix features under the vertical's own directory. Locked during this session as the directory work that follows Commit 3.

**Deferred this session (vertical-axis, logged as gaps):**
- G-23 — stale references audit. Not urgent; compounds silently.
- G-24 — missing SPECIFICATION templates for studios / Platform Core tiers / Design System. Deferred until those entities need specifications.
- G-25 — how-we-work rendered views drift. Includes the immediate `_3.docx` regeneration for today's chapter 01 change.

**Deferred this session (earlier-session gaps still unresolved):**
- G-01 Whisp architectural placement, G-02 cross-product feature sync, G-04 wave↔roadmap relationship, G-05 review queue not operationalized (**High**), G-06 multi-agent task locking (**High**), G-07 Ferd DoD empty, G-09 refinement ritual undocumented, G-10 board mechanic unchosen, G-11 TDD overstated vs risk-based, G-12 G/W/T to test translation (**High**), G-13 build hygiene unspecified, G-14 discovery 0→2 flow orphaned, G-15 cross-tier entry order, G-16 skill chaining undocumented, G-17 AGENTS.md precedence, G-18 research pathway under-specified, G-19 wave-planning skill structural review (horizontal-axis), G-20 reconciliation activity home.

**Out of scope per this session's guardrail (horizontal-axis, not reconsidered):**
- Wave scoping, wave progress, wave DoD
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

---

*Next session's primary next work is the directory migration described above. The prompt for that session is provided separately rather than embedded in this bridge, following the principle that bridges are append-only historical records and prompts are operational artifacts that drift.*
