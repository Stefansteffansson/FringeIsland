# FEAT-PD015: Notification realtime hint, nudge policy, and reconnect reconciliation

---
id: FEAT-PD015
title: Notification realtime hint, nudge policy, and reconnect reconciliation
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The notification bell is fetch-only. N-A ([FEAT-PD013](FEAT-PD013-notification-routing-contracts-and-category-registry.md)) built the durable delivery substrate and the read/mark-read contracts; N-B ([FEAT-PD014](FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md)) made them actionable. Neither accelerates *discovery*: a member already sitting on a page learns a notification arrived only when they navigate or remount. Every other realtime tenant on the platform — sessions (FEAT-PC009), conversations and the group forum (FEAT-PD010) — already pings; notifications, the one surface whose entire job is to tell people things, does not.

Three further gaps sit behind that:

1. **The reconnect path is unproven.** [ADR-U039](../../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md):25 promises "missed hints cost latency, never data." For notifications that promise has never been tested — it is the SILENT row in the ported oracle (no v1 coverage). A client that loses its socket has no evidence it can re-establish truth.
2. **The legacy full-row push is still live.** `public.notifications` is the **sole remaining member** of the `supabase_realtime` publication (verified on the live DB, 2026-07-25). ADR-U039:14 rejected `postgres_changes` row-pushing as the v2 mechanism and :37 rejected it as the default; C-A already removed `conversations`, `messages`, and `direct_messages` (`20260719230500:180-189`). Notifications is the last one standing, and its stated rationale — "serves the legacy app only, until Phase-4 cutover" (ADR-U039:31) — is void: nobody runs v1.
3. **Fan-out cost is unbudgeted.** ADR-U039:46 requires the Notifications area to budget realtime volume, because a nudge costs one message per recipient. Measured on the live DB: the largest single announcement send produced **857 delivery rows to 857 recipients**, against a reachable FIM population of 1,274. A platform-wide send reaches everyone. Nudging that path scales cost with *headcount*, not with activity — and nobody waits on a platform announcement, so the immediacy buys nothing there.

## Implementation notes

