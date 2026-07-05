-- ============================================================================
-- FIX (FEAT-PC012, post-6-done): invite duplicates leaked the raw Postgres
-- unique-constraint text to the caller and the UI.
-- ============================================================================
-- Reported 2026-07-05: inviting someone who already has a membership row in the
-- group surfaced
--   "duplicate key value violates unique constraint
--    group_memberships_group_id_member_group_id_key"
-- verbatim on screen. Root cause: invite_member (and invite_by_email's
-- existing-FIM conversion branch) did a bare INSERT into group_memberships and
-- relied on the unique constraint to reject duplicates — the raised message is
-- Postgres' low-level default, and the H015 BFF forwards the contract message
-- through (it maps 23505 -> HTTP 409 and shows message ?? 'Already invited';
-- the raw message wins because it is non-empty).
--
-- Fix: pre-check for an existing (group_id, member_group_id) membership row and
-- raise a human, state-specific message (already a member / pending invitation
-- / paused member). The errcode stays 23505 — the BFF already maps it to 409
-- and the PC012 duplicate tests assert that code — so no route or test-contract
-- change is forced; only the message a user sees changes. A concurrency
-- backstop (INSERT wrapped in a unique_violation handler) guarantees the raw
-- text can never leak even on a race between the pre-check and the INSERT.
--
-- Scope note (ADR-U040): invite_by_email is slated for retirement under the
-- ratified referral model (email-as-membership is being replaced). It is still
-- live until that rebuild lands, and the reported bug came through its
-- conversion branch, so its conversion branch is fixed here too. The pure-email
-- duplicate (pending_email_invitations) already raised a clean message and is
-- untouched.
--
-- No schema change: two function bodies replaced (CREATE OR REPLACE preserves
-- the existing authenticated/service_role grants — restated below for
-- auditability, and to re-assert the no-anon posture). No new table, no trigger
-- changes, no policy changes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. invite_member — MEM-1 (pre-check + backstop added; all gates unchanged)
-- ----------------------------------------------------------------------------
create or replace function public.invite_member(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
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
  v_target_is_temporary boolean;
  v_existing_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'inviting is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;

  -- Invitable target = a FIM's personal group. Anything else (ghost id,
  -- engagement group, a Mist's proto-group) is P0002, indistinguishably.
  select u.is_temporary into v_target_is_temporary
    from public.users u where u.personal_group_id = p_member_group_id;
  if v_target_is_temporary is distinct from false then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  -- FIX: a pre-existing membership row (any status) collides on the
  -- (group_id, member_group_id) unique key. Pre-check for a specific, human
  -- message; keep errcode 23505 (the BFF maps it to 409). The raw INSERT
  -- previously leaked the constraint name to the caller and the UI.
  select gm.status into v_existing_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_existing_status is not null then
    raise exception '%',
      case v_existing_status
        when 'active'  then 'this person is already a member of the group'
        when 'invited' then 'this person already has a pending invitation to the group'
        when 'paused'  then 'this person is a paused member of the group'
        else 'this person already has a membership record in the group'
      end
      using errcode = '23505';
  end if;

  -- notify_invitation_received writes the durable notification row (trigger).
  -- Concurrency backstop: a row inserted between the pre-check and here (a
  -- race) must not leak the raw constraint text either.
  begin
    insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
    values (p_group_id, p_member_group_id, 'invited', v_actor);
  exception when unique_violation then
    raise exception 'this person already has a membership record in the group'
      using errcode = '23505';
  end;
end;
$$;

comment on function public.invite_member(uuid, uuid) is
  'FEAT-PC012 MEM-1: invite an existing FIM (by personal-group id) into an engagement group. invite_members-gated; mirrors the memberships_insert_invite RLS predicate (status=invited, added_by = actor); non-invitable targets P0002 no-leak. Duplicates refuse 23505 with a human, state-specific message (already a member / pending invitation / paused) — pre-checked, with a unique_violation backstop for races so the raw constraint text never leaks (fix 2026-07-05). The durable invitation-received notification row is written by the existing trigger.';

-- ----------------------------------------------------------------------------
-- 2. invite_by_email — MEM-2 (conversion branch pre-check + backstop added).
--    Live until the ADR-U040 referral rebuild retires this path; the pure-email
--    duplicate already raised a clean message and is unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.invite_by_email(
  p_group_id uuid,
  p_email text
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
  v_email text;
  v_existing_pg uuid;
  v_existing_is_temporary boolean;
  v_existing_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'inviting is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;

  -- Open Q2: an email already belonging to a FIM converts server-side to a
  -- membership invitation — a pending email row for an existing account would
  -- never auto-claim (sign-up is the only claim trigger). Mists hold no email
  -- by design (ADR-U031); a temporary match is treated as no-FIM.
  select u.personal_group_id, u.is_temporary
    into v_existing_pg, v_existing_is_temporary
    from public.users u where lower(u.email) = v_email;
  if v_existing_pg is not null and v_existing_is_temporary = false then
    -- FIX: same clean-conflict pre-check as invite_member (the conversion
    -- branch did the raw INSERT that leaked the constraint text).
    select gm.status into v_existing_status
      from public.group_memberships gm
     where gm.group_id = p_group_id and gm.member_group_id = v_existing_pg;
    if v_existing_status is not null then
      raise exception '%',
        case v_existing_status
          when 'active'  then 'this person is already a member of the group'
          when 'invited' then 'this person already has a pending invitation to the group'
          when 'paused'  then 'this person is a paused member of the group'
          else 'this person already has a membership record in the group'
        end
        using errcode = '23505';
    end if;
    begin
      insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
      values (p_group_id, v_existing_pg, 'invited', v_actor);
    exception when unique_violation then
      raise exception 'this person already has a membership record in the group'
        using errcode = '23505';
    end;
    return jsonb_build_object('kind', 'member_invitation');
  end if;

  -- Case-insensitive duplicate guard (the unique constraint is case-sensitive;
  -- one refusal shape for both — 23505). NO dispatch: the D4 / V3 seam — the
  -- invitation is durable and auto-claims at sign-up (handle_new_user Step 8).
  if exists (select 1 from public.pending_email_invitations pei
              where pei.group_id = p_group_id
                and lower(pei.invited_email) = v_email
                and pei.status = 'pending') then
    raise exception 'an invitation for this email is already pending' using errcode = '23505';
  end if;

  insert into public.pending_email_invitations (group_id, invited_email, invited_by_group_id)
  values (p_group_id, v_email, v_actor);
  return jsonb_build_object('kind', 'email_invitation');
end;
$$;

comment on function public.invite_by_email(uuid, text) is
  'FEAT-PC012 MEM-2 (D4): invite a non-FIM by email — durable pending_email_invitations row (30-day expiry by column default, lowercased), NO email dispatch (the V3 seam; claim happens at sign-up via handle_new_user Step 8). invite_members-gated; malformed email 22023; case-insensitive duplicate 23505; an existing FIM''s email converts server-side to a membership invitation (Open Q2), whose duplicate now raises the same human, state-specific 23505 message as invite_member with a unique_violation backstop (fix 2026-07-05). Slated for retirement under ADR-U040 (referral model).';

-- ----------------------------------------------------------------------------
-- 3. Grants — restated for auditability (CREATE OR REPLACE preserved the PC012
--    grants; no anon execute is introduced — the finding-4 posture).
-- ----------------------------------------------------------------------------
revoke all on function public.invite_member(uuid, uuid) from public, anon;
revoke all on function public.invite_by_email(uuid, text) from public, anon;
grant execute on function public.invite_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.invite_by_email(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Verification
-- ----------------------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon', 'public.invite_member(uuid, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.invite_by_email(uuid, text)', 'EXECUTE') then
    raise exception 'FIX PC012: anon holds EXECUTE on an invite contract';
  end if;
  raise notice 'FIX PC012 verified: invite_member / invite_by_email replaced with clean duplicate messages; no anon execute';
end $$;
