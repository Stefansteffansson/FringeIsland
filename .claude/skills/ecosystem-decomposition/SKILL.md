---
name: ecosystem-decomposition
description: >
  The canonical methodology skill for the FringeIsland ecosystem's vertical axis —
  decomposition from ecosystem vision down to ready-to-build tasks. Covers all products,
  platform services, and studios, across all entities. Use this skill whenever someone
  asks to: define or update the ecosystem vision, write or review product/service/studio
  descriptions or specifications, map an entity's capability inventory, identify
  dependencies between capabilities, break down a capability into features, create feature
  specs, decompose features into stories and tasks, or understand what any part of the
  ecosystem needs to deliver. Also use when asked to "decompose", "break down", "spec out",
  "what does X need", "map capabilities", "populate features", or "define the scope of Z".
  This skill operates at five levels (Vision → Entities → Capabilities → Features → Tasks)
  and can be entered at any level. It is strictly vertical — waves, cycles, cooldowns,
  and other horizontal-axis planning live in the `wave-planning` skill, not here.
---

# Ecosystem Decomposition

The methodology for structurally decomposing work in the FringeIsland ecosystem.
Operates across ALL products, platform services, and studios.
Can be entered at any level — from ecosystem vision down to task creation.

This skill covers the **vertical axis** only — the derivation chain from Vision down to Tasks. Horizontal planning (waves, cycles, cooldowns, daily rhythm) is handled by the `wave-planning` skill and by PROCESS.md §3. Keep the axes separate. A wave does not trigger L3 work; an entity change does. A cycle does not trigger L5 work; a feature reaching 4-ready and being pulled into a cycle does. The distinction is load-bearing — confusing the axes is how contamination across the decomposition chain happens.

## The two trees (never mixed)

**Ecosystem tree (WHAT)** — permanent, structural:
`docs/ecosystem/`, `docs/products/`, `docs/platform/`, `docs/studios/`,
`docs/design-system/`, `docs/verticals/`, `docs/architecture/`

**Planning tree (HOW)** — temporal, operational:
`docs/planning/` (waves, cycles, backlog, sessions, retrospectives)

Features belong to the ecosystem tree. Tasks belong to the planning tree.
Waves reference features — they don't contain them, and they don't drive their creation.

## Levels are activities, not files

A level describes *what kind of work is being done* — the question it answers, the thinking required. Files are containers; a single file may hold sections authored by different levels. For example, SPECIFICATION.md holds L2-authored sections (identity, boundaries, technical shape), an L3-authored section (capability inventory), and an L4-authored section (feature-inventory summary). Each level writes the parts of files that fall under its authority, and reads whatever files hold relevant thinking. This is why "does L3 read L4?" is a malformed question — L3 reads files; what matters is whether L3's derivation is contaminated by content authored at or below its own level. The discipline is about *what authority flows where*, not *which files get opened*.

## Agent context cascade

Agents descending the directory tree load context progressively: each level's `CLAUDE.md` adds only the rules specific to that level. No level repeats what an upper level already covers; no level holds rules that belong deeper. The cascade is monotonically informative — every step adds signal, never noise.

The cascade mirrors the architectural decomposition. Whatever the L2 entity inventory and ADR-U023 define as a unit gets its own `CLAUDE.md` when that entity is active. Five levels:

| Level | Lives at | Examples |
|---|---|---|
| Root | `./CLAUDE.md` | Universal project rules |
| Tier | `docs/{tier}/CLAUDE.md` | products, platform, studios, design-system, verticals |
| Sub-tier (only at platform) | `docs/platform/{sub-tier}/CLAUDE.md` | core/, domain/, extensions/ |
| Entity | `docs/{tier}/{entity}/CLAUDE.md` | hub, gimbal, journey-studio, privacy, identity, ... |
| Sub-entity (where divergence is sharp) | `docs/{tier}/{entity}/{sub-entity}/CLAUDE.md` | universe-studio/world-studio/, universe-studio/arc-studio/, universe-studio/journey-studio/ |

Sub-entity `CLAUDE.md` files are written only when the sub-entities have genuinely divergent rules — Universe Studio's children (World, Arc, Journey Studios, ADR-U026) are the canonical case. Sub-entity is opt-in by divergence; it is not authored speculatively. (The former canonical case, Gimbal-iOS vs Gimbal-Android, was dissolved by ADR-U025 — devices are points in equipment space, not entities.)

Design system is a tier-only entity — the layer has no entities below it. The existing `docs/design-system/CLAUDE.md` *is* the entity CLAUDE; no separate entity-level file is needed.

The five-row content policy (must contain / may contain / must not contain at each level) is canonical in root `CLAUDE.md`. Tier and entity `CLAUDE.md` authors check against it. The `doc-health-check` skill verifies cascade integrity at cycle boundaries: presence (every active entity has a `CLAUDE.md`), categorisation (entity-specific patterns flagged at tier level for review), and load-order pointers.

The principle's load-bearing case is autonomous-sub-agent scaling. A sub-agent working in a single entity should load the entity's rules without inheriting siblings' rules as bloat. The cascade enforces this; without it, every entity-specific rule lifted to tier level costs every sibling's sub-agent on every load.

## The decomposition hierarchy

