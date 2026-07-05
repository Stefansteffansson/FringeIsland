-- ============================================================================
-- FEAT-PC014 (Groups Cycle G-E): leadership transfer, closure, and deletion
-- contracts — MEM-7 / MEM-8 / GRP-9
-- ============================================================================
-- nominate_steward: REPLACED IN PLACE (spec Open Q1) — the sprint3 body is
-- re-derived under current authority: template-aware + active-membership
-- Steward resolution (closing the 'Member'-class v2-group bug — a v2-created
-- group names its Steward role 'Steward Role Template', which the legacy
-- name='Steward'-only accept path resolved to nothing — and the
-- paused-Steward-counts blind spot), house no-leak refusals (P0002 precedes
-- every other check), FIM-only + active-account-only gates, and the
-- anon/PUBLIC grant revoked.
--
-- respond_to_stewardship_nomination: NEW, dedicated (spec Open Q2) — replaces
-- the caller-data dispatch that rode the generic handle_notification_action.
-- The nomination state lives entirely in the durable notifications row
-- (sprint3 shape: action_type/action_data/expires_at/action_taken); the
-- contract reads ONLY the server-stored row — never caller-supplied data.
-- Expiry is the expires_at predicate on response; NO reaper is built (an
-- expired or stale nomination refuses response and blocks re-nomination only
-- until its expires_at passes — documented honestly, the PC012 'expired'
-- posture).
--
-- _transfer_stewardship_to_deusex: NEW internal helper (no client execute —
-- the active_steward_count posture): the single re-landing of the sprint2
-- steward_handover branch (ADR-U019), shared by the all-decline fallback and
-- hand_stewardship_to_deusex.
--
-- close_group (MEM-8): NEW — the last ACTIVE member's deliberate terminal
-- act; no permission gate (spec Open Q3: being the last one out is the
-- authority, mirroring the legacy auto-closure). Cascade in the sprint2
-- group_closure order: status→'closed' FIRST (the check_last_leader_removal
-- wall bypasses on 'closed' natively), freeze, journeys→DeusEx, depart.
-- Paused/invited membership rows SURVIVE on the closed tombstone (only the
-- caller departs — the spec's letter; pinned by test).
--
-- delete_group (GRP-9): NEW, soft-terminal (spec Open Q5, the load-bearing
-- gate decision): status→'archived' + cascade + content reassignment; the row
-- survives as a tombstone. This sidesteps the journeys.created_by_group_id
-- ON DELETE RESTRICT wall a hard delete hits, and preserves forum authorship
-- for DS-5/MEM-9.
--   SPEC-PREMISE CORRECTION (for the gate): the spec assumed the last-leader
--   wall "bypasses because status is terminal" — the live trigger body
--   (sprint2, latest definition) bypasses on status='closed' ONLY, not
--   'archived'. Editing the wall is a spec rabbit-hole ("keep their bodies").
--   The cascade therefore rides the ESTABLISHED transaction-local cascade
--   flag app.hard_delete_in_progress — the exact mechanism
--   admin_hard_delete_user (RC7) and the PC002 erasure cascade already use.
--   Under the flag the four flag-aware bodies stand down:
--   prevent_last_leader_removal (the 'archived' gap), notify_role_removed and
--   notify_invitation_declined_or_member_change (whose per-row member_removed
--   / role_removed noise would contradict the single in-contract
--   group_deleted notice), and notify_group_deleted (not reached — no hard
--   DELETE). The DeusEx walls are unaffected (they guard only the DeusEx
--   system group's own rows). The flag is transaction-local (set_config
--   is_local=true) and reset immediately after the two DELETEs.
--
-- Policy narrowing (spec Open Q4, ADR-U038, the PC013/G-A precedents): the
-- raw groups_delete RLS DELETE policy drops — it bypassed freeze,
-- reassignment, and notification, and errored on any journey-owning group
-- anyway (the RESTRICT wall). Post-drop the delete_group contract is the only
-- client-role deletion path; the admin policies and
-- admin_exit_user_from_platform are untouched.
--
-- Grant + surface hygiene (spec Open Q2 default): handle_notification_action
-- and _handle_stewardship_nomination_action are DROPPED. The internal
-- dispatcher carried EXECUTE to anon and PUBLIC and validated NOTHING — a
-- direct PostgREST caller could hand-craft action_data and drive a
-- stewardship grant off-contract (demonstrated red in
-- stewardship-succession.test.ts before this migration). The generic
-- actionable-notification handler is A-NTF's to re-derive under ADR-U039.
--
-- DS-4 (asset disposition) and DS-5 (forum disposition) are TAGGED cascade
-- layers — pending-DS-4 / pending-DS-5, NOT built (D2, ADR-U016): closure and
-- deletion reassign only the substrate-proven layer (non-public journeys →
-- DeusEx). MEM-9 former-member attribution is a separate forward-seam
-- (Communication gate).
--
-- Direct-caller answer for the gate (ADR-U038): after this migration a direct
-- PostgREST caller — including an anonymous-session Mist — can do nothing to
-- stewardship, closure, or deletion that the contracts refuse: the sprint3
-- surface holds no anon/PUBLIC execute (nominate_steward) or is gone
-- (handle_notification_action, _handle_stewardship_nomination_action); raw
-- DELETE on public.groups has no client policy; the PC010 column-grant
-- narrowing already excludes status from direct UPDATE; TRUNCATE stays
-- revoked. No new table, no trigger changes.
--
-- SECURITY DEFINER justification, per function, in the comments below: each
-- must read/write across RLS walls (role rows, other members' memberships,
-- enrolment freezes, journey reassignment, notification inserts) that no
-- client-role policy grants — the composed-cascade work RLS cannot express
-- (ADR-U016). Bodies minimal per the PG17 ceiling; search_path pinned.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Guards: the surfaces this migration narrows/replaces must exist under
--    the expected names (the DROP-IF-EXISTS wrong-name trap — verify first).
-- ----------------------------------------------------------------------------
do $$
declare
  v_policy integer;
  v_fn integer;
begin
  select count(*) into v_policy from pg_policies
   where schemaname = 'public' and tablename = 'groups'
     and policyname = 'groups_delete';
  if v_policy = 0 then
    raise notice 'FEAT-PC014: groups_delete policy already absent (re-apply)';
  end if;

  select count(*) into v_fn from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('nominate_steward', 'handle_notification_action',
                       '_handle_stewardship_nomination_action');
  if v_fn not in (0, 3) then
    raise notice 'FEAT-PC014: sprint3 surface partially present (% of 3) — verify pg_proc', v_fn;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. nominate_steward — MEM-7, REPLACED IN PLACE (spec Open Q1)
-- ----------------------------------------------------------------------------
create or replace function public.nominate_steward(
  p_group_id uuid,
  p_nominee_ids uuid[]
) returns jsonb
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
    'You have been nominated as Steward of ' || v_group.name || '. Accept or decline within 7 days.',
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
$$;

comment on function public.nominate_steward(uuid, uuid[]) is
  'FEAT-PC014 MEM-7 (replaced in place over sprint3): the sole ACTIVE Steward nominates ranked successors — durable stewardship_nomination row (7-day expires_at) to the first nominee; nothing mutates until response. Steward resolution template-first with the name=''Steward'' legacy fallback; sole-ness via active_steward_count (paused co-Stewards are not cover). One nomination in flight per group; no reaper. SECURITY DEFINER: reads role/membership rows and writes another member''s notification across RLS.';

-- ----------------------------------------------------------------------------
-- 2. _transfer_stewardship_to_deusex — internal helper (ADR-U019; the single
--    re-landing of the sprint2 steward_handover branch). No client execute.
-- ----------------------------------------------------------------------------
create or replace function public._transfer_stewardship_to_deusex(
  p_group_id uuid,
  p_departing_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
  v_steward_role_id uuid;
  v_group_name text;
begin
  -- DeusEx resolves by system-label, never a hardcoded id (seeding repair)
  select id into v_deusex
    from public.groups where name = 'DeusEx' and group_type = 'system';
  if v_deusex is null then
    raise exception 'DeusEx system group missing — seeding repair required';
  end if;
  select name into v_group_name from public.groups where id = p_group_id;

  select gr.id into v_steward_role_id
    from public.group_roles gr
   where gr.group_id = p_group_id
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
          or gr.name = 'Steward')
   limit 1;
  if v_steward_role_id is null then
    raise exception 'no Steward role found for group %', p_group_id;
  end if;

  -- A. DeusEx becomes an active member (idempotent — the sprint2 upsert)
  insert into public.group_memberships (group_id, member_group_id, added_by_group_id, status)
  values (p_group_id, v_deusex, p_departing_member_group_id, 'active')
  on conflict (group_id, member_group_id)
    do update set status = 'active', status_changed_at = now();

  -- B. DeusEx holds the Steward role (idempotent)
  insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (v_deusex, p_group_id, v_steward_role_id, p_departing_member_group_id)
  on conflict do nothing;

  -- C. Pending invitations transfer to DeusEx (both invitation channels)
  update public.group_memberships
     set added_by_group_id = v_deusex
   where group_id = p_group_id
     and status = 'invited'
     and added_by_group_id = p_departing_member_group_id;
  update public.pending_email_invitations
     set invited_by_group_id = v_deusex
   where group_id = p_group_id
     and invited_by_group_id = p_departing_member_group_id
     and status = 'pending';

  -- D. The departing member's exit (the leave_group shape verbatim):
  --    freeze own active enrolments in this group's non-public journeys
  --    (DS-3 satisfied-now disposition, re-verified at the Journeys gate)
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'left_group',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and je.group_id = p_departing_member_group_id
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status = 'active';

  -- E. roles (safe — DeusEx now stewards, the wall counts 1 remaining)
  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = p_departing_member_group_id;

  -- F. membership (the existing trigger notifies member_left to the Stewards
  --    — DeusEx among them now; consumed, never duplicated)
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = p_departing_member_group_id;

  -- G. remaining active members are told (durable rows; no dispatch — D8)
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id,
         'stewardship_transferred',
         'Stewardship Change',
         'FringeIsland has temporarily assumed stewardship of ' || v_group_name || '.',
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group_name,
                            'scenario', 'deusex_fallback'),
         p_group_id
    from public.group_memberships gm
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_deusex;

  -- H. DeusEx is asked to find a permanent Steward
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  values (
    v_deusex,
    'stewardship_required',
    'Stewardship Required',
    v_group_name || ' requires a permanent Steward. Please review and assign.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group_name),
    p_group_id
  );
