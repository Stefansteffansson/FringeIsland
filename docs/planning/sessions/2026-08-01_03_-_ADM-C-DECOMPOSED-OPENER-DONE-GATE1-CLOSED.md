# Session bridge — ADM-C board settled + decomposed, opener done, PC021 gate 1 closed (incl. the row-cap amendment)

**Date:** 2026-08-01 · **Wave:** Ferd · **Area:** A-ADM (Platform-Ops) — Cycle ADM-C mid-build: gate 1 of FEAT-PC021 applied + verified; **next is gate 2's red**
**Follows:** [`2026-08-01_02_-_ADM-B-BUILT-AND-CLOSED.md`](./2026-08-01_02_-_ADM-B-BUILT-AND-CLOSED.md)

---

## READ THIS FIRST — what the next session must pick up

**Next: FEAT-PC021 gate 2, red-first — the operations family.** Gate 1 is fully closed: `admin_get_users` (jsonb array, post-amendment) + `admin_get_user_detail` applied (`20260801170000` + `20260801180000`, both on named approvals), suite **12/12**, manifest conformance **11/11**, PC021 `5-in-cycle`. Gate 2 is the cycle's heaviest precision block — **read the spec cold from disk, don't work from memory** ([FEAT-PC021 §Solution "Gate 2"](../../platform/core/features/FEAT-PC021-member-administration-contracts.md)):

- **Four re-issues** (audit writes + typed refusals + dotted audit action names): `admin_update_user_status` (`member.suspend`/`member.reactivate`), `admin_decommission_user` (`member.decommission`), `admin_hard_delete_user` (typed + `member.hard_delete`; cascade + audit-before-delete unchanged), `admin_force_logout` (typed + `member.force_logout`; mechanism unchanged).
- **Four new contracts:** `admin_exit_user_from_platform` (the full-exit walk re-derived from `delete_own_account` — three scenarios, terminal decommission with `origin='admin'`, session revocation, **no F-2 erasure legs, no profile scrub**; admin-hold targets valid), `admin_remove_member_from_group` (ADM-18, single-membership classification), `admin_grant_platform_admin`/`admin_revoke_platform_admin` (ADM-12 — grant must insert membership **and** role row explicitly: `auto_assign_deusex_role` fires only on the invited→active UPDATE flip; revoke lets the two floor triggers refuse verbatim).
- **The sibling-assertion sweep is in-scope work, not a rider** (the three-times-bitten rule): grep every suite assertion naming the four re-issued functions (COR-C W1/GC-10 producer suites; anything pinning old audit action strings like `'admin_force_logout'` or untyped refusal shapes) and list each in the migration header, adapted or deliberately left.
- **Manifest entries ride the gate PR** — gate 1 forgot them and the GC-1 gate went red (#370 fixed); gate 2's new function names go into the PC-4 declaration in the same PR.
- Stories STORY-3..8 in the spec; suite extends `hub/tests/integration/admin/member-administration-contracts.test.ts` (or a sibling file); red demonstrated between the migrations, PR held with red evidence + apply commands for the NAMED approval.
- After gate 2: TASK-ADMC-02 / FEAT-H036 (the surface, fuller-auto, red-first at the unit tier).

**Watch-items (hard-won this session):**
1. **The auto-mode permission classifier blocked `gh pr merge` and `npx eslint` via Bash** for most of the session; test/lint/grep commands ran fine through the ctx-sandbox (`ctx_execute`), and merges unblocked after Stefan's explicit ask. If it recurs: surface, offer `! gh pr merge …` or a `gh pr merge` allow-rule — never route around a denial.
2. **PostgREST db-max-rows (1000) silently truncates SET-RETURNING RPCs** — the dev DB holds 1,918 non-Mist users, so `admin_get_users`' big filters dropped rows at first contact. Platform-scale list contracts return **jsonb arrays** (scalar — outside the cap; identical supabase-js shape). Check any future set-returning admin read against this class.
3. **Manifest classification is by declaration, never by default** — a new function without its `ownership.manifest.json` entry fails the GC-1 gate red even though the `admin_*` pin binds its ownership. Entries ride the same PR as the migration.
4. **Windows `find.exe` shadows POSIX find inside the ctx sandbox too** (`find tests -name …` → "File not found"); use `grep -rl`. And **grep's exit-1-on-no-match kills `&&` chains** — use `;` separators in verification one-liners.
5. **TASK IDs need a collision check before filing** — ADM-B's session filed the changelog backfill as TASK-DOC-005 over an existing 005, and 006 was a retired ID; it now lives as TASK-DOC-007.

**Owed at the A-ADM area gate (accumulating, carried forward):** ADR-U043 perf pass (incl. `/admin`, `/admin/groups` + detail, and `/admin/members` once built) appended to the [perf ledger](../reference/PERF-MEASUREMENT-LEDGER.md) · Stefan's live walk · W12 per-RPC rows with the GC-14 composition column · the E2E-at-schema-close process question · the 398-BFF-telemetry-sites adoption criteria (H034 notes) · the deferred-five restate (ADM-7/13/14/15/17) · the AB-6 FULL anatomy audit carrying the ADR-U052 absorption · **[TASK-DOC-008](../backlog/tasks/TASK-DOC-008-platform-core-changelog-area-cycle-backfill.md)** (NEW — the second changelog backfill: ~20 area-cycle Core migrations 07-19→07-31; the narrowed register note's removal is its exit). **Cleared this session:** the two lint errors (plus a third the bridge undercounted — see below) and TASK-DOC-007.

