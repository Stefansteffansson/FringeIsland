# FEAT-PD012: Lifecycle dispositions & own-communication export contracts

---
id: FEAT-PD012
title: Lifecycle dispositions & own-communication export contracts — D2 executed as preserve-and-seal, the GDPR communication export (suspended included, CB-6), the CB-1 Mist-exclusion proof
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Three dues left standing by the area plan and the C-D close, all platform-side:

1. **D2 is tagged, not executed.** `close_group` / `delete_group` flip the group's status (soft tombstone — no FK cascade fires) and call the DS-3 handler, but the DS-5 disposition is still the `pending-DS-5` tag FEAT-PC014 planted (STORY-4/STORY-5). Concretely: a closed group's `group`-kind conversation still looks alive — it sits in every former participant's inbox, and nothing refuses a send into it. A ghost thread. The widened D2 scope (C-A bridge) binds the handler to disposition group-kind conversations *alongside* forum content.
2. **The export has no communication section, and the suspended-member asymmetry is inherited.** `get_own_data_export()` composes `journal` + `journeys` today; a member's own messages, forum posts, and submitted content reports (the C-D banked due) are absent. Worse, the composite resolves its subject ungated ("covers suspended members") while the `journeys` section resolves through `get_current_personal_group_id()` — `is_active`-gated — so a suspended member's whole export raises 42501 (FEAT-PC008 §155). CB-6 settled the posture: **right-of-access — suspended members can export.**
3. **CB-1 is settled but unproven-as-record.** "FIM-only in Ferd — Mists see no comm surface." Every DS-5 write contract already gates on `ds5_require_fim_actor()`, so no Mist-authored row can exist in any comm table — which makes the DS-5 spec's Mist-ephemerality slot (§7.4, ADR-U031) a **verify-and-record** item, not a scrub build. The verification test and the spec recording don't exist yet.

## Implementation notes (6-done — Cycle C-E, 2026-07-21)

