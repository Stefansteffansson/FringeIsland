# Cascade-plan Session 4a — closing bridge

**Session date:** 2026-05-02.
**Predecessor:** [`2026-05-01_03_-_CASCADE-SESSION-3.md`](./2026-05-01_03_-_CASCADE-SESSION-3.md).
**Successor:** Session 4b — Platform tier audit (F1, F2, F4-wide).
**Branch state:** clean apart from four untracked B.2 narrative files in `docs/products/hub/` (carried forward, out of scope) plus this bridge.

**Scope shipped.** Tier-and-root-to-Hub migration of Hub-specific rules. Seven granular commits per cascade-plan D4. Inbound-cross-reference sweep ran twice (wide first, then post-edit verification). Methodology Candidates A and B from Session 2 executed their named second-instance tests in this session and both promoted.

**Session 3's scoping concern resolved by split:** Session 4 was scoped at plan-back as 4a (Hub-migration package, this session) + 4b (Platform tier audit, next session). 4a's plate was the locked Hub-rule migration; F1 (two-zones policy-fit) and F2 (Platform-Core-rare-by-design migration) deferred to 4b. F3 (inbound-cross-reference enumeration update) folded into 4a's first-sweep methodology and closed by inspection.

---

## Locked / shipped

### Commits (in dependency order)

The plan-back numbered commits C2 through C7. C1 was an inbound-sweep **register**, surfaced for review during the plan-back exchange and held as ephemeral output of the first sweep — never committed (per bouncing-partner ruling). The conceptual numbering is preserved here so the audit trail back to the plan-back exchange is intact.

| # | Hash | Message | Notes |
|---|------|---------|-------|
| C2 | `befd706` | `docs(products): migrate useAuth() server-component gotcha out of products tier` | Delete-only at upstream. Destination already authored in Session 2's `367a3f3`. |
| C3 | `9fb4f0e` | `docs(products): migrate refreshNavigation gotcha out of products tier` | Same shape as C2. |
| C4 | `ddaea8c` | `docs(root): generalize Auth architecture bullet to cross-product framing` | Surfaced before commit per Candidate A live-authoring constraint. Trim from initial draft narrowed "per-product primitives (hook names, route-guard mechanism)" to "Product-specific details" — see Candidate A entry below for why the trim was load-bearing. |
| C5 | `69f6369` | `docs(root): generalize State architecture bullet to cross-product framing` | Same surface-and-trim cycle as C4. Drops the "check the product's CLAUDE.md before inventing a new one" imperative; root architecture describes the architecture, doesn't instruct agents how to read it. |
| C6 | `f528b97` | `docs: remove Hub-specific Next.js stack rule from project-wide files` | Bundled deletion across root `CLAUDE.md` Critical-gotcha and `AGENTS.md` Conventions. One logical change, two surface forms. |
| C7 | `68ad39e` | `docs(hub): promote sb_publishable_* entity-specificity rationale in-file` | Surfaced before commit per Candidate B's pre-commit review. Light form ("This rule is Hub-specific because …") chosen over the heavy form ("Per the entity-specificity test:"). |

### Asymmetry posterity note

The "five Hub-specific rules" framing inherited from Sessions 2–3 was structurally wrong. Reality after the first sweep:

- Two rules duplicated upstream — `useAuth()` and `refreshNavigation` in `docs/products/CLAUDE.md` Gotchas. Required deletion (C2, C3).
- Three Hub-flavoured inline mentions in root `CLAUDE.md` — Architecture Auth bullet, Architecture State bullet, Critical-gotcha proxy.ts. Required generalize-rewrite (C4, C5) or delete (C6).
- One Hub-specific Convention in `AGENTS.md` (proxy.ts) — same shape as C6's gotcha; bundled.
- Two of the named-five — `sb_publishable_*` and realtime-channel narrowing — existed only at Hub from Session 2 onwards. No upstream duplication; no deletion needed. `sb_publishable_*` received a Candidate B augmentation (C7); realtime-channel narrowing untouched in 4a.

Future cascade migrations should sweep wide first (see methodology candidates below) and let the asymmetry surface in the register, rather than locking an "N rules to migrate" framing into the plan up front.

### F3 closure

Session 3's F3 (inbound-cross-reference enumeration update) closed by inspection. The first sweep ran whole-repo grep, not the enumerated set; the four files Session 3 added to the enumeration (Privacy, Transactions, Platform Core, Platform Domain `CLAUDE.md`) returned **no hits** for the five symbols. F3's concern was comprehensiveness — the wider sweep satisfied the concern. No edits required. (Logging the reasoning here so future sessions can see why F3 closed without producing edits, rather than reading as "F3 was opened in Session 3 and silently disappeared in Session 4.")

