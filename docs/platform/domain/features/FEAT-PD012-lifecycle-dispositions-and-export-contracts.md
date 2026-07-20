# FEAT-PD012: Lifecycle dispositions & own-communication export contracts

---
id: FEAT-PD012
title: Lifecycle dispositions & own-communication export contracts — D2 executed as preserve-and-seal, the GDPR communication export (suspended included, CB-6), the CB-1 Mist-exclusion proof
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Three dues left standing by the area plan and the C-D close, all platform-side:

1. **D2 is tagged, not executed.** `close_group` / `delete_group` flip the group's status (soft tombstone — no FK cascade fires) and call the DS-3 handler, but the DS-5 disposition is still the `pending-DS-5` tag FEAT-PC014 planted (STORY-4/STORY-5). Concretely: a closed group's `group`-kind conversation still looks alive — it sits in every former participant's inbox, and nothing refuses a send into it. A ghost thread. The widened D2 scope (C-A bridge) binds the handler to disposition group-kind conversations *alongside* forum content.
2. **The export has no communication section, and the suspended-member asymmetry is inherited.** `get_own_data_export()` composes `journal` + `journeys` today; a member's own messages, forum posts, and submitted content reports (the C-D banked due) are absent. Worse, the composite resolves its subject ungated ("covers suspended members") while the `journeys` section resolves through `get_current_personal_group_id()` — `is_active`-gated — so a suspended member's whole export raises 42501 (FEAT-PC008 §155). CB-6 settled the posture: **right-of-access — suspended members can export.**
3. **CB-1 is settled but unproven-as-record.** "FIM-only in Ferd — Mists see no comm surface." Every DS-5 write contract already gates on `ds5_require_fim_actor()`, so no Mist-authored row can exist in any comm table — which makes the DS-5 spec's Mist-ephemerality slot (§7.4, ADR-U031) a **verify-and-record** item, not a scrub build. The verification test and the spec recording don't exist yet.

## Solution sketch

**D2 — one handler, preserve-and-seal (board decision, Option A).** New `ds5_lifecycle_group_closed(p_group_id uuid, p_reason text)` on the ds3 template (SECURITY DEFINER, `search_path = ''`, reason-param validation against `'group_closed'`/`'group_archived'`, REVOKE from public/anon/authenticated). Called synchronously in-transaction from `close_group` and `delete_group` immediately after the existing `ds3_lifecycle_group_closed` calls (ADR-U047: core emits the fact, DS owns the disposition). Both events get the **same** disposition — end activity, keep the record:

- `conversations` gains `sealed_at timestamptz` (NULL = live). The handler stamps it on the group's `group`-kind conversations. `dm`-kind conversations are personal, not group-scoped — never touched by D2.
- **Sealed semantics:** `get_my_conversations` and `get_group_conversations` exclude sealed rows (threads leave live inboxes); `send_message` and `join_group_conversation` refuse sealed conversations; `get_conversation_detail` stays participant-readable — seal ends *activity*, not the participant's access to the record (the DM-immutability philosophy applied to endings).
- **Forum posts: untouched.** The record posture (ADR-U021 spirit): no row mutation, no deletion. Write paths already die with membership/status; preservation is what keeps a member's own export and C-D's report snapshots pointing at something real. `delete_group` adds nothing destructive in Ferd — hard erasure remains the personal paths' job (user hard-delete, Mist reaping).

**Export — `get_own_messages_export()` (CB-6 posture).** New DS-5 read composed into the composite as `|| jsonb_build_object('communication', public.get_own_messages_export())` (the `journal`/`journeys` merge shape). Actor resolved ungated — `auth.uid()` against `public.users` directly, the composite's own precedent — so suspended members export. Sections: `messages` (own authored, with conversation id/kind), `conversation_participations` (own participant rows, incl. left/sealed context), `forum_posts` (own authored, incl. `is_deleted` flag — a tombstoned post is still the member's data), `reports_submitted` (own `content_reports` rows incl. `content_snapshot` — the record of what they reported, visible to them at submit time; board decision). **The same cycle repairs the asymmetry at its source:** `get_own_step_instances_export()` re-issued with ungated actor resolution (recorded as a FEAT-PD007 amendment note at build), closing FEAT-PC008 §155.

**CB-1 — the proof.** Direct-call integration tests: a Mist actor against every DS-5 write door refuses. DS-5 spec §8 Q2 recorded resolved-for-Ferd; §7.4's ephemerality invariant annotated satisfied-by-exclusion for Ferd.

**Conformance lockstep:** `DS_OWNED_ALLOWLIST` += `ds5_lifecycle_group_closed`, `get_own_messages_export`. No new tables (`DS_TABLES` unchanged).

