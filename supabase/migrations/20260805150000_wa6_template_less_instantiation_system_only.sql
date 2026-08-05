-- ============================================================================
-- WA-6 (Stefan's live-walk ruling, 2026-08-05) — template-less instantiation
-- carries the SYSTEM role templates only; clones are pull-only.
-- ============================================================================
-- The ruling (S10/S11 of the 2026-08-05 walk): "new groups shall by default
-- only have the system [role templates]. Only at pull they will see the
-- cloned [ones]." This REVERSES the PC025 STORY-2 law shipped 2026-08-04
-- (20260804210000 Defect 1: "a clone rides every template-less
-- instantiation") — that fix made the ride real; this ruling retires the ride.
-- What stays: both pull doors are untouched — choosing a template at group
-- creation, and a Steward adding a role from the template picker
-- (create_group_role p_role_template_id); get_role_templates keeps listing
-- clones (pull visibility is the point).
--
-- One re-issue in place: create_engagement_group — ONLY the template-less arm
-- of the role-instantiation WHERE changes (gains `and rt.is_system`); body
-- otherwise byte-identical to 20260804210000. No signature change, no table/
-- policy/grant changes (CREATE OR REPLACE preserves ACLs). Function COMMENT
-- updated to state the new law.
--
-- Sibling-assertion sweep:
--   * role-template-editing.test.ts S2c — FLIPPED red-first in this PR (the
--     old cell pinned the ride as spec; the ruling changed the law).
--   * role-template-editing.test.ts S4a — ADAPTED, labelled: witnesses route
--     through the pull door; red at head for the right reason (the old law's
--     ridden clone role collides 23505 with the pull witness's name), green
--     post-apply.
--   * admin-roles.spec.ts WA-6 cell — FLIPPED in this PR; verify post-apply.
--   * admin-role-template-detail.test.tsx clone-consequence pin + the
--     ceremony copy — FLIPPED red-first in this PR (surface half).
--   * PC010 group-contract suites — DELIBERATELY LEFT: in an all-seed
--     environment the filtered selector is behaviour-identical.
--   * FEAT-PC025 / FEAT-H040 specs — amendment notes ride this PR.
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
  -- the SYSTEM role templates only (WA-6, 2026-08-05: clones never ride
  -- template-less instantiation; a clone joins a group only through a pull
  -- door — a chosen template that registers it, or create_group_role from the
  -- template picker). Data-driven; the copy_template_permissions trigger
  -- copies each instance's permission grants.
  insert into public.group_roles (group_id, name, description, created_from_role_template_id)
  select v_group_id, rt.name, rt.description, rt.id
    from public.role_templates rt
   where (p_group_template_id is null and rt.is_system)
      or rt.id in (
        select gtr.role_template_id
          from public.group_template_roles gtr
         where gtr.group_template_id = p_group_template_id
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
  'FEAT-PC010 GRP-1 (+2026-07-04 amendment, +ADM-F FEAT-PC025 gate fix, +WA-6 2026-08-05): atomic engagement-group bootstrap — group + role instances + creator active membership + permission-derived MANAGEMENT binding (assign_roles marker, mandatory) + permission-derived PARTICIPATION binding (enroll_self_in_journey marker, soft-skipped when the role set carries none). Template-less instantiation carries the SYSTEM role templates only (WA-6 walk ruling — clones are pull-only: a chosen template''s registered set, or create_group_role from the template picker); a chosen template constrains to its registered set. Creating a group means stewarding it and taking part in it; either binding is removable afterwards. No role-name strings (ADR-U007).';
