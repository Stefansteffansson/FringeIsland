# FEAT-H004: Mist → FIM transcendence + the farewell — become a FIM in place, or say goodbye

---
id: FEAT-H004
title: Mist transcendence and farewell — in-place become-a-FIM with consent, and explicit-erase on leave
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

FEAT-H003 (IDN-1) made the Mist a first-class entrant and put a **"become a FIM" CTA** on the surface — but that CTA is a placeholder: it **routes to the existing FEAT-H002 sign-up and does not migrate the Mist's data**. A Mist who signs up today abandons the session they were just in and starts over as a fresh FIM. That contradicts canon: transcendence is "the one moment data binds durably… the session's experience transfers into the FIM account with **continuity** (nothing restarts)" (ADR-U031 stage 4). Two further gaps remain from IDN-1, both flagged as deferred:

- **No consent capture.** Consent is the *precondition* of transcendence (ADR-U031), and the consent substrate was latent (PC-2 §8 Q8/X4). There is no consent gate in the become-a-FIM flow.
- **No farewell / explicit-erase.** A Mist who decides to leave has no way to **say goodbye** — no explicit-erase-on-close — and abandoned Mists accumulate (the live gap).

The platform half — **[FEAT-PC002](../../../platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md)** — now provides the substrate (the reaper, the atomic transcendence finalisation, the append-only consent table), unblocked by **[ADR-U033](../../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md)** + **[ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md)**. This feature builds the **Hub surface** that consumes it: in-place transcendence with a consent gate, and the farewell.

## Solution sketch

The next slice after FEAT-H003, **reusing the spine** (app shell, design-system layer, `AuthContext` three-state identity, the FEAT-H002 sign-up form, the seam libs) — not re-scaffolding. Upgrades the FEAT-H003 become-a-FIM CTA from a redirect into a real in-place transcendence, and adds the farewell.

**In-place transcendence (the real become-a-FIM).** From a Mist session, the become-a-FIM flow collects credentials (**reusing the FEAT-H002 sign-up form**) **and an explicit consent** (the consent gate). On submit, the Hub: (1) calls Supabase **anonymous→permanent conversion** (`updateUser`), which **preserves the same `auth.users.id`** — so the Mist's proto personal group and journeys carry over with **continuity, nothing restarts, no data copy**; then (2) calls the **FEAT-PC002 transcendence finalisation RPC**, which atomically flips `is_temporary => false`, enrols the new FIM in "FringeIsland Members", and writes the consent record. `AuthContext` re-derives identity **Mist → FIM**, and the FIM lands on **`/groups`** — the same session, continued.

**Consent gate (precondition, ADR-U031).** Transcendence cannot fire without explicit consent — the consent control is a required step in the flow, not a pre-checked box, and its captured purpose/version is what FEAT-PC002 records atomically. No consent → no conversion call.

**The farewell (explicit-erase).** A Mist gets a **"say goodbye / leave"** affordance that calls the FEAT-PC002 **explicit-erase RPC** — erasing the Mist's session data immediately (via `ConfirmModal`, the Hub's confirmation primitive), then returning to the sessionless entry. This is the honest counterpart to "leave without saying goodbye" (the reaper handles the silent case server-side).

**Persistence-and-consent only (forward-looking completion gate).** This delivers ADR-U031's **persistence-and-consent** half of transcendence. The **metamorphosis-at-completion** gate (the ball / Beyond unlock, fired only when "all founding questions answered") depends on the **unbuilt founding-questions assessment** — it is **out of scope**, named as a forward-looking seam, not built (fundamentals before experience design).

## Appetite

A focused **conversion + farewell flow** — the IDN-2 Hub slice. Fixed: an in-place transcendence that drives the FEAT-PC002 finalisation end-to-end with continuity, a required consent gate, the say-goodbye explicit-erase, status re-derivation Mist→FIM, and no regression to FEAT-H001/H002/H003 — all tested, all API-first. The **substrate is owned by the paired [FEAT-PC002]** (reaper, finalisation RPC, consent table) — this Hub feature **consumes** it and carries **no migration of its own**. **Out:** the founding-questions assessment, the ball / Beyond unlock, consent withdrawal/history UI (IDN-6/7), and the robust reaper internals (server-side, FEAT-PC002).

## Rabbit holes