**Doc dues riding the cycle:** FEAT-PC014 STORY-4/5 tags flipped to executed-at-C-E with the U047 rename recorded; FEAT-PC008 §155 closed; FEAT-PD011 scrub posture recorded (snapshots retained under legitimate-interest moderation evidence in Ferd; resolution-time scrub mechanics route to A-ADM with the queue).

## Appetite

One cycle (one focused session): red suites → one schema-gate migration → flip-green → sweeps → close. Small surface: one column, one handler, two new/two re-issued functions, two core-function call-site edits.

## Rabbit holes

- **The seal-vs-send race.** A send in flight while the handler commits can land after the seal under READ COMMITTED. Bounded and harmless: the raced-in message joins the preserved record; the next send refuses. Do not reach for serializable isolation or row locks on the conversation — the AC is post-commit refusal, not a total order (topology check applied: no user-visible race exists to specify beyond commit order).
- **Scrub mechanics.** The posture is recorded this cycle; the mechanism belongs to A-ADM's queue (status transitions don't exist yet). Building a scrub now would hang it on an event that can't fire.
- **Export completeness debates.** "Own data" = rows the member authored plus their own participation/report rows. Other participants' messages are *their* data — the export never carries them. Announcements are authored under a grant and already durable; retracted ones stay out (universe-scope audit is the trail). Don't relitigate at build.

## No-gos