end;
$$;

comment on function public._transfer_stewardship_to_deusex(uuid, uuid) is
  'FEAT-PC014 internal helper (ADR-U019, the sprint2 steward_handover branch re-landed): DeusEx becomes active member + Steward, pending invitations transfer, the departing member exits with the leave cascade, members + DeusEx are notified. Shared by the all-decline fallback and hand_stewardship_to_deusex. SECURITY DEFINER: composed cross-member cascade. Internal-only — no client execute (the active_steward_count posture).';

-- ----------------------------------------------------------------------------
-- 3. respond_to_stewardship_nomination — MEM-7, NEW (spec Open Q2)
-- ----------------------------------------------------------------------------
create or replace function public.respond_to_stewardship_nomination(
  p_notification_id uuid,
  p_accept boolean
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
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
    -- counts the new Steward and allows)
    update public.journey_enrollments je
       set status = 'frozen',
           progress_data = je.progress_data || jsonb_build_object(
             'frozen_reason', 'left_group',
             'frozen_at', now()::text
           ),
           status_changed_at = now()
      from public.journeys j
     where je.journey_id = j.id
       and je.group_id = v_nominator
       and j.created_by_group_id = v_group.id
       and j.is_public = false
       and je.status = 'active';
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
      'You have been nominated as Steward of ' || v_group.name || '. Accept or decline within 7 days.',
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
$$;

