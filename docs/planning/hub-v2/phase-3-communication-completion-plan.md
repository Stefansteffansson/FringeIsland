# Phase 3 — Communication (A-COM) completion plan

**Status:** v5 (2026-07-20) — C-D **BUILT** (ADR-U049 realized; FEAT-PD011/FEAT-H028 `6-done`; bridge `../sessions/2026-07-20_05_-_CYCLE-C-D-BUILT-ANNOUNCEMENTS-WINDOW-REPORTS.md`). **C-E board SETTLED 2026-07-20** (presented whole, recommendations adopted; **D2 = preserve-and-seal, Option A**): CB-6 firmed (right-of-access via ungated export-contract actor resolution — the core helper untouched); the C-D scrub due decided (retain-under-legitimate-interest for Ferd, mechanics → A-ADM); reporter's-own-reports join the export (snapshot included); CB-1 reframed **verify-and-record** (Mists structurally excluded by `ds5_require_fim_actor()` on every write door — nothing to ephemeralize); no new ADR (decisions recorded in FEAT-PC008/PD011/PD012 + the DS-5 spec). **FEAT-PD012 decomposed to 4-ready** — the area's first surface-neutral cycle (no paired FEAT-H). Next: C-E build (red suites → schema gate → flip-green → close). Prior status (v4): v4 (2026-07-20) — board SETTLED 2026-07-19 (recommendations adopted CB-1/2/3/4/5/6/8/9; **CB-7 overridden — group conversations in scope, built in C-A**). **Cycle C-A BUILT** (PRs #199–#204; migrations `20260719230500` + rider `20260720003000` applied at named gates): FEAT-PD008 `6-done`; FEAT-H025 complete and swept (unit 736 · integration 21/21 comm · E2E 68/68 fleet) — held at `5-in-cycle` on exactly one DoD item, the **deep-cold spot check of `/messages` on production** (ADR-U043 Amendment 1). Discovered at build, now named dues: the `admin_hard_delete_user`→`forum_posts` core crossing (C-B: relocate to `ds5_lifecycle_*`, then `forum_posts` joins `DS_TABLES`) and the widened D2 scope (C-E handlers must disposition group-kind conversations alongside forum content). Superseded progress (v4): C-B and C-C **BUILT** — live state lives in the session bridges (latest `../sessions/2026-07-20_04_-_CYCLE-C-C-BUILT-REALTIME-LIVE.md`: realtime live on both surfaces, FEAT-PD010/FEAT-H027 `6-done`). **C-D design session EXECUTED 2026-07-20 → ADR-U049 accepted** (CB-2 firmed; see the board and Design-sessions notes below). Next: C-D decomposition (COM-8/9/12/13) → build.
**Provenance:** four-scout terrain sweep 2026-07-19 (platform/DS-5 · substrate · surface/oracle · seams-and-dues), load-bearing facts disk-verified. Canonical-wins flags are folded in below where a source disagreed.

---

## Where this picks up

Journeys (A-JRN) closed 2026-07-19 (gate PASSED — bridge `../sessions/2026-07-19_01_-_J-O3-AREA-GATE-EXECUTED-PASSED-JOURNEYS-CLOSED.md`); Cycle COR-A executed and closed the same day (bridge `_02`). A-COM is the first area that starts on the corrected Internal-API pattern, inheriting from day one:

- **ADR-U047** — core emits facts, DS owns dispositions: pc014's `pending-DS-5` tags are realised as **`ds5_lifecycle_*` handlers** (ADR-U047 §consequences; the rename is recorded only in U047 + the COR-A retro, *not* in FEAT-PC014 — this area carries it).
- **ADR-U048** — `public.notifications` + delivery mechanics are the **Notifications-vertical delivery substrate**; DS-5 owns only the **routing layer above** (preferences, digest/aggregation, fan-out). The delivery table does not move; writes to it from any tier are obligation-fulfilment, not crossings.
- **ADR-U039** — v2 real-time is **ping-then-fetch + private broadcast channels + hint-not-authority**. The DS-5 spec (`docs/platform/domain/communication.md`, 2026-06-10, status `proposed`) still commits to `postgres_changes` (§3/§6/§8 Q7) — **U039 is newer and wins**; a spec amendment rides Cycle C-A (PROCESS §9: the spec yields).
- **The conformance gate** (`hub/tests/integration/platform/internal-api-conformance.test.ts`) — the `/^ds\d+_lifecycle_/` auto-allow already covers `ds5_lifecycle_*`; the table side does **not** anticipate DS-5: `DS_TABLES` must gain `conversations` / `direct_messages` / `forum_posts` (+ any new comm tables) and `DS_OWNED_ALLOWLIST` must gain DS-5's functions when the contract layer lands. `notifications` stays out by design (U048).
- **W12** — per-RPC gate verification is in the Phase-3 area-gate DoD from this area onward.

**Dues at area open** (Journeys-close bridge, corrected by this sweep):
1. **DS-5 realised** — the area's core work.
2. **MEM-9 un-seams** — former-member attribution, blocked at Groups on "no member-visible authored content in v2 yet" (`phase-3-groups-completion-plan.md` D2/§101); renders via COM-14. FEAT-H016/H017 carry `pending-DS-5 per D2` notes to clear.
3. **D2 comes due** — MEM-8 `close_group` / GRP-9 `delete_group` forum dispositions, today tagged-not-built in FEAT-PC014 (§42/§44), execute as `ds5_lifecycle_*`. **D4 does *not* come due here** — verified against the Groups plan §85: MEM-2 email dispatch is a V3 seam landing at A-NTF; the bridge's "D2/D4" label was imprecise.
4. **IDN-10 un-parks** (Identity Cycle F) — with a catch: **the parked exit/deletion specs were never authored** (disk-verified; two of four hooks never planted per `retro-2026-07-03.md` §37). Cycle F starts at L4 authoring, not at un-park. See board CB-5.

## Substrate audit at kickoff (full depth, verified 2026-07-19)

All comm substrate born whole in the D15 rebuild (`20260222000000_rebuild_universal_group_pattern.sql`); no post-rebuild ALTERs; all four tables RLS'd and tagged **Conformant** by the Phase-1 audit.

| Object | State | Notes |
|---|---|---|
| `conversations` | HAVE | strictly 1-to-1 personal-group pairs (`UNIQUE(p1,p2)`, `p1<p2`); per-participant `last_read_at` = read-state; `can_update_conversation()` guards own-side-only advance |
| `direct_messages` | HAVE | immutable — **no UPDATE/DELETE policy at all**; `sender_group_id` ON DELETE SET NULL |
| `forum_posts` | HAVE | flat 2-level threading trigger-enforced (`enforce_flat_threading`); soft-delete `is_deleted`; edit-own with **no time window**; no DELETE policy |
| `notifications` | HAVE (V3 substrate) | delivery substrate per U048 — not a DS-5 table; audit's column list (`action_type`/`expires_at`…) does not match the cumulative state — audit note stale, flagged |
| Permissions (seeds) | HAVE | `view_forum`, `post_forum_messages`, `reply_to_messages`, `moderate_forum`, `send_direct_messages` (`01_permissions.sql` §47-51) |
| Realtime | LEGACY SHAPE | DMs/conversations/notifications in `supabase_realtime` publication (postgres_changes — the shape U039 retired); `forum_posts` unpublished; only v2 precedent = private-broadcast session-signal channel (`session-guard.ts` §100, `realtime.messages` RLS §20260703154102) |
| Lifecycle precedent | HAVE | four `ds3_lifecycle_*` handlers in `20260719190205` — the exact template (SECURITY DEFINER, `search_path=''`, reason-param validation, REVOKE from public/anon/authenticated) |
| Export precedent | HAVE | `get_own_data_export()` composes DS sections in place (`20260719201718`); DS-5 adds `get_own_messages_export()`; inherits the **suspended-member 42501 asymmetry** (FEAT-PC008 §155 open question) |
| Announcements (1→many, 1→all) | NONE | no table, no shape — the area's genuinely new design |
| Content reports | NONE | no reports/flags table; moderation is soft-delete only, no reason/audit trail |
| Forum read-state / reconciliation | PARTIAL | DM unread via `last_read_at`; nothing for forum |

**Oracle (behaviour-inventory §140-148, §187): STRONG for A-COM.** B-MSG-001..006 + B-COMM-004..007 live in `hub-legacy/tests/integration/communication/`; the spine (group-keyed authorship, anti-impersonation RLS, flat threading, **DMs create no notifications** — unread = Messages badge + `last_read_at`) ports byte-for-byte. **Two silences, design-not-port:** former-member attribution and real-time push (v1 only ever polled).

## The 16 capabilities + area dues (from §L3, with cycle; COM-15 added at board settle per CB-7)

| Row | Capability (compressed) | Substrate | Oracle | Cycle |
|---|---|---|---|---|
| COM-1 | Send DM to another FIM | HAVE | STRONG | C-A |
| COM-2 | Conversation inbox | HAVE | STRONG | C-A |
| COM-3 | Conversation detail, chronological | HAVE | STRONG | C-A |
| COM-4 | Per-conversation read state | HAVE | STRONG | C-A |
| COM-5 | Group forum surface | HAVE | STRONG | C-B |
| COM-6a | Top-level forum post (role-gated) | HAVE | STRONG | C-B |
| COM-6b | Reply (role-gated, flat) | HAVE | STRONG | C-B |
| COM-7 | Moderate forum (Steward) | PARTIAL | STRONG | C-B |
| COM-14 | Former-member attribution (+ **MEM-9 un-seam**) | HAVE | SILENT | C-B |
| COM-10 | Real-time updates (messages, forum, activity) | REBUILD (U039) | SILENT | C-C |
| COM-11 | Reconcile missed updates on reconnect | PARTIAL | SILENT | C-C |
| COM-8 | Steward announcement 1→many | NONE | — | C-D |
| COM-9 | Platform-wide admin announcement 1→all | NONE | PARTIAL (B-ADMIN-011/015 adjacent) | C-D |
| COM-12 | Edit/delete own within window | PARTIAL | PARTIAL | C-D |
| COM-13 | Content report submission | NONE | NONE | C-D |
| COM-15 | Group conversations — create/join/leave, message, per-participant read-state (CB-7, added at board settle) | REDESIGN (1-to-1 → participants model) | NONE | C-A |
| due | `ds5_lifecycle_*` for D2 (close/delete-group forum disposition) + Mist ephemerality + `get_own_messages_export()` | template HAVE | — | C-E |
| due | IDN-10 self-service exit/deletion (**Identity Cycle F** — specs must be authored first) | freeze half done (DS-3) | — | C-F |

**DS-5 realisation is partial by design:** this area realises Conversations/DM, Forums, Lifecycle & retention, and the routing sliver of Notification routing. Feeds & social surfaces and Attachments stay forward (A-NTF / A-DIS / later); the DS-5 feature-inventory summary records that split honestly.

## The cycle sequence (foundation-first, paired-platform-first)

- **C-A — Conversations core (DM + group, CB-7).** FEAT-PD008 (first DS-5 spec: conversation + message contracts; **conversation-model redesign** — participants junction with per-participant read-state, data-driven conversation kinds `dm`/`group`, open/join/leave semantics per the DS-5 spec's own lifecycle capability; write-narrowing) ↔ FEAT-H025 (Messages surface: inbox, detail, compose, read-state, badge, group-conversation create/join/leave). Riders: conformance-gate `DS_TABLES`/allowlist edit on the first DS-5 migration; DS-5 spec U039 amendment; disposition of the legacy `postgres_changes` publications; §8 Q8 firms here (conversation kinds vs forum — one registry). Data-preserving migration: each existing 1-to-1 row emits its two participant rows carrying `last_read_at`.
- **C-B — Forum + attribution.** Forum contracts + moderation ↔ forum surface; COM-14 renders MEM-9's attribution (ADR-U021; `'Unknown'` fallback per DS-5 §8 Q3; label per CB-9); clears the H016/H017 pending notes.
- **C-C — Real-time + reconciliation.** Ping-then-fetch over private broadcast per U039 for DM/forum/badge; reconnect reconciliation (COM-11); channel taxonomy fixed at decomposition inside U039 rails (Q7's filter-never-substitutes-for-policy). Conventions shaped so A-NTF joins the same substrate next area (§L3 §348).
- **C-D — Announcements, windows, reports.** New substrate per the design session (U048 split: DS-5-owned durable home + routing; delivery rows via V3 substrate); COM-12 window per CB-3; COM-13 submission + durable store with the moderation-queue *surface* forward-seamed to A-ADM per CB-4.
- **C-E — Lifecycle dues + export.** `ds5_lifecycle_*` handlers execute D2 (FEAT-PC014 tags updated, U047 rename recorded); Mist-communication ephemerality slot per CB-1 outcome (ADR-U031); `get_own_messages_export()` composed into the GDPR export with the CB-6 posture. Schema-gate carve-outs apply throughout. **Board settled + decomposed 2026-07-20 (see Status): [FEAT-PD012](../../platform/domain/features/FEAT-PD012-lifecycle-dispositions-and-export-contracts.md) at 4-ready — D2 as preserve-and-seal (both lifecycle events, identically: seal group-kind conversations via `sealed_at`, forum + announcements rows untouched), the `communication` export section incl. reports-submitted, the suspended-member repair at source, the CB-1 proof. Surface-neutral: no paired FEAT-H.**
- **C-F — Identity Cycle F (IDN-10).** Author the exit/deletion specs at L4 (none exist — verified), build self-service exit/deletion over the now-real DS-3 freeze + DS-5 disposition layers, retire the old `admin_exit_user_from_platform` path (the Console-surface question stays A-ADM-homed, COR-A F-3). **Decomposed 2026-07-21 (board settled — CB-5 row):** FEAT-PC017 (origin split ADR-U050 + pause + terminal delete + retirement) ↔ FEAT-H029 (account-area pause/delete surface + farewell), with FEAT-PC005/FEAT-H007 un-parked and origin-gated (the F-1 full-slice call); TASK-CF-01..06. **BUILT + CLOSED same day:** gate #233 nodded; 19 red → 22/22 (scrub repair `20260721170000`); all four specs `6-done`; E2E 2 journeys 3/3 + fleet 78/79 (the 1 = the TASK-E2E-01 fence, verified found-not-caused at main HEAD); the Identity completion plan is COMPLETE; G-36 deleted.

## Design sessions

One planned: **announcements & routing shape** (before C-D decomposition; ADR candidate). Firms the durable-home vs pure-fan-out question under the U048 split and partially resolves DS-5 §8 Q1 (outward delivery). Real-time needs no session — U039 is the doctrine; taxonomy is decomposition-time. **EXECUTED 2026-07-20 → [ADR-U049](../../architecture/decisions/ADR-U049-announcements-durable-home-routed-delivery.md) accepted** (board AD-1..AD-7 adopted as recommended; CB-2 firmed above; the derived rulings — `send_announcements` seed + existing universe gate, `admin_send_notification` kept untouched, immutable + retract — bind the C-D specs).

## Decision board — OPEN (settle before C-A decomposes)

Settled by canon, recorded not asked: U039 realtime doctrine (spec yields) · U048 delivery/routing split · U047 `ds5_lifecycle_*` + gate mechanics · only-D2-is-due (D4 → A-NTF) · W12 + ADR-U043 gates in force.

| # | Question | Recommendation | Default if unaddressed |
|---|---|---|---|
| CB-1 | Mist access to DM/forums (DS-5 §8 Q2) | **FIM-only in Ferd** — Mists see no comm surface; revisit at canon work. *C-E reframe (2026-07-20): verify-and-record — `ds5_require_fim_actor()` already excludes Mists from every comm write door, so the ephemerality slot is an adversarial proof + spec recording (FEAT-PD012 STORY-6), not a scrub build* | FIM-only |
| CB-2 | Announcements shape (COM-8/9) | **FIRMED 2026-07-20 — ADR-U049 accepted** (C-D design session, AD-1..AD-7 as recommended): durable DS-5-owned `announcements` home + per-recipient V3 delivery rows; one table, two gated contracts (U028 by construction); visibility read-time, delivery send-time; immutable + retract; §8 Q1 seam fixed (adapter ownership → A-NTF) | — settled |
| CB-3 | Edit/delete-own window (COM-12) | **Forum-only, 15-min window; DMs stay immutable** (oracle spine, no policy churn) | forum-only, 15 min |
| CB-4 | Content-reports scope (COM-13) | **Build submission + durable store now**; moderation-queue surface seams to A-ADM | build store, seam queue |
| CB-5 | IDN-10 placement | **C-F closing cycle**, L4 authoring first (nothing exists to un-park); alternative: author specs early at C-A-time, build at C-F. **EXECUTED 2026-07-21 (C-F board, settled whole):** F-1 **full lifecycle slice** — delete + `deactivation_origin` field + self-pause + IDN-12 un-park (FEAT-PC005/H007, origin-gated); F-2 **private-erase + communal-tombstone** (journal + lived record erased; forum/messages retained sealed, "Former member" read-time; consent trail kept; profile scrubbed); F-3 **immediate + confirm** (export offer + type-to-confirm; no grace-period state). Specs authored: FEAT-PC017 + FEAT-H029. ADR-U050 (state-machine promotion) rides the schema gate. Defaults recorded: sessions die at delete, no new V3 fan-out, pause cascades nothing, old path DROPped in-cycle | C-F, author-then-build |
| CB-6 | Suspended-member export posture (PC008 asymmetry, inherited by `get_own_messages_export`) | **FIRMED 2026-07-20 (C-E board): right-of-access — suspended members can export.** Mechanism: export contracts resolve their actor ungated (`auth.uid()` direct — the composite's own precedent); `get_own_step_instances_export()` re-issued the same way; `get_current_personal_group_id()` (the `is_active`-gated universal resolver) untouched — zero core blast radius. Closes FEAT-PC008 §155. The function re-issues still ride the C-E schema gate's named nod | — settled |
| CB-7 | Group conversations (DS-5 §8 Q8) | ~~Out of Ferd~~ **OVERRIDDEN (Stefan): build now, in C-A.** The conversation model is redesigned once at contract-cut time: participants junction (per-participant read-state) + data-driven conversation kinds (`dm`, `group` — one registry, distinct from forum per Q8). New §L3 row COM-15 records the capability | — settled |
| CB-8 | Real-time placement | **Own cycle C-C** after DM+forum land (one fresh U039 build for both surfaces; C-A/C-B ship without socket work) | own cycle |
| CB-9 | Attribution label (COM-14/MEM-9) | **"Former member"** per ADR-U021; `'Unknown'` fallback | "Former member" |

## Exit checklist — the Communication area gate (planted now)

- [ ] All 16 COM rows (incl. COM-15, CB-7) `6-done` or explicitly dispositioned on the board
- [ ] MEM-9 un-seamed and rendered; FEAT-H016/H017 `pending-DS-5` notes cleared
- [ ] D2 executed as `ds5_lifecycle_*`; FEAT-PC014 tags updated with the U047 rename recorded
- [x] IDN-10 complete: specs authored, exit/deletion live and gated, old exit path retired *(C-F, 2026-07-21 — FEAT-PC017/H029 + PC005/H007 `6-done`; ADR-U050; `admin_exit_user_from_platform` DROPped; G-36 deleted)*
- [ ] Conformance gate updated: `DS_TABLES` += comm tables; `DS_OWNED_ALLOWLIST` += DS-5 functions; `notifications` stays out (U048)
- [ ] `get_own_messages_export()` composed into the export; suspended-member posture decided; PC008 open question closed or re-scoped
- [ ] DS-5 spec reconciled: U039 amendment landed; §8 Q1/Q2/Q6/Q7/Q8 dispositioned; status advanced from `proposed`; feature-inventory summary shows the partial-realisation split (feeds/attachments stay forward)
- [ ] Legacy `postgres_changes` publications for comm tables dispositioned (removed or justified) per U039
- [ ] Oracle ported: B-MSG-001..006 + B-COMM-004..007 spine byte-for-byte; the two silences covered by fresh tests
- [ ] W12 per-RPC verification for every RPC shipped (adversarial direct-call tests where uncovered); sole-home-in-BFF and core-referencing-domain remain automatic fails
- [ ] ADR-U043 measurement pass (cold ≥20-min idle ×3 + warm, tail rule) + Stefan's live walk — both before the area retro
- [ ] Substrate-audit stale note corrected (`notifications` column list)

## After Communication

**Notifications (A-NTF)** — inherits the C-C real-time conventions (shared substrate, §L3 §348), the V3 delivery substrate + DS-5 routing split (U048), and **D4 comes due** (MEM-2 outbound email dispatch — the V3 channel). NTF-6's moderation-decision communication seam closes against COM-13's store.
