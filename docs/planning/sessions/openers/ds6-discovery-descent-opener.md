# Autonomous L1->L3 session-opener - DS-6 Discovery

**Instance authored:** 2026-06-10
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `766e134` exactly - unchanged since DS-5; NO revision landed at DS-5 close)
**Entity type:** Domain Service (entity 6 of 8 in Platform Domain, Phase 3)
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-10_06_-_DS5-LANDED.md`](../2026-06-10_06_-_DS5-LANDED.md) (closing-bridge commit `113068d`; the DS-5 close batch ends at STATUS close `ce1b947`; the cc-execute-prompt commit `72b07cf` and novel-path commits are acceptable interveners)
**Substantive predecessors (derivation authority for Step 1 carry-forward):** the DS-5 closing bridge (pickup block "DS-6 Discovery (next entity; its opener must inherit)" - inherited in full below), the DS-4 closing bridge (the published-registry consumer line + the marketplace seam), the DS-1 closing bridge (the identity re-derivation watch: *"DS-6 Discovery's charter is partly contradicted by the new canon - re-derive, possibly shrink, at its own descent"*), and the Session B conformance register Section 3 DS-6 row

> Per-instance session-opener for the autonomous CC run executing DS-6 Discovery L1->L3 derivation, end-to-end. **Sixth instance of the autonomous L1->L3 template.** Three-step shape: cold derivation -> code-informed stress-test -> adjudication. The stated Step 2 expectation is **NEAR-ZERO-CODE with named exceptions** (calibrated at opener authoring - Section 5b): no search/recommendation/marketplace substrate exists in the table baseline, zero discovery-vocabulary API routes, no `lib/discovery/` - but a thin realized client-side catalog-browse surface exists (named exactly at 5b; classify, don't discover). Single-session expected; split fallback per the template.
>
> **FIRST DECISION at this descent - the first since DS-3.** PENDING.md's related watch-items line (recorded 2026-06-10 at the DS-1 naming challenge) parks the DS-6 naming collision: *"DS-6 'Discovery' collides with 'the universe-discovery' log (decide at DS-6's charter re-derivation)"*. This combines with the DS-1-bridge identity re-derivation watch: **the descent re-derives DS-6's charter first, and the naming call gates the L2 identity section.** Run the vocabulary-vetting discipline (newcomer intuition + collision check + full usage footprint: field/diagram/rule/spoken) on any candidate name. Authoring-time evidence for the collision: the ADR domain-noun sweep for "discover" returned 30+ hits, nearly all meaning the universe-discovery log ("the discovery locked...", "the discovery is the single source of truth") - the service's own name is already claimed in running prose. Counter-consideration: the cosmology-neutral naming lock platform entities honour (the reason DS-7 "Intelligence" was kept). The opener filename uses the PRE-rename name per the template header convention.

---

## Section T - candidates and watches riding this instance

1. **Candidate #4 - migration-name-as-shorthand.** RIDES STRENGTHENED: first decisive firing at DS-5 (n=5: `sprint3_smart_notifications.sql` carries the stewardship-nomination flow - the name under-describes its body). Landing adjudication at the next firing or Phase 3 close-out (the firing converted the close-out question from retirement to promotion). At a near-zero-code entity the opportunity surface is small; classify any touched migration by content, never by filename (named site: the archived `20260211183842_add_select_policies_for_catalog_tables.sql` - "catalog" there means template/reference tables, a different sense than DS-6's journey catalog; a naming-drift dual-reading candidate).
2. **Tier-CLAUDE-as-L1-boundary-authority (n=1 watch from DS-5, applied as instance rule).** The DS-5 run found the decisive notifications boundary text in the platform tier CLAUDE.md that no ADR stated. **Applied at this opener's authoring:** the tier file (`docs/platform/CLAUDE.md`) and sub-tier file (`docs/platform/domain/CLAUDE.md`) were swept for DS-6's domain nouns (search/recommend/marketplace/discover/catalog/rank/browse) - **negative result**: both carry only service enumerations and `search_path` noise; no DS-6-specific boundary law resides at L1. Record the n=2 data point (applied, no fire) in §13; Section 13 adjudicates.

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding. Material divergence halts; non-material citation corrections bundle into the Step 1 checkpoint (template text).

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `ce1b947` (the DS-5 close batch ends there). Acceptable interveners: `72b07cf` (cc-execute-prompt carrying this run's prompt), this opener's authoring commit + its STATUS.md update, novel-path commits (shape (b) below). Hard-fail if earlier; anything new in `docs/platform/` or `docs/architecture/decisions/` not named here must be surfaced and adjudicated.
4. **Working tree state.** Run `git status`. Expected: clean, with TWO named acceptable shapes:
   - **(a) Root `CLAUDE.md` context-mode re-injection** (registered re-occurrence): modified with the diff solely the appended "context-mode - MANDATORY routing rules" block (insertions only). Disposition: **discard** (`git checkout -- CLAUDE.md`; if the permission classifier denies, Edit-removal is the sanctioned fallback - both outcomes precedented). Verify the diff is SOLELY that block first.
   - **(b) Concurrent `docs/novel/` activity** - a parallel writer is active in this repo (commits `a733879`, `2fe74d5`, `007b9a5` precedent - at DS-5 the writer committed *mid-session, between this pipeline's own commits*; chapters 10-14 untracked at this opener's authoring). Novel-path commits at or after the tip anchor, and untracked files under `docs/novel/`, are acceptable interveners, NOT hard-fails. Do not read, modify, or commit them.
   - Anything else unnamed in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`: **hard-fail**.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `766e134` exactly. Hard-fail if earlier; soft-flag and adjudicate if later.