comment on function public.respond_to_stewardship_nomination(uuid, boolean) is
  'FEAT-PC014 MEM-7 (replaces the generic handle_notification_action dispatch — Open Q2): the nominated member accepts (template-aware Steward grant + the nominator''s leave cascade + group notice) or declines (fresh 7-day offer to the next-ranked nominee, or the ADR-U019 DeusEx fallback when exhausted). Recipient-only (P0002 no-leak); expired/answered/stale refuse P0001 mutating nothing; every dispatch input is the server-stored notification row, never caller data. SECURITY DEFINER: composed cross-member cascade + cross-RLS notification writes.';

-- ----------------------------------------------------------------------------
-- 4. hand_stewardship_to_deusex — MEM-7, NEW (ADR-U019 last resort)
-- ----------------------------------------------------------------------------
create or replace function public.hand_stewardship_to_deusex(
  p_group_id uuid
) returns jsonb
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
  v_is_steward boolean;
  v_active_members integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'handing over stewardship is FIM-only' using errcode = '42501';
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
    raise exception 'cannot hand over a group that is not active' using errcode = 'P0001';
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
  if not v_is_steward then
    raise exception 'only the group''s Steward can hand stewardship to FringeIsland'
      using errcode = 'P0001';
  end if;
  if public.active_steward_count(p_group_id, v_actor) > 0 then
    raise exception 'you are not the sole active Steward — regular leave applies'
      using errcode = 'P0001';
  end if;

  -- Handing to DeusEx is for groups with members to keep; the last member's
  -- exit is closure (MEM-8)
  select count(*) into v_active_members
    from public.group_memberships
   where group_id = p_group_id and status = 'active';
  if v_active_members = 1 then
    raise exception 'you are the group''s last member — close the group instead'
      using errcode = 'P0001';
  end if;

  perform public._transfer_stewardship_to_deusex(p_group_id, v_actor);

  return jsonb_build_object(
    'group_id', p_group_id,
    'group_name', v_group.name,
    'deusex_assigned', true
  );
