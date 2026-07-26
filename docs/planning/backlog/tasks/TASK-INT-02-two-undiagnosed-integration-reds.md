# Diagnose the two integration reds surviving the A-NTF N-C sweep

---
id: TASK-INT-02
title: Diagnose two integration reds surfaced by the N-C full sweep — stale test or real defect, per finding
status: todo
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
