# Autonomous L1->L3 session-opener - DS-2 Narrative Engine

**Instance authored:** 2026-06-10
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `4646655` - unrevised since authoring; see Section T below)
**Entity type:** Domain Service (entity 2 of 8 in Platform Domain, Phase 3)
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`](../2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md) (session-close commit `25345e8`; in-session addendum covering DS-1 Steps 2-3 at `1207e2a`; naming decisions parked at `e86e5be`)
**Substantive predecessors (derivation authority for Step 1 carry-forward):** the same DS-1 bridge (including the addendum), the DS-1 Phase 0 delta record [`../2026-06-10_01_-_DS1-DESCENT-PHASE0-DELTA.md`](../2026-06-10_01_-_DS1-DESCENT-PHASE0-DELTA.md), and the Session B conformance register [`../2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`](../2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md) (Section 3 DS-2 row)

> Per-instance session-opener for the autonomous CC run executing DS-2 Narrative Engine L1->L3 derivation, end-to-end. **Second instance of the autonomous L1->L3 template** (PC-4 was the first; DS-1 ran from a custom two-phase opener, not this template). Three-step shape: cold derivation -> code-informed stress-test -> adjudication. DS-1 ran all three steps in one session with a zero-delta Step 2; DS-2 may take the same shape if its Step 2 comes back equally clean. At session-open, the autonomous CC reads this file as its first action and proceeds from Section 1.
>
> Filename note: this instance lands as `ds2-narrative-engine-descent-opener.md` (matching the DS-1 opener's naming), not the template's `cc-{entity}-autonomous.md` convention - a deliberate per-instance deviation, recorded here so Section 13 can adjudicate which convention the pipeline keeps.

---

## Section T - PC-4 template-revision candidates, applied at instance level

The PC-4 closing bridge ([`../2026-05-15_03_-_PC4-LANDED.md`](../2026-05-15_03_-_PC4-LANDED.md), Template revision disposition section) proposed **seven** template-revision candidates and routed them to "DS-1 entry opener authoring or a dedicated template revision session." DS-1 ran from a custom opener, so **none of the seven were ever applied** - the template still sits at its authoring commit `4646655`. This DS-2 opener is the first autonomous-template instance since PC-4. The seven candidates are therefore folded into THIS INSTANCE as explicit instance-level instructions (the template file itself is NOT edited by this opener's authoring):

1. **(highest priority) Section 5b cluster-cadence text clarification.** Compose three-class output between clusters as CC self-reflection discipline (catches retractions early; informs next-cluster scope); surface ONCE at end-of-Step-2 with the full L3 Step 2 block + structured summary. Per-cluster surfacing is NOT a human ratification gate. Folded into Section 5b below as binding text.
2. **(highest priority) Directory-level mixed-tier-scope discipline.** Directory-name-as-shorthand is insufficient for tier-scope determination; run a scope-survey-before-deep-read at directory level (analogous to Cluster S structural-survey at entity level). Folded into Section 5b below.
3. **(highest priority) A#5 cadence applies per-phase, not per-session.** A#5 (sub-batch-of-1) can fire at Step 3 fold-back work even when Step 1 was single-Write; the Section 13 verdict accounts for per-phase cadence shape. Folded into Sections 5a and 5c below.
4. **(lower priority) Migration-name-as-shorthand insufficient for substantive scope-determination** - anchor cluster cadence on substrate-completion artifact identity, not migration-name semantics. Held as a Step 2 watch in Section 5b.
5. **(lower priority) Three-casing systematic dual-reading disposition** - for naming-drift classes, acknowledge BOTH the historical-transition and the surface-idiomatic-convention readings rather than a single by-design-or-by-accident reading. Held as a Step 2 watch.
6. **(lower priority) Cold-position retraction-rate-at-Step-2 as autonomous-vs-manual track methodology indicator** - record this run's retraction rate for the cross-DS-* tracking series (PC-4: 7 retractions across 9 clusters; DS-1: zero-delta).
7. **(lower priority) Section 6 four-partition shape parity** - confirmed at PC-4 as generalizing across entities without modification; record whether it holds at a near-zero-code Domain Service.

**Adjudication instruction:** this DS-2 session's own Section 13 post-run capture must explicitly adjudicate whether these seven candidates finally land as template edits (a `chore(templates)` commit citing PC-4's closing bridge + this run as provenance, updating the template's Revision history table), or whether they continue to ride opener instances. Two instances' worth of evidence (PC-4 surfacing + DS-2 application) is the adjudication basis.

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `1207e2a` (the DS-1 Steps 2-3 addendum commit). Tip may be later - doc-health sweeps (`814395b`, `a682f23`, `d076435`), the skills commit (`b2accba`), this opener's authoring commit, and any STATUS.md update are acceptable interveners. Hard-fail if tip is earlier than `1207e2a`.
4. **Working tree state.** Run `git status`. Expected: **clean** (named explicitly per PC-3 amendment revision candidate #1 - Check 4 enumeration completeness). The Session B handoff's standing root-`CLAUDE.md` modification was resolved 2026-06-10: the G-2 edits were already committed and the residual context-mode block was discarded (its home is the untracked `CLAUDE.local.md`). **Known re-occurrence shape:** if `CLAUDE.md` shows modified and the diff is solely the appended "context-mode - MANDATORY routing rules" block, that is the context-mode plugin re-injecting it - discard with `git checkout -- CLAUDE.md` per the 2026-06-10 disposition and proceed. Any OTHER modification, or any untracked file in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `docs/platform/domain/`: hard-fail.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `4646655` exactly (the seven PC-4 revision candidates were never applied - see Section T). Hard-fail if earlier (template missing or rolled back). **Soft-flag if later** - a template revision landed between opener-authoring and session-open; surface the delta against Section T and adjudicate before proceeding.

After all five pass, report each check's outcome and proceed to Section 2.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

1. **`docs/planning/sessions/2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`** - chronological + substantive predecessor, INCLUDING the in-session addendum at the foot (DS-1 Steps 2-3 zero-delta closure; DS-3 rename parked; STATUS.md DS-2 -> Next). Load-bearing: ratified decisions 1-7 (especially decision 5 Whisp split, decision 6 respawn resolution-vs-delivery), handoff items, carry-forward confirmations.
2. **`docs/planning/sessions/2026-06-10_01_-_DS1-DESCENT-PHASE0-DELTA.md`** - the Phase 0 PC re-check delta record. Informational for DS-2 (no DS-2-specific routing inside); cite for the S43 seam ownership and pg_cron placement context.
3. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - Section 3's DS-2 constraint row is this run's work-order seed: *"seasons/episodes; respawn topologies (plural, nested, in-story); loop textures; NPC character layer promotion (World -> Arc seam)"*. Also Section 6 (execution record + handoff) for standing residue.
4. **`docs/planning/sessions/2026-05-15_03_-_PC4-LANDED.md`** - the PC-4 closing bridge: the seven template-revision candidates (Section T above), the Carry-forward to Phase 3 entry section (six DS-* inheritance priors - see Section 7 below), and the A-candidate ledger snapshot.
5. **`docs/planning/sessions/2026-05-16_01_-_PC-PHASE-2-CLOSE-OUT-LANDED.md`** - Phase 2 close-out: the five named disciplines promoted into the `ecosystem-decomposition` skill at `e9c8a54` (A#5, A#8, A#9, PW-1, P-O1); routings (cross-tier write discipline -> DS-* entry).
6. **`docs/architecture/decisions/PENDING.md`** - two live entries this run consumes: the **Whisp L2 ownership split by face** (DS-1 world-presence / DS-7 being - DECIDED; DS-2 consumes, never reopens) and the **DS-3 rename / Engine-suffix asymmetry** entry (the "Decide alongside" clause covers DS-2's own name - see Section 5a FIRST DECISION).
7. **`docs/platform/domain/world-model.md`** - DS-1's canonical spec. Read for the seams, not the substance: Section 8 Q4 (World -> Arc NPC promotion seam, flagged as a joint question with DS-2's descent), the L3 "NPC world-layer registry" capability row, the Concepts "NPC world-layer" row, the "Severance and respawn resolution" contract family (respawn-position resolution consumed by DS-3, which owns delivery), and the Sources-status line stating that boundary claims against DS-2..DS-7 are **provisional** per the sibling-undefined soft-pause rule.
8. **`docs/ecosystem/universe/narrative/README.md`** - DS-2's nearest canonical ground truth (rewritten at Session B batch G-1): seasons/episodes/A-plot/B-stories; the Respawn section (S19-21, S12) - plural topologies (event-local, round-bounded, day-bounded, episode-bounded), respawn-stays-in-story (home base or episode-repeat), nested-and-scaled respawn, loop textures as a Teller craft palette, the loop-is-the-medium principle.
9. **`docs/ecosystem/universe/cosmology/README.md`** - sections 8 (Anchoring, seeds, and severance - the two-tier severance recovery DS-2's loop framing must stay consistent with) and 10 (the growth gradient - Void distance, not bodily distance).
10. **`docs/ecosystem/universe/beings/README.md`** - the NPCs section (three authorial layers; Character layer = Teller, in Arc Studio; the World Studio -> Arc Studio handoff seam; the inter-studio collaboration protocol open thread, S30).
11. **`docs/platform/domain/README.md` + `docs/platform/domain/CLAUDE.md`** - sub-tier rules; the DS-2 L2 inventory line; the Platform API posture; the Ferd non-closure discipline.
12. **`docs/planning/sessions/openers/STATUS.md`** - confirm DS-2 row is `Next`; this run flips it (see Section 10).

Then verify against disk per the disk-of-record discipline (Section 6 below):

- Spec at `docs/platform/domain/narrative-engine.md` - confirm does NOT yet exist (the run creates it; verified absent at opener authoring). If it exists, hard-fail and surface.
- Entity-level CLAUDE.md at `docs/platform/domain/narrative-engine/CLAUDE.md` - confirm does NOT yet exist. It is a **registered expected placeholder**: `.claude/skills/doc-health-check/SKILL.md` Section 7 registry carries its row. If this run authors the file (DS-1 precedent says yes), **remove that registry row in the same commit** per the registry's rule 2.
- `decisions/PENDING.md` entries present as described above.
- This opener instance at its landing path.

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md`
- **Sub-tier:** `docs/platform/domain/CLAUDE.md`
- **L2 inventory line:** `- **DS-2 Narrative Engine** (`narrative-engine.md`) - Seasons, episodes, story beats` (from `docs/platform/domain/README.md`)
- **Canonical cores (single source of truth - hard precedence per the Session B discipline):** the narrative core (`docs/ecosystem/universe/narrative/README.md`), the cosmology core (sections 8 + 10 especially), the beings core (NPCs section), the roles core (Teller / Dreamineer gating), and the universe-discovery files under `docs/ecosystem/thinking/universe-discovery/` where the cores cite them. For Domain Services the cores ARE derivation input (DS-1 precedent); this extends the template's PC-shaped authority chain deliberately.
- **Conformance constraint:** the Session B register Section 3 DS-2 row.
- **Architectural authority:** ADR-U023 (Platform Core / Domain Services decomposition) + ADR-U025 (products as equipment profiles; the Game as journey depth) + ADR-U026 (studios; Arc Studio and Journey Studio author narrative; the studio write-path pattern) + ADR-U027 (Shadow lifecycle) + ADR-U028 (governance by scope) + ADR-U008/U018 (Ferd non-closure - loop-texture kinds, beat kinds, episode kinds are data-driven registries, never sealed enums).
- **Template:** `docs/templates/domain-service-spec.md` (the L2 sections 1-7 + L3 inventory shape; note its slug enum currently reads `narrative-engine` - see the FIRST DECISION below).
- **Sibling seams (boundary input, NOT capability source):** `docs/platform/domain/world-model.md` - consulted only to re-check the two DS-1 seams named at Section 5a; DS-2 capabilities derive from the cores, never from DS-1's spec.
- **Predecessor carry-forward:** the DS-1 closing bridge's ratified decisions + the PC-4 closing bridge's Carry-forward to Phase 3 entry block (Section 7 below).