**Generic environment note (DS-3 + doc-health precedent):** the auto-mode permission classifier can deny seemingly-routine actions at novel sites. Standing fallback: surface the denial, ask Stefan, use the narrowest sanctioned alternative. Do not work around silently.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop on material divergence; surface and wait. Non-material citation corrections bundle into the Step 1 checkpoint.

1. **`docs/planning/sessions/2026-06-10_06_-_DS5-LANDED.md`** - chronological + substantive predecessor. Load-bearing: the DS-6 pickup block (the feed-vs-recommendation boundary, communication.md §8 Q4; the provisional search-indexing consumer line; the near-zero-code expectation to verify; the opener-authoring notes this instance executed); the ratified notifications boundary (SETTLED - consume only); the cross-tier-write new anchors (NOT this run's work).
2. **`docs/planning/sessions/2026-06-10_05_-_DS4-LANDED.md`** - the DS-6 pickup: *"the content-discovery seam - DS-6 reads DS-4's published registry (provisional consumer line in content.md §3); the marketplace over published content is DS-6's surface (Transactions explicitly none at DS-4). The DS-6 identity re-derivation watch (DS-1 bridge) remains untouched."*
3. **`docs/planning/sessions/2026-06-10_02_-_DS1-DESCENT-PHASE0-PHASE1-LANDED.md`** - the identity re-derivation watch (anatomy-challenge verdict: keep ADR-U023's entity set; *"DS-6 Discovery's charter is partly contradicted by the new canon - re-derive, possibly shrink, at its own descent"*) and the naming-challenge outcome (DS-1/DS-6/DS-7 watch-items recorded in PENDING.md, no action).
4. **`docs/architecture/decisions/PENDING.md`** - the related watch-items line (the FIRST DECISION input): DS-6 "Discovery" collides with the universe-discovery log; decide at DS-6's charter re-derivation. Also confirm: the Whisp split remains consumed-only (promotion at DS-7); the DS-3 rename entry is resolved history.
5. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - Section 3 DS-6 row, this run's work-order seed (verified at authoring, line 165): *"DS-6 Discovery | CONSTRAINED | navigation by own branches; no counts/rankings (anti-leaderboard guardrails)"*. Also Section 6 for standing residue.
6. **`docs/platform/domain/communication.md`** - DS-5's canonical spec. Read for: **§8 Q4 (THE routed seam this descent owns, line ~98):** *"Feeds are ambient/chronological (invariant 2). Where exactly does 'compose recent events' end and 'recommend/rank' begin - is a 'relevant to you' surface ever DS-5? Cold lean: any selection beyond chronology + scope filters is DS-6. Provisional against DS-6; re-checks at its descent."* Resolve from the DS-6 side; on ratification the sanctioned cross-entity amendment is to `communication.md` §8 Q4. Also **invariant 2 (line ~84)** - load-bearing for the charter: *"anything ranked or recommended is DS-6's, reached through DS-6's own contract"* - DS-5 explicitly reserves the ranked/recommended surface TO DS-6 while the anti-leaderboard guardrail constrains what it may be. Also the provisional consumer line (line ~59): *"DS-6 Discovery may read forum/feed content for search indexing"* - re-check from the owned side.
7. **`docs/platform/domain/content.md`** - DS-4's canonical spec. The published-registry consumer line (§3, line ~59): *"DS-6 reads the published registry for discovery (provisional - its descent re-checks; no counts/rankings leak from here)"*; the §2 boundary line (line ~32): *"search, recommendation, or the marketplace over published content (DS-6 Discovery reads the published registry)"*; the Transactions-vertical line (line ~134): *"the marketplace over published content is DS-6's surface, a member buying is in-experience platform-tier work, and economy management is Console-scoped (ADR-U028)"* - the marketplace seam, re-check from the owned side.
8. **`docs/platform/domain/journeys.md`** - DS-3's canonical spec. The published-catalog line (§3 Catalog reads, line ~57): published journeys with route type / perspective affinity / equipment requirements / depth / narrative attachment; *"status and equipment gating ... decide what a given traveller can enrol in, not what the catalog admits exists"*. **Invariant 8 (line ~107, no comparative-progress surface) is invariant - consume, don't re-litigate.** Also the Transactions line (line ~146: the marketplace is DS-6's surface).
9. **`docs/platform/domain/world-model.md`** - DS-1's canonical spec. The consumer line (§3, line ~69): *"DS-6 consumes branch-routes for navigation"* - re-check from the DS-6 side. **Invariant 2 (line ~101) is enforced at the source and is invariant:** *"Own branches are legible; the wider crown is ambient. DS-1 exposes no aggregate-comparison, leaderboard, count, or popularity surface, to any consumer"* (named for the register DS-6 row). Branches are the routes (§2 table: "following your own branches is how you find your friends among the balls").
10. **`docs/platform/domain/narrative.md`** - DS-2's canonical spec (light read). The consumer line (§3, line ~64): *"DS-6 consumes published structure for discovery"* - re-check from the DS-6 side.
11. **Canonical cores:** the cosmology core (S38: the social graph IS the Tree; own branches legible, wider crown ambient - no rankings, no counts; S27/S36/S37 cord-vs-branch; navigation by own branches as the canon's only people-finding mechanism), the roles core (who finds what), and the universe-discovery files where the cores cite them. **Authority-chain texture note:** DS-6's register row traces to the cosmology core (branches as routes, ambient crown) + the anti-leaderboard guardrails; the marketplace foot traces to ADR-U011 (Hamn-wave law) - a split texture: cosmology-leaning for navigation/discovery, ADR-leaning for the marketplace. Flag any canon-sub-page gap per the DS-3 precedent (proceed with remark; Sources-status carries it).
12. **`docs/platform/domain/README.md` + `docs/platform/domain/CLAUDE.md`** - sub-tier rules; the DS-6 L2 inventory line (verified at authoring, README line 14): `- **DS-6 Discovery** (`discovery.md`) - Search, recommendations, marketplace`. **The L2-line-vs-canon tension IS the charter re-derivation** (Section 3).
13. **ADRs (enumerated by domain-noun grep at authoring; re-verify membership against the decisions listing AND verify attributed text against the ADR files - template §3 text).** Sweep terms used: search/recommend/marketplace/discover/catalog/index/rank/browse. The adjudicated binding set, with what each file actually says:
    - **U023** (decomposition) - Discovery named in the seven-services block; services "communicate through the Internal API".
    - **U011 (THE marketplace lock - Transactions / Stripe Connect):** *"FringeIsland needs a marketplace (Hamn+) where Dreamineers can sell journeys, physical products and experiences"*; Stripe Connect chosen for marketplace payment splits; *"Full marketplace launches in Hamn"*. The marketplace is wave-deferred law - DS-6 owns the surface; the payment substrate is the Transactions vertical's (U002). No predecessor opener carried U011; it enters the chain here.
    - **U016 (cascade specification-first - entity-specific slot):** the cascade template carries an explicit *"Discovery: [what happens to visibility/search]"* slot (line 36). Lifecycle cascades must specify DS-6 effects - retired/unpublished things leave the discoverable surface.
    - **U018** (registry non-closure) - any discovery-kind vocabulary (facet kinds, result kinds, listing kinds) is a registry, never a sealed enum.
    - **U002** (five verticals) - Transactions is a vertical obligation, not a service; the marketplace-surface vs payment-rails boundary resolves WITHIN this law (the DS-5 notifications-boundary precedent, same shape).
    - **U025/U026** (equipment-grain law; studios law) - feature-keying stays at surfaces; no studio writes to DS-6.
    - **U027** (Shadow lifecycle) - Shadows perceive the real shared near-side world (anon-readable shared-world state); what a Shadow can discover/search follows the read posture, and Shadow-generated data carries ephemerality. The village and deep place 3 are FIM-only (S45) - intrinsic gates bound what discovery surfaces admit.
    - **U028** (governance by scope) - economy management is Console-scoped; gate-by-scope law.
    - **U007/U006/U003** (permission model; universal group pattern; Supabase substrate) - standard gating/scoping/storage law.
    - **Recorded false positives (excluded with rationale):** U001 ("discovered" in problem narrative), U004 + U009 ("browse" matched inside "browser" - word-boundary false positive; U004's anonymous-visitor substance enters via the U027/PC-2 anon-read posture, not as a DS-6 lock), U005 + U006-"index" (database indexes), U025/U026/U027/U028 "discovery" hits (all universe-discovery-log references - the naming collision in evidence, not entity text; those four ADRs bind via their general law, named above).
14. **`docs/planning/sessions/openers/STATUS.md`** - confirm the DS-6 row is `In flight` with this opener linked.

Then verify against disk (template §6 discipline; empty-result verification binds as template text):

- Spec at `docs/platform/domain/discovery.md` - confirm does NOT yet exist (verified absent at opener authoring, dual-method: directory listing + explicit-path test). If it exists, hard-fail and surface.
- Entity CLAUDE.md at `docs/platform/domain/discovery/CLAUDE.md` - confirm does NOT yet exist (the `discovery/` directory itself does not exist at authoring, dual-method). **Registered expected placeholder:** `.claude/skills/doc-health-check/SKILL.md` Section 7 carries its row (line ~442 at authoring: *"docs/platform/domain/discovery/CLAUDE.md | DS-6 Discovery entity-level CLAUDE.md | ... | Pending - when L2 specification is authored"*). When this run authors the file, **remove that registry row in the same commit** (registry rule 2; classifier-fallback note at Section 1; DS-4/DS-5 precedent: the Edit was permitted).
- `decisions/PENDING.md` state as described (the DS-6 watch-item present; this run dispositions it at the FIRST DECISION - the PENDING.md edit is part of the close batch if the decision resolves it).
- This opener at its landing path (`archive/` it at session close per the only-live-artifacts rule).

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md` (swept for domain nouns at authoring - no DS-6 boundary law found; Section T item 2)
- **Sub-tier:** `docs/platform/domain/CLAUDE.md` (same sweep, same negative)
- **L2 inventory line:** `- **DS-6 Discovery** (`discovery.md`) - Search, recommendations, marketplace` - **held as PARTLY CONTRADICTED pending the charter re-derivation** (the DS-1 anatomy-challenge verdict; revision is an expected Step 3 output, possibly a FIRST DECISION output)
- **Canonical cores (hard precedence):** cosmology (S38 own-branches-legible / ambient-crown; branches as the routes; the FIM-only intrinsic gates) + roles, plus the universe-discovery files where the cores cite them.
- **Conformance constraint:** the register Section 3 DS-6 row (navigation by own branches; no counts/rankings - anti-leaderboard guardrails).
- **Architectural authority:** the ADR set at Section 2 item 13, with U011 as the marketplace lock, U016's Discovery cascade slot as entity-specific text, and U002 as the verticals law the marketplace boundary resolves within.
- **Template:** `docs/templates/domain-service-spec.md` (slug `discovery` - the slug enum carries it; a rename ripples the enum, the README line, the domain CLAUDE.md enumerations, STATUS.md, and the two SVGs - sweep-then-enumerate if the FIRST DECISION renames).
- **Sibling seams (boundary input, NOT capability source):** `communication.md` (§8 Q4 - the routed seam; invariant 2's reservation; the search-indexing consumer line), `content.md` (published-registry line; marketplace seam), `journeys.md` (catalog reads; invariant 8 invariant), `world-model.md` (branch-routes navigation line; invariant 2 enforced at source), `narrative.md` (published-structure line) - consulted only for the named seams; DS-6 capabilities derive from the cores + ADRs, never from sibling specs.
- **Predecessor carry-forward:** the DS-5 bridge's DS-6 pickup block + the DS-4 bridge's DS-6 pickup + Section 7 priors.

**Cold-derivation discipline.** No reads of `supabase/migrations/`, `lib/`, `app/`, `components/`, `tests/`, or FEAT-* files at Step 1. Knowing THAT the named browse-surface exceptions exist (this opener's calibration, Section 5b) is prior; reading their shape is contamination. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.

**THE FIRST DECISION this descent owns - charter re-derivation + naming (gates the L2 identity section).** Two coupled calls, surfaced together to Stefan BEFORE Step 1's Write:
1. **Charter:** the L2 line says "Search, recommendations, marketplace"; the canon says navigation is by own branches, the wider crown is ambient, no counts/rankings/popularity anywhere (enforced at the DS-1 source), feeds are chronological (DS-5) - yet DS-5 invariant 2 explicitly reserves "anything ranked or recommended" TO DS-6 through DS-6's own contract. Re-derive what DS-6 IS under the reconciled canon: the cold frame to stress is (a) catalog search over published shared-world structure (journeys, narrative structure, published content, public groups), (b) recommendation WITHIN the anti-leaderboard guardrails (never popularity/comparative; the canon's mechanisms are branch-routes and ambient presence), (c) the marketplace surface over published content (U011, Hamn-wave), (d) people-finding stays branch-routed (DS-1's substrate; DS-6 may consume routes, never rank people). "Possibly shrink" (DS-1 verdict) is a live outcome.
2. **Naming:** keep "Discovery" (collision with the universe-discovery log stands, dispositioned as tolerable) vs rename (vocabulary-vetting on any candidate; the cosmology-neutral naming lock binds - the DS-7 "Intelligence" precedent). The charter answer feeds the name: a shrunk charter may name itself.

**Structural question 2 this descent owns - the feed-vs-recommendation boundary (communication.md §8 Q4, routed here).** Where does DS-5's "compose recent events" end and DS-6's "recommend/rank" begin; is a "relevant to you" surface ever DS-5? Cold lean inherited from DS-5: any selection beyond chronology + scope filters is DS-6's. Resolve from the DS-6 side; ratification gates it; the sanctioned cross-entity amendment on ratification is to `communication.md` §8 Q4.

**Structural question 3 this descent owns - the marketplace seam.** DS-4 and DS-3 both recorded "Transactions: explicitly none; the marketplace is DS-6's surface". U011 locks the marketplace at Hamn+ with Stripe Connect. Cold derivation places the boundary: what of the marketplace is DS-6-owned (listing/browsing/discovery of sellable things - the surface), what is the Transactions vertical's (payment rails, splits, entitlements - U002 obligation), what is platform-tier in-experience buying, what is Console-scoped economy management (U028). Wave-honesty: the marketplace is Hamn-wave law - expect full-forward capabilities, zero substrate.

---

## Section 4 - Three-step work shape

Step 1 cold derivation -> Step 2 stress-test (A#8 cumulative-forward) -> Step 3 adjudication with forward-commitment classification. Stated expectation: near-zero-code, predominantly full-forward profile (the DS-2/DS-4 shape, with the named browse-surface exceptions producing a small partial set at most). Single-session expected; choose at the Step 1 checkpoint with Stefan.

---

## Section 5a - Step 1 - cold derivation

**Activity.** FIRST: surface the FIRST DECISION (charter + naming, Section 3) and wait for ratification - it gates the L2 identity section. THEN author the candidate L3 inventory from upstream authority only. Write to `docs/platform/domain/{ratified-slug}.md` the L2 sections 1-7 (+ service-level invariants block per the DS-1..DS-5 additive precedent) and the L3 inventory + dependency chain + external dependencies + Sources-status.

**Derivation scope (from the register row + ratified charter + cores + ADRs + routed seams):** catalog search over published shared-world structure (journeys per DS-3's catalog-reads line; narrative published structure per DS-2's line; published content per DS-4's registry line; public groups per the realized `browse_public_groups` posture - verify the canon home for group-finding); search indexing posture over forum/feed content (DS-5's provisional line - re-check, the privacy/scope posture is the question); recommendation within the anti-leaderboard guardrails (the §8 Q4 resolution shapes this; never popularity, never comparative, never people-ranking); branch-route navigation consumption (DS-1 owns the substrate and the gate; DS-6 consumes routes for navigation surfaces, if the charter keeps this foot at all); the marketplace surface (structural question 3; Hamn-wave, full-forward); visibility/search lifecycle cascades (U016's Discovery slot: what happens to visibility/search on retirement/unpublish/member-exit); Shadow/anon discovery posture (U027: shared-world state anon-readable; FIM-only places stay out of Shadow-visible discovery; S45); write gating per U007/U028 (DS-6 is read-heavy - what writes exist at all? index/registry maintenance is a plausible answer); realtime/freshness posture (U003, lightly - is discovery eventually-consistent by design?).

**SETTLED - do not re-litigate (consume only):**
- **The Whisp split is decided** (PENDING.md); promotion at DS-7. DS-6 owns no face.
- **Profile/avatar media is PC-2/PC-3 substrate** (content.md §8 Q2, ratified at DS-4).
- **The attachment seam:** attachments are DS-4 assets referenced opaquely by ID (content.md §8 Q7, ratified at DS-5; the direction pattern at n=4).
- **The notifications boundary:** the vertical owns the obligation, DS-5 routes, products surface (ratified at DS-5). If discovery surfaces ever notify, that is consumption of the settled shape.
- **The anti-leaderboard guardrail is invariant and enforced at the source** (world-model.md invariant 2; journeys.md invariant 8; register row). DS-6 consumes; it does not re-litigate, weaken, or re-implement the guardrail.

**Carry-forward priors:** the five named disciplines (A#5 per-phase, A#8, A#9, PW-1, P-O1), D7, and the Section 7 table. At a near-zero-code entity expect P-O1/D7 to pin gating prose; A#9's named site here is **PostgREST full-text / `ilike` filtering** - search may already be framework-provided (the realized browse surface filters client-side; check whether the framework's query surface IS the realized contract before declaring a speculative one).

**Watches armed at Step 1:** A#9 (framework search mechanisms, per above); hypothesis pruning (plausible-but-unconfirmable shapes become §8 questions tagged speculative-third-shape - candidate sites: index-vs-live-query architecture, recommendation-signal sourcing, marketplace listing model); L2-line altitude (the line is the FIRST DECISION's subject - its revision is expected, gated, and lands at Step 3 with the ratified charter).

**Step 1 checkpoint surfacing.** After the candidate is composed, pause and surface to Stefan BEFORE the first Write: capability count by area; the §8 Q4 boundary position (structural question 2); the marketplace-seam position (structural question 3); the five sibling consumer-line re-check positions (world-model branch-routes; narrative published-structure; journeys catalog; content published-registry; communication search-indexing); L2-line revision text (per the ratified charter); §8 question count; speculative-third-shape tags; single-vs-split choice; any state-read citation corrections bundled. Wait for ratification.

**Single-Write preferred; A#5 per-phase; the ratified Write holds uncommitted until Step 3** (template text).

---

## Section 5b - Step 2 - code-informed stress-test pass

**Direction of authority preserved.** Code stress-tests the candidate; never sources it.

**Expectation - stated for Step 2 to verify rather than assume (calibrated at opener authoring 2026-06-10, dual-method):** DS-6 is **NEAR-ZERO-CODE with named exceptions.** No search/recommendation/marketplace table exists in the baseline (the rebuild migration carries 18 CREATE TABLE statements, none discovery-shaped; re-verify the full table count per PW-5 rather than inherit - DS-4 verified 19 the same day); **zero** discovery-vocabulary hits in `app/api/` (grep + find dual-method); **no** `lib/discovery/` (directory listing). The named exceptions (classify against the ratified charter, don't discover): `app/journeys/page.tsx` renders a "Journey Catalog" with **client-side** search-term + difficulty + tag filtering; `lib/types/journey.ts` carries `JourneyFilters` with `search?` ("Journey filters for catalog"); `lib/constants/permissions.ts` carries `browse_journey_catalog: 300` and `browse_public_groups: 500`; `components/Navigation.tsx` references the journey catalog; member-search exists in the invite flow (`users_select_own_and_search` policy name in `20260221221300`; `InviteMemberModal.tsx` named in `20260227110556` comments). Archived: `20260211183842_add_select_policies_for_catalog_tables.sql` uses "catalog" for template/reference tables - a DIFFERENT sense (naming-drift dual-reading; #4's named site). Expect a **predominantly full-forward profile** with at most a small partial set (catalog browse partially realized client-side). **Record the retraction-rate data point** (series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0 with 7 Class 2 deltas).

**Clusters, sized to the near-zero expectation (sandboxed sweeps per the DS-3/DS-4/DS-5 context-economy precedent):** **Cluster S structural survey first** (the named-exception files, per-file one-line classification); migrations cumulative-forward (A#8) for search/catalog/browse/filter/marketplace/recommend vocabulary **including `archive/`** (the catalog-tables migration; PW-MARCH1: did D15 consolidation lose any discovery-adjacent substrate?); framework-mechanism check (A#9's named site: PostgREST query/filter surface vs custom search - is the realized "search" entirely client-side array filtering?); permission-constant survey (`browse_*` rows in `role_template_permissions` seed data - which roles hold them); `lib/types/` scope-survey (PW-T1: `JourneyFilters` vs runtime); mop-up greps - **scope the noisy terms carefully** (`index` collides with DB indexes and array indexing; `search` with `search_path`; `catalog` with the template-tables sense; `rank` with near-zero expected hits; state patterns and exclusions per SS-16/17; empty-result verification binds on every zero-hit claim, template text).

**Boundary classifications to run against ratified Step 1 positions (not skip):** the client-side journey-catalog filtering against the ratified charter (is the realized browse surface a DS-6 capability partially realized, or a product-tier surface consuming DS-3's catalog reads with no DS-6 substrate at all? - the classification IS the finding); the `browse_*` permissions against the ratified charter; member-search-in-invite-flow against the people-finding posture (branch-routed; likely PC-3-tier, not DS-6 - classify, don't absorb).

**Cadence:** template text - cluster self-reflection between, surface ONCE at end with the three-class block + structured summary; per-cluster composition is not a gate.

**Step 2 checkpoint surfacing.** Finding counts by class; the boundary classifications; retraction-rate data point; PW-1/PW-MARCH1/A#9/#4 outcomes; Step 3 scope. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Required deliverables - not pickup:**

- **Spec** (combined Write committed at the Step 3 gate; fold-back Edits sub-batch-of-1 if needed; Class 2 deltas fold inline).
- **Seam resolutions folded where they belong:** the ratified amendment to `communication.md` §8 Q4 (the ONE sanctioned cross-entity edit from structural question 2), plus any ratified revisions from the five sibling consumer-line re-checks (world-model.md / narrative.md / journeys.md / content.md / communication.md - each gated individually at the Step 3 checkpoint; confirmations need no edit).
- **The FIRST DECISION's ripple, if rename-bearing:** sweep-then-enumerate across all casings (template §5a text; DS-2/DS-3 precedent - a-priori lists under-count 3-4x); the PENDING.md watch-item disposition lands in the close batch either way (resolved-by-keeping or resolved-by-rename).
- **Entity CLAUDE.md** at `docs/platform/domain/{ratified-slug}/CLAUDE.md` + **same-commit registry-row removal** from `.claude/skills/doc-health-check/SKILL.md` Section 7 (line ~442; classifier-fallback note at Section 1; DS-4/DS-5 precedent: the Edit was permitted).
- **Pickup lists** - DS-7 Intelligence (recommendation-signal sourcing if it touches profile accumulation; the Whisp-split promotion reminder rides), Verticals (Transactions receives the ratified marketplace boundary; Privacy receives the search-indexing posture over communication content + the Shadow-discovery posture), Hub/Gimbal (discovery surfaces at FEAT time; the realized client-side catalog filter as FEAT-time evolution), doc-health channel (README L2-line revision; domain CLAUDE.md enumeration; any rename ripple). Anchors per entry.
- **Closing bridge** at `docs/planning/sessions/2026-06-10_NN_-_DS6-LANDED.md` (NN next available; adjust date if the session crosses midnight; use the POST-decision short name in the title if renamed), per Section 11. **Archive this opener in the close batch.**
- **PENDING.md:** the DS-6 naming watch-item is dispositioned by the FIRST DECISION (edit the related-watch-items line accordingly). ADR amendments only if a Q-resolution warrants (append-only Option A; STOP and surface if any resolution contradicts U011/U002/U016).

**Step 3 checkpoint surfacing.** Q-resolution slate before the Step 3 block; each cross-entity edit's scope before landing. Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

Template-resident hard rules bind: empty-result verification (every zero-hit claim dual-method-verified; the method contrast is itself evidence - at this entity most claims will be zeros, so this rule fires constantly); fresh-read before Edit; structural-inventory-before-defect-assertion; SS-16/17 enumeration-claim-scoping (the noisy-term list at Section 5b); verify-before-asserting on commit shapes; cross-section fresh-read; explicit-count listings.

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 (per-phase), A#8 cumulative-forward, A#9 framework-mechanisms (site here: PostgREST query/filter surface as realized search), PW-1 schema-predates-partition (site here: trivially - no DS-6 schema exists), P-O1 actor primitive `get_current_personal_group_id()`. | Phase 2 close-out; template text. |
| **D7** | Role names are TEXT-keyed `role_templates` rows, never enums. | Experiment A; PC-3 §5. |
| **PW-5 19-table baseline** | End-state schema is 19 tables; re-verify rather than inherit. NONE are DS-6-attributed. | DS-2 bridge; DS-4 re-verified; DS-5 accepted same-day. |
| **Identity re-derivation watch** | DS-6's charter is partly contradicted by the new canon - re-derive, possibly shrink. THE FIRST DECISION input. | DS-1 bridge (anatomy-challenge verdict). |
| **Naming watch-item** | "Discovery" collides with the universe-discovery log; decide at the charter re-derivation; vocabulary-vetting binds; cosmology-neutral naming lock binds. | PENDING.md related-watch-items line. |
| **Anti-leaderboard guardrail (INVARIANT)** | No counts/rankings/popularity, enforced at the DS-1 source (invariant 2) and DS-3 (invariant 8); register DS-6 row. Consume, never re-litigate. | Register; world-model.md; journeys.md. |
| **DS-5 invariant-2 reservation** | "Anything ranked or recommended is DS-6's, reached through DS-6's own contract" - the recommendation surface is reserved TO DS-6, within the guardrails. | communication.md invariant 2. |
| **Marketplace lock (U011)** | Marketplace at Hamn+ (Dreamineers sell journeys/products/experiences; Stripe Connect rails). DS-6 owns the surface; Transactions owns the rails (U002); Console owns economy management (U028). | ADR-U011; DS-3/DS-4 Transactions-none lines. |
| **Discovery cascade slot (U016)** | Lifecycle cascades carry an explicit "Discovery: [what happens to visibility/search]" slot. | ADR-U016 line 36. |
| **Settled classifications** | Whisp split (DS-7); profile-media (PC-substrate); attachment seam (DS-4 assets by ID, n=4); notifications boundary (vertical/DS-5/products). | PENDING.md; content.md §8 Q2 + Q7; DS-5 bridge. |
| **Sibling-provisional rule** | DS-1..DS-5 claims against DS-6 are provisional; this descent re-checks them (the Q4 seam + five consumer lines). | Sibling Sources-status blocks. |
| **Cross-tier write discipline** | If DS-6 surfaces cross-tier writes at Step 2, frame into the channel anchored at DS-3 (new DS-5 anchors recorded) - do not resolve here. | PC-4 C3-7; DS-3 + DS-5 bridge pickups. |
| **TS-type vs runtime (PW-T1)** | Type-vs-runtime coverage check both directions at Step 2 (`lib/types/journey.ts` `JourneyFilters` is the named site). | PC-4. |
| **Cluster S structural survey** | First-cluster broad survey; at a near-zero entity it sizes (and likely shrinks) the deep-read. | PC-4; DS-3/4/5 sandboxed-sweep precedent. |
| **Equipment-keying law (U025)** | Features key on equipment at surfaces; platform capabilities never key. | ADR-U025; DS-3/4/5 precedent. |

---

## Section 8 - A-candidate ledger - watches at DS-6 entry

- **A#1, A#2, A#3, A#6, A#7** - carry forward as framings.
- **Retraction-rate series:** PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0 (7 Class 2 deltas). Record DS-6's point - a near-zero entity; the DS-2/DS-4 precedent predicts 0. The series settles at Phase 3 close-out.
- **PW-MARCH1** - one archived migration carries catalog vocabulary (the template-tables sense); verify nothing discovery-shaped was lost at D15, expect a clean nothing-to-lose verdict.
- **#4 migration-name-as-shorthand** - rides STRENGTHENED (first decisive firing at DS-5); landing adjudication at the next firing or Phase 3 close-out; named site here is the archived catalog-tables migration (Section T).
- **Tier-CLAUDE-as-L1-boundary-authority** - n=1 watch applied as instance rule at authoring; negative result (Section T item 2); record the n=2 point in §13.
- **Empty-result verification + ADR-enumeration-by-grep/citation-precision** - template text; at this entity the empty-result rule is the workhorse (most Step 2 claims are zeros); §13 reports sixth-instance held/failed.

---

## Section 9 - Disciplines in effect

All durable disciplines remain active: canonical-core precedence (hard); ratify judgment calls with Stefan before canonical edits (the FIRST DECISION gate precedes everything; checkpoints at 5a/5b/5c; the Q4 amendment and any sibling re-check edits are explicit gates); commit at phase gates with the single-session cadence; CODE stays a correction target; trust disk over memory; sessions append-only; the 2026-04 Hub L3 working set is NOT derivation input; any new assertion-bearing diagram joins the doc-health registry same-session; ASCII-only labels; Ferd non-closure (facet kinds, result kinds, listing kinds - registries, never sealed enums); move-and-correct; in-commit consistency; append-only Option A for any ADR amendment; OLDFEAT blindness invariant (listing only).

---

## Section 10 - Output expectations and commit shape

**Single-session run:** 4-6 commits - (i) combined spec Write (Steps 1+2+3, post-Step-3-ratification) + the ratified `communication.md` §8 Q4 amendment + any ratified sibling re-check edits + the domain README/CLAUDE.md enumeration updates + the PENDING.md watch-item disposition (+ the rename ripple if the FIRST DECISION renames); (ii) entity CLAUDE.md + doc-health registry-row removal (same commit); (iii) closing bridge with §13 capture + this opener archived; (iv) STATUS.md close (separate small commit). **No push to origin** - Stefan dispositions push.

---

## Section 11 - Closing bridge - required sections

Standard session-bridge shape plus: explicit closure statement ("*DS-6 {ratified-name} L1->L3 derivation completes at this commit batch*"); the FIRST DECISION record (charter verdict incl. whether "possibly shrink" fired; naming verdict with vocabulary-vetting rationale); pickup lists by receiving entity; forward-commitment classification (expectation: predominantly FULL-FORWARD; classify per capability); A-candidate ledger snapshot incl. the retraction-rate point, the #4 status, the tier-CLAUDE watch n=2 point, and PW-MARCH1's verdict; PW status; §13 capture as a primary section; carry-forward to DS-7 Intelligence (next per STATUS order); template revision disposition (sixth-instance verdicts on the fourteen cumulative revisions; #4's landing adjudication if it fired again; land or ride with rationale).

---

## Section 12 - Scope boundaries

- **The FIRST DECISION is this run's FIRST gate** - charter + naming surface together before Step 1's Write; the L2 identity section is gated on it.
- **Cross-entity edits:** ONLY the ratified `communication.md` §8 Q4 amendment + any individually-ratified sibling consumer-line revisions + the rename ripple if ratified. All other Class 3 findings route to pickups.
- **The cross-tier-write channel (DS-3-anchored, new DS-5 anchors recorded) is NOT this run's work.**
- **PC-1 Finding #4 and the avatars-bucket routing are NOT this run's work.**
- **The Notifications-vertical obligation inventory is NOT this run's work** (the boundary is SETTLED at DS-5).
- **The marketplace BUILD is NOT this run's work** - U011 locks it at Hamn+; this run specifies the DS-6 surface and places the boundary only.
- **Settled classifications (Section 5a) - consume, never reopen.**
- **The anti-leaderboard guardrail is invariant** - consumed, never re-litigated, never re-implemented at DS-6.
- **OLDFEAT blindness invariant** - listing only.
- **Concurrent `docs/novel/` activity is out of scope** - do not read, modify, or commit novel-path files.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge: answer the five template prompts. **Sixth-instance framing:** report whether the fourteen cumulative template revisions held as template text; adjudicate rider #4 (a second decisive firing lands it - the DS-5 disposition; otherwise it rides to Phase 3 close-out); record the tier-CLAUDE-as-L1-boundary-authority n=2 data point (applied at authoring, negative result - does a no-fire instance count toward or against template promotion?); record the retraction-rate point; capture the FIRST-DECISION-resumed shape (first since DS-3 - did the charter-gates-identity sequencing work cleanly after two no-decision runs?); capture the split authority-chain texture (cosmology-leaning navigation vs ADR-leaning marketplace) against the DS-4 (ADR-heavy) and DS-5 (cosmology-leaning) precedents. Generous capture posture; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. Then surface the FIRST DECISION (charter re-derivation + naming, Section 3) and WAIT for Stefan's ratification. Then Section 5a cold derivation; surface the Step 1 checkpoint before the first Write.

---

*End of instance.*
