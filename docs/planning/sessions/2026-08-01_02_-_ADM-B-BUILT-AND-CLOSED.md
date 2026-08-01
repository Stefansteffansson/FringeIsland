# Session bridge — Cycle ADM-B built and closed: PC020 + H035 shipped, the doc-health debt paid

**Date:** 2026-08-01 · **Wave:** Ferd · **Area:** A-ADM (Platform-Ops) — Cycle ADM-B CLOSED (both halves `6-done`); next is the ADM-C board
**Follows:** [`2026-08-01_01_-_ADM-A-CLOSED-ADM-B-DECOMPOSED-HYGIENE-DONE.md`](./2026-08-01_01_-_ADM-A-CLOSED-ADM-B-DECOMPOSED-HYGIENE-DONE.md)

---

## READ THIS FIRST — what the next session must pick up

**Next: the ADM-C board.** ADM-B is fully closed — [FEAT-PC020](../../platform/core/features/FEAT-PC020-group-administration-contracts.md) and [FEAT-H035](../../products/hub/features/FEAT-H035-group-administration-view.md) both `6-done`, all sweeps green (unit 1088/1088 · E2E **97/97** with the leak instrument at delta 0 · integration **793/793**), the owed doc-health-check run (report below), the ADM-A changelog debt paid. The queued ADM-C board question stands: **does suspend/reassign notify affected members (V3)?** — plus the ADM-C member-operations surface slice (per governance spec §Capabilities without specs).

