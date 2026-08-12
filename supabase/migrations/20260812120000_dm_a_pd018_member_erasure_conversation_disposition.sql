-- ============================================================================
-- TASK-DM-01 / FEAT-PD018: member-erasure conversation disposition
-- SCHEMA GATE — apply only on Stefan's named approval.
-- ============================================================================
-- The gap (found 2026-08-12 during the dev-DB reset): deleting every group and
-- every account left 557 conversations and 1 123 messages standing with zero
-- participants. Direct conversations are not group-anchored — for kind='dm',
-- conversations.group_id IS NULL — so the ON DELETE CASCADE on that column
-- never fires. conversation_participants CASCADEs away, messages.sender_group_id
-- SET NULLs, and the bodies remain in the database, reachable through no
-- contract and visible to no instrument.
--
-- The ruling (2026-08-12, Stefan): CONTENT-level tombstone. The erased member's
-- message bodies go; the thread shape and the survivor's own words stay.
-- Author-level was rejected because it is ALREADY the live behaviour
-- (get_conversation_detail resolves departed senders to 'Former member'), so
-- choosing it would have been a no-op leaving the Article 17 exposure intact.
-- The forum precedent (ADR-U021, posts remain) deliberately does NOT decide
-- this by analogy: a forum post is communal and other participants have a
-- legitimate interest in an intact thread; anonymising a name in a two-party
-- conversation obscures nothing from the one person who was there.
--
-- Cascade specification (ADR-U016) — the five paths do NOT dispose identically,
-- because they are not all erasures. The split is one the codebase already
-- makes: delete_own_account erases the private record (ds3 + ds7 handlers —
-- enrolments and journal deleted); admin_exit_user_from_platform runs the same
-- membership walk and calls NEITHER. Exit is a removal; delete is an erasure.
--
--   delete_own_account            erasure  -> tombstone            (call added)
--   admin_hard_delete_user        erasure  -> tombstone + sweep    (call added)
--   admin_exit_user_from_platform removal  -> none                 (unchanged)
--   admin_decommission_user       status   -> none                 (unchanged)
--   _erase_mist / reap_expired_mists       -> structurally empty   (see below)
--
-- The Mist leg is empty by construction, not by omission:
-- get_or_create_dm_conversation refuses a temporary actor (…c_a…:230) and a
-- temporary recipient (…c_a…:446), so no Mist can be either party to a DM.
-- FEAT-PD012 STORY-6's verify-and-record posture applies — the deliverable is
-- a regression proof, not a scrub. No Mist code path is added here.
--
-- ADR-U047 shape unchanged: Core emits the fact, DS-5 owns the disposition —
-- the same composition as ds5_lifecycle_group_closed and
-- ds5_lifecycle_user_hard_deleted. Synchronous, same transaction, errors
-- propagate, runs before the personal-group delete.
--
-- Direct-caller question (ADR-U038): ds5_lifecycle_account_deleted is REVOKEd
-- from PUBLIC/anon/authenticated — a direct PostgREST call answers 42501. It
-- rides the /^ds\d+_lifecycle_/ auto-allow in the conformance allowlist.
-- No new tables; supabase/ownership.manifest.json needs no new entry.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The tombstone shape on messages (mirrors forum_posts, 20260222000000:234)
-- ----------------------------------------------------------------------------
-- messages was born without one: content TEXT NOT NULL CHECK (length(trim) > 0)
-- and no is_deleted (20260222000000:258-264). The replacement CHECK admits NULL
-- exactly when is_deleted — so a LIVE message still can never be empty, which
-- is the invariant the original constraint existed to protect.
ALTER TABLE public.messages
  ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

-- The constraint kept its pre-rename name: the table was renamed from
-- direct_messages (…c_a…:149) and Postgres does not rename constraints with it.
-- Verified against the live catalogue before writing this line.
ALTER TABLE public.messages
  DROP CONSTRAINT direct_messages_content_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_present_unless_deleted
    CHECK (
      (is_deleted AND content IS NULL)
      OR (NOT is_deleted AND content IS NOT NULL AND length(trim(content)) > 0)
    );

