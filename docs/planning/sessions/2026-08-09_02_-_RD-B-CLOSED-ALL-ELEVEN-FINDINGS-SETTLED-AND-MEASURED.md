# Session bridge — RD-B closed: eleven walk findings settled, four migrations, and a measurement pass

**Date:** 2026-08-09 (session 14, continued) · **Wave:** Ferd · **Cycle:** RD-B (**CLOSED**)
**Continues:** [`2026-08-09_01_-_RD-B-WALKED-TEN-FINDINGS-TWO-ACS-HAD-SHIPPED-UNBUILT.md`](./2026-08-09_01_-_RD-B-WALKED-TEN-FINDINGS-TWO-ACS-HAD-SHIPPED-UNBUILT.md) — that bridge was written mid-session and stops at the walk fixes. **This one supersedes its "Next" and "Standing items".**

---

## READ THIS FIRST

1. **RD-B is closed.** `FEAT-H044` and `FEAT-PC028` both `6-done`. Six PRs merged and verified by `mergedAt` + ancestry + content on `origin/main`: **#453, #454, #455, #456, #457, #458**.
2. **Four migrations applied**, each on a named approval and each **verified against the live catalogue rather than trusted**: `20260807140000` (PC028 STORY-8 corrective), `20260808120000` (W-8 notice copy), `20260809100000` (W-6 reach preview), `20260809140000` (W-6 grant corrective).
3. **All eleven walk findings are settled** — eight fixed, three recorded as open questions with owners. Table below.
4. **Three things are open and none is RD-B's:** `TASK-SEC-01` (new, high — a real structural hole), the deeper half of `TASK-E2E-04`/W-7, and `TASK-INT-03`, which now has a clean single-instance reproduction.
5. **The RD-B re-walk has NOT been done.** Six surfaces changed after Stefan's walk; nobody has driven them.

## The eleven findings

| | Finding | Outcome |
|---|---|---|
| W-1 | Notices landed at the top of the group page, six sections above the roles panel | fixed — `?focus=roles`, expand + scroll + ring |
| W-2 | The section was stricter than the panel it lived in | ruled + fixed — **amends STORY-1's AC** |
| W-3 | Opened with four nothing-to-do rows; empty state unreachable | ruled + fixed — actionable only |
| W-4 | *"0 members hold this role. They keep the role…"* | fixed |
| W-5 | **Publish to named groups was never built** — an AC shipped `6-done` | fixed — the picker |
| W-6 | The publish ceremony never stated its blast radius | ruled + fixed — preview contract |
| W-7 | Cell C3 fans out across the whole group table | **half fixed**; the deeper half is open |
| W-8 | **The notices never named their group** — an AC shipped `6-done` | ruled + fixed (migration) |
| W-9 | A guaranteed refusal was offered as a button | ruled + fixed — under **RD-A's** story |
| W-10 | A clone can never leave the catalogue | **OPEN** — observation, unruled |
| W-11 | No bulk withdraw; *"all groups"* meant only the platform-wide row | fixed — labels state their own scope |

## What this leg is actually about

**Two acceptance criteria had shipped `6-done` unbuilt** (W-5, W-8), and Stefan found both in his first two clicks. They share one root cause, recorded in the previous bridge and worth repeating because it now has a third instance:

> **A fixture that invents a payload the substrate never produces.** The test proves the surface renders a distinction correctly; the distinction does not exist upstream.

The two rules that came out of it are now in the suite: **server-authored copy is checked against the migration's literal**, and **a feature that adds a write door needs one test reaching the state through that door**.

**The third instance is the grant.** `20260809100000` created a function and granted EXECUTE to `authenticated` without the paired `revoke … from public, anon`. Verifying the live catalogue caught it — the same step that caught the PC028 widening and the notice literals. **Three times in one cycle, the post-apply check found something the migration did not say.** That check is now the single highest-yield habit in this workflow.

## TASK-SEC-01 — the finding under the grant, which is not mine

`anon-execute-lockdown.test.ts` states its migration *"fixes the DEFAULT PRIVILEGES so future functions never inherit the grant."* `pg_default_acl` has **two** entries for `public` functions:

| Creating role | Default grant |
|---|---|
| `postgres` | `authenticated`, `service_role` — **no anon** ← the lockdown's fix |
| `supabase_admin` | **`anon`**, `authenticated`, `service_role` ← Supabase's default, untouched |

`ALTER DEFAULT PRIVILEGES` is **per creating role**. `apply-migration-temp.js` — the documented apply path — posts to the Management API, which runs as `supabase_admin`.

**So every function created through our normal apply path inherits `anon` EXECUTE.** PC028's five contracts are clean only because that migration wrote explicit revokes for each. The docstring's claim is what let this ship: it tells the next reader new functions are safe by construction, and they are not.

