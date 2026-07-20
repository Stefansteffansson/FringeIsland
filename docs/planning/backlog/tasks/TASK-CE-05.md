# E2E journeys + close ritual

---
id: TASK-CE-05
title: C-E E2E journeys (seal lived through the Hub; export carries communication) + cycle close
status: todo
assigned_to: claude
priority: medium
feature: FEAT-PD012
owner: platform/domain/communication
wave: ferd
cycle: C-E
depends_on: [TASK-CE-03]
estimated_hours: 2
---

## Description

Prove the surface-neutral cycle through the existing Hub surfaces, then close.

## Acceptance criteria

- [ ] Journey 1: Steward closes a group with a live group conversation → the thread leaves the member's Messages inbox; a pre-seal DM thread between the same members is untouched
- [ ] Journey 2: member with messages + forum post + submitted report downloads their export → `communication` key present with the four sections (suspended posture stays integration-tier — a suspended member cannot drive the UI)
- [ ] Fleet run: no regressions beyond the standing named fences; C-D's fixture lessons honoured (RPC-provisioned self-sufficient fixtures; no global `signOut()` from fixture clients; `data-testid` pinned before mutation)
- [ ] Close ritual: `npm run dashboard`, session bridge, fuller-auto close PR (E2E + docs + bridge), tasks retired at retro

## Verification

E2E fleet counts in the bridge; dev server stopped before `next build`.