```
Level 1: VISION          docs/ecosystem/VISION.md
Level 2: ENTITIES         docs/products/{name}/, docs/platform/{tier}/, docs/studios/{name}/
Level 3: CAPABILITIES     Capability inventory section of the entity's SPECIFICATION.md
                          (authoritative statement — derived fresh from L1 and L2)
Level 4: FEATURES         docs/{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md
                          (Stories with Given/When/Then embedded within)
Level 5: TASKS            docs/planning/backlog/tasks/TASK-{NNN}.md
```

Each level answers a different question:

| Level | Name | Question | Frequency |
|-------|------|----------|-----------|
| 1 | Vision | Why does this ecosystem exist? | Rarely (constitutional) |
| 2 | Entities | What are we building and for whom? | Occasionally |
| 3 | Capabilities | What should this entity do, who owns each piece internally, what depends on what? | Per entity, on entry points |
| 4 | Features | How is each capability specified? | Regular |
| 5 | Tasks | What implementation work is needed? | Daily during build |

Each level feeds the next through **authoritative derivation**: the lower level derives its output from the upper level. Upstream authority flows strictly downward. Existing artifacts below a level never shape that level's output during derivation; they are reconciled against the authoritative output as a separate, downstream activity.

---

## Level 1 — Vision

**Activity:** Stating why the ecosystem exists and what constraints bind every entity within it.
**Frequency:** Rarely — constitutional; changes only through deliberate locked decisions.

### Upstream-thinking dependencies

None. Vision is constitutional — there is no level above it.

### Read context

- `docs/ecosystem/MANIFESTO.md` — the cultural and values companion; consult to keep Vision and Manifesto in harmony.
- `docs/ecosystem/universe/` — world-building content that Vision references as structural concepts (the worlds topology and role taxonomy — canonical cores under `cosmology/` and `roles/` — and the Whisp, `beings/`). Consult for naming and conceptual alignment.
- `docs/ecosystem/thinking/OPEN_QUESTIONS.md` — ecosystem-level open questions that may inform revisions.

### Write scope

- `docs/ecosystem/VISION.md` — entirely.

### Output

VISION.md. One page. Contains purpose (the three founding questions), character statement, structural concepts (FIM with the Mist-to-FIM transcendence/metamorphosis threshold, the worlds, the Whisp, Three Perspectives, Dreamineers — per VISION v1.2, aligned to the canonical cores), non-negotiable principles, ecosystem boundaries, and ecosystem composition.

Does not contain: specific entity descriptions (L2), capability lists (L3), feature specs (L4), roadmaps or wave scopes (planning tree), technical architecture (architecture tree).

### When L1 runs

- First-time ecosystem definition
- A locked decision (ADR-level) reshapes ecosystem purpose or boundaries
- The Manifesto or universe content surfaces a conflict with Vision that must be resolved

### What happens when upstream is inadequate

L1 has no upstream. It cannot be blocked from above. If the Manifesto or universe content is missing or contradictory, that is a parallel problem — L1 can proceed alone or in tandem, but its output stays authoritative.

### Handoff to L2

L2 reads Vision to know what categories of entities exist and what principles every entity must honour. L2 does not read Vision to learn which specific entities to create — that decision is L2's own, constrained by Vision's principles.

---

## Level 2 — Entities (Products, Services, Studios, Design System, Verticals)

**Activity:** Defining the concrete entities the ecosystem is made of — their identities, boundaries, and technical shape.
**Frequency:** Occasionally — when an entity is added, revised, or has its boundaries clarified.

### Upstream-thinking dependencies

- **L1 thinking complete.** Every entity's purpose must trace back to Vision. Without Vision stable, entity definitions are unanchored.
- **Architectural anatomy locked.** Entities must fit the ecosystem anatomy. An entity that doesn't fit is a signal that either the entity is wrong or the anatomy needs revision — not a signal to write the entity and let it contradict the anatomy.

### Read context

- `docs/ecosystem/VISION.md` — as authority on purpose.
- `docs/architecture/ECOSYSTEM_ANATOMY_V6.svg` and its defining ADRs (ADR-U023, ADR-U002) — as authority on structure.
- Sibling entity DESCRIPTION.md files in the same category — for boundary coherence; your entity's boundaries are defined against its siblings.
- `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md` and similar locked strategy documents.
- Any ADR that specifically constrains this entity (e.g., ADR-U004 for visitor access when writing The Hub).

### Write scope

- `{entity}/DESCRIPTION.md` — entirely.
- The identity, boundaries, and technical-shape sections of `{entity}/SPECIFICATION.md` (§1 Surface / §2 Architecture position / §3 Auth & authorization / §4 Data ownership / §5 Public API surface / §6 Cross-product contracts / §7 Operational concerns / §8 Open spec questions in the current template).
- `{entity}/ROADMAP.md` — the roadmap file is entity-owned; L2 may produce it when the entity enters active development.
- `{entity}/CLAUDE.md` — the entity's agent-context file. L2-owned because its content is derivative of the entity's identity and technical shape. Substantive when the entity has entity-specific rules, gotchas, or tooling instantiations; a minimal stub pointing upward to the tier file when the entity has no rules beyond what tier covers. See "Agent context cascade" above for the cascade structure and the five-row content policy.
- Updates to `docs/README.md` structure map when a new entity is added.

