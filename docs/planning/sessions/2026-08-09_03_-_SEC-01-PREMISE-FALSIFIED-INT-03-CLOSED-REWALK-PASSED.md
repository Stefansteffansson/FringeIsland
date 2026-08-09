# Session bridge — a premise falsified, a leak's real source found, and the re-walk passed

**Date:** 2026-08-09 (session 15) · **Wave:** Ferd · **Cycle:** none active (RD-B closed)
**Continues:** [`2026-08-09_02`](./2026-08-09_02_-_RD-B-CLOSED-ALL-ELEVEN-FINDINGS-SETTLED-AND-MEASURED.md) — **supersedes its "Next" and its open close-ritual item.**

---

## READ THIS FIRST

1. **The RD-B re-walk is DONE and PASSED.** All six changed surfaces behave as ruled; no regressions, no new findings. The previous bridge's one unticked box is discharged. See [`2026-08-09-rd-b-rewalk-findings.md`](../hub-v2/2026-08-09-rd-b-rewalk-findings.md).
2. **`TASK-SEC-01`'s stated premise was wrong — and the defect it describes is real.** Both halves matter; the remedy it proposed would have changed nothing.
3. **`TASK-INT-03`'s real source was found, attributed and fixed** — one function orphaning up to 200 groups per E2E run.
4. **Three PRs merged and verified** (`mergedAt` + content on `origin/main`): **#460, #461, #462**. **#463 is held** for a named nod.
5. **Three things need Stefan and nothing else:** the **RD-4a amendment**, the **SEC-01 governance call**, and the **2 688 existing orphans**.

## TASK-SEC-01 — the hole is real, the cause was not (#460)

The task said new functions inherit `anon` EXECUTE *because migrations apply as `supabase_admin`*, and proposed setting `ALTER DEFAULT PRIVILEGES` for that role.

**Measured through the real apply path**, a throwaway function created with no grant line came out
`{=X/postgres, postgres=X, authenticated=X, service_role=X}` — **`anon_exec = true`**.

Three claims died:

| Claim | Verdict |
|---|---|
| "migrations apply as `supabase_admin`" | **false** — `current_user` and `session_user` are both `postgres`; all 226 public functions are owned by `postgres` |
| the 2026-07-06 lockdown "fixes the DEFAULT PRIVILEGES so future functions never inherit the grant" | **false** — the docstring AC-2 names |
| `20260727120000` §3 "THE PREVENTION" prevents recurrence | **false** — its statement *did* take effect on the stored row, and the created function got PUBLIC anyway |

Postgres applies its built-in `EXECUTE TO PUBLIC` for functions **on top of** the `pg_default_acl` row. **No `ALTER DEFAULT PRIVILEGES` statement can close this**, so the per-migration `revoke all … from public, anon` is load-bearing, not belt-and-braces. N-D's seven and RD-B's W-6 were the class firing, not two omissions.

**The structural fix is unavailable — probed, not assumed.** An event trigger needs superuser; `postgres` is not one here (`rolsuper = false`) and all six event triggers belong to `supabase_admin`.

> **The trap worth carrying:** reading `pg_default_acl` and reasoning forward gives the **opposite** of what the server does. It produced the wrong diagnosis twice, mine included. AC-1 was right to demand a *created object*. **Verify by creating, never by reading the default ACL.**

Shipped: the lockdown docstring corrected · the revoke rule in `docs/platform/CLAUDE.md` as load-bearing · the schema gate now reads the **applied** function's ACL, not the migration text · task file and index row rewritten (both carried the falsified mechanism). `20260809140000`'s wrong `service_role`/PUBLIC claim was **deliberately left** — applied migrations are the audit record.

## TASK-INT-03 — attribution first, then the fix (#461, #462)

