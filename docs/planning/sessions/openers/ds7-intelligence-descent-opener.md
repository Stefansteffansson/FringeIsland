# Autonomous L1->L3 session-opener - DS-7 Intelligence

**Instance authored:** 2026-06-11
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `766e134` exactly - unchanged since DS-4; NO revision landed at DS-5 or DS-6 close)
**Entity type:** Domain Service (entity 7 of 8 in Platform Domain, Phase 3 - the LAST Domain Service before the Extension System and the Phase 3 close-out)
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-11_01_-_DS6-LANDED.md`](../2026-06-11_01_-_DS6-LANDED.md) (closing-bridge commit `fd3bd02`; the DS-6 close batch + the post-close doc-health pass + the dependency-SVG fix end at `2930702`; origin is pushed to it; the cc-execute-prompt commit `9eaa758` and novel-path commits are acceptable interveners)
**Substantive predecessors (derivation authority for Step 1 carry-forward):** the DS-6 closing bridge (pickup block "DS-7 Intelligence (next entity; its opener must inherit)" - inherited in full below), `decisions/PENDING.md` (the Whisp-split entry - THE promotion source), the register Section 3 DS-7 row, and the routed seams accumulated across the whole chain (one per landed sibling - Section 2)

> Per-instance session-opener for the autonomous CC run executing DS-7 Intelligence L1->L3 derivation, end-to-end. **Seventh instance of the autonomous L1->L3 template.** Three-step shape: cold derivation -> code-informed stress-test -> adjudication. The stated Step 2 expectation is **NEAR-ZERO-CODE with named exceptions and ONE CORRECTED INHERITANCE** (calibrated at opener authoring, dual-method - Section 5b): the DS-6 bridge's claim that `profile_data` (ADR-U005) is realized substrate is **wrong on disk** - the table was never created anywhere (live, archive, seeds, lib, app); ADR-U005 is an UNREALIZED lock (the DS-5 U021 law-stands-unrealized shape). The realized DS-7-adjacent vocabulary is instead the `assessment` step-type cluster (DS-3/U008 territory; classify, don't discover). Single-session expected; split fallback per the template.
>
> **NO FIRST DECISION at this descent** (third no-decision run; DS-4/DS-5 precedent - the first ratification gate is the Step 1 checkpoint). PENDING.md's related watch-items line already dispositions the DS-7 name in place: *"DS-7 'Intelligence' kept deliberately - renaming it 'Whisp' would break the cosmology-neutral naming lock platform entities honour."* **Do not reopen.**
>
> **THE WHISP-SPLIT ADR PROMOTION FIRES AT THIS DESCENT** (PENDING.md, riding since DS-1): the split-by-face decision (DS-1 world-presence / DS-7 being) promotes to a numbered ADR in this run's close batch - **the first PENDING-to-ADR promotion of the descent series.** Promotion executes the parked candidate using `docs/templates/adr.md`; it does NOT re-litigate the split. The promotion scope (shape, number, what it cites) is a ratification gate to Stefan before it lands. **STOP and surface if the derivation surfaces anything contradicting the split.**

---

## Section T - candidates and watches riding this instance

1. **Candidate #4 - migration-name-as-shorthand.** RIDES (n=6 opportunities, 1 decisive firing at DS-5; no fire at DS-6). **DS-7 is the LAST entity before the Phase 3 close-out - this run's verdict feeds the landing adjudication** (promotion with the DS-5 firing as evidence, or retirement). Classify any touched migration by content, never by filename.
2. **Tier-CLAUDE-as-L1-boundary-authority (n=2 watch, applied as instance rule at authoring).** The tier file (`docs/platform/CLAUDE.md`) and sub-tier file (`docs/platform/domain/CLAUDE.md`) were swept for DS-7's domain nouns (AI/intelligen/whisp/profile/sense/assess/mentor/accumulat/guard). Tier file: enumeration only (line 98). Sub-tier file: the known hit verified at line 15 - *"rules specific to one service (e.g., Intelligence's AI-derived data obligations under Privacy ...) live at that service's eventual entity-level CLAUDE.md"* - a **cascade-placement pointer naming future entity-CLAUDE content, not boundary law**. NO-FIRE; record the n=3 data point in Section 13.
3. **Seeds-directory-in-canonical-table-reads (n=1 rider from DS-6, applied as instance rule).** Sweep `supabase/seeds/` alongside migrations everywhere the canonical-table-read discipline applies - seed files carry canonical vocabulary in this repo. **The rule already fired productively at this opener's authoring:** the assessment-vocabulary hits in `seeds/01_permissions.sql` (line 39, `complete_journey_activities` names assessments) and `seeds/05_professional_pathfinders.sql` (seeded journeys with `"type": "assessment"` steps) are invisible to a migrations-only sweep. Record the n=2 evidence in Section 13; the closing bridge adjudicates template candidacy.

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding. Material divergence halts; non-material citation corrections bundle into the Step 1 checkpoint (template text).

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `2930702` (the DS-6 close batch + the doc-health pass + the dependency-SVG fix end there; origin is pushed to it). Acceptable interveners: `9eaa758` (cc-execute-prompt carrying this run's prompt), this opener's authoring commit + its STATUS.md update, novel-path commits (shape (b) below). Hard-fail if earlier; anything new in `docs/platform/` or `docs/architecture/decisions/` not named here must be surfaced and adjudicated.
4. **Working tree state.** Run `git status`. Expected: clean, with TWO named acceptable shapes:
   - **(a) Root `CLAUDE.md` context-mode re-injection** (registered re-occurrence): modified with the diff solely the appended "context-mode - MANDATORY routing rules" block (insertions only). Disposition: **discard** (`git checkout -- CLAUDE.md` or `git restore CLAUDE.md`; if the permission classifier denies, **Edit-removal is the sanctioned fallback** - both outcomes precedented; at this opener's own authoring the classifier denied the restore and the Edit fallback was used). Verify the diff is SOLELY that block first. The injection can re-occur mid-run; re-disposition the same way.
   - **(b) Concurrent `docs/novel/` activity** - a parallel writer is active in this repo (commits `007b9a5`, `4f00fac`, `4019e32` precedent - the writer has committed *mid-session, between this pipeline's own commits* at DS-5 and DS-6; Swedish translation chapters `docs/novel/chapters-sv/` now exist, with `4019e32` marked "translation complete" - the writer may or may not still be active). Novel-path commits at or after the tip anchor, and untracked files under `docs/novel/`, are acceptable interveners, NOT hard-fails. Do not read, modify, or commit them.
   - Anything else unnamed in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`: **hard-fail**.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `766e134` exactly. Hard-fail if earlier; soft-flag and adjudicate if later.

