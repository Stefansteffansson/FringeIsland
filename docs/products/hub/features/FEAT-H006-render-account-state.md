# FEAT-H006: Render account state — show the FIM whether their account is active, suspended, or decommissioned

---
id: FEAT-H006
title: Render account state — the Hub surfaces the FIM's account lifecycle state (active / suspended / decommissioned) instead of a broken empty experience
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Implementation notes (6-done — 2026-06-29)

Realized in Cycle A (IDN-9). Authoritative deltas from the as-designed body below:
- **Vocabulary:** the off-but-not-closed state renders as **suspended** ("Your account has been suspended by an administrator. Please contact support."). The earlier ambiguous framing for this state is retired — see [`../../../planning/hub-v2/account-lifecycle-states-decision.md`](../../../planning/hub-v2/account-lifecycle-states-decision.md) (the canonical record). The member-initiated `paused` state + its self-service reactivation (IDN-12) are deferred (FEAT-H007 parked).
- **No reactivation affordance this cycle:** the suspended surface offers NO self-reactivation (the FEAT-H007 affordance is deferred/parked with IDN-12); it offers sign-out so the member is not stranded.
- **Architecture:** account state is resolved once per session by an `AccountStateProvider` in the root layout; an `AccountStateGate` renders the honest standalone surface INSTEAD of the chrome for a suspended/decommissioned/unknown-state FIM (so a switched-off member never hits the profile-dependent account menu). Active/Mist/sessionless pass through. A quiet "Account: active" line shows in profile settings.
- **Tests (red->green):** unit `hub/tests/unit/components/account/AccountStateView.test.tsx` + `hub/tests/unit/lib/account/AccountStateProvider.test.tsx`; E2E `hub/tests/e2e/account-state.spec.ts` (active not interrupted, profile legibility, suspended surface, closed surface). `next build` + lint clean.

## Performance revision (6-done amendment — 2026-07-01) — the gate is non-blocking

The 2026-07-01 performance investigation (region co-location, [ADR-U035](../../../architecture/decisions/ADR-U035-compute-datastore-colocation.md)) isolated the residual responsiveness cost to the **client-render waterfall**: the root-layout gate **blocked every page** on a serial `/api/account/state` round-trip *before* the page rendered and started its own fetches (`AccountStateView` `if (loading) return <LoadingState/>`). That serial gate is removed; the architecture-integrity check (perf bridge `2026-07-01_01`) confirmed this is **Hub shell rendering only** — API-first (ADR-U009) holds, Platform Core still owns the data + the FEAT-PC004 contract, the L1-L5 decomposition is untouched.

**New gate semantics — optimistic, intercept-on-confirmed:**
- While the account-state read is **in flight**, the gate renders the page **optimistically** (treats the member as active by default) — it does **not** block the whole app on the round-trip. The page's own data fetches (`/api/groups`, `/api/profile/me`) therefore fire **in parallel** with the account-state read instead of waiting behind it. (They already live in sibling components — `GroupsPage` / `AccountMenu` — so de-blocking the gate is the only change needed to parallelize them; no fetch was chained to another.)
- The gate **intercepts only on a confirmed off-state**: `suspended` / `decommissioned` / an unknown-non-active label, or a read **error**. The standalone suspended / decommissioned / error surfaces are unchanged; the error surface still wins over the optimistic render (never silently leave a member on the active experience).
- **Trade-off (stated deliberately):** a switched-off member may briefly see the chrome flash before the read resolves and the surface intercepts. This is acceptable because the data behind the chrome is **RLS-protected regardless** (`users_select_active` hides a suspended member's own rows — they see empty/loading states, never another member's data), and the switched-off case is rare. The honest off-state surface still wins the moment the state resolves.

Captured in [`../../../planning/hub-v2/perf-hardening-backlog.md`](../../../planning/hub-v2/perf-hardening-backlog.md) as Tier 1. Maturity stays `6-done`; **STORY-4 below is revised to match** (the prior "show a blocking loading state while in flight" criterion is superseded).

