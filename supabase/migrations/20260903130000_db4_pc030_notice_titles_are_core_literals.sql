-- TASK-DB4-01 / FEAT-PC030 — CORRECTIVE to 20260903120000 (same gate, same
-- session, 2026-09-03): the invocation-axis gate
-- (hub/tests/integration/platform/internal-api-conformance.test.ts, "no function
-- references a DS-owned table outside its ownership rule") refused the first
-- issue's five fan-out bodies — each read the notice TITLE from
-- public.notification_kinds (DS-5) at write time:
--   [core-to-domain] rest_group / wake_group (PC-3), admin_suspend_group /
--   admin_reactivate_group / admin_update_user_status (PC-4) -> notification_kinds
-- ADR-U047: Core never depends upward on Domain; the registry is DS-5's console
-- vocabulary, the notice copy is the writing contract's own (the pause_member
-- precedent, 20260704192549 — 'Participation Paused' is a PC-3 literal). This
-- migration re-issues the five bodies with the titles as CORE LITERALS, equal
-- to the FEAT-PD021 registry labels by construction; the equality is pinned by
-- a cross-check cell in sanction-communication-contracts.test.ts (drift in
-- either place fails red). Writes to public.notifications are unchanged — the
-- vertical delivery substrate, written by every tier (manifest note).
--
-- Same signatures → CREATE OR REPLACE preserves the ACLs set by 20260903120000
-- (README row 4: said so, and re-asserted anyway). Every other line of each
-- body is byte-identical to 20260903120000. No table, column, policy, trigger
-- or grant change. Applied under the same named approval as 20260903120000
-- (Stefan, 2026-09-03).
--
-- SIBLING ASSERTIONS: none beyond 20260903120000's list — the titles the
-- contracts write are unchanged in VALUE (KIND_LABEL in the PC030 suite; the
-- E2E arc's "Your group has been suspended"); the gate suite goes green.
--
-- APPLY:
--   node scripts/apply-migration-temp.js 20260903130000_db4_pc030_notice_titles_are_core_literals.sql
--   bash supabase-cli.sh migration repair --status applied 20260903130000

create or replace function public.rest_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_reason text;   -- FEAT-PC030
  v_label text;    -- FEAT-PC030
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'resting a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement'
     for update;
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or public.is_platform_admin()) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not (coalesce(public.has_permission(v_actor, p_group_id, 'rest_group'), false)
          or public.is_platform_admin()) then
    raise exception 'rest_group required' using errcode = '42501';
  end if;

  -- no steward path INTO the hard state's territory: suspended refuses first
  if v_group.status = 'suspended' then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  if v_group.status = 'resting' then
    raise exception 'group is already resting' using errcode = 'P0001';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot rest a group that is not active' using errcode = 'P0001';
  end if;

  -- FEAT-PC030 STORY-2: the Steward's optional note — blank is none, never refused.
  v_reason := case when p_reason is null or length(trim(p_reason)) = 0
                   then null else p_reason end;

  update public.groups
     set status = 'resting', hold_reason = v_reason, updated_at = now()
   where public.groups.id = p_group_id;

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor
  -- excluded (the PD011 per-member fan-out; never a group-addressed row).
  -- The title is Core's literal, equal to the FEAT-PD021 label (20260903130000).
  v_label := 'Your group is resting';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_rested', v_label, coalesce(v_reason, v_label),
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.rest_group(uuid, text) from public, anon;
grant execute on function public.rest_group(uuid, text) to authenticated, service_role;

create or replace function public.wake_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_reason text;   -- FEAT-PC030
  v_label text;    -- FEAT-PC030
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'waking a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement'
     for update;
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or public.is_platform_admin()) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not (coalesce(public.has_permission(v_actor, p_group_id, 'rest_group'), false)
          or public.is_platform_admin()) then
    raise exception 'rest_group required' using errcode = '42501';
  end if;

  -- no steward path OUT of the hard state
  if v_group.status = 'suspended' then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  if v_group.status <> 'resting' then
    raise exception 'cannot wake a group that is not resting' using errcode = 'P0001';
  end if;

  -- FEAT-PC030 STORY-2: the Steward's optional note — blank is none, never refused.
  v_reason := case when p_reason is null or length(trim(p_reason)) = 0
                   then null else p_reason end;

  -- FEAT-PC030: waking clears the current hold's reason regardless of the note.
  update public.groups
     set status = 'active', hold_reason = null, updated_at = now()
   where public.groups.id = p_group_id;

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor excluded.
  -- The title is Core's literal, equal to the FEAT-PD021 label (20260903130000).
  v_label := 'Your group is awake again';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_woken', v_label, coalesce(v_reason, v_label),
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.wake_group(uuid, text) from public, anon;
grant execute on function public.wake_group(uuid, text) to authenticated, service_role;