COMMENT ON COLUMN public.messages.is_deleted IS
  'FEAT-PD018 (TASK-DM-01, content-level tombstone): true when the sender was '
  'erased and the body redacted (content NULL). Exactly one writer — '
  'ds5_lifecycle_account_deleted; there is no member-facing message-delete '
  'contract. Author attribution is deliberately NOT changed here: '
  'sender_group_id keeps resolving through the C-B attribution ladder.';

-- ----------------------------------------------------------------------------
-- 2. ds5_lifecycle_account_deleted() — the DS-5 sibling ds3/ds7 never had
-- ----------------------------------------------------------------------------
-- On the ds3_lifecycle_account_deleted template (20260721161500:31-56).
-- Two statements, both dm-kind only: group-kind conversations are FEAT-PD012's
-- preserve-and-seal and stay untouched (a group thread is communal — the forum
-- argument applies there and only there).
--
-- Ordering note that decides the second statement's shape: this runs BEFORE
-- `delete from public.groups`, so the departing member's own participant row
-- still exists. `count(*) = 0` would therefore never be true. The predicate is
-- "no surviving participant OTHER than the departing group", which is
-- evaluable at this point in the transaction. Messages follow by FK CASCADE
-- (messages.conversation_id, 20260222000000:260).
CREATE OR REPLACE FUNCTION public.ds5_lifecycle_account_deleted(
  p_personal_group_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tombstoned integer;
  v_conversations_removed integer;
BEGIN
  IF p_personal_group_id IS NULL THEN
    RAISE EXCEPTION 'ds5_lifecycle_account_deleted: null argument'
      USING ERRCODE = '22023';
  END IF;

  -- (a) Content-level tombstone: the member's own DM bodies go. Idempotent —
  -- the is_deleted = false guard makes a second pass a no-op, which matters
  -- because erase_fim_account composes delete paths.
  UPDATE public.messages m
     SET content = NULL,
         is_deleted = true
    FROM public.conversations c
   WHERE c.id = m.conversation_id
     AND c.kind = 'dm'
     AND m.sender_group_id = p_personal_group_id
     AND m.is_deleted = false;
  GET DIAGNOSTICS v_tombstoned = ROW_COUNT;

  -- (b) The residue answer: a DM thread with no participant other than the
  -- departing member is deleted outright rather than left orphaned. This is
  -- the structural fix for the 557 threads — not a sweep of them.
  DELETE FROM public.conversations c
   WHERE c.kind = 'dm'
     AND EXISTS (
       SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = c.id
          AND cp.participant_group_id = p_personal_group_id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.conversation_participants cp2
        WHERE cp2.conversation_id = c.id
          AND cp2.participant_group_id <> p_personal_group_id
     );
  GET DIAGNOSTICS v_conversations_removed = ROW_COUNT;

  RETURN jsonb_build_object(
    'dm_messages_tombstoned', v_tombstoned,
    'dm_conversations_removed', v_conversations_removed
  );
END;
$$;

COMMENT ON FUNCTION public.ds5_lifecycle_account_deleted(uuid) IS
  'ADR-U047 DS-5 lifecycle-fact handler (FEAT-PD018 / TASK-DM-01): on account '
  'erasure, content-level tombstones the member''s dm-kind message bodies '
  '(content NULL, is_deleted true) and deletes dm threads left with no other '
  'participant. Group-kind conversations untouched — FEAT-PD012 preserve-and-'
  'seal owns those. Attribution untouched — the C-B ladder already resolves '
  'departed senders. Idempotent. Must be called BEFORE the personal-group '
  'delete. SECURITY DEFINER, core-internal (no client execute).';

REVOKE ALL ON FUNCTION public.ds5_lifecycle_account_deleted(uuid)
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. The two Core call sites (ADR-U047 carve-out this gate covers)
-- ----------------------------------------------------------------------------
-- Both bodies below are the LIVE definitions read from pg_get_functiondef and
-- patched by anchored insertion — byte-stable except the added ds5 call, its
-- comment, the v_ds5_erased declaration + audit key (delete_own_account), and
-- the corrected cascade comment (admin_hard_delete_user).

-- ---- delete_own_account (re-issued) ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user record;
  v_pgid uuid;
  v_deusex_group_id uuid;
  v_sentinel_group_id uuid;
  v_steward_template_id uuid;
  v_membership record;
  v_member_count integer;
  v_steward_role_id uuid;
  v_is_steward boolean;
  v_steward_count integer;
  v_scenario text;
  v_non_public_journey_count integer;
  v_results jsonb := '[]'::jsonb;
  v_groups_exited integer := 0;
  v_member record;
  v_ds3_erased jsonb;
  v_ds7_erased jsonb;
  v_ds5_erased jsonb;
BEGIN
  -- ─── 1. Resolve + guard the actor (own row only — no parameter) ─────────
  SELECT id, personal_group_id, auth_user_id, is_temporary, is_active,
         is_decommissioned, deactivation_origin
    INTO v_user
    FROM public.users
   WHERE auth_user_id = auth.uid()
     FOR UPDATE;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'delete_own_account: no session actor';
  END IF;
  IF v_user.is_temporary THEN
    RAISE EXCEPTION 'delete_own_account: a Mist is the reaper''s / explicit-erase path''s, not account deletion''s';
  END IF;
  IF v_user.is_decommissioned THEN
    RAISE EXCEPTION 'delete_own_account: this account is already terminally closed';
  END IF;
  IF NOT v_user.is_active
     AND v_user.deactivation_origin IS DISTINCT FROM 'member' THEN
    RAISE EXCEPTION 'delete_own_account: this account is under an admin hold — contact an admin';
  END IF;

  v_pgid := v_user.personal_group_id;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'delete_own_account: DeusEx system group not found';
  END IF;

  SELECT id INTO v_sentinel_group_id
    FROM public.groups
   WHERE name = '[Deleted User]' AND group_type = 'system';
  IF v_sentinel_group_id IS NULL THEN
    RAISE EXCEPTION 'delete_own_account: [Deleted User] sentinel group not found';
  END IF;

  SELECT id INTO v_steward_template_id
    FROM public.role_templates
   WHERE name = 'Steward Role Template';

  -- ─── 2. The membership walk (ported byte-stable + the C-E ds5 seal) ─────
  FOR v_membership IN
    SELECT gm.group_id, g.name AS group_name
      FROM public.group_memberships gm
      JOIN public.groups g ON g.id = gm.group_id
     WHERE gm.member_group_id = v_pgid
       AND gm.status = 'active'
       AND g.group_type = 'engagement'
       AND g.status = 'active'
     ORDER BY g.name
  LOOP
    SELECT count(*) INTO v_member_count
      FROM public.group_memberships
     WHERE group_id = v_membership.group_id AND status = 'active';

    SELECT gr.id INTO v_steward_role_id
      FROM public.group_roles gr
     WHERE gr.group_id = v_membership.group_id
       AND (gr.created_from_role_template_id = v_steward_template_id
            OR gr.name = 'Steward')
     LIMIT 1;

    v_is_steward := false;
    v_steward_count := 0;
    IF v_steward_role_id IS NOT NULL THEN
      SELECT count(*) INTO v_steward_count
        FROM public.user_group_roles
       WHERE group_id = v_membership.group_id
         AND group_role_id = v_steward_role_id;
      v_is_steward := EXISTS (
        SELECT 1 FROM public.user_group_roles
         WHERE group_id = v_membership.group_id
           AND member_group_id = v_pgid
           AND group_role_id = v_steward_role_id
      );
    END IF;

    IF v_member_count = 1 THEN
      v_scenario := 'group_closure';
    ELSIF v_is_steward AND v_steward_count = 1 THEN
      v_scenario := 'steward_handover';
    ELSE
      v_scenario := 'regular_leave';
    END IF;

    IF v_scenario = 'group_closure' THEN
      UPDATE public.groups SET status = 'closed'
       WHERE id = v_membership.group_id;

      v_non_public_journey_count :=
        (public.ds3_lifecycle_group_closed(v_membership.group_id, 'group_closed') ->> 'journey_count')::integer;

      PERFORM public.ds5_lifecycle_group_closed(v_membership.group_id, 'group_closed');

      IF v_non_public_journey_count > 0 THEN
        INSERT INTO public.notifications
          (recipient_group_id, type, title, body, payload, group_id)
        VALUES (
          v_deusex_group_id,
          'group_closed',
          'Group Closed — Platform Exit',
          v_membership.group_name || ' has been closed (platform exit). ' ||
            v_non_public_journey_count || ' non-public journey(s) require review.',
          jsonb_build_object(
            'group_id', v_membership.group_id,
            'journey_count', v_non_public_journey_count,
            'exit_reason', 'platform_exit'
          ),
          v_membership.group_id
        );
      END IF;

      DELETE FROM public.user_group_roles
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
      DELETE FROM public.group_memberships
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;

    ELSIF v_scenario = 'steward_handover' THEN
      INSERT INTO public.group_memberships
        (group_id, member_group_id, added_by_group_id, status)
      VALUES
        (v_membership.group_id, v_deusex_group_id, v_pgid, 'active')
      ON CONFLICT (group_id, member_group_id)
        DO UPDATE SET status = 'active', status_changed_at = now();

      INSERT INTO public.user_group_roles
        (member_group_id, group_id, group_role_id, assigned_by_group_id)
      VALUES
        (v_deusex_group_id, v_membership.group_id, v_steward_role_id, v_pgid)
      ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

      UPDATE public.group_memberships
         SET added_by_group_id = v_deusex_group_id
       WHERE group_id = v_membership.group_id
         AND status = 'invited'
         AND added_by_group_id = v_pgid;

      UPDATE public.pending_email_invitations
         SET invited_by_group_id = v_deusex_group_id
       WHERE group_id = v_membership.group_id
         AND invited_by_group_id = v_pgid
         AND status = 'pending';

      PERFORM public.ds3_lifecycle_member_departed(v_membership.group_id, v_pgid, 'left_group');

      DELETE FROM public.user_group_roles
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
      DELETE FROM public.group_memberships
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;

      FOR v_member IN
        SELECT gm.member_group_id
          FROM public.group_memberships gm
         WHERE gm.group_id = v_membership.group_id
           AND gm.status = 'active'
           AND gm.member_group_id != v_deusex_group_id
      LOOP
        INSERT INTO public.notifications
          (recipient_group_id, type, title, body, payload, group_id)
        VALUES (
          v_member.member_group_id,
          'stewardship_transferred',
          'Stewardship Change — Platform Exit',
          'FringeIsland has temporarily assumed stewardship of ' || v_membership.group_name || '.',
          jsonb_build_object(
            'group_id', v_membership.group_id,
            'exit_reason', 'platform_exit'
          ),
          v_membership.group_id
        );
      END LOOP;

      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_deusex_group_id,
        'stewardship_required',
        'Stewardship Required — Platform Exit',
        v_membership.group_name || ' requires a permanent Steward. Previous Steward exited the platform.',
        jsonb_build_object(
          'group_id', v_membership.group_id,
          'exit_reason', 'platform_exit'
        ),
        v_membership.group_id
      );

    ELSE -- regular_leave
      PERFORM public.ds3_lifecycle_member_departed(v_membership.group_id, v_pgid, 'left_group');

      DELETE FROM public.user_group_roles
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
      DELETE FROM public.group_memberships
       WHERE group_id = v_membership.group_id AND member_group_id = v_pgid;
    END IF;

    v_results := v_results || jsonb_build_object(
      'group_id', v_membership.group_id,
      'group_name', v_membership.group_name,
      'scenario', v_scenario
    );
    v_groups_exited := v_groups_exited + 1;
  END LOOP;

  -- ─── 3. F-2 private-erase via the U047 facts ────────────────────────────
  v_ds3_erased := public.ds3_lifecycle_account_deleted(v_pgid);
  v_ds7_erased := public.ds7_lifecycle_account_deleted(v_pgid);
  -- FEAT-PD018: the DS-5 sibling these two had been missing. Without it the
  -- Article 17 door left every DM body intact and attributed — this path does
  -- not even delete the personal group, so no FK cascade was ever going to.
  v_ds5_erased := public.ds5_lifecycle_account_deleted(v_pgid);

  -- ─── 4. Owned-journey attribution -> the sentinel ───────────────────────
  PERFORM public.ds3_lifecycle_user_hard_deleted(v_pgid, v_sentinel_group_id);

  -- ─── 5. Decommission + display scrub — THE REPAIRED LINE: nickname is
  --        NOT NULL (display-name system), so the scrub is the tombstone
  --        string, not NULL. Same semantic: no PII survives; the sync
  --        trigger propagates '[Deleted User]' to the personal group name.
  UPDATE public.users
     SET is_active = false,
         is_decommissioned = true,
         deactivation_origin = 'member',
         nickname = '[Deleted User]',
         bio = NULL,
         avatar_url = NULL,
         full_name = '[Deleted User]',
         updated_at = now()
   WHERE id = v_user.id;

  -- ─── 6. Sessions die ────────────────────────────────────────────────────
  DELETE FROM auth.refresh_tokens WHERE user_id = v_user.auth_user_id::text;
  DELETE FROM auth.sessions       WHERE user_id = v_user.auth_user_id;

  -- ─── 7. Audit ───────────────────────────────────────────────────────────
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_pgid,
    'self_delete_account',
    v_user.id::text,
    jsonb_build_object(
      'groups_exited', v_groups_exited,
      'group_details', v_results,
      'erased', v_ds3_erased || v_ds7_erased || v_ds5_erased
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'groups_exited', v_groups_exited,
    'group_details', v_results,
    'decommissioned', true
  );
