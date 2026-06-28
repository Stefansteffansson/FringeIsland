---
id: TASK-H005-01
title: Profile surface — view + edit own identity-scope fields (/profile), API-first
status: done
assigned_to: Claude
priority: high
feature: FEAT-H005
owner: hub
wave: ferd
cycle: IDN-4
depends_on: []
estimated_hours: 5
---

# TASK-H005-01: Profile surface — view + edit (/profile)

## Description

FEAT-H005 STORY-1 (view my profile), STORY-2 (edit my text fields), STORY-3
(display-name change cascades). Build the `/profile` surface that **reads** the
caller's own identity-scope fields through the paired FEAT-PC003 read contract
(`GET /api/profile/me`) and **edits** them through the write contract
(`PATCH /api/profile/me`) — **never** a direct `supabase.from('users')` call
(ADR-U009 / Hub `CLAUDE.md` narrow-exception rule).

The editor is a **copy-with-correction** from the `hub-legacy` oracle
(`components/profile/ProfileEditForm.tsx`, ADR-U032): keep its field shape,
client-side validation, display-preference radios, show-real-name toggle, and
bio character counter; **correct** the data path from a direct table write to the
PC003 API contract, and drop the `userId` / `personalGroupId` / `updated_at`
plumbing (the contract resolves the caller and the `set_users_updated_at` trigger
stamps the timestamp).

## Acceptance criteria

- [ ] `/profile` renders the caller's own **full name, display name/nickname,
      display preference, show-real-name state, bio, and avatar (if set)** —
      fetched via `GET /api/profile/me`, never a direct table read.
- [ ] A **loading state** shows while the profile is in flight (no frozen/blank
      interactive form).
- [ ] Editing **full name / nickname / display preference / show-real-name / bio**
      and submitting calls `PATCH /api/profile/me` — no table calls from the
      frontend.
- [ ] Invalid input (empty full name, full name < 2 chars, empty nickname, bio
      over `PROFILE_BIO_MAX_LENGTH`) shows a **clear validation error** and fires
      **no** update call (client-side guard mirrors the oracle; the server is the
      authority).
- [ ] On success, the **profile view, account-menu label, and navigation** all
      reflect the change together via the `refreshNavigation` event; a success
      state is shown.
- [ ] On failure, the error is **surfaced** (never silently swallowed) and the
      form stays editable with entered values intact.
- [ ] A display-name / display-preference change fires `refreshNavigation`; the
      Hub makes **no** write to `groups` (the platform `sync_display_name_to_personal_group`
      trigger owns the cascade, atomic with the update).
- [ ] The surface is gated on **FIM identity** (a Mist is redirected away — no
      durable profile); sessionless visitors are redirected to sign-in. Branch on
      identity status, never a role string.

## Technical notes

- New: `hub/lib/profile/client.ts` (thin `fetchProfile` / `updateProfile` over
  the API + a pure `displayLabel` helper), `hub/components/profile/ProfileEditForm.tsx`,
  `hub/app/profile/page.tsx`. Reuse `Profile` / `ProfilePatch` / `DisplayPreference`
  types and `PROFILE_BIO_MAX_LENGTH` / `PROFILE_FULL_NAME_MIN_LENGTH` from
  `@/lib/profile/queries` (constants + types only — no server runtime).
- Mark all auth-reading components `'use client'` (Hub gotcha: `useAuth()` no-ops
  in a server component). Compose with the design-system primitives (`TextField`,
  `Button`, `InlineError`, `LoadingState`); bio uses a styled `<textarea>`.
- Mirror the `/api/groups` client-fetch idiom from `hub/app/groups/page.tsx`.

## Verification

- Unit (jsdom): `displayLabel`; form validation + no-call-on-invalid; success →
  `updateProfile` + `refreshNavigation` + success state; failure → surfaced +
  values intact; page loading / FIM-gating / avatar display. Red-first, tagged
  `FEAT-H005 STORY-1/2/3 (unit)`.
- E2E journeys land in TASK-H005-03.
