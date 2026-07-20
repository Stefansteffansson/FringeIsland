# FEAT-H027: Live messages, forum & badge — the Hub hears hints, fetches truth, and survives losing the socket

---
id: FEAT-H027
title: Live updates for the inbox, the open conversation, the unread badge, and the group forum — the Hub's shared ADR-U039 tenant substrate (ping-then-fetch, verify-on-signal) plus reconnect reconciliation
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

COM-10 and COM-11 (`hub/SPECIFICATION.md` §L3): everything the Messages and Forum surfaces show goes stale the moment another member acts — a new DM doesn't reach the open inbox, the badge, or the open conversation until navigation; a forum post doesn't reach an open group page. C-A and C-B shipped this deliberately (CB-8; both comm caches say "No sockets, no polling — C-C brings the ADR-U039 live layer"). The platform half now exists as [FEAT-PD010](../../../platform/domain/features/FEAT-PD010-realtime-hint-emission.md): content-free hints on `account:<auth_uid>:conversations` and `group:<group_id>:forum`, receipt policy-gated.

The Hub needs the client half, and it must be **one fresh build serving both surfaces** — a shared tenant substrate generalizing what `session-guard.ts` proved as the doctrine's first tenant, shaped so the notification bell joins it at A-NTF as the third tenant without a fork. And because a socket is a thing that dies, COM-11 rides here: losing the channel costs latency, never data — surfaces say so quietly, reconcile on reconnect, and fall back to a slow poll while degraded.

## Solution sketch

Four pieces — the shared substrate, the app-wide conversations tenant, the page-scoped forum tenant, and the reconciliation posture:

- **`hub/lib/realtime/` — the channel manager (the Hub's first realtime abstraction).** One module owning the doctrine mechanics every tenant repeats today by hand in `session-guard.ts`: join a **private** topic on the one shared socket (the `AuthContext` browser client — never a second client), `realtime.setAuth(access_token)` before join, broadcast-event handlers registered declaratively (topic + events + callback), teardown on sign-out/unmount, and **channel status surfaced** (subscribed / reconnecting) with a rejoin callback so tenants can reconcile. `session-guard.ts` is *not* migrated onto it (No-gos) — it already conforms; the manager generalizes its pattern for the tenants that come after.
- **The conversations tenant — armed app-wide for FIMs** (the session-guard arming rule: FIM identity + live session; a Mist or sessionless visitor arms nothing). Subscribes once to `account:<auth_uid>:conversations`. On a hint: invalidate the messages session cache (`invalidateMessagesCache`) and dispatch a `conversationsChanged` window event carrying the hinted `conversation_id` (the `refreshNavigation`/`sessionsChanged` house pattern — components listen, the tenant never reaches into them). Consumers:
  - **`MessagesLink` (the badge):** listens, re-fetches the inbox through the existing courier, recomputes `has_unread` count — the badge moves without navigation.
  - **The `/messages` inbox:** listens, re-reads in the background — existing content stays on screen while the re-read runs (no skeleton flash; skeletons are for first loads).
  - **The open `/messages/[id]` detail:** if the hint names *this* conversation, re-read through the page's existing load path — which means read-marking behaviour is exactly what it is today (the separate `mark_conversation_read` call the page already makes), not a new code path. Hints naming other conversations touch only inbox/badge state.
- **The forum tenant — page-scoped.** Mounted with `GroupForumSection` for group G, subscribed to `group:<G>:forum`, torn down on unmount (navigating between groups swaps subscriptions). On a hint: drop G's forum cache (`dropGroup`) and re-read the section's loaded window — new threads appear, moderation tombstones materialize — while **composer and reply drafts are preserved** (a refresh never eats a member's half-written post).
- **Reconciliation (COM-11) + the degradation mode** (`SPECIFICATION.md` §L2 §7): the manager reports channel state; while a comm channel is not subscribed, the Messages surfaces and the forum section show a **quiet reconnecting indicator** and the affected surfaces fall back to a **slow visible-tab poll** (the session-guard 60s constant, one place). On re-subscribe and on tab visibility regain: invalidate + re-fetch whatever is mounted, badge included. Durable-first makes this sufficient — there is no missed-event replay because the tables are the truth and the contracts are the door.

**Verify-on-signal, held everywhere:** a hint never renders anything. Every pixel that changes comes from an authorized fetch (`get_my_conversations`, `get_conversation_detail`, `get_group_forum` via the existing BFF couriers). A spoofed or misdelivered hint can cause at most a re-fetch whose result is the only authority — and the platform refuses the fetch where authorization lapsed.

## Appetite

Medium — the C-A/C-B cycle shape. The manager and the two tenants are the genuinely new surface; the four consumer integrations ride existing couriers, caches, and events; reconciliation is state + re-fetch, not new data paths. No migration of its own (substrate lands platform-side in FEAT-PD010).

## Rabbit holes

- **Refetch, don't patch.** No per-post/per-message merge engine, no splicing hinted ids into cached lists — invalidate and re-read through the contract. The id in the payload targets *which* fetch, never *what renders*.
- **Don't promise "instant."** Copy and tests speak in "moments / shortly"; a missed hint is caught by focus/poll/navigation (the H012 honesty rule).
- **Don't poll aggressively.** The poll exists only while degraded (or as the visibility catch-up), visible-tab only, 60s — the hint carries immediacy; the poll carries the guarantee.
- **Don't rebuild session-guard.** It stays as-is; convergence onto the manager is optional later work, not C-C scope.
- **Don't invent a second cross-component mechanism.** Window events (`conversationsChanged`, the existing house pattern) — check `refreshNavigation` coverage before adding any new event name.
- **Don't let the reconnect indicator shout.** A quiet inline affordance on the comm surfaces; the rest of the Hub is untouched by a dead comm channel.

## No-gos

- No Mist surface and no Mist subscriptions (CB-1 — a Mist has no comm surface to update).
- No notification-bell tenant (A-NTF's; the manager is *ready* for it, which is the deliverable — not the tenant itself).
- No typing indicators, presence, read receipts, or "N members online" (all would need content-bearing or high-frequency signals; none are COM-10).
- No `postgres_changes`, no public channels, no client-sent broadcasts, no second WebSocket (ADR-U039 binds the mechanism).
- No new read contracts and no payload changes — the walk confirmed every re-fetch is already served.
- No Gimbal build (it inherits channels, payloads, and the verify-on-signal posture by contract).

## Stories

### STORY-1: One substrate, many tenants (the CB-8 deliverable)
As the platform's canvas surface, I want realtime tenancy to be a declared thing, so the bell joins at A-NTF by registering, not by forking.

**Acceptance criteria:**
- Given an authenticated FIM, when the Hub boots, then exactly one subscription per armed tenant topic exists on the one shared socket — each created `private: true`, after `setAuth`, and torn down on sign-out (never duplicated across pages or remounts).
- Given a new tenant registering a topic + events + handler, when it is added, then no manager code changes — registration is the extension surface.
- Given a Mist or a sessionless visitor, when the Hub boots, then no comm subscription is created.

### STORY-2: The inbox and the badge move by themselves (COM-10: DM + badge)
As a FIM with the Hub open, I want new message activity to reach my inbox and unread badge without me navigating, so the Hub tells the truth while I look at it.

**Acceptance criteria:**
- Given my inbox open on one device, when another member sends me a message, then within moments the inbox re-reads and shows the conversation risen with its unread mark — existing content stays rendered during the re-read (no skeleton flash).
- Given any Hub page open, when the hint arrives, then the Messages badge updates to the fresh `has_unread` count without navigation.
- Given the hint's conversation is one I'm not viewing, then nothing else changes — no focus steal, no scroll jump, no toast.

### STORY-3: The open conversation stays current (COM-10: detail)
As a FIM reading a conversation, I want new messages in it to appear, so the exchange feels live.

**Acceptance criteria:**
- Given `/messages/[id]` open, when a hint naming that conversation arrives, then the detail re-reads through its existing load path and the new message renders; read-state behaviour is exactly the page's existing behaviour (no new marking path).
- Given a hint naming a *different* conversation, then the open detail is undisturbed (only inbox/badge state moves).
- Given I just sent a message here (optimistic + confirmed write-through), when my own send's hint arrives, then the re-read converges on the same confirmed state — no duplicate, no flicker.

### STORY-4: The forum is alive while I'm on the group page (COM-10: forum)
As a group member on the group page, I want forum activity to reach the section, so a conversation that stays is also a conversation that's current.

**Acceptance criteria:**
- Given the forum section mounted for group G, when another member posts or replies, then the section re-reads and the new content appears in place — newest-first order and reply placement per C-B's rendering, my composer/reply drafts untouched.
- Given a moderator removes a post I'm looking at, when the moderation hint arrives, then the post becomes the standard tombstone in place.
- Given I navigate to another group's page, then G's subscription is torn down and the new group's is created — never both, never neither.
- Given I'm on a page with no forum section, then no forum subscription exists.

### STORY-5: A hint is never an authority (verify-on-signal)
As the platform, I want the client provably inert to forged or misdelivered hints, so the socket adds liveness without adding attack surface.

**Acceptance criteria:**
- Given any hint, then no rendered content ever comes from its payload — every visible change traces to an authorized fetch response (asserted at the unit layer: handler → invalidate + fetch, nothing else).
- Given a forged hint naming a conversation I cannot read or a group I left, when the re-fetch runs, then the platform's refusal leaves surface state unchanged (an error is not rendered as content; the badge/inbox reflect only what `get_my_conversations` returns).
- Given hint-handling telemetry, then events are content-free (event type + outcome; ids as correlation only — the H012 discipline).

### STORY-6: Losing the socket costs latency, never data (COM-11)
As a FIM on a bad connection, I want the Hub to say it's reconnecting, keep working, and catch me up when it's back — so I never silently read a stale surface believing it live.

**Acceptance criteria:**
- Given a comm channel leaves the subscribed state, when a Messages surface or the forum section is mounted, then a quiet reconnecting indicator shows on those surfaces; the rest of the Hub is unaffected.
- Given the channel re-subscribes (or the tab regains visibility), then mounted comm reads and the badge invalidate and re-fetch — anything missed is present after the re-read, because the tables are the truth (durable-first).
- Given the channel stays down with the tab visible, then a slow poll (~60s, one tuned constant) keeps the mounted comm surfaces honest until the socket returns.
- Given the tab is hidden, then no polling runs (visible-tab gating, the session-guard rule).

### STORY-7: Teardown is total (identity + lifecycle)
As the platform, I want subscriptions and caches to die with the session, so nothing leaks across identities.

**Acceptance criteria:**
- Given a FIM signs out, then every comm subscription is removed and the comm caches invalidate (the existing `registerCacheInvalidator` registry — no new teardown mechanism).
- Given a session expires or identity changes, then the tenant re-arms only when the arming rule again holds (FIM + live session).

## Platform dependencies

- **[FEAT-PD010](../../../platform/domain/features/FEAT-PD010-realtime-hint-emission.md)** — the hints + the `realtime.messages` receive policies (schema gate lands platform-side; this feature carries no migration).
- **[FEAT-PD008](../../../platform/domain/features/FEAT-PD008-conversation-and-message-contracts.md) / [FEAT-PD009](../../../platform/domain/features/FEAT-PD009-forum-and-attribution-contracts.md)** — the authorized fetch paths verify-on-signal re-exercises (`get_my_conversations`, `get_conversation_detail`, `get_group_forum`); unchanged.
- **[ADR-U039](../../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md)** — the doctrine; the channel-scope amendment (SPECIFICATION §L2 §4 + entity CLAUDE) rides this decomposition batch per the standing rule.
- **Existing Hub substrate** — the AuthContext shared client, `session-guard.ts` as the tenant pattern precedent, the messages/forum couriers + session caches + `registerCacheInvalidator`, the window-event house pattern.

## Cross-product impact

The **Gimbal** consumes the same channels, payloads, and policies, and inherits the verify-on-signal + reconciliation posture — only the rendering differs. The **A-NTF area** inherits the manager as its integration point (the bell = third tenant: register `account:<auth_uid>:notifications` + handler). Nothing here is Hub-shell-specific except the components consuming the events.

## Vertical impact

- **Privacy/GDPR:** no content crosses the socket (platform-side guarantee, consumed here); everything rendered arrives through the contracts' existing privacy posture; hint telemetry is content-free with ids as correlation only.
- **Notifications:** None — the badge is read-state, not a notification (the oracle rule); the bell is A-NTF's tenant.
- **Administration:** None new — moderation hints render the same tombstone the moderation contract already defines.
- **Observability:** subscription lifecycle (join / refused / lost / rejoined) and hint handling emit content-free telemetry; a refused subscription and a dead channel are recorded events, never silent; poll-fallback activation is visible in telemetry.
- **Transactions:** None.
- **Extensibility:** tenants are registered, not hardcoded (the A-NTF readiness test is STORY-1's second criterion); event handling is hint-type-agnostic where possible (any hint on a topic → invalidate + fetch), so new platform event names don't break older clients.

## Performance budget

- **First-paint class:** unchanged — no new first-paint reads on any page; channels join post-paint (B1–B4 budgets untouched; data-boot paths stay as shipped in H025/H026).
- **Interaction class:** hint-driven updates are background work — no interaction latency added; sends/posts keep their C-A/C-B optimistic + confirmed write-through behaviour (B5 unchanged).
- **Loading states:** background re-reads keep existing content rendered (no skeleton flash — skeletons remain first-load only, B6); the reconnecting indicator is quiet and local to comm surfaces.
