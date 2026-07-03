# FEAT-H005: Member profile + sign-out — view and edit who you are, and leave by the door

---
id: FEAT-H005
title: Member profile and sign-out — render/edit the FIM profile (IDN-4) and the account-menu sign-out (IDN-3 tail)
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A FIM has no way to **see or change who they are**, and no way to **sign out**. Identity so far (FEAT-H001/H002/H003/H004) lets a person sign in, sign up, arrive as a Mist, and transcend Mist→FIM — but once they are a FIM, the surface is a dead end for self-identity:

- **No profile.** IDN-4 — *"Render and edit member profile (full name, avatar, bio, display name)"* — is unbuilt. The substrate is fully present (`public.users` carries `full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`, `avatar_url` per migration `20260227095615`), but no Surface renders or edits it. A FIM can't review their own profile, can't change their display name, can't set whether others see their real name.
- **No sign-out.** IDN-3 names *"sign in, sign **out**, refresh"*; `AuthContext.signOut()` exists but is **wired to no UI** — there is no account menu, so a member literally cannot end their session from the surface. This is the first thing a FIM currently *can't* do.

These pair naturally: both live in the shell's **account menu** (view/edit your profile, and sign out). This feature builds the Hub surface; the **profile read/write contract** is owned by the paired **[FEAT-PC003](../../../platform/core/features/FEAT-PC003-self-service-profile.md)** (PC-2 Identity), because the Hub cannot touch `public.users` directly (ADR-U009 / API-first).

## Solution sketch

The next slice after FEAT-H004, **reusing the spine** (app shell, design-system layer, `AuthContext`, the FEAT-H002 form idioms, the seam libs) — not re-scaffolding. Two paired additions in the shell's account menu, plus the profile surface.

**The account menu (shell chrome).** Add a user/account menu to `hub/components/shell/AppShell.tsx` — the FIM's name/avatar opens a menu with **"Profile"** and **"Sign out"**. The menu is offered to **FIMs only**: a Mist has no durable profile and leaves via the FEAT-H004 farewell, not sign-out.

**Profile (IDN-4) — read then edit, all API-first.** A `/profile` surface **reads** the member's own identity-scope fields through the Platform API (the same API-first posture the Hub already uses for groups — no new direct-table pattern; ADR-U009 + Hub `CLAUDE.md` narrow-exception rule), and **edits** them through the paired FEAT-PC003 write contract (Platform API route → own-row update). Editable text fields: **full name**, **display name / nickname**, **display preference** (`real_name | nickname`), **show-real-name** toggle, **bio**. The form's shape and validation are a **copy-with-correction** from the `hub-legacy` oracle (`components/profile/ProfileEditForm.tsx`, ADR-U032).

**Display-name coupling is platform-side, automatic.** When the member changes their display name / display preference, the **personal-group name follows** — but the Hub does **not** write the group name. The platform's `sync_display_name_to_personal_group` trigger (migration `20260227095615`) cascades it DB-side, atomically with the profile update. The Hub's only job is to **refresh navigation** (`refreshNavigation`) so the new name shows.

**Sign-out (IDN-3 tail).** The account-menu **"Sign out"** calls `AuthContext.signOut()` (the existing, now-wired method) → returns the member to the sessionless entry (`/`). After sign-out, protected surfaces gate as they do for any sessionless visitor.

**Avatar: read-only this slice.** If an `avatar_url` is present it is **displayed**; **avatar upload is out of scope** (it needs Supabase Storage — a bucket + storage RLS + upload pipeline, a materially bigger lift) and is named as a forward seam. Text fields ship now.

## Appetite

A focused **account-menu + profile slice** — the IDN-4 Hub surface plus the IDN-3 sign-out tail. Fixed: a FIM-only account menu; a profile surface that reads own fields and edits the five text fields end-to-end through the paired FEAT-PC003 contract with continuity of the display-name→group-name cascade; a working sign-out; observability for both; no regression to FEAT-H001/H002/H003/H004 — all tested, all API-first. The **write substrate is owned by the paired [FEAT-PC003]** (own-profile read/update contract, own-row RLS, identity-scope column gating); this Hub feature **consumes** it and carries **no migration of its own**. **Out:** avatar upload (Storage), consent history / granular sharing controls (IDN-6/7), per-device session management & remote sign-out (IDN-11), account state / exit / reactivation (IDN-9/10/12).

## Rabbit holes

