# Autonomous L1->L3 session-opener - DS-4 Content

**Instance authored:** 2026-06-10
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `a08ab70` - carries the DS-3-adjudicated revisions; see Section T below)
**Entity type:** Domain Service (entity 4 of 8 in Platform Domain, Phase 3)
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-10_04_-_DS3-LANDED.md`](../2026-06-10_04_-_DS3-LANDED.md) (closing-bridge commit `ab75084`; STATUS.md close `0db4e7d` and the post-DS-3 doc-health pass `273b002` are acceptable interveners)
**Substantive predecessors (derivation authority for Step 1 carry-forward):** the DS-3 closing bridge (pickup block "DS-4 Content (next entity; its opener must inherit)"), the DS-2 closing bridge (Q8 + Q3 routings), the DS-1 closing bridge (Q5 lore), and the Session B conformance register Section 3 DS-4 row

> Per-instance session-opener for the autonomous CC run executing DS-4 Content L1->L3 derivation, end-to-end. **Fourth instance of the autonomous L1->L3 template.** Three-step shape: cold derivation -> code-informed stress-test -> adjudication. The stated Step 2 expectation is **near-zero DS-4 artifacts** (calibrated at opener authoring: zero `asset`/`content_block` vocabulary, no storage buckets in migrations) — BUT with two boundary-shaped realized artifacts to classify (Section 5b), so a DS-1/DS-2-style zero-delta verdict is NOT guaranteed. Single-session expected; split fallback per the template.
>
> **No FIRST DECISION at this descent.** No rename is parked for DS-4 (PENDING.md's naming watch-items cover DS-1/DS-6/DS-7 only; the Engine-suffix and DS-3 entries are fully resolved). The first ratification gate is the Step 1 checkpoint.

---

## Section T - candidates and watches riding this instance

The DS-3 adjudication landed four more revisions as template text (`a08ab70`: naming-drift dual-reading, rename-bearing sweep-then-enumerate, single-session commit cadence, entity-descriptive filename convention) — those bind from the template. Riding THIS instance:

1. **Candidate #4 - migration-name-as-shorthand.** Still no decisive firing at n=3 opportunities. Held as a Step 2 watch; if DS-4's Step 2 is near-zero it likely rides again.
2. **Empty-result verification (n=3 - promotion-ready).** A silently-failing `find` produced false-empty listings THREE times on 2026-06-10 (DS-3 Step 2 app/api; twice in the post-DS-3 doc-health run). **Binding instance rule:** any empty listing or zero-hit enumeration that feeds a claim is verified by a second, differently-shaped method (grep vs ls vs explicit-path test) before the claim is made. This extends the Section 6 listing-commands discipline; the Section 13 capture adjudicates promotion to template text.
3. **ADR-enumeration-by-grep (n=2 - applied at this opener's authoring).** The binding-ADR set below was enumerated by sweeping `docs/architecture/decisions/` for DS-4's domain nouns (content/media/asset/storage/render/capture), not inherited from a predecessor list. The executing session re-verifies against the decisions directory listing at Section 2. Section 13 adjudicates promotion.

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `ab75084` (the DS-3 closing bridge). Acceptable interveners: `0db4e7d` (STATUS close), `273b002` (post-DS-3 doc-health pass), this opener's authoring commit + its STATUS.md update. Hard-fail if earlier.
4. **Working tree state.** Run `git status`. Expected: **clean**, with one named re-occurrence shape: root `CLAUDE.md` modified with the diff solely the appended "context-mode - MANDATORY routing rules" block (insertions only) - the context-mode plugin re-injecting it. Disposition: discard (`git checkout -- CLAUDE.md`; if the permission classifier denies, Edit-removal is the sanctioned fallback - both outcomes precedented). Verify the diff is SOLELY that block first. Any other modification or untracked file in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`: hard-fail.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `a08ab70` exactly. Hard-fail if earlier; soft-flag and adjudicate if later.

**Generic environment note (DS-3 + doc-health precedent):** the auto-mode permission classifier can deny seemingly-routine actions at novel sites (a `git checkout`, a skill-file Edit). The standing fallback pattern: surface the denial, ask Stefan, use the narrowest sanctioned alternative. Do not work around silently.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop on material divergence; surface and wait for adjudication.

