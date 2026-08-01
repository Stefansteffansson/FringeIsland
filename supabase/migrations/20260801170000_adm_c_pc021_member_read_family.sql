-- adm_c_pc021_member_read_family — FEAT-PC021 gate 1 (Cycle ADM-C, TASK-ADMC-01)
-- ----------------------------------------------------------------------------
-- The member administration read family (ADM-2): admin_get_users(p_filter) +
-- admin_get_user_detail(p_user_id). The 2026-08-01 contract walk confirmed no
-- admin member read exists in any form (finding 1) — these are the first.
--
-- STRICTLY ADDITIVE: two new SECURITY DEFINER functions. No table, column,
-- trigger, policy, or existing-function change; no shipped semantics change.
-- Sibling-assertion clause (platform CLAUDE.md): grep for admin_get_users /
-- admin_get_user_detail across hub/tests at head matches ONLY the new
-- red-first suite (member-administration-contracts.test.ts) — no existing
-- assertion names either function; nothing to adapt.
--
-- Red demonstrated 2026-08-01 pre-apply: 12 failed / 12 total, every case
-- PGRST202 function-absent (incl. the refusal cells, which pin their typed
-- codes and so fail function-absent rather than passing on error-presence).
--
-- Shapes per the FEAT-PC021 payload walk (every key has a walked consumer):
--   list row: id, display_name (personal-group name — B-DISP), email
--     (admin-tier; Mists excluded so rows carry it), account_state (derived
--     server-side, open vocabulary), is_platform_admin, created_at.
--   detail: the row keys + deactivation_origin + memberships[] of the
--     target's ACTIVE ENGAGEMENT memberships, each carrying the
--     platform-computed removal_scenario (the delete_own_account classifier:
--     member_count=1 -> group_closure; sole Steward -> steward_handover;
--     else regular_leave) — the ADM-18 removal picker's source, advisory at
--     read time (the operations re-classify at execution).
-- Mists never appear (ADR-U033 — the reaper's, not this console's); a
-- temporary target reads P0002, existence-hidden.
-- account_state / deactivation_origin / p_filter are OPEN vocabularies — no
-- CHECK, no sealed enum (the deactivation_origin comment at 20260721161500
-- and the PC020 filter discipline).
--
-- SECURITY DEFINER rationale: admin-plane reads over users/memberships cross
-- RLS visibility by design; both gate on is_platform_admin() with typed 42501
-- before touching any row, and REVOKE anon so no unauthenticated path exists.

-- ----------------------------------------------------------------------------
-- admin_get_users(p_filter) — the ADM-2 list
-- ----------------------------------------------------------------------------
create or replace function public.admin_get_users(p_filter text default 'default')
returns table (
  id uuid,
  display_name text,
  email text,
  account_state text,
  is_platform_admin boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  if p_filter not in ('default', 'active', 'inactive', 'decommissioned', 'platform_admins', 'all') then
    -- open namespace: unknown filters refuse without enumerating the valid set
    raise exception 'unknown filter' using errcode = '22023';
  end if;

  select g.id into v_deusex
  from public.groups g
  where g.name = 'DeusEx' and g.group_type = 'system';

  return query
  select
    u.id,
    pg.name,
    u.email,
    case
      when u.is_decommissioned then 'decommissioned'
      when not u.is_active and u.deactivation_origin = 'member' then 'paused'
      when not u.is_active then 'suspended'
      else 'active'
    end,
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = v_deusex
        and gm.member_group_id = u.personal_group_id
        and gm.status = 'active'
    ),
    u.created_at
  from public.users u
  join public.groups pg on pg.id = u.personal_group_id
  where u.is_temporary is not true
    and case p_filter
      when 'default' then not u.is_decommissioned
      when 'active' then u.is_active and not u.is_decommissioned
      when 'inactive' then (not u.is_active) and not u.is_decommissioned
      when 'decommissioned' then u.is_decommissioned
      when 'platform_admins' then exists (
        select 1 from public.group_memberships gm2
        where gm2.group_id = v_deusex
          and gm2.member_group_id = u.personal_group_id
          and gm2.status = 'active')
      else true
    end
  order by pg.name, u.id;
end;
$$;

