# FEAT-PD008: Conversation & message contracts — one conversation model (DM + group grain), read through contracts, written through no other door

---
id: FEAT-PD008
title: Conversation & message contracts (DM + group grain)
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The Hub v2 has no messaging. The substrate has a proven DM core (D15 rebuild: `conversations` strictly 1-to-1 with inline read-state, `direct_messages` immutable, RLS'd, oracle STRONG) but **no contract layer** — v1 read and wrote the tables directly, the exact sin ADR-U009/U038 exist to end. And the realized conversation model is **pair-grain only**, while the board settle (CB-7, Stefan 2026-07-19) put group conversations in scope now: the DS-5 spec's own L2 already commits to "pair or group grain; kinds data-driven" (`communication.md` §2) — this feature realises it.

This is the **first DS-5 feature spec**. Like FEAT-PD002 for DS-3, it lands the service's contract discipline: PostgREST RPC as the platform surface (A#9), writes narrowed so the contracts are the only door, and the conformance gate extended to police DS-5's tables.

## Solution sketch

**Conversation-model redesign (one migration, data-preserving — pre-launch, small data):**

- `conversation_kinds` — registry table (TEXT key), seeded `dm`, `group`. Never an enum (invariant 6; DS-5 §8 Q8 firms here: conversation vs forum = distinct kinds, one registry space; forums stay `forum_posts`).
- `conversation_participants` — junction: `conversation_id` FK, `participant_group_id` FK → `groups` (personal groups — P-O1, never a user-id column), `last_read_at`, `joined_at`, `left_at NULL`. PK (conversation_id, participant_group_id). RLS from birth.
- `conversations` — gains `kind` FK → registry and nullable `group_id` FK → `groups` (set for `group` kind: the PC-3 group the conversation lives in). The hardwired `participant_1/2` pair columns and their CHECKs retire; each existing row emits its two junction rows carrying its `last_read_at` values. **Invariant kept in schema:** exactly one `dm` conversation per FIM pair (canonical pair-key mechanism; firms at migration authoring — schema-enforced, never app-enforced). `last_message_at` stays (inbox sort).
- `direct_messages` → renamed `messages` (it now carries both kinds; honest naming). Columns unchanged (`conversation_id`, `sender_group_id ON DELETE SET NULL`, non-empty `content`, `created_at`, immutable). The PC-4 `audit_admin_message_send` trigger re-created on the renamed table.
- `can_update_conversation()` retires with the pair columns; `is_conversation_participant()` reshapes over the junction.
- **U039 disposition rider:** `conversations` and `direct_messages`/`messages` leave the `supabase_realtime` publication (legacy postgres_changes shape, not carried into v2 — ADR-U039; `notifications`' publication membership is A-NTF's call, untouched here). The DS-5 spec's §3/§6/§8 Q7 realtime text is amended to U039 in the same batch (PROCESS §9 — the spec yields).
- **Conformance-gate rider:** `DS_TABLES` += `conversations`, `messages`, `forum_posts`, `conversation_participants`, `conversation_kinds`; `DS_OWNED_ALLOWLIST` += the functions below (existing DS-5-owned helpers included). `notifications` stays out by design (ADR-U048).

**Contracts (SECURITY DEFINER, `search_path=''`, actor = four-hop personal-group chain, granted to `authenticated`):**

| Contract | Serves | Gate |
|---|---|---|
| `get_my_conversations()` | inbox: id, kind, display context (DM: other participant's privacy-respecting display name; group: group name + title), `last_message_at`, `has_unread` | active participant |
| `get_conversation_detail(p_conversation_id, p_before, p_limit)` | messages chronological (paged), my read state, and **display resolution for every sender appearing in the returned page** — active participants, departed participants (`left_at` set), and erased senders (`sender_group_id` NULL → the `'Unknown'` fallback until COM-14) — privacy-respecting, platform-side (payload-walk catch: a page's senders are a superset of active participants) | active participant |
| `send_message(p_conversation_id, p_content)` | insert + return the message row (bumps `last_message_at`) | active participant; non-empty |
| `get_or_create_dm_conversation(p_other_user_id)` | the one DM per pair, created on first use | **FIM-only both sides (CB-1)**; not self |
| `create_group_conversation(p_group_id, p_title)` | a `group`-kind conversation in that group; creator auto-joins | `has_permission(…, 'create_group_conversations')` — **new seeded permission row** (catalog + role templates) |
| `get_group_conversations(p_group_id)` | the group's conversations: id, title, `created_at`, `am_i_participant` (payload-walk catch: the group-page panel needs a listing read `get_my_conversations` cannot serve) | group membership |
| `join_group_conversation(p_conversation_id)` / `leave_group_conversation(p_conversation_id)` | junction row create / `left_at` set (rejoin clears it) | group membership (join); own row (leave) |
| `mark_conversation_read(p_conversation_id)` | own junction `last_read_at = now()` | own row |

Writes narrow to the contracts (the PD002 pattern): permissive v1 INSERT/UPDATE policies on the comm tables drop; participant-scoped SELECT policies remain as defense-in-depth. No custom API route touches a DS-5 table (entity rule); the Hub reaches these via its BFF.

## Appetite

One focused build session, paired with FEAT-H025. The migration is the deep half; the contracts are mechanical over it.

## Rabbit holes

- **Ad-hoc multi-party DMs** (arbitrary FIM sets outside a group) — not this feature; `group` kind is PC-3-group-scoped. A future kind row, zero schema change (that's the point of the registry).
- **Unread *counts* per conversation** — `has_unread` boolean only; the badge is "conversations with unread", not message tallies. Keeps clear of invariant-2 adjacency and count-maintenance cost.
- **Message search, attachments, edit/delete** — COM-12 is C-D; attachments are a DS-4 seam, full-forward.
- **Realtime** — nothing here opens a channel. C-C builds the U039 ping-then-fetch layer for both surfaces at once (CB-8).

## No-gos

- No Mist access in any contract (CB-1; DS-5 invariant 3's gate is PC-2 identity status).
- No forum changes (C-B) and no `notifications` writes from these contracts (message-received notification triggers are deliberately **not** emitted — the v1 oracle rule "DMs create NO notifications, unread state is the badge" carries; revisit at A-NTF if product wants otherwise).
- No `ds5_lifecycle_*` handlers yet (C-E) — **but the D2 disposition scope grows**: group-kind conversations tied to a closing/deleting group must be dispositioned by the C-E handlers alongside forum content. Recorded here so C-E inherits it.
- No group-conversation moderation surface (rides C-B's moderation or later; Steward tooling for conversations is not in C-A).

## Stories

### STORY-1: My inbox, honestly (COM-2/COM-4 platform half)
As a FIM, I want my conversations listed with what I need to choose one, so the inbox is one read.
- Given I participate in DM and group conversations, when I call `get_my_conversations()`, then each row carries id, kind, display context, `last_message_at`, `has_unread`, sorted by `last_message_at` desc.
- Given I left a group conversation (`left_at` set), when I list, then it does not appear.
- Given another participant's privacy settings restrict their name, when I list, then the display context respects them (platform-side, never client-filtered).

### STORY-2: One conversation in full (COM-3 platform half)
As a FIM, I want a conversation's history chronological and paged.
- Given a conversation I participate in, when I call `get_conversation_detail`, then I get messages ascending with stable pagination via `p_before` + `p_limit`, the participant list, and my `last_read_at`.
- Given a conversation I do not participate in, when I call it, then I get an authorization error, not an empty result.

### STORY-3: Send a message (COM-1 platform half)
As a FIM, I want to send into my conversation through one door.
- Given I am an active participant, when I `send_message` with non-empty content, then the row lands with my personal group as sender and `last_message_at` bumps.
- Given empty/whitespace content, when I send, then it is rejected.
- Given I have left the conversation, when I send, then it is rejected.

### STORY-4: One DM per pair (COM-1)
As a FIM, I want messaging someone to always land in our one conversation.
- Given no DM exists between us, when I call `get_or_create_dm_conversation`, then one `dm` conversation with both junction rows exists.
- Given one already exists, when either of us calls it, then the same conversation returns — including under concurrent first-calls from both sides (schema-level uniqueness resolves the race to one row).
- Given the other identity is a Mist, or I am a Mist, when called, then it is refused (CB-1).

### STORY-5: A group conversation exists because someone with the permission made it (COM-15)
As a group member with the permission, I want to open a conversation in my group.
- Given I hold `create_group_conversations` in the group, when I `create_group_conversation`, then a `group`-kind conversation carrying that `group_id` exists and I am its first participant.
- Given I lack the permission (`has_permission` false — never a role-name check), when I call it, then it is refused.

### STORY-6: See, join, leave, rejoin (COM-15)
As a group member, I want to find and step into and out of my group's conversations.
- Given a group I belong to with conversations, when I call `get_group_conversations`, then each row carries id, title, `created_at`, `am_i_participant`; given a group I don't belong to, the call is refused.
- Given a group conversation in a group I belong to, when I `join_group_conversation`, then my junction row exists; joining again is idempotent.
- Given I am a participant, when I leave, then `left_at` is set; my prior messages remain attributed to me.
- Given I rejoin, then `left_at` clears and history is readable again.
- Given I am not a member of the PC-3 group, when I join, then it is refused.

### STORY-7: Read state is mine alone (COM-4)
As a FIM, I want marking-read to touch only my own cursor.
- Given a conversation with participants, when I `mark_conversation_read`, then only my junction row's `last_read_at` changes (the pair-column era's cross-participant guard survives as junction row ownership).
- Given two of my devices race to mark read, then last-write-wins with no error (total order per row; no impossible-race AC).

### STORY-8: No path around the contracts (ADR-U038 direct-caller)
As the platform, I refuse every door that isn't a contract.
- Given a direct PostgREST caller (including an authenticated Mist), when it INSERTs/UPDATEs any comm table directly, then RLS/privilege denies it.
- Given a direct caller invoking the contracts, then every gate above holds identically to the BFF path (the route is never the sole enforcement — adversarial direct-call tests per W12).
- Given the conformance suite runs, then no Core function references the DS-5 tables (gate extended this cycle).

## Platform dependencies

PC-2 FIM/Mist status (CB-1 gate) · PC-3 groups, membership, `has_permission`, the seeded permission catalog (one new row) · PC-4 audit posture (`audit_admin_message_send` carries across the rename) · PC-1 nothing new (no realtime this cycle).

## Cross-product impact

FEAT-H025 (Hub) is the paired consumer. The Gimbal inherits by contract (nothing Hub-private in the payloads). C-E inherits the widened D2 disposition scope and the export section duty (`get_own_messages_export()` will cover `messages` + participation). A-NTF inherits the untouched `notifications` publication question.

## Vertical impact

- **Privacy/GDPR:** conversation/message rows are FIM data — RLS on all three new/reshaped tables from birth; display names resolved platform-side under privacy settings; export section lands at C-E (spec'd there, incl. the suspended-member posture per CB-6); erasure: platform-exit keeps `sender_group_id SET NULL` shape; junction rows erase with the personal group.
- **Notifications:** deliberately none (oracle rule: DMs create no notification rows; unread = read-state). Group-conversation activity likewise none in C-A; revisit at A-NTF.
- **Administration:** admin sends remain audited (trigger carried across rename); group-conversation disposition on group close/delete added to the D2/C-E cascade scope (ADR-U016 — cascade named before build).
- **Observability:** contract denials are observability events (RLS denials recorded per platform tier law); send/create/join emit structured logs at the BFF; migration traceable.
- **Transactions:** None.
- **Extensibility:** `conversation_kinds` is an open TEXT registry (no enum, no sealed union anywhere — W-checklist: registries non-closing); the new permission is a catalog row, not a hardcoded check.

## Performance budget

N/A (no surface) — budgets bind at FEAT-H025. Contract shape serves them: inbox is one RPC; detail is one RPC (B3 ≤1.0 s warm).

## Open spec questions (for the schema gate)

- **Q1 — DM-pair uniqueness mechanism:** canonical pair-key column vs expression unique index on `dm`-kind rows. Migration authoring decides; the invariant (one per pair, schema-enforced) is fixed.
- **Q2 — `messages` rename blast radius:** rename in place (lean — pre-launch, honest naming) vs keep `direct_messages` as legacy name. Reviewer's call at the gate.
- **Q3 — permission grain for group conversations:** one `create_group_conversations` row (lean) vs create+join pair. Join-by-membership is the spec'd default either way.