- **Continuity is the platform's, via id-preservation — don't re-implement it.** The anon→permanent conversion keeps the same user id, so continuity falls out; the Hub's job is to call the conversion then the finalisation RPC, **not** to copy or re-create the Mist's rows. Building a client-side data migration would be wrong and dangerous (it could race the reaper).
- **Consent is a gate, not a footnote.** Don't pre-check or bury it. Transcendence must be impossible without an explicit consent act; the captured purpose/version flows to FEAT-PC002. Test the no-consent path (conversion never fires).
- **Order matters: convert, then finalise.** Supabase `updateUser` first (links identity, preserves id), then the FEAT-PC002 RPC (flag + Members + consent, atomic). If the RPC fails, the user is still a valid Mist (FEAT-PC002 rolls back) — surface the failure, don't leave a half-FIM in the UI.
- **Don't query inside `onAuthStateChange`.** Identity re-derivation Mist→FIM reads `is_temporary` after the session updates — set state in the listener, derive in a separate effect (Hub `CLAUDE.md` gotcha; same discipline as FEAT-H003).
- **Use `ConfirmModal`, never `confirm()`, for the farewell.** Explicit-erase is destructive — confirm through the Hub's primitive; a browser dialog would block the session and break the visual language.
- **Don't build the assessment or the ball.** The completion gate is forward-looking; do not stub a fake "founding questions" flow or pre-design the Beyond. Persistence-and-consent is the whole of this slice.
- **No direct DB calls (ADR-U009).** The Supabase auth SDK (anon→permanent conversion) is the same narrow exception FEAT-H001/H002/H003 use; transcendence finalisation and explicit-erase go through the **Platform API / PostgREST RPC** that FEAT-PC002 exposes — no table calls from frontend code.

## No-gos

- **No founding-questions assessment, no metamorphosis-completion gate, no ball, no Beyond unlock** — IDN-2 is the persistence-and-consent threshold only; the completion gate wires to the assessment when built (forward-looking seam).
- **No client-side Mist-data migration** — continuity is platform-side (id-preservation + the FEAT-PC002 finalisation RPC); the Hub never copies or re-creates rows.
- **No consent withdrawal / consent history / re-consent UI (IDN-6/7)** — only the transcendence consent gate is built; the substrate supports the rest later.
- **No robust reaper internals** — the scheduled sweep, TTL, and erasure cascade are server-side (FEAT-PC002); the Hub only triggers the **explicit-erase** (say goodbye) and surfaces nothing of the sweep.
- **No new Beyond surfaces** invented to demonstrate FIM-gained access — becoming a FIM grants persistence + Members baseline; new Beyond affordances are later features.
- **No direct DB calls from frontend code** (ADR-U009) — auth SDK for the conversion, Platform API/RPC for finalisation + erase.
- **No business logic in server components** — it lives behind the `hub/` API / the FEAT-PC002 RPCs (Hub `CLAUDE.md`).

## Stories

### STORY-1: Become a FIM in place, with continuity (transcendence)
As a Mist who decides to stay, I want to become a FIM without losing the session I'm in, so my experience continues unbroken.

**Acceptance criteria:**
- Given a Mist session, when they complete the become-a-FIM flow (credentials + consent) and submit, then the Hub calls Supabase anon→permanent conversion (preserving the same `auth.users.id`) and then the **FEAT-PC002 transcendence finalisation RPC**, and on success `AuthContext` re-derives identity **Mist → FIM**.
- Given transcendence succeeds, when the FIM lands, then they are on **`/groups`** with the **same** `personal_group_id` and journeys as their Mist session — **nothing restarts** (continuity verified, no re-scaffold, no "welcome, new user" reset).
- Given the finalisation RPC fails, when the error returns, then the user remains a valid **Mist** (no half-FIM UI state) and the failure is surfaced — never silently swallowed.
- Given the frontend, when it transcends, then it uses only the Supabase auth SDK (conversion) + the Platform API/RPC (finalisation) — **no table calls** (ADR-U009).

### STORY-2: Consent is an explicit precondition (consent gate)
As a Mist becoming a FIM, I want to give explicit consent as part of the step, so my data binds durably only because I chose it.

**Acceptance criteria:**
- Given the become-a-FIM flow, when it renders, then an **explicit consent control** (not pre-checked) is a required step, with its purpose/policy version legible to the user.
- Given consent is **not** given, when the user submits, then **no conversion and no finalisation** occur (transcendence is impossible without consent — ADR-U031).
- Given consent is given and transcendence succeeds, then the consent captured (purpose = transcendence, version) is the record FEAT-PC002 writes **atomically** with the finalisation (the Hub passes it; the platform persists it).

### STORY-3: Say goodbye (explicit-erase / the farewell)
As a Mist who decides to leave, I want to erase my visit on the way out, so I leave no trace by my own choice.

