# FEAT-PD015: Notification realtime hint, nudge policy, and reconnect reconciliation

---
id: FEAT-PD015
title: Notification realtime hint, nudge policy, and reconnect reconciliation
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The notification bell is fetch-only. N-A ([FEAT-PD013](FEAT-PD013-notification-routing-contracts-and-category-registry.md)) built the durable delivery substrate and the read/mark-read contracts; N-B ([FEAT-PD014](FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md)) made them actionable. Neither accelerates *discovery*: a member already sitting on a page learns a notification arrived only when they navigate or remount. Every other realtime tenant on the platform — sessions (FEAT-PC009), conversations and the group forum (FEAT-PD010) — already pings; notifications, the one surface whose entire job is to tell people things, does not.

Three further gaps sit behind that:

1. **The reconnect path is unproven.** [ADR-U039](../../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md):25 promises "missed hints cost latency, never data." For notifications that promise has never been tested — it is the SILENT row in the ported oracle (no v1 coverage). A client that loses its socket has no evidence it can re-establish truth.
2. **The legacy full-row push is still live.** `public.notifications` is the **sole remaining member** of the `supabase_realtime` publication (verified on the live DB, 2026-07-25). ADR-U039:14 rejected `postgres_changes` row-pushing as the v2 mechanism and :37 rejected it as the default; C-A already removed `conversations`, `messages`, and `direct_messages` (`20260719230500:180-189`). Notifications is the last one standing, and its stated rationale — "serves the legacy app only, until Phase-4 cutover" (ADR-U039:31) — is void: nobody runs v1.
3. **Fan-out cost is unbudgeted.** ADR-U039:46 requires the Notifications area to budget realtime volume, because a nudge costs one message per recipient. Measured on the live DB: the largest single announcement send produced **857 delivery rows to 857 recipients**, against a reachable FIM population of 1,274. A platform-wide send reaches everyone. Nudging that path scales cost with *headcount*, not with activity — and nobody waits on a platform announcement, so the immediacy buys nothing there.

## Solution sketch

**Almost all of this substrate already exists.** A-COM Cycle C-C generalized the PC009 pattern; this feature adds one emit site, one receive policy, one setting, and one DROP. It builds **no** new emit helper.

**1. One emit site, not thirty-eight.** `INSERT INTO public.notifications` appears at ~38 sites across 11 migrations, and there is **no trigger on the table** (verified live). Rather than touch every writer and require every future writer to remember, a single `AFTER INSERT ... FOR EACH ROW` trigger on `public.notifications` emits the hint. It catches every kind — legacy, current, and unwritten — by construction.

Topic resolution follows the C-C precedent (`20260720153000:120`): `NEW.recipient_group_id` → `users.personal_group_id` → `users.auth_user_id` → `account:<auth_uid>:notifications`. A row whose recipient resolves to no FIM auth uid (a group-addressed row, a Mist) emits nothing.

The emit calls the **existing** `public.ds5_emit_hint(p_payload JSONB, p_event TEXT, p_topic TEXT)` (`20260720153000:91`, verified deployed) — already `private => TRUE`, already non-fatal, already revoked from `PUBLIC, anon, authenticated` (`:111`). Payload is content-free per ADR-U039:24: the row id and nothing else. No title, no body, no kind.

**2. The nudge policy is data, not code.** Following the established `pc2_config` pattern (`key / value / description / updated_at`, whose sole row documents itself as "changeable without altering `reap_expired_mists()`"), a sibling `ds5_config` table holds the notification nudge policy. Seeded with one row:

`realtime_hint_platform_announcements = 'false'`

The trigger consults it and suppresses the emit when the row is a platform-scoped announcement (`NEW.type = 'announcement' AND NEW.payload->>'scope_kind' = 'platform'`). Community-scoped announcements, invitations, nominations, and every other kind nudge normally. An administrator turns platform-wide nudges on by changing one value — no deploy, no migration.

Scope-awareness is required because category-level control cannot express this: `announcement` is a single kind under a single category (`platform`) covering *both* a 30-member community post and a send-to-everybody broadcast. A per-category switch would force them to share a setting.

**Deliberately not built here:** the general per-category nudge switch, and any admin UI. [NB-5](../../../planning/hub-v2/phase-3-notifications-completion-plan.md) assigns category+channel suppression to N-D's shared dispatcher, which is also where the preferences UI lands. This feature ships the one control and records the generalisation as N-D's seam.

