# Session Bridge — Verticals migration and forward plan

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md`
**Date:** 2026-04-26
**Session type:** Vertical-axis work — completion of next-in-sequence verticals migration; mid-session pivot into forward planning
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- `11a0066` — docs(verticals): migrate administration to L2/L3/L4 SPECIFICATION shape
- `13dee32` — docs(verticals): migrate privacy to L2/L3/L4 SPECIFICATION shape
- `ff40d1d` — docs(verticals): migrate notifications to L2/L3/L4 SPECIFICATION shape
- `e6b8864` — docs(verticals): migrate observability to L2/L3/L4 SPECIFICATION shape
- `af20487` — docs(verticals): migrate transactions to L2/L3/L4 SPECIFICATION shape
- `321765f` — docs(verticals): update README.md to reflect new directory structure
- `d058104` — docs(verticals): update CLAUDE.md to reflect new SPECIFICATION shape
- `baa010c` — docs(sessions): remove stale NEXT_SESSION_PROMPT.md
- `5bf755d` — docs(sessions): add 2026-04-26 verticals migration and forward plan bridge

---

## Session summary

The session opened on the next-in-sequence work named in the 2026-04-24 bridge: directory migration of the five vertical files. Each `docs/verticals/{name}.md` was moved into `docs/verticals/{name}/SPECIFICATION.md` restructured to the L2/L3/L4 partition introduced by the 2026-04-22 decomposition skill refactor and the 2026-04-24 Commit 3 template restructure. The migration ran cleanly across five separate commits — Administration, Privacy, Notifications, Observability, Transactions — with each commit reviewable independently.

Two follow-up commits closed adjacent drift surfaced by the migration: `docs/verticals/README.md` updated to point at the new `{vertical}/SPECIFICATION.md` paths and reflect the V4 anatomy framing of layers (Surfaces = Products + Studios + Design System), and `docs/verticals/CLAUDE.md` rewritten to match the L2/L3/L4 partition (with an L4 Feature inventory summary subsection added — previously absent). One housekeeping commit removed `docs/planning/sessions/NEXT_SESSION_PROMPT.md`, a stale operational artifact from the prior session that violated the "bridges are permanent, prompts are ephemeral" principle named in the sessions directory README.

The session then pivoted into a forward-planning conversation triggered by Stefan's question *"is there no more things to do in our whole refactoring of our documentation except gaps and deferred questions?"* The honest reading of the gaps register surfaced the load-bearing finding documented in §5 below: the documentation system is structurally largely complete, but ten consecutive sessions of structural work have produced no use of that system to specify the ecosystem. The original B1 (Vision→Task vertical trace) and B2 (continuous quality) goals locked April 17 are still aspirational. The three High-priority gaps that gate "execution actually working" — G-05, G-06, G-12 — have sat unresolved across all ten sessions while structural work has continued to generate new structural gaps (most recently G-23, G-24, G-25 from the April 24 session, with no closures balancing the additions).

The session closed by locking sequencing for forward work: G-24 first (Block A — author SPECIFICATION templates for studios, Platform Core tiers, Design System, decision-first per the locked option-c approach), then a vertical Vision→Task proof of one entity end-to-end (Block B — first real test of the system as built). High-priority gaps G-03, G-05, G-06, G-12 remain pending and are expected to surface as friction during Block B's execution.

---

## What was decided

- **Verticals migration shape locked.** Faithful migration discipline — content preserved verbatim, structure changes only. Standalone orientation blockquotes folded into §1 Purpose as leading sentences (option 1b). `last_updated` set to today's date (option 2). Five separate commits, one per vertical (commit granularity), with `git rm` + `git add` rather than `git mv` (option a, accepting the loss of git rename detection on these specific files).

- **Progressive-disclosure README convention codified.** Each `docs/verticals/{name}/features/README.md` follows the existing convention from `docs/products/{hub,gimbal,game}/features/README.md`: title in `# Features — {Entity name}` form, one-paragraph orientation, **Feature ID prefix** + **Template** metadata lines, optional one-liner about development status, "Feature index" with placeholder text. The convention is now applied across products and verticals — worth applying to studios when their SPECIFICATION work happens.

