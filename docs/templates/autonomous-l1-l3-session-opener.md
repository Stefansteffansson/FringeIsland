# Autonomous L1→L3 session-opener — `{ENTITY-SHORT-NAME} {ENTITY-FULL-NAME}`

**Template path:** `docs/templates/autonomous-l1-l3-session-opener.md`
**Per-instance landing path:** `docs/planning/sessions/openers/{instance-filename}.md`
**Instance filename convention:** `{entity-slug}-descent-opener.md` — entity-descriptive, self-describing in directory listings (DS-2 + DS-3 precedent; named by the PRE-rename name when the descent is rename-bearing). The older `cc-{entity-short-name}-autonomous.md` form survives only in archived PC-era instances.

> Per-instance session-opener for an autonomous CC run executing L1→L3 derivation for a single entity, end-to-end. Encodes the three-step shape (cold derivation → code-informed stress-test → adjudication) with the disciplines, priors, and scope expansions that the manual-track + autonomous-track comparison phase of Experiment B established as load-bearing. Authoring an instance: copy this template to its landing path, substitute every `{CURLY-BRACED}` marker, delete inapplicable sections, then have the autonomous CC session read the instance file as its first action.

---

## Revision history

| Revised after | Date | Change summary |
|---|---|---|
| Template authored | {YYYY-MM-DD} | Initial template; substance, scope, and discipline carry-forwards from Experiment A + Experiment B comparison phase + the PC-3 chain (Steps 1–3 + closing bridges). |
| Phase 3 close-out (verticals decision) | 2026-06-12 | LANDED §4 **entity-shape adjudication gate** as standing pre-Step-1 template text (Extension System precedent — the gate absorbed the first non-DS entity's variance without a template fork; adopted for the five verticals in place of an obligation-inventory variant; subsumes STATUS.md's "template applicability TBD" status value). Provenance: Extension System closing bridge + the Phase 3 close-out vertical-template adjudication. |
| Phase 3 close-out (series verdict) | 2026-06-12 | LANDED §13 **retraction-rate series verdict** — the completed series (PC-4 7/9; DS-1..DS-7 + Extension System all 0) supersedes the stale "tracks code presence" line: rate tracks opener calibration / prior coverage. Per-run recording retained. Provenance: DS-2..DS-7 + Extension System closing bridges. |
| Phase 3 close-out (rider slate, full-series evidence) | 2026-06-12 | LANDED §3 **constitutional-docs standing slot** (n=2, 2 fires — PRINCIPLES-AI.md at DS-7; the MANIFESTO's community-ownership principle at the Extension System). Provenance: DS-7 + Extension System closing bridges. |
| Phase 3 close-out (rider slate, full-series evidence) | 2026-06-12 | LANDED §5b **seeds-directory-in-canonical-table-reads** (n=3, fired productively every time — DS-7 authoring, DS-7 Step 2, the Extension System run; the 44-row permission catalog's point of definition at `supabase/seeds/01_permissions.sql`). Provenance: DS-6 + DS-7 + Extension System closing bridges. |
| Phase 3 close-out (rider slate, full-series evidence) | 2026-06-12 | LANDED §3 **tier/sub-tier-CLAUDE domain-noun sweep** (tier-CLAUDE-as-L1-boundary-authority; n=4, 2 fires — DS-5; the Extension System's domain sub-tier boundary law, the watch's strongest instance). Provenance: DS-5 + DS-6 + DS-7 + Extension System closing bridges. |
| Phase 3 close-out (rider slate, full-series evidence) | 2026-06-12 | LANDED §5b **migration-read-set-by-body-content** (rider #4 migration-name-as-shorthand; n=8 opportunities, 1 decisive firing — DS-5's `sprint3_smart_notifications.sql` stewardship-nomination body). Provenance: DS-5 closing bridge (`2026-06-10_06_-_DS5-LANDED.md`) + Extension System closing bridge (`2026-06-11_03_-_EXTENSION-SYSTEM-LANDED.md`, n-final). |
| DS-4 Content close (fourth instance) | 2026-06-10 | LANDED the two riding n-watches with multi-instance evidence: §6 **empty-result verification** (n=4 — three false-empty `find` instances on 2026-06-10, plus two in-run second-method catches at DS-4) and §3 **ADR-enumeration-by-grep extended with citation-precision** (n=3 — DS-3's opener omitted U017/U020; DS-4's state-read caught two imprecise ADR text attributions, U008/U013). RIDING: #4 migration-name-as-shorthand (no decisive firing at n=4 opportunities; retirement adjudication candidate at Phase 3 close-out). Provenance: DS-4 closing bridge (`2026-06-10_05_-_DS4-LANDED.md`, commit `b42627f`). |
| DS-3 Journeys close (third instance; first on the revised template) | 2026-06-10 | All eight `1de43ad` revisions held cleanly as template text at the first code-rich Domain Service. LANDED with second-instance evidence: §5b naming-drift dual-reading (PC-4 candidate #5; fired at DS-3 `journey_type` + the SVG case-variant catch); §5a rename-bearing sweep-then-enumerate (DS-2 + DS-3 ripple under-count data); §10 single-session commit cadence (DS-2 tension + DS-3 clean run); header instance-filename convention (entity-descriptive, DS-2 §13 recommendation + DS-3 second use). RIDING: #4 migration-name-as-shorthand (still no decisive firing at n=3 opportunities). New n=1 watches riding opener instances: empty-result verification (a silently-failing `find` claimed zero API routes; a second method caught it — verify empty listings before claiming absence) and ADR-enumeration-by-grep at opener authoring (DS-3's opener omitted ADR-U017/U020; enumerate binding ADRs by sweeping the decisions index for the entity's domain nouns, not from the predecessor's list). Provenance: DS-3 closing bridge. |
| DS-2 Narrative close (second instance) | 2026-06-10 | Adjudicates the seven PC-4 first-instance candidates (PC-4 closing bridge `2026-05-15_03` + DS-2 closing bridge as provenance): LANDED — §5b cluster-cadence self-reflection-not-gate text (#1), §5b directory-level scope-survey (#2), §5a A#5 per-phase cadence (#3), §13 retraction-rate tracking series (#6), §6 entity-type-agnostic shape note (#7). RIDING opener instances — migration-name-as-shorthand (#4) and three-casing dual-reading (#5), neither fired at DS-2 (no second-instance evidence). Also landed with two-instance evidence: §3 canonical-cores authority-chain extension for cosmology-bound entities (DS-1 + DS-2); §1 Check 5 template-baseline check (PC-4 + DS-2); §1 Check 4 genericized to instance-enumerated tree state (PC-3 amendment revision + DS-2 instance precedent); §5b `lib/utils/supabase/` path corrected to `lib/supabase/`. |

*Revision discipline: after each entity-close that uses an instance of this template, the closing bridge's "Template revision disposition" section adjudicates whether the run's post-run methodology capture (instance §13 below) surfaced durable findings warranting a template amendment. Amendments commit as small `chore(templates)` deltas citing the entity-close bridge as provenance.*

---

## §0 Substitution markers used in this template

When authoring an instance, replace every occurrence of the following:

- `{ENTITY-SHORT-NAME}` — e.g. `PC-4`, `DS-1`
- `{ENTITY-FULL-NAME}` — e.g. `Governance`, `World Model`
- `{ENTITY-TYPE}` — one of: Platform Core area, Domain Service, Studio, Product, Vertical, Design System
- `{PREDECESSOR-BRIDGE-PATH}` — the chronologically-immediate predecessor bridge, e.g. `docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`
- `{PREDECESSOR-TIP-SHA}` — the expected tip commit SHA at session-open
- `{SPEC-OUTPUT-PATH}` — canonical spec path, e.g. `docs/platform/core/governance-specification.md`
- `{ENTITY-CLAUDE-PATH}` — entity-level CLAUDE.md path, e.g. `docs/platform/core/governance/CLAUDE.md`
- `{L2-INVENTORY-LINE}` — the line from the parent `README.md` naming this entity at L2
- `{ENTITY-SPECIFIC-CARRY-FORWARD-BLOCK}` — references to the predecessor bridge sections carrying entity-specific priors (e.g. PC-3 closing bridge §Pickup lists → PC-4)
- `{TEMPLATE-PATH}` — the relevant `docs/templates/*.md` (e.g. `docs/templates/platform-core-spec.md` for a Platform Core area)
- `{INSTANCE-DATE}` — the date the instance is authored (used in the closing-bridge filename when the entity lands)

Delete this `§0` section from the instance after substitution is complete.

---

## §1 Pre-flight checks — STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `{PREDECESSOR-TIP-SHA}` (the predecessor bridge's commit, or any subsequent commit added by the human between sessions). Hard-fail if tip is earlier.
4. **Working tree state.** Run `git status`. Expected state is **enumerated explicitly by the instance author** (per the PC-3 amendment check-4 enumeration-completeness revision): the default expectation is **clean**; any acceptable pre-existing modification or known re-occurrence shape (e.g. a plugin re-injecting a block into a tracked file) is named in the instance with its ratified disposition. Hard-fail on any modification or untracked file not named, especially in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `{SPEC-OUTPUT-PATH}`'s parent directory.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at the commit the instance names. Hard-fail if earlier (template missing or rolled back); **soft-flag if later** — a template revision landed between opener-authoring and session-open; surface the delta and adjudicate before proceeding. (Carried at PC-4 + DS-2 instances; earned its place per PC-4 §13.)

After all five pass, report each check's outcome and proceed to §2.

---

## §2 State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

1. **`{PREDECESSOR-BRIDGE-PATH}`** — the chronologically-immediate predecessor bridge; primary read.
2. **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge; *load-bearing for autonomous discipline carry-forwards*. Sections "Substance findings — where the two tracks diverge", "Methodology findings", and "Dispositions" are the durable inputs.
3. **`docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md`** — PC-3 closing bridge; A-candidate ledger snapshot (#1–#9) + ADR amendment shape variants precedented + the §Pickup lists block routing to downstream entities.
4. **`docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`** — PC-2 entity bridge; PC-3 carry-forward block (still authoritative for cross-entity findings) and Q6 deferred-amendment routing.
5. **`docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md`** — PC-1 entity bridge; Finding #4 two-tier centralization channel and Finding #3 `admin_audit_log` routing.
6. **`{ENTITY-SPECIFIC-CARRY-FORWARD-BLOCK}`** — any entity-specific carry-forward bridge or block.

Then verify against disk per the disk-of-record discipline (§6 below):

- Spec at `{SPEC-OUTPUT-PATH}` — confirm whether it exists. For most entries, it does not yet exist (the autonomous run will create it). If it exists, confirm its state matches what the predecessor bridge described.
- ADRs in `docs/architecture/decisions/` referenced by the predecessor bridge — confirm presence and amendment state as described.
- Entity-level CLAUDE.md at `{ENTITY-CLAUDE-PATH}` — confirm whether it exists; create as part of the run if it does not (per PC-3 precedent).
- This session-opener instance file existence at its landing path.

---

## §3 Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these — no more, no less:

- **L1:** root `CLAUDE.md` + `docs/{tier}/CLAUDE.md`
- **Sub-tier** (Platform only): `docs/platform/{core|domain|extensions}/CLAUDE.md`. **Sweep tier and sub-tier CLAUDE.md files for the entity's domain nouns at opener authoring** — these files can carry entity-binding boundary law, not just routing (DS-5; Extension System: the domain sub-tier file carries the non-closure authoring discipline, the closure-recognition rule, and the Platform API open-consumer posture). (n=4, 2 fires; landed at Phase 3 close-out.)
- **Canonical cores (cosmology-bound entities — Domain Services, Studios, Products):** the canonical cores under `docs/ecosystem/universe/` (cosmology, roles, beings, narrative) ARE derivation input with hard precedence, plus the universe-discovery files where the cores cite them (DS-1 + DS-2 precedent). The PC-shaped chain omits them because Platform Core is cosmology-neutral; instance authors include the cores the entity's substance touches.
- **Constitutional ecosystem docs (standing slot):** `docs/ecosystem/VISION.md`, `docs/ecosystem/MANIFESTO.md`, `docs/ecosystem/PRINCIPLES-AI.md` enter the authority chain whenever the entity's substance touches them (PRINCIPLES-AI.md at DS-7 — the guard-railing law; the MANIFESTO's community-ownership principle at the Extension System). The instance author names which constitutional docs bind and why. (n=2, 2 fires; landed at Phase 3 close-out.)
- **L2 inventory line:** `{L2-INVENTORY-LINE}` from the parent `README.md`
- **Architectural authority:** ADR-U023 (Platform Core / Domain Services decomposition) + any ADR specifically constraining this entity. **ADR-enumeration-by-grep with citation-precision:** the instance author enumerates the binding-ADR set by sweeping `docs/architecture/decisions/` for the entity's domain nouns — never by inheriting a predecessor's list (DS-3's opener missed ADR-U017/U020 that way). The executing session re-verifies membership against the decisions-directory listing at state-read, AND verifies any text the opener *attributes* to an ADR against the ADR file itself before deriving from the characterization — at DS-4 two attributed characterizations proved imprecise (ADR-U008 carries no "content renderers" text; ADR-U013 carries no content-specific text), caught only because the ADRs were read, not trusted. Non-material citation corrections bundle into the Step 1 checkpoint rather than halting. (n=3; landed after DS-4.)
- **Template:** `{TEMPLATE-PATH}`
- **Predecessor carry-forward:** the entity-specific carry-forward block named in `{ENTITY-SPECIFIC-CARRY-FORWARD-BLOCK}` (from the predecessor bridge's §Pickup lists or equivalent)

**Cold-derivation discipline.** Do *not* read `supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, or any existing `FEAT-*` files during Step 1. The candidate L3 inventory is derived from L1 + L2 + ADRs + carry-forward priors only. Step 2's stress-test pass is the structural mechanism for grounding the candidate against disk reality; sourcing capabilities from disk at Step 1 contaminates derivation and breaks the three-step pattern.

---

## §4 Three-step work shape

PC-3 ran as a split-session (Steps 1+2+3 across three sessions). PC-1 and PC-2 ran single-session. Autonomous runs may take either shape; the template is shape-agnostic. What's required is that all three steps land, in order, with the checkpoints below.

**Entity-shape adjudication gate (pre-Step-1, named).** For entities whose template fit or landing path is not already settled (any entity outside the domain-service-spec slug enum: verticals, studios, products, design system), the run's first ratification gate adjudicates entity shape BEFORE Step 1: surface the evidence (what the owning README names the artifact, which template's section skeleton applies, where the spec lands) together with the authoring lean; the human's ratification fixes the template shape + landing path, with deviations named in-file as structural variants on the proven skeleton. Precedent: the Extension System ran this gate cleanly as the first non-DS entity (spec at `docs/platform/extensions/SPECIFICATION.md` on the DS-spec skeleton, slug enum untouched). This gate subsumes STATUS.md's "Pending; template applicability TBD" status value. (Landed at Phase 3 close-out.)

---

## §5a Step 1 — cold derivation

**Activity.** Author the candidate L3 inventory from upstream authority only. Write to `{SPEC-OUTPUT-PATH}` the L2-owned sections (§1–§8 per the template) and the L3-owned capability inventory + dependency chain + external dependencies + Sources-status block.

**Carry-forward priors** — held actively throughout cold derivation:

- **P-O1** — *Cold derivation drifts toward Supabase-canonical actor primitives where this repo overrides.* The actor primitive in this repo is `get_current_personal_group_id()` (a four-hop chain through `auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`), NOT `auth.uid()` directly. Flag any §3/§5/§6 prose that drifts toward `auth.uid()` as actor primitive and correct in place at Step 1 if the drift is structural, or surface at Step 2 for adjudication if subtle.
- **D7** — *Role-name vocabulary canonical artifact is named-constant lookup table (TEXT-keyed), not a PostgreSQL ENUM.* The four FringeIsland role names (Steward, Guide, Member, Observer) live as TEXT values in `role_templates`. Cold derivation should pin this at §5 storage.
- **X3** — *Signature drift between ADR text and disk is a recurring class of finding.* Where this entity's §6 references function signatures from ADRs (e.g. ADR-U007's `has_permission`), record both the ADR's documented signature and the expected disk signature; Step 2 settles the actual disk signature, Step 3 routes any drift to an ADR amendment.
- **X5** — *Service-role escalation is open-coded across multiple sites; two-tier centralization framing applies.* Gap A (substrate — service-role client construction) and Gap B (auth-flow plumbing — JWT-verify + profile-resolve) are distinct centralization decisions; both are PC-1 Finding #4's channel. If this entity surfaces service-role-using code paths at Step 2, route findings into the two-tier framing.
- **Finding #4** — *Secrets/credentials substrate is app-tier, not database-tier.* If this entity surfaces app-tier substrate adjacent to secrets or credentials, route to Finding #4's Phase-2 close-out / candidate ADR / tier-shape revision channel — do not re-derive a separate escalation path.
- **Multi-role memberships (D3 from Experiment B autonomous side)** — *A separate `user_group_roles` junction with composite PK supports multi-role-per-membership.* Manual-side PC-3 derivation missed this as an explicit capability surface; autonomous side caught it. At Step 1, check whether this entity's capability inventory needs an explicit multi-role-per-membership capability or governance discipline. At Step 2, confirm disk evidence.
- **{Entity-specific priors}** — any priors from the entity-specific carry-forward block above.

**Watches armed at Step 1:**

- **A-candidate #9** — *Framework-provided contract mechanisms are invisible to cold derivation.* Before declaring the entity's contract surface at §3 / §7, explicitly check for framework-provided mechanisms (PostgREST RPC, Next.js Server Actions, etc.). If the cold position is "speculative third shape" because the contract surface is unclear, flag for Step 2 verification rather than commit to a placeholder.
- **Hypothesis pruning trade-off.** Prior-loaded context (this template, the carry-forwards above) reduces speculative-third-shape generation — useful, but with a cost. PC-3 manual-side did not generate a group-hierarchy hypothesis because of prior-loading; PC-3 autonomous side did, and cleanly disconfirmed it at Step 2 (a clean PW-2 instance). Autonomous runs should NOT over-prune speculative hypotheses at Step 1 just because priors are loaded. If a structural shape feels plausible but cannot be confirmed from upstream alone, write it down as a §8 question with PW-2-style "speculative as third shape" tagging; Step 2 will resolve.
- **L2-line altitude.** Stress-test the entity's L2 inventory line at the start of Step 1 — does any item read as domain-scope, or is one item missing that would be a domain-agnostic primitive? Record at §L3 sources-status if the line wants revision; the revision itself happens at Step 3.

**Step 1 checkpoint surfacing.** After the candidate spec is composed (§1–§8 + §L3 capability inventory + Sources-status block + dependency chain + external dependencies), pause and surface a structured summary to the human BEFORE the first Write. The summary names: capability count by internal area; the L2-line altitude finding (if any); the §8 open questions count; any prior carry-forward whose application was non-obvious; any speculative-third-shape hypothesis tagged for Step 2; any drift from the template that the entity's substance required. Wait for ratification before Write.

**Single-Write vs split-Edit at Step 1.** Single Write of the full spec is preferred for autonomous runs (per PC-3 autonomous-track precedent: one commit, 539 lines). If multi-Edit work is needed, sub-batch-of-1 cadence applies (see §6). **A#5 cadence applies per-phase, not per-session:** A#5 can fire at Step 3 fold-back work even when Step 1 was single-Write (PC-4: single-Write Step 1, 29 sub-batch-of-1 Edits at Step 3); the §13 verdict accounts for per-phase cadence shape.

**Rename-bearing runs: sweep-then-enumerate.** When an entity rename executes in-run, the ripple enumeration source is a **repo-wide label sweep across all casings** of the old name, classified into living-doc edits vs append-only exclusions (session records, ADRs, archived references, the discovery log) — with any a-priori ripple list used only as a completeness floor, never as the enumeration. A-priori lists under-count by 3-4x (DS-2: floor 6, actual 22; DS-3: floor 7, actual 28 living files plus a case-variant catch). Mechanical label replacements may run as one scoped, grep-verified sed batch (DS-2 precedent); prose-sensitive sites get individual Edits.

---

## §5b Step 2 — code-informed stress-test pass

**Activity.** Open existing artifacts as adversarial input. Compare candidate against artifacts. Produce a structured delta in three classes (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity findings) and surface phase-wide observations.

**Direction of authority preserved.** Code stress-tests the candidate. Code never sources the candidate. Updates to the candidate happen only where the architecture *agrees* with the disk-evidence finding, never because the code says so. Code that has no architectural home becomes a Class 3 cross-entity finding, not a capability added to this entity's inventory.

**Step 2 disk-evidence scope** — load-bearing per the Experiment B comparison-phase methodology finding (which named scope-of-disk-reading as the central differentiator between manual-track and autonomous-track outputs). The autonomous run MUST read all of the following, organised as clusters with cluster-by-cluster surfacing (see "Step 2 cadence" below):

- **Canonical-table reads.** `supabase/migrations/` in cumulative-forward order (per A-candidate #8 — cumulative-forward read order surfaces mid-stream retractions that single-snapshot reads miss). Read every migration that touches this entity's tables, functions, RLS policies, or triggers; trace forward from earliest to latest. **Select the migration read-set by body content, never by filename** — migration names under-describe their bodies (DS-5: `sprint3_smart_notifications.sql` carries the stewardship-nomination flow as ~60% of its body; filename-trust would have mis-scoped it). (n=8 opportunities, 1 decisive firing; landed at Phase 3 close-out.) **`supabase/seeds/` reads alongside migrations** — seed data carries canonical vocabulary, and a table's point of definition can live in seeds, invisible to migrations-only sweeps (the canonical 44-row permission catalog is defined at `supabase/seeds/01_permissions.sql`, relocated from migrations at D15). (n=3, fired productively every time; landed at Phase 3 close-out.)
- **Migration archeology.** `supabase/migrations/archive/` for retired migrations relevant to this entity. The D15 monolithic rebuild commit (`ce58227`) absorbed 71 prior migrations; pre-rebuild migrations live in archive only. Archeology surfaces the entity's lineage and any asymmetric-recovery findings (P11-class: things lost during consolidation, not recovered).
- **Framework-mechanism evidence.** `lib/hooks/` (especially `usePermissions.ts` and any `use{Entity}*.ts` patterns) and `lib/utils/supabase/` (`client.ts`, `server.ts`, `middleware.ts`) — these reveal what the published contract surface actually is at the framework level, independent of any custom API routes. PostgREST RPC as canonical public HTTP API surface was the load-bearing PC-3 finding here; the recurrence-watch is A-candidate #9.
- **Admin orchestration.** `lib/admin/` — admin-tier helpers, callerUserId / sentinel-UUID / literal-NULL calling conventions, service-role construction patterns.
- **createClient survey.** `app/api/*` survey of every `createClient` instance. PC-3 found 5 sites / 6 instances (5 service-role-using routes, one with 2 createClient calls). Per-route survey: which permissions gate the route, what business logic justifies the custom route over PostgREST RPC, whether the auth-flow plumbing is duplicated.
- **Type drift.** `lib/types/*` — drift between TypeScript type definitions and disk reality (often by omission rather than commission; PC-3 found `display_preference` aligned but `group_type` / `status` missing from `lib/types/group.ts`).
- **Mop-up greps.** For each disk-anchor pattern surfaced in cold draft, run targeted greps to confirm enumeration scope. Per SS-16 / SS-17 discipline (enumeration-claim-scoping): state the patterns searched + report scope as "no hits within [patterns]" rather than "no hits anywhere."
- **Naming-drift dual-reading.** For any naming-drift finding (realized vocabulary differing from canon vocabulary), record BOTH the historical-transition reading (pre-canon names that predate the current model) and the surface-idiomatic reading (platform-technical vs canon-facing convention) rather than a single by-design-or-by-accident verdict. Watch case-variant labels too — sweep patterns must cover all casings (DS-3: SVG labels read "Experience engine", matching neither "Experience Engine" nor "experience-engine"; an SS-17 sub-shape B instance caught only by a bare-stem check). (PC-4 candidate #5; second-instance evidence at DS-3 `journey_type`.)

**Step 2 cadence — cluster batch-and-report.** PC-3 introduced cluster batch-and-report at Step 2 (vs PC-1/PC-2 single-pass). It worked. Recommended for autonomous runs:

- Open one cluster at a time (e.g. Cluster A = migrations 1–6 at first date range; Cluster B = migrations 7–11 at second date range; Cluster lib-1 = `lib/hooks/` + `lib/supabase/`; Cluster api-1 = `app/api/*` createClient survey).
- After each cluster, compose the cluster's three-class output (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity findings) as **CC self-reflection discipline** — it catches retractions early and informs next-cluster scope. Per-cluster composition is NOT a human ratification gate; the CC proceeds between clusters without ratification (autonomous-track posture). Surface **ONCE at end-of-Step-2** with the full §L3 Step 2 block + the structured checkpoint summary below.
- **Directory-level scope-survey before deep-read.** Directory-name-as-shorthand is insufficient for tier-scope determination (PC-4's `lib/admin/` was 25% governance-tier; paths named in opener instances can themselves be stale). Run a scope survey (file listing + per-file one-line classification) at directory level before claiming any directory as this entity's territory — the directory-level analogue of the Cluster S structural survey at entity level.

**Two retractions to watch for, both surfaced at PC-3 Step 2 via the cumulative-forward + framework-mechanism disciplines:**

- **Single-snapshot vs cumulative-forward retraction.** A function or table that "does not exist" in one migration may be defined in a later migration; read cumulative-forward to surface. (PC-3 Cluster A claimed `is_platform_admin()` did not exist; Cluster B's migration 10 defined it — retraction. A-candidate #8 ratified.)
- **PW-2 retraction via framework-mechanism awareness.** The cold-derived "speculative third shape" for the contract surface may turn out to be canonical when the framework's published mechanism is checked. (PC-3 cold-derived public HTTP API surface as speculative; PostgREST RPC is the canonical surface, evidenced at `lib/hooks/usePermissions.ts` directly hitting `supabase.rpc(...)`, plus the absence of `v1/{entity}` custom routes. A-candidate #9 armed.)

**Step 2 checkpoint surfacing.** After all clusters land and the §L3 Step 2 block is composed (three-class output + phase-wide observations + Sources-status amendments), pause and surface a structured summary BEFORE the Write. The summary names: total finding counts by class; any retractions of cold positions; any new A-candidates surfaced; whether PW-1 (schema-predates-partition) and any speculative-third-shape hypotheses tagged at Step 1 confirmed or retracted; Step 3 work scope as it emerges from the findings. Wait for ratification before Write.

---

## §5c Step 3 — adjudication

**Activity.** Resolve §8 open questions, author the §L3 Step 3 block, apply spec amendments to §3/§5/§6/§7/§L4 per Step 2 findings, author ADR amendments where Step 3 resolutions warrant, produce pickup lists for downstream entities. Author the closing bridge.

**Required deliverables — not pickup:**

- **Spec amendment.** A combined spec amendment commit landing §L3 Step 3 block + cross-section amendments (per PC-2 + PC-3 precedent). For autonomous single-Write runs, the spec may instead be authored in one Write per §5a + §5b + §5c, with Step 3 outputs included from the start.
- **ADR amendments at entity close.** Per Experiment B comparison-phase disposition #5: ADR amendments are in-scope work, not pickup. PC-3 produced three append-only Option A amendments (ADR-U006, ADR-U007, ADR-U018), one per Q-resolution requiring ADR work. Each ADR amendment is a separate commit with explicit provenance citing the spec commit and the Step 2 disk anchors. Three shape variants are precedented and all legitimate:
  - **THREE-COMPONENT SCOPE** (ADR-U006 precedent): new Implementation commitments section with three named components of implementation.
  - **FOUR-COMPONENT SCOPE** (ADR-U007 precedent): same shape, four components.
  - **THREE-DISTINCTION SCOPE** (ADR-U018 precedent): clarification-of-intent shape codifying three distinctions that were already implicit; introduces a framing paragraph between lead and scope block.
  - Choose by substance — components-of-implementation for adds; distinctions-clarifying-scope for codifying implicit framings.
- **Pickup lists** for downstream entities (next Platform Core area, Domain Services, possibly Verticals or sibling Studios). Each pickup entry names the receiving entity, the substance routed, and the disk anchors (commit SHAs + file/line citations).
- **Closing bridge** at `docs/planning/sessions/{INSTANCE-DATE}_NN_-_{ENTITY-SHORT-NAME}-LANDED.md`. Always required regardless of single-or-multi-session run shape (the next entity reads it). Intra-session bridges (Step-1-landed, Step-2-landed) are optional and only authored if the run splits across sessions. The closing bridge follows the standard session-bridge template + the additional sections specified in §11 below.

**Fold-back required for canonical runs.** Class 2 entity-internal deltas surfaced at Step 2 must be inline-folded into the final §1–§8 text at Step 3. Do NOT preserve them as-cold-with-deltas-flagged-only-in-Step-2-block (the "preserve-as-cold" shape is a legitimate methodology variant for experiment runs per Experiment B comparison-phase disposition #6, but PC-4 onward are canonical runs — fold-back is required). After Step 3, §1–§8 should read as if the candidate were authored with full disk awareness from the start; Step 2 block documents the journey, §1–§8 documents the destination.

**Step 3 checkpoint surfacing.** Before authoring §L3 Step 3 block, surface the Q-resolution slate to the human (which §8 questions are pre-resolved by Step 2 findings; which need Step 3 disposition decisions; which are deferred or routed downstream). Before drafting each ADR amendment, surface its scope (which Q-resolution drove it; which shape variant; what disk anchors are cited). Wait for ratification at each surface point.

---

## §6 Self-checking discipline — Tripwire #4 substitute

The bouncing-partner cycle in manual-track runs catches a class of errors (oldText stale-context recovery, cross-section anchor confusion, commit-shape under-inspection, OLDFEAT head-truncation) as structural byproduct. Autonomous runs do not have this catch-surface. The Experiment B comparison-phase named this absence as a real risk; the disciplines below substitute structurally for what the bouncing-partner produces ambient.

**Hard rules:**

- **Fresh-read before every Edit; never construct `oldText` from memory.** Second-touch Edits on previously-emitted content fail when in-context memory diverges from disk content. Re-read the file before constructing the `oldText`. The rule applies even when the prior Edit landed in the same session; Tripwire #4 sub-shape "oldText stale-context recovery" came from PC-3 Step 3 Edit 6.5.a where exactly this divergence fired.
- **Structural-inventory-before-defect-assertion.** Before claiming a real defect in composed content (heading-count mismatch, duplicated section, missing reference), do a structural inventory of the composed draft (heading count, sentence count, token-occurrence audit). PC-3 Step 1 logged three false-positives caught this way; the discipline converts a potential full-rebounce cycle into a single-round-trip verification.
- **Enumeration-claim-scoping** (SS-16/SS-17). For any enumeration-based verdict: state the patterns searched and report scope as "no hits within [patterns]" rather than "no hits anywhere." Verdict-scope generalization beyond actually-searched patterns is the SS-17 sub-shape A failure mode; pattern-variant blindness (e.g. missing `INSERT INTO permissions` without schema qualifier when grepping `INSERT INTO public.permissions`) is sub-shape B.
- **Verify-before-asserting on commit-shape claims.** Before claiming a commit's body shape from `git log --oneline`, fresh-read the full commit body with `git log -1 --format=%B <sha>`. `--oneline` is structurally insufficient for shape claims.
- **Cross-section fresh-read before second-touch Edits.** When a Step 3 Edit touches a section that was previously emitted in Step 1 or Step 2, fresh-read the section's current disk state before composing the new Edit. Cross-section anchor confusion (PC-3 Step 3 Edit 4c) came from in-context memory of a section that had been amended off-cycle.
- **Listing commands use explicit counts.** State-read pass commands that list directories use `ls dir/ | wc -l` or full `ls dir/`, never `head`-truncated previews. PC-3 Step 3 caught a near-miss where `ls docs/TMP/OLDFEAT/ | head -3` produced an enumeration-scope claim of "3 files" against a directory of 18.
- **Empty-result verification.** Every empty listing or zero-hit enumeration that feeds a claim is verified by a **second, differently-shaped method** (grep vs ls vs explicit-path test; loose-pattern vs word-boundary) before the claim is made. A silently-failing `find` produced false-empty listings three times on 2026-06-10 (DS-3 Step 2 + twice in the post-DS-3 doc-health run); within the DS-4 run the second method twice caught what the first missed (a loose-pattern `media` false positive inside "intermediate", exposed only by method contrast; an `avatars` migration hit the bucket-pattern sweep missed). The contrast between methods is itself evidence — record what each shape found. (n=4; landed after DS-4.)

**Methodology-framing space.** Autonomous runs can reach meta-altitude observations (Experiment A predicted they couldn't; PC-3 autonomous side disproved this — its P-O1 promotion framing was sharper than manual side's). The template does not prescribe how to be sharp, but it makes space for it: surface methodology-framing observations alongside substance findings throughout the run, not only at §13 post-run capture.

*Durable shape note:* the §6 discipline set has held without modification across entity types and code-presence extremes (PC-4: code-rich Platform Core; DS-2: near-zero-code Domain Service) — treat it as entity-type-agnostic.

---

## §7 Carry-forward priors (named)

The carry-forwards in §5a are restated here in tabular form for quick reference. Each prior has a name, a one-line statement of the pattern, and the source citation for traceability.

| Prior | Statement | Source |
|---|---|---|
| **P-O1** | Cold-derivation drifts Supabase-canonical actor primitive (`auth.uid()`) where this repo overrides (`get_current_personal_group_id()`). | Experiment A bridge (2026-05-04_03) Group C item 8; PC-3 §L3 sources-status; PC-3 comparison-phase bridge promotion. |
| **D7** | Role-name vocabulary canonical artifact is named-constant lookup table (TEXT-keyed), not PG ENUM. | Experiment A bridge Group C item 9; PC-3 §5. |
| **X3** | Signature drift between ADR text and disk is recurring; both shapes must be recorded; drift routes to ADR amendment. | Experiment A bridge Group B item 5; PC-3 §6 + ADR-U007 amendment. |
| **X5** | Service-role escalation is open-coded across multiple sites; two-tier centralization framing (Gap A substrate + Gap B auth-flow) applies. | PC-3 §L3 Step 2 C3-2; PC-1 Finding #4 channel reframe. |
| **Finding #4** | Secrets/credentials substrate is app-tier, not database-tier; route to Finding #4 channel rather than re-derive. | PC-1 entity bridge (2026-05-04_01) Finding #4 program-level carry-forward. |
| **Multi-role memberships (D3)** | A separate `user_group_roles` junction with composite PK supports multi-role-per-membership; capability surface watch. | Experiment B autonomous-track Step 2 finding D3; comparison-phase bridge disposition #1. |
| **{Entity-specific}** | {Statement} | {Source} |

---

## §8 A-candidate ledger — watches at this entity entry

The program-level A-candidate ledger spans #1–#9. Status snapshot for this entity's entry, with promotion-watch criteria where applicable:

- **#1 Latent-vs-delta distinction** — promotion-watch (carry-forward).
- **#2 Tier-shape escalation channel** — promotion-watch (carry-forward).
- **#3 Database-shaped L2 framing assumption** — promotion-watch (carry-forward).
- **#4 Schema-predates-partition (PW-1)** — *promotion-ready*; expected to recur at this entity's Step 2 if the schema substrate predates the entity's partition boundary. PC-3 disk-anchored at full specificity (D15 monolithic rebuild `ce58227`). Promotion to named program-level pattern at Phase 2 close-out.
- **#5 Multi-Edit gate emission discipline (sub-batch-of-1)** — *ratification-watch*. Autonomous runs may use single-Write shape and sidestep #5; if multi-Edit work is needed, sub-batch-of-1 is the default cadence. Frame explicitly in the post-run capture (§13): did the run use single-Write, sub-batch-of-1, or larger batches, and did any emission failures surface?
- **#6 Cold-derivation-with-priors as methodology variant** — promotion-watch armed at Step 1.
- **#7 Tool-payload verification (structural-inventory-before-defect-assertion)** — held throughout; carry-forward.
- **#8 Single-migration-snapshot vs cumulative-forward read order** — *RATIFIED at PC-3 Step 2*; carry-forward. Named-program-pattern promotion at Phase 2 close-out if recurrence at this entity's Step 2 confirms.
- **#9 Framework-provided contract mechanisms invisible to cold derivation** — promotion-watch armed at Step 1 + Step 2; recurrence at this entity is the cross-entity-replication step that promotes to named program-level pattern.
- **{Entity-specific additions}** — {if any}.

---

## §9 Disciplines in effect

All durable disciplines from PC-1 / PC-2 / Experiment A / Experiment B / PC-3 chain remain active:

- **State-read at session-open and after permission gates / tool-result clusters.** Tripwire #4 disk-of-record verification (see §6 above for autonomous-specific sub-shapes).
- **Verify-before-asserting** — applies to commit-shape claims, enumeration scope, cross-section content, and any second-touch Edit.
- **No Greek characters as labels.** ASCII-only identifiers (numbers, letters, descriptive names). Hard rule.
- **Move-and-correct disposition.** First-time-right is not the goal; wrong-shaped findings are signal. Surface and correct rather than block.
- **Sub-batch-of-1 multi-Edit cadence default** if multi-Edit work is needed. Sub-batch-of-3 is opt-in only if discipline earns it.
- **Append-only Option A** for ADR amendments (three shape variants precedented — see §5c).
- **In-commit-consistency.** Fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit; do not defer to doc-health-check.
- **Forward-only correction.** Prior commits carry their own provenance; do not rewrite history.
- **Canonical specs on `main` via deliberate provenance-citing commits.** This run is canonical, not experimental; Experiment B comparison phase is closed.
- **OLDFEAT (`docs/TMP/OLDFEAT/`) read disposition:** {confirm at session-open whether the blindness invariant carries forward to this entity or has been disposed-of since by a post-Experiment-B reconciliation. Default: blindness invariant carries forward until explicit disposition.}

---

## §10 Output expectations and commit shape

Per-entity commit count depends on session shape:

**Single-session autonomous run (one Write shape):** 2–5 commits expected — (i) combined spec write covering Step 1 + Step 2 + Step 3 outputs; (ii) entity-level CLAUDE.md creation (if not pre-existing); (iii) N ADR amendment commits per Q-resolutions requiring ADR work (sub-batch-of-1 across ADRs); (iv) closing bridge. **Single-session commit cadence:** the ratified Step 1 Write is held uncommitted until Step 3 ratification, so commit (i) is genuinely the combined Steps 1+2+3 spec commit — "commit at phase gates" means ratification gates, not intermediate file states (DS-2 surfaced the tension; DS-3 ran clean with this stated explicitly).

**Multi-session autonomous run (split across sessions per PC-3 precedent):** 5–8 commits expected — Step 1 spec write + Step-1-landed bridge + Step 2 spec amendment + Step-2-landed bridge + Step 3 spec amendment + N ADR amendments + closing bridge.

**No push to origin** at session close. The human dispositions push as a deliberate next step.

---

## §11 Closing bridge — required sections

The closing bridge at `docs/planning/sessions/{INSTANCE-DATE}_NN_-_{ENTITY-SHORT-NAME}-LANDED.md` follows the standard `docs/templates/session-bridge.md` shape, with these additional sections required for autonomous L1→L3 runs:

- **Explicit closure statement:** "*{ENTITY-SHORT-NAME} {ENTITY-FULL-NAME} L1→L3 derivation completes at this commit batch.*" Matches PC-1 / PC-2 / PC-3 bridge precedent.
- **Pickup lists** for downstream entities — by receiving entity, with substance + disk anchors.
- **A-candidate ledger snapshot** at this entity's close — final status for #1 through #N (including any new candidates surfaced).
- **PW status** at this entity's close — confirmation or retraction for any PW-armed at Step 1.
- **Methodology data points** captured this run — bridge-prose observations distinct from substance findings.
- **Carry-forward to next entity** — what the next entity's session-opener instance must inherit.
- **Template revision disposition** — adjudicates whether the run's §13 post-run methodology capture (instance file, see below) surfaced durable findings warranting a `docs/templates/autonomous-l1-l3-session-opener.md` amendment. Either *no revision proposed* (with one-line rationale) or *revision proposed* (with the specific change). The Revision history table at the top of the template is updated in the same commit when a revision lands.

---

## §12 Scope boundaries

- **Blindness invariants.** {Confirm at session-open: is OLDFEAT still under the blindness invariant from Experiment B? If yes, do not consume `docs/TMP/OLDFEAT/` content (listing only). If a post-Experiment-B reconciliation has happened, OLDFEAT is in-scope; reference the disposition bridge.}
- **PC-2 amendment lists.** Experiment A's 10 substance findings + Experiment B multi-role memberships finding (D3) are deferred to a planned PC-2 amendment session (topic (a)+(b) per program plan). Out of scope for this entity's derivation; do not amend PC-2 spec at this entity's close.
- **Cross-entity findings.** Class 3 findings route to pickup lists per §11; do NOT amend other entities' specs from within this entity's run.

---

## §13 Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge is authored, the autonomous run answers the following prompts. Output flows into the closing bridge's Methodology data points section AND informs the closing bridge's Template revision disposition section.

The five prompts:

1. **What worked well from this template that the next run should keep?** Name specific sections, disciplines, or scope items that demonstrably helped. Be concrete — "§5b Step 2 disk-evidence scope" is more useful than "the scope sections."
2. **What in this template was redundant, confusing, or got in the way?** Sections that duplicated other sections; instructions that contradicted; scope items that didn't apply to this entity; disciplines that fired noise rather than catch. Be concrete.
3. **What discipline or scope item did you wish was named that wasn't?** Things that, with hindsight, would have helped at Step 1 / Step 2 / Step 3 had they been in the template.
4. **What new substance prior or scope item did you surface that the next entity should inherit?** Cross-entity findings that don't fit existing pickup channels; recurring patterns not yet named; carry-forward priors not yet in §7.
5. **Any new A-candidate or PW-class methodology observation worth promotion-watching?** Patterns that appeared at this entity for the first time, or recurrences of existing watches that warrant promotion.

The post-run capture is structural reflection, not informal aside. Its length scales with run scope — a single-session entity might produce a half-page; a complex multi-session entity might produce two pages. Brevity is fine when there is genuinely nothing to surface; padding is not.

**Also record the run's cold-position retraction rate at Step 2** for the cross-entity tracking series. **Series verdict (Phase 3 close-out, 2026-06-12):** PC-4 7/9; DS-1 through DS-7 and the Extension System all zero. Retraction rate tracked opener calibration / prior coverage, not code presence — the only non-zero run was the cold first instance; the code-rich entities (DS-3, DS-5) produced Class 2 deltas, not retractions, against calibrated openers. Keep recording the rate per run; a non-zero rate against a calibrated opener is now signal, not noise.

---

## §14 Start sequence

Begin with §1 Pre-flight checks. If all pass, proceed to §2 State-read pass. Then §5a Step 1 cold derivation. Surface the §5a checkpoint before the first Write.

---

*End of template.*