### F4-wide framing (locked)

Root `CLAUDE.md` was authored when Hub was the only product. Session 4a's grep found Hub-flavour in three Architecture bullets and one Critical-gotcha, all of which the seven commits resolved. **The absence of additional symbol-hits doesn't mean the rest of the file is clean** — only five symbols were grepped; the section as a whole (RLS triggers, Supabase clients, RBAC SQL functions, RSC vs client-component distinctions, UI conventions referencing `ConfirmModal`) reads as Hub-flavoured throughout. F4-wide is the framing 4b inherits: walk the rest of root `CLAUDE.md` against the five-row policy with the same wide-first sweep methodology.

### Sweep-scope exclusions (rules for future sessions)

Documented because they surfaced during 4a's second sweep and required adjudication:

- **`.claude/worktrees/`** — Claude Code's Agent-tool isolation machinery. Working-copy artefacts, not canonical content. **Hard exclusion** from cascade sweeps. Edits there don't persist meaningfully and confuse tool-state with content-state. Should land in `ecosystem-decomposition` SKILL or `doc-health-check` Section 9 eventually; naming here is enough for now.
- **`docs/TMP/`** — parked tree (16 OLDFEAT archived feature drafts plus a 2026-04-28 capability snapshot synthesised from them, sourced from the pre-cascade-plan Hub-flavoured era). **Exclude** from cascade sweeps. The whole tree should carry an archival-README marker so future agents who wander in directly see the parked status (see Open below).

### Sweep cadence rule (locked, conditional on Candidate E)

Migration sweeps run twice — first wide, then post-edit. Operationally binding for the next session. Methodology basis: see Candidate E below. If E disconfirms on later evidence, this rule comes up for review.

---

## Open / inherited forward to 4b (and adjacent)

### Inherited to 4b — platform tier audit

| ID | Subject | Shape |
|----|---------|-------|
| **F1** | Two-zones cross-cutting framing's location in `docs/platform/CLAUDE.md` — five-row-policy-fit question | Three readings (tier-by-defensible-reading; special-case sub-tier asymmetry; misplaced — distribute or relocate). Judgment-heavy adjudication; surface-draft cycle expected. |
| **F2** | "Platform Core changes are rare by design" rule (with three-sentence elaboration) | Mechanical migration from `docs/platform/CLAUDE.md` to `docs/platform/core/CLAUDE.md`. Same shape as Session 2's Hub-rules-at-tier finding. Granular commits per D4. |
| **F4-wide** | Whole-root-`CLAUDE.md` audit beyond the five symbols Session 4a grepped for | Framing locked here; 4b walks the rest of the root file against the five-row policy with wide-first sweep methodology. |

**4b's plate post-split.** F1 + F2 + F4-wide is a clean three-item plate (one judgment-heavy adjudication, one mechanical migration, one wide audit before edits). Substantially smaller than 4a's pre-split shape; comparable to Session 3's. The split has done its work — 4b's plan-back can size accordingly without pre-emptive over-scoping.

### Adjacent follow-ups (not 4b's plate, logged)

- **`docs/TMP/` archival README.** Single marker note at the tree root declaring the archival status. Mechanical authoring; can be done by any session that touches the area or as standalone cleanup. Rationale: `docs/TMP/` is parked but has no in-tree marker; an agent reading e.g. `docs/TMP/OLDFEAT/FR-authentication.md` directly sees nothing telling them the content is parked.
- **B.2 capability reconciliation.** `docs/TMP/capabilities.md` (2026-04-28 snapshot synthesised from OLDFEAT) sits parallel to the canonical `docs/planning/waves/FERD-CAPABILITY-MAP.md`. The B.2 narrative work currently underway in `docs/products/hub/` may want to reconcile or delete the snapshot. Belongs to B.2, not the cascade plan.

---

## Methodology candidates

Three entries after review-cycle collapse. Two promoted from Session 2's named second-instance tests (A, B); one new candidate surfaced during 4a (E). Two earlier draft entries (C, D) merged into A and E respectively during the surface-and-review cycle — see per-entry "Posterity (collapse note)" below. Each entry: status / evidence count / current statement / next-test condition.

### Candidate A — Back-reference pattern, scale-agnostic (PROMOTED)

