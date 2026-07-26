# FEAT-PD016: Notification preference contracts & the shared suppression dispatcher

---
id: FEAT-PD016
title: Notification preference contracts & the shared suppression dispatcher
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A member has no way to say "stop sending me this." Every notification the platform
writes is delivered, unconditionally, to every recipient it names. NTF-10 is the
capability that closes this, and it is one of only two A-NTF rows the ported oracle
is **SILENT** on — there is no preferences table, column, seed, test or UI anywhere
(`phase-3-notifications-completion-plan.md:41`), so this is design, not port.

The gap is also a stated compliance obligation, not just a comfort one. V3 §7's
per-notification checklist carries the line *"Member preference can suppress this
notification (unless its category is lawfully compelled)"*
(`docs/verticals/notifications/SPECIFICATION.md:122`), and V3 grades a bypass in
trust terms rather than legal ones: *"Preference state is consent-adjacent member
state (V2); bypass is a consent violation in trust terms even when lawful"* (`:55`).
Today that checklist item cannot be ticked by any feature.

Two structural problems have to be solved together, which is why one feature covers
both:

1. **Where the state lives.** Four document lines disagreed — V3 §6 `:84` said
   Platform Core (PC-2), Hub §L3 `:288` said PC-4, and `communication.md` claimed
   DS-5 tables at `:44` while naming PC-2 at `:126`. Adjudicated at this
   decomposition (see below).
