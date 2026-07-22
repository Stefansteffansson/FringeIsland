# FEAT-PD010: Realtime hint emission — the ADR-U039 live-delivery layer for conversations and forums

---
id: FEAT-PD010
title: Realtime hint emission — server-originated content-free hints on private channels for conversations, the unread badge, and group forums (ADR-U039 live-delivery layer)
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Messaging and forums shipped without a live layer, on purpose (CB-8): FEAT-PD008's row for "Message exchange & realtime delivery" is honestly **Partial** — exchange contracts only — and both Hub comm caches carry the header "No sockets, no polling — C-C brings the ADR-U039 live layer" (`hub/lib/messages/client.ts`, `hub/lib/forum/client.ts`). A member looking at their inbox, an open conversation, the Messages badge, or a group forum sees new activity only on navigation. The legacy MVP's answer (`postgres_changes` full-row push) is retired for v2 ([ADR-U039](../../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md); the conversational tables left the `supabase_realtime` publication at C-A — migration `20260719230500`).

This feature is the platform half of the one fresh U039 build serving both surfaces (CB-8): the substrate learns to **emit server-originated, content-free hints on private broadcast channels** whenever conversational or forum state changes, and to **gate topic receipt with RLS on `realtime.messages`** (§8 Q7's law: policy, never a channel filter). The realized precedent is the session-signal channel (`revoke_own_session()`'s emit + the `session_signal_receive_own` policy, migration `20260703154102`). No new read contracts: verify-on-signal re-exercises the already-realized authorized fetch paths (`get_my_conversations`, `get_conversation_detail`, `get_group_forum`).

## Solution sketch

**The channel taxonomy (fixed here, at decomposition, per the C-C brief — doctrine naming `<area>:<subject-id>:<purpose>`):**

| Topic | Grain | Events (open set) | Payload (ids only) | Receipt gated by |
|---|---|---|---|---|
| `account:<auth_uid>:conversations` | per-member | `message_created` | `{"conversation_id"}` | topic uid = caller's `auth.uid()` (the session-channel policy shape) |
| `group:<group_id>:forum` | per-group | `forum_post_created`, `forum_post_moderated`, `forum_post_edited` *(RIDER-3 amendment below)* | `{"post_id"}` | caller is an active member of the topic's group |
| `account:<auth_uid>:notifications` | per-member | — **forward-looking, A-NTF's tenant** | — | named here so the third tenant joins the same conventions; nothing built in C-C |

