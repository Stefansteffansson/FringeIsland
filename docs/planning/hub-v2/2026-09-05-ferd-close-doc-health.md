# Doc health — the Ferd wave close (2026-09-05, afternoon) — record

**Trigger:** cycle boundary + wave boundary (PROCESS.md §3; the `doc-health-check` skill "When to run" — deletions after the task sweep, the wave-transition registry review, the ADR-U053 status change). **Scoped against the same-day clean run** ([`2026-09-05-cor-e-doc-health.md`](./2026-09-05-cor-e-doc-health.md), commit `cd1ccfe3`): the section greps ran over the 21 files changed since it plus the whole-tree checks the skill marks unconditional. Pasted into [`retro-wave-ferd.md`](../retrospectives/retro-wave-ferd.md) "Doc health".

```
Doc Health Check — 2026-09-05 — the Ferd wave close (cycle + wave boundary)

Sections run:
1.   Terminology drift            — skipped: no renames since the same-day run
1.5  Architectural drift           — 60 keywords over the 21 files changed since the morning run / 5 hits, all historical narrative (the COR-E plan and Audit V quoting index annotations; the retired FEAT-PC016 filename in ferd.md) / 0 directives / clean
1.6  Unfiled deviation markers     — 0 markers in hub/app, hub/lib, supabase/ / clean
2.   Schema drift                  — 1 migration since the morning (20260905130000, the residue probe kind retired): recorded in the cutover record, ADR-U053 and the root CHANGELOG; no spec presents the kind as live / clean
3.   Path + README sync            — 21 changed files link-checked: 4 stale refs fixed in place (the Hub CLAUDE.md ADR-U053 filename cited by inference in #624; two FEAT filenames in the DB-4 walk script cited by inference; the tasks README's TASK-DOC-004 link demoted after the sweep); 3 forward links to the DoD walk record resolve when it lands this session; the retrospectives README gains the wave-retro row; the waves and tasks READMEs updated in-session; hub-v2/README is a phase plan (curated: 14 of 66 dated records named — by policy)
3.5  Archived-tree leak            — 0 old_*/ refs in the changed files / clean
3.6  Deleted-file refs             — 16 filenames checked over the active tree: every hit historical (FOLDER_STRUCTURE.md under its staleness notice; COR-E plan / Audit V / record text; done-task gate records) / 0 directives. The task sweep: 1 sibling link found after the delete (TASK-RDB-03 → TASK-RDB-04) — TASK-RDB-04 restored, 14 swept not 15; 13 pre-existing dangling TASK links live only in historical files (bridges 2026-07-26 … 2026-08-01 and the A-NTF retro → TASK-OBS-01 / INT-05 / DOC-007 / DOC-008, deleted by the 2026-08-03 sweep) — out of edit scope, noted. Table: the ADR-U053 note on the apply-migration-temp.js row closed (the acceptance pass recorded the rename)
3.7  Snapshot drift                — ferd.md restates the feature inventory (100 IDs) with the canonical-wins banner inline above the list; the wave retro restates counts dated 2026-09-05 / clean
4.   Parked items                  — 0 parked specs / clean
4.5  Manifest gate-review flags    — 0 / clean
5.   Maturity consistency          — 100 specs: maturity / wave / owner fields valid; the 6-done Implementation-notes sweep 0 ABSENT / 0 EMPTY; the front door names the newest bridge and an open plan / clean
6.   Entity coverage               — skipped: no entity changed status
7.   Expected placeholders         — 18 registry rows reviewed at the wave boundary: 0 authored, 0 removed, 18 pending; two go to the Eid kickoff board: ECOSYSTEM_ROADMAP.md (the wave retro's G-04 recommendation — the waves README is the roadmap band; if adopted the row leaves the registry and PROCESS.md §3 / §6 repoint) and platform/core/SPECIFICATION.md (the four sub-tier *-specification.md files may already be its realisation — decide, then remove or keep the row)
8.   Feature-inventory summary     — skipped: no FEAT created, advanced or deleted since the same-day run
9.   CLAUDE.md cascade             — 13 tier / entity / sub-entity files + 5 vertical files present / 0 missing; load-order and content checks not re-run (no CLAUDE.md restructured; #624's edits were content) / clean
10.  Graduation tracker            — skipped: no core or discovery-sourced ADR added
11.  Anatomy freshness             — stamp ADR-U047 A4 + the retention rule vs newest ADR-U053 (Accepted 2026-09-05): reviewed, no anatomy impact — the stamp note updated in ARCHITECTURE_ANATOMY.md and DOMAIN_ENTITIES.md; index complete (53 files / 53 rows), 1 status-row fix (ADR-U053 Proposed → Accepted; the ADR-U036 "Amended" row is the standing convention for an in-part supersession, not drift); SVG v2.7 = README = anatomy companion; 0 unbannered snapshots; the measurement ledger current (no gate measurements since RD-B)

Critical findings: none.

Backlog items created: none — the two §7 decisions ride the Eid kickoff board through the wave retro §5.

Re-finds: none.

Placeholders confirmed scaffolding (per Section 7 registry): the 18 rows, referenced from PROCESS.md §3 / §6, the wave-spec and product-roadmap templates, and the platform / products / studios READMEs.

Table updates made during this run:
- Section 1.5 table — 0 rows (no concept retired)
- Section 3.6 table — the apply-migration-temp.js row's ADR-U053 note closed; 0 new rows (the 14 swept tasks are ephemeral by the table's own rule)

Notes:
- Citation-by-inference struck three times in one day — the Hub CLAUDE.md link from #624 and two spec links in the walk script written this afternoon (FEAT-H039 / FEAT-H033 filenames inferred from their titles). Verify every filename against a listing, including one's own.
- A sweep's pre-delete link check must include the tasks directory itself: a kept sibling can link a swept file (RDB-03 → RDB-04). The tasks README rule now reads "from anywhere else in the tree".
- The 13 dangling task links in historical files predate this run (the 2026-08-03 sweep deleted TASK-OBS-01 / INT-05 / DOC-007 / DOC-008 that bridges and the A-NTF retro linked). Historical files stay as written; the skill's Section 3.6 note ("sweeps leave only prose mentions, never markdown links") held for the sweeps it verified, not for the 08-03 one.
```
