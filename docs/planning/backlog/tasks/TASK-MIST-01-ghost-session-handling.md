# Ghost Mist sessions — a browser session outliving its erased subject

---
id: TASK-MIST-01
title: Handle the ghost window - a client session whose Mist was erased server-side
status: done  # 2026-09-02 — ghost sessions named by the BFF, dropped by AuthContext; red-first unit + E2E; FEAT-H003/H004 amended
assigned_to: claude
priority: medium
feature: FEAT-H003
owner: hub
wave: ferd
cycle: none
depends_on: []
estimated_hours: 3
---

## Description

J-O3 area-gate finding (2026-07-19, Stefan's live walk + diagnosis): when a Mist is erased server-side (the 72 h ADR-U033 reaper, or a cross-domain Say-goodbye) while a browser still holds its session, the client reads `identity === 'mist'` from the JWT's `is_anonymous` claim (a local derivation — correct by design, ADR-U037) while every platform call fails: the arrival check 42501s silently (`onboarding.arrival_failed` telemetry, no navigation), the catalogue shows no walk, and the Mist-presence page renders a beginning that cannot continue. The state self-heals when the token refresh fails (≤ 1 h), but inside the window the front door is broken in exactly the way a confused first-time visitor would hit.

## Acceptance criteria

- [x] A resolvable-actor failure (42501) from the arrival check or the Mist-page walk resolution is treated as a broken session: drop the local session (sign out) so the visitor lands sessionless and the next "keep looking around" mints a fresh Mist — the first-time experience restored within one interaction — **done 2026-09-02**, see the disposition.
- [x] The farewell path is re-verified on one domain end-to-end (it is E2E-green today) and the per-domain session split is documented in the Mist-presence spec — **done 2026-09-02**: `transcendence.spec.ts` farewell cell 1/1 green on this pass; the split is written into FEAT-H003 (amendment) and FEAT-H004 (note).
- [x] Red-first units for the ghost-detection branch — **6 cells red → green** (arrival component, Mist page, both BFF routes, both clients) + one labelled test-after cell on the provider's own contract.

## Disposition — done 2026-09-02 (Ferd leftovers pass; fuller-auto, no schema)

**The mechanism, exactly:** the session guard (`useSessionGuard`) is armed for FIMs only, so a Mist's ghost was nobody's. The JWT is still signed; the local derivation reads `mist` (correct, ADR-U037); the first actor-bound read — `get_onboarding_status()` on the arrival check, `get_my_journey_enrollments()` on the Mist page — refuses with 42501 "no resolvable actor"; the arrival check logged it as retryable, the Mist page swallowed it into its catalogue fallback. A ghost, parked on `/mist`.

**Built:**
- The two BFF reads **name** the refusal: `/api/me/onboarding` and `/api/me/journeys` answer 403 with `code: 'no_resolvable_actor'` (`lib/auth/mist.ts` exports the constant and `isGhostSessionRefusal(err)`).
- The clients carry it: `OnboardingApiError { status, code }` (new), `JourneysApiError.code` (added).
- `AuthContext.dropGhostSession()` — telemetry `mist.ghost_session_dropped`, then `signOut({ scope: 'local' })` (a Mist is per-device; the local-scope rule of 2026-07-27 holds).
- `OnboardingArrival` and the Mist page call it on the code and stop treating the read as retryable/fallback. **Found by the E2E arc, fixed in the same pass:** the arrival component's one-shot latch had to be released in the ghost branch — the next "look around" mints a fresh Mist in the *same* page context (client-side navigation), and that arrival must launch; the first cut returned without releasing it and the fresh Mist sat on `/mist`.

**Evidence:** unit 6 red → green, arrival cell extended to demand the latch release (red → green again); provider cell (labelled test-after) pins local scope + telemetry; full unit tier **180 suites, 1 527/1 527**. E2E `mist-ghost.spec.ts` — mint → erase the reaper's way (auth user, then the personal group, through the E2E erasure primitive) → return on `/mist` → **sessionless entry** → look around → **fresh Mist, front door opens** — red at head (parked on `/mist`), green after. Farewell cell re-verified 1/1. Lint 0; `npm run typecheck` 0; `next build` see the PR. Manual verification per the task's own recipe is what the E2E now automates.

**Stated plainly:** the reaper's server-side erasure and a cross-domain goodbye remain undetectable until the next actor-bound read — by design (no polling for Mists; the guard stays FIM-only). The browser learns of it within one interaction, which is the AC's bar.

## Verification

Unit + the Mist E2E arc; manual: erase a Mist server-side with the browser session alive, reload — sessionless entry, fresh Mist on next look-around, auto-launch fires.
