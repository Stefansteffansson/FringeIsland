# H023 arrival orchestration — the onboarding slice, the auto-launch decision, the welcome routing

---
id: TASK-JE-04
title: H023 arrival orchestration (overview-bundle onboarding slice + post-paint auto-launch)
status: todo
assigned_to: claude
priority: critical
feature: FEAT-H023
owner: hub
wave: ferd
cycle: J-E
depends_on: [TASK-JE-01, TASK-JE-02]
estimated_hours: 6
---

## Description

The Hub half of the arrival (STORY-1, STORY-2), API-first over the PD006 contracts:

1. **The arrival check rides the landing, never blocks it.** Read `get_onboarding_status()` folded into the sign-in overview bundle (`hub/app/api/me/overview/route.ts` + `hub/lib/me/overview-*` + `OverviewBoot`) or a session cache — decide at build against the measured waterfall (ADR-U043 area discipline) and record the decision in the spec's Implementation notes.
2. **Auto-launch decision (uniform for Mist arrival and brand-new-FIM first sign-in):** `has_enrollment=false` → call `enroll_self_in_journey(onboarding_journey_id)` (via the existing enrolment route) and route into the player at the welcome, **after first paint**. `has_enrollment=true` → nothing automatic. No separate first-sign-in state; no opt-out check (ADR-U045 Amendment 1). Enrol **at the moment of auto-launch** so a glance-and-leave is still "arrived once".
3. **Telemetry:** content-free `arrived-into-onboarding` event (V4 id-only pattern).

## Acceptance criteria

- [ ] Unit tests demonstrated red first: the auto-launch decision branches (`has_enrollment` false/true, `onboarding_journey_id` null-defensive), post-paint ordering, single-fire (no repeat launch across auth-event churn)
- [ ] Performance-budget test (ADR-U043 B1/B4): first-paint request count ≤ the spec's N, zero duplicate fetches across auth churn, loading-state rule (B6)
- [ ] The arrival check adds **no render-blocking standalone fetch** on the landing path
- [ ] Mist materialisation precondition respected — the check never runs on an actorless session (rabbit hole: IDN-1/FEAT-H003 creates the Mist on arrival)
- [ ] Both entry paths take the identical code path (no `isFirstSignIn` state anywhere)

## Technical notes

- Overview bundle prior art: `hub/lib/me/overview-shared.ts`, `hub/lib/me/overview-client.ts`, `hub/components/shell/OverviewBoot.tsx`; session-cache prior art: `hub/lib/journeys/client.ts`, `hub/lib/groups/client.ts` — check in-repo prior art before adding fetch plumbing (DoD).
- Player routing: the FEAT-H020 player at `hub/app/journeys/[id]` (play route) — the welcome renders through the existing player; **no new player rendering**.
- Route-policy conformance test (`hub/tests/unit/app/api/route-policy-conformance.test.ts`) must stay green if any route is added — default: no new route (consume existing enrolment route + overview bundle).

## Verification

Hub unit suite + lint + `next build` green (the Hub type gate); budget test green; manual walk of both arrival paths on the dev server.
