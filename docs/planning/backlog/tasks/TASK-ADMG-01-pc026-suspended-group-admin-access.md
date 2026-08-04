# Build FEAT-PC026 — the suspended-group sight arms + payload re-issue + audited acts (one schema gate)

---
id: TASK-ADMG-01
title: Build FEAT-PC026 — three door re-issues + the conversations chokepoint + members-email + the audited moderate wrapper, red-first, held at the schema gate
status: review
assigned_to: Claude
priority: high
feature: FEAT-PC026
owner: platform/core/governance
wave: ferd
cycle: ADM-G
depends_on: []
estimated_hours: 6
---

## Description

The platform half of Cycle ADM-G, per [FEAT-PC026](../../../platform/core/features/FEAT-PC026-suspended-group-admin-access-contracts.md). One migration carrying: the suspended-scoped admin sight arms on `get_group_announcements` / `get_group_conversations` / `get_conversation_detail` (group-kind only), the `is_conversation_participant` re-issue (`(P OR (A AND K AND S)) AND (A OR NOT S)` — closes the conversations/messages/conversation_participants RLS family + realtime), the `get_group_forum` Tier-1 pass pinned as law (characterization cells, no code change), the `admin_get_group_detail` members-`email` re-issue (W-4 echo law), and the audited moderate act (`admin_moderate_group_forum_post` PC-4 wrapper over a sealed DS-5 body composing `moderate_forum_post` — ADR-U047 rule 3: no PC function may touch `forum_posts`). Red-first at every tier; the PR holds at the schema gate with red evidence + apply commands for **named** approval (the standing rule).

**Gate finding (build-time verification, spec Part 3 "not silent scope"):** `admin_remove_member_from_group` refuses ALL non-active groups at `20260801190000:786-788` (`IF v_group.status <> 'active' THEN RAISE 'group is not active'`) — its own COMMENT documents "non-active group P0001". The dossier premise "PC023's exits family passes admins through the availability guard" does not hold for this door (PC023 never re-issued it; it has its own inline status guard). STORY-5's remove-on-suspended is therefore unbuildable without a fifth re-issue: the status guard amended to admit `suspended` (only), everything else byte-identical. Carried as named scope in the migration header + PR body.

## Acceptance criteria

- [ ] Migration implements the spec's Solution sketch exactly; the six-row `is_conversation_participant` truth table pinned at the RLS layer; member/non-admin behaviour byte-identical everywhere (the sweep proves no regression)
- [ ] Gate suite red at head covering STORY-1..6, incl. the forum characterization pair (Tier-1 mechanism named in the docblock) and the remove-on-suspended cascade cell
- [ ] The `admin_remove_member_from_group` gate-finding re-issue named in the migration header + PR body (never silent)
- [ ] Sibling-assertion sweep enumerated in the migration header (PC023 gate cells, C-series communication suites, ADM-B `admin_get_group_detail` cells + the Hub `AdminGroupMember` type, ADM-C remove cells), each marked adapted or deliberately left
- [ ] New functions registered in `supabase/ownership.manifest.json` (wrapper → PC-4, sealed body → DS-5); platform conformance suites green post-apply
- [ ] PR held at the schema gate with red evidence + apply commands; post-apply: full integration green + ADR-U043 pass (no new surface budget — N/A row honoured)

## Technical notes

Substrate facts live in the spec's Problem section and the [dossier](../../hub-v2/2026-08-04-admg-substrate-dossier.md); latest definitions verified at build: the four doors + chokepoint in `20260803190000` (:2962/:3033/:3084/:3127/:4156), `admin_get_group_detail` in `20260801130000:34`, `admin_remove_member_from_group` in `20260801190000:730`, `moderate_forum_post` in `20260803190000:407` (idempotent `is_deleted = true`). Members-email join: `public.users.email` via `users.personal_group_id`. Audit idiom: `INSERT INTO admin_audit_log (actor_group_id, action, target, metadata)` (the ADM-D wrapper shape). Group-suspension throughout — never conflate with the account-state family (spec Problem 9).

## Verification

Red demonstrated at head (suite output in the PR body); post-apply `npm run test:integration` green; conformance suites green; `migration list` consistent after repair.
