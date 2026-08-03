# Session bridge — cycle HYG-A BUILT: PC023 held at the schema gate (PR #390, named approval owed); H038 tranche 1 (W-7/8/9/10) built + green (PR #391, classifier-blocked merge — Stefan's click owed)

**Date:** 2026-08-03 (third session) · **Wave:** Ferd · **Cycle:** HYG-A (post-A-ADM re-scope)
**Follows:** [`2026-08-03_02_-_RB-BOARD-SETTLED-HYGA-DECOMPOSED-TWO-MODE-HOLDS.md`](./2026-08-03_02_-_RB-BOARD-SETTLED-HYGA-DECOMPOSED-TWO-MODE-HOLDS.md)

---

## READ THIS FIRST — two PRs await Stefan, then the cycle closes

1. **PR #390 — the PC023 schema gate, HELD by design.** The platform half is fully built and red-demonstrated; it needs the **NAMED approval** ("ok merge #390" or equivalent), then the apply commands in its body, then the post-apply verification set. Never applied without the named nod.
2. **PR #391 — H038 tranche 1 (W-7/8/9/10), mergeable now.** Routine product code, fuller-auto class, but the session's permission classifier blocked `gh pr merge` twice — the PR is open and green; one click merges it. Not stacked on #390; either can land first.
3. **After both land + the apply:** the next session builds the H038 post-apply tranche — STORY-5 (two-mode group rendering off `get_member_groups.status` + the typed refusal copy through the groups `http.ts` mappers), STORY-6 (steward Rest/Wake on group settings via the capability flag; admin mode-choice ceremony on the H035 surface + the dated H035 pointer), STORY-7 (the two E2E journeys), the group-write mapper wiring of `requestAccountStateRecheck()`, then the cycle-close rituals (plain-English walkthrough, full integration + E2E sweep, CHANGELOG root entry + hub entry, tasks → done, 6-done maturity ×2 with §L4 rows).

## What was built (both halves demonstrated red-first)

### TASK-HYGA-01 / FEAT-PC023 (platform) — status `review`, held at the gate
- **Gate suite** `hub/tests/integration/groups/group-availability-enforcement.test.ts` — 117 cells over six users, four groups, two journeys, acting groups, DM. **Red at head: 100 failed / 17 passed, the 17 exactly the labelled set** — the already-guarded seven (close/delete/hand/invite_group/enroll_group/nominate/respond-to-nomination) + invariant pins (DM-stays-live ×2, admin full read, anon ×2, active-control ×2, grp_insert continuity, bootstrap-accept). The W-3 class demonstrated live at head.
- **Migration** `20260803190000_hyg_a_pc023_group_availability_enforcement.sql` (4,546 lines): +`resting` check-constraint value · `rest_group` seed (template + backfill + DeusEx auto-grant) · `assert_group_writable` guard · **48 re-issues** (26 frozen doors / 10 exit amendments incl. the leave_group trap sprung / 12 read quarantines) · `rest_group()`/`wake_group()` + audited `admin_rest_group`/`admin_wake_group` + amended `admin_suspend_group` (`active|resting → suspended`) · `get_member_groups` drop+recreate with additive `status` · `is_conversation_participant` chokepoint + 4 RLS policy amendments · the 14-policy legacy write-door closure + grant revokes.
- **The dossier settled the spec's ~28:** 26 frozen / 10 exits / 12 reads / exactly seven already-guarded / leave_group the 8th checker (amended). Door-by-door dispositions + the sibling-sweep record live in the migration header; the derivation matrix used at build is scratchpad-only (reproducible from the header).
- **Sibling sweep: zero invalidated** (deliberately-left set named in the header; live count was 14 write policies, not the dossier's 13 — the delta named in PC023 implementation notes).
- Contract surface recorded for H038: refusal strings `'group is resting'`/`'group is suspended'`; `get_my_enrollments` group-arm key **`group_status`**; suspended `get_group_detail` = exactly `{id, name, status}`.

### TASK-HYGA-02 / FEAT-H038 (Hub) — status `in_progress`, tranche 1 done
- Four unit suites red-first (16 red / 4 labelled of 20 at head) → **20/20; full unit 1167/1167; lint 0 errors; `next build` green.**
- W-9 user-scoped `hub.adminEntry:<user.id>` + registered invalidator · W-10 explicit wall exit ("Sign out to use another account" → `/login`) · W-8 typed SQLSTATE→HTTP in the profile BFF with honest copy + `profile.update_refused` telemetry · W-7 throttled background revalidation (soft-nav/focus/visibility, ≥30 s) + exported `requestAccountStateRecheck()` wired at the profile save 401/403.
- Found-not-caused, fenced by name: two pre-existing main lint errors (`react-hooks/set-state-in-effect`, ADM-D admin components) fixed with the house promise-chain idiom.
- One void data point recorded honestly: a bare-`jest` background run (parallel integration — unsupported invocation) failed with output lost to a tail pipe; no claim derived from it. The proper `--runInBand` integration sweep is owed at the gate close.

## Decisions / learnings this session

1. **Build resolutions on PC023** (each recorded in its implementation notes): journey-door anchors (`created_by_group_id` for self-enrol with the Mist-onboarding skip; `v_enr.group_id` unconditional for step doors), `send_message` group-kind-only guard, `retract_announcement` community-branch-only, exits carry the admin bypass arm, bookkeeping (`mark_*_read`) unguarded (chokepoint covers it), `get_group_memberships_of` untouched (listing, not content — no standalone Hub roster route exists; the minimal payload is the roster quarantine).
2. **Ownership manifest untouched-correctly** — the five new functions default to CORE via `functionOwner()` fail-closed.
3. **The classifier blocks `gh pr merge` in this session mode** — fuller-auto's merge leg needs Stefan's click here; PRs prepared and listed instead (no retry loops).

## PR ledger

**#390** PC023 schema gate — **OPEN, HELD for named approval** (red evidence + apply commands + post-apply set in the body) · **#391** H038 tranche 1 — **OPEN, green, classifier-blocked merge** · this bridge's close PR — OPEN (same classifier block).

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close (rides this PR)
- [ ] doc-health-check — not owed (no cycle boundary; cycle closes next session post-apply)
- [x] Task sweep — TASK-HYGA-01 `review` (schema gate), TASK-HYGA-02 `in_progress` (tranche 2 owed); deliberately alive
- [x] Discovery sweep — worktree clean, not ahead, nothing owed (main didn't advance; opener sweep next session syncs)
- [ ] CHANGELOG root cycle entry + `hub/CHANGELOG.md` — owed at cycle close (platform-core register entry already rides PR #390)
