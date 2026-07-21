# FEAT-PC017: Account lifecycle self-service — pause my account, delete my account, origin-split states

---
id: FEAT-PC017
title: Account lifecycle self-service — member-initiated pause and terminal delete, with the deactivation-origin field that splits paused from suspended
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A member cannot leave. Every account-lifecycle write on disk is admin-gated: the only full platform-exit path, `admin_exit_user_from_platform`, requires `manage_all_groups` and **explicitly refuses self-exit** ("Cannot exit yourself from the platform") — the exact inversion of what IDN-10 (§L3: *"Initiate self-service exit / deletion request"*) requires. There is likewise no self-pause: the off-but-not-closed state has exactly one producer (an admin hold), which is why FEAT-PC005/FEAT-H007 (IDN-12 reactivation) sit parked — a member-initiated return path must never reverse an admin act, and today the substrate cannot tell the two apart.

Both blocking dependencies named by the IDN-10 forward-seam (G-36) are now real: DS-3 enrolment freezing on membership departure is built and test-pinned (J-D; the `ds3_lifecycle_*` facts of ADR-U047), and DS-5's content dispositions are decided and built (C-E: preserve-and-seal, retain-under-legitimate-interest, read-time tombstone attribution per ADR-U021). This feature is the platform half of Cycle C-F, consumed API-first by the Hub (FEAT-H029, FEAT-H007).

### Why Platform Core, not a Domain Service

The transitions mutate `public.users` (`is_active`, `is_decommissioned`, the new origin field) — PC-2 Identity-owned columns — walk PC-3-owned membership rows, write the PC-4 `admin_audit_log`, and delete `auth.sessions` rows. All are Core surfaces; a Domain Service cannot touch any of them without breaking the one-way dependency rule. Domain participates exactly as ADR-U047 prescribes: Core emits the lifecycle facts; the `ds3_lifecycle_*`/`ds5_lifecycle_*` handlers react. This cannot be modelled in Domain or via Extensions.

## Solution sketch

