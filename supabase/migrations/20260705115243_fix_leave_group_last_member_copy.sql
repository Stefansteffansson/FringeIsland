-- fix_leave_group_last_member_copy — FEAT-PC013 post-6-done copy fix
-- ----------------------------------------------------------------------------
-- The last-member leave refusal shipped at G-D saying "closing a group is not
-- yet available". FEAT-PC014 (20260705072252) shipped close_group, so that
-- copy is now false: the Surface renders refusal messages verbatim (the H016
-- pass-through contract) and the H017 group page shows the working Close
-- affordance right beside the stale sentence. Copy-only change — the function
-- body is the 20260704192549 (PC013) body verbatim except the one message,
-- which now mirrors hand_stewardship_to_deusex's last-member refusal shape.
-- No behavioural change: same errcode (P0001), same guards, same cascade.
-- Grant hygiene re-asserted explicitly (Supabase default privileges grant new
-- functions to anon DIRECTLY — every revoke names anon, not just PUBLIC;
-- create-or-replace preserves ACLs, but the posture is asserted, not assumed).

create or replace function public.leave_group(p_group_id uuid)
returns jsonb
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
  v_active_members integer;
  v_is_steward boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'leaving a group is FIM-only' using errcode = '42501';
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
    -- reachable only for visible (public+active) groups: the caller can see
    -- the group but holds no active membership to leave
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot leave a group that is not active' using errcode = 'P0001';
  end if;

  -- The two G-E exits, refused honestly (nothing mutates):
  select count(*) into v_active_members
    from public.group_memberships
   where group_id = p_group_id and status = 'active';
  if v_active_members = 1 then
    -- Copy updated post-PC014: close_group exists — point at it.
    raise exception 'cannot leave: you are the group''s last member — close the group instead'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = v_actor
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_is_steward;
  if v_is_steward and public.active_steward_count(p_group_id, v_actor) = 0 then
    raise exception 'cannot leave: you are the only active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- The regular exit, in the proven order (the sprint2 shape verbatim):
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'left_group',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and je.group_id = v_actor
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status = 'active';

  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = v_actor;

  -- the existing notify trigger writes member_left to the Stewards
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;

  -- DS-5 former-member attribution: pending-DS-5, NOT built (D2) — the exit
  -- writes no authorship attribution; MEM-9's forward-seam (Communication gate).
  return jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name);
end;
$$;

-- Grant hygiene: assert the posture, never assume it survived the replace.
revoke all on function public.leave_group(uuid) from public;
revoke all on function public.leave_group(uuid) from anon;
grant execute on function public.leave_group(uuid) to authenticated, service_role;
