# Anatomy-Conformance Audit V — the whole repository vs the anatomy, post-cutover

**Date:** 2026-09-05
**Status:** Executed; correction plan drafted as [Cycle COR-E](../hub-v2/anatomy-correction-plan-cor-e.md) (decision board OPEN — Stefan's rulings R-10..R-14).
**Trigger:** Stefan's request at the end of Ferd's build — "a deep analysis of our code base and also the documentation", then "a plan to fix whatever is not in line with our anatomy and system architecture (ref. files in `docs/architecture`)".
**Baseline (canon wins):** [`ARCHITECTURE_ANATOMY.md`](../../architecture/ARCHITECTURE_ANATOMY.md) (stamp: ADR-U047 Amendment 3, 2026-08-11) + [`ECOSYSTEM_ANATOMY_V6.svg`](../../architecture/ECOSYSTEM_ANATOMY_V6.svg) (v2.7) + [`DOMAIN_ENTITIES.md`](../../architecture/DOMAIN_ENTITIES.md) (stamp: ADR-U046) + the ADR index through [ADR-U053](../../architecture/decisions/ADR-U053-test-tier-off-the-production-database.md) (Proposed). Ring law: [ADR-U009](../../architecture/decisions/ADR-U009-api-first-frontend-agnostic.md) · [ADR-U038](../../architecture/decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md) · [ADR-U047 + A1..A4](../../architecture/decisions/ADR-U047-internal-api-lifecycle-facts.md) · [ADR-U048 + A1](../../architecture/decisions/ADR-U048-notifications-vertical-delivery-substrate.md). Openness law: [ADR-U008](../../architecture/decisions/ADR-U008-step-type-extensibility.md) · [ADR-U018 (amended 2026-05-14)](../../architecture/decisions/ADR-U018-no-hardcoded-group-types.md).
**Predecessors:** [Audit I / COR-A](ANATOMY-CONFORMANCE-AUDIT.md) · [Audit II / COR-B](ANATOMY-CONFORMANCE-AUDIT-2.md) · [Audit III / COR-C](ANATOMY-CONFORMANCE-AUDIT-3.md) · [Audit IV / COR-D](ANATOMY-CONFORMANCE-AUDIT-4.md) (2026-08-10, ring-focused) · the [AB-6 full anatomy audit](../hub-v2/2026-08-10-ab6-full-anatomy-audit.md) · the [Phase-4 gate doc-health run](../hub-v2/2026-08-13-phase-4-gate-doc-health.md) · the last clean doc-health run ([2026-08-20](../sessions/2026-08-20_04_-_CLOSING-SWEEP-WAVES-FERD-DOC-HEALTH-CLEAN.md)).
**Delta boundary:** full coverage at HEAD `c7128b53` (main, clean; discovery worktree in sync). Everything since Audit IV was audited for the first time here: the Phase-4 cutover and its hygiene (root tooling-only, `hub-legacy/` deleted), DM-01, ACT-01, PD019/PD020, H046–H048, DBT-01/03, SEC-02, ANN-01, H017-01, JRN-PAUSE-01, SEAL-02, DB-4 (PC030/PD021), the reaper-runs and retention gates, ADR-U047 A4, ADR-U053.
**Scope — wider than IV by design:** `hub/` + `supabase/` (code rings, ownership, openness) **and** the documentation tree end to end (`docs/architecture`, the CLAUDE.md cascade, the steering files, `docs/planning`, the 100 feature specs, `docs/verticals`) **and** the repository's tooling surface (`scripts/`, `hub/scripts/`, `.github/`, `package.json`, `.agents/`). Test code stays exempt from API-first rules but its *runner wiring* is in scope.
**Finding IDs:** `AC5-1..17` (deviations) · `AC5-O1..O8` (observations) · `GC-24..29` (gate-coverage gaps, continuing Audit IV's namespace) · rulings continue at **R-10** (R-15 added by the backend addendum below).
**Method:** the live conformance gates run first as ground truth (platform integration family **9/9 suites, 42/42 tests**, integration teardown "Clean"; run this session against the clean-slate database with no sibling consumer); then static sweeps over `git ls-files` (1 931 tracked files): route/lib/component data-path census (129 routes, 85 lib modules, 74 components, 31 pages), manifest-by-owner tally (42 tables, 234 classified functions across PC-1..4 / DS-3 / DS-5 / DS-7 / `vertical:notifications`), lifecycle-handler and declared-composition inventory, closed-set CHECK census over the 141 live migrations, feature-spec template conformance (100 specs), a relative-link check over 596 markdown files (2 690 links; sessions and the novel excluded), a retired-vocabulary grep, and a line-by-line read of every status-bearing routing document. Every registered finding was disk-verified by this session; the honesty log records what was checked and *not* registered.

---

## Verdict at a glance

| Dimension | Verdict | Findings |
|---|---|---|
| Outer ring — BFF purity (U038 cl. 1), 129/129 routes censused | **Fully conformant** — zero `.rpc`/`.from` in any route; every route delegates to a `lib/*` server helper; no service-role key anywhere in product code | AC5-O1 (watch) |
| Frontend data paths (U009, U038 cl. 4) | **Fully conformant** — zero real table/RPC reads in pages or components (every textual hit is a provenance comment); `supabase.auth.*` and the three §4-named realtime tenants are the only direct contacts; the outer-ring unit gate is live | — |
| Inner ring — lifecycle facts, declared compositions, DS acyclicity (U047 r. 1–3 + A3/A4) | **Fully conformant, gate-green** — five handler families, the manifest's `lifecycleFacts` and `declaredCompositions` registries are the single homes; W3 family green | — |
| Ownership manifest vs live substrate | **Exact** (gate: `ownership-manifest-conformance` + `function-classification-completeness` green); `retention` section now gate-enforced | — |
| Extension-openness (U008, U018) | **Conformant under ADR-U018's amendment** — kinds, families, channels, action types, templates and purposes are registries; `group_type` is a permitted discriminator (see honesty log) | AC5-O6 (watch) |
| **Architecture tree docs** (`docs/architecture`) | **Drift** — the entity model contradicts the ADR it cites; the anatomy stamp lags; the diagram-version pointer is wrong | AC5-3 (Major), AC5-5, AC5-6, AC5-16 |
| **Steering + routing files** (root `CLAUDE.md`, `AGENTS.md`, `SESSION-OPENER.md`) | **Stale on structure and phase** — the second and third files every session loads describe a pre-cutover tree and a phase closed four weeks ago | AC5-7 |
| **Planning-tree status layer** (`hub-v2/README.md`, `waves/ferd.md`) | **Stale / placeholder** — the named "current focus" document is six weeks behind; the "current wave" pointer resolves to an empty file | AC5-1 (Major), AC5-2 (Major), AC5-O2 |
| CLAUDE.md cascade (tier / entity files) | Minor drift at the edges | AC5-8, AC5-9, AC5-11 |
| Feature specs (100, all `6-done`) | Vertical Impact 100/100; Performance budget 64/100; Implementation notes filled 100/100 (AC5-13 withdrawn at execution) | AC5-12 |
| Tooling surface (`scripts/`, `package.json`, `.agents/`) | **One rule-adjacent finding** + hygiene | AC5-4 (Major), AC5-8, AC5-9, AC5-15 |
| Links + vocabulary | 2 real broken links; retired vocabulary only as rename pointers or ADR history | AC5-10, AC5-11, AC5-14 |

**Headline:** **the code conforms; the documentation's status layer has drifted.** Four audits and four correction cycles turned the anatomy's ring and ownership rules into gates, and the gates are green at HEAD — there is nothing in `hub/` or `supabase/` this audit asks to move. Every deviation registered here is documentation, steering, or tooling: the plan and wave documents that say *where we are* stopped moving around the Phase-4 cutover, the entity model in `docs/architecture` never absorbed ADR-U050, and three pre-rebuild root scripts still offer a service-role path around the test-account hygiene rule closed on 2026-09-04. The Ferd close cannot run its wave DoD walk on the present tree; COR-E is the tidy-up that lets it.

---

## Severity scale

Unchanged since Audit I: **Critical** (live security/correctness exposure) · **Major** (structural ring/boundary/obligation violation, systemic or compounding — here extended to a routing document that misdirects every session) · **Minor** (local, cheap) · **Observation** (watch item or cited deferral) · **Ruling-needed** (canon ambiguity the audit exposed; owner decision).

---

## Deviation register

### AC5-1 · Major — the rebuild plan's status is stale on both of its counters

[`docs/planning/hub-v2/README.md`](../hub-v2/README.md) is the document `SESSION-OPENER.md` names as the current focus. Its "Current status" paragraph (line 11) ends *"**Now kicking off: Notifications (A-NTF)** … decision board OPEN — settle before Cycle N-A decomposes"* — Notifications closed 2026-07-28, Platform-Ops 2026-08-03. Its phase table (lines 17–26) carries Phase 3 as "Active" and Phase 4 as "Active … Remaining: W6 docs pass + doc-health, then W7 `TASK-SEAL-01` / W8 `TASK-RDA-03` / W9 `TASK-E2E-02`" — all four shipped; the [2026-08-12 bridge](../sessions/2026-08-12_01_-_PHASE-4-CLOSED-DB-RESET-SEEDED-TEARDOWN-COMPLIANT.md) records Phase 4 closed and the [2026-08-13 bridge](../sessions/2026-08-13_01_-_DM-01-GATE-EXECUTED-PHASE-4-CHECKLIST-TICKED.md) the exit checklist at 7 of 9. Nothing in the README says what came after (the Ferd leftovers pass, DB-4, the retention gate, ADR-U053) or what is next (the Ferd close). The README's own closing paragraph names the failure mode — *a manual list that grows back is a wrong-layer pattern* — and then keeps a manual status paragraph. → COR-E **W3** (pointer-not-snapshot: the status block points at the latest bridge and the phase table gets a closing row).

### AC5-2 · Major — the current-wave pointer resolves to a placeholder; the wave DoD has no substrate

[`docs/planning/waves/ferd.md`](../waves/ferd.md) is three lines ("_Content to be populated._", untouched since 2026-04-09). Five routing surfaces point at it as *the* current wave: root `CLAUDE.md` (document map row), `AGENTS.md` (navigation), `docs/planning/waves/README.md` (status "Active"), the dashboard's "Start here" panel, and the `wave-planning` skill (which reads the wave file for scope + DoD). The only other Ferd document, [`FERD-CAPABILITY-MAP.md`](../waves/FERD-CAPABILITY-MAP.md), is a banner-marked 2026-04-10 baseline whose 46 "not started" rows are false today. The 2026-09-05 bridge already says *"the Ferd close waits on it"*; this audit makes it a registered gap because the close's DoD walk is the very thing the user is heading toward. **Not COR-E scope** — writing `ferd.md` is the first leg of the Ferd close under the `wave-planning` skill (scope = the 100 specs tagged `wave: ferd`, DoD from `docs/templates/wave-spec.md`). COR-E is sequenced *before* it so the close audits a clean tree; see the plan's "Order".

### AC5-3 · Major (architecture tree) — `DOMAIN_ENTITIES.md` contradicts the ADR it cites and over-claims its role

Header (line 4): *"Account-lifecycle states follow ADR-U050; see the User entity."* The User entity (§1, lines 59–121) carries `is_active` only — `suspended`, `decommissioned`, `deactivation_origin` and the four-state machine appear nowhere in the file (0 mentions each; `paused` appears only for enrolments). The stamp is ADR-U046 (2026-07-09), and the six entities cover PC-2, PC-3 and DS-3 only: no conversation / message / forum post / announcement / report (DS-5), no notification (the vertical substrate), no consent record or audit row (PC-2/PC-4), no journal entry (DS-7), no telemetry event (PC-1). Meanwhile [`docs/architecture/README.md`](../../architecture/README.md) line 41 calls it *"The only place these are documented"* — untrue since the feature specs and migrations became the schema of record, which the file's own freshness caveat (line 5) concedes. The file is in the architecture tree, so an agent loading "the anatomy" reads an entity model that an accepted ADR has superseded. → **R-10**, COR-E **W1**.

### AC5-4 · Major (rule-adjacent tooling) — three root scripts are a live path to the residue class closed on 2026-09-04

`scripts/cleanup-test-data.js` (2026-02-23), `scripts/cleanup-test-users.js` (2026-04-12) and `scripts/seed-test-members.js` (2026-07-04) all construct a **service-role** client from `.env.local` and act directly on `auth.admin` and the tables: the two cleaners delete by e-mail pattern with no census and outside the `cleanupTestUser` chain (the consent RESTRICT that refused bare `deleteUser` in the ES256 probe applies to them too); the seeder creates five hand-made FIMs (`alice..erin@fringe.test`) with a shared password — exactly the "hand-made accounts with no register" class the [2026-09-05 bridge](../sessions/2026-09-05_01_-_CLEAN-SLATE-RETENTION-GATED-ADR-U053-PROPOSED.md) named as the residue the rules could not see. They predate `hub/scripts/walk-cast.mjs` (create / teardown / census) and the suite helpers, which are the sanctioned paths; nothing references the three except history. Under the "no leftover test accounts" hard rule and ADR-U053's seed pre-flight they are dead weight with a blast radius. → **R-12**, COR-E **W5**.

### AC5-5 · Minor — the anatomy stamp lags two decisions and one rule

`ARCHITECTURE_ANATOMY.md` reflects through ADR-U047 A3 (2026-08-11). Since then: **ADR-U047 Amendment 4** (2026-09-03, the freeze shapes reach `paused` enrolments — DS-3 internal, expected "no anatomy impact"); the **retention-as-gated-rule** (2026-09-05 — the PC-1 row's "scheduled-job substrate (pg_cron)" now carries a manifest-declared bound per log-shaped table, a cron-history prune and a weekly `VACUUM FULL` stopgap; the row says "90-day scheduled prune" for telemetry only); and **ADR-U053** (Proposed — not absorbed until accepted, but the freshness rule says a review that finds no impact still moves the stamp and says so). → COR-E **W1**.

### AC5-6 · Minor — the diagram-version pointer is wrong, and it passed a "clean" doc-health run

`docs/architecture/README.md` lines 19 and 42 describe `ECOSYSTEM_ANATOMY_V6.svg` as "v2.6, August 2026"; the SVG's own `<desc>` and the anatomy header say **v2.7** (Audit IV W7 refresh, 2026-08-11 — `email` evicted from the PC-1 box). The 2026-08-20 doc-health run reported clean: Section 11 checks the anatomy stamp against the ADR index but not the README's diagram-version text. → COR-E **W1** (fix) + **GC-24** (gate).

### AC5-7 · Minor (steering files — ask-first) — the second and third files every session loads are stale

- `AGENTS.md` §Project structure: *"`app/`, `components/`, `lib/` — application source code"* — they live under `hub/` since ADR-U032, and the root has been tooling-only since Phase-4 W3 (PR #503). §Build & test: *"`npx supabase test db` — database/RLS tests"* — no pgTAP suite exists; the DB gates are the Jest integration tier and the platform conformance family (`npm run test:integration:platform -w hub`).
- `docs/planning/SESSION-OPENER.md` line 7: *"It's in **Phase 3**"* — injected into every session start; Phase 4 executed 2026-08-11/12.
- Root `CLAUDE.md` header: "Last updated 2026-06-21" with a "Reflects:" sentence that snapshots the entity model through ADR-U031 — twenty-two ADRs and four amendments later, a snapshot where a pointer belongs (the pointer-not-snapshot rule the file itself applies to counts).
All three are fuller-auto carve-outs (steering files). → COR-E **W2**, held for Stefan's nod.

### AC5-8 · Minor — the integration-runner wiring names test directories that do not exist

`docs/platform/CLAUDE.md` §Testing lists the domains as *"`auth`, `groups`, `journeys`, `rls`, `rbac`, `admin`, `communication`, `security`"*; `hub/package.json` and the root `package.json` both carry `test:integration:rls` and `test:integration:rbac` pointing at `tests/integration/rls` and `tests/integration/rbac`, which are absent (Jest would match zero tests and exit green — the silent-zero trap). The live directories `account`, `journal`, `notifications`, `observability`, `platform`, `profile` are unlisted in the tier file, and the root manifest lacks passthroughs for `account`, `observability` and `platform` (the conformance family is reachable only via `-w hub`). → COR-E **W4** (docs) + **W5** (manifests) + **GC-25**.

### AC5-9 · Minor — the canonical migration procedure depends on a script named "temporary", and the root tooling has no registry

`docs/platform/CLAUDE.md` §Database migrations step 3 is `node scripts/apply-migration-temp.js` — a file whose header reads *"Temporary script to apply a single migration via Supabase management API"* (2026-02-11). It, `run-sql.js`, `verify-schema.js`, `get-db-config.js`, `session-opener.js` and `scripts/dashboard/` are the live root tooling; nothing lists them, and root `package.json`'s `@supabase/supabase-js` + `dotenv` devDependencies exist only to serve them. → COR-E **W5** (rename + `scripts/README.md` + GC-27).

### AC5-10 · Minor — two real broken links

- `hub/CHANGELOG.md` (two occurrences) → `docs/products/hub/features/FEAT-H041-suspended-group-content-wing.md`; the file is `FEAT-H041-suspended-group-admin-content-view.md`.
- `docs/platform/core/features/FEAT-PC026-suspended-group-admin-access-contracts.md` → `ADR-U052-telemetry-event-store.md`; the file is `ADR-U052-telemetry-sink-and-analytics-posture.md`.
(Of 33 raw misses, the rest are template placeholders, directory links, historical `CHANGELOG.md` rows, the two registered expected placeholders `ROADMAP.md`, and a retro's link to a task deleted by policy — see honesty log.) → COR-E **W4**.

### AC5-11 · Minor — "route group" wording survives in two feature specs after AC4-10

Audit IV corrected the anatomy and the AB-7 register; the instance grep did not reach `FEAT-H034` line 19 (*"`/admin` route group — the AB-7 shape"*) and `FEAT-H040` line 39 (*"one new route group"*). `hub/app/admin/` is a plain path segment (no parenthesised Next.js group exists). → COR-E **W4**.

### AC5-12 · Minor + Ruling — 36 of 100 feature specs carry no Performance-budget section

`AGENTS.md` §Always do: *"Complete the Performance budget section in every feature spec with a user-facing surface (ADR-U043) … platform-only features write 'N/A (no surface)'."* The template has the section (`feature-spec.md` line 72). 34 of the 36 predate ADR-U043 (2026-07-07): FEAT-H001–H018, FEAT-PC001–PC015, FEAT-PD001. Two are post-U043 platform-only specs with no section at all rather than an "N/A" line: FEAT-PD019, FEAT-PD020. Vertical Impact, by contrast, is 100/100. → **R-11**, COR-E **W7**.

### AC5-13 · ~~Minor~~ **WITHDRAWN at execution (2026-09-05, COR-E W4)** — the two "placeholder" Implementation notes are filled

The sweep's placeholder regex matched the date parentheticals in the section headers of `FEAT-PC019` ("(6-done, 2026-07-31)") and `FEAT-H037` ("(built 2026-08-02, Cycle ADM-D)"); both sections carry full build records (migration, suite, red→green, recorded opens). Disk-verified before any edit; no action. Recorded in the honesty log; the Feature-specs row of the verdict table is corrected.

### AC5-14 · Minor — the reference index omits Audit IV (and would have omitted this one)

`docs/planning/reference/README.md` §Structure lists `ANATOMY-CONFORMANCE-AUDIT.md`, `-2`, `-3` and stops; `-4` has been on disk since 2026-08-10. **Fixed in this audit's own PR** (both rows added).

### AC5-15 · Minor — a vendored skills tree and its lockfile appear in no routing document

`.agents/skills/supabase/` and `.agents/skills/supabase-postgres-best-practices/` (40 tracked files, the `npx skills add supabase/agent-skills` output) plus root `skills-lock.json` are mentioned by no `README`, `CLAUDE.md` or `AGENTS.md`; `.claude/skills/supabase-docs/SKILL.md` covers overlapping ground. An agent following the cascade cannot learn they exist or which is canonical. → COR-E **W4** (one line in `AGENTS.md` §Project structure rides W2; or a `.agents/README.md`).

### AC5-16 · Minor — three ADR index rows read as current when a later decision re-scoped them

Append-only ADRs are right not to change; the **index** is where the reader is caught: ADR-U014 (feature flags) reads "Accepted" with zero substrate and a deferral (ADM-15; the anatomy says so, the index does not); ADR-U015 (`/api/v1` on every route) is re-scoped by ADR-U038 clause 3 to the platform surface, and the U015 file has no forward pointer; ADR-U004's title vocabulary ("Visitor") is two renames old (U027 → U031, chain stated in U031). Index-row annotations only — no ADR body edits. → COR-E **W4**.

---

## Observations

- **AC5-O1 — composition in TypeScript is down to two small reads + the sanctioned bundle.** `fetchMyPermissions` (`get_current_personal_group_id` → `get_user_permissions`) and `fetchNudgePolicyView` (`get_notification_nudge_policy` + `get_platform_announcement_reach`) are the only lib functions composing two RPCs; `me/overview` composes five reads by design (ADR-U042). Under ADR-U038 clause 1 these are plumbing, not rule homes. Watch item for the Gimbal build: a sibling surface would repeat the two-step — candidates for single contracts (`get_my_permissions(group_id)`, a nudge-policy view) at that time, not now.
- **AC5-O2 — the `cycle-current.md` convention has never been used.** `docs/planning/cycles/` holds only a README; every cycle since June ran as an area completion plan or a dated COR plan under `docs/planning/hub-v2/`. PROCESS.md §3 and root `CLAUDE.md` still describe the file. → **R-14** — *ruled 2026-09-05: adopt, with a writing step and a gate (see Rulings).*
- **AC5-O3 — `docs/ecosystem/how-we-work/` is a second description of the way of working.** Its README says "as of 2026-06-10"; the chapters were last reconciled 2026-07-31. PROCESS.md is declared the one canonical document; the narrative should say it is derived (it largely does) and carry a dated reconciliation stamp like the anatomy — otherwise it will read as a competing source once Eid starts.
- **AC5-O4 — CI runs no database gate, by ruling (GC-16).** The conformance family is a local gate until an isolated test database exists; ADR-U053 is the unlock. Not a finding — a dependency the plan sequences.
- **AC5-O5 — a cycle-boundary doc-health run is due.** Last clean run 2026-08-20; since then fifteen substantive sessions (DBT-01/03, SEC-02, ANN-01, H017-01, JRN-PAUSE-01, SEAL-02, DB-4, the retention gate, ADR-U053). The Ferd close is a boundary; the skill should run inside it after COR-E lands.
- **AC5-O6 — literal kind lists inside DS-5 triggers.** `kind IN ('invitation_received', 'acting_invitation', 'stewardship_nomination')` and `kind IN ('role_assigned', 'role_removed')` enumerate notification kinds in DS-5's own functions over an open `notification_kinds` registry. Own-service literals over own-service data are legitimate today; revisit when the Extension System's first substrate lands (Audit IV R-9).

---

## Rulings needed

**R-10 — what `DOMAIN_ENTITIES.md` is for** (from AC5-3). Options: (a) **extend and gate** — absorb ADR-U050 into the User entity, add one-line rows for the DS-5 / vertical / PC-4 / DS-7 / PC-1 entities, move the stamp, and add the file to doc-health Section 11's stamp check; or (b) **demote to orientation** — keep the six entities, replace the "only place" claim in the architecture README with "entity-level orientation; the schema of record is `supabase/migrations/`", and drop the U050 sentence rather than half-carry it. **Recommend (a) with a light touch:** the anatomy already carries the four states in prose; the entity file needs the state table and the missing entities as one-liners with pointers, not full property tables. Either way the file joins Section 11.

**R-11 — Performance-budget backfill vs grandfathering** (from AC5-12). Options: (a) backfill 36 sections (most would read "N/A (no surface)" or "B-class inherited from the shell — see H019+"); (b) a dated grandfather rule in the template and `AGENTS.md` ("specs authored before ADR-U043, 2026-07-07, carry no section; the budget binds at their next amendment") and fix only PD019/PD020 with the "N/A" line. **Recommend (b)** — the pre-U043 Hub surfaces were measured under ADR-U043 at their area gates and the ledger holds the numbers; a section per spec would be a snapshot of the ledger.

**R-12 — the three root test-data scripts** (from AC5-4). Options: delete (the sanctioned paths exist: `walk:cast`, the suite helpers, the teardown census); or fold into `walk-cast.mjs` as a `seed` mode with the chain and census. **Recommend delete** — a manual seeder is what ADR-U053's seed pre-flight replaces.

**R-13 — closed sets in SQL under ADR-U018.** *Not a ruling after all* — the 2026-05-14 amendment settles it (honesty log). Listed so the question does not resurface at the next audit.

**R-14 — the cycles convention** (from AC5-O2). PROCESS.md is a steering file; retiring or reviving `cycle-current.md` is Stefan's call. *Original recommendation: retire.* ***RULED 2026-09-05 (Stefan): adopt.*** *The file's purpose is a fixed front door for Stefan — one place to see what is being built without hunting for the newest date-stamped document. It went stale because no step wrote it and no check noticed. Disposition: a ten-line front door that points at the dated plan and the latest bridge; PROCESS.md §3 gains the kickoff-writes / close-repoints rules and the session-start hook injects the file; a CI unit test fails when the linked plan is closed. COR-E W3 (file) · W2 (rules + hook) · W8 (gate).*

---

## What is conformant (verified, not assumed)

- **Rings.** 129/129 routes are thin BFF proxies (zero `.rpc`/`.from` in `hub/app/api`); every substrate call lives in a `hub/lib/*` server helper; 0 real `.from('table')` reads in code anywhere under `hub/lib`, `hub/components`, `hub/app`; no `service_role` in product code (the one textual hit is a doc comment saying "never"); `hub/app/farewell/page.tsx` touches `supabase.auth.signOut` only (the B9 exception). The outer-ring unit gate (`outer-ring-conformance.test.ts`) and the W3 family are the standing proof.
- **Inner ring.** Handlers `ds3_lifecycle_*` (member_departed, group_closed, personal_group_erased, user_hard_deleted, account_deleted), `ds5_lifecycle_*` (user_hard_deleted, group_closed, account_deleted), `ds7_lifecycle_account_deleted`; the manifest's `lifecycleFacts` list and `declaredCompositions` (six admin-plane pairs + the Privacy `get_own_data_export` composes-set) are the single registries ADR-U047 A3 demanded; `internal-api-conformance` green.
- **Ownership.** 42 tables / 234 functions classified by declaration; `admin_*` → PC-4 and `ds{N}_` → DS-N pins; export classification complete; **retention** now declared for every log-shaped table (`reaper_runs` 30 d, `telemetry_events` 90 d, `admin_audit_log` forever-with-reason) plus cron-history and the weekly maintenance job — `retention-conformance` green.
- **Lockdowns.** `anon-execute-lockdown`, `table-grant-lockdown`, `trigger-mount-conformance`, `tier1-context-free-arm` green; the integration teardown censuses the governance catalogs and reported "Clean".
- **Anatomy claims spot-checked in code:** Console-routed surfaces under the plain `admin` path segment (10 pages) — confirmed; `proxy.ts` not `middleware.ts` — confirmed; no per-route `runtime`/`preferredRegion` (U036 A2) — confirmed by census; telemetry sink `record_telemetry_event` / `prune_telemetry_events` on PC-1 — confirmed; the three realtime tenants match the §4-named channel set (conversations, forum, notifications) — confirmed; registries `step_kinds`, `content_families`, `conversation_kinds`, `notification_kinds/categories/channels/action_types`, `group_templates`, `role_templates`, `consent_purposes` — all present.
- **Docs that are right:** `PENDING.md` (all three entries carry their promotion notes — U029, the DS-3 rename executed, the U028 amendment); `docs/verticals/notifications/SPECIFICATION.md`'s email claim is annotated "located and deferred" in place; `docs/platform/CLAUDE.md`'s versioning and Bearer rules already carry the ADR-U038 clause-3 scoping; the Hub `CLAUDE.md` rules match the code (BFF, narrow exception, `proxy.ts`, telemetry legs); the tier/entity `CLAUDE.md` cascade is complete (29 files, every entity present); 100/100 specs carry Vertical Impact and a maturity field; the "Experience Engine" / "Narrative Engine" / "Shadow" residuals are all rename pointers or ADR history.

---

## Gate-coverage gaps

| ID | Gap | Evidence | Disposition |
|---|---|---|---|
| **GC-24** | Doc-health Section 11 checks the anatomy stamp vs the ADR index only — not the architecture README's diagram-version text, not `DOMAIN_ENTITIES.md`'s stamp | AC5-6 passed the 2026-08-20 clean run; AC5-3 was never in scope | COR-E **W8**: extend §11's procedure to (i) the README's version string vs the SVG `<desc>`, (ii) the entity file's stamp (per R-10) |
| **GC-25** | Nothing pins `package.json` integration scripts to existing test directories; a dead script matches zero tests and exits green | `test:integration:rls` / `:rbac` in both manifests | COR-E **W8**: a unit test that every `test:integration:*` path exists (cheap; sits beside `token-gate.test.ts`) |
| **GC-26** | The status documents the session opener names carry hand-maintained status prose with no freshness check | AC5-1, AC5-7 | **No gate** — the fix is structural (W3: the status block becomes a pointer to the latest bridge); doc-health Section 3 already checks the pointer resolves |
| **GC-27** | A root script that creates or deletes accounts outside the census can be added silently | AC5-4 | COR-E **W5**: `scripts/README.md` as the registry + a unit test that any file under `scripts/` or `hub/scripts/` calling `auth.admin.createUser`/`deleteUser` is listed there with a teardown/census note |

---

## Audit honesty log

- **Live gates first.** The platform integration family ran this session (9/9, 42/42, teardown Clean) against the 2026-09-05 clean-slate database; no sibling process was using the database (checked before launch). The unit tier was not re-run here — CI gates it on every push to `main`, and `main` is green at `c7128b53`.
- **Static sweeps were over `git ls-files`, not the filesystem.** Two sandbox tools (`find`, `sort`) resolve to their Windows namesakes and return silent zeros; the inventory was rebuilt in Node from the tracked-file list. First-pass `.from(` counts included `Array.from(`; the register uses the tightened `.from('table')` pattern, which found zero code hits.
- **Checked against canon and NOT registered:** the `group_type IN ('system','personal','engagement')` CHECK, the 67 migrations with `group_type = '…'` paths and the Hub's caretaker rendering on `member_group_type === 'system'` — all explicitly permitted by ADR-U018's 2026-05-14 amendment (discriminator column, entity-state enums, growth-vocabulary registries); `journey_type` / `difficulty_level` CHECKs — live DS-3 columns read by PD002/PD003 contracts and the catalogue page, not dead; the retro-to-deleted-task link — by design (doc-health §3.6 scopes ephemeral tasks out); `hub-legacy/` mentions — all ADR-U032 history or the discharge note; the two `ROADMAP.md` links — registered expected placeholders (doc-health §7, T3.4).
- **The scope grew on purpose.** Audits I–IV were ring audits; this one was asked for as "codebase and documentation" and the register's centre of gravity is documentation because that is where the drift is. The code dimensions are reported at the same depth as IV (full census, no sampling).
- **Counts in this register are dated 2026-09-05** and are evidence for these findings only; the routing documents keep pointing at the sources (pointer-not-snapshot).
- **One finding did not survive execution.** AC5-13 (placeholder Implementation notes) was a regex false positive on section-header dates; withdrawn on disk-verification before any edit, per the verify-before-asserting rule. The sweep's other spec-level counts (Vertical Impact, Performance budget, maturity) were re-checked by a different pattern and stand.
- **The first pass trusted the gates for the inner ring; the addendum below re-derived it.** Stefan challenged whether the backend had really been audited and named the rings as inviolable; the addendum answers with a live-catalog sweep that does not depend on the gate's regex. Its two gate gaps (GC-28, GC-29) are the honest yield of that challenge.

---

## Addendum (2026-09-05, same day) — the backend deep pass: the rings re-derived from the live catalog

**Trigger:** Stefan — *"have you really challenged the full code base including back end with DB functions etc.?"* and *"specifically pay attention to the inner and outer API rings. Those can never be violated."*
**Method:** read-only queries against the live catalog (management API, no writes, no sibling consumer): `pg_get_functiondef` for all **243** public functions, classified against the manifest (234 declared + 9 `ds{N}_lifecycle_*` by prefix); every (function, table) mention counted two ways — **schema-qualified** (`public.<table>`, what the W3 gate sees) and **bare-word** (`\m<table>\M`, what it cannot see); `has_function_privilege` for `anon` and `authenticated` on all 243; RLS flag and policy count per table; the Supabase security linter. Every bare-word cross-owner mention was then read line by line.

### Inner ring (Domain ↔ Core, ADR-U047) — verified independently of the gate

| Check | Result |
|---|---|
| Qualified cross-owner table references, core → DS | **0** (all qualified cross-owner refs run DS → core or → the notifications substrate: the permitted direction) |
| Bare-word cross-owner mentions the gate cannot see | 24 (function, table) pairs, 30 lines read: **22 comment lines, 8 string literals or JSON keys, 0 identifiers** — no unqualified reference exists |
| Dynamic SQL (`EXECUTE format(...)` and kin) | **0** functions |
| `SECURITY DEFINER` functions without a pinned `search_path` | **0** of 236 |
| Functions absent from the manifest and not lifecycle-prefixed | **0** |
| Sealed-by-doctrine set (22: `ds5_admin_*`, `ds5_moderation_*`, `ds{N}_lifecycle_*`, `_erase_mist`, `_pc2_hard_erase_user`, `prune_*`, `reap_*`, `ds3_stats_snapshot`) executable by a client role | **none**, for either `anon` or `authenticated` |

The gate's green is therefore confirmed by a method that does not share its blind spot. The blind spot itself is real and is registered as **GC-28**.

### Outer ring (Product ↔ Platform API, ADR-U009 / ADR-U038) — verified from both sides

| Side | Check | Result |
|---|---|---|
| Product | Routes touching a table or RPC directly | 0 of 129; every substrate call is in a `lib/*` server helper |
| Product | Distinct RPC names the Hub calls | **138**, all classified in the manifest (PC-1 2 · PC-2 13 · PC-3 42 · PC-4 28 · DS-3 16 · DS-5 32 · DS-7 5); 0 unclassified |
| Platform | Functions executable by `anon` | **0** of 243 |
| Platform | Functions executable by `authenticated` | 198: 23 trigger-returning (not RPC-callable), the rest the contract surface; the 5 with internal-looking names (`finalise_transcendence`, `record_auth_event`, `ds5_require_fim_actor`, `ds5_require_fim_subject`, `ds5_is_fim_actor`) all carry explicit `REVOKE … FROM PUBLIC, anon` + `GRANT … TO authenticated` lines in their migrations — deliberate, not Postgres's default |
| Platform | Tables with RLS enabled | **42 of 42**, 47 policies |
| Platform | Tables with RLS on and zero policies (deny-all by absence) | 7: `ds5_config`, `pc2_config` (both declared deny-all in their migration comments), `journey_steps`, `journey_step_instances`, `notification_action_types`, `reaper_runs`, `telemetry_events` (posture not declared beside their `CREATE`; `telemetry_events` is declared deny-all in ADR-U052 and the anatomy) |
| Vendor linter | Supabase security advisor | 43 lints: **40 × `auth_allow_anonymous_sign_ins`** — the Mist posture by design (anonymous sessions hold `authenticated`; FIM-only doors are enforced inside the contracts, ADR-U031) — accepted; 1 × `rls_enabled_no_policy` (INFO, = AC5-17); 1 × `authenticated_security_definer_function_executable` (the contract surface is SECURITY DEFINER by design under ADR-U038 — accepted); 1 × `auth_leaked_password_protection` (an Auth setting, AC5-O8) |

### New findings from the addendum

#### AC5-17 · Minor — five zero-policy tables carry no declared client-access posture
Deny-all-by-absence is the right posture for a contracts-only table, but it is indistinguishable from a forgotten policy unless it is declared. `ds5_config` and `pc2_config` declare it; `journey_steps`, `journey_step_instances`, `notification_action_types`, `reaper_runs`, `telemetry_events` do not. → COR-E **W6** (manifest `clientAccess` per table + gate).

- **AC5-O7** — `ds5_is_fim_actor()` is granted to `authenticated` and has no consumer outside SQL. Harmless (a boolean about the caller) but a contract nobody asked for. → **R-15**: declare it as a Gimbal-ready predicate, or revoke (schema gate).
- **AC5-O8** — leaked-password protection is off in Auth. Not schema; a dashboard setting and Stefan's call (production configuration is never-do for agents). Recommend enabling.

| ID | Gap | Evidence | Disposition |
|---|---|---|---|
| **GC-28** | **The inner-ring gate is qualified-only.** `classifyReferences` matches `public.<table>` (`ownership.ts:158`) and the invocation check matches `public.<callee>(` (`:280`); a bare-word reference would pass green. Zero exist today — verified above — but nothing keeps it so | this addendum's sweep | COR-E **W6**: the gate additionally asserts *no* bare-word table or classified-function name appears in a function body outside comments and string literals ("always qualify", made mechanical), with the dynamic-SQL absence asserted alongside |
| **GC-29** | **No pinned inventory of the `authenticated` EXECUTE surface.** Postgres's default `PUBLIC` EXECUTE reaches `authenticated`; the anon gate cannot see it; a new function shipped without its `REVOKE` becomes RPC-callable by every signed-in session, silently. The sealed set is pinned; the exposed set is not | 198 executable today, intent recorded nowhere | COR-E **W6**: a manifest `exposure` field per function (`client` / `sealed` / `trigger` / `internal`) and a gate that the live grants match it both ways — the outer ring's platform side pinned the way its product side already is |

## Related

Correction plan: [`anatomy-correction-plan-cor-e.md`](../hub-v2/anatomy-correction-plan-cor-e.md) · Predecessor registers and plans linked in the header · The Ferd close's own prerequisite (AC5-2) is tracked in the plan's "Order", not as a COR-E workstream.
