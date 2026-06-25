# TASK-H002-03: AuthContext.signUp + /signup page (form, consent gate, redirect)

---
id: TASK-H002-03
title: AuthContext.signUp + /signup page (form + consent gate + landing)
status: done
feature: FEAT-H002
owner: hub
wave: ferd
depends_on: [TASK-H002-02]
estimated_hours: 4
---

## Description

Add `signUp` to the Hub auth facade and build the sign-up page, mirroring `app/login/page.tsx`. The page collects email, password, and full name, presents an explicit un-prechecked consent checkbox that gates submission, posts through the API route, and on success lands the new FIM authenticated on `/groups` (or shows a confirm-your-email state).

## Acceptance criteria

- `hub/lib/auth/AuthContext.tsx` exposes `signUp(email, password, displayName, consentAccepted) => Promise<{ error: string | null, pendingConfirmation?: boolean }>` — impl POSTs `/api/auth/signup`; on a returned session calls `supabase.auth.setSession({ access_token, refresh_token })` (so the listener updates `user`); on `pendingConfirmation` returns that flag.
- `hub/app/signup/page.tsx` (`'use client'`, `<Suspense>`-wrapped form): `TextField`s for full name / email / password (each with `id`), an **un-prechecked** consent checkbox, a submit `Button`, and `InlineError`.
- Given the consent box is unchecked, when the user submits, then submission is blocked client-side and an inline error explains consent is required (no API call). *(STORY-3)*
- Given valid input + consent, when submitted, then `auth.sign_up_started` telemetry is emitted, `signUp` is called, and on success the user is redirected to `/groups` (honouring `?redirect` like login). *(STORY-1, STORY-2)*
- Given the API returns `pendingConfirmation`, when handled, then a clear "confirm your email" state renders via a design-system primitive — no dead end. *(STORY-2 fork)*
- Given an error (duplicate email, weak password, server consent rejection), when returned, then it renders via `InlineError` and `auth.sign_up_failed` telemetry is emitted. *(STORY-1, STORY-4)*
- Cross-links: `login` page links to `signup` and vice-versa.

## Technical notes

- Mirror `app/login/page.tsx` structure exactly (Suspense, `useAuth`, `useRouter`, `useSearchParams`, centered gradient card). Mark `'use client'` (the `useAuth()`-in-server-component gotcha).
- Do **not** branch on role/anything from the DB in the page — it only handles auth + navigation.
- Keep selectors test-friendly: `#fullName`, `#email`, `#password`, a consent checkbox with a stable `id`/`data-testid`, `button[type="submit"]`, and `InlineError`'s `data-testid="inline-error"`.

## Verification

- `npm run dev` from root → manual: create a fresh account → lands on `/groups` showing "FringeIsland Members".
- `npm run lint -w hub` + `npm run build -w hub` clean. E2E in TASK-H002-04.
