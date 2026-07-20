# FEAT-PD009: Forum & attribution contracts — the group forum through one door, authorship displayed by membership, and the hard-delete crossing comes home

---
id: FEAT-PD009
title: Forum & attribution contracts (group forum + membership-status display + ds5 lifecycle relocation)
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Implementation notes

**Built 2026-07-20, Cycle C-B** — schema-gate PR #210 (named approval "ok merge 210", migration `20260720120000`, applied + repaired on dev). Paired surface: FEAT-H026 (PR #212).

**Red→green, honestly:** the contract suite (`hub/tests/integration/communication/forum-contracts.test.ts`) was demonstrated **18 red / 3 labelled green** pre-apply — every refusal pinned to its exact SQLSTATE (42501 / 22023 / P0002 / P0001 + the oracle message text), so an absent function could not satisfy a refusal, and the three direct-write narrowing probes red because the *live* permissive policies still allowed the write — and flipped to **21/21 green** on apply. The 3 pre-apply greens were labelled: the ADR-U047 sentinel-reassignment behavior-preservation guard (green pre- *and* post-relocation, via an admin-inserted post — proving the reassignment beats the personal-group `SET NULL`), the existing outsider/Mist forum-`SELECT` RLS, and the handler-not-a-client-surface always-refused probe. **Fixture catch at red (green-at-red, investigated + fixed):** engagement-group role instances are named by *template* name (`Member Role Template`), not `Member` — the bare-name lookup had left fixture members permission-less and masked the direct-INSERT narrowing red.

**What landed (as built):**
- `ds5_resolve_author_display(author_group_id, scope_group_id)` — the COM-14 ladder as **one substrate home** (PD009 Q1): rung 1 = a personal group with a backing `users` row + a membership row (any status) in the scope group → privacy-shaped name, `active`; rung 2 = backing row, no membership → `'Former member'` / `'former'` (name withheld; rejoin restores, no data mutation — ADR-U021); rung 3 = NULL author / no backing `users` row (the `[Deleted User]` sentinel + every system group) / resolution failure → `'Unknown'` / `'unknown'`. DM scope is NULL (resolvable-or-Unknown). REVOKE from public/anon/authenticated (internal; called by the SECURITY DEFINER reads).
- Four contracts (SECURITY DEFINER, `search_path=''`, `ds5_require_fim_actor` first — CB-1): `get_group_forum` (top-level newest-first, keyset `p_before`, replies chronological, content withheld on tombstones, author resolved), `create_forum_post` (`post_forum_messages`), `reply_to_forum_post` (`reply_to_messages`; the `enforce_flat_threading` trigger speaks the P0001 on reply-to-a-reply), `moderate_forum_post` (`moderate_forum`, idempotent soft-delete).
- `get_conversation_detail` re-issued: the senders map values become `{display_name, attribution}` (COM-14 applies to conversation detail too; the C-A NULL-name interim retired). PD009 Q3: tombstones keep the author header, content NULL.
- `ds5_lifecycle_user_hard_deleted(p_personal_group_id, p_reassign_to_group_id)` — ADR-U047's **first DS-5 fact** ([Amendment 3](../../../architecture/decisions/ADR-U047-internal-api-lifecycle-facts.md), PD009 Q2): the forum sentinel reassignment relocated verbatim; `admin_hard_delete_user` re-issued byte-equivalent except the `PERFORM` (the Core carve-out under the schema gate). W2 characterization (`platform-exit` + `stewardship-succession`) re-verified behavior-preserving.
- Write-narrowing: `forum_insert_post` / `forum_update_own` / `forum_update_moderate` dropped (exact-name, no `IF EXISTS`); `forum_select` stays. Edit-own leaves the door for the C-D windowed contract (CB-3).
- Conformance lockstep (same PR): `DS_TABLES += forum_posts`; `DS5_COMMUNICATION_FUNCTIONS +=` the four contracts + `ds5_resolve_author_display` + `enforce_flat_threading`. RED pre-apply (live `admin_hard_delete_user` still named `forum_posts`), **green on apply** (0 Core functions reference a DS table).

**Sweeps (post-apply):** integration comm forum **21/21**; full integration **522/522** (the 7 transient Supabase-Management-API connection-timeout failures in `platform-exit`/`stewardship-succession` fixture setup passed clean on re-run — found-not-caused infra flake); conformance green; unit **747** (surface half); E2E forum + messages green.

## Problem