- **Evidence:** 2 (one intra-file, one cross-file — same principle).
  1. Session 2 (`367a3f3`) — intra-file: Hub's `CLAUDE.md` draft authored proxy.ts and realtime-channel-narrowing with Rules↔Gotchas back-references between the Rules and Gotchas sections.
  2. Session 4a (C4, C5 authoring) — cross-file: root↔Hub Auth/State bullet rewrites. The pattern was load-bearing during authoring — the trims to "Product-specific details" (C4) and to drop the "check … before inventing" imperative (C5) were necessary because longer drafts would have created back-reference incoherence by enumerating Hub primitives at root that Hub's file then back-references.
- **Statement (promoted):** When cascade-document rules point downward to entity-specific operational consequences, the relationship is bidirectional: the upper-level rule and the lower-level operational gotcha back-reference each other. The pattern is **prescriptive, not descriptive** — the upper-level prose must avoid enumerating downward-specific primitives, because doing so creates back-reference incoherence at the lower level. The pattern is **scale-agnostic** — operates both intra-file (entity Rules↔Gotchas) and cross-file (root → tier → entity).
- **Inheritance:** future entity-CLAUDE authoring uses the intra-file shape; future cross-tier or cross-entity rewrites avoid downward-primitive enumeration.
- **Posterity (collapse note):** an earlier draft of this bridge held a separate "cross-file scale" candidate (C); review-cycle collapse merged C's evidence into A because A's principle is scale-agnostic and the C4/C5 evidence simply demonstrates the cross-file scale of the same pattern.

### Candidate B — Categorisation-rationale-in-file as a discipline (PROMOTED)

- **Evidence:** 2.
  1. Session 2 (`367a3f3`) — Hub's proxy.ts rule carries an in-file rationale ("this rule is Hub-specific because Gimbal will not run Next.js, not because the rule is 'obviously about Hub.'").
  2. Session 4a (C7) — `sb_publishable_*` rule augmented with parallel-shape rationale in-file rather than commit-body-only.
- **Statement (promoted):** Rules whose entity-fit could be misclassified upward — because the underlying fact is platform-wide or stack-wide rather than entity-specific — carry an in-file sentence naming why the rule attaches to this entity, parallel-shape: "this rule is X-specific because [sibling-entity-disambiguation]." Commit-body provenance is insufficient because bodies are not loaded with the file.
- **Inheritance:** future entity rules whose entity-specificity is non-obvious carry the rationale in-file.

### Candidate E — Sweep-scope catalog as output, not input (NEW, named, the substantive lesson)

- **Evidence:** 1 — Session 4a's first-sweep scope catalog missed `.claude/worktrees/` and `docs/TMP/` because the catalog could only enumerate what the sweep author already knew. The wide-first second sweep found both.
- **Statement (candidate):** migration sweeps run wide first; the **scope catalog is derived from results**, not pre-declared. Pre-declared catalogs systematically miss unknowns — they can only enumerate what the sweep author already knows. The catalog is an **output** of the first sweep, not an input to it. The second-sweep cadence is non-redundant as a corollary: any first sweep is incomplete-by-construction, so the second sweep adds findings, not just verification.
- **Next-test condition:** any future migration sweep — does the wide-first / catalog-from-results pattern surface a tree the author didn't know about?
- **Status:** Carried as named candidate. **The substantive lesson of 4a's second-sweep experience.** The §1 sweep-cadence rule (locked above) operationalises E's claim and is conditional on E's eventual promotion.
- **Posterity (collapse note):** an earlier draft of this bridge held a separate "second-sweep cadence is non-redundant" candidate (D); review-cycle collapse merged D into E because D is a logical corollary of E (catalog-as-output → first-sweep incomplete-by-construction → second-sweep non-redundant).

### Posterity — candidate-ledger volume

Three candidate-track items now carried in 4a's bridge (two promoted: A, B; one newly named: E). An earlier draft carried five (D as a corollary of E; C as additional evidence for A) before review-cycle collapse during the surface-and-review cycle. The collapse is informative — candidate-ledger growth is partly authoring-pressure, not only legitimate observation accumulation. **Recommend a future session take up the candidate-ledger-split decision deliberately rather than letting bridge length force it.** Session 4b is too soon (still under the same cascade-plan execution). Right venue: cascade plan's natural close, or a wave-boundary cooldown audit — whichever lands first.

---

## End-of-session state

- **Branch:** `main`, clean apart from four untracked B.2 narrative files (carried forward) plus this bridge.
- **Unpushed:** seven 4a commits + this bridge commit (after sleep-on-it review per the cascade-plan working pattern).
- **Next session:** 4b — Platform tier audit. Inherits F1, F2, F4-wide; adjacent follow-ups logged but not on the plate.
