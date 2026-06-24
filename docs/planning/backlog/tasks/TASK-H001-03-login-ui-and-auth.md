# Login UI + auth (STORY-1, IDN-3 thin) with V1/V4 seams

---
id: TASK-H001-03
title: Login UI + auth (STORY-1, IDN-3 thin) with V1/V4 seams
status: done
assigned_to: Claude (CC)
priority: high
feature: FEAT-H001
owner: hub
wave: ferd
depends_on: [TASK-H001-02]
estimated_hours: 3
---

## Description

Implement STORY-1: an existing FIM signs in and is redirected to `/groups`. Sign-in is the narrow direct-Supabase exception (auth only) via the existing `AuthContext`; the audit/telemetry seams ride a real API route (API-first).

## Acceptance criteria

- [ ] `hub/app/login/page.tsx` (`'use client'`): `h1` "Welcome Back", `#email`, `#password`, `button[type="submit"]`, error region (`InlineError`) — selectors compatible with the oracle's E2E.
- [ ] Valid credentials → Supabase session established → redirect to `/groups` (or the preserved `?redirect=` destination).
- [ ] Invalid credentials → `InlineError` renders, no session created.
- [ ] On success: `emitTelemetry('auth.sign_in_succeeded', …)` (V4) **and** a POST to `hub/app/api/auth/audit/route.ts` recording the auth action (V1) + server-side telemetry. On failure: `emitTelemetry('auth.sign_in_failed', …)` — error surfaced, not swallowed.
- [ ] Unauthenticated visitor hitting `/groups` is redirected to `/login` with the destination preserved where feasible (client guard via `useAuth()`).

## Technical notes

- `useAuth()` requires `'use client'` (Hub gotcha — silent failure in server components).
- Don't query inside `onAuthStateChange` (Hub gotcha) — already respected by `AuthContext`.
- Oracle selectors: `auth.spec.ts` (`#email`, `#password`, `button[type=submit]`, `.bg-red-50` error, redirect `/groups`).
- No sign-up, no Mist→FIM transcendence, no consent capture (No-gos).

## Verification

- Manual: bad creds → inline error, no nav; good creds → `/groups`.
- Covered by `tests/e2e/auth.spec.ts` (TASK-H001-05) + `tests/integration/auth/signin.test.ts`.
