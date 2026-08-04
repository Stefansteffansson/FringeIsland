# FEAT-PD017: Bell-answerable personal invitations (dispatch, typed response, all-doors convergence)

---
id: FEAT-PD017
title: Bell-answerable personal invitations (dispatch, typed response, all-doors convergence)
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The WF-1 directive (HYG-A walk, 2026-08-03): *invited members SHALL be able to accept/decline group invitations directly in the bell dropdown, exactly like stewardship nominations.* Today the personal branch of `notify_invitation_received` (`20260724120000:182-195`) emits `invitation_received` with payload only — no `action_type`, no `action_data` — so the bell renders a passive notice that routes to `/groups`, where `MyInvitations` does the answering. The typed-actions framework (FEAT-PD014, ADR-U051 + Amendment 1, COR-C W3 registry) already carries two precedents (nomination-response, acting-response); the personal invitation is the third kind, not a new framework.

There is also a verified convergence hole, pre-existing: `cancel_member_invitation` deletes the `invited` membership row and never touches `public.notifications` — a cancelled invitation leaves a live notification standing forever. Once the kind becomes actionable, that hole would leave live *buttons* on a dead ask, so N-E must close it — and close it for every door at once (bell answer, `MyInvitations` answer, cancel, admin removal, group deletion), because invitations are `group_memberships` rows in `invited` state whose decline/cancel **DELETE the row** (no terminal status exists; ADR-U051 Option A durable convergence is the only record that survives).

## Solution sketch

One schema-gated migration (`n_e_bell_answerable_personal_invitations`), no Core function bodies touched. Four moves:

1. **Dispatch arms the kind.** The personal branch of `notify_invitation_received` gains `action_type='accept_decline'` and `action_data = {membership_id: NEW.id, group_id, group_name, inviter_name}` (the PD014 dispatch pattern; the trigger is AFTER INSERT so `NEW.id` is available — same as the acting branch). No `expires_at` (personal invitations have no deadline, matching acting). Registry: `notification_kinds.dispatch_segment = 'invitation-response'` for `invitation_received` (data row); the `accept_decline` response set is reused — the Ferd family stays the pair by contract (U051A1), no new `action_type`.

2. **Thin typed response (NB-1).** New DS-5 contract `respond_to_personal_invitation(p_notification_id uuid, p_accept boolean) RETURNS jsonb` (SECURITY DEFINER, `search_path=''`, four-hop actor P-O1, REVOKE public/anon, GRANT authenticated): resolves the caller's own `invitation_received` notification → `action_data->>'group_id'` → calls the **untouched** Core `accept_group_invitation(group_id)` / `decline_group_invitation(group_id)` (self-scoped on the caller's own membership — the notification recipient IS the invitee, so the scoping aligns by construction). Convergence is then observed, not performed here (move 3 fires inside the same transaction); the wrapper re-reads its row and returns `{outcome, resolved_by_name, already}` in the N-B shape. `P0002` backstop: membership already gone → converge-idempotent return `{already: true}` from the (already-converged) row.

3. **All-doors convergence — a delivery-substrate trigger on `group_memberships`** (ADR-U048 obligation-fulfilment, same classification as `notify_invitation_received` itself — this is why no Core body needs editing). AFTER UPDATE (invited→active) and AFTER DELETE (WHEN OLD.status='invited'): every `invitation_received` notification whose `action_data->>'membership_id'` matches and `action_taken IS NULL` is set `action_taken`, `action_taken_at=now()`, `is_read=true`, `action_data` merged with `{resolved_by_name, resolved_outcome}`. Outcome derivation: invited→active = `accepted`; DELETE by the invitee themselves (actor's personal group = `OLD.member_group_id`) = `declined`; DELETE by anyone else (cancel, admin removal, group-delete cascade) = `cancelled`. **Privacy rule: on `cancelled`, `resolved_by_name` is withheld (NULL)** — the invitee may be outside the group and the canceller's identity would be a new disclosure class; the chip states the fact, not the actor. On accept/decline, `resolved_by_name` is the invitee's own display name (no disclosure — it's themselves). Convergence keys strictly on `membership_id`, never on kind alone (PD014 discipline). `action_taken='cancelled'` is a data value — the column is unconstrained TEXT (`20260723120000:134`), no schema friction, no sealed set.

4. **Backfill standing pending invitations.** `invitation_received` rows whose membership still exists in `invited` state and whose `action_type IS NULL` are armed (action_type + action_data built from the membership + groups join), so invitations dispatched before this migration answer in the bell too. Historical orphans (membership already gone — the pre-existing hole) are left untouched: they stay passive (no `action_type` → no buttons), and no outcome can honestly be fabricated for them.

