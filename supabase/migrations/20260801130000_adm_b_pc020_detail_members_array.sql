-- FEAT-PC020 amendment (Cycle ADM-B) — the members array on
-- admin_get_group_detail: the reassign picker's candidate source.
-- Adjudicated at TASK-ADMB-02 (Stefan, 2026-08-01, "Members array on
-- detail"): the decomposition walk named get_group_memberships_of as the
-- picker source, but that contract returns the memberships OF the acting
-- group (the PC015 direction — which groups it belongs to), not the members
-- of a group, and it is act_as_group-gated, which an admin does not hold.
-- Resolution: one additive jsonb key on the walked detail payload —
-- `members`: the group's ACTIVE HUMAN members (personal groups only), each
-- {personal_group_id, display_name, is_steward}. Additive keys are
-- non-breaking per the versioned-payload custom.
--
-- Schema change — schema-review gate: lands at task status `review`, not
-- `done`. STRICTLY ADDITIVE payload key via CREATE OR REPLACE of
-- 20260801120000's admin_get_group_detail. No table change, no policy
-- change, no signature change. Grants: unchanged — CREATE OR REPLACE
-- preserves ACLs (revoked PUBLIC/anon, EXECUTE to authenticated).
--
-- Sibling-assertion grep (the three-strikes rule), swept 2026-08-01: the
-- only assertions on admin_get_group_detail's payload are this feature's
-- own suite (hub/tests/integration/admin/group-administration-contracts
-- .test.ts) — the detail tests assert named keys, never an exact key set,
-- so the additive key adapts nothing; the two members-array tests in that
-- suite are this migration's own red-first coverage (RED between
-- 20260801120000 and this file: 2 failed / 30 passed demonstrated).
-- Nothing adapted, nothing deliberately left.
--
-- Direct-caller question (ADR-U038): unchanged from 20260801120000 — the
-- contract self-gates on is_platform_admin() with typed 42501 before any
-- read; the new key exposes member display identity already visible in
-- shared contexts (the B-DISP personal-group name), to platform admins
-- only; no column grants change.

create or replace function public.admin_get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
  v_deusex uuid;
  v_member_count integer;
  v_non_system_count integer;
  v_deusex_stewarded boolean;
  v_stewards jsonb;
  v_members jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type <> 'personal';
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  select g.id into v_deusex
    from public.groups g
   where g.name = 'DeusEx' and g.group_type = 'system';

  select count(*)::integer into v_member_count
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.status = 'active';

  select count(*)::integer into v_non_system_count
    from public.group_memberships gm
    join public.groups mg on mg.id = gm.member_group_id
   where gm.group_id = p_group_id and gm.status = 'active'
     and mg.group_type <> 'system';

  v_deusex_stewarded := exists (
    select 1 from public.group_memberships gm
     where gm.group_id = p_group_id and gm.member_group_id = v_deusex
       and gm.status = 'active');

  select coalesce(jsonb_agg(jsonb_build_object(
           'display_name', pg.name,
           'personal_group_id', pg.id
         ) order by pg.name), '[]'::jsonb)
    into v_stewards
    from public.user_group_roles ugr
    join public.group_roles gr on gr.id = ugr.group_role_id
    join public.group_memberships gm
      on gm.group_id = ugr.group_id
     and gm.member_group_id = ugr.member_group_id
     and gm.status = 'active'
    join public.groups pg on pg.id = ugr.member_group_id
   where ugr.group_id = p_group_id
     and pg.group_type <> 'system'
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt
              where rt.name = 'Steward Role Template')
          or gr.name = 'Steward');

  -- The members array (this migration's addition): active HUMAN members —
  -- personal groups only; the caretaker rides deusex_stewarded, and
  -- member-of-group engagement groups (PC015) are not reassignment
  -- candidates. Display identity = the personal group's name (B-DISP).
  select coalesce(jsonb_agg(jsonb_build_object(
           'personal_group_id', pg.id,
           'display_name', pg.name,
           'is_steward', exists (
              select 1
                from public.user_group_roles ugr
                join public.group_roles gr on gr.id = ugr.group_role_id
               where ugr.group_id = p_group_id
                 and ugr.member_group_id = pg.id
                 and (gr.created_from_role_template_id =
                        (select rt.id from public.role_templates rt
                          where rt.name = 'Steward Role Template')
                      or gr.name = 'Steward'))
         ) order by pg.name), '[]'::jsonb)
    into v_members
    from public.group_memberships gm
    join public.groups pg on pg.id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and pg.group_type = 'personal';

  return jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'group_type', v_group.group_type,
    'status', v_group.status,
    'is_public', v_group.is_public,
    'avatar_url', v_group.avatar_url,
    'member_count', v_member_count,
    'non_system_member_count', v_non_system_count,
    'deusex_stewarded', v_deusex_stewarded,
    'stewards', v_stewards,
    'members', v_members,
    'created_at', v_group.created_at,
    'updated_at', v_group.updated_at
  );
end;
$$;

comment on function public.admin_get_group_detail(uuid) is
  'FEAT-PC020 (ADM-8): admin group detail — the row, the member_count/non_system_member_count pair (the caretaker is never load-bearing in copy, ADR-U041 §5), human stewards only (display identity = the personal group''s name, the B-DISP oracle; the caretaker is carried by deusex_stewarded), status timestamps via the row''s created_at/updated_at, and (20260801130000, the TASK-ADMB-02 adjudication) `members`: active human members with is_steward flags — the reassign picker''s candidate source. Personal or unknown ids refuse P0002. SECURITY DEFINER required: admin-plane read across RLS.';
