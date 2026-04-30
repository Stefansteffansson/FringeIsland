# Session Bridge — Block B.2 Hub L3 closure

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md` (date + 2-digit sequence within the day)
**Date:** 2026-04-30 (second bridge of the day; first was the methodology-design pivot at `2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md`)
**Session type:** Vertical-axis work — Block B.2 closure. **§L3 of `docs/products/hub/SPECIFICATION.md` is now authored.** This bridge captures B.2 closure status, methodology deliverables produced beyond the bridge's anticipations, cross-entity findings routed to G-29, MCP-stability findings, and next-session orientation.
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to local main; not yet pushed to origin):**
- `4fd1c74` — `docs(planning): land two drifted session bridges` (drift fix; landed two upstream session bridges that had been authored but not committed: `2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md` and `2026-04-28_01_-_BLOCK-B2-HUB-L3.md`)
- `19103bd` — `docs(gaps): register G-29 — lateral routing for cross-entity findings`
- `6d57b8d` — `docs(hub): author §L3 capability inventory (105 capabilities, eight areas)`

**Predecessor bridges (this session consumed):**
- `2026-04-28_01_-_BLOCK-B2-HUB-L3.md` — the B.2 resumption bridge that locked the three shape decisions, eight internal areas, two-column template deviation, granularity micro-decisions, and authoring plan. Authoritative for B.2 throughout.
- `2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md` — the methodology-design pivot bridge that named the code-informed stress-test pattern, locked the autonomy split, and refined the B.2 resumption rhythm. Authoritative for methodology throughout.
- `2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md` — the inspirational input. **Not consumed during step 1 (cold derivation) per discipline.** §7 master appendix remained closed throughout the session because Stefan supplied a more direct comparison instrument (`docs/TMP/capabilities.md`) for step 2. This is a methodology refinement worth flagging — see §"Methodology refinements" below.

---

## What B.2 produced

### Primary deliverable: §L3 of `docs/products/hub/SPECIFICATION.md`

105 capabilities across eight internal areas. Forward-commitment classification empirically grounded:

| Area | Capabilities | Current-commitment | Partial-forward within Ferd | Full-forward beyond Ferd |
|---|---|---|---|---|
| A-IDN | 12 | 3 | 9 | 0 |
| A-GRP | 19 | 18 | 1 | 0 |
| A-JRN | 18 | 14 | 4 | 0 |
| A-COM | 15 | 11 | 4 | 0 |
| A-NTF | 10 | 8 | 2 | 0 |
| A-COI | 7 | 0 | 0 | 7 |
| A-DIS | 7 | 0 | 4 | 3 |
| A-ADM | 17 | 9 | 8 | 0 |
| **Total** | **105** | **63** | **32** | **10** |

Section structure follows the template: capability table (with the two-column deviation for Founding-question and Dimension applied), dependency-chain prose, external-dependencies table, sources-status block. The sources-status block records: authoring methodology, methodology observations A–G elevated to closing-bridge deliverables, conventions used (PC-1 naming rule, wildcard area-dependency convention, forward-commitment annotation, two-column template deviation), open questions resolved during authoring, cross-entity findings routed to G-29, cross-entity findings routed to other entities, outstanding caveats.

### Secondary deliverables

- **G-29 registered** in `docs/ecosystem/how-we-work/gaps.md` — lateral routing for cross-entity findings produced by L3 stress-test passes. Dual-lineage: first registered in concept as G-NN in the B.2 bridge; sharpened in the 2026-04-30 stress-test pattern bridge as the routing mechanism for the structured output of a named methodology step. Connection-to-G-31 (when registered) documented in the entry.
- **Two drifted bridges committed** — the inspirational input file and the B.2 resumption bridge had been authored but not committed at their respective sessions. Surfaced during git_status check at session opening; landed as a separate commit per drift-fix-discipline (separate commit from authoring).

---

## Methodology deliverables (load-bearing for future sessions)

Seven observations elevated. Listed here in descending order of impact on future L3 sessions.

### Observation A: Cold derivation cannot determine which L2-committed capabilities are implemented vs planned

**This is the deepest finding from the session and goes beyond what the 2026-04-30 stress-test pattern bridge anticipated.** The stress-test pass against `capabilities.md` reclassified ~30 rows from current-commitment (cold-derivation default) to partial-forward-commitment-within-Ferd. Cold derivation systematically under-estimates how much L2-committed surface is unimplemented because it cannot see implementation status — only architectural commitment.

The implication: **the stress-test pass's empirical-comparison step is structurally necessary for honest forward-commitment classification, not optional efficiency.** A capability inventory authored without the stress-test would carry a uniformly current-commitment classification that would mislead wave-planning and L4-derivation timing.

**Status:** Recorded in §L3 sources-status as Observation A. Carries forward as a methodology refinement to the stress-test pattern bridge. When G-31 is registered (the stress-test pattern's promotion-to-skill gap from the 2026-04-30 bridge), this observation should be incorporated into the skill text — the pattern's value is structural, not just efficient.

### Observation B: The eight-area decomposition is empirically validated

Eight areas hold under stress-test pressure. ~100 rows hold. The four true misses surfaced by the stress-test (GRP-9 group deletion, IDN-11 per-device sessions, IDN-12 self-service reactivation, ADM-17 role-template management) integrated cleanly into existing areas without forcing structural revision. The decomposition's structural soundness is now a stress-test-validated property, not a design assumption.

**Status:** Recorded in §L3 sources-status as Observation B. Future entity-L3 derivations (Gimbal L3, Studios L3, Domain Services L3) can adopt similar area-decomposition shapes with confidence that the pattern holds against empirical comparison.

### Observation C: Founding-question column has structural diagnostic value

Each area has a distinct founding-question signature; the signature space is two-dimensional (which questions × flavour of service). Seven areas are member-facing and serve at least one founding question; A-ADM is a meta-area and serves none directly.

The signature map for the Hub:

| Area | Primary | Secondary | Signature flavour |
|---|---|---|---|
| A-IDN | *Who am I?* | — | Identity-flavoured |
| A-GRP | *What do I want?* | *Who am I?*, *How do I get there?* | Identity-aligned-belonging |
| A-JRN | *How do I get there?* | *Who am I?*, *What do I want?* | Directional |
| A-COM | *What do I want?* only | — | Participation-flavoured destination |
| A-NTF | *What do I want?* only | — | Awareness-flavoured destination |
| A-COI | *Who am I?* | *What do I want?*, *How do I get there?* (partial) | Solo-private companion |
| A-DIS | *What do I want?* | *Who am I?* (DIS-6 only), *How do I get there?* | Navigable-options |
| A-ADM | None directly | — | Meta-area (operates platform, doesn't serve member founding-question work directly) |

**Status:** Recorded in §L3 sources-status as Observation C. The two-column template deviation (adding Founding-question and Dimension columns) is flagged as a candidate for template-wide elevation when the next entity-L3 derivation runs (cascade-plan Session 3 territory). Worth adopting in `docs/templates/product-specification.md`, `docs/templates/studio-specification.md`, `docs/templates/domain-service-spec.md`, and `docs/templates/platform-core-component-spec.md` as a permanent column rather than a per-session deviation.

### Observation D: Forward-commitment classification is three-way, not binary

Current-commitment / partial forward-commitment within Ferd / full forward-commitment beyond Ferd. The three-way classification has implications for wave-planning (which rows count as Ferd scope) and L4 derivation timing (forward-commitment rows can't be feature-spec'd until upstream activates).

**Status:** Recorded in §L3 sources-status as Observation D. Forward-commitment annotation convention (`*` partial-forward; `**` full-forward; unannotated current) applied inline to all 105 rows. Future entity-L3 derivations should adopt the three-way classification.

### Observation E: Configuration surfaces live where the consequence lives

L3 placement principle that resolved OQ-14 (DIS-6 stays in A-DIS regardless of OQ-1 outcome). When deciding which area owns a configuration capability, place it where the member encounters the trade-off, not where the underlying state persists. Reusable for future area-placement decisions.

**Status:** Recorded in §L3 sources-status as Observation E. Worth adding to `ecosystem-decomposition` skill as a named principle when G-31 resolves.

### Observation F: Backward-edits to closed areas pause for review

Area-level "one Lₙ per session" discipline. Surfaced when a JRN-1 → DIS-1 inline edit was caught; the JRN-1 / DIS-1 distinction was preserved (they're legitimately distinct shapes — member-action vs. surface-rendering) and the discipline strengthened. Without this discipline, future autonomous sessions might execute backward-edits that violate the cascade-plan's "one Lₙ per session" lock at the area level.

**Status:** Recorded in §L3 sources-status as Observation F. Worth adding to `ecosystem-decomposition` skill as a named discipline.

### Observation G: Cold derivation can produce cross-entity findings ad-hoc

The 2026-04-30 stress-test bridge framed the stress-test pass as the *primary structured generator* of cross-entity findings. Cold derivation produced four findings (MEM-10 / OQ-6, ADM-13 / OQ-15, IDN-11 / OQ-17, DIS-1 / OQ-13) before the stress-test pass opened.

**Refinement to the stress-test bridge's claim:** stress-test is the *primary structured* generator with three named output classes and a routing mechanism; cold derivation produces the same class of finding ad-hoc when L1 + L2 surface unmet architectural claims. Cold derivation can also produce false-positive cross-entity findings that dissolve under granularity correction (one instance: OQ-8, JRN-15 DS-2 dep, dissolved by JRN-15 split).

**Status:** Recorded in §L3 sources-status as Observation G. The G-29 routing mechanism, when designed, should accommodate findings from both sources (cold derivation and stress-test) — not just the latter as the 2026-04-30 bridge originally framed.

---

## Cross-entity findings routed to G-29

Four findings on the lateral-drift surface. All Hub-asserted dependency claims that need reciprocation from the targeted entity's L3 when that entity descends.

| Finding | Hub side | Targeted entity | Status |
|---|---|---|---|
| **OQ-6:** PC-3 transitive group-of-groups resolution beyond depth 1 | MEM-10 | PC-3 Organisation | Schema supports nesting (capabilities.md §2 confirms); resolution machinery is depth-1-only per §L2 §8 and user-memory. PC-3 needs to commit to (or defer) transitive resolution shape. |
| **OQ-13:** DS-3 catalogue-listing shape with Ferd-acceptable filters and ranking metadata | DIS-1, DIS-2 | DS-3 Experience Engine | Basic catalogue browse confirmed (capabilities.md §7); specific shape needs DS-3-side reciprocation. |
| **OQ-15:** PC-3 auto-grant verification surface publication | ADM-13 | PC-3 Organisation | Trigger mechanism exists (capabilities.md §3 confirms); whether PC-3 publishes a Hub-renderable surface for verification is unreciprocated. |
| **OQ-17:** PC-2 per-device session inventory and remote-sign-out RPC | IDN-11 | PC-2 Identity | Capability gap flagged in capabilities.md §1 as member-facing miss; whether PC-2 supports the underlying API is unknown. |

When G-29's resolution session designs the routing mechanism, these four findings are the test cases. The mechanism should support (a) generating findings from both cold derivation and stress-test, (b) routing them to the targeted entity's pickup list before that entity's L3 runs, (c) verifying reciprocation when the targeted entity's L3 descends.

---

## Cross-entity findings routed to other entities (architectural rules, content authority)

Recorded in §L3 sources-status; not G-29 routing because they're not Hub-asserted unmet claims but architectural rules / content-authority concerns whose homes are clear:

- D15 architectural rule (no `user_id` columns in domain tables) — PC-3 + DS-* architectural authority.
- 42 seeded permissions catalogue — PC-3 authority.
- `has_permission()` machinery — PC-3 authority.
- RLS-first security pattern — PC-3 + V4 cross-cutting.
- Step-type catalogue — DS-3 authority.
- Notification type catalogue — DS-5 + V3 authority.
- Bootstrapped journey content — Journey Studio + DS-3 / DS-4 content authority.

---

## Open questions: all closed or routed

Seventeen OQs surfaced during cold derivation and adjudication; all closed by session end:

| OQ | Status |
|---|---|
| OQ-1 (A-PRV vs A-IDN) | Held; no split. Empirical evidence aligns with experiential argument. |
| OQ-2 (Journey Zero placement) | Closed in cold derivation: A-JRN. |
| OQ-3 (IDN-2 carry-over phrase) | Closed in cold derivation: carry-over machinery owned by JRN-5. |
| OQ-4 (GRP-6 role-template merge) | L4-deferred. |
| OQ-5 (MEM-7 leadership-transfer split) | L4-deferred. |
| OQ-6 (group-of-groups transitive resolution) | Routed to G-29. |
| OQ-7 (GRP-3 visibility merge) | Closed; merge stands per capabilities.md §4. |
| OQ-8 (JRN-15 DS-2 dep) | Closed as derivation false-positive; dissolved by JRN-15 split. |
| OQ-9 (COM-6 post + reply split) | Closed via split; capabilities.md §8 evidence. |
| OQ-10 (COM-12 edit/delete merge) | L4-deferred. |
| OQ-11 (A-COM mono-founding-question) | Closed as structural finding. |
| OQ-12 (NTF-10 preferences merge) | L4-deferred. |
| OQ-13 (DS-3 catalogue listing shape) | Routed to G-29. |
| OQ-14 (DIS-6 placement) | Closed via placement principle (Observation E). |
| OQ-15 (PC-3 auto-grant surface) | Routed to G-29. |
| OQ-16 (ADM-13 collapse) | Closed via reframe; ADM-13 retained with refined wording. |
| OQ-17 (PC-2 per-device sessions API) | Routed to G-29. |

---

## Methodology refinements surfaced during the session

### The comparison-instrument substitution

The 2026-04-30 stress-test pattern bridge framed the comparison instrument for step 2 as the inspirational input's §7 master appendix and (where useful) the Hub codebase. Stefan substituted `docs/TMP/capabilities.md` — a more direct synthesis of the OLDFEAT corpus — as the comparison instrument. This worked better than §7 would have because:

- §7 is one synthesis-step removed from code (a re-organisation of OLDFEAT into the eight-area structure). Comparing against §7 would have tested layout concordance more than empirical concordance.
- `capabilities.md` is closer to ground truth (a synthesis of OLDFEAT directly, organised by *implementation capability cluster*). Comparing against it tests "does the candidate inventory map cleanly onto what the platform actually does today."

**Methodology refinement:** the stress-test pattern's comparison instrument should be the most direct code-grounded artifact available, not the most-organised synthesis. When a corpus has been synthesised twice (once into capability clusters, once into eight-area structure), the first synthesis is the better comparison instrument.

This refinement should be incorporated into the `ecosystem-decomposition` skill when G-31 resolves.

### MCP server stability finding

The `fringeisland` filesystem MCP server hung three times during the session. Each hang occurred on the *next call after a successful large edit*, with consistent pattern: the editing tool succeeded; subsequent reads or edits would return "no result received... after waiting 4 minutes"; and a lightweight call (e.g., `list_directory` on a small directory) would re-establish responsiveness.

**Mitigation applied during session:** when a hang occurred, the session would call `list_directory` on a small target to re-establish the connection, then resume work. No data loss occurred because dryRun edits don't write and the stage of work was always recoverable from chat-history context.

**Recommendation:** flag with the MCP filesystem server author or with Anthropic's MCP support. The pattern (success → hang on next call → recovery via lightweight call) suggests a connection-pool or response-buffer issue rather than a fundamental tool failure. Worth investigating before the cascade-plan Sessions 2–4 run, because those sessions involve multiple large edits in sequence and would suffer if the same pattern recurs.

### Tool-routing finding (closing-bridge specific)

When writing this closing bridge, the assistant initially called the Anthropic computer-use `create_file` tool (which writes to the sandbox `/home/claude` workspace) instead of the `fringeisland:write_file` MCP tool. The `create_file` call returned "File created successfully" but the file landed in the sandbox, not in the user's repo. Caught by `git_add`, which couldn't find the file at the repo path. Recovered by re-writing via the correct MCP tool.

**Implication:** tool-routing in environments with both sandbox-scoped tools and MCP-scoped tools requires explicit care. The two tools have similar names (`create_file` vs. `write_file`) and similar success-message shapes; the distinguisher is which filesystem they operate on. **Discipline lock:** when writing files for the user's repo, always use `fringeisland:write_file` (not the bare `create_file`). The misroute is otherwise easy to make repeatedly.

---

## What this session did NOT do

- **No L4 work.** Capability rows did not become feature specs. L4 derivation is a future session's scope.
- **No ROADMAP.md authoring.** Deferred to its own session per the B.2 bridge's locked decision.
- **No entity-CLAUDE.md authoring.** G-29 of the cascade plan; cascade-plan Session 1 owns this work.
- **No fix to G-30 (`docs/products/CLAUDE.md` mixes tier and entity rules).** Cascade-plan Session 4 owns this.
- **No expected-dependencies dedicated section or separate file.** Sources-status remarks only; G-29 routing carries the heavier mechanism design.
- **No push to origin/main.** Three commits ahead of origin (the closing-bridge commit will be the fourth); push happens at Stefan's discretion at session boundaries.
- **No update to L2 §2 "Domain services not yet consumed" list** even though §L3 surfaced an inconsistency-then-dissolution (JRN-15 DS-2 dep). Per cascade-plan discipline, L2 isn't modified mid-L3-authoring.

---

## Status at session close (B.2 bridge template, filled)

- [x] Green-light decisions locked at opening (authoring plan; granularity micro-decisions Q2/Q3/Q4)
- [x] G-29 registered in `docs/ecosystem/how-we-work/gaps.md`
- [x] Namespace-collision check resolved (no collision; ADR-U023 doesn't number Design System surfaces; DS-1..DS-7 unambiguous)
- [x] §L3 of `docs/products/hub/SPECIFICATION.md` authored (105 capabilities, eight areas, forward-commitment classification, sources-status block populated)
- [x] MEM-16 area split applied (authored directly into A-COM as COM-13 with cross-area dep on A-ADM moderation queue, per the precision-fix to the B.2 bridge's instruction Stefan confirmed at session opening)
- [x] Sources-status block populated with: G-03 remark, cosmology Open question reference, granularity choices, two-column template-deviation flag, outward-claims caveat, methodology observations A–G, four cross-entity findings routed to G-29, seven cross-entity findings routed to other entities, namespace-collision resolution, OQ-1 evidence enumeration
- [x] Closing bridge written (this file)

**B.2 closed.**

---

## Next-session orientation seed

Per the discipline: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed. The next session is Stefan's call. Several candidates, in rough sequencing order:

### Candidate 1: Cascade-plan Session 1 (skill edits + policy text + gap entries)

This was the first of the four Cascade-plan sessions queued in `2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md` and was deferred while B.2 ran ahead. With B.2 now closed, Session 1 is unblocked.

Session 1 lands:
- G-29 already landed by this session (good; one less thing for Session 1 to do).
- G-30 to land (tier/entity rule mixing in `docs/products/CLAUDE.md`).
- G-31 to land (stress-test pattern not yet named in `ecosystem-decomposition` skill — draft entry already prepared in 2026-04-30 bridge).
- Skill edits to `ecosystem-decomposition` and `doc-health-check` per the cascade plan.

**Recommendation:** prioritise Session 1 next. It's foundational mechanism design that downstream cascade-plan sessions depend on. Now that B.2 has produced concrete methodology deliverables (Observations A-G), Session 1 has more material to incorporate into the skill text than it would have a week ago.

### Candidate 2: B.3 (next entity L3)

The natural next L3 work would be one of: Gimbal L3 (mobile sibling product), a Studios L3 (Journey Studio is most-developed), a Platform Core component L3 (PC-3 Organisation has the most cross-references from Hub L3), or a Domain Service L3 (DS-3 Experience Engine is highest-leverage for unblocking Hub L4 work).

**Recommendation if pursuing B.3 next:** PC-3 Organisation. Three of the four G-29-routed findings target PC-3; resolving them would benefit from PC-3's L3 actually being authored. Cold-derivation discipline applies: PC-3's L3 must derive fresh from L1 + L2 + DESCRIPTION, not from Hub's external-deps cells. The stress-test pattern applies symmetrically.

### Candidate 3: ROADMAP.md for the Hub

Now that §L3 is authored with explicit forward-commitment classification, ROADMAP.md derivation has clean inputs. The 32 partial-forward-within-Ferd rows + 10 full-forward-beyond-Ferd rows are wave-allocation candidates. Plausibly a short session (maybe a half-session) that maps capabilities to waves.

**Recommendation:** lower priority than Session 1 or PC-3 L3 unless wave-planning has surfaced a specific blocker.

### Candidate 4: G-29 resolution session (design lateral-routing mechanism)

With four cross-entity findings now in the routing queue and the stress-test pattern's expanded scope made explicit by Observation G, G-29 has more context to design against than it had at registration. But: the resolution session is most useful *after* a second instance of cross-entity findings has been produced (cascade-plan Session 4 is the natural second instance). Premature to design now.

**Recommendation:** defer until cascade-plan Session 4 lands.

### Reading list for whichever session comes next

Regardless of which candidate the next session picks, the canonical reading order is:

1. **This bridge** (`2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md`) for B.2 closure context and methodology deliverables.
2. **Predecessor bridges** as relevant (the B.2 resumption bridge for context on shape decisions; the 2026-04-30 stress-test pattern bridge for methodology context; the cascade-plan bridge for forward sequencing).
3. **§L3 of `docs/products/hub/SPECIFICATION.md`** as the canonical reference for what was produced.
4. **`docs/ecosystem/how-we-work/gaps.md`** for the gap register state.
5. **`docs/TMP/capabilities.md`** if the next session involves stress-test work.

---

## Tensions and non-obvious insights from this session

**The stress-test pattern's deepest value is honesty about implementation status, not delta-detection.** The 2026-04-30 stress-test pattern bridge framed the value as "structural-completeness probe via empirical comparison." The session revealed that the deeper value is forward-commitment classification — knowing which architectural commitments are real-now vs. real-eventually. This is a methodology refinement worth landing in the skill text.

**The eight-area decomposition's robustness is a structural finding, not a coincidence.** That ~100 candidate rows held against empirical pressure suggests the eight-area shape is genuinely matched to the Hub's developmental architecture. Future entity-L3 derivations can adopt similar area-counts (in the 6-9 range) with confidence. Below 5 areas, decomposition tends to over-bundle; above 10, over-fragment.

**The Founding-question column generalises beyond its Hub-specific use.** Every entity in the FringeIsland ecosystem inherits VISION's three founding questions and Three Dimensions. The diagnostic value of the column applies wherever the eight-area pattern applies. Promotion to template-wide column (Observation C's status note) is the right call.

**Backward-edit discipline at the area level was not anticipated by the cascade-plan or stress-test bridges.** Both bridges focused on the L-level "one Lₙ per session" discipline. The area-level analogue surfaced organically when JRN-1 → DIS-1 inline edit was caught. This generalises: any cascading hierarchy (L-levels, areas within an L-level, sub-clusters within an area) benefits from the discipline of "structural changes pause for review at the level above their scope."

**Cold derivation and stress-test are complementary, not redundant.** Cold derivation produces the target inventory shape from architectural commitments. Stress-test classifies the inventory's activation timing from empirical comparison. Each does work the other can't — and each can produce cross-entity findings independently (cold derivation: 4 findings; stress-test: 0 new findings, but it refined existing ones). The pattern's name ("code-informed stress-test of architecture-derived specs") captures this complementarity precisely.

---

*Last updated 2026-04-30 at session close (second bridge of the day; B.2 closure with substantial methodology deliverables). Three commits landed locally before this bridge; this bridge will be the fourth commit. Block B.2 is closed. Cascade-plan Session 1 is the recommended next session, with Observations A–G providing more material to incorporate into the skill text than was available at the cascade-plan bridge's authoring time.*
