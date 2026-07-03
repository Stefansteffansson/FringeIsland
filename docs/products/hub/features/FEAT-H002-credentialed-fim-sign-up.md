# FEAT-H002: Credentialed FIM sign-up — create your account and personal group

---
id: FEAT-H002
title: Credentialed FIM sign-up — create your account and personal group
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

FEAT-H001 proved the v2 spine with sign-in of an **existing** FIM. But in v2 there is no way to *become* a FIM — no account-creation path. Every A-IDN row past IDN-1/IDN-2, and every downstream area's first capability, depends on **IDN-3 (authenticated, persistent FIM identity)** directly or transitively; today the only FIMs in v2 are ones seeded out-of-band (the throwaway dev login). The substrate already materialises everything a new FIM needs the moment an auth user is inserted — the `handle_new_user` trigger creates the FK-linked profile with a non-null `personal_group_id`, the personal group with its zero-permission "Myself" role, the baseline "FringeIsland Members" enrolment, and the display-name defaults — but **no v2 API-first surface drives it**. This feature builds that surface: the first flow that creates a person *and their personal group* through the app, and the point at which Phase-3 Identity begins binding the Privacy/GDPR, PC-4 audit, and PC-1 telemetry obligations that the walking skeleton left as structured seams.

## Solution sketch

The next thin-but-complete slice after FEAT-H001, **reusing its spine** (app shell, design-system layer, auth context, `/groups` read path, harness, seam libs) — not re-scaffolding.

A sign-up form (email, password, full name) + an explicit consent gate -> a `hub/` API route that calls Supabase Auth `signUp` (the narrow auth exception per Hub `CLAUDE.md`) -> server-side, `handle_new_user` fires and materialises, atomically:
- the FK-linked `users` profile with a **non-null `personal_group_id`**;
- the **personal group** (named after the nickname, the new FIM its sole member) carrying the **"Myself" role with zero permissions**;
- auto-enrolment into **"FringeIsland Members"** (Tier-1 baseline);
- display-name defaults — **nickname = first word of `full_name`**, **personal-group name = nickname**, **`show_real_name` = false** (privacy-preserving by default).

On success the new FIM is **authenticated and redirected to `/groups`** (the FEAT-H001 spine), which renders through the existing GRP-4 read path — no new fetch path invented. For a brand-new FIM the engagement-group list is **empty** (their only memberships are the personal group and the "FringeIsland Members" *system* group, and GRP-4 lists only `engagement` groups), so the honest landing is the empty state ("No groups yet"); they populate it later by joining/creating engagement groups (GRP-*, later). Where the substrate already auto-claims pending email invites at sign-up, that behaviour is **preserved, not rebuilt**.

This slice **begins the real vertical binding** the skeleton deferred: explicit **consent capture** at the creation moment (Privacy/GDPR), an **account-created audit entry** through the PC-4 path (V1), and **sign-up telemetry** — started / succeeded / failed — through the PC-1 path (V4). Where a sink isn't yet fully realised, the seam stays structured and the gap is recorded (build-informed, PROCESS §9) — never silently dropped.

## Appetite

A focused **foundation flow** — the second Phase-3 slice. Fixed: a real, API-first, tested sign-up that drives `handle_new_user` end-to-end and lands the new FIM on `/groups`, with consent gated at creation and the V1/V4 bindings *begun*. Variable: how much of the PC-4 audit / PC-1 telemetry sink is bound *now* versus left as a structured seam — bind what the substrate already supports, record honestly what it doesn't. No net-new substrate migration is in this feature's appetite.

## Rabbit holes

- **Email confirmation behaviour.** Supabase `signUp` returns a session immediately or a pending-confirmation state depending on the project's "confirm email" setting. Verify the live project's actual behaviour and assert *that* — don't fight the setting or assume an immediate session. Document the post-signup state in Implementation notes.
- **Consent substrate is latent** (PC-2 §8 Q8/X4). Do **not** build a consent schema here. Capture the initial consent decision and record it via the PC-4 audit path; surface durable member-visible consent *state* as the open question it is (IDN-6/IDN-7). Resist scope-creep into consent management.
- **`handle_new_user` is a DB trigger** — test its *outcomes* (profile, personal group, "Myself" role, Members enrolment, display defaults) through the API/integration layer. Do not reimplement its logic in app code.
- **Shared Supabase hygiene.** The dev-login seed account already exists; sign-up tests must mint **fresh unique emails** and clean up after themselves to avoid duplicate-email collisions on the shared substrate.
- **Password / weak-password errors** — surface Supabase's own error through a design-system inline primitive; don't invent a bespoke password policy.

## No-gos