comment on function public.admin_get_users(text) is
  'FEAT-PC021 (PC-4): platform-scope member enumeration for the admin console. '
  'Platform-admin-gated (42501); open filter namespace (22023 on unknown); '
  'Mists never appear; account_state derived server-side (open vocabulary).';

revoke all on function public.admin_get_users(text) from public, anon;
grant execute on function public.admin_get_users(text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- admin_get_user_detail(p_user_id) — the ADM-2 detail + the ADM-18 picker source
-- ----------------------------------------------------------------------------
create or replace function public.admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user record;
  v_deusex uuid;
  v_tmpl uuid;
  v_memberships jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  select u.id, u.email, u.is_active, u.is_decommissioned, u.deactivation_origin,
         u.personal_group_id, u.created_at, pg.name as display_name
    into v_user
  from public.users u
  join public.groups pg on pg.id = u.personal_group_id
  where u.id = p_user_id
    and u.is_temporary is not true;

  if not found then
    -- unknown AND temporary targets alike: existence-hidden
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  select g.id into v_deusex
  from public.groups g
  where g.name = 'DeusEx' and g.group_type = 'system';

  select rt.id into v_tmpl
  from public.role_templates rt
  where rt.name = 'Steward Role Template';

  -- The removal picker's source: active engagement memberships, each with the
  -- removal_scenario the delete_own_account classifier would assign (advisory
  -- at read time; the gate-2 operations re-classify at execution).
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'group_id', mrow.gid,
        'group_name', mrow.gname,
        'status', mrow.gstatus,
        'removal_scenario', mrow.scenario)
      order by mrow.gname, mrow.gid),
    '[]'::jsonb)
  into v_memberships
  from (
    select
      g.id as gid,
      g.name as gname,
      g.status as gstatus,
      case
        when mc.member_count = 1 then 'group_closure'
        when coalesce(st.target_is_steward, false) and coalesce(st.steward_count, 0) = 1
          then 'steward_handover'
        else 'regular_leave'
      end as scenario
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id and g.group_type = 'engagement'
    cross join lateral (
      select count(*)::int as member_count
      from public.group_memberships x
      where x.group_id = g.id and x.status = 'active') mc
    left join lateral (
      select r.id as role_id
      from public.group_roles r
      where r.group_id = g.id
        and (r.created_from_role_template_id = v_tmpl or r.name = 'Steward')
      order by (r.created_from_role_template_id = v_tmpl) desc nulls last, r.name
      limit 1) sr on true
    left join lateral (
      select count(*)::int as steward_count,
             bool_or(ugr.member_group_id = v_user.personal_group_id) as target_is_steward
      from public.user_group_roles ugr
      join public.group_memberships am
        on am.group_id = g.id
       and am.member_group_id = ugr.member_group_id
       and am.status = 'active'
      where ugr.group_id = g.id
        and ugr.group_role_id = sr.role_id) st on true
    where gm.member_group_id = v_user.personal_group_id
      and gm.status = 'active'
  ) mrow;

  return jsonb_build_object(
    'id', v_user.id,
    'display_name', v_user.display_name,
    'email', v_user.email,
    'account_state', case
      when v_user.is_decommissioned then 'decommissioned'
      when not v_user.is_active and v_user.deactivation_origin = 'member' then 'paused'
      when not v_user.is_active then 'suspended'
      else 'active'
    end,
    'deactivation_origin', v_user.deactivation_origin,
    'is_platform_admin', exists (
      select 1 from public.group_memberships gm2
      where gm2.group_id = v_deusex
        and gm2.member_group_id = v_user.personal_group_id
        and gm2.status = 'active'),
    'created_at', v_user.created_at,
    'memberships', v_memberships);
end;
$$;

comment on function public.admin_get_user_detail(uuid) is
  'FEAT-PC021 (PC-4): admin member detail — identity, derived account_state, '
  'deactivation_origin, and the active-engagement memberships array with the '
  'platform-computed removal_scenario (the ADM-18 picker source). '
  'Platform-admin-gated (42501); unknown/temporary targets P0002.';

revoke all on function public.admin_get_user_detail(uuid) from public, anon;
grant execute on function public.admin_get_user_detail(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verification block
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_get_users'
  ) then
    raise exception 'admin_get_users not created';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_get_user_detail'
  ) then
    raise exception 'admin_get_user_detail not created';
  end if;
  raise notice 'PC021 gate 1: member read family created';
end;
$$;
