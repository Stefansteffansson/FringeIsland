# TASK-H002-01: Sign-up lib + substrate-contract integration tests

---
id: TASK-H002-01
title: Sign-up lib (signUpFim) + substrate-contract integration tests
status: done
feature: FEAT-H002
owner: hub
wave: ferd
depends_on: []
estimated_hours: 3
---

## Description

Create the `signUpFim` lib that wraps Supabase Auth `signUp` behind a testable function (the lib-behind-route pattern, mirroring `lib/groups/queries.ts`). It enforces the consent gate, passes the display name through `options.data.display_name` (the key `handle_new_user` reads), and returns a normalised result. Then write the integration tests that pin the substrate contract this feature depends on (`handle_new_user` outcomes) and the consent rejection.

## Acceptance criteria

- `hub/lib/auth/signup.ts` exports `signUpFim(supabase, { email, password, displayName, consentAccepted })` returning `{ user, session, pendingConfirmation, error }` (error is a string|null, consistent with `AuthContext.signIn`).
- Consent gate: when `consentAccepted` is falsy, `signUpFim` returns an error and does **not** call `signUp` (no account created).
- Integration test (`hub/tests/integration/auth/signup.test.ts`), against the live shared Supabase:
  - Given a fresh unique email + display name, when `signUpFim` runs, then a `public.users` profile exists with a **non-null `personal_group_id`**, `nickname` = first word of the display name, `show_real_name = false`, `display_preference = 'nickname'`. *(B-AUTH-001, B-DISP-001..011)*
  - Then a personal group named after the nickname exists with the user as sole member and a **"Myself" role carrying zero permissions**, and the user is enrolled in **"FringeIsland Members"**. *(B-RBAC-017)*
  - Given an already-registered email, when `signUpFim` runs again, then it returns a duplicate error and creates no second account. *(B-AUTH-001)*
  - Given `consentAccepted: false`, when `signUpFim` runs, then it returns an error and no auth user / profile is created.
- Every test mints a **fresh unique email** (`generateTestEmail(seed)`) and tears the user down via `cleanupTestUser` in `afterAll`/`afterEach` — no residue on the shared substrate.

## Technical notes

- `signUp` shape (port from `hub-legacy/lib/auth/AuthContext.tsx`): `supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })`.
- `handle_new_user` is `AFTER INSERT ON auth.users`; profile materialisation is async — poll/retry for the profile row (see `signInWithRetry` precedent) rather than asserting immediately.
- Zero-permission "Myself" role = no rows in the role's permission join; assert via the permission-resolution helper or by counting permission rows = 0.
- Harness: `createTestClient()` (anon/RLS), `createAdminClient()` (service-role, for assertions + teardown), `generateTestEmail(seed)` **requires a seed arg**, `cleanupTestUser(userId)`.

## Verification

- `npm run test:integration -w hub` — the new `signup.test.ts` passes; existing suites stay green.
- `npm run lint -w hub` clean.
