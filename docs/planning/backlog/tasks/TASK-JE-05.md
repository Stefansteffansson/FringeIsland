# H023 never-a-wall, post-transcendence resume, and the E2E proofs

---
id: TASK-JE-05
title: H023 front-door-never-a-wall + post-transcendence resume + E2E proofs
status: todo
assigned_to: claude
priority: high
feature: FEAT-H023
owner: hub
wave: ferd
cycle: J-E
depends_on: [TASK-JE-04]
estimated_hours: 5
---

## Description

The voluntariness posture and the JRN-5 surface (STORY-3, STORY-4):

1. **Never a wall:** the welcome renders in the ordinary player with the standard Hub navigation fully live; nothing gates the rest of the Hub behind onboarding completion; a traveller who left onboarding incomplete is never auto-relaunched (`has_enrollment=true`) and can resume deliberately from their journeys list.
2. **Carry-over resume:** the post-transcendence landing reads `get_onboarding_status()` → `has_enrollment=true, has_completed=false` → **resumes** via the player's `get_player_state` position — it does NOT auto-enrol again (clean resume, not a duplicate-refusal ride). Telemetry: `resumed-after-transcendence` (content-free).
3. **E2E proofs (the weight of this feature):** Mist arrival → lands in welcome; later visit → no re-launch, journey reachable from the list; brand-new FIM first sign-in → welcome via the identical path; Mist advances partway → transcends → resumes at the carried position (same enrolment, no restart). E2E asserts the observable effect, never just the interaction (J-C bound rule).

## Acceptance criteria

- [ ] Navigation-freedom assertion from the welcome and from a mid-journey step (leave freely; no forced advance)
- [ ] No-relaunch assertion on revisit (enrolment exists → nothing automatic)
- [ ] Post-transcendence resume asserted: same enrolment, carried position, no second enrolment attempt fired
- [ ] E2E covers both arrival paths + the transcendence resume, each asserting the landed-in-player observable state
- [ ] Unit-tier coverage for the resume/no-relaunch branching (pyramid upright — not E2E-only)

## Technical notes

- Transcendence flow surface: the FEAT-H004 sign-up/conversion flow — find the post-transcendence landing and wire the resume read there; the platform guarantees continuity (TASK-JE-03 proves it), the Hub only renders it.
- E2E prior art: existing journeys E2E specs under the Hub Playwright suite; anonymous-session (Mist) E2E prior art from FEAT-H003/H004 specs.
- Dev server on `localhost:3000` required for E2E (`npm run test:e2e`); mind the manual-testing coexistence note (auth rate limits, cookie collisions) if Stefan is testing concurrently.

## Verification

`npm run test:e2e` green on the new specs; full Hub unit suite + lint + `next build` green.