- **Don't write the group name from the Hub.** The display-name→personal-group-name cascade is a **platform trigger** (`sync_display_name_to_personal_group`, migration `20260227095615`); it runs atomically with the profile update. Re-implementing it client-side (a second write to `groups`) would double-write and could race the trigger. The Hub updates the profile, then fires `refreshNavigation` — nothing more.
- **No direct DB calls (ADR-U009).** Profile **read** and **write** both go through the Platform API / FEAT-PC003 contract — never a browser `supabase.from('users')`. The auth SDK is the only narrow exception, and sign-out uses it via the existing `AuthContext.signOut()`. No third realtime channel, no table reads.
- **Profile is a FIM affordance, not a Mist one.** Gate the account menu (and the profile surface) on FIM identity. A Mist has no durable profile to render and leaves via the FEAT-H004 farewell — don't offer sign-out or a profile editor to a Mist (don't branch on a role string; branch on identity status, as FEAT-H003/H004 do).
- **Show-real-name and display-preference are privacy controls, not cosmetics.** They govern what *other* members see (real name vs nickname). Render and label them as privacy choices; never over-fetch another member's real name and filter client-side (products-tier Privacy obligation) — that boundary is the platform's.
- **Update ALL related UI state together.** After a successful edit, the profile view, the account-menu label, and the navigation/group name must all reflect the change in one pass (the `refreshNavigation` event is the canonical coordinator) — a partial update that leaves a stale name in the nav is drift.
- **Avatar upload is a trap to avoid this slice.** Don't stub a half-real upload against Storage; display the existing `avatar_url`, and name upload as the forward seam. Building the bucket + storage RLS belongs to its own feature.
- **`useAuth()` only in client components.** The account menu and profile surface read auth state — mark them `'use client'` (Hub gotcha: `useAuth()` silently no-ops in a server component).

## No-gos

- **No avatar upload** — `avatar_url` is displayed if present; the Storage bucket + storage RLS + upload pipeline is a forward seam, not this slice.
- **No direct DB access from frontend code** (ADR-U009) — profile read/write go through the paired FEAT-PC003 Platform API contract; only auth (sign-out) uses the SDK.
- **No client-side personal-group rename** — the display-name→group-name cascade is the platform's trigger; the Hub never writes the group name.
- **No consent history / granular sharing / re-consent UI (IDN-6/7)** — only the `show_real_name` / `display_preference` profile controls are built; the broader consent surface is later.
- **No per-device session list / remote sign-out (IDN-11)** — this is single-session sign-out only; the active-sessions surface (and its PC-2 reciprocation routed to G-29) is a later feature.
- **No account state / self-service exit / reactivation (IDN-9/10/12)** — sign-out ends the session; it does not deactivate, delete, or reactivate the account.
- **No admin profile editing** — this is self-service own-profile only; editing another member's profile is an admin path (A-ADM), not built here.
- **No business logic in server components** — profile fetch/update logic lives behind the Platform API; server components render against already-fetched data (Hub `CLAUDE.md`).

## Stories

### STORY-1: View my profile
As a FIM, I want to see my own profile, so I can review who I am and how I appear to others.

**Acceptance criteria:**
- Given a FIM session, when they open **Profile** from the account menu, then the surface renders their own **full name, display name / nickname, display preference, show-real-name state, bio, and avatar (if set)** — fetched through the Platform API (the paired FEAT-PC003 read contract), **never** a direct table read (ADR-U009).
- Given the profile is loading, when the data is in flight, then a **loading state** is shown — never a frozen or blank-but-interactive form (products-tier UI convention).
- Given the identity is a **Mist** (not a FIM), when the shell renders, then **no profile surface and no account menu** are offered (a Mist has no durable profile).

### STORY-2: Edit my profile text fields
As a FIM, I want to edit my name, display name, bio, and visibility preference, so my identity reflects me.

**Acceptance criteria:**
- Given the profile editor, when the FIM changes **full name / nickname / display preference / show-real-name / bio** and submits, then the Hub calls the paired **FEAT-PC003 update contract** (Platform API route → own-row update) — **no table calls** from frontend code.
- Given invalid input (empty full name, full name < 2 chars, empty nickname, or bio over the length bound), when the FIM submits, then a **clear validation error** is shown and **no update call fires** (copy-with-correction from the `hub-legacy` oracle).
- Given a successful update, when it returns, then the **profile view, account-menu label, and navigation** all reflect the change together (via `refreshNavigation`), and a success state is shown.
- Given the update fails, when the error returns, then the failure is **surfaced** (never silently swallowed) and the form remains editable with the entered values intact.

### STORY-3: Changing my display name updates how I appear everywhere
As a FIM, I want my display-name change to flow through to my personal-group name, so I appear consistently across the surface.

