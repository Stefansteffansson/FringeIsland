# FEAT-PD018: Member-erasure conversation disposition — the content-level tombstone

---
id: FEAT-PD018
title: Member-erasure conversation disposition — the DM content-level tombstone, the ADR-U016 cascade across all five erasure paths, and the residue instrument that counts the right noun
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Direct-message threads outlive the people in them. Deleting **every group and every account** during the 2026-08-12 dev-DB reset left **557 conversations and 1 123 messages** standing with zero participants — reachable through no contract, visible to no instrument, and still holding every message body in the database.

The mechanism is a gap, not a bug. Direct conversations are **not group-anchored**: for `kind = 'dm'`, `conversations.group_id IS NULL` (`20260719230500_c_a_conversation_model_and_contracts.sql:59`), so the `ON DELETE CASCADE` on that column never fires. What each foreign key actually does when a member's personal group goes:

| Row | FK behaviour | Result |
|---|---|---|
| `conversation_participants.participant_group_id` | `ON DELETE CASCADE` (`…c_a…:87`) | participant row **removed** |
| `messages.sender_group_id` | `ON DELETE SET NULL` (`20260222000000:261`) | message **survives**, authorship nulled |
| `conversations.group_id` | `ON DELETE CASCADE` — but NULL for DMs | conversation **survives** |

Three facts make this more than housekeeping:

1. **`delete_own_account` — the Article 17 door — never touches conversations at all.** It does not even delete the personal group: it *decommissions* (`is_decommissioned = true`, nickname scrubbed to `[Deleted User]`, `20260721170000:244-253`). The FK cascade above never fires on this path, so a member who exercises their right to erasure keeps every DM body fully intact and still attributed to a live personal group. It calls `ds3_lifecycle_account_deleted` and `ds7_lifecycle_account_deleted` for enrolments and journal (`…:233-234`) — **there is no DS-5 sibling.**

2. **`admin_hard_delete_user` documents a cascade that does not happen.** `20260804190000_adm_f_pc025…:864` carries `-- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)`. For DM-kind conversations the claim is false. It is the only erasure path that mentions conversations, and it mentions them wrongly — the same failure class as the *"no table GRANTs"* claim found on 2026-08-11, and it would have been inherited by every future reader.

3. **The existing residue instrument counts the wrong noun.** It counts orphaned *personal groups* (`20260728200000_retire_unattributed_orphan_personal_groups.sql`). Orphaned DM threads never orphan a group, so the delta read 0 while residue accumulated for months.

## Ruling — content-level tombstone (2026-08-12, Stefan)

**Redact the departed member's message bodies; keep the thread shape.** The survivor keeps their own words and the fact that a conversation happened; the erased member's content actually goes.

The ruling was made after separating two things this codebase both calls "tombstone":

| | mechanism | outcome |
|---|---|---|
| **Author-level** | `sender_group_id` → NULL, resolved to *Former member* / *Unknown* (`hub/lib/messages/queries.ts:44-56`) | words stay, name goes |
| **Content-level** (ruled) | `is_deleted = true, content = NULL`, placeholder rendered (`hub/components/groups/GroupForumSection.tsx:200`) | words go, thread shape stays |

**Why not author-level.** It is *already the live behaviour* — `get_conversation_detail`'s sender map resolves departed and erased senders explicitly (`…c_a…:54-56`) — so choosing it would have been a **no-op** leaving the Article 17 exposure untouched. And anonymising a name in a **two-party** thread obscures nothing: the survivor knows exactly who they were talking to. That asymmetry is why **the forum precedent (ADR-U021, posts remain) must not decide this by analogy** — a forum post is communal, with other participants' legitimate interest in an intact thread; a private DM has no such argument.

## The cascade specification (ADR-U016)

**Event:** a member's content is erased.
**Actor:** the member (self-delete) or a platform admin (hard delete).

The five paths do **not** dispose identically, because they are not all erasures. The distinction that governs the table below is already load-bearing in the codebase: `delete_own_account` erases the member's private record (`ds3_lifecycle_account_deleted` + `ds7_lifecycle_account_deleted` — enrolments and journal deleted); `admin_exit_user_from_platform` runs the same membership walk but **calls neither** (`20260801190000:227-241` — it decommissions and ends sessions, and the private record stands). Exit is a *removal*; delete is an *erasure*. DM disposition follows that existing split rather than inventing a new one.