**Acceptance criteria:**
- Given a Mist session, when the user chooses **"say goodbye / leave"** and confirms via **`ConfirmModal`**, then the Hub calls the **FEAT-PC002 explicit-erase RPC**, the Mist's session data is erased immediately, and the user returns to the **sessionless entry**.
- Given the farewell affordance, when the identity is a **FIM** (not a Mist), then it is **not offered** (a FIM leaves via account-state/exit, IDN-9/10/12 — not this farewell).
- Given the explicit-erase completes, when the user returns to the entry, then they are **sessionless** (a later return is a new Mist — continuity unchanged from FEAT-H003).

### STORY-4: No regression to existing identity flows
As any existing user, I want sign-in, direct sign-up, and Mist arrival to keep working unchanged, so IDN-2 adds without breaking.

**Acceptance criteria:**
- Given FEAT-H001/H002 (sign-in, direct FIM sign-up), when used, then they behave **unchanged** (a person can still sign up as a FIM at the door — ADR-U031 Path 1 — without first being a Mist).
- Given FEAT-H003 (sessionless entry, lazy Mist, three-state gating), when used, then it behaves **unchanged**, except the become-a-FIM CTA now opens the **in-place transcendence flow** instead of a bare sign-up redirect.
- Given a FIM session, when the shell renders, then **no farewell/erase Mist chrome** appears and existing FIM behaviour is unaffected.

### STORY-5: Transcendence is observable (V4)
As the platform, I want the Hub to emit transcendence telemetry, so conversion is measurable and traceable from day one.

**Acceptance criteria:**
- Given a transcendence completes, when finalisation succeeds, then a **transcendence/became-a-FIM telemetry event** (actor + outcome) is emitted toward the PC-1 path (V4), **including failures** — never silently swallowed (continuing the FEAT-H001/H002/H003 seam discipline).
- Given transcendence is the welcome/onboarding trigger (FEAT-PC002 cascade), when it fires, then the Hub emits/enables the trigger; notification **copy/routing is the Notifications area's**, not authored here.

## Platform dependencies

- **[FEAT-PC002](../../../platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md) (Platform Core Identity) — the substrate this feature consumes.** Provides the atomic transcendence finalisation RPC (flag flip + Members enrolment + consent write), the append-only consent table, and the explicit-erase RPC — the platform half of IDN-2. The Hub consumes the conversion via the Supabase auth SDK (ADR-U004) and the finalisation/erase via the Platform API/PostgREST RPC. **This is the paired-spec reciprocation — the substrate is owned at the platform tier.**
- **PC-1 Infrastructure** — telemetry path for the transcendence event (V4 seam, as FEAT-H001/H002/H003; the PC-1 sink itself remains unrealised — that seam stays routed to G-29).
- **Latent (not this feature):** the founding-questions assessment + the metamorphosis-completion gate (ball / Beyond unlock) — forward-looking, dependent on an unbuilt assessment capability.

## Cross-product impact

Transcendence + farewell are **equipment-agnostic** (`requires-equipment: none`). The Gimbal (senses surface, native) will realise its **own** transcendence + farewell UX over the **same** FEAT-PC002 substrate; only the platform-side semantics (the conversion, the finalisation RPC, the consent table, the explicit-erase) and the **continuity posture** are shared and inherited. This feature completes the products-tier **"Mists before FIMs"** arc begun by FEAT-H003: the Mist is the first-class entrant, and transcendence is the *destination*, now real and in-place rather than a sign-up redirect.

## Vertical impact

- **Privacy/GDPR:** the **core** of this feature on the surface. Consent is captured as an explicit, legible precondition (the gate); the farewell gives the Mist an explicit right-to-erasure on their own terms; durable data-binding happens only at consented transcendence. The Hub **captures and passes** consent; the authoritative record lives in Platform Core (FEAT-PC002) — the Hub never infers or stores consent state locally.
- **Notifications:** transcendence **emits the welcome/onboarding trigger** (the Hub fires/enables it; copy/routing is the Notifications area). The farewell fires **no** notification (a leaving Mist holds no durable address).
- **Administration:** no admin surface or DeusEx primitive is built here; the scheduled reaper (the silent-departure cleanup) is server-side (FEAT-PC002). Product UI exposes no raw admin primitives.
- **Observability:** transcendence telemetry (actor + outcome, failures included) toward the PC-1 path (V4); continues the structured-seam binding from FEAT-H001/H002/H003; the PC-1 sink remains unrealised, so the event binds to the in-memory seam.
- **Transactions:** **None** — becoming a FIM (or saying goodbye) involves no payment, subscription, or entitlement.
- **Extensibility:** consent is captured against an **open purpose identifier** (FEAT-PC002 / ADR-U034) — not a sealed enum; the transcendence flow branches on **identity status** (`is_temporary` → FIM), never a hardcoded role string (products-tier `CLAUDE.md`). The farewell is offered by status, not by device.

