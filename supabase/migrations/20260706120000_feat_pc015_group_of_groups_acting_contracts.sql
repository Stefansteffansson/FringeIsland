-- ============================================================================
-- FEAT-PC015 (Groups Cycle G-F): group-of-groups membership & acting
-- contracts — MEM-10 depth-1, governed end-to-end by ADR-U041
-- ============================================================================
-- ADR-U041's five clauses realized:
--   §1 representation is a permission — the `act_as_group` catalog key,
--      Steward-template-seeded, per-group widenable; wielding checks are the
--      two-step walk INSIDE each contract (no generic sudo surface).
--   §2 substitution + group attribution + audit-level human trace
--      (status_changed_by_group_id, Open Q4) + outward-only + NO CHAINING —
--      the wielding actor is always a personal group; acting contexts are
--      DIRECT empowerments (own role in the group carries the key), never
--      Tier-1 admin reach and never a hop through another group.
--   §3 depth-1 only — every membership walk below is a single join; the
--      depth>1 question stays OQ-6 (Hub SPECIFICATION §L3), untouched.
--   §4 system groups are un-nominatable — nominate_steward REPLACED IN PLACE,
--      eligibility hardened to persons (group_type='personal', Open Q3 —
--      subsumes the ADR's system-exclusion minimum). Closes the live hole
--      demonstrated red 2026-07-06: a post-fallback DeusEx passed eligibility.
--   §5 system members visible but never people — get_group_detail REPLACED IN
--      PLACE with additive member_group_type (raw open-set column, Open Q5)
--      and non_system_member_count.
-- Posture: contracts-over-proven-substrate. NO new table, NO trigger changes,
-- NO policy changes (memberships_insert_invite stays defense-in-depth, the
-- PC012 residue posture). One additive column (Open Q4). The invited→active
-- auto-role trigger and the membership notification triggers fire unchanged
-- for group members (substrate audit 2026-07-06; legacy oracle B-D15-002/003).

-- ----------------------------------------------------------------------------
-- 1. The wielding key (ADR-U041 §1): catalog + Steward template + instance
--    backfill. Template changes do NOT propagate to existing instances
--    (three-layer model) — the backfill reaches every template-derived
--    Steward instance already materialised. All three idempotent.
-- ----------------------------------------------------------------------------
insert into public.permissions (name, description, category)
values ('act_as_group',
        'Act as this group where it is a member of another group (ADR-U041 representation)',
        'group_management')
on conflict do nothing;

insert into public.role_template_permissions (role_template_id, permission_id)
select rt.id, p.id
  from public.role_templates rt, public.permissions p
 where rt.name = 'Steward Role Template' and p.name = 'act_as_group'
on conflict do nothing;

insert into public.group_role_permissions (group_role_id, permission_id)
select gr.id, p.id
  from public.group_roles gr
  join public.role_templates rt on rt.id = gr.created_from_role_template_id
  cross join public.permissions p
 where rt.name = 'Steward Role Template' and p.name = 'act_as_group'
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 2. Audit trace (ADR-U041 §2b, Open Q4): the personal group whose hand made
--    the last status transition. Nullable, additive; ON DELETE SET NULL rides
--    the erasure cascade. Written by the wielded transitions below; available
--    to PC013's transitions later.
-- ----------------------------------------------------------------------------
alter table public.group_memberships
  add column if not exists status_changed_by_group_id uuid
    references public.groups(id) on delete set null;

comment on column public.group_memberships.status_changed_by_group_id is
  'ADR-U041 §2b audit trace: the personal group that performed the last status transition (never surfaced as authorship). FEAT-PC015 Open Q4.';

-- ----------------------------------------------------------------------------
-- 3. invite_group — a member with invite_members in the context group invites
--    an engagement group (admission mirrored on the PC012 invited→active path)
-- ----------------------------------------------------------------------------
create or replace function public.invite_group(
  p_group_id uuid,
  p_invited_group_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_target public.groups%rowtype;
  v_is_member boolean := false;
  v_membership_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'inviting a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v_actor, p_group_id, 'invite_members') then
    raise exception 'you do not have permission to invite members'
      using errcode = '42501';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot invite into a group that is not active' using errcode = 'P0001';
  end if;

  if p_invited_group_id = p_group_id then
    raise exception 'a group cannot join itself' using errcode = '22023';
  end if;

  -- Target: PUBLIC ACTIVE ENGAGEMENT groups only (v1 tight — private targets
  -- are P0002-indistinguishable from personal/system/absent; no enumeration).
  select * into v_target
    from public.groups g
   where g.id = p_invited_group_id
     and g.group_type = 'engagement'
     and g.status = 'active'
     and g.is_public;
  if v_target.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.group_memberships gm
     where gm.group_id = p_group_id and gm.member_group_id = p_invited_group_id
  ) then
    raise exception 'that group is already a member or already invited'
      using errcode = '22023';
  end if;

  -- Direct-cycle refusal (Open Q2): if the context group is itself a member
  -- (or invitee) of the target, admitting the target would close a loop the
  -- depth-1 model never resolves. Cheap one-hop check; no deeper machinery.
  if exists (
    select 1 from public.group_memberships gm
     where gm.group_id = p_invited_group_id
       and gm.member_group_id = p_group_id
       and gm.status in ('active', 'invited')
  ) then
    raise exception 'this group already belongs to the invited group — a membership cycle is not allowed'
      using errcode = '22023';
  end if;

  insert into public.group_memberships
    (group_id, member_group_id, status, added_by_group_id, status_changed_by_group_id)
  values
    (p_group_id, p_invited_group_id, 'invited', v_actor, v_actor)
  returning id into v_membership_id;

  return jsonb_build_object('membership_id', v_membership_id);
end;
$$;

comment on function public.invite_group(uuid, uuid) is
  'FEAT-PC015 MEM-10 (ADR-U041): invite an engagement group as a member — invite_members-gated in the context group; public active engagement targets only (else P0002 no-leak); self/duplicate/direct-cycle refused 22023 (Open Q2). Creates the invited row so the existing notification + invited→active auto-role triggers fire unchanged. SECURITY DEFINER: writes a membership row for another principal across RLS.';

-- ----------------------------------------------------------------------------
-- 4. search_invitable_groups — the D3 precedent for groups (DS-6 re-home seam)
-- ----------------------------------------------------------------------------
create or replace function public.search_invitable_groups(
  p_group_id uuid,
  p_query text
) returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'searching groups is FIM-only' using errcode = '42501';
  end if;
  if not public.has_permission(v_actor, p_group_id, 'invite_members') then
    raise exception 'you do not have permission to invite members'
      using errcode = '42501';
  end if;
  if p_query is null or length(btrim(p_query)) = 0 then
    raise exception 'a search query is required' using errcode = '22023';
  end if;

  return query
  select g.id, g.name
    from public.groups g
   where g.group_type = 'engagement'
     and g.status = 'active'
     and g.is_public
     and g.id <> p_group_id
     and g.name ilike '%' || btrim(p_query) || '%'
     and not exists (
       select 1 from public.group_memberships gm
        where gm.group_id = p_group_id and gm.member_group_id = g.id)
     and not exists (
       select 1 from public.group_memberships gm2
        where gm2.group_id = g.id and gm2.member_group_id = p_group_id
          and gm2.status in ('active', 'invited'))
   order by g.name
   limit 8;
end;
$$;

comment on function public.search_invitable_groups(uuid, text) is
  'FEAT-PC015 (D3 precedent, DS-6 re-home seam): public active engagement groups matching ilike, cap 8, excluding the context group, existing members/invitees, and direct-cycle candidates. invite_members-gated. SECURITY DEFINER: reads membership rows for the exclusion predicates across RLS.';

-- ----------------------------------------------------------------------------
-- 5. respond_to_group_invitation — the wielded answer (ADR-U041 §2). Accept
--    flips invited→active via UPDATE so the existing auto-role trigger binds
--    the context group''s Member instance; decline deletes (its trace is the
--    row''s absence + the existing notification, matching PC012 decline).
-- ----------------------------------------------------------------------------
create or replace function public.respond_to_group_invitation(
  p_membership_id uuid,
  p_accept boolean
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_gm public.group_memberships%rowtype;
  v_member_type text;
  v_context_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'answering for a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select gm.* into v_gm
    from public.group_memberships gm
   where gm.id = p_membership_id and gm.status = 'invited';
  if v_gm.id is null then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  select g.group_type into v_member_type
    from public.groups g where g.id = v_gm.member_group_id;
  -- Personal invitations answer through accept/decline_group_invitation —
  -- this contract wields GROUP invitations only (P0002: not yours to see).
  if v_member_type is distinct from 'engagement' then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  -- The ADR-U041 §1 wielding gate: the caller''s OWN standing in the invited
  -- group must carry the key. B''s Steward holds nothing here (42501).
  if not public.has_permission(v_actor, v_gm.member_group_id, 'act_as_group') then
    raise exception 'you do not have permission to act as this group'
      using errcode = '42501';
  end if;

  if p_accept then
    select g.status into v_context_status
      from public.groups g where g.id = v_gm.group_id;
    if v_context_status is distinct from 'active' then
      raise exception 'cannot join a group that is not active' using errcode = 'P0001';
    end if;
    update public.group_memberships
       set status = 'active',
           status_changed_at = now(),
           status_changed_by_group_id = v_actor
     where id = p_membership_id;
    return jsonb_build_object('membership_id', p_membership_id, 'status', 'active');
  else
    delete from public.group_memberships where id = p_membership_id;
    return jsonb_build_object('membership_id', p_membership_id, 'status', 'declined');
  end if;
end;
$$;

comment on function public.respond_to_group_invitation(uuid, boolean) is
  'FEAT-PC015 MEM-10 (ADR-U041 §1-2): accept/decline a GROUP invitation while wielding the invited group — act_as_group-gated in the INVITED group (the caller''s own standing; no chaining). Accept = invited→active UPDATE (auto-role trigger binds the Member instance; audit trace recorded, Open Q4); decline = delete (PC012 shape). SECURITY DEFINER: transitions another principal''s membership across RLS.';

-- ----------------------------------------------------------------------------
-- 6. leave_group_as_group — the wielded voluntary exit (mirrors the PC013
--    leave cascade: freeze the acting group''s enrolments in the context
--    group''s non-public journeys, delete its role rows, delete membership)
-- ----------------------------------------------------------------------------
create or replace function public.leave_group_as_group(
  p_group_id uuid,
  p_acting_group_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_membership_id uuid;
  v_remaining integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'acting for a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Wielding precedes existence: a keyless caller learns nothing (42501
  -- whether or not the membership exists — the S5 adversarial posture).
  if not public.has_permission(v_actor, p_acting_group_id, 'act_as_group') then
    raise exception 'you do not have permission to act as this group'
      using errcode = '42501';
  end if;

  select gm.id into v_membership_id
    from public.group_memberships gm
    join public.groups g on g.id = gm.member_group_id and g.group_type = 'engagement'
   where gm.group_id = p_group_id
     and gm.member_group_id = p_acting_group_id
     and gm.status = 'active';
  if v_membership_id is null then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;

  -- Last-active-Steward guard (PC013/PC014 semantics): if the acting group
  -- holds the context group''s only active Steward role, exit is refused
  -- honestly — transfer first.
  if exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = p_acting_group_id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) and public.active_steward_count(p_group_id, p_acting_group_id) = 0 then
    raise exception 'this group is the last active Steward — transfer stewardship first'
      using errcode = 'P0001';
  end if;

  -- Last-member guard: an exit that empties the group is Close''s business
  -- (MEM-8), and Close is a member-facing act — refused honestly here.
  select count(*) into v_remaining
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.status = 'active'
     and gm.member_group_id <> p_acting_group_id;
  if v_remaining = 0 then
    raise exception 'the last member cannot leave — close the group instead'
      using errcode = 'P0001';
  end if;

  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'left_group',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and je.group_id = p_acting_group_id
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status <> 'frozen';

  delete from public.user_group_roles ugr
   where ugr.group_id = p_group_id and ugr.member_group_id = p_acting_group_id;

  delete from public.group_memberships gm
   where gm.id = v_membership_id;

  return jsonb_build_object('group_id', p_group_id, 'acting_group_id', p_acting_group_id);
end;
$$;

comment on function public.leave_group_as_group(uuid, uuid) is
  'FEAT-PC015 MEM-10 (ADR-U041 §2): the wielded voluntary exit — act_as_group-gated (wielding precedes existence; keyless callers learn nothing), last-active-Steward and last-member refused honestly, then the PC013 leave cascade for the acting group (freeze non-public enrolments, roles, membership; the existing delete trigger notifies). SECURITY DEFINER: composed cascade across RLS.';

-- ----------------------------------------------------------------------------
-- 7. get_acting_contexts — the selector''s data source. DIRECT empowerments
--    only (ADR-U041 §2d): the caller''s own role IN the group carries the key.
--    Deliberately NOT has_permission(): Tier-1 admin reach must not surface
--    every group in the act-as selector, and chaining must not exist.
-- ----------------------------------------------------------------------------
create or replace function public.get_acting_contexts()
returns table (group_id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'acting contexts are FIM-only' using errcode = '42501';
  end if;

  return query
  select distinct g.id, g.name
    from public.group_memberships gm
    join public.groups g
      on g.id = gm.group_id and g.group_type = 'engagement' and g.status = 'active'
    join public.user_group_roles ugr
      on ugr.group_id = g.id and ugr.member_group_id = v_actor
    join public.group_role_permissions grp on grp.group_role_id = ugr.group_role_id
    join public.permissions p on p.id = grp.permission_id
   where gm.member_group_id = v_actor
     and gm.status = 'active'
     and p.name = 'act_as_group'
   order by g.name;
end;
$$;

comment on function public.get_acting_contexts() is
  'FEAT-PC015 (ADR-U041 §1, §2d): engagement groups the caller may act as — direct empowerment only (own active membership + own role carrying act_as_group). Never Tier-1 admin reach, never a chained hop. Feeds the FEAT-H014/H018 act-as selector. SECURITY DEFINER: role-fabric walk across RLS.';

-- ----------------------------------------------------------------------------
-- 8. get_group_memberships_of — where a wielded group belongs (active +
--    invited), feeding the belongs-to panel and the pending answers
-- ----------------------------------------------------------------------------
create or replace function public.get_group_memberships_of(p_acting_group_id uuid)
returns table (membership_id uuid, group_id uuid, name text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group memberships are FIM-only' using errcode = '42501';
  end if;
  if not public.has_permission(v_actor, p_acting_group_id, 'act_as_group') then
    raise exception 'you do not have permission to act as this group'
      using errcode = '42501';
  end if;

  return query
  select gm.id, g.id, g.name, gm.status
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
   where gm.member_group_id = p_acting_group_id
     and gm.status in ('active', 'invited')
   order by gm.status, g.name;
end;
$$;

comment on function public.get_group_memberships_of(uuid) is
  'FEAT-PC015 (ADR-U041 §1): a wielded group''s memberships and pending invitations — act_as_group-gated; the wielder reads what the group knows (context names included). SECURITY DEFINER: cross-group membership read across RLS.';

-- ----------------------------------------------------------------------------
-- 9. nominate_steward REPLACED IN PLACE (ADR-U041 §4, Open Q3): eligibility
--    hardened to persons. Body identical to FEAT-PC014''s except the
--    persons-only clause inside the nominee loop.
-- ----------------------------------------------------------------------------
create or replace function public.nominate_steward(
  p_group_id uuid,
  p_nominee_ids uuid[]
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_is_steward boolean;
  v_nominee_id uuid;
  v_count integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'nominating a successor is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if not v_is_member then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot nominate in a group that is not active' using errcode = 'P0001';
  end if;

  -- Steward-ness: template linkage with the legacy short-name fallback (the
  -- house resolution — invariant plumbing, not a permission gate, ADR-U007)
  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = v_actor
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_is_steward;
  if not v_is_steward then
    raise exception 'only the group''s Steward can nominate successors'
      using errcode = 'P0001';
  end if;
  -- Sole-ness counts ACTIVE memberships (a paused co-Steward is NOT cover —
  -- the raw-role-count blind spot the legacy body carried)
  if public.active_steward_count(p_group_id, v_actor) > 0 then
    raise exception 'you are not the sole active Steward — regular leave applies'
      using errcode = 'P0001';
  end if;

  -- One nomination in flight per group (the sprint3 guard, kept)
  if exists (
    select 1 from public.notifications n
     where n.type = 'stewardship_nomination'
       and n.group_id = p_group_id
       and n.action_type = 'accept_decline'
       and n.action_taken is null
       and (n.expires_at is null or n.expires_at > now())
  ) then
    raise exception 'a stewardship nomination is already in progress for this group'
      using errcode = 'P0001';
  end if;

  -- Nominee validation — bad input is 22023, with the specific reason
  if p_nominee_ids is null or coalesce(array_length(p_nominee_ids, 1), 0) = 0 then
    raise exception 'at least one nominee is required' using errcode = '22023';
  end if;
  select count(distinct x) into v_count from unnest(p_nominee_ids) as x;
  if v_count <> array_length(p_nominee_ids, 1) then
    raise exception 'duplicate nominees are not allowed' using errcode = '22023';
  end if;
  foreach v_nominee_id in array p_nominee_ids loop
    if v_nominee_id = v_actor then
      raise exception 'cannot nominate yourself' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.group_memberships gm
       where gm.group_id = p_group_id
         and gm.member_group_id = v_nominee_id
         and gm.status = 'active'
    ) then
      raise exception 'nominee % is not an active member of this group', v_nominee_id
        using errcode = '22023';
    end if;
    -- ADR-U041 §4 (FEAT-PC015 Open Q3): stewardship succession lands on
    -- people. System groups are never nominatable — the designed last resort
    -- (ADR-U019) is not a pickable choice; engagement-group nominees are
    -- deferred until a real need. Typed column, never a name check.
    if not exists (
      select 1 from public.groups g
       where g.id = v_nominee_id and g.group_type = 'personal'
    ) then
      raise exception 'nominee % is not a person — stewardship succession lands on people', v_nominee_id
        using errcode = '22023';
    end if;
  end loop;

  -- The durable actionable offer to the FIRST nominee (sprint3 shape verbatim
  -- — H017's pending-nomination read consumes these columns). Nothing else
  -- mutates until the nominee responds.
  insert into public.notifications (
    recipient_group_id, type, title, body, payload, group_id,
    action_type, action_data, expires_at
  ) values (
    p_nominee_ids[1],
    'stewardship_nomination',
    'Stewardship Nomination',
    'You have been nominated as Steward of ' || v_group.name || '. Accept or decline within 7 days.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
    p_group_id,
    'accept_decline',
    jsonb_build_object(
      'group_id', p_group_id,
      'nominator_group_id', v_actor,
      'nominee_ids', to_jsonb(p_nominee_ids),
      'nominee_rank', 1,
      'total_nominees', array_length(p_nominee_ids, 1)
    ),
    now() + interval '7 days'
  );

  return jsonb_build_object(
    'group_id', p_group_id,
    'nominees_count', array_length(p_nominee_ids, 1)
  );
end;
$$;

comment on function public.nominate_steward(uuid, uuid[]) is
  'FEAT-PC014 MEM-7 + FEAT-PC015 (ADR-U041 §4, replaced in place): the sole ACTIVE Steward nominates ranked successors — eligibility now PERSONS ONLY (group_type=''personal''; system groups never nominatable, engagement-group nominees deferred — Open Q3). Durable stewardship_nomination row (7-day expires_at) to the first nominee; nothing mutates until response. Steward resolution template-first with the name=''Steward'' legacy fallback; sole-ness via active_steward_count. SECURITY DEFINER: reads role/membership rows and writes another member''s notification across RLS.';

-- ----------------------------------------------------------------------------
-- 10. get_group_detail REPLACED IN PLACE (ADR-U041 §5, Open Q5): additive
--     member_group_type (raw open-set column) + non_system_member_count.
--     All prior keys, visibility, and gating unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_joined_at timestamptz;
  v_can_manage boolean;
  v_can_view_members boolean;
  v_can_manage_members boolean;
  v_members jsonb;
  v_result jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group detail is FIM-only' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';

  select (gm.status = 'active'), gm.added_at into v_is_member, v_joined_at
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);

  -- Members see their group in any lifecycle state (GRP-5); non-members see
  -- public groups only while active (mirrors the RLS SELECT posture). Anything
  -- else is P0002 — private and absent are indistinguishable (no leak).
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  v_can_manage := coalesce(
    public.has_permission(v_actor, p_group_id, 'edit_group_settings'), false);
  -- FEAT-PC013 (Open Q3): paused rows render only for viewers holding a
  -- member-management key — membership state is FIM data (PC-3 Privacy note).
  v_can_manage_members :=
       coalesce(public.has_permission(v_actor, p_group_id, 'pause_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'activate_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'remove_members'), false);
  -- Management keys imply member-list visibility (you cannot manage what you
  -- cannot see) — surfaced by the minimal-permission pauser persona at build.
  v_can_view_members := coalesce(
      public.has_permission(v_actor, p_group_id, 'view_member_list'), false)
    or v_can_manage_members
    or (v_group.is_public and v_group.show_member_list and v_group.status = 'active');

  v_result := jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'status', v_group.status,
    'is_public', v_group.is_public,
    'show_member_list', v_group.show_member_list,
    'created_at', v_group.created_at,
    'member_count', (select count(*) from public.group_memberships gm2
                      where gm2.group_id = p_group_id and gm2.status = 'active'),
    -- FEAT-PC015 additive key (ADR-U041 §5): active members that are not
    -- system groups — the count affordances key on (Close for the last
    -- non-system member; the caretaker is never load-bearing in copy).
    'non_system_member_count', (select count(*)
                                  from public.group_memberships gm3
                                  join public.groups mg on mg.id = gm3.member_group_id
                                 where gm3.group_id = p_group_id
                                   and gm3.status = 'active'
                                   and mg.group_type <> 'system'),
    'viewer', jsonb_build_object(
      'is_member', v_is_member,
      'joined_at', v_joined_at,
      'can_manage_settings', v_can_manage)
  );

  if v_can_view_members then
    -- Display identity resolves from the member's (personal) group name —
    -- never full_name (B-DISP oracle). FEAT-PC011 additive keys:
    -- member_group_id + roles[]. FEAT-PC013 additive key: membership_status
    -- ('active' | 'paused'); paused rows appear only when v_can_manage_members.
    -- FEAT-PC015 additive key (ADR-U041 §5, Open Q5): member_group_type —
    -- the member group''s raw group_type (open set, no mapped enum).
    select coalesce(jsonb_agg(jsonb_build_object(
             'display_name', pg.name,
             'joined_at', gm.added_at,
             'member_group_id', gm.member_group_id,
             'membership_status', gm.status,
             'member_group_type', pg.group_type,
             'roles', coalesce(
               (select jsonb_agg(gr.name order by gr.name)
                  from public.user_group_roles ugr
                  join public.group_roles gr on gr.id = ugr.group_role_id
                 where ugr.group_id = p_group_id
                   and ugr.member_group_id = gm.member_group_id),
               '[]'::jsonb))
             order by gm.added_at), '[]'::jsonb)
      into v_members
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = p_group_id
       and (gm.status = 'active'
            or (gm.status = 'paused' and v_can_manage_members));
    v_result := v_result || jsonb_build_object('members', v_members);
  end if;

  return v_result;
end;
$$;

comment on function public.get_group_detail(uuid) is
  'FEAT-PC010 GRP-4/GRP-5 + FEAT-PC011 additive keys (member_group_id, roles[]) + FEAT-PC013 additive key (membership_status) + FEAT-PC015 additive keys (member_group_type raw, non_system_member_count — ADR-U041 §5, Open Q5). Visibility, member_count (active-only), and all prior keys unchanged.';

-- ----------------------------------------------------------------------------
-- 11. Grants — authenticated + service_role only; the Supabase default-
--     privileges hazard means explicit REVOKE first (anon holds nothing).
--     The two replacements keep their existing ACLs (CREATE OR REPLACE).
-- ----------------------------------------------------------------------------
revoke all on function public.invite_group(uuid, uuid) from public, anon;
revoke all on function public.search_invitable_groups(uuid, text) from public, anon;
revoke all on function public.respond_to_group_invitation(uuid, boolean) from public, anon;
revoke all on function public.leave_group_as_group(uuid, uuid) from public, anon;
revoke all on function public.get_acting_contexts() from public, anon;
revoke all on function public.get_group_memberships_of(uuid) from public, anon;

grant execute on function public.invite_group(uuid, uuid) to authenticated, service_role;
grant execute on function public.search_invitable_groups(uuid, text) to authenticated, service_role;
grant execute on function public.respond_to_group_invitation(uuid, boolean) to authenticated, service_role;
grant execute on function public.leave_group_as_group(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_acting_contexts() to authenticated, service_role;
grant execute on function public.get_group_memberships_of(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 12. Verification
-- ----------------------------------------------------------------------------
do $$
declare
  v_missing integer;
begin
  if not exists (select 1 from public.permissions where name = 'act_as_group') then
    raise exception 'FEAT-PC015: act_as_group missing from the catalog';
  end if;
  if not exists (
    select 1 from public.role_template_permissions rtp
      join public.role_templates rt on rt.id = rtp.role_template_id
      join public.permissions p on p.id = rtp.permission_id
     where rt.name = 'Steward Role Template' and p.name = 'act_as_group'
  ) then
    raise exception 'FEAT-PC015: Steward template missing act_as_group';
  end if;
  select count(*) into v_missing
    from public.group_roles gr
    join public.role_templates rt on rt.id = gr.created_from_role_template_id
   where rt.name = 'Steward Role Template'
     and not exists (
       select 1 from public.group_role_permissions grp
         join public.permissions p on p.id = grp.permission_id
        where grp.group_role_id = gr.id and p.name = 'act_as_group');
  if v_missing > 0 then
    raise exception 'FEAT-PC015: % Steward instances missed the act_as_group backfill', v_missing;
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'group_memberships'
       and column_name = 'status_changed_by_group_id'
  ) then
    raise exception 'FEAT-PC015: the audit-trace column is missing';
  end if;
  if has_function_privilege('anon', 'public.invite_group(uuid, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.search_invitable_groups(uuid, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.respond_to_group_invitation(uuid, boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.leave_group_as_group(uuid, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_acting_contexts()', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_group_memberships_of(uuid)', 'EXECUTE') then
    raise exception 'FEAT-PC015: anon holds EXECUTE on a G-F contract';
  end if;
  raise notice 'FEAT-PC015 verified: act_as_group seeded + backfilled; audit column live; 6 contracts granted to authenticated only; nominate_steward + get_group_detail replaced in place';
end $$;
