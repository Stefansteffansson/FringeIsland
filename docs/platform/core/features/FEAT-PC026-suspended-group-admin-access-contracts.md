# FEAT-PC026: Suspended-group admin access contracts — the WF-2 sight arms land where the gates actually block, plus the audited in-place acts

---
id: FEAT-PC026
title: Suspended-group admin access contracts (WF-2 per the settled G-board — suspended-scoped admin arms on the communication read doors and the conversations chokepoint, the members-email payload re-issue, and the audited moderate wrapper; suspended-only, purpose-bound, both layers)
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

ADM-G's platform half. Stefan's WF-2 directive ([walk findings](../../../planning/hub-v2/2026-08-03-hyga-walk-findings.md)): admins SHALL have full access to suspended groups — step inside, inspect, clean forums, remove members. Scope settled at WS-2 (suspended-only) and the G-board (2026-08-04, [substrate dossier](../../../planning/hub-v2/2026-08-04-admg-substrate-dossier.md)): G-1 = the dedicated admin content view (the member-plane visibility law stays untouched), G-3 = journeys out (dated deferral), G-4 = message bodies in, group-kind conversations only. The dossier (two delegated walks, lead-session verified; no migrations landed since) grounds every premise:

1. **The reframe: all twelve of PC023's read-door suspension arms exist; ten are unreachable** — PC023 appended each `AND NOT is_platform_admin()` arm *after* a membership/visibility gate with no admin arm, so the gate refuses the admin before the arm runs (PC023 = `20260803190000`). The work is in the preceding gates, not the quarantine.
2. **Under the G-1 verdict the door list shrinks to the communication family.** The admin content view needs: members (already served — see 6), forum (already passes — see 3), announcements (`get_group_announcements` gate `is_active_group_member`, PC023:3049-3056), conversations (`get_group_conversations` inline membership EXISTS, PC023:3096-3106), and message bodies (`get_conversation_detail` participation gate, PC023:3157-3170). The visibility/roles/invitations/journeys arms never need to exist.
3. **`get_group_forum` already passes a non-member admin — by accident, not law.** `has_permission`'s Tier-1 arm is context-free (`20260222000000:436-453`) and `auto_grant_to_deusex` (`:1352-1354`) grants DeusEx every permission, so `has_permission(admin, any group, any permission)` is unconditionally TRUE; the door's `view_forum` gate (PC023:2978-2985) therefore admits admins, and its suspension arm exempts them. The same holds at RLS (`forum_select`, PC023:4467-4483). This spec pins the behaviour as law and names the mechanism; narrowing Tier-1 is out of scope (No-gos).
4. **The conversations chokepoint is one helper with the arm in the wrong conjunct.** `is_conversation_participant` (PC023:4156-4179) is `participant AND (is_platform_admin() OR NOT suspended)` — the admin arm can never grant sight, only preserve a participant-admin's read. One re-issue closes `conversations`, `messages`, and `conversation_participants` RLS (their SELECT policies delegate to it, `20260719230500:159-172`) plus realtime deltas, which respect RLS.
5. **The layers currently disagree about announcements.** RLS already grants admins *all* announcements unconditionally (`announcements_select_admin`, `20260720200000:117-119`) while the contract refuses them outright. The posture precedent also exists at `ds5_moderation_report_detail` (`20260802170000:84-140` — reads `forum_posts` + `messages` with no status check). WF-2 makes the contract layer agree with what the substrate already does for moderation.
6. **`admin_get_group_detail` (`20260801130000:34`) already serves suspended groups with `members[]`** — `{personal_group_id, display_name, is_steward}` — but **no email**. The W-4 echo law (member-ceremony confirms echo the unique identifier — email — beside the display name, the RB-8 doppelganger rule) binds the Hub's remove ceremony, so the payload must carry it: a members-row re-issue, caught at the payload walk.
7. **The remove act already has its contract.** `admin_remove_member_from_group` shipped in FEAT-PC021 (ADM-18), audited and typed; PC023's exits family passes admins through the availability guard. No new remove contract — composition only, verified on a suspended group by a gate cell.
8. **Suspended-only is expressible at every touched door**, with one trap: a bare top-level `is_platform_admin()` OR in the helper would grant admins sight of *all* conversations in every status. The arm must be a suspended-scoped, group-kind-scoped disjunct of the participation conjunct (truth table in the Solution sketch).
9. **Terminology collision:** `suspended` also names an account state (`users.is_active`-derived). Spec text, test names, and refusal copy here say **group-suspension**; greps must not conflate the two families.