1. **`docs/planning/sessions/2026-06-10_04_-_DS3-LANDED.md`** - chronological + substantive predecessor. Load-bearing: the DS-4 pickup block (the three-question content-boundary cluster; opaque-reference direction pattern at three precedents; the zero-delta expectation statement); the cross-tier-write and Finding #4 pickups (NOT DS-4 work - do not absorb); the methodology watches.
2. **`docs/planning/sessions/2026-06-10_03_-_DS2-LANDED.md`** - DS-2's Q8 + Q3 routings to this descent; the beat-vs-content-block cold lean.
3. **`docs/planning/sessions/2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`** (+ addendum) - DS-1's Q5 (lore's shape - joint with DS-2 Q3, firms HERE); the assets-referenced-opaquely-only ratified decision.
4. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - Section 3 DS-4 row, this run's work-order seed: *"Gimbal-capture -> Hub-refine pipeline; equipment-keyed delivery"*. Also Section 6 for standing residue.
5. **`docs/architecture/decisions/PENDING.md`** - confirm: no DS-4-relevant parked decision (the Whisp split is consumed-only; the rename entries are resolved). The Whisp-split promotion still waits for DS-7.
6. **`docs/platform/domain/journeys.md`** - DS-3's canonical spec. Read for the seams: §8 Q7 (step -> content-block references; cold lean: composition at delivery, no step->beat references - resolves HERE); §2 Step row + §6 (the realized `journeys.content` JSONB embedding renderable step content inline - the boundary-shaped artifact Step 2 must classify); the opaque-reference commitments.
7. **`docs/platform/domain/narrative.md`** - DS-2's canonical spec. Read for the seams: §8 Q8 (beat-vs-content-block; beats reference blocks opaquely by ID - confirm HERE) and Q3 (mythology/unfolding vs DS-1 lore vs DS-4 content three-way - firms HERE, joint with DS-1 Q5); §2 Story beat row.
8. **`docs/platform/domain/world-model.md`** - DS-1's canonical spec. Read for the seams: §8 Q5 (lore's shape); the World-authoring write-path's "placed 3D-asset references" + PC-1 object-storage conventions row; the DS-4-referenced-opaquely-only direction guard.
9. **Canonical cores:** the narrative core (`docs/ecosystem/universe/narrative/README.md` - beats present content; the journeys line's content families); the cosmology core (the world the assets depict; nothing DS-4-owned, boundary input); the beings core (NPC body layer - 3D models as authored artifacts); plus the universe-discovery files where cited (the 2026-06-05 product locks carry the capture->refine pipeline and equipment model). **Note:** DS-4 is the first Domain Service whose register row traces primarily to the PRODUCT locks (ADR-U025) rather than to a dedicated core - the authority chain leans on ADRs more than prior descents; flag any canon-sub-page gap per the DS-3 precedent (proceed with remark; Sources-status carries it).
10. **`docs/platform/domain/README.md` + `docs/platform/domain/CLAUDE.md`** - sub-tier rules; the DS-4 L2 inventory line: `- **DS-4 Content** (`content.md`) - Media, assets, narrative blocks`.
11. **ADRs (enumerated by domain-noun grep at authoring; re-verify against the decisions listing):** U023 (anatomy) + **U025 (THE load-bearing one: Gimbal-capture -> Hub-refine pipeline as the proof of complementary surfaces; equipment-keyed delivery at feature grain - note the tension to resolve: the register row says "equipment-keyed delivery" while U025 keys features, not platform capabilities)** + U017 (journeys as content templates - templates are made OF content) + U008 (step types AND content renderers as the extension surface; "content types" in the Extension System's charter) + U018 (non-closure) + U016 (content retirement cascades) + U027 (Shadow-captured content inherits ephemerality) + U003 (Supabase as backend - object storage substrate) + U013 (design-system i18n/a11y - content-rendering obligations) + U026 (studios - **DS-4 has NO studio write-path under the one-studio-one-service law; see the structural question below**).
12. **`docs/planning/sessions/openers/STATUS.md`** - confirm the DS-4 row is `In flight` with this opener linked.

Then verify against disk (Section 6 discipline; empty-result verification binds):

- Spec at `docs/platform/domain/content.md` - confirm does NOT yet exist (verified absent at opener authoring). If it exists, hard-fail and surface.
- Entity CLAUDE.md at `docs/platform/domain/content/CLAUDE.md` - confirm does NOT yet exist. **Registered expected placeholder:** `.claude/skills/doc-health-check/SKILL.md` Section 7 carries its row. When this run authors the file, **remove that registry row in the same commit** (registry rule 2). Note: the classifier may deny skill-file edits as self-modification - DS-3 precedent: surface, ask Stefan, sed is the sanctioned fallback on approval.
- `decisions/PENDING.md` state as described.
- This opener at its landing path (`archive/` it at session close per the restored only-live-artifacts rule, doc-health 273b002).

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md`
- **Sub-tier:** `docs/platform/domain/CLAUDE.md`
- **L2 inventory line:** `- **DS-4 Content** (`content.md`) - Media, assets, narrative blocks`
- **Canonical cores (hard precedence):** narrative, cosmology, beings cores per Section 2 item 9 + the universe-discovery product locks (the capture->refine pipeline and equipment model live there and in ADR-U025).
- **Conformance constraint:** the register Section 3 DS-4 row.
- **Architectural authority:** the ADR set at Section 2 item 11.
- **Template:** `docs/templates/domain-service-spec.md` (slug `content`).
- **Sibling seams (boundary input, NOT capability source):** `world-model.md`, `narrative.md`, `journeys.md` - consulted only for the four routed questions; DS-4 capabilities derive from the cores + ADRs, never from sibling specs.
- **Predecessor carry-forward:** the DS-3 bridge's DS-4 pickup block + Section 7 priors.

**Cold-derivation discipline.** No reads of `supabase/migrations/`, `lib/`, `app/`, `tests/`, or FEAT-* files at Step 1. Knowing THAT `journeys.content` JSONB exists (bridge carry-forward) is prior; reading its shape is contamination. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.

**The structural question this descent owns - the authoring write-path.** ADR-U026's law gives each sub-studio exactly one Domain Service (World->DS-1, Arc->DS-2, Journey->DS-3) - **no studio writes to DS-4**. Yet ADR-U025's capture->refine pipeline produces assets, World Studio places 3D-asset references (DS-1) that point at DS-4-owned artifacts, beats (DS-2) and steps (DS-3) reference DS-4 blocks. Cold derivation must propose how content ENTERS DS-4: a capture/refine write-path reached from within each studio's own mode (asset authoring as a shared service consumed by the studios, not a fourth studio), direct surface-level capture (Gimbal sensors foot), or another shape. This is a ratification-gated derivation call, not a pre-decided answer - and it must NOT invent a fourth studio (ADR-U026 is locked) or break the one-studio-one-service law.

---

## Section 4 - Three-step work shape

Step 1 cold derivation -> Step 2 stress-test (A#8 cumulative-forward) -> Step 3 adjudication with forward-commitment classification. Stated expectation: near-zero DS-4 artifacts with two boundary classifications (Section 5b). Single-session expected; choose at the Step 1 checkpoint with Stefan.

---

## Section 5a - Step 1 - cold derivation

**Activity.** Author the candidate L3 inventory from upstream authority only. Write to `docs/platform/domain/content.md` the L2 sections 1-7 (+ service-level invariants block per the DS-1/2/3 additive precedent) and the L3 inventory + dependency chain + external dependencies + Sources-status.

**Derivation scope (from the register row + the cores + ADRs + routed questions):** media and asset registries (3D models, images, audio, captured scans - kinds data-driven); **narrative content blocks** (the renderable units beats and steps reference opaquely by ID); the **capture -> refine pipeline** (Gimbal-capture as the sensors-foot entry, Hub-refine as the canvas deep-edit - ADR-U025's proof case; ownership of pipeline STATE vs the surfaces that operate it); **equipment-keyed delivery** (resolve the tension: U025 keys features at surfaces, never platform capabilities - the cold lean to test: DS-4 serves renditions/variants by equipment while keying stays feature-grain at surfaces); content rendering contracts (U008 content renderers as extension surface); storage substrate consumption (PC-1 object-storage conventions, U003); Shadow-captured content ephemerality (U027); content retirement cascades (U016); the authoring write-path per the Section 3 structural question.

**Four routed seam questions to resolve and ratify with Stefan** (the content-boundary cluster - each amends the owning sibling's §8 on ratification; these are the sanctioned cross-entity edits):

1. **DS-2 §8 Q8** - beat-vs-content-block boundary: beats are structure, blocks are content, references opaque by ID. Confirm or revise.
2. **DS-3 §8 Q7** - step content references: steps reference DS-4 blocks; narrative integration composes at delivery (no step->beat references). Confirm or revise.
3. **DS-2 §8 Q3 + DS-1 §8 Q5 (joint)** - the mythology three-way: where world-fact (DS-1 lore) ends, story-canon (DS-2) begins, and renderable content (DS-4) begins. This pair FIRMS here; DS-1 Q5's lore shape may resolve or stay thin-with-shape-named.
4. **DS-1 placed-asset boundary re-check** - DS-1 references DS-4 assets opaquely by ID, never calls DS-4 (sibling-provisional rule; confirm the direction holds from the DS-4 side).

**Whisp consumption (decided - do not reopen).** DS-4 owns no Whisp face.

**Carry-forward priors:** the five named disciplines (A#5 per-phase, A#8, A#9, PW-1, P-O1), D7, and the Section 7 table. At a near-zero-code entity most fire only if Step 2 surprises; P-O1/D7 still pin any authoring-gate prose.

**Watches armed at Step 1:** A#9 (framework mechanisms - Supabase Storage IS a framework-provided content surface: check whether storage policies/buckets constitute a realized contract before declaring a speculative one); hypothesis pruning (plausible-but-unconfirmable shapes become §8 questions tagged speculative-third-shape); L2-line altitude (the line "Media, assets, narrative blocks" predates ADR-U025 - it names none of: capture->refine, equipment-keyed delivery, renditions, Shadow-capture ephemerality, the write-path question; revision is a plausible Step 3 output).

**Step 1 checkpoint surfacing.** After the candidate is composed, pause and surface to Stefan BEFORE the first Write: capability count by area; the write-path structural answer proposed; the four seam positions; the equipment-keying tension resolution; L2-line altitude finding; §8 question count; speculative-third-shape tags; single-vs-split choice. Wait for ratification.

**Single-Write preferred; A#5 per-phase; the ratified Write holds uncommitted until Step 3** (template text since `a08ab70`).

---

## Section 5b - Step 2 - code-informed stress-test pass

**Direction of authority preserved.** Code stress-tests the candidate; never sources it.

**Expectation - stated for Step 2 to verify rather than assume (calibrated at opener authoring):** near-zero DS-4 artifacts - zero `asset`/`content_block`/`attachment` vocabulary, no storage buckets in migrations, `media` 1 hit. **Two boundary-shaped realized artifacts MUST be classified rather than skipped:**

1. **`journeys.content` JSONB (DS-3's table)** embeds renderable step content inline - under the Q7/Q8 cold leans this content is architecturally DS-4-block territory referenced by ID. Classify: a Class 3 cross-entity finding routed back to DS-3's evolution (the realized inline shape predates the partition - PW-1 reading), NOT a DS-4 capability sourced from code.
2. **Profile/avatar media** (~19 `upload` hits; `groups.avatar_url`): classify whether profile media is DS-4 territory or PC-2/PC-3 profile substrate - a genuine boundary call; route per the architecture, not the code.

**Clusters, sized to the near-zero expectation:** Cluster S structural survey first; migrations cumulative-forward (A#8) for content/media/asset/storage/upload/block vocabulary incl. `archive/` (PW-MARCH1 watch); framework-mechanism check (Supabase Storage buckets/policies - A#9's named site for this entity); `lib/types` + hooks scope-survey; mop-up greps - **scope the noisy term `content` carefully** (CSS/HTML `content`, React `children`-adjacent usage, `journeys.content` - state patterns and exclusions per SS-16/17; empty-result verification binds on every zero-hit claim).

**Cadence:** template text - cluster self-reflection between, surface ONCE at end with the three-class block + structured summary; per-cluster composition is not a gate.

**Step 2 checkpoint surfacing.** Finding counts by class; the two boundary classifications; retraction-rate data point (the series: PC-4 7/9, DS-1 0, DS-2 0, DS-3 0 - and the deltas-not-retractions refinement to test at a weak-priors... DS-4 inherits rich priors, so expect the refinement to hold); PW-1/PW-MARCH1 outcomes; Step 3 scope. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Required deliverables - not pickup:**

- **Spec** (combined Write committed at the Step 3 gate; fold-back Edits sub-batch-of-1 if needed; Class 2 deltas fold inline).
- **Seam resolutions folded where they belong:** ratified amendments to `narrative.md` §8 Q8 + Q3, `journeys.md` §8 Q7, and `world-model.md` §8 Q5 (+ boundary text only if revised) - the four sanctioned cross-entity edits, each citing the ratification.
- **Entity CLAUDE.md** at `docs/platform/domain/content/CLAUDE.md` + **same-commit registry-row removal** from doc-health SKILL.md Section 7 (classifier-fallback note at Section 2).
- **Pickup lists** - DS-5 (forum/DM attachments? if touched), DS-6 (content discovery/marketplace seam), DS-7 (AI-generated content - U008's future step types; the AI-Generative seam joint with DS-3 Q3), studios (the ratified write-path answer routes obligations to World/Arc/Journey Studio decomposition), Hub/Gimbal (the capture->refine pipeline surfaces), doc-health channel. Anchors per entry.
- **Closing bridge** at `docs/planning/sessions/{date}_NN_-_DS4-LANDED.md` (NN next available; adjust date), per Section 11. **Archive this opener in the close batch** (the restored rule).
- **PENDING.md:** no disposition expected (no parked DS-4 decision); ADR amendments only if a Q-resolution warrants (zero expected; the U025 equipment-keying tension resolves as spec text, not an ADR edit, unless the resolution contradicts U025 - in which case STOP and surface).

**Step 3 checkpoint surfacing.** Q-resolution slate before the Step 3 block; each cross-entity edit's scope before landing. Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

Template-resident hard rules (fresh-read before Edit; structural-inventory-before-defect-assertion; SS-16/17 enumeration-claim-scoping; verify-before-asserting on commit shapes; cross-section fresh-read; explicit-count listings) **plus the binding instance rule from Section T item 2: empty-result verification** - every empty listing or zero-hit claim is confirmed by a second, differently-shaped method before use. `find` specifically has produced false-empties three times on this platform; prefer grep/ls and cross-check.

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 (per-phase), A#8 cumulative-forward, A#9 framework-mechanisms (site here: Supabase Storage), PW-1 schema-predates-partition, P-O1 actor primitive `get_current_personal_group_id()`. | Phase 2 close-out; template text. |
| **D7** | Role names are TEXT-keyed `role_templates` rows, never enums. | Experiment A; PC-3 §5. |
| **PW-5 19-table baseline** | End-state schema is 19 tables; re-verify rather than inherit. No DS-4 tables among them. | DS-2 bridge; DS-3 confirmed. |
| **Opaque-reference direction pattern (n=3)** | DS-1 assets, DS-2 blocks, DS-3 blocks - all referenced by ID only, owner never called by referrer. DS-4 is the OWNED side of all three: its contract must serve ID-resolution without inverting any direction. | world-model.md §4; narrative.md §4; journeys.md §4. |
| **Content-boundary cluster (resolves here)** | DS-2 Q8 + Q3, DS-3 Q7, DS-1 Q5 - the four routed questions; ratified answers amend the owning specs. | DS-1/2/3 bridges. |
| **Cross-tier write discipline** | PC-4-tier functions write DS-3 tables directly (anchored at DS-3); if DS-4 surfaces any cross-tier write, frame into the channel - do not resolve here. | PC-4 C3-7; DS-3 bridge pickup. |
| **TS-type vs runtime (PW-T1)** | Type-vs-runtime coverage check both directions at Step 2. | PC-4. |
| **Cluster S structural survey** | First-cluster broad survey; apt at near-zero-code entities. | PC-4. |
| **Whisp split (DECIDED)** | DS-4 owns no face; consume only. | PENDING.md. |
| **Sibling-provisional rule** | DS-1/2/3 claims against DS-4 are provisional; this descent re-checks them (the four questions). | Sibling Sources-status blocks. |
| **Equipment-keying law (ADR-U025)** | Features key on equipment at surfaces; platform capabilities never key. The register row's "equipment-keyed delivery" must be resolved WITHIN this law (renditions/variants lean), not against it. | ADR-U025 decision 3; DS-3 §3 precedent. |
| **Shadow-content ephemerality (ADR-U027)** | Shadow-generated DS-4 state (captures, uploads) inherits TTL-erasure + atomic transcendence migration; cascade-spec'd with PC-2 before build. | ADR-U027; DS-3 §6 precedent. |

---

## Section 8 - A-candidate ledger - watches at DS-4 entry

- **A#1, A#2, A#3, A#6, A#7** - carry forward as framings.
- **Retraction-rate series:** PC-4 7/9; DS-1 0; DS-2 0; DS-3 0 (code-rich, rich priors -> deltas not retractions). Record DS-4's point; the series likely settles at Phase 3 close-out.
- **PW-MARCH1** - fires only if archived migrations carried content/media substrate lost at D15 (none expected; verify).
- **Empty-result verification (n=3)** - applied as binding instance rule; promotion adjudicated at §13.
- **ADR-enumeration-by-grep (n=2)** - applied at this authoring; promotion adjudicated at §13.
- **#4 migration-name-as-shorthand** - rides.

---

## Section 9 - Disciplines in effect

All durable disciplines remain active: canonical-core precedence (hard); ratify judgment calls with Stefan before canonical edits (checkpoints at 5a/5b/5c; the four seam resolutions are explicit gates); commit at phase gates with the single-session cadence; CODE stays a correction target; trust disk over memory; sessions append-only; the 2026-04 Hub L3 working set is NOT derivation input; any new assertion-bearing diagram joins the doc-health registry same-session; ASCII-only labels; Ferd non-closure (content kinds, media kinds, rendition kinds, pipeline states - registries, never sealed enums; U008 names content renderers explicitly); move-and-correct; in-commit consistency; append-only Option A for any ADR amendment; OLDFEAT blindness invariant (listing only).

---

## Section 10 - Output expectations and commit shape

**Single-session run:** 4-6 commits - (i) combined spec Write (Steps 1+2+3, post-Step-3-ratification) + the four ratified sibling §8 amendments; (ii) entity CLAUDE.md + doc-health registry-row removal (same commit; classifier-fallback note); (iii) closing bridge + opener archived; (iv) STATUS.md row update (separate small commit). **No push to origin** - Stefan dispositions push.

---

## Section 11 - Closing bridge - required sections

Standard session-bridge shape plus: explicit closure statement ("*DS-4 Content L1->L3 derivation completes at this commit batch*"); pickup lists by receiving entity; forward-commitment classification (expectation: full-forward dominant; the two boundary artifacts classified, not absorbed); A-candidate ledger snapshot incl. the retraction-rate point and the two n-promotion adjudications; PW status; §13 capture as a primary section; carry-forward to DS-5 Communication (next per STATUS order) - explicitly including any DS-5-adjacent findings (attachments, media-in-messages); template revision disposition (fourth-instance verdicts; land or ride with rationale).

---

## Section 12 - Scope boundaries

- **No rename; no FIRST DECISION.** DS-4's name is unchallenged (vocabulary-vetted: no collision).
- **Cross-entity edits:** ONLY the four ratified seam resolutions (narrative.md Q8+Q3, journeys.md Q7, world-model.md Q5). All other Class 3 findings route to pickups.
- **Do not invent a fourth studio and do not break one-studio-one-service** (ADR-U026 locked) - the write-path answer works within the locked entity set.
- **The cross-tier-write and Finding #4 pickups anchored at DS-3 are NOT this run's work.**
- **DS-6 identity re-derivation watch** - untouched.
- **OLDFEAT blindness invariant** - listing only.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge: answer the five template prompts. **Fourth-instance framing:** report whether the twelve cumulative template revisions held as template text; adjudicate the two n-promotion candidates (empty-result verification, n=3 at instance entry; ADR-enumeration-by-grep, n=2) and rider #4; record the retraction-rate point and run shape; capture the no-FIRST-DECISION shape (first descent without a naming gate since DS-1) and whether the ADR-heavy authority chain (product locks over a dedicated core) changed derivation texture. Generous capture posture; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. Then Section 5a cold derivation (no FIRST DECISION gate - the first ratification surface is the Step 1 checkpoint, which must include the write-path structural answer and the four seam positions). Surface the checkpoint before the first Write.

---

*End of instance.*
