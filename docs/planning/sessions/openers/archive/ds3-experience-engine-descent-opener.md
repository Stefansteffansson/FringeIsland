# Autonomous L1->L3 session-opener - DS-3 Experience Engine (rename-bearing descent)

**Instance authored:** 2026-06-10
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `1de43ad` - the revised template carrying the DS-2-adjudicated revisions; see Section T below)
**Entity type:** Domain Service (entity 3 of 8 in Platform Domain, Phase 3)
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-10_03_-_DS2-LANDED.md`](../2026-06-10_03_-_DS2-LANDED.md) (closing-bridge commit `9494772`; STATUS.md + dependency-SVG-pointer fix at `bd7d80d` is an acceptable intervener)
**Substantive predecessors (derivation authority for Step 1 carry-forward):** the DS-2 closing bridge (pickup list "DS-3 (next entity; its opener must inherit)"), the DS-1 closing bridge [`../2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`](../2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md) (decision 6 respawn resolution-vs-delivery; handoff items), and the Session B conformance register [`../2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`](../2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md) (Section 3 DS-3 row)

> Per-instance session-opener for the autonomous CC run executing DS-3 L1->L3 derivation, end-to-end. **Third instance of the autonomous L1->L3 template, and the first authored against the post-`1de43ad` revised template** (the DS-2-landed revisions face their first as-template-text test here). Three-step shape: cold derivation -> code-informed stress-test -> adjudication. **DS-3 is the first code-rich Domain Service to descend:** the 19-table end-state schema contains `journeys` and `enrollments` (DS-1 Step 2 classified them as DS-3 territory) - the zero-delta Step 2 shape of DS-1/DS-2 is NOT the expectation here, and the retraction-rate tracking series gets its long-awaited code-rich data point. Plan for a possibly-split session; single-session is fine if Step 2 stays tractable.
>
> Filename note: this instance lands as `ds3-experience-engine-descent-opener.md` (entity-descriptive convention, named by the PRE-rename name per DS-2 precedent). The DS-2 closing bridge routed the template's `cc-{entity}-autonomous.md` convention-line disposition to this opener's author: the entity-descriptive convention is used deliberately; whether the template's convention line is amended is adjudicated at this run's Section 13 / template-revision disposition.

---

## Section T - candidates riding this instance

The seven PC-4 candidates were adjudicated at DS-2 close: **#1, #2, #3, #6, #7 are now template text** (commit `1de43ad`) - they bind from the template itself, not from this section. What rides THIS instance:

1. **Candidate #4 - migration-name-as-shorthand insufficient for substantive scope-determination.** Anchor cluster cadence on substrate-completion artifact identity, not migration-name semantics. Never fired at DS-2 (zero-hit entity); DS-3's code-rich Step 2 is its first real test. Held as a Step 2 watch.
2. **Candidate #5 - three-casing systematic dual-reading disposition.** For naming-drift classes, record BOTH the historical-transition and surface-idiomatic readings. Never fired at DS-2; the `enrolment`-vs-`enrollment` spelling split (canon prose vs code tables) is a plausible first firing site. Held as a Step 2 watch.
3. **Sweep-then-enumerate rename discipline (new at DS-2; n=1; first deliberate application here).** DS-2's a-priori rename-ripple enumeration (6 sites) under-counted the real footprint by 16 files. This is a rename-bearing run: when the FIRST DECISION fires, the ripple enumeration source is a **repo-wide label sweep** (grep for `Experience Engine`, `experience-engine`, and DS-3-context lines across `docs/` + `.claude/` + SVGs), with PENDING.md's a-priori list used only as a completeness floor. Verdict feeds Section 13 (promotion evidence at n=2).
4. **Section 9/10 commit-cadence clarification for single-session runs (new at DS-2; n=1).** Stated explicitly per the DS-2 recommendation: in a single-session shape, the ratified Step 1 Write is **held uncommitted until Step 3** so commit (i) is the combined Steps 1+2+3 spec commit. "Commit at phase gates" means ratification gates, not intermediate file states. Split-session runs commit per-step with intra-session bridges instead.
5. **Filename-convention disposition** (header note above) - adjudicate at Section 13.

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `9494772` (the DS-2 closing bridge). Acceptable interveners: `bd7d80d` (STATUS.md DS-3-Next + dependency-SVG pointer fix), this opener's authoring commit, and its STATUS.md update commit. Hard-fail if tip is earlier than `9494772`.
4. **Working tree state.** Run `git status`. Expected: **clean**, with one named exception. **Known re-occurrence shape (present at opener authoring):** root `CLAUDE.md` modified, diff solely the appended "context-mode - MANDATORY routing rules" block (insertions only, no deletions) - the context-mode plugin re-injecting it. Disposition (registered 2026-06-10, exercised at DS-2): discard the block; note the permission classifier may deny `git checkout -- CLAUDE.md`, in which case removing the block via Edit is the sanctioned fallback. Verify the diff is SOLELY that block before discarding. Any other modification, or any untracked file in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `docs/platform/domain/`: hard-fail.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `1de43ad` exactly. Hard-fail if earlier (template rolled back). **Soft-flag if later** - a revision landed between opener-authoring and session-open; surface the delta and adjudicate before proceeding.

After all five pass, report each check's outcome and proceed to Section 2.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

1. **`docs/planning/sessions/2026-06-10_03_-_DS2-LANDED.md`** - chronological + substantive predecessor. Load-bearing: the "DS-3 (next entity; its opener must inherit)" pickup block (rename inheritance, respawn three-way split, DS-2 Q1 + Q2 routed here, journey-vs-episode seam, DS-6 watch untouched); ratified decisions 1-4; the PW-5 19-table correction; Prompt 4's personal-data-weight prior.
2. **`docs/planning/sessions/2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`** - INCLUDING the in-session Steps 2-3 addendum. Load-bearing: decision 6 (DS-1 resolves respawn POSITION; DS-3 delivers respawn EXPERIENCE); the Step 2 classification of `journeys`/`enrollments` as DS-3 territory; handoff items.
3. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - Section 3's DS-3 row is this run's work-order seed: *"journeys declare required equipment at authoring; growth gradient = Void distance; signature-vs-charter personalisation; respawn delivery"*. Also Section 6 for standing residue.
4. **`docs/architecture/decisions/PENDING.md`** - the **DS-3 rename entry** (this run consumes and dispositions it - see Section 5a FIRST DECISION; the Engine-suffix half is DECIDED at DS-2: drops on both - do not reopen; the appended DS-2 outcome names **Journeys** as candidate) and the **Whisp split** entry (DECIDED; consume, never reopen; ADR promotion fires at DS-7, not here).
5. **`docs/platform/domain/narrative.md`** - DS-2's canonical spec. Read for the seams: Section 8 Q1 (adaptive-calendar personalisation ownership - universal calendar is DS-2's; per-FIM pacing cold-leans delivery-side) and Q2 (loop runtime state - cold lean DS-3; three-perspectives affinity as topology data) - BOTH resolve at this descent per the sibling-provisional rule; the loop-declaration contract surface DS-3 composes (topology, return shape, texture, persistence classes); the season/episode frame journeys attach into; Sections 1/3/7 respawn-delivery boundary text.
6. **`docs/platform/domain/world-model.md`** - DS-1's canonical spec. Read for the seams: the "Severance and respawn resolution" contract family (DS-1 resolves position; DS-3 consumes); the access map / per-region home permissions surface journeys traverse; Sources-status sibling-provisional line (DS-1's claims against DS-3 are provisional; this descent re-checks them).
7. **Canonical cores (DS-3 has the broadest core surface of any descent so far):**
   - `docs/ecosystem/universe/personal-growth/README.md` - journeys as the development vehicle (Who am I? What do I want? How do I get there?); growth gradient; signature-vs-charter personalisation.
   - `docs/ecosystem/universe/narrative/README.md` - the season/episode frame; respawn delivery as the experience half of the respawn sections; loop-is-the-medium.
   - `docs/ecosystem/universe/cosmology/README.md` - sections 8 (anchoring/severance) and 10 (growth gradient = Void distance, not bodily distance); the access map; the tendable world journeys move through.
   - `docs/ecosystem/universe/roles/README.md` - journey-role gating (Steward leads, Guide facilitates, Member takes part, Observer watches); Journey Studio scope tiers if named.
   - `docs/ecosystem/universe/beings/README.md` - FIM/Shadow as the enrolled travellers; ADR-U027 lifecycle hooks.
   - `docs/ecosystem/universe/community/README.md` - group journeys / village surfaces where journeys are group-shaped.
   - Plus the universe-discovery files under `docs/ecosystem/thinking/universe-discovery/` where the cores cite them.
8. **`docs/platform/domain/README.md` + `docs/platform/domain/CLAUDE.md`** - sub-tier rules; the DS-3 L2 inventory line; Platform API posture; Ferd non-closure discipline.
9. **ADRs:** U023 (decomposition) + **U025 (products as equipment profiles; the Game as journey DEPTH - load-bearing: depth is a journey setting DS-3 owns or hosts, not a product)** + U026 (Journey Studio as DS-3's studio write-path affinity) + U027 (Shadow lifecycle - enrolment/identity obligations) + U028 (governance by scope) + U008/U018 (Ferd non-closure - journey kinds, depth settings, progress states as data-driven registries, never sealed enums).
10. **`docs/planning/sessions/openers/STATUS.md`** - confirm the DS-3 row is `In flight` with this opener linked (the authoring commits set it); this run flips it to `Done` at close (Section 10).

Then verify against disk per the disk-of-record discipline (Section 6 below):

- Spec at `docs/platform/domain/experience-engine.md` - confirm does NOT yet exist (verified absent at opener authoring; the run creates it at the post-FIRST-DECISION path, expected `journeys.md` or the ratified equivalent). If it exists, hard-fail and surface.
- Entity-level CLAUDE.md - confirm does NOT yet exist. It is a **registered expected placeholder**: `.claude/skills/doc-health-check/SKILL.md` Section 7 registry carries the row `docs/platform/domain/experience-engine/CLAUDE.md` (verified present at opener authoring, ~line 442). When this run authors the entity CLAUDE.md (DS-1/DS-2 precedent says yes, at the ratified renamed path), **remove that registry row in the same commit** (registry rule 2) - the row names the OLD path; remove it regardless of the rename outcome and note the path change.
- `decisions/PENDING.md` entries present as described above.
- This opener instance at its landing path.

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md`
- **Sub-tier:** `docs/platform/domain/CLAUDE.md`
- **L2 inventory line:** `- **DS-3 Experience Engine** (`experience-engine.md`) - Journeys, steps, progress, enrolments` (from `docs/platform/domain/README.md`; pre-rename form)
- **Canonical cores (single source of truth - hard precedence):** personal-growth, narrative, cosmology, roles, beings, community cores per Section 2 item 7, plus the universe-discovery files where the cores cite them. (Template-resident rule since `1de43ad`: for Domain Services the cores ARE derivation input.)
- **Conformance constraint:** the Session B register Section 3 DS-3 row.
- **Architectural authority:** ADR-U023 + ADR-U025 + ADR-U026 + ADR-U027 + ADR-U028 + ADR-U008/U018 per Section 2 item 9.
- **Template:** `docs/templates/domain-service-spec.md` (the L2 sections 1-7 + L3 inventory shape; its slug enum currently reads `experience-engine` - the rename ripple touches it).
- **Sibling seams (boundary input, NOT capability source):** `docs/platform/domain/world-model.md` + `docs/platform/domain/narrative.md` - consulted only for the seams named at Section 5a; DS-3 capabilities derive from the cores, never from sibling specs.
- **Predecessor carry-forward:** the DS-2 closing bridge's DS-3 pickup block + DS-1 bridge decision 6 + the PC-4 inheritance priors tabled at Section 7.

