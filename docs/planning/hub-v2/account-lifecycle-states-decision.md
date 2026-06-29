# Account lifecycle states — decision record (suspended vs paused)

**Date:** 2026-06-29. **Status:** Accepted (target model pinned; the `paused`/origin substrate is deferred).
**Context:** Cycle A of the Phase-3 Identity-completion plan (Hub v2). This is the authoritative vocabulary source; it supersedes the ambiguous "deactivated" framing in the FEAT-PC004 / FEAT-H006 / FEAT-PC005 / FEAT-H007 spec bodies.
**Note:** This is a planning-tree decision record, not an ADR. When the `paused`/origin substrate is built (with self-pause), promote the state-machine change to a formal ADR (it alters a Platform Core contract).

## The problem

`public.users` carries account lifecycle on two booleans — `is_active`, `is_decommissioned` — yielding three mechanical states: active (`t,f`), off-but-not-closed (`f,f`), decommissioned (`f,t`, terminal). The middle state records **nothing about who switched the account off or why**. Today the ONLY producer of that state is an **admin** (`admin_update_user_status(target,false)`); there is no self-pause. The as-specced IDN-12 "self-service reactivation" would therefore let a member reverse an **admin hold** — the only off-accounts that exist — a governance hole (Stefan, 2026-06-29).

## The decision — four named states, distinguished by origin

| State | Meaning | Who may return it to active |
|---|---|---|
| **active** | normal | — |
| **paused** | the member chose to step away | the member (self-service) |
| **suspended** | an admin placed a hold (e.g. investigation) | an admin only — never the member |
| **decommissioned / closed** | permanently closed | nobody (terminal) |

- "deactivated" is **retired** as ambiguous (it did two opposite jobs).
- `paused` and `suspended` are both mechanically "off, not closed"; they differ by a recorded **origin** (who switched it off, hence who may undo it).
- "suspended" reuses the existing canonical word from `groups.status` (`active/closed/archived/suspended`) — an admin hold, consistent across groups and accounts.
- "paused" is **not yet encoded** (no producer until self-pause exists). Before encoding an account `paused` state, collision-check `paused` against membership/enrollment status (it appears in archived status sets).

## What was built now (Cycle A, IDN-9)

- **FEAT-PC004** `get_own_account_state()` reports the off state as **`suspended`** (today's only producer is an admin). `state` is an OPEN label, so `paused` can be added later without a breaking change.
- **FEAT-H006** renders `suspended` -> "contact an admin" (NO self-reactivation), `decommissioned` -> terminal, unknown -> safe default; Mist/sessionless pass through.

## What is deferred (IDN-12 — FEAT-PC005 + FEAT-H007, parked)

Self-service reactivation pairs with self-pause: one creates the `paused` state the other reverses. Before building it:
1. Add a **deactivation-origin** field on `public.users` (or equivalent) — a Platform Core schema change (schema gate + ADR). Default unknown-origin off-accounts to `suspended` (safe: not self-reversible).
2. Build **self-pause** (the producer of `paused`), part of the IDN-10 exit/lifecycle seam.
3. Gate `reactivate_own_account()` to origin = member/`paused` only; `suspended` stays admin-lift-only; `decommissioned` stays terminal.
