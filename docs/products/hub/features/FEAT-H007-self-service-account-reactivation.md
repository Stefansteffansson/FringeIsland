# FEAT-H007: Self-service account reactivation — the FIM reactivates their own paused account from the Hub

---
id: FEAT-H007
title: Self-service account reactivation — the Hub affordance that lets a paused FIM return to active without admin help
owner: hub
consumers: [hub]
wave: ferd
maturity: 4-ready
parked: true
parked_reason: "Deferred from Cycle A (2026-06-29). Self-service reactivation pairs with self-pause and needs a deactivation-origin field so a member can only reverse their own 'paused' account, never an admin 'suspended' hold. Today the off state is only admin-produced (no self-pause exists). Unblock: add the origin field (schema gate + ADR) + build self-pause (IDN-10 seam), then gate reactivation to member-origin only. See ../../../planning/hub-v2/account-lifecycle-states-decision.md"
requires-equipment: none
---

## Parked — deferred from Cycle A (2026-06-29)

This spec is **parked**, not retired. Self-service reactivation was found to pair with self-pause: in the current substrate the only producer of the off-but-not-closed state is an **admin hold (suspended)**, so shipping self-reactivation now would let a member reverse an admin action. It will be built once (1) a **deactivation-origin** field distinguishes member-`paused` from admin-`suspended` (Platform Core schema change — schema gate + ADR), and (2) **self-pause** exists (the IDN-10 exit/lifecycle seam) to produce a `paused` account to legitimately reactivate. Reactivation will be gated to member-origin `paused` only; `suspended` stays admin-lift-only; `decommissioned` stays terminal. See the [account-lifecycle decision record](../../../planning/hub-v2/account-lifecycle-states-decision.md).

## Problem

A member who has paused their own account can *see* that it is off — but the Hub gives them no way back. The only reactivation path on the platform is admin-gated, so today a member who paused their own account must ask an admin to return. That contradicts the member-owned, in-experience framing of the account lifecycle.

IDN-12 ("self-service account reactivation") is the Hub affordance that closes the loop: from the paused-account surface, the FIM chooses to reactivate, confirms intent, and the Hub calls the paired platform contract (FEAT-PC005) to flip their own account back to active — **never** touching `public.users` directly (ADR-U009). Decommissioned accounts get no such affordance (terminal). This is the second and final pair of Cycle A.

## Solution sketch

- On the **paused-account surface** (hosted by FEAT-H006), the Hub renders a clear **"Reactivate my account"** affordance.
- Choosing it opens a **ConfirmModal** (never a browser alert — AGENTS.md convention) that states what will happen ("your account will return to active") and asks the member to confirm.
- On confirm, the Hub calls **`POST /api/v1/account/reactivate`** (FEAT-PC005) with `Authorization: Bearer <jwt>`.
- **Success** → the Hub returns the member to their normal active experience (profile resolution works again; they land on their groups/home), and the account-state read now reads `active`.
- **Failure** → a clear, non-destructive error state; no false success, with the option to retry.
- The affordance is **absent** on the decommissioned surface (terminal); if a stale client somehow attempts it, the platform rejects and the Hub surfaces the terminal message.

## Appetite

Small. One affordance + ConfirmModal on the existing paused surface, one Platform API call with success/failure/loading handling, and the post-success transition back into the active shell. No new platform mutation logic in the Hub (that is FEAT-PC005); the Hub orchestrates the call and the UX around it.

## Rabbit holes

- **Don't use a browser alert/confirm.** Use the Hub's ConfirmModal (AGENTS.md) — a lifecycle action deserves a real confirmation surface, and browser dialogs are banned.
- **Don't show reactivation on the decommissioned surface.** Gate the affordance on `state === 'paused'`; decommissioned is terminal.
- **Don't assume success.** Render only on the platform's confirmed success; on error, keep the member on the paused surface with a retry, never a half-transitioned limbo.
- **Don't double-fire.** Disable the affordance while the call is in flight; rely on FEAT-PC005's idempotency as a backstop, not as the primary guard.
- **Don't hand-roll the state read after success.** Re-resolve account state via FEAT-PC004 (the single source of truth) to drive the transition back into the active experience.

## No-gos

- No reactivation of a **decommissioned** account — terminal; no affordance, and the platform rejects it regardless.
- No reactivation of **another** member's account — the contract is own-account only; the Hub exposes no target selection.
- No self-pause / exit / deletion initiation here (that is the later IDN-10 seam) — this feature only brings a paused account back.
- No direct `public.users` write — Platform API only (ADR-U009).

