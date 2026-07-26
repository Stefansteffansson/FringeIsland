# E2E + close A-NTF Cycle N-D (and the area)

---
id: TASK-ND-05
title: E2E the mute-round-trip, close both specs to 6-done, close the A-NTF area
status: todo
assigned_to: claude
priority: high
feature: FEAT-H033
owner: hub
wave: ferd
cycle: N-D
depends_on: [TASK-ND-04]
estimated_hours: 3
---

## Description

E2E the one thing that matters: a member mutes a category and the notification **actually stops** — driven end-to-end, not by asserting the contract twice. Then close N-D and, with it, the A-NTF area.

**E2E assertion discipline (N-C made the same class of mistake twice):** never pin an absolute badge count, and never leave an absolute *precondition* behind a relative assertion — a precondition that passes alone and fails in the full suite is the same bug wearing a hat. Everything is a `>=` delta. Fixtures need single-token display names (surfaces render nickname = first token).

## Acceptance criteria

- [ ] E2E: member mutes a suppressible category, a notification of that category is generated, the bell and inbox do not move; unmute, and it arrives.
- [ ] E2E: the operator panel renders for an admin with its cost line and not at all for a member.
- [ ] No absolute counts anywhere, preconditions included.
- [ ] Full integration sweep green (666+ baseline from TASK-INT-02 — **N-D's own greens are readable because that task cleared the known reds**).
- [ ] Both specs to `6-done` with Implementation notes; all four L4 / README rows updated in the **same commit**.
- [ ] `CHANGELOG.md` entry — and the **missing N-A / N-B entries** flagged at the N-C close are routed to the area gate, not silently backfilled.
- [ ] Area-gate items carried forward: the owed ADR-U043 `/groups` measurement (TASK-NC-05), Stefan's live walk, U049 §8 Q1, NB-8 Mist posture, email-deferral recording, DS-5 spec advance, W12 per-RPC verification.
- [ ] A-NTF area retro written; `TASK-NC-01..06` and `TASK-ND-01..05` swept and the sweep recorded in the backlog README.
- [ ] `doc-health-check` run — N-D touched four L3 sections across three trees.

## Verification

`npx playwright test` green; `npx jest --selectProjects integration --runInBand` green; both specs `6-done`.
