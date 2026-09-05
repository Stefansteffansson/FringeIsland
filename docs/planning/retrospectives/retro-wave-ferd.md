# Retrospective — Wave — Ferd (Wave 1), 2026-09-05

**Scope:** Wave
**Period covered:** 2026-04-10 (the Ferd capability map, the wave's scoping baseline) → 2026-09-05 (the close ritual); the build itself 2026-06-15 (Hub v2 rebuild, Phase 0) → 2026-09-03 (DB-4, the last Ferd item)
**Facilitator:** Claude Code (drafted 2026-09-05 at the close; the `wave-planning` skill's "Complete a wave" step 2)
**Participants:** Stefan (owner; the rulings, the live walks, the declaration); Claude Code (the build, the gates, the records); Claude.ai on the discovery surface (the ecosystem tree)

> Wave-scoped, per [`../../templates/retrospective.md`](../../templates/retrospective.md). It aggregates the fifteen cycle and area retrospectives under this directory and the 271 session bridges under [`../sessions/`](../sessions/) — it does not repeat them. Where a learning already carries a gate or a rule, the gate is named; where it does not, it is an action item in §5. The wave file is [`../waves/ferd.md`](../waves/ferd.md); the DoD walk record is [`../hub-v2/2026-09-05-ferd-dod-walk.md`](../hub-v2/2026-09-05-ferd-dod-walk.md). **Stefan's rows are marked; the close declaration is his.**

---

## 1. Three Ls

### Liked

What went well, with the evidence that it did — keep doing these.

- **Red-first TDD across the whole pyramid, demonstrated, not asserted.** Every schema gate shipped with its red suite in the PR body; the discipline caught what test-after never would have: N-C's vacuous test, N-D's muted-half pass, the PC014 assertion that stayed green against a superseded canon (ADR-U041), DB-4's registry-label pin. The one test-after deviation (N-D's Hub half) was surfaced in its retro rather than absorbed.
- **The paired-spec shape and the two rings.** Every Hub feature is a platform contract plus a surface over it (ADR-U009, ADR-U038); Audit V (2026-09-05) re-derived both API rings from the live catalogue — 243 functions, 236 SECURITY DEFINER with `search_path` pinned, `anon` executes none, zero dynamic SQL, the Hub's 138 RPC names all classified — and found the code conformant. Every deviation the five audits found was documentation, steering or tooling.
- **Gates over norms.** Each time a class of defect recurred, the fix became a mechanical check: default privileges + the anon-execute lockdown (grant discipline, A-GRP), the route-policy conformance test (ADR-U036/U037), the sibling-assertion sweep (four-for-four at A-ADM), retention conformance (2026-09-05), the exposure register and the bare-reference / dynamic-SQL assertions (COR-E), the production fuse (ADR-U053), the front-door gate (R-14). The A-NTF retro said it first: *"it is a class, and it needs a mechanical check rather than a norm."*
- **The schema gate held for a named approval.** No migration reached production on a generic "go on"; the sibling sweep and the post-apply E2E set ran at every gate (PROCESS.md §5); since 2026-09-05 the gate rehearses on the test project first and `migration-drift.js` closes it.
- **Live walks at every area gate.** A-ADM (2026-08-02), the twelve-scenario walk (2026-08-06), RD-B (2026-08-09), the wielded-forum walk (2026-08-19), DB-4 (2026-09-04): every finding was a seam, not a defect inside a unit of work (A-COM), and the walks corrected their own scripts as often as the product (three of ten A-COM scenarios; DB-4 leg 7). When Stefan brought evidence, the evidence was canonical (the Facebook-threading claim, A-COM).
- **The written live state.** A bridge at every session close, a front door since COR-E, a dated plan per cycle, the reflection loop from build back into the specs (PROCESS.md §9). No session started from memory; the "verify before asserting" rule withdrew AC5-13 before an edit and found the dead-space root cause (churn, not a vacuum fault).
- **Decision boards, surfaced whole.** Every kickoff laid out the whole board with recommendations (the DB-4 eight rulings, the ADR-U053 ruling, R-14 ruled the other way from the recommendation — and better for it).
- **Retrospectives and sweeps at every boundary** after 2026-07-03, each with a task sweep behind a link check (`done` does not imply sweepable — 2026-08-06).

### Learned

The highest-value bullets; each names where the learning now lives.

- **Environment before product.** A stale dev server produced 37 spurious E2E failures in one A-COM session; a day-old process 500s that mimic product defects (A-JRN); a stopped background `npm run dev` leaves a wounded server (EPIPE); the cold-vs-warm measurement traps needed two ADR-U043 amendments; the locator waiter alone inflated every "ceiling-hugging" number by 300–470 ms. Rule of thumb, now written in the Hub `CLAUDE.md` and the memory: fresh server per session, measure the real authenticated path, suspect the harness before the product.
- **Shared-database fixture residue is a class, and only a separate tier removes it.** Seventeen stale `GDTarget` users flipped a LIMIT-8 search assertion (COR-A); the ES256 probe leaked 180 accounts; 11 150 orphaned personal groups held 73 % of `notifications`; `notifications` had 444 950 inserts and 423 030 deletes lifetime and 16 MB of dead space at zero rows. Each instance was gated (teardown census, the no-leftover rule, retention conformance, `VACUUM FULL` weekly) — and the class itself disappeared only with ADR-U053 on 2026-09-05, five months after the first suite ran on production.
- **A pointer can be valid and stale at once.** The architecture README said v2.6 beside an SVG at v2.7 across a clean doc-health run; the entity model cited ADR-U050 without absorbing it; ADR status lines lagged their own acceptance twice (U039 through four realisations; U053's index row still read Proposed at this close). Now doc-health §11 and the front-door gate; the index-row check is §4 below.
- **Derived premises are the recurring defect class of the second half.** ADM-F's instantiation physics, ADM-G's premise 7, the walk arc's "all seed", PC020's "status flows through member-facing reads", the DB-4 board's expansion-trigger read — three data points in four days at one point. The substrate audit at decomposition (`ecosystem-decomposition`) corrected a cycle premise twice; the mechanism-read at decomposition is the answer, and it is in the skill.
- **The test tier has its own physics.** Presence-only preconditions are deterministic on a large population by accident and racy on a small one (the select-page cascade that force-signed-out the operator at the cutover); shared-session E2E ordering is load-bearing (profile.spec's global sign-out); the consume-once adoption cache bit three times; a spec authored during a walk needs a teardown in the same commit; a full-load revisit is not a client-side revisit; correct product behaviour can break every fixture (auto-launch); witnessing a click is not witnessing a change.
- **A close that re-runs the gates finds what a green morning hid.** The Ferd-close fleet failed one journey that had passed three fleets the same morning on the same code and the same project: a stale-async write in three Hub sections (a members-only read still in flight when the hat went on, resolving last as a 403 and overwriting the wielded view) — the third of its class in the Hub, exposed only by a slower cold compile. Fixed red-first in the same session (TASK-RACE-01, PR #627); the class rule — a section that re-reads on a view switch guards its writes with a read sequence, latest read wins — is a `feature-development` line candidate (§5). Verifying the DoD by running it, not by citing the morning, is what caught it.
- **The gate's own blind spot is the audit's best yield.** The inner-ring gate matched `public.<table>` only; the `authenticated` EXECUTE surface had no pin; catalogue-style pins over open namespaces are their own sweep category (ADM-G). Every audit should ask what the existing gates cannot see.
- **Process mechanics that bit and are now rules:** three changelogs with three audiences (the DoD names which); stacked PRs merged bottom-up without `--delete-branch`; a `&&` chain across a heredoc is not a chain; `git branch -d` proves nothing about a merge; a silent zero from `find`/`sort`/`grep` on Windows is a broken check until the control runs; the migration apply is classifier-blocked in autonomous sessions and the PR ships held at the gate rather than bypassed.
- **Sub-agent delegation needs a completion signal and a canonical source.** The report-idle friction hit the n=3 threshold (J-C); delegated fact-finding without one named canonical source produced two premise errors — both now house rules (delegated-fact discipline; the ping protocol).
- **The plain-English walkthrough is a review tier of its own** (J-B): Stefan's read-through of a merged bridge caught what every gate missed. It became the "what did we build, as a user would tell it" line at cycle close.

### Lacked

Gaps, phrased as gaps.

- **A dedicated test tier from the first suite.** Every consequence in "Learned" second bullet followed from running suites, probes and walks on production for five months. Closed 2026-09-05 (ADR-U053), late.
- **A wave Definition of Done at the kickoff.** G-07 ("Ferd DoD empty") has been open since 2026-04-17; the wave file stayed a placeholder through the whole build and was written at the close. The wave was steered by area gates and cycle plans instead — it worked, but the wave-level bar was never written down until the end (§4).
- **Cycle retrospectives for the first five cycles** (none before 2026-07-03) and task files for Cycles B and C; task-status drift in between (ten of thirty-four A-COM tasks read `todo` for shipped work). The rhythm held from 2026-07-03 on.
- **A design foundation and i18n.** Every surface was built on ad-hoc Tailwind with no token set; i18n is deferred to the Eid design-system activation (TASK-I18N-01). Both are Eid's first study and its first tranche.
- **A CI E2E smoke job and a Preview deployment on the test project** — TASK-E2E-04's recommendation is still a ruling to take; the Preview wiring is on the board.
- **A dependency-vulnerability gate.** `npm audit` was never in a checklist; at this close the production dependency set carries five high findings (all fixed by `next` 16.3.4 plus two transitive bumps) — §4, §5.
- **The review-queue and board mechanics (G-05, G-10)** — the WIP limit at review never bit because one human and one agent never queued; the gaps stay open for a larger team.
- **An ecosystem roadmap (G-04).** The wave file and the waves README were the roadmap in practice; `ECOSYSTEM_ROADMAP.md` never existed. A decision, not a document, is missing (§3).

## 2. Metrics

Wave-level, verified 2026-09-05 (the DoD walk record carries the commands and the run outputs).

- **Throughput:** 100 feature specs at `6-done` — 49 Hub, 30 Platform Core (identity 7, organisation 8, governance 14, infrastructure 1), 21 Platform Domain (journeys 6, communication 14, intelligence 1); 142 migrations; 42 `public` tables, all with RLS; 243 public functions (236 SECURITY DEFINER); 622 pull requests merged; 1 754 commits on `main`.
- **Cycle time:** not measured per item — the wave ran as six areas (Identity, Groups, Journeys, Communication, Notifications, Platform-Ops; 2026-06-24 → 2026-08-03) followed by the post-cutover cycles (role distribution, hygiene, the leftovers pass, the anatomy corrections COR-A…E) at a one-to-three-day cycle length. The area rhythm, not the calendar cycle, was the real cadence (PROCESS.md §3 says to update the section when the rhythm changes — §4).
- **Spillover:** the four leftovers ruled in on 2026-09-03 (H017-01 retire, journey pause, SEAL-02, DB-4) and built the same day; out of the wave by ruling: i18n (TASK-I18N-01, Eid), the dated No-gos inside the specs that name Eid; one `todo` task still tagged `ferd` (TASK-FORUM-01 — §5).
- **DoR / DoD compliance:** every build was preceded by a decomposition board and a spec at `4-ready`; the feature DoD was walked at every area gate with the vertical checklists; the wave DoD is walked once, at this close.
- **Wave-level:** ADRs — the index carries 50 Accepted, 3 Superseded, 1 Deprecated (ADR-U001 … ADR-U053), none Proposed at close; tests — unit 200 suites / 1 659 tests (four cells added by the close's own fix), integration 98 suites / 1 299 tests, the E2E fleet 50 specs / 150 tests (150 / 150 on the fixed tree; the first run found TASK-RACE-01), the platform conformance family 10 suites / 46 tests; five anatomy audits, all corrections executed; 15 retrospectives before this one; 271 session bridges; six named live walks; contributors — one human, one build agent, one discovery surface. Scope creep vs shaping: the 2026-04 capability map named three fundamentals that never became a spec — feature-flag infrastructure, the ADR-U005 flexible profile table, the visitor-to-member activity transfer (the Mist transcendence, FEAT-H004/PC002, delivered the identity half) — none was ruled out in writing; they are an Eid-kickoff triage item (§5), not a silent drop.

## 3. Decisions taken in this retro

Drafted for the close; **each is Stefan's to confirm** at the declaration.

- **The wave closes against the DoD as written in `ferd.md`, with the walk record as the evidence** — the two open quality lines (the production-dependency audit; the Supabase leaked-password toggle) are ruled, not hidden: both are owned in §5 with a date, and neither blocks the close if Stefan says so. *Rationale:* the DoD line reads "or every remaining item ruled, with the reason and the owner recorded" — that is this row.
- **G-04 (waves vs roadmaps): option (a) — at the ecosystem tier, the waves band is the roadmap.** `docs/planning/waves/README.md` is the NOW / NEXT / LATER view; `ECOSYSTEM_ROADMAP.md` is not written; PROCESS.md §3 and §6 and the two skills repoint their references at the waves README, and G-04 closes. Product roadmaps stay per product. *Rationale:* a separate ecosystem roadmap would duplicate the waves band (the gap's own analysis); the wave file now carries scope, DoD and carry-overs — the content a roadmap would hold. Steering change → Stefan's nod.
- **The done task files are swept per the link-check rule** — the unlinked `done` files leave with this retro; the `done` files that are the target of a markdown link from a changelog, a spec, a plan or a bridge stay (the 2026-08-06 precedent) and are listed in the tasks README's sweep log. *Rationale:* the retro is the permanent artefact; a broken link in a changelog is not.
- **The cadence section reflects the rhythm that actually ran** (PROCESS.md §3 asks for it): area-shaped work with per-area gates and short dated cycles, a live walk at every gate. Steering change → Stefan's nod.

## 4. Process changes

Candidates, each a `type:process` work item; steering files wait for the nod.

- **The wave DoD is written at the wave kickoff, not the close** — one line in the `wave-planning` skill ("Define wave scope" step 3 becomes a kickoff obligation; the wave file is never a placeholder after the kickoff session) and in PROCESS.md §3's kickoff list. *Why:* G-07 sat open for five months; the bar for the wave was walked only once, at the end.
- **`npm audit --omit=dev` joins the cycle-boundary checklist** (PROCESS.md §3) and the DoD walk. *Why:* five high findings on production dependencies surfaced at the close because nothing asked earlier; dependency upgrades are a fuller-auto carve-out, so the boundary is the right read-point.
- **An ADR's index row changes in the same commit as its status line** — one line in the ADR template / `docs/architecture/decisions/README.md` header, or a doc-health §3 check that the index status matches the file. *Why:* twice lagged (U039, U053).
- **The Supabase security advisor is read at every cycle boundary** alongside doc-health (the MCP `get_advisors` on both projects) — the WARN-level rows that are by design (the Mist's anonymous sign-in policies; the `authenticated` EXECUTE surface of the contracts) are recorded once with their ADR so the read is a diff, not a re-litigation.
- **PROCESS.md §3 cadence text updated to the area rhythm** (see §3, decision 4).

## 5. Action items

- [ ] **Declare the wave closed** (or not) against [`ferd.md`](../waves/ferd.md) and the walk record — owner: Stefan
- [ ] **The three ADR-U053 production commands** in the [cutover record](../hub-v2/2026-09-05-adr-u053-cutover.md) (the history repair, the corrective's production leg, `migration-drift.js` green) — owner: Stefan
- [ ] **Vercel Preview → the test project** (walks and Previews off production) — owner: Stefan
- [ ] **Leaked-password protection** in Supabase Auth, both projects (the advisor's one WARN that is not by design) — owner: Stefan; note the date in the next bridge
- [ ] **The production-dependency audit:** `next` 16.1.4 → 16.3.4 (closes next / postcss / sharp), `npm audit fix` for `nanoid` and `ws`; the dev-only findings (handlebars, js-yaml, minimatch …) with it; walk the feature gates (lint, typecheck, `next build`, the unit tier) before merge — owner: Claude Code, on Stefan's nod (deps carve-out)
- [ ] **The E2E smoke job in CI** (TASK-E2E-04's recommendation) — ruling: Stefan; build: Claude Code
- [ ] **DB-4 legs 4 / 5 / 6 / 8** on the fresh cast per [the walk script](../hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md); teardown and census after — owner: Stefan (walker), Claude Code (script, cast, record)
- [ ] **G-04 executed as decided** (waves README = ecosystem roadmap; PROCESS.md §3/§6 + the two skills repointed; the gap closed) — owner: Claude Code, on the nod
- [ ] **TASK-FORUM-01** re-tagged to Eid, bet on, or dropped with a reason at the Eid kickoff (PROCESS.md §3 backlog triage) — owner: Stefan
- [ ] **Eid-kickoff triage of the 2026-04 map's un-specced fundamentals** (feature-flag infrastructure, the ADR-U005 flexible profile table, visitor activity transfer) — in or out, in writing — owner: Stefan, at the kickoff board
- [ ] **The latest-read-wins rule** as a `feature-development` line — a section that re-reads on a view switch guards its state writes with a read sequence (TASK-RACE-01's shape; the third stale-async write in the Hub) — owner: Claude Code, on the nod (a skill edit)
- [ ] **The four process changes in §4** as `type:process` items, steering edits held for the nod — owner: Claude Code
- [ ] **The Eid kickoff session:** the front door first, then the wave file from the template with its DoD (the §4 rule applied on day one), then decomposition under `wave-planning` / `ecosystem-decomposition` — owner: Claude Code with Stefan

## 6. Wave transition

The wave-completion trigger (PROCESS.md §6: wave retro done, ecosystem roadmap updated, the next wave's items unlocked past Level 2) is confirmed **when Stefan declares the close** — this retro is written, the roadmap question is decided in §3 (execution on the nod), and Eid's items are studies today, none above Level 2.

**What Eid inherits — the inputs the kickoff reads first:**

- The four studies under [`../waves/studies/eid/`](../waves/studies/eid/): the Whisp (needs concept work — and, per the standing rule, the universe mechanics firm on paper before any experience design), Journey Studio v1 (needs concept work; the sibling-studio framing superseded by ADR-U025/U026 — Universe Studio is the parent), the minimal design foundation (needs study; tokens before any UI work), and Eid's own overview with its open questions.
- The deferrals with a wave tag: i18n (TASK-I18N-01, the design-system activation point); the notification digests (FEAT-PD015 NB-6); the nudge saving (FEAT-PD016); the hat/acting riders named in the wielded specs.
- The platform it stands on: 100 specs `6-done`, both API rings gate-pinned, the test tier off production, the front door and the bridge chain — the foundation Ferd was for.
- Two decisions the kickoff must take before decomposing: the home directory of Eid's dated plans (`hub-v2/` was the Ferd build's; the cycles README says "that directory's successor" — a name, not a rename) and the Eid wave DoD, written at the kickoff.

## Doc health (cycle + wave boundary, run 2026-09-05 at the close)

Record with the full section block: [`../hub-v2/2026-09-05-ferd-close-doc-health.md`](../hub-v2/2026-09-05-ferd-close-doc-health.md). Scoped against the same-day clean COR-E run; the unconditional whole-tree checks re-run. **Critical findings: none. Backlog items: none. Re-finds: none.**

- Sections run: 1.5 (5 historical hits over the 21 changed files, 0 directives), 1.6, 2, 3, 3.5, 3.6, 3.7, 4, 4.5, 5, 7 (the wave-boundary registry review), 9 (presence), 11. Skipped with reason: 1, 6, 8, 10.
- Fixed in place: four stale links (the Hub `CLAUDE.md` ADR-U053 filename from #624; two spec filenames in the DB-4 walk script; the tasks README's swept-task link); the ADR-U053 index row (Proposed → Accepted); the anatomy and entity stamps reviewed against ADR-U053 (no impact); the retrospectives README index; the Section 3.6 table note. `TASK-RDB-04` restored after the run caught a sibling link — 14 swept, not 15.
- For the Eid kickoff board (Section 7, wave-boundary review): `ECOSYSTEM_ROADMAP.md` (G-04 — §3 above) and `platform/core/SPECIFICATION.md` (the four sub-tier specification files may already be its realisation).
- Notes worth carrying: citation-by-inference struck three times in one day (verify every filename against a listing, including one's own); a sweep's link check must cover the tasks directory itself; 13 dangling task links in historical files date from the 2026-08-03 sweep and stay as written.