The group forum exists as substrate with no contract layer: `forum_posts` (D15 rebuild, RLS'd, flat 2-level threading trigger-enforced, oracle STRONG — B-COMM-004..007) is read and written directly, the pattern ADR-U009/U038 exist to end and that C-A already ended for conversations. Attribution is worse than uncontracted — it is **unrealized law**: ADR-U021 commits to membership-status display ("Former member" per the CB-9 board settle), but the realized fallback is `'Unknown'` on a NULL author, and the admin hard-delete path *reassigns* authorship to the `[Deleted User]` sentinel so erased authors leak the string "[Deleted User]" instead. And one Core crossing remains by name: `admin_hard_delete_user` textually UPDATEs `public.forum_posts` (`20260719190205:1422-1424`) — the named deferral that has kept `forum_posts` out of the conformance gate's `DS_TABLES` since C-A.

This spec realises the DS-5 §L3 rows *Group-scoped forum structure*, *Membership-status attribution display (ADR-U021)*, and *Community-scoped moderation surface*: forum contracts as the only write door (COM-5/6a/6b/7's platform half), the COM-14 display-resolution ladder applied wherever authorship displays (forum + conversation detail), and the ADR-U047 relocation that lets `forum_posts` finally join the gate.

## Solution sketch

**Contracts (SECURITY DEFINER, `search_path=''`, actor = four-hop personal-group chain, `ds5_require_fim_actor` first in every client contract (CB-1), granted to `authenticated`):**

| Contract | Serves | Gate |
|---|---|---|
| `get_group_forum(p_group_id, p_before, p_limit)` | top-level posts newest-first (keyset on `created_at` via `p_before` + `p_limit`), each carrying its replies chronological (flat 2-level — replies are not paged; accepted Ferd bound), per post: id, `parent_post_id`, content (**withheld — NULL — when tombstoned**), `is_deleted`, timestamps, and **author display per the attribution ladder below** | `has_permission(…,'view_forum')` — 42501, never an empty result |
| `create_forum_post(p_group_id, p_content)` | insert top-level; returns the row with resolved author display | `has_permission(…,'post_forum_messages')` 42501; empty/whitespace 22023 |
| `reply_to_forum_post(p_parent_post_id, p_content)` | insert reply under a top-level post in the parent's group | `has_permission(parent's group,'reply_to_messages')` 42501; unknown parent P0002; reply-to-a-reply / cross-group refused by `enforce_flat_threading` (P0001, oracle message text pinned: "Cannot reply to a reply. Maximum thread depth is 2 levels.") |
| `moderate_forum_post(p_post_id)` | set `is_deleted = true` (idempotent — already-tombstoned returns success); returns the tombstone state | `has_permission(post's group,'moderate_forum')` 42501 — community-scoped, in-place (ADR-U028: never a Console surface); unknown post P0002 |
| `ds5_lifecycle_user_hard_deleted(p_personal_group_id, p_reassign_to_group_id)` | **the relocated crossing** — the sentinel reassignment UPDATE moved verbatim from `admin_hard_delete_user` (behavior-preserving, ADR-U047 rule; core resolves the sentinel and passes it, exactly the DS-3 fact-4 shape) | core-internal: `REVOKE ALL … FROM public, anon, authenticated`; no grant re-issued |

**The attribution ladder (COM-14 — ADR-U021's law as contract shape; strings per CB-9):** every author/sender display resolves platform-side to `{display_name, attribution}`:

1. `author_group_id` resolves to a personal group **with a backing `users` row** and a membership row in the scope group (any status — paused is still a member) → the privacy-shaped display name (the personal group's name carries it), `attribution: 'active'`.
2. Backing `users` row exists but **no membership row** in the scope group → `display_name: 'Former member'`, `attribution: 'former'` — the name is withheld; rejoin makes it reappear automatically (no stored data ever mutated — ADR-U021).
3. `author_group_id` NULL, **or no backing `users` row** (the `[Deleted User]` sentinel and every system group land here), or resolution otherwise fails → `display_name: 'Unknown'`, `attribution: 'unknown'`.

Scope group: a forum post's `group_id`; a `group`-kind conversation's `group_id`; a DM has no scope — rung 1 collapses to "resolvable → name", else rung 3. **Deliberate v2 display change, recorded:** erased authors render `'Unknown'`, no longer the sentinel's literal "[Deleted User]" (an account-lifecycle leak; the stored reassignment itself is preserved verbatim). `get_conversation_detail`'s sender map upgrades in the same migration: values become `{display_name, attribution}` objects (the C-A `LEFT JOIN` NULL-name interim retires; FEAT-H026 consumes the new shape in the same cycle).

**Write-narrowing (the PD002/PD008 pattern):** `forum_insert_post`, `forum_update_own`, and `forum_update_moderate` policies DROP — the contracts are the only door; `forum_select` remains as defense-in-depth. Edit-own leaves the substrate with `forum_update_own` and returns at C-D as a windowed contract (CB-3: forum-only, 15 min). No DELETE policy exists and none is added.

**Conformance-gate rider (lockstep — the gate goes RED if split):** in the same change, (a) the relocation lands, (b) `DS_TABLES` += `forum_posts`, (c) `DS5_COMMUNICATION_FUNCTIONS` += the four client contracts, the lifecycle handler, and `enforce_flat_threading` (its body references `public.forum_posts`; the gate's own comments at `:77-80`/`:127` anticipate exactly this).

**Core touch:** `admin_hard_delete_user` is re-issued with the inline forum UPDATE replaced by `PERFORM public.ds5_lifecycle_user_hard_deleted(v_target_personal_group_id, coalesce(v_deleted_user_group_id, v_caller_group_id))` — byte-equivalent otherwise (platform/core carve-out: the schema gate covers it).

## Appetite

One cycle (C-B), one schema-gate migration (contracts + narrowing + relocation + detail amendment + gate rider). The surface half is FEAT-H026.

## Rabbit holes

- **Don't redesign moderation.** Soft-delete only, exactly the oracle spine; no restore verb, no reason field, no durable moderation audit table — the reports store and its queue arrive at C-D (CB-4) and A-ADM.
- **Don't page replies.** Flat threading bounds depth, not width; Ferd scale accepts unpaged replies per thread. Revisit only with evidence.
- **Don't invent forum read-state.** The §L3 "forum read-state" partial stays forward (no `last_read_at` for forums this cycle).
- **Don't touch `notifications`.** Forum posts create no notification rows (the oracle silence carries; A-NTF revisits deliberately).

## No-gos

- No edit/delete-own contracts (COM-12 — C-D per CB-3; v1's no-window edit-own deliberately does not carry into v2's door).
- No content reports (COM-13 — C-D per CB-4). No realtime (C-C per CB-8; nothing touches §L2 §4's channel list).
- No Mist access in any contract (CB-1; `ds5_require_fim_actor` everywhere).
- No D2 group-close/delete forum disposition — that is C-E's `ds5_lifecycle_*` work (FEAT-PC014's tags stay until then); this spec's lifecycle handler covers the hard-delete fact only.
- No thread titles, rich text, or attachments (DS-4 seam, opaque references later).

## Stories

### STORY-1: The forum in one read (COM-5 platform half)
As a group member with `view_forum`, I want the group's forum served whole and honestly.
- Given a group whose forum holds top-level posts and replies, when I call `get_group_forum`, then top-level posts arrive newest-first with stable keyset pagination, each with its replies chronological, and every post carries `{display_name, attribution}` resolved platform-side.
- Given a tombstoned post, when the page includes it, then it arrives with `is_deleted: true`, content NULL (withheld platform-side, not client-hidden), author display still resolved.
- Given I lack `view_forum` in that group (or any group I'm not in), when I call it, then 42501 — a refusal, never an empty list.

### STORY-2: Post through the door (COM-6a platform half)
As a group member with `post_forum_messages`, I want to open a thread.
- Given the permission, when I `create_forum_post` with non-empty content, then the row lands authored by my personal group (never a caller-supplied author — anti-impersonation is the contract's own actor resolution) and returns with my resolved display.
- Given empty/whitespace content, then 22023. Given no permission (an Observer-shaped role), then 42501.

### STORY-3: Reply, flat forever (COM-6b platform half)
As a group member with `reply_to_messages`, I want to answer within the thread's two levels.
- Given a top-level post in my group, when I `reply_to_forum_post`, then the reply lands under it.
- Given a reply's id as parent, then refused (P0001, the pinned trigger message) — the flat-threading trigger stays the enforcement, the contract just lets it speak.
- Given a parent in a group where I lack `reply_to_messages` or membership, then 42501; unknown parent, P0002.

### STORY-4: Moderation is scoped care (COM-7 platform half)
As a Steward-shaped role holding `moderate_forum`, I want to remove content in my own group, in place.
- Given a post in my group, when I `moderate_forum_post`, then `is_deleted` becomes true and subsequent forum reads serve the tombstone with content withheld; calling it again succeeds idempotently.
- Given I hold `moderate_forum` nowhere in that group, then 42501 (permission asked of `has_permission`, never a role name).
- Given any moderation call, then it is community-scoped: nothing here reaches a platform/Console scope (ADR-U028).

### STORY-5: Attribution follows membership, everywhere authorship displays (COM-14 platform half)
As a reader, I want authorship to tell the current truth without mutating history.
- Given a post whose author is a current member (any membership status), then their privacy-shaped name serves with `attribution: 'active'`.
- Given the author left or was removed from the group, then `'Former member'` / `'former'` — and given they rejoin, their name reappears with no data change anywhere (ADR-U021's rejoin case, asserted).
- Given a hard-deleted author (sentinel-reassigned) or a NULL author, then `'Unknown'` / `'unknown'`.
- Given a `group`-kind conversation whose sender departed the group, when `get_conversation_detail` serves the page, then the same ladder applies (sender map values are `{display_name, attribution}`); given a DM, rung 1 collapses to resolvable-or-Unknown.

### STORY-6: The hard-delete crossing comes home (ADR-U047)
As the platform, I keep Core domain-agnostic without changing what hard-delete does.
- Given a user with forum posts is hard-deleted, when `admin_hard_delete_user` runs, then their posts' `author_group_id` is reassigned to the sentinel (caller-fallback preserved) **by `ds5_lifecycle_user_hard_deleted`**, same transaction, before the personal-group delete — outcome byte-equivalent to the inline era.
- Given the handler, then it is SECURITY DEFINER, `search_path=''`, EXECUTE revoked from public/anon/authenticated — a direct client call is refused.
- Given a disposition failure, then the whole hard-delete rolls back (errors propagate — U047 rule 2).

### STORY-7: No path around the contracts (ADR-U038 direct-caller)
As the platform, I refuse every door that isn't a contract.
- Given a direct PostgREST caller (an authenticated Mist included), when it INSERTs or UPDATEs `forum_posts`, then RLS/privilege denies it (the permissive policies are gone; 42501/zero-row proven).
- Given the contracts called directly, then every gate above holds identically to the BFF path (adversarial direct-call tests per W12, per contract).
- Given the conformance suite runs with `forum_posts` in `DS_TABLES`, then it is green: no Core function references it (the relocation landed in the same change), and `enforce_flat_threading` + the DS-5 contracts are allowlisted.

## Platform dependencies

PC-2 FIM/Mist status (`ds5_require_fim_actor`, CB-1) · PC-3 `has_permission` + the four seeded forum permission rows (`view_forum` / `post_forum_messages` / `reply_to_messages` / `moderate_forum` — already in `seeds/01`, templates: Steward all four, Guide + Participant three, Observer view-only; **no new permission rows this cycle**) · PC-4 `admin_hard_delete_user` re-issue (core carve-out at the gate) · the `[Deleted User]` sentinel system group (core resolves, passes — the handler never knows it exists).

## Cross-product impact

FEAT-H026 (Hub) is the paired consumer; the Gimbal inherits by contract. C-D inherits the edit-window and reports scopes (CB-3/CB-4). C-E inherits the D2 close/delete-group disposition (forum content + group-kind conversations) and the export read. ADR-U047's fact vocabulary gains its first DS-5 fact (Amendment 3 recommended to ride the schema-gate PR — the Amendment-1 pattern).

## Vertical impact

- **Privacy/GDPR:** attribution is display logic — stored authorship never mutated for display (ADR-U021); the ladder withholds names of departed members and stops the sentinel-string lifecycle leak; tombstone content withheld platform-side (least-exposure); RLS holds on `forum_posts` with the narrowed write surface; erasure shapes unchanged (`SET NULL` + sentinel reassignment, now DS-owned).
- **Notifications:** deliberately none (oracle silence; A-NTF revisits).
- **Administration:** moderation is an in-place community-scoped primitive (ADR-U028); hard-delete cascade unchanged in outcome, its forum leg now DS-owned (ADR-U016 cascade spec updated by reference: same steps, new home); durable moderation audit deferred to the C-D reports store (CB-4).
- **Observability:** contract denials are recorded platform-side; moderation and lifecycle calls emit structured logs at their callers; the migration is traceable; gate RED/GREEN states are named in the stories.
- **Transactions:** None.
- **Extensibility:** no enums, no sealed sets — gates are permission-catalog rows; threading depth is a trigger rule, not a type; the attribution ladder is a resolution rule over data, extensible to future scopes (feeds) without schema change.

## Performance budget

N/A (no surface) — budgets bind at FEAT-H026. Contract shape serves them: the forum is one RPC per page; attribution resolves in-query (no N+1 at the surface).

## Open spec questions (for the schema gate)

- **Q1 — resolution mechanics:** shared `ds5_resolve_display(...)` helper vs inlined resolution per contract. Migration authoring decides; the ladder and strings are fixed.
- **Q2 — ADR-U047 Amendment 3:** record the DS-5 fact vocabulary (first fact: `ds5_lifecycle_user_hard_deleted`) as a short amendment riding this gate's PR (recommended — the Amendment-1/PR-#188 pattern), or treat U047's "A-COM builds DS-5 dispositions on the same pattern" consequences line as sufficient. Reviewer's call at the gate.
- **Q3 — tombstone author display:** serve author `{display_name, attribution}` on tombstoned posts (v1 kept the header — recommended, thread legibility) vs withhold both. Default: serve.