- No **Mist** identity, no anonymous session (ADR-U004), no **Mist->FIM transcendence** — IDN-1 / IDN-2, the next feature (FEAT-H003), which carries the net-new substrate.
- No consent **management** surface (view / edit / withdraw granular consent + history) — IDN-6 / IDN-7.
- No profile editing (IDN-4), Journal (IDN-5), data export (IDN-8), exit/deletion (IDN-10), session management (IDN-11), account-state render or reactivation (IDN-9 / IDN-12).
- No invite **creation / management** (MEM-*); sign-up-time auto-claim is preserved as substrate behaviour, not built here.
- **No net-new substrate migration** — sign-up rides the existing `handle_new_user`. If durable consent persistence is needed beyond the audit trail, that is a **paired PC-2/PC-4 spec**, not work smuggled into this Hub feature.
- No direct DB calls from frontend code (ADR-U009) — the Supabase auth SDK is the only permitted contact, and only for the `signUp` / session call.
- No business logic in server components — it lives behind the `hub/` API (Hub `CLAUDE.md`).

## Stories

### STORY-1: Create a FIM account (sign-up drives `handle_new_user`)
As a visitor without an account, I want to sign up with my email, password, and name, so that I become a FIM with a persistent identity and my own personal space.

**Acceptance criteria:**
- Given valid new-account details (email, password, full name) and accepted consent, when they are submitted through the `hub/` sign-up API route, then a Supabase auth user is created and `handle_new_user` materialises an FK-linked `users` profile with a **non-null `personal_group_id`**. *(B-AUTH-001)*
- Given the profile is created, when `handle_new_user` runs, then **exactly one personal group** is created (named after the nickname, the new FIM its sole member) with a **"Myself" role carrying zero permissions** (a self permission-check returns false), and the FIM is auto-enrolled into **"FringeIsland Members"**. *(B-RBAC-017)*
- Given a `full_name` is supplied, when defaults are applied, then **nickname = the first word of `full_name`**, **personal-group name = nickname**, and **`show_real_name` = false**. *(B-DISP-001..011)*
- Given an already-registered email, when sign-up is attempted, then it is **rejected (duplicate-email prevented)** with an inline design-system error and **no second account** is created. *(B-AUTH-001)*
- Given the frontend, when it submits sign-up, then it calls the `hub/` API route only (DB -> API -> frontend) — the Supabase auth SDK call is the sole narrow exception; **no table calls** from frontend code (ADR-U009).

### STORY-2: Land authenticated on your groups (reuse the FEAT-H001 spine)
As a newly signed-up FIM, I want to be signed in and taken to my home, so that account creation flows straight into the app.

**Acceptance criteria:**
- Given sign-up succeeds and a session is established, when the flow completes, then the new FIM is **redirected to `/groups`**, which renders through the **existing GRP-4 read path** (no new fetch path) — for a brand-new FIM this is the **empty state** ("No groups yet"), because GRP-4 lists only *engagement* groups and the new FIM's only memberships are their personal group + the "FringeIsland Members" *system* group.
- Given the live project requires email confirmation, when `signUp` returns a pending-confirmation state instead of a session, then the UI surfaces a clear "confirm your email" state via a design-system primitive (no dead end, no silent failure) — the asserted behaviour matches the project's actual setting.
- Given pending invites matching the email exist in the substrate, when the account is created, then those invites **auto-claim** (case-insensitive); resulting **engagement-group** memberships then appear on `/groups`. This feature **does not break** that behaviour. *(B-INV-001 — substrate-inherited; invite management itself is out of scope.)*
- Given the new account, when `/groups` renders, then loading / empty / list states use design-system primitives.

### STORY-3: Consent captured at the creation moment (Privacy/GDPR binding)
As a person creating an account, I want to give explicit, informed consent before my account is created, so that my personal data is processed lawfully from the first moment.

**Acceptance criteria:**
- Given the sign-up form, when it renders, then it presents an **explicit, un-prechecked** consent acceptance (terms + privacy) that **gates submission** — sign-up cannot proceed without it.
- Given consent is not accepted, when sign-up is attempted, then it is **blocked both client-side and server-side** with a design-system error and **no account** is created.
- Given consent is accepted, when the account is created, then the consent decision is **recorded as a structured audit event via the PC-4 audit path** (who, when, what was consented to) — bound where the substrate supports it; where it does not, the record stays structured and the gap is logged (build-informed).
- *(Out of scope, noted: durable member-visible consent state + history is IDN-6/IDN-7 — this story captures **initial** consent only. Consent categories are designed open-for-extension — no sealed consent-type set.)*

### STORY-4: Account creation is observable and auditable (V1 / V4 binding begun)
As the platform, I want sign-up to emit telemetry and an audit entry, so that account creation is measurable and accountable from day one of Phase 3.