**Generic environment note (DS-3 + doc-health + this authoring's precedent):** the auto-mode permission classifier can deny seemingly-routine actions at novel sites. Standing fallback: surface the denial, use the narrowest sanctioned alternative. Do not work around silently.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop on material divergence; surface and wait. Non-material citation corrections bundle into the Step 1 checkpoint.

1. **`docs/planning/sessions/2026-06-11_01_-_DS6-LANDED.md`** - chronological + substantive predecessor. Load-bearing: the DS-7 pickup block (the recommendation-signal seam; the Whisp-split promotion reminder; the routed-seam slate; the dispositioned naming watch-item; the opener-authoring notes this instance executed - including the seeds-sweep lesson and the profile_data calibration instruction whose execution CORRECTED the bridge's own claim); the ratified DS-6 charter (the published world's find-layer; no DS-1 dependency); the marketplace boundary (SETTLED).
2. **`docs/architecture/decisions/PENDING.md`** - **THE PROMOTION SOURCE.** The Whisp-split entry in full: DS-1 owns the Whisp's **world-presence state** (cord position/state/dial, anchor chain, severance tier, respawn position); DS-7 owns the Whisp **as a being** (dialogue, empty-fills-by-growth, the senses/Big-5 model, the maturity/internalisation arc - the cord's *salience* channel is DS-7-derived, rendered through DS-1's cord - and guard railing); dependency direction DS-7 consumes DS-1 ("the intelligence acts in the world; the world never depends on the intelligence"); an eighth Whisp service was considered and rejected (a thin orchestrator owning almost no data); the entity stays canonical in the beings core; *"Promote when the DS-7 descent runs (the second consumer of the boundary), using `../../templates/adr.md`."* Also confirm: the related watch-items line dispositions the DS-7 name in place (NO FIRST DECISION); the DS-3 and DS-6 entries are resolved history.
3. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - Section 3 DS-7 row, this run's charter seed (verified at authoring, line 166): *"DS-7 Intelligence | CONSTRAINED | Whisp dialogue; assessments dissolved (validity question open); starved-drive sensing (S28); guard railing"*. Also Section 6 for standing residue.
4. **`docs/platform/domain/world-model.md`** - DS-1's canonical spec. **§8 Q7 (a routed seam this descent owns, line ~116):** *"Salience-channel input contract. The exact shape of DS-7's maturity feed onto the cord (push event vs derived read) - settled at DS-7's descent against the Whisp-split decision (PENDING.md)."* Also the cord-operations line (~61): salience-channel input is DS-7-fed; the dependency line (~80): *"The cord's salience channel is DS-7-fed through DS-1's own contract (DS-7 -> DS-1 call direction), not a DS-1 dependency on DS-7"* - THE direction pattern DS-7's outbound seams follow; the Sources-status note (~190): the Whisp-split promotion is *pending* there - "if the DS-7 descent revises the split, the Whisp-presence area here re-derives" (promotion is NOT revision; nothing re-derives on a clean promote).
5. **`docs/platform/domain/journeys.md`** - DS-3's canonical spec. **§8 Q3 (a routed seam this descent owns, line ~113):** *"The AI-Generative route seam with DS-7. For AI-Generative journeys, where does Wayfinder authorship end and generation intelligence begin - does DS-7 author through the same Wayfinder-gated write-path, or through a distinct generation seam with its own audit posture? Resolves at the DS-7 descent"* (joint with content.md §8 Q8). Also the personalisation seam (§2 row ~51, §3 ~63, consumers ~65): the shaping intelligence is DS-7's, fed **through DS-3's contract** (DS-7 calls DS-3 - the DS-1 salience-channel direction pattern); personalisation deepens only with voluntary disclosure breadth; *"the contract exposes no coercion surface"*. §8 Q5 (~115) is an anchor, not this run's resolution: personalisation-state *shape* is DS-3's L4 work "after the DS-7 input-seam contract firms" - this run firms the input-seam contract shape.
6. **`docs/platform/domain/content.md`** - DS-4's canonical spec. **§8 Q8 (a routed seam this descent owns, line ~109):** *"AI-generated content posture. For AI-Generative journeys (DS-3 §8 Q3, joint) and any DS-7-authored content: does generation write through the same role-gated write-path with a distinct audit posture, or through a dedicated generation seam? Routes to the DS-7 descent (which also owns the Whisp-split ADR promotion)."* Also the consumer line (~59): DS-7 reads content context and, for AI-generated content, prospectively writes through the same write-path under a posture this descent owns.
7. **`docs/platform/domain/communication.md`** - DS-5's canonical spec. **§8 Q5 (a routed seam this descent owns, line ~99):** *"Whisp-carried messages (speculative-third-shape). Does the Whisp ever carry FIM-to-FIM communication? Cold lean: no - the branch is the FIM-FIM channel (S36); Whisp dialogue is DS-7's being-face. Defers to DS-7's descent."* Also the provisional consumer line (~59): *"DS-7 Intelligence may read communication context for profile accumulation (privacy posture per its own descent)"* - re-check from the owned side.
8. **`docs/platform/domain/discovery.md`** - DS-6's canonical spec. **§8 Q2 (a routed seam this descent owns, line ~92):** *"Recommendation-signal sourcing. What feeds affinity beyond declared facets - explicit interests only at Ferd, or DS-7-accumulated profile signals later? Tagged speculative-third-shape; joint with the DS-7 descent (privacy posture per its own derivation; PC-2 consent surface binds)."* Resolve from the DS-7 side. Also the provisional consumer line (~56): DS-7 may consume declared-interest facets as profile context. Note the dependency-SVG desc (revised at `2930702`) asserts "Intelligence also reads Discovery and the Extension System" - verify the derived dependency set against it.
9. **`docs/platform/domain/narrative.md`** - DS-2's canonical spec (light read). The consumer line (~64): *"DS-7 reads character and story context where the Whisp speaks inside a story (consume-only)"* - re-check from the owned side. Also the loop-persistence rows (~49, ~133): *"the persisted runtime data itself is DS-3/DS-7 territory"* - which slice is DS-7's (accumulated relational insight / emotional clarity into the profile?) is a boundary to settle from the owned side.
10. **Canonical cores (hard precedence):**
    - **The beings core (`docs/ecosystem/universe/beings/README.md`) - THE primary core for DS-7.** The Whisp sections: inner dialogue, one per person (S1); **empty at first, filled BY the human growing** (S2 - "the growth is the mechanism"); **assessments dissolved into dialogue** (S17 - validated instruments never delivered as questionnaires; "the structure of the assessment preserved, the form transformed"); the **Big-5-to-five-senses mapping** with intrinsic, never-coerced motivation and disclosure-anchored Whisp quality (S17-18); the avatar framing (S22 - two framings, one entity; the cord/Void/severance live in the cosmology core, DS-1's face); **internalised by design** (S6-7 - "built to graduate, not retain"; the cord's visibility recedes as the relationship matures - the salience channel's canon source). **Registered canon-sub-page gap (proceed-with-remark, DS-3 precedent):** the planned `whisp.md` sub-page is *"Awaiting specification ... prerequisite to DS-7 Intelligence implementation"* (beings README sub-page table) - the gap is named; Sources-status carries it; it bounds implementation, not this L1->L3 derivation.
    - **The personal-growth core (`docs/ecosystem/universe/personal-growth/`)** - **starved-drive sensing** (`three-questions.md` ~line 34): the Whisp senses which of Live/Grow/Matter is currently starved and leans the journey toward restoring balance (S28 - the dance-partner, never a staircase; "Grow is delight, not deficiency"). The register row's S28 foot traces here. Also `privacy-model.md` + `engagement-spectrum.md` for the disclosure/consent posture.
    - **The cosmology core** - boundary input only (the cord, Void, anchoring, severance are DS-1's face); S38 ambient-crown for the anti-leaderboard inheritance.
    - **The roles core** - Shadows have their own Whisp and cord from the start (Shadow-Whisp data inherits U027 ephemerality); role gates on whatever DS-7 exposes.
    - The universe-discovery files where the cores cite them (S17/S18/S28 statements).
11. **`docs/ecosystem/PRINCIPLES-AI.md` (constitutional) - NEW to the authority chain; no predecessor opener carried it.** The guard-railing law: *"Guard railing - bidirectional, always human-authored"* - rails constrain the AI AND help the AI protect the human's own intentions; *"If AI defined its own guard rails, authorship of the [rails is lost]"* - DS-7 enforces rails, never authors them. Also: AI is an extension, not an autonomous worker; the last say is authorship. **The register row's "guard railing" foot traces HERE, not to any ADR.**
12. **`docs/platform/domain/README.md` + `docs/platform/domain/CLAUDE.md`** - sub-tier rules; the DS-7 L2 inventory line (verified at authoring, README line 15): `- **DS-7 Intelligence** (`intelligence.md`) - the Whisp **as a being** (dialogue, empty-fills-by-growth, the senses model, the internalisation arc, guard railing - per the Whisp-split decision, ../../architecture/decisions/PENDING.md), profile accumulation`. The line is unusually rich (it already carries the split) - the L2-line altitude check asks whether "profile accumulation" and the being-face enumeration sit at the right altitude.
13. **ADRs (enumerated by domain-noun grep at authoring; re-verify membership against the decisions listing AND verify attributed text against the ADR files - template §3 text).** Sweep terms used: AI / intelligen / whisp / profile / sense / assess / mentor / accumulat / guard (+ supplementary personalis[z] - zero ADR hits; the vocabulary lives in specs and canon). The adjudicated binding set, with what each file actually says:
    - **U005 (THE entity-specific lock - profile data as a separate flexible table):** *"The member profile needs to accumulate dynamic data from multiple sources over time: assessment results from journeys, reflections from content, insights from Intelligence, self-defined intentions."* A `profile_data` table with a **bucket/source model**; *"Buckets are data, not schema"* - new buckets are rows, no migration. **UNREALIZED on disk** (Section 5b) - the lock binds the storage shape; nothing realizes it yet.
    - **U023** (decomposition) - Intelligence named in the seven-services block; services communicate through the Internal API.
    - **U016 (cascade specification-first - entity-specific slot):** the cascade template carries an explicit *"Intelligence: [what happens to AI context]"* slot (line 37). Lifecycle cascades must specify DS-7 effects - retired/deleted things leave the AI context.
    - **U027** (Shadow lifecycle) - Shadows have their own Whisp and cord from the start; Shadow-Whisp being-face data (dialogue state, accumulation) inherits TTL-erasure; transcendence carries it over.
    - **U010** (Privacy dedicated vertical) - *"AI data handling"* is named as a distinct Privacy concern (with consent management, portability, the Article 30 data map). Binds DS-7's accumulation posture; pairs with the sub-tier CLAUDE pointer (Section T item 2).
    - **U008** (step-type extensibility) - "assessment" is a Tier 1 step type; "AI-generated content" a named future step type. Boundary input: step types are DS-3/Extension territory; the realized assessment step type is the canon-tension artifact (Section 5b), and the generation seam (Q8/Q3) touches U008's future-types line.
    - **U018** (registry non-closure) - bucket kinds, sense kinds, signal kinds, dialogue-context kinds: registries, never sealed enums.
    - **U002** (five verticals) - Privacy and Observability obligations on AI-derived data; no AI vertical exists - DS-7 is a service, its obligations resolve within U002's law.
    - **U025/U026** (equipment-grain; studios law) - feature-keying stays at surfaces; the three sub-studios write to DS-1/DS-2/DS-3 - **no studio writes to DS-7**.
    - **U028** (governance by scope) + **U007/U006/U003** (permission model; universal group pattern; Supabase substrate) - standard gating/scoping/storage law.
    - **Recorded false positives (excluded with rationale):** U003 + U014 "AI" hits (vibe-coding methodology prose - AI as development assistant, not platform AI); U004 (temporary-profile "profile" is the PC-2 user-profile record; anon posture enters via U027/PC-2, not as a DS-7 lock - the DS-6 exclusion shape); U025 "sense"/"senses" hits (the **Gimbal senses-surface** - a DIFFERENT sense of "senses" than the Whisp's Big-5 senses model; a live vocabulary collision to keep straight in prose); U025-U028 "profile" hits (equipment profiles); "mentor" zero hits (dual-method verified).
14. **`docs/planning/sessions/openers/STATUS.md`** - confirm the DS-7 row is `In flight` with this opener linked.

Then verify against disk (template §6 discipline; empty-result verification binds as template text):

- Spec at `docs/platform/domain/intelligence.md` - confirm does NOT yet exist (verified absent at opener authoring, dual-method: directory listing + explicit-path test). If it exists, hard-fail and surface.
- Entity CLAUDE.md at `docs/platform/domain/intelligence/CLAUDE.md` - confirm does NOT yet exist (the `intelligence/` directory itself does not exist at authoring, dual-method). **Registered expected placeholder:** `.claude/skills/doc-health-check/SKILL.md` Section 7 carries its row (line ~442 at authoring: *"docs/platform/domain/intelligence/CLAUDE.md | DS-7 Intelligence entity-level CLAUDE.md | ... | Pending - when L2 specification is authored"*). When this run authors the file, **remove that registry row in the same commit** (registry rule 2; classifier-fallback note at Section 1; DS-4/DS-5/DS-6 precedent: the Edit was permitted).
- `decisions/PENDING.md` state as described (the Whisp-split entry present and consumed-only since DS-1; the watch-items line dispositions the DS-7 name; this run's close batch dispositions the Whisp-split entry at promotion).
- This opener at its landing path (`archive/` it at session close per the only-live-artifacts rule).

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md` (swept for domain nouns at authoring - enumeration only; Section T item 2)
- **Sub-tier:** `docs/platform/domain/CLAUDE.md` (same sweep; the AI-derived-data-under-Privacy pointer is cascade-placement, not boundary law)
- **L2 inventory line:** the README line 15 text (Section 2 item 12) - already carries the split-by-face decision; altitude check per Section 5a
- **Canonical cores (hard precedence):** the **beings core** (PRIMARY - the Whisp being-face: S1/S2/S17-18/S22/S6-7), the **personal-growth core** (starved-drive sensing S28; privacy-model; engagement spectrum), the cosmology core (boundary input - the cord/Void/severance are DS-1's face; S38 ambient crown), the roles core (Shadow-Whisp posture; role gates), plus the universe-discovery files where the cores cite them.
- **Constitutional:** `docs/ecosystem/PRINCIPLES-AI.md` - the guard-railing law (bidirectional, always human-authored; DS-7 enforces, never authors); AI as extension, not autonomous worker.
- **Conformance constraint:** the register Section 3 DS-7 row (Whisp dialogue; assessments dissolved - validity question open; starved-drive sensing S28; guard railing).
- **Architectural authority:** the ADR set at Section 2 item 13, with U005 as the (unrealized) storage lock, U016's Intelligence cascade slot as entity-specific text, U027's Shadow-Whisp ephemerality, and U010's AI-data-handling Privacy law.
- **The Whisp-split decision (PENDING.md)** - consumed as settled architecture throughout Step 1; promoted to a numbered ADR at Step 3. The split text IS derivation input (it enumerates the being-face).
- **Template:** `docs/templates/domain-service-spec.md` (slug `intelligence` - verified present in the slug enum; no rename pending, no ripple).
- **Sibling seams (boundary input, NOT capability source):** `world-model.md` (§8 Q7 salience contract; the DS-7->DS-1 call direction), `journeys.md` (§8 Q3 generation seam; the personalisation input seam; §8 Q5 anchor), `content.md` (§8 Q8 generation posture; context-read line), `communication.md` (§8 Q5 Whisp-carried messages; context-read line), `discovery.md` (§8 Q2 signal sourcing; facet-read line), `narrative.md` (context-read line; the loop-persistence DS-3/DS-7 slice) - consulted only for the named seams; DS-7 capabilities derive from the cores + PRINCIPLES-AI + ADRs + the split, never from sibling specs.
- **Predecessor carry-forward:** the DS-6 bridge's DS-7 pickup block + Section 7 priors.

**Cold-derivation discipline.** No reads of `supabase/migrations/`, `supabase/seeds/`, `lib/`, `app/`, `components/`, `tests/`, or FEAT-* files at Step 1. Knowing THAT the named assessment-cluster exceptions exist (this opener's calibration, Section 5b) is prior; reading their shape is contamination. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.

**Cold frame to stress (from the register row + the split + cores + PRINCIPLES-AI + ADRs + routed seams):**
- **(a) The Whisp being-face:** dialogue (the inner-dialogue runtime - S1; one per person; private); **empty-fills-by-growth state** (S2 - the filling mechanism, anchored to FIM growth and disclosure); the **senses/Big-5 model** (S17-18 - validated instruments dissolved into dialogue, structure preserved, form transformed; the register row's *validity question stays open* - likely a §8 question, not resolvable from code); the **maturity/internalisation arc** (S6-7 - graduate-not-retain; feeds the cord's salience channel through DS-1's contract, §8 Q7's resolution); **guard railing** (PRINCIPLES-AI - bidirectional, human-authored rails that DS-7 *enforces*).
- **(b) Profile accumulation** (the L2 line's second foot; U005's bucket/source model - assessment results, reflections, insights, self-defined intentions; consent-gated per PC-2; disclosure-anchored per S17-18; Shadow data TTL-bound per U027; "AI data handling" Privacy obligations per U010).
- **(c) Starved-drive sensing** (S28 - Live/Grow/Matter balance sensing; orients journeys via the personalisation seam, never surfaces as comparison or score - the anti-leaderboard guardrail binds DS-7's accumulation too: no people-ranking, no comparative surfaces, ever).
- **(d) The outbound feed seams (all DS-7-calls-sibling, the DS-1 direction pattern):** salience -> DS-1's contract (§8 Q7: push event vs derived read); personalisation input -> DS-3's contract; generation -> DS-4's write-path under the Q8/Q3 posture.
- **(e) The context reads:** DS-2 story/character context, DS-4 content context, DS-5 communication context (privacy posture owned here), DS-6 declared-interest facets (§8 Q2), DS-1 world state.
- **(f) Dependency position:** DS-7 sits at the TOP of the Domain dependency order - it consumes (potentially) every sibling; **nothing consumes DS-7** ("the world never depends on the intelligence"). Verify the derived set against the dependency-SVG desc (which names Journeys->Intelligence feed and Intelligence-reads-Discovery + Extension System).

**Structural questions this descent owns (the routed-seam slate - resolve from the owned side; each sanctioned cross-entity amendment gates individually at Step 3):**
1. **The salience-channel contract shape** (world-model.md §8 Q7): push event vs derived read. Sanctioned amendment: `world-model.md` §8 Q7.
2. **The generation seam** (content.md §8 Q8 + journeys.md §8 Q3, joint): same role-gated write-path with a distinct audit posture vs a dedicated generation seam. PRINCIPLES-AI's last-say-is-authorship law and U008's future-types line are the frame. Sanctioned amendments: `content.md` §8 Q8 + `journeys.md` §8 Q3.
3. **Whisp-carried messages** (communication.md §8 Q5): cold lean inherited - NO; the branch is the FIM-FIM channel (S36); Whisp dialogue is the being-face, never a transport. Sanctioned amendment: `communication.md` §8 Q5.
4. **Recommendation-signal sourcing** (discovery.md §8 Q2): may DS-7-accumulated profile signals feed DS-6's affinity shaping, and under what consent posture (PC-2 consent surface binds; explicit interests only at Ferd is the standing cold lean). Sanctioned amendment: `discovery.md` §8 Q2.
5. **The loop-persistence DS-7 slice** (narrative.md's "DS-3/DS-7 territory"): which slice of persisted loop-runtime data is DS-7's (accumulation into the profile?) vs DS-3's (delivery state). Likely a consumer-line-grade clarification, not a Q amendment.
6. **The assessments-dissolved validity question** (register row: "validity question open"): whether instruments dissolved into dialogue retain psychometric validity is a canon-level open question - expect it to land as a §8 question with the S17 lock stated, not to resolve.

**SETTLED - do not re-litigate (consume only):**
- **The Whisp split is decided** (PENDING.md; ratified at DS-1) - this run PROMOTES it; it does not reopen it. STOP if the derivation contradicts it.
- **The DS-7 name is dispositioned in place** ("Intelligence" kept; renaming to "Whisp" would break the cosmology-neutral naming lock). NO FIRST DECISION.
- **The notifications boundary** (vertical owns the obligation, DS-5 routes, products surface - ratified at DS-5).
- **The attachment seam** (DS-4 assets referenced opaquely by ID - n=4 direction pattern).
- **Profile/avatar media is PC-2/PC-3 substrate** (content.md §8 Q2, ratified at DS-4) - distinct from DS-7's profile-DATA accumulation; keep the two "profile" senses straight.
- **The feed-vs-recommendation boundary** (anything beyond chronology + scope filters is DS-6's - resolved at DS-6). DS-7 feeds signals at most (§8 Q2); it owns no recommendation surface.
- **The anti-leaderboard guardrail is invariant and enforced at sources** (world-model invariant 2; journeys invariant 8; register). DS-7's accumulation never becomes a comparative or ranking surface.

---

## Section 4 - Three-step work shape

Step 1 cold derivation -> Step 2 stress-test (A#8 cumulative-forward) -> Step 3 adjudication with forward-commitment classification + THE ADR PROMOTION. Stated expectation: near-zero-code, predominantly full-forward profile (the DS-6 shape; the corrected calibration at Section 5b makes DS-7 *closer* to pure near-zero than the DS-6 bridge predicted). Single-session expected; choose at the Step 1 checkpoint with Stefan.

---

## Section 5a - Step 1 - cold derivation

**Activity.** NO FIRST DECISION precedes this step (the name is dispositioned; the charter seed stands unchallenged). Author the candidate L3 inventory from upstream authority only. Write to `docs/platform/domain/intelligence.md` the L2 sections 1-7 (+ service-level invariants block per the DS-1..DS-6 additive precedent) and the L3 inventory + dependency chain + external dependencies + Sources-status.

**Derivation scope:** the cold frame at Section 3 - dialogue runtime; empty-fills-by-growth state; the senses/Big-5 model (dissolved assessments); the maturity/internalisation arc + salience feed (§8 Q7 resolution); guard-railing enforcement (PRINCIPLES-AI law: rails human-authored, DS-7-enforced; bidirectional); profile accumulation (U005 bucket/source shape; consent + disclosure anchoring; U027 Shadow ephemerality; U010 AI-data-handling obligations); starved-drive sensing (S28) feeding the DS-3 personalisation seam; the generation posture (Q8/Q3); context reads with owned privacy posture (DS-5 line); signal supply to DS-6 (Q2); lifecycle cascades (U016's Intelligence slot: what happens to AI context on retirement/deletion/transcendence); write gating per U007/U028; registry non-closure (U018: bucket kinds, sense kinds, signal kinds); internalisation/graduation as a lifecycle posture (the platform is built to graduate - what does DS-7 *retire* as the Whisp internalises?).

**Carry-forward priors:** the five named disciplines (A#5 per-phase, A#8, A#9, PW-1, P-O1), D7, and the Section 7 table. At a near-zero-code entity expect P-O1/D7 to pin gating prose. **A#9's named site here:** the contract surface for dialogue and accumulation - check whether framework mechanisms (PostgREST RPC, Supabase Realtime channels, Edge Functions for model calls) are the canonical shapes before declaring a speculative third one; no AI substrate exists, so A#9 may have no realized object (the DS-6 PW-1 shape) - say so explicitly if so.

**Watches armed at Step 1:** A#9 (per above); hypothesis pruning (plausible-but-unconfirmable shapes become §8 questions tagged speculative-third-shape - candidate sites: the dialogue-runtime architecture (model-call substrate is app-tier per Finding #4's frame), the salience-feed shape pre-resolution, the validity question, signal-supply shape); L2-line altitude (the line is rich and already split-aware; check "profile accumulation" altitude and whether the being-face enumeration belongs at L2).

**Step 1 checkpoint surfacing.** After the candidate is composed, pause and surface to Stefan BEFORE the first Write: capability count by area; the six structural-question positions (Section 3 slate); the six sibling consumer-line re-check positions; the L2-line altitude finding; §8 question count; speculative-third-shape tags; single-vs-split choice; any state-read citation corrections bundled - **including the corrected profile_data calibration (this opener already names it; re-confirm at execution)**. Wait for ratification.

**Single-Write preferred; A#5 per-phase; the ratified Write holds uncommitted until Step 3** (template text).

---

## Section 5b - Step 2 - code-informed stress-test pass

**Direction of authority preserved.** Code stress-tests the candidate; never sources it.

**Expectation - stated for Step 2 to verify rather than assume (calibrated at opener authoring 2026-06-11, dual-method):** DS-7 is **NEAR-ZERO-CODE with named exceptions, and the inherited "profile_data is realized" claim is CORRECTED:**
- **`profile_data` does NOT exist anywhere** - zero hits in live migrations, `archive/`, `seeds/`, `lib/`, `app/` (exact-pattern + loose case-insensitive second method; the loose method's only hit is `lib/types/user.ts` `ProfileData` - a profile-display-page interface unrelated to U005's table; a named false positive and a PW-T1-adjacent naming site). The DS-6 bridge's "realized DS-7-adjacent substrate" claim was wrong; the calibrate-don't-inherit instruction it carried caught its own error. **ADR-U005 is an unrealized lock** (the DS-5 ADR-U021 law-stands-unrealized shape).
- **No DS-7 tables** (the rebuild's 18 CREATE TABLE statements contain nothing intelligence-shaped; re-verify the 19-table baseline per PW-5 rather than inherit); **no `lib/ai/` or `lib/intelligence/`** (lib dirs at authoring: admin auth constants dashboard email hooks messaging notifications supabase types); **zero whisp/mentor code hits** (dual-method).
- **The named exceptions (classify against the charter, don't discover):** the **assessment step-type cluster** - `lib/types/journey.ts` `StepType = 'content' | 'activity' | 'assessment'`; rendered at `app/journeys/[id]/page.tsx`, `components/journeys/StepContent.tsx`, `components/journeys/StepSidebar.tsx`; seeded assessment steps in `20260228111514_sprint1_foundation_schema.sql` (live), `seeds/05_professional_pathfinders.sql`, `archive/20260127_seed_predefined_journeys.sql`; the `complete_journey_activities` permission text names assessments (`seeds/01_permissions.sql` line 39). Expected classification: **DS-3/U008 step-type substrate in canon-tension with the dissolved-assessments lock (S17)** - questionnaire-form assessment steps are exactly the form the canon transforms away; classify as DS-3 evolution debt / canon-tension anchor, NOT DS-7 substrate. The classification IS the finding.
- **Named false positives:** the seeded "Emotional Intelligence at Work" journey (content vocabulary, not the service); `ProfileData` in `lib/types/user.ts` (display type).
- Expect a **predominantly (plausibly ALL) full-forward profile**. **Record the retraction-rate data point** (series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0; DS-6 0).

**Clusters, sized to the near-zero expectation (sandboxed sweeps per the DS-3..DS-6 context-economy precedent):** **Cluster S structural survey first** (the named-exception files, per-file one-line classification); migrations cumulative-forward (A#8) **including `archive/`** (PW-MARCH1: did D15 lose any AI/profile-accumulation substrate? expect a clean nothing-to-lose verdict) **AND `supabase/seeds/`** (Section T item 3 - the instance rule; seed files carry canonical vocabulary); framework-mechanism check (A#9's named sites above); `lib/types/` scope-survey (PW-T1 named site: `ProfileData`); permission-constant survey (any AI/whisp/profile-gated rows); mop-up greps - **scope the noisy terms carefully** ("AI" collides with vibe-coding prose and mid-word 'ai'; "sense"/"senses" with the Gimbal senses-surface (U025) and prose; "profile" with PC-2 user profiles AND U025 equipment profiles; "intelligence" with the seeded emotional-intelligence journey; "guard" with S34/S35 gardening-not-guarding; state patterns and exclusions per SS-16/17; empty-result verification binds on every zero-hit claim, template text - at this entity most claims will be zeros, the rule is the workhorse again).

**Boundary classifications to run against ratified Step 1 positions (not skip):** the assessment step-type cluster against the dissolved-assessments charter (per above); `ProfileData` against U005's table; the seeded-content vocabulary; any realized consent/disclosure substrate (PC-2 territory - classify, don't absorb).

**Cadence:** template text - cluster self-reflection between, surface ONCE at end with the three-class block + structured summary; per-cluster composition is not a gate.

**Step 2 checkpoint surfacing.** Finding counts by class; the boundary classifications; retraction-rate data point; PW-1/PW-MARCH1/A#9/#4 outcomes; the seeds-rule n=2 verdict; Step 3 scope **including the ADR-promotion scope preview**. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Required deliverables - not pickup:**

- **Spec** (combined Write committed at the Step 3 gate; fold-back Edits sub-batch-of-1 if needed; Class 2 deltas fold inline).
- **Seam resolutions folded where they belong:** the ratified amendments to `world-model.md` §8 Q7, `content.md` §8 Q8, `journeys.md` §8 Q3, `communication.md` §8 Q5, `discovery.md` §8 Q2 (each gated individually at the Step 3 checkpoint; confirmations need no edit), plus any ratified revisions from the six sibling consumer-line re-checks.
- **THE WHISP-SPLIT ADR PROMOTION (the headline deliverable):** promote the PENDING.md candidate to a numbered ADR using `docs/templates/adr.md`, as its own commit in the close batch, **with the PENDING.md entry dispositioned (promoted) in the same commit**. The first PENDING-to-ADR promotion of the descent series. **Ratification gate to Stefan BEFORE it lands: the shape (a new ADR, not an Option A amendment), the number (next free ADR-U0NN - verify against the decisions listing), and what it cites (the DS-1 descent ratification, the beings core's two-framings line, the DS-1 + DS-7 spec anchors, the rejected eighth-service alternative).** Promotion executes the parked candidate verbatim in substance; drafting house-style is the only latitude. Also revise `world-model.md`'s Sources-status "promotion pending" remark to cite the landed ADR (sanctioned consequential edit).
- **Entity CLAUDE.md** at `docs/platform/domain/intelligence/CLAUDE.md` + **same-commit registry-row removal** from `.claude/skills/doc-health-check/SKILL.md` Section 7 (line ~442; classifier-fallback note at Section 1; DS-4/DS-5/DS-6 precedent: the Edit was permitted).
- **Domain README L2-line revision** if the altitude check finds one (gated), + domain CLAUDE.md existing-specs enumeration update.
- **Pickup lists** - Extension System (next in the queue: every DS registers plugin contracts with it; DS-7's registry-non-closure surfaces; whatever Step 2 surfaces); Phase 3 close-out (the #4 landing adjudication with this run's verdict; the retraction-rate series complete for the seven DSs; the seeds-rule adjudication); Privacy vertical (AI data handling per U010; accumulation consent posture; Shadow-Whisp ephemerality; the right-to-portability shape of profile_data); Observability (dialogue/accumulation events); Hub/Gimbal (Whisp surfaces at FEAT time; the realized assessment step type as DS-3 evolution debt anchor); PC-2 (consent surface anchors). Anchors per entry.
- **Closing bridge** at `docs/planning/sessions/2026-06-11_NN_-_DS7-LANDED.md` (NN next available - 01 is the DS-6 bridge; adjust date if the session crosses midnight), per Section 11. **Archive this opener in the close batch.**
- **STATUS.md close** (separate small commit).

**Step 3 checkpoint surfacing.** Q-resolution slate before the Step 3 block; each cross-entity edit's scope before landing; **the ADR-promotion scope before drafting it** (its own named gate per the run prompt). Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

Template-resident hard rules bind: empty-result verification (every zero-hit claim dual-method-verified; at this entity most Step 2 claims are zeros - the workhorse again; this opener's own authoring caught a wrong inherited realized-substrate claim with it); fresh-read before Edit; structural-inventory-before-defect-assertion; SS-16/17 enumeration-claim-scoping (the noisy-term list at Section 5b); verify-before-asserting on commit shapes; cross-section fresh-read; explicit-count listings.

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 (per-phase), A#8 cumulative-forward, A#9 framework-mechanisms (sites here: PostgREST RPC / Realtime / Edge Functions as candidate contract shapes - likely no realized object), PW-1 schema-predates-partition (no DS-7 schema exists - likely no object, the DS-6 shape), P-O1 actor primitive `get_current_personal_group_id()`. | Phase 2 close-out; template text. |
| **D7** | Role names are TEXT-keyed `role_templates` rows, never enums. | Experiment A; PC-3 §5. |
| **PW-5 19-table baseline** | End-state schema is 19 tables; re-verify rather than inherit. NONE are DS-7-attributed. | DS-2 bridge; re-verified DS-4 + DS-6. |
| **The Whisp split (SETTLED; PROMOTES this run)** | DS-1 owns world-presence; DS-7 owns the being (dialogue, empty-fills-by-growth, senses model, internalisation arc + salience derivation, guard railing); DS-7 consumes DS-1, never the reverse. Consume throughout; promote at Step 3; STOP on contradiction. | PENDING.md (ratified at DS-1). |
| **The register DS-7 row (charter seed)** | "Whisp dialogue; assessments dissolved (validity question open); starved-drive sensing (S28); guard railing". | Register Section 3 line 166. |
| **U005 unrealized lock** | profile_data bucket/source table is the locked storage shape; NOTHING realizes it (corrected at authoring, dual-method). Law-stands-unrealized handling (DS-5 U021 precedent). | ADR-U005; this opener's calibration. |
| **U016 Intelligence cascade slot** | Lifecycle cascades carry an explicit "Intelligence: [what happens to AI context]" slot (line 37). | ADR-U016. |
| **Guard-railing law (constitutional)** | Rails are bidirectional and ALWAYS human-authored; DS-7 enforces rails, never authors them. AI is an extension, not an autonomous worker. | PRINCIPLES-AI.md (new to the chain this entity). |
| **Anti-leaderboard guardrail (INVARIANT)** | No counts/rankings/popularity/comparative surfaces - binds DS-7's accumulation and sensing outputs too (never people-ranking, never score-surfacing). Enforced at sources; consume, never re-litigate. | Register; world-model.md inv 2; journeys.md inv 8. |
| **Settled classifications** | DS-7 name (kept, in place); notifications boundary (vertical/DS-5/products); attachment seam (DS-4 by ID, n=4); profile/avatar MEDIA (PC-substrate - distinct from profile DATA); feed-vs-recommendation (beyond chronology + scope filters is DS-6; DS-7 supplies signals at most). | PENDING.md; DS-4/DS-5/DS-6 bridges. |
| **Sibling-provisional rule** | DS-1..DS-6 claims against DS-7 are provisional; this descent re-checks them (five routed Qs + six consumer lines). | Sibling Sources-status blocks. |
| **Cross-tier write discipline** | If DS-7 surfaces cross-tier writes at Step 2, frame into the channel anchored at DS-3 (DS-5 anchors recorded) - do not resolve here. | PC-4 C3-7; DS-3 + DS-5 bridges. |
| **TS-type vs runtime (PW-T1, direction-neutral)** | Check both directions; named site: `lib/types/user.ts` `ProfileData` (a display type whose NAME collides with U005's table). | PC-4; DS-6 inverted firing. |
| **Cluster S structural survey** | First-cluster broad survey; at a near-zero entity it sizes (and likely shrinks) the deep-read. | PC-4; DS-3..DS-6 precedent. |
| **Equipment-keying law (U025)** | Features key on equipment at surfaces; platform capabilities never key. | ADR-U025; DS-3..DS-6 precedent. |
| **Seeds-directory rule (instance rule, n=1->n=2 watch)** | Sweep `supabase/seeds/` wherever the canonical-table-read discipline applies. Fired productively at this opener's authoring. | DS-6 bridge §13 prompt 3. |

---

## Section 8 - A-candidate ledger - watches at DS-7 entry

- **A#1, A#2, A#3, A#6, A#7** - carry forward as framings.
- **Retraction-rate series:** PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0; DS-6 0. Record DS-7's point - **the series completes for the seven Domain Services this run**; it settles at Phase 3 close-out.
- **PW-MARCH1** - verify nothing AI/profile-accumulation-shaped was lost at D15; expect a clean nothing-to-lose verdict (the archive's only relevant vocabulary is assessment step content in the retired journey seeds).
- **#4 migration-name-as-shorthand** - rides; **LAST entity before the close-out adjudication** (Section T item 1).
- **Tier-CLAUDE-as-L1-boundary-authority** - n=2 watch applied at authoring; NO-FIRE (the sub-tier hit is cascade-placement, not boundary law); record the n=3 point in §13.
- **Seeds-directory rule** - n=1 rider applied as instance rule; fired at authoring; §13 adjudicates n=2 template candidacy.
- **Empty-result verification + ADR-enumeration-by-grep/citation-precision** - template text; seventh-instance verdicts in §13. Authoring evidence already banked: the corrected profile_data claim (empty-result dual-method) and PRINCIPLES-AI + U005/U010/U016 entering the chain via the never-inherit sweep (no predecessor list carried them).

---

## Section 9 - Disciplines in effect

All durable disciplines remain active: canonical-core precedence (hard; the beings core is PRIMARY here); constitutional-doc precedence for PRINCIPLES-AI.md; ratify judgment calls with Stefan before canonical edits (checkpoints at 5a/5b/5c; the five cross-entity amendments and the ADR promotion are explicit gates); commit at phase gates with the single-session cadence; CODE stays a correction target; trust disk over memory; sessions append-only; the 2026-04 Hub L3 working set is NOT derivation input; any new assertion-bearing diagram joins the doc-health registry same-session; ASCII-only labels; Ferd non-closure (bucket kinds, sense kinds, signal kinds, dialogue-context kinds - registries, never sealed enums); move-and-correct; in-commit consistency; append-only Option A for any ADR *amendment* (the promotion is a NEW ADR via `templates/adr.md`, a different shape - first instance); OLDFEAT blindness invariant (listing only).

---

## Section 10 - Output expectations and commit shape

**Single-session run: 5-7 commits** - (i) combined spec Write (Steps 1+2+3, post-Step-3-ratification) + the ratified cross-entity seam amendments (world-model.md Q7 / content.md Q8 / journeys.md Q3 / communication.md Q5 / discovery.md Q2, as ratified) + any ratified consumer-line revisions + the domain README/CLAUDE.md enumeration updates; (ii) **the Whisp-split ADR promotion commit** (new numbered ADR + PENDING.md entry dispositioned same-commit + the world-model.md Sources-status promotion-pending remark updated); (iii) entity CLAUDE.md + doc-health registry-row removal (same commit); (iv) closing bridge with §13 capture + this opener archived; (v) STATUS.md close (separate small commit). **No push to origin** - Stefan dispositions push.

---

## Section 11 - Closing bridge - required sections

Standard session-bridge shape plus: explicit closure statement ("*DS-7 Intelligence L1->L3 derivation completes at this commit batch*"); **the ADR-promotion record** (first PENDING-to-ADR promotion of the descent series: number, scope, citations, the PENDING.md disposition); pickup lists by receiving entity (Extension System leads - it is next); forward-commitment classification (expectation: predominantly/all FULL-FORWARD; classify per capability); A-candidate ledger snapshot incl. the completed seven-DS retraction-rate series, **the #4 verdict feeding the Phase 3 close-out landing adjudication**, the tier-CLAUDE n=3 point, the seeds-rule n=2 adjudication, and PW-MARCH1's verdict; PW status; §13 capture as a primary section; carry-forward to the Extension System (next per STATUS order) **including the Phase 3 close-out's accumulated adjudication slate**; template revision disposition (seventh-instance verdicts on the fourteen cumulative revisions; land or ride with rationale).

---

## Section 12 - Scope boundaries

- **The Whisp-split promotion executes the parked candidate - it does NOT re-litigate the split.** STOP and surface if the derivation surfaces anything contradicting it.
- **NO FIRST DECISION** - the DS-7 name is dispositioned in place; do not reopen.
- **Cross-entity edits:** ONLY the ratified seam amendments (the five routed Qs) + any individually-ratified consumer-line revisions + the world-model.md promotion-remark update. All other Class 3 findings route to pickups.
- **NOT this run's work:** the cross-tier-write channel (DS-3-anchored, DS-5 anchors recorded); PC-1 Finding #4 and the avatars-bucket routing; the vertical obligation inventories (Privacy receives pickups, not derivation); **the Extension System derivation (next in the queue after DS-7)**; the Phase 3 close-out itself (this run FEEDS its adjudication slate); the `whisp.md` canon sub-page (Awaiting specification - the gap is remarked, not filled); any model-integration or AI implementation work.
- **The DS-1 world-presence face is DS-1's** - consumed via the split, never derived here.
- **Settled classifications (Section 3) - consume, never reopen.**
- **The anti-leaderboard guardrail is invariant** - DS-7's accumulation and sensing never surface comparison, ranking, or scores.
- **OLDFEAT blindness invariant** - listing only.
- **Concurrent `docs/novel/` activity is out of scope** - do not read, modify, or commit novel-path files.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge: answer the five template prompts. **Seventh-instance framing:** report whether the fourteen cumulative template revisions held as template text; **deliver the #4 verdict that feeds the Phase 3 close-out landing adjudication** (n=7 opportunities at close; promotion with the DS-5 firing as evidence, or retirement); record the tier-CLAUDE-as-L1-boundary-authority n=3 data point (applied, no-fire - 1 fire / 2 no-fires across DS-5/DS-6/DS-7); **adjudicate the seeds-directory rule at n=2** (fired productively at this authoring - template §5b candidate or stays opener practice?); record the completed retraction-rate series; **capture the corrected-inheritance event as a methodology data point** (a predecessor bridge's calibration claim was wrong on disk and its own calibrate-don't-inherit instruction caught it - what does that say about pickup-block claim hygiene?); capture the first ADR-promotion shape (PENDING-to-numbered-ADR mechanics: did the parked-candidate-executes-verbatim discipline hold? friction?); capture the first constitutional-doc authority-chain entry (PRINCIPLES-AI.md - should the template's §3 name constitutional ecosystem docs as a standing chain slot for entities whose substance touches them?). Generous capture posture; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. **NO FIRST DECISION gate exists this run** - proceed directly to Section 5a cold derivation; surface the Step 1 checkpoint before the first Write. The Whisp-split ADR promotion gate comes at Step 3 (Section 5c), before the promotion commit lands.

---

*End of instance.*
