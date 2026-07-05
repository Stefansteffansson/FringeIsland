# FEAT-PC012: Group invitation & joining contracts — invite a FIM, invite an email, answer an invitation

---
id: FEAT-PC012
title: Group invitation & joining contracts — member search (DS-6 re-home seam), FIM invitation, durable email invitation with signup auto-claim, the Steward pending-invitations read/cancel, and the invitee's accept/decline (Groups Cycle G-C platform half)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Cycles G-A/G-B gave a group its container, its Steward, and its role fabric — but the group cannot grow. Hub §L3 **MEM-1** (invite an existing FIM, with member search), **MEM-2** (invite a non-FIM by email — pending invitation, auto-claim on signup), and **MEM-3** (accept or decline an invitation) all name **PC-3** as the platform dependency, and no contracts exist over the invitation substrate.

The substrate is Conformant and legacy-proven (verified on disk, 2026-07-04): `group_memberships` carries the invite path at RLS (`memberships_insert_invite` — `status='invited'`, `added_by_group_id` = actor, `invite_members`-gated), the self-only accept (`memberships_update_accept`, `invited→active`) and decline (`memberships_delete_leave`); `pending_email_invitations` carries token + 30-day expiry + `UNIQUE(group_id, invited_email)` with `invite_members`-gated RLS; `handle_new_user()` Step 8 already **auto-claims** pending email invites at sign-up (case-insensitive, unexpired only) into `'invited'` memberships; the `notify_invitation_received/accepted/declined` triggers write durable notification rows; `auto_assign_member_role_on_accept` binds the default Member role on accept. What's missing is the contract layer (ADR-U038: composed, jsonb-shaped operations a Surface consumes API-first; RLS stays as defense-in-depth) — and there is **no member-search primitive anywhere** (verified zero; legacy searched via a users-table RLS policy that was not carried into v2).

Two settled decisions shape scope (Groups plan, decision board 2026-07-03): **D3** — MEM-1's search ships as a minimal PC-3-side primitive, explicitly tagged a **DS-6 re-home seam** (PC-3 §L3 deliberately has no search capability; search belongs to Discovery); **D4** — MEM-2 builds the durable pending record + auto-claim only; actual email **dispatch is a V3 seam** (the V3 spec's `sendEmail()` abstraction exists, delivery is simulated; no service-local email call is permitted).

### Why Platform Core (Organisation), not a Domain Service