**Board decisions this encodes (C-F board, 2026-07-21):** F-1 full lifecycle slice · F-2 private-erase + communal-tombstone · F-3 immediate + confirm (no grace-period state). Prior decisions inherited: the four-state origin-split model (account-lifecycle decision record, 2026-06-29 — promoted to **ADR-U050** with this cycle's schema gate), scrub posture retain-under-legitimate-interest with mechanics seamed to A-ADM (C-E board), preserve-and-seal (C-E D2), "Former member"/`[Deleted User]` read-time attribution (ADR-U021/MEM-9 — no content rewrite needed at delete time).

One schema addition, two new owner-gated RPCs, one state-read extension, one gating amendment, one retirement:

- **`users.deactivation_origin`** (`text`, nullable; open namespace, values today `'member'` / `'admin'`) — set by every off-transition, cleared on return to active. Existing off rows backfill `'admin'` (safe: not self-reversible; today's only producer is an admin). This is the schema-gate item, carried by **ADR-U050** (the state-machine promotion the 2026-06-29 decision record mandates).
- **`pause_own_account()`** — `SECURITY DEFINER`, `SET search_path = ''`, no target parameter. Active → paused: sets `is_active=false, deactivation_origin='member'` on the caller's own row only. Rejects when `is_decommissioned` (terminal) and when already off with `deactivation_origin='admin'` (a member cannot convert an admin hold into a self-pause). Idempotent when already member-paused. **No cascades**: memberships, roles, enrolments, conversations are untouched — pause is a reversible absence, not a departure (this is what makes reactivation cascade-free, per FEAT-PC005). Audited `self_pause_account`.
- **`delete_own_account()`** — `SECURITY DEFINER`, terminal, no target parameter. Rejects when `is_decommissioned` (idempotent-reject as already closed) and when off with `deactivation_origin='admin'` (an admin-held account cannot self-delete — the hold would be escapable; the member's right of access via export survives regardless, CB-6). Then, in one transaction:
  1. **Membership walk** — the caller's active engagement memberships run the same three scenarios the admin path proved: `regular_leave` / `steward_handover` → `ds3_lifecycle_member_departed(group, pgid, 'left_group')`; sole-Steward-sole-member `group_closure` → `ds3_lifecycle_group_closed` **plus `ds5_lifecycle_group_closed`** (the seal the admin path predates — C-E wired it into `close_group`/`delete_group`; the walk must not skip it); membership + role rows deleted as the admin path does.
  2. **Private-class erasure (F-2)** — the member's journal entries and journey lived record (enrolments, step instances, responses) are erased through the existing house cascades (the `ds3_lifecycle_personal_group_erased` / `ds3_lifecycle_user_hard_deleted` facts and the FK cascades PD007 STORY-1 proved); owned-journey attribution reassigns to the `[Deleted User]` sentinel exactly as the hard-delete path does.
  3. **Communal-class retention (F-2)** — forum posts, conversation messages, announcements, reports are **not touched**: they stay readable to their other participants under preserve-and-seal, attributed read-time as "Former member"/`[Deleted User]` (ADR-U021). Physical scrub stays with the A-ADM queue (C-E posture).
  4. **Decommission + scrub** — `is_active=false, is_decommissioned=true, deactivation_origin='member'`; identity display fields on the caller's `users` row scrubbed (nickname/bio/avatar cleared) so no PII lingers on the retained row; the `users` row itself and the personal group survive as FK targets (v1 keeps the admin path's shape — full personal-group erasure remains the Mist-erasure / admin hard-delete path; see Open questions).
  5. **Sessions die** — `auth.refresh_tokens` + `auth.sessions` rows for the caller deleted (the admin path's proven force-logout shape; PC009's per-session revocation is the sibling primitive, not reused here — this is all-sessions).
  6. **Audit** — one row, `action='self_delete_account'`, actor = the caller's personal group, scenario counts in `metadata`.
- **`get_own_account_state()` extension (FEAT-PC004 amendment, additive)** — the off-state CASE splits on origin: `NOT is_active AND deactivation_origin='member'` → `'paused'`, else `'suspended'`; `decommissioned` unchanged. The payload additionally carries `deactivation_origin`. `state` was declared an open label precisely for this (FEAT-PC004); consumers switch on it without a breaking change.
- **`reactivate_own_account()` gating (FEAT-PC005 amendment)** — the un-parked reactivation adds the origin gate: only `deactivation_origin='member'` flips back; `'admin'` rejects (suspended stays admin-lift-only). On success the origin field clears.
- **Retirement** — `DROP FUNCTION public.admin_exit_user_from_platform` (the area-gate due: "old exit path retired"). Its three membership scenarios live on inside `delete_own_account()`; admin-side lifecycle control continues via `admin_update_user_status` / `admin_decommission_user` / `admin_hard_delete_user`; any future admin-initiated *full exit* Console affordance is A-ADM's to specify (COR-A F-3 stays A-ADM-homed).
- **Routes (ADR-U015/U038, platform surface):** `POST /api/v1/account/pause` and `POST /api/v1/account/delete`, `Authorization: Bearer <jwt>` — additive.

## Appetite

Moderate — the cycle's whole platform half. The delete walk is a port of a proven body (the admin path's scenario loop) onto a self-resolved actor plus the ds5 seal call; pause and the origin split are small; the erasure legs reuse existing handlers/cascades. The risk concentration is the schema gate (one column + one DROP + re-issued function bodies) and the W12 adversarial surface of two new member-callable `SECURITY DEFINER` RPCs.

## Rabbit holes

- **Don't rebuild the membership scenarios from scratch.** The admin path's loop is the oracle — port it, add the missing `ds5_lifecycle_group_closed` call on the closure branch, and keep the scenario vocabulary (`regular_leave`/`steward_handover`/`group_closure`) byte-stable for the audit metadata.
- **Don't let delete touch communal rows.** F-2 is a *non-action* on forum/messages/announcements — resist any "helpful" content anonymisation write; attribution is read-time (ADR-U021). A migration that rewrites message rows is a defect.
- **Don't invent a pending-deletion state.** F-3 rejected the grace period; the state machine stays four states. The confirm ceremony is the Hub's (FEAT-H029).
- **Don't gate the export.** A paused, suspended, or mid-delete member's export right survives (CB-6); nothing here may touch the export contracts' ungated actor resolution.
- **Don't reuse `admin_update_user_status` for pause.** Admin-gated, unaudited, and origin-blind — the new owner-gated RPC is the correct shape (the FEAT-PC005 lesson, mirrored).
- **Backfill order matters.** The origin backfill (`'admin'` for existing off rows) must land in the same migration as the CASE split, or the state read misreports existing suspended members as neither.

## No-gos

- No reversal of decommission — delete is terminal for self-service and everyone else (`enforce_decommission_invariant()` stands).
- No self-escape from an admin hold — a suspended account can neither pause, delete, nor reactivate itself.
- No cross-user action — neither RPC takes a target parameter.
- No Mist path changes — Mist ephemerality/erasure stays FEAT-PC002 (`explicit_erase_mist`); these RPCs resolve a FIM actor or reject.
- No physical scrub of communal content — that is the A-ADM queue's inheritance (C-E posture), not this cycle's write.
- No admin Console affordance — A-ADM-homed (COR-A F-3).
- No grace-period / scheduled-deletion substrate (F-3).

## Stories

### STORY-1: Pause my account
As a FIM, I want to pause my own account, so I can step away without asking an admin and without losing anything.

**Acceptance criteria:**
- Given an active FIM, when they invoke the pause contract, then `is_active=false`, `deactivation_origin='member'`, and the account-state read (FEAT-PC004) returns `state='paused'`.
- Given a paused-by-self FIM, when they invoke pause again, then it returns success idempotently with no duplicate audit row.
- Given the pause succeeded, when any of their memberships, roles, journey enrolments, or conversations are inspected, then none changed — pause cascades nothing.

### STORY-2: An admin hold is not mine to touch
As the platform, I want admin-suspended accounts to be un-pausable, un-deletable, and un-reactivatable by their member, so an admin hold is never self-escapable.

**Acceptance criteria:**
- Given an account that is off with `deactivation_origin='admin'`, when its member invokes pause, delete, or reactivate, then each rejects with a state-specific refusal and no row changes.
- Given the same account, when an admin lifts the hold via the admin path, then the member's self-service paths work again.

### STORY-3: The origin field splits paused from suspended
As the platform, I want the state read to distinguish member-paused from admin-suspended, so surfaces can offer return-to-active only where it is legitimate.

**Acceptance criteria:**
- Given a member-paused account, when `get_own_account_state()` runs, then `state='paused'` and `deactivation_origin='member'`.
- Given an admin-suspended account (including every pre-migration off row via the backfill), when the read runs, then `state='suspended'` — never `'paused'`.
- Given a member-paused account, when `reactivate_own_account()` (FEAT-PC005) runs, then it succeeds and clears `deactivation_origin`; given an admin-suspended account, then it rejects.

### STORY-4: Delete walks my memberships honestly
As a departing FIM, I want my group memberships resolved the way the platform already resolves departures, so my leaving breaks nothing for anyone else.

**Acceptance criteria:**
- Given a FIM with a regular membership, when they delete their account, then their membership + role rows in that group are gone via the `member_departed('left_group')` scenario — and their own enrolments do not survive as live rows: the departure freeze is transient here, superseded in the same transaction by STORY-5's erasure (F-2). Other members' group-side record is untouched.
- Given a FIM who is a Steward with co-members, when they delete, then the `steward_handover` scenario runs as the admin path defined it.
- Given a FIM who is the sole member and Steward of a group, when they delete, then the group closes with **both** `ds3_lifecycle_group_closed` and `ds5_lifecycle_group_closed` (conversations sealed — the C-E seal is not skipped).

### STORY-5: Delete erases what is only mine and keeps what is ours
As a departing FIM, I want my private record erased and my communal contributions honestly attributed, so my exit respects both my privacy and the group's record (F-2).

**Acceptance criteria:**
- Given a FIM with journal entries and a journey lived record (enrolments, step instances, responses), when they delete their account, then those rows are erased and their owned-journey attribution reassigns to the `[Deleted User]` sentinel.
- Given the same FIM had forum posts and conversation messages, when they delete, then those rows are untouched, remain readable to their other participants, and attribute read-time as the former-member fallback (ADR-U021) — no content rewrite occurred.
- Given the deletion completed, when the member's `users` row is inspected, then display fields are scrubbed, `is_decommissioned=true`, `deactivation_origin='member'`.

### STORY-6: Delete is immediate, terminal, and ends my sessions
As the platform, I want deletion to complete in one transaction and end every session, so there is no half-departed limbo (F-3).

**Acceptance criteria:**
- Given a FIM with multiple active sessions, when they delete their account, then all `auth.sessions`/`auth.refresh_tokens` rows are gone and no session can act again.
- Given a decommissioned account, when any self-service lifecycle contract is invoked for it, then it rejects as terminally closed; `enforce_decommission_invariant()` is never violated.
- Given the deletion transaction fails at any step, when it returns, then no partial state persists (all-or-nothing).

### STORY-7: Both transitions are audited
As the platform, I want every self-service lifecycle transition in the audit trail, so lifecycle history is attributable.

**Acceptance criteria:**
- Given a successful pause or delete, when it completes, then exactly one `admin_audit_log` row exists (`self_pause_account` / `self_delete_account`, actor = the caller's personal group, before/after and scenario counts in `metadata`), written inside the `SECURITY DEFINER` RPC.

### STORY-8: The old exit path is retired
As the platform, I want `admin_exit_user_from_platform` gone, so the exit semantics have exactly one home.

**Acceptance criteria:**
- Given the migration applied, when `admin_exit_user_from_platform` is called by any role, then the function does not exist (42883).
- Given the retirement, when the admin lifecycle paths (`admin_update_user_status`, `admin_decommission_user`, `admin_hard_delete_user`) are exercised, then they are unchanged.

### STORY-9: No Mist ever walks these doors
As the platform, I want both new RPCs to refuse session-less and Mist callers, so the lifecycle surface upholds the W12 wall.

**Acceptance criteria:**
- Given a session-less client, when either RPC is called directly via PostgREST, then it rejects (no actor); given a Mist session, then it rejects without touching any row.

## Cascade specification (ADR-U016)

| Layer | Pause (active → paused) | Delete (→ decommissioned) |
|---|---|---|
| **PC-2 Identity** | `is_active=false`, `deactivation_origin='member'`; nothing else | Decommission + display-field scrub; row and personal group retained as FK targets; sessions + refresh tokens deleted |
| **PC-3 Organisation** | None — memberships/roles untouched | Membership walk: `regular_leave`/`steward_handover`/`group_closure` per the admin path's proven scenarios; membership + role rows deleted |
| **PC-4 Governance** | One audit row `self_pause_account` | One audit row `self_delete_account` (scenario counts in metadata) |
| **DS-3 Journeys** | None — enrolments stay live (C-F board default: nothing to thaw at reactivation) | `member_departed` freeze per departed group; lived record erased via the `personal_group_erased`/`user_hard_deleted` facts + FK cascades; owned-journey attribution → `[Deleted User]` |
| **DS-5 Communication** | None | `ds5_lifecycle_group_closed` seal on each `group_closure`; DMs/forum content untouched (preserve-and-seal + read-time tombstone, ADR-U021) |
| **Journal (PD001)** | None | Entries erased (private class, F-2) |
| **Privacy (V2)** | Own-row visibility change only | Art. 17-honest split: private-classes erased now; communal classes retained under legitimate interest with the scrub seam to A-ADM; export right unaffected pre-deletion (CB-6) |
| **Notifications (V3)** | None (no fan-out) | None beyond what departure cascades already emit (board default) |
| **Transactions (V5)** | None | None |

## Platform dependencies

- **ADR-U047 lifecycle-fact handlers (existing):** `ds3_lifecycle_member_departed/group_closed/personal_group_erased/user_hard_deleted`, `ds5_lifecycle_group_closed` — consumed in-transaction, definer-context only.
- **PC-4 audit primitive (existing):** `admin_audit_log` + the inline-INSERT-via-`SECURITY DEFINER` pattern.
- **PC-2 state substrate (existing):** `users.is_active/is_decommissioned`, `enforce_decommission_invariant()`, the four-hop actor primitive.
- **`[Deleted User]` sentinel (existing, seeds):** the reassignment target the hard-delete fact resolves.
- **Siblings:** [FEAT-PC004](./FEAT-PC004-account-state-read.md) (state read — amended additively here) · [FEAT-PC005](./FEAT-PC005-self-service-account-reactivation.md) (reactivation — un-parked and origin-gated by this cycle) · [FEAT-PC008](./FEAT-PC008-member-data-export.md) (export — untouched, ungated actor stands per CB-6).

## Cross-product impact

Consumed by **Hub [FEAT-H029](../../../products/hub/features/FEAT-H029-pause-or-delete-my-account.md)** (the pause/delete surface) and **[FEAT-H007](../../../products/hub/features/FEAT-H007-self-service-account-reactivation.md)** (the return path). The **Gimbal** will consume the same `/api/v1/account/*` contracts. The state-write is platform-owned; no surface touches `public.users` (ADR-U009/U038).

## Stability posture (Platform Core §7)

**Schema gate + ADR.** One new column (`users.deactivation_origin` + backfill), two new member-callable `SECURITY DEFINER` RPCs (privilege-escalation surfaces, documented in their migration comments), one function re-issue (`get_own_account_state` — additive payload), one gated amendment (`reactivate_own_account`), one `DROP` (the retired exit path — a Core signature removal). **ADR-U050** (account-lifecycle state machine: four states split by origin) is the contract-change ADR the 2026-06-29 decision record mandates; it rides the schema-gate PR. Migration held at the gate for the named nod per standing practice.

## Vertical impact

- **Privacy/GDPR:** the feature *is* the Art. 17 surface for the platform's Ferd posture: erasure-on-request for private classes now, legitimate-interest retention with read-time de-identification for communal classes, physical scrub seamed to A-ADM. Right of access (export) survives every state including mid-hold (CB-6). Both RPCs act on the caller's own row only.
- **Notifications:** none new — pause is silent; delete emits nothing beyond existing departure cascades (board default). A future "account deleted" confirmation belongs to A-NTF.
- **Administration:** admin hold outranks self-service (STORY-2); admin lifecycle RPCs unchanged; the old admin exit path retired with its scenarios preserved in the self-service home; future Console exit affordance A-ADM-homed (COR-A F-3).
- **Observability:** every transition audited (STORY-7); routes emit structured logs (request id, actor, outcome, rejection class); refusals are observable events, not silent empties.
- **Transactions:** None.
- **Extensibility:** `deactivation_origin` is an open text namespace (a future `'system'` origin needs no schema change); audit actions extend the open `self_*` namespace; `state` stays an open label (FEAT-PC004's contract).

## Performance budget

N/A (no surface) — the Hub half (FEAT-H029) carries the budget; both RPCs are single-transaction writes on the caller's own rows with bounded membership walks.

## Open spec questions

1. **Personal-group disposition at self-delete.** v1 retains the (scrubbed) `users` row and personal group as FK targets — the admin path's shape — while erasing private content classes. Full personal-group erasure à la `_erase_mist` would be tidier but adds reassignment complexity the `[Deleted User]` sentinel machinery only partially covers. **For schema review:** confirm v1 retention, with full erasure joining the A-ADM scrub queue's inheritance.
2. **Journal erasure mechanics.** Whether `journal_entries` erasure rides an existing FK cascade or needs an explicit delete in the walk — verify at red-suite time against the PD001 substrate (build detail, not a 4-ready blocker; STORY-5's criterion is behavioural).
3. **DM-conversation participant rows at delete.** Whether the departing member's `conversation_participants` rows are removed (their inbox ceases to exist) or retained-inert on the sealed record — the C-A/C-E substrate decides which read the export and the other party's detail view take. Behaviourally bounded by STORY-5 (other participants keep reading); resolve at red-suite time.
