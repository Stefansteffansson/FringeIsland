# FEAT-H030: Notification bell and inbox

---
id: FEAT-H030
title: Notification bell and inbox
owner: hub
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

v2 has no notification surface at all: members cannot see invitations, role changes, stewardship events, journey milestones, or announcements that the platform has been delivering to `public.notifications` since the walking skeleton. v1's bell read the table directly from the browser (the API-first sin) and offered only a 15-item dropdown — no history page. Cycle N-A gives the Hub its passive notification surface (NTF-1/2/3/7) over the FEAT-PD013 contracts, fetch-based (realtime hint arrives N-C).

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
