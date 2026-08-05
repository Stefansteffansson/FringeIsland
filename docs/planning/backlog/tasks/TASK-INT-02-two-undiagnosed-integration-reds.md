# Diagnose the two integration reds surviving the A-NTF N-C sweep

---
id: TASK-INT-02
title: Diagnose two integration reds surfaced by the N-C full sweep — stale test or real defect, per finding
status: done  # both classified STALE-ASSERTION with evidence; both fixed 2026-07-26 (A-NTF N-D open)
assigned_to: claude
priority: medium
feature: none
owner: platform/domain/communication
wave: ferd
cycle: unscheduled — do before N-D's own sweep, so its greens are readable
depends_on: []
estimated_hours: 2
---

## Description

The A-NTF N-C closing sweep ran the full integration suite: **663 passed, 3 failed** (55 suites). One was diagnosed and fixed at the close (see below). **These two were proved not-caused-by-N-C but were NOT diagnosed** — I only established they couldn't be mine, which is a weaker claim than knowing what they are.

Filed as one task because both need the same first step (decide *stale test vs real defect*) and both surfaced from one sweep; the two findings have separate acceptance criteria and may split into separate fixes.

**Why this matters more than two red tests.** With known reds in the suite, nobody can use "is it green?" as a gate — they have to know the folklore. That erosion already cost real time this cycle: the third failure (below) was misattributed to the Supabase auth incident and burned part of a session before its true cause was found. **Do this before N-D's sweep**, or N-D's own greens are unreadable.

### Finding A — `FEAT-PD008` (C-A) RIDER-1: permission-backfill invariant

> `RIDER-1 (live walk 2026-07-22) — permission backfill invariant › every Steward/Guide-template-derived role instance holds create_group_conversations`

No established connection to notifications or realtime. Note the test's own label: it came from a **live walk on 2026-07-22**, so it may be asserting an invariant that a later migration or a data-shaped change broke — or it may be catching a genuine backfill gap, in which case some role instances really are missing `create_group_conversations` and members are silently unable to create group conversations. **That second possibility is user-facing and is why this is not `low` priority.**

### Finding B — `FEAT-PD011` (C-D) STORY-6: no forum hint on a content edit

> `regression (green in the red run, labelled): a content edit emits no forum hint — the C-C topology is INSERT + tombstone-transition only`

**Ruled out as N-C's:** the assertion counts rows scoped to `topic = 'group:<id>:forum'` (`window-and-report-contracts.test.ts:347,355`), and N-C's trigger only ever emits on `account:<auth_uid>:notifications`. It is structurally impossible for the N-C emit to place a row on a forum topic.

