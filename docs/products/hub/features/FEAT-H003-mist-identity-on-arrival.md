# FEAT-H003: Mist identity & the FringeIsland entry — look around, then become a FIM

---
id: FEAT-H003
title: Mist identity on arrival — the FringeIsland entry and the lazy Mist actor
owner: hub
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

Today the Hub v2 has exactly two doors: sign **in** as an existing FIM (FEAT-H001) and sign **up** to become one (FEAT-H002). A person who has not yet decided to commit has nowhere to stand — the only states the app knows are *signed-out* and *FIM*. That contradicts canon: the anonymous entrant is a first-class inhabitant — the **Mist** (ADR-U031), who arrives without credentials, has full **near-side** access, and only later crosses the persistence-and-consent threshold to *become* a FIM (ADR-U004 "Mists before FIMs"). The substrate has no Mist at all: `users` has no `is_temporary`/Mist flag, `handle_new_user` assumes a signed-up auth user, no anonymous session is ever created, and the only Mist-adjacent shell on disk is a **vestigial pre-canon "Visitor" system group** with a "Guest" role — old naming, no behaviour, no test.

This feature builds the **arrival half** of the Mist lifecycle as a **three-tier identity model**: a **sessionless visitor** can reach a public *FringeIsland entry* and look around with **no session and no rows**; the **Mist** (anonymous session + proto personal group) is materialised **lazily, on the first act that needs an actor**; the **FIM** is reached by sign-up or (later) transcendence. This is the industry-standard guest pattern — anonymous viewing costs nothing, server-side identity is created just-in-time — and it makes the products-tier "Mists before FIMs" rule real. Transcendence (Mist→FIM) is **FEAT-H004 (IDN-2)**, which carries consent capture and the robust cleanup system, and is blocked on substrate decisions this feature does not need.

## Solution sketch

The next thin-but-complete slice after FEAT-H002, **reusing the spine** (app shell, design-system layer, auth context, `/groups` read path, harness, seam libs) — not re-scaffolding.

**Sessionless entry.** A public **FringeIsland entry** route is reachable with no session (offering *Sign in* / *Sign up* / *Look around*). The public entry and genuinely-public content are served sessionless — **no anonymous session, no proto personal group, no rows** — so bots and bounces cost nothing and anonymous viewing leaves no footprint. Per ADR-U031 stage 1, perceiving the *shared near-side world* itself (the town, presence, others) requires server access — so the sessionless tier is the **entry**, not the shared world; stepping into the shared world is the first act that makes you a Mist.

**Lazy Mist (the real "enter" act).** The Mist is born on the **first act that enters the shared near-side world** — concretely today, the entry's **"Look around"** *is* that act: clicking it is the deliberate "enter as a Mist", which calls the **"begin acting as a Mist"** seam and lands the visitor on a **minimal-but-real Mist-presence state** (identity-level: *"you're here as a Mist — this is your beginning; become a FIM to keep your journey"* — no town, no accretion visuals, nothing that pre-designs the unbuilt near-side world; a real seed, **not** a fake placeholder). At that point Supabase **anonymous sign-in** (ADR-U004) issues a real-but-temporary session, and `handle_new_user` — amended by **[FEAT-PC001](../../../platform/core/features/FEAT-PC001-mist-anonymous-substrate.md)** (the platform substrate this feature consumes) — materialises a **temporary `users` profile flagged `is_temporary = true`** with a non-null `personal_group_id`, the **proto personal group** (the Mist its sole member, zero-permission "Myself" role). A Mist needs this proto group because `get_current_personal_group_id()` *is* the actor in this repo's model — no proto group, no acting.

**Three-state identity + status gating.** `AuthContext` distinguishes *sessionless* / **Mist** (temporary) / **FIM** (permanent), derived from `is_temporary` (auth `is_anonymous`). The shell reads **status, not a permission fence** (ADR-U031 "intrinsic, not a fence"; ADR-U025 status, not a fence): a Mist gets near-side access and the **"become a FIM"** CTA (routing to FEAT-H002 sign-up today; FEAT-H004 makes it an in-place transcendence); FIM-only / Beyond affordances are simply not offered to a Mist.