## One-paragraph state

The ADM-C board (CB-1..5) was presented whole and settled same-day ("go with recommended, ADM-6 full exit"); decomposition ran with the payload walk against **live contract signatures** (a sub-agent walk, file:line-anchored), which surfaced five substrate findings that reshaped gate 2 — the member reads are greenfield, the two sanction contracts write no audit rows, the legacy write family refuses untyped (breaking 42501→404 existence-hiding), the exit walk survives only inside self-only `delete_own_account` (the plan's kickoff substrate line was stale and is corrected in v5), and ADM-12 is RLS-only below the API. Paired FEAT-PC021 ↔ FEAT-H036 landed 4-ready (#366); the opener landed (#367): the lint fix (three errors, not the bridge's two — `AdminGroupsList.tsx:62` was ADM-B-born and missed by that session's scoped check; all three fixed with the pure-`computeView`-plus-`.then` shape, and the groups list gained the stale-response guard) plus the TASK-DOC-007 changelog backfill (17 entries; the U038 tranches entry verified against its session bridge; the gap note narrowed, not removed — TASK-DOC-008 filed). Gate 1 then ran the full ADM-B rhythm: red 12/12 `PGRST202` → #368 named-approved + applied → post-apply 9/12 exposing the **row-cap truncation finding** (verified: 1,918 non-Mist users, 1,589 sorting before the fixture) → the jsonb-array amendment #369 named-approved + applied → **12/12 green**, byte-unchanged assertions → the GC-1 gate red on the two undeclared functions → manifest entries #370 (fuller-auto) → conformance **11/11**.

## Decisions made this session

1. **CB-1..CB-5 settled as recommended** (Stefan): no new notification kinds this cycle (dated V3 deferral, activation at ADM-D's DS-5 kind family or Eid); one cycle, two serial schema gates; ADM-6 = **full exit** (terminal decommission, deliberately without the F-2 erasure legs); audit slices ride inside PC021 (`member.*`, `platform_admin.*`); opener = lint pair + changelog backfill.
2. **Console consolidation confirmed** (Stefan's question): all admin tasks live in the one `/admin` home (the AB-7 shape); ADR-U028's woven rows are member actions whose admin halves also land under `/admin`.
3. **The five walk findings adjudicated into the specs** — gate 2 carries four re-issues + four new contracts (the "surface work only" premise narrowed, recorded in plan v5).
4. **`admin_get_users` returns a jsonb array** (first-contact row-cap finding; keyset deferred until a measurement asks about payload size).
5. **TASK-DOC-005 → TASK-DOC-007 re-ID** (collision; 006 retired); **TASK-DOC-008 filed** and the register note narrowed rather than removed — continuity is not claimed before it exists.
6. **Named-approval discipline held:** a generic "approve what you need" was bounced; gates merged only on "merge 368 + apply PC021 gate 1" / "merge 369 + apply the jsonb amendment".

## PR ledger

#366 ADM-C decomposition (held → nod → merged) · #367 opener: lint ×3 + backfill + TASK-DOC-008 (merged) · #368 PC021 gate 1 (held → named approval → applied `20260801170000` → merged) · #369 jsonb amendment (held → named approval → applied `20260801180000` → merged) · #370 manifest entries (fuller-auto).

## Verification at close

PC021 gate-1 suite **12/12** (post-amendment; assertions byte-unchanged across both reds) · manifest conformance **11/11** · at the lint fix: `eslint --quiet` clean project-wide, unit **1088/1088**, `next build` green · migrations `20260801170000` + `20260801180000` applied + repaired on the dev DB · FEAT-PC021 `5-in-cycle` (frontmatter + governance §L4 + README, in sync) · FEAT-H036 `4-ready`, untouched · TASK-ADMC-00 + TASK-DOC-007 `done`, TASK-ADMC-01 `in_progress`.

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [ ] doc-health-check — not owed (mid-cycle; no cross-cutting restructure — the TASK-DOC re-ID's links were updated in-session; next cycle-boundary run verifies)
- [x] Discovery sweep — run at close (see commit)
- [ ] ADM-C retro — folds into the area retro at the gate (standing decision)