## Stories

### STORY-1: Reactivate from the paused surface
As a paused FIM, I want to reactivate my own account from the Hub, so I can return without asking an admin.

**Acceptance criteria:**
- Given a paused FIM viewing the paused-account surface (FEAT-H006), when they choose **Reactivate my account** and confirm in the ConfirmModal, then the Hub calls the paired **FEAT-PC005** contract (`POST /api/v1/account/reactivate`) — never a direct table write (ADR-U009).
- Given the platform confirms success, when the Hub handles the response, then the member is returned to their normal active experience and lands on their groups/home; a re-read of account state (FEAT-PC004) returns `active`.

### STORY-2: Decommissioned offers no reactivation
As a decommissioned FIM, I want no misleading "reactivate" affordance, so I am not falsely invited to return.

**Acceptance criteria:**
- Given a FIM whose account state reads `decommissioned`, when the closed-account surface renders, then **no** reactivation affordance is shown.
- Given a stale client nonetheless invokes reactivation on a decommissioned account, when the platform rejects it (FEAT-PC005), then the Hub shows the terminal closed-account message and performs no state transition.

### STORY-3: Confirmation before reactivating
As a FIM, I want to confirm before reactivating, so the transition is deliberate.

**Acceptance criteria:**
- Given the reactivation affordance, when the member chooses it, then a **ConfirmModal** (never a browser alert) explains the effect and asks them to confirm before any call is made.
- Given the member cancels the ConfirmModal, when they dismiss it, then no call is made and they remain on the paused surface.

### STORY-4: Failure is handled cleanly
As a FIM, I want a clear error if reactivation fails, so I am never left in a half-transitioned state.

**Acceptance criteria:**
- Given the reactivation call fails (network/permission/error), when it returns, then the Hub shows a clear error state on the paused surface with a retry option — and does **not** render the active experience.
- Given the call is in flight, when the member has confirmed, then the affordance is disabled and a loading state is shown until the response resolves.

### STORY-5: Post-reactivation lands in the active experience
As a reactivated FIM, I want to be returned to my normal experience, so reactivation visibly completes.

**Acceptance criteria:**
- Given reactivation succeeded, when the Hub re-resolves the session, then profile resolution works again and the member lands on their groups/home with the paused surface dismissed.

## Platform dependencies

- **[FEAT-PC005](../../../platform/core/features/FEAT-PC005-self-service-account-reactivation.md) (Platform Core Identity) — the substrate this feature consumes.** Provides the owner-gated, audited reactivation transition (`POST /api/v1/account/reactivate`): paused → active on the caller's own account only, decommissioned rejected as terminal, with the audit write owned platform-side. **This is the paired-spec reciprocation — the state-write is owned at the platform tier; the Hub cannot flip `is_active` directly (ADR-U009).**
- **[FEAT-PC004](../../../platform/core/features/FEAT-PC004-account-state-read.md) (Platform Core Identity).** The account-state read used to gate the affordance (paused only) and to confirm the post-reactivation `active` state.
- **Internal: [FEAT-H006](./FEAT-H006-render-account-state.md).** Hosts the paused-account surface this affordance lives on; IDN-12 depends on IDN-9 internally (§L3).

## Cross-product impact

The **Gimbal** will consume the **same** `POST /api/v1/account/reactivate` contract for its own reactivation UX; only the platform-side semantics are shared. Within the Hub, this feature completes Cycle A on the surface FEAT-H006 establishes; the later IDN-10 exit/deletion seam will reuse the same paused/closed surfaces as its host.

## Vertical impact

- **Privacy/GDPR:** reactivation restores the member's access to **their own** account and data; it shares nothing new with other members. The Hub initiates the action only for the member's own account (the contract is own-account only) and surfaces no other member's state.
- **Notifications:** the platform may emit a self-addressed "account reactivated" security confirmation (FEAT-PC005); if so, the Hub surfaces it to the member. No third party is notified. (Addressed, not blank — resolves with the Notifications vertical at build.)
- **Administration:** this is the member-facing **self-service** complement of the admin lifecycle tools; it adds no admin affordance and requires no DeusEx oversight for a member returning to their own account.
- **Observability:** the Hub emits telemetry for the reactivation attempt, its confirmation, and success/failure outcomes (the authoritative audit row is written platform-side by FEAT-PC005); no silent failures.
- **Transactions:** None.
- **Extensibility:** the affordance is driven by the `state` label from FEAT-PC004 (shown only for `paused`); a future lifecycle state would gate the affordance through the same open-label switch rather than a hardcoded client-side set.
