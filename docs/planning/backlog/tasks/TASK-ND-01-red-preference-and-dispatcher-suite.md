# Red-first contract suite — notification preferences + the shared suppression dispatcher

---
id: TASK-ND-01
title: Write the demonstrated-red integration suite for FEAT-PD016 (preferences, dispatcher, operator nudge policy)
status: done
assigned_to: claude
priority: high
feature: FEAT-PD016
owner: platform/domain/communication
wave: ferd
cycle: N-D
depends_on: []
estimated_hours: 3
---

## Description

Write the integration suite for [FEAT-PD016](../../../platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md) **before** the migration exists, and demonstrate it red. Every one of PD016's four stories gets coverage.

**The N-C vacuous-test lesson is binding here.** N-C wrote 19 red-first assertions and only 18 actually failed: one asserted "platform emits zero hints" and "the row is readable" — both true *before* the migration existed. Suppression tests are especially prone to this, because "no notification arrived" is trivially true when the mechanism does not exist. **Every suppression assertion must carry a control proving selectivity** — a sibling category that still delivers in the same test.

## Acceptance criteria

- [ ] Suite covers STORY-1 (substrate + open channel registry + RLS), STORY-2 (central suppression, all writer paths, fail-open cases), STORY-3 (own-subject get/set + the three typed refusals), STORY-4 (operator nudge policy + reach count + the nudge-vs-delivery distinction).
- [ ] **Demonstrated red:** every assertion fails pre-apply for the *right* reason (a missing relation/function, not a passing tautology). Record the red count and reconcile it against the assertion count — a green-at-red is a defect in the test, not luck.
- [ ] Each suppression assertion pairs a muted category with a **non-muted control** in the same test.
- [ ] The fail-open cases are asserted explicitly (unknown kind, unregistered channel, engagement-group recipient) — fail-open is a decision, so it needs a guard.
- [ ] `member_suppressible = false` outranking a stored preference row is asserted by inserting the row directly, bypassing the contract — the substrate must hold even when the contract is not the writer.
- [ ] No test leaves a poison row in the shared dev DB, and no assertion feeds an unbounded DB-wide id set through a PostgREST `in.()` filter (TASK-INT-02 Finding A's class bug).

## Verification

`cd hub && npx jest --selectProjects integration --testPathPatterns notification` — red, with the count recorded in the task's outcome section.

## Outcome (2026-07-26)

**Demonstrated red: exactly 21 of 24 failed pre-apply**, matching the 21 red-first / 3 labelled-guard design with **no green-at-red**. The suite later grew to 25 with the ADR-U038 adversarial direct-write test (labelled test-after — it passed first run, as a guard on already-correct substrate would).

The pair discipline this task mandated caught a real vacuity immediately: the `admin_send_notification` pair passed its *muted* half because the RPC was **refused** (called as `service_role`, where `is_platform_admin()` is false), not because anything was suppressed. Only its failing "delivers when unmuted" half made the false green visible. Fixed with a real DeusEx operator fixture.
