# The N-D suppression PAIR test is intermittent in fleet, green in isolation

---
id: TASK-INT-04
title: "FEAT-PD016 'PAIR: a muted category is not delivered AND an unmuted sibling still is' fails ~2 runs in 5 when the notifications directory runs together"
status: open
assigned_to: unassigned
priority: medium
feature: FEAT-PD016
owner: platform/domain/communication
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 2
---

## What happens

`tests/integration/notifications/preference-and-dispatcher-contracts.test.ts` → STORY-2 → *"PAIR: a muted category is not delivered AND an unmuted sibling still is"* fails intermittently when the whole `tests/integration/notifications` directory runs, and passes reliably on its own.

**Observed 2026-07-28, A-NTF area gate: 2 failures in 5 full-directory runs (89/89 on the other three). 25/25 green in isolation, repeatedly.**

## Why it is filed rather than dismissed

It was called a fleet flake on the first occurrence, on the strength of one isolation pass and one clean re-run. **That call was premature and the second failure retracted it.** Two failures in five runs is not a flake profile; it is an order- or state-dependent defect that happens to pass more often than it fails. Filed so the next person does not repeat the dismissal.

## What is known

- The test mutes `membership` for its own member, then inserts a muted-category row and a control-category row, asserting the first is suppressed and the second is delivered.
- `MUTED_KIND` was changed at this gate from `invitation_received` to `member_left`, because `invitation_received` moved to the non-suppressible `asks` category (migration `20260727180000`, board GB-3). **The intermittency was first observed after that change**, which makes the new constant the prime suspect — but it is a suspect, not a diagnosis. It was not confirmed, and the failure detail was never captured on a failing run.
- Both halves of the PAIR are candidates. Which one fails is **not yet known** — every attempt to capture the assertion output landed on a passing run.
- `member_left` is emitted organically by real membership changes (`leave_group`, member removal), so a plausible mechanism is a sibling suite's teardown emitting a `member_left` to this member between the baseline read and the assertion. Muting should suppress it — unless the emission lands before the preference row is written.

## Acceptance

- [ ] Capture the actual assertion failure on a failing run (loop the directory until it fails, preserving full output) — **do not** proceed on the hypothesis above without it.
- [ ] Name which half fails and why, in one sentence that a later reader can check.
- [ ] Fix the cause, not the symptom. Do not weaken the PAIR discipline: the paired assertion is what makes this test meaningful, and "no notification arrived" is trivially true for a dozen wrong reasons (the N-C vacuous-assertion lesson).
- [ ] 10 consecutive full-directory runs green.

## Verification

`cd hub && npx jest tests/integration/notifications --runInBand`, repeated. Before this task: ~2 failures in 5.