**Cold-derivation discipline - heightened salience at a code-rich entity.** Do *not* read `supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, or any existing `FEAT-*` files during Step 1. DS-3 is the first descent where disk artifacts (the `journeys`/`enrollments` substrate, journey hooks/types/routes if any) actually exist to tempt a peek - the discipline is the point: the candidate derives from the cores + L1 + L2 + ADRs + priors only, and Step 2 stress-tests it. Knowing THAT the tables exist (from the DS-1 bridge) is carry-forward; reading their shape is contamination. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.

---

## Section 4 - Three-step work shape

Step 1 cold derivation (no code reads) -> Step 2 code-informed stress-test (migrations cumulative-forward per A#8) -> Step 3 adjudication with forward-commitment classification. DS-1 and DS-2 ran single-session on zero-delta Step 2s. **DS-3's Step 2 will NOT be zero-delta** (journeys/enrollments substrate exists); expect real Class 1/2/3 findings, possible retractions, and substantive Step 3 fold-back. Single-session remains legitimate if tractable; split-session (Step 1 ratified + committed, Steps 2-3 next session, intra-session bridge per the template) is the fallback - choose at the Step 1 checkpoint with Stefan.

---

## Section 5a - Step 1 - cold derivation

**FIRST DECISION - before any L2 identity text is authored: the journey-named rename.** PENDING.md carries the DS-3 rename entry ("Experience Engine -> journey-named"; identified at the DS-1 descent; execution routed to THIS descent). The Engine-suffix half is **DECIDED at DS-2 and is not reopened**: the suffix drops on both DS-2 and DS-3 (DS-2 landed as Narrative). What Stefan ratifies now is the exact journey-named, suffix-free form - **candidate: Journeys** (per the PENDING.md entry and the DS-2 bridge). Surface for ratification BEFORE authoring the L2 identity section, the filename, or the slug. On ratification:

- Record the outcome in PENDING.md's entry (append, don't rewrite).
- Execute the rename ripple THIS session per the sweep-then-enumerate discipline (Section T item 3): repo-wide label sweep as the enumeration source; PENDING.md's a-priori list (domain README service line, `domain-service-spec.md` slug enum, domain CLAUDE.md enumerations, STATUS.md row, ECOSYSTEM_ANATOMY_V5 + DOMAIN_SERVICE_DEPENDENCIES SVGs, register-style label sweeps) as the completeness floor; plus the doc-health-check Section 7 registry row (old path) and this opener's own STATUS.md row text.
- Spec lands at the renamed path (expected `docs/platform/domain/journeys.md`); entity CLAUDE.md at the renamed directory.

A deferral outcome (keep "Experience Engine") would contradict the DS-2-ratified suffix decision and the vocabulary-vetting failure recorded in PENDING.md - if Stefan chooses it anyway, record the reversal in PENDING.md and proceed un-renamed; otherwise the rename is in-scope work.

**Activity.** Author the candidate L3 inventory from upstream authority only. Write to the ratified path the L2-owned sections (1-7 per the domain-service template, plus service-level invariants if the substance warrants - DS-1/DS-2 precedent) and the L3-owned capability inventory + dependency chain + external dependencies + Sources-status block.

**Derivation scope (from the register row + the cores + carry-forward):** journeys as structured travel (solo or group), steps, progress, enrolments; **journeys declare required equipment at authoring** (register row; ADR-U025 equipment-profile seam to products); **journey depth including the Game as a depth setting** (ADR-U025 - depth is journey data, not a product); **respawn EXPERIENCE delivery** - composing DS-2's loop declarations (topology, return shape, texture, persistence classes) with DS-1's position resolution (the confirmed three-way split; DS-3 derives its delivery side); **loop runtime state** (DS-2 Q2 cold-leans here - if confirmed, the personal-data weight and ADR-U027 Shadow-loop obligations land in DS-3, not DS-2; DS-2 holds no per-FIM/per-Shadow personal state); **adaptive-calendar personalisation, per-FIM pacing half** (DS-2 Q1 cold-leans delivery-side; the universal calendar stays DS-2's); **signature-vs-charter personalisation** (register row; personal-growth core); **growth gradient = Void distance** (register row; cosmology section 10); journey-vs-episode seam (journeys attach into DS-2's season/episode frame); **role-gated journey experience** (Steward/Guide/Member/Observer per the roles core; Teller-style gating prose pins to D7 + P-O1); Journey Studio as the authoring write-path (ADR-U026 pattern: studio writes -> service).

**Seam re-checks to ratify with Stefan** (sibling-provisional rule - this descent re-checks DS-1's and DS-2's claims against DS-3):

1. **Respawn three-way split, DS-3 side.** DS-1 position resolution / DS-2 topologies + textures + return shapes / DS-3 delivery - confirmed at DS-2; this run derives the delivery side concretely (what "delivering the respawn experience" owns: presentation, pacing, runtime orchestration) and confirms the split still holds, or revises with ratification.
2. **DS-2 Q1 (per-FIM pacing) + Q2 (loop runtime state).** Both routed here by the DS-2 bridge; both resolve at this descent. The ratified answers amend `narrative.md`'s Section 8 Q1/Q2 (+ boundary text only if the cold leans reverse) - the sanctioned cross-entity edits of this run, citing the ratification.
3. **DS-1 boundary re-check.** Whatever `world-model.md` claims against DS-3 (severance/respawn contract row, access-map consumption) - confirm or surface for revision.

**Whisp consumption (decided - do not reopen).** DS-3 owns no Whisp face. Where journeys touch Whisp-adjacent substance, consume the split as an external dependency.

**Carry-forward priors** - held actively: the five named disciplines (A#5 sub-batch-of-1 per-phase, A#8 cumulative-forward, A#9 framework-mechanisms, PW-1 schema-predates-partition, P-O1 actor primitive `get_current_personal_group_id()`, not `auth.uid()`), D7 (role names are TEXT-keyed `role_templates` rows, not enums), plus the inheritance priors tabled at Section 7. At a code-rich entity, expect MOST of these to fire - PW-1 especially: the `journeys`/`enrollments` schema predates the Domain-Service partition by construction (D15 rebuild `ce58227` absorbed it); Step 2 should disk-anchor the PW-1 instance explicitly.

**Watches armed at Step 1:**

- **A#9 (named program-level pattern)** - before declaring DS-3's contract surface at sections 3/7, explicitly check for framework-provided mechanisms. DS-3 is the first DS where realized hooks/RPC surfaces likely EXIST (journey/enrolment hooks or routes); the cold position should anticipate PostgREST RPC as the canonical surface and tag anything speculative PW-2-style for Step 2.
- **Hypothesis pruning trade-off.** Do NOT over-prune; plausible-but-unconfirmable shapes become Section 8 questions tagged speculative-third-shape. At a code-rich entity these CAN resolve at Step 2 (unlike DS-2, where they routed to sibling descents) - a data point for the PW-2 resolution-channel observation.
- **L2-line altitude.** Stress-test the L2 line - `Journeys, steps, progress, enrolments` - at Step 1 start. It predates ADR-U025 and Session B canon: it names none of equipment declaration, depth/the Game, respawn delivery, loop runtime, role-gated experience, signature-vs-charter personalisation. A line revision is a plausible Step 3 output; record at Sources-status, revise at Step 3.

**Step 1 checkpoint surfacing.** After the candidate spec is composed, pause and surface a structured summary to Stefan BEFORE the first Write: capability count by internal area; the L2-line altitude finding; the Section 8 open-questions count; the FIRST DECISION outcome applied; the three seam re-check positions; any prior whose application was non-obvious; any speculative-third-shape hypothesis; single-vs-split session choice for Step 2; any drift from the template the substance required. Wait for ratification before Write.

**Single-Write vs split-Edit at Step 1.** Single Write preferred (PC-4/DS-1/DS-2 precedent). A#5 per-phase cadence is template text now: Step 3 fold-back is multi-Edit at sub-batch-of-1 regardless of Step 1 shape. Per Section T item 4: in single-session shape the ratified Write holds uncommitted until Step 3.

---

## Section 5b - Step 2 - code-informed stress-test pass

**Activity.** Open existing artifacts as adversarial input. Compare candidate against artifacts. Produce the three-class structured delta (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity findings) and phase-wide observations.

**Direction of authority preserved.** Code stress-tests the candidate; code never sources it. Code with no architectural home becomes a Class 3 finding, not a DS-3 capability.

**Expectation - state it, then verify rather than assume.** The DS-1 Step 2 baseline (as corrected by DS-2's PW-5 finding: **19 tables**, including `pending_email_invitations`) classifies `journeys` and `enrollments` as DS-3 territory. The expectation is **REAL findings**: existing journey substrate whose shape the cold candidate did not know; possible journey-related hooks, types, and routes; possible PC-4 admin RPCs mutating DS-3 tables (the cross-tier write discipline's named territory). Retractions of cold positions are likely - this is the code-rich entity the retraction-rate series (PC-4: 7/9 clusters; DS-1: zero; DS-2: zero) has been waiting for; record the data point per template text.

**Step 2 disk-evidence scope** - clusters, sized to the code-rich expectation:

- **Cluster S - structural survey first.** Broad survey before deep reads (PC-4 prior; template-resident directory-level scope-survey applies): list the migrations touching journey/enrolment vocabulary, scope-survey `lib/hooks/`, `lib/types/`, `lib/admin/`, `lib/supabase/`, and `app/api/` at directory level with per-file one-line classification before claiming anything as DS-3 territory.
- **Canonical-table reads.** `supabase/migrations/` cumulative-forward (A#8): every migration touching `journeys`, `enrollments`, or related functions/RLS/triggers, earliest to latest. Watch Section T item 1 (#4): anchor on substrate-completion artifact identity, not migration names.
- **Migration archeology.** `supabase/migrations/archive/` - did the D15 rebuild (`ce58227`) port all journey substrate, or is there a P11-class asymmetric-recovery gap? PW-MARCH1 (substrate-completion-window) may fire here for the first time.
- **Framework-mechanism evidence.** `lib/hooks/` + `lib/supabase/` - A#9 at its first code-rich DS test: what IS the realized journey contract surface (PostgREST RPC? hooks? custom routes?).
- **Admin orchestration.** `lib/admin/` - do admin helpers touch journeys/enrollments? Route findings into the cross-tier write discipline channel (PC-4 C3-7 + SS-4).
- **createClient survey.** `app/api/*` - any journey-touching routes; per-route gating + custom-route-vs-RPC justification.
- **Type drift.** `lib/types/*` - journey/enrolment types vs disk reality (PW-T1 coverage check both directions).
- **Mop-up greps.** `journey`, `enrollment` AND `enrolment` (spelling split - SS-17 sub-shape B pattern-variant blindness risk, and Section T item 2's (#5) plausible first firing site), `step`, `progress`, `depth`, `game`, `equipment`. Per SS-16/SS-17: state patterns searched; report "no hits within [patterns]," never "no hits anywhere."

**Step 2 cadence** (template text since `1de43ad`): compose three-class output between clusters as CC self-reflection discipline; surface ONCE at end-of-Step-2 with the full L3 Step 2 block + structured summary. Per-cluster composition is NOT a human ratification gate.

**Step 2 checkpoint surfacing.** After all clusters land: finding counts by class; retractions (the series data point); new A-candidates; PW-1 disk-anchoring outcome; PW-MARCH1 outcome; whether the code-rich expectation matched; Step 3 work scope as it emerges. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Activity.** Resolve Section 8 open questions; author the L3 Step 3 block; apply fold-back amendments per Step 2 findings; **classify forward-commitment per capability** - at a code-rich entity expect a MIX (some capabilities partially realized by existing substrate, some full forward-commitment; DS-1/DS-2's all-full-forward shape is not the expectation); produce pickup lists; author the closing bridge.

**Required deliverables - not pickup:**

- **Spec amendment / combined Write.** Single-session: one Write carrying Steps 1+2+3, committed once ratified at the Step 3 gate (Section T item 4). Fold-back Edits: fresh-read before every Edit; sub-batch-of-1 per A#5 per-phase cadence. Class 2 deltas fold inline into sections 1-7 (canonical-run requirement); the Step 2 block documents the journey, sections 1-7 the destination.
- **Seam resolutions folded where they belong.** The ratified Q1/Q2 answers amend `narrative.md` Section 8 (+ boundary text only if revised) - the sanctioned cross-entity edits, citing the ratification. A ratified DS-1 boundary revision (if any) amends `world-model.md` the same way. No other sibling edits.
- **PENDING.md disposition.** Append the rename outcome to the DS-3 rename entry (closing it as executed). ADR amendments are in-scope if a Q-resolution warrants one; the DS-1/DS-2 expectation is zero, with PENDING.md carrying candidates - but at a code-rich entity an X3-class signature-drift finding could warrant one; adjudicate per substance.
- **Entity CLAUDE.md** at the ratified renamed directory - DS-1/DS-2 precedent says author it. **Same commit: remove the `experience-engine/CLAUDE.md` expected-placeholder row from `.claude/skills/doc-health-check/SKILL.md` Section 7** (registry rule 2; the row names the old path - remove and note).
- **Pickup lists** - DS-4 (journey content blocks vs DS-3 structure, if touched), DS-5 (journey-scoped communication surfaces, if touched), DS-6 (journey discovery/marketplace seam; the DS-6 identity re-derivation watch stays untouched), DS-7 (Whisp-in-journey consumption), Journey Studio (the write-path; ADR-U026), Hub/Gimbal (equipment-profile consumption of journey equipment declarations, ADR-U025), and the doc-health channel. Each entry: receiving entity, substance, anchors.
- **Closing bridge** at `docs/planning/sessions/2026-06-10_NN_-_DS3-LANDED.md` (NN = next available index; adjust date if the session lands later), per Section 11.

**Step 3 checkpoint surfacing.** Before the L3 Step 3 block: surface the Q-resolution slate (pre-resolved by Step 2 / needs disposition / deferred-routed). Before any cross-entity edit or PENDING.md disposition: surface its scope. Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

Hard rules (template-resident; restated for the run):

- **Fresh-read before every Edit; never construct `oldText` from memory** - even same-session.
- **Structural-inventory-before-defect-assertion** - heading/sentence/token audit before claiming a composed-content defect.
- **Enumeration-claim-scoping (SS-16/SS-17)** - patterns named; "no hits within [patterns]"; watch the enrolment/enrollment variant.
- **Verify-before-asserting on commit-shape claims** - `git log -1 --format=%B <sha>`, never `--oneline`, for shape claims.
- **Cross-section fresh-read before second-touch Edits.**
- **Listing commands use explicit counts** - full `ls` or `| wc -l`, never head-truncated previews.

**Methodology-framing space.** Surface methodology observations throughout, not only at Section 13. Standing question for this run: does the Section 6 discipline set (entity-type-agnostic per the template's durable-shape note) hold at the first code-rich Domain Service?

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 sub-batch-of-1 (per-phase), A#8 cumulative-forward, A#9 framework-mechanisms, PW-1 schema-predates-partition, P-O1 actor primitive `get_current_personal_group_id()`. | Phase 2 close-out (`8976646`); `ecosystem-decomposition` skill (`e9c8a54`); template text since `1de43ad`. |
| **D7** | Role-name vocabulary is TEXT-keyed `role_templates`, not a PG ENUM. Journey-role gating prose pins here. | Experiment A Group C item 9; PC-3 Section 5. |
| **PW-5 19-table baseline (n=2)** | The end-state schema is **19 tables** (incl. `pending_email_invitations`); DS-1's 18-count was under-enumerated. Use 19 as the Step 2 baseline; re-verify rather than inherit either count. | DS-2 closing bridge doc-health block. |
| **Personal-data weight** | DS-2 holds no per-FIM/per-Shadow personal state; if loop RUNTIME state lands in DS-3 (Q2 cold lean), the personal-data weight + ADR-U027 Shadow-loop obligations land here. | DS-2 closing bridge Prompt 4. |
| **Cross-tier write discipline** | PC-4 admin RPCs directly mutate Domain-Service tables; whether DS-3 accepts cross-tier writes or publishes primitives PC-4 calls is a standing substrate question - journeys/enrollments are prime territory; frame instances into this channel. | PC-4 C3-7 + SS-4; Phase 2 close-out routing. |
| **Audit-write three-pattern formulation** | If DS-3 owns an audit-write surface (enrolment events?), characterize integrity properties across the three patterns. | PC-4 closing bridge Prompt 4. |
| **Naming-drift multi-layer compounding** | Naming drift compounds across 4+ consumer layers; dual-reading disposition per Section T item 2. The rename itself creates a fresh historical-transition layer - record it. | PC-4 PW-4 + SS-8. |
| **TS-type vs runtime-surface coverage gap (PW-T1)** | Run the type-vs-runtime coverage check both directions at Step 2. | PC-4 PW-T1. |
| **Supervised-bypass entity-owned-scope taxonomy** | Supervised-bypass variables have entity-owned scope; ownership tracks the introducing entity. | PC-4 C2-7. |
| **Cluster S structural-survey** | First-cluster broad survey front-loads bulk-disconfirmation; especially load-bearing at the first code-rich DS. | PC-4 Prompt 5. |
| **Whisp split (DECIDED)** | DS-1 world-presence / DS-7 being; DS-3 owns no face; consume, never reopen. | PENDING.md; DS-1 bridge decision 5. |
| **Respawn three-way split (CONFIRMED at DS-2)** | DS-1 position / DS-2 topologies + textures + return shapes / DS-3 delivery. This run derives the delivery side; confirm or revise with ratification. | DS-1 decision 6; DS-2 bridge decision 3. |
| **Sibling-provisional boundary rule** | DS-1's and DS-2's claims against DS-3 are provisional; this descent re-checks them (Section 5a seams; DS-2 Q1/Q2 resolve here). | world-model.md + narrative.md Sources-status. |
| **Engine-suffix half-decision (DECIDED)** | The suffix drops on both DS-2 and DS-3; only the journey-named form is open (candidate Journeys). Do not reopen the suffix. | DS-2 bridge decision 1; PENDING.md appended outcome. |

---

## Section 8 - A-candidate ledger - watches at DS-3 entry

- **A#1 latent-vs-delta, A#2 tier-shape escalation, A#3 database-shaped L2 framing, A#6 cold-derivation-with-priors, A#7 tool-payload verification** - bridge-prose framings; carry forward. A code-rich entity exercises more of them than DS-1/DS-2 did - watch A#1 (latent capabilities realized by existing substrate) and A#3 especially.
- **Retraction-rate series** - PC-4: 7/9 clusters; DS-1: zero; DS-2: zero. **DS-3 is the first code-rich DS data point - the series' key test** of whether retraction rate tracks code presence. Record per template text.
- **PW-MARCH1 (substrate-completion-window)** - PW-1 sub-shape; fires if journey substrate sits inside the D15 window with completion asymmetry.
- **PW-2 resolution-channel observation** - at near-zero-code entities, speculative-third-shape resolution shifted to the sibling-descent channel (DS-2 data point); at DS-3, watch whether Step 2 resumes resolving them directly.
- **Sweep-then-enumerate (n=1)** - first deliberate application at this run's rename ripple; verdict feeds promotion adjudication (n=2).
- **DS-3-specific additions** - any new candidate joins the ledger snapshot at the closing bridge.

---

## Section 9 - Disciplines in effect

All durable disciplines from the PC chain + Phase 2 close-out + Session B + the DS-1/DS-2 descents remain active:

- **Canonical-core precedence (hard):** the cores + universe-discovery files are the single source of truth. Specs conform to cores, never the reverse.
- **Ratify each judgment call with Stefan before canonical edits.** Checkpoints at Sections 5a/5b/5c; the FIRST DECISION and the seam re-checks are explicit ratification gates.
- **Commit at phase gates** - with the single-session cadence per Section T item 4 (ratified Step 1 Write holds uncommitted until Step 3).
- **CODE stays a correction target** - Step 2 reads code as evidence, never authority.
- **Trust disk over memory; re-read state at session open.** Tripwire #4 substitution per Section 6.
- **Sessions are append-only.** Forward-only correction.
- **`docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.**
- **Any new assertion-bearing diagram joins the doc-health-check diagrams registry in the same session.** (The rename label-edits two existing SVGs; registry rows unaffected - DS-2 precedent.)
- **ASCII only.** No Greek or non-ASCII characters in labels or identifiers. Hard rule.
- **Ferd non-closure (ADR-U008/U018):** journey kinds, depth settings (incl. the Game), progress states, equipment-requirement kinds - data-driven registries, never sealed enums.
- **Move-and-correct disposition;** in-commit consistency; append-only Option A for any ADR amendment.
- **OLDFEAT (`docs/TMP/OLDFEAT/`) read disposition:** blindness invariant carries forward (STATUS.md OLDFEAT-reconciliation row still Pending). Listing only; no content reads.

---

## Section 10 - Output expectations and commit shape

**Single-session run:** 4-6 commits - (i) combined spec Write covering Steps 1+2+3 (post-Step-3-ratification), including the ratified narrative.md Q1/Q2 amendments + any world-model.md amendment + PENDING.md disposition + the rename ripple (sweep-enumerated); (ii) entity CLAUDE.md + doc-health registry-row removal (same commit); (iii) closing bridge; (iv) STATUS.md row update (separate small `chore(planning)` commit). Split-session adds the Step-1-landed bridge + per-step commits per the template.

**STATUS.md discipline:** the DS-3 row is marked **In flight** by this opener's authoring commits; mark **Done** at close with closing-bridge link + Section 13-captured + template-revision columns filled.

**No push to origin** at session close. Stefan dispositions push as a deliberate next step.

---

## Section 11 - Closing bridge - required sections

The closing bridge at `docs/planning/sessions/2026-06-10_NN_-_DS3-LANDED.md` follows the standard session-bridge shape, plus:

- **Explicit closure statement:** "*DS-3 {ratified name} L1->L3 derivation completes at this commit batch*" (record the descent-name -> landed-name transition as DS-2's bridge did).
- **Pickup lists** by receiving entity (DS-4, DS-5, DS-6, DS-7, Journey Studio, Hub/Gimbal, doc-health channel) with substance + anchors.
- **Forward-commitment classification** per capability - expect a mixed profile; if substrate partially realizes a capability, say which migrations/sites anchor it.
- **A-candidate ledger snapshot** at DS-3 close, including the retraction-rate data point (the code-rich test).
- **PW status** at close (PW-1 disk-anchor outcome; PW-MARCH1; PW-2 channel observation; PW-5; sweep-then-enumerate verdict).
- **Methodology data points** - the Section 13 capture as a primary section.
- **Carry-forward to next entity** (DS-4 Content per STATUS.md numeric order) - what DS-4's opener must inherit, explicitly including any Q8/Q3 resolutions or re-routings (beat-vs-content-block boundary; mythology/lore/content three-way, joint with DS-1 Q5).
- **Template revision disposition** - adjudicate: the riding candidates #4/#5 (did either finally fire?); sweep-then-enumerate (n=2 evidence from this run's ripple); the commit-cadence clarification (did the explicit Section T item 4 text prevent the DS-2 tension?); the filename-convention disposition; plus any new candidates. Land as `chore(templates)` edits with Revision-history update, or ride forward - with rationale either way.

---

## Section 12 - Scope boundaries

- **The Whisp split is decided** - consume, never reopen. No DS-3 Whisp-face capabilities. The Whisp-split ADR promotion fires at DS-7, not here.
- **The Engine-suffix half-decision is decided** - only the journey-named form is open at the FIRST DECISION.
- **Cross-entity edits:** the ratified narrative.md Q1/Q2 amendments (+ boundary text only if leans reverse) and any ratified world-model.md boundary revision are the ONLY sanctioned cross-entity spec edits. All other Class 3 findings route to pickup lists.
- **The Game is NOT a product entity** (ADR-U025; STATUS.md removed its row) - the Game enters DS-3 only as journey depth; no product-entity derivation here.
- **Studios are not decomposed here** - Journey Studio is named as DS-3's write-path consumer (ADR-U026); studio decomposition is its own pipeline row.
- **DS-6 identity re-derivation watch** (DS-1 handoff item 8) - untouched; do not pre-resolve.
- **OLDFEAT blindness invariant** - listing only, per Section 9.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge is authored, answer the five template prompts (worked well / redundant-or-confusing / wished-was-named / new substance prior for DS-4 / new A-candidate or PW observation).

**Third-instance framing - first run on the revised template.** The `1de43ad` revisions (cluster-cadence text, directory scope-survey, A#5 per-phase, retraction-rate line, entity-type-agnostic Section 6 note, cores-in-authority-chain, Check 5, Check 4 genericization) face their first as-template-text application: report per-revision whether each held cleanly as template text or needed instance-level repair. Also capture, per Section T: #4 and #5 verdicts (first code-rich opportunity); sweep-then-enumerate verdict at the rename ripple (n=2 promotion evidence); the commit-cadence clarification verdict; the filename-convention disposition (this opener used entity-descriptive deliberately - adjudicate whether the template's convention line is amended). Record the retraction-rate data point and the run shape (single vs split session, and why).

Capture posture: generous rather than parsimonious. Brevity is fine when there is genuinely nothing to surface; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. Then Section 5a - surface the FIRST DECISION (the journey-named rename; suffix half decided, do not reopen) for Stefan's ratification BEFORE authoring any L2 identity text, then cold derivation, then the Section 5a checkpoint before the first Write.

---

*End of instance.*