**Acceptance criteria:**
- Given a sign-up attempt, when it **starts / succeeds / fails**, then telemetry events are emitted toward the **PC-1 path** (V4), **including failures** (duplicate email, weak password, consent missing, confirmation-pending) — never silently swallowed.
- Given an account is created, when `handle_new_user` completes, then an **"account created" audit entry** is produced via the **PC-4 path** (V1) — this is where the skeleton's structured seam begins its real binding.
- Given a sink (PC-4 audit / PC-1 telemetry) is not yet fully realised on the substrate, when an event fires, then the seam remains structured and the shortfall is **recorded in Implementation notes** — consistent with FEAT-H001's honesty, no silent loss.

## Platform dependencies

- **PC-2 Identity** — `signUp` / account creation and session establishment; the `handle_new_user` profile + personal-group materialisation. Realises the **IDN-3 sign-up surface** and the FIM outcome of **IDN-2**. *(PC-2's contract is SDK-shape today — consumed via `@supabase/ssr`; no PC-2-owned `/api/v1/auth/*` route exists yet, so the Hub's own API route wraps it.)*
- **PC-3 Organisation** — personal-group creation, the "Myself" zero-permission role, "FringeIsland Members" baseline enrolment, and the membership read for the `/groups` landing (reuses the FEAT-H001 GRP-4 read path).
- **PC-4 Governance** — audit entry for account-created and consent-accepted (V1 binding begins here).
- **PC-1 Infrastructure** — telemetry path for sign-up events (V4 binding begins here).
- **Latent / routed:** durable consent persistence is latent (PC-2 §8 Q8/X4) — initial consent rides the PC-4 audit path for now; member-visible consent state is IDN-6/IDN-7 (later, may need a paired PC-2/PC-4 spec). Where PC reciprocation is still pending, the consumer-side claim is routed to **G-29** (per the plan's carried risks).

## Cross-product impact

The sign-up flow is **equipment-agnostic** (`requires-equipment: none`) — it appears on any surface. The Gimbal (senses surface, native, not Next.js) will realise its **own** sign-up shell over the same PC-2 capability; only the platform-side creation semantics (`handle_new_user`) are shared and inherited. Per **Mists-before-FIMs** (products-tier `CLAUDE.md`, ADR-U004): the senses surface may later offer a Mist-first entry that **transcends into this same creation path** — flagged for IDN-1/IDN-2 (FEAT-H003), which will wrap rather than replace this flow.

## Vertical impact

- **Privacy/GDPR:** This is the canonical personal-data collection moment (email, name, auth credential). An **explicit, un-prechecked consent gate** precedes account creation; the consent decision is recorded (audit). `show_real_name` defaults **false** (privacy-preserving display — the FIM's chosen name, not legal name, is shown to others). Right-to-deletion (IDN-10) and export (IDN-8) are later. The API returns only what the viewer may see — no over-fetch.
- **Notifications:** No notification **content** authored or delivered here. The notification-bell mount already exists in the shell (FEAT-H001). Sign-up is a natural future trigger for a welcome / onboarding notification — **deferred to the Notifications area**; none fired in this slice.
- **Administration:** Account creation is a lifecycle event — emit the **account-created audit entry** (V1). No DeusEx / moderation surface here; admin user-lifecycle (decommission / reactivate) is IDN-9 / IDN-12 (later). Product UI never exposes raw admin primitives.
- **Observability:** **Telemetry** on sign-up started / succeeded / failed (feature-level, not just a page view), failures included. Begins the real **PC-1 binding** that the skeleton left structured.
- **Transactions:** **None** — account creation involves no payment, subscription, or entitlement. Paid-tier entitlement is a later concern, resolved behind the Platform API, never in product code.
- **Extensibility:** Introduces no hardcoded types, enums, or permission scopes. The "Myself" role and "FringeIsland Members" group come from the **seeded substrate**, not product code (ADR-U018 — no sealed sets). Consent categories are designed **open for extension** — no sealed consent-type list — so IDN-6/IDN-7 can add categories without a breaking change.

## Implementation notes (6-done — 2026-06-25)

Built under `hub/` as the first Phase-3 (Identity) build area — **reusing the FEAT-H001 spine** (app shell, design-system layer, auth context, `/groups` read path, harness, seam libs), not re-scaffolding. The credentialed sign-up flow runs end-to-end and is green: **8 Jest integration tests** (3 new) + **9 Playwright E2E tests** (4 new) + **8 Jest unit tests** (backfilled); `npm run lint -w hub` + `npm run build -w hub` clean.

**Testing honesty (PROCESS §9).** The integration + E2E tests were written **test-alongside** and verified green in one pass — not a demonstrated red → green → refactor cycle, despite this feature's original "test-first" framing. The unit tier was **backfilled test-after** once the gap was caught (`tests/unit/lib/auth/signup.test.ts`, `tests/unit/app/signup/consent-gate.test.tsx`; 8 tests), and the `feature-development` skill was tightened so **FEAT-H003 onward enforces demonstrated-red + a unit tier**.

**Flow / key code:**
- **Sign-up lib (testable, lib-behind-route):** `hub/lib/auth/signup.ts` — `signUpFim(supabase, { email, password, displayName, consentAccepted })`. Enforces the consent gate before any creation, calls `supabase.auth.signUp({ options: { data: { display_name } } })` — the key `handle_new_user` reads is **`raw_user_meta_data.display_name`, not `full_name`** — and normalises duplicate / pending-confirmation outcomes.
- **API route (server-side gate + seams):** `hub/app/api/auth/signup/route.ts` (`POST`) re-checks consent **server-side** (independent of the client gate), runs `signUpFim` via the server client, records the `account.created` audit entry (V1) + `auth.sign_up_succeeded` telemetry (V4), and returns session tokens (or `pendingConfirmation`).
- **Auth facade:** `signUp(email, password, displayName, consentAccepted)` added to `hub/lib/auth/AuthContext.tsx` — POSTs the route, then `supabase.auth.setSession(tokens)` so the `onAuthStateChange` listener updates context (no manual reload).
- **UI:** `hub/app/signup/page.tsx` mirrors `login/page.tsx` (Suspense form; `TextField` / `Button` / `InlineError`), adds an **un-prechecked consent checkbox** that gates submit, a confirm-your-email state, and login↔signup cross-links.
- **Substrate (unchanged — No-go held):** `handle_new_user` does all materialisation server-side: profile (non-null `personal_group_id`), personal group named after the nickname (= first word of the display name), zero-permission "Myself" role, "FringeIsland Members" enrolment, `show_real_name=false` / `display_preference='nickname'`, and B-INV-001 pending-invite auto-claim. **No migration written.**

**Verification:** integration tests pin the substrate contract (B-AUTH-001, B-RBAC-017, B-DISP-001..011) via real anon `signUp` + admin-client assertions, plus duplicate rejection and consent refusal; E2E covers the browser flow (sign-up → `/groups`), consent-blocks-submit, and duplicate-email error. Every test mints fresh unique emails and tears users down (shared-Supabase hygiene).

**Build-informed deviations (PROCESS §9):**
- **STORY-2 landing corrected mid-build:** GRP-4's read path (`fetchMemberGroups`) filters to `group_type='engagement'`, so a brand-new FIM (only personal + "FringeIsland Members" *system* memberships) lands on the **empty state** ("No groups yet"), not a list showing "FringeIsland Members". The spec wording was fixed to match; the enrolment still happens in substrate (asserted in integration), it is simply not surfaced by GRP-4 until the FIM joins/creates an engagement group.
- **V1 audit stays a structured seam:** `admin_audit_log` is admin-only (RLS gated to `is_platform_admin()`) — no member-facing audit sink exists. `account.created` is recorded via `recordAuditEntry` (console + telemetry), exactly as FEAT-H001. Real persistence needs a `SECURITY DEFINER` member-lifecycle audit RPC = net-new substrate, deferred (No-go held; routed to **G-29** with the other PC-reciprocation gaps).
- **V4 telemetry** binds to the in-memory `emitTelemetry` seam (the PC-1 sink is still not realised) — started / succeeded / failed all emit, failures included.
- **Email confirmation:** the live project auto-confirms (`signUp` returns a session immediately); the `pendingConfirmation` branch is implemented and handled defensively but is dormant under the current setting.

Consent: initial consent is **gated + recorded** (structured). Durable member-visible consent state / history is **IDN-6 / IDN-7** (later). Tasks: `TASK-H002-01..04`.

---

## Amendment — 2026-07-03 (ADR-U038 S3 / PR #48)

**Sign-up consent is now enforced and durably recorded at the substrate**, superseding the "consent stays a structured seam; durable state is IDN-6/7 later" position above. The API-boundary audit found (ADR-U038 **S3**) that the consent gate lived *only* in this Hub route — a direct GoTrue `signUp` with the public anon key bypassed it entirely, and even Hub-created FIMs held no consent row once the IDN-6/7 ledger shipped. Fix (migration `20260702120100`): `handle_new_user` refuses to create a credentialed FIM without `consent_accepted` metadata (fail-closed — the auth insert rolls back) and appends one durable `transcendence` row to `consent_records` (policy_version stamped from the catalog). `signUpFim` passes the consent metadata; Mists remain exempt (consent captured at transcendence). The **V1 audit-sink gap is unchanged** (still routed to G-29) — only the *consent* recording moved to the substrate. Evidence: [`../../../planning/hub-v2/api-conformance-register.md`](../../../planning/hub-v2/api-conformance-register.md) §5 (S3).