Conformance riders: `respond_to_personal_invitation` joins `DS_OWNED_ALLOWLIST`; the convergence trigger function registers in `ownership.manifest.json` (DS-5 — `functionOwner()` defaults to CORE, which would hide it from the gate); `notifications` stays OUT of `DS_TABLES`.

## Appetite

One cycle (N-E), platform half — one focused session for migration + red-first contract suite. Fixed time; dispatch + response + trigger convergence are the core; the backfill is trimmable to "new dispatches only" if it fights.

## Rabbit holes

- **Don't touch the Core contract bodies.** `accept_group_invitation` / `decline_group_invitation` / `cancel_member_invitation` (PC012/PC023 family) stay byte-identical — the wrapper composes them (Domain→Core, NB-1) and the trigger converges beside them. Editing them is a Core carve-out this design deliberately avoids.
- **The keying asymmetry.** Personal Core contracts take `p_group_id` (self-scoped); the convergence keys on `membership_id`. Both ride `action_data`; the wrapper dispatches by `group_id`, the trigger converges by `membership_id`. Mixing them up converges the wrong rows or dispatches nothing.
- **The DELETE-outcome predicate.** `declined` vs `cancelled` derives from actor-vs-invitee at trigger time (`get_current_personal_group_id()` vs `OLD.member_group_id`). A NULL actor (service-role/cascade contexts) must fall to `cancelled`, never error — the trigger runs inside other people's transactions.
- **Sibling assertions (the three-times-bitten law + the ADM-G S8a catalog-pin lesson).** This migration changes `notify_invitation_received`'s personal-branch insert shape and arms a previously-passive kind. Before the gate, grep the suite for: assertions pinning `invitation_received` rows as passive/`action_type IS NULL` (`oracle-spine-port.test.ts` names a passive-kind case), catalog-style DISTINCT-set pins over kinds-with-`dispatch_segment` (`typed-action-registry.test.ts`), and the invitation fixtures in `invitation-contracts.test.ts`. List each in the migration header, adapted or deliberately left.
- **Suspended-group composition.** The Core contracts already refuse under PC023 (accept via `assert_group_writable`; decline via the explicit suspended check). The wrapper must surface those refusals verbatim and convergence must NOT fire (no membership change happened) — the ask still stands, answerable after reactivation or converged on cancel.

## No-gos

- No change to `accept_group_invitation` / `decline_group_invitation` / `cancel_member_invitation` / `get_my_invitations` semantics or bodies (two doors, one truth — `MyInvitations` stays fully served).
- No new response type (U051A1 — accept/decline by contract; `cancelled` is a convergence *outcome*, not a member-pressable response).
- No expiry for personal invitations (no `expires_at`; NTF-8 lazy-expiry simply never matches them).
- No fabricated convergence for historical orphans (pre-migration cancels) — they stay passive and inert.
- No realtime additions (the N-C bell channel already hints; verify-on-signal re-reads cover convergence).

## Stories

### STORY-1: The personal invitation dispatches armed
As the platform, I want personal group invitations to carry their action context, so that the bell can answer them.

**Acceptance criteria:**
- Given a member invites a person to a group, when the trigger fires, then the `invitation_received` notification carries `action_type='accept_decline'`, `action_data={membership_id, group_id, group_name, inviter_name}`, and no `expires_at`; title/body/payload are unchanged.
- Given the list contract, when the invitee fetches, then the row carries `dispatch_segment='invitation-response'` and the `accept_decline` responses from the registry (COR-C W3 join — no local map).
- Given the acting branch (invited member is an engagement group), when the trigger fires, then its fan-out is byte-for-byte unchanged (no personal-branch leak).
- Given a standing pre-migration `invitation_received` whose membership is still `invited`, when the migration runs, then it is armed identically (backfill); given one whose membership is gone, then it is untouched (passive, no buttons).

### STORY-2: Accept/decline lands from the notification
As an invited member, I want my bell answer to join or decline the group through the same contracts as the `/groups` card, so that there is one truth.