end;
$$;

comment on function public.hand_stewardship_to_deusex(uuid) is
  'FEAT-PC014 MEM-7 (ADR-U019): the sole ACTIVE Steward''s immediate last-resort exit when there is no one to nominate — DeusEx becomes member + Steward, pending invitations transfer, the caller departs with the leave cascade, members + DeusEx are notified (via _transfer_stewardship_to_deusex). Last-remaining-member callers are pointed at close_group (P0001). SECURITY DEFINER: composed cascade.';

-- ----------------------------------------------------------------------------
-- 5. close_group — MEM-8, NEW (spec Open Q3: no permission gate — being the
--    last active member is the authority)
-- ----------------------------------------------------------------------------
create or replace function public.close_group(
  p_group_id uuid
) returns jsonb
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
  v_deusex uuid;
  v_journeys integer := 0;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'closing a group is FIM-only' using errcode = '42501';
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
    raise exception 'cannot close a group that is not active' using errcode = 'P0001';
  end if;

  select count(*) into v_active_members
    from public.group_memberships
   where group_id = p_group_id and status = 'active';
  if v_active_members <> 1 then
    raise exception 'you are not the only member; leave or transfer instead'
      using errcode = 'P0001';
  end if;

  select id into v_deusex
    from public.groups where name = 'DeusEx' and group_type = 'system';

  -- The sprint2 group_closure order, verbatim:
  -- A. status → 'closed' FIRST (check_last_leader_removal bypasses natively)
  update public.groups set status = 'closed' where id = p_group_id;

  -- B. freeze (DS-3 satisfied-now disposition; thaw is DS-3's when Journeys
  --    activates): (1) every active enrolment in this group's non-public
  --    journeys, (2) every active group-level enrolment the group itself
  --    holds — both sprint2 shapes
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'group_closed',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status = 'active';
  update public.journey_enrollments
     set status = 'frozen',
         progress_data = progress_data || jsonb_build_object(
           'frozen_reason', 'group_closed',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
   where group_id = p_group_id
     and status = 'active';

  -- C. owned non-public journeys → DeusEx (the substrate-proven content
  --    layer; DS-4 asset + DS-5 forum dispositions are TAGGED pending-DS-4 /
  --    pending-DS-5, not executed)
  select count(*) into v_journeys
    from public.journeys
   where created_by_group_id = p_group_id and is_public = false;
  if v_journeys > 0 then
    update public.journeys
       set created_by_group_id = v_deusex
     where created_by_group_id = p_group_id and is_public = false;
    insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
    values (
      v_deusex,
      'group_closed',
      'Group Closed',
      v_group.name || ' has been closed. ' || v_journeys || ' non-public journey(s) require review.',
      jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name,
                         'journey_count', v_journeys),
      p_group_id
    );
  end if;

  -- D+E. the caller departs (roles then membership — the member_left branch
  -- finds no Stewards after the role delete and stays silent). Paused or
  -- invited rows, if any, SURVIVE on the closed tombstone (the spec's letter:
  -- only the caller departs; GRP-5 renders the closed state).
  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = v_actor;
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;

  -- DS-5 former-member attribution: pending-DS-5, NOT built (D2) — MEM-9's
  -- forward-seam (Communication gate).
  return jsonb_build_object(
    'group_id', p_group_id,
    'group_name', v_group.name,
    'journeys_transferred', v_journeys
  );