**Acceptance criteria:**
- Given a FIM changes their **display name / display preference**, when the update succeeds, then the **personal-group name** reflects the new display name — produced by the **platform sync trigger** (atomic with the update), **not** by a separate Hub write.
- Given the cascade has happened, when the Hub re-reads, then navigation shows the **new** name (the Hub fires `refreshNavigation`; it does not compute or write the group name).

### STORY-4: Sign out (IDN-3 tail)
As a FIM, I want to sign out from the account menu, so I can end my session from the surface.

**Acceptance criteria:**
- Given a FIM session, when the FIM opens the account menu and chooses **Sign out**, then `AuthContext.signOut()` runs and the FIM is returned to the **sessionless entry (`/`)**.
- Given the member has signed out, when they navigate to a protected surface (e.g. `/groups`, `/profile`), then it **gates** as for any sessionless visitor (no leaked authenticated state).
- Given the identity is a **Mist**, when the shell renders, then **no sign-out** is offered (a Mist leaves via the FEAT-H004 farewell — sign-out is a FIM affordance).

### STORY-5: Profile changes and sign-out are observable (V4); no regression
As the platform, I want profile edits and sign-out emitted as telemetry, and existing identity flows unaffected, so IDN-4/IDN-3 add without breaking.

**Acceptance criteria:**
- Given a profile update completes, when it succeeds or fails, then a **profile-updated telemetry event** (actor + outcome, **failures included**) is emitted toward the PC-1 path (V4), continuing the FEAT-H001..H004 seam discipline (the PC-1 sink stays the in-memory seam routed to G-29).
- Given a sign-out completes, when the session ends, then a **session-ended telemetry event** is emitted (V4).
- Given FEAT-H001/H002/H003/H004 (sign-in, sign-up, Mist arrival, transcendence + farewell), when used, then they behave **unchanged** — the account menu and profile are additive shell/identity surfaces, regressing none of them.

## Platform dependencies

- **[FEAT-PC003](../../../platform/core/features/FEAT-PC003-self-service-profile.md) (Platform Core Identity) — the substrate this feature consumes.** Provides the own-profile **read** and **update** contract (own-row RLS, identity-scope column gating over `full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`, `avatar_url`) on `public.users`, and confirms the existing `sync_display_name_to_personal_group` trigger as the display-name→personal-group-name cascade contract. **This is the paired-spec reciprocation — the write path is owned at the platform tier** (the Hub cannot touch `public.users` directly, ADR-U009).
- **Existing substrate (already on disk, no new migration here):** `public.users` profile columns + the `sync_display_name_to_personal_group` trigger (migration `20260227095615`); `AuthContext.signOut()` (the auth-SDK sign-out, already present, now wired).
- **PC-1 Infrastructure** — telemetry path for the profile-updated / session-ended events (V4 seam, as FEAT-H001..H004; the PC-1 sink itself remains unrealised — routed to G-29).
- **Forward seam (not this feature):** avatar upload (Supabase Storage bucket + storage RLS) — its own later feature.

## Cross-product impact

Profile + sign-out are **equipment-agnostic** (`requires-equipment: none`). The Gimbal (senses surface, native) will realise its **own** account/profile UX over the **same** FEAT-PC003 contract and the same `public.users` substrate — only the platform-side semantics (the read/update contract, the display-name sync trigger) are shared and inherited. Avatar **capture** is an obvious senses-surface affordance (camera) when avatar upload lands — named here so the equipment lineage is explicit, not built.

## Vertical impact

