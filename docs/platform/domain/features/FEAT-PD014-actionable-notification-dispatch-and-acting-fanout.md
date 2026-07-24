# FEAT-PD014: Actionable-notification dispatch, acting-invitation fan-out, and convergence

---
id: FEAT-PD014
title: Actionable-notification dispatch, acting-invitation fan-out, and convergence
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

N-A (FEAT-PD013) delivered passive notifications, the read/serve contracts, and the category registry — but deliberately withheld `action_data` and shipped no dispatch layer, so actionable notifications render only a read-only status chip. Two answerable events remain un-actionable in the bell:

- **Stewardship nominations** are actionable notifications already (`action_type='accept_decline'`, answered by the dedicated `respond_to_stewardship_nomination`), but their action context (`action_data`) never reaches a surface and they are answered today only through the bespoke `PendingNominations` panel.
- **Group-of-groups acting-invitations** (FEAT-PC015) are **not notifications at all** — `invite_group` writes a `group_memberships` row in `invited` state and `respond_to_group_invitation(p_membership_id, p_accept)` mutates that membership; the delivery FK (ADR-U048/PD013) structurally forbids an unregistered acting kind. They surface only on the bespoke `GroupMembershipsPanel`.

N-B realises the DS-5 **actionable-notification framework** (ADR-U051): the `get_own_notifications` `action_data` extension, a new `acting_invitation` notification with **permission-based send-time fan-out** to the invited group's `act_as_group` holders, **first-answer-wins convergence** recorded durably on the notification rows, thin **typed-action dispatch** to the existing dedicated handlers (NB-1), and **lazy expiry-on-view** (NTF-8). Paired with FEAT-H031 (the typed-action UI).

## Solution sketch

One schema-gated migration, plus ADR-U051 accepted at the same gate. Five moves:

1. **Contract extension (the one N-A→N-B change).** `get_own_notifications` gains `action_data jsonb` in its RETURNS TABLE and projection (additive, backward-compatible; PD013 STORY-2's payload grows by one key). `action_taken_at` stays withheld (no consumer yet). The same `action_data` flows into `get_own_notifications_export()` (already carries action state — CB-6).

2. **`acting_invitation` kind + permission-fanned emission.** Register `acting_invitation` in `notification_kinds` under the `membership` category (data row; open registry, no enum). Extend the existing invited-insert delivery trigger (`20260222000000:991-1011`, a Notifications-vertical delivery-substrate trigger per U048) to branch on the invited member:
   - **Personal invitation** (invited member is a personal group) → keep emitting `invitation_received` to the invitee, unchanged (the MyInvitations path).
   - **Group / acting invitation** (invited member is an engagement group) → enumerate the invited group's `act_as_group` holders via the Tier-2 permission join (`has_permission`'s internal join shape, `20260222000000:460-473`, inlined in the trigger — DS-5 routing/recipient-resolution per U048, reading organisation tables, adding no Core contract) and fan out **one `acting_invitation` notification per holder**, addressed to each holder's personal group (`recipient_group_id`), `action_type='accept_decline'`, `expires_at=NULL` (acting-invitations have no deadline today), `action_data = {membership_id, context_group_id, context_group_name, invited_group_id, invited_group_name}`. The group-addressed `invitation_received` orphan is not emitted for the group branch.

3. **Thin acting-response dispatch + convergence (NB-1).** New DS-5 contract `respond_to_acting_invitation(p_notification_id uuid, p_accept boolean)` (SECURITY DEFINER, `search_path=''`, four-hop actor P-O1, REVOKE public/anon, GRANT authenticated). It: resolves the caller's own `acting_invitation` notification → `membership_id` from `action_data`; **calls the untouched Core `respond_to_group_invitation(membership_id, p_accept)`** (domain logic + `act_as_group` gate stay in Core — Domain→Core, one-way); then **converges** — every `acting_invitation` notification for that `membership_id` with `action_taken IS NULL` is set `action_taken = 'accepted'|'declined'`, `action_taken_at = now()`, `is_read = true`, and `action_data` merged with `{resolved_by_name, resolved_outcome}` (the resolver's display name denormalised onto the durable rows, so it survives the decline that deletes the membership — ADR-U051 Option A). **Nominations need no new contract** — the existing `respond_to_stewardship_nomination` + its route stand; the surface just gains `action_data` to render them.

4. **Lazy expiry-on-view (NTF-8).** A caller's actionable notifications past `expires_at` with `action_taken IS NULL` are lazily marked `action_taken='expired'`, `action_taken_at=now()` when they fetch, so they leave the pending set and render "Expired" with no affordances. Bounded, monotonic, own-rows-only. (Affects nominations — 7-day `expires_at`; acting-invitations have none.)

