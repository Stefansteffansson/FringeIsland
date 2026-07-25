# Session bridge — FEAT-PC002 notes backfilled; the missing-notes class closed (#280)

**Date:** 2026-07-25 (session 01) · **Wave:** Ferd · **Area:** none — a process session between A-NTF cycles
**Follows:** [`2026-07-24_02_-_A-NTF-N-B-CLOSED-E2E-GREEN-MERGED.md`](./2026-07-24_02_-_A-NTF-N-B-CLOSED-E2E-GREEN-MERGED.md)

---

## One-paragraph state

A process session, no build work. The N-B doc-health run's one critical finding — `FEAT-PC002` at `6-done` with no Implementation notes — is **resolved**, and the finding class behind it is **closed**. The notes are backfilled from the shipped record; the whole-tree Section 5 sweep both filings asked for has been run (**62 `6-done` specs, PC002 the only hit**); and three process edits stop the class recurring. Investigating the finding turned up something worse than the finding: it had **already been filed** at the A-JRN boundary as `TASK-DOC-004` and was re-filed six days later as `TASK-DOC-006`, because the audit does not read the backlog before writing findings. PR **#280 is merged**, `main` is at `622dfcb`, working tree clean, `discovery` re-synced. **A-NTF N-C has not opened; nothing is in flight.**

## What this session actually found

The presenting problem was "one `6-done` feature has no record of what was built, and others might too." Both halves turned out to be wrong in useful ways.

- **"Others might too" — no.** One command over all 62 `6-done` specs: PC002 was the **only** spec missing its notes. The scare cost four seconds to close and did not need a standing task.
- **The audit did not miss this — it missed *remembering* it.** `TASK-DOC-004` (A-JRN boundary, 2026-07-18, `assigned_to: claude`, indexed in the standing-tasks table) and `TASK-DOC-006` (A-NTF N-B boundary, 2026-07-24) are the same finding filed twice. Both recommended a whole-tree sweep; **neither performed it**. A duplicate filing reads as diligence while destroying the age signal on the original — which is the only evidence that something is being ignored.
- **The root cause is one line of the skill.** Section 5's skip clause — *"Skip if: no new feature specs written and no specs advanced maturity since last check"* — made it an in-cycle-only check. PC002 closed inside a cycle, and every later run skipped it **because it had not changed**. An unchanged `6-done` spec is exactly the case that hides a missing-notes hole permanently: the notes were owed at close, and nothing will ever touch the spec again to pull it back into a narrowed scan. It hid from 2026-06-27 to 2026-07-18 through that hole, and the whole-tree pass did not actually run until today.

## What shipped (PR #280, merged 2026-07-25, `622dfcb`)

**The instance**

