-- ============================================================================
-- FEAT-PD019 tranche 3 (TASK-PD019-3) — wielded community announcements: the
-- family's LAST tranche. The group can hear, speak to, and correct itself
-- before its host community.
--
-- Walk findings at pull (spec STORY-5, 2026-08-20 — no board forks):
--   * Retraction is already a ROLE POWER (`send_announcements` in the scope
--     group retracts any community announcement — probed applied body), so
--     wielded retract carries the family's own gate; no author-right posture.
--   * The platform arm is NEVER wieldable — structurally: its scope group is
--     NULL, which limb 2a refuses. No special-case code exists to drift.
--   * The wielded send carries TWO consequences:
--       1. DUAL ACTOR EXCLUSION — one act, two identities: neither the
--          author-of-record (A) nor the acting person (the wielder, if
--          personally a member) hears its own announcement. On the personal
--          path v_actor = v_me and the predicate is byte-identical to today.
--       2. The FIM-visible payload's sent_by_group_id becomes A — the
--          current v_me would leak the person behind the hat (the PD019
--          privacy posture: the person lives in the platform audit path
--          only).
--   * The FEAT-PD020 interplay: the fan-out still writes engagement-group
--     recipient rows; the PD020 BEFORE-INSERT trigger expands each to its
--     answerers' personal rows with the current actor excluded NULL-safely —
--     the dead-letter class stays retired under wielded authorship. Proven
--     by cell (A2), guarded for the personal path (G2), never assumed.
--
-- Three DROP + CREATE re-issues, each gaining trailing p_acting uuid DEFAULT
-- NULL (the 20260706150000 overload lesson); bodies copied from the APPLIED
-- definitions (probed 2026-08-20); ACLs {authenticated, service_role}
-- re-stated; availability-guard subject = the actor of record (the T1
-- ruling); S5 posture (limb 1 first — keyless learns nothing).
--
-- Sibling assertions (sweep 2026-08-20): the announcement suites
-- (announcement-contracts, window-and-report-contracts, the notifications
-- family incl. group-addressed-expansion, communication-export, E2E
-- announcement specs) assert personal-path behaviour only — byte-identical
-- here; no arity pins exist. ALL DELIBERATELY LEFT; the post-apply
-- communication + notifications slices are the verifier. Red-first cells:
-- wielded-announcement-contracts.test.ts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_group_announcements — the board read (membership is the family's bar)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER);

CREATE FUNCTION public.get_group_announcements(
  p_group_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_list JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_acting IS NULL THEN
    IF NOT public.is_active_group_member(p_group_id) THEN
      RAISE EXCEPTION 'Group membership required' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019 T3: the two-limb gate (limbs 1+2a — membership IS the bar).
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, p_group_id);
  END IF;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  IF (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_list
  FROM (
    SELECT a.created_at AS sort_ts,
           jsonb_build_object(
             'id', a.id, 'title', a.title, 'body', a.body,
             'created_at', a.created_at, 'author_group_id', a.author_group_id,
             'author', public.ds5_resolve_author_display(a.author_group_id, p_group_id)
           ) AS row_doc
    FROM public.announcements a
    WHERE a.scope_kind = 'community'
      AND a.scope_group_id = p_group_id
      AND a.retracted_at IS NULL
      AND (p_before IS NULL OR a.created_at < p_before)
    ORDER BY a.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('announcements', v_list);
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. send_community_announcement — the group speaks to the community
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.send_community_announcement(UUID, TEXT, TEXT);

CREATE FUNCTION public.send_community_announcement(
  p_group_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_actor UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_title IS NULL OR length(trim(p_title)) = 0
     OR p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Title and body must not be empty' USING ERRCODE = '22023';
  END IF;
  IF length(p_title) > 200 OR length(p_body) > 10000 THEN
    RAISE EXCEPTION 'Title or body too long' USING ERRCODE = '22023';
  END IF;
  IF p_acting IS NULL THEN
    IF NOT public.has_permission(v_me, p_group_id, 'send_announcements') THEN
      RAISE EXCEPTION 'send_announcements required' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019 T3: the two-limb gate WITH the family's permission.
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, p_group_id, 'send_announcements');
  END IF;
  v_actor := COALESCE(p_acting, v_me);
  -- FEAT-PC023: the availability guard — subject is the actor of record
  -- (pure substitution, the tranche-1 ruling).
  PERFORM public.assert_group_writable(p_group_id, v_actor);

  INSERT INTO public.announcements
    (scope_kind, scope_group_id, author_group_id, title, body)
  VALUES ('community', p_group_id, v_actor, p_title, p_body)
  RETURNING * INTO v_row;

  -- Fan-out. DUAL ACTOR EXCLUSION (one act, two identities); the FIM-visible
  -- sent_by names the AUTHOR OF RECORD — never the person behind a hat.
  -- Engagement-group recipient rows expand via the FEAT-PD020 trigger
  -- (answerers' personal rows, actor excluded) — no dead letters, by
  -- construction and by cell.
  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  SELECT gm.member_group_id, 'announcement', p_title, p_body,
         jsonb_build_object(
           'announcement_id', v_row.id,
           'scope_kind', 'community',
           'scope_group_id', p_group_id,
           'sent_by_group_id', v_actor
         )
  FROM public.group_memberships gm
  WHERE gm.group_id = p_group_id
    AND gm.status = 'active'
    AND gm.member_group_id <> v_actor
    AND gm.member_group_id <> v_me;

  RETURN jsonb_build_object(
    'id', v_row.id, 'title', v_row.title, 'body', v_row.body,
    'created_at', v_row.created_at, 'author_group_id', v_actor,
    'author', public.ds5_resolve_author_display(v_actor, p_group_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_community_announcement(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_community_announcement(UUID, TEXT, TEXT, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. retract_announcement — the correction (role power, wielded verbatim)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.retract_announcement(UUID);

CREATE FUNCTION public.retract_announcement(
  p_announcement_id UUID,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_actor UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.announcements
  WHERE id = p_announcement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_acting IS NOT NULL THEN
    -- FEAT-PD019 T3: the two-limb gate against the announcement's scope
    -- group. A PLATFORM announcement's scope group is NULL — limb 2a refuses
    -- by construction (the DeusEx plane is never wieldable).
    PERFORM public.ds5_assert_wielded_content_gate(
      v_me, p_acting,
      CASE WHEN v_row.scope_kind = 'community' THEN v_row.scope_group_id ELSE NULL END,
      'send_announcements');
    v_actor := p_acting;
    -- FEAT-PC023: the availability guard — subject is the actor of record.
    PERFORM public.assert_group_writable(v_row.scope_group_id, v_actor);
  ELSE
    v_actor := v_me;
    IF v_row.scope_kind = 'community' THEN
      IF NOT public.has_permission(v_me, v_row.scope_group_id, 'send_announcements') THEN
        RAISE EXCEPTION 'send_announcements required' USING ERRCODE = '42501';
      END IF;
    -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
    -- suspended refuses everyone below the admin plane).
    PERFORM public.assert_group_writable(v_row.scope_group_id, v_me);
    ELSE
      IF NOT public.has_permission(
        v_me, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
      ) THEN
        RAISE EXCEPTION 'manage_all_groups required' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF v_row.retracted_at IS NULL THEN
    UPDATE public.announcements
    SET retracted_at = NOW(), retracted_by_group_id = v_actor
    WHERE id = p_announcement_id
    RETURNING * INTO v_row;

    IF v_row.scope_kind = 'platform' THEN
      INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
      VALUES (v_me, 'retract_platform_announcement', v_row.id::text,
              jsonb_build_object('title', v_row.title));
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'retracted_at', v_row.retracted_at);
END;
$$;

REVOKE ALL ON FUNCTION public.retract_announcement(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retract_announcement(UUID, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Verification — old arities gone, ACLs clean
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad TEXT;
BEGIN
  SELECT string_agg(p.proname || '/' || p.pronargs, ', ') INTO v_bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND ((p.proname = 'get_group_announcements' AND p.pronargs <> 4)
      OR (p.proname = 'send_community_announcement' AND p.pronargs <> 4)
      OR (p.proname = 'retract_announcement' AND p.pronargs <> 2));
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'PD019-T3: stale announcement overloads survived the drop: %', v_bad;
  END IF;

  IF has_function_privilege('anon', 'public.get_group_announcements(uuid, timestamptz, integer, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.send_community_announcement(uuid, text, text, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.retract_announcement(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PD019-T3: anon holds EXECUTE on a re-issued announcement contract';
  END IF;

  RAISE NOTICE 'PD019-T3 verified: the family''s last tranche live — three contracts wielded, old arities gone, ACLs clean';
END $$;