So either the C-C forum-hint topology changed (an edit now emits where it previously did not — which would be a real behavioural regression in A-COM's substrate), or the assertion counts across a window polluted by a sibling fixture. The test is self-labelled as a regression guard that was *green in its own red run*, which is exactly the shape that rots quietly.

### Already fixed at the N-C close (context, no action)

`FEAT-PD013` STORY-2 pinned the **pre-N-B** payload key set — its own comment said *"action_data/action_taken_at deliberately excluded until N-B names their consumer"*. N-B added `action_data` to `get_own_notifications` on 2026-07-24 and **did not adapt this sibling assertion**, so it had failed ever since. Verified against the deployed contract (13 returned columns) and fixed; the constant was renamed off its cycle label. **Process note:** the house rule that a change to shipped semantics budgets sibling-suite adaptation as in-scope work was missed at N-B — worth naming in the A-NTF area retro, because the resulting red then masqueraded as an environment fault for a day.

## Acceptance criteria

- [ ] **Finding A** classified as stale-assertion **or** real backfill gap. If real: the affected role instances are identified, the gap is repaired (schema gate if a migration is needed), and the member-facing impact is stated. If stale: the assertion is corrected and its comment explains what changed.
- [ ] **Finding B** classified as real regression **or** fixture pollution. If real: the C-C emit topology is compared against FEAT-PD010's stated design (INSERT + tombstone-transition only) and whichever side is wrong is corrected. If pollution: the assertion is scoped so a sibling fixture cannot perturb it.
- [ ] Neither is "fixed" by loosening an assertion without naming what changed — a weakened guard is worse than a red one because it stops reporting.
- [ ] Full integration suite green (or every remaining red fenced **by name** with a diagnosis, not a shrug).
- [ ] If either turns out to be user-facing, it is recorded in `CHANGELOG.md` under Fixed.

## Technical notes

- Reproduce: `cd hub && npx jest --selectProjects integration --runInBand` (the full sweep; ~10 min). Per-suite is faster once located.
- Finding B's assertions: `hub/tests/integration/communication/window-and-report-contracts.test.ts:347` and `:355`.
- **Both run against the shared dev DB, where N-C's migration is already applied** — so a clean "before" control cannot be had by checking out older code. Distinguish stale-vs-real by reading the intended design (the PD010/PD011 specs and migration headers), not by trying to rewind the database.
- House rule: never run two integration suites concurrently against the shared dev DB.

## Verification

- Each finding's classification is recorded in this file with the evidence that settled it.
- `cd hub && npx jest --selectProjects integration --runInBand` — 666/666, or reds fenced by name with diagnoses.

---

## RESOLUTION (2026-07-26, at the A-NTF N-D open)

**Both findings: STALE ASSERTION. Neither is a defect. Nothing is user-facing.**
Both were classified against the deployed substrate *before* either test was
touched, so the fixes follow the diagnosis rather than chasing green.

### Finding A — classified STALE (a scale-dependent test bug), not a backfill gap

**The invariant holds.** A direct SQL set-difference over the live dev DB returned
**0 missing of 416** Steward/Guide-template-derived role instances, and both
templates still carry the `create_group_conversations` grant. **No role instance
lacks the permission, so no member was ever unable to create a group
conversation** — the user-facing possibility this task was filed to rule out is
ruled out.

**What actually failed.** The assertion is a *whole-database* invariant, so its
input set grows with every run against the shared dev DB. It fed all 416 role
UUIDs into one PostgREST `in.()` filter — a ~15.5 KB query string. Bisecting the
filter width proved the mechanism:

| role ids in filter | URL length | result |
|---|---|---|
| 50 / 150 / 200 / 250 / 300 | 2.0–11.2 KB | HTTP 200 |
| **416** | **15.5 KB** | **`fetch failed`** — died in the proxy, never an HTTP status |

supabase-js then returned `data: null`, and the test's `grants ?? []` **coalesced
the transport failure into the empty set** — so every role read as "missing"
(hence `Received length: 418`, i.e. *all* of them, which was itself the tell: a
genuine backfill gap would hit a subset). The test passed at the 2026-07-22 live
walk and rotted as the dev DB crossed roughly 350 role instances.

**Fix** (`conversation-contracts.test.ts:505`): chunk the lookup at 100 ids per
request, and **assert `error` is null instead of coalescing it away** — the
null-swallow is what let a transport fault masquerade as a permission gap. The
invariant is deliberately *not* narrowed to the suite's own fixtures: catching a
backfill gap in pre-existing groups is the entire point of the guard.

### Finding B — classified STALE (deliberately superseded upstream), not a regression

**A content edit does emit a forum hint, by design.** `trg_ds5_emit_forum_edit_hint`
exists on `public.forum_posts` (AFTER UPDATE, `WHEN (OLD.content IS DISTINCT FROM
NEW.content AND NOT NEW.is_deleted)`), added by
`20260722170000_a_com_rider3_forum_edit_hint.sql`. It is canon, not drift:
**FEAT-PD010 RIDER-3** (`FEAT-PD010-realtime-hint-emission.md:26,33`) adds
`forum_post_edited` as the third event in the forum catalogue, because the A-COM
area-gate live walk (scenario 6, 2026-07-22) found C-D's own-edit window had
shipped under a "no socket work" carry rule and an edit reached other members
only on reload.

Verified empirically before rewriting: a content `UPDATE` moved the topic's hint
count by **exactly +1**, and the stored event is `forum_post_edited`.

So the assertion was true when written at C-D (2026-07-20) and was falsified two
days later by a deliberate repair. **RIDER-3's migration header names only
`realtime-hint-emission.test.ts RIDER-3` as its guarded test — this sibling was
never adapted**, so it had failed since 2026-07-22.

**Fix** (`window-and-report-contracts.test.ts:343`): the assertion is **inverted,
not loosened** — it now pins exactly one `forum_post_edited` per content change,
scoped by `event` rather than counting the whole topic, plus a second write of
identical content asserting the `WHEN`-clause idempotency guarantee emits nothing
further. A count-unchanged guard would have been asserting a behaviour the
platform deliberately dropped.

### Verification

- Targeted: `communication/(conversation-contracts|window-and-report-contracts)` — **36/36 green.**
- **Full integration sweep, `npx jest --selectProjects integration --runInBand` (2026-07-26): 666 passed / 666 total, 55 suites, 0 failed** (688 s). This is the number the task set as its bar, and it matches the arithmetic of the N-C sweep exactly — that run was 663 passed + 3 failed = 666; one was fixed at the N-C close and these two here, so **the suite has no known reds left and no red is fenced-by-name.** N-D's own greens are readable as a gate.
- Neither fix touched a migration, a contract, or an assertion's strictness: Finding A's guard is unchanged in what it asserts (and now fails loudly on transport errors instead of silently inverting them), Finding B's is strictly stronger (event-scoped, plus an idempotency case that did not exist before).

### Findings raised by this task (not fixed here)

1. **The same process defect, three times.** N-B changed `get_own_notifications`'
   payload and left a sibling pinning the old shape (fixed at the N-C close);
   A-COM RIDER-3 changed the forum emit topology and left a sibling pinning the
   old topology (Finding B). Both were caught only by a *later* area's sweep,
   and both first read as environment faults. **This is no longer a one-off, so
   the house rule ("a change to shipped semantics budgets sibling-suite
   adaptation as in-scope") needs a mechanical check, not a norm** — e.g. a
   migration-template line requiring the author to grep the suite for
   assertions naming the changed object/topology and list them in the header.
   Routed to the A-NTF area retro.
2. **`runAdminSql` has no retry and the Management API is flaky.** Finding B's
   first reproduction failed with `upstream connect error or disconnect/reset
   before headers` from `api.supabase.com/v1/projects/{ref}/database/query` —
   not an assertion failure at all. My own probe hit the same endpoint
   successfully minutes earlier, so it is intermittent. Every comm suite that
   reads `realtime.messages` depends on this single un-retried call, so an
   infrastructure blip presents as a substrate red. Deliberately **not** fixed
   here (a shared-helper change touching many suites is out of this task's
   scope); filed for the area retro alongside `TASK-INT-01`'s sibling lesson.
3. **Test-scoped `in.()` filters are a latent class bug.** Any assertion that
   feeds an unbounded, DB-wide id set through PostgREST will rot the same way as
   Finding A. Worth a grep for `.in(` over id arrays that are not fixture-scoped.

---

**2026-08-05/06 occurrence (the WA-6 close sweeps — adjudicated):** the late-night clean full sweep ran **1033/1041** with 5 suites red. **One of the five was subsequently DIAGNOSED, not fenced:** `role-templates-contract`'s ordering cell compared the contract's case-insensitive DB collation against a bare JS code-unit sort — deterministically red the moment the first differently-cased template name existed ("Steward clone", born in the walk); adapted in-tree (labelled, user-side edit) with the collation-aware comparator, and its solo green ran WITH that fix. **The remaining four** (`announcement-contracts`, `journey-step-progress-contracts`, `member-administration-operations`, `invitation-contracts`) are the fence: **green in untouched solo controls** against the identical substrate — the deterministic theories (WA-6 fallout, leaked-fixture pollution, non-all-seed divergence) refuted for them by the controls. Failure shapes consistent with the TASK-INT-01 family degrading through a long serial sweep (a dead fixture cascading: PGRST202 on existing functions from undefined rpc args; an admin read returning empty mid-suite). The morning sweep on the same day was 1041/1041. A separate, self-caused interference run (destructive debris deletes executed DURING a live background sweep — a one-DB-consumer violation, owned in the day's bridge) produced 27 reds and is excluded from evidence.
