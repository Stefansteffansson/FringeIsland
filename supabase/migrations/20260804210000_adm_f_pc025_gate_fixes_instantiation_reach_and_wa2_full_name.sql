-- ============================================================================
-- ADM-F FEAT-PC025 — gate fixes: the clone's instantiation reach + WA-2
-- full-name target resolution (post-apply gate reds S2c / S4a / S6a)
-- ============================================================================
-- The 20260804190000 apply left three gate cells red (deterministic across two
-- runs). Both defects are contract-body defects; the cells pin the spec.
--
-- Defect 1 (S2c + S4a) — the clone does not ride template-less instantiation.
--   create_engagement_group()'s template-less branch was implemented as "every
--   role template any group template carries" (via group_template_roles with a
--   coalesce collapse) — equivalent to "EVERY role template" only while the
--   catalogue is all-seeds. A clone lands in role_templates (+ live
--   permissions) but never in group_template_roles, so it never instantiated
--   and S4a's post-apply group carried no clone role at all (empty set). The
--   20260804190000 header's "zero changes to create_engagement_group" claim
--   was wrong on exactly this point; the STORY-2 pin ("a clone rides every
--   template-less instantiation") is the spec.
--   Fix: the template-less branch selects from role_templates directly
--   (p_group_template_id IS NULL OR the chosen template's set). With no clones
--   present this is behavior-identical (all-seeds: the 4 seed templates are
--   role_templates in full and every group template references all 4).
--
-- Defect 2 (S6a) — WA-2 resolved targets to the nickname, not the name.
--   admin_get_audit_log() resolved user-id targets via the target's
--   personal-group name — which the signup path sets to the NICKNAME
--   (split_part(full_name, ' ', 1), 20260702120100:67). The walk rider's pin
--   is the full display name + email; public.users.full_name is where the
--   full display name lives. Personal-group-id targets reach through to the
--   owning user's full_name the same way; non-personal group targets keep
--   groups.name; literals/unresolvable targets keep null resolution.
--
-- Re-issues in place: create_engagement_group (FEAT-PC010 + 2026-07-04
-- amendment body, only the template-less WHERE changed) and
-- admin_get_audit_log (20260804190000 Part 3a body, only the target joins/
-- keys changed). No signature changes, no new tables, no policy changes, no
-- grant changes (CREATE OR REPLACE preserves both functions' ACLs). Ownership
-- manifest already carries both functions.
--
-- Sibling-assertion sweep:
--   * PC010 group-contract suites assert template-less instantiation against
--     the seeded catalogue — behavior-identical with no clones present
--     (DELIBERATELY LEFT).
--   * The gate suite deletes its clones in afterAll (by id + TOKEN prefix), so
--     no clone outlives the suite (LEFT).
--   * admin audit consumers: H040 tranche 1 (merged #409) renders
--     target_display_name shape-tolerantly; PC022-era suites predate the
--     resolution keys; actor resolution (actor_display_name = personal-group
--     name) is PC022 law and is NOT touched — the walk rider re-specified
--     targets only (LEFT).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — create_engagement_group re-issue: the EVERY-role-template path
-- reads role_templates itself
-- ----------------------------------------------------------------------------

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
  -- EVERY role template (ADM-F FEAT-PC025 STORY-2: a clone rides every
  -- template-less instantiation; the pre-ADM-F wording reached role templates
  -- through group_template_roles, which a clone never joins). Data-driven; the
  -- copy_template_permissions trigger copies each instance's permission grants.
  insert into public.group_roles (group_id, name, description, created_from_role_template_id)
  select v_group_id, rt.name, rt.description, rt.id
    from public.role_templates rt
   where p_group_template_id is null
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
  'FEAT-PC010 GRP-1 (+2026-07-04 amendment, +ADM-F FEAT-PC025 gate fix): atomic engagement-group bootstrap — group + role instances + creator active membership + permission-derived MANAGEMENT binding (assign_roles marker, mandatory) + permission-derived PARTICIPATION binding (enroll_self_in_journey marker, soft-skipped when the role set carries none). Template-less instantiation carries EVERY role template (clones included — PC025 STORY-2); a chosen template constrains to its registered set. Creating a group means stewarding it and taking part in it; either binding is removable afterwards. No role-name strings (ADR-U007).';

-- ----------------------------------------------------------------------------
-- Part 2 — admin_get_audit_log re-issue: targets resolve to the FULL display
-- name (users.full_name) through both doors
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_action_prefix TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_rows jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    -- WA-2 rider: the family message lands with the re-issue (the PC024 §
    -- Problem drift, settled).
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  -- Keyset unchanged (created_at DESC, id DESC; cap 200). WA-2: a guarded
  -- uuid cast, then user-id targets resolve to users.full_name + email (the
  -- personal-group name is the NICKNAME — first token — never the display
  -- name); personal-group-id targets reach through to the owning user's
  -- full_name; other group-id targets keep groups.name; literals and
  -- unresolvable/erased targets pass through with null resolution; the raw
  -- target stays in every row. The audit record itself is untouched —
  -- resolution is read-time display shaping.
  SELECT COALESCE(jsonb_agg(sub.doc ORDER BY sub.c DESC, sub.i DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT a.created_at AS c, a.id AS i,
             jsonb_build_object(
               'id', a.id,
               'actor_group_id', a.actor_group_id,
               'actor_display_name', g.name,
               'action', a.action,
               'target', a.target,
               'target_display_name', COALESCE(tu.full_name, tgu.full_name, tg.name),
               'target_email', COALESCE(tu.email, tgu.email),
               'metadata', a.metadata,
               'created_at', a.created_at) AS doc
        FROM (
          SELECT a0.*,
                 CASE WHEN a0.target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      THEN a0.target::uuid END AS target_uuid
            FROM public.admin_audit_log a0
        ) a
        LEFT JOIN public.groups g ON g.id = a.actor_group_id
        LEFT JOIN public.users tu ON tu.id = a.target_uuid
        LEFT JOIN public.groups tg ON tg.id = a.target_uuid
        LEFT JOIN public.users tgu ON tgu.personal_group_id = tg.id
       WHERE (p_before IS NULL OR a.created_at < p_before)
         AND (p_action_prefix IS NULL OR a.action LIKE p_action_prefix || '%')
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT v_limit
    ) sub;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.admin_get_audit_log(INTEGER, TIMESTAMPTZ, TEXT) IS
  'ADM-D FEAT-PC022 / ADM-16, re-issued ADM-F FEAT-PC025 (WA-2, + the gate '
  'fix): the audit read — keyset from birth, cap 200, newest-first, actor AND '
  'target identities resolved live and null-safe (user-id targets -> '
  'users.full_name + email; personal-group targets reach the owning user''s '
  'full_name; other group targets -> group name; literals/erased pass '
  'through; raw target always in the row). Gate message aligned to the '
  'member family. 42501 non-admin. Privilege-escalation surface: reads the '
  'admin-RLS-protected log, walled by is_platform_admin().';
