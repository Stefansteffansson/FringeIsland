# H022 frozen read-only mode — banner, posture precedence, entry affordances

---
id: TASK-JD-03
title: H022 frozen read-only mode (JRN-14)
status: review
assigned_to: Claude (delegated session)
priority: high
feature: FEAT-H022
owner: hub
wave: ferd
cycle: J-D
depends_on: [TASK-JD-02]
estimated_hours: 3
---

## Description
H022 STORY-1: the player boots frozen enrolments into read posture (reuse the H021 review-posture mechanics — no third implementation) with the freeze banner (reason-keyed canon copy ×4 + verbatim fallback, `frozen_at` rendered); posture precedence explicit (frozen wins over review framing, completion framing renders inside it); **View** affordance on frozen rows at the journeys cards + detail enrolment panel; the Q9 ex-member case renders (frozen card lists, walk opens).

## Acceptance criteria
- [ ] Red-first unit/component tests per block; no background `enter` in frozen posture asserted as an effect (request listener), not handler absence.
- [ ] Additive types for `freeze`/`progress_sharing` in `hub/lib/journeys/queries.ts`, re-exported via `player.ts`; BFF routes pass-through verified (zero route changes expected).
- [ ] No completion affordances anywhere in a frozen walk; frozen+completed renders completion framing inside the frozen posture.
- [ ] Cards/detail: View on frozen rows only; Continue/Review never on frozen; withdrawn unchanged.
- [ ] Lint 0 errors; `set-state-in-effect` suppressions within budget (≤ 5).

## Technical notes
Posture derivation stays per-render (no mode enum — H021 pattern, extended: frozen check first). Copy map keyed on `freeze.reason` with fallback rendering the verbatim value. `timing.ts` untouched.

## Verification
`npm run test:unit` green with new suites; manual: boot a frozen fixture enrolment on `localhost:3000`, see banner + read-only walk.