- `FEAT-PC002` carries `## Implementation notes (6-done — 2026-06-27; retroactively backfilled 2026-07-25)`, reconstructed from the shipped record **only** — the five migrations, four integration suites, both 2026-06-27 build bridges, closing commit `5cdd77b`. It labels itself a backfill and marks two items *unrecorded* rather than guessing them (per-task test counts at close; the absent-by-convention standalone CHANGELOG line — a platform half's record lives in the paired product entry, which is the house convention, not an omission).
- **Five deviations from the solution sketch** are named, because a spec that only records intent is not a record of what was built:
  1. One shared erasure primitive (`_erase_mist`), not two paths — and its cascade **order** is load-bearing (journeys → `auth.users` → proto group, dodging the `personal_group_id` SET-NULL immutability trigger).
  2. The reaper↔transcendence race guard is **inactivity + `FOR UPDATE SKIP LOCKED`**, not the sketched in-flight-migration marker column. Same invariant, no new column.
  3. `consent_records` has **no write policies at all** — `SELECT`-own only, every write through a SECURITY DEFINER path, the trigger refusing UPDATE/DELETE except under the controlled `app.consent_erasure_in_progress` bypass.
  4. FIM account-erasure landed **admin-gated** (`manage_all_groups`), and anonymise-first is **structural**: the consent FK `ON DELETE RESTRICT` blocks a raw delete, so the subject link must be NULLed before teardown. This finalises ADR-U034 §5 / resolved spec question 3.
  5. The reaper↔consent boundary became **enforceable** — `erase_fim_account` refuses `is_temporary = true`, so the two erasure paths cannot reach the same row by construction.
- Also recorded: both **pass-at-red catches** (the rollback test that passed at red because a missing function leaves the same observable state as a real rollback, strengthened to assert `23502`), and the **split V4 sink** (`reaper_runs` DB-side, because pg_cron has no Hub to emit from).

**The class**

- **`doc-health-check` Section 5 step 6** — now a whole-tree mechanical sweep with the command inline, **explicitly carved out of the section's skip clause**, with the PC002 history as the worked example so a future session reads the *why*, not just the rule.
- **`doc-health-check`, new pre-filing step** — every would-be backlog item is diffed against the open tasks first. A still-open match is a **re-find, not a new finding**: append a dated line, bump priority, name it in the retro as carried. Never a second id. The output format gained a `Re-finds (escalated, not re-filed)` block.
- **`PROCESS.md` §3** — **backlog triage** is now a named cooldown step. A task surviving two boundaries is bet on, re-scoped, or dropped with a reason. Visibility alone does not make anyone look; this is the read-point that gives the re-find rule teeth.
- `TASK-DOC-004` → `done` with the resolution + verification command. `TASK-DOC-006` **deleted** as a duplicate.

## Process notes worth keeping

- **A merge is not verified by its side effects.** I read a successful `git branch -d` as confirmation that #280 had merged. It had not — `-d` succeeds when a branch is fully pushed to its *upstream*, not only when merged into `main`. Two rounds of "merged it" passed before a direct `gh pr view` check caught that `origin/main` was still at `fe6796b`. **Verify a merge by the PR's `mergedAt` plus an ancestry or content check on `origin/main`** — never by a local branch operation succeeding.
- **Content checks beat sha checks** when a squash or rebase merge is possible: `git show origin/main:<path> | grep` answers "did the work land" even when the shas differ.
- **Git Bash mangles `origin/main:.claude/...`** — MSYS path conversion turns it into `origin\main;.claude\...` and the `git show` fails, which reads as a false negative (it reported `Re-finds: 0` on a file that was correct). Read from the working tree after pulling, or use `git grep <pattern> <rev> -- <path>`.
- **"Found, not caused" is right to fence, but filing is not resolving.** The N-B run correctly refused to write PC002's notes blind — it had no business inventing a cycle it wasn't part of. What it got wrong was treating the filing as closure of its own obligation. Reconstructing from the record with honest *unrecorded* labels was a reading task the whole time, and both task files already specified exactly that in their acceptance criteria.

## Ritual checklist

- [x] `npm run dashboard` — regenerated (7 tabs, 715 files indexed)
- [x] Section 5 sweep re-run on merged `main` — clean, 62 `6-done` specs, zero missing notes
- [x] Deletion hygiene — every surviving `TASK-DOC-006` mention is a deliberate historical reference; the N-B bridge's live pointer carries a **Superseded 2026-07-25** note so no future session hunts a deleted file
- [x] `TASK-DOC-004`'s "held for Stefan's nod" line corrected — the skill change merged in the same PR
- [x] Full `doc-health-check` run **not** performed — no renames, schema migrations, or restructures this session; the one section touched (5) was verified directly
- [x] Discovery sweep — worktree clean and not ahead; `main` merged back into `discovery` and pushed
- [x] Session bridge written (this file)

## Where the next session starts

Nothing is in flight. Per the previous bridge, **A-NTF N-C has not opened** and carries the orphaned bundle slice plus the FEAT-PC016 consumer question. Read [`2026-07-24_02`](./2026-07-24_02_-_A-NTF-N-B-CLOSED-E2E-GREEN-MERGED.md) for that scope — this session touched no feature work and changes none of it.

Standing tasks now open: `TASK-MIST-01`, `TASK-DOC-003`, `TASK-DOC-005`, `TASK-OBS-01`, `TASK-E2E-01`, `TASK-FORUM-01`. Under the new PROCESS.md §3 step, **N-C's boundary is the first triage that must walk them** — `TASK-DOC-003` and `TASK-OBS-01` have both been carried since A-JRN and are the first candidates for bet-or-drop rather than a third silent carry.
