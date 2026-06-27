# TASK-H004-01: In-place transcendence + the consent gate (STORY-1, STORY-2, STORY-5)

---
id: TASK-H004-01
title: In-place Mist→FIM transcendence with continuity, the consent gate, and transcendence telemetry
status: done
feature: FEAT-H004
owner: hub
wave: ferd
depends_on: [TASK-PC002-04, TASK-H003-04]
estimated_hours: 6
---

## Description

Upgrade the FEAT-H003 become-a-FIM CTA from a `/signup` redirect into a **real in-place transcendence**: collect credentials (reusing the FEAT-H002 sign-up fields) **and an explicit consent**, then **convert** the Mist (Supabase anon→permanent `updateUser`, preserving the same `auth.users.id`) and **finalise** via the paired **FEAT-PC002 `finalise_transcendence` RPC** (atomic `is_temporary⇒false` + FringeIsland Members enrolment + consent write). On success `AuthContext` re-derives identity **Mist → FIM** (from `is_anonymous`) and the FIM lands on **`/groups`** with the **same** `personal_group_id` (continuity — nothing restarts). Emit V4 transcendence telemetry (failures included) + the Notifications welcome trigger seam.

## Acceptance criteria

- [ ] From a Mist session, completing the become-a-FIM flow (credentials + consent) **converts** (`updateUser`, same `auth.users.id`) then calls **`finalise_transcendence`**; on success identity re-derives **Mist → FIM** and lands on **`/groups`** (STORY-1).
- [ ] Continuity: the transcended FIM keeps the **same** `personal_group_id` and journeys — no row recreation, no "welcome, new user" reset (STORY-1, verified at integration).
- [ ] Finalisation failure → the failure is **surfaced** (InlineError), the flow does **not** navigate to `/groups` (no half-FIM UI state); the platform RPC rolls back its own writes (STORY-1).
- [ ] The flow uses only the Supabase **auth SDK** (conversion, client-side) + the **Platform API route → PostgREST RPC** (finalisation, server-side) — **no browser table/RPC calls** (ADR-U009, Hub CLAUDE.md).
- [ ] An **explicit consent control** (not pre-checked) is a **required** step with its purpose/policy version legible; **no consent → no conversion and no finalisation** — enforced client-side **and** server-side in the route (STORY-2).
- [ ] On success the captured consent (purpose `transcendence`, policy version) is the record FEAT-PC002 writes **atomically** with finalisation — the Hub passes it; the platform persists it (STORY-2).
- [ ] A V4 **transcendence telemetry** event (actor + outcome) is emitted on success **and failure**, plus the **welcome/onboarding trigger** seam (copy/routing is Notifications', not authored here) (STORY-5).
- [ ] The FEAT-H003 become-a-FIM CTA now opens the **in-place flow** (`/become-a-fim`), not the bare `/signup` redirect (STORY-4 delta).

## Technical notes

- **New lib `hub/lib/auth/transcendence.ts`** — `finaliseTranscendence(supabase, { policyVersion, captureContext })` wrapping `supabase.rpc('finalise_transcendence', { p_policy_version, p_capture_context })` (lib-behind-route, mirrors `lib/auth/signup.ts`/`lib/groups/queries.ts`). Plus `TRANSCENDENCE_POLICY_VERSION`, `TRANSCENDENCE_CONSENT_REQUIRED_ERROR`.
- **New route `hub/app/api/auth/transcend/route.ts`** — server consent gate (mirrors signup route), calls `finaliseTranscendence` (server client reads the now-converted JWT from cookies), records audit + telemetry (`transcendence.started/succeeded/failed` + welcome trigger). RPCs go through the route, never the browser (Hub CLAUDE.md narrow-exception rule).
- **`AuthContext.transcend(email, password, displayName, consentAccepted)`** — client consent gate → `supabase.auth.updateUser({ email, password, data: { display_name } })` (auth SDK) → POST `/api/auth/transcend`. Identity flips via `onAuthStateChange` (`USER_UPDATED`, `is_anonymous⇒false`) — never queried in the listener (Hub gotcha).
- **New `hub/app/become-a-fim/page.tsx`** + form — reuses `TextField`/`Button`/`InlineError` + a required consent checkbox (mirrors `app/signup/page.tsx`); Mist-gated (FIM → `/groups`, sessionless → `/`); success → `router.push('/groups')`.
- **`hub/app/mist/page.tsx`** — repoint the CTA `href` `/signup` → `/become-a-fim`; update the existing `mist-presence.test.tsx` href assertion (STORY-4 behaviour change — red-first).
- **Red-first:** unit (consent gate, success-navigates, failure-no-nav, AuthContext glue, route server gate) + integration (`finaliseTranscendence` after a real anon→permanent conversion: flip + enrolment + consent + same `personal_group_id`). Keep logic assertions at the unit tier.

## Verification

- `npm run test:unit -w hub` green (new transcendence/become-a-fim/route specs + updated mist CTA); `npm run test:integration:auth -w hub` green (new `transcendence.test.ts`); existing suites green; `npm run lint -w hub` clean.
