# FEAT-PC005: Self-service account reactivation — a member reactivates their own deactivated account

---
id: FEAT-PC005
title: Self-service account reactivation — a member-initiated, audited transition of their own account from deactivated back to active
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A FIM can be **deactivated** (`is_active=false, is_decommissioned=false`) — but there is **no self-service way back**. Every state-write on disk is admin-gated: `admin_update_user_status(target, new_is_active)` (the only reactivation path) requires `manage_all_groups`, and writes **no audit row**. A member who deactivated their own account must therefore ask an admin to be let back in, which contradicts the in-experience, member-owned framing of the lifecycle (governance-spec: "self-service platform-exit stays in-experience — a member leaving is not an admin act"; the mirror holds for return).

IDN-12 ("self-service account reactivation") closes that gap: a member-initiated, owner-gated, **audited** transition of their **own** account from deactivated back to active, with **decommissioned kept strictly terminal**. This is the platform half, consumed API-first by the Hub (FEAT-H007). It is net-new substrate — no member-initiated state-write exists today.

### Why Platform Core, not a Domain Service

The transition mutates `public.users.is_active` — a PC-2 Identity-owned column — and must write to the PC-4 `admin_audit_log`. Both are Core tables; a member-initiated write that bypasses the admin RLS gate requires a `SECURITY DEFINER` RPC owned in Core. A Domain Service cannot mutate `public.users` without breaking the one-way dependency rule. This cannot be modelled in Domain or via Extensions.

## Solution sketch

A single owner-gated, audited `SECURITY DEFINER` RPC plus an additive route:

- **`reactivate_own_account()`** — `SECURITY DEFINER`, `SET search_path = ''`. Resolves the caller via the repo actor primitive (`auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`). Pre-conditions, enforced server-side:
  - caller's own row only — **no target parameter**;
  - **`is_decommissioned` must be `false`** — decommissioned is terminal; the RPC rejects (it never reverses a decommission, honouring `enforce_decommission_invariant()`);
  - if already `is_active=true`, the call is an idempotent success (no-op);
  - otherwise flip `is_active` `false → true`.
  On success it writes an audit row using the established **inline-INSERT-via-`SECURITY DEFINER`** pattern (as `admin_exit_user_from_platform` does): `actor_group_id` = caller's personal group, `action = 'self_reactivate_account'`, `target` = the user id, before/after state in `metadata`.
- **`POST /api/v1/account/reactivate`** (`Authorization: Bearer <jwt>`, ADR-U015 v1, ADR-U009) — additive route surfacing the RPC.

The RPC is the privilege boundary: it is the *only* path by which a non-admin actor may flip `is_active`, and it can only ever flip the **caller's own** deactivated account.

## Appetite

Small-to-moderate. One `SECURITY DEFINER` RPC (own-actor gate + decommission guard + idempotent flip + inline audit INSERT), one additive POST route, and integration tests for the happy path, the decommissioned-terminal rejection, idempotency, the cross-user rejection, and the audit write. The audit **table** and write **pattern** already exist (no new table/column); the surface is additive.

## Rabbit holes

- **Don't let self-service touch decommissioned.** Decommissioned is terminal and stays terminal — only the existing admin hard-paths exist for that, and reversing it is explicitly out of scope. Guard it server-side and surface it as a clear rejection, not a silent failure.
- **Don't write the audit from the client.** `admin_audit_log` INSERT RLS is `is_platform_admin()`-gated; a self-service actor fails it. The write **must** go through the `SECURITY DEFINER` RPC (definer bypasses RLS) — never a client-side insert.
- **Don't reach for `admin_update_user_status`.** It is admin-gated and unaudited; reusing it would either require granting the member admin permission (wrong) or leave the transition unaudited (wrong). The new owner-gated RPC is the correct shape.
- **Don't restore what was never removed.** Plain deactivation (v1) does not strip group memberships or freeze enrolments — so reactivation has nothing to "un-cascade." Keep the transition to the `is_active` flip + audit; do not invent restore logic for state that was never mutated (see the cascade spec).
- **Idempotency over erroring.** A double-submit (already active) should resolve as success, not a hard error — the member's intent is "be active," which is already true.

## No-gos