### Why Platform Core (PC-4)

The `admin_* → PC-4` pin binds the wrapper (the standing default), and the sight arms amend the availability law FEAT-PC023 (PC-3) wrote — a core-to-core reach of the admin plane into Organisation's doors, the exact shape of `admin_reassign_group_stewardship` composing PC-3 fabric from PC-4. `is_platform_admin()` is Core; the member-plane visibility law is Core; no Domain Service could own an admin-plane law over Core-issued doors without inverting the one-way rule. The re-issued member doors keep their existing ownership-manifest owners (PC-3 / DS-5 as registered); only the new wrapper registers PC-4.

## Solution sketch

One migration, one schema gate (held with red evidence + apply commands for **named** approval — the standing rule; ADR-U043 pass at the gate; the sibling-assertion sweep and the post-apply verification set both apply). All re-issues SECURITY DEFINER, `SET search_path = ''`; every touched refusal stays typed; the wrapper follows the family shape (`is_platform_admin()` gate refusing `42501` `'platform administrator required'`; REVOKE PUBLIC/anon, EXECUTE authenticated + service_role; every mutation writes `admin_audit_log`).

### Part 1 — the sight arms (three door re-issues + the chokepoint helper; suspended-scoped)

- **`get_group_announcements` re-issue:** the gate becomes `IF NOT (is_active_group_member(p_group_id) OR (is_platform_admin() AND <group is suspended>)) THEN 42501`. The downstream PC023 suspension arm (:3054) already exempts admins and becomes reachable-consistent. Members of non-suspended groups: unchanged. Admins on non-suspended groups: still refused — the privacy law ("private and absent look identical") holds everywhere the admin plane hasn't acted.
- **`get_group_conversations` re-issue:** same suspended-scoped admin disjunct on the inline membership EXISTS gate (:3096-3106); the door's own downstream arm (:3104) already exempts admins.
- **`get_conversation_detail` re-issue:** the participation gate (:3157-3170) gains the admin disjunct scoped **group-kind AND suspended** (the G-4 verdict): `participant OR (is_platform_admin() AND c.kind = 'group' AND <conversation's group is suspended>)`. Direct (non-group) conversations stay outside admin sight in every status.
- **`is_conversation_participant` re-issue** (closes the RLS family + realtime): from `P AND (A OR NOT S)` to `(P OR (A AND K AND S)) AND (A OR NOT S)` where P = participant, A = `is_platform_admin()`, K = group-kind, S = group suspended. Truth table pinned in the gate suite: participant/non-admin/active → true (unchanged) · participant/non-admin/suspended → false (quarantine holds) · admin/participant/any → true (unchanged) · admin/non-participant/suspended group-kind → **true (the new arm)** · admin/non-participant/active → false (suspended-only holds) · admin/non-participant/DM → false in every status.
- **`get_group_forum`: no change — pinned.** A characterization cell proves the non-member admin read on a suspended group (and documents the Tier-1 mechanism in the suite docblock); a second cell pins that the door's *member* quarantine is unchanged.

### Part 2 — the payload re-issue

- **`admin_get_group_detail`** members rows gain `email` (`{personal_group_id, display_name, email, is_steward}`) — the W-4 echo law's requirement for the Hub's remove ceremony. Everything else in the payload byte-stable. Sibling sweep covers its gate cells and the Hub `AdminGroupMember` type.

### Part 3 — the audited in-place act (one new wrapper; the remove composes existing law)