**Cold-derivation discipline.** Do *not* read `supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, or any existing `FEAT-*` files during Step 1. The candidate L3 inventory is derived from the cores + L1 + L2 + ADRs + carry-forward priors only. Step 2's stress-test is the structural mechanism for grounding the candidate against disk reality. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input (superseded model - its README says so).

---

## Section 4 - Three-step work shape

The standing L3 pattern is three steps: **Step 1 cold derivation** (no code reads) -> **Step 2 code-informed stress-test** (migrations read cumulative-forward per A#8) -> **Step 3 adjudication with forward-commitment classification**. DS-1 ran all three in a single session because Step 2 came back zero-delta (no DS-1 artifacts in code; all eighteen capabilities classified full forward-commitment). DS-2 may take the same single-session shape if its Step 2 is equally clean - the expectation at Section 5b says it should be. Split-session is legitimate if scope says otherwise. All three steps land, in order, with the checkpoints below.

---

## Section 5a - Step 1 - cold derivation

**FIRST DECISION - before the L2 identity section is authored: the Engine-suffix question.** `decisions/PENDING.md` carries the parked DS-3 rename entry ("Experience Engine -> journey-named") whose "Decide alongside" clause covers the Engine-suffix asymmetry: only DS-2 and DS-3 carry "Engine"; either both keep it or both drop it ("Narrative" / "Journeys"). PENDING.md routes the decision to the DS-3 descent - but DS-2 is now the first of the two to descend, and **this spec's title, filename, and frontmatter slug depend on the answer.** Surface the question for Stefan's ratification BEFORE authoring the L2 identity section. Two legitimate outcomes:

- **(a) Stefan ratifies a suffix posture now** (keep "Engine" on both, or drop on both). Record the outcome in PENDING.md's entry (append, don't rewrite); if DS-2 is renamed, the ripple lands in this session: spec filename + frontmatter slug, the slug enum in `docs/templates/domain-service-spec.md`, the domain README service line, the domain `CLAUDE.md` enumerations, the STATUS.md row, and a check of the SVG/label sweeps the PENDING.md entry names.
- **(b) Stefan defers to the DS-3 descent as PENDING.md planned.** DS-2 keeps "Narrative Engine" / `narrative-engine`, and the spec's Section 8 records a rename-watch consuming the eventual DS-3-descent decision.

Do not author the identity section, the filename, or the slug until one of the two is ratified.

**Activity.** Author the candidate L3 inventory from upstream authority only. Write to `docs/platform/domain/narrative-engine.md` (or the ratified renamed path) the L2-owned sections (1-7 per the domain-service template, plus a Section 7-style service-level invariants block if the substance warrants - DS-1 set the additive-deviation precedent, ratified) and the L3-owned capability inventory + dependency chain + external dependencies + Sources-status block.

**Derivation scope (from the register row + the narrative core):** seasons and episodes (four seasons per year, twelve episodes per season, universal calendar plus adaptive AI personalisation - per the narrative core's planned `seasons-and-episodes.md` sub-page line; the structure is canon even where sub-pages are unwritten); story beats / A-plot / B-stories / sub-plots; **respawn topologies** (plural - event-local, round-bounded, day-bounded, episode-bounded; nested and scaled; in-story always - home base and episode-repeat as the two return shapes); **loop textures** as a Teller craft palette (combat practice, mystery-puzzle, constrained inquiry, reflective grief - data-driven registry, never a sealed enum per Ferd non-closure); what persists across a loop (the loop is the medium); the **NPC character layer** (Teller-authored, Arc Studio write-path); the meta-safety invariant (real felt stakes inside guaranteed reversibility; stories stand alone as entertainment while developmental themes stay invisible in the foundation layer - candidate service-level invariants).

**Two DS-1 boundary seams to re-check and ratify with Stefan** (DS-1's Sources-status records its sibling boundary claims as provisional; each sibling's descent re-checks its DS-1 boundary - this is that re-check for DS-2):

1. **The NPC character-layer promotion seam (DS-1 Section 8 Q4 - a JOINT question with this descent).** World Studio authors body + culture layers into DS-1; the Teller (Arc Studio) adds the character layer via DS-2. The beings core names the World Studio -> Arc Studio handoff as exactly this seam and leaves the inter-studio collaboration protocol an open thread (S30). DS-2's derivation must propose: who may promote (Teller gating via PC-3 `has_permission()` against the Teller template), how the handoff is recorded, and where the character layer's data lives (DS-2 tables referencing DS-1's NPC world-layer rows, or another shape). Ratify with Stefan; the ratified answer resolves DS-1's Q4 - amending DS-1's Section 8 Q4 + NPC rows is in-scope for this run because the sibling-provisional rule anticipates exactly this re-check (cite this opener + the ratification in the amendment).
2. **The respawn three-way split.** Current claim set: **DS-1 resolves the respawn POSITION** (anchor-chain outcome; severance two-tier recovery per cosmology section 8); **DS-3 delivers the respawn EXPERIENCE** (DS-1 decision 6); **DS-2 owns the respawn TOPOLOGIES and loop textures as narrative structure** (which loop unit a story uses, what nests inside what, what a home base is within an arc). Confirm this three-way split holds against the narrative core's respawn section, or revise and ratify with Stefan. Note the narrative core's framing that the cord's two-tier severance recovery "is the same system given a cause and a currency" - the spec must name the seam precisely, not duplicate DS-1's resolution mechanics.

**Whisp consumption (decided - do not reopen).** The Whisp's L2 owner question is CLOSED (PENDING.md: split by face - DS-1 world-presence / DS-7 being). DS-2 owns NO Whisp face. Where DS-2 derivation touches Whisp-adjacent narrative (the Whisp in stories, the FIM-Whisp pair inside a loop), it consumes the split as an external dependency, never reopens it.

**Carry-forward priors** - held actively throughout cold derivation: the five named disciplines ratified at n=4 and folded into the `ecosystem-decomposition` skill (A#5 sub-batch-of-1, A#8 cumulative-forward, A#9 framework-mechanisms, PW-1 schema-predates-partition, P-O1 repo-specific actor primitive `get_current_personal_group_id()`, not `auth.uid()`), plus the PC-4 -> DS-* inheritance priors tabled at Section 7. At a near-zero-code entity most fire only if Step 2 surfaces artifacts; P-O1 and D7 still pin Section 5/6 prose wherever DS-2 names actors or roles (Teller gating especially).

**Watches armed at Step 1:**

- **A#9 (now a named program-level pattern)** - before declaring DS-2's contract surface at sections 3/7, explicitly check for framework-provided mechanisms (PostgREST RPC as the canonical realized HTTP surface at four PC contexts). If the cold position is speculative, tag PW-2-style and let Step 2 resolve.
- **Hypothesis pruning trade-off.** Do NOT over-prune speculative hypotheses just because priors are loaded; write plausible-but-unconfirmable shapes as Section 8 questions tagged speculative-third-shape.
- **L2-line altitude.** Stress-test the L2 line - `Seasons, episodes, story beats` - at the start of Step 1. It predates Session B's canon rewrite and names none of: respawn topologies, loop textures, home base, the NPC character layer. A line revision is a plausible Step 3 output; record at Sources-status, revise at Step 3.

**Step 1 checkpoint surfacing.** After the candidate spec is composed, pause and surface a structured summary to Stefan BEFORE the first Write: capability count by internal area; the L2-line altitude finding; the Section 8 open-questions count; the FIRST DECISION outcome applied; both seam re-check positions; any prior whose application was non-obvious; any speculative-third-shape hypothesis; any drift from the template the substance required. Wait for ratification before Write.

**Single-Write vs split-Edit at Step 1.** Single Write of the full spec is preferred (PC-4 + DS-1 precedent). Per Section T candidate #3: **A#5 cadence applies per-phase, not per-session** - Step 3 fold-back work can be multi-Edit at sub-batch-of-1 even when Step 1 was single-Write; the Section 13 verdict accounts for per-phase cadence shape.

---

## Section 5b - Step 2 - code-informed stress-test pass

**Activity.** Open existing artifacts as adversarial input. Compare candidate against artifacts. Produce a structured delta in three classes (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity findings) and surface phase-wide observations.

**Direction of authority preserved.** Code stress-tests the candidate; code never sources the candidate. Code that has no architectural home becomes a Class 3 cross-entity finding, not a DS-2 capability.

**Expectation - state it, then verify rather than assume.** DS-1's Step 2 established the disk baseline: the 18-table end-state schema contains **no narrative tables**. `journeys` / `enrollments` belong to DS-3; `forum_posts` / `conversations` to DS-5; everything else is PC-2/PC-3/PC-4 territory. The expectation for DS-2 is **near-zero DS-2 artifacts** - a zero-delta Step 2 like DS-1's is the likely outcome. The pass still runs in full: the expectation is a hypothesis Step 2 confirms, and the mop-up greps (story/season/episode/beat/respawn/loop vocabulary) are where a surprise would surface.

**Step 2 disk-evidence scope** - clusters, sized to the near-zero expectation:

- **Canonical-table reads.** `supabase/migrations/` in cumulative-forward order (A#8 - named program-level pattern; tier-agnostic, applies to TS-tier consumer chains too). Trace any narrative-adjacent vocabulary forward from earliest to latest.
- **Migration archeology.** `supabase/migrations/archive/` - the D15 monolithic rebuild (`ce58227`) absorbed 71 prior migrations; check whether any retired migration carried narrative-shaped tables that were lost rather than ported (P11-class asymmetric recovery).
- **Framework-mechanism evidence.** `lib/hooks/`, `lib/utils/supabase/` - A#9 recurrence check at a Domain Service (the originally-named target tier for the pattern's cross-entity test).
- **Type drift.** `lib/types/*` - any narrative-adjacent types (PW-T1: runtime mechanisms may lack TS-type representation and vice versa).
- **Mop-up greps.** Targeted greps for the cold draft's disk-anchor vocabulary (`season`, `episode`, `beat`, `respawn`, `loop`, `story`, `arc`, `npc`, `character`). Per SS-16/SS-17 enumeration-claim-scoping: state the patterns searched; report "no hits within [patterns]," never "no hits anywhere."

**Step 2 cadence - cluster batch-and-report, with the Section T candidate #1 text binding:** compose three-class output between clusters as **CC self-reflection discipline** (catches retractions early; informs next-cluster scope); surface **ONCE at end-of-Step-2** with the full L3 Step 2 block + structured summary. Per-cluster composition is NOT a human ratification gate; CC proceeds between clusters without ratification (autonomous-track posture per the PC-4 carry-forward).

**Section T candidate #2 binding:** directory-name-as-shorthand is insufficient for tier-scope determination - run a scope-survey-before-deep-read at directory level before claiming any directory as DS-2 territory (PC-4's `lib/admin/` was 25% governance-tier; the same mixed-scope shape may appear anywhere).

**Section T candidates #4 and #5 as watches:** anchor any migration cluster on substrate-completion artifact identity rather than migration-name semantics; for any naming-drift finding, record both the historical-transition and surface-idiomatic readings.

**Section T candidate #6:** record this run's cold-position retraction rate for the cross-DS-* tracking series.

**Step 2 checkpoint surfacing.** After all clusters land and the L3 Step 2 block is composed, pause and surface a structured summary BEFORE the Write: finding counts by class; any retractions; any new A-candidates; whether the near-zero expectation held; whether PW-1 had anything to attach to; Step 3 work scope as it emerges. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Activity.** Resolve Section 8 open questions; author the L3 Step 3 block; apply spec amendments per Step 2 findings; **classify forward-commitment per capability** (DS-1 precedent: all eighteen full-forward at a zero-delta Step 2; expect the same shape here unless Step 2 surprises); produce pickup lists; author the closing bridge.

**Required deliverables - not pickup:**

- **Spec amendment / combined Write.** For a single-session zero-delta run, the spec may be authored in one Write with Step 2 + Step 3 outputs included (DS-1 shape). If fold-back Edits are needed: fresh-read before every Edit; sub-batch-of-1 per A#5's per-phase cadence (Section T candidate #3).
- **Seam resolutions folded where they belong.** The ratified NPC-promotion-seam answer amends DS-1's Section 8 Q4 (+ the NPC rows if the ratified shape moves anything) - the one sanctioned cross-entity edit of this run, citing the ratification. The ratified respawn three-way split lands in DS-2's boundary text and, only if revised, in DS-1's.
- **PENDING.md disposition.** Record the FIRST DECISION outcome in the DS-3 rename entry (append-only). ADR amendments are in-scope work if any Q-resolution warrants one; the DS-1-precedent expectation is zero ADR amendments with PENDING.md carrying the candidates instead.
- **Entity CLAUDE.md** at `docs/platform/domain/narrative-engine/CLAUDE.md` (or renamed path) - author if entity-specific rules warrant it; DS-1's precedent says yes (first Domain Service entity CLAUDE at `world-model/CLAUDE.md`). **In the same commit, remove the file's expected-placeholder row from `.claude/skills/doc-health-check/SKILL.md` Section 7's registry** (registry rule 2).
- **Pickup lists** for downstream entities - DS-3 (respawn delivery consuming DS-2 topologies; the Engine-suffix outcome or deferral; journey/episode seam), DS-4 (narrative content blocks vs DS-2 structure), DS-5/DS-6 as touched, DS-7 (Whisp-in-story consumption), Arc Studio / Journey Studio (the write-path each studio gets into DS-2), and the doc-health pickup channel. Each entry names the receiving entity, the substance, and the anchors.
- **Closing bridge** at `docs/planning/sessions/2026-06-10_NN_-_DS2-LANDED.md` (NN = next available index; update the date if the session lands on a different day), per Section 11.

**Fold-back required for canonical runs.** Class 2 deltas fold inline into the final sections 1-7 text at Step 3; the Step 2 block documents the journey, sections 1-7 document the destination.

**Step 3 checkpoint surfacing.** Before authoring the L3 Step 3 block, surface the Q-resolution slate to Stefan (pre-resolved by Step 2 / needs disposition / deferred-routed). Before any cross-entity edit (the DS-1 seam amendments) or PENDING.md disposition, surface its scope. Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

The bouncing-partner cycle's catch-surface is absent in autonomous runs; these disciplines substitute structurally. Hard rules:

- **Fresh-read before every Edit; never construct `oldText` from memory** - even when the prior Edit landed this session.
- **Structural-inventory-before-defect-assertion** - heading count / sentence count / token-occurrence audit before claiming a defect in composed content.
- **Enumeration-claim-scoping (SS-16/SS-17)** - state patterns searched; "no hits within [patterns]," never "no hits anywhere"; watch pattern-variant blindness.
- **Verify-before-asserting on commit-shape claims** - `git log -1 --format=%B <sha>`, never `--oneline`, for shape claims.
- **Cross-section fresh-read before second-touch Edits.**
- **Listing commands use explicit counts** - `ls dir/ | wc -l` or full `ls dir/`, never head-truncated previews.

**Methodology-framing space.** Surface methodology observations alongside substance findings throughout the run, not only at Section 13. Section T candidate #7 asks specifically: does the Section 6 partition shape (here: whatever internal-area partition DS-2's substance produces) generalize at a near-zero-code Domain Service?

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 sub-batch-of-1 (per-phase cadence per Section T #3), A#8 cumulative-forward read order, A#9 framework-provided contract mechanisms, PW-1 schema-predates-partition, P-O1 repo actor primitive `get_current_personal_group_id()`. | Phase 2 close-out (`8976646`); folded into `ecosystem-decomposition` skill at `e9c8a54`. |
| **D7** | Role-name vocabulary is a TEXT-keyed lookup table (`role_templates`), not a PG ENUM. Teller gating prose pins here. | Experiment A Group C item 9; PC-3 Section 5. |
| **Audit-write three-pattern formulation** | If DS-2 owns any audit-write surface, anticipate integrity-property characterization across the three patterns. | PC-4 closing bridge Prompt 4 (DS-* inheritance prior). |
| **Cross-tier write discipline** | PC-4 admin RPCs directly mutate Domain-Service tables; whether DS-* accept cross-tier writes or publish primitives PC-4 calls is a standing substrate question - frame any DS-2 instance into this channel. | PC-4 C3-7 + SS-4; Phase 2 close-out routing to DS-* entry. |
| **Naming-drift multi-layer compounding** | Naming drift compounds across 4+ consumer layers; never treat as single-site footnote. Dual-reading disposition per Section T #5. | PC-4 PW-4 + SS-8. |
| **TS-type vs runtime-surface coverage gap** | Run the type-vs-runtime coverage check as a Step 2 sub-discipline. | PC-4 PW-T1. |
| **Supervised-bypass entity-owned-scope taxonomy** | Supervised-bypass variables have entity-owned scope; ownership tracks the introducing entity. | PC-4 C2-7. |
| **Cross-entity enumeration-completeness recurring class** | Cross-entity Step 2 reads surface enumeration-completeness gaps at a recurring rate; route to the auto-pickup channel. | PC-4 PW-5. |
| **Cluster S structural-survey** | A first-cluster broad structural survey front-loads bulk-disconfirmation; deeper clusters refine. Especially apt at a near-zero-code entity. | PC-4 Prompt 5; PC-4 -> DS-* carry-forward. |
| **Whisp split (DECIDED)** | DS-1 world-presence / DS-7 being; DS-2 owns no face; consume, never reopen. | PENDING.md; DS-1 bridge decision 5. |
| **Respawn three-way split (re-check at Step 1)** | DS-1 position resolution / DS-2 topologies + loop textures / DS-3 delivery. Confirm or revise with Stefan. | DS-1 bridge decision 6; register DS-2 row; narrative core. |
| **Sibling-provisional boundary rule** | DS-1's claims against DS-2..DS-7 are provisional; DS-2's descent re-checks its DS-1 boundary (the two Section 5a seams). | world-model.md Sources-status. |

Note: the six PC-4 -> DS-* inheritance priors above were routed to "DS-1's session-opener instance" by the PC-4 closing bridge, but DS-1 ran from a custom opener that did not carry them. This DS-2 opener is the first template instance to inherit them; DS-1's zero-delta Step 2 means nothing was lost, but the Section 13 capture should note the routing gap.

---

## Section 8 - A-candidate ledger - watches at DS-2 entry

Post-Phase-2-close-out status: **A#4 (PW-1), A#5, A#8, A#9, P-O1 are promoted named program-level disciplines** (skill commit `e9c8a54`) - they are applied, not watched. Remaining watches:

- **A#1 latent-vs-delta**, **A#2 tier-shape escalation channel**, **A#3 database-shaped L2 framing**, **A#6 cold-derivation-with-priors**, **A#7 tool-payload verification** - held as bridge-prose framings; carry forward.
- **Retraction-rate-at-Step-2 tracking** (PC-4 Prompt 5 / Section T candidate #6) - record DS-2's data point (DS-1: zero-delta; PC-4: 7 across 9 clusters).
- **Substrate-completion-window** (PW-MARCH1) - PW-1 sub-shape watch; fires only if Step 2 finds narrative-adjacent substrate inside the D15 window.
- **DS-2-specific additions** - any new candidate this run surfaces joins the ledger snapshot at the closing bridge.

---

## Section 9 - Disciplines in effect

All durable disciplines from the PC chain + Phase 2 close-out + Session B + the DS-1 descent remain active:

- **Canonical-core precedence (hard):** the cosmology / roles / beings / narrative cores + the universe-discovery files are the single source of truth. Specs conform to cores, never the reverse.
- **Ratify each judgment call with Stefan before canonical edits.** Checkpoints at Section 5a / 5b / 5c are the structural surfaces; seam resolutions and the FIRST DECISION are explicit ratification gates.
- **Commit at phase gates** (Step 1 ratified -> commit; Step 2/3 ratified -> commit; close -> commit).
- **CODE stays set aside as a correction target** - Step 2 reads code as evidence, never as authority.
- **Trust disk over memory; re-read state at session open.** Tripwire #4 substitution per Section 6.
- **Sessions are append-only.** Forward-only correction; prior commits carry their own provenance.
- **`docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.**
- **Any new assertion-bearing diagram joins the doc-health-check diagrams registry in the same session** that creates it. (Expectation: none; DS-1 created none.)
- **ASCII only.** No Greek or non-ASCII characters in labels or identifiers. Hard rule.
- **Ferd non-closure** (ADR-U008/U018): loop-texture kinds, beat kinds, season/episode kinds, NPC-layer promotion states - data-driven registries, never sealed enums.
- **Move-and-correct disposition;** in-commit consistency; append-only Option A for any ADR amendment.
- **OLDFEAT (`docs/TMP/OLDFEAT/`) read disposition:** blindness invariant carries forward (STATUS.md OLDFEAT-reconciliation row still Pending). Listing only; no content reads.

---

## Section 10 - Output expectations and commit shape

**Single-session run (DS-1 shape, expected):** 3-5 commits - (i) combined spec Write covering Steps 1+2+3 (post-ratification), including any ratified DS-1 seam amendment + PENDING.md disposition + template-slug-enum edit if the rename fires; (ii) entity CLAUDE.md creation + doc-health-check Section 7 registry-row removal (same commit); (iii) closing bridge; (iv) STATUS.md row update (separate small `chore(planning)` commit per opener convention). Split-session adds intra-session bridges per the template.

**STATUS.md discipline:** mark the DS-2 row **In flight** (with this opener linked) at session open as its own small commit if the opener-authoring commit has not already done so; mark **Done** at close with closing-bridge link + Section 13-captured + template-revision columns filled.

**No push to origin** at session close. Stefan dispositions push as a deliberate next step.

---

## Section 11 - Closing bridge - required sections

The closing bridge at `docs/planning/sessions/2026-06-10_NN_-_DS2-LANDED.md` follows the standard session-bridge shape, plus:

- **Explicit closure statement:** "*DS-2 Narrative Engine L1->L3 derivation completes at this commit batch*" (adjust the name if the rename fired).
- **Pickup lists** by receiving entity (DS-3, DS-4, DS-5, DS-6, DS-7, Arc/Journey Studios, doc-health channel) with substance + anchors.
- **Forward-commitment classification** per capability (DS-1 precedent section).
- **A-candidate ledger snapshot** at DS-2 close, including the retraction-rate data point.
- **PW status** at close.
- **Methodology data points** - the Section 13 capture as a primary section (PC-4 format precedent).
- **Carry-forward to next entity** (DS-3 per STATUS.md numeric order) - what DS-3's opener must inherit, explicitly including the Engine-suffix outcome or deferral.
- **Template revision disposition** - MUST adjudicate the seven PC-4 candidates per Section T: land as template edits now (small `chore(templates)` commit, Revision history table updated, PC-4 bridge + this run cited as provenance) or continue riding opener instances - with rationale either way. Plus any new candidates this run surfaces.

---

## Section 12 - Scope boundaries

- **The Whisp split is decided** - consume, never reopen (Sections 5a, 7). No DS-2 Whisp-face capabilities.
- **Cross-entity edits:** the ratified DS-1 seam resolutions (NPC promotion Q4; respawn split if revised) are the ONLY sanctioned cross-entity spec edits, each ratified before landing. All other Class 3 findings route to pickup lists.
- **DS-3's rename itself is NOT executed here** - only the suffix posture is surfaced per Section 5a's FIRST DECISION; the DS-3 rename executes at the DS-3 descent per PENDING.md.
- **Studios are not decomposed here** - Arc Studio / Journey Studio write-paths are named as DS-2 consumers (ADR-U026 pattern: studio writes -> service), but studio decomposition is its own pipeline row.
- **DS-6 identity re-derivation watch** (DS-1 bridge handoff item 8) - not this run's work; do not pre-resolve.
- **OLDFEAT blindness invariant** - listing only, per Section 9.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge is authored, answer the five prompts (worked well / redundant-or-confusing / wished-was-named / new substance prior for DS-3 / new A-candidate or PW observation).

**Second-instance framing.** PC-4 (first instance) surfaced seven template-revision candidates; this run applied them at instance level per Section T. The capture must report, per candidate: did the instance-level application fire (held cleanly / fired and caught something / never fired / fired noise)? That per-candidate verdict feeds the closing bridge's Template revision disposition (Section 11), which adjudicates whether the candidates finally land as template edits. Also capture: the filename-convention deviation (header note); the cores-in-authority-chain extension at Section 3 (Domain Services derive from canonical cores - a structural delta from the PC-shaped template authority chain; likely a template-revision candidate in its own right); the FIRST-DECISION-before-identity-section pattern (naming questions that gate a spec's title/slug - reusable at DS-3); and the PC-4 -> DS-* inheritance-prior routing gap noted at Section 7.

Capture posture: generous rather than parsimonious. Brevity is fine when there is genuinely nothing to surface; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. Then Section 5a - surface the FIRST DECISION (Engine suffix) before authoring the L2 identity section, then cold derivation, then the Section 5a checkpoint before the first Write.

---

*End of instance.*