- **Privacy/GDPR:** the **core** of this feature on the surface. `show_real_name` and `display_preference` are **privacy controls** — they govern whether other members see the FIM's real name or nickname; the Hub renders and labels them as such. Editing is **own-profile only**; the Hub shows only what the viewer is authorised to see and never over-fetches another member's real name to filter client-side (the authorisation boundary is the platform's). Data **export** and **deletion** are IDN-8 / IDN-10, not this feature.
- **Notifications:** **None** — a self-service profile edit and a self-initiated sign-out are not notification triggers for v1 (no other party needs to be told). (Security-relevant session events such as new-device sign-in are IDN-11 territory, not here.)
- **Administration:** **None** — self-service own-profile only; no admin/DeusEx surface and no raw admin primitive is exposed. Editing another member's profile is an A-ADM path, not built here.
- **Observability:** profile-updated and session-ended telemetry (actor + outcome, **failures included**) toward the PC-1 path (V4); continues the structured-seam binding from FEAT-H001..H004; the PC-1 sink remains unrealised, so events bind to the in-memory seam.
- **Transactions:** **None** — viewing or editing a profile, and signing out, involve no payment, subscription, or entitlement.
- **Extensibility:** the editor branches on **identity status** (FIM vs Mist), never a hardcoded role string (products-tier `CLAUDE.md`). The identity-scope field set is the platform's (FEAT-PC003), not a sealed list hardcoded in the Hub; `display_preference` consumes the platform's existing open value set (`real_name | nickname`) rather than inventing one. Avatar **upload** is a forward seam (Storage), left open, not stubbed.

## Implementation notes (6-done — 2026-06-28)

The Hub half of IDN-4 + the IDN-3 sign-out tail, consuming the paired [FEAT-PC003](../../../platform/core/features/FEAT-PC003-self-service-profile.md) read/update contract. Built red-first; full unit suite + `next build` + full E2E green; FEAT-H001..H004 unregressed. **No migration of its own.**

**Surface (API-first).** `/profile` (`hub/app/profile/page.tsx`) reads via `GET /api/profile/me` and edits via `PATCH /api/profile/me` through a thin client (`hub/lib/profile/client.ts` — `fetchProfile` / `updateProfile` / pure `displayLabel`); no direct `supabase.from('users')` anywhere (ADR-U009). The editor (`hub/components/profile/ProfileEditForm.tsx`) is **copy-with-correction** from the `hub-legacy` oracle (ADR-U032): field shape, client-side validation, display-preference radios, show-real-name toggle, and bio counter preserved; the **corrected** parts are the data path (the PC003 API, not a direct write) and the dropped `userId` / `personalGroupId` / `updated_at` plumbing (the contract resolves the caller; the `set_users_updated_at` trigger stamps the time). Avatar is displayed read-only; upload (Storage) stays a forward seam.

**FIM-only account menu (shell chrome).** `hub/components/shell/AccountMenu.tsx`, mounted in `AppShell`, gates on **identity status** (`identity === 'fim'`) — a Mist / sessionless visitor gets no menu and no sign-out (a Mist leaves via the FEAT-H004 farewell). The label comes from the read contract and refreshes on `refreshNavigation`.

**Display-name cascade (STORY-3).** On a successful edit the form fires `refreshNavigation` **only**; the personal-group name is renamed by the platform `sync_display_name_to_personal_group` trigger (atomic with the update) — the Hub writes no group name. Proven E2E: editing the display name propagates to the account-menu label.

**Sign-out (IDN-3 tail).** Wires the existing `AuthContext.signOut()`. It navigates to the sessionless entry `/` **before** ending the session, so the protected surface unmounts before auth flips and its own sessionless-guard cannot race the menu to `/login?redirect=...` (STORY-4 AC1). Protected surfaces then gate as sessionless.

**Observability (V4) — honest seam.** Hub-surface events at the action seam: `profile.updated` / `profile.update_failed` (actor + outcome, failures included) on edit, `session.ended` on sign-out — the in-memory seam routed to G-29, mirroring FEAT-H001..H004 (the PC-1 sink stays unrealised). The PC003 route additionally emits the server-side profile events.

**Testing honesty (PROCESS §9).** Red-first. 26 new unit tests (`client`, `ProfileEditForm`, `/profile` page, `AccountMenu`, `AppShell`) — full unit suite **103/103**; 3 Playwright journeys (view / edit+cascade / sign-out+gating) — full E2E **18/18**, no regression to FEAT-H001..H004.

**Build fix carried here (PC003 regression).** The merged FEAT-PC003 `hub/lib/profile/queries.ts` cast a supabase-js string-`.select()` union (which includes `GenericStringError`) directly `as Profile` — rejected by `next build`'s type-check, so PC003 had merged **build-broken** (ts-jest + eslint don't full-type-check, so it slipped the PC003 gate). Narrowed through `unknown` in `fetchMyProfile` / `updateMyProfile`; `next build` is green again.

Tasks: `TASK-H005-01` (profile surface view+edit), `TASK-H005-02` (account menu + sign-out), `TASK-H005-03` (telemetry + E2E + no-regression).

---

## Amendment — 2026-07-03 (ADR-U038 F1 / PR #49)

The profile read/edit this surface drives now goes through the platform RPCs `get_own_profile()` / `update_own_profile(jsonb)` rather than the direct `.from('users')` calls the merged FEAT-PC003 lib used (see FEAT-PC003's 2026-07-03 amendment, ADR-U038 F1). `hub/lib/profile/queries.ts` — which `ProfileEditForm` and `AccountMenu` consume — was repointed to the RPCs; `validateProfilePatch` is now client-side UX pre-validation only. No change to this surface's components. Evidence: [`../../../planning/hub-v2/api-conformance-register.md`](../../../planning/hub-v2/api-conformance-register.md) §5 (F1).
