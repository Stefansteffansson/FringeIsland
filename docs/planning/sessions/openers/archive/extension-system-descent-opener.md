# Autonomous L1->L3 session-opener - Extension System

**Instance authored:** 2026-06-11
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `766e134` exactly - unchanged since DS-4; NO revision landed at DS-5, DS-6, or DS-7)
**Entity type:** Platform Domain - extensions (the LAST entity in Platform Domain; NOT a numbered Domain Service - see the ENTITY-SHAPE ADJUDICATION below). The Phase 3 close-out follows this run; this run's closing bridge must assemble the close-out's complete agenda.
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-11_02_-_DS7-LANDED.md`](../2026-06-11_02_-_DS7-LANDED.md) (the DS-7 close batch + post-session planning commits end at `f5bc380`; origin is pushed to it; the cc-execute-prompt commit `a65ef38` and novel-path commits are acceptable interveners)
**Substantive predecessor (derivation authority for Step 1 carry-forward):** the DS-7 closing bridge's pickup block "Extension System (next entity; its opener must inherit)" - inherited in full below. The headline inheritance: **ALL SEVEN DS SPECS NOW EXIST - the sibling-provisional rule INVERTS.** This derivation re-checks every service's §5 extension-point claims from the owned side.

> Per-instance session-opener for the autonomous CC run executing the Extension System L1->L3 derivation, end-to-end. **Eighth instance of the autonomous L1->L3 template.** Three-step shape: cold derivation -> code-informed stress-test -> adjudication. The stated Step 2 expectation is **NEAR-ZERO-CODE with named substrate of BOTH polarities** (calibrated at opener authoring, dual-method - Section 5b): the realized closure VIOLATION (the `StepType` sealed union + the `journey_type` CHECK list - both recorded DS-3 correction targets) and the realized non-closure COMPLIANCE (the six PC-3 data-driven registry tables + their seeds). Single-session expected; split fallback per the template.
>
> **WAVE-DEFERRED LAW (consume throughout):** `extensions/README.md` locks *"Future-wave scope - not Ferd. The Extension System will not be built in the Ferd wave."* The derivation specifies contracts, patterns, and the Ferd non-closure obligations (the DS-6 marketplace shape, applied entity-wide: surface deferred, rails and groundwork specified now); expect ALL capabilities full-forward. **The BUILD is NOT this run's work.** The Ferd constraint text (no hardcoded enums, no sealed type systems, no closed permission sets) and the domain sub-tier CLAUDE.md's closure-recognition authoring discipline are derivation input.
>
> **ENTITY-SHAPE ADJUDICATION AT EXECUTION (the first ratification gate, before Step 1):** the Extension System is "Platform Domain - extensions", NOT a numbered DS. Evidence verified at authoring: the `domain-service-spec.md` slug enum is `{world-model | narrative | journeys | content | communication | discovery | intelligence}` - the Extension System is excluded; `docs/platform/extensions/README.md` names its spec artifact as **`SPECIFICATION.md`** (*"Extension System contracts and patterns (to be written when work begins)"*); the STATUS.md row types it "Platform Domain - extensions"; the doc-health registry row (line 442) expects the entity CLAUDE.md at `docs/platform/extensions/CLAUDE.md`. **Surface to Stefan and adjudicate: (a) which spec template applies** - the domain-service-spec section architecture as a structural variant (without adding `extensions` to the slug enum), the SPECIFICATION.md free shape the README names, or a third shape - **and (b) where the spec lands** (candidate: `docs/platform/extensions/SPECIFICATION.md`). **Do not silently force the DS template.** Authoring lean, offered not assumed: land at `docs/platform/extensions/SPECIFICATION.md` using the domain-service-spec section architecture (§1-§8 + service-level invariants + §L3) with deviations named in-file - the proven skeleton, the README-named landing path, no slug-enum edit.
>
> **NO FIRST DECISION at this descent** (PENDING.md carries NO Extension System item - verified at authoring; only the DS-1 name watch-item remains open; the Whisp entry is PROMOTED history - cite ADR-U029, not PENDING). The conformance register Section 3 has NO Extension System row (verified: its only "extension" hits are the S24 AI-as-extension row, line 42, and its Section 6 echo, line 192 - a DIFFERENT sense, unrelated). The work-order seeds are: the extensions README itself, ADR-U008 + ADR-U018 (THE locks), ADR-U023's Extension System naming, and the seven landed specs' §5 blocks. First ratification gate is the entity-shape adjudication above, then the Step 1 checkpoint.

---

## Section T - candidates and watches riding this instance

1. **Candidate #4 - migration-name-as-shorthand.** RIDES (n=7 opportunities, 1 decisive firing at DS-5). **The Phase 3 close-out adjudicates the landing** (promotion with the DS-5 firing as evidence, or retirement); this run still classifies any touched migration by content, never by filename, and records the n-final data point.
2. **Tier-CLAUDE-as-L1-boundary-authority (n=3 watch, applied as instance rule at authoring).** Tier file (`docs/platform/CLAUDE.md`): enumeration + pointer only (the stability-zone line "Platform Domain (seven services + Extension System)"; the Where-to-go-next `extensions/` pointer). Sub-tier file (`docs/platform/domain/CLAUDE.md`): **REAL boundary law verified at authoring** - line 13 (Platform API open-consumer trust posture: Extensions per ADR-U008 are a future-wave open category; backward compatibility default, deprecation cycles real), line 15 (*"The Extension System's own architectural posture - Ferd-wave non-closure constraint per ADR-U008 and ADR-U018 - applies across all Domain Services, not to one"*), line 21 (the new-service bar names "or as an Extension" as the alternative), line 23 (THE closure-recognition authoring discipline: *"could this be data-driven instead?"* with capability-mismatch the only acceptable rejection), line 30 (the recognition-failure gotcha: deferral is a wave-scope fact, not an authoring license). **This is the strongest law-in-a-sub-tier-file instance of the watch series - likely a FIRE; record the n=4 data point in Section 13 for the close-out adjudication.**
3. **Seeds-directory-in-canonical-table-reads (n=2 rider, applied as instance rule).** Sweep `supabase/seeds/` alongside migrations everywhere the canonical-table-read discipline applies. Applied at this authoring: zero extension/plugin/registr textual hits in seeds, BUT the seed files THEMSELVES are realized registry content (`01_permissions.sql` / `02_role_templates.sql` / `03_group_templates.sql` seed the non-closure-compliant registries) and `05_professional_pathfinders.sql` carries the realized three-value step-kind vocabulary (`"type": "content" | "activity" | "assessment"` in seeded journey JSONB). Record the n=3 data point in Section 13.
4. **Constitutional-docs slot (n=1 rider from DS-7, applied as instance rule at authoring).** Checked: does PRINCIPLES-AI/VISION/MANIFESTO touch this entity's substance? **FIRED:** `MANIFESTO.md` carries *"Community ownership over corporate control"* (manifesto table line 29 + section heading line 87) - the constitutional anchor for the README's *"social contract between core and community"* charter line. **Named false-positive sense:** PRINCIPLES-AI's *"AI is an extension, not an autonomous worker"* (line 22) uses "extension" as AI-as-extension-of-human-capability - NOT the Extension System; the register's S24 row is this sense. Keep the two senses straight in all prose. VISION's "communities" are user communities - boundary vocabulary only. Record the n=2 data point in Section 13 for the close-out slate.

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding. Material divergence halts; non-material citation corrections bundle into the Step 1 checkpoint (template text).

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `f5bc380` (the DS-7 close batch + post-session planning commits end there; origin is pushed to it). Acceptable interveners: `a65ef38` (cc-execute-prompt carrying this run's prompt), this opener's authoring commit + its STATUS.md update, novel-path commits (shape (b) below). Hard-fail if earlier; anything new in `docs/platform/` or `docs/architecture/decisions/` not named here must be surfaced and adjudicated.
4. **Working tree state.** Run `git status`. Expected: clean, with TWO named acceptable shapes:
   - **(a) Root `CLAUDE.md` context-mode re-injection** (registered re-occurrence): modified with the diff solely the appended "context-mode - MANDATORY routing rules" block (insertions only). Disposition: **discard**; the permission classifier denied `git restore` at the DS-7 session - **Edit-removal (or content-rewrite-to-HEAD) is the sanctioned fallback, twice precedented.** Verify the diff is SOLELY that block first. The injection can re-occur mid-run; re-disposition the same way. **Known residue shape:** after the content-level discard, a stat-noise `M` flag can persist from CRLF/LF autocrlf divergence - the check is `git diff CLAUDE.md` emptiness (zero content lines), not the status flag.
   - **(b) Concurrent `docs/novel/` activity** - a parallel writer is active in this repo (commits `007b9a5`, `4f00fac`, `4019e32` precedent; the Swedish translation is marked complete at `4019e32` - the writer may be dormant; keep the shape named anyway). Novel-path commits at or after the tip anchor, and untracked files under `docs/novel/`, are acceptable interveners, NOT hard-fails. Do not read, modify, or commit them.
   - Anything else unnamed in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`: **hard-fail**.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `766e134` exactly. Hard-fail if earlier; soft-flag and adjudicate if later.