**Continuity posture (locked — manifesto-aligned).** A Mist's presence is **session-ephemeral and unlinkable** (ADR-U031 stage 3). So a Mist that **leaves and returns across a true session boundary** (expired/reaped session, or a different device) is a **new Mist** — no cross-session identifier, no persisted location/trail, no "welcome back." A same-device return *within* the cleanup TTL resumes incidentally because the live session simply never ended — not a guarantee. **Durable, cross-session memory is the reward for becoming a FIM** ("want FringeIsland to remember your path? become a FIM") — an honest conversion incentive that is also the cheapest, most private option (no anonymous fingerprinting, no GDPR exposure).

**Privacy + observability begun.** No PII at Mist creation (the temporary profile carries no email/name); **no trait-profile computed pre-consent** (honoured by building no profiling). Mist-entry **telemetry** (V4) emits through the PC-1 seam, failures included. The vestigial **"Visitor" system group / "Guest" role → "Mist"** rename is part of the **FEAT-PC001** substrate this feature consumes (ADR-U031 rename target).

**Out of scope (FEAT-H004).** The *ephemerality guarantee* — TTL/inactivity reaping, explicit-erase-on-close, GDPR-grade erasure of abandoned Mists ("left without saying goodbye") — depends on a real scheduled reaper, and **pg_cron is not installed**. Per Stefan's steer this is to be built **robustly, to industry standard** (a real scheduled mechanism, even if backend-heavy — not a lazy on-request shortcut), alongside consent capture, in FEAT-H004. Until then, the *small* set of Mist rows created by actual actors **accumulates with no automated cleanup** — a known, bounded gap, logged and routed to IDN-2, never silently dropped.

## Appetite

A focused **foundation flow** — the third Phase-3 slice, and the *first* net-new-substrate one. Fixed: a public sessionless entry, a lazily-materialised Mist that drives the amended `handle_new_user` end-to-end, a status-aware identity the app branches on, status-driven near-side access, and the locked continuity posture — all tested, all API-first. Variable: how much status gating is wired against *today's* thin surface (few Beyond affordances exist in v2 yet) versus established as the contract later areas inherit. The **substrate is owned by the paired platform feature [FEAT-PC001]** (the `is_temporary` column + `handle_new_user` Mist branch + Visitor→Mist rename) — this Hub feature **consumes** it and carries **no migration of its own**. The **robust ephemerality/cleanup system and consent substrate are explicitly out** (FEAT-H004 ↔ FEAT-PC002).

## Rabbit holes

- **The first real act is "Look around"/enter — a real thin slice, not a stub.** The set of "acts valid for a Mist" accretes with later near-side areas, but the entry's "Look around" is a **genuine** enter-as-a-Mist act landing on a **minimal-real Mist-presence state** (identity-level, not town-level — no pre-designed near-side). Keep that state real-but-minimal; do **not** build a fake "coming soon" placeholder, and do **not** pre-design the town (fundamentals before experience design). The act-set accretes later.
- **Don't persist cross-session Mist memory.** The continuity posture forbids any durable anonymous identifier or persisted location/trail. Resist a "remember where they were" convenience — that is the FIM property, and building it for a Mist breaks unlinkability *and* creates GDPR exposure. If true anonymous cross-session continuity is ever wanted, it is a deliberate ADR amendment, not a feature toggle.
- **Anonymous sign-in carries no metadata.** Unlike FEAT-H002's `signUp`, anon sign-in passes no `display_name`. `handle_new_user` must tolerate the no-name case (nameless-Mist display defaults) without erroring — test the *outcome*, don't reimplement the trigger.
- **`is_temporary` source of truth.** Supabase sets `auth.users.is_anonymous = true` for anon sessions; the trigger should derive `users.is_temporary` from that, not from app code. Single-sourced, server-side.
- **Don't deadlock the auth listener.** Three-state resolution reads `is_temporary` after the session resolves — set state inside `onAuthStateChange`, derive/query in a separate effect (Hub `CLAUDE.md` gotcha).
- **Beyond gating is mostly forward-looking.** v2 has few Beyond surfaces to gate today. Establish the **status signal** and gate the affordances that exist (chiefly: durable-identity actions route to the become-a-FIM CTA). Note honestly what is contract-only.
- **Scope creep into transcendence.** The become-a-FIM CTA **links to FEAT-H002 sign-up**; it does **not** migrate Mist data. In-place atomic transcendence is FEAT-H004 — do not build a half-version here.