**Watch-items (hard-won this session):**
1. **Never launch the dev server through an output-truncating pipe.** `npm run dev | head -30` wedged the server mid-E2E the moment `head` exited (EPIPE on Turbopack's stdout; the node process sat at 2 GB holding :3000). Cost ~40 minutes of misdiagnosis across three "hung" E2E runs. Log to a file, always.
2. **Playwright cannot launch browsers under the ctx-sandbox's Bun runtime on Windows** — `chromium.launch()` times out on the remote-debugging pipe. Probe scripts must run under plain `node`.
3. **`getByTestId` assertions on admin list pages must be row-scoped** — the dev DB legitimately holds multiple caretaker groups (three pre-existing ones surfaced the moment the Platform-stewarded tab existed — RW-05 doing its job on day one).
4. **The transient all-red integration run** (32/32 fail, control immediately clean) — consistent with the known dev-DB auth-admin flake; watched, not fenced. Never two suites concurrently remains law (I briefly violated it via cwd-slip background strays; explicit `cd` on every test command now).
5. **Shell cwd drifts between foreground commands** — three stray background jest runs launched from the wrong directory before I caught it. Prefix every test invocation with its explicit `cd`.

**Owed at the A-ADM area gate (accumulating, carried forward):** ADR-U043 perf pass (incl. `/admin`, `/admin/groups` + detail) appended to the [perf ledger](../reference/PERF-MEASUREMENT-LEDGER.md) · Stefan's live walk · W12 per-RPC rows with the GC-14 composition column · the E2E-at-schema-close process question · the 398-BFF-telemetry-sites adoption criteria (H034 notes) · **the deferred-five restate (ADM-7/13/14/15/17 — the standing rider, due at area close)** · the AB-6 FULL anatomy audit — **now also carrying the ADR-U052 absorption** (health-check §11: the anatomy stamp lags U052; the PC-1 row lacks the telemetry sink; check the PC-4 admin-RPC enumeration against the now-eleven-strong family) · **NEW: [TASK-DOC-005](../backlog/tasks/TASK-DOC-005-platform-core-changelog-backfill.md)** (platform-core CHANGELOG backfill PC002–PC017 — the register had ONE entry ever; ADM-A/ADM-B entries written this session, gap note in place) · the two pre-existing lint errors on main (`AdminDashboard.tsx:50`, `AccountMenu.tsx:35`, `react-hooks/set-state-in-effect` — found-not-caused during ADM-B, likely an eslint-plugin-react-hooks version bite; route to a hygiene slot).

## One-paragraph state

Cycle ADM-B ran gate-to-gate in one session. The platform half (PC020) went red-first through TWO named-approval schema gates: PR #363 (the five `admin_*` contracts — one strictly additive migration, no new tables, red 29-fail/1-pass `PGRST202` before the migration existed, 30/30 green post-apply) and PR #364 (the `members` array on detail — the picker-source adjudication, red 2-fail demonstrated between the migrations, 32/32 green post-apply). Composition finding recorded, not bypassed: `assign_member_role` refuses any non-member caller at its **visibility predicate** before its permission walls (which a platform admin passes via Tier-1 — verified live: DeusEx role grants ⊃ Steward template); reassignment therefore composes `can_assign_role` with the true actor + the fabric's active-member wall + `prevent_last_leader_removal` verifying the caretaker teardown. The surface half (H035) went red-first at the unit tier (three suites red pre-implementation → 26/26 → full 1088/1088; route-policy + outer-ring gates accepted five new BFF routes and the wrapper with zero exception entries; `next build` green), with the E2E journey labelled test-after (4/4; full sweep 97/97, leak delta 0). A decomposition-walk defect (`get_group_memberships_of` as picker source — wrong direction, wrong gate) was caught at build, adjudicated by Stefan same-day, and both specs' walk tables amended. The owed doc-health-check ran (report below); the missing ADM-A changelog entries were discovered and written along with ADM-B's.

## What we built, as an operator would tell it (the J-B walkthrough)

I open the platform dashboard and there is a new card: **Group administration**. The list shows every group on the platform — engagement and system, never personal — each with its member count and its people count (the caretaker never inflates the human number), a status badge only when something isn't active, and a **Platform-stewarded** tab. That tab is the point: the moment it existed it listed three groups FringeIsland has been caretaking that no screen could show before. I open one: a banner tells me the platform is its caretaker and that Reassign hands it back. The picker offers exactly the group's active human members — never an empty mystery dropdown; if nobody is eligible it says so. I confirm, naming who receives stewardship; the banner goes, the member reads as Steward, the group leaves the tab, and the audit trail carries who did it and to whom. On an active group I can Suspend — full danger ceremony naming the consequence — and its members see the group marked suspended through the same page they always used; Reactivate reverses it. Nothing here offers what the platform would refuse: no lifecycle buttons on closed or archived groups, no Reassign outside caretakership, and if I'm not a platform admin none of these pages exist at all — 404, no admin chrome. Continuity questions asked: a re-suspend refuses and writes nothing; a refused reassignment leaves no partial state; the demoted operator loses both pages instantly.

## Decisions made this session

1. **Two named schema-gate approvals** (Stefan, 2026-08-01): "merge #363 + apply PC020" · "merge #364 + apply members array". (A generic "okay go ahead" was correctly bounced against the named-approval rule first.)
2. **Picker source adjudicated:** additive `members` jsonb key on `admin_get_group_detail` (over a dedicated read or deferring the reassign UI). Both specs' walk/picker lines amended.
3. **Audit action names:** the dotted namespace (`group.suspend` / `group.reactivate` / `group.reassign_stewardship`) — the tree is genuinely split; PC019's newest convention won; recorded in PC020 notes.
4. **State honesty over STORY-2's letter:** Reassign renders only on caretaker groups (the contract refuses non-caretaker reassignment `P0001`; the surface never offers what the contract refuses).
5. **`stewards[]` is human-only**; the caretaker rides `deusex_stewarded` (walked to the H035 banner). `p_new_steward_group_id` is a **personal-group id** (membership identity).
6. **Detail "status timestamps"** = the row's `created_at`/`updated_at` (no walked consumer; no new column).

## PR ledger

#363 PC020 five contracts (held → named approval → applied → merged) · #364 members array (held → named approval → applied → merged) · #365 H035 surface + cycle close (fuller-auto; this commit's PR).

## Verification at close

Unit **1088/1088** (route-policy + outer-ring gates green, zero new exceptions) · `next build` green · admin integration suite **32/32** post-apply · manifest conformance **11/11** · E2E full sweep **97/97** (6.0 m, caretaker-leak instrument 0→0) · full integration sweep at close **793/793 (66 suites, 22 min)** — up from ADM-A's 65/761 by exactly the new admin suite. Migrations `20260801120000` + `20260801130000` applied + repaired on the dev DB.

## Doc Health Check — 2026-08-01 — cycle boundary (owed since ADM-A)

```
Sections run:
1.   Terminology drift            — skipped: no renames since last check
1.5  Architectural drift           — 14 keyword families swept; 151 raw hits sampled; all historical/frozen-snapshot/ADR-narrative; 0 active directives; clean
1.6  Unfiled deviation markers     — 0 markers in hub/app, hub/lib, new migrations; clean
2.   Schema drift                  — 4 migrations since last run (PC018/PC019/PC020×2); all covered by 6-done specs + L4 rows; platform/core/SPECIFICATION.md pending (registry); clean
3.   Path + README sync            — features READMEs + L4 rows updated in-session; no doc moves; partial run, clean
3.5  Archived-tree leak            — skipped: nothing archived, prior run clean
3.6  Deleted-file refs             — skipped: no files deleted in ADM-A/ADM-B; table not fed (nothing to feed)
3.7  Snapshot drift                — skipped: no new restated inventories (perf ledger is measurements, not inventory)
4.   Parked items                  — 0 parked features; clean
4.5  Gate-review flags             — 0 flags (expected post-R-4); clean
5.   Maturity consistency          — whole-tree 6-done sweep: 0 absent Implementation notes (55+ specs); PC020/H035 verified; clean
6.   Entity coverage               — skipped: no entity status changes
7.   Expected placeholders         — reviewed; none authored, none introduced; unchanged
8.   Feature-inventory summary     — hub 35/35 clean; platform-core 27 rows / 20 files across the four shared-directory area specs (governance rows verified in-session; full four-spec ID reconciliation carried by the AB-6 audit)
9.   CLAUDE.md cascade             — presence 10/10 (PC-1/PC-2 entity files pending per registry); pointers spot-clean; no files authored this cycle
10.  Graduation tracker            — skipped: no cores or discovery-ADRs added (U052 is not discovery-sourced)
11.  Anatomy freshness             — stamp U048A1/U051A1 (2026-07-31) vs newest U052 (2026-08-01): ONE anatomy-relevant ADR outstanding — finding

Critical findings: none.
Backlog items created:
- TASK-DOC-005 — platform-core CHANGELOG backfill (PC002–PC017 gap; register note in place)
Re-finds (escalated, not re-filed):
- Anatomy U052 absorption — carried by the REGISTERED AB-6 full anatomy audit (area-gate owed list annotated above); the PC-1 row lacks the telemetry sink, PC-4's admin-RPC enumeration needs the five new contracts checked
Notes:
- TASK-DOC-004 (PC002 notes) verified done-and-consistent (backfilled 2026-07-25)
- ECOSYSTEM_ANATOMY_V4.svg carries its superseded watermark; V6 is current
```

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [x] doc-health-check — the owed run, report above
- [x] CHANGELOGs — root (ADM-A + ADM-B entries), platform-core (ADM-A + ADM-B + gap note); hub member-facing register deliberately untouched (admin-plane surfaces; the one member-visible effect — the suspended badge — rides the existing vocabulary-tolerant GRP-5 path with zero surface change)
- [x] Discovery sweep — run at close (see commit)
- [ ] ADM-A/ADM-B retro — folds into the area retro at the gate (standing decision)