L2 does NOT own or touch the capability-inventory section of SPECIFICATION.md (L3's property) or the feature-inventory summary section of SPECIFICATION.md (L4's property).

### Output

Per active entity:
- **DESCRIPTION.md** (outward-facing — identity, target users, core experience, boundaries, relationships).
- **SPECIFICATION.md** (inward-facing — L2's sections covering technical shape).
- **ROADMAP.md** if entering or advancing through active development.

For placeholder entities, L2 may produce only DESCRIPTION.md, deferring SPECIFICATION.md and ROADMAP.md until active development.

### When L2 runs

- An entity enters active development for the first time.
- Boundaries between existing entities need clarification.
- An architectural change (ADR) revises the entity set or its shape.
- A new product, domain service, studio, vertical, or design-system element is added.

### What happens when upstream is inadequate

- **Vision missing or stale:** hard block. Run L1 first.
- **Architectural anatomy unstable:** hard block. Architectural work first.
- **Sibling entities undefined:** soft pause. You can write this entity's DESCRIPTION.md with boundary statements that remain provisional; surface the gap as a decision point.
- **Relevant ADRs still in flight:** case by case. Writing prematurely usually means rewriting; surface as a decision point.

### Handoff to L3

L3 reads DESCRIPTION.md to know what the entity *is* (identity and boundaries), and reads L2's sections of SPECIFICATION.md to know the entity's current technical shape. L3 does not read existing capability-inventory content (if any), existing feature-inventory summaries, or existing feature specs — those would contaminate L3's fresh derivation.

---

## Level 3 — Capabilities (or obligations, or vocabulary — see L3 content-type variants below)

**Activity:** Authoritatively stating what an entity should do — its inventory at L3, internal ownership, internal and external dependencies, and vertical impact.
**Frequency:** Per entity, on entry points (entity entering active development; DESCRIPTION.md materially revised; architectural shift redrawing boundaries).

L3 runs per entity by default. Per-set invocations (e.g., all domain services at once) are valid when the work is legitimately cross-entity — boundary coherence across a category. Name the set explicitly when invoking in this mode.

### L3 content-type variants

The L3 inventory takes one of three shapes, depending on what kind of entity it describes. The position in the document is the same (§L3 in SPECIFICATION.md); the *content type* differs because of what the entity structurally is. The L2/L3/L4 partition skeleton is universal across all entity kinds; only L3's content type varies.

| Variant | Used by | What the inventory contains | Template |
|---|---|---|---|
| **Capability inventory** | Products, Studios, Domain Services, Platform Core areas | Caller-facing operations the entity provides. Each row: a capability with internal owner, internal/external dependencies, vertical impact. | `docs/templates/product-specification.md`, `docs/templates/studio-specification.md`, `docs/templates/domain-service-spec.md`, `docs/templates/platform-core-spec.md` |
| **Obligation inventory** | Verticals | Rules the vertical levies on every other entity. The inventory does not own capabilities of its own — it specifies what other entities must do. | `docs/templates/vertical-spec.md` |
| **Vocabulary inventory** | Design System | Three sub-inventories — tokens, components, patterns — each with its own attribute shape. The entity owns a vocabulary that consumers compose into their own capabilities. | `docs/templates/design-system-specification.md` |

The rest of this Level 3 section uses *capability* as the running example (since four of the six entity kinds use it), but the same upstream-thinking, read-context, write-scope, and downstream-handoff rules apply to all three variants. The structural difference is what the inventory contains, not how it is derived or whose authority owns it.

The vocabulary variant is the newest of the three; G-26 in `docs/ecosystem/how-we-work/gaps.md` tracks its acknowledgement here. With this section in place, G-26 is closed.

### Upstream-thinking dependencies

- **L1 thinking complete.** Capabilities serve ecosystem purpose.
- **L2 thinking complete for this entity.** The entity's identity and technical shape must be stable; capability derivation on a shifting L2 base inherits the instability.
- **Architectural anatomy locked.** Capabilities route to owners defined by the anatomy.
- **Vertical obligations defined as a category** (ADR-U002). Individual vertical specs may be scaffolds (G-03) — that's accepted and surfaced as a remark; what's required is that verticals exist as a concept.

### Read context

- `{entity}/DESCRIPTION.md` and L2's sections of `{entity}/SPECIFICATION.md` — the entity's authority as defined upstream.
- `docs/ecosystem/VISION.md`, `docs/architecture/ECOSYSTEM_ANATOMY_V6.svg`, ADR-U023, ADR-U002 — ecosystem-wide constraints.
- Sibling entities' DESCRIPTION.md — for boundary coherence (a capability that overlaps a sibling's territory is a signal of either a boundary problem or a cross-entity capability that belongs elsewhere).
- `docs/verticals/{name}.md` — as scaffolds, per G-03 — for vertical-impact obligations.

Pre-refactor feature specs (legacy FEAT-*.md files under `{entity}/features/`) may be read at L2 or at the start of L3 as **inspirational input only** — they sometimes surface questions or edge cases that upstream thinking should address. They have no authority. Any insight worth keeping is absorbed into DESCRIPTION.md, SPECIFICATION.md, or the capability inventory under current authority. L3 does not read them during derivation itself. L4 does not read them at all.