## No-gos

- **No Mist→FIM transcendence** (IDN-2 / **FEAT-H004**) — no atomic session-transfer, no consent capture, no in-flight journey carry-over (JRN-5/DS-3). The become-a-FIM CTA routes to the existing FEAT-H002 sign-up; Mist data is **not** migrated.
- **No cross-session Mist continuity / no durable Mist memory** — a returning anonymous Mist past session boundary is a new Mist (continuity is the FIM reward, per the locked posture). No anonymous fingerprinting, no persistent anonymous re-identification.
- **No ephemerality / TTL erasure / scheduled cleanup system** — pg_cron is absent; the robust reaper, TTL value, and GDPR erasure are FEAT-H004 (to be built to industry standard). **Known, bounded gap: the small set of actual-actor Mist rows accumulates with no automated cleanup until IDN-2 lands** — logged and routed, not silently dropped.
- **No consent capture or consent substrate** — consent is a *precondition of transcendence* (ADR-U031), not of arrival; the consent-state substrate is latent (PC-2 §8 Q8/X4) and is FEAT-H004 / a paired PC-2/PC-4 spec.
- **No new Beyond surfaces** invented to demonstrate gating — gating is established against affordances that already exist.
- **No profile editing (IDN-4), Journal (IDN-5), consent state/history (IDN-6/7), export (IDN-8), account-state/exit/reactivation (IDN-9/10/12), session inventory (IDN-11).**
- **No direct DB calls from frontend code** (ADR-U009) — the Supabase auth SDK (anon sign-in + session) is the only permitted contact, the same narrow exception FEAT-H001/H002 use.
- **No business logic in server components** — it lives behind the `hub/` API / the trigger (Hub `CLAUDE.md`).

## Stories

### STORY-1: Look around without signing in (sessionless public entry)
As a curious visitor, I want to reach FringeIsland and look around without any account or session, so that I can get a feel for it before committing anything — even my anonymity.

**Acceptance criteria:**
- Given a visitor with no session, when they open the **FringeIsland entry**, then the public entry renders with no auth prompt and offers *Sign in* / *Sign up* / *Look around* — and **no anonymous session and no `users`/`groups` rows are created** (verified: looking around leaves no substrate footprint).
- Given a sessionless visitor, when they view the public entry and any explicitly-public content, then access is granted without a credential — **perceiving the shared near-side world is not part of the sessionless tier** (per ADR-U031 stage 1 it requires the Mist session; see STORY-2).
- Given the entry, when it renders, then loading / empty states use design-system primitives and no Mist chrome implies an identity the visitor does not yet have.

### STORY-2: Become a Mist the moment you act (lazy materialisation)
As a visitor who decides to *do* something, I want to become a Mist just-in-time, so that I can act on the near side without first having to sign up.

**Acceptance criteria:**
- Given a sessionless visitor on the entry, when they click **"Look around"** (the deliberate enter-as-a-Mist act) — via the "begin acting as a Mist" seam — then Supabase **anonymous sign-in** establishes a session, `handle_new_user` (**FEAT-PC001**) materialises an FK-linked `users` profile flagged **`is_temporary = true`** with a **non-null `personal_group_id`**, and the visitor lands on a **minimal-but-real Mist-presence state** (identity-level: a real beginning + the become-a-FIM CTA — not a fake placeholder, not the pre-designed town).
- Given the Mist materialises, then the **FEAT-PC001 substrate contract** holds — exactly one proto personal group (sole member, zero-perm "Myself" role), **no** FringeIsland Members enrolment, no-name handled; FEAT-H003 **consumes** this (FEAT-PC001 owns and tests the substrate) and asserts the consumed `is_temporary` Mist + non-null `personal_group_id`.
- Given a Mist session already exists, when the visitor acts again within it, then **no second Mist profile** is created (idempotent — the seam materialises at most one Mist per live session).
- Given the frontend, when it begins acting as a Mist, then it uses only the Supabase auth SDK (anon sign-in) — the sole narrow exception; **no table calls** from frontend code (ADR-U009).