Invitation and joining mutate `group_memberships` — the table PC-3's Membership-lifecycle capability owns and every `has_permission()` resolution reads. The pending-claim path is PC-3's own §L3 row (Pending-invitation claim, seamed into PC-2's `handle_new_user`). Modelling admission anywhere else inverts the one-way Domain→Core rule. The search primitive alone is *not* PC-3 canon — it rides here only as the D3 seam, scoped to the invitation flow, until DS-6 activates.

## Solution sketch

Contracts over **existing** substrate (**no new table, no policy changes**), PostgREST RPC per PC-3 §3, actor via `get_current_personal_group_id()` (P-O1). All writes FIM-only + active-account-only; group resolution per the G-A visibility rule (member-or-public+active, else **P0002** — no leak); refusals are SQLSTATEs surfaced verbatim (house map).

- **`search_invitable_members(p_group_id, p_query) → jsonb`** (MEM-1 search — **the D3 / DS-6 re-home seam**) — gated on `invite_members` in `p_group_id` (search exists to invite; no open FIM directory). Matches FIM personal-group display names partial case-insensitive (`ilike`), plus **exact** case-insensitive email match; cap 8 (both legacy-proven). Payload per hit: `member_group_id`, display name, and `membership_status` (`null | 'active' | 'invited'` in this group) so the Surface disables what it can't invite. **No email addresses in the payload.** Mists' proto-groups, suspended accounts, and `[Deleted User]` never appear.
- **`invite_member(p_group_id, p_member_group_id)`** (MEM-1) — `invite_members`-gated; the target must be a FIM's personal group (anything else — Mist proto-group, non-personal group, ghost — is **P0002**, no-leak). Inserts the `'invited'` membership with `added_by_group_id` = actor (mirroring the RLS predicate); already-a-member/already-invited → `23505`-mapped refusal; re-invite after decline works (decline deletes the row). The existing `notify_invitation_received` trigger writes the durable row.
- **`invite_by_email(p_group_id, p_email)`** (MEM-2) — `invite_members`-gated; email shape validated (`22023`). If the email already belongs to a FIM (case-insensitive), the contract **converts server-side to a membership invitation** (a stranded email row would never auto-claim — sign-up is the only claim trigger; Open Q2). Otherwise inserts `pending_email_invitations` (`invited_by_group_id` = actor; token + 30-day expiry by column default); duplicate per group+email → `23505`. **No dispatch** (D4): the invitation is durable and claimable regardless; the V3 seam line is planted, not wired.
- **`get_group_invitations(p_group_id) → jsonb`** — the Steward's pending list: membership invitations (`member_group_id`, display name, `invited_at`, inviter display name) + email invitations (`id`, `invited_email`, `created_at`, `expires_at`, and an honest `expired` boolean — expiry is **predicate-based**; nothing transitions `status` to `'expired'` and no reaper exists or is built). `invite_members`-gated (`42501` for members without it — the list carries third-party emails; Open Q3): the Surface gates the panel on `invite_members` from the already-fetched `get_user_permissions` payload.
- **`cancel_member_invitation(p_group_id, p_member_group_id)`** / **`cancel_email_invitation(p_invitation_id)`** — `invite_members`-gated revocation (legacy-proven "view/cancel"); deleting, never status-flipping; P0002 on ghosts.
- **`get_my_invitations() → jsonb`** (MEM-3 read) — the actor's own `'invited'` memberships: group id/name/description/`is_public`, `invited_at`, inviter display name. Deliberately minimal — an invited FIM sees the invitation context, **not** group detail (legacy: invited users cannot view private groups). Needed because `get_member_groups()` filters `status='active'` — invitations are invisible in the groups list by design.
- **`accept_group_invitation(p_group_id)`** / **`decline_group_invitation(p_group_id)`** (MEM-3) — self-scoped on the actor's own invited row (keyed by group — `UNIQUE(group_id, member_group_id)`), P0002 if none. Accept flips `invited→active` (the existing `auto_assign_member_role_on_accept` binds the Member role; `notify_invitation_accepted` writes the durable row); decline deletes the row (`notify_invitation_declined_or_member_change` fires). Auto-claimed-at-signup invitations arrive as `'invited'` rows and answer through these same two contracts — one joining flow, however the invitation was born.
- **Erasure gap closed (Privacy)** — FIM account erasure (FEAT-PC002's cascade) does not touch `pending_email_invitations`; this migration extends the erasure function to **delete pending invitations addressed to the erased account's email** (Art. 17 — the email is personal data; `invited_by_group_id` already `SET NULL`s via FK). Recorded as a FEAT-PC002 cross-reference at build.
- **Hygiene** — `TRUNCATE` revoked from client roles on `pending_email_invitations` and `group_memberships` (the G-A rule; neither was covered by PC010/PC011). No other narrowing: the existing invite/accept/decline/cancel RLS is substantively correct and stays as defense-in-depth beneath the contracts.

## Appetite

Medium-plus — one migration (~9 functions + the erasure-function amendment + TRUNCATE revokes + grants; **no new table, no policy changes**), integration tests for the invitation matrices, both invitation births, the claim arc, and the adversarial direct paths. If it swells: `cancel_member_invitation` is the first cut (the invitee's decline covers the row's exit; revocation lands additively later) — the search + invite + answer arc is the core.

## Rabbit holes

- **Don't build a Discovery service.** The search primitive is scoped (invitation context, cap 8, name-partial + email-exact), tagged for DS-6 re-home. No ranking, no fuzzy matching, no cross-group directory, no pagination.
- **Don't wire email dispatch.** D4: durable row + auto-claim only. No vendor dependency, no `sendEmail()` call from PC-3 (the V3 spec forbids service-local sending). The token column exists for a future claim-by-link flow — **not built here**.
- **Don't build an expiry reaper.** Expiry is a predicate (`expires_at`); auto-claim already filters it; reads render it honestly. The `'expired'` status value stays vestigial — no pg_cron, no cleanup job (the V2 lesson: no realization claims without disk anchors).
- **Don't touch `handle_new_user`.** The auto-claim Step 8 is PC-2's seam and already Conformant — PC012 consumes its output (`'invited'` rows), never edits the trigger.
- **Mind the trigger fabric.** `notify_invitation_received/accepted/declined` fire on the membership rows (durable rows — expected, not duplicated); `auto_assign_member_role_on_accept` + `auto_assign_deusex_role_on_accept` fire on accept; their refusals/effects surface, never pre-checked-and-hidden.
- **Don't drag G-D in.** Pause/activate/remove members and leave are Cycle G-D; the only DELETE contracts here are invitation-scoped (decline own, cancel pending).

## No-gos

- No membership mutation beyond the invitation lifecycle (no pause/activate/remove/leave — G-D; no transfer/closure — G-E).
- No claim-by-token/link flow (the token column is future substrate; sign-up auto-claim is the only claim path in v1).
- No email dispatch, no vendor, no digest (V3 seam — the Notifications area).
- No group-to-group invitations (MEM-10, G-F — gated on the group-as-actor design session).
- No public join / join-request flow (no §L3 row asks for it; invitation-only admission in v1).
- No new table, no RLS-model changes, no search index (DS-6's concern when it activates).

## Stories

### STORY-1: Find a member to invite (MEM-1 search — the D3 seam)
As an `invite_members` holder, I want to find a FIM by name or exact email, so inviting doesn't require out-of-band id exchange.

**Acceptance criteria:**
- Given an `invite_members` holder, when they call `search_invitable_members(group, 'an')`, then FIMs whose display name matches partially (case-insensitive) return — capped at 8, each with `member_group_id`, display name, and their membership status in this group; **no email addresses in the payload**.
- Given a full email address as the query, when it matches a FIM exactly (case-insensitive), then that FIM returns; a partial email never matches (enumeration-hardening over legacy — Open Q1).
- Given a Mist's proto-group, a suspended account, or the `[Deleted User]` sentinel, when any query would match them, then they are absent from results.
- Given a member without `invite_members` — or a non-member, or a Mist — when they call it, then `42501` / `P0002` / `42501` respectively (the house gates).

### STORY-2: Invite an existing FIM (MEM-1)
As an `invite_members` holder, I want to invite a FIM to the group, so the group grows deliberately.

**Acceptance criteria:**
- Given an `invite_members` holder and a FIM's `member_group_id`, when they call `invite_member`, then an `'invited'` membership exists with `added_by_group_id` = the actor (and the substrate's durable invitation-received notification row is written by the existing trigger).
- Given the target is already an active member or already invited, when invited again, then the call is refused (`23505`-mapped); given a prior decline, then re-invitation succeeds.
- Given a target that is not an invitable FIM personal group (a Mist's proto-group, an engagement group, a ghost id), then `P0002` — indistinguishably, no existence leak.
- Given a member without `invite_members`, then `42501`; the invited FIM does **not** appear in `get_group_detail`'s members payload (which filters `status='active'`) until they accept.

### STORY-3: Invite by email — durable, claimable, undispatched (MEM-2, D4)
As an `invite_members` holder, I want to invite someone who isn't on FringeIsland yet by email, so the invitation waits for them.

**Acceptance criteria:**
- Given an `invite_members` holder and a well-formed email with no FIM attached, when they call `invite_by_email`, then a `pending_email_invitations` row exists (30-day expiry by default, `invited_by_group_id` = actor) — and **no email is sent** (the V3 dispatch seam is planted, not wired).
- Given the same group+email again while pending, then `23505`-mapped refusal; given a malformed email, then `22023`.
- Given the email already belongs to a FIM (case-insensitive), when the call completes, then a **membership invitation** to that FIM exists instead (server-side conversion — a pending email row for an existing account would never auto-claim; Open Q2) and no `pending_email_invitations` row is created.
- Given a person who signs up later with a matching email (the existing `handle_new_user` Step 8), then their pending invitations auto-claim into `'invited'` memberships (unexpired only, case-insensitive, across multiple groups) and the email rows flip to `'claimed'` — existing substrate, exercised by this feature's arc test, not modified.

### STORY-4: See and tend the group's pending invitations
As an `invite_members` holder, I want the group's outstanding invitations readable and cancellable, so admission stays deliberate.

**Acceptance criteria:**
- Given an `invite_members` holder, when they call `get_group_invitations(group)`, then both kinds return: membership invitations (invitee display name, `invited_at`, inviter display name) and email invitations (`invited_email`, `created_at`, `expires_at`, honest `expired` flag — predicate-based, no reaper).
- Given `cancel_member_invitation` / `cancel_email_invitation` by an `invite_members` holder, then the row is deleted and the pending list re-read no longer carries it; ghost targets are `P0002`.
- Given a member **without** `invite_members`, when they call any of the three, then `42501` (the list carries third-party emails — Open Q3); non-members get `P0002`.

### STORY-5: Answer an invitation (MEM-3)
As an invited FIM, I want to see my invitations and accept or decline, so joining is my decision.

**Acceptance criteria:**
- Given a FIM with pending invitations, when they call `get_my_invitations()`, then each returns with group id/name/description/`is_public`, `invited_at`, and the inviter's display name — and nothing more (an invited FIM does not see private-group detail).
- Given `accept_group_invitation(group)`, then their membership flips `invited→active`, the default Member role is bound (existing trigger), the durable accepted-notification row is written, and the group now appears in `get_member_groups()`.
- Given `decline_group_invitation(group)`, then the membership row is deleted (declined-notification row written); a later re-invitation is possible.
- Given no pending invitation in that group — or a Mist caller — then `P0002` / `42501`; given an invitation that arrived via **signup auto-claim**, then both contracts work on it identically (one joining flow, either birth).

### STORY-6: Erasure closes over invitation rows (Privacy — the PC002 gap)
As the platform, I want account erasure to reach invitation rows that carry the erased person's email, so Art. 17 completes.

**Acceptance criteria:**
- Given a FIM with pending email invitations addressed to their email in any group, when their account is erased (the FEAT-PC002 cascade), then those `pending_email_invitations` rows are deleted (case-insensitive match) — verified by the erasure suite.
- Given invitations *sent by* the erased FIM, when erasure completes, then `invited_by_group_id` is `NULL` (existing FK behaviour, asserted not assumed).

### STORY-7: No path around the contracts (ADR-U038)
As the platform, I want the direct PostgREST surface verified against the contracts, so the two layers agree.

**Acceptance criteria:**
- Given the adversarial suite exercising direct INSERT/UPDATE/DELETE on `group_memberships` (invite/accept/decline shapes) and `pending_email_invitations` as a non-privileged member and as a Mist, then every refusal the contracts make is also made by the existing RLS (verified, not assumed).
- Given the direct email-invite INSERT path (RLS-permitted for `invite_members` holders), when it bypasses the contract's existing-FIM conversion and validation, then the residue is recorded for the gate's direct-caller question (the G-B posture: surfaced, not unilaterally narrowed).
- Given `TRUNCATE` on either table from a client role, then the privilege does not exist.

## Platform dependencies

- **PC-3 substrate (existing, Conformant):** `group_memberships` 8-policy RLS (invite/accept/leave/remove/bootstrap/admin), `pending_email_invitations` + its `invite_members`-gated RLS, `has_permission()`, `get_current_personal_group_id()`, the notification + role-auto-assign triggers, the `invite_members` catalog key (Steward-template-held).
- **PC-2 seam (existing, not modified):** `handle_new_user()` Step 8 auto-claim; FEAT-PC002's erasure cascade (amended here — cross-reference recorded there at build).
- **FEAT-PC010:** the G-A visibility rule; `get_group_detail` (unchanged — invited members stay out of its members payload by design).
- **Schema gate.** New SECURITY DEFINER functions + the erasure-function amendment + TRUNCATE revokes + grants → task status `review`, explicit nod; the gate asks the direct-caller question per ADR-U038 and rules on Open Q1–Q4.

## Cross-product impact

Consumed by **Hub [FEAT-H015](../../../products/hub/features/FEAT-H015-group-invitations-and-joining.md)** (Cycle G-C Surface half); the Gimbal inherits the same contracts and refusal semantics. The search primitive is the **DS-6 re-home seam** — when Discovery activates, the capability moves there (contract preserved or formally superseded); the Hub §L4 ledger already tracks DS-6 as not-yet-consumed. The V3 dispatch seam is the Notifications area's re-entry point for outbound email.

## Stability posture (Platform Core §7)

Additive: ~9 new functions, one amendment inside the existing erasure function's body (additive DELETE step), TRUNCATE revokes. No existing signature changes, no new table, no policy changes (existing RLS stays as defense-in-depth). Each SECURITY DEFINER function documents its elevation; bodies minimal per the PG17 ceiling.

## Vertical impact

- **Privacy/GDPR:** `invited_email` is third-party PII — reads are `invite_members`-gated, search returns no emails, payloads content-minimised; the erasure cascade extends to invitation rows addressed to the erased email (STORY-6, closing the FEAT-PC002 gap); auto-claim binds only at credentialed sign-up (ADR-U031 — a Mist holds no email and is never a claim target).
- **Notifications:** invitation received/accepted/declined already write durable rows via existing triggers (V3 satisfied at the substrate; ADR-U039 — durable state first); **email dispatch is the planted V3 seam (D4)** — no send occurs until the Notifications area wires the shared dispatcher.
- **Administration:** admission is permission-gated (`invite_members`, Steward-template-held) and community-scoped per ADR-U028 (in-place per group, not Console); DeusEx paths (`memberships_insert_admin`, pending-invite reassignment on Steward exit) untouched — G-D/G-E territory.
- **Observability:** refusals are SQLSTATEs; invitations leave durable rows with provenance (`added_by_group_id`, `invited_by_group_id`); consuming routes emit id-only telemetry — **email addresses never in events** (FEAT-H015).
- **Transactions:** None.
- **Extensibility:** admission is gated through the open permission catalog (no role-name checks — ADR-U007); membership/invitation `status` CHECK enums are the permitted state-attribute pattern (ADR-U018); the search payload's `membership_status` field extends additively; the token column leaves the claim-by-link path open without building it.

## Open spec questions

1. **Email matching in search: exact-only.** Legacy matched partial email (`ilike`); v1 narrows to exact-match (partial-email search is an enumeration primitive against a PII field). Name-partial stays. Confirm at the gate.
2. **`invite_by_email` on an existing FIM's email: convert server-side.** Default: create the membership invitation instead (a stranded email row never auto-claims — sign-up is the only claim trigger); the alternative (refuse and steer to search) leaks the same existence fact with worse UX. Confirm at the gate.
3. **Pending-list read scope: `invite_members` holders only.** The list carries third-party email addresses; ordinary members don't need it (the Surface gates the panel on the already-fetched effective-permissions read). Alternative: any member sees membership invites, only holders see email invites (split payload). Confirm at the gate.
4. **Erasure amendment shape.** Default: hard-delete pending email invitations addressed to the erased email (they are unclaimed offers, not consent-proof — the ADR-U034 retain-pattern does not apply). Confirm at the gate.

*(All four defaults confirmed at the gate — Stefan's nod on PR #68, 2026-07-04.)*

## Implementation notes (6-done — Cycle G-C, 2026-07-04)

Built TDD red-first, platform-first. **Schema gate passed the same day:** Stefan reviewed PR #68 (all seven gate items — Open Q1–Q4 defaults, the trigger fix, the direct-path residue, TRUNCATE hygiene) and gave the nod; merged. Consumed by FEAT-H015 (built immediately after; its notes carry the Surface half).

- **Migration** `supabase/migrations/20260704144630_feat_pc012_invitation_contracts.sql` (applied to dev + repaired, gate passed). **Nine member-facing SECURITY DEFINER contracts, no new table, no policy changes.** All actor resolution via `get_current_personal_group_id()`; writes FIM-only + active-account-only; group resolution per the G-A visibility rule (member-or-public+active, else `P0002`). `invite_by_email` stores emails lowercased with a case-insensitive duplicate guard (the unique constraint alone is case-sensitive).
- **Open Q1–Q4 defaults carried and tested:** exact-only email search (a partial-email probe test asserts the miss); existing-FIM conversion (`{kind: 'member_invitation'}` returned, no email row); `invite_members`-gated pending list (`42501` for plain members); erasure hard-delete (addressed-to rows gone, sent-by rows survive with `invited_by_group_id NULL`).
- **Build-discovered substrate defect, fixed in the same migration (red-demonstrated by STORY-5's accept test):** `auto_assign_member_role_on_accept` looked up the default role by `name = 'Member'`, but v2-created groups (G-A bootstrap) name instances verbatim after templates (`'Member Role Template'`) — an accepted invitee silently received **no role** (zero permissions). Fixed by resolving the Member-template-derived instance via `created_from_role_template_id` (the deletion-protection rule's own key), short-name lookup kept as the legacy-group fallback. Trigger fix, not a policy change; gate item 5, accepted.
- **Substrate reality carried:** the display identity used in search and invitation payloads is the personal-group name, which `handle_new_user` defaults to the **first word** of the display name (nickname rule) — surfaced by the first green run's failures; the suite's personas use single-token names. A suspended FIM is invitable by id (hidden from search); expiry stays predicate-based (`expires_at`), no reaper.
- **Direct-path residue (gate item 6, accepted):** direct `pending_email_invitations` INSERT by an `invite_members` holder bypasses the contract's validation/lowercasing/conversion — worst case a stranded pending row visible only to holders; auto-claim compares `LOWER()` so case is immaterial.
- **Red→green evidence:** `hub/tests/integration/groups/invitation-contracts.test.ts` — **26 tests**; **24 demonstrated RED** (functions absent → PGRST202; the accept test's role-binding assert red against the substrate defect) → GREEN post-migration. **Labelled non-red-first by design:** 2 of STORY-7's direct-path asserts (the story's point is verifying the *existing* RLS — "verified, not assumed"). TRUNCATE revokes (`pending_email_invitations`, `group_memberships`) verified via `information_schema.table_privileges` at the gate, not as a Jest assert (PostgREST exposes no TRUNCATE verb).
- **Gates:** new suite 26/26; full integration **186/186** (28 suites, `--runInBand`); lint 0 errors (one pre-existing warning).

### Post-6-done fix — duplicate-invite raw-error leak (2026-07-05)

Reported in manual testing: inviting a member who already had a `group_memberships` row surfaced the raw Postgres text `duplicate key value violates unique constraint "group_memberships_group_id_member_group_id_key"` on screen. Root cause: `invite_member` (and `invite_by_email`'s existing-FIM conversion branch) did a bare INSERT and let the unique constraint throw — its default message; the H015 BFF maps `23505` → 409 and forwards the contract message through, so the raw text reached the UI. Fixed by pre-checking for an existing membership and raising a human, state-specific message (already a member / pending invitation / paused) under the **same `23505`** (no route or test-contract change forced), with a `unique_violation` backstop so a race can't leak the raw text. Migration `20260705090321` (two function bodies replaced; no schema change; `anon` no-execute re-asserted); red-first via the `STORY-2b` block (4 message-level asserts) in `invitation-contracts.test.ts`; groups domain 157/157. Task TASK-PC012-03 (schema gate — held for the nod). Scope per **ADR-U040**: `invite_by_email` is slated for retirement under the referral model but was fixed here because it is still live and the report came through its conversion branch.