L3 does NOT read: existing capability-inventory content (if any), existing feature-inventory summaries, current feature specs, or code. These are reconciliation material, not source material.

### Write scope

- **The capability-inventory section of `{entity}/SPECIFICATION.md`** — authoritative. L3 is the sole author of this section.
- `{entity}/ROADMAP.md` — the sequencing layer over the capability inventory, if produced or updated in the same run.

L3 does NOT touch DESCRIPTION.md, L2's sections of SPECIFICATION.md, L4's feature-inventory summary in SPECIFICATION.md, FEAT-*.md files, or any file outside the entity's directory (except for updating cross-reference tables in sibling entities if L3 surfaces a cross-entity capability that belongs to the sibling).

### Output

The capability-inventory section of SPECIFICATION.md. Contains:

- **Capability-to-internal-owner table:** each capability named, placed under its internal owner within the entity, with internal and external dependencies and vertical impact.

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

- **Dependency chain** — prose or diagram showing the order in which capabilities become buildable.
- **External dependencies** — capabilities from other entities this entity consumes.

No status column. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output. Keeping status out of the inventory keeps L3's authority over *what should be* uncontaminated by *what currently is*.

### When L3 runs

- Entity entering active development — fresh derivation of the full capability inventory.
- DESCRIPTION.md or L2 sections of SPECIFICATION.md materially revised.
- Architectural change (ADR) that redraws the entity's internal structure or external boundaries.
- Discovery that the entity is missing a capability its purpose implies — surfacing usually happens during reconciliation or wave-planning downstream.

