-- ============================================================================
-- C-E: Lifecycle dispositions & own-communication export (FEAT-PD012)
-- ============================================================================
-- The C-E board (2026-07-20, recommendations adopted; D2 = preserve-and-seal):
--
--   1. D2 executed (ADR-U047 — Core emits the fact, DS-5 owns the disposition):
--      `ds5_lifecycle_group_closed` called in-transaction from close_group /
--      delete_group. Both lifecycle events disposition IDENTICALLY — end
--      activity, keep the record: the group's group-kind conversations seal
--      (`conversations.sealed_at`); forum_posts and announcements rows are
--      deliberately untouched (the record posture; the FEAT-PD011 §Administration
--      contingency adjudicated — membership-gated invisibility suffices).
--   2. Sealed semantics on the C-A contracts: get_my_conversations and
--      get_group_conversations exclude sealed rows (threads leave live
--      inboxes); send_message and join_group_conversation refuse sealed
--      (P0001); get_conversation_detail is unchanged — seal ends activity,
--      not a participant's access to the record.
--   3. The GDPR communication export (CB-6 — right of access, suspended
--      included): get_own_messages_export() joins the composite under the
--      `communication` key; get_own_step_instances_export() re-issued with
--      ungated actor resolution, closing FEAT-PC008 §155 at source. The
--      universal resolver (get_current_personal_group_id) is UNTOUCHED.
--      (get_own_journal_export needs no repair — verified already ungated.)
--
-- Direct-caller question (ADR-U038), answered per object:
--   - conversations.sealed_at: written only by the definer-owned handler; no
--     client write path exists (writes to conversations stay contract-only).
--   - ds5_lifecycle_group_closed: REVOKEd from PUBLIC/anon/authenticated —
--     a direct PostgREST call answers 42501 (W12).
--   - get_own_messages_export: SECURITY DEFINER but keyed on auth.uid() ->
--     own personal group only; serves no row that is not the caller's own.
--   - The re-issued contracts keep their existing ACLs (CREATE OR REPLACE
--     preserves grants); their gate order is unchanged (42501 walls first,
--     the seal check behind them, so refusal classes stay non-leaking).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The seal column (NULL = live). No new tables; DS_TABLES unchanged.
-- ----------------------------------------------------------------------------
ALTER TABLE public.conversations ADD COLUMN sealed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.conversations.sealed_at IS
  'FEAT-PD012 (C-E, preserve-and-seal): stamped by ds5_lifecycle_group_closed '
  'when the owning group closes or is deleted. A sealed conversation leaves '
  'live inboxes and refuses sends/joins; history stays readable to its '
  'participants and the rows are never destroyed by group lifecycle.';

-- ----------------------------------------------------------------------------
-- 2. The DS-5 lifecycle handler (the ds3 template: definer-only, validated
--    reason, REVOKEd from every client role).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_lifecycle_group_closed(
  p_group_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_sealed INTEGER;
BEGIN
  -- ADR-U047: synchronous, same-transaction, errors propagate (Option A).
  IF p_reason NOT IN ('group_closed', 'group_archived') THEN
    RAISE EXCEPTION 'ds5_lifecycle_group_closed: unknown reason %', p_reason
      USING ERRCODE = '22023';
  END IF;

  -- Preserve-and-seal: seal the group's group-kind conversations (idempotent —
  -- already-sealed rows are left as first stamped). dm-kind is personal and
  -- never group-dispositioned; forum_posts / announcements untouched by design.
  UPDATE public.conversations
     SET sealed_at = NOW()
   WHERE group_id = p_group_id
     AND kind = 'group'
     AND sealed_at IS NULL;
  GET DIAGNOSTICS v_sealed = ROW_COUNT;

  RETURN jsonb_build_object('conversations_sealed', v_sealed);
END;
$$;

