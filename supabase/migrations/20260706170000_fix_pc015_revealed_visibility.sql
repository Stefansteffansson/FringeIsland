-- ============================================================================
-- FEAT-PC015/H018 post-6-done fix (2026-07-06 live testing, finding 3):
-- revealed visibility on get_group_detail
-- ============================================================================
-- Finding (Stefan): after his group was admitted into another group, he had
-- no way to reach it — the wielder could answer for the group but never visit
-- where it belongs (private host → P0002), and an invited FIM had to answer
-- an invitation blind.
--
-- Principle: the no-leak rule protects UNREVEALED groups — private and absent
-- stay indistinguishable to strangers. But an invitation or an admission IS
-- the group revealing itself. Two viewer cases open the FACE of the group
-- (fields, counts, viewer flags — the member list keeps its existing rules
-- unchanged):
--   (1) the caller's own membership row is 'invited' (look before you
--       answer; active-status groups only — you cannot join a closed group);
--   (2) the caller WIELDS (act_as_group, direct empowerment — ADR-U041 §2d,
--       no chaining) a group that is an ACTIVE member here (substitution,
--       §2a: acting as A carries A's standing, and a member sees its group —
--       any lifecycle state, like any member).
-- 'paused' stays dark (the PC013 Open-Q3 posture is deliberate and oracled).
-- REPLACED IN PLACE (same signature/return); ACLs preserved.

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
  v_is_invited boolean := false;
  v_wields_member boolean := false;
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

  select (gm.status = 'active'), (gm.status = 'invited'), gm.added_at
    into v_is_member, v_is_invited, v_joined_at
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  v_is_invited := coalesce(v_is_invited, false);

  -- Revealed-visibility wielder case, checked only when the cheap doors
  -- refuse: does the caller wield an ACTIVE member-group of this group?
  if v_group.id is not null
     and not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    select exists (
      select 1
        from public.group_memberships host
        join public.group_memberships mine
          on mine.group_id = host.member_group_id
         and mine.member_group_id = v_actor
         and mine.status = 'active'
        join public.user_group_roles ugr
          on ugr.group_id = host.member_group_id
         and ugr.member_group_id = v_actor
        join public.group_role_permissions grp on grp.group_role_id = ugr.group_role_id
        join public.permissions p on p.id = grp.permission_id
       where host.group_id = p_group_id
         and host.status = 'active'
         and p.name = 'act_as_group'
    ) into v_wields_member;
  end if;

  -- Members see their group in any lifecycle state (GRP-5); non-members see
  -- public groups only while active; the revealed cases open the face —
  -- own-invited (active groups only) and wields-an-active-member (any state,
  -- a member's standing carried by substitution). Anything else is P0002 —
  -- private and absent stay indistinguishable (no leak).
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or (v_is_invited and v_group.status = 'active')
             or v_wields_member) then
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
  'FEAT-PC010 GRP-4/GRP-5 + FEAT-PC011 additive keys (member_group_id, roles[]) + FEAT-PC013 additive key (membership_status) + FEAT-PC015 additive keys (member_group_type, non_system_member_count — ADR-U041 §5) + revealed visibility (post-6-done 2026-07-06): own-invited viewers (active groups) and wielders of an active member-group see the FACE; member-list rules unchanged; paused stays dark (PC013 Open Q3). No-leak posture otherwise unchanged.';

-- Grant hardening rider: the verification below surfaced that
-- get_group_detail carried anon EXECUTE all along — one of the twelve
-- PC010–013 contracts the PC014 build-finding-4 documented as inert-but-
-- anon-executable (internally FIM-gated, so anon only ever got the 42501
-- body refusal). The standing pre-partition grant sweep is parked; touching
-- the function is the house trigger for hardening it in place. Revoked here
-- — the sweep's remainder shrinks by one.
revoke all on function public.get_group_detail(uuid) from public, anon;
grant execute on function public.get_group_detail(uuid) to authenticated, service_role;

do $$
begin
  if has_function_privilege('anon', 'public.get_group_detail(uuid)', 'EXECUTE') then
    raise exception 'fix-visibility: anon holds EXECUTE on get_group_detail';
  end if;
  raise notice 'fix-visibility verified: revealed-visibility get_group_detail live; anon EXECUTE revoked (PC010-era residue)';
end $$;