5. **Conformance + W12 riders.** `respond_to_acting_invitation` joins `DS_OWNED_ALLOWLIST`; the `acting_invitation` kind is a registry data row; `notifications` stays OUT of `DS_TABLES` (U048); the trigger extension is delivery substrate (no allowlist change). Each shipped RPC gets an adversarial direct-call test.

## Appetite

One cycle (N-B), platform half — one focused session for migration + red-first contract suite. Fixed time; the convergence + fan-out are the core, the lazy-expiry is trimmable-to-simplest if it fights the read-purity boundary.

## Rabbit holes

- **Don't rewrite the Core acting handler.** `invite_group` / `respond_to_group_invitation` are PC-3/Core and stay untouched — N-B *wraps* them (Domain→Core call + notification-side convergence). Reaching into their membership logic is out of bounds (and a Core carve-out we're deliberately avoiding).
- **The personal-vs-group branch predicate.** The trigger must distinguish a personal-group invitee (person) from an engagement-group invitee (acting) — resolve against the personal-group marker on disk (a member with a matching `users.personal_group_id`, or the group-type marker), verified at build; a wrong predicate double-emits or misses the fan-out. Watch the existing trigger fires for *both* today.
- **First-answer-wins race.** Two holders answering near-simultaneously are totally ordered by the single membership row's lock: the first resolves it; the second's `respond_to_group_invitation` finds a non-`invited` (or deleted) membership and the wrapper converges that caller's row to the already-resolved state rather than erroring (STORY-3 concurrency AC).
- **Convergence must not leak across subjects.** Convergence keys strictly on `action_data->>'membership_id'` — never on kind alone — so one invitation's answer never touches another's fan-out.
- **Read-with-write-side-effect.** Lazy-expiry mutates on a read path; keep it own-rows-only and idempotent (already-expired rows are unaffected); do not let it touch another actor's rows.

## No-gos

- No change to `invite_group` / `respond_to_group_invitation` semantics (decline still deletes the membership; convergence is recorded on the notifications, not the membership — ADR-U051 Option A over Option B).
- No generic dispatcher (NB-1; `handle_notification_action` stays dropped) — dispatch is per-action, thin, to dedicated handlers.
- No new response types beyond `accept`/`decline` realised in Ferd (the registry is open for more; none built now).
- No realtime (N-C), no preferences/suppression (N-D), no email/external channels (NB-2), no digest (NB-6).
- No new Core contract (the recipient enumeration is inlined DS-5 routing, not a Core `members_with_permission` function).

## Stories

### STORY-1: `action_data` reaches the list + export contracts
As a FIM, I want my actionable notifications to carry their action context, so that a surface can render and dispatch them.

**Acceptance criteria:**
- Given the migration has run, when I call `get_own_notifications`, then each row additionally carries `action_data` (jsonb, NULL for passive kinds), and the previously-served keys are unchanged (`id, kind, category, title, body, group_id, created_at, is_read, read_at, action_type, action_taken, expires_at` + now `action_data`).
- Given a stewardship-nomination notification, when it is listed, then `action_data` contains its emitted keys (`group_id, nominator_group_id, nominee_ids, nominee_rank, total_nominees`).
- Given `get_own_data_export()`, when I export, then the `notifications` section carries `action_data` alongside the existing action state.
- Given another member's notification, when I list, then it never appears (PD013 STORY-2 invariant holds under the extension).

### STORY-2: Acting-invitation fans out to the invited group's permission-holders
As the platform, I want a group invitation to notify the people who can answer for the invited group, so that acting-invitations become answerable in the bell.

**Acceptance criteria:**
- Given group A invites engagement group B (`invite_group` → an `invited` membership whose invited member is a group), when the trigger fires, then one `acting_invitation` notification is emitted **per holder of `act_as_group` in B**, each addressed to that holder's personal group, carrying `action_type='accept_decline'` and `action_data={membership_id, context_group_id, context_group_name, invited_group_id, invited_group_name}`; no group-addressed `invitation_received` orphan is emitted for this branch.
- Given a **personal** invitation (invited member is a personal group), when the trigger fires, then the existing `invitation_received` to the invitee is emitted unchanged and no `acting_invitation` fan-out occurs.
- Given B has two `act_as_group` holders, when A invites B, then exactly two `acting_invitation` rows exist, one per holder; a member of B without `act_as_group` receives none.
- Given the FK on `notifications.type`, when the fan-out inserts, then `acting_invitation` is a registered kind (else the insert is rejected — open-registry proof: the kind was added as data).