| Path | Erasure? | DM disposition | Evidence |
|---|---|---|---|
| `delete_own_account` | Yes — Article 17 | **Tombstone** the member's messages | `20260721170000:233-234` erases DS-3 + DS-7 private record |
| `admin_hard_delete_user` | Yes — last-resort hard delete | **Tombstone**, then orphan-sweep | `…pc025…:864` group CASCADE follows |
| `admin_exit_user_from_platform` | No — involuntary removal | **None** (record stands) | `20260801190000:232-241` erases no private record |
| `admin_decommission_user` | No — status flip only | **None** | `20260801190000:227` sets `is_decommissioned` only |
| `_erase_mist` / `reap_expired_mists` | Yes, but **structurally empty** | **None — assert instead** | see below |

**The Mist leg is empty by construction, and that is provable rather than assumed.** `start_direct_conversation` refuses a temporary actor (`…c_a…:230`, `IF COALESCE(v_is_temporary, true) THEN` → raise) and refuses a temporary *recipient* (`…c_a…:446`, `IF v_other.is_temporary OR NOT v_other.is_active`). No Mist can be either party to a DM, so `_erase_mist` has nothing to dispose. This mirrors FEAT-PD012 STORY-6's CB-1 posture: **verify and record, do not build a scrub.** The deliverable is a regression proof, not a code path.

**The last-participant case.** After the tombstone, a conversation whose only remaining participants are gone is deleted outright — the structural answer to the 557-thread residue. Ordering matters: the DS-5 handler runs *before* `delete from public.groups`, so the departing member's participant row still exists at that moment. The handler therefore evaluates *surviving participants excluding the departing group*, not `count(*) = 0`, and deletes the conversation when none remain. Messages follow by `ON DELETE CASCADE` (`20260222000000:260`).

Per the ADR-U016 layer template:

