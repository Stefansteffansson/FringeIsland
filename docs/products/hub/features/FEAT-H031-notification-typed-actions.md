# FEAT-H031: Notification typed actions (Accept/Decline in the bell)

---
id: FEAT-H031
title: Notification typed actions (Accept/Decline in the bell)
owner: hub
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

N-A (FEAT-H030) gave the Hub a passive notification surface — bell, dropdown, inbox — that renders actionable rows with only a **read-only status chip** ("Awaiting response" / "Handled" / "Expired") and no way to respond. Two answerable events live outside the bell in bespoke panels: **stewardship nominations** (the `PendingNominations` section above `/groups`, whose own docstring names A-NTF as its re-home target) and **group-of-groups acting-invitations** (the Accept/Decline on `GroupMembershipsPanel`, group-detail page). N-B brings the response *into* the notification surface: a **generic, data-driven typed-action UI** (ADR-U051) that renders Accept/Decline (and future response types) on any actionable row, dispatches thin to the existing dedicated handlers, and — for acting-invitations fanned to a group's leaders — shows the other leaders **"Answered by [name]"** once one responds. Paired with FEAT-PD014 (the contracts).

## Solution sketch

- **`action_data` on the row type.** `NotificationRow` (`lib/notifications/queries.ts`) gains `action_data` (the FEAT-PD014 contract extension); the couriers/client re-export it.
- **Generic typed-action affordance.** A `NotificationActions` component rendered inside `NotificationItem` (so it appears in both the bell dropdown and the inbox, the shared renderer) when a row is **actionable and unresolved** (`action_type` set, `action_taken` null, not past `expires_at`). Response buttons are **data-driven** — derived from the row's `action_type`, not a hardcoded pair — Ferd renders Accept / Decline; the shape admits more without a component rewrite (ADR-U051, no sealed set). Each response is confirmed via `ConfirmModal` (Hub primitive), applied optimistically with rollback on failure, and clears the row's affordance + decrements the pending affordance on success.
- **Thin per-action dispatch (NB-1).** A client dispatch maps the row's action context → the right BFF route: nominations reuse the existing `POST /api/notifications/[id]/nomination-response` (`respond_to_stewardship_nomination`); acting-invitations use a **new** `POST /api/notifications/[id]/acting-response` (`respond_to_acting_invitation`, FEAT-PD014). Both thin authenticated pass-throughs (ADR-U037 `getUser()` on the mutation; ADR-U038 private BFF — no browser `.rpc()`).
- **Retire `PendingNominations`.** Delete the component and its `/groups`-page mount; the bell/inbox is the nomination's home (its data now rides the notification's `action_data`, so `/api/me/nominations` is no longer consumed by a surface).
- **Fold the acting affordance.** Remove the Accept/Decline from `GroupMembershipsPanel`; the panel keeps a **read-only** invited-status line (and reconciles to the outcome on re-fetch). The bell/inbox is the answer home; both surfaces stay consistent on refresh (no realtime until N-C).
- **Resolved / expired states.** A row with `action_taken` set (or converged) renders the outcome chip — "Accepted" / "Declined" / **"Answered by [name]"** (from `action_data.resolved_by_name`) / "Expired" — and **no buttons**. Unknown `action_type` falls back to the passive render (open-registry safety, H030 precedent).

## Appetite

One cycle (N-B), surface half — one focused session for the action component + two BFF wirings + the two retirements, with unit + E2E. Fixed time; the generic action component and the acting first-answer-wins render are the core; the `GroupMembershipsPanel` read-only fold is trimmable to "hide buttons" if it fights.

## Rabbit holes