**The harness half (#461).** `perf-measure.mjs` deleted the personal group before the auth user and discarded the result. Demonstrated red then green against the harness itself: baseline 5 765/2 688 → **2 689 after a setup+teardown that printed `teardown: done`** → delta 0 after the fix.

**Then the real question.** The task's AC closed at **674** orphans on 2026-07-29; today **2 688**. ~2 000 in 11 days, so the delta-zero check never saw the live source.

**Ruled out before fixing anything** — measurement, not reading:

| Path | Verdict |
|---|---|
| `_erase_mist` · `explicit_erase_mist` | correct — auth first, then group |
| `reap_expired_mists` | correct — 1 175 runs, 105 erased, **0 skipped** |
| integration tier | bracketed: 12 suites / 35 tests, **delta 0** |

**The source:** `cleanupAnonymousUsers` lists **every** anonymous user (`perPage: 200`) and orphaned each one's group. Three Mist specs call it — so **every E2E run orphaned up to 200 groups**. The same defect sat in **three** helpers plus **24 direct spec teardowns**; the non-Mist orphan names (`Grace`, `HygaStella`, `H023`, `GB`, `JA`) are E2E fixtures exactly.

**Fourth instance of one defect** — `cleanupTestUser` (07-28), `perf-measure.mjs`, now the E2E tier. Each re-diagnosed from scratch **because nothing counted orphans.**

Fixed with one verifying primitive, 24 call sites across 21 specs routed through it, 4 regression tests (one pinning *why* the order is mandatory), and — the piece that matters most — **an orphan leak instrument in E2E global teardown that fails the run on growth.**

## W-10 specced, and it amends settled law (#463 — HELD)

Stefan asked whether retired templates can just be deleted. The question contains **two problems**, and the spec splits them so the bigger half isn't held hostage:

- **Display** (`FEAT-H045` STORY-1) — retired collapse behind `Retired (N)`. **No platform dependency; ships alone.**
- **Retention** (`FEAT-PC029` + H045 STORY-2) — a guarded delete for the never-offered mistake clone.

**The gate:** RD-4 (*"retire only, never delete"*) is settled law, confirmed aloud at the RD-A kickoff. Written as narrow amendment **RD-4a** rather than a silent contradiction, per the decomposition skill.

**Measured, not assumed:** the FKs would **not** stop an unguarded delete — `group_roles.created_from_role_template_id` is **SET NULL**, so provenance would be severed silently.

**The payload walk found a gap at spec time** — the PC028 lesson applied early: `retired_at` is already served (STORY-1 needs nothing), while `deletable` is **not derivable** client-side and must be served explicitly.

## Standing items

- **RD-4a amendment** · **SEC-01 governance call** (record the apply-to-suite window as an accepted risk with an owner — it has cost three cycles) · **#463 merge nod** (platform/core carve-out).
- **The 2 688 existing orphans** — a separate delete decision with its own blast radius, deliberately not folded into a fixture fix.
- **The RD-B walk script is now a historical record, not a procedure.** It documents defects that are fixed; driving it again will mislead. A walk script expires when its findings ship.
- **`TASK-E2E-04`** — if the volume hypothesis holds, INT-03's instrument now stops the inflation at source; the existing rows still sit under it.
- Carried: **AB-6's docket** · Phase-4 cutover · the `done`-no-longer-implies-sweepable tension · deferred Eid piles · G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` · the `hub/SPECIFICATION.md` → `./ROADMAP.md` placeholder (still the only broken link in the touched set — 347 checked, 1 broken, pre-existing).

## Numbers at close

New INT-03 regression suite **4/4** · `anon-execute-lockdown` **9/9** · integration `auth` **12 suites / 35 tests** green · eslint clean · **0 new `tsc` errors** against the 968-error test-tier baseline (`TASK-DBT-01`) · orphan count held at **2 688** across every run after the fix · dashboard refreshed (833 files) · discovery worktree clean and **0/0** at open and close.

## Next

**#463's nod and the RD-4a call**, then `TASK-E2E-04` (now that its suspected upstream is closed), then **AB-6** and Phase-4 cutover.

## Close ritual

- [x] Dashboard refreshed (833 files)
- [x] Discovery swept — clean at open, `main`→`discovery` synced at close, **0/0**
- [x] Link check over every touched file — 347 links, 1 broken and pre-existing
- [x] Three PRs merged and verified by `mergedAt` + content on `origin/main`; branches deleted
- [x] **The re-walk owed by the previous bridge is discharged — and passed**
- [x] Every claim in this bridge measured against the live catalogue or a test run, not carried from the file that asserted it
- [ ] **#463 held** — awaiting a named nod and the RD-4a ruling