create or replace function public.admin_suspend_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
  v_label text;    -- FEAT-PC030
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason (PC026 shape).
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be suspended' using errcode = '22023';
  end if;
  -- FEAT-PC023: active|resting -> suspended (the two-mode amendment)
  if v_group.status not in ('active', 'resting') then
    raise exception 'cannot suspend a group that is not active or resting';
  end if;

  update public.groups
     set status = 'suspended', hold_reason = p_reason, updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.suspend', p_group_id::text,
          jsonb_build_object('group_name', v_group.name,
                             'previous_status', v_group.status,
                             'reason', p_reason));

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor excluded.
  -- The title is Core's literal, equal to the FEAT-PD021 label (20260903130000).
  v_label := 'Your group has been suspended';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_suspended', v_label, p_reason,
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.admin_suspend_group(uuid, text) from public, anon;
grant execute on function public.admin_suspend_group(uuid, text) to authenticated, service_role;

create or replace function public.admin_reactivate_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
  v_label text;    -- FEAT-PC030
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason (PC026 shape).
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be reactivated' using errcode = '22023';
  end if;
  if v_group.status <> 'suspended' then
    raise exception 'cannot reactivate a group that is not suspended';
  end if;

  -- FEAT-PC030: reactivation clears the current hold's reason.
  update public.groups
     set status = 'active', hold_reason = null, updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.reactivate', p_group_id::text,
          jsonb_build_object('group_name', v_group.name, 'reason', p_reason));

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor excluded.
  -- The title is Core's literal, equal to the FEAT-PD021 label (20260903130000).
  v_label := 'Your group has been reactivated';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_reactivated', v_label, p_reason,
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.admin_reactivate_group(uuid, text) from public, anon;
grant execute on function public.admin_reactivate_group(uuid, text) to authenticated, service_role;

create or replace function public.admin_update_user_status(
  target_user_id uuid,
  new_is_active boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
  v_new_origin TEXT;
  v_kind TEXT;     -- FEAT-PC030
  v_label TEXT;    -- FEAT-PC030
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason, either way
  -- (the PC026 shape).
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason required' USING ERRCODE = '22023';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  -- FOR UPDATE serialises against the self-service contracts' own-row locks
  -- (AC3-14, unchanged from the W1 re-issue).
  SELECT id, is_active, is_decommissioned, deactivation_origin, personal_group_id
  INTO v_target
  FROM public.users WHERE id = target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- Decommission invariant: cannot reactivate a decommissioned user
  IF v_target.is_decommissioned = true AND new_is_active = true THEN
    RAISE EXCEPTION 'Cannot reactivate a decommissioned user';
  END IF;

  -- ADR-U050: 'admin' on hold (a member pause converts to an un-escapable
  -- hold), NULL on release (no stale residue), a decommissioned row keeps its
  -- terminal origin. Unchanged from the W1 re-issue.
  v_new_origin := CASE
    WHEN v_target.is_decommissioned THEN v_target.deactivation_origin
    WHEN new_is_active THEN NULL
    ELSE 'admin'
  END;

  -- No-op guard (PC021 STORY-3): a transition that would change neither the
  -- flag nor the origin refuses and writes nothing — row, audit trail, or
  -- otherwise. The origin clause is load-bearing: a hold on a member-paused
  -- row changes only the origin (the W1b conversion) and must proceed.
  IF v_target.is_active = new_is_active
     AND v_target.deactivation_origin IS NOT DISTINCT FROM v_new_origin THEN
    RAISE EXCEPTION 'User is already in the requested state';
  END IF;

  -- FEAT-PC030: the current hold's reason — set on suspend, cleared on reinstate.
  UPDATE public.users
  SET is_active = new_is_active,
      deactivation_origin = v_new_origin,
      suspension_reason = CASE WHEN new_is_active THEN NULL ELSE p_reason END,
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    CASE WHEN new_is_active THEN 'member.reactivate' ELSE 'member.suspend' END,
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'previous_origin', v_target.deactivation_origin,
      'reason', p_reason));

  -- FEAT-PC030 STORY-3: exactly one locked-on notice to the member's personal
  -- group (the `account` category, locked on since N-D). A Mist recipient
  -- yields no row (the dispatcher's GB-1b rule); a row without a personal
  -- group has no inbox to write to. The title is Core's literal, equal to the
  -- FEAT-PD021 label (20260903130000).
  IF v_target.personal_group_id IS NOT NULL THEN
    v_kind := CASE WHEN new_is_active THEN 'account_reinstated' ELSE 'account_suspended' END;
    v_label := CASE WHEN new_is_active
                    THEN 'Your account has been reinstated'
                    ELSE 'Your account has been suspended' END;
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
    VALUES (v_target.personal_group_id, v_kind, v_label, p_reason, '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

revoke all on function public.admin_update_user_status(uuid, boolean, text) from public, anon;
grant execute on function public.admin_update_user_status(uuid, boolean, text) to authenticated, service_role;

-- Apply-time self-verification: no fan-out body reads the DS-5 registry any more.
do $$
declare v_n integer;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('rest_group', 'wake_group', 'admin_suspend_group',
                       'admin_reactivate_group', 'admin_update_user_status')
     and p.prosrc ~* 'notification_kinds';
  if v_n <> 0 then
    raise exception 'FEAT-PC030 corrective: % fan-out bodies still read notification_kinds', v_n;
  end if;
end $$;
