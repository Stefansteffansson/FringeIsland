# FEAT-PC004: Account-state read — the member's own lifecycle state (active / deactivated / decommissioned)

---
id: FEAT-PC004
title: Account-state read — a self-service contract returning the caller's own account lifecycle state (active / deactivated / decommissioned)
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Implementation notes (6-done — 2026-06-29)

Realized in Cycle A (IDN-9). Authoritative deltas from the as-designed body below:
- **Vocabulary:** the off-but-not-closed state is realized as **`'suspended'`** (an admin hold), not `'deactivated'`. "Deactivated" was retired as ambiguous — see [`../../../planning/hub-v2/account-lifecycle-states-decision.md`](../../../planning/hub-v2/account-lifecycle-states-decision.md). The member-initiated `'paused'` label + self-service reactivation (IDN-12) are deferred (FEAT-PC005/FEAT-H007 parked).
- **Contract:** realized as **`GET /api/account/state`** with `@supabase/ssr` cookie-session auth (the shipped Hub house style; `/api/v1/` + Bearer is directional, not yet realised — see `TASK-PC003-01`). Sessionless -> 401; no mapped row -> 404.
- **Function:** `public.get_own_account_state()` (migration `20260629054349`) — `SECURITY DEFINER`, `search_path=''`, own-row via `auth.uid()`, no `is_active` filter, returns `jsonb {is_active, is_decommissioned, state}`; GRANT to `authenticated` + `service_role`.
- **Tests (red->green):** integration `hub/tests/integration/account/account-state-read.test.ts` (6/6: three states + own-row boundary + RLS-unchanged guard + empty case); route unit `hub/tests/unit/app/api/account-state-route.test.ts` (5/5). Demonstrated red on the missing function before the gated apply.

## Problem

A FIM's account carries a lifecycle state on `public.users` — `is_active` and `is_decommissioned` — yielding three states: **active** (`is_active=true, is_decommissioned=false`), **deactivated** (`false, false`), and **decommissioned** (`false, true`). Today **no member-facing contract returns that state to the member themselves**, and the existing identity surfaces actively hide it:

- `users` RLS `users_select_active` is `USING (is_active = true)` — a deactivated or decommissioned member **cannot `SELECT` their own row** (the row is "invisible to everyone, including themselves").
- `get_current_user_profile_id()` filters `is_active = true`, returning `NULL` for a deactivated caller, so every downstream profile read resolves to nothing.

The consequence: a deactivated FIM who authenticates lands in a broken, empty experience with no honest explanation. IDN-9 ("render account state to the member") requires a contract that returns the caller's own lifecycle state **even when that state is one that the visibility filter hides** — which is precisely the deactivated / decommissioned case. This feature is that contract: the platform half of IDN-9, consumed API-first by the Hub (FEAT-H006) and any future surface.

### Why Platform Core, not a Domain Service

Account lifecycle state lives on `public.users` in PC-2 Identity — the canonical owner of the actor's identity record (ADR-U023). Reading it requires bypassing the `is_active` RLS visibility filter for the caller's **own** row, which is a `SECURITY DEFINER` primitive over a Core-owned table. A Domain Service cannot reach `public.users` without breaking the one-way dependency rule (Domain → Core, never reverse). This cannot be modelled in Domain or via Extensions: it is a read of Core's own identity substrate.

## Solution sketch

A narrow, own-row-only read primitive plus an additive versioned route:

- **`get_own_account_state()`** — a `SECURITY DEFINER` SQL function, `SET search_path = ''`, that resolves the caller through the repo actor primitive (`auth.uid()` → `users.auth_user_id` → `users.id`) and returns **only that caller's own** lifecycle facts: `is_active`, `is_decommissioned`, and a derived `state` label (`'active' | 'deactivated' | 'decommissioned'`). It **must not** filter on `is_active` — that is the whole point; the elevation exists solely to let a member see their own hidden row. It returns nothing for a caller with no mapped `users` row.
- **`GET /api/v1/account/state`** (`Authorization: Bearer <jwt>`, ADR-U015 v1, ADR-U009 API-first) — the additive route surfaces wrap. No existing route changes; no version bump.

The function reads the caller's own row and nothing else — no target parameter, no other user's data, no other columns beyond the two lifecycle booleans and the derived label.

## Appetite

Small. One `SECURITY DEFINER` read function (no table mutation, no new columns), one additive GET route, and integration tests for the three states + the own-row boundary. The substrate (`is_active` / `is_decommissioned`) already exists; this feature reads it, it does not reshape it.

## Rabbit holes

- **Don't add transition-timestamp or reason columns.** No `deactivated_at` / `decommissioned_at` / reason column exists today, and v1 renders the *state*, not its history. A "deactivated since…" timestamp is a forward seam (new column → schema gate) — out of scope here (see No-gos).
- **Don't relax `users_select_active`.** The fix is a narrowly-scoped `SECURITY DEFINER` read of the caller's own row, **not** widening the table's SELECT policy — that would re-expose deactivated rows to *other* members.
- **Don't return more than the lifecycle facts.** This contract is not a profile read (that is FEAT-PC003). Keep the column set to the two booleans + derived label; a deactivated member's other profile fields stay governed by their own RLS.
- **Decommissioned is terminal and must read as such** — the derived label has to distinguish it from plain deactivated so the Hub can withhold the reactivation affordance (FEAT-H007 / FEAT-PC005).

## No-gos

- No transition timestamps, reason text, or audit-history surface in v1 (forward seam — would add columns).
- No mutation of account state (that is FEAT-PC005).
- No cross-user read — the contract has no parameter to target another account; it is strictly own-row.
- No change to `users_select_active`, `get_current_user_profile_id()`, or any existing route.

