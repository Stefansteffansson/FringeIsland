# Doc Health Check — 2026-08-13 — Phase-4 exit-checklist gate run

**Repo state at run:** branch `main`, HEAD `bed3dd3b`, 0 ahead / 0 behind `origin/main`, working tree clean.
**Baseline:** the previous run, [`2026-08-11-post-cutover-doc-health.md`](./2026-08-11-post-cutover-doc-health.md).
**Changes since baseline:** the dev-DB reset + three seeded starter journeys (`supabase/seeds/06_starter_journeys.sql`), TASK-DM-01 / FEAT-PD018 (migration `20260812120000`, PRs #526/#527), new task files, integration-tier teardown infrastructure, three session bridges.
**Constraints observed:** no branch change, no commit, no test run, no Supabase management API. Nothing was edited — every finding below is reported, not fixed (see "Why nothing was fixed in-place").

**Tooling note for the next run.** On this Windows checkout `sort` resolves to `sort.exe`, which rejects `-u` and `-V`. Any pipeline ending `| sort -u` returns **silently empty**, exactly like the known `find` → `find.exe` trap. Five checks in this run first reported false zeros for that reason and were re-run with `awk '!s[$0]++'`. Use `awk` for dedupe; never `sort` in this repo's health-check greps.

---

```
Sections run:
1.   Terminology drift            — skipped: no rename landed since the baseline (no old→new term pair)
1.5  Architectural drift           — 14 keywords checked / 0 critical directives / 0 fixed / 0 backlog
1.6  Unfiled deviation markers     — 0 hits (guarded pattern; control confirmed the 7 `one-directional` false positives stay suppressed)
2.   Schema drift                  — 1 migration checked / manifest clean / 1 doc-side gap (folded into C1–C3)
3.   Path + README sync            — 2923 relative links resolved / 78 broken (2 registry scaffolding, 63 historical dirs, 13 benign template placeholders) / 1 README index gap (C2)
3.5  Archived-tree leak            — 0 directive references; all `old_*/` hits historical or banner'd
3.6  Deleted-file refs             — 15 filenames checked / 0 directive refs / the two 2026-08-11 hub-legacy fixes verified still correct
3.7  Snapshot drift (inventories)  — 0 new restating snapshots since the baseline / registry entries still banner'd
4.   Parked items                  — 0 parked features in the tree
4.5  Gate-review flags             — 0 "Gate-review flag" notes in ownership.manifest.json
5.   Maturity consistency          — 92 specs checked / 91 at 6-done, 0 ABSENT + 0 EMPTY Implementation notes / 1 critical (C1)
6.   Entity coverage               — clean; every absence is a Section 7 registry placeholder
7.   Expected placeholders         — 18 registry entries reviewed / 0 newly authored / 0 newly introduced / 18 still pending
8.   Feature-inventory summary     — 3 features/ dirs checked (hub 45/45, core 29/29, domain 17/18) / 1 critical (C3)
9.   CLAUDE.md cascade consistency — 20 entities + 7 tier/sub-tier files checked / 0 missing / 0 load-order breaks / 0 new soft flags
10.  Graduation-tracker completeness — 5 discovery-sourced ADRs + 4 canonical cores checked / 0 missing rows / 0 stale rows
11.  Anatomy freshness              — stamp ADR-U047 A3 vs newest ADR-U052 (already absorbed, named in the stamp) / 52 ADR files, 52 index rows, 0 missing / 0 retired-vocab hits in the living pair / 0 stale pointers / measurement ledger has a row for all 3 gate-measurement files
```

---

## Critical findings — 3, one root cause

All three are the same omission seen from three artifacts: **FEAT-PD018's close-out was never performed.** The code shipped and was gate-verified; the spec never advanced past the state it was authored in.

The evidence that it shipped: root `CHANGELOG.md:11–17` records the feature and its gate verification (*"PD018 suite 9/9, platform conformance 30/30, full integration 1181/1181 across 84 suites"*); migration `20260812120000_dm_a_pd018_member_erasure_conversation_disposition.sql` (834 lines) is applied; `docs/planning/backlog/tasks/TASK-DM-01-direct-message-erasure-gap.md:4` reads `status: done — gate executed 2026-08-12`.

- **C1 — `docs/platform/domain/features/FEAT-PD018-member-erasure-conversation-disposition.md:9`** — reads `maturity: 3-specified` for a feature whose migration is applied and whose CHANGELOG entry is written. It has **no `## Implementation notes` section** (headings end at `## Open decisions`), and its `## Open decisions` block still says *"Carried to Stefan before `4-ready`"* over four questions — at least one of which (Q1, whether `admin_exit_user_from_platform` tombstones) was in fact settled and shipped, per `CHANGELOG.md:14` (*"admin exit is a removal, not an erasure, and is unchanged"*). The `feature-development` skill's 4→5 and 5→6 transitions were both skipped. — **backlog item**
- **C2 — `docs/platform/domain/features/README.md`** — 18 `FEAT-PD*.md` on disk, 17 rows in the index. **FEAT-PD018 has no row.** (Section 3 README-sync; the Hub and Platform-Core feature READMEs are both exactly in sync, 45/45 and 29/29.) — **backlog item, bundled with C1**
- **C3 — `docs/platform/domain/communication.md` (DS-5 service spec, §L4 feature inventory)** — lists FEAT-PD008 through FEAT-PD017 and **omits FEAT-PD018**. This is Section 8 drift signal (1), *feature-on-disk, not-in-summary*, which the skill classes as a critical finding. It also means the DS-5 service spec carries no description of the new lifecycle fact handler or the four replaced contracts — the Section 2 doc-side schema-drift gap. — **backlog item, bundled with C1**

### Why nothing was fixed in-place

C2 and C3 would normally be one-line inline fixes. They are not, here: both index rows must state a maturity, and the maturity is exactly what is in dispute. Writing `6-done` into two index rows while the spec's own frontmatter says `3-specified` would manufacture a second, worse drift — the direction Section 8 calls out as "more misleading than the reverse". The three must be closed together, in a pass that has the DM-A build context loaded and can answer the four open decisions. That is the skill's own "flag rather than fix" rule for decision-derived drift.

## Backlog items to create

- **FEAT-PD018 close-out** — resolve or retire the four `## Open decisions`, write `## Implementation notes`, advance `maturity:` to `6-done`, add the `docs/platform/domain/features/README.md` row, add the `docs/platform/domain/communication.md` §L4 row, and describe `ds5_lifecycle_account_deleted` + the four replaced contracts in the DS-5 service spec. Owner: platform/domain (DS-5). **Not a re-find** — `TASK-DM-01` is `status: done` and no open task covers the spec close-out; `TASK-DOC-003/004/005` are all `status: done`.

## Re-finds

None. Every open backlog task was diffed against these findings; the three DOC tasks are closed and TASK-DM-01 is closed.

## Lower-severity findings (not critical, not blocking)

- **`docs/planning/backlog/tasks/README.md:56`** — the TASK-DM-01 standing-tasks row carries **no CLOSED marker**, though the task file reads `status: done` and PR #527 is titled "TASK-DM-01 closed". Sibling rows (TASK-E2E-01, and the swept batches) do carry theirs. One-line index lag. TASK-SEC-02 is correctly present at line 57 and correctly still open.
- **`supabase/seeds/06_starter_journeys.sql` is named in no living document.** The only reference is the 2026-08-12 session bridge, which is a historical record and is never rewritten. There is no `supabase/README.md` and no seeds index anywhere in the active tree; the one table that enumerates seed files (`docs/planning/hub-v2/substrate-audit.md:120–121`, listing `04_` and `05_`) is a historical hub-v2 audit. So this is a **pre-existing structural gap, not new drift** — no index went stale, because none exists. Worth a decision at the next boundary: either the seeds get an index that is maintained, or the absence is made deliberate and recorded.

## Placeholders confirmed scaffolding (Section 7 registry)

All 18 registry entries were checked against disk: **all 18 are still absent, none has been authored, none needs removal, and no new placeholder was introduced.** Two of the 78 broken links resolve to registry entries and are correctly read as scaffolding.

## Contradictions with the carried context — checked, and one nuance

The three-class hub-legacy rule and the two 2026-08-11 fixes were re-verified rather than assumed:

- **`docs/platform/domain/communication/CLAUDE.md:3` is correctly fixed.** A naive `Applies to:.*hub-legacy` grep still matches this line, which reads as a regression — it is not. The scope now says *"the Hub's messaging and forum surfaces under `hub/`"*, and the only remaining mention is a past-tense provenance sentence pointing at the annotated tag `hub-legacy-final`. The grep matches the tag name, not a live structural claim. **Flagging this for the next run so it is not re-reported as open.**
- **`docs/architecture/ARCHITECTURE_ANATOMY.md:33` is correctly fixed** — reads "the top-level `hub-legacy/` tree **held** the frozen v1 oracle", past tense, with the ADR-U032 citation.
- No other `hub-legacy` hit makes a present-tense structural claim. 15 files under `docs/planning/hub-v2/` carry hits; all are historical records.

**The one nuance that contradicts the framing in the request:** the brief describes FEAT-PD018 as "shipped". The *code* shipped and passed its gate. The *spec* did not close — it is still `3-specified` with unresolved open decisions and no Implementation notes, and it is absent from both of its indexes. That gap is the whole of this run's critical count.

## Notes for the next run

- Two keyword families were read in full rather than counted, because both were retired recently enough to be live traps: the "audits its refusals" family (`FEAT-PC027:127`, `FEAT-PC028:243`, `FEAT-PC029:318`) now correctly states that refusals raise verbatim but are **not** audited, with the TASK-RDC-03 correction dated inline — clean. The `PendingNominations` family (19 live-tree hits) is entirely retirement-describing prose plus the surviving `fetchPendingNominations()` **contract** name from FEAT-PC016, which was never the retired artifact — clean.
- Section 1.6 returned zero, and the control was run: the unguarded pattern still finds exactly 7 `one-directional` hits, so the guard is working and the zero is real.
- Section 11's measurement-ledger append check passed: all three `*-gate-measurements.md` files (2026-07-27, 2026-08-02, 2026-08-09) have ledger rows.
- No table in this skill needed feeding this run — no concept was retired and no file was deleted since the baseline.