**Acceptance criteria:**
- Given my armed `invitation_received` notification, when I call `respond_to_personal_invitation(id, true)`, then the Core `accept_group_invitation` path runs (membership invited→active, Member-role auto-bind and accepted-notification triggers included), my row converges to `action_taken='accepted'` with `resolved_by_name` (my display name) and `resolved_outcome='accepted'`, and the call returns the N-B shape `{outcome, resolved_by_name}`.
- Given `p_accept=false`, when I call, then `decline_group_invitation` runs (membership row deleted), and my row survives converged to `declined` (ADR-U051 Option A — the record outlives the row it answered).
- Given the group is suspended, when I answer either way, then the PC023 refusal surfaces verbatim (the availability guard / the suspended-exit check), nothing converges, and the notification stays actionable.
- Given a notification that is not mine, or a passive/unarmed row, when I call the contract, then it is refused/no-op (own-notification, armed-only — adversarial).
- Given the invitation was already resolved through any door, when I call, then the contract does not error — it returns the converged state with `already: true` (first-answer-wins; the membership row's own locking totally orders the race).

### STORY-3: Every door converges the standing notification
As an invited member, I want a notification whose ask has been settled — by me elsewhere, or withdrawn — to say so and stop offering buttons.

**Acceptance criteria:**
- Given I accept via `MyInvitations` (`accept_group_invitation` directly), when the membership turns active, then my standing `invitation_received` rows for that `membership_id` converge to `accepted` in the same transaction.
- Given I decline via `MyInvitations` (row deleted by me), when the trigger fires, then convergence records `declined` with my display name.
- Given a steward cancels the invitation (`cancel_member_invitation` — row deleted by another), when the trigger fires, then convergence records `cancelled` with **`resolved_by_name` NULL** (the canceller's identity is not disclosed to a non-member).
- Given the invited membership dies by any other path (admin removal, group deletion cascade), when the row deletes from `invited` state, then convergence records `cancelled`; a NULL/undeterminable actor never errors the deleting transaction.
- Given a different member's invitation to the same group, when mine converges, then theirs is untouched (keying on `membership_id`, never kind).

### STORY-4: Conformance + W12 riders
As the platform, I want the gates to know the new surface, so that the ring rules stay enforced.

**Acceptance criteria:**
- Given the conformance suites, when they run, then `respond_to_personal_invitation` is in `DS_OWNED_ALLOWLIST`, the convergence trigger function is manifest-registered under DS-5, and `notifications` remains OUT of `DS_TABLES`.
- Given W12, when the area gate runs, then `respond_to_personal_invitation` has an adversarial direct-call test (other-actor refusal, unarmed-row refusal, already-resolved convergence) cited.

## Platform dependencies

FEAT-PC012 (`accept_group_invitation`, `decline_group_invitation`, `get_my_invitations` — reused, untouched) · FEAT-PC023 (the availability guard those contracts carry — composed, not re-implemented) · FEAT-PD013/PD014 (`get_own_notifications` with `action_data`, the convergence discipline) · COR-C W3 (`notification_kinds.dispatch_segment`, `notification_action_types`) · ADR-U051 + Amendment 1 (the framework; Amendment 2 — this feature supersedes the "invitation_received path untouched" consequence line, rides its own held PR) · ADR-U048 (delivery/convergence as substrate obligation) · ADR-U039 (the N-C bell channel hints; verify-on-signal).

## Cross-product impact

Hub consumes via FEAT-H042 (paired, this cycle). The contracts are surface-neutral; any future surface (Gimbal) answers invitations through the same door. `MyInvitations`' contracts are untouched, so the second door survives on every surface that mounts it.

## Vertical impact

- **Privacy/GDPR:** Own-rows only throughout. New rule made explicit: cancelled convergence withholds the canceller's display name from the (possibly non-member) invitee — the fact converges, the actor does not. Accept/decline convergence denormalises only the invitee's own name. `action_data` joins the export via the existing `get_own_notifications_export` action-state carriage (additive).
- **Notifications:** The third typed-action kind on the ADR-U051 framework; closes the verified cancelled-invitation convergence hole for every future dispatch. Suppression/preferences: `invitation_received` keeps its existing category (`asks`) and preference behaviour — unchanged.
- **Administration:** None new (no admin primitive). Cascade note (ADR-U016): the convergence trigger IS the cascade arm for invited-membership termination; documented in the migration header.
- **Observability:** Refusals surface through standard PostgREST channels (42501/P0001/P0002) — visible outcomes, never silent drops; the trigger never swallows or errors its host transaction.
- **Transactions:** None.
- **Extensibility:** Kind arming and `dispatch_segment` are registry data rows; `cancelled` is an open TEXT outcome value, not an enum arm; no `switch(action_type)` anywhere (ADR-U051 ruling 1).

## Performance budget

N/A (no surface). Contract notes for the consumer: dispatch adds two jsonb keys to an existing insert; convergence is one bounded UPDATE keyed on `membership_id` inside the already-running transaction; `respond_to_personal_invitation` is a single interactive call. The backfill is a one-time bounded UPDATE at migration apply.
