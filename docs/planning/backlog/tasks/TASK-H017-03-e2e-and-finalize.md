# H017 E2E + finalize: the succession/close/delete journeys, then 6-done paperwork

---
id: TASK-H017-03
title: E2E journeys (nomination accept across FIMs, DeusEx fallback, hand-over, last-member close, Steward delete with a remaining member seeing the group vanish) + next build gate + FEAT-H017 6-done paperwork
status: todo
assigned_to: claude
priority: high
feature: FEAT-H017
owner: hub
wave: ferd
cycle: Groups G-E
depends_on: [TASK-H017-01, TASK-H017-02]
estimated_hours: 4
---

## Description

The critical-journey E2E layer + the close-out. E2E spans multiple FIMs — use **dedicated spec-created FIMs in their own browser contexts** (the G-B suite-isolation default; the shared-session refresh-token contention that broke earlier runs — build a fresh steward/nominee per spec).

**Journeys (spec Stories):**
- Nomination accept across FIMs: Steward A nominates member B; B (own context) sees the pending affordance on `/groups`, accepts; B is now Steward, A has left (A's `/groups` no longer shows the group).
- The DeusEx fallback: sole Steward nominates; the single nominee declines; the offer passes to FringeIsland (relayed "passed on"); the group persists with DeusEx as Steward.
- Hand-over: sole Steward hands to FringeIsland directly; lands on `/groups` with the group gone.
- Last-member Close: the last active member closes; group gone from their list.
- Steward Delete with a remaining member: Steward deletes; a **remaining member's** next `/groups` visit shows the group absent (the archived tombstone + their `group_deleted` notification exist substrate-side — asserted).

## Acceptance criteria

- [ ] E2E journeys above green on dedicated spec-created FIMs in their own contexts; no shared-session token contention
- [ ] Both retired G-D refusals are exercised as the new flows (sole-Steward Leave → transfer; last-member Leave → close)
- [ ] Delete is danger-styled with an explicit confirm and distinct from Leave/Remove/Close in the journey
- [ ] Full unit + integration + **E2E** green; `next build` + lint clean (the type gate — run `next build` before 6-done)
- [ ] FEAT-H017 → `6-done`; Implementation notes filled with the red→green evidence (honest labels for any test-after coverage)
- [ ] §L4: Hub `SPECIFICATION.md` inventory row for H017 → `6-done`; `features/README.md` index row updated
- [ ] The bundled **Cycle G-E CHANGELOG entry** written (platform PC014 + Surface H017 together — the G-C/G-D bundled-entry precedent; the PC014 platform half was merged 2026-07-05, held for this bundle)
- [ ] Tasks TASK-H017-01/02/03 → `done`

## Technical notes

`next build` is the type gate (memory: ts-jest/eslint don't full-type-check — run `next build` before 6-done). Requires the dev server on :3000 for E2E (session-owned; dies with the session). Bundled CHANGELOG entry: one "Cycle G-E" entry covering PC014 (platform, already merged) + H017 (Surface) — mirror the G-D entry's shape. Area-gate carry-forwards to keep warm (bridge `_10`): DS-3 freezes (`group_closed`/`group_archived`) re-verify at the Journeys gate; DS-4/DS-5 dispositions (`pending-*`) re-enter at Journeys/Communication; MEM-9 attribution at Communication; IDN-10's group-membership cascade rides G-D+G-E machinery (confirm at the area gate).

## Verification

Full pyramid green; `next build` + lint clean; FEAT-H017 `6-done` with §L4 + README + bundled CHANGELOG updated.
