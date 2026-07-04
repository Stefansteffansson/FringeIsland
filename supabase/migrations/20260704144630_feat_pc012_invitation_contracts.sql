-- FEAT-PC012 (Groups Cycle G-C): group invitation & joining contracts.
-- Nine member-facing SECURITY DEFINER functions over the existing PC-3
-- invitation substrate (group_memberships invited-status path +
-- pending_email_invitations) — NO new table, NO policy changes: the
-- invite/accept/decline/cancel RLS was audited as substantively correct
-- (2026-07-04) and stays as defense-in-depth beneath the contracts. Plus the
-- erase_fim_account amendment (Art. 17 over pending_email_invitations — the
-- FEAT-PC002 gap found at decomposition) and TRUNCATE hygiene.
--
-- SECURITY DEFINER rationale (privilege-escalation surfaces, documented per
-- platform discipline):
--   * search/read functions must see users/groups/memberships rows the SELECT
--     policies hide from some callers (the search corpus; the pending list's
--     invitee identities; the P0002 no-leak distinction) while self-gating
--     strictly on the caller's own permissions via has_permission().
--   * accept/decline compose the EXISTING self-scoped RLS semantics
--     (memberships_update_accept / memberships_delete_leave) and ride the
--     existing auto_assign_member_role_on_accept / auto_assign_deusex_role_
--     on_accept / notify_invitation_* triggers — durable notification rows are
--     written by the substrate, never duplicated here.
-- Every function resolves the actor via get_current_personal_group_id()
-- (P-O1) and declares search_path = ''. No role-name strings anywhere —
-- permission-derived gates only (ADR-U007). Writes are FIM-only +
-- active-account-only; reads FIM-only (the PC010/PC011 posture).
--
-- Spec Open-Q defaults carried (rule at the gate):
--   Q1 — search email matching is EXACT-only (case-insensitive); partial-email
--        matching is an enumeration primitive against a PII field and is not
--        carried over from legacy. Name matching stays partial (ilike, cap 8).
--   Q2 — invite_by_email on an email already belonging to a FIM converts
--        server-side to a membership invitation (a pending email row for an
--        existing account would NEVER auto-claim — sign-up is the only claim
--        trigger). No pending_email_invitations row is created.
--   Q3 — get_group_invitations (and the cancels) are invite_members-gated:
--        the pending list carries third-party email addresses (PII).
--   Q4 — erasure deletes pending email invitations addressed to the erased
--        email (unclaimed offers, not consent proof — the ADR-U034
--        retain-pattern does not apply).
--
-- Direct-path residue (recorded for the gate, per the G-B posture — surfaced,
-- not unilaterally narrowed): pending_email_invitations INSERT remains
-- RLS-permitted for invite_members holders; the direct path bypasses the
-- contract's email validation, lowercasing, and existing-FIM conversion. The
-- worst case is a stranded/malformed pending row visible only to
-- invite_members holders; auto-claim compares LOWER() so case is immaterial.
-- Also: 'invitable FIM' means is_temporary = false — a SUSPENDED FIM can be
-- invited directly by id (they answer after reactivation) but is hidden from
-- search results (spec STORY-1 AC-3); expiry is predicate-based (expires_at),
-- nothing transitions status to 'expired' and no reaper is built.
--
-- BUILD-DISCOVERED SUBSTRATE DEFECT (fixed in section 11, red-demonstrated by
-- this feature's STORY-5 accept test): auto_assign_member_role_on_accept
-- looked up the default role by name = 'Member', but every v2-created group
-- (create_engagement_group, G-A) names its instances verbatim after templates
-- ('Member Role Template') — so an accepted invitee received NO role, silently
-- (zero permissions in the group). Fixed by resolving the Member-template-
-- DERIVED instance first (created_from_role_template_id linkage — the same key
-- the deletion-protection rule uses), with the short-name lookup kept as the
-- fallback for legacy pre-G-A groups. Trigger fix, not a policy change.

-- ---------------------------------------------------------------------------
-- 1. search_invitable_members — MEM-1 search (D3; the DS-6 re-home seam)
-- ---------------------------------------------------------------------------

create or replace function public.search_invitable_members(
  p_group_id uuid,
  p_query text
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_query text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'member search is FIM-only' using errcode = '42501';
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

  v_query := trim(coalesce(p_query, ''));
  if v_query = '' then
    raise exception 'search query required' using errcode = '22023';
  end if;

  -- Name-partial OR exact-email (Open Q1). Invitable = FIM (is_temporary =
  -- false) with an active account; suspended accounts and the [Deleted User]
  -- sentinel (is_active = false) never appear. No email in the payload.
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'member_group_id', hits.personal_group_id,
              'display_name', hits.name,
              'membership_status', hits.status))
       from (select u.personal_group_id, pg.name, gm.status
               from public.users u
               join public.groups pg on pg.id = u.personal_group_id
               left join public.group_memberships gm
                 on gm.group_id = p_group_id
                and gm.member_group_id = u.personal_group_id
              where u.is_temporary = false
                and u.is_active = true
                and (pg.name ilike '%' || v_query || '%'
                     or lower(u.email) = lower(v_query))
              order by pg.name
              limit 8) hits),
    '[]'::jsonb);