Nothing is exposed today (every such function is gated), but the shape is wrong: a future function whose own body *is* the authorization — the `_erase_mist` shape the 2026-07-06 audit found — would be anon-reachable from apply until someone ran the suite.

## The measurement pass (ADR-U043)

Run during an hour Stefan was away, which is the scarce ingredient — Amendment 1 needs ≥20 min of enforced zero traffic. Two windows held, 22m20s and 22m40s.

| | Measured | Ceiling | |
|---|---|---|---|
| `/notifications/preferences` cold | 5 538 ms | ≤ 2 500 | FAIL 2.2× — standing labelled exception |
| **`/groups/<id>` cold** → roles panel | **2 433 ms** | ≤ 2 500 | **PASS**, 67 ms |
| `/groups/<id>` warm, fresh context | 521 ms | ≤ 1 000 | PASS, 479 ms |
| soft-nav warm, both pages | 248–327 ms | ≤ 1 000 | PASS, wide |

**No RD-B regression.** The page RD-B changed passes cold with room, so the Suspense boundary added for `?focus=roles` costs no first paint.

**A comparison retracted before it travelled:** 5 538 ms read against A-ADM's *"3.6–4.4 s"* says RD-B regressed the cold path. A-ADM measured **admin pages**. Against the same page, A-NTF recorded 5 864 ms and 5 142 ms — today sits between them. Same error class the A-NTF pass caught in itself, new shape.

**Not measured:** `/admin/roles/<id>`. Reaching it needs the measurement FIM elevated to platform admin, which is not a thing to create unattended. Recorded as a gap.

## TASK-INT-03 reproduced, with an id

The perf harness's `teardown` reported *"done"*. The database disagreed: auth user erased, three engagement groups erased, **the personal group survived** — no owning `users` row, still holding **2 memberships and 10 notification rows**. `e378c1b5-…`, 47-minute lifetime, one known creator.

**Left in place deliberately** — deleting it destroys the cleanest reproduction of this leak that exists, and a destructive write was not mine to make unattended.

It links two threads: orphaned personal groups holding notifications are what inflate `public.notifications`, and that table is the prime suspect in W-7 / `TASK-E2E-04`, where emission assertions fail in fleet, pass in isolation, and pick a different victim each run. **If the volume hypothesis holds, INT-03 is the upstream cause and E2E-04 closes through it.**

## Standing items

- **The RD-B re-walk** — six surfaces changed since Stefan walked: the available-roles section (W-2/W-3), the picker (W-5), the blast-radius sentence (W-6), the notice landing (W-1), the notice copy (W-8), the bulk withdraw (W-11). None has been driven.
- **`TASK-SEC-01`** (high, new) · **`TASK-E2E-04`** (high, reproduced, both tiers) · **`TASK-INT-03`** (now with a reproduction).
- **W-10** — clones can never leave the catalogue. Unruled.
- **Option C for W-11** — a dedicated `admin_unpublish_all_role_template_reach` contract remains the tidier shape; the current fix closes the defect without a gate or a semantic change.
- **A seventh API read appeared on `/notifications/preferences`** (A-NTF recorded six). Nothing in RD-B touches that page.
- Carried: **AB-6's docket** · the `done`-no-longer-implies-sweepable tension · the deferred Eid piles · the G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` · the `hub/SPECIFICATION.md` → `./ROADMAP.md` registry placeholder.

## Numbers at close

Unit **1413/1413** (170 suites) · integration **1119/1119** (76 suites) · lint 0 errors (3 pre-existing warnings) · `next build` green · E2E **134/136**, both failures fleet-only, green in isolation, filed under `TASK-E2E-04`.

## Next

**The RD-B re-walk**, then `TASK-SEC-01`, then **AB-6** and Phase-4 cutover. `TASK-INT-03` is worth taking before E2E-04, since it is plausibly upstream of it.

## Close ritual

- [x] Four migrations applied on named approvals; **every one verified against the live catalogue afterwards** — which caught three things the migrations did not say
- [x] All eleven walk findings settled: eight fixed, three recorded with owners
- [x] Every inverted test cell labelled as a ruled behaviour change, never a weakening
- [x] ADR-U043 pass with two genuine deep-cold windows; a false-regression comparison retracted before it travelled
- [x] Six PRs merged and verified by `mergedAt` + ancestry + content on `origin/main`
- [x] Three CHANGELOGs kept current throughout
- [x] Dashboard refreshed (829 files); discovery worktree clean and in sync (0/0) at open and close
- [ ] **The re-walk is owed** — the surfaces changed after the walk that found them