- No reversal of decommission — ever, self-service (terminal; admin-only paths remain the only ones, and even those do not "un-decommission").
- No cross-user reactivation — the RPC has no target parameter; it only ever acts on the caller's own row.
- No new audit table or columns — reuse `admin_audit_log` via the existing inline-INSERT pattern.
- No notification fan-out beyond (optionally) a self-addressed security confirmation (see Vertical impact / Notifications).
- No admin affordance — this is the member-initiated complement of the admin lifecycle RPCs, not a new admin tool.

## Stories

### STORY-1: Reactivate my own deactivated account
As the platform, I want a deactivated member to reactivate their own account, so they can return without admin intervention.

**Acceptance criteria:**
- Given the caller's own account is `is_active=false, is_decommissioned=false`, when they invoke the reactivation contract, then `is_active` is flipped to `true` and the call succeeds.
- Given the reactivation succeeded, when the caller subsequently reads their account state (FEAT-PC004), then it returns `state = 'active'`.

### STORY-2: Decommissioned is terminal
As the platform, I want a decommissioned account to be unreactivatable by self-service, so decommission stays an irreversible terminal state.

**Acceptance criteria:**
- Given the caller's own account is `is_decommissioned=true`, when they invoke the reactivation contract, then the transition is **rejected**, no state changes, and the rejection indicates the account is terminally closed (not a transient error).
- Given that rejection, when it returns, then `enforce_decommission_invariant()` is never violated and no audit "reactivated" row is written.

### STORY-3: Reactivation is idempotent for an already-active account
As the platform, I want reactivating an already-active account to be a safe no-op, so a double-submit does not error.

**Acceptance criteria:**
- Given the caller's own account is already `is_active=true`, when they invoke the reactivation contract, then it returns success with no state change and no duplicate audit row beyond the at-most-one written by an actual transition.

### STORY-4: Own-account only
As the platform, I want reactivation to act only on the caller's own account, so no member can reactivate another's.

**Acceptance criteria:**
- Given any authenticated caller, when they invoke the reactivation contract, then it resolves to **their own** row only — there is no parameter to target another user, and no path mutates another account's state.
- Given a caller with no mapped `users` row, when they invoke the contract, then it rejects cleanly (no actor to act on).

### STORY-5: The reactivation is audited
As the platform, I want every successful self-service reactivation recorded in the platform audit trail, so the lifecycle transition is observable and attributable.

**Acceptance criteria:**
- Given a successful self-service reactivation, when it completes, then exactly one audit row is written with `actor_group_id` = the caller's personal group, `action = 'self_reactivate_account'`, `target` = the user id, and before/after state in `metadata`.
- Given the audit write, when it is attempted, then it goes through the `SECURITY DEFINER` RPC (bypassing the `is_platform_admin()` INSERT gate) — never a client-side insert.

## Cascade specification (ADR-U016) — self-service reactivation (deactivated → active)