Not triggered by: wave planning (horizontal axis consumes L3 output, doesn't cause it), feature writing (L4 consumes L3 output), code review (reconciliation is a separate downstream activity).

### What happens when upstream is inadequate

Surface one issue at a time, in dependency order (upstream first). For each issue, present to the user: what the issue is, why it matters, and three options — **create/fix upstream first**, **proceed with a remark** (recorded in the inventory's Sources-status block and in `gaps.md`), or **discuss**.

- **L1 thinking stale:** hard block.
- **L2 thinking stale for this entity:** hard block.
- **Anatomy unstable:** hard block.
- **Vertical specs are scaffolds:** soft — proceed with remark, cross-reference G-03.
- **Sibling entities undefined:** soft — proceed with remark noting boundary claims against that sibling are provisional.

### Handoff to downstream

Two downstream activities consume L3's output, independently:

- **Reconciliation** — compares the authoritative inventory against existing specs and code; produces a delta report. This is a separate activity, not part of L3. Its home is under review (G-20).
- **L4 — feature specification** — takes capabilities from the inventory and writes fresh specs for them.

L3 does not care which runs first or which runs at all. Its authority is stated and stable; downstream consumers measure against it.

### Stress-test pass — code-informed completeness probe during L3 authoring

The L3 capability inventory derives cold from L1 + L2. Cold derivation alone, however, cannot determine which L2-committed capabilities are *implemented* and which are merely *planned* — that information lives in code, not in upstream sources. The architecture-derived inventory will therefore default-classify every capability as current-commitment, which is wrong for any L2-committed capability that the codebase has not yet realised. The stress-test pass is the structural fix for this: a code-informed comparison run after cold derivation but before the inventory is committed, which produces forward-commitment classification grounded in empirical state.

The pattern has three steps and a strict ordering:

1. **Architecture-derived inventory.** Author the candidate inventory cold from L1 + L2 with no reference to existing artifacts. Output is the candidate authoritative L3 section.
2. **Code-informed stress-test pass.** Open existing artifacts (codebase, feature description files, working specs) as adversarial input. Compare candidate against artifacts. Produce a structured delta in three classes (see below).
3. **Adjudication.** Reconcile the delta. The candidate inventory is updated only where the architecture *agrees*, never because the code says so. Code that has no architectural home becomes a finding, not a feature.

Direction of authority is preserved across the pattern. The candidate artifact comes first; code stress-tests it; code never sources it. The pattern is deliberately named *stress-test*, not *derivation* — *derivation* would license sourcing capabilities from code; *stress-test* only licenses noticing when the candidate is incomplete, wrong, or under-classified.

The delta produced by the stress-test pass has three structurally distinct output classes:

| Class | Meaning | Downstream handling |
|---|---|---|
| **Confirms** | Architecture-derived item has a clear empirical analogue | Logged for traceability; used to refine forward-commitment classification (current vs partial-forward vs full-forward) for the candidate row; no further action |
| **Entity-internal delta** | Architecture-derived item without analogue (gap), or empirical thing that maps to a candidate item with a different shape | Reconciled into the candidate artifact under L3 author's judgment |
| **Cross-entity findings** | Empirical artifact has a thing that doesn't map to the candidate at all *and* doesn't belong inside this entity — it belongs in another entity's L3 | Routed via the lateral-routing mechanism (G-29 — pending resolution; meanwhile, recorded as caveats in the inventory's Sources-status block) |

The cross-entity output class is what turns the stress-test pass from "efficient delta-detection" into "structural-completeness probe." When the L3 stress-test for one entity surfaces something that belongs in another entity, the finding must not be silently dropped; it has to land somewhere structured for that other entity's future L3 work to inherit. Cold derivation can also produce cross-entity findings ad-hoc when L1 + L2 surface unmet architectural claims; the stress-test pass is the *primary structured generator* of such findings, but not the only one.

Three further notes on operating the pattern:

- **The comparison instrument should be the most direct code-grounded artifact available.** When a corpus has been synthesised twice (once into capability clusters, once into the entity's internal-area structure), the first synthesis is the better comparison instrument because the second synthesis tests layout concordance more than empirical concordance.
- **Forward-commitment classification is three-way, not binary.** Current-commitment / partial forward-commitment within the active wave / full forward-commitment beyond the active wave. The three-way classification has implications for wave-planning (which rows count as in-scope) and L4 derivation timing (forward-commitment rows can't be feature-spec'd until upstream activates).
- **Backward-edits to closed areas pause for review.** Once a sub-section of the candidate inventory has been adjudicated, structural changes to it during a later area's adjudication wait for explicit review at the parent scope. Without this discipline, mid-session backward-edits drift the inventory out from under prior decisions.

The pattern was first practised during Block B.2 (Hub L3 capability inventory authoring, 2026-04-30) and then ratified across four Platform Core entities (PC-1 Infrastructure, PC-2 Identity, PC-3 Organisation, PC-4 Governance) in Phase 2. At n=4 ratification (Phase 2 close-out, 2026-05-16) the pattern is treated as standing methodology for all L1→L3 derivation work; the five named disciplines below were extracted from the recurring shapes that surfaced during that ratification.

Distinction from the reconciliation activity below: reconciliation is a *downstream* activity that compares the *committed* L3 inventory against existing specs and code as a separate work product. The stress-test pass is *part of L3 authoring* — it runs before the inventory is committed and ensures the committed inventory is honestly classified. The two activities do different work: stress-test fixes classification before commit; reconciliation produces a delta after commit. Both can produce cross-entity findings; both route them via G-29.

### Named disciplines (ratified at n=4)

Five disciplines surfaced repeatedly across PC-1, PC-2, PC-3, and PC-4 L1→L3 derivations and are now named for L3 authors to apply from the start. Each was promotion-watched across at least three entities; Phase 2 close-out (2026-05-16) ratified all five. Three more were promotion-watched across the Domain Services descents and the five vertical derivations; the verticals close-out (2026-06-12) ratified them.

**Cumulative-forward read order (A#8).** When stress-testing a cold derivation against `supabase/migrations/`, read migrations in chronological order from earliest to latest. A function or table that appears absent in one migration may be defined in a later one; single-snapshot reads will produce false-positive "doesn't exist" findings. Ratified at PC-3 Step 2 (`is_platform_admin()` retraction); confirmed tier-agnostic at PC-4 (applies at TS-tier consumer chains too).

**Framework-provided contract mechanisms (A#9).** Before declaring an entity's contract surface at §3 / §7, explicitly check for framework-provided mechanisms — Supabase PostgREST RPC for `*_rpc` functions, Next.js Server Actions, Supabase Realtime channels. Cold derivation tends to hypothesize custom HTTP APIs that the framework already provides. Ratified at four convergent contexts at PC-4 (admin RPCs consumed via PostgREST from lib + route + UI tiers).

**Sub-batch-of-1 multi-Edit cadence (A#5).** When applying multiple Edits to a single spec, run them one at a time with a pause between each rather than as a batch. Batches fail emission more often (real undercount) and produce false-positive emission-failure signals (UI-sequencing). Sub-batch-of-3 is opt-in only after discipline holds across a session. Ratified at PC-4 Step 3 (29 Edits at sub-batch-of-1; no emission failures).

**Schema-predates-partition (PW-1).** Existing schema entities (tables, functions, triggers, RLS policies) predate the Platform Core / Domain Services partition. When stress-testing cold derivations against schema, expect mismatches between entity-partition lines and schema-cut lines. Mismatches are temporal, not architectural defects — do not reach for ADR amendments or migration splits. Document as Step 2 findings; route through normal pickup channels. Ratified across PC-2, PC-3, PC-4 Step 2 (D15 monolithic rebuild commit `ce58227` crosses PC-1/PC-3/PC-4/DS-* boundaries in 2,223 lines).

**Repo-specific actor primitive (P-O1).** Cold derivation drifts toward Supabase-canonical `auth.uid()` as the actor. This repo overrides — the actor is the caller's personal group ID, resolved through a four-hop chain (`auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`). At Step 1, write §3 contract surface and §6 auth-and-authz against the four-hop chain, not `auth.uid()` directly. Ratified at PC-3 + PC-4 Step 2.

**Seeds directory in canonical-table reads.** The live database state is migrations plus `supabase/seeds/` together. Permission catalogs, system groups, and other seed-defined rows have their realized point of definition in `supabase/seeds/*.sql`, not in migrations — a migrations-only read or sweep produces false zeros (the 44-row permission catalog; the `[Deleted User]` sentinel wiring; the V5 `publish_journey` probe). When enumerating realized substrate, include the seeds directory in the read set and in every search scope. Ratified at the verticals close-out (n=5: DS-7 ×2, Extension System, V2, V5).

**Constitutional-docs authority slot.** Every L1→L3 derivation consumes the three constitutional documents (VISION.md, MANIFESTO.md, PRINCIPLES-AI.md) as a standing authority-chain slot — checking each for both mandate-sided and constraint-sided force on the entity, and recording a verified zero when one doesn't bind. Fired at all five vertical derivations (full three-doc consumption at V2; inverted-constraint at V4; both-sided at V1; constraint-sided at V3/V5) after first firing at DS-7 and the Extension System. Ratified at the verticals close-out (n=7).

**Step-1 realization claims need a disk anchor.** A cold derivation that claims any capability, tooling, or substrate is *realized* must carry a disk anchor (a verified file/line or calibration-block entry) — or explicitly mark the claim design-locked / lock-only / unrealized. ADR and migration prose is not evidence of realization ("a pg_cron job cleans up" with pg_cron zero on disk; "immutable audit log" prose over a rebuilt table with a live mutation path; "may introduce basic Stripe integration" with zero Stripe substrate). Ratified at the verticals close-out (n=5: the V2 retraction as the without-case; V4 decisive prevention; V1/V3/V5 clean holds at pre-named traps).

### Reader tours — post-§L3 maturity gate

After §L3 lands and is committed, the entity is not done. Two reader tours follow as a maturity gate before the entity is treated as L3-mature: a HUMAN tour admitting an uncredentialed audience, and a TECHNICAL tour admitting a contributor prerequisite. Both live as markdown files in a `tours/` subdirectory at the entity root: `{entity}/tours/HUMAN.md` and `{entity}/tours/TECHNICAL.md`. Markdown is the source of truth; `.docx` exports are distribution artefacts and are not committed.

Tours are an exposition layer over §L3 — they re-present the inventory in two voices. They do not replace DESCRIPTION.md (which remains a derivation source) and do not modify §L3. The HUMAN tour is the artefact a non-technical reader meets the entity through; the TECHNICAL tour is the artefact a contributor scans before opening SPECIFICATION.md.

**Internal structure of each tour is determined per-entity based on the entity's legibility needs.** The Hub instance (the first instance, 2026-05-03) organised both tours by internal area; whether that organisation generalises will be informed by the second instance, since Platform's legibility problems differ structurally from Hub's. Internal-shape convergence (or non-convergence) is determined by the second instance, on the same n=2 discipline applied to stress-test-pass promotion elsewhere in this document.

**Backfill obligation for entities with already-shipped §L3.** Tracked as G-32 in `docs/ecosystem/how-we-work/gaps.md`.

---

## Level 4 — Features (with Stories embedded)

**Activity:** Writing authoritative, buildable specifications for capabilities from L3's inventory.
**Frequency:** Regular — as capabilities are selected for development or as specs advance through maturity.

L4 derives feature specs fresh from the L3 inventory. Existing pre-refactor FEAT-*.md files are not read at L4 — their inspirational value has already been absorbed into L1/L2/L3. Fresh derivation under current authority is the discipline that keeps pre-refactor assumptions from silently re-entering the system.

### Upstream-thinking dependencies

- **L3 complete for this capability.** The capability exists in the inventory with internal owner, dependencies, and vertical impact named.
- **L2 current for this entity.** Feature specs reference DESCRIPTION.md and L2's sections of SPECIFICATION.md for context and must not contradict them.
- **Relevant ADRs stable.** Any ADR binding on the feature's shape is already written and locked.
- **Derivation chain clean above.** If any of L1/L2/L3 is inadequate, L4 inherits that inadequacy.

### Read context

- `{entity}/SPECIFICATION.md` capability-inventory section — the authoritative source.
- `{entity}/DESCRIPTION.md` and L2 sections of SPECIFICATION.md — for identity, boundary, and technical context.
- Binding ADRs.
- Sibling feature specs this feature legitimately depends on — for cross-reference (not for inspiration or salvage).
- `docs/verticals/{name}.md` — for Vertical Impact obligations (currently scaffolds — G-03).
- Template: `docs/templates/feature-spec.md`.

L4 reads zero pre-refactor FEAT-*.md files.

### Write scope

- **FEAT-*.md files** under `docs/{owner}/features/` — entirely. Includes YAML frontmatter (id, title, owner, consumers, wave, maturity), body content at the current maturity, and implementation notes at 6-done.
- **`{owner}/features/README.md`** — the feature index.
- **The feature-inventory summary section of `{entity}/SPECIFICATION.md`** — L4's reconciliation output against L3's capability inventory. Shows which capabilities have specs, at what maturity, and which remain unspecified. Updated **in the same commit** as any FEAT-*.md change that affects it — spec creation, maturity advance (including 4→5, 5→6), deletion, or retroactive spec write. Updates triggered by maturity 4→5 and 5→6 transitions happen during the `feature-development` skill's execution; the update is still L4's property, the skill just carries it out. The `doc-health-check` skill §8 verifies this section reflects the actual state of `features/` at cycle boundaries.

L4 does NOT touch: DESCRIPTION.md (L2), capability-inventory section of SPECIFICATION.md (L3), TASK-*.md files (L5), anything outside its owner's directory (except the feature-inventory summary in the entity's SPECIFICATION.md).

### Output

Per feature: a FEAT-*.md spec with YAML frontmatter, problem statement, solution sketch, appetite, rabbit holes, no-gos, stories with Given/When/Then acceptance criteria, platform dependencies, cross-product impact, vertical impact for all five (or six, per template's current state) verticals with explicit content or "None" — no blanks.

At maturity 6-done: Implementation notes section replaces Solution sketch / Appetite / Rabbit holes, documenting what was actually built.

The YAML `wave:` tag is populated by wave-planning work, not by L4. L4 may leave the tag empty, placeholder, or set only when wave-planning has decided the wave.

### Decomposition verification walks (paired specs)

Bound by cycle retros (J-A n=1 → J-D n=3; structural catches at J-C and J-D):

- **The payload walk.** When a platform contract spec is written ahead of its surface consumer, the decomposition session walks the consuming stories against the proposed payload shape before either spec is declared `4-ready`: every field a story renders or mutates traces to a named key in the proposed payload, and every proposed key to a consumer. Misses found at build are decomposition faults, not build riders (the `get_journey_detail` lesson; the J-D `enrollment_id` rider).
- **Concurrency ACs get a topology check.** An acceptance criterion describing a race is checked against the ordering the substrate already imposes — if that ordering makes the described shape impossible (e.g. linear gating totally orders required steps), rewrite the AC to the race that can actually exist (J-C: "two racing last required steps" → two racing completes of the same final step).

### When L4 runs

- A fresh L3 derivation has landed for an entity — full feature-spec layer is written from scratch. **All pre-refactor FEAT-*.md files for that entity are deleted** as part of the same commit that lands the new specs (per Resolution A / (a) — see "Reconciliation is a separate activity" below). Git history preserves the originals. The feature-inventory summary in SPECIFICATION.md is replaced wholesale to reflect the new spec set.
- L3 has been revised for specific capabilities — L4 runs on those capabilities only. Affected rows in the feature-inventory summary are updated in the same commit.
- A feature needs to advance in maturity (2 → 3 → 4). The feature-inventory summary row for that feature is updated in the same commit.
- A feature advances through maturity 4 → 5 or 5 → 6. These transitions are carried out by the `feature-development` skill (task creation at 4→5, Implementation notes at 5→6), but the summary-row update is still part of that work.
- Implementation notes need to be written after a feature reaches 6-done.

Not triggered by: cycle start (L5 decomposes ready features into tasks), code change (reconciliation produces work, which may be tasks or spec revisions — but code does not cause L4 to run spontaneously).

### What happens when upstream is inadequate

- **L3 inventory missing or stale for this capability:** pause L4, run or update L3 first.
- **L2 stale:** pause L4, run L2 first.
- **ADR in flight:** pause this feature; either wait for the ADR, or write the spec as `parked: true` with `parked_reason` pointing at the ADR.
- **Capability ambiguity in the inventory:** pause L4, escalate to L3 maintenance.

Each pause surfaces the specific inadequacy and presents the three options: fix upstream first, proceed with remark, or discuss.

### Handoff to downstream

- **L5 — Tasks.** Once a feature reaches 4-ready, stories become raw material for tasks.
- **Reconciliation — Code delta.** The spec is compared against existing code to produce the four-state delta (fully correct / partially implemented / missing / implemented wrong). Delta becomes cycle work.
- **Wave-planning** (horizontal axis) may tag the feature with a wave, but this is wave-planning's activity, not L4's.

---

## Level 5 — Tasks

**Activity:** Mechanically decomposing a maturity-4-ready feature's stories into discrete, sized, sequenceable work items.
**Frequency:** Daily during build cycles, only for features pulled into the active cycle.

L5 is unique in the cascade: its output is **ephemeral**. TASK-*.md files travel through the kanban and are deleted after the cycle retrospective is committed. Only L5 lives in the planning tree; everything upstream is permanent.

### Upstream-thinking dependencies

- **L4 complete at 4-ready for the feature.** Stories have firm Given/When/Then acceptance criteria. Tasks cannot be generated against vague criteria.
- **The feature is being pulled into an active cycle.** L5 does not run speculatively.

### Read context

- The FEAT-*.md spec — primary source.
- Cross-referenced feature specs for dependencies.
- The `feature-development` skill's execution mechanics — how-to, not authority.
- Tier `CLAUDE.md` and `AGENTS.md` — for agent-routing context.
- Template: `docs/templates/task.md`.

L5 does not read: code (tasks are written before implementation begins), ADRs as primary (if binding, they're already reflected in the spec), upstream entity or vision files (resolved before L5 runs).

### Write scope

- **TASK-*.md files** under `docs/planning/backlog/tasks/` — entirely.
- **Kanban status** of tasks (the `status` field).

L5 does NOT touch the feature spec. If implementation reveals the spec is wrong, the correct move is to suspend task work, bounce to L4 for spec update, and regenerate or resume tasks. Tasks never "drift" to reflect changed understanding.

### Output

One TASK-*.md per task. Well-formed task: sized to roughly one focused agent session, parent feature named, dependencies on other tasks named (`depends_on`), acceptance check present, tagged with product/tier/wave.

Collectively, tasks for a feature cover every story in the spec.

### When L5 runs

- A feature at 4-ready is pulled into the active cycle.
- A task is too large and needs to be split.
- A story is added mid-cycle (rare; forces L4 bounce first, then L5 regenerates).

### What happens when upstream is inadequate

- **Story lacks concrete Given/When/Then:** pause L5, bounce to L4.
- **Platform dependencies named but upstream spec not yet at 4-ready:** pause L5.
- **Story is obviously too large:** pause L5, bounce to L4 for splitting.

Because tasks are ephemeral, pauses are cheap — no artifact gets poisoned.

### Handoff to downstream

Not a decomposition handoff. L5 is the bottom of the vertical axis. Downstream is **execution** — owned by the `feature-development` skill (code writing, tests, review). Execution is not a decomposition activity.

---

## Reconciliation is a separate activity, downstream of derivation

L3 and L4 produce authoritative output derived fresh from upstream. Existing artifacts (pre-refactor feature specs, current code) are never read during derivation. They are compared against the authoritative output as a separate activity called **reconciliation**, which produces a delta report.

Two reconciliations exist:

- **Inventory-against-existing-specs** reconciliation, run after a fresh L3 derivation. Classifies existing pre-refactor specs into aligns-delete-after-absorb-of-insight / contradicts-delete-outright / orphan-delete-outright. Under the Resolution A / (a) lock, all pre-refactor specs are deleted after their inspirational value is absorbed into L1/L2/L3.
- **Spec-against-code** reconciliation, run after L4 specs are authoritative. Produces the four-state delta (fully correct / partially implemented / missing / implemented wrong). Delta becomes cycle work via BDD/TDD.

The home of the reconciliation activity is under review (G-20). Until it's settled, reconciliation runs as a named activity in whatever skill context is active when it's needed.

## Ownership of SPECIFICATION.md is shared across levels

SPECIFICATION.md is a single file with sections authored by different levels under different authority:

| Section | Level that owns it | Authority |
|---|---|---|
| Identity, boundaries, technical shape (Surface, Architecture, Auth, Data, API, Contracts, Operational, Open questions) | L2 | Derived from Vision + Architecture |
| Capability inventory | L3 | Derived fresh from L1 + L2 |
| Feature-inventory summary | L4 | Reconciliation output against L3's inventory |

Each section is written by its owning level; no level modifies a section owned by another level. The `doc-health-check` skill verifies section boundaries hold.

---

## Choosing the right entry point

| Situation | Start at |
|-----------|----------|
| Starting a new ecosystem | L1 — write VISION.md, cascade down |
| Adding a new product/studio/service | L2 — write DESCRIPTION.md + L2 sections of SPECIFICATION.md |
| Mapping an entity's capability space | L3 — write the capability-inventory section of SPECIFICATION.md |
| Cross-entity boundary check | L3 — per-set invocation across the relevant entities |
| Spec out a specific feature | L4 — write feature spec with stories |
| Advance a feature's maturity | L4 — update spec and advance `maturity:` |
| Build a ready feature | L5 — create tasks (then use `feature-development` skill) |
| Document already-built work | L4 — write retroactive spec at maturity 6-done |

Entries related to waves (wave scoping, wave progress, wave DoD) are NOT in this skill. See `wave-planning`.

---

## Quality checklist (any decomposition)

- [ ] Every feature has exactly one owner (product/service/studio)
- [ ] Every feature has a unique ID with the correct prefix
- [ ] Feature maturity level is honest (not inflated)
- [ ] Platform capabilities specified before product features that consume them
- [ ] Cross-product dependencies documented in both directions
- [ ] The features/README.md index is updated for every affected owner
- [ ] No feature duplicates work in another feature
- [ ] The feature-inventory summary in entity's SPECIFICATION.md reflects the current state of features/
- [ ] Vertical impact section is complete — no blanks, every vertical addressed or marked "None"
- [ ] Extensibility addressed — no hardcoded enums, no sealed type systems, no closed permission sets
- [ ] No wave or horizontal-axis references have leaked into vertical-axis output
- [ ] Every cited file path (ADR, skill, sibling spec, template, anatomy diagram) was verified against a directory listing before commit — never inferred from a description, a memory of the filename, or another document's citation. Filenames drift; directory listings are ground truth.
- [ ] Every active entity has a `CLAUDE.md` (substantive or minimal stub stating the entity has no rules beyond tier). Sub-entities have a `CLAUDE.md` only when their rules diverge from the entity. The cascade is verified by `doc-health-check`.

## References

- `docs/templates/feature-spec.md` — feature spec template
- `docs/templates/task.md` — task template
- `docs/templates/product-description.md` — product description template
- `docs/templates/product-specification.md` — product specification template (sections split by owning level; L3 = capability inventory)
- `docs/templates/domain-service-spec.md` — domain service template (sections split by owning level; L3 = capability inventory)
- `docs/templates/platform-core-spec.md` — Platform Core area template (sections split by owning level; L3 = capability inventory)
- `docs/templates/studio-description.md` — studio description template
- `docs/templates/studio-specification.md` — studio specification template (sections split by owning level; L3 = capability inventory with lifecycle-stage column)
- `docs/templates/design-system-specification.md` — design-system specification template (sections split by owning level; L3 = vocabulary inventory — tokens / components / patterns)
- `docs/templates/vertical-spec.md` — vertical specification template (sections split by owning level; L3 = obligation inventory)
- `.claude/skills/wave-planning/SKILL.md` — horizontal-axis counterpart for wave scoping, selection, and progress reporting
- `.claude/skills/feature-development/SKILL.md` — execution skill for building features from 4-ready onward