- **`docs/verticals/README.md` simplified and corrected.** Layer description corrected from "Platform Core, Domain Services, Products, Studios" to "Platform Core, Domain Services, Surfaces (Products + Studios + Design System)" per the V4 anatomy / ADR-U023. Stale "Vertical spec files are not yet populated" footer replaced with a paragraph describing the per-vertical directory shape and the L2/L3/L4 authorship split.

- **`docs/verticals/CLAUDE.md` updated to the new template shape.** Eight edits: header `Applies to` and `Load order` lines updated to name directories and `SPECIFICATION.md` paths; "What makes this tier different" §3 file list updated; "What each vertical spec must specify" rewritten as L2/L3/L4 subsections in the new section ordering; **L4 Feature inventory summary subsection added** (previously absent — the section exists in every vertical spec now and warrants explicit orientation); three rule/gotcha bullets updated for new section numbers (§7 for Cross-cutting checklists, §5 for Open questions, §6 for Obligations on each tier); five-spec link list updated to directory paths. Existing prose-quality discipline preserved verbatim ("not platitudes", "specifically enough to be enforceable", "machine-checkable").

- **`docs/planning/sessions/NEXT_SESSION_PROMPT.md` removed.** Per the sessions README's principle that bridges are permanent and prompts are ephemeral, the file was a stale artifact from the prompt that opened the 2026-04-24 session. The newest dated bridge is the handoff; a separate `NEXT_SESSION_PROMPT.md` violates the principle and creates drift surface. **Going forward: no `NEXT_SESSION_PROMPT.md` is committed at all.** If the next session needs a prompt, author it fresh at session start or paste it into the chat directly.

- **G-24 sequencing locked: option (c) decision-first, not authoring-first.** The three sub-decisions (template shape for studios / Platform Core tiers / Design System) are settled in a session focused on those three shape questions before any template authoring happens. Recommended order: Studio (most tractable, most prior context) → Design System (independent novel L4 question) → Platform Core tier (structural unit-of-decomposition question still unresolved).

- **Block A first, Block B second.** Forward work sequencing locked: complete G-24 (the missing SPECIFICATION templates) before starting the vertical Vision→Task proof. Reasoning: Block B may need a studio or Platform Core spec mid-walk, and inventing one ad-hoc would re-introduce the structural-debt problem G-24 names. Block A is also the smaller commitment (1–2 sessions for decisions, 1 session per template at most).

---

## What was produced

**Verticals migration (five commits).** Five new `docs/verticals/{name}/SPECIFICATION.md` files restructured into the L2/L3/L4 partition; five new `docs/verticals/{name}/features/README.md` progressive-disclosure stubs; five corresponding old flat-file deletions. All migrations preserve existing prose verbatim. Section reorder per the new template:

| Old section | New location |
|---|---|
| §1 Purpose | L2 §1 Purpose (orientation blockquote folded in as leading sentences) |
| §2 Scope | L2 §2 Scope |
| §5 Tooling and infrastructure | L2 §3 Tooling and infrastructure |
| §6 Failure modes | L2 §4 Failure modes |
| §7 Open questions | L2 §5 Open questions |
| §3 Obligations on each tier | L3 §6 Obligations on each tier |
| §4 Cross-cutting checklists | L3 §7 Cross-cutting checklists |
| *(new)* | L3 Sources-status block (empty) |
| *(new)* | L4 Feature inventory summary (sparse fallback) |

**Tier-level updates (two commits).** `docs/verticals/README.md` rewritten to reflect the new directory structure and corrected layer description. `docs/verticals/CLAUDE.md` rewritten to match the L2/L3/L4 template shape, with the new L4 subsection explicitly documented.

**Housekeeping (one commit).** `docs/planning/sessions/NEXT_SESSION_PROMPT.md` deleted as a stale operational artifact.

**Session artifact.** This bridge.

---

## Drift check finding — load-bearing for future sessions

This section exists because the forward-planning conversation surfaced a finding that should not be hidden inside "tensions and insights." It is the central honest reading of where the refactor stands.

**The documentation system is structurally largely complete; the documentation of the ecosystem is largely not started.**