- No destruction on `delete_group` in Ferd — preserve-and-seal for both lifecycle events, identically.
- No scrub build; no `content_reports` schema change.
- No Mist communication surface, and no Mist-scrub machinery — exclusion is the mechanism (CB-1).
- No forum row mutation on group lifecycle (ADR-U021 posture extended to endings).
- No changes to DM conversations, DM immutability, or the C-D window/report contracts.
- No announcement disposition on group close/delete — the FEAT-PD011 §Administration contingency ("rides the D2 due if closure semantics need more than membership-gated invisibility") is adjudicated here: under preserve-and-seal, membership-gated invisibility suffices; `announcements` rows are untouched by the handler (the FK CASCADE covers only true row deletion, which Ferd's lifecycle never performs).
- No new Hub feature — this cycle is surface-neutral (the Hub inherits the seal through existing payloads and the export through the existing download). Payload walk (disk-verified 2026-07-20): inbox payload shape is unchanged — exclusion only; the export document passes through `fetchOwnDataExport()` untransformed at runtime (`hub/lib/account/export.ts` — cast, no key whitelist) and no field-level renderer exists; the one Hub touch is type-only — the `DataExport` interface gains a `communication` key at build (rides TASK-CE-03, no behaviour change).

## Stories

### STORY-1: A closed group's conversation goes quiet and leaves the inbox
As a group member, I want a closed group's conversation sealed — out of my live inbox, refusing new messages — so the ending is real without my words being destroyed.

**Acceptance criteria:**
- Given a group with a `group`-kind conversation, when the Steward closes the group, then the conversation's `sealed_at` is stamped in the same transaction (handler called from `close_group` after the DS-3 call).
- Given a sealed conversation, when a former participant lists their inbox (`get_my_conversations`) or the group's conversations (`get_group_conversations`), then the sealed conversation is absent.
- Given a sealed conversation, when any actor calls `send_message` or `join_group_conversation` against it, then the contract refuses with a named error; no row is written.
- Given a sealed conversation, when a participant calls `get_conversation_detail`, then the message history is still readable (seal ends activity, not the record).
- Given a group with only a `dm`-kind conversation among its members, when the group closes, then that DM conversation is untouched (D2 never reaches `dm` kind).

### STORY-2: A deleted group dispositions identically — nothing extra is destroyed
As a platform steward of record, I want `delete_group` to run the same preserve-and-seal disposition as `close_group`, so no one's authored content is erased by another actor's lifecycle action.

**Acceptance criteria:**
- Given a group with a group conversation and forum posts, when `delete_group` runs, then the handler is called with the `'group_archived'` reason, the conversation seals, and every `forum_posts` and `messages` row survives byte-identical.
- Given the handler, when called with a reason outside `'group_closed'`/`'group_archived'`, then it raises (reason-param validation, ds3 template).
- Given the handler, when called directly by an authenticated non-definer role, then it refuses (REVOKE posture — W12 adversarial direct-call check).

### STORY-3: The forum record survives the group's ending
As a former member, I want my forum posts to survive the group's close or delete, so my own record — and any content report's evidence — stays real.

**Acceptance criteria:**
- Given a group whose forum holds my posts (including a soft-deleted one), when the group is closed and then archived, then no `forum_posts` row is mutated or deleted by either disposition.
- Given the closed group, when I export my data, then my forum posts from that group are present in the export (see STORY-4).
- Given FEAT-PC014's STORY-4/5 `pending-DS-5` tags, when this feature reaches 6-done, then the tags read executed-at-C-E via `ds5_lifecycle_group_closed` with the ADR-U047 rename recorded.

### STORY-4: My communication is in my export — reports included
As a member, I want `get_own_data_export()` to carry a `communication` section, so my messages, posts, participations, and the reports I submitted are part of my right-of-access.

**Acceptance criteria:**
- Given a member with messages, forum posts (one soft-deleted), conversation participations (one sealed, one left), and a submitted content report, when they call `get_own_data_export()`, then the document contains `communication.messages`, `communication.conversation_participations`, `communication.forum_posts` (with `is_deleted` visible), and `communication.reports_submitted` (with `content_snapshot`).
- Given another participant's messages in a shared conversation, when I export, then none of their message bodies appear anywhere in my document (own-data wall).
- Given a member with no communication activity, when they export, then `communication` is present with empty sections (shape-stable).
- Given `get_own_messages_export()` called directly as its own PostgREST RPC, then it returns only the caller's own rows (W12 direct-call check).

### STORY-5: A suspended member's export works — the asymmetry dies at its source
As a suspended member, I want my full export to succeed, so suspension (an admin hold) never suspends my right of access (CB-6).

**Acceptance criteria:**
- Given a suspended member (`is_active = false`) with journal, walks, and communication data, when they call `get_own_data_export()`, then the whole document returns — no 42501 from any section.
- Given the repair, then `get_own_step_instances_export()` resolves its actor ungated (the composite's `auth.uid()` precedent) and `get_current_personal_group_id()` is untouched — zero core blast radius.
- Given the repair lands, then FEAT-PC008 §155's open question is closed in the same change-set, and a FEAT-PD007 amendment note records the re-issue.

### STORY-6: No Mist has ever spoken here — proven, then recorded
As the platform's privacy posture, I want CB-1 ("FIM-only in Ferd") proven by adversarial test and recorded in the spec, so Mist ephemerality for communication is honestly a no-op by exclusion.

**Acceptance criteria:**
- Given a Mist actor (an `is_temporary` account), when it calls each DS-5 write contract (send, create/join group conversation, forum post/reply/edit/delete-own, report submit, announcement send), then every call refuses via `ds5_require_fim_actor()`.
- Given the proof passes, then `communication.md` §8 Q2 is recorded resolved-for-Ferd (FIM-only; revisit at canon work) and the §7.4 ephemerality invariant is annotated satisfied-by-exclusion for Ferd.

## Platform dependencies

- PC-3 `close_group` / `delete_group` (COR-A definitions) — the two call sites; core-function edit rides the schema gate.
- PC-2 identity status (`is_temporary`, `is_active`) — the CB-1 gate and the CB-6 posture.
- PC-4 audit discipline — the handler runs inside already-audited core lifecycle transactions; it emits no separate audit row (recorded here as the ADR-U016 cascade note).
- The COR-A export composite (`get_own_data_export`) and the FEAT-PD007 walks export (re-issued).
- The conformance gate (`internal-api-conformance.test.ts`) — allowlist lockstep.

## Cross-product impact

Hub only, and surface-neutral: the Messages inbox stops listing sealed threads (server-side exclusion; payload shape unchanged), and the account export download gains the `communication` key. No Gimbal/Studio impact. No paired FEAT-H — first surface-neutral cycle of the area; E2E proves the lived behaviour through the existing Hub surfaces.

## Vertical impact

- **Privacy/GDPR:** The cycle's core. Right-of-access completed for communication data and extended to suspended members (CB-6); own-data wall enforced in the export; preserve-and-seal keeps members' authored content out of others' destructive reach; scrub posture for report snapshots recorded (legitimate-interest retention in Ferd, mechanics at A-ADM).
- **Notifications:** None new — group-close/delete notices already ride the core functions; the seal emits no hint (sealed threads leave inboxes on next fetch; no live-nudge obligation in Ferd).
- **Administration:** D2 executed — the ADR-U016 cascade slot for group retirement's communication layer is filled by `ds5_lifecycle_group_closed`; FEAT-PC014 tags flipped.
- **Observability:** Handler failures propagate (synchronous, same-transaction — ADR-U047 Option A); refused sends/joins on sealed conversations raise named errors; export contracts are traceable RPCs.
- **Transactions:** None.
- **Extensibility:** No new enums or sealed sets — `sealed_at` is a timestamp, not a status enum; the reason parameter validates against the two ADR-U047 lifecycle facts and extends by addition.

## Performance budget

N/A (no surface). The inbox exclusion adds a NULL-check predicate to existing reads; the export is an on-demand composite read outside any budget class.
