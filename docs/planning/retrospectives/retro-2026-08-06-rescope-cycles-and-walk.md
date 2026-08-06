# Retrospective — the post-area Ferd cycles (HYG-A · ADM-E · ADM-F · ADM-G · N-E) + the twelve-scenario live walk

**Date:** 2026-08-06 · **Scope:** everything after the [Platform-Ops area retro](./retro-2026-08-03-platform-ops-area.md) (2026-08-03) up to the RD-A boundary — five cycles and one live walk, in four days. **Facilitator:** Claude · **Participant:** Stefan.

Companions: the [walk script](../hub-v2/2026-08-05-ne-and-adm-corrections-walk-scenarios.md) · the [walk findings + verdicts](../hub-v2/2026-08-05-ne-walk-findings.md) · the [role-distribution design note](../hub-v2/2026-08-05-role-distribution-design-note.md) (board now CLOSED).

This is the retro the last two closes deferred ("next boundary carries the cycle-retro doc-health slot"). It is a **boundary** retro, not a wave or area one: the Platform-Ops area already closed at its gate; what follows are the re-scoped cycles that the gate pushed into Ferd, plus the walk that tested them.

## What shipped

- **HYG-A** — FEAT-PC023 + FEAT-H038: group-suspension enforcement. The W-3 refusal matrix defined before enforcement shipped; two-mode rendering (the found-but-that's-it shell as a payload-driven branch, the resting read-only banner); the canonical availability refusals reaching member copy verbatim through one shared `availabilityRefusal()` wired into the mappers **and** the write routes that had no P0001 branch.
- **ADM-E** — FEAT-PC024 + FEAT-H039: bounded member enumeration (composite `(display_name, id)` keyset, cap 200 / default 50, server-side search) and bulk member actions; the W-4 email echo on all nine member ceremonies. Discharges the area retro's "a list without a bound is a latent stall".
- **ADM-F** — FEAT-PC025 + FEAT-H040: role-template editing contracts and the `/admin/roles` editor, plus three walk-rider closures.
- **ADM-G** — FEAT-PC026 + FEAT-H041: suspended-group admin access and the content wing (WF-2) — the audited banner, the moderation and removal ceremonies, reactivation.
- **N-E** — FEAT-PD017 + FEAT-H042: bell-answerable invitations (WF-1) with typed responses and all-doors convergence, plus the polish rider.
- **The live walk (S1–S12)** — the N-E and ADM-E corrections plus the never-before-walked role-template editor. Four findings, all dispositioned: **WA-5** (hard delete stranded on a 404 → the erased panel, #433) · **WA-6** (template-less groups instantiate the **system set only**, clones pull-only — ruled, shipped through the held gate, verified live twice) · **WA-7** (Save draft kept the fabric + named the version awaiting Apply, #437) · **WA-8** (provenance directive → slotted as RD-A's first slice).

**Ten feature specs `6-done`** across the span, each with Implementation notes, §L4 rows, README rows, and CHANGELOG entries in the registers that owed them.

## Metrics

- **Throughput:** 5 cycles + 1 walk in 4 days (2026-08-03 → 08-06); 10 specs `6-done`; 4 walk findings raised and closed (3 fixed, 1 slotted by directive).
- **Gates:** PC026 19/19 post-apply · PD017/H042 14/14 post-apply (zero test-side changes) · PC025 17/17 post-apply. Four schema gates, **each held for a named approval**, each applied + repaired with a consistent log.
- **Fleet movement:** integration 1027 → **1041** · unit 1291 → **1300** · E2E 131/132 → **133/133** (the first fully-green fleets on record — see learning 3 for why that number is not the evidence it looked like).
- **Spillover:** deliberate — WA-8 into RD-A; AB-6's docket grew by three items (Tier-1 `has_permission`, the `/admin/roles` + admin-plane deep-cold ADR-U043 pass, the sealed-threads admin-sight safety question).
- **DoR/DoD compliance:** clean, with one honest exception — the doc-health slot was deferred twice by explicit note (ADM-G close, N-E close) and is discharged here, four days late.

## What went well

1. **The held schema gate held, five times, with no erosion.** Every migration in the span waited for an explicitly named approval ("ok merge 418", "ok merge 426", "ok merge 423", "ok merge 435"). Under time pressure and past midnight, the rule did not soften.
2. **The gate cells kept catching what the decomposition merely believed.** ADM-F's "zero changes to instantiation physics" derivation was wrong on exactly the clone path, and the STORY-2 gate cell found it; ADM-G's dossier premise 7 ("PC023's exits family passes admins through the availability guard") was wrong for the remove door, and the spec's own "gate finding, not silent scope" clause absorbed it without a scope fight. The pattern is now three-deep — see learning 6.
3. **The walk earned its place again, and against new surface.** S9–S12 walked the role-template editor for the first time; three of the four findings were fixed in-walk, red-first, and WA-6 went further — a **two-day-old law reversed by named ruling**, shipped through the held gate, and verified live twice (a clean group born, then the pull door delivering v6).
4. **The sweeps were adjudicated, not blanket-fenced.** One late red was **diagnosed** (the collation cell, deterministic once "Steward clone" became the first differently-cased template name), four were fenced against untouched solo-green controls, and one 27-red run was **excluded as self-caused with the process error owned** rather than quietly dropped.
5. **The E2E flake family was fixed properly — and then the fix's own closure claim was falsified and corrected inside the same arc**, which is the behaviour we want from a discipline that had just been burned.

## What to learn (the ledger — six carried items, plus two the walk arc added)

1. **"Which conformance gates does this object class face?" belongs in decomposition, not in the sweep.** (N-E / GC-8.) The spec-time sweep enumerated assertion-level siblings but not the *structural* gates a first-of-its-kind object class trips — here a cross-owner trigger mount (DS-5 function on a PC-3 table), which the gate correctly refused until licensed citing ADR-U048 + U051A2. Proposed as a named decomposition checklist row (the ownership-manifest lesson generalised).
2. **Fresh context ≠ fresh identity.** (The walk.) `sessions.spec` opened four fresh browser contexts — and signed all of them into the **shared** `SESSION_EMAIL` user, then revoked a non-current session that was sometimes the storageState one. The audit cleared it because the discriminator was *browser context* when the poison lives at the *identity* layer. Rule: a spec is hazardous when it revokes, signs out, suspends, or deletes sessions belonging to the shared identity, however many contexts it opens.
3. **"×2 consecutive green fleets" is not a closure bar for the shared-session family** — ordering luck produces it. The third fleet falsified a retirement declared on exactly that evidence. **Re-closure must state the mechanism removed.** A green fleet is corroboration, never proof.
4. **Catalog-style pins over open namespaces are their own sweep category.** (ADM-G / S8a.) The `moderation.*` catalog pin queries the audit-log **action namespace** — a DISTINCT-set assertion that a function-name or refusal-string sweep structurally cannot see. It went red post-apply on a legitimate addition. Worth naming as a sweep class so it is enumerated, not discovered.
5. **The payload walk traces keys, not rendered copy.** (N-E.) H042's STORY-1 AC said the chip "shows 'Accepted'"; the shipped render — correctly, per the N-B answerer-row precedent — reads "Accepted by [own nickname]". The walk that was supposed to catch AC drift only followed the data. Extend it to the copy the user actually reads.
6. **Derived premises are this span's recurring defect class.** Three data points in four days: ADM-F's instantiation physics, ADM-G's premise 7, and the walk arc's "all seed environments behave identically" sweep argument — refuted by the DB's real state. All three were *reasonable inferences from documents* that the substrate did not honour. The standing VERIFY-at-decomposition rule should bite specifically on any premise of the form "X already handles this" — name one path and prove it, exactly as the area retro's learning 1 said, now with three more scalps.
7. **Process error owned: destructive debris deletes were executed during a live background sweep.** That is the one-DB-consumer rule's spirit violated by its author, and it cost a 27-red run that had to be excluded. The rule needs to read as covering *destructive data operations*, not only concurrent suite runs.
8. **A spec I author needs a teardown in the same commit.** Both specs written during the walk arc shipped without teardowns and leaked fixtures; the fix (#439) is not the lesson — noticing that the author of the leak-hunting task was the leak's source is.

## Decisions taken in this retro

- **The role-distribution board is CLOSED.** RD-1 settled at the walk close (both cycles, **RD-A then RD-B**, both pre-cutover); RD-2..RD-10 re-read at this boundary and **confirmed explicitly** ("all as recorded") — they are settled law for decomposition, not defaults-by-silence. Recorded in the design note's §Board CLOSED. Sequence: **RD-A → RD-B → AB-6 → Phase-4 cutover.**
- **TASK-E2E-01's uncleared scope is carried forward as TASK-E2E-03** (23 shared-identity specs, 13 with a revocation verb, `account-state.spec` first), with the fresh-context-≠-fresh-identity rule and the mechanism-not-fleet-count closure bar restated in full. E2E-01 itself is **kept**, not deleted — it holds a standing-table row and live inbound links; it now carries a `successor:` pointer.
- **`done` does not imply sweepable.** The pre-delete link check (the tasks README's own standing instruction) turned a 14-file delete list into **6** — eight files are the targets of live markdown links from session bridges, gate records and the completion plan, all of which are historical documents that must not be rewritten to accommodate a deletion. Recorded, with the tension named: the keep-set now exceeds the delete-set, and the backlog directory is quietly becoming an archive. **Not resolved here** — it needs a deliberate decision about whether historical links may go stale.
- **The doc-health slot is discharged here** (see below), closing the two deferrals.

## Process changes (proposed — these touch steering files, so they wait for the nod)

1. **`ecosystem-decomposition`:** add a checklist row — *"which conformance gates does this object class face?"* — fired whenever a story introduces a first-of-its-kind object class (learning 1).
2. **`feature-development`:** extend the payload walk to the **rendered copy**, not only the payload keys (learning 5).
3. **`AGENTS.md` / the one-DB-consumer rule:** state explicitly that it covers **destructive data operations** against the shared dev DB, not only concurrent suite runs (learning 7).

None are applied in this PR — steering-file edits are a fuller-auto carve-out.

## Action items

- [ ] **TASK-E2E-03** — the shared-identity revocation audit, 13 named specs, `account-state.spec` first. Owner: unassigned (next boundary).
- [ ] **TASK-E2E-02** — the historical leaked-fixture purge decision. Owner: **Stefan** (standing).
- [ ] **AB-6 docket** carries: the Tier-1 `has_permission` finding · the `/admin/roles` + admin-plane deep-cold ADR-U043 pass · the sealed-threads admin-sight safety question · the ADR-U052 + U043-Amendment-2 anatomy absorption (second consecutive boundary).
- [ ] **The three process changes above** — await Stefan's nod before touching the skills or AGENTS.md.
- [ ] **"Steward clone" retirement** — the template persists platform-wide with live copies and no retire affordance; it is RD-A's second leg, and the first real user of it.

## Task sweep (executed at this retro)

**Link check run first, and recorded** — per the tasks README's standing instruction after two sweeps skipped it. Fourteen `done` files were checked; six had no inbound markdown link and were deleted.

**Deleted (6):** TASK-ADME-01/02 · TASK-ADMG-01/02 · TASK-NE-01/02. Only prose mentions remain, so nothing broke.

**Kept despite `done` (8), each with a live inbound markdown link:** TASK-HYGA-01/02 and TASK-ADMF-01/02 (their decomposition session bridges) · TASK-INT-03/04 (this README, the A-NTF area gate, the re-walk findings, a bridge) · TASK-DBT-02 (the platform-ops completion plan) · TASK-E2E-01 (standing row, the walk findings, TASK-INT-01). TASK-DOC-003/004/005 and TASK-INT-02 remain kept under the standing 2026-07-28 ruling.

**Open and carried:** TASK-DBT-01 (Eid) · TASK-E2E-02 (Stefan's purge decision) · **TASK-E2E-03 (new, standing)** · TASK-FORUM-01 · TASK-H017-01 · TASK-I18N-01 (Eid) · TASK-INT-01 (`review` — the ES256 flake) · TASK-MIST-01.

**A note on my own first pass:** the delete list I drafted before running the link check had 17 files on it, inferred from `status: done`. That is learning 6 of this very retro — a derived premise, reasonable from the lifecycle rule, wrong against the substrate — caught by the mechanical check the README had already instructed. Recorded rather than quietly corrected.

## What's next

1. **RD-A** — decomposition to 4-ready paired specs: the WA-8 provenance stamp (source version + copied-date at all three instantiation doors, honest-unknown backfill) · central retire (offerable flag + filters on both picker reads + the retire/unretire ceremony with the lockout guard) · **group-side retire of a template-derived role** — noting the substrate fact found at board time: `RolesPanel` gates deletion on `created_from_role_template_id` being null, so an adopted role is **permanent in its group today**. Schema-gated; the migration PR holds for a named approval.
2. **RD-B** — the publications table, scoped publish (one/many/all as data), the three passive notice kinds, the Steward's available-roles view, the diff-on-copy ceremony.
3. **AB-6** — the FULL anatomy audit, with the docket above.
4. **Phase-4 cutover** — now two cycles further out, by the explicit pre-cutover call.

## Doc health (cycle-boundary audit, run 2026-08-06 — all 11 sections)

Baseline: the 2026-08-03 area-boundary run. Delta audited: HYG-A, ADM-E, ADM-F, ADM-G, N-E, the walk arc, and the role-distribution design note. This run discharges the two deferrals recorded at the ADM-G and N-E closes.

```
1.   Terminology drift            — skipped: no renames in the delta
1.5  Architectural drift           — 24 concepts checked / 1 critical (fixed) / 1 finding (fixed) / 1 soft flag (bannered) / 1 new table row OWED (steering, held)
1.6  Unfiled deviation markers     — 7 hits, 0 genuine (all false positives on "one-directional")
2.   Schema drift                  — 7 migrations checked / all 7 cited by a feature spec / clean
3.   Path + README sync            — 3 README indexes fixed / 0 broken cross-references
3.5  Archived-tree leak            — 402 refs across 19 files / 0 directive / clean
3.6  Deleted-file refs             — 9 filenames checked / 0 directive (all provenance or bannered snapshot) / clean
3.7  Snapshot drift (inventories)  — no new restating snapshots; one related case bannered (see below)
4.   Parked items                  — 0 parked features in the tree
4.5  Ownership-manifest flags      — 0 open gate-review flags
5.   Maturity consistency          — 85 `6-done` specs, whole-tree / 0 absent or empty Implementation notes / clean
6.   Entity coverage               — skipped: no entity changed status
7.   Expected placeholders         — registry reviewed / 0 authored / 0 added / 18 still pending
8.   Feature-inventory summary     — hub 42/42 · platform-core 26/26 · platform-domain 17/17 present / 0 drift
9.   CLAUDE.md cascade             — 28 files + root / 0 missing for active entities / content + pointer checks skipped: no CLAUDE.md authored or moved since baseline (git-verified)
10.  Graduation tracker            — skipped: no universe core ratified, no discovery-sourced ADR added
11.  Anatomy freshness             — stamp U048A1+U051A1 vs newest U052 / 1 anatomy-relevant ADR outstanding (+U051A2 new) / THIRD consecutive boundary
```

**Critical finding (1) — fixed in-place:**

- `docs/platform/core/features/FEAT-PC025…:21` — the as-found substrate item *"the template-less instantiation path copies EVERY role template"* stood with **no pointer to the WA-6 Amendment 135 lines below**, which superseded it on 2026-08-05 (system templates only, clones pull-only, migration `20260805150000`). The spec was internally correct and externally misleading — and **RD-A's decomposition reads exactly this path next**. Fixed with an inline supersession marker at the claim itself. This is the Section 3.7 lesson in mirror image: a correction at the bottom of a file protects a reader no better than a disclaimer at the top.

**Findings — fixed in-place (2):**

- `docs/platform/domain/features/FEAT-PD002…:92` — the refusal AC enumerated `(closed/archived/suspended)`, omitting **`resting`** (added by FEAT-PC023's two-mode holds). The rule is keyed on "not active", so behaviour was always correct; the enumeration was not. Annotated rather than silently re-worded.
- `docs/planning/waves/FERD-CAPABILITY-MAP.md` — a dated 2026-04-10 baseline whose Status/Gap columns read as live capability claims (row 35 still says "no admin UI to archive, suspend, or reactivate" — shipped by PC020/H035). **Staleness banner added** at the head, on the FOLDER_STRUCTURE precedent; the map stays as the wave's scoping record, not a tracker.

**README index lag — fixed (3):** the retrospectives README indexed **neither** the 2026-08-03 Platform-Ops area retro **nor** the COR-C retro (two boundaries of lag, plus this one) · the hub-v2 phase table still described ADM-7/ADM-17 as "board is next" and named none of the five cycles that have since shipped, the walk, or the design note · the tasks README gained the 2026-08-06 sweep line with its link check recorded.

**Re-find (escalated, NOT re-filed — third consecutive boundary):** the anatomy stamp remains at U048A1/U051A1. **ADR-U052** is still unabsorbed, and it is now joined by **ADR-U051 Amendment 2** (accepted 2026-08-05 — the cross-owner trigger-mount license, which touches ownership and so is anatomy-relevant, unlike Amendment 1). AB-6 carries both. Third consecutive boundary is itself the signal: this is no longer lag, it is a standing debt the audit cannot discharge.

**Owed to steering files (held for the nod, not applied):** a Section 1.5 table row for the WA-6 retirement (template-less instantiation: every role template → system set only, clones pull-only), and a tightening of Section 1.6's grep, which matched `one-directional` seven times and would keep doing so every run.