### STORY-3: The app knows your state and gates by it (three-state identity)
As any visitor, I want the app to know whether I'm sessionless, a Mist, or a FIM, so that it shows me exactly the doors that are mine.

**Acceptance criteria:**
- Given a session, when `AuthContext` resolves, then it exposes a distinct **sessionless / Mist / FIM** state (Mist derived from `is_temporary` / `is_anonymous`), without querying inside the auth listener.
- Given a Mist session, when the shell renders, then it presents the **"become a FIM"** CTA (routing to FEAT-H002 sign-up) and a FIM-only / Beyond affordance in view is **closed by status** (not offered, or routed to the CTA) — never offered-then-permission-denied.
- Given any gating decision, when it is made, then it branches on **identity status** (`is_temporary`/Mist), never on a hardcoded role string (products-tier `CLAUDE.md`).
- Given a FIM session (FEAT-H001/H002 unchanged), when the shell renders, then **no Mist chrome** appears and existing FIM behaviour is unaffected (no regression).

### STORY-4: Leave and come back (the continuity posture)
As a Mist who wanders off and returns, I want an honest, private relationship with the platform, so that I'm never tracked across visits I never consented to — and I understand that lasting memory is what signing up gives me.

**Acceptance criteria:**
- Given a Mist whose session has ended (expired/reaped) or who returns on a different device, when they come back, then they are a **new Mist** — there is **no cross-session identifier**, no restored location, no "welcome back" derived from a prior anonymous visit.
- Given a Mist on the same device whose live session has **not** ended and whose row has not been reaped, when they return within the cleanup TTL, then the session resumes incidentally (live-session persistence) — this is explicitly **not** offered or promised as a continuity guarantee.
- Given the become-a-FIM CTA, when it is presented, then it frames durable continuity as a property of becoming a FIM (the conversion incentive), consistent with the platform promise / manifesto.

### STORY-5: Mist entry is private and observable (V2 / V4 binding)
As the platform, I want Mist creation to collect no PII and to emit telemetry, so that anonymous entry is privacy-preserving and measurable from day one.

**Acceptance criteria:**
- Given a Mist is created, when the temporary profile is materialised, then it carries **no email and no real name** (data minimisation) and **no trait-profile is computed** (no pre-consent inference — ADR-U031 stage 3, honoured by building no profiling).
- Given a Mist session is established, when materialisation completes, then a **mist-entered telemetry event** is emitted toward the **PC-1 path** (V4), **including failures** — never silently swallowed.
- Given the robust ephemerality system is not yet realised (pg_cron absent), when a Mist row is created, then the **accumulation gap is recorded** (build-informed, PROCESS §9) and routed to IDN-2 — the seam stays honest.

## Platform dependencies

- **[FEAT-PC001](../../../platform/core/features/FEAT-PC001-mist-anonymous-substrate.md) (Platform Core Identity) — the substrate this feature consumes.** Provides the `is_temporary` state, the `handle_new_user` Mist branch (flag + name fallback + skip-Members), the proto personal group via the shared seam, and the Visitor→Mist rename — the platform half of IDN-1. The Hub consumes it via the Supabase auth SDK anon sign-in (ADR-U004); PC-2's contract is SDK-shape today (no `/api/v1/auth/*` route). **This is the paired-spec reciprocation (Q4) — the substrate is properly owned at the platform tier, not routed to G-29.**
- **PC-1 Infrastructure** — telemetry path for the mist-entered event (V4 seam, as FEAT-H001/H002; the PC-1 sink itself is still unrealised — that seam remains routed to **G-29**).
- **Latent (FEAT-H004 ↔ FEAT-PC002, not this feature):** the **robust ephemerality/cleanup system** (real scheduled reaper — pg_cron or equivalent — + TTL + GDPR-grade erasure of abandoned Mists) and **consent capture** at transcendence (PC-4; consent substrate latent, PC-2 §8 Q8/X4).

## Cross-product impact

