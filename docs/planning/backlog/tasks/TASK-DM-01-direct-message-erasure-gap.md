---
id: TASK-DM-01
title: Direct-message threads survive every erasure path — including hard delete, which documents a cascade that does not happen
status: todo
assigned_to: unassigned
priority: high
feature: none
owner: platform/domain (DS-5) + platform/core (PC-2 erasure paths)
wave: ferd
cycle: unscheduled — schema-gated
depends_on: []
estimated_hours: 6
---

# TASK-DM-01 — direct messages outlive the people in them

**Found:** 2026-08-12, during the dev-DB reset for the Hub v2 clean start. Deleting **every group and every account** left **557 conversations and 1 123 messages** standing, with zero participants. They were only noticed because the reset made the database small enough for the residue to be obvious.

## The mechanism, verified against the substrate

Direct conversations are **not group-anchored**. For `kind = 'dm'`, `conversations.group_id IS NULL`, so the `ON DELETE CASCADE` that removes a group's conversations never fires. What each foreign key actually does when a member's personal group goes:

| Row | FK behaviour | Result |
|---|---|---|
| `conversation_participants.participant_group_id` | `ON DELETE CASCADE` | participant row **removed** |
| `messages.sender_group_id` | `ON DELETE SET NULL` | message **survives**, authorship nulled |
| `conversations.group_id` | `ON DELETE CASCADE` — but **NULL for DMs** | conversation **survives** |

So the thread and every message body remain; only the links to the person disappear. The row becomes unreachable through any contract (no participants) and invisible to every instrument — but the **content is still in the database**.

## The part that makes this more than housekeeping

`admin_hard_delete_user` — the hard-erasure door — carries this line:

```sql
-- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)
delete from public.groups where id = v_target_personal_group_id;
```

**The comment asserts a cascade that does not happen for direct messages.** It is the only erasure path that mentions conversations at all, and it mentions them in a claim the substrate does not honour. A correct-looking function resting on a false premise — the same failure class as the *"no table GRANTs"* claim found on 2026-08-11, and it would have been inherited by every future reader.

**No other erasure path touches conversations or messages at all** — verified across the family:

| Path | touches conversations |
|---|---|
| `admin_hard_delete_user` | only via the false-cascade comment |
| `delete_own_account` | **no** |
| `admin_exit_user_from_platform` | **no** |
| `admin_decommission_user` | **no** |
| `_erase_mist` / `reap_expired_mists` | **no** |

`delete_own_account` is the member-facing "delete my account" door. Under GDPR Article 17 that door is the one that has to mean something.

## RULED 2026-08-12 — content-level tombstone (option 2)

**Stefan's ruling: redact the departed member's message bodies, keep the thread shape.** The survivor keeps their own words and the fact that a conversation happened; the erased member's content actually goes.

**The ruling was made after clarifying what "tombstone" means here**, because the word is used at two layers in this codebase and they give opposite outcomes:

| | mechanism | outcome |
|---|---|---|
| **Author-level** | `author_group_id` / `sender_group_id` → NULL, resolved to *Former member* / *Unknown* (`hub/lib/messages/queries.ts:55`) | words stay, name goes |
| **Content-level** (ruled) | `is_deleted: true, content: null`, placeholder rendered (`GroupForumSection.tsx:201`) | words go, thread shape stays |

**Why not author-level for DMs.** It is already the live behaviour — the DM sender map explicitly resolves "departed/erased included" — so choosing it would have been a no-op leaving the Article 17 exposure exactly as-is. And anonymising a name in a **two-party** thread obscures nothing: the surviving participant knows precisely who they were talking to. The mechanism that works in a many-voiced forum is close to meaningless in a conversation of two. That asymmetry is the reason the forum precedent (ADR-U021, posts remain) must NOT decide this by analogy.

**Still to do at build:** the cascade specification (ADR-U016) across self-delete, admin exit, hard delete, Mist expiry and the last-participant case; the correction of `admin_hard_delete_user`'s false cascade comment; and the gate + instrument below. Next session.

## The open question as it stood before the ruling — kept for provenance

**What should happen to a two-party conversation when one party is erased?** It is genuinely contested, and the answer is not obvious:

- The *other* participant still has a legitimate interest in their own record of the exchange — deleting the thread destroys their data to satisfy someone else's erasure.
- The erased member has a right to have their content removed.
- The existing group-kind answer is **preserve-and-seal** (C-E board D2 / FEAT-PD012), with authorship tombstoned. `ds5_lifecycle_group_closed`'s own comment says *"dm-kind is personal and never group-dispositioned"* — DMs were **deliberately excluded** from the group lifecycle, and then never given a personal one. **The exclusion is documented; the replacement was never built.**

Candidate dispositions, for the board:
1. **Tombstone the author, keep the thread** — mirrors the group-kind rule; the survivor keeps their history, the departed member's name is gone. Weakest on erasure.
2. **Redact the departed member's message bodies, keep the thread shape** — the survivor keeps the conversation and their own words; the erased member's content actually goes. Probably the honest middle.
3. **Delete the thread when any participant is erased** — strongest erasure, destroys the survivor's record.
4. **Delete only when *all* participants are gone** — solves the orphan residue but not the GDPR question, because a thread with one live participant keeps the erased member's words forever.

Note that 3 and 4 answer different problems. **4 alone is the tempting cheap fix and does not discharge the erasure obligation.**

## Definition of ready

- Ruling on the disposition above (Stefan's — it is a privacy-policy call, not an engineering one).
- Cascade specification per ADR-U016 before implementation, covering: member self-delete, admin exit, hard delete, Mist expiry/reaping, and the last-participant case.
- Check whether `get_own_data_export` should carry DM content (if we keep it, the export must show it; Article 15 and Article 17 have to agree).

## The deliverable is the gate, not the sweep

Per the 2026-07-06 retro's standing lesson — *a sweep list that grows back is a wrong-layer pattern, not an unfinished chore* — the fix is not a one-off cleanup of orphaned threads. It is:

1. the disposition implemented **inside the erasure contracts**, so it cannot be forgotten by a caller;
2. a **conformance test** that erases a fixture with a live DM and asserts the ruled outcome — red before the fix;
3. an **instrument** counting conversations with zero surviving participants, alongside the existing orphaned-personal-group counter. **The current instrument measures the wrong noun** — it counts orphaned *groups*, which is why this ran invisibly for months: those DM threads never orphaned a group, so the delta read 0 (955 → 955) while residue accumulated.
4. correcting the false cascade comment in `admin_hard_delete_user`, whichever way the ruling goes.

## Notes

- The reset also found **379 consent records with a NULL `subject_group_id`**, which slipped their `ON DELETE RESTRICT` guard for the same reason — the guard only engages when the reference is present. Worth checking in the same pass whether a NULL subject is ever legitimate, or whether that column should be `NOT NULL`. **Now measured as recurring, not historic: a full integration run produces ~18 of them.** The teardown sweeps them so they stop accumulating, but that is containment — the question of whether an unattributable consent record should be creatable at all is still open, and `NOT NULL` is the structural answer if it should not be.
- Both residue sets were cleared during the reset; this task is about the mechanism, not the leftovers.