2. **Where the check happens.** V3 `:82` requires the check be applied
   **centrally** — *"applies preference/consent/suppression checks centrally"* — and
   `:55` names the detection mechanism as *"dispatcher-side preference enforcement
   (central, not per-emitter)"*. There are **~38 `INSERT INTO public.notifications`
   sites across 11 migrations** (the N-C substrate audit's count). Per-emitter
   enforcement would mean 38 edits and a permanent invitation to forget the 39th.

## Design record (the as-specified sketch, kept because it carries the adjudication)

### The preference home — adjudicated 2026-07-26 (board row ND-1)

**The table and the get/set contract are both DS-5's. Consent stays in Core,
untouched.** Full reasoning in
[`../../../planning/hub-v2/2026-07-26-ntf-n-d-preference-home-adjudication-and-board.md`](../../../planning/hub-v2/2026-07-26-ntf-n-d-preference-home-adjudication-and-board.md).
The three load-bearing points:

- A preference row must FK `notification_categories(key)` — a **DS-5-owned** table
  (`20260723120000_n_a_notification_registry_and_contracts.sql:35`). Homed in Core,
  that FK points **Core → Domain**, which `docs/platform/CLAUDE.md:38` forbids with a
  named failure mode: *"creates circular dependencies in SQL functions that PG17
  silently miscompiles."* Domain → Core is the legal direction, so a DS-5-homed table
  can still consult Core for consent; the reverse cannot.
- Every escape is worse: dropping the FK re-opens the free-text defect N-A closed
  (V3 `:42` — *"free-typed `type` means preferences cannot suppress by category
  yet"*); duplicating the catalog into Core drifts, and drift's failure mode is a
  muted category sending anyway.
- Preferences are **not** consent. V3 `:55` calls them "consent-**adjacent**";
  `communication.md:44` is explicit that "Consent state itself stays authoritative in
  Platform Core". G-34 already ruled preference data "current-state… **a different
  grain from the append-only consent ledger**".

**Correction carried into this spec:** the completion plan (`:77`) says N-D depends on
"IDN-7's preference-persistence pattern". It does not exist — IDN-7's realized half
(FEAT-PC006/PC007) is an *append-only consent ledger*, and its preference-shaped half
is **G-34: unbuilt**. What this feature reuses from IDN-7 is the **contract idiom**
(own-subject `SECURITY DEFINER`, typed refusals `22023/42501/28000`, own-rows-only
RLS, a private BFF route) — never the storage pattern. A mutable toggle does not want
an immutable history; copying the ledger would make every read a
`DISTINCT ON … ORDER BY created_at DESC` for no benefit.

### The substrate

**`notification_channels`** — an open registry, not an enum (the extensibility rule;
the `notification_kinds`/`conversation_kinds` reference-data precedent). `channel`
TEXT PK, `label`, **`delivers` BOOLEAN** — whether the channel actually reaches
anyone today — and `created_at`. Seeded `in_app` (`delivers = true`) and `email`
(`delivers = false`). The `delivers` flag is the honesty mechanism for board row
ND-3: V3 `:42`/`:133` records `lib/email/send.ts` as abstraction-realized /
delivery-simulated with **zero** email vendor in `package.json` (dual-method
verified). Storing the email dimension means preferences bind the day email goes
live; `delivers = false` is what stops the surface promising something it cannot do.

**`notification_preferences`** — `(recipient_group_id, category_key, channel)` PK,
`allowed BOOLEAN NOT NULL`, `updated_at`. `recipient_group_id` is a personal-group
id (P-O1 — every DS-5 actor column's shape, and the same column name
`public.notifications` already uses). FKs to `groups(id)`,
`notification_categories(key)`, `notification_channels(channel)`. RLS own-rows-only.

**Absence of a row means allowed.** The table stores *departures from default*, not
the full matrix. A fresh member has zero rows and receives everything; nothing needs
seeding per member, and adding a category later does not require a backfill.

**Two columns on `notification_categories`:**

- **`member_suppressible BOOLEAN NOT NULL DEFAULT true`** (board row ND-2). All six
  live categories are `lawful_basis = 'transactional'` (verified on the live DB), and
  V3 §7 `:122` lets preference suppress "unless its category is lawfully compelled".
  Read strictly, that would ship a preferences page with every switch disabled.
  `lawful_basis` is a **GDPR processing-basis** field, not a suppressibility field —
  conflating them would mean moving a legal field to unlock a UI toggle. This column
  carries suppressibility on its own axis. Seeded `false` for **`account`** only:
  those are the member's own participation/access-state notices, and muting them
  harms the member.
- **`nudge BOOLEAN NOT NULL DEFAULT true`** (board row ND-5) — the general
  per-category nudge switch N-C cut as gold-plating. It is near-free here because
  ND-2 already opens this table and ND-4 already builds the operator surface.

### The dispatcher

**`ds5_may_deliver(p_recipient_group_id uuid, p_kind text, p_channel text) → boolean`**
is the single decision point V3 `:82` asks for. Order: a category that is not
`member_suppressible` always delivers; otherwise the member's row decides; absent
row → allowed.

**`ds5_may_deliver` fails OPEN — and that is the opposite of N-C's nudge policy, deliberately.**
N-C chose fail-*quiet* for the hint because its failure mode was **cost** (a
misconfiguration producing a headcount-sized burst). Here the failure mode is a
**missed notification**, which is strictly worse than an unwanted one: an unwanted
notification is visible, reportable and recoverable, while a swallowed one is
invisible to the member and leaves no trace. So an unknown kind, an unregistered
channel, or an unreadable preference row all resolve to *deliver*. Different failure,
different default — stated here so the asymmetry with `notify_notification_hint`
reads as a decision rather than an inconsistency.

**`trg_ds5_apply_notification_preference`** — `BEFORE INSERT ON public.notifications`,
`RETURN NULL` when `ds5_may_deliver(NEW.recipient_group_id, NEW.type, 'in_app')` is
false. This is the NC-1 precedent applied to the write side: one trigger on the table
catches all ~38 writers **by construction**, including the PC-4-audited
`admin_send_notification`, and future contracts inherit suppression for free. For the
in-app channel the notification row *is* the delivery, so suppression means the row is
never written — which also means N-C's `AFTER INSERT` hint trigger never fires, so a
suppressed notification costs no realtime message either. No second mechanism needed.

`notify_notification_hint` gains the ND-5 per-category `nudge` check, keeping its
existing `ds5_config` platform-announcement path unchanged.

### The contracts

| Contract | Shape |
|---|---|
| `get_own_notification_preferences()` | The full categories × channels matrix with **effective** values resolved server-side, so the surface never has to know the defaults |
| `set_own_notification_preference(p_category_key, p_channel, p_allowed)` | Own-subject upsert; returns the updated row. Typed refusals: `22023` unknown category/channel · `42501` category is not `member_suppressible` · `28000` no FIM actor |
| `get_notification_nudge_policy()` | Admin read — the `ds5_config` rows plus each category's `nudge` |
| `set_notification_nudge_policy(p_key, p_value)` / `set_notification_category_nudge(p_category_key, p_nudge)` | Admin writes, `is_platform_admin()`-gated |
| `get_platform_announcement_reach()` | Admin read — the reachable-FIM count that makes board row ND-4's cost line a measured number rather than a warning |

Preferences join the `notifications` GDPR export section (the CB-6 posture PD013 set).

### The payload walk (mandatory at decomposition; recorded here)

Every field FEAT-H033 renders traces to a key, and every key to a consumer:

| Key in `get_own_notification_preferences()` | Consumer in FEAT-H033 |
|---|---|
| `category_key` | row identity, the `set` call's argument, E2E selectors |
| `category_label` | the visible row label — server-authored, never re-worded (the H030 law) |
| `interruption_grade` | the "how loud" hint beside the row (all `badge` in Ferd) |
| `member_suppressible` | renders the row as locked-on with a reason instead of a toggle |
| `channel`, `channel_label` | column identity + heading |
| `channel_delivers` | **decides whether the column renders at all** — `email` is stored, not shown (ND-3) |
| `allowed` | the toggle's checked state; optimistic flip + rollback |
| `updated_at` | absent by design — the surface shows current state, not history (that is the consent ledger's job, not this) |

Admin surface: `get_notification_nudge_policy()` → key/value/description/`nudge`
per category; `get_platform_announcement_reach()` → the integer in the cost line.
No unconsumed keys.

## Implementation notes

**Built 2026-07-26 (A-NTF Cycle N-D), migration `20260726120000_n_d_notification_preferences_and_dispatcher.sql`, PR #295 (held at the schema gate, merged on a named nod).** The design above shipped as written; what follows is what actually landed and what it cost.

**As built.** `notification_channels` (open registry; `in_app` delivering, `email` not) · `notification_preferences` (own-rows-only SELECT, **no client write policy at all**) · `member_suppressible` + `nudge` on `notification_categories` (`account` seeded non-suppressible) · `ds5_may_deliver()` · `trg_ds5_apply_notification_preference` (`BEFORE INSERT` on `public.notifications`) · `notify_notification_hint` re-created with the per-category nudge check, its `ds5_config` platform branch carried forward unchanged · member contracts `get_own_notification_preferences` / `set_own_notification_preference` / `get_own_notification_preferences_export` · operator contracts `get_notification_nudge_policy` / `set_notification_nudge_policy` / `set_notification_category_nudge` / `get_platform_announcement_reach`.

**One primitive was added that the design did not anticipate: `ds5_require_fim_subject()`.** The existing `ds5_require_fim_actor()` raises `42501` for both "no actor" and "Mist, not FIM" — but `set_own_notification_preference` also raises `42501` for "this category cannot be muted", and those two mean different things to a member (the Hub maps a policy refusal to 409 and an identity refusal to 403). Collapsing them would have left the surface unable to say which happened. So the identity refusal uses `28000`, and `42501` stays the policy refusal. Narrow helper, no change to the existing one.

**The rabbit hole that turned out not to exist.** The spec budgeted "one guard clause" for engagement-group-addressed rows. None was needed: preferences are keyed by `recipient_group_id`, an engagement group can own no preference rows, so absence-means-allowed already delivers them. Asserted anyway, so a future change that *adds* a special case fails a test.

**The export is additive, and that was a correction.** The first draft of the test asserted preferences inside `get_own_notifications_export()`. That contract is a shipped jsonb **array** composed into `get_own_data_export()` under `notifications` — reshaping it would have broken PC008's composite and FEAT-H010's download. **A payload-walk miss caught before the migration rather than after**, and precisely the sibling-breakage class `TASK-INT-02` had just diagnosed three times. Preferences got their own function.

**Red→green, honestly.** 21 red-first assertions + 3 labelled regression guards. Pre-apply: **exactly 21 failed, 3 passed** — the count reconciled with no green-at-red. Every suppression assertion is a **pair** (muted category + unmuted sibling in the same test), because "no notification arrived" is trivially true before a dispatcher exists; that is N-C's vacuous-test trap in a stronger form.

**The pair discipline earned its keep immediately.** The `admin_send_notification` pair initially passed its *muted* half for entirely the wrong reason: called as `service_role`, where `is_platform_admin()` is false, so the RPC was **refused rather than suppressed**. Only the failing "delivers when unmuted" half made the false green visible. Fixed with a real DeusEx operator fixture. Two further test-side errors, both mine: `target_user_ids` takes `users.id` while `TestUser.user` is the *auth* user (different id space — the RPC returned success with count 0), and the list contract's payload key is `kind`, not the column name `type`.

**One real migration bug, found by the tests.** `RETURNS TABLE` OUT parameters share the namespace with column references, so `ON CONFLICT (category_key, …)` was ambiguous (`42702`). Switched `set_own_notification_preference` to `RETURNS jsonb` and added the `DROP FUNCTION` that a return-type change requires, so the migration stays re-runnable.

**Two conformance gates failed on first sweep, both caused by this feature.** `notification_channels` and `notification_preferences` were unclassified in `supabase/ownership.manifest.json`, and `functionOwner()` defaults to `CORE`, so the two operator contracts read as CORE functions touching `ds5_config` (DS-5) — flagged `core-to-domain`. The functions were right; their classification was missing. Both tables are classified **DS-5**, and `notification_preferences` deliberately so rather than `vertical:notifications` like its FK siblings: `dsTables()` filters `/^DS-\d$/`, so a `vertical:` label would have made the table **invisible to that very gate**, and keeping Core out of this substrate is the entire point of ND-1. Classifying it DS-5 means a future Core function reaching in fails a test instead of passing unseen. Both entries carry the gate-review flag for the alternative. **Also closed a finding N-C filed and routed to the area gate**: the manifest listed only 1 of 5 DS-5 trigger functions and omitted `ds5_emit_hint` entirely — added, along with the three forum hint emitters.

**Verification.** Full integration sweep **690/690** (56 suites; the 666/55 baseline + exactly this feature's suite) · new suite **25/25** · notifications slice **79/79** · unit **982/982** · ownership-manifest + internal-API conformance **6/6** · route-policy conformance **5/5** · `next build` clean · E2E **89/89**.

**ADR-U038 direct-caller answer, tested rather than asserted in prose.** A member cannot INSERT, UPDATE or DELETE `notification_preferences` through PostgREST; a Mist (the anonymous session holding `authenticated`, the caller the S1/S2 holes were about) cannot either; `ds5_may_deliver` is unreachable from any client; `member_suppressible = false` outranks a row written behind the contract's back. All four are assertions, not comments.

**Deliberately not built** (unchanged from the No-gos): quiet hours, frequency caps, digest, email delivery, per-group overrides, the shared-topic optimisation, and any per-suppression log — the last because there is no telemetry sink yet (`TASK-OBS-01`), and a silent `RETURN NULL` is honest at this maturity rather than half-instrumented.

## No-gos

- **No quiet hours, no frequency caps, no digest batching** (board row ND-7; Eid+,
  NB-6). V3 §5 Q1's digest-by-default question resolves at that later design, not here.
- **No email delivery.** This ships the email *preference dimension*, not a sender.
- **No engagement-group-scoped overrides** ("mute this group's journey notifications").
  V3 §5 Q2 explicitly parks that half; the PK shape leaves room without committing.
- **No shared-topic optimisation** for platform announcements (board row ND-6 —
  deferred to Eid; the saving is currently zero because the nudge defaults off).
- **No breach-notice channel.** V3 §5 Q6's lawfully-compelled bypass has no category
  yet; `member_suppressible = false` is the mechanism it will use when it does.

## Stories

### STORY-1: The preference substrate and its open channel registry
As the platform, I want per-member, per-category, per-channel preference state with an
extensible channel registry, so that suppression is expressible without a schema change
per channel.

**Acceptance criteria:**
- Given the migration is applied, when `notification_channels` is read, then `in_app`
  (`delivers = true`) and `email` (`delivers = false`) are present, and the table has
  a SELECT policy for `authenticated` and no user-facing write policy (the
  reference-data posture).
- Given a member with no preference rows, when `get_own_notification_preferences()` is
  called, then every (category × channel) pair is returned with `allowed = true` —
  absence means allowed, and no per-member seeding exists.
- Given `notification_preferences`, when a row naming another member's personal group
  is selected as that member, then RLS returns nothing (own-rows-only).
- Given the six seeded categories, when `notification_categories` is read, then
  `member_suppressible` is `false` for `account` and `true` for the other five, and
  `nudge` defaults `true` for all six.
- Given a preference row, when its `category_key` or `channel` does not exist in its
  registry, then the INSERT is refused by FK — a preference cannot name a category the
  platform does not have.

### STORY-2: The shared dispatcher suppresses centrally, catching every writer
As a member, I want a category I muted to stop arriving, so that the platform respects
what I asked for however the notification was written.

**Acceptance criteria:**
- Given a member who set `allowed = false` for a suppressible category on `in_app`,
  when **any** path inserts a notification of a kind in that category — a delivery
  trigger, a contract, or `admin_send_notification` — then no row is written and their
  unread count does not change.
- Given the same member, when a notification of a **different** category is inserted,
  then it is written normally — suppression is selective, not global (the N-C
  vacuous-test lesson: the control must prove selectivity).
- Given a suppressed insert, when `realtime.messages` is checked for the member's
  `account:<auth_uid>:notifications` topic, then no hint was emitted — a suppressed
  notification costs no realtime message.
- Given a member who muted the `account` category by direct row insert (bypassing the
  contract), when an `account`-category notification is inserted, then it is **still
  delivered** — `member_suppressible = false` outranks a stored preference.
- Given a notification whose `type` is not in `notification_kinds`, or whose
  `recipient_group_id` names an engagement group rather than a personal group, when it
  is inserted, then it is delivered — `ds5_may_deliver` fails open.

### STORY-3: A member reads and sets their own preferences
As a member, I want to read and change my notification preferences, so that I control
what reaches me.

**Acceptance criteria:**
- Given an authenticated FIM, when `set_own_notification_preference('membership',
  'in_app', false)` is called, then the row is upserted against *their own* personal
  group and the updated row is returned; calling it again with `true` flips it back
  (idempotent upsert, no duplicate rows).
- Given an unknown category or channel, when `set_own_notification_preference` is
  called, then it raises `22023`.
- Given the `account` category (`member_suppressible = false`), when a member tries to
  set it `false`, then it raises `42501` — refused with a reason, not silently ignored.
- Given a Mist (no FIM actor), when either contract is called, then it raises `28000`.
- Given a member with preference rows, when `get_own_notifications_export()` is called,
  then their preferences appear as a section of the export (GDPR right of access).

### STORY-4: The operator nudge policy is readable, settable, and priced
As a platform operator, I want to see and change the nudge policy with its cost in
front of me, so that turning on a platform-wide nudge is an informed decision.

**Acceptance criteria:**
- Given a platform admin, when `get_notification_nudge_policy()` is called, then the
  `ds5_config` rows (including `realtime_hint_platform_announcements`, seeded
  `'false'`) and each category's `nudge` value are returned.
- Given a non-admin, when any nudge-policy write is called, then it is refused
  (`42501`) — `ds5_config` has RLS with no policies, so the contract is the only door.
- Given a platform admin, when `get_platform_announcement_reach()` is called, then it
  returns the count of reachable FIM recipients — the number ADR-U039:46's fan-out
  budget is discharged against (857 delivery rows against a 1,274 population at the
  N-C measurement).
- Given a category with `nudge = false`, when a notification in it is inserted, then
  the row is written but **no realtime hint is emitted** — the nudge switch changes
  loudness, never delivery.
- Given `realtime_hint_platform_announcements = 'true'`, when a platform-scoped
  announcement is inserted, then hints emit; set back to `'false'`, they do not (the
  N-C policy still holds, now operator-visible).

## Platform dependencies

- **DS-5 (own):** `notification_categories` / `notification_kinds` (FEAT-PD013),
  `public.notifications`, `ds5_emit_hint` + `notify_notification_hint` (FEAT-PD015),
  `ds5_config` (FEAT-PD015), `ds5_require_fim_actor`.
- **PC-3 Organisation:** `groups(id)` as the FK target for `recipient_group_id`; the
  personal-group actor primitive (P-O1).
- **PC-4 Governance:** `is_platform_admin()` for the operator contracts.
- **PC-1 Infrastructure:** RLS + `SECURITY DEFINER` / `search_path = ''` discipline.
- **Consent is consumed, never re-homed:** `consent_records` / `consent_purposes` stay
  PC-2-owned with the PC-4 contract in front (ADR-U034, G-35).

## Cross-product impact

The Gimbal inherits suppression for free — enforcement is in the substrate, not a
surface, so any client that writes or reads notifications is already covered. The
`notification_channels` registry is where a Gimbal-specific channel (push) is added by
data, not DDL, when the equipment frame gains it (ADR-U025).

## Vertical impact

- **Privacy/GDPR:** Preference rows are personal data — own-rows-only RLS, included in
  the member's export (right of access), and erased with the personal group's cascade.
  They are **preference, not consent**: consent stays authoritative in Core
  (ADR-U034), and this feature never writes to `consent_records`. Suppression *reduces*
  data movement, since a suppressed notification is never written at all.
- **Notifications:** This *is* the vertical's central preference obligation (V3 §6
  `:82`, `:84`, `:108`) and the mechanism that lets V3 §7's checklist line be ticked
  for the first time. `member_suppressible = false` is the seat for the
  lawfully-compelled bypass V3 §5 Q6 will need.
- **Administration:** Two new operator surfaces (nudge policy + per-category nudge),
  both `is_platform_admin()`-gated. The lifecycle cascade is unchanged: preferences
  ride the personal group's existing erasure path, so no new ADR-U016 cascade clause.
- **Observability:** Every contract call emits a content-free structured event
  (category and channel keys are reference data, not content). Suppression itself is
  deliberately **not** logged per-event — there is no sink (`TASK-OBS-01`), and a
  silent `RETURN NULL` is honest at this maturity rather than half-instrumented. The
  admin writes are recorded as operator acts.
- **Transactions:** None.
- **Extensibility:** `notification_channels` is an open registry (channels added by
  data). `member_suppressible` and `nudge` are booleans on an existing open registry.
  No enum, no CHECK-list, no sealed set is introduced; the one CHECK in the area
  (`lawful_basis`) is deliberately untouched because it is a legal dichotomy, not a
  kind set.

## Performance budget

N/A (no surface) — platform contracts only. Two notes the consuming surface inherits:

- **The suppression check is on the write path of every notification.** It resolves in
  one indexed PK lookup against a table that holds only departures-from-default, plus
  one already-cached category read. No fan-out, no per-recipient loop.
- `get_own_notification_preferences()` returns the categories × channels matrix
  (12 rows at Ferd's registry size) in one round trip, so FEAT-H033's surface is a
  single justified standalone read per ADR-U042.