end;
$$;

comment on function public.search_invitable_members(uuid, text) is
  'FEAT-PC012 MEM-1 search (D3 — DS-6 re-home seam): invitation-scoped FIM typeahead. Name-partial ilike + EXACT case-insensitive email match (Open Q1), cap 8; invite_members-gated in the target group; payload carries member_group_id/display_name/membership_status — never email addresses. Mists, suspended accounts, the [Deleted User] sentinel excluded.';

-- ---------------------------------------------------------------------------
-- 2. invite_member — MEM-1
-- ---------------------------------------------------------------------------

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

  -- Duplicate invite / already-member surfaces the unique constraint (23505).
  -- notify_invitation_received writes the durable notification row (trigger).
  insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
  values (p_group_id, p_member_group_id, 'invited', v_actor);
end;
$$;

comment on function public.invite_member(uuid, uuid) is
  'FEAT-PC012 MEM-1: invite an existing FIM (by personal-group id) into an engagement group. invite_members-gated; mirrors the memberships_insert_invite RLS predicate (status=invited, added_by = actor); non-invitable targets P0002 no-leak; duplicates surface 23505; the durable invitation-received notification row is written by the existing trigger.';

-- ---------------------------------------------------------------------------
-- 3. invite_by_email — MEM-2 (D4: durable + claimable, NO dispatch)
-- ---------------------------------------------------------------------------

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
    insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
    values (p_group_id, v_existing_pg, 'invited', v_actor);
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
  'FEAT-PC012 MEM-2 (D4): invite a non-FIM by email — durable pending_email_invitations row (30-day expiry by column default, lowercased), NO email dispatch (the V3 seam; claim happens at sign-up via handle_new_user Step 8). invite_members-gated; malformed email 22023; case-insensitive duplicate 23505; an existing FIM''s email converts server-side to a membership invitation (Open Q2).';

-- ---------------------------------------------------------------------------
-- 4. get_group_invitations — the Steward pending list (invite_members-gated)
-- ---------------------------------------------------------------------------

create or replace function public.get_group_invitations(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'the pending list is FIM-only' using errcode = '42501';
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

  -- Open Q3: the list carries third-party email addresses — invite_members only.
  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'group_id', v_group.id,
    'member_invitations', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'member_group_id', gm.member_group_id,
                'display_name', pg.name,
                'invited_at', gm.added_at,
                'invited_by_display_name', ib.name)
              order by gm.added_at)
         from public.group_memberships gm
         join public.groups pg on pg.id = gm.member_group_id
         left join public.groups ib on ib.id = gm.added_by_group_id
        where gm.group_id = p_group_id and gm.status = 'invited'),
      '[]'::jsonb),
    'email_invitations', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', pei.id,
                'invited_email', pei.invited_email,
                'created_at', pei.created_at,
                'expires_at', pei.expires_at,
                'expired', (pei.expires_at <= now()))
              order by pei.created_at)
         from public.pending_email_invitations pei
        where pei.group_id = p_group_id and pei.status = 'pending'),
      '[]'::jsonb));
