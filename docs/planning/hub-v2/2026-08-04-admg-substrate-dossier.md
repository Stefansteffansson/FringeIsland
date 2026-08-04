# ADM-G kickoff — substrate dossier (2026-08-04)

**Cycle:** ADM-G (WF-2 — platform admins gain full access to **suspended** groups; scope settled at WS-2: suspended-only).
**Provenance:** two delegated walks run 2026-08-04 after ADM-F closed (#412) — platform (canonical source: applied migrations in `supabase/migrations/`, latest-definition-wins) and Hub surface (canonical source: the Hub app code on `main`). Both fact sheets are included verbatim below (tool-logistics lines trimmed). The lead session spot-verified the load-bearing citations against canonical before synthesis; **one Hub-walk claim was refuted in verification and is marked inline**. Companion: [walk findings + WS slotting](./2026-08-03-hyga-walk-findings.md) · [completion plan](./phase-3-platform-ops-completion-plan.md).

---

## Synthesis — what shapes the decomposition

1. **The reframe (corrects the carried premise).** The recorded background called the contract-level quarantines "mixed — some carry the admin arm." Strictly, **all twelve of PC023's read-door suspension arms exist and are correctly written; ten are unreachable** for a non-member admin, because PC023 appended each arm *after* a membership/visibility gate that has no admin arm. A spec that only touches suspension logic changes nothing. The correct framing is **"which doors refuse the admin before the arm runs"** — the work is in the preceding gates.

2. **Two platform arms govern the group face, not one.** The *visibility* gate (`get_group_detail`, PC023:3998-4004) raises P0002 with no admin arm — and its public-group arm requires `status='active'`, so even a public suspended group is invisible to a non-member admin. The *payload* arm (suspended shell, PC023:4007-4010) already carries `not public.is_platform_admin()` but is unreachable behind the gate. **The Hub already ships the payload half's surface:** the `GroupDetail | GroupDetailShell` union is discriminated payload-side (`hub/lib/groups/queries.ts:106-115`), and `hub/app/groups/[id]/page.tsx:250-256` documents that an admin's full payload for a suspended group takes the normal render branch. (Corrects the carried premise that the member plane has no admin handling.)

3. **Platform admins hold every permission in every context group — verified, refuting one walk claim.** `get_user_permissions`' system tier is context-free (`20260222000000_rebuild_universal_group_pattern.sql:502` — `g.group_type = 'system' OR gm.group_id = p_context_group_id`), and the `auto_grant_to_deusex` trigger grants the DeusEx role every permission at birth (`:837-860`, trigger `:1352-1354`). `fetchMyPermissions` (`hub/lib/groups/queries.ts:415-432`) therefore returns a platform admin the **full permission catalogue for any group** — *not* the empty array the Hub walk asserted (marked REFUTED in the fact sheet below). Consequences: (i) if member-plane visibility ever lands, every permission-keyed affordance renders **automatically** — the prop-threading problem the Hub walk weighed against a member-plane arm does not exist; the actual problem is the inverse — admin acts would render *unlabelled* as member acts; (ii) `has_permission`'s identical Tier-1 arm is why `get_group_forum` already passes admins today, and why **any purely permission-gated door silently passes platform admins** — an undocumented mechanism with platform-wide reach.

4. **There is no shared read gate to hang the arm on.** No `assert_group_readable` exists; PC023 inlined the quarantine twelve times. The nine blocked doors hide behind **five distinct gate idioms** (`is_active_group_member`, inline membership `EXISTS`, participation `EXISTS`, `_journey_party_visible`, `_enrollment_traveller_read_standing`) plus a thrice-copied P0002 visibility idiom — expect ~five helper amendments or twelve door-level edits, not one change. Two doors (`get_player_state`, `get_conversation_detail`) can only take the arm **inside their helper**, because group state is not visible at the door.

5. **Contract and RLS layers must move together — and they currently disagree about announcements.** SELECT rides RLS for the content family (PC023:4150-4151 says it outright); the contracts are SECURITY DEFINER so RLS is moot inside them, but **realtime deltas respect RLS** (the forum section subscribes via `useForumTenant`/`useCommChannel`). RLS already grants admins `groups`, `forum_posts`, and — via the unconditional `announcements_select_admin` (`20260720200000:117-119`) — *all* announcements, while the contract `get_group_announcements` refuses admins outright.

6. **The posture precedent already exists.** `ds5_moderation_report_detail` (`20260802170000:84-140`) reads `forum_posts` and `messages` under SECURITY DEFINER with **no group-status check at all**, and `announcements_select_admin` is the per-table admin-arm template. WF-2 is not a new posture — it makes the rest of the substrate agree with what moderation and announcements already do.

7. **The admin-plane surface for option (b) is largely paid for.** The admin groups list ships a `suspended` filter tab (`AdminGroupsList.tsx:19`) linking straight to `/admin/groups/[id]`; `admin_get_group_detail` already serves suspended groups and returns `members[]` (`hub/lib/admin/groups.ts:42`) which the page fetches but renders only as reassign candidates; and the three content sections are `({groupId})`-shaped with no context coupling (`GroupForumSection.tsx:40`, `GroupConversationsSection.tsx:23`, `GroupAnnouncementsSection.tsx:28`). Costs that remain: their fetches hit member-plane BFF routes whose contracts carry the blocked gates (§4), and two sections ship module-level session caches (`peekForum`, `peekGroupAnnouncements`) that violate the admin plane's never-session-cached rule (H034) if reused unmodified.

8. **Option (a) edits a composition root at its complexity ceiling, against its own conventions.** `app/groups/[id]/page.tsx` is a 335-line root holding eleven sections and the one-refresh-path invariant, over a 1051-line `GroupDetailPanel`; the member plane's conventions (AppShell, `EmptyState`, session caches, deliberately content-free telemetry — `app/api/groups/[id]/route.ts:17`) are the stated opposites of the admin plane's (no shell, 404-body refusal, never-cached, **durable audit telemetry on reads** — `app/api/admin/groups/[id]/route.ts:25`). Purpose-bound, audited admin sight is structurally at home only on the admin plane.

9. **Suspended-only scope is expressible at every door — with one trap.** Ten doors see group state directly. The `is_conversation_participant` amendment must move the admin arm from the second conjunct into a **suspended-scoped disjunct of the first** (`participant OR (is_platform_admin() AND conversation belongs to a suspended group)`); a bare top-level `is_platform_admin()` OR would grant admins sight of *all* conversations in every status — beyond WS-2's scope.

10. **Terminology collision.** `suspended` names two unrelated states: `groups.status='suspended'` (this cycle) and the account state derived from `users.is_active`. Most greps for `suspended` hit account-state code. Spec text, test names, and error copy must say **group-suspension** explicitly.

11. **No group-keyed audit, export, or notification read exists.** `admin_get_audit_log` takes `(p_limit, p_before, p_action_prefix)` — not group-keyable; the export/notification composites are own-subject-only. Nothing to arm there; a per-group audit slice on the admin view would be *new* contract surface, out of WF-2's mandate (possible AB-6 material).

## Decision board — ADM-G shape — SETTLED 2026-08-04 (Stefan: all four rows as recommended)

**Verdicts:** G-1 = (b) dedicated admin content view on `/admin/groups/[id]` · G-2 = new paired FEAT-PC026 ↔ FEAT-H041 · G-3 = journey progress OUT (dated deferral) · G-4 = message bodies IN, group-kind conversations only. The riding defaults below stand unobjected.

**Settled, not reopened:** WS-2 suspended-only scope · schema-gate PRs held for NAMED approval · every admin mutation writes `admin_audit_log` · `admin_* → PC-4` manifest pin · ADR-U043 perf pass at the gate.

| # | Question | Recommendation | Default if unaddressed |
|---|---|---|---|
| **G-1** | **Surface shape:** (a) member-plane admin arm — add the visibility arm to `get_group_detail`; the full surface then renders automatically (facts 2-3), but admin acts arrive unlabelled, member-plane session-cache/telemetry conventions conflict (fact 8), and roughly all twelve doors need arms; or (b) a **dedicated admin content view on `/admin/groups/[id]`** — compose members + forum + announcements + conversations sections under admin conventions; the member-plane 404 law stays untouched | **(b).** The mandate is an admin-plane act: purpose-bound, audited (durable telemetry pattern), honestly labelled. (b) keeps "private and absent look identical" fully intact on the member plane, lands exactly where the `suspended` filter already navigates, and **shrinks the platform work to the four content doors** — the visibility/roles/invitations/journeys arms never need to exist | (b) |
| **G-2** | **Spec housing:** new paired FEAT-PC026 ↔ FEAT-H041, or amendments to FEAT-PC023/FEAT-H038 | **New paired specs** (next free IDs, directory-verified). House precedent: every ADM cycle minted its own pair; the findings' "PC023 amendment" phrase describes the *law* being amended, which the new spec records as superseding law (the WA-3 way) | new pair |
| **G-3** | **Journey progress in the admin content view?** | **Out for ADM-G**, dated deferral: not a wrongdoing surface, and personal-development data is the most privacy-sensitive family; the safety mandate is forums / messages / announcements / members | out, dated deferral |
| **G-4** | **Message bodies:** does admin sight include opening group conversations (`get_conversation_detail` + the messages family) for suspended groups? | **In, group-kind conversations only** — bullying evidence lives in messages; the helper amendment is suspended-scoped (fact 9); non-group (direct) conversations stay outside admin sight | in, group-kind only |

**Defaults riding with the recommendation unless objected:** the member-plane URL keeps its honest 404 for non-member admins under (b) · every admin content read emits durable telemetry (`admin.group_*_read` family) · no realtime on the admin view (fresh-per-mount, the H034 rule) · RLS arms land together with contract arms where SELECT-on-RLS is live, suspended-scoped (fact 5) · the members section renders from the already-shipped `members[]`.

---

## Platform fact sheet (delegated walk, verbatim)

**Canonical source:** `supabase/migrations/*.sql` (103 files). Latest-definition-wins applied throughout; every supersession flagged. Docs/tests not consulted for any verdict.

**Headline:** The suspension quarantine's admin arms are real but **mostly unreachable**. PC023 bolted `AND NOT is_platform_admin()` onto suspension checks that sit *downstream* of membership gates that have **no** admin arm. For a non-member platform admin the membership gate fires first, so 10 of the 12 admin arms are dead code. Exactly **one** content door passes a non-member admin today (`get_group_forum`), and it does so by accident of `has_permission`'s Tier-1 context-free arm — not by design.

### 1. How suspension is represented

`groups.status` (TEXT). Introduced `20260228111514_sprint1_foundation_schema.sql:2,24` as `('active','closed','archived','suspended')`. **Current governing shape** — `20260803190000_hyg_a_pc023_group_availability_enforcement.sql:100-102`:

```sql
alter table public.groups drop constraint groups_status_check;
alter table public.groups add constraint groups_status_check
  check (status in ('active', 'resting', 'suspended', 'closed', 'archived'));
```

**`resting` vs `suspended`** — both are mode holds (FEAT-PC023); they differ only in who may escape them. From `assert_group_writable` (PC023:157-173): `resting` is silent for holders of the `rest_group` permission *in that group*, else `P0001 'group is resting'`; `suspended` admits **no member-side exemption at all** — `P0001 'group is suspended'`. `closed`/`archived` pass through untouched (terminal semantics live at their own doors). Transitions: `rest_group`/`wake_group` are member-plane (PC023:4191, 4258); `admin_rest_group`/`admin_wake_group`/`admin_suspend_group` are admin-only audited wrappers (PC023:4326, 4357, 4392). Header lines 48-49: there is **no direct `suspended` -> `resting` move**. The `rest_group` permission is seeded PC023:111-115, linked to the Steward template :117-121, backfilled :124-130.

#### Helper functions (all verified; single-def unless noted)

| helper | governing file:line | admin arm? | note |
|---|---|---|---|
| `assert_group_writable(uuid,uuid)` | PC023:138-175 | **YES**, :162-164 | `if public.is_platform_admin() then return; end if;` — placed *before* both hold arms |
| `is_platform_admin()` | `20260223171200_fix_rc7_admin_user_ops.sql:30-45` | n/a | active membership in system group named `DeusEx`. **Only definition.** |
| `has_permission(actor,ctx,perm)` | `20260222000000_rebuild_universal_group_pattern.sql:419-475` | **effectively YES** | Tier-1 arm :436-453 matches any permission held via a `group_type='system'` group, **ignoring the context group** |
| `auto_grant_permission_to_deusex()` + trigger | `20260222000000:837-860`; trigger `auto_grant_to_deusex` :1352-1354 | n/a | `AFTER INSERT ON public.permissions` — auto-grants **every** new permission to the DeusEx role |
| `is_active_group_member(uuid)` | `20260222000000:316-329` | **NO** | pure membership EXISTS |
| `is_conversation_participant(uuid)` | **PC023:4156-4179** (supersedes `20260222000000:924`, `20260719230500:114`) | YES but AND-ed under participation | see §3 |
| `_journey_party_visible(uuid,uuid)` | `20260707130821:65-124` | **NO** | |
| `_enrollment_traveller_read_standing(uuid,uuid)` | `20260708150000:72-111` | **NO** | raises `P0002 'enrollment not found'` |
| `ds5_require_fim_actor()` | `20260719230500:213-235` | n/a | FIM gate; admins are FIM so it passes |

**The load-bearing consequence (verified, not assumed):** DeusEx is `group_type='system'`; the trigger grants it every permission; `has_permission`'s Tier-1 arm is context-free. Therefore **`has_permission(<any platform admin>, <ANY group>, <ANY permission>) = TRUE`**, including for groups they never joined. This single fact decides most verdicts below.

**There is no read-gate helper.** No `assert_group_readable` exists anywhere in the corpus. PC023 implemented the read quarantine as 12 hand-copied inline blocks, not a shared guard. This is the central decomposition fact.

### 2. Door-by-door — CONTRACT layer

All doors are `SECURITY DEFINER` (RLS bypassed; the in-function check is the only gate). Verdict = *can a non-member platform admin read this group's content for a suspended group today?*

| door | governing file:line | how it gates suspended-group content for non-members | admin arm? | verdict |
|---|---|---|---|---|
| **`get_group_detail` — visibility gate** | PC023:3998-4004 | `if v_group.id is null or not (v_is_member or (v_group.is_public and v_group.status = 'active') or (v_is_invited and v_group.status = 'active') or v_wields_member) then raise exception 'group not found' using errcode = 'P0002'` | **NO** | **NO** — P0002. The public arm requires `status='active'`, so even a *public* suspended group is invisible |
| **`get_group_detail` — payload** | PC023:4007-4010 | `if v_group.status = 'suspended' and not public.is_platform_admin() then return jsonb_build_object('id',…,'name',…,'status',…)` | **YES** | **NO for non-members** (unreachable — gate above fires first). YES for a member/wielder admin |
| `get_group_forum` | PC023:2962; guard :2978-2985 | `IF NOT public.has_permission(v_me, p_group_id, 'view_forum') THEN RAISE … 42501` then `IF (SELECT g.status …) = 'suspended' AND NOT public.is_platform_admin() THEN` | **YES** :2983 | **YES** — the only content door that passes a non-member admin; Tier-1 satisfies `view_forum` |
| `get_group_announcements` | PC023:3033; guard :3049-3056 | `IF NOT public.is_active_group_member(p_group_id) THEN RAISE EXCEPTION 'Group membership required' USING ERRCODE = '42501'` | YES :3054 — **dead** | **NO** |
| `get_group_conversations` | PC023:3084; guard :3096-3106 | inline `IF NOT EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = p_group_id AND member_group_id = v_me AND status = 'active') THEN RAISE … 'Not a member of this group' … 42501` | YES :3104 — **dead** | **NO** |
| `get_conversation_detail` | PC023:3127; guard :3157-3170 | participant row required: `IF NOT FOUND THEN RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501'` | YES :3168 — **dead** | **NO** |
| `get_group_invitations` | PC023:3226; guards :3253-3266 | visibility gate `if v_group.id is null or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then raise … 'group not found' … P0002`, then `invite_members` via `has_permission` | YES :3264 — **dead** (visibility gate first) | **NO** |
| `get_group_roles` | PC023:3300; guards :3327-3335 | same visibility-gate idiom, P0002 | YES :3333 — **dead** | **NO** |
| `get_group_journey_progress` | PC023:3362; guards :3390-3405 | `if v_enr.id is null or not exists (select 1 from public.group_memberships gm where gm.group_id = v_enr.group_id and gm.member_group_id = v_actor and gm.status = 'active') then raise … 'enrollment not found' … P0002`, then `view_group_progress` | YES :3403 — **dead** | **NO** |
| `get_group_enrollment_summary` | PC023:3544; guards :3564-3571 | `if not public._journey_party_visible(v_actor, p_group_id) then raise … 'group not found' … P0002` | YES :3569 — **dead** | **NO** |
| `get_player_state` | PC023:3595; guards :3622-3627 | `_enrollment_traveller_read_standing(v_actor, p_enrollment_id)` raises P0002 for non-travellers | YES :3625 — **dead** | **NO** |
| `get_my_conversations` | PC023:3804; arm :3849-3854 | own-inbox; `AND (public.is_platform_admin() OR NOT (c.kind = 'group' AND EXISTS (SELECT 1 FROM public.groups gx WHERE gx.id = c.group_id AND gx.status = 'suspended')))` | **YES, live** | own-scoped. A *participating* admin keeps suspended threads; a non-member admin sees nothing |
| `get_my_enrollments` | PC023:3864; key :3905-3906 | own-scoped; no refusal — row carries `'group_status', g.status` | none needed | own-scoped |
| `get_member_groups` | PC023:4095-4140 (**DROP + `create function`**, not `or replace`) | own-scoped: `where gm.member_group_id = v_personal_group_id and gm.status = 'active'`; additive `g.status` :4132 | none | own-scoped — suspended groups the admin *belongs to* are listed and labelled |
| `admin_get_groups` | `20260801120000_adm_b_pc020_group_administration_contracts.sql:62-121` | self-gates `if not public.is_platform_admin() then raise … 'platform administrator required' … 42501` :81-83. **No status filter**; explicit `'suspended'` filter value :86, :112 | **YES (true admin door)** | **YES** — **metadata only**: id, name, group_type, status, member_count, non_system_member_count, deusex_stewarded, created_at. No content |
| `admin_get_group_detail` | **`20260801130000_adm_b_pc020_detail_members_array.sql:34`** (supersedes `20260801120000:130`) | self-gates `is_platform_admin()` :50-52; `group_type <> 'personal'`; **no status filter** | **YES (true admin door)** | **YES** for group row + counts + stewards + `members` array. **NO forum, messages, announcements, invitations, roles, enrolments or progress** |
| `admin_get_audit_log` | **`20260804210000_adm_f_pc025_gate_fixes_instantiation_reach_and_wa2_full_name.sql:178`** (supersedes `20260804190000:695` + one earlier; 3 defs) | self-gates `is_platform_admin()` :191-195 | YES | **YES**, but params are `(p_limit, p_before, p_action_prefix)` only — **not group-keyable**. Suspension-agnostic |
| `admin_get_content_reports` | `20260802170000_adm_d_pc022_rider_ownership_split_and_lockdown.sql:219-235` | `IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'`; delegates to `ds5_moderation_list_reports` | YES | **YES** — suspension-agnostic |
| `admin_get_content_report_detail` -> `ds5_moderation_report_detail` | wrapper :237-250; body `20260802170000:84-140+` | admin-gated wrapper; body reads `public.forum_posts` :113-117 and `public.messages` :118-123 **directly, SECURITY DEFINER, with no group-status check anywhere** (0 occurrences of `suspended` in the file) | n/a — no quarantine to arm | **YES** — reported content from a suspended group is fully readable, `content_snapshot` included. An existing, working admin content read |

**Doors I looked for and did not find:** there is no group-keyed notification read and no group-scoped export/composite read. `get_own_notifications` (`20260731140000:100`), `get_own_data_export` (`20260802120000:549`), `get_own_messages_export` (`20260802120000:439`) and the composites in `20260719201718` / `20260731120000` are **all own-subject only** — no target parameter, so they are not admin read doors and cannot be scoped to another party's group. The `suspended` hits in those files are **account** state (`users.is_active`), not group state — see fact 9 in §5.

### 3. Door-by-door — RLS layer

**RLS is live for the group-content family.** 41 tables have RLS enabled. No migration issues an explicit `GRANT SELECT` to `authenticated` on these tables — they rely on Supabase's default blanket grant, which PC023 confirms twice: section 9's comment "SELECT stays (the C-series read-on-RLS posture)" (:4524) and its `revoke insert, update, delete … from authenticated, anon` (:4543-4546) — you cannot revoke what was never granted. PC023:4150-4151 says it outright: "SELECT is live on RLS for the family, so quarantine cannot be contract-only."

Tables where SELECT **was** revoked from `authenticated` (contract-only, RLS moot): `users` (`20260702120000:41-42`), `journal_entries` (`20260703084810:69`), `journey_steps` and `journey_step_instances` (`20260707190000:141`, `:425`).

| table | policy | governing file:line | quarantines suspended? | admin arm? | verdict (non-member admin SELECT, suspended group) |
|---|---|---|---|---|---|
| `groups` | `groups_select` | **PC023:4446-4464** (supersedes 5: `20260222000000:1483`, `20260223164813:44`, `20260223171200:85`, `20260227110556:25`, `20260228111514:44`) | labeled visibility: `status in ('active','resting','suspended') and (is_public or is_active_group_member(id) or is_invited_group_member(id) or created_by_group_id = …)` | **YES, live** — `or public.is_platform_admin()` :4463 | **YES** — admins see all groups in every status |
| `forum_posts` | `forum_select` | **PC023:4467-4483** | `and (public.is_platform_admin() or not exists (select 1 from public.groups g where g.id = group_id and g.status = 'suspended'))` | **YES, live** :4477 | **YES** — base predicate is `has_permission(…, 'view_forum')`, Tier-1-true for admins |
| `announcements` | `announcements_select_community` | **PC023:4486-4500** (supersedes `20260720200000:100`) | same not-suspended arm :4494 | YES but **dead** | **NO** — base predicate `public.is_active_group_member(scope_group_id)` :4492 has no admin arm |
| `announcements` | `announcements_select_admin` | `20260720200000:117-119` | none | **YES, live** — `USING (public.is_platform_admin())` | **YES** — a separate unconditional admin policy; all announcements, retracted included |
| `announcements` | `announcements_select_platform` | `20260720200000:108-114` | n/a | no | platform-scope rows only, not group content |
| `journey_enrollments` | `enrollment_select_group` | **PC023:4505-4517** | not-suspended arm :4511 | YES but **dead** | **NO** — base predicate `public.is_active_group_member(group_id)` :4509 has no admin arm |
| `journey_enrollments` | `enrollment_select_own` | earlier def, **untouched by PC023** (:4502-4504: personal groups are never suspendable; `admin_suspend_group` is engagement-only) | n/a | no | own-scoped |
| `conversations` | `conversations_select` | `20260719230500:159-161` (supersedes `20260222000000:1901`) | via helper | inherited — **dead** | **NO** — `USING (public.is_conversation_participant(id))` |
| `messages` | `messages_select` | `20260719230500:163-165` | via helper | **dead** | **NO** — `USING (public.is_conversation_participant(conversation_id))` |
| `conversation_participants` | `conversation_participants_select` | `20260719230500:167-172` | via helper | **dead** | **NO** |
| `content_reports` | `content_reports_select_admin` | `20260720200000:159-161` | none | **YES, live** — `USING (public.is_platform_admin())` | **YES** |
| `content_reports` | `content_reports_select_own` | `20260720200000:154-156` | none | no | own-scoped |
| `group_memberships`, `user_group_roles`, `group_roles`, `group_role_permissions` | SELECT policies survive; **14 write policies dropped** | PC023:4528-4546 | no suspension arm on the surviving SELECT policies | not added by PC023 | reads unchanged by PC023; writes now contract-only |

The 14 dropped write policies, by name (PC023:4528-4541): `gm_delete_admin`, `gm_insert_admin`, `memberships_insert_bootstrap`, `memberships_insert_invite`, `memberships_update_accept`, `group_roles_delete`, `group_roles_insert`, `group_roles_update`, `ugr_delete`, `ugr_delete_admin`, `ugr_insert_admin`, `ugr_insert_assign`, `grp_delete`, `grp_insert` — **none recreated**; `revoke insert, update, delete` on all four tables at :4543-4546. **SELECT survived on all four**, as :4524 promises.

**`is_conversation_participant` — the one chokepoint (PC023:4156-4179), quoted because the verdict hinges on it:**

```sql
select exists (
  select 1 from public.conversation_participants
  where conversation_id = p_conversation_id
    and participant_group_id = public.get_current_personal_group_id()
    and left_at is null
)
and (
  public.is_platform_admin()
  or not exists (select 1 from public.conversations c
                   join public.groups g on g.id = c.group_id
                  where c.id = p_conversation_id and c.kind = 'group'
                    and g.status = 'suspended')
);
```

The admin arm sits inside the **second** conjunct; the first requires actual participation. PC023's own comment at :4153-4154 concedes it: *"An admin who IS a participant keeps reading; non-participant admins gain nothing (admin reads ride the definer contracts, not this predicate)."* — a design assumption WF-2 invalidates, because the definer contracts do not carry the admin through either.

### 4. Verification of the four background facts

**Fact 1 — `assert_group_writable()` early-returns on `is_platform_admin()`; every write door passes admins. CONFIRMED.** PC023:162-164, after the `active`/nonexistent fast path (:157-159) and before both hold arms. 26 guard-frozen write doors plus the exit family call it (call sites PC023:213, 268, 319, 378, 433, 476, 536, 586, 627, 675, 763, 868, 960, 1170, 1287, 1377, 1469 and others).

**Fact 2 — the exits carry explicit admin arms: `leave_group`, invitation respond, `remove_member`. CONFIRMED, and broader than recorded.** Ten exit doors carry an inline `and not public.is_platform_admin()` suspension arm, each mapped to its enclosing function: `leave_group` (PC023:2250, fn@2206), `leave_group_as_group` (:2345, fn@2301), `remove_member` (:2440, fn@2395), `pause_member` (:2543, fn@2498), `withdraw_from_journey` (:2644, fn@2603), `decline_group_invitation` (:2707, fn@2683), `cancel_member_invitation` (:2770, fn@2726), `cancel_email_invitation` (:2837, fn@2789), `leave_group_conversation` (:2865, fn@2849), `respond_to_group_invitation` (:2949, fn@2884).

**Fact 3 — `get_group_detail` returns admins the full payload for a suspended group, but its visibility gate has no admin arm. CONFIRMED, exactly as recorded.** Gate PC023:3998-4004 (P0002, no admin arm); payload arm PC023:4007-4010 (admin arm present), reachable only by an admin who is a member, an invited member, or an `act_as_group` wielder. One addition: the gate's public-group arm requires `v_group.status = 'active'` (:4000), so suspension also closes the *public* face — a non-member admin cannot reach even a public suspended group.

**Fact 4 — the content-read quarantines are MIXED; RLS and conversation-list filters need the audit. CONFIRMED and now resolved.** The mix is not random: it tracks **which predicate precedes the suspension check**. Where that gate is `has_permission` (Tier-1 context-free), the admin passes — `get_group_forum` and the `forum_select` policy. Where it is `is_active_group_member`, an inline membership `EXISTS`, a participation check, `_journey_party_visible`, `_enrollment_traveller_read_standing`, or the P0002 visibility-gate idiom, the admin is refused before the arm is evaluated. Ten of twelve contract arms and two of four amended policy arms are dead code for a non-member admin.

### 5. Decomposition-shaping facts (platform walk)

1. **The quarantine is not the problem; the gate above it is.** All 12 of PC023's read-door arms are correctly written. Nine are simply unreachable, because PC023 appended the suspension check *after* a membership/visibility gate it never amended. A spec that only touches suspension logic will change nothing. **The work is in the preceding gates.**

2. **There is no shared read-gate helper to hang the arm on.** `assert_group_writable` has no read counterpart; PC023 inlined the same four-line block 12 times. A net-new `assert_group_readable(p_group_id)` is the natural shape, but **it would not inherit anywhere on its own**: the nine blocked doors are blocked by *five different* gate idioms (`is_active_group_member`, inline membership `EXISTS`, participation `EXISTS`, `_journey_party_visible`, `_enrollment_traveller_read_standing`) plus the P0002 visibility-gate idiom repeated verbatim in three doors. Expect roughly **five helper amendments, not one**, or twelve door-level edits.

3. **The cheapest high-yield lever is the three-door visibility-gate idiom.** `get_group_detail:3998-4004`, `get_group_invitations:3253-3256` and `get_group_roles:3327-3330` share a byte-similar gate; `_journey_party_visible` (`20260707130821:99-122`) is the same logic already factored into a function and would carry `get_group_enrollment_summary`. Adding `or public.is_platform_admin()` to that helper plus the three inline copies unblocks four doors and, via `get_group_detail`, the Hub's whole group face.

4. **`has_permission`'s Tier-1 arm is a silent, undocumented admin bypass with platform-wide reach.** Because `auto_grant_to_deusex` (`20260222000000:1352-1354`) grants DeusEx *every* permission and Tier-1 (`20260222000000:436-453`) ignores the context group, `has_permission(admin, any group, any permission)` is unconditionally TRUE. This is why `get_group_forum` already works. **Any door gated purely by `has_permission` already passes platform admins** and needs no new arm; conversely, adding permission-based gates elsewhere silently opens them to admins. This mechanism is nowhere named in the PC023 header.

5. **Contract layer and row layer must move together, and they are not symmetric.** `forum_posts`, `announcements`, `conversations`, `messages`, `conversation_participants`, `journey_enrollments`, `groups`, `group_memberships` and the three role tables all have live `authenticated` SELECT with RLS as the real gate (PC023:4150-4151). `users`, `journal_entries`, `journey_steps`, `journey_step_instances` are revoked and contract-only. Fixing only the RPCs leaves the row layer refusing; fixing only RLS leaves the RPCs refusing. Note the asymmetry: RLS already gives admins `groups`, `forum_posts` and — via `announcements_select_admin` — *all* announcements, while the contract layer refuses `get_group_announcements` outright. **The two layers currently disagree about announcements.**

6. **Two admin content doors already work and set the precedent.** `ds5_moderation_report_detail` (`20260802170000:84-140`) reads `forum_posts` and `messages` directly under SECURITY DEFINER with **no group-status check at all** (zero `suspended` occurrences in that file), and `announcements_select_admin` (`20260720200000:117-119`) is an unconditional `USING (public.is_platform_admin())`. WF-2 is therefore not a new posture — it makes the rest of the substrate agree with what moderation and announcements already do. `announcements_select_admin` is the cleanest existing template for a per-table admin arm.

7. **`admin_get_group_detail` is metadata-only and is the obvious composition point.** It already returns suspended groups (`20260801130000:34`, self-gated :50-52, no status filter) with row, counts, stewards and a members array — but no forum, messages, announcements, invitations, roles, enrolments or progress. If WF-2 wants a non-member admin to *see the group's content*, either the member-plane read doors gain admin arms (options 1-3) or the admin plane gains content reads of its own. The former is far cheaper and keeps one implementation of each read.

8. **"Suspended-only" scope is expressible at every door, but two gates cannot see group state without a new lookup.** Ten doors already have `p_group_id` or a row carrying `group_id` in scope. Exceptions: `get_player_state` reaches group state only through `_enrollment_traveller_read_standing`'s returned row (PC023:3624 queries `g.status` *after* the helper has already raised P0002), and `get_conversation_detail` resolves `c.group_id` at :3148-3152 but is blocked by the participation check at :3161-3163. Both need the admin arm inside the *helper*, not the door — `_enrollment_traveller_read_standing` (`20260708150000:72-111`) and `is_conversation_participant` (PC023:4156) respectively. The latter is the single amendment that closes `conversations`, `messages` and `conversation_participants` at once (PC023:4149-4152 says so), but the admin arm must move from the second conjunct into the first.

9. **Terminology collision worth flagging in the spec.** `suspended` names **two unrelated states**: `groups.status = 'suspended'` (this cycle) and an *account* state derived from `users.is_active` (`20260629054349_feat_pc004_account_state_read.sql:47`, `20260630161155:87`, plus the `'account is suspended'` 42501 refusals throughout `20260704075547`, `20260704090434`, `20260704144630`). Grepping `suspended` returns mostly account-state hits. Spec text, test names and error copy must disambiguate; the account-state hits in the export/notification migrations are **not** group-quarantine code.

10. **Latest-definition-wins changed my answer in five places**, all worth recording: `groups_select` has **six** definitions and only PC023:4446 governs (earlier ones, incl. `20260223171200:85`, carry a *different* admin posture); `is_conversation_participant` has three and only PC023:4156 has any suspension arm; `admin_get_group_detail`'s members array lives in `20260801130000:34`, not the PC020 original; `admin_get_audit_log` has three and only `20260804210000:178` governs; `get_member_groups` is a **DROP + `create function`** at PC023:4095 (the `RETURNS TABLE` change forced it), so grants were re-issued :4145-4146. I verified that **no migration after PC023** (`20260803210000` PC024, `20260804190000` and `20260804210000` PC025) re-issues any of the 12 read doors or the 4 amended policies — PC023 governs all of them.

11. **One contradiction with the recorded background.** Background fact 4 called the contract-level checks "mixed — some carry the admin arm." Strictly, **all twelve carry the arm**; what differs is whether the arm is *reachable*. Framing the spec around "which doors are missing the arm" will produce the wrong task list — the correct framing is **"which doors refuse the admin before the arm runs."**

---

## Hub fact sheet (delegated walk, verbatim; one claim REFUTED in lead-session verification, marked inline)

**Canonical source:** Hub application code on `main`, rooted at `hub/`. All paths below are relative to that root. Docs/specs were not consulted as authority. Walk date: 2026-08-04.

Discovered layout: Next.js App Router at `hub/app`, components at `hub/components`, data/outer-ring at `hub/lib`. **There is no `hooks/` directory and no `middleware.ts`** (verified absent at both `hub/middleware.ts` and `hub/app/middleware.ts`).

### 1. The member-plane group surface anatomy

#### 1.1 The routes — there is exactly ONE

The member plane for a group is a **single page**. There are no sub-routes for forum, conversations, members, or announcements.

| Route | File | Lines |
|---|---|---|
| `/groups` (list) | `app/groups/page.tsx` | — |
| `/groups/[id]` (everything) | `app/groups/[id]/page.tsx` | 335 |

`app/groups/[id]/page.tsx` is a `'use client'` page (`:1`) that composes **eleven** sections in one scroll (`:258-329`): `GroupDetailPanel`, `GroupJourneysSection`, `GroupJourneyProgressSection`, `GroupConversationsSection`, `GroupAnnouncementsSection`, `GroupForumSection`, `RolesPanel`, `InvitationsPanel`, `InviteGroupPanel`, `GroupMembershipsPanel`, `MyPermissionsPanel`.

**Consequence for the design choice:** there is no per-content-family route to mirror on the admin plane, and no tab shell to hang an admin arm on. Option (a) means editing this one 335-line composition root; option (b) means composing a new page from the same section components.

#### 1.2 BFF routes the page calls (via `lib/*/client.ts`, the outer ring)

The page itself calls only `lib/groups/client.ts` helpers (`:22-36`). The content sections self-fetch.

| Content family | Client fn (file:line) | BFF route | Platform contract (RPC) |
|---|---|---|---|
| Group detail + journeys slice | `lib/groups/client.ts:190` `fetchGroupDetailEnvelope` → `fetch('/api/groups/{id}')` at `:194` | `app/api/groups/[id]/route.ts` GET `:19` | `get_group_detail` — `lib/groups/queries.ts:155`; slice `fetchGroupEnrollmentSummary` at route `:44` |
| Roles fabric | `fetchGroupRoles` | `app/api/groups/[id]/roles/route.ts` | `get_group_roles` — `lib/groups/queries.ts:251` |
| Effective permissions | `fetchMyPermissions` | `app/api/groups/[id]/my-permissions/route.ts` | `get_current_personal_group_id` + `get_user_permissions` — `lib/groups/queries.ts:419-427` |
| Forum | `lib/forum/client.ts:32` → `/api/groups/{id}/forum` | `app/api/groups/[id]/forum/route.ts` GET `:15` | `get_group_forum` — `lib/forum/queries.ts:43` |
| Announcements | `lib/announcements/client.ts:34` → `/api/groups/{id}/announcements` | `app/api/groups/[id]/announcements/route.ts` GET `:15` | `get_group_announcements` — `lib/announcements/queries.ts:44` |
| Conversations | `lib/messages/client.ts:154` → `/api/groups/{id}/conversations` | `app/api/groups/[id]/conversations/route.ts` GET `:12` | `get_group_conversations` — `lib/messages/queries.ts:133` |
| Group journey progress | `lib/journeys/group-progress.ts:25` → `/api/groups/{id}/journeys/{enrollmentId}/progress` | `app/api/groups/[id]/journeys/[enrollmentId]/progress/route.ts` | (PD005 progress contract) |
| Members list | **no separate fetch** — rides `get_group_detail`'s `members[]` (`lib/groups/queries.ts:49-68`, rendered `components/groups/GroupDetailPanel.tsx:595-597`) | — | — |

There are 28 route files under `app/api/groups/` total.

#### 1.3 Where the 404 / not-found decision is made — THREE distinct layers

This is the load-bearing answer. **The visibility law is entirely contract-side; nothing in the Hub re-decides it.**

1. **Contract (authoritative).** `get_group_detail` raises SQLSTATE `P0002` for a group the caller may not see. `lib/groups/queries.ts:151-158` is a pure pass-through — it throws whatever the RPC raises, no local check.
2. **BFF (mapping only).** `app/api/groups/[id]/route.ts:54-57` maps `P0002 → 404 {error:'Group not found'}`; `:58-61` maps `42501 → 403`; `:62-63` else 500. The route's own docblock states the posture explicitly (`:13-16`): *"The FEAT-PC010 `get_group_detail()` contract decides everything (visibility, member-list inclusion, capability flags); this route is presentation only."*
3. **Page (rendering only).** `app/groups/[id]/page.tsx:105-106` catches `GroupsApiError` with `status === 404` → `setNotFound(true)`; `:245-246` renders `<EmptyState title="Group not found" description="It may be private, or it may not exist." />`. `GroupsApiError` carries the HTTP status precisely so pages can do this — `lib/groups/client.ts:56-61`.

**The suspended branch is a FOURTH, separate decision — and it is payload-shape-driven, not status-driven.** For a viewer who *can* see the group but is below the admin plane, the contract returns a minimal `{id, name, status}` shell instead of the full detail. The Hub narrows the union structurally:

- Type: `GroupDetailShell` at `lib/groups/queries.ts:106-113`, with `viewer?: undefined` at `:112` as the deliberate discriminant ("Never present — the discriminant that keeps the union narrowable").
- Union: `GroupDetailPayload = GroupDetail | GroupDetailShell` — `lib/groups/queries.ts:115`.
- Guard: `isGroupDetailShell(payload) { return !('viewer' in payload); }` — `lib/groups/client.ts:46-48`.
- Branch: `app/groups/[id]/page.tsx:250-256` → `<SuspendedGroupShell group={group} />`, which is the **whole page body** (30 lines, `components/groups/SuspendedGroupShell.tsx:12-29`): name, "Suspended" chip, one sentence. No content, no actions, not even Leave.

### 2. The permission / affordance wiring

#### 2.1 There is no permission context or provider

Permissions are **not** in React context. There is exactly one auth context — `lib/auth/AuthContext.tsx` (306 lines), consumed as `useAuth()` at `app/groups/[id]/page.tsx:54`, and it supplies only `{user, identity, loading}` — identity being `'sessionless' | 'mist' | 'fim'` (`:88-94`). It carries **no group permissions**.

Group permissions travel two ways, and this split is the single most important fact for option (a):

**(i) Page-level, passed down as props.** `app/groups/[id]/page.tsx:148-161` `loadPermissions()` → `permissions: string[] | null` state (`:71`), handed to `GroupDetailPanel` (`:262`), `GroupJourneyProgressSection` (`:274`), `InvitationsPanel` (`:297`), `MyPermissionsPanel` (`:318`), and gating `InviteGroupPanel` at `:302` (`permissions?.includes('invite_members')`).

**(ii) Section-level, self-fetched.** The three communication sections each call `fetchMyPermissions(groupId)` **internally**, ignoring the page's copy:
- `components/groups/GroupForumSection.tsx:17` (import), fetched inside its own load path; gate helper `can = (p) => perms.has(p)` at `:69`.
- `components/groups/GroupConversationsSection.tsx:12` (import), fetched at `:48-49`, setting `canCreate` from `create_group_conversations`; on throw → `setCanCreate(false)` at `:51` with the comment *"hidden until the platform says yes"*.
- `components/groups/GroupAnnouncementsSection.tsx:12` (import), `perms` Set at `:32`, `can` at `:42`.

#### 2.2 What a non-member platform admin would hold

> **[LEAD-SESSION CORRECTION 2026-08-04 — the walk's claim below is REFUTED.]** The walk asserted the call returns an **empty array** for a non-member admin, reasoning from the Hub-side wrapper alone. The governing RPC says otherwise: `get_user_permissions` (`supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql:481-503`) includes the **context-free system tier** at `:502` — `AND (g.group_type = 'system' OR gm.group_id = p_context_group_id)` — and the DeusEx role is auto-granted every permission (`:837-860`, trigger `:1352-1354`). A platform admin therefore receives the **full permission catalogue for ANY context group**. The walk's downstream conclusion (an option-(a) admin arm requires synthesising permissions or threading a second signal) **falls with it**: affordances would render automatically. The real option-(a) problem is the inverse — admin acts render unlabelled as member acts. Fact F2 below inherits this refutation.

Original walk text (retained for the record): `lib/groups/queries.ts:415-432`: `fetchMyPermissions` resolves the caller's personal group (`get_current_personal_group_id`, `:419`), then calls `get_user_permissions(p_acting_group_id, p_context_group_id)` (`:423-426`), returning `permissions: (data ?? []) as string[]` at `:429`. Permissions are computed from role bindings **in the context group**. A non-member holds none there, so this is a successful call returning `[]` — it does not throw and does not 403. Every affordance keyed on `permissions.includes(...)` therefore silently hides.

#### 2.3 Affordances on group content today, and what each keys on

| Affordance | Component:line | Keys on |
|---|---|---|
| Post to forum | `GroupForumSection.tsx` via `can('post_forum_messages')` | self-fetched perms |
| Reply | `GroupForumSection.tsx` | `reply_to_messages` |
| Moderate/remove post | `GroupForumSection.tsx` (`moderateForumPost` imported `:9`) | `moderate_forum` |
| Edit own post (15 min) | `GroupForumSection.tsx:76-77` `canEditOwn` | `isMine` (`:73-74`, `author_group_id === myGroupId`) + `EDIT_WINDOW_MS` (`:38`) — **ownership, not permission** |
| Delete own post | `GroupForumSection.tsx:66` | same ownership rule |
| Create conversation | `GroupConversationsSection.tsx:49` | `create_group_conversations` |
| Compose / retract announcement | `GroupAnnouncementsSection.tsx:42` | `send_announcements` |
| Assign / remove role | `GroupDetailPanel.tsx:152, :165` | **fabric viewer flags** (`RolesViewer` — `lib/groups/queries.ts:195-199`), a different source than permissions |
| Pause / reactivate / remove member | `GroupDetailPanel.tsx:188` | `permissions` prop (three independent keys, per docblock `:39-41`) |
| Edit settings | `GroupDetailPanel.tsx:924-941` | `viewer.can_manage_settings` capability flag (`lib/groups/queries.ts:70-75`) |
| Leave | `GroupDetailPanel.tsx` (`leave-group` testid) | membership |
| Rest / Wake (member plane) | `GroupDetailPanel.tsx:270` | `rest_group` permission key |
| View group progress | `GroupJourneyProgressSection.tsx:37` | `view_group_progress` via prop |

Note there are **three** independent gating sources already in play — the permission array, the fabric `viewer` flags, and the detail `viewer` capability flags. Any admin arm has to pick one or add a fourth.

### 3. The admin plane today

#### 3.1 Route inventory

9 admin pages, 31 admin BFF routes. Pages: `app/admin/page.tsx` (dashboard), `audit/`, `groups/` + `groups/[id]/`, `members/` + `members/[id]/`, `moderation/` + `moderation/[id]/`, `roles/` + `roles/[id]/`.

**There is no `app/admin/layout.tsx`** (verified absent). Admin pages are thin: `app/admin/groups/[id]/page.tsx` is 11 lines, unwrapping `params` with `use()` (`:8`) and rendering `<AdminGroupDetail groupId={id} />` (`:9`). `app/admin/groups/page.tsx` is 9 lines.

Admin pages notably do **not** use `AppShell` — contrast `app/groups/[id]/page.tsx:242` which wraps everything in `<AppShell title="Group">`. `AdminGroupDetail` renders its own `<main className="mx-auto max-w-3xl px-4 py-8">` (`:146`).

#### 3.2 How the admin route-guard actually works — there is no route guard

There is **no middleware, no layout guard, no route-policy admin registration**. The guard is a four-step convention:

1. **The RPC self-gates.** `lib/admin/groups.ts:4-10` docblock: *"Authorization is entirely the platform's (`is_platform_admin` inside each RPC) — a 42501 surfaces as `refused` and the BFF maps it to the admin-plane 404 shape (ADR-U038: the route never re-decides)."*
2. **The outer-ring wrapper translates SQLSTATE to flags.** `fetchAdminGroupDetail` — `lib/admin/groups.ts:72-83`: `42501 → {refused:true}` (`:78`), `P0002 → {notFound:true}` (`:79`), else `throwTyped` (`:80`). `AdminGroupsError` at `:48-54`.
3. **The BFF collapses refusal and absence into one 404.** `app/api/admin/groups/[id]/route.ts:21-24`: `if (refused || notFound || !detail) return 404 {error:'Not found'}`. Docblock `:9`: *"Refusal and not-found share the admin-plane 404 shape (existence-hiding)."*
4. **The component renders a literal 404 body.** `components/admin/AdminGroupDetail.tsx:46-49` treats `404 | 403 | 401` alike as `{kind:'refused'}`, and `:93-100` renders `<h1>404</h1> / "This page could not be found."`.

A new admin surface therefore needs no registration anywhere — it needs an `is_platform_admin`-gated RPC and it must reproduce this four-step shape.

#### 3.3 `/admin/groups/[id]` current anatomy — `components/admin/AdminGroupDetail.tsx` (356 lines)

State machine `ViewState` at `:24-28` (`loading | refused | error | loaded`); `Ceremony` union at `:33`.

Data: one `fetch('/api/admin/groups/{groupId}')` at `:45` → `admin_get_group_detail` (`lib/admin/groups.ts:76`). Mutations POST to `/api/admin/groups/{id}/{path}` at `:70`, then **always repaint from a fresh read** — `await load()` in the `finally` at `:87`, commented "the honest repaint — always from a fresh read".

Sections rendered:
- Title + status badge (`:147-159`), badge hidden when active (`:149`); `STATUS_STYLES` at `:17-22` includes `suspended: 'bg-red-100 text-red-700'`.
- Type + created line (`:160-162`).
- Caretaker banner (`:164-172`).
- Action error `role="alert"` (`:174-178`).
- **Counts** — `aria-label="Counts"`, Members / People (`:180-189`).
- **Stewards** — `aria-label="Stewards"` (`:191-206`).
- **Actions** — `aria-label="Actions"` (`:208-256`).
- Reassign picker (`:258-291`).
- Five `ConfirmModal`s (`:293-352`).

Lifecycle gating (`:137-141`): `canRest` = engagement && active; `canWake` = resting; `canSuspend` = active || resting; `canReactivate` = suspended; `canReassign` = caretaker && active.

**Confirmed: no content whatsoever.** No forum, no conversations, no announcements, no journeys, and no rendered member list.

**But the members data is already on the wire.** `AdminGroupDetail` type at `lib/admin/groups.ts:29-45` includes `members: AdminGroupMember[]` (`:42`) — `{personal_group_id, display_name, is_steward}` (`:23-27`). The component fetches it and uses it **only** to build reassign candidates: `const candidates = d.members.filter((m) => !m.is_steward)` (`:142`). Rendering a members list on the admin plane needs **zero** new platform work.

#### 3.4 The list page and how one reaches `[id]`

`components/admin/AdminGroupsList.tsx` (202 lines). Fetches `/api/admin/groups?filter={f}` (`:50`), same refusal collapse at `:51-53`. Navigation is a plain `next/link` at `:162-167`: `href={`/admin/groups/${g.id}`}`.

**`FILTERS` at `:15-20` already includes `{ key: 'suspended', label: 'Suspended' }` (`:19`).** An admin already has a first-class path to every suspended group, and `admin_get_group_detail` already serves them (the page renders Reactivate on `status === 'suspended'`). The entry point for option (b) exists and needs no new navigation.

### 4. Reuse inventory

Rating is against reuse **on a new admin page**.

| Family | Component (lines) | Signature | Coupling | Rating |
|---|---|---|---|---|
| **Forum** | `GroupForumSection.tsx` (489) | `({ groupId }: { groupId: string })` — `:40` | Self-fetches perms via `fetchMyPermissions(groupId)` (`:17`); self-fetches data via `lib/forum/client` (`:4-15`); **realtime**: `useForumTenant`/`forumTopic` (`:18`) + `useCommChannel` (`:19`); module-level `peekForum` session cache (`:41`); own-ness needs `myGroupId` from the perms payload (`:60`, `:73-74`) | **reusable-with-props** — needs a perms-override prop and a realtime opt-out; no auth/session context, no route params |
| **Conversations** | `GroupConversationsSection.tsx` (208) | `({ groupId })` — `:23` | `useRouter()` at `:24` (navigates to `/messages/{id}`); self-fetches perms (`:48`) and data (`:35`) | **reusable-with-props** — the `useRouter` push targets a member-plane messages route that has no admin equivalent |
| **Announcements** | `GroupAnnouncementsSection.tsx` (232) | `({ groupId })` — `:28` | Self-fetches perms (`:12`) and data (`:46`); `peekGroupAnnouncements` session cache (`:29`); `ConfirmModal` (`:13`) | **reusable-with-props** — cleanest of the three; no router, no realtime |
| **Members list** | Embedded in `GroupDetailPanel.tsx:588-620` | Not a component — inline JSX inside a 1051-line panel | Reads `group.members` from the `GroupDetail` payload; each row carries role chips, pause/reactivate/remove, role assign/remove — all gated on `permissions` and `fabric` props | **member-plane-coupled (needs extraction)** — *but see below* |
| **Journeys** | `GroupJourneysSection.tsx` (54) | `({ enrollments })` | Pure props; renders the envelope slice | **reusable-as-is** |
| **Journey progress** | `GroupJourneyProgressSection.tsx` (241) | `({ groupId, permissions, enrollments, skeletonDelay })` — `:26-35` | Fully props-driven; gate is `permissions?.includes('view_group_progress')` at `:37`; returns `null` if not held (`:41`); fetch-on-expand only | **reusable-with-props** — the only content component already accepting `permissions` as a prop |
| **Group detail / settings** | `GroupDetailPanel.tsx` (1051) | `({group, fabric, permissions, viewerMemberGroupId, onRefresh, onLeft})` — `:88-108` | Props-driven for permissions, but 1051 lines fusing settings-edit, member management, role chips, leave, rest/wake, nominate-steward, hand-over, close, delete | **member-plane-coupled** — reuse would drag the entire member ceremony set onto the admin plane |

**The members-list nuance that changes the arithmetic:** the member-plane members list is coupled, but the admin plane does not need it. `admin_get_group_detail` already returns `members[]` (`lib/admin/groups.ts:42`), and `AdminMembersList.tsx` (487 lines) + `AdminMemberDetail.tsx` (491) already demonstrate the admin-plane rendering idiom for people. A members section on `/admin/groups/[id]` is a fresh ~40-line render over data already in hand — not an extraction.

**Session caches are a real hazard for option (a).** `peekForum` (`GroupForumSection.tsx:41`) and `peekGroupAnnouncements` (`GroupAnnouncementsSection.tsx:29`) seed state from a module-level cache. The admin plane has an explicit contrary rule — *"admin reads are never session-cached (the H034 rule)"*, stated at `AdminGroupsList.tsx:9-10` and `AdminMembersList.tsx:16-17`. Reusing these sections as-is on an admin surface would violate it.

### 5. Constraints and patterns a new admin surface must honour

1. **No route registration exists.** No middleware, no `app/admin/layout.tsx`. The guard is the four-step RPC→wrapper→BFF→component chain of §3.2. New surface = new `is_platform_admin`-gated RPC + wrapper in `lib/admin/*` + BFF collapsing `refused||notFound` to 404 + component rendering the 404 body.

2. **Route-policy conformance gate** — `tests/unit/app/api/route-policy-conformance.test.ts` walks **every** file under `app/api` (`:28`, `:50-75`) and asserts (`:14-25`): no `runtime` export, no `preferredRegion` export (`:86-93`) — region pins live in `hub/vercel.json` alone; every mutating verb calls `getUser()` (`:95`), unless in `PRE_AUTH_MUTATIONS` (`:32-34`); every GET reads identity locally via `getClaims()`/`getVerifiedUserId()` (`:23-25`), unless in `SERVER_VERIFIED_GETS` (`:35-37`). `app/api/admin/groups/[id]/route.ts:13` complies with `getVerifiedUserId`. Adding an exception requires justification in the spec's Implementation notes.

3. **Outer-ring conformance gate** — `tests/unit/app/outer-ring-conformance.test.ts` + `tests/helpers/outer-ring.ts`. No `supabase.from(...)` or `supabase.rpc(...)` in browser-reachable code (`'use client'`, anything under `components/`, `lib/**/client.ts`, `lib/**/*-client.ts`) — `:41-47`. `Database → API route → Frontend component`, never direct (`:16-20`). `lib/admin/*.ts` are **server-side only, client injected, never constructed** — `lib/admin/groups.ts:5-6` ("'import type' discipline").

4. **jest-axe on every admin component.** All 10 existing admin components have an axe-asserting unit suite (`tests/unit/components/admin/*.test.tsx`, each doing `expect.extend(toHaveNoViolations)` — e.g. `admin-group-detail.test.tsx:4,7`). Plus the primitive gate `tests/unit/components/ui/axe-gate.test.tsx:29-83`. A token gate lives at `tests/unit/platform/token-gate.test.ts`.

5. **Named landmark sections.** Every admin section carries `aria-label` — `"Counts"` (`:180`), `"Stewards"` (`:191`), `"Actions"` (`:209`), `"Reassign stewardship"` (`:259`); list filters use `role="tablist"` + `aria-label="Group filters"` + `aria-selected` (`AdminGroupsList.tsx:86-92`).

6. **Confirmation ceremonies echo the identifier.** Every `ConfirmModal` message interpolates the group name in quotes and states the consequence before the click — `AdminGroupDetail.tsx:296, :308, :320, :332, :344`. E2E asserts it: `tests/e2e/group-availability.spec.ts:210` (`toContainText(groupName)`). `ConfirmModal` takes `{isOpen,title,message,confirmText,variant,busy,onConfirm,onCancel}`; `variant: 'danger'` for suspend/reassign, `'warning'` for rest/wake/reactivate.

7. **As-of + Refresh** — present on `AdminMembersList.tsx:234-248` (`data-testid="as-of"` at `:235`, rendering `view.page.generated_at`, described at `:12-13` as *"the payload's server clock, never a client stamp"*), and on `AdminDashboard.tsx` / `AdminRolesView.tsx`. **Not present on `AdminGroupDetail` or `AdminGroupsList`** — it is a list/dashboard convention, not universal, and adopting it requires the payload to carry a server-generated timestamp.

8. **Fresh per mount, never session-cached** — `AdminGroupsList.tsx:9-10`, `AdminMembersList.tsx:16-17` ("the H034 rule").

9. **Honest repaint** — mutate, then re-read; never optimistic. `AdminGroupDetail.tsx:87`; docblock `:13-14`.

10. **State honesty** — "the surface never offers what the contract will refuse" (`AdminGroupDetail.tsx:10-12`), reiterated in the test docblock `admin-group-detail.test.tsx:15-19`.

11. **Durable telemetry on admin reads.** `app/api/admin/groups/[id]/route.ts:25` calls `emitDurableTelemetry(supabase, 'admin.group_detail_read', {actor, group})` on success — distinct from the fire-and-forget `emitTelemetry` used on failure paths. A new admin content read should expect the same durable-audit treatment. Member-plane telemetry is explicitly content-free: *"Telemetry carries actor + group id only — never group content"* (`app/api/groups/[id]/route.ts:17`).

12. **H031 renderer pattern — checked, and it is NOT relevant here.** The `H031` marks in the tree are the **notification action-renderer** pattern — payload-driven action buttons inside notification items. It has no bearing on a group content view.

### 6. Decomposition-shaping facts (Hub walk)

**F1 — CONTRADICTS THE KNOWN BACKGROUND (partially). The member-plane page already has a documented, implemented admin arm at the payload layer.** `app/groups/[id]/page.tsx:254-255` states: *"Payload-driven: an admin's FULL payload for a suspended group takes the normal branch below."* The same claim is repeated at `lib/groups/queries.ts:102-104`. The union, the discriminant (`viewer?: undefined`, `:112`), and the guard (`lib/groups/client.ts:46-48`) all exist and are shipped. **If the platform half makes `get_group_detail` return the full payload to a platform admin, option (a)'s content half costs ZERO surface lines** — the normal branch renders automatically.

*Reconciling with the stated background:* the "honest 404" for a **non-member** admin is still accurate, and it comes from a **different** law than the suspended shell. The 404 is the visibility gate (`P0002` → `app/api/groups/[id]/route.ts:54-56`), which fires on non-membership before suspension is ever considered. The shell (`:250`) is what a **member** of a suspended group sees. So there are two platform arms to add, not one: a visibility arm (admin sees a group they are not in) and a payload arm (admin gets full detail, not the shell). The surface already handles the second; only the second is free.

**F2 — [REFUTED — see the lead-session correction at §2.2.** The claim was: the permission set cannot carry "is admin"; a non-member admin gets `[]`; option (a) requires synthesising admin keys or threading an orthogonal prop through the three self-fetching sections. In fact `get_user_permissions` returns admins the full catalogue for any context group, so affordances render automatically; what option (a) actually lacks is honest *labelling* of admin acts, not the affordances themselves.**]**

**F3 — Every content section is `({ groupId })`-shaped and self-sufficient.** `GroupForumSection.tsx:40`, `GroupConversationsSection.tsx:23`, `GroupAnnouncementsSection.tsx:28`. None takes auth context, none takes route params, none reads `useAuth()`. Dropping all three onto a new `/admin/groups/[id]` page is mechanically trivial — the *rendering* is nearly free for option (b). What is not free: their data fetches go to the **member-plane BFF routes** (`/api/groups/{id}/forum`, `/announcements`, `/conversations`), whose contracts (`get_group_forum`, `get_group_announcements`, `get_group_conversations`) carry their own membership gates. Option (b) needs either admin arms on those contracts or new `admin_get_group_*` contracts.

**F4 — The admin members list is already paid for.** `admin_get_group_detail` returns `members[]` with `{personal_group_id, display_name, is_steward}` (`lib/admin/groups.ts:23-27, :42`), already fetched by `AdminGroupDetail` and used only for the reassign picker (`:142`). A members section on the admin plane is a render over data in hand — no platform work, no extraction. Of the five content families, this one is strictly cheaper on route (b).

**F5 — The admin entry point for suspended groups already exists.** `AdminGroupsList.tsx:19` ships a `suspended` filter tab; `:162-167` links straight to `/admin/groups/[id]`; the detail page already loads and renders suspended groups (`AdminGroupDetail.tsx:140` gates Reactivate on `status === 'suspended'`). Option (b) adds sections to a page an admin already reaches for exactly this purpose. Option (a) sends the admin to a URL they currently cannot open at all.

**F6 — The admin plane and the member plane have divergent, explicitly-stated caching and shell conventions.** Admin: no `AppShell`, own `<main>` (`AdminGroupDetail.tsx:146`), never session-cached (`AdminGroupsList.tsx:9-10`), 404-body on refusal (`:93-100`), durable telemetry on read (`app/api/admin/groups/[id]/route.ts:25`). Member: `AppShell` wrapper (`app/groups/[id]/page.tsx:242`), module-level session caches (`peekForum` `:41`, `peekGroupAnnouncements` `:29`), `EmptyState` on 404 (`:246`). Reusing member sections on the admin plane (b) requires suppressing the session caches; putting admin affordances on the member plane (a) requires importing the admin refusal/telemetry posture into a page built on the opposite convention.

**F7 — Option (a) edits a composition root that is already at its complexity ceiling.** `app/groups/[id]/page.tsx` is 335 lines holding 8 useState clusters, 6 load callbacks, and one shared `loadAll` refresh path (`:212-217`) documented as *"The one refresh path (FEAT-H014 STORY-4): every mutation re-reads all reads together"*. `GroupDetailPanel.tsx` beneath it is 1051 lines. Adding an admin branch means every one of those reads needs an admin-vs-member answer, and the `loadAll` invariant has to hold across both.

**F8 — The 404 and the suspended-shell are the only two "invisible" shapes, and neither is decided in the Hub.** `app/api/groups/[id]/route.ts:13-16` is explicit that the contract decides everything and the route is presentation only; ADR-U038 is cited at `lib/admin/groups.ts:8` as *"the route never re-decides"*. Whichever option is chosen, **the visibility change must land platform-side** — there is no Hub-local place to grant an admin sight of a suspended group without violating a stated architectural law.

### Explicitly checked and NOT found (Hub walk)

- **No `hooks/` directory** anywhere in `hub/`.
- **No `middleware.ts`** at `hub/middleware.ts` or `hub/app/middleware.ts` — admin routing has no edge/middleware guard.
- **No `app/admin/layout.tsx`** — no shared admin shell, no layout-level admin gate.
- **No per-content member-plane routes** — only `app/groups/[id]/page.tsx`.
- **No permissions context/provider** — `lib/auth/AuthContext.tsx` carries `{user, identity, loading}` only.
- **No SWR / React Query anywhere** — every fetch is hand-rolled `useCallback` + `useState` + `useEffect`.
- **No existing test** covering a non-member platform admin opening `/groups/[id]` for a suspended group. `tests/e2e/group-availability.spec.ts:214-229` covers only the member and the `rest_group`-holding steward; the admin in that spec acts solely through `/admin/groups/[id]` (`:206`).

---

## Lead-session verification record (2026-08-04)

Spot-verified against canonical before synthesis, per the delegated-fact discipline:

1. `get_group_detail` visibility gate + payload arm — **CONFIRMED** at PC023:3998-4004 / :4007-4010 (read directly).
2. `is_conversation_participant` conjunct order — **CONFIRMED** at PC023:4156-4179 (read directly; admin arm inside the second conjunct, participation required by the first).
3. `auto_grant_permission_to_deusex` — **CONFIRMED** at `20260222000000:837-860` (grants every new permission to the DeusEx role).
4. `fetchMyPermissions` → `get_user_permissions` wiring — **CONFIRMED** at `hub/lib/groups/queries.ts:415-432`; **and the RPC body at `20260222000000:481-503` REFUTES the Hub walk's empty-array claim** (system tier context-free at `:502`) — see the marked correction in Hub §2.2/F2.
