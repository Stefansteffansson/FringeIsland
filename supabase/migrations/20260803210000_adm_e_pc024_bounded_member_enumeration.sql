-- adm_e_pc024_bounded_member_enumeration — FEAT-PC024 (Cycle ADM-E, TASK-ADME-01)
-- ----------------------------------------------------------------------------
-- THE PARKED DECISION, REOPENED: 20260801180000's header deferred keyset paging
-- "until a measurement asks about PAYLOAD size (~300 KB at today's scale)".
-- The A-ADM live walk asked (finding W-5: the members list stalls on a ~2k-row
-- census behind every paint); the RB board ruled the fix (RB-3, settled
-- 2026-08-03): keyset pagination at the contract + server-side search. This
-- migration is ADM-E's one schema gate.
--
-- Shape: admin_get_users(p_filter, p_search, p_limit, p_after_name, p_after_id)
--   → {users: [...], next_cursor: {name, id} | null, generated_at}
-- - Composite (display_name, id) keyset — the audit read's bare-timestamp
--   cursor (20260802120000) fits an append-only log, not a list ordered by a
--   non-unique, mutable name. Mutable-key honesty: a rename between page
--   fetches can skip or repeat that row — accepted for a refresh-based admin
--   list (the drift class an offset page has); do not "fix" into a stateful
--   cursor.
-- - Cap expression mirrors the audit read exactly: LEAST(GREATEST(COALESCE(50),1),200).
-- - p_search: case-insensitive substring over display name OR email; no
--   ranking, no index until a measurement asks (DS-6 stays unconsumed).
-- - The return stays a SCALAR jsonb — preserving 20260801180000's db-max-rows
--   escape (PostgREST truncates set-returning RPCs at 1000 silently).
-- - generated_at feeds the surface's "As of" line (RB-8): server clock, never
--   a client stamp claiming freshness the server did not assert.
-- - Preserved verbatim from 20260801180000: the open filter namespace + 22023,
--   'default' hides decommissioned, the Mist exclusion (is_temporary is not
--   true), the derived account_state CASE, the 42501 'platform administrator
--   required' gate, ordering display_name, id; grants unchanged.
--
-- SIBLING-ASSERTION CLAUSE (every site naming admin_get_users, grep at head):
-- 1. hub/tests/integration/admin/member-administration-contracts.test.ts —
--    ADAPTED in this PR: rows() walks pages (p_limit 200 + cursor) so the
--    full-population predicate cells keep their semantics; S1g/S1h/S1i are
--    signature-compatible via defaults, deliberately unchanged.
-- 2. hub/tests/integration/admin/member-administration-operations.test.ts
--    (S7a, S7c) — ADAPTED in this PR: unwrap .users, p_limit 200.
-- 3. hub/tests/integration/admin/member-enumeration-bounded.test.ts — the
--    gate suite born with this migration (red at head: every call passes a
--    new parameter, so PGRST202 against the live single-parameter signature).
-- 4. hub/lib/admin/users.ts (fetchAdminUsers) — ADAPTED in the PRE-APPLY Hub
--    tranche: a shape-tolerant, page-walking shim (array OR keyed pages) that
--    keeps the deployed surface byte-identical, so this apply is
--    non-breaking regardless of deploy order. Removed by the post-apply
--    bounded-list rework (TASK-ADME-02).
-- 5. hub/components/admin/AdminMembersList.tsx + its unit suite —
--    DELIBERATELY LEFT: behavior preserved by the shim; the bounded-list
--    rework is the post-apply tranche (TASK-ADME-02).
-- 6. hub/tests/e2e/admin-members.spec.ts — DELIBERATELY LEFT: names no RPC;
--    surface behavior unchanged under the shim.
-- 7. hub/app/api/admin/users/route.ts — DELIBERATELY LEFT until tranche 2:
--    passes p_filter only, which the new defaults keep valid.
-- 8. supabase/ownership.manifest.json — NO EDIT: re-issue by name, PC-4
--    registration unchanged (registration is by name, not signature).

drop function public.admin_get_users(text);

create or replace function public.admin_get_users(
  p_filter text default 'default',
  p_search text default null,
  p_limit integer default 50,
  p_after_name text default null,
  p_after_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
  v_limit integer;
  v_rows jsonb;
  v_has_more boolean;
  v_next jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  if p_filter not in ('default', 'active', 'inactive', 'decommissioned', 'platform_admins', 'all') then
    -- open namespace: unknown filters refuse without enumerating the valid set
    raise exception 'unknown filter' using errcode = '22023';
  end if;

  if (p_after_name is null) <> (p_after_id is null) then
    -- an incomplete cursor is a malformed argument, not page one
    raise exception 'incomplete cursor' using errcode = '22023';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 200);

  select g.id into v_deusex
  from public.groups g
  where g.name = 'DeusEx' and g.group_type = 'system';

  with base as (
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
      and (p_search is null or btrim(p_search) = ''
           or pg.name ilike '%' || p_search || '%'
           or u.email ilike '%' || p_search || '%')
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
  ),
  page as (
    select b.*, row_number() over (order by b.display_name, b.id) as rn
    from base b
    where (p_after_name is null or (b.display_name, b.id) > (p_after_name, p_after_id))
    order by b.display_name, b.id
    limit v_limit + 1
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'display_name', p.display_name,
          'email', p.email,
          'account_state', p.account_state,
          'is_platform_admin', p.is_platform_admin,
          'created_at', p.created_at)
        order by p.display_name, p.id)
        filter (where p.rn <= v_limit),
      '[]'::jsonb),
    count(*) > v_limit
  into v_rows, v_has_more
  from page p;

  if v_has_more then
    v_next := jsonb_build_object(
      'name', v_rows -> -1 ->> 'display_name',
      'id', v_rows -> -1 ->> 'id');
  else
    v_next := null;
  end if;

  return jsonb_build_object(
    'users', v_rows,
    'next_cursor', v_next,
    'generated_at', now());
end;
$$;

comment on function public.admin_get_users(text, text, integer, text, uuid) is
  'FEAT-PC024 (PC-4): bounded platform-scope member enumeration for the admin '
  'console. Platform-admin-gated (42501); open filter namespace (22023 on '
  'unknown); Mists never appear; account_state derived server-side (open '
  'vocabulary). Composite (display_name, id) keyset, cap 200/default 50; '
  'p_search = case-insensitive substring over display name/email. Returns '
  'scalar jsonb {users, next_cursor, generated_at} — outside db-max-rows'' '
  'reach (the 2026-08-01 first-contact finding) and bounded per the W-5 '
  'measurement (RB-3, 2026-08-03).';

revoke all on function public.admin_get_users(text, text, integer, text, uuid) from public, anon;
grant execute on function public.admin_get_users(text, text, integer, text, uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verification block
-- ----------------------------------------------------------------------------
do $$
declare
  v_count integer;
  v_nargs integer;
begin
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'admin_get_users';
  if v_count <> 1 then
    raise exception 'expected exactly one admin_get_users, found %', v_count;
  end if;

  select p.pronargs into v_nargs
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'admin_get_users';
  if v_nargs <> 5 then
    raise exception 'admin_get_users pronargs is %, expected 5', v_nargs;
  end if;

  raise notice 'PC024: admin_get_users re-issued bounded (composite keyset + server search, cap 200)';
end;
$$;