end;
$$;

comment on function public.close_group(uuid) is
  'FEAT-PC014 MEM-8: the last ACTIVE member''s deliberate closure — status=''closed'' first (native wall bypass), both sprint2 freeze shapes (frozen_reason=group_closed), owned non-public journeys → DeusEx + DeusEx notice, caller departs. No permission gate (Open Q3: last-member-ness is the authority). The row persists as a closed tombstone (content + attribution survive for MEM-9); DS-4/DS-5 dispositions tagged pending-*, not executed. SECURITY DEFINER: composed cascade across RLS.';

-- ----------------------------------------------------------------------------
-- 6. delete_group — GRP-9, NEW (spec Open Q5: soft-terminal 'archived')
-- ----------------------------------------------------------------------------
create or replace function public.delete_group(
  p_group_id uuid
) returns jsonb
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
  v_deusex uuid;
  v_journeys integer := 0;
  v_notified integer := 0;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'deleting a group is FIM-only' using errcode = '42501';
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
    raise exception 'cannot delete a group that is not active' using errcode = 'P0001';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'delete_group'), false) then
    raise exception 'delete_group permission required' using errcode = '42501';
  end if;

  select id into v_deusex
    from public.groups where name = 'DeusEx' and group_type = 'system';

  -- A. status → 'archived' first (the intent-distinguishing terminal state —
  --    'closed' = ran its course, 'archived' = deliberately retired)
  update public.groups set status = 'archived' where id = p_group_id;

  -- B. freeze, both shapes (frozen_reason=group_archived)
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'group_archived',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status = 'active';
  update public.journey_enrollments
     set status = 'frozen',
         progress_data = progress_data || jsonb_build_object(
           'frozen_reason', 'group_archived',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
   where group_id = p_group_id
     and status = 'active';

  -- C. owned non-public journeys → DeusEx (+ the review notice — the closure
  --    parity choice, flagged for the gate; DS-4/DS-5 tagged pending-*)
  select count(*) into v_journeys
    from public.journeys
   where created_by_group_id = p_group_id and is_public = false;
  if v_journeys > 0 then
    update public.journeys
       set created_by_group_id = v_deusex
     where created_by_group_id = p_group_id and is_public = false;
    insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
    values (
      v_deusex,
      'group_archived',
      'Group Archived',
      v_group.name || ' has been archived. ' || v_journeys || ' non-public journey(s) require review.',
      jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name,
                         'journey_count', v_journeys),
      p_group_id
    );
  end if;

  -- D. the in-contract member notices (the notify_group_deleted trigger fires
  --    only on hard DELETE, which this deliberately is not) — every OTHER
  --    active member; content-minimal (ids + group name, no member PII)
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id,
         'group_deleted',
         'Group Deleted',
         'The group "' || v_group.name || '" has been deleted.',
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor;
  get diagnostics v_notified = row_count;

  -- E. the cascade departures, silenced at the per-row trigger layer via the
  --    ESTABLISHED transaction-local cascade flag (see the header: the
  --    last-leader wall bypasses only on status='closed', and the per-row
  --    member_removed/role_removed notices would contradict the single
  --    in-contract group_deleted notice). Transaction-local; reset after.
  perform set_config('app.hard_delete_in_progress', 'true', true);
  delete from public.user_group_roles
   where group_id = p_group_id;
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id <> v_actor;
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;
  perform set_config('app.hard_delete_in_progress', '', true);

  return jsonb_build_object(
    'group_id', p_group_id,
    'group_name', v_group.name,
    'journeys_transferred', v_journeys,
    'members_notified', v_notified
  );
end;
$$;