### STORY-3: First-answer-wins dispatch + convergence
As a leader of the invited group, I want to accept or decline the invitation from my notification, and I want my co-leaders to see it was answered and by whom.

**Acceptance criteria:**
- Given my `acting_invitation` notification, when I call `respond_to_acting_invitation(id, true)`, then the underlying membership is accepted via the Core handler (invited→active), my row records `action_taken='accepted'`, `action_taken_at`, `is_read=true`, and `action_data` gains `resolved_by_name`/`resolved_outcome`.
- Given a co-leader's sibling `acting_invitation` for the same `membership_id`, when I answer first, then that sibling is converged to the same `action_taken`/`resolved_by_name` (my display name) with no affordance — it renders "Answered by [me]"; the record survives even a **decline** (which deletes the membership).
- Given two holders answer near-simultaneously, when the second call runs after the first resolved the membership, then the second does not error — it converges the caller's row to the already-resolved state and returns it (first-answer-wins; single-row ordering).
- Given a caller without `act_as_group` in the invited group (e.g. lost the role after emission), when they call `respond_to_acting_invitation`, then the Core gate refuses (42501) and nothing converges.
- Given a caller passing another member's notification id, when they call the contract, then it is refused/no-op (adversarial; own-notification only).

### STORY-4: Lazy expiry-on-view (NTF-8)
As a FIM, I want expired actionable notifications to stop asking for a response, so that the bell reflects reality without a sweep job.

**Acceptance criteria:**
- Given an unanswered actionable notification past its `expires_at`, when I next fetch my notifications, then it is marked `action_taken='expired'` (`action_taken_at` set), leaves the pending set, and renders "Expired".
- Given an already-answered or already-expired notification, when I fetch again, then it is unchanged (idempotent).
- Given another member's expired notification, when I fetch, then my fetch never mutates it (own-rows-only).

### STORY-5: Conformance + W12 riders
As the platform, I want the gates to know the new surface, so that the ring rules stay enforced.

**Acceptance criteria:**
- Given the conformance suite, when it runs, then `respond_to_acting_invitation` is in `DS_OWNED_ALLOWLIST`, `notifications` remains OUT of `DS_TABLES`, and the manifest classifies any new object.
- Given W12, when the area gate runs, then `respond_to_acting_invitation` has an adversarial direct-call test (other-actor refusal, missing-permission refusal, already-resolved convergence) cited.

## Platform dependencies

FEAT-PC015 (`invite_group`, `respond_to_group_invitation` — reused, untouched; Domain→Core call). FEAT-PD013 (`get_own_notifications`, the registry — extended here). PC-3 organisation permission tables (read for recipient enumeration, per U048 routing). ADR-U051 (the framework), ADR-U041 (permission recipients), ADR-U049 (fan-out), ADR-U048 (delivery/routing), ADR-U039 (hint-not-authority), NB-1 (thin-dispatch).

## Cross-product impact

Hub consumes via FEAT-H031 (paired, this cycle). The contracts are surface-neutral; any future surface (Gimbal) answers actionable notifications through the same door. Gimbal: none now.

## Vertical impact

- **Privacy/GDPR:** `action_data` (own rows only, contract-scoped) joins the export; `resolved_by_name` denormalises a co-leader's display name onto the answered rows — the same display name the group context already exposes to fellow members, no new disclosure class. Recipient enumeration reads permission state server-side; no over-fetch.
- **Notifications:** Realises the actionable-notification framework (ADR-U051) — the typed-action dispatch + the acting-invitation delivery fan-out (U048 obligation-fulfilment). Suppression/preferences remain N-D.
- **Administration:** None new (no admin primitive; the acting/nomination handlers are member-facing). Cascade: the invite-emission trigger extension is documented in the migration (ADR-U016).
- **Observability:** Contract errors surface through standard PostgREST channels; a refused dispatch (42501, already-resolved) is a visible outcome, never a silent drop.
- **Transactions:** None.
- **Extensibility:** The framework's point — `action_type` and its response set are data-driven (registry rows), no sealed accept/decline enum, no `switch(action_type)` arm-list; a new response or kind is data, not code (ADR-U008/U018).

## Performance budget

N/A (no surface). Contract notes for the consumer: the acting fan-out and convergence are O(holders) synchronous writes — bounded at Ferd scale (a handful of leaders per group), matching ADR-U049's accepted send-fan-out trade. `respond_to_acting_invitation` is a single interactive call; lazy-expiry adds at most one bounded UPDATE to the list read.