END;
$function$
;

-- ---- admin_hard_delete_user (re-issued) ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_group_id uuid;
  v_target_personal_group_id uuid;
  v_target_auth_user_id uuid;
  v_deleted_user_group_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_caller_group_id := public.get_current_personal_group_id();

  -- Get target's personal group and auth user ID
  select personal_group_id, auth_user_id
  into v_target_personal_group_id, v_target_auth_user_id
  from public.users where id = target_user_id
  for update;

  if v_target_personal_group_id is null then
    raise exception 'User not found or has no personal group' using errcode = 'P0002';
  end if;

  -- Get [Deleted User] sentinel group
  select id into v_deleted_user_group_id
  from public.groups where name = '[Deleted User]' and group_type = 'system';

  -- Write audit log BEFORE deletion (existing rows keep the legacy
  -- 'admin_hard_delete_user' string — the log is append-only).
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_caller_group_id, 'member.hard_delete', target_user_id::text,
    jsonb_build_object('target_user_id', target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- WA-3 (FEAT-PC025): consent-subject anonymise — erase_fim_account's leg
  -- (20260627120000:83-91) copied verbatim, idempotent under that composition
  -- (the outer anonymise leaves zero matching rows for this inner pass).
  -- ADR-U034 §5 anonymise-then-retain: NULL the subject link (clears the FK
  -- RESTRICT), keep the consent event as GDPR proof. The bypass is the only
  -- sanctioned way past enforce_consent_append_only.
  perform set_config('app.consent_erasure_in_progress', 'true', true);
  update public.consent_records
    set subject_user_id = null, subject_group_id = null
    where subject_user_id = target_user_id
       or subject_group_id = v_target_personal_group_id;

  -- Reassign the target's DS-5 forum authorship -> the sentinel.
  -- DS-5's own disposition now (ADR-U047 Amendment 3): Core resolves the
  -- target (COALESCE keeps the fallback the inline UPDATE had) and passes it;
  -- DS-5 owns the reassignment. Same transaction, before the group delete.
  perform public.ds5_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  -- FEAT-PD018: the DM disposition. Forum authorship reassigns (above); DM
  -- message bodies are content-level tombstoned and participant-less threads
  -- deleted. Must run BEFORE the group delete: the handler reads the
  -- departing member's own participant row, which that delete CASCADEs away.
  perform public.ds5_lifecycle_account_deleted(v_target_personal_group_id);

  -- Reassign the target's DS-3 journeys + enrolment attributions -> the sentinel.
  -- DS-3's own disposition now (ADR-U047 Amendment 1): Core resolves the target
  -- (COALESCE keeps journeys.created_by_group_id NOT NULL) and passes it; DS-3
  -- owns the reassignment. Runs before the group delete (RESTRICT), same as the
  -- inline journeys reassignment it replaces.
  perform public.ds3_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  update public.groups
  set created_by_group_id = coalesce(v_deleted_user_group_id, v_caller_group_id)
  where created_by_group_id = v_target_personal_group_id
    and id != v_target_personal_group_id;

  update public.admin_audit_log
  set actor_group_id = v_deleted_user_group_id
  where actor_group_id = v_target_personal_group_id;

  -- Reassign actor FKs in membership/role tables
  update public.group_memberships
  set added_by_group_id = v_deleted_user_group_id
  where added_by_group_id = v_target_personal_group_id;

  update public.user_group_roles
  set assigned_by_group_id = v_deleted_user_group_id
  where assigned_by_group_id = v_target_personal_group_id;

  -- Enable bypass for immutability trigger and notification triggers (transaction-local)
  perform set_config('app.bypass_personal_group_id_immutability', 'true', true);
  perform set_config('app.hard_delete_in_progress', 'true', true);

  -- Delete personal group (CASCADE: memberships, roles, notifications,
  -- enrollments). NOT conversations: a dm-kind conversation has group_id NULL
  -- (…c_a…:59), so conversations.group_id's CASCADE never fires for it — the
  -- claim this comment used to make was false, and left 557 threads standing
  -- through the 2026-08-12 reset. DM disposition is ds5_lifecycle_account_deleted
  -- above; group-kind conversations cascade here as the comment always implied.
  delete from public.groups where id = v_target_personal_group_id;

  -- Delete user record
  delete from public.users where id = target_user_id;

  -- Delete auth user
  if v_target_auth_user_id is not null then
    delete from auth.users where id = v_target_auth_user_id;
  end if;

  return jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
end;
$function$
;

-- ----------------------------------------------------------------------------
-- 3b. The read contracts carry the flag (the payload walk)
-- ----------------------------------------------------------------------------
-- STORY-2 renders a tombstone marker, so `is_deleted` has to reach the surface
-- — a NULL content with no flag is indistinguishable from a bug. The payload
-- walk over the messages.content blast radius found exactly two contracts that
-- serve a message body, and both are re-issued here:
--
--   get_conversation_detail   -> + is_deleted (the surface reads this)
--   get_own_messages_export   -> + is_deleted (matches its own forum_posts
--                                 section, which already carries the flag)
--
-- Checked and deliberately NOT touched:
--   get_my_conversations      serves last_message_at only — no body preview,
--                             so no tombstoned text can leak through the inbox.
--   send_message              returns the row it just created; never tombstoned.
--   ds5_admin_group_conversations / ds5_moderation_report_detail /
--   submit_content_report     do not serve the message-body key.
--
-- Wire-shape rule: both are additive key additions, so the export's
-- schema_version stays 1.

-- ---- get_conversation_detail (re-issued) ------------------------------------
CREATE OR REPLACE FUNCTION public.get_conversation_detail(p_conversation_id uuid, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_me UUID;
  v_conv RECORD;
  v_messages JSONB;
  v_senders JSONB;
  v_participants JSONB;
  v_my_last_read TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT c.id, c.kind, c.title, c.group_id, g.name AS group_name
  INTO v_conv
  FROM public.conversations c
  LEFT JOIN public.groups g ON g.id = c.group_id
  WHERE c.id = p_conversation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT last_read_at INTO v_my_last_read
  FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_me AND left_at IS NULL;
  IF NOT FOUND THEN
    -- FEAT-PC026 (ADM-G): the admin sight arm — group-kind AND suspended
    -- only (the G-4 verdict). Every other non-participant keeps the
    -- byte-identical refusal.
    IF NOT (public.is_platform_admin()
            AND v_conv.kind = 'group'
            AND (SELECT g.status FROM public.groups g WHERE g.id = v_conv.group_id) = 'suspended') THEN
      RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- FEAT-PC023 STORY-8: group-kind conversations are quarantined with their
  -- group below the admin plane; DMs are never held.
  IF v_conv.kind = 'group'
     AND (SELECT g.status FROM public.groups g WHERE g.id = v_conv.group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  WITH page AS (
    SELECT m.id, m.sender_group_id, m.content, m.is_deleted, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'sender_group_id', sender_group_id,
      'content', content, 'is_deleted', is_deleted, 'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_messages FROM page;

  -- Display resolution for every sender in the page — the COM-14 ladder
  -- (scope = the conversation's group; NULL scope for a dm).
  SELECT COALESCE(jsonb_object_agg(
    sid::text,
    public.ds5_resolve_author_display(sid, v_conv.group_id)
  ), '{}'::jsonb)
  INTO v_senders
  FROM (
    SELECT DISTINCT m.sender_group_id AS sid
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_group_id IS NOT NULL
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'participant_group_id', cp.participant_group_id,
    'name', g.name,
    'joined_at', cp.joined_at,
    'left_at', cp.left_at,
    'is_me', cp.participant_group_id = v_me
  )), '[]'::jsonb)
  INTO v_participants
  FROM public.conversation_participants cp
  LEFT JOIN public.groups g ON g.id = cp.participant_group_id
  WHERE cp.conversation_id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_conv.id, 'kind', v_conv.kind, 'title', v_conv.title,
    'group_id', v_conv.group_id, 'group_name', v_conv.group_name,
    'messages', v_messages, 'senders', v_senders,
    'participants', v_participants, 'my_last_read_at', v_my_last_read
  );
END;
$function$
;

-- ---- get_own_messages_export (re-issued) ------------------------------------
CREATE OR REPLACE FUNCTION public.get_own_messages_export()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- ADM-D FEAT-PC022 (AB-4): resolved reports carry the outcome the reporter
  -- was already told (resolution_kind, resolved_at); the resolver's identity
  -- and the admin-internal note stay out (the same wall).
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
               'is_deleted', m.is_deleted,
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
               'created_at', r.created_at,
               'resolution_kind', r.resolution_kind,
               'resolved_at', r.resolved_at)
             ORDER BY r.created_at ASC, r.id ASC)
        FROM public.content_reports r
       WHERE r.reporter_group_id = v_me), '[]'::jsonb),
    -- COR-C W2 (AC3-16, Stefan 2026-07-31: ADD): announcements the caller
    -- authored are their communal record, like forum posts. Retraction state
    -- rides (it is the caller's record's state); retracted_by_group_id is
    -- omitted — a third party's identity is not the caller's data.
    'authored_announcements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', a.id,
               'scope_kind', a.scope_kind,
               'scope_group_id', a.scope_group_id,
               'title', a.title,
               'body', a.body,
               'created_at', a.created_at,
               'retracted_at', a.retracted_at)
             ORDER BY a.created_at ASC, a.id ASC)
        FROM public.announcements a
       WHERE a.author_group_id = v_me), '[]'::jsonb)
  );
END;
$function$
;

-- ----------------------------------------------------------------------------
-- 4. The instrument — deliberately NOT built here
-- ----------------------------------------------------------------------------
-- TASK-DM-01 asked for "an instrument counting conversations with zero
-- surviving participants". It already exists: the integration global teardown
-- counts `orphaned_conversations` (global-teardown.ts:68-70) and sweeps them
-- (:142-147), both added in the 2026-08-12 teardown work and already citing
-- TASK-DM-01 by name. Building a database view as well would add the FIRST
-- view in the entire schema — a first-of-its-kind object class facing the
-- ownership-manifest gate, which COR-D W8 widened to relkind 'v' — for no
-- coverage that is not already there. The disposition above is what makes the
-- existing counter read zero; STORY-7 asserts exactly that.