- **Platform Core** — Infrastructure: none. Identity: unchanged (the decommission scrub already handles display). Organisation: unchanged. Governance: unchanged.
- **Domain Services** — World Model / Narrative / Experience / Content / Discovery / Intelligence: none. **Communication (DS-5): the whole of this feature.** DM message bodies of the erased member are nulled and flagged; group-kind conversations are untouched (they are FEAT-PD012's preserve-and-seal, and a group thread is communal — the forum argument applies there and only there); orphaned DM threads are deleted.
- **Verticals** — *Privacy:* this is the feature's subject; Article 17 becomes real on the self-delete door. *Administration:* no new admin surface. *Notifications:* none — a tombstone is not an event the survivor is told about. *Observability:* the new residue instrument. *Transactions:* none.

## Solution sketch

**ADR-U047 shape, unchanged: Core emits the fact, DS-5 owns the disposition.** Exactly how `ds5_lifecycle_group_closed` and `ds5_lifecycle_user_hard_deleted` already work.

1. **Schema (gated).** `messages` has no tombstone shape: `content TEXT NOT NULL CHECK (length(trim(content)) > 0)` and no `is_deleted` (`20260222000000:258-264`). Add `is_deleted BOOLEAN NOT NULL DEFAULT false`; drop `content`'s `NOT NULL`; replace the CHECK with one that admits `NULL` exactly when `is_deleted` — so a *live* message can still never be empty. This mirrors `forum_posts` (`20260222000000:234`) so the surface, export, and contract shapes all already know the pattern.

2. **`ds5_lifecycle_account_deleted(p_personal_group_id uuid) RETURNS jsonb`** — the missing DS-5 sibling, on the `ds3_lifecycle_account_deleted` template (`20260721161500:31-56`): SECURITY DEFINER, `search_path = ''`, REVOKEd from PUBLIC/anon/authenticated, returns counts. Two statements: tombstone the member's DM messages; delete DM conversations left with no surviving participant. **Group-kind is excluded** — the predicate joins `conversations` and filters `kind = 'dm'`.

3. **Two call sites**, in-transaction, before the group delete: `delete_own_account` §3 beside its ds3/ds7 siblings, and `admin_hard_delete_user` beside `ds5_lifecycle_user_hard_deleted`.

4. **The false comment corrected** at `…pc025…:864`, whichever way the ruling went.

5. **The instrument already exists — do not build a second one.** The integration global teardown counts `orphaned_conversations` (`hub/tests/integration/global-teardown.ts:68-70`) and sweeps them (`:142-147`), both added in the 2026-08-12 teardown work and already citing TASK-DM-01 by name. A database view would add **the first view in the entire schema** — a first-of-its-kind object class facing the ownership-manifest gate, which COR-D W8 widened to `relkind = 'v'` — for coverage that is already there. The disposition is what makes the existing counter read zero; STORY-7 asserts exactly that.

**`sender_group_id` is deliberately left alone.** Author-level resolution is already live and correct; the ruling adds content erasure on top of it, it does not replace it.

**The export needs no change, and that is a finding, not an omission.** `get_own_messages_export` already carries `m.content` for `m.sender_group_id = v_me` (`20260721100000:225-236`) — own bodies only. Article 15 and Article 17 therefore agree without adjustment: the member can take their words with them before the door closes, and the tombstone removes those same words from the survivor's view afterwards. The DoR question is answered *yes, it already does*.

## Rabbit holes

- **Do not sweep the existing residue.** Per the 2026-07-06 retro's standing lesson — *a sweep list that grows back is a wrong-layer pattern, not an unfinished chore* — the deliverable is the disposition inside the contracts plus the instrument. Both residue sets were already cleared by the reset; this feature is about the mechanism.
- **Do not generalise `is_deleted` into a message-moderation feature.** No `delete_message` / `edit_message` / `moderate_message` contract exists (verified: no such function in any migration). The column has exactly one writer — the erasure disposition. A member-facing "delete my message" contract is a separate feature with its own ruling.
- **Do not make exit erase by side effect.** If `admin_exit_user_from_platform` should erase, that is a change to DS-3 and DS-7 as much as DS-5, and it belongs in one deliberate decision — not smuggled in as a DM-only asymmetry.

## No-gos

- No change to group-kind conversation disposition (FEAT-PD012's preserve-and-seal stands).
- No change to `get_current_personal_group_id` or any universal resolver.
- No new admin surface; no notification on tombstone.
- No retroactive sweep migration.

## Stories

### STORY-1: I delete my account, and my words leave the conversation
**Given** I have exchanged DMs with another member
**When** I delete my own account
**Then** my message bodies are gone (`content IS NULL`, `is_deleted = true`), the other member's own messages are untouched, and the thread still exists with its shape intact.

### STORY-2: The survivor keeps their record
**Given** the other party to our DM deleted their account
**When** I open the conversation
**Then** I see my own words in full, the thread's shape, and a placeholder where their messages were — not an empty or missing thread.

### STORY-3: Hard delete leaves nothing standing
**Given** a member with a live DM thread
**When** an admin hard-deletes them
**Then** their message bodies are tombstoned before the group cascade, and the conversation — now without a surviving participant — is deleted rather than orphaned.

### STORY-4: The comment tells the truth
**Given** a reader of `admin_hard_delete_user`
**When** they read what the personal-group delete cascades
**Then** the comment names what actually happens to conversations, and points at the DS-5 handler that does the work.

### STORY-5: Platform exit is a removal, not an erasure
**Given** a member exited from the platform by an admin
**When** the exit completes
**Then** their DM bodies are unchanged — consistent with their journal and enrolments, which that path also leaves standing.

### STORY-6: No Mist has ever held a conversation — proven, then recorded
**Given** the Mist erasure and reaper paths
**When** the DM disposition is specified
**Then** a regression test proves a Mist can neither open nor receive a DM, and the spec records the exclusion instead of building a scrub for an impossible case.

### STORY-7: The instrument counts the right noun
**Given** DM threads that have lost every participant
**When** the residue instrument runs
**Then** it reports them — where the orphaned-personal-group counter it sits beside reads 0, because that is not what those threads orphan.

## Platform dependencies

- `admin_hard_delete_user` (PC-4) and `delete_own_account` (PC-2) each take one added call — the ADR-U047 Core carve-out this schema gate covers.
- `ds5_lifecycle_account_deleted` rides the `/^ds\d+_lifecycle_/` auto-allow in the conformance allowlist (FEAT-PD012 precedent). `supabase/ownership.manifest.json` needs no new table entry — `messages` is already registered.

## Cross-product impact

Hub only, and type-level: `ConversationMessage.content` becomes `string | null` and gains `is_deleted` (`hub/lib/messages/queries.ts:23-28`). The render placeholder mirrors the forum's. **`next build` is the gate that catches the nullability fan-out** — `ts-jest` will not.

## Vertical impact

| Vertical | Impact |
|---|---|
| Administration | None — no new admin surface. |
| Privacy/GDPR | **The feature.** Article 17 becomes real on `delete_own_account`; Article 15 already agrees (export unchanged, verified). |
| Notifications | None. |
| Observability | New residue instrument counting participant-less DM conversations. |
| Transactions | None. |

## Performance budget

Both statements are keyed on `sender_group_id` (`idx_messages_sender_group_id`) and `participant_group_id` (`idx_conversation_participants_participant`). Erasure is a rare, non-interactive path; no ADR-U043 surface budget applies.

## A second copy of the same words — found during the payload walk, NOT fixed here

`submit_content_report` copies the reported message body into `content_reports.content_snapshot` at report time:

```
ELSIF p_target_kind = 'direct_message' THEN
  SELECT m.content, m.conversation_id, m.sender_group_id
  INTO v_snapshot, v_conv, v_author
  FROM public.messages m WHERE m.id = p_target_id;
```

So **a reported DM survives its sender's erasure inside the report row** — an independent copy this feature's tombstone does not reach, and the same failure class as the finding that opened the task: content persisting past the person through a path nobody was looking at. Verified against the live catalogue, not inferred.

**Deliberately not fixed here.** It is a genuine policy question, not an oversight: moderation evidence has a legitimate-interest argument for retention that a plain DM body does not, and the platform already has a sanctioned shape for exactly that tension — ADR-U034 §5's *anonymise-then-retain* for consent records. Deciding it silently inside a build would be the wrong way to settle it. **Recommendation:** treat the snapshot as retained evidence but scrub it on erasure once the report is resolved, mirroring the consent precedent. Carried to the board below.

## Open decisions — SETTLED at build (1, 2) / CARRIED (3, 4)

The board was carried to Stefan and answered; two of the four are now facts of the shipped substrate, not recommendations.

1. **Does `admin_exit_user_from_platform` tombstone?** **SETTLED — no**, as recommended, and shipped that way. The migration's cascade specification states the distinction plainly: *"exit is a removal; delete is an erasure"*, and the exit path is left unchanged.
2. **Is the last-participant delete in scope here?** **SETTLED — yes**, as recommended. Part (b) of `ds5_lifecycle_account_deleted` deletes a DM thread left with no participant other than the departing member — the structural answer to the 557-thread residue class rather than a sweep of it.
3. **What happens to `content_reports.content_snapshot` on erasure?** **STILL OPEN — deliberately out of scope here.** Nothing in this cycle touches it. A moderation snapshot is retained evidence about a member who may since have erased, so it needs its own ruling (retain-as-evidence vs scrub-on-resolution) rather than being decided as a side effect of the DM disposition. **Owed a home.**
4. **Should `consent_records.subject_group_id` become `NOT NULL`?** **STILL OPEN.** ~18 subject-less rows accrue per full integration run; the integration teardown sweeps them, which is **containment, not a fix**. Tracked in [`TASK-DM-01`](../../../planning/backlog/tasks/TASK-DM-01-direct-message-erasure-gap.md)'s notes.

## Implementation notes

**Built as Cycle DM-A, 2026-08-12; gate executed 2026-08-13** (migration `20260812120000`, PR #526).

**What shipped.** One new sealed DS-5 fact handler, `ds5_lifecycle_account_deleted(uuid)`, called by the two erasure paths (`delete_own_account`, `admin_hard_delete_user`). It (a) sets `content = NULL, is_deleted = true` on the departing member's `kind='dm'` messages, guarded by `is_deleted = false` so a second pass is a no-op, and (b) deletes DM threads left with no other participant. `get_conversation_detail` and `get_own_messages_export` were replaced so the tombstone renders and the export agrees with it — Article 15 and Article 17 must not contradict each other.

**Registered as a lifecycle fact**, not a declared composition: Core emits the fact, DS-5 owns the disposition, mirroring `ds5_lifecycle_group_closed`. It rides the `/^ds\d+_lifecycle_/` auto-allow in the conformance allowlist. EXECUTE is revoked from PUBLIC/anon/authenticated — verified on the applied object as `{postgres, service_role}`.

**A false premise corrected.** `admin_hard_delete_user` carried a comment claiming the personal-group delete cascaded conversations. It does not for DMs, whose `group_id` is NULL — which is exactly how 557 threads survived the 2026-08-12 reset. The comment now names the mechanism and the consequence.

**Sibling assertions invalidated — caught at the gate review, not before it.** This migration changed shipped semantics without the sweep `docs/platform/CLAUDE.md` requires, the fourth time that class has bitten. `PC017 S5b` was invalidated in three places; the sharpest asserted that the surviving party could still read the departed member's words — **that assertion was the exposure this feature closes**. All three adapted, and the sweep is now recorded in the migration header.

**Verified at the gate:** PD018 suite 9/9 · platform conformance 30/30 · full integration 1181/1181 across 84 suites · teardown clean · applied ACLs read directly.

**Not built here:** the Mist leg, which is empty by construction — `get_or_create_dm_conversation` refuses a temporary actor *and* a temporary recipient, so no Mist can be party to a DM. FEAT-PD012 STORY-6's verify-and-record posture applies: the deliverable was a regression proof, not a scrub.
