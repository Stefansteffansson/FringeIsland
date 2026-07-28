-- ============================================================================
-- W-03 #1 (A-NTF gate walk, 2026-07-27) — the imperative cannot expire.
--
-- The stewardship-nomination body was emitted as:
--   "You have been nominated as Steward of <group>. Accept or decline within 7 days."
--
-- Copy is server-authored and frozen at emit, and the surface is forbidden to
-- re-word it (the V3 surfaces law, cited in NotificationItem.tsx's header). So a
-- body that embeds BOTH a call-to-action and a deadline ages badly BY
-- CONSTRUCTION: three weeks after the window closed, the row still instructs the
-- member to act, and only a small pill says otherwise. Reading order is
-- title -> body -> chip, so the instruction lands before the correction.
--
-- That is a consequence of the copy law, not a Hub defect — which is why the fix
-- belongs here, at the emit site, and not in the surface.
--
-- NOTHING IS LOST. `expires_at` already carries the deadline (both sites set
-- now() + interval '7 days', unchanged below), and the surface already renders
-- "Respond by <date>" for exactly as long as the row is actionable
-- (NotificationItem.tsx:45-46). The body was duplicating a fact the machinery
-- already held, in the one form that can never stop being true-sounding.
--
-- SCOPE — verified against the live catalogue, not inferred: exactly two live
-- functions emit this string, and both are re-issued here. The N-B
-- `acting_invitation` body was already factual and is untouched.
--
-- NO BACKFILL, DELIBERATELY. 109 delivered rows carry the old body (81 of them
-- already answered — W-03's observed case among them). They are left exactly as
-- they were sent. Rewriting a delivered notification body is rewriting what the
-- platform told someone; an aging imperative on a row already read is a smaller
-- wrong than retroactively editing the record of what was said. New emissions
-- are factual from here.
--
-- MECHANICS: both bodies below are `pg_get_functiondef` output taken from the
-- live database, with ONLY the string literal changed — so this migration cannot
-- silently revert an unrelated in-place amendment. CREATE OR REPLACE preserves
-- the existing ACLs and COMMENTs (same oid), so no re-GRANT is needed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.nominate_steward(p_group_id uuid, p_nominee_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_is_steward boolean;
  v_nominee_id uuid;
  v_count integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'nominating a successor is FIM-only' using errcode = '42501';
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
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot nominate in a group that is not active' using errcode = 'P0001';
  end if;

  -- Steward-ness: template linkage with the legacy short-name fallback (the
  -- house resolution — invariant plumbing, not a permission gate, ADR-U007)
  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = v_actor
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_is_steward;
  if not v_is_steward then
    raise exception 'only the group''s Steward can nominate successors'
      using errcode = 'P0001';
  end if;
  -- Sole-ness counts ACTIVE memberships (a paused co-Steward is NOT cover —
  -- the raw-role-count blind spot the legacy body carried)
  if public.active_steward_count(p_group_id, v_actor) > 0 then
    raise exception 'you are not the sole active Steward — regular leave applies'
      using errcode = 'P0001';
  end if;

  -- One nomination in flight per group (the sprint3 guard, kept)
  if exists (
    select 1 from public.notifications n
     where n.type = 'stewardship_nomination'
       and n.group_id = p_group_id
       and n.action_type = 'accept_decline'
       and n.action_taken is null
       and (n.expires_at is null or n.expires_at > now())
  ) then
    raise exception 'a stewardship nomination is already in progress for this group'
      using errcode = 'P0001';
  end if;

  -- Nominee validation — bad input is 22023, with the specific reason
  if p_nominee_ids is null or coalesce(array_length(p_nominee_ids, 1), 0) = 0 then
    raise exception 'at least one nominee is required' using errcode = '22023';
  end if;
  select count(distinct x) into v_count from unnest(p_nominee_ids) as x;
  if v_count <> array_length(p_nominee_ids, 1) then
    raise exception 'duplicate nominees are not allowed' using errcode = '22023';
  end if;
  foreach v_nominee_id in array p_nominee_ids loop
    if v_nominee_id = v_actor then
      raise exception 'cannot nominate yourself' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.group_memberships gm
       where gm.group_id = p_group_id
         and gm.member_group_id = v_nominee_id
         and gm.status = 'active'
    ) then
      raise exception 'nominee % is not an active member of this group', v_nominee_id
        using errcode = '22023';
    end if;
    -- ADR-U041 §4 (FEAT-PC015 Open Q3): stewardship succession lands on
    -- people. System groups are never nominatable — the designed last resort
    -- (ADR-U019) is not a pickable choice; engagement-group nominees are
    -- deferred until a real need. Typed column, never a name check.
    if not exists (
      select 1 from public.groups g
       where g.id = v_nominee_id and g.group_type = 'personal'
    ) then
      raise exception 'nominee % is not a person — stewardship succession lands on people', v_nominee_id
        using errcode = '22023';
    end if;
  end loop;

  -- The durable actionable offer to the FIRST nominee (sprint3 shape verbatim
  -- — H017's pending-nomination read consumes these columns). Nothing else
  -- mutates until the nominee responds.
  insert into public.notifications (
    recipient_group_id, type, title, body, payload, group_id,
    action_type, action_data, expires_at
  ) values (
    p_nominee_ids[1],
    'stewardship_nomination',
    'Stewardship Nomination',
    'You have been nominated as Steward of ' || v_group.name || '.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
    p_group_id,
    'accept_decline',
    jsonb_build_object(
      'group_id', p_group_id,
      'nominator_group_id', v_actor,
      'nominee_ids', to_jsonb(p_nominee_ids),
      'nominee_rank', 1,
      'total_nominees', array_length(p_nominee_ids, 1)
    ),
    now() + interval '7 days'
  );

  return jsonb_build_object(
    'group_id', p_group_id,
    'nominees_count', array_length(p_nominee_ids, 1)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.respond_to_stewardship_nomination(p_notification_id uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_notification public.notifications%rowtype;
  v_group public.groups%rowtype;
  v_nominator uuid;
  v_nominee_ids uuid[];
  v_rank integer;
  v_steward_role_id uuid;
  v_next uuid;
  v_actor_name text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'responding to a nomination is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Recipient-only, indistinguishably: a ghost id and another member's
  -- notification answer the same (no leak)
  select * into v_notification
    from public.notifications n
   where n.id = p_notification_id
   for update;
  if v_notification.id is null or v_notification.recipient_group_id <> v_actor then
    raise exception 'notification not found' using errcode = 'P0002';
  end if;
  if v_notification.type <> 'stewardship_nomination'
     or v_notification.action_type is distinct from 'accept_decline' then
    raise exception 'not a stewardship nomination' using errcode = '22023';
  end if;
  if v_notification.action_taken is not null then
    raise exception 'this nomination has already been answered' using errcode = 'P0001';
  end if;
  if v_notification.expires_at is not null and v_notification.expires_at < now() then
    -- expiry is predicate-based; no reaper — the group keeps its Steward
    raise exception 'this nomination has expired' using errcode = 'P0001';
  end if;

  -- All state below comes from the SERVER-STORED row — never the caller
  -- (the caller-data-dispatch hole this contract replaces).
  v_nominator := (v_notification.action_data->>'nominator_group_id')::uuid;
  select array_agg(elem::text::uuid) into v_nominee_ids
    from jsonb_array_elements_text(v_notification.action_data->'nominee_ids') as elem;
  v_rank := (v_notification.action_data->>'nominee_rank')::integer;

  -- Staleness guards (contract-side robustness the trusting legacy dispatch
  -- lacked): the group, the nominator, and the nominee must all still be in
  -- the state the offer was made under. Refusals mutate nothing — a stale
  -- unanswered row blocks re-nomination only until its expires_at passes.
  select * into v_group
    from public.groups g
   where g.id = v_notification.group_id and g.group_type = 'engagement';
  if v_group.id is null or v_group.status <> 'active' then
    raise exception 'the group is no longer active — the nomination is stale'
      using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.group_memberships gm
     where gm.group_id = v_group.id and gm.member_group_id = v_nominator
       and gm.status = 'active'
  ) then
    raise exception 'the nomination is stale — stewardship has already changed hands'
      using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.group_memberships gm
     where gm.group_id = v_group.id and gm.member_group_id = v_actor
       and gm.status = 'active'
  ) then
    raise exception 'you are no longer an active member of this group'
      using errcode = 'P0001';
  end if;

  -- Settle the offer
  update public.notifications
     set action_taken = case when p_accept then 'accepted' else 'declined' end,
         action_taken_at = now(),
         is_read = true,
         read_at = coalesce(read_at, now())
   where id = p_notification_id;

  if p_accept then
    -- Grant the nominee the Steward role — TEMPLATE-FIRST resolution with the
    -- legacy short-name fallback (the 'Member'-class bug, fixed)
    select gr.id into v_steward_role_id
      from public.group_roles gr
     where gr.group_id = v_group.id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
     limit 1;
    if v_steward_role_id is null then
      raise exception 'no Steward role found for this group' using errcode = 'P0001';
    end if;
    insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
    values (v_actor, v_group.id, v_steward_role_id, v_nominator)
    on conflict do nothing;

    -- The nominator departs (the leave_group cascade verbatim; the wall
    -- counts the new Steward and allows). DS-3's own disposition (ADR-U047).
    perform public.ds3_lifecycle_member_departed(v_group.id, v_nominator, 'left_group');
    delete from public.user_group_roles
     where group_id = v_group.id and member_group_id = v_nominator;
    -- the existing trigger notifies member_left to the Stewards (the new
    -- Steward among them) — consumed, never duplicated
    delete from public.group_memberships
     where group_id = v_group.id and member_group_id = v_nominator;

    -- The group is told who stewards now (display identity = the personal
    -- group's name, the B-DISP oracle)
    select name into v_actor_name from public.groups where id = v_actor;
    insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
    select gm.member_group_id,
           'stewardship_transferred',
           'New Steward Assigned',
           coalesce(v_actor_name, 'A member') || ' has accepted stewardship of ' || v_group.name || '.',
           jsonb_build_object('group_id', v_group.id, 'group_name', v_group.name,
                              'new_steward_group_id', v_actor),
           v_group.id
      from public.group_memberships gm
     where gm.group_id = v_group.id
       and gm.status = 'active'
       and gm.member_group_id <> v_actor;

    return jsonb_build_object('group_id', v_group.id, 'outcome', 'accepted');
  end if;

  -- Declined: the next-ranked nominee gets a fresh 7-day offer…
  if v_rank < coalesce(array_length(v_nominee_ids, 1), 0) then
    v_next := v_nominee_ids[v_rank + 1];
    insert into public.notifications (
      recipient_group_id, type, title, body, payload, group_id,
      action_type, action_data, expires_at
    ) values (
      v_next,
      'stewardship_nomination',
      'Stewardship Nomination',
      'You have been nominated as Steward of ' || v_group.name || '.',
      jsonb_build_object('group_id', v_group.id, 'group_name', v_group.name),
      v_group.id,
      'accept_decline',
      jsonb_build_object(
        'group_id', v_group.id,
        'nominator_group_id', v_nominator,
        'nominee_ids', to_jsonb(v_nominee_ids),
        'nominee_rank', v_rank + 1,
        'total_nominees', array_length(v_nominee_ids, 1)
      ),
      now() + interval '7 days'
    );
    return jsonb_build_object('group_id', v_group.id, 'outcome', 'declined_next');
  end if;

  -- …or the list is exhausted: the ADR-U019 DeusEx fallback
  perform public._transfer_stewardship_to_deusex(v_group.id, v_nominator);
  return jsonb_build_object('group_id', v_group.id, 'outcome', 'declined_deusex');
end;
$function$
;

-- ----------------------------------------------------------------------------
-- Apply-time verification: the imperative is gone from every live emitter, and
-- the deadline still ships. Fails the migration loudly rather than landing half.
-- ----------------------------------------------------------------------------
DO $verify$
DECLARE v_bad text[];
BEGIN
  SELECT array_agg(p.proname ORDER BY p.proname) INTO v_bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND pg_get_functiondef(p.oid) ILIKE '%Accept or decline%';

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'W-03 #1: imperative body copy still live in: %', array_to_string(v_bad, ', ');
  END IF;

  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prokind = 'f'
        AND p.proname IN ('nominate_steward', 'respond_to_stewardship_nomination')
        AND pg_get_functiondef(p.oid) ILIKE '%interval ''7 days''%') <> 2 THEN
    RAISE EXCEPTION 'W-03 #1: the 7-day expires_at window did not survive the re-issue';
  END IF;

  RAISE NOTICE 'W-03 #1 verified: no imperative emitter remains; both 7-day windows intact.';
END $verify$;