- **Code:** `AccountStateView.tsx` — dropped the blocking `if (loading) return <LoadingState/>` (+ its now-unused import); added `if (loading && !error) return children`. Provider/Gate unchanged (the provider still exposes `loading` for the profile "Account: active" legibility line).
- **Tests (red->green, demonstrated red first):** the STORY-4 unit test was rewritten to assert in-flight → optimistic children with **no** blocking gate — confirmed red against the old code (rendered "Checking your account…"), green after the change; a second unit test pins the no-stale-surface-flash-during-`reload()` behaviour. Full Hub unit suite + `next build` + lint green. The E2E `STORY-1` active case adds a "no Checking-your-account gate" assertion (interception cases unchanged); the **full E2E suite was run live against the dev server + real substrate and is green (31/31)**, including the four FEAT-H006 account-state specs (active not interrupted + no blocking gate, profile legibility, suspended interception, decommissioned interception).
- **Live before/after measurement is a manual step** (Network tab / `x-vercel-id`): the change removes one serial ~80 ms `/api/account/state` round-trip from the critical path of every page load.

## Problem

A FIM's account can be **active**, **suspended**, or **decommissioned**. Today the Hub only knows how to render an active member: when a suspended FIM authenticates, profile resolution returns nothing (the platform hides their row), and they land in a broken, empty, unexplained experience. The Hub has no honest surface for "your account is suspended" or "this account is closed."

IDN-9 ("render account state to the member") is that surface. The Hub must read the member's own account state — via the paired platform contract (FEAT-PC004), **never** a direct table read (ADR-U009) — and render it clearly: an active member proceeds normally; a suspended member sees a clear, calm explanation of the admin hold; a decommissioned member sees a terminal closed-account message with no false hope of return. (Self-service return is the deferred IDN-12 concern — FEAT-H007, parked.) This is the foundation IDN-12 (reactivation) and the later IDN-10 (exit/deletion) both build on.

## Solution sketch

- On a FIM session, the Hub resolves account state through **`GET /api/v1/account/state`** (FEAT-PC004). The state read is the **first-class branch** when ordinary profile resolution comes back empty — instead of treating "no profile" as an error, the Hub asks the state contract *why*.
- **Active** → no interruption; the member proceeds to their normal experience. Account state is also legible in account settings (a quiet "Account: active" line).
- **Suspended** → a dedicated **suspended-account surface**: a clear explanation of the state, what it means (the account is on hold, not deleted). Self-service reactivation (FEAT-H007) is the deferred IDN-12 half; this cycle the surface offers a way out (sign-out), not a way back in.
- **Decommissioned** → a **terminal closed-account surface**: the account is permanently closed; no reactivation affordance is offered.
- **Mist / no FIM account** → no account-state surface at all (a Mist has no durable FIM account), matching the identity-gating pattern in FEAT-H005.
- All reads go through the Platform API with `Authorization: Bearer <jwt>`; the Hub never reads `public.users` directly.

## Appetite

Small-to-moderate. A state-resolution hook in the shell's session bootstrap, three rendered states (active pass-through, suspended surface, decommissioned surface), identity-gating for Mist, loading/empty handling, and the account-settings legibility line. No platform mutation — this feature only renders.

## Rabbit holes

- **Don't infer state from a failed profile fetch.** "Profile came back empty" is not the same as "suspended" — always read the explicit state contract (FEAT-PC004) rather than guessing from a downstream failure.
- **Don't offer reactivation on the decommissioned surface.** Decommissioned is terminal; when self-service reactivation (FEAT-H007) is eventually built it belongs only to the member-pausable (`paused`) state, never to an admin `suspended` hold. Keep the surfaces distinct.
- **Don't render the suspended/decommissioned surface for a Mist.** Gate by identity first (FIM-only), exactly as FEAT-H005 gates the profile/account menu.
- **Don't leave the in-flight state interactive-but-blank.** Show a loading state while the account-state read is in flight; never a frozen shell.

## No-gos

- No account-state **mutation** (reactivation is FEAT-H007; account exit/deletion is the later IDN-10 seam).
- No "suspended since" timestamp or state history — FEAT-PC004 returns the label only in v1.
- No admin view of other members' account states (that is A-ADM / Platform-Ops, a later area).
- No direct `public.users` read — Platform API only (ADR-U009).

## Stories

### STORY-1: An active FIM is not interrupted
As a FIM, I want my active account to carry no lifecycle interruption, so I just use the Hub.

**Acceptance criteria:**
- Given a FIM session whose account state reads `active` (via FEAT-PC004), when the shell resolves, then no suspended/decommissioned surface is shown and the member proceeds to their normal experience.
- Given an active member opens account settings, when the account section renders, then it shows a quiet "Account: active" legibility line — fetched through the Platform API, never a direct table read (ADR-U009).