**Generic environment note (DS-3 + DS-7 + doc-health precedent):** the auto-mode permission classifier can deny seemingly-routine actions at novel sites. Standing fallback: surface the denial, use the narrowest sanctioned alternative. Do not work around silently.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop on material divergence; surface and wait. Non-material citation corrections bundle into the Step 1 checkpoint.

1. **`docs/planning/sessions/2026-06-11_02_-_DS7-LANDED.md`** - chronological + substantive predecessor. Load-bearing: the Extension System pickup block (the all-seven-specs inversion; the U008/U018 locks; the realized step-type closure as correction target; the seeds rule; the template-applicability check this opener executes as the entity-shape adjudication); **the Phase 3 close-out pickup block** (the four-rider adjudication slate + the completed retraction-rate series - this run's closing bridge assembles the close-out's complete agenda); the DS-7 seam resolutions (SETTLED - Section 3).
2. **`docs/platform/extensions/README.md`** - **THE CHARTER.** Line 3: *"Plugin contracts, registry, lifecycle, sandboxing. The social contract between core and community."* Line 5: the wave-deferred lock (*"Future-wave scope - not Ferd"*). Lines 9-15: the Ferd-wave constraint (Ferd architecture must not close it off - no hardcoded enums for extensible concepts {group types, step types, role types, content types}, no sealed type systems, no closed permission sets) with U008 + U018 named as THE binding constraints. Line 19: `SPECIFICATION.md` named as the spec artifact (*"to be written when work begins"*) - the entity-shape adjudication input.
3. **`docs/platform/domain/README.md`** - the L2 inventory section, lines 17-19: *"The Extension System sits within the Platform Domain layer. It defines the contracts that allow new step types, group types, role types, and content types to be added without modifying Platform Core. See `../extensions/`."* **L2-line altitude check:** the four-noun list predates the seven landed §5 blocks, which now enumerate many more registry families (portal kinds, loop textures, content kinds, conversation kinds, facet kinds, bucket kinds, ...) - does the line want the registry-pattern generalisation (the four nouns as examples), or does it stand? Record at Sources-status; revision (if any) at Step 3.
4. **`docs/platform/domain/CLAUDE.md`** - sub-tier law (Section T item 2 enumerates the verified lines). The Ferd non-closure authoring discipline and the closure-recognition gotcha are derivation input, not just context.
5. **The seven landed specs' §5 blocks - THE INVERTED RE-CHECK SLATE (the analogue of DS-7's routed-seam slate; each is an owned-side verification, with any revision a sanctioned cross-entity edit gating individually at Step 3):**
   - **`world-model.md` §5 (lines 82-84):** "None exposed at this derivation"; non-closure registries enumerated (place/region/portal/tending-act/NPC-layer kinds); *"Formal plugin contracts (e.g., Dreamineer-authored portal behaviours) are Extension System work in a later wave; Ferd architecture leaves them openable."*
   - **`narrative.md` §5 (lines 79-81):** same shape; season/episode/arc/beat/topology/texture/persistence/promotion kinds; Teller-authored topology behaviours deferred.
   - **`journeys.md` §5 (lines 81-83):** *"The step-kind system is this service's canonical extension surface (ADR-U008)"*; Dreamineer-authored step kinds + custom renderers deferred; route/step/content-family/depth/attachment/enrolment-state/personalisation-variant kinds non-closed.
   - **`content.md` §5 (lines 72-74):** the content-kind registry system as canonical extension surface; *"the Extension System charter names 'content types' as an extension category"* (verify: it does - extensions README line 12 + domain README line 19); asset/block/rendition/pipeline-state/capture-provenance kinds.
   - **`communication.md` §5 (lines 66-75):** the FIRST tabular §5 - four registries (conversation kinds, feed-event kinds, notification-event kinds, delivery-channel kinds) each with lifecycle *"Ferd: registry exists; Extension System wave: pluggable."*
   - **`discovery.md` §5 (lines 63-69):** tabular - facet kinds, result kinds, listing kinds (Hamn+; *"journeys, content, experiences - ADR-U011's three"*) - the marketplace adjacency.
   - **`intelligence.md` §5 (lines 65-74):** tabular - bucket kinds, sense kinds, rail kinds, dialogue-context providers - **explicitly provisional against THIS run** (*"the Extension System's own derivation is next in the queue; the sibling-provisional rule applies"*). If the derivation ratifies the four registries, lifting the provisional remark is a sanctioned edit candidate.