**What's structurally finished (the system as built):**
- Decomposition cascade locked: L1 Vision → L2 Entities → L3 Capabilities → L4 Features → L5 Tasks
- Five how-we-work chapters written and rendered
- PROCESS.md, four execution skills (`ecosystem-decomposition`, `feature-development`, `wave-planning`, `doc-health-check`), root and tier `CLAUDE.md` files
- SPECIFICATION templates restructured to L2/L3/L4 for products, domain services, and verticals (via Commit 3 on 2026-04-24)
- Five vertical files migrated to the new template shape (this session)
- Gaps register actively maintained (G-01 through G-25, with priority and proposed fixes)

**What's not yet started or only partially done:**
- **Zero entity instances of SPECIFICATION.md exist** anywhere in the repo. Only the Hub has a DESCRIPTION.md (written 2026-04-10). Three studios have only `README.md` + `features/`; design system has only `CLAUDE.md` + `README.md`; Platform Core's four tiers and Domain Services' seven services don't exist as filesystem entities at all.
- **The five vertical specs we just migrated are still scaffolds** content-wise. §3 Tooling, §4 Failure modes, and parts of §6 Obligations are marked "to be filled in." This is G-03 (the highest-priority gap in the register).
- **Three High-priority gaps remain unresolved across ten consecutive sessions:** G-05 (review queue not operationalized), G-06 (multi-agent task locking), G-12 (Given/When/Then to test translation). These gate "execution actually working."
- **G-24 (missing SPECIFICATION templates for studios / Platform Core tiers / Design System)** was added 2026-04-24 and remains. Three categories of L2 entities have no template; any spec authored for them today would either force-fit an existing template or invent a new shape ad-hoc.
- **The B1 goal (vertical Vision→Task trace) and B2 goal (continuous quality)** locked 2026-04-17 are still aspirational. No worked example exists end-to-end for any entity.

**The pattern:** ten consecutive sessions have generated more structural gaps than they have closed. Each refactor session improves the system's blueprint while the building remains unbuilt. This is not drift in the sense of "wandering off task" — every session has been on-task for the locked decomposition refactor — but it is a kind of meta-drift in which structural completeness keeps deferring to itself.

**Why this belongs in the bridge:** the next session opens with this truth as context, not the optimistic "we're nearly done" framing. The next session's first move (Block A — G-24 templates) is itself more structural work, but it is the *last* purely structural block before Block B forces the system to meet a real instance.

---

## The forward agenda

Three blocks. The order is locked: A → B → maintenance pass on remaining High-priority gaps as they surface.

### Block A — G-24: SPECIFICATION templates for the three uncovered entity categories

**Goal:** complete the template-coverage work so every L2 entity category has a sanctioned SPECIFICATION shape that respects the L2/L3/L4 ownership split. Three sub-decisions, each with its own shape question.

#### A.1 Studio SPECIFICATION template

**Prior context already pulled:**
- Three studios named (Journey Studio, Universe Studio, Arc Studio); locked April 7, renamed from "Designer" April 11. "Studio" deliberately captures full Dreamineer lifecycle (design, deploy, pause, update, announce, retire), not just authoring.
- Arc Studio is Urd-scope; Journey Studio and Universe Studio start from Eid.
- Universe Studio has substantial conceptual depth (Stålenhag-inspired multimedia worldbuilding — 2D/3D sketches, models, documents, background stories) that affects what a Universe Studio spec needs to hold.
- A `studio-description.md` template already exists in `docs/templates/`.
- The `docs/studios/CLAUDE.md` already names studio-specific concerns (creator personas, content handover, draft/published transitions, cross-studio content references) that products don't have.
- Per the L2 compliance audit (2026-04-24), all three studio directories exist but contain only `README.md` + `features/` — no DESCRIPTION/SPECIFICATION/ROADMAP files.

**Shape question:** Is the studio SPECIFICATION a near-clone of `product-specification.md`, an adaptation, or a genuinely new template?

**My current read** (provisional, to be tested in the decision session): genuinely new. Studios have content-handover, draft-vs-published, creator-vs-consumer, and full-lifecycle concerns that products don't. Force-fitting `product-specification.md` would either inherit irrelevant sections or quietly omit important ones. The L2/L3/L4 partition itself probably adapts cleanly with appropriate renaming.

