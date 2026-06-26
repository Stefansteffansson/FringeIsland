# TASK-H003-03: Hub "begin acting as a Mist" seam + minimal Mist-presence landing (STORY-2)

---
id: TASK-H003-03
title: Hub "begin acting as a Mist" seam + minimal Mist-presence landing
status: done
feature: FEAT-H003
owner: hub
wave: ferd
depends_on: [TASK-PC001-01]
estimated_hours: 4
---

## Description

The Hub seam that materialises a Mist **just-in-time** when the visitor clicks the entry's **"Look around"** (the deliberate enter-as-a-Mist act, Q3 "b-done-right"): Supabase **anonymous sign-in** → FEAT-PC001's amended `handle_new_user` flags `is_temporary` + creates the proto personal group (substrate owned + tested by **TASK-PC001-01**). On success the visitor lands on a **minimal-but-real Mist-presence state** (identity-level: a real beginning + the become-a-FIM CTA — not a fake placeholder, not the pre-designed town). Mirrors the FEAT-H002 `signUpFim` lib-behind-route pattern.

## Acceptance criteria (each demonstrated red first)

- [ ] `hub/lib/auth/mist.ts` exports `beginMistSession(supabase)` (anon sign-in) returning a normalised `{ user, session, error }`; **idempotent** within a live session (no second Mist).
- [ ] Clicking **"Look around"** calls `beginMistSession` and, on success, routes to the **minimal Mist-presence state** (a real, minimal identity-level surface — not a stub).
- [ ] Frontend contact is the Supabase auth SDK (anon sign-in) only — **no table calls** (ADR-U009).
- [ ] Hub integration check: after `beginMistSession`, the consumed substrate holds — an `is_temporary = true` Mist with a non-null `personal_group_id`. (The full substrate contract — proto group, zero-perm "Myself", no Members enrolment, no-name — is owned and tested by **FEAT-PC001 / TASK-PC001-01**, not re-implemented here.)

## Technical notes

- `supabase.auth.signInAnonymously()`; `handle_new_user` (FEAT-PC001) fires AFTER INSERT — poll/retry for the profile (precedent `signInWithRetry`).
- Reuse the H002 harness (`createTestClient`, `createAdminClient`, `cleanupTestUser`); mint + tear down anon users (no FEAT-PC002 reaper yet).
- The minimal Mist-presence state is **identity-level only** — do not design the town / accretion visuals (fundamentals before experience design).
- **Red-first:** write the seam + landing tests, confirm red (no anon wiring / no Mist-presence route), then green after TASK-PC001-01's substrate is applied.

## Verification

- `npm run test:integration -w hub` + unit/E2E for the seam + landing green; `npm run lint -w hub` clean.