Mist entry is **equipment-agnostic** (`requires-equipment: none`) — it appears on any surface. The Gimbal (senses surface, native, not Next.js) will realise its **own** entry shell over the same PC-2 anon-session capability; only the platform-side arrival semantics (`handle_new_user`, `is_temporary`) and the **continuity posture** (anonymous = unlinkable across sessions; durable memory = FIM) are shared and inherited. This feature is the canonical instance of the products-tier **"Mists before FIMs"** rule (ADR-U004): the Mist is built as a first-class entrant, and FIM creation (FEAT-H002) is reframed as the *destination* of transcendence (FEAT-H004), not the only door.

## Vertical impact

- **Privacy/GDPR:** Mist entry is the **data-minimisation** case — looking around is **sessionless** (no rows at all), and a materialised Mist carries **no PII** and **no pre-consent trait-profile**. The locked **continuity posture** is itself a privacy guarantee: **no cross-session anonymous identifier**, no persistent re-identification — anonymous presence is unlinkable, and durable memory begins only at transcendence with consent. The *durable* ephemerality guarantee (TTL erasure of abandoned Mists) is **FEAT-H004**, to be built to industry standard — the gap is named, not papered over.
- **Notifications:** **None** — no notification authored or fired on Mist entry. (Welcome/onboarding is a transcendence-time trigger — FEAT-H004 / the Notifications area.)
- **Administration:** Mist lifecycle is an admin concern (the future robust cleanup sweep, Mist-vs-FIM population visibility) but **no admin surface or DeusEx primitive is built here**; the accumulation gap is logged for the admin-owned cleanup decision (FEAT-H004). Product UI exposes no raw admin primitives.
- **Observability:** **Telemetry** on Mist entry — emitted toward the PC-1 path (V4), failures included. Continues the structured-seam binding from FEAT-H001/H002; the PC-1 sink is still not realised, so the event binds to the in-memory seam.
- **Transactions:** **None** — anonymous entry involves no payment, subscription, or entitlement.
- **Extensibility:** Introduces the **Mist identity status** as a first-class state, modelled as a **boolean flag + status-derived branching**, not a sealed role enum — gating branches on `is_temporary` status (ADR-U025), never on a hardcoded role string, so later identity states extend without a breaking change. The "Mist" system group replaces the vestigial "Visitor" group via seed/migration, not product code (ADR-U018 — no sealed sets).

## Canon clarifications (ADR-U031 / ADR-U004 — landed 2026-06-26)

These addenda were **approved and appended** to both ADRs (dated clarification notes), anchoring this feature's reading to canon — the sessionless-entry / lazy-Mist boundary and the cross-session = fresh-Mist posture:

1. **ADR-U031 (Mist lifecycle):** "Entry — on arrival" is clarified to mean the Mist is instantiated at the **first participatory act** that needs an actor, not at page load; pure looking-around is **sessionless**. Corollary: a Mist returning across a true session boundary is a **new Mist** (stage-3 unlinkability); durable cross-session continuity is a FIM property granted at transcendence, and any same-device resume within the cleanup TTL is incidental live-session persistence.
2. **ADR-U004 (anonymous sign-in):** the "temporary session on arrival" is created **lazily** (first act, not page load), so anonymous browsing is sessionless and bot/bounce traffic creates no temporary profiles; returning anonymous visitors past session expiry/cleanup are new Mists (no persistent anonymous re-identification).

## Resolved decisions (2026-06-26)

1. **Migration shape — approved** (Q1), and **owned by the paired platform feature [FEAT-PC001]** (column + `handle_new_user` Mist branch + Visitor→Mist rename); this Hub feature consumes it.
2. **Mist access — status-driven** (Q2). The Mist gets the proto personal group only; near-side access is by `is_temporary` status, not a permission set / system-group enrolment (ADR-U031 "intrinsic, not a fence").
3. **First real act — "Look around" = enter as a Mist** (Q3, "b-done-right"). It lands on a minimal-but-real Mist-presence state (identity-level), not a fake placeholder; the entry stays sessionless.
4. **Ownership — paired platform spec** (Q4). FEAT-PC001 (Platform Core Identity) provides the substrate; FEAT-H003 (Hub) consumes it — the formal cross-tier workflow, not substrate carried inside the product feature.