**Built + merged 2026-07-25** at the schema gate (PR #285, named approval), with conformance and the billing model recorded in #287. One migration: `supabase/migrations/20260725120000_n_c_notification_hint_and_policy.sql`. Applied to the dev DB and the migration log repaired.

**What shipped**

1. **`public.ds5_config`** — key/value DS-5 operational settings, mirroring `pc2_config`. **RLS enabled with ZERO policies (deny-all).** *This corrected the plan:* the task file first said "SELECT to `authenticated`", but the precedent `pc2_config` has no policies at all — the blanket schema grants are inert under RLS and only SECURITY DEFINER paths read it. Tighter, and still satisfies the platform-tier "new tables require RLS" rule. Seeded `realtime_hint_platform_announcements = 'false'`.
2. **`notify_notification_hint()` + `trg_notify_notification_hint`** (`AFTER INSERT ... FOR EACH ROW` on `public.notifications`). SECURITY DEFINER, `search_path = ''`. Resolves recipient → `users.auth_user_id` (index-scan verified), emits `{"id": …}` on `account:<auth_uid>:notifications` via the **existing** `ds5_emit_hint` — no new helper. Suppresses when the row is a platform-scoped announcement and the config is not `'true'`; **fail-quiet**, so an absent or garbage value suppresses rather than bursting.
3. **`ds5_notifications_receive_own`** on `realtime.messages` — the fourth receive policy, initplan-wrapped form, `FOR SELECT TO authenticated`, no send policy.
4. **NB-7 executed** — `notifications` dropped from `supabase_realtime`; the publication is **empty**, verified on the live DB.

**Why one trigger and not ~38 edits.** There was no trigger on `public.notifications`, and `INSERT INTO public.notifications` appears at ~38 sites across 11 migrations (delivery triggers live on *source* tables). One trigger catches every writer — legacy, current, and unwritten — by construction. Row-level rather than statement-level because both emit the same message count (each recipient needs their own private topic); granularity is not the volume lever.

**The nudge policy is Stefan's call, recorded as data (2026-07-25).** Platform-wide announcements default to **no nudge**; community-scoped ones nudge normally. The admin UI and the general per-category switch are **N-D's** (NB-5) — deliberately not built here.

**Tests.** `hub/tests/integration/notifications/realtime-hint-and-policy.test.ts` — 26 tests, **19 red-first demonstrated red before the migration existed**, 7 labelled invariant guards excluded from that claim. Receipt is proved by a WebSocket subscribe probe (a SQL SELECT would deny everyone and prove nothing). The announcement branch is exercised with controlled direct inserts rather than the real senders, which fan out ~1,274 rows per call to prove the same branch.

**Two honest corrections during the build**
- **A vacuous test caught by green-at-red.** 19 red-first written, only 18 failing. The culprit asserted "platform emits zero hints" and "the row is readable" — both true *before* the migration. Fixed with a community control so suppression must be **selective**; the note is kept in the test body.
- **A false negative in my own assertion.** The initplan-form regex rejected *correct* policy SQL, because Postgres re-renders wrapped sub-selects with an alias and inner parens (`( SELECT (auth.uid())::text AS uid)`). Caught by checking the assertion against the applied policy rather than trusting it.

**Conformance.** The inner-ring gate flagged `[core-to-domain] notify_notification_hint() CORE -> ds5_config (DS-5)` — an unclassified function defaults to CORE, and Core referencing a DS-5 table breaks the one-way rule. Classified DS-5 in `supabase/ownership.manifest.json` (correct on the manifest's own terms: DS-5 owns the routing layer above the vertical's delivery substrate). `ds5_config` added to the table map. Gate 6/6.

**Found, not caused:** the ownership manifest is inconsistent about trigger functions — only 1 of 5 DS-5 trigger functions on the live DB is listed, and the shared `ds5_emit_hint` helper is absent entirely. Recorded, not silently patched.

**Green:** 26/26 integration, conformance 6/6. The suite was blocked for part of the cycle by `TASK-INT-01` (the dev-DB ES256 fixture flake) — fenced found-not-caused with a control, and Supabase later confirmed an upstream Auth incident.

**Unrecorded:** per-test wall-clock at close.

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

  **How Supabase actually counts this (verified against the pricing docs, 2026-07-25 — it is not what "only online users get it" would suggest):**

  > *"A broadcast message counts as one message sent plus one message per subscribed client that receives it. For example, if you broadcast a message and 4 clients listen to it, it counts as 5 messages — 1 sent and 4 received."*

  Because ADR-U039 gives every member their own private topic, **the send is per recipient, not per announcement**. A platform-wide send is therefore billed at roughly `N sends + (online subscribers) receives` — **N is charged whether or not anyone is listening**. Concretely, at today's 1,274 FIMs with ~50 online: ~1,324 messages for one announcement, of which ~1,274 are sends to members who are not there to receive them.

  This **sharpens rather than changes** the default-off decision: the dominant cost tracks *headcount*, not concurrency, so "hardly anyone is online" is not a mitigation. Extrapolated, at 100k members one announcement is ~100k messages and ~20 per month exhausts the 2M free allowance.

  **Named forward optimisation (N-D, not built here):** a *shared* topic for platform-wide announcements would cost `1 send + one per listener` instead of one send each — a ~25x reduction at today's scale and far more later. It is legitimate for this one case because a platform announcement's content is identical for, and visible to, every member, so the per-member privacy rationale for private topics does not bind. It is out of scope for N-C: it changes the channel taxonomy, so it needs its own decision inside the ADR-U039 rails and belongs with N-D's dispatcher work (NB-5), which is where suppression and routing policy already live.
- **Write-path budget.** The trigger sits on the insert path of every notification, so its cost is paid by every writer including the fan-out loops. It must stay to a single indexed lookup (recipient → auth uid) plus one config read, and must add no per-row scan. A platform announcement inserting N rows must not become N × (a table scan).

Loading states and interaction classes are the consumer's concern — see FEAT-H032.