end;
$$;

comment on function public.get_group_invitations(uuid) is
  'FEAT-PC012 STORY-4 read: the group''s outstanding invitations, both kinds — membership invitations (invitee/inviter display identity, invited_at) and pending email invitations (address, expiry, honest predicate-based expired flag — no reaper exists). invite_members-gated (Open Q3: third-party emails are PII); G-A visibility rule beneath (P0002 no-leak).';

-- ---------------------------------------------------------------------------
-- 5. cancel_member_invitation / 6. cancel_email_invitation
-- ---------------------------------------------------------------------------

create or replace function public.cancel_member_invitation(
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
  v_deleted integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'cancelling invitations is FIM-only' using errcode = '42501';
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

  delete from public.group_memberships
   where group_id = p_group_id
     and member_group_id = p_member_group_id
     and status = 'invited';
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.cancel_member_invitation(uuid, uuid) is
  'FEAT-PC012 STORY-4: revoke a pending membership invitation (delete, never status-flip). invite_members-gated; missing/answered invitations P0002.';

create or replace function public.cancel_email_invitation(p_invitation_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group_id uuid;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'cancelling invitations is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select pei.group_id into v_group_id
    from public.pending_email_invitations pei
   where pei.id = p_invitation_id and pei.status = 'pending';
  if v_group_id is null then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  -- No-leak: a caller who cannot see the group (or lacks the permission) gets
  -- the same P0002 an absent invitation gets — an invitation id never oracles.
  select * into v_group
    from public.groups g
   where g.id = v_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = v_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active'))
     or not coalesce(public.has_permission(v_actor, v_group_id, 'invite_members'), false) then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  delete from public.pending_email_invitations where id = p_invitation_id;
end;
$$;

comment on function public.cancel_email_invitation(uuid) is
  'FEAT-PC012 STORY-4: revoke a pending email invitation by id. invite_members-gated in the invitation''s group; every refusal path is P0002 so an invitation id never oracles group visibility or permission state.';

-- ---------------------------------------------------------------------------
-- 7. get_my_invitations — the invitee's window (MEM-3 read)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_invitations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'invitations are FIM-only' using errcode = '42501';
  end if;

  -- The invitation CONTEXT only — name/description/visibility/inviter — never
  -- group detail (an invited FIM cannot view a private group; legacy-consistent).
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'group_id', g.id,
              'group_name', g.name,
              'group_description', g.description,
              'is_public', g.is_public,
              'invited_at', gm.added_at,
              'invited_by_display_name', ib.name)
            order by gm.added_at desc)
       from public.group_memberships gm
       join public.groups g on g.id = gm.group_id and g.group_type = 'engagement'
       left join public.groups ib on ib.id = gm.added_by_group_id
      where gm.member_group_id = v_actor and gm.status = 'invited'),
    '[]'::jsonb);
end;
$$;

comment on function public.get_my_invitations() is
  'FEAT-PC012 MEM-3 read: the caller''s own pending invitations — the invitation context (group name/description/visibility, inviter display name, when), deliberately never group detail. The only window onto invited memberships (get_member_groups/get_group_detail filter status=active by design). Auto-claimed-at-signup invitations appear identically.';

-- ---------------------------------------------------------------------------
-- 8. accept_group_invitation / 9. decline_group_invitation — MEM-3
-- ---------------------------------------------------------------------------