| Layer | Effect of a self-service reactivation |
|---|---|
| **PC-2 Identity** | The caller's own `public.users.is_active` flips `false → true` under the owner-gated `SECURITY DEFINER` RPC. `is_decommissioned` is untouched and, if `true`, the transition is rejected (decommissioned is terminal; `enforce_decommission_invariant()` upheld). The row, previously hidden by `users_select_active`, becomes ordinarily visible again; `get_current_user_profile_id()` resolves once more. |
| **PC-3 Organisation** | None to restore. Plain deactivation (v1) does not remove group memberships or alter the personal group, so reactivation has nothing to un-cascade; the member's memberships and roles are exactly as they were. |
| **PC-4 Governance (Observability, V4)** | One audit row written to `admin_audit_log` (`action='self_reactivate_account'`, actor = caller's personal group, before/after in `metadata`) via the inline-INSERT-in-`SECURITY DEFINER` pattern. |
| **DS-3 Journeys** | `pending` — v1 deactivation does not freeze journey enrolments, so there is nothing to thaw today. **Forward seam:** if IDN-10's exit cascade later freezes enrolments on deactivation (DS-3), reactivation must thaw them; this row is tagged for re-entry when the Journeys area realises DS-3. |
| **Privacy (V2)** | Reactivation re-exposes the member's own row **to themselves** (the visibility filter no longer hides it). It restores only the pre-deactivation visibility state — it does not create any new sharing of the member's data with other members. |
| **Administration (V1) / Notifications (V3) / Transactions** | Administration: none — self-service, no admin act. Notifications: at most a self-addressed security confirmation (see Vertical impact). Transactions: none. |

## Platform dependencies

- **PC-4 Governance audit primitive (existing).** `public.admin_audit_log` (six columns: `id`, `actor_group_id`, `action`, `target`, `metadata`, `created_at`) and the inline-INSERT-via-`SECURITY DEFINER` write pattern proven by `admin_exit_user_from_platform`. This feature **consumes** that primitive — no new table or column.
- **PC-2 Identity account-state substrate (existing).** `public.users.is_active` / `is_decommissioned` and `enforce_decommission_invariant()`.
- **Sibling [FEAT-PC004](./FEAT-PC004-account-state-read.md) (account-state read).** The Hub determines reactivation eligibility by reading state via FEAT-PC004, then invokes this contract. The two are the paired platform halves of Cycle A.
- **The repo actor primitive (PC-2 / PC-3).** Full four-hop resolution to the caller's `personal_group_id` (needed for the audit `actor_group_id`).

## Cross-product impact

Consumed by **Hub [FEAT-H007](../../../products/hub/features/FEAT-H007-self-service-account-reactivation.md)** (IDN-12) — the reactivation affordance on the deactivated-account surface. The **Gimbal** will consume the **same** `POST /api/v1/account/reactivate` contract. The route is additive (ADR-U015) — no breaking change, no version bump. **The state-write is owned at the platform tier; the Hub cannot flip `is_active` directly (ADR-U009).**

## Stability posture (Platform Core §7)

Additive: one new `SECURITY DEFINER` RPC and one new `/api/v1/` route; no existing Core signature changes, so no ADR or version bump. The RPC is a new privilege-escalation surface — it is the only non-admin path that flips `is_active` — and is documented as such in its migration comment, with its elevation bounded to: the caller's own row, deactivated → active only, decommissioned rejected.

## Vertical impact

- **Privacy/GDPR:** reactivation restores the member's pre-deactivation visibility of **their own** data to themselves; it creates no new exposure to other members. The owner-gate ensures one member can never act on another's account. Right-to-erasure is unaffected (this is the return path, not deletion).
- **Notifications:** optionally a **self-addressed security confirmation** ("your account was reactivated") — a member-facing security signal, not a fan-out to other parties. v1 may emit this confirmation trigger or defer it; either way no third party is notified. (Marked as an open question below rather than left blank.)
- **Administration:** the self-service complement of the admin lifecycle RPCs. It adds **no** admin affordance; admins retain their existing `admin_update_user_status` path independently. No DeusEx oversight is required for a member returning to their own active account.
- **Observability:** core to the feature — every successful transition writes an `admin_audit_log` row (actor + action + before/after); the route emits structured logs (request id, actor, outcome) including the decommissioned-rejection and cross-user-rejection paths. No swallowed failures.
- **Transactions:** None — no payment, entitlement, or financial state.
- **Extensibility:** the `action` value (`'self_reactivate_account'`) is an **open** audit-action namespace string, not a sealed enum; new self-service lifecycle actions (e.g. a future self-service deactivation) add new action strings without schema change. No hardcoded closed set.

## Open spec questions

1. **Audit surface — `admin_audit_log` reuse vs a distinct member-audit surface.** The existing table is named `admin_audit_log` and its INSERT RLS is `is_platform_admin()`-gated; a self-service action is mechanically clean to record there via the `SECURITY DEFINER` RPC (actor = self's personal group), but is semantically an admin-named home for a non-admin act. **Decision for schema review:** (a) reuse `admin_audit_log` with a self-service `action` namespace (path of least resistance, matches the established pattern), or (b) introduce a distinct member-facing audit/history surface. The stories are written behaviourally ("recorded to the platform audit trail with actor / action / timestamp / before-after") so this storage choice is a schema-review detail, not a 4-ready blocker.
2. **Self-confirmation notification.** Whether v1 emits the self-addressed "account reactivated" security confirmation, and on which channel — resolve with the Notifications vertical at build.
3. **Re-authentication posture.** Confirm at build whether a deactivated member's existing session is sufficient to call the contract, or whether reactivation should require a fresh sign-in (security posture) — interacts with how the Hub routes a deactivated FIM into FEAT-H006/H007.
