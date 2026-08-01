-- adm_c_pc021_users_list_jsonb — FEAT-PC021 gate 1 amendment (Cycle ADM-C)
-- ----------------------------------------------------------------------------
-- FINDING AT FIRST CONTACT (2026-08-01, post-gate-1 apply): the dev DB holds
-- 1,918 non-Mist users (1,892 under the 'default' filter; 1,589 sorting before
-- the suite's fixture rows), and PostgREST truncates SET-RETURNING RPC
-- responses at db-max-rows (1000) — so admin_get_users' big-population filters
-- (default / active / all) silently dropped rows. Demonstrated red post-apply:
-- 3 failed / 12 (exactly the three big-population filter cases; the
-- small-set filters and the jsonb-returning detail were green).
--
-- The PC021 "no pagination — PC020 precedent" premise was sized for GROUPS
-- (dozens); members are ~2k on dev already. A silent cap is the exact
-- honesty violation the house rule forbids ("silent truncation reads as
-- covered everything").
--
-- FIX: admin_get_users returns a single jsonb ARRAY (the detail contract's
-- style) — a scalar return, outside db-max-rows' reach. The client-visible
-- shape is IDENTICAL (supabase-js delivers an array either way): the
-- red-first suite's 12 assertions stand byte-unchanged, red 3 before this
-- migration, green 12 after. Keyset paging remains deferred until a
-- measurement asks about PAYLOAD size (~300 KB at today's scale — fine for
-- the admin plane).
--
-- Sibling-assertion clause: the return-type change requires DROP + CREATE;
-- grep at head — only hub/tests/integration/admin/member-administration-
-- contracts.test.ts names admin_get_users; no other consumer exists (the
-- function is 20 minutes old, gate-1-born). Gate/refusal semantics
-- (42501 / 22023), filter predicates, derived account_state, Mist exclusion,
-- and ordering are byte-identical to 20260801170000.

drop function public.admin_get_users(text);

create or replace function public.admin_get_users(p_filter text default 'default')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
  v_rows jsonb;
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'display_name', r.display_name,
        'email', r.email,
        'account_state', r.account_state,
        'is_platform_admin', r.is_platform_admin,
        'created_at', r.created_at)
      order by r.display_name, r.id),
    '[]'::jsonb)
  into v_rows
  from (
    select
      u.id,
      pg.name as display_name,
      u.email,
      case
        when u.is_decommissioned then 'decommissioned'
        when not u.is_active and u.deactivation_origin = 'member' then 'paused'
        when not u.is_active then 'suspended'
        else 'active'
      end as account_state,
      exists (
        select 1 from public.group_memberships gm
        where gm.group_id = v_deusex
          and gm.member_group_id = u.personal_group_id
          and gm.status = 'active'
      ) as is_platform_admin,
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
  ) r;

  return v_rows;
end;
$$;

comment on function public.admin_get_users(text) is
  'FEAT-PC021 (PC-4): platform-scope member enumeration for the admin console. '
  'Platform-admin-gated (42501); open filter namespace (22023 on unknown); '
  'Mists never appear; account_state derived server-side (open vocabulary). '
  'Returns a jsonb ARRAY (not SETOF) deliberately: PostgREST db-max-rows '
  'truncates set-returning RPCs silently at platform member scale (the '
  '2026-08-01 first-contact finding).';

revoke all on function public.admin_get_users(text) from public, anon;
grant execute on function public.admin_get_users(text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verification block
-- ----------------------------------------------------------------------------
do $$
declare
  v_rettype text;
begin
  select t.typname into v_rettype
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_type t on t.oid = p.prorettype
  where n.nspname = 'public' and p.proname = 'admin_get_users';
  if v_rettype is distinct from 'jsonb' then
    raise exception 'admin_get_users return type is %, expected jsonb', v_rettype;
  end if;
  raise notice 'PC021 gate 1 amendment: admin_get_users now returns jsonb (row-cap-proof)';
end;
$$;
