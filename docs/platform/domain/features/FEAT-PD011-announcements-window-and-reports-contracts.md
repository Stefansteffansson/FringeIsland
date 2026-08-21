# FEAT-PD011: Announcements, windowed own-edits, and content-report contracts — the ADR-U049 durable home on the V3 delivery substrate

---
id: FEAT-PD011
title: Announcements, windowed own-edits, and content-report contracts (COM-8/9/12/13 platform half; ADR-U049)
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A Steward has no way to say one thing to the whole community; a platform admin has no way to say one thing to everyone; a member who mistypes a forum post cannot fix it (C-B's write-narrowing deliberately dropped `forum_update_own` — "edit-own returns at C-D as a windowed contract", CB-3); and a member who encounters harmful content has nowhere to put a report — moderation today is soft-delete with no reason and no trail. Announcements and reports have **no substrate at all** (substrate audit 2026-07-19) — these are the area's first genuinely new tables, and they must land on the settled layering: ADR-U048's delivery/routing split, made concrete by **ADR-U049** (durable DS-5-owned home + per-recipient V3 delivery rows; visibility read-time, delivery send-time; one table, two gated contracts; immutable + retract; the outward seam is the delivery row).

## Solution sketch

Two new DS-5 tables, both entering `DS_TABLES` with their contracts entering the DS-5 allowlist in the same change (the C-A/C-B conformance-lockstep pattern):

**`public.announcements`** — the durable home (ADR-U049 ruling 1). One row per announcement: `id`, `scope_kind TEXT NOT NULL` (`community` | `platform` — CHECK-constrained; closure justified: governance scopes are constitutionally enumerated by ADR-U028, not an extensible content type), `scope_group_id UUID NULL` FK groups ON DELETE CASCADE with `CHECK ((scope_kind = 'community') = (scope_group_id IS NOT NULL))`, `author_group_id UUID NULL` FK groups ON DELETE SET NULL (the PD009 attribution pattern), `title`/`body TEXT NOT NULL` (non-empty; caps validated in the contracts), `created_at`, `retracted_at TIMESTAMPTZ NULL`, `retracted_by_group_id UUID NULL`. RLS: SELECT community scope via `is_active_group_member(scope_group_id)`, platform scope via the PC-2 FIM predicate (CB-1 — Mists see no comm surface; realized today only as the raising `ds5_require_fim_actor()`, so this migration adds a boolean sibling `ds5_is_fim_actor()` for policy use), both excluding retracted rows; `is_platform_admin()` sees all (governance). No client INSERT/UPDATE/DELETE policies — contracts are the only door.

**`public.content_reports`** — the durable report store (CB-4). `id`, `reporter_group_id` FK groups, `target_kind TEXT NOT NULL` (open TEXT, no enum — the *validated* kinds start at `forum_post` and `direct_message` and grow additively in the contract), `target_id UUID NOT NULL`, `target_group_id UUID NULL` (group context captured at submit, for A-ADM queue routing), `reason TEXT NOT NULL` (non-empty), `details TEXT`, `content_snapshot TEXT` (what the content said when reported — load-bearing *because* COM-12's edit window lets content drift after the fact), `status TEXT NOT NULL DEFAULT 'open'` (transitions belong to A-ADM), `created_at`, `UNIQUE (reporter_group_id, target_kind, target_id)` (idempotent resubmission). RLS: reporter SELECTs own rows; `is_platform_admin()` SELECTs all (**the ADM-10 seam** — A-ADM renders the queue from exactly this read); no client writes — contract-only.

**Contracts** (house convention: unprefixed public contracts, `ds5_` helpers; all SECURITY DEFINER, `search_path=''`, REVOKE from PUBLIC/anon, actor via `ds5_require_fim_actor()`):

- `send_community_announcement(p_group_id, p_title, p_body)` — gate `has_permission(me, p_group_id, 'send_announcements')` (**new seeded permission**: catalog row in `supabase/seeds/01_permissions.sql`, granted to the Steward template, **backfilled to existing groups' Steward roles** in the migration — named for the schema gate). Inserts the home row, then fans out one V3 delivery row per **active member at send, author excluded** (ADR-U049 ruling 3; obligation-fulfilment writes per U048): `type = 'announcement'`, `payload = {announcement_id, scope_kind, scope_group_id, sent_by_group_id}`. Returns the announcement row-doc.
- `send_platform_announcement(p_title, p_body)` — gate `has_permission(me, <platform root>, 'manage_all_groups')` (the `admin_send_notification` precedent gate; no new universe permission per AD-5). Fans out to **every FIM's personal group at send, author excluded** — suspended members included: routing does not adjudicate account state, delivery is dumb; their surface access is governed by their account state. Writes a PC-4 audit entry. Returns the row-doc.
- `retract_announcement(p_announcement_id)` — same gate as the send for that row's scope (role-based, not person-based: any current holder of the scope's gate may retract). Sets `retracted_at`/`retracted_by_group_id`; idempotent on re-retract; delivery rows are **left in place** and resolve to nothing (hint-not-authority applied to delivery pointers, ADR-U049 ruling 4); platform-scope retraction audited.
- `get_group_announcements(p_group_id, p_before, p_limit)` / `get_platform_announcements(p_before, p_limit)` — scope-separated reads mirroring the send split; membership/FIM-gated; retracted excluded platform-side; newest-first keyset pagination (the `get_group_forum` shape); each row-doc: `{id, title, body, created_at, author_group_id, author: {display_name, attribution}}` via `ds5_resolve_author_display` (the COM-14 ladder).
- `edit_own_forum_post(p_post_id, p_content)` — author = me, `is_deleted = false`, `has_permission(me, group, 'post_forum_messages')`, **`created_at > now() - interval '15 minutes'`** (CB-3); non-empty content; returns the updated post row-doc (the `get_group_forum` post keys, `replies` omitted). Window expiry refuses with 42501-class error, honestly surfaced.
- `delete_own_forum_post(p_post_id)` — same gate minus content; soft-deletes (`is_deleted = true`); **idempotent** (mirrors PD009 moderation; an already-tombstoned post — including moderator-tombstoned — returns the same terminal state; there is no un-delete path in any contract). The **existing** C-C moderation-hint trigger is `is_deleted`-transition-gated and fires unchanged — the live tombstone comes through the already-named channel; nothing new joins §L2 §4.
- `submit_content_report(p_target_kind, p_target_id, p_reason, p_details)` — validates the target exists **and is visible to the reporter through the target's own read rules** (forum post → active member of its group; direct message → conversation participant) so the contract is not an existence oracle; refuses reporting own content; snapshots the target's content at submit; idempotent resubmit returns the existing row. Returns `{id, status, created_at}`.

**Recipient resolution is send-time for delivery, read-time for visibility** (ADR-U049 ruling 3): late joiners see standing announcements via RLS/read contracts; they get no delivery row. A missed delivery row costs a badge (at A-NTF), never the announcement.

**No realtime work**: no new channels, no new emissions (C-D carry rule; the bell is A-NTF's tenant and consumes delivery rows — the seam this feature hands forward).

## Appetite

One cycle (C-D), platform half — the C-B/C-C scale: one migration, one contract suite, red-first integration coverage, held at the schema gate.

## Rabbit holes

- **Async fan-out / outbox.** Platform 1→all is O(members) synchronous writes — accepted at Ferd scale; the outbox future is U048's own named superseding trigger. Do not build batching machinery.
- **Announcement read-state on the home surface.** `is_read` lives on delivery rows and belongs to the A-NTF bell. No per-announcement read tracking, no unread counts this cycle.
- **Reason taxonomies.** `reason` is free TEXT. No reason-code registry, no category picker substrate — A-ADM may grow one against the open column.
- **Per-group window configurability.** The 15 minutes is fixed (CB-3). "Configurable window" (§L3 wording) stays forward — a group-settings feature, not this cycle.

## No-gos

- No moderation-queue surface, no status transitions on reports (A-ADM: ADM-10 renders the queue from the admin SELECT; `status` waits there).
- No edit/delete for DMs — `direct_messages` stays immutable (the oracle spine; regression-asserted, not just omitted).
- No announcement editing — immutable + retract only (ADR-U049 ruling 4).
- No outward channels (email/push) — the delivery row is the seam; adapter ownership resolves at A-NTF (DS-5 §8 Q1 residue).
- No Mist access to any of it (CB-1).
- No live edit propagation — content edits emit no hint; existing reconcile paths cover them.

## Stories

### STORY-1: The durable home exists and scope cannot be confused (COM-8/9 substrate)
As the platform, I want one announcements table whose scope discriminator is CHECK-bound and whose write doors are scope-separated contracts, so a community announcement and a platform announcement can never impersonate each other (ADR-U028 by construction).

**Acceptance criteria:**
- Given the migration, when it lands, then `announcements` exists with the scope CHECK (`community` ⇔ `scope_group_id` present), RLS enabled, no client write policies, and `announcements` + the new contracts join `DS_TABLES` / the DS-5 allowlist in the same change (conformance gate green).
- Given `send_community_announcement`, when called by any caller with any arguments, then it cannot produce a `platform`-scoped row (no code path writes that scope); and symmetrically for `send_platform_announcement` and `community` scope.
- Given a direct PostgREST caller (an anonymous-session Mist holding `authenticated` included), when it INSERTs/UPDATEs/DELETEs `announcements` directly, then RLS refuses (no policy exists).

### STORY-2: A Steward announces to the community (COM-8)
As a Steward, I want to send one announcement to my whole group, so the community hears it once, durably.

**Acceptance criteria:**
- Given a member holding `send_announcements` on a group, when they call `send_community_announcement`, then the home row lands (scope `community`, that group), the row-doc returns, and one `notifications` row per active member (author excluded, departed/paused excluded) carries `type 'announcement'` and `payload.announcement_id`.
- Given a member without the permission (or a non-member, or a Mist actor), when they call it, then 42501 — and no rows of either kind exist.
- Given the new `send_announcements` permission, when the migration runs, then the seed catalog holds it, the Steward template grants it, and every existing group's Steward role has been backfilled (a pre-C-D group's Steward can announce without touching role settings).

### STORY-3: A platform admin announces to everyone (COM-9)
As a platform admin, I want to send one announcement to every FIM, so universe-scoped word reaches the whole platform.

**Acceptance criteria:**
- Given a caller with `manage_all_groups` at the platform root, when they call `send_platform_announcement`, then the home row lands (scope `platform`, no group), delivery rows land for every FIM's personal group except the author's (Mist users excluded; suspended members included), and a PC-4 audit entry records the act.
- Given any caller without that grant (a Steward included), when they call it, then 42501 — Steward reach ends at community scope.

### STORY-4: Visibility is read-time — late joiners see standing announcements (ADR-U049 ruling 3)
As a member who joined after an announcement was sent, I want to see it where current members see it, so the bulletin board is not amnesiac.

**Acceptance criteria:**
- Given an announcement sent before a member joined the group (or the platform), when they call the matching read contract, then the row-doc is returned — no delivery row required or created retroactively.
- Given `get_group_announcements`, when a non-member (or Mist) calls it, then 42501; given `get_platform_announcements`, when a Mist actor calls it, then 42501.
- Given announcements with departed or erased authors, when read, then `author` resolves through the COM-14 ladder ("Former member" / "Unknown") — data never mutated (ADR-U021).

### STORY-5: Retraction, same gate, pointers left standing (ADR-U049 ruling 4)
As a holder of the scope's gate, I want to retract a mis-sent announcement, so a 1→many/1→all mistake has an exit — without pretending it never happened.

**Acceptance criteria:**
- Given a retractable announcement, when a current gate-holder (not necessarily the original author) calls `retract_announcement`, then `retracted_at`/`retracted_by_group_id` set, re-retraction is idempotent, and platform-scope retraction writes an audit entry.
- Given a retracted announcement, when any scope reader reads, then it is absent — while its delivery rows still exist untouched (verified in-table) and `is_platform_admin()` can still see the row.
- Given a caller without the row's scope gate, when they attempt retraction, then 42501.

### STORY-6: Windowed own-edit and own-delete return as contracts (COM-12, CB-3)
As a forum author, I want 15 minutes to fix or withdraw my post, so a typo is not forever — while moderation and DMs stay exactly as they are.

**Acceptance criteria:**
- Given my own live post younger than 15 minutes, when I call `edit_own_forum_post` with non-empty content, then content updates and the post row-doc returns; when I call `delete_own_forum_post`, then it tombstones (idempotently) and the existing C-C moderation hint fires on the transition — no new channel, no new emission function.
- Given the same post at ≥ 15 minutes, or another author's post, or a moderator-tombstoned post (edit), or a caller whose `post_forum_messages` grant is gone, when either contract is called, then a 42501-class refusal — and a moderator-tombstoned post can never be un-deleted through any path.
- Given `direct_messages`, when this feature lands, then it still has no UPDATE/DELETE policy and no edit/delete contract (regression-asserted — the oracle spine holds).

### STORY-7: A report lands somewhere durable (COM-13, CB-4)
As a member, I want to report a forum post or a DM, so harm has a paper trail even before a moderation queue exists.

**Acceptance criteria:**
- Given content visible to me that is not mine, when I call `submit_content_report`, then a row lands with my reporter identity, the target's group context (forum) or conversation context (DM), a content snapshot as-of-now, status `open` — and resubmitting the same target returns the existing row, not a duplicate.
- Given a target I cannot see (a forum post in a group I'm not in; a DM in a conversation I'm not party to), or a nonexistent target, or my own content, or an unknown `target_kind`, when I call it, then refusal — with the not-visible and not-existing cases indistinguishable (no existence oracle).
- Given stored reports, when the reporter SELECTs `content_reports`, then they see exactly their own rows; when `is_platform_admin()` SELECTs, then all rows (the ADM-10 seam); any direct write attempt by any client is refused.

### STORY-8: No door around, nothing new to attack (ADR-U038 / W12)
As the platform, I want every new contract adversarially probed as a direct PostgREST caller, so no rule lives only where the Hub happens to behave.

**Acceptance criteria:**
- Given each new contract, when probed per W12 (wrong actor, wrong scope, boundary timing at the window edge, Mist actor, anon), then each refusal path is demonstrated; helper functions (`ds5_is_fim_actor`) are policy-usable but grant nothing on their own.
- Given the conformance gate, when it runs, then green: two new `DS_TABLES` entries, the new contracts allowlisted, `notifications` still (by design) outside `DS_TABLES` (ADR-U048).

## Platform dependencies

PC-2 Mist/FIM status substrate (via `ds5_require_fim_actor`, + the new boolean sibling); PC-3 `has_permission` / role templates / `is_active_group_member` (P-O1 actor chain throughout); PC-4 audit substrate for universe-scope acts; the V3 delivery substrate `public.notifications` (ADR-U048 — obligation-fulfilment writes, table does not move); C-B's `ds5_resolve_author_display` and forum contracts; C-C's transition-gated moderation-hint trigger (fires unchanged on self-delete).

## Cross-product impact

The Hub consumes everything here (FEAT-H028, paired). A-NTF inherits the delivery-row seam (the bell badges off `type 'announcement'` rows; outward channels consume delivery rows and never re-resolve recipients — DS-5 §8 Q1 partial resolution). A-ADM inherits the ADM-10 queue read and `status` transitions, plus the COM-9 compose surface (universe-scoped governance stays on the Console — no hub-v2 admin surface exists today, verified). C-E inherits: reports rows join the lifecycle/erasure dues and `get_own_messages_export()` composition (reporter's own reports).

## Vertical impact

- **Privacy/GDPR:** Reports store reporter identity + a content snapshot of someone else's words — snapshot retention under erasure is an open question held at the schema gate (below). Reporter rows join the C-E erasure/export dues (named in Cross-product impact). Announcements are group/platform-public by design; author erasure follows the ADR-U021 display law (SET NULL + ladder).
- **Notifications:** The feature *is* the routing layer's first realization (ADR-U049): DS-5 contracts write V3 delivery rows as obligation-fulfilment. No outward channel, no bell — seams named.
- **Administration:** Retraction is the announcement lifecycle; platform-scope send/retract audited (PC-4); the report store is A-ADM's queue substrate; no new cascade beyond `scope_group_id` CASCADE (community announcements die with their group — group close/delete disposition rides the existing D2 due at C-E if closure semantics need more than membership-gated invisibility).
- **Observability:** Contracts raise typed errors (42501/22023-class); fan-out counts returned in row-docs where useful; no silent failures (the PC009/PD010 law); audit entries for universe-scope acts.
- **Transactions:** None.
- **Extensibility:** `target_kind`, `status`, `reason`, notification `type` all open TEXT — validated additively in contracts, never CHECK-enumerated. The one CHECK enum (`scope_kind`) is justified closure: ADR-U028's governance scopes are constitutional, not an extensible content family.

## Performance budget

N/A (no surface) — fan-out cost bounded and named (Rabbit holes); read contracts are keyset-paged like `get_group_forum`.

## Open spec questions (resolved at the schema gate, 2026-07-20)

1. **Snapshot vs erasure — RESOLVED (gate nod "ok merge #223"):** snapshots survive author hard-delete in Ferd (moderation evidence); the scrub decision is a named C-E lifecycle-due line item. Reporter-side rows die with the reporter (FK CASCADE). **The scrub decision landed at the C-E board (2026-07-20, recommendations adopted): posture — snapshots are retained under legitimate-interest moderation evidence for Ferd; no scrub is built at C-E, because the resolution flow (`status` transitions) the scrub would hang on is the A-ADM queue seam. Resolution-time scrub mechanics route to A-ADM with the queue build (seam recorded in Cross-product impact). Reporter's-own-reports join the export at C-E ([FEAT-PD012](./FEAT-PD012-lifecycle-dispositions-and-export-contracts.md) STORY-4, snapshot included).**
2. **Backfill breadth — RESOLVED:** Steward-template-derived role instances only; custom roles opt in via the roles panel.
3. **FIM predicate — RESOLVED:** `users.is_temporary` via `auth.uid()`, copied from the live `ds5_require_fim_actor`; realized as the boolean `ds5_is_fim_actor()`.

## Implementation notes (6-done — Cycle C-D, 2026-07-20)

- **What landed:** migration `20260720200000` (gate PR #223, nodded "ok merge #223") + rider `20260720203000` (PR #225 — function re-issues only): `announcements` (scope CHECK `community` ⇔ group present; RLS reads community-via-`is_active_group_member` / platform-via-`ds5_is_fim_actor()` / `is_platform_admin` sees all incl. retracted; zero client write policies) and `content_reports` (UNIQUE resubmit key; reporter-own + admin SELECT; zero client write policies); the `send_announcements` seed (catalog + Steward template + instance backfill; seeds files updated; the auto-grant-to-DeusEx trigger fired as designed); the eight contracts as specced — with **one flip-green correction (the rider)**: delivery rows store the announcement body — `notifications.body` is NOT NULL and the substrate's writer conventions win (ADR-U048: the delivery table does not bend to DS-5); the content-light-pointer sketch line yields.
- **Flagged authoring decision (gate-recorded):** the 1→all fan-out excludes decommissioned accounts (terminal), includes suspended (routing does not adjudicate account state).
- **Red→green, honestly:** 24 demonstrated red pre-apply (announcements 14 — PGRST202/PGRST205/absent-seed/42P01; window+reports 10 — PGRST202/absent-table) + 2 labelled regression greens (DM immutability; no-hint-on-content-edit). Post-apply first run **72/80** — the rider's NOT NULL catch (7 cascade fails) + **one labelled test adaptation** (the stored-hint assertion re-keyed on the `realtime.messages` `event` COLUMN + COALESCE'd payload envelope — the C-C storage-envelope precedent, mis-modeled at first writing). Final: **communication slice 80/80; conformance gate green** (`DS_TABLES` += 2, allowlist += 9, `notifications` stays out by design).
- **The self-delete hint came free, as decomposed:** the C-C transition-gated trigger (`WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted)`) fires on `delete_own_forum_post`'s tombstone; content edits emit nothing (regression-held). No realtime changes of any kind.
- **Key files:** `supabase/migrations/20260720200000_*.sql` + `20260720203000_*.sql`; `supabase/seeds/01_permissions.sql`/`02_role_templates.sql`; `hub/tests/integration/communication/announcement-contracts.test.ts` + `window-and-report-contracts.test.ts`; `hub/tests/integration/platform/internal-api-conformance.test.ts` (riders).

## Amendment — TASK-EDT-01 (2026-08-21): the window is retired

**RULED (Stefan): edit 2026-08-19 (during the wielded-forum walk, after the industry-pattern review); delete 2026-08-21 (at pull — one consistent posture).** Migration `20260821150000` re-issues `edit_own_forum_post` and `delete_own_forum_post` with the 15-minute refusal removed — the ONLY body change; author-only, availability guard, tombstone terminality, permission gate, and idempotent delete are byte-carried. Transparency replaces the clock **display-side**: the Hub renders "(edited)" whenever `updated_at − created_at > 3 minutes` (silent typo-repair grace; the note honestly reflects the *last* edit). No schema for the note — `set_forum_posts_updated_at` already moves the clock. The window text above stands as the record of what C-D shipped; CB-3's "fixed 15 minutes" and the per-group-configurability parking are both superseded by this retirement. The wielded no-edit posture (PD019 v1) is untouched.