**3. A fourth receive policy.** `ds5_notifications_receive_own` on `realtime.messages`, `FOR SELECT TO authenticated`, `extension = 'broadcast'`, topic equal to the caller's own `account:<uid>:notifications`. It joins the three already live (`session_signal_receive_own`, `ds5_conversations_receive_own`, `ds5_forum_receive_member` — verified). **It must use the initplan-wrapped form** `(select realtime.topic())` / `(select auth.uid()::text)` per the perf re-issue at `20260704075549:39-44`, *not* the original PC009 shape at `20260703154102:161-168`. **No send policy** — as with every other topic, a client cannot broadcast.

**4. Reconnect reconciliation needs no new contract.** The existing deployed reads suffice: `get_own_unread_notification_count()` establishes the badge truth and `get_own_notifications(p_limit, ...)` re-reads the recent window. Reconciliation is a *client* behaviour (FEAT-H032) exercising already-authorized paths — exactly ADR-U039:25's "reconnect/page-load reads the table."

This corrects a carried-forward premise: the completion plan describes reconnect reconciliation as "a server primitive the SILENT oracle needs fresh tests for." The audit finds the primitive already exists; what is genuinely missing is the **tests**. This feature owns those (STORY-4), not a new RPC.

**5. NB-7 — drop the legacy publication membership.** `ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications`, replace-then-remove: the broadcast hint ships in the same migration set, so the capability is replaced before the legacy mechanism is removed. The publication ends **empty**.

## Appetite

One cycle half, platform side. Small by volume — one trigger, one table, one policy, one DROP — and most of the cost is in the adversarial tests, which are the point rather than the overhead. If the fan-out volume work grows beyond stating and testing the budget, that is the signal to stop and route it to N-D's dispatcher.

## Rabbit holes

- **Do not rebuild the emit helper.** `ds5_emit_hint` exists, is non-fatal, and is correctly revoked. Wrapping it, forking it, or inlining `realtime.send` re-opens a settled C-C ruling (`20260720153000:44`).
- **Do not make the trigger fatal.** A realtime failure must never roll back the durable row — that inverts ADR-U039:25 ("durable state first, push second"). `ds5_emit_hint` is already non-fatal; the trigger must not add its own raising path.
- **Do not build a "notifications since X" read.** Keyset pagination already exists backward; a forward variant is a new contract for no gain when re-reading page 1 plus the count is one cheap indexed read.
- **Do not reuse `pc2_config`.** It belongs to PC-2 Identity (Platform Core — a governance carve-out) and a notification nudge policy is not Identity's business. Follow the *pattern*, own the table in DS-5.
- **Do not batch the emit into a statement-level trigger** to shave the announcement fan-out. Row-level and statement-level send the same number of messages, because each recipient needs their own private topic; statement-level only adds a set-iteration path. The volume lever is the policy toggle, not the trigger granularity.
- **Resist widening the payload.** Every field beyond the id is a step back toward the row-pushing that ADR-U039 rejected, and a step toward a client that renders the hint instead of verifying it.

## No-gos

- No email, push, or any external channel (NB-2 / [ADR-U040](../../../architecture/decisions/ADR-U040-referral-not-email-membership.md)) — in-app only.
- No general per-category nudge switch and no admin UI (N-D, NB-5).
- No digest or aggregation (NB-6, forward to Eid+).
- No change to the announcement in-app adapter — it is already realized end-to-end (see Vertical impact / Notifications).
- No `postgres_changes` subscription reintroduced under any name.
- No Mist realtime: Mists hold no durable notification rows (NB-8), so no topic resolves for them.
- No change to `get_own_notifications`, `mark_notification_read`, or any N-A/N-B contract signature.

## Stories

### STORY-1: A notification's arrival nudges its recipient, and only its recipient

As a member, I want the bell to learn about a new notification the moment it is written, so that I do not have to navigate to discover it.

**Acceptance criteria:**
- Given a FIM recipient with a resolvable `auth_user_id`, when any writer inserts a row into `public.notifications` for them, then exactly one broadcast is emitted on `account:<their_auth_uid>:notifications` with event `notification`.
- Given that emitted message, when its payload is inspected, then it carries the row id and **no** title, body, type, or category — content-free per ADR-U039:24.
- Given two different recipients receiving rows from the same write statement, when the hints are emitted, then each lands on its own topic and neither appears on the other's.
- Given a notification row whose `recipient_group_id` resolves to no FIM `auth_user_id` (group-addressed row, or a Mist), when it is inserted, then no broadcast is emitted and the insert succeeds normally.
- Given a legacy writer untouched by this feature (any of the ~38 existing insert sites), when it inserts, then the hint is emitted anyway — no writer-side change is required.