## Stories

### STORY-1: Read my own account state when active
As the platform, I want an authenticated FIM to read their own account lifecycle state, so a Surface can render it API-first without touching `public.users` directly.

**Acceptance criteria:**
- Given an authenticated FIM with `is_active=true, is_decommissioned=false`, when they call the contract, then it returns `state = 'active'` resolved to the caller's own row via the actor primitive.
- Given the same caller, when the contract returns, then it includes the raw `is_active` / `is_decommissioned` facts and the derived `state`, and **no** other user's data and **no** profile fields beyond the lifecycle facts.

### STORY-2: A deactivated member can still read their own state
As the platform, I want a **deactivated** member to read their own state even though `users_select_active` hides their row, so the Surface can explain the state instead of failing into an empty experience.

**Acceptance criteria:**
- Given an authenticated member with `is_active=false, is_decommissioned=false`, when they call the contract, then it returns `state = 'deactivated'` — the `SECURITY DEFINER` read bypasses the `is_active = true` visibility filter **for the caller's own row only**.
- Given that same deactivated member, when any *other* surface attempts an ordinary `SELECT` on their `users` row, then it still returns nothing (the visibility filter is unchanged; only this own-row primitive sees through it).

### STORY-3: A decommissioned member reads the terminal state
As the platform, I want a **decommissioned** member's state to read as terminal, so the Surface can withhold reactivation.

**Acceptance criteria:**
- Given an authenticated member with `is_decommissioned=true`, when they call the contract, then it returns `state = 'decommissioned'` — distinct from `'deactivated'`.

### STORY-4: Own-row only — no cross-user exposure
As the platform, I want the contract to expose only the caller's own state, so it never widens exposure.

**Acceptance criteria:**
- Given any authenticated caller, when they call the contract, then it resolves to **their own** row only — there is no parameter to target another user, and no path returns another account's state.

### STORY-5: No FIM account state for a caller with no mapped row
As the platform, I want callers with no mapped FIM `users` row to receive no FIM account state, so the contract has a clean empty case.

**Acceptance criteria:**
- Given an unauthenticated caller (no `auth.uid()`), when they call the contract, then it resolves no account state (no own row to read).
- Given the actor primitive resolves no `users.id` for the caller, when they call the contract, then it returns empty rather than erroring.

## Platform dependencies

- **PC-2 Identity account-state substrate (existing).** `public.users.is_active` / `public.users.is_decommissioned` and the `enforce_decommission_invariant()` trigger that keeps the three-state machine consistent. This feature **reads** that substrate; it adds no columns.
- **The repo actor primitive (PC-2 / PC-3).** Caller resolution via `auth.uid()` → `users.auth_user_id` → `users.id` (the identity-scope hops; this read does not need the personal-group hop).
- **No PC-4 dependency.** A state *read* is not an audited lifecycle event; observability is route-level structured logging, not an `admin_audit_log` write.

## Cross-product impact

Consumed by **Hub [FEAT-H006](../../../products/hub/features/FEAT-H006-render-account-state.md)** (IDN-9) — the surface that renders active / deactivated / decommissioned. The **Gimbal** (senses surface) will consume the **same** `GET /api/v1/account/state` contract for its own account-state UX; only the platform-side semantics are shared. The route is additive (ADR-U015) — no breaking change, no version bump. This is the paired-spec reciprocation: **the read is owned at the platform tier; the Hub cannot touch `public.users` directly (ADR-U009).**

## Stability posture (Platform Core §7)

Additive only: one new `SECURITY DEFINER` read function and one new `/api/v1/` route. No existing Core contract signature changes, so no ADR or version bump is required (the Internal/Platform API surface only grows). The new `SECURITY DEFINER` function is a privilege-escalation surface and is documented as such in its migration comment — its elevation is bounded to reading the caller's own two lifecycle booleans, nothing more.

## Vertical impact

- **Privacy/GDPR:** own-row only. The `SECURITY DEFINER` read is narrowly scoped to the caller's own `is_active` / `is_decommissioned` and a derived label — no other fields, no other users. It deliberately bypasses the `is_active` visibility filter **only** for the caller's own row, and **never** widens exposure of deactivated/decommissioned rows to anyone else.
- **Notifications:** None — a state read addresses no other party and triggers nothing.
- **Administration:** the state being read is an Administration-vertical lifecycle concept (the same `is_active` / `is_decommissioned` the admin RPCs mutate). This feature is the member-facing **read complement** of those admin primitives; it adds no admin affordance and no admin-only path.
- **Observability:** the route emits structured logs (request id, actor, outcome) per platform-tier discipline; permission/auth denials are recorded, not silently returned as empty. The read itself is not written to `admin_audit_log` (reads are not audited lifecycle events).
- **Transactions:** None — no payment, entitlement, or financial data.
- **Extensibility:** the derived `state` label is computed from the booleans and surfaced as an **open** string the Surfaces switch on without a sealed client-side enum. If a future fourth lifecycle state is introduced (e.g. a distinct suspended state), the contract can return a new label without breaking consumers that render unknown states as a safe default. No hardcoded closed set.

## Open spec questions

1. **Transition timestamp.** Should the state read eventually carry a "deactivated since / decommissioned on" timestamp? Deferred — no column exists; v1 returns the label only. Re-open if a Surface needs to display the age of the state (forward seam, new column → schema gate).
2. **Mist (`is_temporary`) handling.** A Mist has a `users` row (`is_temporary=true`, `is_active=true`). The contract returns the caller's own row uniformly; the Hub mounts the account-state surface for FIMs only (FEAT-H006 gates by identity, matching FEAT-H005). Confirm at build that no Mist-specific branch is needed platform-side.