## Implementation notes (2026-06-27, `6-done`)

Built across three tasks (`TASK-H004-01..03`), TDD red-first, reusing the FEAT-H001/H002/H003 spine — no re-scaffold, no migration (consumes the merged FEAT-PC002 substrate).

- **TASK-H004-01 — in-place transcendence + consent gate (STORY-1/2/5).** New `hub/lib/auth/transcendence.ts` (`finaliseTranscendence` wrapping the `finalise_transcendence` RPC) behind `POST /api/auth/transcend` (server consent gate + audit/telemetry/welcome-trigger); `AuthContext.transcend` does the client-side anon→permanent `updateUser` then posts the route (convert-then-finalise); new `/become-a-fim` page (reuses the FEAT-H002 fields + a required consent control, Mist-gated); the `/mist` CTA repointed `/signup`→`/become-a-fim`. RPCs go through the route, never the browser (ADR-U009).
- **TASK-H004-02 — the farewell (STORY-3).** New `ConfirmModal` design-system primitive (copy-with-correction from the `hub-legacy` oracle, named export + `data-testid` + `busy` state); `hub/lib/auth/farewell.ts` (`explicitEraseMist`) behind `POST /api/auth/farewell`; `AuthContext.sayGoodbye` (route → `signOut` → sessionless); the Mist-only "say goodbye" affordance on `/mist`.
- **TASK-H004-03 — E2E + regression (STORY-1 continuity / STORY-4).** New `tests/e2e/transcendence.spec.ts` (transcendence + consent-gate + farewell journeys); the stale `entry.spec.ts` CTA assertion updated `/signup`→`/become-a-fim`; consent-aware E2E cleanup helper (`deleteTranscendedUser`).

**Test evidence (all red-first; pyramid upright).** 27 new unit (component/logic: consent gate, outcome navigation, AuthContext glue, `ConfirmModal`, the two route server-gates), 4 new integration (the real anon→permanent conversion + `finaliseTranscendence` continuity/enrolment/consent; the rollback-stays-a-Mist path; `explicitEraseMist` erases a Mist / refuses a FIM), 3 new E2E journeys. Full suite green: **54 unit + 31 integration + 15 E2E**; lint + build clean. Honesty note: the "a FIM is offered no say-goodbye chrome" unit assertion is an absence guard (vacuously true before the affordance existed, meaningful after) — not test-after backfill; everything else was demonstrated red before its implementation.

## Blocking decisions (resolved 2026-06-26)

1. **Reaper mechanism** — **resolved by [ADR-U033](../../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md)** (pg_cron + scheduled SECURITY DEFINER sweep; the Hub surfaces only the explicit-erase / farewell). Server internals are FEAT-PC002.
2. **Consent substrate** — **resolved by [ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md)** (append-only, PC-2-owned, captured atomically at transcendence; the Hub captures + passes consent at the gate). 
3. **Scope of transcendence** — **persistence-and-consent threshold only**; the metamorphosis-completion gate (ball / Beyond, gated by the unbuilt founding-questions assessment) is forward-looking, not built (ADR-U031).

### Post-6-done corrective (2026-08-13) — TASK-TRX-02: the transcend window held FIM too early

Found on a live walk (with the substrate half, [TASK-TRX-01](../../../planning/backlog/tasks/TASK-TRX-01-transcendence-drops-entered-identity.md)): `updateUser` flips `is_anonymous` — and fires `USER_UPDATED` — before `finalise_transcendence` commits, so `identity` derived `'fim'` mid-transaction and every fim-keyed read that fired in the window was refused by the substrate ("invitations are FIM-only"), with the refusals sticking in session caches (the consume-once adopted bundle slice fed a rejected read into panel state; log-verified end to end). The seam now holds `identity` at `'mist'` from the consent gate until the finalisation route resolves, and on success calls `invalidateAllCaches()` + fires the house `refreshNavigation` event so the FIM session starts with a clean slate; failure paths keep the prior semantics. Red-first unit cells (gated fetch + mid-flight `USER_UPDATED` delivery) plus a labelled green-by-construction boundary guard (failure invalidates nothing); the transcend E2E journey gained the header-name observable-effect assertion. **Accepted limitation, stated:** a second same-browser tab receives the cross-tab auth event immediately and can still race the window — the fix heals the transcending tab (the reported repro); a cross-tab hint is a forward seam if it ever bites.
