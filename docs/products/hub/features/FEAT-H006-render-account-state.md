# FEAT-H006: Render account state — show the FIM whether their account is active, deactivated, or decommissioned

---
id: FEAT-H006
title: Render account state — the Hub surfaces the FIM's account lifecycle state (active / deactivated / decommissioned) instead of a broken empty experience
owner: hub
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A FIM's account can be **active**, **deactivated**, or **decommissioned**. Today the Hub only knows how to render an active member: when a deactivated FIM authenticates, profile resolution returns nothing (the platform hides their row), and they land in a broken, empty, unexplained experience. The Hub has no honest surface for "your account is deactivated" or "this account is closed."

IDN-9 ("render account state to the member") is that surface. The Hub must read the member's own account state — via the paired platform contract (FEAT-PC004), **never** a direct table read (ADR-U009) — and render it clearly: an active member proceeds normally; a deactivated member sees a clear, calm explanation (and, via FEAT-H007, a way back); a decommissioned member sees a terminal closed-account message with no false hope of return. This is the foundation IDN-12 (reactivation) and the later IDN-10 (exit/deletion) both build on.

## Solution sketch

- On a FIM session, the Hub resolves account state through **`GET /api/v1/account/state`** (FEAT-PC004). The state read is the **first-class branch** when ordinary profile resolution comes back empty — instead of treating "no profile" as an error, the Hub asks the state contract *why*.
- **Active** → no interruption; the member proceeds to their normal experience. Account state is also legible in account settings (a quiet "Account: active" line).
- **Deactivated** → a dedicated **deactivated-account surface**: a clear explanation of the state, what it means (the account is paused, not deleted), and a host for the reactivation affordance owned by FEAT-H007.
- **Decommissioned** → a **terminal closed-account surface**: the account is permanently closed; no reactivation affordance is offered.
- **Mist / no FIM account** → no account-state surface at all (a Mist has no durable FIM account), matching the identity-gating pattern in FEAT-H005.
- All reads go through the Platform API with `Authorization: Bearer <jwt>`; the Hub never reads `public.users` directly.

## Appetite

Small-to-moderate. A state-resolution hook in the shell's session bootstrap, three rendered states (active pass-through, deactivated surface, decommissioned surface), identity-gating for Mist, loading/empty handling, and the account-settings legibility line. No platform mutation — this feature only renders.

## Rabbit holes

- **Don't infer state from a failed profile fetch.** "Profile came back empty" is not the same as "deactivated" — always read the explicit state contract (FEAT-PC004) rather than guessing from a downstream failure.
- **Don't offer reactivation on the decommissioned surface.** Decommissioned is terminal; the affordance (FEAT-H007) belongs only to the deactivated surface. Keep the two surfaces distinct.
- **Don't render the deactivated/decommissioned surface for a Mist.** Gate by identity first (FIM-only), exactly as FEAT-H005 gates the profile/account menu.
- **Don't leave the in-flight state interactive-but-blank.** Show a loading state while the account-state read is in flight; never a frozen shell.

## No-gos

- No account-state **mutation** (reactivation is FEAT-H007; deactivation/exit is the later IDN-10 seam).
- No "deactivated since" timestamp or state history — FEAT-PC004 returns the label only in v1.
- No admin view of other members' account states (that is A-ADM / Platform-Ops, a later area).
- No direct `public.users` read — Platform API only (ADR-U009).

## Stories

### STORY-1: An active FIM is not interrupted
As a FIM, I want my active account to carry no lifecycle interruption, so I just use the Hub.

**Acceptance criteria:**
- Given a FIM session whose account state reads `active` (via FEAT-PC004), when the shell resolves, then no deactivated/decommissioned surface is shown and the member proceeds to their normal experience.
- Given an active member opens account settings, when the account section renders, then it shows a quiet "Account: active" legibility line — fetched through the Platform API, never a direct table read (ADR-U009).

### STORY-2: A deactivated FIM sees a clear deactivated surface
As a deactivated FIM, I want the Hub to explain that my account is paused, so I am not dropped into a broken empty experience.

**Acceptance criteria:**
- Given a signed-in FIM whose account state reads `deactivated`, when the shell resolves and ordinary profile resolution is empty, then the Hub renders a **deactivated-account surface** that explains the state (paused, not deleted) — sourced from FEAT-PC004, never a direct table read.
- Given the deactivated surface renders, when it lays out, then it hosts the reactivation affordance owned by **FEAT-H007** (a clear way back), and does not strand the member on a dead end.

### STORY-3: A decommissioned FIM sees a terminal closed-account surface
As a decommissioned FIM, I want an honest "this account is closed" message, so I am not falsely invited to return.

**Acceptance criteria:**
- Given a signed-in FIM whose account state reads `decommissioned`, when the shell resolves, then the Hub renders a **terminal closed-account surface** — and **no** reactivation affordance is offered.
- Given the decommissioned surface, when it renders, then it is visibly distinct from the deactivated surface (terminal, not paused).

### STORY-4: Account state is loading
As a FIM, I want a loading state while my account state is resolved, so the shell never appears frozen.

**Acceptance criteria:**
- Given the account-state read is in flight, when the data has not yet returned, then a loading state is shown — never a blank-but-interactive shell.
- Given the account-state read fails (network/error), when it returns an error, then the Hub shows a clear retry/error state rather than silently rendering the active experience.

### STORY-5: A Mist has no account-state surface
As the Hub, I want to render no account-state surface for a Mist, so a non-durable identity is not shown FIM lifecycle states.

**Acceptance criteria:**
- Given the identity is a **Mist** (not a FIM), when the shell renders, then no account-state surface (active/deactivated/decommissioned) is offered — identity-gated exactly as FEAT-H005 gates the account menu.

## Platform dependencies

- **[FEAT-PC004](../../../platform/core/features/FEAT-PC004-account-state-read.md) (Platform Core Identity) — the substrate this feature consumes.** Provides the own-account-state **read** (`GET /api/v1/account/state`) returning the caller's `is_active` / `is_decommissioned` and the derived `state` label, including the deactivated/decommissioned cases that ordinary RLS hides. **This is the paired-spec reciprocation — the read is owned at the platform tier; the Hub cannot touch `public.users` directly (ADR-U009).**

## Cross-product impact

The **Gimbal** (senses surface) will render the same account-state concept from the same `GET /api/v1/account/state` contract, with its own native presentation; only the platform-side semantics are shared. No other Hub feature changes, though FEAT-H007 (reactivation) and the later IDN-10 exit/deletion surface both build on this surface as their host.

## Vertical impact

- **Privacy/GDPR:** the surface renders only the member's **own** lifecycle state, fetched own-row via FEAT-PC004; it never over-fetches or displays another member's account state. No new personal data is collected.
- **Notifications:** None — rendering a state the member already holds triggers no notification to anyone.
- **Administration:** account lifecycle state is an Administration-vertical concept; this feature is the **member-facing read** of it. It surfaces no admin affordance — admin lifecycle management lives in the later A-ADM / Platform-Ops area.
- **Observability:** the Hub emits client telemetry for which account state was rendered (active/deactivated/decommissioned) and for state-read failures, so a broken deactivated experience is traceable; no silent fallbacks.
- **Transactions:** None.
- **Extensibility:** the Hub switches on the `state` label returned by FEAT-PC004 and renders an unknown/future state as a safe default (a generic "account state" message) rather than crashing — no hardcoded closed set of states baked into the client.
