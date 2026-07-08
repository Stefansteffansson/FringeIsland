# PD005 red-first integration suite — freeze re-verification + progress/consent contracts

---
id: TASK-JD-01
title: PD005 red-first integration suite
status: review
assigned_to: Claude (delegated session; lead-verified)
priority: high
feature: FEAT-PD005
owner: platform/domain/journeys
wave: ferd
cycle: J-D
depends_on: []
estimated_hours: 4
---

## Description
Author the red-first integration suite for FEAT-PD005 (`hub/tests/integration/journeys/journey-group-progress-frozen-contracts.test.ts` or equivalent): the bridge-`_14` freeze-cascade re-verification (STORY-1), the sharing consent write (STORY-2), the role/consent-gated progress read (STORY-3/4), the additive `get_player_state` blocks (STORY-5), and the privacy/erasure proofs (STORY-6). Verify reds first-hand against the live substrate before any migration exists; pin pre-existing payload keys byte-shape.

## Acceptance criteria
- [ ] STORY-1: all four freeze writers driven end-to-end (MEM-5 remove, MEM-6 leave, MEM-8 closure, GRP-9 archive) — target rows, statuses touched, `frozen_reason`/`frozen_at` pinned; the closed-vs-archived last-leader asymmetry driven both ways with evidence captured for Q8; frozen read/write asymmetry pinned (read OK + P0001 writes).
- [ ] STORY-2: sharing write red (function absent), append-only honoured, latest-wins, solo/no-standing refusals.
- [ ] STORY-3/4: progress read red; P0002/42501/permission gates; non-sharing member exposes nothing (exhaustive payload-key walk); aggregate over sharing members only; alphabetical entries; no timing keys.
- [ ] STORY-5: `freeze`/`progress_sharing` blocks red; pre-existing `get_player_state` keys byte-shape-pinned green.
- [ ] STORY-6: erasure proof rides `erase_fim_account` DeusEx-called (house path — never bare deletes, retro-2026-07-08-j-c §4); Q9 lived-record read-standing scenarios written (red against today's membership-only gate).
- [ ] Red/green/pin counts reported honestly for the gate PR body.

## Technical notes
Fixture from the **live sprint1 seed set, not `seeds/05`** (J-B retro trap). Helpers: `hub/tests/helpers/supabase.ts` (`createAdminClient`, `createTestUser`, `runAdminSql`, `signInWithRetry`). Seed contract-only tables via service-role client; assert via per-user clients calling RPCs. Concurrency ACs: none in this spec race substrate-ordered events (topology check done at decomposition).

## Verification
`npm run test:integration:journeys` — new suite red in the expected pattern (missing functions/keys), sibling journeys suites (37/28/23) still green untouched.
