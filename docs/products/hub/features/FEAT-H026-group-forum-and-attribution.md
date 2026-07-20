# FEAT-H026: Group forum & attribution — the group page learns to hold a conversation that stays

---
id: FEAT-H026
title: Group forum & attribution in the Hub
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A group on the Hub can talk in conversations (C-A) but has no forum — no persistent, threaded place where what was said stays said. The platform half (FEAT-PD009) realises the forum contracts and the COM-14 attribution ladder; this feature is the canvas surface over them: COM-5 (the forum surface), COM-6a (post, role-gated), COM-6b (reply, role-gated), COM-7 (Steward moderation), COM-14 (former-member attribution rendered at the content-display layer — the **MEM-9 un-seam**, the Groups area's one forward-seam finally rendering). The v1 oracle is STRONG (B-COMM-004..007): role-gated posting, flat 2-level threading, tombstones in place, moderation as in-place care.

## Solution sketch

- **A Forum section on the group page** (`GroupForumSection`, slotted beside `GroupConversationsSection` in `app/groups/[id]/page.tsx`) — the `GroupConversationsSection` posture copied whole: failure-isolated (list / honest-empty / honest-unavailable; the page always renders), data from `get_group_forum` via a BFF route, session-cached with W9 registration (`hub/lib/forum/`), skeleton per B6. A `view_forum` refusal renders honest absence (no section), never an error banner.
- **Threads newest-first, replies chronological inline** — the oracle's ordering; load-earlier keyset for threads (`p_before`); tombstones render in place ("Removed by a group moderator", content withheld by the platform), author header still shown per PD009 Q3.
- **Composer** (top-level) renders only when the already-fetched effective-permissions read carries `post_forum_messages`; **Reply** affordance on top-level posts only (the flat-threading mirror), only with `reply_to_messages`; **Remove** only with `moderate_forum`, behind `ConfirmModal`. The button is UX; the RPC is the gate.
- **Posting feels instant and stays honest** — optimistic append with confirmed write-through to the session cache (the J-D rule), visible failed-send with retry (B5).
- **Attribution rendered (COM-14 / CB-9):** `display_name` comes from the payload, styled by `attribution` — `'former'` ("Former member") and `'unknown'` ("Unknown") render muted/italic, never as links; applies in the forum **and** in `/messages/[id]`, whose sender map upgrades to the `{display_name, attribution}` shape in the same cycle (the C-A `'Unknown'`-interim note retires). No client ever computes attribution — it renders exactly what the platform resolved.
- **Accessibility/locators:** composer `aria-label="Forum post"`, reply `aria-label="Reply"` — textbox-role locators, names distinct from the nav's "Messages" (the C-A collision lesson); errors `role="alert"`, statuses `role="status"`.
- **BFF routes** (private plumbing, ADR-U038 — never sole enforcement): `GET|POST /api/groups/[id]/forum`, `POST /api/forum/[postId]/reply`, `POST /api/forum/[postId]/moderate`. All enter the route-policy conformance walk automatically (mutations `getUser()`, GETs `getClaims()`).

## Appetite

One cycle (C-B), paired with FEAT-PD009; carries no migration of its own.

## Rabbit holes

- **Don't build a forum home page.** The forum lives on the group page (the v1 shape); a dedicated route is unproven need.
- **Don't design read-state or unread badges for forums** — deliberate §L3 partial, stays forward.
- **Don't restyle the group page** — one new failure-isolated section, sibling to the existing panels.

## No-gos

- No edit/delete of own posts (COM-12 — C-D per CB-3). No content reports (COM-13 — C-D per CB-4). No realtime (C-C per CB-8). No Mist affordances (CB-1). No notification rows or bell surfaces (oracle silence carries). No moderation beyond soft-remove (no restore, no reasons — C-D/A-ADM).

## Stories

### STORY-1: The Forum section (COM-5)
As a group member, I want my group's forum on the group page.
- Given a group I belong to with forum content, when I open the group page, then the Forum section renders top-level posts newest-first with replies chronological beneath each — every field from the `get_group_forum` payload, no client-side joins.
- Given more threads than one page, when I load earlier, then pagination is stable (no duplicates or gaps at the boundary).
- Given the forum read is refused or fails, then the section renders honest absence/unavailable and the rest of the group page still works.
- Given a forum with no posts, then an empty state invites those who may post.

### STORY-2: Open a thread (COM-6a)
As a member whose role grants `post_forum_messages`, I want to post.
- Given the permission in the already-fetched effective-permissions read, then the composer renders; given not, it doesn't — and the platform refuses regardless (UI gating is UX, not security).
- Given I post non-empty text, then it appears optimistically within the B5 window and the confirmed row replaces it (write-through to the session cache).
- Given the post fails, then it visibly fails with retry — never a silent loss. Given empty/whitespace, send is disabled.

### STORY-3: Answer in place (COM-6b)
As a member whose role grants `reply_to_messages`, I want to reply within the thread.
- Given a top-level post, then its Reply affordance renders (with the permission) and my reply lands beneath it chronologically.
- Given a reply, then it carries no Reply affordance (the flat-threading mirror — the platform would refuse; the surface doesn't offer).

### STORY-4: Remove with care (COM-7)
As a member whose role grants `moderate_forum` (the Steward template), I want to remove content in my group.
- Given the permission, then each post carries a Remove affordance behind a `ConfirmModal`; given not, nothing renders.
- Given I confirm, then the post renders as a tombstone from the confirmed response — in place, content gone, thread intact.
- Given the tombstone, then it says removal plainly ("Removed by a group moderator") and offers nothing further.

### STORY-5: Attribution tells the current truth (COM-14 — the MEM-9 un-seam)
As a reader, I want authorship displayed by current membership, never by mutated history.
- Given a post or reply by a current member, then their privacy-shaped name renders.
- Given an author who left or was removed, then **"Former member"** renders (muted, unlinked); given they rejoin, their name reappears with no action by anyone.
- Given an erased author, then **"Unknown"** renders — including in `/messages/[id]`, whose senders now render from the upgraded `{display_name, attribution}` map (DM: name or "Unknown"; group conversation: the full ladder).
- Given any of these, the client renders exactly the platform's resolution — no membership lookups, no name caching across membership changes.

### STORY-6: The doors are honest (ADR-U038 surface half)
As the platform's consumer, the Hub adds no authority.
- Given any forum affordance, then its BFF route enforces nothing the platform doesn't already enforce; denials render as the platform's answer.
- Given the route-policy conformance test runs, then every new route passes the walk unmodified.

## Platform dependencies

FEAT-PD009 (all contracts — the sole data source; payload walk below) · the existing effective-permissions read (GRP-8, `fetchMyPermissions`) for the three affordance gates · the group page composition (Groups area surface touched, no Groups contract change).

**Payload walk (decomposition discipline, run 2026-07-20):** every rendered field traces — thread/reply rows ← `get_group_forum` (id, `parent_post_id`, content-or-NULL, `is_deleted`, timestamps, `{display_name, attribution}`); tombstone ← `is_deleted` + withheld content (author display still served, PD009 Q3); composer/reply/remove visibility ← `fetchMyPermissions(groupId).permissions` (`post_forum_messages` / `reply_to_messages` / `moderate_forum` — the GRP-8 payload already serves the full grant list; verified against `GroupConversationsSection`'s identical use); section visibility ← the forum read's own success/refusal (no separate `view_forum` probe); optimistic rows ← `create_forum_post` / `reply_to_forum_post` returning the confirmed row **with resolved author display** (so the write-through needs no second read); messages detail ← `get_conversation_detail`'s upgraded sender map, consumed in this same cycle (the value-shape change is paired, never orphaned). Every payload key has a consumer; no story renders a key no contract serves.

## Cross-product impact

None Hub-private in shape — the Gimbal will consume the same contracts. The group page grows one section. FEAT-H016/H017's `pending-DS-5` MEM-9 notes clear when this ships (recorded there as landed-via-FEAT-H026).

## Vertical impact

- **Privacy/GDPR:** renders only platform-resolved display fields; "Former member"/"Unknown" styling adds no client inference; tombstone content never reaches the client; no over-fetch-and-filter anywhere.
- **Notifications:** none emitted or rendered (oracle silence; A-NTF revisits).
- **Administration:** moderation is a wrapped, named, confirmed affordance (never a raw primitive); every remove is a BFF telemetry event with actor + outcome.
- **Observability:** post/reply/remove emit telemetry; failed sends surface and log; denials render as platform answers and are platform-recorded.
- **Transactions:** None.
- **Extensibility:** affordances key off permission strings from the catalog (no role-name branching); rendering handles any `attribution` value with a safe default (unknown-shaped); no hardcoded thread-depth logic (the platform enforces flatness — the surface only mirrors it in affordances).

## Performance budget

- **First-paint class:** the group page keeps its class; the Forum section is a **justified standalone read** (ADR-U042) on mount, failure-isolated, session-cached with W9 registration; B3 warm ≤1.0 s for the section, skeleton per B6 in the 1–3 s band.
- **Interaction class:** post/reply are the B5 risk — optimistic append ≤200 ms with ≤100 ms input feedback; remove renders from the confirmed response.
- **E2E fixture rules (C-A lessons, binding):** run-unique names, `markArrivedOnce` for any fixture FIM, composer locators by textbox role (never `getByLabel('Message…')`-adjacent names).
