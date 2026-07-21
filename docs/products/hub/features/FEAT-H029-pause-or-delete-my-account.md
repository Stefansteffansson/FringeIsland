# FEAT-H029: Pause or delete my account — the FIM steps away or leaves for good, from the Hub

---
id: FEAT-H029
title: Pause or delete my account — the Hub affordances for the member-owned account lifecycle (IDN-10)
owner: hub
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

A member who wants to step away — or leave for good — has no door. The account area renders state (FEAT-H006), exports data (FEAT-H010), manages sessions (FEAT-H012), but offers no lifecycle action; the only platform-exit path is an admin RPC that refuses self-exit. IDN-10 (§L3: *"Initiate self-service exit / deletion request"*) is the Hub's half of closing that gap: the surface where a FIM pauses their account (reversible absence) or deletes it (terminal departure), with the gravity of each made honest in the UX. This is the paired consumer of FEAT-PC017; FEAT-H007 (un-parked this cycle) completes the loop by bringing a paused member back.

## Solution sketch

Both affordances live in the **account area** the FIM already knows (the H006/H010/H012 neighbourhood), clearly separated from each other by weight:

- **Pause my account** — one affordance + **ConfirmModal** (never a browser dialog) stating what pause means: *your account goes quiet, nothing is lost, you can return whenever you choose*. On confirm → `POST /api/v1/account/pause` (Bearer JWT, ADR-U009). On success the Hub re-resolves account state (FEAT-PC004 reads `paused`) and routes the member to the paused-account surface (hosted by FEAT-H006, where FEAT-H007's "Reactivate" affordance now lives).
- **Delete my account** — a deliberate, multi-step ceremony (F-3: immediate + confirm, no grace period), still one surface:
  1. **What this means** — plain-language summary of the F-2 split: what is erased (journal, journey record), what remains for others (forum posts and messages, shown as "Former member"), that this cannot be undone.
  2. **Export offer** — an explicit "Download my data first" step linking the FEAT-H010 export; skippable but never hidden.
  3. **Type-to-confirm** — the member types a fixed confirmation phrase; the destructive button stays disabled until it matches. Then → `POST /api/v1/account/delete`.
  4. **Farewell** — on success the Hub clears local session state (the platform already ended every session) and lands on a brief farewell screen, then the public entrance. No dashboard flash, no half-signed-in limbo.
- **Failure** on either call → honest error state on the same surface with retry; never a false success, never a partial transition.
- The affordances render only for an **active FIM**: a suspended member sees H006's "contact an admin" surface (no self-service exit from a hold — the platform rejects regardless); a decommissioned account sees the terminal surface; a Mist has no account area (their farewell is transcendence/erasure, FEAT-PC002).

## Appetite

Moderate-small. One account-area section with two flows, one ConfirmModal use, one type-to-confirm ceremony, two BFF pass-through calls, a farewell screen, and the routing/guard wiring. No platform logic in the Hub (ADR-U038); the state machine, cascades, and refusals are FEAT-PC017's.

## Rabbit holes

- **Don't soften delete into pause.** The two affordances must not visually compete; pause is the gentle offer, delete sits behind the ceremony. Never pre-select or streamline the delete path.
- **Don't hand-roll consequence copy per data class beyond the spec's split.** The summary states the F-2 posture (erased vs remains-as-Former-member); enumerating tables is platform detail that will drift.
- **Don't build a grace-period UX.** F-3 settled immediate; no "scheduled for deletion" state, no countdown emails.
- **Don't trust the client after delete.** The server killed the sessions; the Hub's job is to clear its local state and leave — any post-delete fetch will 401 and must not surface as an error toast storm.
- **Don't gate the export offer on anything.** The offer step renders even if the member exported yesterday (CB-6 posture: access is theirs).
- **Don't reimplement state gating client-side.** Affordance visibility switches on FEAT-PC004's `state`/`deactivation_origin` labels; the platform's refusals (STORY-2 of PC017) remain the enforcement.

## No-gos

- No admin affordances, no acting on another member's account.
- No Mist-facing surface — this is FIM account lifecycle only.
- No reactivation UX here — that is FEAT-H007 on the paused surface.
- No direct table access, no session-cookie platform calls — Bearer-JWT BFF pass-through only (ADR-U009/U038).
- No "we'll email you a link" indirection — the flows complete in-session (email confirmation is not in the Ferd substrate).

## Stories

### STORY-1: Pause from the account area
As an active FIM, I want to pause my account from my account page, so I can step away knowing nothing is lost.

**Acceptance criteria:**
- Given an active FIM on the account area, when they choose **Pause my account** and confirm in the ConfirmModal, then the Hub calls `POST /api/v1/account/pause` and, on success, re-reads account state (FEAT-PC004 returns `paused`) and routes to the paused-account surface.
- Given the member cancels the ConfirmModal, when it closes, then no call was made and nothing changed.

### STORY-2: The delete ceremony is deliberate
As an active FIM, I want deleting my account to require deliberate, informed confirmation, so I cannot destroy my place here by accident.

**Acceptance criteria:**
- Given the delete flow, when it opens, then it states in plain language what is erased and what remains attributed as "Former member", and that the action is immediate and irreversible.
- Given the flow, when it reaches the export step, then a working path to the FEAT-H010 export is offered before any destructive control is reachable.
- Given the confirmation step, when the typed phrase does not match, then the destructive control stays disabled; when it matches and is invoked, then `POST /api/v1/account/delete` is called exactly once (control disabled in flight).

### STORY-3: Farewell, cleanly
As a FIM who deleted their account, I want to be signed out to a farewell, so my departure completes visibly and nothing half-works afterwards.

**Acceptance criteria:**
- Given the delete call succeeded, when the Hub handles the response, then local session state is cleared, a farewell message renders, and the member lands at the public entrance — with no authenticated UI flash and no error-toast fallout from in-flight requests.
- Given the deleted member's browser reloads any authenticated route, when the request resolves, then they are treated as signed out (the platform ended every session).

### STORY-4: The affordances know their place
As the platform, I want pause/delete offered only where legitimate, so the surface never invites an impossible action.

**Acceptance criteria:**
- Given a suspended member (admin hold), when their account surface renders, then neither pause nor delete is offered (H006's "contact an admin" stands); given a stale client invokes either call anyway, then the platform's rejection is surfaced honestly with no state change.
- Given a decommissioned account, when its surface renders, then only the terminal message shows.

### STORY-5: Failure leaves me whole
As a FIM, I want a failed pause or delete to leave me exactly where I was, so I am never stranded mid-transition.

**Acceptance criteria:**
- Given either call fails (network/refusal), when it returns, then the Hub shows a clear error with retry on the same surface, renders no success state, and a re-read of account state confirms the unchanged truth.
- Given a call is in flight, when the member waits, then the initiating control is disabled with a loading state until resolution.

## Platform dependencies

- **[FEAT-PC017](../../../platform/core/features/FEAT-PC017-account-lifecycle-self-service.md)** — the paired platform half: both RPCs/routes, the origin-split state machine, every cascade and refusal. The Hub initiates; the platform enforces.
- **[FEAT-PC004](../../../platform/core/features/FEAT-PC004-account-state-read.md)** — the state read (`state` + `deactivation_origin`) gating affordance visibility and confirming transitions.
- **[FEAT-PC008](../../../platform/core/features/FEAT-PC008-member-data-export.md) via [FEAT-H010](./FEAT-H010-download-my-data.md)** — the export offered in the delete ceremony.
- **Internal:** [FEAT-H006](./FEAT-H006-render-account-state.md) hosts the off-state surfaces (its open-label switch gains the `paused` branch with this cycle's build); [FEAT-H007](./FEAT-H007-self-service-account-reactivation.md) provides the return path from the paused surface.

## Cross-product impact

The **Gimbal** will consume the same `/api/v1/account/pause|delete` contracts with its own ceremony UX; the ceremony *shape* (consequence summary → export offer → typed confirm) is worth mirroring but is not a platform contract. Within the Hub this completes the account area's lifecycle loop: state (H006) → export (H010) → sessions (H012) → pause/delete (here) → return (H007).

## Vertical impact

- **Privacy/GDPR:** the member-facing face of the platform's erasure posture — the ceremony states the F-2 split honestly (no "everything is deleted" overclaim); the export offer operationalises access-before-erasure. Nothing about other members is shown.
- **Notifications:** none — pause is silent; no departure fan-out in Ferd (board default).
- **Administration:** no admin affordance; the suspended surface keeps pointing at admins, never around them.
- **Observability:** telemetry for flow entry, export-offer take-up, confirm, success/failure per action (id-only, content-free); failures are events, not silence.
- **Transactions:** None.
- **Extensibility:** affordance gating switches on the open `state`/`deactivation_origin` labels — a future state renders safely via H006's default branch rather than breaking this surface.

## Performance budget

- **First-paint class:** the account area is an existing B3-warm-nav page; this feature adds a section to it — no new data-boot path (state arrives via the existing FEAT-PC004 read).
- **Interaction class:** modal/ceremony opens are local (< B5); the two mutations show disabled-control + loading feedback within 100 ms; the delete call's latency is masked by the ceremony's final step, and the farewell renders on confirmation, not optimistically.
- **Loading states:** in-flight mutations show button-level loading (< 1 s typical); the farewell screen renders only on confirmed success.