- **Resist per-kind action components.** One generic `NotificationActions` driven by `action_type`; nomination and acting differ only in the dispatch route and the `action_data` keys read, not in a bespoke component each.
- **Optimistic dispatch must roll back cleanly** — a failed response (403 lost-permission, 409 already-answered) restores the buttons and surfaces the reason; never a silent divergence (H030 STORY-4 precedent).
- **Already-answered is a normal outcome, not an error.** When a co-leader answered first, the response call returns the resolved state; render "Answered by [name]", don't show an error toast.
- **Two surfaces for acting.** The bell and the (now read-only) `GroupMembershipsPanel` must not both offer live buttons — fold the panel's affordance so there's one answer path; both reflect the outcome on re-fetch.
- **Don't re-word server copy.** Title/body stay server-authored (V3); the action UI adds buttons + an outcome chip, never rewrites the notification's text.

## No-gos

- No new response types beyond Accept/Decline in Ferd (framework open; none built).
- No realtime convergence (N-C) — siblings reflect "Answered by [name]" on the next fetch/refresh, not live.
- No preferences UI (N-D), no email (NB-2), no toasts/banners beyond the existing interruption grade.
- No Mist action surface — FIM-only (NB-8).
- No change to how nominations/acting are *created* — only how they're answered.

## Stories

### STORY-1: Generic typed-action affordance
As a FIM, I want to respond to an actionable notification from the bell or inbox, so that I don't have to hunt for a separate panel.

**Acceptance criteria:**
- Given an actionable, unresolved row (`action_type` set, `action_taken` null, not past `expires_at`), when it renders in the bell dropdown or the inbox, then response buttons appear (Accept / Decline in Ferd), derived from `action_type` (not hardcoded), each opening a `ConfirmModal`.
- Given I confirm a response, when it is submitted, then the affordance is applied optimistically and, on success, the row shows its outcome with no buttons and the unread/pending state updates without a full refetch.
- Given the response call fails (403/409/500), when the optimistic update was applied, then it rolls back, the buttons return, and the reason is surfaced (no silent divergence).
- Given a row whose `action_type` the surface doesn't recognise, when it renders, then it falls back to the passive read-only render (no crash, no buttons — open-registry safety).

### STORY-2: Answer a stewardship nomination in place
As a nominee, I want to accept or decline my nomination from my notifications, so that the bespoke pending-nominations section is no longer needed.

**Acceptance criteria:**
- Given a `stewardship_nomination` notification, when I render it, then it shows its context from `action_data`/`title`/`body` (the group; the response window from `expires_at`) and Accept / Decline.
- Given I Accept (confirmed), when it dispatches, then `POST /api/notifications/[id]/nomination-response` is called (`respond_to_stewardship_nomination`), the row records the outcome, and the badge/pending updates.
- Given the `PendingNominations` section, when the Hub renders `/groups`, then it no longer exists (component and mount removed); the inbox is the nomination's home.
- Given a nomination past its window, when it renders, then it shows "Expired" and no buttons (NTF-8 lazy-expiry from FEAT-PD014).

### STORY-3: Answer a group acting-invitation in place, with co-leader convergence
As a leader of an invited group, I want to accept or decline the acting-invitation from my notifications and have my co-leaders see who answered.

**Acceptance criteria:**
- Given an `acting_invitation` notification, when I render it, then it shows the inviting/invited group context from `action_data` (`context_group_name`, `invited_group_name`) and Accept / Decline.
- Given I respond (confirmed), when it dispatches, then `POST /api/notifications/[id]/acting-response` is called (`respond_to_acting_invitation`), the invitation resolves, and my row shows the outcome.
- Given a co-leader answered first, when my row next renders, then it shows "Answered by [name]" (from `action_data.resolved_by_name`) with no buttons — and responding again is not offered.
- Given `GroupMembershipsPanel` on the group-detail page, when the group has a pending acting-invitation, then it shows the invited status **read-only** (no Accept/Decline there — folded into the bell/inbox) and reflects the outcome on re-fetch.

### STORY-4: Resolved and expired rows carry no affordance
As a FIM, I want answered or expired notifications to stop asking for a response, so that the surface reflects reality.