-- W12: definer-only — a direct authenticated PostgREST call answers 42501.
REVOKE ALL ON FUNCTION public.ds5_lifecycle_group_closed(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Core call sites: the D2 fact reaches DS-5 (re-issues; ACLs preserved)
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

  -- B+C. freeze both shapes + owned non-public journeys → DeusEx is now DS-3's
  --    own disposition (ADR-U047): Core emits the group_closed fact, DS-3 owns
  --    the freeze + transfer and returns the count Core needs for its notice.
  v_journeys := (public.ds3_lifecycle_group_closed(p_group_id, 'group_closed') ->> 'journey_count')::integer;

  -- 6b. DS-5 owns its own disposition (ADR-U047, FEAT-PD012 D2): preserve-
  --     and-seal — the group's group-kind conversations seal; forum and
  --     announcements rows are untouched by design (the record posture).
  perform public.ds5_lifecycle_group_closed(p_group_id, 'group_closed');

  -- The DeusEx review notice stays in Core (Notifications-vertical write, ADR-U048).
  if v_journeys > 0 then
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

  -- DS-5 dues, discharged: former-member attribution shipped at C-B (COM-14,
  -- FEAT-PD009); the D2 conversation disposition rides at 6b (FEAT-PD012).
  return jsonb_build_object(
    'group_id', p_group_id,
    'group_name', v_group.name,
    'journeys_transferred', v_journeys
  );
end;
$$;

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

  -- B+C. freeze both shapes + owned non-public journeys → DeusEx is now DS-3's
  --    own disposition (ADR-U047). frozen_reason=group_archived carried by the
  --    fact; the returned count feeds the DeusEx review notice below.
  v_journeys := (public.ds3_lifecycle_group_closed(p_group_id, 'group_archived') ->> 'journey_count')::integer;

  -- DS-5 disposition (ADR-U047, FEAT-PD012 D2): IDENTICAL to close_group —
  -- preserve-and-seal; delete adds nothing destructive in Ferd (hard erasure
  -- stays with the personal paths: user hard-delete, Mist reaping).
  perform public.ds5_lifecycle_group_closed(p_group_id, 'group_archived');

  if v_journeys > 0 then
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

-- ----------------------------------------------------------------------------
-- 3b. Sealed semantics on the C-A contracts (re-issues; ACLs preserved)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC NULLS LAST), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      c.last_message_at AS sort_ts,
      jsonb_build_object(
        'id', c.id,
        'kind', c.kind,
        'title', c.title,
        'group_id', c.group_id,
        'group_name', gg.name,
        'other_participant_name', (
          SELECT g2.name
          FROM public.conversation_participants cp2
          JOIN public.groups g2 ON g2.id = cp2.participant_group_id
          WHERE cp2.conversation_id = c.id
            AND cp2.participant_group_id <> v_me
          LIMIT 1
        ),
        'last_message_at', c.last_message_at,
        'has_unread', EXISTS (
          SELECT 1 FROM public.messages m
          WHERE m.conversation_id = c.id
            AND m.created_at > cp.last_read_at
            AND m.sender_group_id IS DISTINCT FROM v_me
        )
      ) AS row_doc
    FROM public.conversation_participants cp
    JOIN public.conversations c ON c.id = cp.conversation_id
    LEFT JOIN public.groups gg ON gg.id = c.group_id
    WHERE cp.participant_group_id = v_me
      AND cp.left_at IS NULL
      AND c.sealed_at IS NULL  -- FEAT-PD012: sealed threads leave the live inbox
  ) rows;
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_conversations(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_me AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'created_at', c.created_at,
    'am_i_participant', EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
        AND cp.participant_group_id = v_me AND cp.left_at IS NULL
    )
  ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.conversations c
  WHERE c.kind = 'group' AND c.group_id = p_group_id
    AND c.sealed_at IS NULL;  -- FEAT-PD012: sealed threads are not live
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.messages%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND participant_group_id = v_me AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PD012: seal ends activity — behind the participant wall so refusal
  -- classes stay non-leaking (outsiders still see 42501, never the seal).
  IF EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND sealed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Conversation is sealed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.messages (conversation_id, sender_group_id, content)
  VALUES (p_conversation_id, v_me, p_content)
  RETURNING * INTO v_row;
  RETURN jsonb_build_object(
    'id', v_row.id, 'conversation_id', v_row.conversation_id,
    'sender_group_id', v_row.sender_group_id,
    'content', v_row.content, 'created_at', v_row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_group_id UUID;
  v_sealed TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT group_id, sealed_at INTO v_group_id, v_sealed
  FROM public.conversations
  WHERE id = p_conversation_id AND kind = 'group';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group conversation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = v_group_id AND member_group_id = v_me AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PD012: no joining an ended thread (behind the membership wall).
  IF v_sealed IS NOT NULL THEN
    RAISE EXCEPTION 'Conversation is sealed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (p_conversation_id, v_me)
  ON CONFLICT (conversation_id, participant_group_id)
  DO UPDATE SET left_at = NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. The own-communication export (STORY-4; CB-6 posture).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_own_messages_export()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
BEGIN
  -- CB-6 (right of access): resolve UNGATED — auth.uid() -> users directly,
  -- no is_active filter, no FIM gate. A suspended member exports; sealed
  -- conversations and tombstoned posts export (they are still the caller's
  -- record). Own rows only, every section: other participants' message bodies
  -- never appear (the own-data wall); the report section carries the caller's
  -- own reports incl. the snapshot they filed (the C-E board's call), and
  -- omits target_group_id (a third party's identity is not the caller's data).
  SELECT u.personal_group_id INTO v_me
    FROM public.users u
   WHERE u.auth_user_id = (SELECT auth.uid());
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'no session actor' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', m.id,
               'conversation_id', m.conversation_id,
               'conversation_kind', c.kind,
               'content', m.content,
               'created_at', m.created_at)
             ORDER BY m.created_at ASC, m.id ASC)
        FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
       WHERE m.sender_group_id = v_me), '[]'::jsonb),
    'conversation_participations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'conversation_id', cp.conversation_id,
               'kind', c.kind,
               'group_id', c.group_id,
               'joined_at', cp.joined_at,
               'left_at', cp.left_at,
               'last_read_at', cp.last_read_at,
               'sealed_at', c.sealed_at)
             ORDER BY cp.joined_at ASC, cp.conversation_id ASC)
        FROM public.conversation_participants cp
        JOIN public.conversations c ON c.id = cp.conversation_id
       WHERE cp.participant_group_id = v_me), '[]'::jsonb),
    'forum_posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', f.id,
               'group_id', f.group_id,
               'parent_post_id', f.parent_post_id,
               'content', f.content,
               'is_deleted', f.is_deleted,
               'created_at', f.created_at,
               'updated_at', f.updated_at)
             ORDER BY f.created_at ASC, f.id ASC)
        FROM public.forum_posts f
       WHERE f.author_group_id = v_me), '[]'::jsonb),
    'reports_submitted', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', r.id,
               'target_kind', r.target_kind,
               'target_id', r.target_id,
               'reason', r.reason,
               'details', r.details,
               'content_snapshot', r.content_snapshot,
               'status', r.status,
               'created_at', r.created_at)
             ORDER BY r.created_at ASC, r.id ASC)
        FROM public.content_reports r
       WHERE r.reporter_group_id = v_me), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_messages_export() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_messages_export() TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. CB-6 repairs at source (re-issues; ACLs preserved)
