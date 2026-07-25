# A-NTF N-C — substrate audit at decomposition (2026-07-25)

**Purpose:** disk-anchored verification of N-C's planned scope before the paired specs are authored.
Read order per the `ecosystem-decomposition` cumulative-forward discipline (A#8): migrations earliest → latest, plus `supabase/seeds/`.
**Verdict: three of N-C's four planned build items are already realized. The cycle is materially smaller than the completion plan assumes, and one planned item is already shipping.**

---

## 1. The realtime substrate N-C was going to build already exists

A-COM Cycle C-C (FEAT-PD010 / FEAT-H027) generalized the PC009 session-channel pattern into shared substrate on **both** sides.

**Platform side — `supabase/migrations/20260720153000_c_c_realtime_hint_emission.sql`:**

| Anchor | What it is |
|---|---|
| `:91` | `public.ds5_emit_hint(p_payload JSONB, p_event TEXT, p_topic TEXT) RETURNS void` — the one thin, **non-fatal** emit helper wrapping `realtime.send(..., private => TRUE)` |
| `:111` | `REVOKE ALL ... FROM PUBLIC, anon, authenticated` — emit is elevation-only; no client can send |
| `:44` | Records the C-C Q2 ruling: **ONE shared thin helper, not inline `realtime.send`** at each site |
| `:221`, `:236` | Two `realtime.messages` FOR SELECT receive policies: `ds5_conversations_receive_own` (`account:<uid>:conversations`, "byte-for-byte the session-channel shape") and `ds5_forum_receive_member` (membership-gated group topic) |

Prior art: `20260703154102_feat_pc009_session_contracts.sql:130` (first `realtime.send`), `:161-168` (`session_signal_receive_own`), re-issued at `20260704075549_perf_p3a_fk_indexes_initplan.sql:39-44` with the `(select ...)` initplan wrapping — **N-C's new policy must follow the wrapped form, not the original.**

**Hub side — `hub/lib/realtime/manager.ts` (FEAT-H027, TASK-CC-03):** the ADR-U039 channel manager. Its own docstring names A-NTF as the next tenant:

> *"Registration is the extension surface: the notification bell joins at A-NTF by calling `registerTenant`, with no manager edit (STORY-1)."*

It already provides everything NTF-9's Hub half needs:
- one shared socket, private topics, `realtime.setAuth(access_token)`, one subscription per armed topic, idempotent across remounts (`:145`)
- **`onStatus?: (status: TenantStatus, rejoin: () => void)`** with `'subscribed' | 'reconnecting' | 'closed'` — *"so a comm surface can reconcile (STORY-6)"*. **This is the reconnect-reconciliation hook NTF-9 needs; it exists.**
- teardown on sign-out / identity change; the FIM+session arming rule
- content-free telemetry (topic **kind**, never the uid-bearing string)

Hook precedent: `hub/lib/realtime/use-comm-channel.ts`. Conformance: `hub/tests/helpers/outer-ring.ts:10,27` — `.channel(...)` is permitted in the outer ring, `.from(...)` / `.rpc(...)` are not.

**Consequence:** N-C builds **no** emit helper and **no** client channel abstraction. Platform adds one receive policy + emit call(s); the Hub registers one tenant.

## 2. NB-3 (announcement in-app adapter) is ALREADY REALIZED — nothing to build

The completion plan lists "render the announcement `announcement`-type delivery rows in the bell/inbox (U049 §8 Q1 in-app adapter — NB-3)" as N-C build work. It is already shipping. The full chain verifies end-to-end:

1. **Rows fan out at send time.** `20260720200000_c_d_announcements_window_reports_contracts.sql:237-238` (community → `gm.member_group_id`, active members, author excluded) and `:300-301` (platform → `u.personal_group_id`, `is_temporary = false AND is_decommissioned = false`, author excluded). Payload: `{announcement_id, scope_kind, scope_group_id, sent_by_group_id}`.
2. **The body is populated, not NULL.** The initial fan-out inserted `body = NULL`; the C-D rider `20260720203000_c_d_rider_delivery_row_body.sql` corrected it — `public.notifications.body` is `NOT NULL` and the flip-green run caught the `23502`. The rider header states the intent explicitly: *"the delivery row is what the A-NTF bell will render as a notification, exactly like `journey_completed` rows."* **Carried-forward premise corrected: delivery rows are not content-light pointers.**
3. **The kind is registered and FK-valid.** `20260723120000_n_a_notification_registry_and_contracts.sql:78-98` seeds `('announcement', 'platform', 'Announcement (ADR-U049 delivery row)')` among 19 kinds under 6 categories. So `announcement` rows pass the N-A `notifications.type` FK and `get_own_notifications` returns them with `category: 'platform'` (the `notification_kinds` join at `:151`).
4. **The surface already renders them.** `hub/components/notifications/NotificationItem.tsx` is kind-agnostic by construction — `:39` `CATEGORY_ICON[row.category] ?? Bell` (safe fallback for any unrecognised category), `:71` renders `row.body`.

**Consequence: NB-3 becomes a verify-and-record item (an adversarial proof + spec recording), not a build item** — the same shape NB-8 already has. The U049 §8 Q1 adapter-ownership question still needs its recorded answer, but the code exists.

## 3. There is NO trigger on `public.notifications` — the emit site is the cycle's real decision

Verified zero hits for a trigger on `public.notifications`. Delivery triggers live on **source** tables and insert *into* `notifications` (e.g. `notify_invitation_received` on `group_memberships`, re-issued at `20260724120000_n_b_actionable_notification_dispatch.sql:111`).

`INSERT INTO public.notifications` appears at **~38 sites across 11 migrations**:

| Migration | Sites |
|---|---|
| `20260222000000_rebuild_universal_group_pattern.sql` | 9 |
| `20260223164813_fix_test_regressions.sql` | 1 |
| `20260223171200_fix_rc7_admin_user_ops.sql` | 5 |
| `20260228120745_sprint2_leave_group_core.sql` | 3 |
| `20260228125730_sprint3_smart_notifications.sql` | 5 |
| `20260228144747_sprint4_platform_exit.sql` | 3 |
| `20260720200000_c_d_announcements_window_reports_contracts.sql` | 2 |
| `20260720203000_c_d_rider_delivery_row_body.sql` | 2 |
| `20260721161500_c_f_account_lifecycle_self_service.sql` | 3 |
| `20260721170000_c_f_repair_delete_scrub_nickname.sql` | 3 |
| `20260724120000_n_b_actionable_notification_dispatch.sql` | 2 |

So "the insert trigger emits a hint" (ADR-U039:31) has no single site to attach to. This is decision **NC-1** below — and it is the one choice that shapes the migration.

## 4. `supabase_realtime` — `notifications` is the last table in it (NB-7 confirmed)

Cumulative-forward trace:
- `20260221000000_drop_old_schema.sql:20-23` — drops all tables from the publication
- `20260222000000_rebuild_universal_group_pattern.sql:2020-2022` — re-adds `direct_messages`, `conversations`, `notifications`
- `20260223164813_fix_test_regressions.sql:114-138` — conditionally re-adds all three (RC8)
- `20260719230500_c_a_conversation_model_and_contracts.sql:180-189` — C-A drops `conversations`, `messages`, `direct_messages`

**`notifications` was never dropped.** It is the sole remaining member, so NB-7's DROP does empty the publication exactly as the plan states. The exit-checklist item ("publication verified empty on the live DB") is reachable in this cycle.

## 5. The orphaned nominations chain is fully dead — and one name in the carried note was wrong

The N-B rider said "`fetchMyNominations` has no production caller left." Confirmed dead, but the chain is longer than one function, and `fetchMyNominations` is the **consumer**, not the bundle-side name.

| Anchor | Role | State |
|---|---|---|
| `hub/app/api/me/overview/route.ts:8,84,125-128,142,149` | bundle computes the `nominations` slice via `fetchPendingNominations` on every `/groups` first paint | **live, wasteful** |
| `hub/lib/me/overview-client.ts:30,80` | `adoptMyNominationsRead(slice(bundle, 'nominations'))` | **live** — still adopting |
| `hub/lib/groups/client.ts:536-542` | `adoptMyNominationsRead` stores into `adoptedNominations`; note the deliberate `guarded.catch(() => {})` — *"may go unconsumed; never unhandled"* | live, stores |
| `hub/lib/groups/client.ts:~547` | `fetchMyNominations()` — the consume-once getter, doc-labelled *"STORY-2 read ... (A-NTF seam)"* | **ZERO callers** |
| `hub/lib/groups/client.ts:529` | `requestMyNominations()` → `/api/me/nominations` (standalone fallback) | reachable only via the dead getter |
| `hub/app/api/me/nominations/route.ts` | standalone route, owned by **FEAT-H017 (MEM-7 STORY-2)** — not by A-NTF | live contract, no Hub caller |

The waste is confirmed: bundle computes → client adopts → nothing ever consumes. The `guarded.catch(() => {})` is why it fails silently rather than surfacing as an unhandled rejection.

**Two live comments point at this seam and must be reconciled in the same pass:** `hub/app/groups/page.tsx:88` (marks where `PendingNominations` was retired) and `hub/components/notifications/NotificationItem.tsx:42` (references "the window the retired PendingNominations section used to show").

**Ownership note:** `/api/me/nominations` belongs to FEAT-H017, and ADR-U042 guardrail 3 states *"the standalone routes remain canonical; the Hub may drop this bundle at any time."* Retiring the **slice** is squarely N-C's rider. Retiring the **route** crosses feature ownership and cuts against that guardrail — see decision NC-4.

## 6. Doctrine housekeeping surfaced

**ADR-U039 is still `Status: Proposed` (`:3`, dated 2026-07-03)** while three cycles have now realized it — PC009 (sessions), C-C (conversations + forum), and N-C next. Its §31 also carries the now-void rationale *"`public.notifications` remaining in the `supabase_realtime` publication serves the legacy app only, until Phase-4 cutover"*, which NB-7 early-executes. Moving it to **Accepted** and reconciling §31 is an ADR change — a fuller-auto carve-out, held for the nod, not folded into the build silently.

**Hub `SPECIFICATION.md` §L2 §4 already names the channel** (`:99`): *"the notification-bell channel `account:<auth_uid>:notifications` (forward-looking; A-NTF's tenant)"*, and `:38` marks it forward-looking. N-C flips both to realized — the ADR-U039:33 obligation. `:143` already promises *"Realtime channel disconnect → DM and notification UIs surface a reconnecting state"*, which binds the Hub half's degradation AC.

---

## 7. Live-database verification (read-only, `FringeIslandDB`, 2026-07-25)

Sections 1-6 were derived from migrations on disk. Because the audit's central claim — that NB-3 needs no build — *shrinks a cycle*, it was then verified against the live dev database rather than planned on inference. Every claim held.

| Check | Result |
|---|---|
| `announcement` registered kind | `announcement -> category=platform, grade=badge, basis=transactional` |
| `notification_categories` columns | `key, label, lawful_basis, interruption_grade, created_at` — **`interruption_grade` is real**, and is the existing per-category "how loud" field |
| All six categories' live grades | `account, group-lifecycle, journeys, membership, platform, stewardship` — **all `badge`** |
| `notifications` nullability | `body=NO, payload=NO, title=NO, type=NO` — body is NOT NULL, confirming the C-D rider's account |
| Deployed announcement senders | both `send_community_announcement` and `send_platform_announcement` **insert BODY** — the rider is live in the DB, not merely on disk |
| `get_own_notifications` | joins `notification_kinds` → returns `category` |
| `supabase_realtime` publication | **`public.notifications` only** — sole member, exactly as section 4 traced |
| `realtime.messages` policies | `ds5_conversations_receive_own, ds5_forum_receive_member, session_signal_receive_own` — three; N-C adds the fourth |
| `ds5_emit_hint` | deployed as `(p_payload jsonb, p_event text, p_topic text)` |
| Triggers on `public.notifications` | **NONE** — confirms section 3's finding on the live DB, not just in migrations |
| Announcement delivery rows | 5,501 rows, **all 5,501 with a non-null body** |
| Existing settings/config home | `pc2_config` (`key, value, description, updated_at`) — sole row `mist_inactivity_ttl = '72 hours'`, self-documented as *"Changeable without altering `reap_expired_mists()`"* |

**NB-3 is confirmed realized end-to-end on the live database.** The claim is proven, not inferred.

### The fan-out budget, measured — and a correction

ADR-U039:46 requires this area to budget realtime volume. The live data gives a real number, and correcting an initial misreading of it matters:

- 5,501 announcement delivery rows exist, but they come from **28 distinct `announcement_id`s**, not one send. Per-announcement counts: `857, 828, 828, 789, 743, 742, 693, … 1`.
- **The largest single send fanned out to 857 recipients.** That send was **community**-scoped, not platform-wide.
- Reachable FIM population (`is_temporary = false AND is_decommissioned = false`): **1,274**. A platform-wide send reaches all of them.

So one nudge per recipient means the largest *community* announcement observed would emit 857 messages, and a platform-wide send would emit ~1,274 today — growing linearly with membership. Against the plan allowance (2M/month free, 5M Pro) that is comfortable at present scale and is the one path that scales with headcount rather than activity. This is the arithmetic behind the NC-1 decision below.

*(Incidental observation, not a finding for this cycle: only **1** of those 28 announcements still has its `announcements` row — test teardown removes the home row but leaves delivery rows behind. That is test-fixture residue in a dev database, not a production data-integrity issue, and no production path deletes an announcement. Noted so a future reader does not mistake it for orphan-cascade evidence.)*

## Decisions settled at this decomposition (Stefan, 2026-07-25)

| # | Question | Settled |
|---|---|---|
| NC-1 | Where does the hint emit from, given ~38 insert sites and no trigger? | **One `AFTER INSERT` trigger on `public.notifications`**, calling the existing `ds5_emit_hint`. One site catches every writer, legacy and future. Row-level, not statement-level: both emit the same message count (each recipient needs their own private topic), so granularity is not the volume lever. |
| NC-2 | Should a platform-wide announcement nudge every member? | **No, by default — and it is an operator toggle, not a hardcoded rule.** Stated as data (`ds5_config`, following the `pc2_config` pattern) seeded `realtime_hint_platform_announcements = 'false'`. Community-scoped announcements *do* nudge. Rationale: nobody waits on a platform announcement, and it is the only path whose cost scales with headcount. |
| NC-2a | Where does the toggle's admin UI live? | **N-D**, with the preferences UI and the shared dispatcher that already owns suppression (NB-5). N-C ships the setting and the lookup; no admin surface. The general per-category nudge switch is also N-D's — explicitly *not* built here (it was gold-plating). |
| NC-3 | NB-3 announcement in-app adapter | **Already realized; downgraded from build to verify-and-record** (the NB-8 shape). Verified live. The U049 §8 Q1 adapter-ownership question still needs its recorded answer. |
| NC-5 | Which surfaces subscribe? | **One tenant.** The bell in `AppShell` is the single subscriber; `/notifications` reconciles through the same shared context. The manager already guarantees one channel per topic. |

**Open, defaulted conservatively, flagged for Stefan:**

| # | Question | Default taken |
|---|---|---|
| NC-4 | How deep does the nominations rider cut? | **Slice + adoption + dead `client.ts` trio removed; `/api/me/nominations` left intact.** Put to Stefan, unanswered. The route is FEAT-H017-owned and ADR-U042 guardrail 3 keeps standalone routes canonical, so retiring it from an A-NTF cycle would edit another feature's spec from outside its ownership. Filed as a follow-up against FEAT-H017 instead. Reversible if Stefan prefers the deeper cut. |
| NC-6 | ADR-U039 is still `Status: Proposed` after three realizations, and its §31 rationale is now void | **ADR left untouched.** Put to Stefan, unanswered. ADR edits are a fuller-auto carve-out. N-C records the §31 supersession in FEAT-PD015; the promotion to Accepted waits for an explicit call (naturally at the area gate, which already carries the NB-7 disposition). |

## What N-C actually is, after this audit

| Planned item | Audited state | N-C work |
|---|---|---|
| Ping-then-fetch realtime hint | helper + client manager exist | one RLS receive policy + emit call(s) + register one tenant |
| Reconnect reconciliation | `onStatus`/`rejoin` hook exists; **no server primitive and no tests** | the genuinely-new work — reconcile-on-reconnect/visibility + fresh tests (the SILENT oracle row) |
| Announcement in-app adapter (NB-3) | **already shipping end-to-end** | verify-and-record only; answer the §8 Q1 ownership question |
| Drop `notifications` from `supabase_realtime` (NB-7) | sole remaining member | one DROP; publication ends empty |
| Nominations slice rider | chain confirmed dead | drop slice + adoption + dead trio; NC-4 decides the route |

Reconnect reconciliation is the cycle's real content. The rest is wiring, one DROP, and recording.
