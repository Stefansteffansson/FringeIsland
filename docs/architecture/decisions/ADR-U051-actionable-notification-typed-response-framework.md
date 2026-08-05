# ADR-U051: Actionable notifications are a typed, data-driven response framework with permission-fanned shared actions

**Status:** Accepted (2026-07-24 — accepted at the A-NTF Cycle N-B close, the schema gate having merged as PR #276; realized by FEAT-PD014 + FEAT-H031, both `6-done`)
**Date:** 2026-07-24
**Deciders:** Stefan (N-B scope correction + expansion, 2026-07-24) + Claude (N-B decomposition)
**Tags:** scope:domain-service · scope:vertical · scope:product · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

A-NTF Cycle N-B makes notifications *answerable in place* — the bell and inbox grow Accept / Decline (and, by design, future response types). Two kinds are in scope: **stewardship nominations** (already actionable notifications — `action_type='accept_decline'`, answered by the dedicated `respond_to_stewardship_nomination`) and the **group-of-groups acting-invitation** (FEAT-PC015 — one group invites another to join; answered on the invited group's behalf).

The N-B scope-lock (2026-07-24) assumed both were already actionable notifications. Disk verification refuted that for the acting-invitation. There is **no acting-invitation notification**: `invite_group` writes a `group_memberships` row in `invited` state (`20260706120000_feat_pc015...:156`); `respond_to_group_invitation(p_membership_id, p_accept)` (`:228`) mutates that membership and never touches `notifications`; and ADR-U048's delivery FK (`notifications.type → notification_kinds`, PD013) structurally forbids an unregistered acting kind. The acting-invitation is surfaced today only by the bespoke `GroupMembershipsPanel` on the group-detail page. (An existing trigger `20260222000000_rebuild...:991-1011` does emit `invitation_received` on `invited` inserts, but addresses `recipient_group_id = member_group_id` — for a group invitation that is the invited *group*, which no human bell reads.)

Stefan decided (2026-07-24) to make the acting-invitation a **real actionable notification**, fanned out to the invited group's leaders, first-answer-wins, showing "answered by [name]", on a **general, extensible** response engine reusable for future question types. This ADR fixes the framework so N-B — and later cycles — build on one pattern, not per-kind hacks.

Two questions the scope-lock did not answer, and this ADR must: **who receives a group-addressed actionable notification**, and **how a shared action resolves once and reflects to every recipient — durably, even when the answer deletes the underlying subject row.**

## Decision drivers

- **ADR-U041 (group representation by permission):** a group acts through permission-holders, never a hardcoded "Steward" role. Recipients of a group-addressed action = the holders of the answering permission (`act_as_group`).
- **ADR-U049 (routed delivery + hint-not-authority):** resolve recipients once at send-time and materialize per-recipient rows; the durable subject is the authority; stale pointers resolve to nothing on re-check.
- **ADR-U039 (tables-are-truth):** a notification is a pointer / hint, never authority; a lost hint costs a badge, never correctness.
- **ADR-U048 (delivery/routing split):** any tier may write delivery rows as obligation-fulfilment; DS-5 owns routing / fan-out.
- **Board NB-1 (thin-dispatch to dedicated handlers):** the generic `handle_notification_action` dispatcher was deliberately dropped (pc014 `20260705072252:947`); domain logic lives in dedicated per-action RPCs. No god-dispatcher returns.
- **ADR-U008 / ADR-U018 (non-closure):** the set of response types must be data-driven, not a sealed accept/decline enum — Stefan wants more answer options later.
- **The convergence + persistence problem:** decline currently *deletes* the membership row (`20260706120000...:289`), so who-declined leaves no trace; a fanned action needs a resolution record that survives the answer.

## Considered options — where a shared action's resolution + answerer live

- **Option A — on the fanned notification rows.** On answer, the dedicated handler runs the domain mutation; the notification layer then marks every sibling row for the same subject resolved (outcome + resolver identity). The single-recipient case (nomination) is the degenerate N=1. The record lives where unread state already lives (U049).
- **Option B — on the subject row.** Stop deleting on decline (a terminal `declined` state + `status_changed_by`); re-check the membership at read-time. Cleaner single authority, but changes `respond_to_group_invitation` semantics and only ever covers membership subjects.
- **Option C — a separate resolution / event table** keyed by subject.

## Decision outcome

**Chosen: Option A** — resolution and answerer are recorded on the notification rows.

### The ruling

1. **Typed-action registry (data-driven, extensible — U008/U018).** Each actionable notification declares an `action_type` (already a column). The *set of valid responses* per action_type is data-driven, not a hardcoded accept/decline pair; the surface renders response affordances generically from it. Ferd realizes exactly two response types (`accept`, `decline`) plus a read-only acknowledge, but the framework admits more with no schema or code change (a new response registered as data). No `switch(action_type)` with a sealed arm list, on either side of the API.

2. **Dispatch is thin, to dedicated handlers (NB-1).** The `action_type` names the dedicated domain RPC. The surface posts the chosen response; a thin per-action dispatch calls the dedicated handler (domain logic stays there — `respond_to_stewardship_nomination` for nomination; `respond_to_group_invitation` for acting) and *then* records notification-side resolution. No generic dispatcher owns domain logic; the framework owns only routing + convergence bookkeeping.

3. **Individual vs shared actions.** An action is **individual** (one recipient owns it — nomination) or **shared / fanned** (many recipients answer on one subject's behalf — acting-invitation). A shared action carries its subject reference in `action_data` (the `membership_id`).

4. **Group-addressed fan-out resolves recipients at send-time by permission (U041 + U049).** When an engagement group is invited (`invite_group` → `group_memberships.status='invited'` where the invited member is a group, not a person), the platform emits one `acting_invitation` actionable notification **per holder of `act_as_group` in the invited group**, each addressed to that holder's personal group (`recipient_group_id`), with `action_data = {membership_id, context_group_id, context_group_name, invited_group_id, invited_group_name}`. Holders are enumerated once at send-time via the Tier-2 permission join (`has_permission`'s internal join, `20260222000000:460-473`; no `members_with_permission` helper exists — N-B writes one, SECURITY DEFINER, `search_path=''`). The personal-invitation branch (member is a personal group) keeps its existing `invitation_received` to the invitee, unchanged; the group-invite branch does not surface the group-addressed `invitation_received` orphan.

5. **First-answer-wins convergence, durable on the notifications (U049 hint-not-authority).** The first holder to answer resolves the subject via the dedicated handler; the dispatch then converges **every** sibling notification for that subject — marks it resolved (`action_taken` = the outcome, `action_taken_at = now()`), removes response affordances, and records the **resolver's identity** so each sibling renders "Answered by [name]". Because the record lives on the durable notification rows, it survives the membership deletion a decline performs. A holder viewing an already-resolved notification sees the outcome + answerer, never a dead button (the read-time re-check is the U039 verify-on-signal posture, applied to a shared action).

6. **`get_own_notifications` carries `action_data` (the one N-A → N-B contract extension).** N-A withheld it (`20260723120000:116`); the shared-action dispatch needs `membership_id` to route and the render needs the subject context. The change is additive and backward-compatible — the RETURNS TABLE gains one `jsonb` column. `action_taken_at` stays withheld until a consumer needs it.

### Consequences

- **Positive:** one framework for every future in-place question (the extensible response set is Stefan's explicit ask); the acting-invitation gains bell/inbox parity with nominations; `PendingNominations` (and later the bespoke acting affordance) retire into the inbox; who-answered becomes durable (today a decline erases it); the pattern reuses U041/U049/U039/U048/NB-1 rather than inventing.
- **Negative:** a shared answer writes O(holders) sibling-convergence updates synchronously — bounded and acceptable at Ferd scale (a handful of leaders), the same accepted trade as U049's O(members) send fan-out. Fan-out emission likewise writes O(holders) rows at invite-time.
- **Neutral:** nominations are unchanged in behavior (the N=1 shared case); their existing route + handler stand. The `invitation_received` personal-invitation path (MyInvitations) is untouched — only the group / acting branch changes. `invite_group` and `respond_to_group_invitation` domain logic are untouched; N-B wraps, it does not rewrite them.

## Pros and cons of the options

### Option A — resolution on the notification rows (chosen)
- Pros: survives decline-deletes-subject; generalizes to any future actionable subject, not just memberships; keeps resolution where unread state already lives (U049); no change to `respond_to_group_invitation` semantics.
- Cons: O(holders) sibling updates per shared answer (accepted, bounded, named).

### Option B — resolution on the subject row
- Pros: single authority; re-check is a natural read-time join.
- Cons: forces a semantics change on `respond_to_group_invitation` (decline must stop deleting); membership-only — a future non-membership actionable subject gets no home; larger blast radius on a Core-organisation contract.

### Option C — separate resolution / event table
- Pros: subject-agnostic; append-only audit shape.
- Cons: a new table + its RLS + its join for a record the notification rows can already carry; over-built for Ferd; duplicates the unread/answer state the delivery substrate already provides.

## Links

- ADR-U041 (group representation by permission — the recipient rule), ADR-U049 (routed delivery fan-out + hint-not-authority — the pattern this repeats), ADR-U039 (tables-are-truth / verify-on-signal), ADR-U048 (delivery/routing split), ADR-U008 + ADR-U018 (non-closure — the extensible response set), ADR-U016 (cascade-spec-first — the invite-emission trigger cascade)
- Board: NB-1 (thin-dispatch to dedicated handlers) — [phase-3-notifications-completion-plan](../../planning/hub-v2/phase-3-notifications-completion-plan.md)
- Features realising this: [FEAT-PD014](../../platform/domain/features/FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md) (platform framework + emission + fan-out + convergence) ↔ [FEAT-H031](../../products/hub/features/FEAT-H031-notification-typed-actions.md) (typed-action UI); [FEAT-PC015](../../platform/core/features/FEAT-PC015-group-of-groups-membership-and-acting-contracts.md) (`invite_group` / `respond_to_group_invitation` — the reused acting handler); [FEAT-PD013](../../platform/domain/features/FEAT-PD013-notification-routing-contracts-and-category-registry.md) (`get_own_notifications`, extended here)
- Substrate anchors: `invite_group` `20260706120000:72` (invited insert `:156`); `respond_to_group_invitation` `:228` (decline delete `:289`, accept records `status_changed_by_group_id` `:285`); invited-insert trigger `20260222000000:991-1011`; `act_as_group` `supabase/seeds/01_permissions.sql:10`; `has_permission` Tier-2 join `20260222000000:460-473`; nomination `action_data` `20260706120000:606-624` (re-offer `20260719190205:684-702`); `get_own_notifications` `20260723120000:118`

---

## Amendment 1 (2026-07-31) — the Ferd response-contract family is named; "admits more with no schema change" is scoped (Audit III AC3-11)

**Status:** Accepted (Stefan, 2026-07-31 — the COR-C W4 rulings board; "amend U051" chosen over widening the handler parameter)
**Trigger:** [Anatomy Conformance Audit III](../../planning/reference/ANATOMY-CONFORMANCE-AUDIT-3.md) AC3-11. Ruling 1 claims the framework "admits more [response types] with no schema or code change" — but every Ferd handler contract is boolean-shaped: `respond_to_stewardship_nomination(… p_accept boolean)` (`20260728190000:185`), `respond_to_group_invitation(… p_accept boolean)`, `respond_to_acting_invitation(… p_accept boolean)` (`20260724120000:206`). A third response cannot flow through a boolean. The code's own comments concede the cap; the ADR overstated.

**The amendment.** Ruling 1 is scoped honestly. What admits more responses **as data** is the *framework*: the typed-action registry, the thin dispatch, the convergence bookkeeping, and the surface's generic affordance rendering. The *Ferd handler family* is the **accept/decline pair by contract** — the three responders above take `p_accept boolean`, a boundary that is deliberate, named, and cheap to hold (every Ferd action is a yes/no). A response type beyond the pair is a *contract evolution*: the affected handler gains a response-key parameter (or a sibling contract) behind the unchanged registry — not a data registration alone. The "no schema or code change" clause is struck for handler contracts; it stands for kinds, categories, copy, and response-set presentation.

**Consequence for COR-C W3:** W3 homes the response set + handler identity platform-side as data (closing AC3-5) with the boolean family carried as-is; no parameter widening rides that work.

---

## Amendment 2 (2026-08-05) — the personal-invitation path joins the framework; the "untouched" consequence clause is superseded (WF-1 / cycle N-E)

**Status:** Proposed (authored at the N-E decomposition; rides its own held PR per the ADR carve-out — accepted on Stefan's named nod)
**Trigger:** The WF-1 directive (HYG-A live walk, 2026-08-03): invited members SHALL accept/decline group invitations directly in the bell, exactly like stewardship nominations. The Consequences' Neutral clause — "The `invitation_received` personal-invitation path (MyInvitations) is untouched — only the group / acting branch changes" — described N-B's *scope*, not a boundary of the framework; the directive brings the personal branch in.

**The amendment.** The Neutral clause is superseded for the dispatch path and scoped for the rest. The personal branch of `notify_invitation_received` arms `invitation_received` (`action_type='accept_decline'`, `action_data={membership_id, group_id, group_name, inviter_name}` — ruling 3's subject ref); a thin `respond_to_personal_invitation(p_notification_id, p_accept)` dispatch composes the **untouched** Core `accept_group_invitation` / `decline_group_invitation` (NB-1 holds — the "wraps, does not rewrite" clause stands, extended to the personal Core pair). Convergence remains Option A durable and gains its total form: a delivery-substrate trigger on `group_memberships` (ADR-U048's classification, like the emission trigger itself) converges every standing `invitation_received` for a terminating invited membership **through every door** — bell answer, MyInvitations answer, `cancel_member_invitation`, admin removal, cascade — deriving `accepted` / `declined` / `cancelled` at the row's termination. `cancelled` is an open outcome value (the `action_taken` column is unconstrained TEXT), and its convergence **withholds the resolver's name** — the invitee may stand outside the group, and the canceller's identity would be a new disclosure class; the fact converges, the actor does not. MyInvitations itself stays (the directive's own "two doors, one truth" line), so the surface half of the old clause survives; what is struck is only "untouched" as a description of the dispatch path. Amendment 1 is unaffected: the Ferd handler family remains the accept/decline pair by contract — `cancelled` is a convergence *outcome*, never a pressable response.

**Features realising this:** [FEAT-PD017](../../platform/domain/features/FEAT-PD017-bell-answerable-personal-invitations.md) ↔ [FEAT-H042](../../products/hub/features/FEAT-H042-invitation-bell-answers-and-groups-landing-focus.md) (cycle N-E).
