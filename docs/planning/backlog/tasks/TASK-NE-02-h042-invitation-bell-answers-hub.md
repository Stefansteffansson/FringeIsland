# Build FEAT-H042 — the invitation-response route, chips, two-doors consistency + the landing focus

---
id: TASK-NE-02
title: Build FEAT-H042 — invitation-response BFF route, Withdrawn chip, two-doors consistency, /groups?focus=invitations rider, red-first; E2E journey post-gate
status: done
assigned_to: Claude
priority: high
feature: FEAT-H042
owner: hub
wave: ferd
cycle: N-E
depends_on: [TASK-NE-01]
estimated_hours: 5
---

## Description

The surface half of Cycle N-E, per [FEAT-H042](../../../products/hub/features/FEAT-H042-invitation-bell-answers-and-groups-landing-focus.md). The affordance itself is FEAT-H031's registry-driven generic — verify, don't rebuild. Build: `POST /api/notifications/[id]/invitation-response` (thin pass-through to `respond_to_personal_invitation`, sibling SQLSTATE mapping), the "Withdrawn" chip for `action_taken='cancelled'` (fact only, no actor), the two-doors consequences (`refreshNavigation` actually re-reads `MyInvitations` + the groups list on `/groups`), `ANSWER_PATHS['invitation_received']` → `/groups?focus=invitations` with the W-04 comment updated (the entry stays — dropping it resurrects the dead end), and the `/groups` focus behaviour (scroll + transient highlight, plain degrade, param-triggered only). Unit red-first throughout (route can be built pre-gate; rows mocked). The one E2E journey covering WF-1 + WS-4 (the WS-board's own line) runs post-apply, after TASK-NE-01's gate merges.

## Acceptance criteria

- [x] Route follows the nomination-response shape; route-policy conformance green *(PR #427)*
- [x] Armed rows render Accept/Decline from registry data with ConfirmModal *(the H031 generic rendered the kind untouched — verified, not rebuilt; suspended-group refusal cell integration-side)*
- [x] "Withdrawn" renders for cancelled convergence, no buttons, no actor *(unit red-first incl. the leak-defense cell; E2E leg 4)*
- [x] Two-doors consistency *(refreshNavigation listeners on MyInvitations + the groups list, unit red-first; E2E leg 2 asserts the no-reload update; `already:true` is the converged render per the integration idempotence cell)*
- [x] Focus rider green *(unit red-first; E2E leg 1; plain degrade + param-only cells)*
- [x] E2E journey green post-gate *(`invitation-bell-answers.spec.ts`, 5 legs, leak 0→0); unit 1297/1297, lint 0, `next build` green. One AC-wording correction recorded in the Implementation notes: the accepted/declined chip carries the member's own nickname (the shipped N-B answerer-row render), not bare "Accepted"*

## Technical notes

Dispatch plumbing already routes by platform-served `dispatch_segment` (`hub/lib/notifications/client.ts:105-111`); `ANSWER_PATHS` + W-04 comment at `:113-127`; `respondToNotification` fires `refreshNavigation` (`:174`, W-07). Renderer: `NotificationActions.tsx` (generic), mounted `NotificationBell.tsx:314` + `app/notifications/page.tsx:291`; answer handlers `NotificationBell.tsx:197-236` / inbox `:200-236`. Groups page: `app/groups/page.tsx` (`MyInvitations` mount `:98`, `loadGroups` `:40`); card handle `data-testid="my-invitations"` (`MyInvitations.tsx:86`). No repo-wide scroll/highlight precedent — the rider introduces the pattern (param + `scrollIntoView` + transient class); `useSearchParams` precedent in `app/journeys/[id]/play/page.tsx:52`. Chip vocabulary lives in `hub/lib/notifications/format.ts`.

## Post-apply sweep watch (named at the tranche, 2026-08-05)

`tests/e2e/notifications.spec.ts:183` clicks the unread row's FIRST button — post-apply the armed invitation row carries Accept/Decline, so "first button" may stop meaning the row body/mark-read affordance. Verify (and adapt labelled if flipped) in the post-gate E2E sweep. Its `:58` URL pin is a regex (`/\/groups/`) and tolerates the focus param.

**Outcome (2026-08-05, post-gate sweep):** the first-button click did NOT flip — the row's body button precedes the actions block in the li, so `.first()` still means the letter. The spec's OTHER pin flipped as predicted: the anchored `/\/groups$/` at `:190` failed against the focused landing and was adapted labelled, observed red first.

## Verification

Unit red → green per criterion; `npm run lint` + `next build` green (the house type gate); E2E journey green post-apply; full sweeps recorded in the cycle close.