**Acceptance criteria:**
- Given a row with `action_taken` set (`accepted`/`declined`/`expired`), when it renders, then it shows the matching outcome chip and no buttons.
- Given a converged acting sibling, when it renders, then the chip reads "Answered by [name]" rather than a generic "Handled".
- Given read-state, when I reload after responding, then the outcome persists (server state, FEAT-PD014), not local-only.

## Platform dependencies

FEAT-PD014 (all of it — `action_data` on `get_own_notifications`, `respond_to_acting_invitation`, the acting fan-out + convergence, lazy-expiry) — paired, same cycle. The existing `/api/notifications/[id]/nomination-response` route + `respond_to_stewardship_nomination` (reused). PC-2 session/auth for the BFF. No realtime (N-C).

## Cross-product impact

None now. The typed-action affordance renders as a design-system-layer primitive so Gimbal/Studios inherit the grammar when they surface actionable notifications (V3 surfaces law: appearance canonical, copy shared, response set data-driven).

## Vertical impact

- **Privacy/GDPR:** Renders only the caller's rows (contract-scoped); `action_data.resolved_by_name` shows a co-leader's display name already visible within the shared group context — no new disclosure. No client-side storage beyond the session context.
- **Notifications:** The in-app **response** surface for the actionable-notification framework (ADR-U051) — appearance via the design-system layer, response set data-driven from `action_type`, copy server-authored. Interruption grade unchanged (all `badge` in Ferd).
- **Administration:** None (member-facing affordances; admin/console is A-ADM).
- **Observability:** BFF response routes log errors through the standard v2 path; optimistic rollback (STORY-1) is a visible UI state, never silent.
- **Transactions:** None.
- **Extensibility:** Response buttons are data-driven from `action_type` with a safe fallback for unrecognised types; no hardcoded accept/decline set, no per-kind component zoo (ADR-U008/U018).

## Performance budget

- **First-paint class:** unchanged from H030 — the action affordance renders from the already-fetched notification context; no new blocking request on any page's critical path. `/groups` loses the `PendingNominations` standalone read (a small net win).
- **Interaction class:** responding is optimistic — `ConfirmModal` confirm → immediate visual feedback (<100 ms), B5-safe; the dispatch resolves in the background with rollback on failure.
- **Loading states:** buttons show a pending state during dispatch (never a frozen UI); the confirm modal is instant; converged/expired states render from the fetched row, no spinner.

## Payload walk (against FEAT-PD014, done at decomposition)

Every field FEAT-H031 renders or dispatches from traces to a FEAT-PD014 key, and each new PD014 key has a consumer here:

- **Affordance gate** ← `action_type` (present + recognised) ∧ `action_taken` (null) ∧ `expires_at` (not past). All served by `get_own_notifications`.
- **Nomination render** ← `title`/`body` (server copy), `action_data.group_id` (navigation), `expires_at` (response window). **Dispatch** ← the notification `id` → `/api/notifications/[id]/nomination-response`. (`action_data.nominee_rank`/`total_nominees` available if the render wants "you are nominee 1 of 2"; optional.)
- **Acting render** ← `title`/`body`, `action_data.context_group_name` + `action_data.invited_group_name` (context). **Dispatch** ← the notification `id` → `/api/notifications/[id]/acting-response`; the server reads `action_data.membership_id` (the surface never needs it directly). 
- **Resolved / converged chip** ← `action_taken` (`accepted`/`declined`/`expired`) + `action_data.resolved_by_name` (→ "Answered by [name]", first-token nickname render). 
- **Unread/pending** ← `is_read` (visual) + the unread-count contract (badge, unchanged).

No PD014 key is unconsumed here except `action_taken_at` — which FEAT-PD014 deliberately does not serve (no consumer); `action_data.resolved_outcome` is redundant with `action_taken` and used only as a cross-check. Every rendered/dispatched field has its PD014 source.
