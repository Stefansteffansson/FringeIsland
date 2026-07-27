# FEAT-H030: Notification bell and inbox

---
id: FEAT-H030
title: Notification bell and inbox
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

v2 has no notification surface at all: members cannot see invitations, role changes, stewardship events, journey milestones, or announcements that the platform has been delivering to `public.notifications` since the walking skeleton. v1's bell read the table directly from the browser (the API-first sin) and offered only a 15-item dropdown — no history page. Cycle N-A gives the Hub its passive notification surface (NTF-1/2/3/7) over the FEAT-PD013 contracts, fetch-based (realtime hint arrives N-C).

## Implementation notes

*(6-done, 2026-07-23 — built Cycle N-A, red-first. The solution sketch below stands as built.)*

- **Where it lives:** `hub/lib/notifications/` (`queries.ts` server couriers, `client.ts` API-first browser client + unread-count session cache, `http.ts` SQLSTATE→HTTP mapper, `format.ts` pure status-chip/badge helpers); four BFF routes under `hub/app/api/notifications/` (`route.ts` GET list, `unread-count/route.ts` GET, `[id]/read/route.ts` POST, `read-all/route.ts` POST); `hub/components/notifications/` (`NotificationBell.tsx` badge+dropdown, `NotificationItem.tsx` shared kind-agnostic renderer); `hub/app/notifications/page.tsx` inbox. **The bell relocated** from `components/ui/NotificationBell.tsx` (the walking-skeleton stub, deleted) to `components/notifications/` — a feature component, the MessagesLink precedent; `AppShell` imports from the new home.
- **ADR-U037 split honoured:** the two GET routes read identity via `getVerifiedUserId` (local claims); the two POST mutations via `getUser()` (server-verified). Route-policy conformance green.
- **Red → green:** 24 unit tests (format 5, bell 10, inbox 9) demonstrated red module-absent, then green; 1 pure-helper + component/page tiers keep the pyramid upright. The E2E journey (`hub/tests/e2e/notifications.spec.ts`) drives a real `invitation_received` notification (Steward invites → invitee's bell badge → dropdown → mark-all → inbox history → **read-state survives a full reload**, proving server state) — green across three runs.
- **Two unit-test stabilisations (labelled):** the inbox-page test needed a *stable* `useAuth`/`useRouter` mock reference (a fresh object each render re-fired the load effect) and an `AppShell` passthrough mock — both the messages-inbox-page precedent, not a production change.
- **Fleet due, found-not-caused:** the full sweep surfaced two pre-existing red E2E specs (`forum.spec.ts`, `realtime.spec.ts`) asserting the *old* tombstone copy `/removed by a group moderator/i`; the copy was deliberately neutralised to "This post was removed" by A-COM commit `00c0010` (walk wording fix, 2026-07-22) without updating these assertions. Realigned to `/this post was removed/i` in this cycle (a labelled sibling-suite adaptation, not a weakening). The onboarding ES256 flake (TASK-INT-01) and a profile `toHaveURL` fleet-load flake both pass in isolation — fenced, not caused.
- **Deferred as designed:** Accept/Decline action UI (N-B), realtime hint + reconnect (N-C), preferences (N-D), external channels/email (NB-2, ADR-U040).

### Amendment — W-01 / W-02: the inbox was a display case, not a surface (2026-07-27)

**Found in the A-NTF live walk; the two defects that HELD the area gate.** One omission with two faces: **the inbox page was built over the shared row component and never wired to the bell's interaction contract.** Both contradicted acceptance criteria written in this very spec.

- **W-01 (STORY-3, the "dropdown or inbox" criterion).** Inbox rows were inert — no navigation, no mark-read, no feedback — while still carrying the unread dot and bold title that read as interactive. Stefan: *"It's like there is nothing to click on."* The bell wrapped `NotificationItem` in a `<button onClick={activate}>`; the page rendered it bare. It also meant there was **no way to mark a single notification read from the inbox at all** — mark-all was the page's only read control.
- **W-02 (STORY-4, "...and the badge clears").** Page-side mark-all wrote correctly server-side (DB went 7 → 0 unread) and re-rendered every row, but the bell badge sat at 7 until a reload. The same action **from the dropdown worked perfectly** — isolating it to the page. The cross-component contract already existed (`NOTIFICATIONS_CHANGED_EVENT`, the `refreshNavigation` house pattern); the page simply never spoke it, dispatched from exactly one place in the codebase — the realtime hint path.

**Fix.** The page now wraps each row in the same button the bell uses (`activate`: optimistic unread-drop → `markNotificationRead` → announce → navigate when the row names a group), and **every mutation announces** — `markAll`, `activate`, and `respond` alike. Announcing on the *failure* path too is deliberate: a failed write is exactly when the bell must re-read rather than trust an optimistic flip. A third stale-badge path was closed in passing: **answering** an actionable row marks it read, so the badge moved there too and never said so.

**Red-first.** 7 new unit cases demonstrated red → green (inbox-page suite 10 → 17; Hub unit 987 → **994/994**). The **N-A E2E journey was extended, not duplicated**, per the finding — it now re-arms the real trigger-emitted invitation to unread (flipping the existing row, never inserting a synthetic one), clicks it, and asserts navigation + badge + server-persisted read state, then asserts the badge clears on a **page-side** mark-all with no reload between press and assert. **Demonstrated red by reverting the page:** the locator waiting for a button in the row never resolved — there was no button to find. All notification E2E **10/10**; `next build` clean; eslint 0.

**Why they escaped.** This spec's own E2E journey reached the inbox *only to assert history rendering*: it pressed mark-all in the **bell dropdown**, never clicked an inbox row, and never checked the badge after a page-side mark-all. The journey walked around both gaps. Two of the new unit cases initially failed on my own harness errors (a role-name selector where the buttons carry testids, and the `ConfirmModal` gate on Accept) — the code was right and the tests were wrong, corrected in place.

## Solution sketch

- **BFF routes** (ADR-U038 private plumbing; the outer-ring gate forbids browser-side `.rpc()`): `GET /api/notifications` (list, keyset params), `GET /api/notifications/unread-count`, `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all` — each a thin authenticated pass-through to the PD013 contracts.
- **Bell + badge** in the navigation (design-system primitive per V3 surfaces law — extend the v2 design-system layer, don't restyle ad hoc): unread count fetched once on mount into a client context, badge renders count capped at `9+`, decremented optimistically on mark-read.
- **Dropdown**: most recent ~15, unread-first visual distinction, click marks read and navigates to the group context where `group_id` is present; "mark all read"; link to the full inbox.
- **Inbox page `/notifications`**: full keyset-paginated history, read/unread distinction, mark-all-read, generic kind-agnostic rendering (title, body, relative timestamp, category for iconography).
- **Actionable rows render passively** in N-A: a status chip derived from `action_type/action_taken/expires_at` ("Awaiting response" / "Handled" / "Expired") — the Accept/Decline buttons are N-B (FEAT-H031-era; no dispatch UI here).

**Payload walk (against FEAT-PD013, done at decomposition):** badge count ← `get_own_unread_notification_count()` integer. List item renders `title`, `body`, `created_at`, `is_read` (visual), `category` (icon), `group_id` (navigation target), `kind` (icon/fallback only — copy is server-authored per V3, the surface never re-words); status chip consumes `action_type`, `action_taken`, `expires_at`; `read_at` shown on the inbox row detail. Every PD013 payload key has a named consumer here except none — and every rendered field traces to a PD013 key (`action_data`/`action_taken_at` are excluded from the N-A payload precisely because no story here consumes them; N-B extends the contract).

## Appetite

One cycle (N-A), surface half — roughly one focused session for BFF + components + inbox with unit/E2E. Fixed time; the dropdown niceties (unread-first grouping) are trim-able scope, the inbox page and accurate badge are not.

## Rabbit holes

- **No socket work** — fetch on mount + optimistic updates only; N-C brings the U039 ping-then-fetch hint. Don't hand-roll polling loops.
- **Kind-specific renderers** — resist. Rendering is generic (server-authored title/body); category drives at most an icon. A per-kind component zoo is Eid+ territory if ever.
- **Unknown kinds must render safely** (open registry means new kinds appear without surface releases) — generic fallback, never a crash or a blank row.
- **Navigation-target resolution** — `group_id` may be NULL (SET NULL on group delete) or reference a group the member has since left; the click-through must degrade gracefully (stay on inbox, no dead link).

## No-gos

- No Accept/Decline or any action submission (N-B), no preferences UI (N-D), no realtime (N-C), no toasts/banners (interruption grades beyond `badge` activate when a category declares them — all Ferd categories are `badge`).
- No notification deletion UI (no contract exists; PD013 No-go).
- No Mist notification surface — FIM-only navigation chrome (NB-8 verify-and-record rides the area gate).

## Stories

### STORY-1: Bell and unread badge
As a FIM, I want a bell with an accurate unread count in the navigation, so that I notice platform events without hunting.

**Acceptance criteria:**
- Given I have 3 unread notifications, when any Hub page mounts, then the bell shows `3`, sourced from `/api/notifications/unread-count` (one call per mount, context-cached across client-side navigation).
- Given more than 9 unread, when the badge renders, then it shows `9+`.
- Given zero unread, when the bell renders, then no badge is shown.
- Given I mark one read anywhere, when the badge updates, then it decrements without a full refetch (optimistic, reconciled on next mount).

### STORY-2: Bell dropdown
As a FIM, I want a quick glance at recent notifications, so that I can triage without leaving my page.

**Acceptance criteria:**
- Given notifications exist, when I open the bell, then the most recent 15 render newest-first with unread visually distinct, each showing title, body, relative timestamp.
- Given I click an unread notification, when it has a `group_id`, then it is marked read (optimistic) and I navigate to that group; when `group_id` is NULL or inaccessible, then it is marked read and I stay with no dead navigation.
- Given unread rows, when I click "Mark all read", then `/api/notifications/read-all` is called, all rows render read, and the badge clears.
- Given the dropdown, when I click "View all", then I land on `/notifications`.

### STORY-3: Inbox / history page
As a FIM, I want a full notification history, so that older events are never lost to a 15-item dropdown.

**Acceptance criteria:**
- Given many notifications, when I open `/notifications`, then the first page renders newest-first and "load more" fetches the next keyset page with no gaps or duplicates (cursor from the last row).
- Given read and unread rows, when the list renders, then read state is visually distinct and `read_at` is available on the row.
- Given an actionable row (`action_type` set), when it renders, then a status chip shows "Awaiting response" (pending, not expired), "Handled" (`action_taken` set), or "Expired" (`expires_at` past) — with no action buttons.
- Given a row whose `kind` is not recognised by the surface, when it renders, then the generic renderer shows title/body/timestamp normally (open-registry proof).

### STORY-4: Read-state UX
As a FIM, I want what I've seen to stop counting as unread, so that the badge stays meaningful.

**Acceptance criteria:**
- Given an unread row, when I click it (dropdown or inbox), then it is marked read via `/api/notifications/[id]/read` and stays read on reload (server state, not local).
- Given a failed mark-read call, when the optimistic update was applied, then it rolls back and the row renders unread again (no silent divergence).

## Platform dependencies

FEAT-PD013 (all four contracts + registry — paired, same cycle). PC-2 session/auth for the BFF. No PC-1 realtime this cycle (N-C).

## Cross-product impact

None now. The bell/badge/inbox render as design-system-layer primitives so Gimbal/Studios inherit the grammar when they surface notifications (V3 surfaces law: appearance canonical, copy shared).

## Vertical impact

- **Privacy/GDPR:** Renders only the caller's rows (contract-scoped); no client-side storage of notification content beyond the session context; no new collection.
- **Notifications:** This *is* the in-app channel surface (bell, badge, inbox — V3 §6 surfaces rows 1–3): appearance via the design-system layer, copy server-authored and never re-worded by the surface, interruption grade honoured from the category registry (all `badge` in Ferd).
- **Administration:** None (admin sends surface here like any notification; Console is A-ADM).
- **Observability:** BFF routes log errors through the standard v2 route error path; mark-read rollback (STORY-4) surfaces as a visible UI state, never silent.
- **Transactions:** None.
- **Extensibility:** Kind-agnostic rendering with a safe generic fallback (STORY-3 AC-4); category → icon mapping is data-tolerant (unknown category = default icon). No kind or category list is hardcoded as exhaustive.

## Performance budget

- **First-paint class:** bell + badge ride every page — the unread count is a justified standalone read (ADR-U042) fetched once per mount and context-cached across client-side navigation; it must not add a blocking request to any page's critical path (badge may hydrate late). `/notifications` is B2 (cold nav) / B3 (warm nav) with the standard budgets.
- **Interaction class:** mark-read and mark-all-read are optimistic — visual feedback immediate (<100 ms), B5-safe; dropdown open renders from the already-fetched context or shows skeleton rows.
- **Loading states:** inbox first page — skeleton rows if 1–3 s; dropdown — skeleton rows; badge — absent until hydrated (never a spinner in navigation chrome).
