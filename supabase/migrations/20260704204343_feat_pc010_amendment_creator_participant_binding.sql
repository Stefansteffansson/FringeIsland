-- ============================================================================
-- FEAT-PC010 Amendment (Stefan's decision, 2026-07-04): creating a group
-- means stewarding it AND taking part in it — the creator is bound to the
-- participation role alongside the management role.
-- ============================================================================
-- Before: create_engagement_group() bound the creator to the Steward role
-- only (permission-derived via 'assign_roles'). The creator was always a
-- MEMBER (active membership row) but held no participation bundle — the
-- practical gap was enroll_self_in_journey (the rest of the participation
-- surface rides the Steward template or the platform baseline).
--
-- After: the creator is additionally bound to the participation role —
-- permission-derived via 'enroll_self_in_journey' (unique to the
-- Member/Participant template today), never a role-name string (ADR-U007).
-- SOFT: a group template whose role set carries no participation role skips
-- the binding (a facilitation-only template stays legitimate); the management
-- binding stays MANDATORY (unchanged). The binding is removable afterwards —
-- the facilitator-only Steward remains one chip-click away.
--
-- Replacement-in-place of the FEAT-PC010 contract body; no signature change,
-- no new table, no policy changes, no trigger changes.
-- ============================================================================

create or replace function public.create_engagement_group(
  p_name text,
  p_description text default null::text,
  p_label text default null::text,
  p_is_public boolean default false,
  p_show_member_list boolean default true,
  p_group_template_id uuid default null::uuid
) returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group_id uuid;
  v_steward_role_id uuid;
  v_participant_role_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u
   where u.auth_user_id = (select auth.uid());

  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group creation is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'group name required' using errcode = '22023';
  end if;
  if p_group_template_id is not null and not exists (
    select 1 from public.group_templates gt where gt.id = p_group_template_id
  ) then
    raise exception 'unknown group template' using errcode = 'P0002';
  end if;

  insert into public.groups
    (name, description, label, group_type, is_public, show_member_list,
     created_by_group_id, created_from_group_template_id)
  values
    (btrim(p_name), p_description, p_label, 'engagement', p_is_public,
     p_show_member_list, v_actor, p_group_template_id)
  returning id into v_group_id;

  -- Role instances: the chosen template's role set, or — when none is chosen —
  -- every role template any group template carries (the four foundational
  -- templates today). Data-driven; the copy_template_permissions trigger
  -- copies each instance's permission grants.
  insert into public.group_roles (group_id, name, description, created_from_role_template_id)
  select v_group_id, rt.name, rt.description, rt.id
    from public.role_templates rt
   where rt.id in (
     select gtr.role_template_id
       from public.group_template_roles gtr
      where gtr.group_template_id = coalesce(p_group_template_id, gtr.group_template_id)
   );

  -- Creator's active membership (before the role binding — the junction's
  -- validation expects the role's group to exist and match).
  insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
  values (v_group_id, v_actor, 'active', v_actor);

  -- Bind the creator to the management role: permission-derived (the
  -- instantiated role whose template grants 'assign_roles' — unique to the
  -- Steward template today), never a role-name string.
  select gr.id into v_steward_role_id
    from public.group_roles gr
    join public.role_template_permissions rtp
      on rtp.role_template_id = gr.created_from_role_template_id
     and rtp.granted
    join public.permissions p on p.id = rtp.permission_id
   where gr.group_id = v_group_id
     and p.name = 'assign_roles'
   limit 1;

  if v_steward_role_id is null then
    raise exception 'instantiated role set carries no management role' using errcode = '22023';
  end if;

  insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (v_actor, v_group_id, v_steward_role_id, v_actor);

  -- FEAT-PC010 Amendment (2026-07-04): also bind the participation role —
  -- permission-derived via 'enroll_self_in_journey' (the Member/Participant
  -- template's marker today). SOFT: skipped when the instantiated role set
  -- carries none (facilitation-only templates stay legitimate); removable
  -- afterwards like any binding.
  select gr.id into v_participant_role_id
    from public.group_roles gr
    join public.role_template_permissions rtp
      on rtp.role_template_id = gr.created_from_role_template_id
     and rtp.granted
    join public.permissions p on p.id = rtp.permission_id
   where gr.group_id = v_group_id
     and p.name = 'enroll_self_in_journey'
     and gr.id is distinct from v_steward_role_id
   limit 1;

  if v_participant_role_id is not null then
    insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
    values (v_actor, v_group_id, v_participant_role_id, v_actor);
  end if;

  return v_group_id;
end;
$$;

comment on function public.create_engagement_group(text, text, text, boolean, boolean, uuid) is
  'FEAT-PC010 GRP-1 (+2026-07-04 amendment): atomic engagement-group bootstrap — group + role instances + creator active membership + permission-derived MANAGEMENT binding (assign_roles marker, mandatory) + permission-derived PARTICIPATION binding (enroll_self_in_journey marker, soft-skipped when the role set carries none). Creating a group means stewarding it and taking part in it; either binding is removable afterwards. No role-name strings (ADR-U007).';
