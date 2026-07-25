# FEAT-H032: Live notification bell, reconnect reconciliation, and the first-paint cleanup

---
id: FEAT-H032
title: Live notification bell, reconnect reconciliation, and the first-paint cleanup
owner: hub
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The bell built in N-A ([FEAT-H030](FEAT-H030-notification-bell-and-inbox.md)) and made actionable in N-B ([FEAT-H031](FEAT-H031-notification-typed-actions.md)) only learns anything on mount. A member reading a journey step while someone invites them to a group sees nothing until they navigate. Every other live surface in the Hub already pings — messages, the forum, and the unread badge went live in C-C ([FEAT-H027](FEAT-H027-live-messages-forum-and-badge.md)), and session revocation went live in Cycle E. The notification bell, whose entire purpose is telling people things, is the last fetch-only surface.

Two more things are owed here:

1. **Nothing reconciles after a dropped connection.** `hub/lib/realtime/manager.ts` already surfaces `onStatus(status, rejoin)` with `'subscribed' | 'reconnecting' | 'closed'` explicitly so a tenant can reconcile — no notification tenant uses it. Hub `SPECIFICATION.md` §L2 (`:143`) already *promises* that "Realtime channel disconnect → DM and notification UIs surface a reconnecting state"; the notification half of that sentence is unimplemented.
2. **`/groups` does measurable wasted work on every load.** N-B deleted `PendingNominations`, the only consumer of the overview bundle's `nominations` slice. The lookup was never removed. Verified dead: `app/api/me/overview/route.ts` still computes it on every first paint (`:84`, `:125-128`), `lib/me/overview-client.ts:80` still adopts it, and the consumer `fetchMyNominations()` in `lib/groups/client.ts` has **zero callers**. The stored promise carries a deliberate `guarded.catch(() => {})` — *"may go unconsumed; never unhandled"* — which is exactly why it has been failing silently rather than surfacing. Every `/groups` load pays for an answer nothing reads.

## Solution sketch

**The Hub-side abstraction already exists and was built for this.** `hub/lib/realtime/manager.ts` (FEAT-H027, TASK-CC-03) states its own extension contract in its docstring:

> *"Registration is the extension surface: the notification bell joins at A-NTF by calling `registerTenant`, with no manager edit (STORY-1)."*

So this feature writes **no** channel plumbing: no second socket, no `.channel()` call of its own, no manager edit. It registers one tenant and wires two callbacks.

**1. The bell becomes a tenant.** One registration on `account:<auth_uid>:notifications`, following `use-comm-channel.ts` as the hook precedent. `onHint` does the one legal thing under ADR-U039:24 — it **invalidates and re-fetches through the existing contract path** (`/api/notifications/unread-count`, and the recent window when the panel is open). It never reads the payload to paint anything. The hint says "something changed"; the authorized read says *what*.

The bell lives in `AppShell`, so registration is global and there is exactly one subscription per session regardless of how many notification surfaces are mounted — the manager already guarantees one channel per topic shared across tenants. `/notifications` (the inbox page) does **not** register its own tenant; it reconciles through the same shared context.

**2. Reconnect reconciliation.** `onStatus` is the seam. On `'reconnecting'` the bell shows the promised degraded state; on returning to `'subscribed'` it reconciles by re-reading unread count and the recent window, because hints emitted during the gap are gone. Plus the belt-and-braces path ADR-U039:26 requires ("polling is fallback, not transport"): re-read on tab visibility and focus, so a laptop reopened after hours is correct without waiting on socket state.

No new server contract is needed — `get_own_unread_notification_count()` and `get_own_notifications(...)` already exist and are already the bell's read path. Reconciliation is re-reading them at the right moments.

**3. Verify-on-signal at the surface.** A hint carrying an id the member has no right to must change nothing on screen. The bell's re-fetch is the verification: the id is never trusted, the contract is.

**4. The first-paint cleanup.** Remove the dead nominations chain:
- the `nominations` slice from `app/api/me/overview/route.ts` (import, the concurrent read, the destructure, the failure tally, the response object)
- the adoption in `lib/me/overview-client.ts:30,80`
- the now-unreachable trio in `lib/groups/client.ts`: `adoptMyNominationsRead`, `fetchMyNominations`, `requestMyNominations`, and the `adoptedNominations` module state including its reset at `:134`
- their tests

