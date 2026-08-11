# Session bridge — Phase 4: cutover executed, W1-W6 closed, W7 ruled, W8 held, W9 partly fixed

**Date:** 2026-08-11 (session 22, second half) · **Wave:** Ferd · **Phase:** 4 — **cutover DONE, three slotted cycles in flight**
**Continues:** [`2026-08-11_03`](./2026-08-11_03_-_PHASE-4-OPENED-BOARD-SETTLED-W1-W4-W5-DONE-DELETION-HELD.md), which held the deletion at the nod. Stefan gave it.

---

> **AMENDED at session end — W7 and W8 both went further than this bridge's title says.** Both gates were executed on Stefan's named approvals: **W8 `TASK-RDA-03` is DONE** (#509, migration `20260811210000` applied, 2 red → **10/10**, groups **404/404**) and **W7 `TASK-SEAL-01`'s platform half is DONE** (#514, migration `20260811220000` applied, 6 red → **8/8**, conformance **30/30**, communication **107/107**). **Zero open PRs. Migration history verified aligned local-vs-remote for both.** What remains of W7 is the **Hub surface** that renders the sealed label — not built, and the paired follow-on. The per-workstream detail is in the [plan's trail](../hub-v2/phase-4-cutover-plan.md).

## READ THIS FIRST

1. **The cutover is complete. `hub-legacy/` is gone** — 178 files, ~40 100 lines, deleted 2026-08-11 (#502) on the named approval, gated on the W1 discharge check (zero UNACCOUNTED). **Retrievable at annotated tag `hub-legacy-final`**, verified to list all 178. **ADR-U032 is marked FULLY EXECUTED** (#505).
2. **Root is tooling-only** (#503): zero dependencies, four dev-deps (`@supabase/supabase-js`, `dotenv`, `gray-matter`, `marked`). ADR-U032's deferred half is discharged. Three dead deps dropped.
3. **W3's DoD is met on real metal, in a clean window** (Stefan killed the dev server): `npm ci` from the new lockfile, then **unit 1443/1443 · integration 1154/1154 · E2E 140 pass / 1 full-sweep-only failure**.
4. **Only one PR is open: [#509](https://github.com/Stefansteffansson/FringeIsland/pull/511), W8, HELD at the schema gate.** Nothing else is owed to close Phase 4 except the gate itself.

## What Phase 4 shipped

| W | What | State |
|---|---|---|
| W1 | Oracle discharge check | **PASSED** — zero UNACCOUNTED (#499) |
| W2 | Delete `hub-legacy/` | **DONE** (#502), tag pushed |
| W3 | Root manifest tooling-only | **DONE** (#503), full suite green |
| W4 | Deploy attestation | **DONE** — `dub1` pin proven in effect |
| W5 | DB-free CI gate | **DONE** (#496) + dashboard gate (#503) |
| W6 | Docs + doc-health | **DONE** (#504, #505, #506, #507) |
| W7 | `TASK-SEAL-01` | **RULED option A** — build not started |
| W8 | `TASK-RDA-03` | **BUILT, HELD at schema gate** (#509) |
| W9 | `TASK-E2E-02` | **PARTIAL — 3 of 5 leaks closed** (#511) |

## The four findings that mattered more than the tasks

1. **W1's live verification corrected a false premise.** The `permissions` catalog seal **holds** (RLS on, zero write policies; all 42 tables have RLS) — but the ADM-F dossier's stated reason, *"no table GRANTs"*, is **false**. `anon`/`authenticated` hold INSERT/UPDATE/DELETE/**TRUNCATE**. Right conclusion, wrong reason. Wider: the ADR-U038 table-grant narrowing is **12 of 42**, and TRUNCATE was **never in the revoke recipe**. **Not exploitable** (no PostgREST TRUNCATE verb). → [`TASK-SEC-02`](../backlog/tasks/TASK-SEC-02-table-grant-narrowing-and-truncate-sweep.md), *the gate is the deliverable, not the sweep*.
2. **W7's DoR walk killed its own build.** As ruled, the contract **could never match a row**: seals only exist in `closed` groups, the ruling scoped admin sight to `suspended`. Zero sealed rows exist, so a green suite would have proved nothing. **Stefan ruled option A** (scope `closed`) — and measurement then showed A is *exhaustive*: all five sealing paths set `closed`, none hard-deletes the group.
3. **The dashboard had been lying since June.** Counters still walked repo-root `app/` and `tests/` — **0 API routes against a real 124**, **0 test files against 294** — on the tool the session opener points every agent at. Fixed, made surface-aware, and CI now runs it.
4. **W9's instrument measured the wrong noun.** Exactly five identities leaked per sweep, always the same five, from three specs that delete groups but not the FIMs they create. Because those users **keep** their personal groups, nothing was ever *orphaned* — the orphan instrument read delta 0 (955 → 955) every sweep while the census climbed 1 289 → 2 052.

## A near-miss, recorded not buried

Deleting the tree's `.gitignore` line **un-hid an untracked Playwright auth-state file** (session tokens) and `git add -A` pushed it to a work branch. A CRLF warning caught it. Removed, history rewritten, verified absent from all reachable history. Residual: unreachable blob pending GitHub GC; contents were dev-DB test state from 2026-03-20. **Root cause fixed:** the pattern is now un-anchored `**/tests/e2e/.auth/`, because the old root-anchored form had protected **nothing** since ADR-U032. **Lesson: removing an ignore rule can *add* files.**

## Standing items — what is owed

**Needs Stefan:**
- **#509 (W8) — schema gate.** Red demonstrated (revoke succeeded; definers 1 → 0 = the brick, **confirmed** not inferred). Apply commands in the PR body. **No repair pass owed** — the 3 938 personal + 3 system groups without a protected-permission definer are BY DESIGN.
- **The `e2e-%` purge** (2 052 fixtures). Its one named risk is cleared: census-dependent cells need > 200; purging leaves ~927.
- **W7 build** — ruled and unblocked, not yet decomposed.

**Carried:** W9's remaining 2 of 5 (UI-created identities in `onboarding-arrival`/`transcendence`) · TASK-E2E-03's audit, now with **two more observations: the full-sweep failure MOVED** (`profile.spec` → `invitation-bell-answers`), both green isolated — one observation each, **not called flake** · G-3 · `ROADMAP.md` (Eid) · the done-sweepable tension (Ferd retro) · AC4-O1 watch.

**Not Phase 4:** the Ferd wave close — a human-verified DoD walk; `waves/ferd.md` is still a stub.

## Close ritual

- [x] Cutover executed on the named approval; tag verified; ADR-U032 marked executed
- [x] Full suite run in a clean window; results recorded honestly incl. the one moving failure
- [x] doc-health run (2 critical, both closed) + all follow-ups fixed
- [x] Dashboard refreshed (and repaired); session bridge (this file); discovery synced
- [ ] **#509 held at the schema gate — awaiting the named nod**