-- ----------------------------------------------------------------------------
create or replace function public.get_own_step_instances_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  -- CB-6 (FEAT-PD012 STORY-5): resolve UNGATED — auth.uid() -> users
  -- directly, no is_active filter. A suspended member keeps their right of
  -- access (the composite's and the journal export's shared precedent). The
  -- universal resolver (get_current_personal_group_id) is untouched.
  select u.personal_group_id into v_actor
    from public.users u
   where u.auth_user_id = (select auth.uid());
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  -- Every enrolment the caller travelled: their own party's walks (withdrawn
  -- history included — right of access covers the lived record, not just
  -- standing) plus via-group walks carrying their own instances. steps[] is
  -- the caller's OWN instance rows only — never a sibling traveller's.
  -- Titles ride for legibility; no filters, fixed shape (not a query surface).
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'enrollment_id', e.id,
              'journey_id', e.journey_id,
              'journey_title', j.title,
              'status', e.status,
              'enrolled_at', e.enrolled_at,
              'completed_at', e.completed_at,
              'steps', coalesce(
                (select jsonb_agg(jsonb_build_object(
                          'step_id', i.step_id,
                          'step_title', st.title,
                          'kind', st.step_kind_key,
                          'created_at', i.created_at,
                          'completed_at', i.completed_at,
                          'response', i.response,
                          'response_updated_at', i.response_updated_at)
                        order by i.created_at asc, i.id asc)
                   from public.journey_step_instances i
                   join public.journey_steps st on st.id = i.step_id
                  where i.enrollment_id = e.id
                    and i.traveller_group_id = v_actor),
                '[]'::jsonb))
            order by e.enrolled_at asc, e.id asc)
       from public.journey_enrollments e
       join public.journeys j on j.id = e.journey_id
      where e.group_id = v_actor
         or exists (select 1 from public.journey_step_instances i2
                     where i2.enrollment_id = e.id
                       and i2.traveller_group_id = v_actor)),
    '[]'::jsonb);