create or replace function public.accept_group_invitation(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_updated integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'joining is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Self-scoped: exactly the memberships_update_accept RLS semantics. The
  -- existing triggers do the rest (Member-role auto-bind, accepted-notification).
  update public.group_memberships
     set status = 'active', status_changed_at = now()
   where group_id = p_group_id
     and member_group_id = v_actor
     and status = 'invited';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'no pending invitation' using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.accept_group_invitation(uuid) is
  'FEAT-PC012 MEM-3: accept the caller''s own pending invitation (invited->active, self-scoped — the memberships_update_accept semantics composed). The existing auto_assign_member_role_on_accept and notify_invitation_accepted triggers fire; no pending invitation is P0002.';

create or replace function public.decline_group_invitation(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_deleted integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'declining is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  delete from public.group_memberships
   where group_id = p_group_id
     and member_group_id = v_actor
     and status = 'invited';
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'no pending invitation' using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.decline_group_invitation(uuid) is
  'FEAT-PC012 MEM-3: decline the caller''s own pending invitation (row deleted — re-invitation stays possible; the memberships_delete_leave semantics composed). notify_invitation_declined_or_member_change fires; no pending invitation is P0002.';

-- ---------------------------------------------------------------------------
-- 10. erase_fim_account — Art. 17 amendment (FEAT-PC012 STORY-6, closing the
--     FEAT-PC002 gap): pending email invitations addressed to the erased
--     account's email are unclaimed offers carrying PII — deleted (Open Q4).
--     Full-body replacement; the ONLY change is the email capture + step 3b.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.erase_fim_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target_personal_group_id uuid;
  v_target_is_temporary boolean;
  v_target_email text;
  v_anonymised_count integer := 0;
  v_invitations_deleted integer := 0;
  v_teardown jsonb;
BEGIN
  -- 1. Authorize: platform admin only (mirrors admin_hard_delete_user).
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(
       v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
     ) THEN
    RAISE EXCEPTION 'erase_fim_account: unauthorized — manage_all_groups permission required'
      USING ERRCODE = '42501';
  END IF;

  SELECT personal_group_id, is_temporary, lower(email)
    INTO v_target_personal_group_id, v_target_is_temporary, v_target_email
    FROM public.users WHERE id = p_user_id;

  IF v_target_personal_group_id IS NULL THEN
    RAISE EXCEPTION 'erase_fim_account: user not found or has no personal group';
  END IF;

  -- 2. Boundary guard (collision-free reaper<->consent): a Mist is the reaper's,
  --    not account-erasure's, and holds no consent. Refuse it.
  IF v_target_is_temporary THEN
    RAISE EXCEPTION 'erase_fim_account: target is a Mist (pre-transcendence) — use the ephemerality reaper / explicit-erase path, not account erasure'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Anonymise-then-retain: NULL the subject link (clears the FK RESTRICT),
  --    keep the consent event as GDPR proof. The bypass is the only sanctioned
  --    way past enforce_consent_append_only.
  PERFORM set_config('app.consent_erasure_in_progress', 'true', true);
  UPDATE public.consent_records
    SET subject_user_id = NULL, subject_group_id = NULL
    WHERE subject_user_id = p_user_id
       OR subject_group_id = v_target_personal_group_id;
  GET DIAGNOSTICS v_anonymised_count = ROW_COUNT;

  -- 3b. FEAT-PC012 (Art. 17, Open Q4): pending email invitations ADDRESSED TO
  --     the erased email are unclaimed offers carrying the person's PII —
  --     hard-deleted (the ADR-U034 retain-pattern covers consent proof, not
  --     offers). Invitations SENT BY the target need no step: the personal
  --     group's deletion SET NULLs invited_by_group_id via the existing FK.
  --     Captured BEFORE step 4's teardown removes the users row.
  DELETE FROM public.pending_email_invitations
    WHERE lower(invited_email) = v_target_email;
  GET DIAGNOSTICS v_invitations_deleted = ROW_COUNT;

  -- 4. Delegate FIM teardown (sentinel reassignment + cascade). Same JWT actor,
  --    so its manage_all_groups re-check passes.
  v_teardown := public.admin_hard_delete_user(p_user_id);

  RETURN jsonb_build_object(
    'erased_user_id', p_user_id,
    'consent_records_anonymised', v_anonymised_count,
    'consent_retained', true,
    'pending_invitations_deleted', v_invitations_deleted,
    'teardown', v_teardown
  );
END;
$$;

COMMENT ON FUNCTION public.erase_fim_account(uuid) IS
  'FEAT-PC002 STORY-5 crit-4 (ADR-U034 §5), amended by FEAT-PC012 STORY-6: FIM account-erasure (distinct from the pre-transcendence reaper). Admin-gated (manage_all_groups); refuses Mists (collision-free boundary); anonymises the consent subject link (subject_user_id/subject_group_id => NULL) under app.consent_erasure_in_progress while RETAINING the consent event as GDPR proof (FK RESTRICT forces anonymise-first); DELETES pending email invitations addressed to the erased email (Art. 17 — unclaimed offers, not consent proof; PC012 Open Q4); delegates teardown to admin_hard_delete_user (sentinel reassignment + cascade).';

-- ---------------------------------------------------------------------------
-- 11. auto_assign_member_role_on_accept — build-discovered defect fix (see
--     header): resolve the group's Member-TEMPLATE-derived instance first;
--     fall back to the short name 'Member' (legacy pre-G-A groups). Same
--     SECURITY DEFINER posture and silent-skip-if-absent behaviour otherwise.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_assign_member_role_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_role_id UUID;
BEGIN
  IF OLD.status = 'invited' AND NEW.status = 'active' THEN
    SELECT gr.id INTO v_member_role_id
    FROM public.group_roles gr
    WHERE gr.group_id = NEW.group_id
      AND gr.created_from_role_template_id = (
        SELECT rt.id FROM public.role_templates rt
        WHERE rt.name = 'Member Role Template')
    LIMIT 1;

    IF v_member_role_id IS NULL THEN
      SELECT id INTO v_member_role_id
      FROM public.group_roles
      WHERE group_id = NEW.group_id AND name = 'Member'
      LIMIT 1;
    END IF;

    IF v_member_role_id IS NOT NULL THEN
      INSERT INTO public.user_group_roles (
        member_group_id, group_id, group_role_id, assigned_by_group_id
      )
      VALUES (NEW.member_group_id, NEW.group_id, v_member_role_id, NEW.member_group_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_assign_member_role_on_accept() IS
  'Binds the group''s default Member role on invitation accept (invited->active). FEAT-PC012 fix: resolves the Member-template-DERIVED instance via created_from_role_template_id (v2 groups name instances ''Member Role Template'' — the name=''Member'' lookup silently bound nothing), falling back to the short name for legacy pre-G-A groups.';

-- ---------------------------------------------------------------------------
-- Grants — contracts callable by authenticated (self-gating inside) +
-- service_role; nothing for anon or PUBLIC.
-- ---------------------------------------------------------------------------

revoke all on function public.search_invitable_members(uuid, text) from public;
grant execute on function public.search_invitable_members(uuid, text) to authenticated, service_role;
revoke all on function public.invite_member(uuid, uuid) from public;
grant execute on function public.invite_member(uuid, uuid) to authenticated, service_role;
revoke all on function public.invite_by_email(uuid, text) from public;
grant execute on function public.invite_by_email(uuid, text) to authenticated, service_role;
revoke all on function public.get_group_invitations(uuid) from public;
grant execute on function public.get_group_invitations(uuid) to authenticated, service_role;
revoke all on function public.cancel_member_invitation(uuid, uuid) from public;
grant execute on function public.cancel_member_invitation(uuid, uuid) to authenticated, service_role;
revoke all on function public.cancel_email_invitation(uuid) from public;
grant execute on function public.cancel_email_invitation(uuid) to authenticated, service_role;
revoke all on function public.get_my_invitations() from public;
grant execute on function public.get_my_invitations() to authenticated, service_role;
revoke all on function public.accept_group_invitation(uuid) from public;
grant execute on function public.accept_group_invitation(uuid) to authenticated, service_role;
revoke all on function public.decline_group_invitation(uuid) from public;
grant execute on function public.decline_group_invitation(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- TRUNCATE hygiene (the G-A rule; neither table was covered by PC010/PC011).
-- TRUNCATE bypasses RLS; PostgREST exposes no TRUNCATE verb — verified via
-- information_schema.table_privileges at the schema gate.
-- ---------------------------------------------------------------------------

revoke truncate on table public.pending_email_invitations from anon, authenticated;
revoke truncate on table public.group_memberships from anon, authenticated;