6. **`docs/architecture/decisions/PENDING.md`** - confirm: NO Extension System item; the Whisp entry is PROMOTED history (cite ADR-U029); only the DS-1 name watch-item remains open. NO FIRST DECISION.
7. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - confirm NO Extension System row in Section 3 (the only "extension" hits are the S24 AI-as-extension row, line 42, + the Section 6 echo, line 192 - the OTHER sense of "extension").
8. **Constitutional docs (Section T item 4):** `docs/ecosystem/MANIFESTO.md` - *"Community ownership over corporate control"* (table line 29; section line 87) anchors the social-contract charter line. `docs/ecosystem/PRINCIPLES-AI.md` - boundary input only at this entity (AI-as-extension is the other sense; relevant edge: the posture for AI-built extensions, where the last-say-is-authorship law would bind).
9. **ADRs (enumerated by domain-noun grep at authoring; re-verify membership against the decisions listing AND verify attributed text against the ADR files - template §3 text).** Sweep terms used: extension / plugin / registr / hook / "step type" / step_type / StepType / sandbox / lifecycle (+ contract, too noisy - 5 files, judged by the other nouns). The adjudicated binding set, with what each file actually says:
   - **U008 (THE lock #1 - step-type extensibility as core constraint):** *"The step type system must be extensible from day one. New step types are addable without rebuilding the core data model - a discriminator on a shared base structure, not a separate table per type"*; Tier 1 (narrative, reflection, assessment, choice, activity, journal, checklist) / Tier 2 (video, file, quiz, mood check-in, external link) / future (AR triggers, physical world activations, AI-generated content); *"Step type specification session is required before significant implementation"*; *"the single most important architectural decision for journey content."*
   - **U018 (THE lock #2 - no hardcoded group types, as amended at PC-3):** all groups are Groups - labels + templates, no type-based code paths; the PC-3 amendment's THREE DISTINCTIONS are the Step 2 classification law: (a) typed-group-entities prohibited; **(b) entity-STATE enum-via-CHECK permitted** (`display_preference`, `status` - disk-anchored); **(c) growth-VOCABULARY lookup tables permitted and growable-by-design** (`role_templates.name`, `public.permissions.name` - disk-anchored at the D15 rebuild).
   - **U023 (decomposition + THE naming):** *"Must accommodate the Extension System for Dreamineer plugins"* (line 22); *"Domain Services - seven services ... plus an Extension System for Dreamineer plugins"* (line 54); **the trust boundary** (line 58): *"Platform API - contract between Domain Services and Products/Studios/Extensions. Public-facing, versioned, lower trust."*
   - **U007 (permission model, amendment (d)):** the permission registry is **growable-by-design** - application-tier registry at `lib/constants/permissions.ts` (44 keys at the amendment's commit); the realized non-closure-compliance pattern for "no closed permission sets."
   - **U016 (cascade specification first):** the cascade template's per-layer slots END at Intelligence (lines 36-37) - **NO Extension System slot exists.** Whether extension retirement/uninstall cascades need a named slot is derivation material (expect a §8 question or a Step 3 routing; do not silently amend U016).
   - **U015 (API versioning)** - enters via the sub-tier file's Platform API deprecation-cycle law (Section T item 2): extensions are the open consumer category that makes versioning weight real.
   - **U002 (five verticals)** - the verticals bind this entity like every other; no extension vertical exists.
   - **U025/U026 (equipment-grain; studios law)** - boundary input: equipment-keying stays at surfaces; no fourth studio exists (the Dreamineer extension-authoring surface question must respect U026); U025's "external plugins" hit (line 65) is desk-equipment enumeration - a NEAR-false-positive, name the sense.
   - **U028 + U006/U003 (governance by scope; universal group pattern; Supabase substrate)** - standard gating/scoping/storage law.
   - **U011 (Stripe Connect)** - adjacency only via discovery.md §5's listing kinds (paid extensions / marketplace economy are Hamn+ Transactions territory); its "hook" hit is the Stripe-WEBHOOK sense - a named false positive for the hook noun.
   - **Recorded false positives (excluded with rationale):** U004 "registr" = user-REGISTRATION sense (visitor anonymous sign-in); U011 "hook" = webhook (verified line 24); U017 "step type" = a Related-link line to U008 only (no binding text of its own - adjacency, not membership); "sandbox" = **ZERO ADR hits (dual-method: noun loop + word-boundary file-level)** - sandboxing enters the charter from the extensions README line 3 alone, with NO architectural decision behind it yet; the derivation derives the sandbox posture from the U023 trust boundary + first principles, and expects it to surface §8 questions, not settled shape.
10. **`docs/planning/sessions/openers/STATUS.md`** - confirm the Extension System row is `In flight` with this opener linked.

Then verify against disk (template §6 discipline; empty-result verification binds as template text):

- Spec at `docs/platform/extensions/SPECIFICATION.md` (the candidate landing path, pre-adjudication) - confirm does NOT yet exist (verified absent at authoring, dual-method: directory listing + explicit-path test; the directory holds only `README.md`). If it exists, hard-fail and surface.
- Entity CLAUDE.md at `docs/platform/extensions/CLAUDE.md` - confirm does NOT yet exist (verified absent at authoring, dual-method). **Registered expected placeholder:** `.claude/skills/doc-health-check/SKILL.md` Section 7 carries its row (line 442 at authoring: *"docs/platform/extensions/CLAUDE.md | Extension System entity-level CLAUDE.md | Referenced by docs/platform/domain/CLAUDE.md Where-to-go-next, docs/platform/CLAUDE.md Where-to-go-next | Pending - when L2 specification is authored"*). When this run authors the file, **remove that registry row in the same commit** (registry rule 2; locate the row by content, not line number - the line number is approximate by design).
- `decisions/PENDING.md` state as described (no Extension System item; Whisp entry promoted; DS-1 watch open).
- This opener at its landing path (`archive/` it at session close per the only-live-artifacts rule).

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md` (swept at authoring - enumeration + pointer only; Section T item 2).
- **Sub-tier:** `docs/platform/domain/CLAUDE.md` - **carries real Extension System law** (the non-closure authoring discipline, the closure-recognition rule, the Platform API open-consumer posture, the new-service-or-Extension bar - Section T item 2 line-enumerates). The `docs/platform/extensions/` sub-tier slot has no CLAUDE.md yet (created at this run's close; the doc-health row calls it entity-level - the cascade position is singular: the extensions directory is both the sub-tier slot and the entity).
- **Canonical cores:** the Extension System is **cosmology-neutral platform machinery** (the PC shape, not the DS shape) - the cores are NOT general derivation input here. Named exception: the **roles core** where the Dreamineer extension-authoring surface is touched (U023 names Dreamineer as THE plugin author; role gates bind whatever authoring surface the derivation names).
- **Constitutional (Section T item 4):** `MANIFESTO.md` - community ownership over corporate control (the social-contract charter line's anchor). `PRINCIPLES-AI.md` - edge only (AI-built extensions posture; the "extension" vocabulary collision named).
- **L2 inventory line:** domain README lines 17-19 (Section 2 item 3; altitude check armed) + the extensions README charter line 3.
- **Architectural authority:** the ADR set at Section 2 item 9 - U008 + U018 are THE locks; U023 the naming + trust boundary; U007(d) the realized non-closure pattern; U016's missing Extension slot a derivation question; the rest boundary law.
- **Template:** ADJUDICATED AT THE ENTITY-SHAPE GATE (Section 1 of the execution; authoring lean: domain-service-spec section architecture as structural variant, landing at `docs/platform/extensions/SPECIFICATION.md`, slug enum untouched, deviations named in-file).
- **Sibling §5 blocks (boundary input, NOT capability source):** the seven blocks at Section 2 item 5 - consulted as the inverted re-check slate; the Extension System's capabilities derive from the charter + locks + sub-tier law + constitutional anchor, never from sibling specs. The §5 blocks are the EVIDENCE the derivation's contract families must account for (seven services already practice the registry pattern; the Extension System codifies the pattern and owns the plugin-contract layer above it).
- **Predecessor carry-forward:** the DS-7 bridge's Extension System pickup block + Section 7 priors.

**Cold-derivation discipline.** No reads of `supabase/migrations/`, `supabase/seeds/`, `lib/`, `app/`, `components/`, `tests/`, or FEAT-* files at Step 1. Knowing THAT the named both-polarity substrate exists (this opener's calibration, Section 5b) is prior; reading beyond its named shape is contamination. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.

**Cold frame to stress (from the charter + locks + sub-tier law + constitutional anchor):**
- **(a) Plugin contracts** (charter noun 1): what an extension declares and consumes - the contract families per extension category (step kinds, group types, role types, content types per the L2 line; the seven §5 blocks enumerate the realized registry families); the kind-registry contract pattern itself (registry row + per-kind shape contract + discriminator-on-shared-base, per U008's shape and the seven specs' practice); the plugin manifest/declaration shape.
- **(b) Registry** (charter noun 2): the extension registry as DATA (extensions are rows, never code enums - U018's law applied to extensions themselves); version + Platform-API-compatibility tracking (U015 weight via the sub-tier law).
- **(c) Lifecycle** (charter noun 3): extension lifecycle states as a data-driven vocabulary (submit/review/publish/install/enable/disable/retire - exact states are derivation work); lifecycle cascades (U016 - and the missing Extension slot); the review/publication gate (the social contract: community-authored, humanly reviewed - MANIFESTO anchor; PC-4 audit posture).
- **(d) Sandboxing** (charter noun 4): the trust boundary - extensions consume the Platform API only (U023 line 58's "lower trust"), never the Internal API, never direct DB; the permission posture (requested/granted as data - no closed permission sets per the Ferd constraint; U007(d)'s growable registry is the realized pattern); enforcement mechanism is expected to be a §8 speculative-third-shape question (NO sandbox ADR exists - verified dual-method).
- **(e) Ferd non-closure obligations (the only Ferd-ACTIVE area):** the constraint set as binding discipline NOW - the DS-6 marketplace shape applied entity-wide (surface deferred; rails specified); the closure-debt anchors (the StepType union + journey_type CHECK as recorded DS-3 correction targets); the registry-ization forward path.
- **(f) Dependency position:** services never depend on extensions; extensions depend on services' PUBLISHED contracts (the Platform API) - the direction mirrors "the world never depends on the intelligence." The Extension System itself is contract-layer machinery: expect its dependencies to be PC-substrate (storage/gating/audit) + every service's published extension points.
- **(g) Distribution adjacency (boundary, not capability):** extension discoverability is DS-6's find-layer (listing kinds, Hamn+); the economy is Transactions/U011 territory (the DS-6-settled three-way marketplace split: surface DS-6 / rails vertical / economy Console). The Extension System owns the registry + lifecycle, NOT the storefront.

**Structural questions this descent owns (resolve from the owned side; each sanctioned cross-entity amendment gates individually at Step 3):**
1. **The seven §5 re-checks** (Section 2 item 5): verify each service's extension-point claims against the derived contract families. Cold lean: all seven CONFIRM (each already practices registry-pattern non-closure and defers plugin contracts to this entity's wave). The named candidate edit: lifting `intelligence.md` §5's provisional remark if its four registries ratify.
2. **The U016 Extension-slot gap:** should lifecycle cascades carry an "Extension System: [what happens to extension state]" slot, and does extension retirement itself need a cascade spec? Expect a §8 question or a Step 3 ADR-amendment routing; do not silently amend U016.
3. **The sandbox enforcement shape** (speculative-third-shape; no ADR exists): API-gateway-only vs process isolation vs DB-level enforcement - expect to LAND AS A §8 QUESTION with the U023 trust boundary stated, not to resolve.
4. **The Dreamineer authoring surface:** U023 names Dreamineer as the plugin author; U026 locks three sub-studios and no fourth studio. Where extension authoring happens (a studio mode? the Hub developer surface? out-of-band tooling?) is expected to be a §8 question respecting U026.
5. **The L2-line altitude finding** (Section 2 item 3): the four-noun list vs the realized registry-family breadth.

**SETTLED - do not re-litigate (consume only):**
- **The Whisp split (ADR-U029)** - promoted, not reopened.
- **The DS-7 seam resolutions:** salience as push; generation through DS-4's gated write-path with distinct audit posture; no Whisp-carried messages; declared-interests-only signal supply at Ferd.
- **The notifications boundary** (vertical owns the obligation, DS-5 routes, products surface).
- **The attachment seam** (DS-4 assets referenced opaquely by ID).
- **Profile/avatar media is PC-substrate.**
- **The feed-vs-recommendation boundary** (beyond chronology + scope filters is DS-6's).
- **The anti-leaderboard guardrail** (invariant, enforced at sources) - binds anything this entity exposes too (no extension-popularity rankings as platform surfaces; chart-shaped marketplace furniture is future-wave DS-6/Transactions territory under the same guardrail).
- **Equipment-keying** (feature-grain at surfaces, U025).
- **The marketplace three-way split** (surface DS-6 / rails vertical / economy Console - ratified at DS-6).

---

## Section 4 - Three-step work shape

Entity-shape adjudication gate -> Step 1 cold derivation -> Step 2 stress-test (A#8 cumulative-forward) -> Step 3 adjudication with forward-commitment classification + THE PHASE 3 CLOSE-OUT AGENDA ASSEMBLY in the closing bridge. Stated expectation: near-zero-code with both-polarity named substrate; ALL capabilities full-forward (the wave-deferred law makes this structural, not empirical). Single-session expected; choose at the Step 1 checkpoint with Stefan.

---

## Section 5a - Step 1 - cold derivation

**Activity.** The entity-shape adjudication precedes this step (its outcome fixes the landing path and section skeleton). Author the candidate L3 inventory from upstream authority only. Write to the adjudicated landing path (candidate: `docs/platform/extensions/SPECIFICATION.md`) the L2 sections (identity, boundaries, contract families, extension points-equivalent, storage posture, service-level invariants, §8 questions - per the adjudicated skeleton) and the L3 inventory + dependency chain + external dependencies + Sources-status.

**Derivation scope:** the cold frame at Section 3 - contract families per the charter's four nouns (contracts / registry / lifecycle / sandboxing) + the Ferd non-closure obligations area + the boundary statements (distribution, economy, authoring surface). Expect the §5-equivalent section to be REFLEXIVE (the Extension System's own extension points - kind-registries all the way down) - keep it honest, not cute.

**Carry-forward priors:** the five named disciplines (A#5 per-phase, A#8, A#9, PW-1, P-O1), D7, and the Section 7 table. At a near-zero-code entity expect P-O1/D7 to pin gating prose. **A#9's named site here:** the plugin-contract surface itself - check whether framework mechanisms (PostgREST RPC, Supabase Edge Functions, Realtime channels) are candidate realized contract shapes before declaring a speculative third one; no extension substrate exists, so A#9 may have no realized object (the DS-6/DS-7 shape) - say so explicitly if so.

**Watches armed at Step 1:** A#9 (per above); hypothesis pruning (plausible-but-unconfirmable shapes become §8 questions tagged speculative-third-shape - candidate sites: the sandbox enforcement mechanism, the extension execution substrate (app-tier per Finding #4's frame?), the manifest shape, the review-gate mechanics); L2-line altitude (Section 3 question 5).

**Step 1 checkpoint surfacing.** After the candidate is composed, pause and surface to Stefan BEFORE the first Write: capability count by area; the five structural-question positions (Section 3 slate); the seven §5 re-check cold positions; the L2-line altitude finding; §8 question count; speculative-third-shape tags; single-vs-split choice; any state-read citation corrections bundled. Wait for ratification.

**Single-Write preferred; A#5 per-phase; the ratified Write holds uncommitted until Step 3** (template text).

---

## Section 5b - Step 2 - code-informed stress-test pass

**Direction of authority preserved.** Code stress-tests the candidate; never sources it.

**Expectation - stated for Step 2 to verify rather than assume (CALIBRATED AT OPENER AUTHORING 2026-06-11, dual-method - the DS-7 corrected-inheritance lesson: pickup-block claims are memory, not disk; every claim below was re-verified on disk at authoring):** NEAR-ZERO-CODE with named substrate of BOTH polarities:

- **The realized closure VIOLATION (classify against the locks, don't discover):** `lib/types/journey.ts` line 5 - `export type StepType = 'content' | 'activity' | 'assessment';` (three-value sealed union); `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` lines 125-126 - `journey_type TEXT NOT NULL DEFAULT 'predefined' CHECK (journey_type IN ('predefined', 'user_created', 'dynamic'))`. **Both are recorded DS-3 correction targets** (journeys.md §1 + §L3 carry the registry-ization forward shape) - the classification is the finding; this entity ANCHORS the closure-debt register, it does not re-adjudicate DS-3's debt.
- **The realized non-closure COMPLIANCE:** the D15 rebuild (`20260222000000_rebuild_universal_group_pattern.sql`) creates **SIX data-driven registry tables** - `permissions` (L48), `role_templates` (L57), `group_templates` (L66), `role_template_permissions` (L160), `group_template_roles` (L169), `group_role_permissions` (L189) - U018(c)'s growth-vocabulary registries honoured in substrate (note: the DS-7 prompt-era list named four; disk shows six - the junction tables complete the pattern). Seeds `01_permissions.sql` / `02_role_templates.sql` / `03_group_templates.sql` are the realized registry CONTENT (Section T item 3).
- **U018-amendment classification law binds Step 2:** entity-STATE enum-via-CHECK is PERMITTED (distinction (b): `status`, `display_preference` - and the rebuild's other state CHECKs at L87/L111/L129/L147 plus later migrations). Do NOT class permitted state-enums as violations; the violation class is sealed EXTENSIBLE-CONCEPT vocabularies (step types, journey/route types, group TYPING).
- **"plugin" has ZERO code hits** - dual-method verified at authoring (case-insensitive word grep + case-sensitive stem grep across `lib/ app/ components/ supabase/ tests/` + config files; both methods returned zero output lines). Tooling note: in piped sweeps the displayed exit code is the tail command's, not grep's - judge by output lines, never `$?`.
- **"extension" has TWO code false positives** (a calibration CORRECTION to the prompt-era "one false positive" claim): `components/profile/AvatarUpload.tsx` line 63 (file-extension comment sense) AND `supabase/migrations/20260228125730_sprint3_smart_notifications.sql` line 3 (*"-- F3: Smart notification schema extension"* - schema-extension comment sense). Both senses named; neither is Extension System substrate.
- **Known sandbox tooling artifact (DS-7 §13):** the sandbox grep's `-o` flag silently returns empty - use `-n`/file-level methods; empty-result dual-method binds (template §6 text; at this entity most Step 2 claims will be zeros - the workhorse again).
- Expect **ALL capabilities full-forward** (the wave-deferred law makes this structural). **Record the retraction-rate data point** (series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0; DS-6 0; DS-7 0 - the seven-DS series is complete; this entity's point extends it to the full Platform Domain).

**Clusters, sized to the near-zero expectation (sandboxed sweeps per the DS-3..DS-7 context-economy precedent):** **Cluster S structural survey first** (the named both-polarity files, per-file one-line classification); migrations cumulative-forward (A#8) **including `archive/`** (PW-MARCH1: did D15 lose any extension/registry substrate? expect a clean nothing-to-lose verdict - the registries were CREATED at D15, not lost) **AND `supabase/seeds/`** (Section T item 3); framework-mechanism check (A#9's named sites); `lib/types/` + `lib/constants/permissions.ts` scope-survey (U007(d)'s 44-key growable registry - re-verify the count rather than inherit); mop-up greps - **scope the noisy terms carefully** ("extension" collides with the two named comment senses + file-extension idiom; "registry" with prose uses; "hook" with React hooks (`lib/hooks/` is ALL React-hook sense - name the scope); "contract" with prose; "type" is unusably noisy - sweep `StepType`/`journey_type`/`group_type` as exact tokens instead; SS-16/17 patterns-and-exclusions discipline binds on every claim).

**Boundary classifications to run against ratified Step 1 positions (not skip):** the StepType/journey_type pair against the closure-debt register (DS-3 debt, anchored not re-adjudicated); the six registry tables + seeds against U018(b)/(c) law; `lib/constants/permissions.ts` against the no-closed-permission-sets constraint (expect COMPLIANCE - growable-by-design per U007(d)); any `group_type` CHECK against U018's three distinctions (the U018 amendment itself disk-anchored these - cite, don't re-derive).

**Cadence:** template text - cluster self-reflection between, surface ONCE at end with the three-class block + structured summary; per-cluster composition is not a gate.

**Step 2 checkpoint surfacing.** Finding counts by class; the boundary classifications; the retraction-rate data point; PW-1/PW-MARCH1/A#9/#4 outcomes; the seeds-rule n=3 + tier-CLAUDE n=4 + constitutional-docs n=2 verdicts; Step 3 scope. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Required deliverables - not pickup:**

- **Spec** (combined Write committed at the Step 3 gate, at the adjudicated landing path; fold-back Edits sub-batch-of-1 if needed; Class 2 deltas fold inline).
- **The seven §5 re-check dispositions folded where they belong:** confirmations need no edit; any ratified revision (named candidate: lifting `intelligence.md` §5's provisional remark) gates individually at the Step 3 checkpoint.
- **Domain README L2-line revision** if the altitude check finds one (gated), + domain CLAUDE.md update if the enumeration line wants the "derivation next in the queue" clause retired (line 37 - it will be stale the moment this spec lands; sanctioned consequential edit, gated).
- **Extensions README update** (gated): the `SPECIFICATION.md` line's *"(to be written when work begins)"* parenthetical retires when the spec lands; keep the wave-deferred lock text untouched.
- **Entity CLAUDE.md** at `docs/platform/extensions/CLAUDE.md` + **same-commit registry-row removal** from `.claude/skills/doc-health-check/SKILL.md` Section 7 (line 442 at authoring - locate by content; classifier-fallback note at Section 1; DS-4..DS-7 precedent: the Edit was permitted).
- **Pickup lists** - **Phase 3 close-out (THE HEADLINE: this bridge assembles the close-out's COMPLETE agenda - Section 11)**; Verticals (whatever obligation anchors this derivation surfaces); Hub/Gimbal (extension surfaces at FEAT time, future wave); DS-3 (the closure-debt anchor confirmation); doc-health (cascade additions). Anchors per entry.
- **Closing bridge** at `docs/planning/sessions/2026-06-11_NN_-_EXTENSION-SYSTEM-LANDED.md` (NN next available - 01 and 02 exist at authoring; adjust date if the session crosses midnight), per Section 11. **Archive this opener in the close batch.**
- **STATUS.md close** (separate small commit).

**Step 3 checkpoint surfacing.** Q-resolution slate before the Step 3 block; each cross-entity edit's scope before landing. Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

Template-resident hard rules bind: empty-result verification (every zero-hit claim dual-method-verified; the `-o` tool-level catch class and the piped-exit-code artifact are this entity's named tooling hazards); fresh-read before Edit; structural-inventory-before-defect-assertion; SS-16/17 enumeration-claim-scoping (the noisy-term list at Section 5b); verify-before-asserting on commit shapes; cross-section fresh-read; explicit-count listings.

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 (per-phase), A#8 cumulative-forward, A#9 framework-mechanisms (sites here: PostgREST RPC / Edge Functions / Realtime as candidate plugin-contract shapes - likely no realized object), PW-1 schema-predates-partition (no extension schema exists - likely no object), P-O1 actor primitive `get_current_personal_group_id()`. | Phase 2 close-out; template text. |
| **D7** | Role names are TEXT-keyed `role_templates` rows, never enums. | Experiment A; PC-3 §5. |
| **PW-5 19-table baseline** | End-state schema is 19 tables; re-verify rather than inherit. NONE are extension-attributed. | DS-2 bridge; re-verified DS-4/DS-6/DS-7. |
| **THE LOCKS (U008 + U018)** | Step types extensible from day one (discriminator on shared base, never table-per-type); no typed group entities (labels + templates; state-CHECKs and growth-vocabulary registries permitted per the PC-3 amendment's three distinctions). | ADR-U008; ADR-U018 as amended. |
| **The wave-deferred law** | The Extension System will not be built in the Ferd wave; Ferd must not close it off (no hardcoded enums / sealed types / closed permission sets). Derivation specifies; build defers. | extensions/README.md lines 5-15. |
| **The inverted sibling rule** | ALL SEVEN DS specs exist - this derivation re-checks every §5 extension-point claim from the owned side; intelligence.md §5 is explicitly provisional against this run. | DS-7 bridge pickup block; the seven §5 blocks (Section 2 item 5). |
| **The closure-debt anchors (DS-3 territory)** | `StepType` sealed union + `journey_type` CHECK are recorded DS-3 correction targets - anchor, don't re-adjudicate. | journeys.md §1/§L3; this opener's calibration. |
| **The realized compliance pattern** | Six D15 registry tables + seeds + the 44-key growable permission registry are non-closure honoured in substrate (U018(c) + U007(d)). | This opener's calibration; ADR-U018/U007 amendments. |
| **The trust boundary (U023)** | Platform API is the extension contract surface - public-facing, versioned, LOWER TRUST; extensions never touch the Internal API or DB directly. | ADR-U023 line 58; domain CLAUDE.md line 13. |
| **The social-contract anchor (constitutional)** | Community ownership over corporate control - the README's "social contract between core and community" grounds in the MANIFESTO. The "AI is an extension" sense is a NAMED COLLISION, not this entity. | MANIFESTO.md; Section T item 4. |
| **Anti-leaderboard guardrail (INVARIANT)** | No counts/rankings/popularity/comparative surfaces - binds extension-facing surfaces too. Enforced at sources; consume, never re-litigate. | Register; world-model.md inv 2; journeys.md inv 8. |
| **Settled classifications** | The DS-7 seam resolutions; notifications boundary; attachment seam; profile-media vs profile-data; feed-vs-recommendation; marketplace three-way split; equipment-keying. | DS-4..DS-7 bridges (Section 3 SETTLED block). |
| **Cross-tier write discipline** | If extension-shaped cross-tier writes surface at Step 2, frame into the channel anchored at DS-3 - do not resolve here. | PC-4 C3-7; DS-3 + DS-5 bridges. |
| **Cluster S structural survey** | First-cluster broad survey; at a near-zero entity it sizes (and likely shrinks) the deep-read. | PC-4; DS-3..DS-7 precedent. |
| **Seeds-directory rule (n=2->n=3)** | Sweep `supabase/seeds/` wherever the canonical-table-read discipline applies; the seed files are themselves realized registry content here. | DS-6/DS-7 bridges; Section T item 3. |
| **Pickup-block claim hygiene** | Pickup-block claims are memory, not disk - calibrate, don't inherit (the DS-7 corrected-inheritance lesson; every Section 5b claim was disk-re-verified at this authoring). | DS-7 bridge §13 prompt 5. |

---

## Section 8 - A-candidate ledger - watches at Extension System entry

- **A#1, A#2, A#3, A#6, A#7** - carry forward as framings.
- **Retraction-rate series:** PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0; DS-6 0; DS-7 0 (the seven-DS series is complete). Record this entity's point - it extends the series to the full Platform Domain; the close-out settles the series.
- **PW-MARCH1** - verify nothing extension/registry-shaped was lost at D15; expect a clean verdict (the registries were CREATED at the D15 rebuild).
- **#4 migration-name-as-shorthand** - rides; the close-out adjudicates the landing (n=7, 1 firing); this run records the n-final point.
- **Tier-CLAUDE-as-L1-boundary-authority** - n=3 watch applied at authoring; **the sub-tier file carries REAL law this time (Section T item 2) - likely the watch's strongest FIRE; record the n=4 point in §13 for the close-out.**
- **Seeds-directory rule** - n=2 rider applied as instance rule (Section T item 3); record n=3.
- **Constitutional-docs slot** - n=1 rider applied as instance rule (Section T item 4); **FIRED at authoring (MANIFESTO enters the chain); record n=2 for the close-out.**
- **Empty-result verification + ADR-enumeration-by-grep/citation-precision** - template text; eighth-instance verdicts in §13. Authoring evidence already banked: the second "extension" code false positive the prompt-era claim missed (empty-result/method-contrast class) and the six-not-four registry-table count (citation-precision class); the "sandbox has NO ADR" zero dual-method verified.

---

## Section 9 - Disciplines in effect

All durable disciplines remain active: canonical-core precedence where touched (roles core only, Dreamineer edge); constitutional-doc precedence for the MANIFESTO anchor; ratify judgment calls with Stefan before canonical edits (the entity-shape gate + checkpoints at 5a/5b/5c; every cross-entity §5 edit is an explicit gate); commit at phase gates with the single-session cadence; CODE stays a correction target; trust disk over memory; sessions append-only; the 2026-04 Hub L3 working set is NOT derivation input; any new assertion-bearing diagram joins the doc-health registry same-session; ASCII-only labels; **Ferd non-closure is not just a discipline here - it is the entity's SUBSTANCE** (the derivation specifies the obligations; this run must itself not introduce closure - the spec's own vocabularies are registries-in-prose, never sealed lists); move-and-correct; in-commit consistency; append-only Option A for any ADR amendment; OLDFEAT blindness invariant (listing only).

---

## Section 10 - Output expectations and commit shape

**Single-session run: 4-6 commits** - (i) combined spec Write (Steps 1+2+3, post-Step-3-ratification) at the adjudicated landing path + any ratified sibling §5 re-check edits (named candidate: intelligence.md provisional-remark lift) + the domain README/CLAUDE.md updates + the extensions README parenthetical retirement (each gated); (ii) entity CLAUDE.md at `docs/platform/extensions/CLAUDE.md` + doc-health registry-row removal (same commit); (iii) closing bridge with §13 capture AND THE ASSEMBLED PHASE 3 CLOSE-OUT AGENDA + this opener archived; (iv) STATUS.md close (separate small commit). **No push to origin** - Stefan dispositions push.

---

## Section 11 - Closing bridge - required sections

Standard session-bridge shape plus: explicit closure statement (*"Extension System L1->L3 derivation completes at this commit batch. Platform Domain is fully specified."*); the entity-shape adjudication record (which template shape was ratified and why - the first non-DS Platform Domain entity is precedent for the verticals' template-applicability question); pickup lists by receiving entity; forward-commitment classification (expectation: ALL full-forward, structural per the wave-deferred law); A-candidate ledger snapshot incl. the extended retraction-rate series and the four rider n-final points; PW status; §13 capture as a primary section; **THE ASSEMBLED PHASE 3 CLOSE-OUT AGENDA as a first-class carry-forward section** - it must enumerate, complete:
- The four-rider adjudication slate with n-finals: **#4 migration-name-as-shorthand** (n-final, 1 firing at DS-5 - promote or retire); **tier-CLAUDE-as-L1-boundary-authority** (n-final incl. this run's verdict - opener-practice vs template text); **seeds-directory rule** (n-final - template §5b candidate); **constitutional-docs slot** (n-final - template §3 standing-slot candidate).
- The completed retraction-rate series (PC-4 + seven DSs + this entity).
- The vertical-template question (autonomous L1->L3 template as-is vs obligation-inventory variant - routed to the close-out agenda in STATUS.md's Verticals note, 2026-06-11; this run's entity-shape adjudication is direct precedent evidence).
- The vertical obligation inventories (sequenced after the close-out; order per STATUS.md: Privacy -> Observability -> Administration -> Notifications -> Transactions).
- CQ-015 (the Hub rebuild-vs-evolve question - parked in OPEN_QUESTIONS.md until FEAT-PD contracts realize).
- PC-1 Finding #4 and the avatars-bucket routing; the cross-tier-write channel (DS-3-anchored).
- Whatever this run's Step 2/Step 3 adds.
Plus the template revision disposition (eighth-instance verdicts; the rider slate consolidates at the close-out - landing anything here one entity before the close-out needs explicit rationale).

---

## Section 12 - Scope boundaries

- **THE BUILD IS NOT THIS RUN'S WORK** - the wave-deferred lock binds; the derivation specifies contracts, patterns, and Ferd obligations only. No implementation, no migrations, no manifest tooling.
- **The Phase 3 close-out itself is NOT this run's work** - this run's closing bridge ASSEMBLES its complete agenda (Section 11); the close-out executes as its own session.
- **NO FIRST DECISION** - no parked naming or charter item exists; the first gates are the entity-shape adjudication and the Step 1 checkpoint.
- **Cross-entity edits:** ONLY individually-ratified §5 re-check revisions + the gated README/CLAUDE consequential edits (Section 5c). All other Class 3 findings route to pickups.
- **NOT this run's work:** the DS-3 closure-debt remediation (anchored, not executed); the U016 Extension-slot amendment (route, don't silently amend); the vertical obligation inventories; CQ-015; PC-1 Finding #4 + avatars-bucket; the cross-tier-write channel; the marketplace surface (DS-6, Hamn+) and economy (Transactions/U011).
- **Settled classifications (Section 3) - consume, never reopen.**
- **The anti-leaderboard guardrail is invariant.**
- **OLDFEAT blindness invariant** - listing only.
- **Concurrent `docs/novel/` activity is out of scope** - do not read, modify, or commit novel-path files.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge: answer the five template prompts. **Eighth-instance framing:** report whether the fourteen cumulative template revisions held as template text **at the first non-DS Platform Domain entity** (the entity-shape variance is itself the stress-test: did the template's DS-shaped assumptions hold, bend, or break?); deliver the four rider n-final data points (#4; tier-CLAUDE n=4 incl. this run's likely-FIRE verdict; seeds n=3; constitutional n=2) **for the close-out's consolidated adjudication**; record the extended retraction-rate point; capture the entity-shape adjudication as methodology data (the template-applicability check fired here for the first time - what does its shape teach the verticals' TBD?); capture the calibration corrections banked at authoring (the second "extension" false positive; six-not-four registry tables) as pickup-block-hygiene confirmations. Generous capture posture; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. **The ENTITY-SHAPE ADJUDICATION is the first ratification gate** - surface it to Stefan with the evidence and the authoring lean before any spec composition lands on its outcome; then proceed to Section 5a cold derivation and surface the Step 1 checkpoint before the first Write.

---

*End of instance.*