end;
$$;

CREATE OR REPLACE FUNCTION public.get_own_data_export()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_display_name text;
  v_doc jsonb;
BEGIN
  -- Own-subject resolution via auth.uid() (covers suspended members).
  SELECT * INTO v_user FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'no subject for caller' USING errcode = '28000';
  END IF;

  -- The member's display name is the personal group's name (kept in sync from
  -- nickname/full_name per display_preference by sync_personal_group_display_name).
  SELECT g.name INTO v_display_name
  FROM public.groups g
  WHERE g.id = v_user.personal_group_id;

  -- Durable export-event record (the accountability trail). The SECURITY DEFINER
  -- elevation is what lets a member write to the admin-RLS-protected audit log
  -- for their OWN action.
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_user.personal_group_id,
    'data_export',
    v_user.personal_group_id::text,
    jsonb_build_object('schema_version', 1, 'surface', 'self_service')
  );

  v_doc := jsonb_build_object(
    'schema_version', 1,
    'exported_at', now(),
    'subject', jsonb_build_object(
      'user_id', v_user.id,
      'personal_group_id', v_user.personal_group_id,
      'email', v_user.email
    ),
    'profile', jsonb_build_object(
      'full_name', v_user.full_name,
      'nickname', v_user.nickname,
      'display_preference', v_user.display_preference,
      'show_real_name', v_user.show_real_name,
      'avatar_url', v_user.avatar_url,
      'bio', v_user.bio,
      'display_name', v_display_name,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at
    ),
    'account_state', jsonb_build_object(
      'is_active', v_user.is_active,
      'is_decommissioned', v_user.is_decommissioned,
      'state', CASE
        WHEN v_user.is_decommissioned THEN 'decommissioned'
        WHEN NOT v_user.is_active THEN 'suspended'
        ELSE 'active'
      END
    ),
    'consent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'purpose', cr.purpose,
        'decision', cr.decision,
        'policy_version', cr.policy_version,
        'captured_at', cr.captured_at,
        'capture_context', cr.capture_context
      ) ORDER BY cr.captured_at DESC)
      FROM public.consent_records cr
      WHERE cr.subject_group_id = v_user.personal_group_id
    ), '[]'::jsonb),
    'memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'group_id', gm.group_id,
        'group_name', g.name,
        'status', gm.status,
        'added_at', gm.added_at
      ) ORDER BY gm.added_at)
      FROM public.group_memberships gm
      LEFT JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.member_group_id = v_user.personal_group_id
    ), '[]'::jsonb)
  );

  -- COR-A W8 (AC-4): completeness is the platform's contract. Compose the
  -- Domain-owned sections platform-side, under the same caller identity, by
  -- calling the owning contracts (their one substrate home stays where it is).
  v_doc := v_doc || jsonb_build_object(
    'journal', public.get_own_journal_export(),
    'journeys', public.get_own_step_instances_export(),
    'communication', public.get_own_messages_export()  -- FEAT-PD012 (C-E)
  );

  RETURN v_doc;
END;
$$;
