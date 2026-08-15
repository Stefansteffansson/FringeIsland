# FEAT-PD019: Wielded content authorship — acting groups in the DS-5 content contracts

---
id: FEAT-PD019
title: Wielded content authorship — the ADR-U041 acting parameter reaches the content contracts (forum first), and the attribution ladder learns to name a group author
owner: platform/domain/communication
consumers: [hub]
wave: unassigned
maturity: 4-ready
requires-equipment: none
---

## Problem

FEAT-H018 shipped acting-as as "pure substitution rendered honestly": the selector shows a wielded group's powers, and the only wielded WRITES anywhere are the membership doors (respond/leave as the group, invite-group). **No content contract in the substrate accepts an acting group** — forum, conversations, and announcements resolve the actor from `auth.uid()` alone, so a hat granting `post_forum_messages`/`view_forum` opens nothing (walk finding 2026-08-14, [TASK-ACT-01](../../../planning/backlog/tasks/TASK-ACT-01-acting-does-not-drive-content-actions.md)). Stefan's reaffirmation: *"what is the meaning of having a representative if they cannot act or view?"* Board settled 2026-08-15: **read + write**, family order **forum → group conversations → announcements**.

## Solution sketch

Extend the ADR-U041 wielding gate — the two-limb pattern the acting contracts already use — into the content contracts, one family per tranche:

- **Limb 1 (the key):** the caller personally holds `act_as_group` in the acting group — `has_permission(v_actor, p_acting_group_id, 'act_as_group')`, exactly as `get_group_memberships_of` / `leave_group_as_group` gate it (`20260706120000:331,464`).
- **Limb 2 (the group's own standing):** the acting group is an active member of the context group and itself holds the content permission there — the same substitution machinery H018's panel renders (`get_user_permissions(A, context)`); membership-freshness via the `is_member_of_context` posture (`20260706150000`).
- **Authorship fits the substrate as-is:** `forum_posts.author_group_id` is a plain groups FK (`20260222000000:231`); `messages.sender_group_id` likewise (served today by `get_conversation_detail`, `20260812120000:672`). A wielded write stamps the acting group; the wielding person is recorded platform-side in the audit path only (the PC015 Open Q4 posture) — the content row carries the group.
- **Tranche 1 (forum):** `get_group_forum`, `create_forum_post`, `reply_to_forum_post` gain `p_acting uuid DEFAULT NULL` (additive — NULL means "as myself", byte-identical behaviour). Tranche 2: group conversations. Tranche 3: announcements.

**The ladder learns groups (payload-walk catch, 2026-08-15):** `ds5_resolve_author_display`'s identity gate resolves **personal groups only** (`JOIN users u ON u.personal_group_id = g.id` — `20260720120000:69-72`); an engagement-group author would fold to rung 3 'Unknown', so every wielded post would render anonymously. The gate widens: a resolvable identity is a personal group with a live backing users row **or an engagement group with a live groups row** (`group_type = 'engagement'` only — the `[Deleted User]` sentinel and DeusEx are `system` and keep folding to 'Unknown'). Rungs 1/2 apply verbatim (`gm.member_group_id = author` works for group authors). The display object gains an additive `kind: 'person' | 'group'` key so surfaces can badge honestly (ADR-U041 §5); `attribution` values are unchanged.

## Appetite

One platform session for tranche 1 + the ladder rung (the forum family is three function re-issues plus the ladder). Tranches 2/3 are separate sessions, pulled when wave-planning schedules them. First cut if it swells: wielded WRITE ships first (the walk's exact frustration was the composer); wielded READ of a members-only forum can fast-follow.

## Rabbit holes

- **No recursion.** The acting group's own memberships-of-memberships do not chain (ADR-U041 §2d — the selector lists only groups where *my personal group* holds the key). One level, both limbs, per act.
- **Don't invent a group-author moderation regime.** `moderate_forum_post` is author-agnostic (it acts on rows); group-authored rows are moderated exactly like person-authored rows, v1.
- **Build order with TASK-DM-02:** migration `20260815190000` re-issues the ladder (decommissioned → rung 3). This spec's ladder change **rebases on that body** — two ladder edits in flight is how a lost-update ships; the second one in lands on the first one's text.

## No-gos

- No group-as-actor journey enrolment (JRN-4). No transitive/chained wielding. No notification authorship semantics beyond what FEAT-PD020 rules (dead letters are its board). No DM-as-a-group (DMs are person-anchored by design — the walk proved this posture deliberately).

## Stories

### STORY-1: A wielder reads the forum as the group (tranche 1)
As an `act_as_group` holder in A, I want `get_group_forum(context, p_acting := A)` to serve the forum when A's hat grants `view_forum` there, so that the representative can see what A can see.

**Acceptance criteria:**
- Given both limbs hold (my key in A; A active member of B with `view_forum`), when I call with `p_acting = A`, then the payload is byte-shaped like a member's read (same keys).
- Given my key but A lacks `view_forum` in B (or A's membership is paused/gone), when I call, then `42501` with copy naming the failing limb — never a generic error, never a leak of B's content.
- Given no `p_acting`, then behaviour is byte-identical to today (additive default).

### STORY-2: A wielder posts and replies as the group (tranche 1)
As an `act_as_group` holder in A, I want `create_forum_post` / `reply_to_forum_post` with `p_acting := A` to write rows authored by A, so that the group speaks where it belongs.

**Acceptance criteria:**
- Given both limbs hold with `post_forum_messages`, when I post, then the row lands with `author_group_id = A` (not my personal group), and the read serves it.
- Given either limb fails, then `42501` naming the limb; no row.
- Given the same call without `p_acting`, then the row is mine — unchanged.

### STORY-3: A group author is named and badged, never anonymous (tranche 1)
As any member reading the forum, I want a group-authored post attributed to the group by name with `kind: 'group'`, so that representation is visible for what it is (ADR-U041 §5).

**Acceptance criteria:**
- Given a post authored by engagement group A (member of B), when the forum is read, then its author object is `{display_name: A's name, attribution: 'active', kind: 'group'}`.
- Given A has since left B, then `{display_name: 'Former member', attribution: 'former', kind: 'group'}` — the person rungs verbatim.
- Given a person-authored post, then the author object carries `kind: 'person'` and is otherwise byte-identical to today; given the sentinel or a system group, then rung 3 'Unknown' exactly as today (system groups are not admitted by the widened gate).

### STORY-4: Group conversations as the group (tranche 2 — pulled separately)
As an `act_as_group` holder, I want the group-conversation contracts (`get_conversation_detail`, `send_message`, join/read-state) to accept `p_acting` under the same two limbs, so the second family opens.

**Acceptance criteria:** gate and authorship semantics identical to STORY-1/2 with `sender_group_id = A`; sender display resolves through the widened ladder with `kind`. Firm G/W/T are written when the tranche is pulled (the family's participant/read-state semantics need their own payload walk).

### STORY-5: Announcements as the group (tranche 3 — pulled separately)
Same shape over the announcement contracts (`author_group_id` already a groups FK, `20260720200000:79`). Firm G/W/T at pull, including the FEAT-PD020 interplay (a group-authored announcement's fan-out must not re-create dead letters).

## Platform dependencies

PC015's acting fabric entirely (the key, the gate pattern, `get_user_permissions` substitution, `is_member_of_context`). TASK-DM-02's ladder re-issue (`20260815190000`) as the rebase base. FEAT-PD020 is the sibling board (delivery semantics) — independent builds, same walk.

## Cross-product impact

Paired surface spec: [FEAT-H046](../../../products/hub/features/FEAT-H046-wielded-content-affordances.md) (the Hub affordances). The Gimbal inherits the contracts by construction (ADR-U009).

## Vertical impact

- **Administration:** wielded writes are auditable to the wielding person platform-side (the PC015 Open Q4 audit posture); moderation primitives unchanged and author-agnostic.
- **Privacy/GDPR:** the content row names the group, not the person — deliberate (representation, not surveillance); the person↔act linkage lives only in the platform audit path. Ladder change exposes no new personal data (group names are group data).
- **Notifications:** none here — group-authored announcement fan-out semantics are FEAT-PD020's board (STORY-5 defers to it).
- **Observability:** wielded content acts emit the house id-only telemetry; refusals are 42501s with limb-naming copy (traceable).
- **Transactions:** none.
- **Extensibility:** `p_acting` is additive-default (no signature break, ADR-U015 compliant); `kind` is an open-set additive key (no sealed switch); no new enums.

## Decomposition walks (recorded 2026-08-15, session of the board)

- **Mechanism walk:** gate `20260706120000:331,464`; seed `supabase/seeds/01_permissions.sql:10` (+ Steward template `02_role_templates.sql:26`); ladder gate `20260720120000:69-75`; authorship columns `20260222000000:231` / `get_conversation_detail` serving `sender_group_id` (`20260812120000:672`); `is_member_of_context` `20260706150000`.
- **Payload walk:** tranche-1 payloads are shape-preserving; the one addition is `kind` on author display objects (additive, tolerant readers). The walk's catch: the ladder's personal-only identity gate (STORY-3's reason to exist).
- **Conformance gates:** re-issued functions keep their ownership rows; if tranche 1 adds any new function it registers in `supabase/ownership.manifest.json` (functionOwner defaults to CORE — a DS-5 label is mandatory); no cross-owner trigger mounts in this spec (GC-8 n/a — PD020 owns the trigger question).
