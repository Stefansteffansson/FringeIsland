# Doc Health Check — 2026-09-05 — Cycle COR-E boundary (after cross-cutting changes)

**Trigger:** the COR-E cycle boundary, run after this cycle's cross-cutting changes — three script deletions and one rename (W5), the anatomy and entity-model stamp moves (W1), the new `cycles/cycle-current.md` (W3), the ownership manifest's version 2 (W6), and the skill edits (W8). Last clean run: [2026-08-20](../sessions/2026-08-20_04_-_CLOSING-SWEEP-WAVES-FERD-DOC-HEALTH-CLEAN.md). Ran on `main` at the #620 merge with the W2 steering PR (#621) still held; the held edits are not in this run's tree.
**Method:** the mechanical sections scripted over `git ls-files` (sessions, retrospectives, `CHANGELOG.md` and this skill's own file excluded from detection per Scope); every hit classified by reading its context. **First run of the two GC-24 checks added this cycle** — the `DOMAIN_ENTITIES.md` stamp and the diagram-version text comparison — and of §5's front-door row.

```
Doc Health Check — 2026-09-05 — Cycle COR-E boundary

Sections run:
1.   Terminology drift            — 0 term renames this cycle; the one filename rename (apply-migration-temp.js → apply-migration.js) handled under §3 — clean
1.5  Architectural drift           — 54 keywords swept over active md+svg; 41 with hits, every hit classified historical (frozen snapshots: FOLDER_STRUCTURE, legacy-feature-docs, ANATOMY_V1; ADR bodies describing what they retired; discovery notes; area gates, dossiers and walk findings; spec amendment records; done-task records) — 0 active directives / 0 fixed / 0 backlog. Sense checks: "Shadow" (root CLAUDE.md rename note, the anatomy's menace sense, ADR history) correct; "deactivated" as a state appears only in ADR-U050 and its decision record — correct; "three studios" in studios/CLAUDE.md = the three children of Universe Studio — correct — clean
1.6  Unfiled deviation markers     — 0 hits in hub/app, hub/lib, supabase/ — clean
2.   Schema drift                  — 10 migrations since the last run (20260821150000 … 20260905100000), each cited by its spec, task, bridge or the manifest; no migration in COR-E — clean
3.   Path + README sync            — 1 stale-path family (apply-migration-temp.js): the live instructions were fixed in #619 (platform CLAUDE.md step 3, infrastructure spec, settings allowlist); 15 residual mentions = 10 done-task records awaiting the retro sweep, FEAT-PD007's implementation history, the COR-E plan and register as the finding text, and ADR-U053 (an ask-first ADR edit — owed at its acceptance pass). READMEs: 20 checked, 1 updated (platform/core README gains CHANGELOG.md); entity READMEs omit CLAUDE.md by convention (the cascade is indexed at root); the three features READMEs list 49/30/21 specs, none missing. Broken cross-refs: 0 in the active tree; 9 inside legacy-feature-docs — a frozen read-only snapshot per its own README — historical
3.5  Archived-tree leak            — 19 files carry old_*/ strings: docs/README's Legacy section (explains the deletion), verticals/CLAUDE.md's gotcha (says such references are drift), ANATOMY_V1 (struck-through, frozen), FOLDER_STRUCTURE (banner'd snapshot, 322 lines), legacy-feature-docs (frozen), the two April gap analyses (source lists), the 2026-08-11 doc-health record, one research doc — 0 directive — clean
3.6  Deleted-file refs             — 17 filenames checked (the table's 13 + this cycle's 4); on-disk cross-check: all absent; every hit historical (FOLDER_STRUCTURE, records, ADR history, provenance comments, the COR-E finding text) — 0 directive / 0 fixed / 0 flagged; table fed: +1 row (the three deleted scripts + the rename)
3.7  Snapshot drift (inventories)  — 4 reference files restate an inventory-shaped table: hub-l3-input (banner'd 2026-06-28), AUDIT-4 (banner'd), AUDIT-2 (a findings table, not an inventory — n/a), AUDIT (I) Appendix B (the July table-ownership map, unbannered) → 1 fixed in-place (SUPERSEDED banner pointing at the manifest); 0 divergent traps
4.   Parked items                  — 0 parked features in the tree — clean
4.5  Gate-review flags             — 0 flags in the manifest — clean
5.   Maturity consistency          — 100 specs, all 6-done; Implementation notes absent 0 / empty 0 (whole-tree, prefix match); owner / wave / maturity fields valid 100/100; front door: linked plan IN EXECUTION (not closed), bridge link = the newest bridge (repointed to this session's bridge at close) — clean
6.   Entity coverage               — 11 entities checked; 0 gaps; 8 pending per registry (hub ROADMAP; gimbal DESCRIPTION / SPECIFICATION / ROADMAP; universe-studio and its three children DESCRIPTION / SPECIFICATION); the five verticals carry SPECIFICATION + CLAUDE, their shape — clean
7.   Expected placeholders         — 18 registry entries reviewed; 0 newly authored; 0 newly introduced; 18 still pending; scaffolding confirmed: hub DESCRIPTION.md and SPECIFICATION.md → ./ROADMAP.md
8.   Feature-inventory summary     — 3 owners checked (hub SPECIFICATION §L4; the four core area specs; the three shipped domain service specs): 100/100 specs present in their owner's summary; 0 missing rows; 0 ghost rows; maturity-column sync carried from the 2026-08-20 wave pass (all rows 6-done) — clean
9.   CLAUDE.md cascade consistency — 28 files; 0 missing (PC-1 / PC-2 entity files pending by registry design); 0 load-order pointer breaks; content-categorisation soft-flag review not performed (no CLAUDE.md restructured this cycle; the held W2 PR edits the root header and one document-map row only) — clean
10.  Graduation-tracker completeness — 3 canonical cores + 5 discovery-sourced ADRs; 0 missing tracker rows; 0 stale rows — clean
11.  Anatomy freshness              — anatomy stamp ADR-U047 A4 + the retention rule (moved in #618) vs newest ADR-U053 (Proposed — noted, not absorbed); entity stamp ADR-U050 (first stamp check, #618); 53 ADR files / 53 index rows / 0 status mismatches; 0 retired-vocab hits in the living pair (Shadow = menace sense; hub-legacy = the historical repo note); diagram version text: README v2.7 = SVG v2.7 = anatomy companion line (the GC-24 check, first run — green); V1 banner + V4/V5 watermarks present; ledger newest row 2026-08-10 ≥ every gate-measurements file — clean

Critical findings: none.

Backlog items created: none.

Re-finds: none.

Placeholders confirmed scaffolding (per Section 7 registry):
- docs/products/hub/DESCRIPTION.md → ./ROADMAP.md — scaffolding, not drift
- docs/products/hub/SPECIFICATION.md → ./ROADMAP.md — scaffolding, not drift

Table updates made during this run:
- Section 1.5 table — 0 rows (no concept retired this cycle)
- Section 3.6 table — 1 row (cleanup-test-data.js, cleanup-test-users.js, seed-test-members.js deleted; apply-migration-temp.js renamed — COR-E W5, #619)
- Section 7 registry — 0 changes

Fixes applied in-place this run:
- docs/platform/core/README.md — CHANGELOG.md listed (README sync)
- docs/planning/reference/ANATOMY-CONFORMANCE-AUDIT.md — SUPERSEDED banner on Appendix B's table-ownership map (§3.7)
- .claude/skills/doc-health-check/SKILL.md — §3.6 table row for this cycle's deletions

Notes:
- Audit V's own documentation findings (AC5-5, AC5-6, AC5-10, AC5-11, AC5-16, AC5-O3) were fixed in #618 before this run; this run confirms them closed rather than re-finding them.
- The two checks this cycle added to §11 both ran green on their first outing; §5's front-door row was checked by hand (the unit gate is its mechanical half and is green in CI).
- Open, not a finding: ADR-U053 names apply-migration-temp.js — an ASK-FIRST edit for its acceptance pass; ten done-task files cite the old name and will leave with the retro sweep.
- The W2 steering PR (#621) is held; when it merges, §9's load-order check and §11's pointer check should be re-run on the root CLAUDE.md header (one-line pointer, no ADR enumeration) — expected clean.
```