comment on function public.delete_group(uuid) is
  'FEAT-PC014 GRP-9 (soft-terminal, Open Q5): the delete_group holder''s deliberate ending — status=''archived'' (tombstone; sidesteps the journeys RESTRICT wall, preserves forum authorship for DS-5/MEM-9), both freeze shapes (frozen_reason=group_archived), owned non-public journeys → DeusEx, in-contract group_deleted notices to every other active member, then EVERY membership departs (caller last) under the established transaction-local cascade flag (app.hard_delete_in_progress — the admin-hard-delete/PC002 mechanism; the last-leader wall admits only ''closed'' natively and the per-row notify triggers would spam member_removed/role_removed). SECURITY DEFINER: composed cascade across RLS.';

-- ----------------------------------------------------------------------------
-- 7. The sprint3 generic dispatch surface drops (spec Open Q2 default): the
--    internal dispatcher validated nothing and carried EXECUTE to anon +
--    PUBLIC — the live ADR-U038 hole this feature closes. The generic
--    actionable-notification handler is A-NTF's to re-derive (ADR-U039).
-- ----------------------------------------------------------------------------
drop function if exists public.handle_notification_action(uuid, text);
drop function if exists public._handle_stewardship_nomination_action(uuid, uuid, jsonb, text);

-- ----------------------------------------------------------------------------
-- 8. Policy narrowing (spec Open Q4): the raw client-role DELETE path drops.
--    Name verified against pg_policies in the Section 0 guard.
-- ----------------------------------------------------------------------------
drop policy if exists "groups_delete" on public.groups;

-- ----------------------------------------------------------------------------
-- 9. Grants — clients call via PostgREST RPC; gating is internal. The
--    replaced nominate_steward loses the sprint3 anon/PUBLIC execute; the
--    internal helper holds no client execute at all.
--    NOTE (build finding, gate item): Supabase's ALTER DEFAULT PRIVILEGES
--    grants EXECUTE on every NEW public function DIRECTLY to anon (and
--    authenticated) — revoking from PUBLIC alone leaves the anon grant live.
--    Every revoke below therefore names anon explicitly. The same posture
--    holds on the PC010–PC013 contracts (all internally FIM-gated, so inert)
--    — routed to the standing pre-partition grant sweep, not fixed here.
-- ----------------------------------------------------------------------------
revoke all on function public.nominate_steward(uuid, uuid[]) from public;
revoke all on function public.nominate_steward(uuid, uuid[]) from anon;
revoke all on function public.respond_to_stewardship_nomination(uuid, boolean) from public;
revoke all on function public.respond_to_stewardship_nomination(uuid, boolean) from anon;
revoke all on function public.hand_stewardship_to_deusex(uuid) from public;
revoke all on function public.hand_stewardship_to_deusex(uuid) from anon;
revoke all on function public.close_group(uuid) from public;
revoke all on function public.close_group(uuid) from anon;
revoke all on function public.delete_group(uuid) from public;
revoke all on function public.delete_group(uuid) from anon;
revoke all on function public._transfer_stewardship_to_deusex(uuid, uuid) from public;
revoke all on function public._transfer_stewardship_to_deusex(uuid, uuid) from anon, authenticated;

grant execute on function public.nominate_steward(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.respond_to_stewardship_nomination(uuid, boolean) to authenticated, service_role;
grant execute on function public.hand_stewardship_to_deusex(uuid) to authenticated, service_role;
grant execute on function public.close_group(uuid) to authenticated, service_role;
grant execute on function public.delete_group(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. Verification
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('handle_notification_action', '_handle_stewardship_nomination_action')
  ) then
    raise exception 'FEAT-PC014: the sprint3 dispatch surface still exists';
  end if;
  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'groups' and policyname = 'groups_delete'
  ) then
    raise exception 'FEAT-PC014: groups_delete policy still exists';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('nominate_steward', 'respond_to_stewardship_nomination',
                         'hand_stewardship_to_deusex', 'close_group', 'delete_group',
                         '_transfer_stewardship_to_deusex')
       and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'FEAT-PC014: anon still holds EXECUTE on the PC014 surface';
  end if;
  if has_function_privilege('authenticated', 'public._transfer_stewardship_to_deusex(uuid, uuid)', 'EXECUTE') then
    raise exception 'FEAT-PC014: the internal helper is client-executable';
  end if;
  raise notice 'FEAT-PC014 verified: 5 contracts + internal helper live; sprint3 dispatch surface gone; groups_delete dropped; grants hardened';
end $$;