- **`admin_moderate_group_forum_post(p_post_id uuid, p_reason text)`** — the "clean forums" act as an honest admin-plane door: `is_platform_admin()` gate; refuses `P0002` on unknown post; refuses `P0001` `'group is not suspended'` unless the post's group is group-suspended (purpose-bound — the WS-2 mandate operates under the hard hold); composes the existing moderation law for the tombstone/removal semantics (exact composition settled at build against the live DS-5 sealed primitive per ADR-U047 rule 3 — reuse, never a second table-touching body); writes `admin_audit_log` (`moderation.forum_post_moderated` or the family-consistent action name settled at build) with `{group_id, post_id, author_group_id, reason}`.
- **Remove member:** `admin_remove_member_from_group` (FEAT-PC021) is the door; a gate cell proves it end-to-end on a **suspended** group (the availability guard's admin early-return composed through the whole removal cascade) — no re-issue expected; any defect found is a gate finding, not silent scope.

**Sibling-assertion sweep (mandatory, the three-times-bitten rule):** every assertion naming `get_group_announcements`, `get_group_conversations`, `get_conversation_detail`, `is_conversation_participant` (the PC023 gate cells pinning non-member/non-participant refusals and the C-series communication contract suites), `admin_get_group_detail` (the ADM-B cells + the Hub type), and the conversations/messages RLS verdicts — enumerated in the migration header, each marked adapted or deliberately left.

## Appetite

The platform half of one rider-scale cycle (ADM-G): one migration, four re-issues + one payload re-issue + one wrapper, the gate suite. Small by design — the dossier already did the door audit.

## Rabbit holes

- **Don't touch the visibility gate** (`get_group_detail:3998-4004`) — the G-1 verdict keeps the member-plane law intact; the dormant payload arm (:4007-4010) stays dormant for non-members.
- **Don't restructure the five gate idioms into `assert_group_readable`** — tempting, wrong cycle: only the communication family is in scope; a shared read-gate helper is AB-6/refactor material once the full door set has settled law.
- **Don't narrow `has_permission` Tier-1** — platform-wide blast radius; record, pin, defer (No-gos).
- **The moderation composition** — settle the exact DS-5 primitive call at build (cumulative-forward read); do not hand-write a second forum_posts-touching body.

## No-gos

- **No member-plane visibility arm** — a non-member admin's `/groups/[id]` stays the honest 404 (the G-1 verdict; access lives on the admin plane).
- **No journeys/progress arms** — the G-3 verdict, dated deferral (2026-08-04): `_journey_party_visible`, `_enrollment_traveller_read_standing`, `enrollment_select_group`, and the progress doors stay unarmed; revisit if a safety walk demands it.
- **No roles/invitations door arms** — the admin view doesn't render them; the fabric already has its admin plane (PC025).
- **No Tier-1 narrowing and no new admin bypasses:** the context-free system-tier mechanism (dossier synthesis fact 3) is recorded and pinned, not changed — **named AB-6 audit material**: any door gated purely by `has_permission` silently passes platform admins today.
- **No message-level moderation door** — individual message takedowns keep riding the content-reports plane (PC022/DS-5).
- **No admin announcements-retraction door** and no admin read of retracted announcements via this contract — the reports plane covers content acted on.
- **No new notification kinds** — an admin read emits no member-facing notice (deliberate; see Vertical impact).

## Stories

### STORY-1: The admin can read a suspended group's communications
As a platform admin, I want the announcements, conversations, and forum read doors to admit me for a suspended group I am not a member of, so that I can inspect what happened where the admin plane has already acted.

**Acceptance criteria:**
- Given a suspended engagement group and a platform admin who is not a member, when the admin calls `get_group_announcements`, `get_group_conversations`, or `get_group_forum`, then each returns the group's content payload (no refusal).
- Given the same admin and a group-kind conversation in that group, when they call `get_conversation_detail`, then the message bodies return.
- Given a member of that suspended group who is not an admin, when they call any of the four doors, then the refusal/quarantine behaviour is byte-identical to pre-PC026 law (the sweep proves no regression).

### STORY-2: Sight is suspended-only and group-kind-only
As the platform, I want the admin arms scoped to exactly the G-board verdicts, so that admin sight never exceeds the groups the admin plane has already acted on.

**Acceptance criteria:**
- Given an **active** (or resting) group and a non-member platform admin, when they call `get_group_announcements`, `get_group_conversations`, or `get_conversation_detail`, then the pre-existing refusal fires unchanged (42501 family) — suspended-only, pinned.
- Given a **direct (non-group) conversation** involving members of a suspended group, when a non-participant admin calls `get_conversation_detail` or SELECTs its rows, then they are refused in every status.
- Given the re-issued `is_conversation_participant`, when the six truth-table rows (Solution sketch) are exercised at the RLS layer (direct SELECT on `conversations`/`messages`/`conversation_participants`), then each row's verdict holds.

### STORY-3: The forum pass becomes law
As the platform, I want the already-passing forum read pinned as deliberate behaviour, so that the admin view's forum section rests on law, not accident.

**Acceptance criteria:**
- Given a suspended group and a non-member platform admin, when they call `get_group_forum` and SELECT `forum_posts` rows, then both succeed — pinned with the Tier-1 mechanism named in the suite docblock.
- Given the pin, when AB-6 runs, then the recorded Tier-1 finding (any purely-permission-gated door passes admins) is on its docket — referenced here, not fixed here.

### STORY-4: The members payload carries the unique identifier
As the Hub's remove ceremony, I want `admin_get_group_detail` members rows to carry `email`, so that the W-4 echo law is satisfiable.

**Acceptance criteria:**
- Given any group the door serves, when an admin calls `admin_get_group_detail`, then each members row is `{personal_group_id, display_name, email, is_steward}` and the rest of the payload is unchanged.
- Given the sibling sweep, when the re-issue lands, then every existing cell naming the members shape is enumerated in the migration header, adapted or deliberately left.

### STORY-5: The in-place acts are audited admin-plane acts
As a platform admin, I want to moderate a suspended group's forum post and remove a member through audited admin doors, so that cleaning up wrongdoing is purpose-bound and leaves a trail.

**Acceptance criteria:**
- Given a forum post in a suspended group, when the admin calls `admin_moderate_group_forum_post(post_id, reason)`, then the post is moderated under the existing law's semantics and an `admin_audit_log` row lands with `{group_id, post_id, author_group_id, reason}`.
- Given a post in a **non-suspended** group, when the admin calls the wrapper, then it refuses `P0001` `'group is not suspended'` (purpose-bound); given an unknown post id, then `P0002`.
- Given a member of a suspended group, when the admin calls `admin_remove_member_from_group` (FEAT-PC021), then the full removal cascade completes on the held group and the PC021 audit row lands — proven by a gate cell, not assumed.

### STORY-6: Direct-caller honesty holds
As the platform, I want every touched door honest to a direct PostgREST caller, so that no surface-side check is ever the only gate (ADR-U038).

**Acceptance criteria:**
- Given an anonymous or non-admin authenticated caller, when they call the wrapper, then `42501` `'platform administrator required'`; given any caller, the wrapper's EXECUTE grants are authenticated + service_role only, PUBLIC/anon revoked.
- Given the re-issued doors, when refusals fire, then SQLSTATEs are unchanged from current law (`42501` family on the gates, `P0002` where absence-hiding already holds) — no new information leak about group existence to non-admins.

## Platform dependencies

FEAT-PC023 (the availability law being amended — its quarantine arms become reachable), FEAT-PC020/PC021 (`admin_get_group_detail` re-issued; `admin_remove_member_from_group` composed), FEAT-PC022 / ADR-U047 (the sealed DS-5 moderation primitive the wrapper composes), the ADR-U038 direct-caller law, ADR-U043 (gate pass).

## Cross-product impact

Paired with [FEAT-H041](../../../products/hub/features/FEAT-H041-suspended-group-admin-content-view.md) (the admin content view consuming every door named here). The Gimbal inherits the same law by calling the same contracts. Member-plane surfaces: zero change (the No-gos pin it).

## Vertical impact

- **Privacy/GDPR:** The cycle's core tension, resolved by scope: admin sight of member content is purpose-bound (suspended groups only — exactly where the admin plane has already acted for safety), audited (durable read telemetry at the consuming BFF + `admin_audit_log` on acts), and grants no new storage of personal data. The members-row `email` addition exposes an existing admin-plane fact (the member console already shows email) in a second admin read — admin-gated end to end. "Private and absent look identical" holds untouched for every non-suspended group.
- **Notifications:** None — deliberately: no member-facing "an admin viewed this" notice (an admin read is not a member-visible state change; acts surface through existing channels — moderation tombstones render, removal is visible as membership change).
- **Administration:** Is the feature — the WF-2 mandate's contract layer.
- **Observability:** The wrapper writes `admin_audit_log`; refusals stay typed and observable; the gate suite pins the truth table; read-audit lives at the consuming BFF (H041) per the admin-plane precedent.
- **Transactions:** None.
- **Extensibility:** No new enums or sealed sets — the arms key on the open `groups.status` vocabulary and `is_platform_admin()`; the wrapper's `reason` is free text; further content families (journeys, G-3) can gain arms by the same shape without touching these.

## Performance budget

N/A (no surface). The re-issued reads add one `groups.status` lookup per call — same class as the PC023 arms they join; no new budget row.

## Implementation notes (built 2026-08-04, Cycle ADM-G)

**CORRECTIVE 2026-09-02 ([TASK-ANN-01](../../../planning/backlog/tasks/TASK-ANN-01-admin-suspended-announcement-sight-regression.md), migration `20260902220000`, held at the schema gate).** The announcements arm of this feature was **silently dropped on 2026-08-20** when FEAT-PD019 tranche 3 re-issued `get_group_announcements` to add the wielded limb: its personal branch came back as a bare membership check, so a platform admin reading a suspended group's announcements was refused `Group membership required` — and the H041 wing's Announcements pane 404-collapsed on production for thirteen days. Forum and conversations kept their arms. Found by the first full integration run since (this feature's own cell *"get_group_announcements admits the admin"* did its job the moment it was run). The corrective re-issues the T3 body byte-identical with the arm restored. **Lesson, recorded here because this is the feature that was broken:** a re-issue of a function must sweep every suite that names the function, not the re-issuing feature's own — the sibling-assertion rule and Q1 (codified 2026-09-02).

- **One migration** (`20260804230000_adm_g_pc026_suspended_group_admin_access.sql`), PR #418 held at the schema gate and applied on the named approval ("ok merge 418"). Red-first: **12 red / 7 labelled-green of 19** at head — the three armed doors' pre-PC026 refusals, the RLS new-arm zero-rows, the missing payload keys, the absent wrapper (PGRST202 class, with the non-admin/anon cells asserting post-apply refusal copy), and the remove door's `group is not active`; the greens were the two Tier-1 forum characterization pins, the member-quarantine continuity, the active-control and DM pins, the five unchanged truth-table rows, and the resting-refusal pin. Post-apply **19/19** (one test-only fix: `conversation_participants` is composite-keyed — no `id` column — masked pre-apply because the cell failed earlier on its intended red).
- **Build finding 1 — the gate finding (spec Part 3 "not silent scope"):** `admin_remove_member_from_group` refused ALL non-active groups (`20260801190000:786-788`; its own COMMENT documents "non-active group P0001") — the dossier premise "PC023's exits family passes admins through the availability guard" did not hold for this door (PC023 never re-issued it; its inline status guard fires before any availability law). Re-issued byte-identical except `status NOT IN ('active','suspended')`; the resting refusal is pinned by a labelled-green cell; last-member removal on a suspended group takes the existing closure leg (suspended → closed, an admin-plane transition). FEAT-PC021's contract line carries the amendment pointer.
- **Build finding 2 — the payload-walk gap:** members rows gain **`user_id`** (`public.users.id`) beside `email` — the remove contract's key, which the Hub cannot resolve from `personal_group_id` API-first (no table reads, no lookup contract). Both keys additive, admin-gated, already visible on the member console; LEFT JOIN preserves sight over act on a broken users row.
- **The moderate composition settled (ADR-U047 rule 3, the ADM-D shape):** sealed DS-5 body `ds5_moderation_moderate_group_post` (post resolution P0002 · purpose-bound P0001 `group is not suspended`, raised domain-side because only DS-5 may resolve the post's group · the tombstone by REUSING `moderate_forum_post` — never a second table-touching body; its Tier-1-admitted permission gate is the law STORY-3 pins, and an AB-6 narrowing would fail the gate suite loudly) under PC-4 wrapper `admin_moderate_group_forum_post` (wall 42501 `platform administrator required` · required reason 22023 · audit `moderation.forum_post_moderated` with `{group_id, post_id, author_group_id, reason}`). Grants: body sealed from all client roles; wrapper authenticated + service_role. Manifest: wrapper → PC-4, body → DS-5.
- **Sibling adaptations:** the delegated whole-tree sweep returned **zero will-flip assertions** (refusal copy is unpinned — suites assert SQLSTATEs); the one collision surfaced at the post-apply full sweep: the ADM-D S8a **`moderation.*` catalog pin** (`moderation-and-audit-contracts.test.ts:779`) — the append-only log now carries the second contract-written action, so the expected set grew (ADAPTED, labelled; the "only via the contract" law the cell pins is preserved). The pin queried the action namespace, not function names — why the name-based sweep missed it; recorded for the retro.
- Verification: gate suite 19/19 · full integration sweep green with the one labelled S8a adaptation (final numbers in the cycle CHANGELOG entry) · platform conformance suites green (manifest registrations landed with the migration) · ADR-U043: no surface, no budget row (the paired H041 carries the surface analysis).

**Amendment 2026-09-03 (TASK-SEAL-02 — the SEAL-01 rider, platform half; migration `20260903110000`, applied 2026-09-03 on the named approval "ok merge #603").** `admin_get_group_conversation_detail(p_conversation_id)` — the PC-4 wrapper on the SEAL-01 shape (ADR-U047 Amendment 3 declared composition over DS-5's `ds5_admin_conversation_detail`, [FEAT-PD012](../../domain/features/FEAT-PD012-lifecycle-dispositions-and-export-contracts.md) amendment): `is_platform_admin()` (42501); the conversation's group **closed** (P0001 — ruling A's scope, the one state a sealed thread exists in); direct conversations P0002 in every state (bound 2, no leak); the sealed state returned explicitly (`sealed_at`, `is_sealed`, `group_status` — bound 3); and the read **audited** — one `admin_audit_log` row per read, action `sealed_thread.read`, target = the conversation id, metadata ids only (bound 4). The member doors are untouched: `get_group_conversations` keeps its `sealed_at IS NULL` law, and `get_conversation_detail` keeps its participant wall plus this feature's suspended-only arm — on a closed group the admin is still refused there (pinned, labelled green), so the wrapper is the only door. **Privacy basis (load-bearing):** reading departed members' preserved words is purpose-bound (closed groups only — where the admin plane has already acted, or the group has ended by its members' own act), audited, and adds no storage; it rides the legitimate-interest basis [ADR-U052](../../../architecture/decisions/ADR-U052-telemetry-sink-and-analytics-posture.md) §4 states for the admin plane's audit and operational events, and a departed author is rendered by the ADR-U021 display law ("Former member" / "Unknown"), never re-identified. **Red-first:** `admin/sealed-thread-message-read.test.ts` — the contract cells red at HEAD (PGRST202; the client-role seal cell reads "not found" until the body exists), one labelled pin (bound 4). Manifest: both functions registered under their owners + a `declaredCompositions` entry; the S8a `moderation.%` catalog pin is untouched by design (the new action lives outside that family).