### STORY-2: A platform-wide announcement stays quiet, and an administrator can change that without a deploy

As the platform operator, I want send-to-everybody announcements not to nudge every member by default, and I want to reverse that decision myself, so that message cost does not grow with membership and the choice is not frozen into code.

**Acceptance criteria:**
- Given `realtime_hint_platform_announcements = 'false'` (the seeded default), when a platform-scoped announcement fans out to N recipients, then **zero** broadcasts are emitted and all N durable rows are written.
- Given the same setting, when a *community*-scoped announcement fans out, then one broadcast per recipient is emitted — the suppression is scoped to platform-wide, not to announcements generally.
- Given the setting is changed to `'true'` with no code deployed and no migration run, when a platform-scoped announcement is sent, then one broadcast per recipient is emitted.
- Given the setting row is absent or holds an unrecognised value, when a platform announcement is sent, then the emit is suppressed (fail-quiet — an unreadable policy must not produce a headcount-sized burst) and the durable rows are still written.
- Given a suppressed announcement, when the recipient next loads a page or opens the bell, then the announcement is present and badged — suppression costs latency, never delivery.

### STORY-3: Only the recipient can receive on their topic, and nobody can send

As a member, I want my notification topic to be unreadable by anyone else and unwritable by everyone including me, so that a hostile client can neither watch my notifications nor fake one.

