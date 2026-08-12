# Session bridge — Phase 4 closed, dev DB reset and seeded, test teardown made compliant

**Date:** 2026-08-12 (session 23) · **Wave:** Ferd · **Phase:** 4 — **build work COMPLETE**
**Continues:** [`2026-08-11_04`](./2026-08-11_04_-_PHASE-4-W1-W6-CLOSED-W7-RULED-W8-HELD-W9-PARTIAL.md), which left W7 ruled and W8 held.

---

## READ THIS FIRST

1. **Phase 4's build work is done.** W7 (`TASK-SEAL-01`) and W8 (`TASK-RDA-03`) both closed through their schema gates on named approvals; W9 (`TASK-E2E-02`) was overtaken by the reset below. The remaining Phase-4 item is the **gate itself**, not more building.
2. **The dev database was deliberately reset to a clean start** and is now: **1 account** (`deusex@fringeisland.com`), **4 system groups + DeusEx's personal group**, **4 journeys / 18 steps**, and **zero** of everything else. Stefan will hand-create **5 test users** from here.
3. **Test suites now clean up after themselves** — the full integration suite is **1172/1172 green across 83 suites**, and the teardown reports *"Clean — every fixture was torn down by its own suite."* The database returns to exact baseline after a full run.
4. **`TASK-DM-01` is RULED and is the next session's work** — content-level tombstone. The ruling and its reasoning are in the task file; do not re-litigate it, and do NOT reason from the forum precedent (see below).

## What Phase 4 finished

| W | What | Outcome |
|---|---|---|
| W7 | `TASK-SEAL-01` — sealed-thread admin sight | **Platform half DONE** (#514). Surface half NOT built — paired follow-on |
| W8 | `TASK-RDA-03` — grant-flip lockout guard | **DONE** (#509). Brick confirmed end-to-end before the fix |
| W9 | `TASK-E2E-02` — fixture leak | **Superseded** by the full reset; the leak class is now closed structurally |

## The dev-DB reset — what it cost and what it taught

Wiped on instruction for a clean Hub v2 start: all users except DeusEx, all engagement groups, all journeys **except the onboarding walk**, custom role templates, and all logs. Seeded three starter journeys — one per founding question (*Who am I? / What do I want? / How do I get there?*) — as [`supabase/seeds/06_starter_journeys.sql`](../../../supabase/seeds/06_starter_journeys.sql), owned by the DeusEx system group so they survive any future user purge.

**Two things did not fall out with their owners**, and a group-scoped wipe would have missed both:
- **Direct-message conversations are not group-anchored** (`group_id IS NULL` for `kind='dm'`), so 557 threads and 1 123 messages survived the deletion of every group and every account — reachable only through participants who no longer existed.
- **379 consent records had no subject group at all**, so their `ON DELETE RESTRICT` never engaged.

**One real casualty, recorded honestly:** the manual persona **Gracy** was deleted. The scoping rule was "everything on `.test` is a fixture", and she was a hand-made persona on that domain. Her group survived (the last-Steward trigger refused it) and she could have been restored, but the subsequent full reset took it. The lesson is in the sweep's scoping comments: *spare anything that isn't machine-shaped*, not *spare what I can prove is in use*.

**A near-miss:** deleting an ignore rule un-hid an untracked Playwright auth file holding session tokens, and `git add -A` pushed it to a work branch. Caught by a CRLF warning, removed, history rewritten. **Removing an ignore rule is not inert — it can add files.**

## Test teardown: cleanup is now part of testing

The E2E tier had leak instruments since TASK-INT-05; the **integration tier had no global hooks at all**. Four shared defects, each hidden behind a swallowed error:

1. **Journey-restrict chain** — `cleanupTestGroup`/`cleanupTestUser` did a bare `journeys.delete()`, impossible once a journey has been walked (progress rows RESTRICT steps; journeys RESTRICT the group). Swallowed twice. Kept the HYGA fixtures alive since August.
2. **55 Mists** — `signInAnonymously()` … `signOut()` ends the *session*, not the user; a Mist has no email so no `test-*` pattern could see it.
3. **Orphaned DM threads** — the TASK-DM-01 mechanism inside the harness.
4. **A type error `ts-jest` cannot catch** — two admin specs passed the whole `TestUser` to `cleanupTestUser`, which takes an auth user id. Five silent no-ops. **Only `next build` type-checks this repo.**

**Then the clean database exposed four tests that had been passing on clutter rather than correctness** — the member-enumeration census cells, PD003's migrated-journey guard, PC022's cross-suite audit dependency, and PD013's reliance on the planner choosing an index. All now assert the real invariant.

**Instrumentation lesson worth keeping:** the first per-file sweep used the **management API** and earned `ThrottlerException` across 83 files. A throttled teardown is worse than none — its uncleaned residue is attributed to the *next* slice, which is how a re-check blamed `account` for 77 accounts belonging to `admin`.

## NEXT SESSION — `TASK-DM-01`, ruled

**Ruling: content-level tombstone.** The departed member's message bodies are replaced with a removed-marker; the thread shape and the survivor's own words stay.

**Why not author-level** (the reasoning matters more than the choice): it is *already* the live behaviour — the DM sender map resolves departed authors to *Former member* — so choosing it would have been a **no-op** leaving the Article 17 exposure untouched. And anonymising a name in a **two-party** thread obscures nothing: the survivor knows exactly who they were talking to. **The forum precedent (ADR-U021, posts remain) must NOT decide this by analogy** — a forum post is communal, with other participants' legitimate interest in an intact thread; a private DM has no such argument.

**Owed at build:** cascade specification (ADR-U016) across self-delete, admin exit, hard delete, Mist expiry and the last-participant case · correction of `admin_hard_delete_user`'s **false cascade comment** (it documents a cascade that does not happen for DMs) · the gate + instrument. Schema-gated: hold at the migration gate.

## Standing items

- **`TASK-SEC-02`** — table-grant narrowing is 12 of 42 and TRUNCATE was never in the revoke recipe. Not exploitable; the **gate is the deliverable, not the sweep**.
- **Subject-less consent** — swept per run (containment), but whether such a row should be creatable at all (`NOT NULL`) is open, filed under TASK-DM-01.
- **SEAL-01's surface half** — the Hub admin rendering of the sealed label.
- **Admin conversation sight now has two homes** — suspended-scope still lives in the member contract (FEAT-PC026). Pre-existing; worth an anatomy note.
- **Ferd wave close** — a separate human-verified DoD walk; `waves/ferd.md` is still an empty stub.
- Carried unchanged: G-3 · `TASK-E2E-03` · E2E-04's integration half · `ROADMAP.md` at Eid kickoff · the done-sweepable tension · AC4-O1 watch.

## Close ritual

- [x] Phase-4 W7/W8 gates executed on named approvals; zero open PRs
- [x] Dev DB reset, seeded, and verified at baseline by query (not by running suites — a suite run is itself a data-creating event)
- [x] Full integration suite 1172/1172; teardown reports Clean
- [x] `TASK-DM-01` ruled and recorded with its reasoning
- [x] Dashboard refreshed; discovery synced; session bridge (this file)