### STORY-2: A suspended FIM sees a clear suspended surface
As a suspended FIM, I want the Hub to explain that my account is on hold, so I am not dropped into a broken empty experience.

**Acceptance criteria:**
- Given a signed-in FIM whose account state reads `suspended`, when the shell resolves and ordinary profile resolution is empty, then the Hub renders a **suspended-account surface** that explains the state (on hold, not deleted) — sourced from FEAT-PC004, never a direct table read.
- Given the suspended surface renders, when it lays out, then it does not strand the member on a dead end — it offers a way out (sign-out); the self-service reactivation affordance (**FEAT-H007**) is deferred with IDN-12.

### STORY-3: A decommissioned FIM sees a terminal closed-account surface
As a decommissioned FIM, I want an honest "this account is closed" message, so I am not falsely invited to return.

**Acceptance criteria:**
- Given a signed-in FIM whose account state reads `decommissioned`, when the shell resolves, then the Hub renders a **terminal closed-account surface** — and **no** reactivation affordance is offered.
- Given the decommissioned surface, when it renders, then it is visibly distinct from the suspended surface (terminal, not a recoverable hold).

### STORY-4: Account state resolves without blocking the shell
As a FIM, I want the Hub to render immediately while my account state resolves in the background, so the shell never blocks on a serial round-trip and never appears frozen.

**Acceptance criteria:**
- Given the account-state read is in flight, when the data has not yet returned, then the shell renders the page **optimistically** (the member is treated as active by default) — it does **not** block the whole app on a "Checking your account…" gate. The page shows its own per-surface loading states (e.g. "Loading your groups…"), never a frozen or blank-but-interactive shell. *(Revised 2026-07-01 — see the Performance revision above. Supersedes the prior "show a blocking loading state while in flight" criterion, which created a per-page render waterfall.)*
- Given the account-state read resolves to a confirmed off-state (`suspended` / `decommissioned` / unknown-non-active), when it returns, then the account-state surface intercepts and replaces the optimistically-rendered chrome.
- Given the account-state read fails (network/error), when it returns an error, then the Hub shows a clear retry/error state rather than silently leaving the member on the optimistic active experience.

### STORY-5: A Mist has no account-state surface
As the Hub, I want to render no account-state surface for a Mist, so a non-durable identity is not shown FIM lifecycle states.

**Acceptance criteria:**
- Given the identity is a **Mist** (not a FIM), when the shell renders, then no account-state surface (active/suspended/decommissioned) is offered — identity-gated exactly as FEAT-H005 gates the account menu.

## Platform dependencies

- **[FEAT-PC004](../../../platform/core/features/FEAT-PC004-account-state-read.md) (Platform Core Identity) — the substrate this feature consumes.** Provides the own-account-state **read** (`GET /api/v1/account/state`) returning the caller's `is_active` / `is_decommissioned` and the derived `state` label, including the suspended/decommissioned cases that ordinary RLS hides. **This is the paired-spec reciprocation — the read is owned at the platform tier; the Hub cannot touch `public.users` directly (ADR-U009).**

## Cross-product impact

The **Gimbal** (senses surface) will render the same account-state concept from the same `GET /api/v1/account/state` contract, with its own native presentation; only the platform-side semantics are shared. No other Hub feature changes, though FEAT-H007 (reactivation) and the later IDN-10 exit/deletion surface both build on this surface as their host.

## Vertical impact

- **Privacy/GDPR:** the surface renders only the member's **own** lifecycle state, fetched own-row via FEAT-PC004; it never over-fetches or displays another member's account state. No new personal data is collected.
- **Notifications:** None — rendering a state the member already holds triggers no notification to anyone.
- **Administration:** account lifecycle state is an Administration-vertical concept; this feature is the **member-facing read** of it. It surfaces no admin affordance — admin lifecycle management lives in the later A-ADM / Platform-Ops area.
- **Observability:** the Hub emits client telemetry for which account state was rendered (active/suspended/decommissioned) and for state-read failures, so a broken suspended experience is traceable; no silent fallbacks.
- **Transactions:** None.
- **Extensibility:** the Hub switches on the `state` label returned by FEAT-PC004 and renders an unknown/future state as a safe default (a generic "account state" message) rather than crashing — no hardcoded closed set of states baked into the client.
