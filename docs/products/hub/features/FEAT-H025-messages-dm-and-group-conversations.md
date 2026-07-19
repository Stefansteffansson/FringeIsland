# FEAT-H025: Messages — DM and group conversations in the Hub

---
id: FEAT-H025
title: Messages — DM and group conversations
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A FIM on the Hub cannot talk to anyone. The platform half (FEAT-PD008) realises the conversation contracts — pair DMs and group conversations (COM-15, CB-7) — and this feature is the canvas surface over them: COM-1 (send), COM-2 (inbox), COM-3 (detail), COM-4 (read state), COM-15 (group conversations). First messaging surface of v2; the v1 oracle (B-MSG-001..006) is STRONG and its spine carries: group-keyed authorship, one conversation per pair, inbox by recency, **unread is a badge fed by read-state — DMs create no notifications**.

## Solution sketch

- **Nav:** a **Messages** item (FIM-only — CB-1; Mists never see it) with an unread indicator = count of conversations with `has_unread`, derived from the inbox read. Client cache registers its invalidator in `hub/lib/auth/cache-registry.ts` (W9).
- **`/messages`** — the inbox: DM and group conversations in one list, sorted by `last_message_at`, each row showing kind, display context (other FIM's privacy-respecting name / group name + title), recency, unread dot.
- **`/messages/[id]`** — detail: chronological messages (paged, load-earlier), sender display from the payload's participant resolution (`'Unknown'` fallback for unresolvable senders until COM-14 lands in C-B), composer. Opening marks read (`mark_conversation_read` via BFF).
- **Start a DM:** a "Message" action on the group-member roster entry → BFF → `get_or_create_dm_conversation` → navigate to the conversation. One canonical entry point in C-A.
- **Group conversations:** the group detail page gains a **Conversations** panel — lists the group's conversations (`get_group_conversations`) with join/open affordances; a create affordance renders only when `has_permission(…, 'create_group_conversations')` (permission-gated, never role-string-gated); join/leave/rejoin per PD008 semantics.
- **BFF routes** (private plumbing, ADR-U038 — never sole enforcement): `GET /api/messages`, `GET|POST /api/messages/[id]`, `POST /api/messages/[id]/read|join|leave`, `POST /api/messages/dm`, `POST /api/messages/group`, `GET /api/groups/[id]/conversations`. All enter the route-policy conformance walk automatically (mutations `getUser()`, GETs `getClaims()`; no runtime/region exports).
- **Refresh model (C-A):** fetch on mount/navigation and after own actions; confirmed mutations write through to the session cache (the J-D rule). **No sockets, no polling loops** — C-C adds the ADR-U039 live layer for this surface and forum together (CB-8); nothing here may touch a realtime channel or add to §L2 §4's named list.

## Appetite

One focused build session, paired with FEAT-PD008 (platform lands first; surface consumes API-only).

## Rabbit holes

- Typing indicators, presence, delivery receipts — not in Ferd's A-COM scope at all.
- Rich text / attachments — plain text only (attachments are a DS-4 seam, full-forward).
- A member-search "new message to anyone" composer — the roster action is the C-A entry; a global picker can come with Discovery.
- Per-message unread math — the badge counts conversations, not messages.

## No-gos

- No Mist affordances anywhere (CB-1). No notification rows for messages (oracle rule). No forum UI (C-B). No edit/delete of sent messages (COM-12, C-D). No moderation surface (C-B+). No realtime (C-C).

## Stories

### STORY-1: Messages in my nav, honestly badged (COM-2/COM-4)
As a FIM, I want to see that conversations await me.
- Given I am a FIM with at least one conversation holding unread messages, when the Hub chrome renders, then Messages shows an unread indicator equal to the number of conversations with unread.
- Given I read everything, when I return to any page, then the indicator clears (cache invalidated by the read action, not by a page reload).
- Given I am a Mist, when the chrome renders, then no Messages item exists.

### STORY-2: My inbox (COM-2)
As a FIM, I want one list of all my conversations.
- Given I have DM and group conversations, when I open `/messages`, then both kinds render in one list sorted by last activity, each row carrying kind, display context, recency, and unread state — every field from the `get_my_conversations` payload, no client-side joins.
- Given a DM partner whose privacy settings restrict their name, when the inbox renders, then I see exactly what the platform resolved (no over-fetch and filter).
- Given I have no conversations, then an empty state invites me to message a group member.

### STORY-3: A conversation, read (COM-3/COM-4)
As a FIM, I want to read a conversation and have it marked read.
- Given a conversation with history, when I open `/messages/[id]`, then messages render chronologically with sender display names from the payload (departed senders as the fallback until COM-14), and my read state updates via the BFF (badge follows).
- Given more history than one page, when I load earlier messages, then pagination is stable (no duplicates or gaps at the boundary).
- Given a conversation I don't participate in, when I open its URL, then I get a not-found/denied surface, not a leak.

### STORY-4: Send (COM-1)
As a FIM, I want sending to feel instant and be true.
- Given an open conversation, when I send non-empty text, then it appears optimistically within the B5 window and the confirmed row replaces it (write-through to the session cache — the confirmed response, not the optimistic guess).
- Given the send fails, then the optimistic entry visibly fails with a retry affordance (no silent swallow — the failure is an observability event).
- Given empty/whitespace input, then send is disabled.

### STORY-5: Start a DM from a member (COM-1)
As a FIM, I want to message a fellow group member.
- Given a member roster entry that is not me and not a Mist, when I click Message, then I land in our one conversation — existing history if we've talked, fresh if not.
- Given I click it twice fast, then I land in the same conversation both times (the platform's pair uniqueness absorbs the race).

### STORY-6: My group's conversations (COM-15)
As a group member, I want to see, join, and open my group's conversations.
- Given a group I belong to with conversations, when I open the group page, then the Conversations panel lists them with title and my join state — every field from `get_group_conversations`.
- Given I hold `create_group_conversations`, then a create affordance renders; given I don't, it doesn't (permission asked of the platform, never computed locally).
- Given I join, open, leave, and rejoin, then each transition renders from the confirmed response and my message history survives my absence.

### STORY-7: The doors are honest (ADR-U038 surface half)
As the platform's consumer, the Hub adds no authority.
- Given any Messages affordance, then its BFF route enforces nothing the platform doesn't already enforce (denials render as the platform's answer; UI gating is UX, not security).
- Given the route-policy conformance test runs, then every new route passes the walk unmodified.

## Platform dependencies

FEAT-PD008 (all contracts — the sole data source; payload walk below) · PC-3 `has_permission` for the create affordance · existing group roster surface (Groups area) for the DM entry point.

**Payload walk (decomposition discipline, J-D rider):** every rendered field traces — inbox row ← `get_my_conversations` (id, kind, display context, `last_message_at`, `has_unread`); detail ← `get_conversation_detail` (messages page, **per-sender display resolution incl. departed participants**, my `last_read_at`); group panel ← `get_group_conversations` (id, title, `am_i_participant`); badge ← derived client-side from inbox rows. Every payload key has a consumer; no story renders a key no contract serves. The two walk-caught gaps (departed-sender display; the group-conversations listing read) are folded into PD008 before both specs are `4-ready`.

## Cross-product impact

None Hub-private in shape — the Gimbal will consume the same contracts. The group page grows a panel (Groups-area surface touched, no Groups contract change).

## Vertical impact

- **Privacy/GDPR:** renders only platform-resolved fields; no client-side filtering of another FIM's data; export/deletion surfaces unchanged (C-E).
- **Notifications:** none emitted or rendered (oracle rule; unread = badge). A-NTF may revisit.
- **Administration:** no admin affordances here; moderation arrives C-B+.
- **Observability:** send/join/create/read emit BFF telemetry with actor + outcome; failed sends surface and log; RLS denials are platform-recorded.
- **Transactions:** None.
- **Extensibility:** renders `kind` from data (a new conversation kind renders as a list row without Hub changes to the inbox); no kind switch statements.

## Performance budget

- **First-paint class:** `/messages` and `/messages/[id]` are B2 (cold ≤2.5 s) / B3 (warm ≤1.0 s) / B4 (revisit via session cache — no visible loading state); data-boot = **justified standalone reads** (not overview-bundle; messaging is not boot-critical), session-cached with W9 registration.
- **Interaction class:** send is the B5 risk — optimistic append paints ≤200 ms with ≤100 ms input feedback; mark-read and join/leave render from confirmed responses without blocking navigation.
- **Loading states:** inbox/detail skeletons in the 1–3 s band (skeleton, not spinner); sub-1 s renders nothing extra; >3 s is a defect per B6.