#### A.2 Design System SPECIFICATION template

**Prior context already pulled:**
- Design system "currently not yet specified — scoped but not active. When work begins (expected Eid-wave onward), the tier's identity will crystallise."
- Five vertical-impact obligations on the design system are spelled out in `docs/design-system/CLAUDE.md` (Administration variants, Privacy at component level via `<FimName />`, Notifications visual language, Observability instrumentation, Transactions UI primitives).
- Per the L2 compliance audit, `docs/design-system/` has only `CLAUDE.md` + `README.md` — no entity files, no `features/` subdirectory.
- Content profile is genuinely different from products/services: tokens, components, patterns. Not a capability inventory in the usual sense.

**Shape question:** What does an L4 partition mean for a design system? A design system's L4 isn't "feature inventory" the way a product's is — it's component inventory + token inventory + pattern inventory. Either L4 stretches to accommodate this, or design system uses a different L4 contract.

**My current read** (provisional): the most genuinely novel of the three. The L2/L3/L4 partition needs adaptation since the content type is tokens/components/patterns, not capabilities. The vertical obligations are particularly heavy here.

#### A.3 Platform Core tier SPECIFICATION template

**Prior context already pulled:**
- Two-tier platform structure locked April 9: Platform Core (PC) + Platform Domain (PD), with Internal API between them and Platform API between platform and consumers (ADR-U023, April 12).
- Platform Core has four areas: PC-1 Infrastructure, PC-2 Identity, PC-3 Organisation, PC-4 Governance.
- Per the L2 compliance audit, the four PC tiers don't currently exist as filesystem entities — `docs/platform/core/` is just one directory, not subdivided. Same for Domain Services (no per-service subdirectories yet).

**Shape questions** (two — this is why this category is hardest):
1. What does a Platform Core *tier* spec look like? A PC tier is a *category of capabilities* (e.g., "Identity is auth + profile + sessions + Journal"). It's more like a *cluster* than a single service. The `domain-service-spec.md` template assumes a single coherent service with a capability inventory.
2. **Is a Platform Core tier even the right unit of decomposition for a SPECIFICATION?** The historical L0–L7 anatomy treated each layer as one "thing." The current decomposition treats PC-1 through PC-4 as four. But each contains many capabilities. Maybe the natural unit is the *capability* (Auth, Profile, Sessions) rather than the *tier* (Identity).

**My current read** (provisional): this question deserves its own session. Authoring a template before the unit-of-decomposition question is settled would lock in an answer prematurely. By the time this is reached we'll have two adapted templates as references (studio, design system), which informs the third.

#### Recommended Block A sequencing

Studio → Design System → Platform Core tier. Each can be decided and authored as a separate session if needed, but the *decisions* should ideally be made first as a group, with template authoring following.

**Estimated session cost for Block A:** 2–3 sessions for the three shape decisions (potentially fewer if Studio is a clean adaptation), plus 1 session per genuinely-new template authored (likely 2–3). Total: 4–6 sessions.

### Block B — Vertical Vision→Task proof

**Goal:** walk one entity from L1 Vision down the decomposition cascade as the first real test of every piece of the system. This is the original B1 goal locked April 17, deferred across ten sessions.

**Scope:** pick one entity. Walk it down the cascade. Naming what each step produces: entity DESCRIPTION.md (if not already present) → entity SPECIFICATION.md with L2 §L2 + L3 capability inventory → at least one feature spec at maturity 3-specified → optionally a task. *Without wave language* — purely vertical.

**Stops at maturity 3** unless the session that takes it on decides to go further. The validation property of Block B is in *traversing the cascade*, not in shipping a feature.

**Open question (to be decided in the session that takes Block B):** which entity? Three plausible candidates:

- **Hub** — already has a DESCRIPTION.md (written 2026-04-10). Validates the cascade for an active product. Memory-locked Ferd focus is the Hub. Most "in motion" of any entity.
- **One of the just-migrated verticals** (e.g., Privacy) — now has a SPECIFICATION but the L3 obligation inventory needs filling beyond stub state. Validates the cascade for a vertical, which has the most-stub L3 of any entity category. Closes G-03 partially as a side effect.
- **Something else** — a domain service, a studio (after Block A), Platform Core (after Block A).