**`/api/me/nominations` stays.** It is owned by [FEAT-H017](FEAT-H017-leadership-transfer-and-closure.md) (MEM-7 STORY-2), not by A-NTF, and ADR-U042 guardrail 3 states the standalone routes remain canonical even when the Hub stops calling them. Retiring another feature's contract from this cycle would edit that feature's spec from outside its ownership. Recorded as a follow-up against FEAT-H017 instead. *(This was put to Stefan as an open question and left unanswered; the conservative in-ownership reading is taken and flagged.)*

Two live comments point at this seam and must be reconciled rather than left dangling: `app/groups/page.tsx:88` and `components/notifications/NotificationItem.tsx:42`.

## Appetite

One cycle half, surface side. The registration and the two callbacks are small — the manager did the hard part. The real cost is the test surface: a live-arrival E2E, a reconnect reconciliation test (the oracle's SILENT row), and the removal's regression proof. The cleanup is subtraction and should stay subtraction; if removing the slice turns into reshaping the bundle, stop and keep the removal surgical.

## Rabbit holes

- **Do not edit `manager.ts`.** If the bell seems to need a manager change, the tenant shape is being misused — registration was designed as the extension surface. A manager edit here contradicts FEAT-H027's STORY-1.
- **Do not open a second socket or call `.channel()` directly.** One socket per client (ADR-U039:21). The outer-ring conformance test (`tests/helpers/outer-ring.ts`) permits `.channel(...)` but not `.from(...)` / `.rpc(...)` — staying inside the manager keeps that guarantee automatic.
- **Do not render from the hint payload.** The tempting shortcut — the payload has an id, so optimistically bump the badge — reintroduces exactly the trust that ADR-U039:24 forbids and makes a spoofed hint visible. Re-fetch; it is one cheap read.
- **Do not re-fetch per hint in a burst.** A member added to several groups at once receives several hints in quick succession. Coalesce them into one read rather than firing one request per hint, or the socket saving is spent on request volume.
- **Do not let the reconnecting state become alarming.** It is a quiet degradation, not an error — the bell still works by fetch. Hub `SPECIFICATION.md` §L2 `:143` frames it as "the rest of the Hub continues to function over polling."
- **Do not widen the nominations cleanup into a bundle refactor.** Remove the slice; leave the bundle's shape, guardrails, and per-slice envelope machinery alone.
- **Do not delete `/api/me/nominations`** — see Solution sketch 4.

## No-gos

- No notification preferences UI and no per-category controls (N-D, NTF-10).
- No email, push, or desktop/OS notifications (NB-2 / ADR-U040) — in-app only.
- No change to the announcement rendering: announcement rows already render correctly through the kind-agnostic `NotificationItem` (verified live), so this feature adds no announcement-specific UI.
- No sound, no toast, no interrupting overlay. The bell badges; the interruption grade for every Ferd category is `badge` (verified live) and this feature does not exceed it.
- No realtime for Mists — no durable rows exist for them (NB-8), so no tenant is registered without a FIM session (the manager's arming rule already enforces this).
- No new API route. Everything reads through contracts that already exist.
- No change to `/api/me/nominations`, `fetchPendingNominations`, or FEAT-H017's spec.

## Stories

### STORY-1: The bell goes live without a page change

As a member, I want the bell to update while I am reading something else, so that I learn about an invitation or a leadership offer without navigating.

**Acceptance criteria:**
- Given a signed-in FIM sitting on any page with the shell mounted, when a notification is written for them, then the unread badge updates without navigation or remount.
- Given that update, when the network activity is inspected, then the new state came from the contract read (`/api/notifications/unread-count` and, when open, the recent window) — never from the broadcast payload.
- Given the bell panel is open when a hint arrives, when the hint is handled, then the visible list reflects the new row.
- Given several hints arrive in rapid succession, when they are handled, then they coalesce into a single re-read rather than one request per hint.
- Given the tenant registration, when `manager.ts` is diffed for this feature, then it is unchanged — registration alone was sufficient.
- Given a Mist session or no session, when the shell mounts, then no notification tenant is armed and no channel is joined.
- Given both the bell and the `/notifications` inbox are mounted, when the socket is inspected, then exactly one subscription exists on the notifications topic.

### STORY-2: A dropped connection reconciles instead of silently going stale

As a member, I want the bell to catch up after my connection drops, so that a lapse in the socket never means a lapse in what I know.

**Acceptance criteria:**
- Given a live subscription, when the channel reports `'reconnecting'`, then the bell surfaces the degraded state promised by Hub `SPECIFICATION.md` §L2 `:143` and continues to function by fetch.
- Given the channel returns to `'subscribed'` after a gap, when reconciliation runs, then unread count and the recent window are re-read — hints emitted during the gap are assumed lost.
- Given notifications arrived while the tab was hidden, when the tab becomes visible again, then the bell re-reads and shows the correct count without waiting on channel state.
- Given the window regains focus after a long idle, when the bell re-reads, then the count is correct even if the socket never reported a status change.
- Given the channel reports `'closed'` permanently, when the member keeps using the Hub, then notifications still arrive on navigation — the surface degrades to N-A behaviour and never to a broken state.
- Given reconnection reconciliation runs, when it is inspected for cost, then it is a bounded re-read (count plus one recent window), not a full history re-fetch.

### STORY-3: A hint I have no right to changes nothing on my screen

As a member, I want a forged or misdelivered signal to be harmless, so that the live path cannot be used to plant something in my bell.

**Acceptance criteria:**
- Given a hint whose payload id belongs to another member, when the bell handles it, then the re-fetch returns nothing for that id and the visible state is unchanged.
- Given a hint arriving with an unrecognised event name, when it is handled, then the bell ignores it without throwing and without clearing existing state.
- Given a hint arriving with a malformed or empty payload, when it is handled, then the bell performs its normal re-read and does not crash the shell.
- Given the member has signed out, when a hint would arrive, then the tenant is torn down and no read is attempted with a stale identity.

### STORY-4: `/groups` stops paying for an answer nobody reads

As a member, I want the groups page not to do work that is thrown away, so that it paints as fast as the data it actually shows.

**Acceptance criteria:**
- Given the overview bundle, when `/groups` is loaded, then no nominations lookup is performed — the slice is absent from the request path and from the response.
- Given the bundle response, when its shape is compared against its remaining consumers, then every slice served has a consumer and every consumer has a slice (no orphan in either direction).
- Given the removal, when `lib/groups/client.ts` is inspected, then `adoptMyNominationsRead`, `fetchMyNominations`, `requestMyNominations`, and the `adoptedNominations` state (including the reset at `:134`) are gone.
- Given the removal, when the standalone `/api/me/nominations` route is called directly, then it still responds correctly — the contract is untouched.
- Given a member with pending leadership offers, when they open the bell, then those offers are present and actionable — the bell is genuinely their home now, so removing the old path loses nothing.
- Given the two stale comments (`app/groups/page.tsx:88`, `components/notifications/NotificationItem.tsx:42`), when the diff lands, then each is either resolved or updated to describe what is now true.
- Given the `/groups` first paint before and after, when measured under the ADR-U043 method, then the removal shows as a reduction and not a regression in any other slice.

## Platform dependencies

- **[FEAT-PD015](../../../platform/domain/features/FEAT-PD015-notification-realtime-hint-and-reconnect-reconciliation.md)** (paired, platform-first): the emit trigger, the `account:<auth_uid>:notifications` receive policy, the nudge policy, and the publication DROP. This feature is inert without it.
- **DS-5 Communication:** the N-A/N-B contracts already consumed by the bell — `get_own_notifications`, `get_own_unread_notification_count`, `mark_notification_read`, `mark_all_notifications_read` (all verified deployed). No signature changes.
- **PC-1 Infrastructure:** Supabase Realtime channel infrastructure (load-bearing per §L2 §4).
- **FEAT-H027:** `hub/lib/realtime/manager.ts` and the `use-comm-channel.ts` hook pattern — consumed as-is, not modified.
- **FEAT-H017:** owns `/api/me/nominations`, deliberately left intact; a follow-up is filed against it.

## Cross-product impact

None to sibling surfaces today. The Gimbal will want the same bell behaviour and inherits the topic and the doctrine unchanged — the tenant pattern is portable, and because the emit is surface-agnostic no platform change is needed when it ships.

**Three documents must be amended in the same batch as the build** — ADR-U039:33 makes adding a realized channel a spec-level act, not a refactor:

1. **`docs/products/hub/SPECIFICATION.md` §L2 §4** (`:38`, `:99`) — flip `account:<auth_uid>:notifications` from forward-looking to realized.
2. **`docs/products/hub/SPECIFICATION.md` §L2** (`:143`) — its reconnecting-state promise becomes true for notification UIs as well as DMs.
3. **`docs/products/hub/CLAUDE.md`** — its narrow-exception rule carries the same named channel list and currently reads *"the notification-bell channel `account:<auth_uid>:notifications` (forward-looking; A-NTF joins the same conventions)"*, with the rule stating explicitly that adding a channel "updates §4's named list (**and this line**) in the same batch." **This is a steering file, so that edit is a fuller-auto carve-out and pauses for the nod** — plan for it rather than discovering it at the close.

## Vertical impact

- **Privacy/GDPR:** No new personal data collected, stored, or transmitted. The socket carries an opaque id and nothing else; all content arrives over the already-authorized read path. Removing the nominations slice *reduces* personal data movement — the page stops transporting leadership-offer data it never displays. Telemetry stays content-free: topic **kind**, never the uid-bearing topic string, never a row id (the FEAT-H012 discipline the manager already enforces).
- **Notifications:** This is the in-app notification surface going live — the V3 surfaces law applies, so copy is server-authored and never re-worded here, and appearance comes through the design-system layer. Interruption stays at `badge` for every category (verified live): no sound, no toast, no overlay. Announcement rows need no new handling — they already render through the kind-agnostic item. Preferences are N-D's.
- **Administration:** No new DeusEx capability. The operator-facing control (whether platform-wide announcements nudge) lives on the platform side in FEAT-PD015 and has no Hub surface this cycle; its UI arrives with N-D's preferences work.
- **Observability:** The live path needs enough signal to tell "working" from "silently degraded", because a broken socket looks identical to a quiet one. Record channel status transitions and reconciliation runs as content-free events (kind and outcome only, per the H012 discipline), and surface hint-handling failures rather than swallowing them. The removed nominations slice takes its `overview.slice_failed` telemetry with it; the standalone route's telemetry is untouched.
- **Transactions:** None. No payments, subscriptions, or financial data.
- **Extensibility:** No new type, enum, or permission scope. The tenant's `events` is an open set (`string[]`, documented as such in the manager) so a new event name needs no code change here; the bell's renderer is already kind-agnostic with a safe unknown-category fallback (`CATEGORY_ICON[row.category] ?? Bell`), so a notification kind invented in a later wave goes live through this path with no edit. Registration-based subscription means the next surface that wants notifications adds a tenant rather than modifying this one.

## Performance budget

The bell renders in `AppShell`, so it is on **every** page — its cost is charged to every budget row, which makes restraint here structural rather than local.

- **First-paint class:** B2 (cold nav) and B3 (warm nav) apply on every route; B1 (sign-in flow) applies because the shell mounts on the landing. **The socket join must not participate in first paint** — the bell paints from its existing mount-time read (the N-A justified standalone read per ADR-U042, context-cached across client-side nav) and the channel is joined after paint. Arming the socket must add nothing to the critical path. Data-boot path is unchanged from FEAT-H030: justified standalone read, not a bundle slice.
- **STORY-4 is a first-paint improvement, and the only measured change in this feature.** `/groups` currently performs a discarded nominations read concurrently in the bundle; removing it removes one substrate read from a B2/B3 path. The before/after must be measured under the ADR-U043 method (cold >= 20-min idle x3 plus warm, tail rule) and recorded — a cleanup justified on loading-time grounds has to show the number, not assert it.
- **Interaction class:** B5 (200 ms to next paint) applies to the badge updating after a hint. Because the update requires a round-trip by design (verify-on-signal), the badge must not appear frozen: the coalesced re-read is a single cheap indexed call, and no interaction the member initiated is blocked on it. Nothing here is user-initiated, so no 100 ms feedback obligation attaches — the member is not waiting on this.
- **Loading states:** B6 — the hint-driven re-read is sub-second and shows nothing (no spinner, no skeleton flash on an already-painted badge; a badge that flickers on every arrival is a defect, not a loading state). The reconnecting state is a quiet, non-blocking indicator, not a skeleton. Anything over 3 s on the reconciliation read is treated as a defect.
- **Message volume** is the platform half's budget — see FEAT-PD015. The Hub's contribution is not amplifying it: one subscription per session, coalesced reads, no per-hint request.
