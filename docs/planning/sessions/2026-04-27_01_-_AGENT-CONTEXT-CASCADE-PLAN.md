# Session Bridge — Agent context cascade: principle, policy, and plan

**Filename convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md` (date + 2-digit sequence within the day)
**Date:** 2026-04-27
**Session type:** Vertical-axis structural-design pivot — emerged from inside Block B.2 (Hub L3) read-pass when a missing-file finding surfaced a deeper structural pattern. **Block B.2 is paused mid-elicitation, not closed**; this bridge documents the pivot and the plan that must complete before B.2 resumes.
**Participants:** Stefan + Claude (Opus 4.7 via Claude.ai)
**Commits landed (pushed to origin/main):**
- (none yet — this bridge is the planning artifact; the actual file authoring and skill edits run in subsequent sessions per the sequencing in §"The plan" below)

**Prior bridges this session pivots from:**
- `2026-04-26_07_-_BLOCK-B1-HUB-L2.md` — the B.1 Hub L2 bridge whose orientation seed pointed at B.2 Hub L3 capability inventory.
- `2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md` — the Block A → B → C structure context.

**This bridge is a separate artifact from the eventual Block B.2 bridge.** Stefan's explicit request: the agent-context-cascade plan deserves its own permanent record, not a sub-section of the B.2 bridge. The B.2 work resumes after this plan's deliverables land.

---

## Why this bridge exists (the pivot)

The session opened cleanly on Block B.2 — Hub L3 capability inventory authoring. The orientation seed in `2026-04-26_07_-_BLOCK-B1-HUB-L2.md` listed nine inputs to read in priority order; Claude began the read pass.

**Drift finding #1 surfaced during read pass.** The B.1 bridge's reading list named `hub/CLAUDE.md` as an input. Verified by directory listing: `docs/products/hub/` contains `DESCRIPTION.md`, `README.md`, `SPECIFICATION.md`, and `features/` — no CLAUDE.md. Claude classified this as a citation-by-inference failure of the same shape G-28 covers (memory stores concepts well, filenames poorly), recorded it as a note-only finding under the inline-fix discipline, and continued the read pass without registering a new gap.

**Stefan's question turned the finding from "note it and move on" into a structural design conversation.** "Should the file exist?" had not been asked before. The honest answer was that nobody had decided. Pulling the thread surfaced that the absence is not Hub-specific:

- No entity-level CLAUDE.md exists anywhere under `docs/products/`, `docs/platform/`, `docs/studios/`, or `docs/verticals/`.
- The `docs/platform/` tier carries Core-specific and Domain-specific guidance folded together, despite ADR-U023 explicitly naming Core and Domain as categorically different stability zones.
- The four PC areas (Infrastructure, Identity, Organisation, Governance) and the seven domain services don't exist as filesystem entities at all — `docs/platform/core/` is one undivided directory, same for `docs/platform/domain/`. So entity-level CLAUDE.md for those is structurally upstream-blocked, not just absent.

The "note-only" classification was wrong. The pattern is system-wide and load-bearing for the architectural goal of preparing CC autonomous sub-agents to work without context bloat. Stefan's locked direction: settle the principle, the cascade, the content policy, the sequencing, and the skill edits — *now*, before resuming any further work — and record the plan in its own bridge separate from B.2.

This bridge is that record.

---

## What was decided

Six decisions, locked, in dependency order.

### 1. The principle — progressive context loading

As an agent descends the directory tree, each level's `CLAUDE.md` adds **only** the rules specific to that level. No level repeats what an upper level already covers. No level holds rules that belong deeper. The cascade is monotonically informative: every step adds signal, never noise.

This principle was implicit in the existing tier files (each has a "reads as a delta" line) but was never extended past tier into entity. Locking it explicitly is what makes downstream policy decisions enforceable.

The principle's load-bearing case is the autonomous-sub-agent scaling target. A Gimbal sub-agent today loads `docs/products/CLAUDE.md` and gets `useAuth()` + `refreshNavigation` + Next.js `proxy.ts` rules that are Hub-specific. That's bloat by definition. A future Gimbal-iOS sub-agent would load even more bloat (web-stack rules irrelevant to native iOS). The principle says: tier CLAUDE.md has the genuinely-cross-entity rules; entity CLAUDE.md has the entity-specific ones; sub-entity CLAUDE.md has the sub-entity-specific ones. Any time information that *should* be deeper sits at a higher level, every sub-agent below pays the cost — every load, every time.

### 2. The cascade — Cascade C, mirroring the architectural decomposition

Three options were considered: A (root + tier + entity), B (root + tier + sub-tier + entity), C (mirror the architectural decomposition exactly). **Cascade C locked.** Whatever the L2 entity inventory + ADR-U023 + the architecture defines as a unit gets its own CLAUDE.md *when that entity is active*. Rationale: the decomposition is the architecture; the context cascade should mirror it. Cascades A and B are special cases of C — C generalises both.

Concretely, the cascade has these levels:

| Level | Lives at | Examples |
|---|---|---|
| **Root** | `./CLAUDE.md` | Universal project rules |
| **Tier** | `docs/{tier}/CLAUDE.md` | products, platform, studios, design-system, verticals |
| **Sub-tier** (only at platform) | `docs/platform/{sub-tier}/CLAUDE.md` | core/, domain/, extensions/ |
| **Entity** | `docs/{tier}/{entity}/CLAUDE.md` | hub, gimbal, game, journey-studio, privacy, identity, experience-engine, ... |
| **Sub-entity** (where divergence is sharp) | `docs/{tier}/{entity}/{sub-entity}/CLAUDE.md` | gimbal/ios/, gimbal/android/ |

Sub-entity CLAUDE.md files are written **only when the sub-entities have genuinely divergent rules** — Gimbal-iOS and Gimbal-Android are the canonical case (locked as separate codebases per user-memory). Sub-entity is opt-in by divergence; it is not authored speculatively.

**Design system is a special case.** It is a tier-only entity — the layer has no entities below it. The existing `docs/design-system/CLAUDE.md` *is* the entity CLAUDE; no separate entity-level file is needed.

### 3. The content policy — what lives at which level

The four-row table is locked as policy. Doc-health-check verifies it; tier and entity CLAUDE authors check against it; the policy itself is canonical when added to root `CLAUDE.md` (or `AGENTS.md` — see §"Skill edits and where the policy text lives" below).

| Level | Must contain | May contain | Must not contain |
|---|---|---|---|
| **Root** | The minimum every agent needs regardless of tier — TDD discipline, commit conventions, decomposition cascade overview, links to AGENTS / PROCESS / skills | Project-wide invariants, tooling rules, critical gotchas that apply everywhere | Tier-specific or entity-specific rules |
| **Tier** | Rules that apply to *every* entity in the tier; tier-level vertical obligations | Tier-level gotchas, tier-level cross-cutting reminders | Entity-specific rules, sub-tier-specific rules |
| **Sub-tier** (where it exists — Core/Domain/Extensions under platform) | Rules that apply to every entity within the sub-tier but not across the tier | Sub-tier vocabulary, stability-profile rules (Core = slow change/high blast radius; Domain = medium change/scoped blast radius) | Entity-specific rules, tier-general rules already in the tier file |
| **Entity** | Entity-specific rules, gotchas, instantiated tech-stack details, entity-specific anti-patterns | Pointers into that entity's SPECIFICATION sections; entity-level quality bars | Rules that generalise to siblings (those belong at tier or sub-tier) |
| **Sub-entity** (only when authored) | Sub-entity-specific rules whose divergence from the entity is sharp enough to justify a separate file | Sub-entity gotchas; sub-entity tooling specifics | Anything the entity file already covers |

The "must not" column is what stops drift. Without it, every author makes their own judgement and the files diverge. With it, doc-health-check has something to check against.

### 4. Sequencing — author what's authorable today; record blockers explicitly

**Authorable today (entity directory exists):**

| Tier | Entity | State today | Plan |
|---|---|---|---|
| products | hub | Active product, real DESCRIPTION + L2 SPECIFICATION | Substantive entity CLAUDE.md (Hub-specific rules already exist scattered across `products/CLAUDE.md` and the L2 SPECIFICATION — consolidate them) |
| products | gimbal | Has `README.md` + `ios/` + `android/` subdirs | Entity-level stub CLAUDE.md (no Gimbal-specific rules locked yet — file says "tier file applies; load it") + sub-entity stub CLAUDE.md for `ios/` and `android/` (placeholders for future divergence) |
| products | game | Has `README.md`; scope TBD | Entity-level stub CLAUDE.md ("tier file applies; load it") |
| studios | journey-studio | Has `README.md` + `features/` | Entity-level stub CLAUDE.md (Eid-onward; no rules locked yet) |
| studios | universe-studio | Has `README.md` + `features/` | Entity-level stub CLAUDE.md (Eid-onward; no rules locked yet) |
| studios | arc-studio | Has `README.md` + `features/`; Urd-scope | Entity-level stub CLAUDE.md ("Urd-scope, not in active development before then") |
| verticals | administration | Has `SPECIFICATION.md` (scaffold) + `features/` | Entity-level CLAUDE.md (lift any vertical-specific gotchas; otherwise stub pointing to tier) |
| verticals | privacy | Has `SPECIFICATION.md` (scaffold) + `features/` | Entity-level CLAUDE.md (similar) |
| verticals | notifications | Has `SPECIFICATION.md` (scaffold) + `features/` | Entity-level CLAUDE.md (similar) |
| verticals | observability | Has `SPECIFICATION.md` (scaffold) + `features/` | Entity-level CLAUDE.md (similar) |
| verticals | transactions | Has `SPECIFICATION.md` (scaffold) + `features/` | Entity-level CLAUDE.md (similar) |
| platform | (sub-tiers) | `core/`, `domain/`, `extensions/` directories exist with `README.md` only | **Sub-tier CLAUDE.md** for each (the platform tier file currently mixes Core/Domain content; this is the cleanup that splits them — see G-30 below) |

**Blocked-upstream (entity directory does not exist):**

| Tier | Entity | Upstream blocker |
|---|---|---|
| platform/core | identity, organisation, infrastructure, governance | Entity directories not yet instantiated. Block A.3 authored the `platform-core-spec.md` template (2026-04-26); using it requires deciding to instantiate `docs/platform/core/identity/` etc. — that is L2 entity-instantiation work, not CLAUDE.md work. |
| platform/domain | world-model, narrative-engine, experience-engine, content, communication, discovery, intelligence, extension-system | Same as above — domain service directories not yet instantiated. Domain-service-spec.md template exists but no service has been formally specified yet. |

Once the entity-directory creation happens (likely emerging as part of future Block A or future structural work), entity CLAUDE.md authoring for those entities follows the same pattern as the verticals/studios above.

**Sequencing of authoring sessions.** This plan is decomposed into four authoring sessions that should run in order:

1. **Session 1 — Skill edits + policy text + gap entries.** Edit `ecosystem-decomposition` skill (add Agent context cascade section + L2 write-scope update + Quality checklist bullet); edit `doc-health-check` skill (add cascade-consistency verification section); add the policy table to root `CLAUDE.md` (the natural home — root is where load-order lives). Add G-29 (entity-CLAUDE coverage gap) and G-30 (tier-CLAUDE content audit needed) to `gaps.md`. **No CLAUDE.md files for entities authored in this session — only the rules, mechanism, and registers that everything else depends on.**
2. **Session 2 — Entity CLAUDE.md authoring batch 1: Hub substantive + entity stubs everywhere else.** Author `hub/CLAUDE.md` substantively (lift the Hub-specific content from `products/CLAUDE.md` and consolidate gotchas). Author stubs for: `gimbal/CLAUDE.md`, `gimbal/ios/CLAUDE.md`, `gimbal/android/CLAUDE.md`, `game/CLAUDE.md`, `journey-studio/CLAUDE.md`, `universe-studio/CLAUDE.md`, `arc-studio/CLAUDE.md`. Each stub follows the canonical stub shape (defined in Session 1's policy text). **Tier files not yet edited** — the cleanup is its own session.
3. **Session 3 — Vertical entity CLAUDE.md + platform sub-tier CLAUDE.md authoring.** Author the five vertical entity CLAUDE files (`administration/CLAUDE.md`, etc.) and the three platform sub-tier CLAUDE files (`core/CLAUDE.md`, `domain/CLAUDE.md`, `extensions/CLAUDE.md`). The platform sub-tier work is more substantive than the vertical entity work because the Core/Domain split per ADR-U023 is content-rich; verticals largely point upward to the tier file plus the entity SPECIFICATION.
4. **Session 4 — Tier-CLAUDE content audit (G-30).** Walk each tier `CLAUDE.md` against the new policy. For each rule/gotcha, verify it satisfies the tier's "must contain" criteria — i.e., it applies to *every* entity in the tier. Rules that don't (Hub-specific items in `products/CLAUDE.md`; Core/Domain miscategorisation in `platform/CLAUDE.md`) are migrated down to the entity or sub-tier file. **Each migration is a separate logical change** — granular commits per migration so review stays clean.

Sessions 1 through 4 may be combined if scope allows, but they should not be reordered. Session 1 is foundational; Sessions 2 and 3 depend on Session 1; Session 4 depends on Sessions 2 and 3 existing as targets to migrate content into.

### 5. Skill edits — `ecosystem-decomposition` and `doc-health-check`

Both skills currently address READMEs but say nothing about CLAUDE.md cascade. That gap is closed in Session 1.

**`ecosystem-decomposition` skill — three edits:**

- **New section: "Agent context cascade."** Probably positioned after "Levels are activities, not files" and before "The decomposition hierarchy" (because the cascade structure is meta-mechanical, not a level itself). The section names the principle (progressive context), the levels (root → tier → sub-tier → entity → sub-entity), the four-row content policy, and points at where the policy table lives canonically (root `CLAUDE.md`).
- **L2 write-scope update.** Currently L2 owns `{entity}/DESCRIPTION.md`, the L2 sections of `{entity}/SPECIFICATION.md`, and `{entity}/ROADMAP.md`. **Add: `{entity}/CLAUDE.md`** as L2-owned when the entity has any entity-specific agent rules (or as a stub when it doesn't). Reasoning: an entity's CLAUDE.md content is derivative of the entity's identity and technical shape — exactly L2's authority.
- **Quality checklist bullet.** Add: *"Every active entity has a `CLAUDE.md` (substantive or stub stating the entity has no rules beyond tier). Sub-entities have a CLAUDE.md only when their rules diverge from the entity. The cascade is verified by `doc-health-check`."*

**`doc-health-check` skill — one new section:**

- **New section: CLAUDE.md cascade consistency.** Verifies (a) presence — every active entity has a CLAUDE.md; (b) content categorisation — flag for review when a tier file contains entity-specific patterns (entity name in headers, entity-specific tech-stack details like `useAuth()` for Hub, `proxy.ts` for the web stack); (c) cascade integrity — every CLAUDE.md's load-order line points at correct upstream files. Cheap checks (presence/absence) are hard fails; expensive checks (content miscategorisation) are soft flags for human review.

**Where the policy text lives canonically.** Root `CLAUDE.md` — that is where load-order is documented today, and the cascade structure is a load-order concern. AGENTS.md is shorter and more boundary-focused; root CLAUDE.md is the natural home for cross-tier mechanism. The policy table is added there in Session 1.

### 6. Gap entries — G-29 and G-30

Two new gaps registered in `docs/ecosystem/how-we-work/gaps.md` in Session 1. ID monotonicity rule honoured (G-28 was the most recent assigned ID; G-29 and G-30 are next).

**G-29 — Entity-level CLAUDE.md coverage absent across the ecosystem.** *Medium priority.* Today the agent-context cascade stops at tier level. No entity-level CLAUDE.md exists under `docs/products/`, `docs/platform/sub-tier/`, `docs/studios/`, or `docs/verticals/`. The structural goal of preparing autonomous sub-agents to work without context bloat requires the cascade to extend to entity (and sub-entity, where divergence is sharp). Proposed fix: **execute Sessions 1 through 3 of this plan** — author skill edits + policy text + gap entries first (Session 1), then entity CLAUDE files for everything currently authorable (Sessions 2 and 3), with explicit upstream-blocker notes for entities that cannot be authored yet (PC areas, domain services). Once Sessions 2 and 3 ship, this gap is partially closed; full closure requires the upstream-blocked entities to land too.

**G-30 — Tier CLAUDE.md files contain miscategorised entity-specific content.** *Medium priority.* `docs/products/CLAUDE.md` carries Hub-specific rules (`useAuth()`, `refreshNavigation`, `proxy.ts`, `sb_publishable_*` key format, realtime-channel narrowing) as if they were product-tier rules. They aren't, strictly — they're Hub rules sitting at tier level because Hub is the only active product. Similarly, `docs/platform/CLAUDE.md` folds Core-specific and Domain-specific guidance together despite ADR-U023 naming them as categorically different. Proposed fix: **execute Session 4 of this plan** — once entity CLAUDE.md files exist as targets, walk each tier file against the new policy and migrate miscategorised rules down. Reviewable as granular commits, one migration per commit.

---

## What was produced (this session)

**This bridge.** No code changes, no CLAUDE.md files authored yet, no skill edits landed yet — by design. The plan is the deliverable; execution is sequenced across Sessions 1 through 4.

The B.2 read-pass artifacts (the upstream input files Claude read during read-pass setup) remain valid context for resuming B.2 — nothing has changed in the read inputs since this session opened. The pause-state record from the earlier conversation phase remains accurate.

---

## Drift findings (recorded, not fixed in this session)

This session is a planning session, not an authoring session — drift findings are listed for later. Three findings worth carrying forward:

1. **The B.1 bridge's reading list cited `hub/CLAUDE.md` which does not exist.** Citation-by-inference failure (G-28 shape applied to bridge authoring). Bridges are permanent records; not retroactively edited. **Classification:** note-only. The underlying signal — that the bridge author's mental model included a hub-level CLAUDE.md as if it should exist — is what surfaced this entire conversation. Worth keeping the finding visible as one of the "the gaps were already there; the discipline is what makes them visible" examples for future retrospective.
2. **The L2 SPECIFICATION authored 2026-04-26 lifted entity-specific rules into `§3 Auth & authorization` (the "load-bearing rule as anti-pattern catch" pattern).** The B.1 bridge correctly noted this as a pattern recurring across templates and specs. The deeper read of that pattern, given today's conversation, is: load-bearing rules were lifted to spec-grade visibility *because there was no entity CLAUDE.md to receive them*. Once `hub/CLAUDE.md` exists, those rules can move to where they architecturally belong (entity-rules layer), and the SPECIFICATION can simply reference them. **Classification:** scheduled — Session 2 includes consolidating Hub-specific content from both `products/CLAUDE.md` and the L2 SPECIFICATION's prose.
3. **The cosmology drift (B.1 §8.1) remains deferred per Stefan's earlier call.** No change this session; carried forward unchanged.

---

## Block B.2 status — paused mid-elicitation, not closed

Block B.2 (Hub L3 capability inventory) opened cleanly, completed its read pass, posed three shape-elicitation questions, and paused before authoring began. **All three pause conditions hold:**

- Read pass remains valid (no inputs have changed; nothing in `hub/SPECIFICATION.md` §L3 has been authored).
- Three shape questions remain answered = no, awaiting Stefan's selection:
  1. **Internal-area unit** — proposal: FIM-facing experience surfaces (alternatives: code organisation, role-primary, custom).
  2. **Granularity** — proposal options: coarse ~12–18 / medium ~20–25 / fine ~30–40 capabilities.
  3. **Cosmology vocabulary at capability boundaries** — proposal options: VISION.md vocabulary / cosmology-neutral / hybrid.
- The five drift-finding classifications from B.2 read pass remain accurate (one re-classified during this session — the missing `hub/CLAUDE.md`, originally note-only, became the trigger for this whole plan).

**B.2 resumes after Sessions 1 through 4 land** — or, at minimum, after Session 1 (the structural mechanism that L3 will inherit). It is fine for B.2 to resume after just Session 1 if the entity CLAUDE.md files are not yet load-bearing for L3's work, which they likely aren't (L3 derives from L1 + L2 + anatomy + tier rules; entity CLAUDE is consumed by L4 work and below, not by L3 itself).

**One Lₙ per session is preserved.** This pivot does not violate it — Sessions 1 through 4 are not L-level work; they are mechanism-level work supporting all L-levels. When B.2 resumes, it remains an L3-only session.

---

## Open questions surfaced (this session)

Two new, three carried forward from B.2.

**New:**
- **Where canonical policy text lives — root `CLAUDE.md` or `AGENTS.md`.** Decided: root `CLAUDE.md` (load-order is documented there). Worth re-checking during Session 1 authoring; if `AGENTS.md` turns out to be the better home, it can be moved without re-deciding the principle.
- **Sub-entity CLAUDE.md authorship triggers.** Gimbal-iOS and Gimbal-Android are the canonical case (separate codebases per user-memory). Are there other current sub-entity divergences? Likely none today, but watch-point for future sessions when a Studio (e.g., Universe Studio with multimedia worldbuilding components) or a domain service grows internal divergence.

**Carried forward from B.2 (still open, unchanged):**
- The cross-product paired-spec naming convention (B.1 §8.5; expected to surface in B.3 at the latest).
- The cosmology constitutional question (deferred per Stefan's earlier call).
- The B.2 three shape questions (above).

---

## Tensions and non-obvious insights

**The "load-bearing rule as anti-pattern catch" pattern has a different reading now.** The B.1 bridge identified this pattern at three levels: skill prose, template structure, and SPECIFICATION content. Today's conversation suggests the pattern recurred at the SPECIFICATION level *because the entity CLAUDE.md layer was missing*. Load-bearing rules lifted up to SPECIFICATION are rules that couldn't find a home at the right level — entity rules with no entity-rules file. Once the entity CLAUDE.md layer exists, the pattern's expression at the SPECIFICATION layer should reduce: rules will live in `hub/CLAUDE.md` and the SPECIFICATION can reference them rather than embed them. **The pattern itself isn't going away** — it's still useful at template and skill levels — but its incidence at SPECIFICATION level is a symptom of a missing context layer, not just a useful design move.

**Today's conversation is itself an example of "the gaps were already there; the discipline is what makes them visible."** The missing entity-level CLAUDE.md files have been absent since the very first tier file was authored. Nobody noticed because Hub is the only active product, every Hub-specific rule found a home at tier level pretending to be a product-tier rule, and no sub-agent has yet hit the bloat cost. The gap has been latent for weeks. The B.1 bridge's incorrect citation of `hub/CLAUDE.md` was the single observation that surfaced it — not because the citation was important in itself, but because Stefan asked the right follow-up question. **The lesson generalises: structural gaps are often invisible until a small concrete observation forces a "should this exist?" question.** Worth keeping the discipline of pursuing such questions all the way to the structural pattern, even when the original observation is a one-line citation error.

**The pivot itself is the cleanest demonstration of the inline-fix discipline yet.** The session opened on B.2; a finding surfaced during read pass; the finding was provisionally classified as note-only; Stefan's question reclassified it as structural; a full plan was produced in the same session that surfaced the issue, with explicit non-closure of B.2 and a sequenced authoring plan. **Three sessions ago this would have been deferred to a future bridge.** The discipline is paying for itself within the same session it's applied — exactly the pattern the B.1 bridge described under "The 'stop and fix' discipline pays for itself in the same session it's applied."

**The decomposition skill's claim of universality just got tested.** The skill has been authoritative for the vertical axis since the 2026-04-22 refactor. It covers L1–L5, mentions READMEs, but says nothing about CLAUDE.md cascade. **CLAUDE.md cascade is part of the vertical axis** — agents descend the tree as they descend the decomposition; the cascade's structure should be in the skill that owns the descent. The Session 1 edit closes that loop. Worth tracking as a "first time the skill was tested for completeness against a real concern that wasn't the L1–L5 chain proper."

---

## What's out of scope and deferred

**Next-in-sequence (primary next work):** Session 1 — the foundational session that authors the skill edits, adds the policy text to root `CLAUDE.md`, and registers G-29 and G-30. Read first: this bridge, root `CLAUDE.md`, `AGENTS.md`, `.claude/skills/ecosystem-decomposition/SKILL.md`, `.claude/skills/doc-health-check/SKILL.md`, and the gaps register.

**Deferred this session:**
- Block B.2 Hub L3 — paused mid-elicitation. Resumes after Session 1 at the earliest.
- All actual CLAUDE.md authoring — sequenced into Sessions 2 and 3.
- Tier CLAUDE content audit — sequenced into Session 4.
- Entity-directory creation for PC areas and domain services — out of scope for this plan; will emerge from future Block A-style work.

**Deferred from earlier sessions (carried forward, unchanged):**
- All G-01 through G-28 entries in the existing register, except where this plan's Sessions 1 through 4 partially close G-21 (feature-inventory summary discipline gets one CLAUDE.md cousin) or interact with G-23 (stale references audit) or G-25 (`_3.docx` regeneration).

**Out of scope per the same horizontal-axis guardrail used since 2026-04-22:**
- Wave scoping, wave progress, wave DoD
- G-19 (wave-planning skill structural review)
- Anything under `docs/planning/waves/`
- Cycle planning, cooldown work, kanban mechanics

---

## Next session — orientation seed (not a prompt)

Per the locked principle: bridges are permanent, prompts are ephemeral. No `NEXT_SESSION_PROMPT.md` is committed.

**Orientation seed for the next session: Session 1 — Skill edits + policy text + gap entries.**

The session writes (a) the new "Agent context cascade" section in `ecosystem-decomposition` skill, (b) the L2 write-scope update + Quality checklist bullet in the same skill, (c) the new CLAUDE.md cascade-consistency section in `doc-health-check` skill, (d) the policy table in root `CLAUDE.md`, and (e) the G-29 and G-30 entries in `gaps.md`. **No entity-level CLAUDE.md files are authored in Session 1.** The session is foundational mechanism only.

**Specific watch-points for Session 1:**
- **Policy text placement.** Default decision: root `CLAUDE.md`. Verify during authoring that root is genuinely the better home than `AGENTS.md`. If `AGENTS.md` is better, move the text without re-litigating the principle.
- **Skill-section ordering in `ecosystem-decomposition`.** The new section should sit where it doesn't disrupt the L1–L5 flow. Probably between "Levels are activities, not files" and "The decomposition hierarchy" — but the authoring session should verify by re-reading the skill end-to-end.
- **Gap-register prose for G-29 and G-30.** Use the Quick index table format that the existing 28 entries follow. The proposed-fix column should reference Sessions 2, 3, and 4 explicitly so the gaps' resolution is traceable to this plan.
- **Verification discipline.** Per G-28 / the new citation-verification rule: every cited file path in the new skill sections and the policy text is verified against a directory listing before commit.

Read first, in order:
1. This bridge.
2. Root `CLAUDE.md` and `AGENTS.md`.
3. `.claude/skills/ecosystem-decomposition/SKILL.md` (the L2 section + the Quality checklist).
4. `.claude/skills/doc-health-check/SKILL.md` (skim end-to-end; the new section needs to fit the existing voice and ordering).
5. `docs/ecosystem/how-we-work/gaps.md` (the Quick index table format).
6. The five existing tier CLAUDE.md files (for voice and shape consistency when authoring policy text).

After Session 1 lands, B.2 may resume immediately — Session 1's deliverables are sufficient context for L3 to proceed without entity-level CLAUDE.md files yet existing. Sessions 2 through 4 can run in parallel with B.2's L3 authoring or after it; they do not block each other.

---

**Three process refinements internalised from this session.**

1. **Pivot bridges are first-class artifacts.** When a session pivots from its planned work into a structural design conversation, the pivot deserves its own bridge — not a section inside the originally-planned bridge. Stefan's request was explicit on this and the resulting structure is cleaner than bundling would have been.
2. **Note-only classifications need re-classification triggers.** The missing `hub/CLAUDE.md` was initially classified as note-only. The reclassification trigger was Stefan asking "should the file exist?" — a question Claude could have asked itself but didn't. Worth adding to the inline-fix discipline: when classifying a finding as note-only, briefly check whether the underlying signal might be structural; if it might, register a question rather than a note.
3. **The cascade principle was implicit; making it explicit is an unlock.** The "reads as a delta" line in tier files names the principle without naming it as a principle. Today's session promotes it from convention to locked policy. The unlock: future tier and entity CLAUDE.md authors no longer have to re-derive the principle each time; they apply it.

**Two disciplines stable enough to consider naming explicitly (carried forward from B.1).**
- **README-with-template** — when SPECIFICATION.md lands for an entity, the entity's README is updated in the same commit. Stable across four sessions. **Today's analogue:** when entity CLAUDE.md lands for an entity, the README and SPECIFICATION's "see also" sections may need updating to reference it. Worth explicit checking during Sessions 2 and 3.
- **Verify-before-commit** — every cited file path is verified against a directory listing before commit. Already in `ecosystem-decomposition` Quality checklist; complementary detection in `doc-health-check` Section 3. Today's plan should include the same discipline applied to every CLAUDE.md the new files reference.

---

*Last updated 2026-04-27 at session pause (first bridge of the day; structural-design pivot from inside Block B.2). Two new gaps to be registered (G-29, G-30) in Session 1; zero gaps closed; zero files authored; one paused block (B.2) carried forward.*