Leaving this open intentionally. The choice has different validation properties and the session that does the work should make the call.

**Expected friction during Block B:** the High-priority gaps that have been deferred for ten sessions will surface as concrete blockers, not theoretical concerns. G-03 will bite when filling the Vertical Impact section against still-stub vertical specs. G-12 will bite when translating Given/When/Then to tests. G-05 may bite if the walk reaches maturity 5+. **These frictions are informative, not blocking.** Each one becomes a "this specific gap blocked me here, here's what would unblock it" data point. Block B is the experiment that converts theoretical gaps into actionable cycle work.

**Estimated session cost for Block B:** 3–5 sessions to walk one entity from L2 to maturity 3-specified for one feature, *because* of the deferred-gap friction. Each gap hit teaches; few will be cheap to walk past.

### Block C — High-priority gap resolution

After Block A and partway through Block B, the remaining High-priority gaps need to be picked up:
- **G-03** — Vertical specs are scaffolds. Partly closed by Block B if it picks a vertical; otherwise still pending.
- **G-05** — Review queue not operationalized.
- **G-06** — Multi-agent task locking.
- **G-12** — Given/When/Then to test translation.

These are not pre-scoped here. Block B will inform the priority order: whichever gap bites hardest during the vertical proof gets picked up first.

---

## Open questions surfaced

- **The drift check finding itself.** Documented in §5. The pattern of "structural sessions generating more structural gaps than they close" is the largest open question — not what to do next session (Block A) but whether the meta-pattern continues *after* Block B.
- **Block B entity choice (Hub vs migrated vertical vs something else).** Different validation properties; deferred to the session that does Block B.
- **The two Platform Core sub-questions** in §A.3 — particularly whether a tier is the right unit of decomposition. Deferred to the Block A session that addresses Platform Core specifically.
- **G-25 — `_3.docx` regeneration.** Still pending from 2026-04-24; not addressed this session. The gap is open and the README naming inconsistency is a concrete correctness issue.
- **Studios drawn as one box vs. three entities** in `ECOSYSTEM_ANATOMY_V4.svg`. Flagged in 2026-04-24 bridge; still open. May matter when authoring the studio SPECIFICATION template if the diagram and documentation should be consistent.
- **G-22** — legacy pre-refactor FEAT-*.md absorb-and-delete discipline. Named only in skill prose; no enforcement mechanism. Compounds silently.

---

## Tensions and non-obvious insights

**Vertical-axis contamination from horizontal-axis vocabulary remains active.** Mid-session, when walking through Route B options, I drifted into "Ferd-scoped capability map" as natural-sounding sequencing despite the 2026-04-24 bridge explicitly listing this as out of scope and warning that the contamination pattern is continuous. Stefan caught it. The corrected framing is purely vertical: walk one entity down the decomposition cascade, no wave language. **This contamination is now four sessions old as a documented pattern (2026-04-22, 2026-04-24, twice today).** Worth keeping the active-not-set-and-forget guard alive in every vertical-axis session. The horizontal-axis vocabulary is so deeply embedded in prior context that reaching for it remains the path of least resistance.

**"Faithful migration" worked as a discipline.** Preserving prose verbatim while restructuring is sustainable; rewrites-during-migration are not. The discipline made review trivial (the diff is purely structural) and de-risked the work (no semantic regressions possible). Worth naming as a reusable pattern for future restructures: separate semantic edits from structural moves; commit them independently.

**The progressive-disclosure README pattern is now codified across two tiers.** Products had it (Hub/Gimbal/Game). Verticals now have it. Studios and Design System should adopt it when their SPECIFICATION work happens. Convention: title in `# Features — {Entity name}` form, one-paragraph orientation, **Feature ID prefix** + **Template** metadata lines, optional development-status one-liner, "Feature index" with placeholder text. Sub-agents loading just the README pick up just enough to know where they are without context bloat.

