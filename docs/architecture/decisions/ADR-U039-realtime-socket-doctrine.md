# ADR-U039: Realtime socket doctrine — private channels, server-originated hints, authorized-path reads

**Status:** Proposed (2026-07-03)
**Deciders:** Stefan + Claude (Cycle E decomposition session)
**Technical story:** IDN-11 (per-device sessions + remote sign-out) needs an instant-sign-out signal; the legacy Hub MVP solved the same problem with Supabase Realtime, and the Notifications and Communication areas will need realtime delivery next. This ADR fixes the conventions all of them share **before** the first v2 tenant ships.

---

## Context

Three findings from the Cycle E feasibility gate and the legacy-MVP review (2026-07-03, session bridges + `docs/planning/hub-v2/phase-3-identity-completion-plan.md` row E):

1. **Revoking a Supabase session is not instant by itself.** Deleting a row from `auth.sessions` kills the refresh chain (`auth.refresh_tokens.session_id` FK is `ON DELETE CASCADE`), but the revoked session's access token stays valid until its `exp` claim (documented Supabase behaviour). The legacy Hub MVP achieved *felt-instant* logout with a two-layer client pattern: a Realtime broadcast (`force-logout:<user-id>`, `hub-legacy/lib/auth/AuthContext.tsx`) for sub-second sign-out, plus periodic/on-focus `supabase.auth.getUser()` validation as the guaranteed fallback (GoTrue checks session-row existence server-side — the docs-blessed `session_id`-claim correlation).
2. **The legacy pattern has two weaknesses.** The broadcast was **client-sent** (the admin's browser) on a **public** channel — any client could spoof a signal onto someone else's channel; and the client **blind-signed-out** on receipt. Separately, legacy *notifications* pushed **full row content** over the socket via `postgres_changes` (RLS-checked per subscriber — correct, but the mechanism Supabase now steers new applications away from because the per-change per-subscriber authorization check is the known scaling bottleneck).
3. **The Hub's realtime scope is deliberately narrow.** `docs/products/hub/CLAUDE.md` caps direct Supabase contact at auth + named realtime channels, and adding a channel is an architectural decision, not a refactor. The session-signal channel is that decision — and Notifications/Communication are next in line, so the conventions must be set once, not per-tenant.

## Decision

The following doctrine binds every realtime use on every surface (Hub now; Gimbal and studio surfaces when they ship):

1. **One WebSocket per client.** Supabase Realtime multiplexes channels over a single connection; features join channels on the shared socket. No feature opens a second connection.
2. **Private channels only.** Every channel is created `private: true` and authorized via RLS policies on `realtime.messages` (Realtime Authorization). Public/unauthorized channels are not used. Channel-topic naming: `<area>:<subject-id>:<purpose>` (first instance: `account:<auth_user_id>:sessions`).
3. **Signals originate server-side.** Platform events emit via `realtime.send()` (or `realtime.broadcast_changes()`) from the substrate — a SECURITY DEFINER RPC body or trigger — never from another client's browser. The sender of record is the platform, not a peer.
4. **A socket message is a hint, never an authority.** Payloads carry at most an event type and an id — no content. The client reacts by exercising the already-authorized path: re-validating the session (`getUser()`), re-fetching through the Platform API / BFF, or re-reading an RLS-gated contract. **Verify-on-signal:** a client never takes a destructive local action (e.g. sign-out) on the message alone; it verifies against the authoritative substrate first. A spoofed or misdelivered hint is therefore harmless by construction.
5. **Durable state first, push second.** Anything a member must not miss (a notification, a message) is a table row first; the socket only accelerates discovery. Missed hints cost latency, never data — reconnect/page-load reads the table.
6. **Polling is fallback, not transport.** Where a guaranteed catch-up is needed (session revocation), clients revalidate on tab focus/visibility and on a slow interval — the hint carries the immediacy; the poll carries the guarantee. Poll rates are tuned per feature spec, not hardcoded doctrine.

**Consequences for named consumers:**

- **IDN-11 / FEAT-PC009 + FEAT-H012 (first tenant):** `revoke_own_session()` emits the hint on `account:<auth_user_id>:sessions`; the Hub's AuthContext subscribes, verifies-on-signal, and adds focus/visibility + slow-interval validation.
- **Notifications area (future tenant):** ping-then-fetch on this doctrine — the insert trigger emits a hint; the client re-fetches its unread rows through the authorized read path. The legacy `postgres_changes` full-row push is **not** carried into v2. (`public.notifications` remaining in the `supabase_realtime` publication serves the legacy app only, until Phase-4 cutover.)
- **Communication area (future tenant):** same doctrine; DM delivery shape is decided in that area's decomposition, but bound to private channels + hint-not-authority.
- **Hub channel-scope rule:** `docs/products/hub/CLAUDE.md` and Hub `SPECIFICATION.md` §L2 §4 are amended in this batch — the permitted channel list becomes doctrine-governed: channels are added by feature spec under this ADR (each addition still updates §4's named list; the session-signal channel is the first realized entry).

## Alternatives considered

- **`postgres_changes` subscriptions (the legacy notifications mechanism).** Officially supported and RLS-authorized per subscriber, but per-change per-subscriber policy evaluation is the documented scaling bottleneck, delivery is effectively serialized, and it pushes row content over the socket. Rejected as the v2 default; ping-then-fetch keeps one authorized read path.
- **Client-sent broadcasts (the legacy force-logout mechanism).** Works, but makes a peer browser the sender of record and invites spoofing/griefing on public channels. Rejected: signals originate in the substrate.
- **Accept the access-token expiry window with no signal (feasibility-gate option a).** Simplest, but the legacy MVP already proved felt-instant logout and members will compare v2 against it. Rejected for session revocation; remains acceptable for features with no instant-action need.
- **Shorter JWT TTL as the only mitigation.** Reduces the window globally but taxes every session with more refresh traffic and still isn't instant. Available as a complementary knob; not the mechanism.

## Consequences

- Realtime Authorization (RLS on `realtime.messages`) becomes platform substrate — policies ship in migrations through the schema gate, owned by the feature that adds the channel.
- Each surface holds exactly one socket whose concurrent-connection cost amortizes across all tenants (sessions today; notifications, DMs later).
- Realtime message volume counts against plan quotas (2M/month Free, 5M Pro) — hint-sized payloads and rare control events keep this negligible until Notifications-scale fan-out, which that area's decomposition must budget.
- The doctrine is testable per tenant: a spoofed hint must provably cause no state change (verify-on-signal), and a dropped hint must provably cost only latency (durable-first + fallback validation).
