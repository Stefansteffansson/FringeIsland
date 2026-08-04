# FEAT-H042: Invitations answer in the bell + the /groups landing focus

---
id: FEAT-H042
title: Invitations answer in the bell + the /groups landing focus
owner: hub
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

The WF-1 directive (HYG-A walk, 2026-08-03): invited members SHALL accept/decline group invitations directly in the bell, exactly like stewardship nominations. Today `invitation_received` renders passively and its click-through routes to `/groups` (the W-04 `ANSWER_PATHS` pointer), where `MyInvitations` answers. FEAT-PD017 arms the kind on the typed-actions framework; this feature is the surface half — and because the generic affordance (FEAT-H031's `NotificationActions`) is registry-driven, the surface work is deliberately thin: a BFF dispatch route, the two new render cases (`cancelled`, and answer-consequences on the groups surface), and the E2E journey.

It also carries the WS-4 polish rider (settled 2026-08-03, "rides N-E"): a bell notice landing on `/groups` today anchors nothing — easy to read as "nothing happened". The landing must focus the invitation card.

## Solution sketch

- **BFF dispatch route.** `POST hub/app/api/notifications/[id]/invitation-response/route.ts` — thin authenticated pass-through to `respond_to_personal_invitation` (ADR-U037 `getUser()` on the mutation; ADR-U038 private BFF), with the standard SQLSTATE mapping of its siblings (42501→403, P0001→409, P0002→404). No client-side kind map: the dispatch route is built from the row's platform-served `dispatch_segment` (`notificationDispatchRoute`), which starts serving `invitation-response` the moment PD017's registry row lands — the client plumbing already routes it.
- **Render cases.** The generic affordance renders Accept/Decline for the armed rows automatically (registry-driven — verify, don't rebuild). New: a row converged to `cancelled` renders a **"Withdrawn"** chip (fact only — PD017 withholds the canceller's name by design) with no buttons; accepted/declined converged rows render the existing outcome chips.
- **Answer consequences.** A bell answer re-reads the groups surface: `respondToNotification` already fires `refreshNavigation` (W-07); the `/groups` page (groups list + `MyInvitations`) must actually respond to it so an answer taken in the dropdown over `/groups` updates the page beneath. The reverse door already converges platform-side (PD017 STORY-3); the bell reflects it on re-read (verify-on-signal; no new realtime).
- **The landing focus (WS-4 rider).** `ANSWER_PATHS['invitation_received']` becomes `/groups?focus=invitations`; `/groups` reads the param, scrolls the `MyInvitations` card into view with a transient highlight, and degrades to a plain landing when nothing pends (answered in between — never an error). The entry **stays** in `ANSWER_PATHS` even though the kind is now row-answerable: dropping it would route body-clicks to `/groups/[id]`, which has no answering affordance for an invited viewer — the exact W-04 dead end returning. Update the in-file W-04 comment to say so.

## Appetite

One cycle (N-E), surface half — one focused session for the route + render cases + the rider, with unit + the one E2E journey that covers both (WS-4's own line). Fixed time; the dispatch and the two-doors consistency are the core; the highlight is trimmable to scroll-only if it fights.

## Rabbit holes

- **Don't rebuild the affordance.** `NotificationActions`/`NotificationItem` are generic and registry-driven; if invitation rows need per-kind branching in components, that's drift — the differences live in the dispatch route (server data) and the chip vocabulary.
- **Two doors must not diverge.** Answering in the bell while `/groups` is open must update `MyInvitations` and the groups list; answering on the card while the dropdown is open must not leave live buttons after re-read. Test both directions.
- **The stale-answer path.** An invitation cancelled while the bell is open: buttons dispatch → 404/`already` → the row re-reads converged ("Withdrawn"), never an error toast for a normal outcome (H031 "already-answered is a normal outcome" precedent).
- **Suspended-group refusal.** Accept on a held group returns the PC023 refusal — surface it verbatim on the row (`notification-action-error-<id>` pattern), roll back the optimistic state, keep the buttons (the ask still stands).
- **The focus param is a hint, not state.** `?focus=invitations` must be safe to reload, share, or hit with zero pending invitations; no persistent highlight, no scroll-jack on later navigations.

## No-gos

- `MyInvitations` stays — two doors, one truth (the walk directive's own line). No retirement, no read-only fold.
- No change to notification copy (server-authored, W-03) — the surface adds affordances and chips only.
- No new realtime channel; convergence renders on re-read/hint (ADR-U039 verify-on-signal).
- No anchor/highlight generalisation — this is the one named landing; a generic focus framework is out of scope.

## Stories

### STORY-1: Answer the invitation where it is read
As an invited member, I want Accept/Decline on my invitation notification in the bell and inbox, so that the letter itself answers.

**Acceptance criteria:**
- Given an armed `invitation_received` row, when it renders in the bell dropdown or the inbox, then Accept/Decline render from the registry-served responses (no local kind map), each confirmed via `ConfirmModal`.
- Given I confirm Accept, when it dispatches, then `POST /api/notifications/[id]/invitation-response` runs, the membership activates (PD017 → Core), the row shows "Accepted" with no buttons, and the group appears in my groups without a full reload.
- Given I confirm Decline, when it dispatches, then the invitation is declined and the row shows "Declined" — durable across reload (Option A convergence).
- Given the dispatch fails (403/409/500), when the optimistic state was applied, then it rolls back, the buttons return, and the reason is pinned to the row (H031 STORY-1 AC3 pattern) — a suspended group's refusal surfaces verbatim.
- Given a pre-migration passive row (historical orphan), when it renders, then it stays passive (no buttons, no crash).

### STORY-2: Two doors, one truth
As an invited member, I want the bell and the `/groups` card to always agree, so that no door offers a dead ask.

**Acceptance criteria:**
- Given `/groups` is open beneath the dropdown, when I answer in the bell, then `MyInvitations` and the groups list update (the `refreshNavigation` consequence), without a manual reload.
- Given I answer on the `MyInvitations` card, when the bell content next re-reads (hint or refetch), then the row renders converged with no buttons.
- Given a steward cancelled the invitation while my bell was open, when I press Accept, then the outcome is the converged "Withdrawn" state, not an error; given I merely re-read, then the row shows "Withdrawn" with no buttons and no canceller named.
- Given my answer raced another door, when the response returns `already: true`, then the row renders the converged outcome (first-answer-wins; no duplicate side effects).

### STORY-3: The landing focuses the ask (WS-4 rider)
As an invited member clicking the notice's body, I want `/groups` to show me the invitation it was about, so that the landing never reads as "nothing happened".

**Acceptance criteria:**
- Given I activate the notification body (not a response button), when the Hub navigates, then it lands on `/groups?focus=invitations`, the `MyInvitations` card scrolls into view, and it is transiently highlighted.
- Given no invitation pends at landing (answered or withdrawn in between), when the page renders, then it degrades to the plain `/groups` view — no error, no empty highlight, no scroll-jack.
- Given a later in-app navigation back to `/groups` without the param, when the page renders, then no focus behaviour fires (the param is the trigger, not page state).

## Platform dependencies

FEAT-PD017 (all of it — the armed dispatch, `respond_to_personal_invitation`, the all-doors convergence, the registry `dispatch_segment`) — paired, same cycle. FEAT-PD013/PD014 + COR-C W3 (list contract with `action_data`/`dispatch_segment`/`responses` — consumed as-is). FEAT-H031 (the generic affordance — reused, not modified structurally). FEAT-PC012 contracts via PD017 only (the Hub adds no new direct invitation calls; `MyInvitations`' existing routes stand).

## Cross-product impact

None now. The answer path is the same platform door any future surface (Gimbal) uses; the landing-focus rider is Hub-shell navigation and does not export. Equipment: `none` — the affordance renders wherever notifications render.

## Vertical impact

- **Privacy/GDPR:** Renders only the caller's rows. The "Withdrawn" chip deliberately names no actor (PD017's withholding rule made visible). No new client storage.
- **Notifications:** Completes WF-1 — the third answerable kind in the bell; interruption grade unchanged; copy server-authored throughout.
- **Administration:** None (member-facing affordances only).
- **Observability:** BFF route logs through the standard v2 path; rollback + pinned reason is a visible UI state, never silent; the telemetry event for accepting/declining an invitation continues to originate platform-side.
- **Transactions:** None.
- **Extensibility:** No local kind map anywhere — route from `dispatch_segment`, buttons from `responses`, chips keyed on open TEXT outcomes with a safe fallback for unrecognised values (H030/H031 precedent).

## Performance budget

- **First-paint class:** unchanged — no new blocking request on any page's critical path; the affordance renders from the already-fetched row; `/groups` gains only a param read + scroll on the focused landing.
- **Interaction class:** responding is optimistic (<100 ms visual), dispatch resolves in background with rollback on failure — the H031 budget verbatim.
- **Loading states:** buttons carry a pending state during dispatch; the focused landing never blocks paint on the scroll/highlight (fire after mount).

## Payload walk (against FEAT-PD017, done at decomposition)

Every field this surface renders or dispatches from traces to a platform key, and every new PD017 key has a consumer here:

- **Affordance gate** ← `action_type` (present + recognised) ∧ `action_taken` (null); `expires_at` is NULL for this kind by design (no "Respond by" line renders — matching acting).
- **Invitation render** ← `title`/`body` (server copy, unchanged); `action_data.group_name` + `action_data.inviter_name` available for structured render/confirm copy ("Join *group*?"); `group_id` (row + `action_data`) for navigation.
- **Dispatch** ← row `id` + platform-served `dispatch_segment='invitation-response'` → `POST /api/notifications/[id]/invitation-response`; the server reads `action_data.group_id` (Core dispatch) and `action_data.membership_id` (convergence key) — the surface needs neither directly.
- **Outcome chips** ← `action_taken` (`accepted`/`declined` → existing chips; `cancelled` → "Withdrawn") + `action_data.resolved_outcome` (cross-check) + `action_data.resolved_by_name` (self-name on accept/decline; NULL on cancelled — nothing renders an actor for "Withdrawn").
- **Landing focus** ← no payload dependency — `ANSWER_PATHS` (client) + the `?focus=invitations` param; the W-04 pointer survives for body-clicks.
- **Unread/pending** ← `is_read` + the unread-count contract (unchanged; convergence sets `is_read=true` platform-side, so a withdrawn ask also stops counting).

Every PD017 `action_data` key (`membership_id`, `group_id`, `group_name`, `inviter_name`, and the merged `resolved_by_name`/`resolved_outcome`) has a named consumer above — none rides unconsumed, and nothing rendered lacks a platform source.
