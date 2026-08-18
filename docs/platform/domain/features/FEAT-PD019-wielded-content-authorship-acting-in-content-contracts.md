# FEAT-PD019: Wielded content authorship — acting groups in the DS-5 content contracts

---
id: FEAT-PD019
title: Wielded content authorship — the ADR-U041 acting parameter reaches the content contracts (forum first), and the attribution ladder learns to name a group author
owner: platform/domain/communication
consumers: [hub]
wave: unassigned
maturity: 5-in-cycle
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

### STORY-4: Group conversations as the group (tranche 2 — pulled 2026-08-18)
As an `act_as_group` holder in A, I want the six group-conversation contracts to accept `p_acting` under the same two limbs, so that the second family opens and the group can sit in, read, and speak in its host's conversations.

**Board (Stefan, 2026-08-18, industry-lens walk):** scope = **all six contracts** (`get_group_conversations`, `create_group_conversation`, `join_group_conversation`, `get_conversation_detail`, `send_message`, `mark_conversation_read` — the list door included so the surface half can render; create included); read-state = **the shared group clock** (A participates as itself, one `last_read_at` row — one representative's read marks it read for the group, the shared-inbox norm); **standing per act** (every wielded act re-runs the two-limb gate, forum-consistent — organizational actors are re-authorized per action everywhere; persons keep their family's looser participation-wall semantics, verified: membership loss does not clear participant rows); **hint silence accepted v1** (the emitter's backing-user join skips a group participant by construction — verified applied body; the standard-shaped future rider is a topic-scoped channel, an ADR-U039 §4 amendment — never role-wide emitter fan-out).

**Acceptance criteria:**
- Given both limbs hold (my key in A; A an active engagement-group member of B), when I call `get_group_conversations(B, p_acting := A)`, then the list is byte-shaped like a member's read with `am_i_participant` reflecting **A's** live participation; given either limb fails, then `42501` naming the failing limb (keyless learns nothing — S5).
- Given A also holds `create_group_conversations` in B (limb 2b), when I call `create_group_conversation(B, title, p_acting := A)`, then the thread is created with **A as its first participant**; given A lacks the permission, then `42501` naming it.
- Given the limbs hold, when I call `join_group_conversation(conv, p_acting := A)`, then A's participant row lands (rejoin clears `left_at` — the family's own `ON CONFLICT` semantics); the availability guard runs with **A as subject** (pure substitution, the tranche-1 ruling).
- Given A participates, when I call `send_message(conv, content, p_acting := A)`, then the row lands `sender_group_id = A` and reads serve it through the widened ladder (`kind: 'group'`); given A has not joined, then `42501` 'Not a participant' (the family's wall, after the limbs).
- Given A's membership in B is paused or removed, when any wielded act runs, then `42501` naming the standing limb — **regardless of A's surviving participant row** (standing per act; A's existing messages render 'Former member' via the shipped ladder).
- Given `mark_conversation_read(conv, p_acting := A)`, then A's single `last_read_at` advances (the shared clock), and a wielded `get_conversation_detail` serves `my_last_read` from A's row.
- Given any wielded call against a `kind = 'dm'` conversation, then `42501` — limb 2a has no context group to hold in (DMs stay person-anchored **by construction**, no special-case code).
- Given no `p_acting` on any of the six, then behaviour is byte-identical to today (additive default); the PC026 admin-sight arm stays personal-path-only.

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

## Implementation notes (tranche 1 — 2026-08-16, TASK-PD019-1)

**Migration `20260816120000`** (held at the schema gate). What shipped, and the decisions the build recorded:

- **The gate is one shared helper**: `ds5_assert_wielded_content_gate(p_actor, p_acting_group_id, p_context_group_id, p_permission_name)` — limb 1 verbatim from the acting fabric (`'you do not have permission to act as this group'`, S5: keyless learns nothing); limb 2 split into two named refusals (`'the acting group is not an active member of this group'` / `'the acting group does not hold <perm> in this group'`) so the copy names the failing limb per the ACs. Internal ACL (revoked from `authenticated`, the `ds5_resolve_author_display` posture); registered DS-5 in the ownership manifest. Tranches 2/3 reuse it as-is.
- **The three re-issues are DROP + CREATE**, not CREATE OR REPLACE — the added `p_acting` changes the signature, and create-or-replace would leave the old arity alive as an overload (the `20260706150000` lesson). ACLs re-stated from the **applied** objects (probed before authoring — they carry `service_role` beyond what the C-B migration text shows); a DO block proves the old arities gone and the gate helper client-sealed.
- **When acting, the personal permission check is substituted, not stacked** — the wielder needs no personal `view_forum`/`post_forum_messages` in the context (that absence is the walk's exact frustration). The FIM check (`ds5_require_fim_actor`) still precedes everything: a Mist with `p_acting` is refused before the limbs.
- **The availability guard's subject is the actor of record**: a wielded write runs `assert_group_writable(context, p_acting)` — pure substitution; the acting group's own `rest_group` standing governs, not the wielder's.
- **`kind` lands on resolvable identities only** (rungs 1/2 and the DM rung); rung-3 `'Unknown'` returns are byte-identical to before — 'Unknown' claims no kind. Two sibling cells (rung-3 exact-equality assertions) were deliberately left and now double as the guard for this.
- **Named v1 posture, found at build**: a wielded post is editable by *no one* — `edit_own_forum_post` matches `author_group_id` against the caller's personal group only, so a group-authored row refuses even the wielder acting as the group. Consistent with the spec's no-gos (no wielded edit was specified); FEAT-H046's session should not render an edit affordance on `kind: 'group'` posts it cannot honour, and a wielded-edit contract is a future tranche's board if wanted.
- **Red → green**: red run 2026-08-16 — 13 red / 2 labelled guards green (10 `p_acting` cells PGRST202 signature-absent; 3 ladder cells red on the personal-only identity gate; guards: the additive-default member read, the rung-3 byte-identity). Green after apply: `wielded-forum-contracts.test.ts` 15/15.
- **Sibling sweep (named in the migration header)**: `forum-contracts.test.ts:443` and `:449` adapted (rung-2 person objects gain `kind: 'person'`); `forum-contracts.test.ts:513` and `member-erasure-disposition.test.ts:337` deliberately left (rung-3 guards). All other author/sender consumers assert key-by-key.
- **Dev-DB state**: the migration is applied; the `migration repair --status applied 20260816120000` bookkeeping step was classifier-denied in the autonomous session and is listed in the PR body for the gate.

Tranches 2 (group conversations, STORY-4) and 3 (announcements, STORY-5) remain unpulled; maturity stays `5-in-cycle` until they ship or wave-planning re-scopes the feature.

## Decomposition walks (recorded 2026-08-15, session of the board)

- **Mechanism walk:** gate `20260706120000:331,464`; seed `supabase/seeds/01_permissions.sql:10` (+ Steward template `02_role_templates.sql:26`); ladder gate `20260720120000:69-75`; authorship columns `20260222000000:231` / `get_conversation_detail` serving `sender_group_id` (`20260812120000:672`); `is_member_of_context` `20260706150000`.
- **Payload walk:** tranche-1 payloads are shape-preserving; the one addition is `kind` on author display objects (additive, tolerant readers). The walk's catch: the ladder's personal-only identity gate (STORY-3's reason to exist).
- **Conformance gates:** re-issued functions keep their ownership rows; if tranche 1 adds any new function it registers in `supabase/ownership.manifest.json` (functionOwner defaults to CORE — a DS-5 label is mandatory); no cross-owner trigger mounts in this spec (GC-8 n/a — PD020 owns the trigger question).

## Decomposition walks — tranche 2 (recorded 2026-08-18, session of the pull)

- **Mechanism walk (applied bodies probed, not migration text):** participation is the wall — `conversation_participants` PK `(conversation_id, participant_group_id)`, personal groups at every insert site today (`create_group_conversation` creator row; `join_group_conversation` membership-gated with `ON CONFLICT … SET left_at = NULL` rejoin); `send_message` gates on participation only (+ availability guard + seal — **no permission check**); `mark_conversation_read` writes the caller's row; latest issuers: send/create/join `20260803190000`, list/is-participant `20260804230000`, mark-read `20260719230500`, detail/inbox `20260815190000`. **No trigger or CHECK restricts participants to personal groups** (probed constraints: FKs only — `participant_group_id → groups ON DELETE CASCADE`; `sender_group_id ON DELETE SET NULL` → rung-3 'Unknown', the forum's exact disposition). **Membership loss does not clear participant rows** (leave/remove functions: zero `conversation_participants` mentions; C-E dispositions are group-closure sealing) — the fact behind the standing-per-act ruling. **The hint emitter is group-safe by construction**: `ds5_emit_message_hint` joins participants to `users` on `personal_group_id` and requires `auth_user_id IS NOT NULL` — a group participant is skipped, never an error (the fact behind the hint ruling). ACLs on all six: `{authenticated, service_role}` (probed).
- **Payload walk:** all six payloads are shape-preserving — no new keys. `am_i_participant` and `my_last_read` change *referent* (A's participation / A's clock) on the wielded path only; `participants[]` and the senders map already resolve group identities with `kind` through the tranche-1 ladder; the surface badges A's own row client-side by `participant_group_id` (no new key needed — tolerant readers). No quote-bearing ACs introduce new copy: every refusal string is tranche 1's helper copy or the family's own ('Not a participant').
- **Gate mechanics:** the shared helper widens — `p_permission_name` gains `DEFAULT NULL`, and NULL skips limb 2b (join/send/detail/mark-read/list have no content permission in this family; membership **is** the bar, which limb 2a already checks). Same signature, CREATE OR REPLACE; create keeps limb 2b with `create_group_conversations`. Wielded availability-guard subject is the acting group (tranche-1 ruling carried).
- **Conformance gates:** no new functions, tables, or trigger mounts — six re-issues keep their DS-5 manifest rows (name-keyed, arity-agnostic); the helper body change stays under its existing registration. GC-8 n/a.
