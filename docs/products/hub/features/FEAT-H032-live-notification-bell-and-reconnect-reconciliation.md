# FEAT-H032: Live notification bell, reconnect reconciliation, and the first-paint cleanup

---
id: FEAT-H032
title: Live notification bell, reconnect reconciliation, and the first-paint cleanup
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The bell built in N-A ([FEAT-H030](FEAT-H030-notification-bell-and-inbox.md)) and made actionable in N-B ([FEAT-H031](FEAT-H031-notification-typed-actions.md)) only learns anything on mount. A member reading a journey step while someone invites them to a group sees nothing until they navigate. Every other live surface in the Hub already pings — messages, the forum, and the unread badge went live in C-C ([FEAT-H027](FEAT-H027-live-messages-forum-and-badge.md)), and session revocation went live in Cycle E. The notification bell, whose entire purpose is telling people things, is the last fetch-only surface.

Two more things are owed here:

1. **Nothing reconciles after a dropped connection.** `hub/lib/realtime/manager.ts` already surfaces `onStatus(status, rejoin)` with `'subscribed' | 'reconnecting' | 'closed'` explicitly so a tenant can reconcile — no notification tenant uses it. Hub `SPECIFICATION.md` §L2 (`:143`) already *promises* that "Realtime channel disconnect → DM and notification UIs surface a reconnecting state"; the notification half of that sentence is unimplemented.
2. **`/groups` does measurable wasted work on every load.** N-B deleted `PendingNominations`, the only consumer of the overview bundle's `nominations` slice. The lookup was never removed. Verified dead: `app/api/me/overview/route.ts` still computes it on every first paint (`:84`, `:125-128`), `lib/me/overview-client.ts:80` still adopts it, and the consumer `fetchMyNominations()` in `lib/groups/client.ts` has **zero callers**. The stored promise carries a deliberate `guarded.catch(() => {})` — *"may go unconsumed; never unhandled"* — which is exactly why it has been failing silently rather than surfacing. Every `/groups` load pays for an answer nothing reads.

## Implementation notes

**Built + merged 2026-07-25** across PR #288 (the first-paint cleanup), #289 (the live bell) and #290 (E2E + a leak fix). Carries **no migration** — it consumes the paired [FEAT-PD015](../../../platform/domain/features/FEAT-PD015-notification-realtime-hint-and-reconnect-reconciliation.md) contracts API-first.

**`hub/lib/realtime/manager.ts` is UNCHANGED — verified by an empty `git diff`.** FEAT-H027's docstring promised the bell would join "by calling `registerTenant`, with no manager edit"; that held exactly.

**Two more things were already built** — the pattern of this whole cycle:
- **`useCommChannel` is topic-generic** despite its comm-flavoured name. It already encoded recovery reconciliation, visibility regain, the visible-tab-only poll, and the no-flash-on-first-connect rule. Reused verbatim.
- **`conversations-tenant.ts`** gave the exact declarative shape to mirror.

**What shipped**

1. **`hub/lib/realtime/notifications-tenant.ts`** — topic keyed on the auth uid, an **open** event set, `onHint` doing exactly two things: invalidate the notifications cache and dispatch `notificationsChanged`. **Never relays payload content**, so a forged or misdelivered hint changes nothing on screen. Registered in `useRealtimeTenants` beside the conversations tenant, under the same arming rule (a Mist or sessionless visitor registers nothing).
2. **Coalescing** (250 ms trailing window) — a burst collapses into one re-read, so the socket saving is not respent on request volume.
3. **`NotificationBell`** reconciles on the live event, on socket recovery, and on visibility regain, and shows a **quiet** "reconnecting" note — never an error. This makes true the promise Hub `SPECIFICATION.md` §L2 `:143` already made for notification UIs as well as DMs.
4. **STORY-4, the first-paint cleanup** — the orphaned `nominations` slice, its adoption, and the unreachable `client.ts` trio removed from every `/groups` load. `/api/me/nominations` and `fetchPendingNominations` deliberately **kept** (FEAT-H017-owned; ADR-U042 guardrail 3); `tests/unit/app/api/group-leadership-routes.test.ts` is untouched and green, and **is** the proof the contract survived. Whole-chain disposition filed as `TASK-H017-01`.

**A defect of mine, found and fixed at E2E.** The coalescing timer was module-level and nothing cancelled it on teardown — a hint arriving moments before sign-out would fire ~250 ms later and send a still-mounted bell to fetch **with a dead session**. `registerNotificationsTenant`'s teardown now cancels it (nothing survives the identity change — the STORY-7 guarantee, a module timer included), guarded by a unit test. Found while investigating an intermittent `profile.spec.ts` sign-out failure that the pre-#289 control passed 3/3; that failure is **intermittent, so causation is not proven** — the leak was real regardless, and has not recurred in 4 clean runs since.

**Labelled adaptations, never silent weakening**
- `conversations-tenant.test.tsx` exact-count assertions moved 1→2 (two tenants now register). **Strengthened**: both topics pinned by name, both teardowns asserted, so a third tenant appearing silently still fails.
- The overview-route test gained an **exact-set** slice↔consumer parity assertion — an orphan in either direction now fails, and the pre-cleanup code would have failed it.

**Two assertion bugs of my own, same class, twice.** I pinned an absolute badge count (`'1'`; it read `3` — the live path worked, my expectation was wrong, since the platform emits organically at account creation). I then made the counts relative but left an absolute *precondition*, which passed alone and failed in the full suite. Every E2E assertion is now a `>=` delta.

**Tests.** Unit: `notifications-tenant.test.ts` (9 cases, **labelled test-after**) covering coalescing, no-payload-relay, and teardown. E2E: `notifications-live.spec.ts` (5) — live arrival driven by a **real** Steward invitation with the URL asserted unchanged; offline catch-up and hidden-tab catch-up (**the ported oracle's SILENT row, never covered anywhere before**); and live-subscription survival across a client-side route change, which nothing else covers.

**Green:** 967/967 unit (129 suites) · 86/86 E2E · `next build` clean · conformance 6/6.

**Owed at close, not silently skipped:** the ADR-U043 before/after measurement of the `/groups` first paint. A deep-cold sample needs ≥20 minutes of enforced idle on a deployed environment, so it could not be taken in-session. The change removes one concurrent substrate read from a B2/B3 path; the number still has to be shown rather than asserted. Tracked on `TASK-NC-05` and in the area-gate checklist.

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
- **FEAT-H017:** owns `/api/me/nominations`, deliberately left intact; a follow-up is filed against it. *(Closed 2026-09-03: TASK-H017-01 retired the whole chain — route, relay, and FEAT-PC016's contract.)*

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