**Stopping at a clean migration boundary, rather than pushing into G-24 authoring, is the right call.** Today's seven structural commits (then two follow-ups) cleared the next-in-sequence work named in the prior bridge. New work — G-24 and Block B — deserves a fresh session with a clean prompt that doesn't carry the migration context. The session-bridge handoff is the canonical interface; over-running into the next block in the same session is itself a form of drift.

**Removing `NEXT_SESSION_PROMPT.md` as a one-line cleanup turned out to surface a principle worth naming durably.** The sessions README already says "the newest dated bridge is the handoff," but the existence of the now-deleted file showed that nobody had been enforcing the principle. **Going forward, no `NEXT_SESSION_PROMPT.md` is committed at all.** If the next session needs a prompt, author it fresh at session start or paste it into the chat directly. This is the new convention. Worth surfacing if it recurs — perhaps adding an explicit "no prompt files committed" line to the sessions README in a future session.

**The drift-check question Stefan asked mid-session was the most valuable single move of the session.** Without it, today would have been "seven commits, clean close, on to the next migration." The question forced an honest read of the gaps register and exposed the meta-pattern that no individual session was equipped to see. Worth normalizing as a periodic ritual: at every session boundary, ask not just "what did we do?" but "what hasn't moved?"

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** Block A.1 — settle the Studio SPECIFICATION template shape question. Decision-first session per the locked option (c). Read first: this bridge, the gaps register, `docs/studios/CLAUDE.md`, the existing `docs/templates/studio-description.md`, the prior-session conceptual material on Universe Studio (Stålenhag-inspired worldbuilding), and `ECOSYSTEM_ANATOMY_V4.svg`.

**Deferred this session (vertical-axis):**
- G-23 — stale references audit. Not urgent; compounds silently.
- G-24 — first session of Block A.
- G-25 — `_3.docx` regeneration plus the closed-loop tooling gap.
- G-21 prevention loop (closed 2026-04-24); detection is operational; no further work needed unless drift surfaces.
- G-22 — legacy absorb-and-delete discipline; no enforcement yet.

**Deferred from earlier sessions (carried forward):**
- G-01 Whisp architectural placement
- G-02 cross-product feature sync
- G-03 vertical specs are scaffolds — **High** (will partially close if Block B picks a vertical)
- G-04 wave↔roadmap relationship
- G-05 review queue not operationalized — **High**
- G-06 multi-agent task locking — **High**
- G-07 Ferd DoD empty
- G-09 refinement ritual undocumented
- G-10 board mechanic unchosen
- G-11 TDD overstated vs risk-based
- G-12 G/W/T to test translation — **High**
- G-13 build hygiene unspecified
- G-14 discovery 0→2 flow orphaned
- G-15 cross-tier entry order
- G-16 skill chaining undocumented
- G-17 AGENTS.md precedence
- G-18 research pathway under-specified
- G-19 wave-planning skill structural review (horizontal-axis)
- G-20 reconciliation activity home

**Out of scope per the same horizontal-axis guardrail used since 2026-04-22:**
- Wave scoping, wave progress, wave DoD
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

---

## Next session — orientation seed (not a prompt)

Per the principle locked this session: bridges are permanent, prompts are ephemeral. A `NEXT_SESSION_PROMPT.md` is not committed. The next session's prompt should be authored fresh at session start.

**Orientation seed for whoever opens the next session:**

The next session is Block A.1 — settle the Studio SPECIFICATION template shape question. Decision-first per the locked option (c). One question to answer: is the studio SPECIFICATION a near-clone of `product-specification.md`, an adaptation, or a genuinely new template? Read this bridge §"Forward agenda — Block A.1" first; then read `docs/studios/CLAUDE.md`, `docs/templates/studio-description.md`, and `docs/templates/product-specification.md` for comparison; then surface the prior-session Universe Studio conceptual material via `conversation_search` if not already in context. Do NOT author any template in this session. Decision only. Authoring follows in a separate session if a new template is the answer.

If the session ends with the decision settled, the next bridge documents that decision and points at the authoring session as next-in-sequence. If the decision exposes deeper questions, the bridge documents the questions and points at whatever resolves them next.

---

*Last updated 2026-04-26 at session close.*
