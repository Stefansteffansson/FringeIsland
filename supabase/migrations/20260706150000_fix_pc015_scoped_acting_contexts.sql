-- ============================================================================
-- FEAT-PC015 post-6-done fix (2026-07-06 live testing): the acting-contexts
-- read becomes context-scopable
-- ============================================================================
-- Finding (Stefan, first manual walk): the act-as selector offered hats with
-- no standing — every wieldable group, on every group page, including the
-- current group itself (acting-as-itself is meaningless — ADR-U041 §2c
-- outward-only), and groups with no membership in the page's group (whose
-- empty grant set the panel then dressed in false "can view" copy).
--
-- Fix: `get_acting_contexts` gains `p_context_group_id` (default null) and an
-- `is_member_of_context` flag — when a context is named, each wieldable group
-- is flagged for ACTIVE membership in it. The Surface offers only flagged
-- contexts (and never the current group — a group is never a member of
-- itself, so the flag enforces that too); the unflagged full list still
-- serves the wielder-gate for the memberships panel. Direct-empowerment
-- semantics unchanged (§2d — never Tier-1 reach, never a chained hop).
--
-- DROP + CREATE (not CREATE OR REPLACE): the return shape gains a column and
-- the signature gains a parameter — a same-name overload would leave the old
-- zero-arg function alive beside it. ACLs re-stated after the drop.

drop function if exists public.get_acting_contexts();

create function public.get_acting_contexts(p_context_group_id uuid default null)
returns table (group_id uuid, name text, is_member_of_context boolean)
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
  select distinct g.id, g.name,
         case when p_context_group_id is null then null::boolean
              else exists (
                select 1 from public.group_memberships gmc
                 where gmc.group_id = p_context_group_id
                   and gmc.member_group_id = g.id
                   and gmc.status = 'active')
         end
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

comment on function public.get_acting_contexts(uuid) is
  'FEAT-PC015 (ADR-U041 §1, §2d) + post-6-done fix: engagement groups the caller may act as — direct empowerment only. With p_context_group_id, each row flags ACTIVE membership in that context so the Surface offers only hats with standing (self is never flagged — a group is never a member of itself). SECURITY DEFINER: role-fabric walk across RLS.';

revoke all on function public.get_acting_contexts(uuid) from public, anon;
grant execute on function public.get_acting_contexts(uuid) to authenticated, service_role;

do $$
begin
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_acting_contexts'
       and p.pronargs = 0
  ) then
    raise exception 'fix-PC015: the zero-arg get_acting_contexts survived the drop';
  end if;
  if has_function_privilege('anon', 'public.get_acting_contexts(uuid)', 'EXECUTE') then
    raise exception 'fix-PC015: anon holds EXECUTE on the scoped read';
  end if;
  raise notice 'fix-PC015 verified: scoped get_acting_contexts(uuid) live, zero-arg gone, grants clean';
end $$;