- **Migration `20260721100000_c_e_lifecycle_dispositions_and_export.sql`** (PR #230, held at the schema gate, named nod "ok merge #230"; applied + repaired same day). One column (`conversations.sealed_at`, NULL = live), two new functions, six re-issues, all assembled from each function's latest on-disk definition via anchored edits.
- **D2 executed:** `ds5_lifecycle_group_closed(uuid, text)` on the ds3 template (SECURITY DEFINER, `search_path=''`, reason ∈ {`group_closed`,`group_archived`} → 22023 otherwise, REVOKEd from PUBLIC/anon/authenticated — direct call answers 42501, W12-tested). Called in-transaction from `close_group` / `delete_group` immediately after the ds3 calls (ADR-U047 Option A; errors propagate). Both events disposition identically: the group's `group`-kind conversations seal; `dm`-kind, `forum_posts`, and `announcements` rows untouched (the PD011 contingency adjudicated in the handler comment). Returns `{conversations_sealed}` for observability.
- **Sealed semantics:** `get_my_conversations` / `get_group_conversations` gained a `sealed_at IS NULL` predicate; `send_message` / `join_group_conversation` refuse sealed with P0001 placed *behind* the existing 42501 walls (refusal classes non-leaking); `get_conversation_detail` deliberately unchanged — a participant reads the record forever.
- **Export:** `get_own_messages_export()` — ungated actor resolution (`auth.uid()` → `public.users` direct), four sections (`messages`, `conversation_participations`, `forum_posts` incl. `is_deleted`, `reports_submitted` incl. `content_snapshot` + `target_id`, `target_group_id` deliberately omitted as third-party identity), `[]`-stable when empty; composed into `get_own_data_export()` under the `communication` key (the journal/journeys merge shape; `schema_version` stays 1 — wire-shape rule). `get_own_step_instances_export()` re-issued ungated (FEAT-PC008 §155 closed; FEAT-PD007 amended). **Verified, not repaired:** `get_own_journal_export()` was already ungated — a mid-build claim to the contrary was checked against its body and retracted.
- **Red → green, honestly:** 14 demonstrated red pre-apply (42703 `sealed_at` absent · PGRST202/42883 functions absent · 42501 "no session actor" on the suspended composite — PC008 §155 live · behavioural fails on the un-sealed substrate) + 8 labelled greens (3× STORY-6 CB-1 regression proofs, sanity, invariant-holds). Post-apply 20/22 → **22/22** with two labelled adaptations: (1) join-on-sealed answers the membership wall's 42501 — `delete_group` deactivates memberships in the same transaction, so P0001-via-join is structurally unreachable; the seal check in `join_group_conversation` stays as defense-in-depth; (2) the reason-validation probe asserts `runAdminSql`'s thrown 22023 (the raise fired on first post-apply run). **One sibling adaptation (J-B budgeted, labelled):** FEAT-PD007's suite had probed "actorless → 42501" with the *suspended* fixture — precisely the repaired asymmetry; the suspended path now asserts success and a genuinely session-less client carries the 42501 probe (28/28 after).
- **Surface:** none built — the cycle is surface-neutral as decomposed. One type-only Hub touch: `DataExportCommunication` on `lib/account/export.ts` (the payload walk's named find; runtime was already pass-through).
- **Conformance lockstep:** `DS_OWNED_ALLOWLIST` += `get_own_messages_export`; the handler rides the `/^ds\d+_lifecycle_/` auto-allow. `DS_TABLES` unchanged (no new tables).
- **Proofs at close:** C-E integration 22/22 · full integration **50 suites / 582 tests green** (post-adaptation; the fenced `mist-transcendence` flake did not fire) · unit 115 suites / 837 · `next build` clean (0 type errors with the new export key) · lint 0 errors · E2E `lifecycle-and-export.spec.ts` **2/2** (the seal lived through the Hub: the thread leaves the inbox, the DM survives; the export download carries all four communication sections with the report snapshot honest) · **fleet 76/77** — the 1 is `profile.spec` STORY-4, the standing fenced flake (TASK-E2E-01), green 3/3 isolated; a first fleet attempt was invalidated as environment (it rode a live-HMR dev server holding the Next 16 single-instance dev lock — 37 spurious failures, 19 of them bare 30-second timeouts across untouched surfaces; re-run on an isolated `next start` production server came back clean in 3.4 min).
- **Doc dues discharged:** FEAT-PC014 STORY-4/5 tags flipped to executed (U047 naming recorded in the file); FEAT-PC008 §155 closed; FEAT-PD007 amendment; DS-5 §8 Q2 resolved-for-Ferd + invariant 4 annotated satisfied-by-exclusion; the scrub posture recorded in FEAT-PD011 (retain under legitimate interest in Ferd; mechanics → A-ADM).

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

## Amendment 2026-09-03 — TASK-SEAL-02, the DS-5 half (migration `20260903110000`, applied on the named approval)

`ds5_admin_conversation_detail(p_conversation_id)` — the sealed DS-5 body (EXECUTE revoked from client roles; `{postgres, service_role}`) serving **one** group-kind conversation's messages, sealed or not: oldest first, capped at 500 with `truncated` reported honestly, `message_count` total, senders resolved through the COM-14 ladder scoped to the conversation's group (a departed author is "Former member", a decommissioned one "Unknown" — never a raw id, never `[Deleted User]`); a direct conversation is P0002. It carries no wall of its own — the PC-4 wrapper `admin_get_group_conversation_detail` ([FEAT-PC026](../../core/features/FEAT-PC026-suspended-group-admin-access-contracts.md) amendment) owns admission, the closed-scope rule and the audit row. Preserve-and-seal's promise is unchanged: the seal still ends activity for everyone, the member plane still never lists a sealed thread, and this body is the second (and last) place in the schema a sealed thread is readable — the first being SEAL-01's list. This is why the evidence is still there when the author is not: `messages.sender_group_id` is `ON DELETE SET NULL`, and the ladder handles the NULL.
