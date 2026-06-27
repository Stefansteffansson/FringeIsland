---
id: TASK-PC002-05
title: FIM account-erasure anonymise-vs-retain path + cascade-spec verification
status: todo
assigned_to: Claude
priority: medium
feature: FEAT-PC002
owner: platform/core/identity
wave: ferd
cycle: IDN-2
depends_on: [TASK-PC002-03, TASK-PC002-04]
estimated_hours: 3
---

# TASK-PC002-05: FIM account-erasure anonymise-vs-retain + cascade verification

## Description

FEAT-PC002 STORY-5 criterion 4 + the DoR/cascade half of STORY-4 (ADR-U034 §5).
The reaper's hard-delete cascade applies **only pre-transcendence**. A
**post-transcendence** FIM's right-to-erasure is a **distinct path** that must
reconcile erasure against the legal duty to retain proof-of-consent: anonymise the
consent subject link, retain the consent event. Also the final cascade-spec
verification beat (ADR-U016 DoR) before the feature reaches `6-done`.

Status `review`: schema-touching (anonymise path) behind the schema-review gate.

## Acceptance criteria

- [ ] FIM account-level erasure (distinct from the reaper) **anonymises the consent
      subject link and retains the consent event** as proof — not hard-deleted.
- [ ] Both ADR-U016 cascade specs (Mist erasure; Mist→FIM transcendence) are
      verified to document the effect at every layer (PC-2, PC-3, each vertical) —
      already drafted in FEAT-PC002 §"Cascade specification"; this confirms they
      match the shipped substrate.
- [ ] The reaper↔consent boundary is verified collision-free (reaper touches only
      pre-transcendence rows; consent exists only post-transcendence).

## Technical notes

- Privacy-vertical adjudication finalises the anonymise-vs-retain detail named in
  ADR-U034 §5 / FEAT-PC002 §"Resolved spec questions" item 3.
- Do not conflate with the reaper's pre-transcendence hard-delete cascade.
- This task closes the feature: on green, FEAT-PC002 → `6-done` (+ identity §L4
  row) in the same commit, pending schema review.

## Verification

- Integration tests: account-erasure anonymises the subject link, consent row
  retained. Cascade-spec review checklist complete. Red-first.