Why per-member for conversations: one subscription serves the inbox, the open detail, *and* the unread badge (COM-10's three consumers), and it is the exact pattern the notification bell joins next area. Why per-group for forums: one emit per event regardless of group size (fan-out to members would tax the emit path and the message quota for zero gain), and membership-gated receipt is precisely what Realtime Authorization is for.

**Emission sites — triggers, not contract bodies.** AFTER INSERT on `public.messages` fans out one `realtime.send(...)` per **active** participant (`left_at IS NULL`), resolving each participant's `auth_uid` via personal group → `users.auth_user_id` (the P-O1 chain in reverse); the sender's own topic is included (their other devices are consumers too). AFTER INSERT on `public.forum_posts` and AFTER UPDATE on its moderation transition (`is_deleted` false→true) each emit once to the group topic. Triggers rather than RPC bodies so every write path — the contracts, and the PC-4-audited admin send — emits identically, and future contracts inherit emission for free.

**RIDER-3 amendment (A-COM area-gate live walk, 2026-07-22).** The C-D own-edit window (`edit_own_forum_post`, FEAT-PD011) postdates this feature and shipped under a "no socket work" carry rule; C-D verified its self-delete rides the existing moderation trigger but never asked the same of the edit write — so an edit reached other members only on reload (walk scenario 6, Stefan). Repair migration `20260722170000` adds the third forum event in this catalogue's exact shape: `trg_ds5_emit_forum_edit_hint` (AFTER UPDATE, `WHEN (OLD.content IS DISTINCT FROM NEW.content AND NOT NEW.is_deleted)` — the WHEN clause is the idempotency guarantee; moderation/self-delete rows are excluded because they already emit `forum_post_moderated`) → one `forum_post_edited` on the group topic, `{post_id}` only. The forum tenant (FEAT-H027) subscribes to the new event; the section re-reads through `get_group_forum` — hint-not-authority holds unchanged. Emitter references `NEW.*` only → no conformance-list entry needed (the C-C rule).

**Emission is non-fatal by design** (doctrine rule 5: durable state first, push second): each emit is wrapped so a realtime failure never fails the write — the PC009 shape — but logged as a Postgres WARNING rather than swallowed silently (the platform tier's no-silent-failures law).

**Receipt policies on `realtime.messages`** (`FOR SELECT TO authenticated`, `extension = 'broadcast'`, join-time evaluated):
- conversations topic: `realtime.topic() = 'account:' || auth.uid() || ':conversations'` — own topic only, byte-for-byte the session-channel shape.
- forum topic: topic matches `group:<uuid>:forum` AND the caller is an active member of that group (uuid parsed from the topic; membership via a simple-bodied SECURITY DEFINER helper — the PG17 RLS complexity ceiling applies).

**No client-send policy on any C-C topic** — as with the session channel, no INSERT policy exists, so a client cannot broadcast onto these topics at all: signals are server-originated by construction (doctrine rule 3), and a spoofed hint is impossible rather than merely harmless.

**Stale-membership window, stated honestly:** Realtime evaluates receive policies at join (and on re-auth), so a member who leaves a group may receive forum hints until their subscription re-evaluates. This costs nothing: the hint is content-free and the authorized fetch path (`get_group_forum`) refuses them — the doctrine's verify-on-signal is the guarantee, not the socket.

## Appetite

Small-to-medium — no new tables, no new callable contracts, no payload changes to existing reads. Two-to-three triggers + an emit helper + two `realtime.messages` policies, all through the schema gate, plus the adversarial test surface.

## Rabbit holes

- **Don't put content in payloads** — not a preview, not a sender name, not a title. Event + id, full stop (doctrine rule 4). The temptation returns at every review; the tests pin it.
- **Don't build a missed-event journal or replay mechanism.** Durable-first makes reconnect a re-read of the tables through existing contracts (COM-11 is surface-side re-fetch, not event sourcing).
- **Don't re-register anything in the `supabase_realtime` publication** — the DS-5 entity rule; `notifications`' membership stays A-NTF's disposition.
- **Don't fan forum hints out per member** — one emit per event to the group topic; the policy does the gating (Q7).
- **Don't overbuild the emit helper** — no registry of emitters, no queueing. `realtime.send` inline per site, wrapped non-fatally.

## No-gos

- No notification-bell emission (A-NTF; the topic is named in the taxonomy for convention only).
- No feed/activity-event emission (feeds are unrealized; DS-5 §L3 feed composition stays forward).
- No `postgres_changes`, no public channels, no client-sent broadcasts (ADR-U039 binds the mechanism).
- No Mist receipt surface: the conversations policy admits only the topic owner, and a Mist owns no conversations (CB-1 upstream gates); the forum policy requires group membership.
- No new read contracts and no changes to existing contract payloads (the payload walk found every verify-on-signal fetch already served).
- No `notifications` table writes (DMs still create no notification rows — the oracle rule carries).

## Stories

### STORY-1: A message lands, every participant's account channel whispers (COM-10 platform half, conversations + badge)
As the platform, I want every message insert to emit one content-free hint per active participant, so any surface a participant has open can go fetch the truth.

**Acceptance criteria:**
- Given a conversation (either kind) with active participants A and B and a departed participant C (`left_at` set), when a message is inserted through `send_message`, then `realtime.messages` carries a broadcast event `message_created` on `account:<A_uid>:conversations` and on `account:<B_uid>:conversations` — and none on C's topic.
- Given any emitted hint, then its payload is exactly `{"conversation_id": <uuid>}` — no content, no sender, no timestamps (asserted against the stored broadcast row).
- Given the admin send path (the PC-4-audited insert), when it inserts a message, then the same hints emit — the trigger catches every write path.
- Given the realtime substrate errors during emit, when a message is sent, then the message write still succeeds (non-fatal wrap; a WARNING is raised, never silence, never failure).

### STORY-2: Forum activity reaches the group's channel (COM-10 platform half, forums)
As the platform, I want forum posts, replies, and moderation to each emit one hint on the group's topic, so an open forum section learns to re-read.

**Acceptance criteria:**
- Given a group with a forum, when a top-level post or a reply is inserted, then one `forum_post_created` broadcast lands on `group:<group_id>:forum` with payload exactly `{"post_id": <uuid>}`.
- Given a post, when it is moderated (`is_deleted` false→true via `moderate_forum_post`), then one `forum_post_moderated` broadcast lands on the same topic, ids only; re-moderating an already-deleted post (the idempotent path) emits nothing new.
- Given the emit fails, then the post/reply/moderation write still succeeds (same non-fatal wrap + WARNING).

### STORY-3: Receipt is policy, never a filter (§8 Q7)
As the platform, I want topic receipt gated by RLS on `realtime.messages`, so who may hear a hint is a substrate decision.

**Acceptance criteria:**
- Given member A authenticated, when A is authorized against `account:<A_uid>:conversations`, then receipt is granted; against `account:<B_uid>:conversations`, then it is refused.
- Given a group member in good standing, when they are authorized against their group's `group:<id>:forum` topic, then receipt is granted; given a non-member, a member of a different group, or an authenticated Mist, then it is refused.
- Given a member who has left the group, when their subscription is next evaluated, then receipt is refused — and in the join-to-re-evaluation window, anything they could still hear is content-free and their `get_group_forum` call is refused (verify-on-signal carries the guarantee).

### STORY-4: No door for a forged signal (doctrine rule 3)
As the platform, I refuse client-originated broadcasts on every C-C topic.

**Acceptance criteria:**
- Given any authenticated client (Mist included), when it attempts to broadcast onto `account:<any_uid>:conversations` or `group:<any_id>:forum`, then the send is refused — no INSERT policy exists on `realtime.messages` for these topics.
- Given the session-signal channel's existing policy set, when this feature's policies land, then the session channel's behaviour is unchanged (regression-guarded).

### STORY-5: No path around, nothing new to attack (ADR-U038 / W12)
As the platform, I add live delivery without adding writable surface.

**Acceptance criteria:**
- Given a direct PostgREST caller, when it attempts to invoke the emit helper or trigger functions directly, then execution is refused (revoked from `authenticated`; triggers are not callable).
- Given the conformance gate, when it runs, then it stays green — no new tables, no Core function touching DS-5 tables, the DS-5 allowlist extended with exactly the new helper functions.

## Platform dependencies

PC-1 Infrastructure — the Supabase Realtime substrate (`realtime.send`, Realtime Authorization on `realtime.messages`); named load-bearing in Hub §L3 COM-10/COM-11. PC-3 — membership truth for the forum receive policy. PC-2 — `auth_user_id` resolution for the conversations fan-out. Nothing new from Core: this feature consumes the substrate the session channel already proved.

## Cross-product impact

[FEAT-H027](../../../products/hub/features/FEAT-H027-live-messages-forum-and-badge.md) is the paired consumer (the Hub's shared tenant substrate + reconciliation). The Gimbal inherits both channels by contract — nothing Hub-private in topic names, payloads, or policies. **A-NTF inherits the conventions as the third tenant** (`account:<auth_uid>:notifications` — per-member topic, ids-only payload, receive-policy-per-topic-pattern, no client send, non-fatal WARNING-logged emit); the Hub channel-scope amendment (SPECIFICATION §L2 §4 + entity CLAUDE) rides this decomposition batch per the standing rule.

## Vertical impact

- **Privacy/GDPR:** no personal data crosses the socket — payloads are ids only, asserted by test; receipt is RLS-gated per topic (Q7); the fetch a hint triggers runs under the existing contracts' privacy posture. Nothing new is stored (broadcast rows are transient substrate).
- **Notifications:** None — hints are not notifications (no bell, no preferences, no durable rows); DMs continue to create no notification rows. The bell becomes the third tenant at A-NTF.
- **Administration:** None new — no admin affordance; admin sends emit the same content-free hints via the same trigger.
- **Observability:** emit failures raise WARNINGs (never silent, never fatal); refused topic authorizations are substrate-recorded denials; the hint volume rides well under quota (ids-only payloads — the U039 consequence; fan-out budgeting for notification scale is A-NTF's).
- **Transactions:** None.
- **Extensibility:** event names are an open set (TEXT, no enum, no registry wall); new channels are added by feature spec under ADR-U039 (doctrine-governed, not code-gated); the emit pattern extends to future tenants without Core changes.

## Performance budget

N/A (no surface) — budgets bind at FEAT-H027. The contract shape serves them: hints are fire-and-forget on the write path (non-fatal, no synchronous consumer wait), and no read path changes.

## Open spec questions (for the schema gate)

All three resolved at the gate (2026-07-20, migration `20260720153000` — recorded in its header):

- **Q1 — forum-policy membership helper: RESOLVED — reuse.** `public.is_active_group_member(UUID)` (D15 rebuild) fits the PG17 RLS simple-body ceiling exactly (single EXISTS keyed on `get_current_personal_group_id()`); no new helper. Refuses a Mist and a suspended member for free.
- **Q2 — emit-site shape: RESOLVED — one shared thin helper** (`ds5_emit_hint`): the non-fatal + WARNING discipline lives in exactly one place; the message fan-out calls it per participant, giving per-emit isolation. Not the registry/queue the rabbit holes fence against.
- **Q3 — moderation-event edge: RESOLVED — trigger-level `WHEN` clause** (`OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted`); idempotent re-moderation is double-guarded (the C-B contract no-ops the UPDATE + the WHEN clause).

## Implementation notes (6-done — Cycle C-C, 2026-07-20)

**Built red-first through the schema gate** — PR #217 (held, nodded 2026-07-20 in answer to the two-PR gate table; migration `20260720153000` applied + repaired on dev). The channel-scope steering batch rode PR #215 (§L2 §4 named list + Hub CLAUDE §4 line, per the standing rule).

- **What landed (as built):** `ds5_emit_hint(payload, event, topic)` — SECURITY DEFINER, non-fatal, `RAISE WARNING` on emit failure (the PC009 swallow deliberately upgraded per the platform tier's no-silent-failures law), REVOKEd from all client roles; `trg_ds5_emit_message_hint` (AFTER INSERT on `messages` — one `message_created` per **active** participant's `account:<auth_uid>:conversations` topic, sender included, departed excluded, auth uid via the P-O1 chain in reverse); `trg_ds5_emit_forum_post_hint` (AFTER INSERT on `forum_posts` → `forum_post_created` on `group:<group_id>:forum`; posts and replies alike); `trg_ds5_emit_forum_moderation_hint` (AFTER UPDATE, `WHEN`-gated → `forum_post_moderated`); receive policies `ds5_conversations_receive_own` (the session-channel shape byte-for-byte) + `ds5_forum_receive_member` (`is_active_group_member` over the topic-parsed uuid). **No client-send policy on any C-C topic** — spoofing impossible by construction. No publication changes, no new tables, no new read contracts (the decomposition payload walk held at build: zero read-contract changes needed).
- **Red→green, honestly:** `realtime-hint-emission.test.ts` demonstrated **9 red / 3 labelled green** pre-apply (greens: the session-channel regression guard, the always-refused rpc probe — the C-B precedent shape — and the Q1 helper guard). First post-apply run **52/54**: the two "payload exactly" assertions had mis-modeled the storage envelope — `realtime.send()` stamps its generated broadcast-row UUID into the stored payload (`jsonb_set(payload,'{id}',…)`, verified against `prosrc`). Adapted as **two labelled adaptations** (key set asserted exactly as `{domain_id, id}`, `id` UUID-shaped and never a domain value — the content-free invariant unchanged and still exact) → **54/54 across the comm slice, zero migration edits**.
- **Receipt-probe mechanics (a build finding worth keeping):** `realtime.topic()` resolves only inside Realtime's join-time authorization, so receive policies are probed via the **WebSocket subscribe path** (the sessions.test.ts precedent), not SQL SELECTs; no-client-send is a structural `pg_policies` assertion (receive policies exist + no INSERT/ALL policy). `markArrivedOnce` is an E2E-only helper — the integration comm suites use `createTestUser` (noted in the suite header).
- **W12 / ADR-U038:** the trigger functions are uncallable (`RETURNS trigger`); the emit helper's REVOKE is proven by the always-refused probe; both receive policies proven adversarially (own/other member, active member/outsider/other-group member/Mist); the conformance gate gained `ds5_emit_message_hint` in `DS_OWNED_ALLOWLIST` and held green pre- and post-apply.
- **Consumer:** [FEAT-H027](../../../products/hub/features/FEAT-H027-live-messages-forum-and-badge.md) (the Hub tenants + reconciliation); the A-NTF bell inherits the conventions as the third tenant (`account:<auth_uid>:notifications`, named forward-looking only).