**Acceptance criteria:**
- Given an authenticated FIM, when they subscribe to `account:<their_own_auth_uid>:notifications` as a private channel, then the subscription succeeds and they receive their hints.
- Given an authenticated FIM, when they attempt to subscribe to another member's notification topic, then they receive nothing.
- Given any authenticated client, when it attempts to broadcast onto any `:notifications` topic, then the send is refused — no send policy exists on the topic.
- Given the new receive policy, when its definition is inspected, then `realtime.topic()` and `auth.uid()` are both wrapped in `(select ...)` per the `20260704075549` initplan form.
- Given `anon`, when it attempts to execute `ds5_emit_hint` directly, then execution is refused (the existing `:111` revoke still holds after this feature's changes).

### STORY-4: A missed or spoofed hint costs latency, never data

As the platform, I want the doctrine's two guarantees proven for notifications specifically, so that the reconnect path stops being the untested silence in the oracle.

**Acceptance criteria:**
- Given a recipient with no live subscription (offline), when notifications are written for them, then on their next authorized read both the rows and the unread count are complete and correct — no hint was needed for delivery.
- Given a recipient who reconnects after missing hints, when they call `get_own_unread_notification_count()` and `get_own_notifications(...)`, then the results reflect every row written while they were away.
- Given a hint that is emitted but never delivered (the socket dropped), when the durable row is queried, then it exists and is unread — the emit path cannot have consumed it.
- Given `ds5_emit_hint` fails or raises internally, when the triggering insert is examined, then the notification row is committed — the durable write never rolls back on a realtime failure.
- Given a hint payload carrying a **forged** row id (an id belonging to another member), when the recipient's client exercises its authorized read path, then no notification for that id is returned — the hint is provably not an authority.

### STORY-5: The legacy row-pushing mechanism is gone

As the platform, I want the `postgres_changes` publication membership removed now that broadcast replaces it, so that no path exists to push notification row content over a socket.

**Acceptance criteria:**
- Given this feature's migration set is applied, when `pg_publication_tables` is queried for `supabase_realtime`, then it returns **zero rows** — the publication is empty.
- Given the same migration, when its ordering is inspected, then the broadcast hint is established in the same set as the DROP (replace-then-remove — the capability is never absent).
- Given a client attempting a `postgres_changes` subscription on `public.notifications`, when it subscribes, then it receives no row events.

## Platform dependencies

- **DS-5 Communication (self):** `ds5_emit_hint` (`20260720153000:91`), the three existing `realtime.messages` receive policies as the shape precedent, and the N-A/N-B contracts `get_own_notifications` / `get_own_unread_notification_count` (verified deployed).
- **PC-1 Infrastructure:** Supabase Realtime channel infrastructure and Realtime Authorization (RLS on `realtime.messages`) — load-bearing per Hub `SPECIFICATION.md` §L2 §4, not universal substrate.
- **PC-2 Identity:** the `users.personal_group_id` → `users.auth_user_id` resolution used for topic derivation; `pc2_config` as the *pattern* precedent only (not reused).
- **V3 Notifications:** the category registry and delivery substrate this rides on (ADR-U048 — the table does not bend to DS-5).

## Cross-product impact

The Hub is the only consumer today, via the paired [FEAT-H032](../../../products/hub/features/FEAT-H032-live-notification-bell-and-reconnect-reconciliation.md). The Gimbal and studio surfaces inherit the topic and doctrine unchanged when they ship — the emit is surface-agnostic, so a second surface subscribing to the same topic needs no platform change. Hub `SPECIFICATION.md` §L2 §4 flips `account:<auth_uid>:notifications` from forward-looking to realized in the same batch (the ADR-U039:33 obligation).

## Vertical impact

- **Privacy/GDPR:** No new personal data collected or stored. The `ds5_config` row holds an operational boolean, not member data. The hint payload is deliberately content-free, which is itself a privacy property: notification content never traverses the socket, only an opaque id, and the id is useless without the authorized read. Topic derivation reads `auth_user_id` but never emits it in a payload. Erasure is unaffected — no new table references a member.
- **Notifications:** This *is* notification infrastructure. **The announcement in-app adapter (U049 §8 Q1 / NB-3) requires no work — it is already realized end-to-end**, verified on the live DB 2026-07-25: `announcement` is a registered kind under category `platform` (`20260723120000:78-98`); both senders write a populated `body` after the C-D rider `20260720203000` (5,501 of 5,501 rows non-null); `get_own_notifications` joins `notification_kinds` and returns the category; `NotificationItem` renders kind-agnostically. NB-3 becomes verify-and-record, the NB-8 shape. Email and push stay deferred (NB-2 / [ADR-U040](../../../architecture/decisions/ADR-U040-referral-not-email-membership.md)). Per-category and per-channel suppression is N-D's (NB-5).
- **Administration:** The nudge policy is an administrative control by design — `realtime_hint_platform_announcements` is the operator's lever over platform-wide message cost. In this feature it is changed as data (no UI); the admin surface lands with N-D's preferences work. `ds5_config` reads are open to authenticated callers; writes are restricted to elevated paths, following `pc2_config`.
- **Observability:** The emit path must be observable without leaking content — count and outcome, never topic strings or ids (the H012/C-C discipline: topic **kind** only). A suppressed platform announcement is a recordable event, so an operator can see the policy acting rather than infer it from silence. `ds5_emit_hint` failures are already non-fatal; they must not be silent — a failed emit is logged as an event, since a silently broken hint path degrades to fetch-only and would otherwise look like working software.
- **Transactions:** None. No payments, subscriptions, or financial data. The message-volume budget is an infrastructure cost concern, not a transactional one.
- **Extensibility:** No new enum, no sealed set. `ds5_config` is key/value — new policies are rows, not columns. The broadcast event name is `TEXT` (the manager's tenant `events` is documented as an open set). The trigger is kind-agnostic: a notification kind invented in a later wave nudges correctly with no edit here, which is the same open-registry property N-A established for categories. The one scope test (`payload->>'scope_kind' = 'platform'`) reads data rather than branching on a hardcoded list, and generalises into N-D's dispatcher without a rewrite.

## Performance budget

**N/A (no surface)** — platform-only. Two budgets that are not page budgets apply and are stated here because ADR-U039:46 requires this area to carry them:

- **Message-volume budget.** One nudge per recipient per notification. Measured live: the largest single announcement send produced 857 delivery rows to 857 recipients; reachable FIM population is 1,274. Against the plan allowance (2M/month free, 5M Pro), ordinary one-to-one activity is negligible; the only path that scales with headcount is the platform-wide announcement, which is suppressed by default (STORY-2). The toggle is the lever, and STORY-2's fail-quiet default means a misconfiguration cannot produce a headcount-sized burst.
- **Write-path budget.** The trigger sits on the insert path of every notification, so its cost is paid by every writer including the fan-out loops. It must stay to a single indexed lookup (recipient → auth uid) plus one config read, and must add no per-row scan. A platform announcement inserting N rows must not become N × (a table scan).

Loading states and interaction classes are the consumer's concern — see FEAT-H032.
