-- ============================================================================
-- FEAT-PD019 tranche 1 (TASK-PD019-1) — wielded content authorship: the
-- ADR-U041 acting parameter reaches the forum contracts, and the attribution
-- ladder learns to name a group author.
--
-- Board settled 2026-08-15 (TASK-ACT-01): read + write, forum family first.
-- H018 shipped acting as "pure substitution rendered honestly", but no content
-- contract accepted an acting group — a hat granting view_forum /
-- post_forum_messages opened nothing. This migration:
--
--   1. ds5_assert_wielded_content_gate  NEW internal helper — the two-limb
--      PC015 gate (the exact pattern of get_group_memberships_of /
--      leave_group_as_group, 20260706120000:331,464), shared by the three
--      contracts here and by tranches 2/3 (conversations, announcements)
--      when they are pulled. Registered DS-5 in ownership.manifest.json.
--   2. ds5_resolve_author_display  re-issued — REBASED VERBATIM on the
--      TASK-DM-02 body (20260815190000; applied def probed identical
--      2026-08-16). The identity gate widens: resolvable is a personal group
--      with a live non-decommissioned backing users row OR an engagement
--      group. Resolvable returns gain an additive kind: 'person'|'group';
--      rung-3 returns stay byte-identical (no kind — 'Unknown' claims none).
--   3. get_group_forum / create_forum_post / reply_to_forum_post  gain
--      p_acting uuid DEFAULT NULL — DROP + CREATE, not CREATE OR REPLACE
--      (the 20260706150000 lesson: a changed signature via create-or-replace
--      leaves a same-name overload alive beside it). NULL keeps every path
--      byte-identical to the 20260803190000 bodies (copied from the APPLIED
--      definitions, probed 2026-08-16). A wielded write stamps
--      author_group_id = the acting group; the wielding person stays in the
--      platform audit path only (PC015 Open Q4 posture).
--
-- Wielded availability: assert_group_writable runs with the acting group as
-- subject — pure substitution; the group's own rest_group standing governs.
--
-- ACL provenance (probed on the APPLIED objects, not the migration text —
-- the TASK-SEC-01 discipline): the trio carries {authenticated, service_role};
-- the ladder carries {service_role} only (authenticated revoked at DM-02).
-- Both postures are re-stated below. Per-function revoke lines are
-- load-bearing (ALTER DEFAULT PRIVILEGES does NOT cover new functions).
--
-- Sibling assertions (sweep 2026-08-16 — the migration names what it
-- invalidates):
--   hub/tests/integration/communication/forum-contracts.test.ts:443  ADAPTED
--     (rung-2 person author object gains kind: 'person')
--   hub/tests/integration/communication/forum-contracts.test.ts:449  ADAPTED
--     (rung-2 sender object via get_conversation_detail gains kind: 'person')
--   hub/tests/integration/communication/forum-contracts.test.ts:513
--     DELIBERATELY LEFT — rung-3 'Unknown' stays byte-identical (now doubles
--     as the guard that rung 3 stays kind-less)
--   hub/tests/integration/communication/member-erasure-disposition.test.ts:337
--     DELIBERATELY LEFT — same rung-3 guard, DM sender shape
--   All other author/sender consumers assert key-by-key (tolerant readers).
--   Red-first cells: wielded-forum-contracts.test.ts (TASK-PD019-1).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The two-limb wielding gate for content contracts (NEW, internal)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_assert_wielded_content_gate(
  p_actor UUID,
  p_acting_group_id UUID,
  p_context_group_id UUID,
  p_permission_name TEXT
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Limb 1 — the key: the caller personally holds act_as_group in the acting
  -- group. Wielding precedes existence (the S5 adversarial posture): a
  -- keyless caller learns nothing about the acting group's standing — 42501
  -- whether or not that standing exists.
  IF NOT public.has_permission(p_actor, p_acting_group_id, 'act_as_group') THEN
    RAISE EXCEPTION 'you do not have permission to act as this group'
      USING ERRCODE = '42501';
  END IF;

  -- Limb 2a — standing: the acting group is an ACTIVE engagement group and an
  -- ACTIVE member of the context group (the is_member_of_context posture,
  -- 20260706150000; membership-freshness — paused/gone refuses honestly).
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    JOIN public.groups g ON g.id = gm.member_group_id
    WHERE gm.group_id = p_context_group_id
      AND gm.member_group_id = p_acting_group_id
      AND gm.status = 'active'
      AND g.group_type = 'engagement'
      AND g.status = 'active'
  ) THEN
    RAISE EXCEPTION 'the acting group is not an active member of this group'
      USING ERRCODE = '42501';
  END IF;

  -- Limb 2b — the group's own power: the acting group itself holds the
  -- content permission in the context (has_permission is group-to-group,
  -- 20260222000000 — the same substitution machinery H018's panel renders).
  IF NOT public.has_permission(p_acting_group_id, p_context_group_id, p_permission_name) THEN
    RAISE EXCEPTION 'the acting group does not hold % in this group', p_permission_name
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.ds5_assert_wielded_content_gate(UUID, UUID, UUID, TEXT) IS
  'FEAT-PD019 (ADR-U041): the two-limb wielding gate for DS-5 content contracts — limb 1 the caller''s personal act_as_group key in the acting group (S5: keyless learns nothing); limb 2 the acting group''s own active standing + content permission in the context. One level, both limbs, per act — no chaining (ADR-U041 §2d). Refusals are 42501 naming the failing limb. SECURITY DEFINER: role-fabric walk across RLS from inside definer contracts; internal — not client-callable.';

REVOKE ALL ON FUNCTION public.ds5_assert_wielded_content_gate(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ds5_assert_wielded_content_gate(UUID, UUID, UUID, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- 2. The attribution ladder — the identity gate widens to engagement groups
--    (re-issued from 20260815190000; rungs and strings unchanged; resolvable
--    returns gain additive kind, rung 3 stays byte-identical)
-- ----------------------------------------------------------------------------
--   Ladder (COM-14; strings per board CB-9; ADR-U021 display law):
--     rung 1  author resolves to an admitted identity WITH a membership row
--             (any status) in the scope group
--             -> the privacy-shaped name, attribution 'active', kind
--     rung 2  admitted identity, no membership row in scope
--             -> 'Former member' / 'former' / kind  (name withheld)
--     rung 3  NULL author, no backing users row (the [Deleted User] sentinel
--             and every system group), a DECOMMISSIONED backing row
--             (TASK-DM-02), or resolution failure
--             -> 'Unknown' / 'unknown'  (no kind — 'Unknown' claims none)
--   Admitted identities (FEAT-PD019): a personal group with a live
--   non-decommissioned backing users row (kind 'person'), or an engagement
--   group with a live groups row (kind 'group'). System groups are never
--   admitted. A DM has no scope group: rung 1 collapses to resolvable -> name.
CREATE OR REPLACE FUNCTION public.ds5_resolve_author_display(
  p_author_group_id UUID,
  p_scope_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_kind TEXT;
BEGIN
  IF p_author_group_id IS NULL THEN
    RETURN jsonb_build_object('display_name', 'Unknown', 'attribution', 'unknown');
  END IF;

  -- identity gate (TASK-DM-02, widened by FEAT-PD019): a personal group with
  -- a LIVE backing users row, or an engagement group. The sentinel and
  -- DeusEx are system groups — not admitted; a decommissioned backing row is
  -- a scrubbed-in-place identity whose stored name is exactly the literal
  -- the display law forbids.
  SELECT g.name,
         CASE WHEN g.group_type = 'engagement' THEN 'group' ELSE 'person' END
  INTO v_name, v_kind
  FROM public.groups g
  LEFT JOIN public.users u ON u.personal_group_id = g.id
  WHERE g.id = p_author_group_id
    AND (g.group_type = 'engagement'
         OR (u.id IS NOT NULL AND NOT u.is_decommissioned));
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('display_name', 'Unknown', 'attribution', 'unknown');
  END IF;

  -- DM rung: no scope group — resolvable is enough.
  IF p_scope_group_id IS NULL THEN
    RETURN jsonb_build_object('display_name', v_name, 'attribution', 'active', 'kind', v_kind);
  END IF;

  -- rung 1 vs rung 2: membership row in the scope group, any status —
  -- paused is still a member; leave/removal delete the row (ADR-U021).
  IF EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = p_scope_group_id
      AND gm.member_group_id = p_author_group_id
  ) THEN
    RETURN jsonb_build_object('display_name', v_name, 'attribution', 'active', 'kind', v_kind);
  END IF;

  RETURN jsonb_build_object('display_name', 'Former member', 'attribution', 'former', 'kind', v_kind);
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_resolve_author_display(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. get_group_forum — DROP + CREATE with p_acting (read as the group)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_group_forum(UUID, TIMESTAMPTZ, INTEGER);

CREATE FUNCTION public.get_group_forum(
  p_group_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_posts JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_acting IS NULL THEN
    IF NOT public.has_permission(v_me, p_group_id, 'view_forum') THEN
      RAISE EXCEPTION 'view_forum required' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019: the two-limb wielding gate — the representative reads with
    -- the group's eyes; the personal check is substituted, not stacked.
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, p_group_id, 'view_forum');
  END IF;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  IF (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_posts
  FROM (
    SELECT
      t.created_at AS sort_ts,
      jsonb_build_object(
        'id', t.id,
        'parent_post_id', NULL,
        'content', CASE WHEN t.is_deleted THEN NULL ELSE t.content END,
        'is_deleted', t.is_deleted,
        'created_at', t.created_at,
        'updated_at', t.updated_at,
        'author_group_id', t.author_group_id,
        'author', public.ds5_resolve_author_display(t.author_group_id, p_group_id),
        'replies', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', r.id,
            'parent_post_id', r.parent_post_id,
            'content', CASE WHEN r.is_deleted THEN NULL ELSE r.content END,
            'is_deleted', r.is_deleted,
            'created_at', r.created_at,
            'updated_at', r.updated_at,
            'author_group_id', r.author_group_id,
            'author', public.ds5_resolve_author_display(r.author_group_id, p_group_id),
            'replies', '[]'::jsonb
          ) ORDER BY r.created_at ASC), '[]'::jsonb)
          FROM public.forum_posts r
          WHERE r.parent_post_id = t.id
        )
      ) AS row_doc
    FROM public.forum_posts t
    WHERE t.group_id = p_group_id
      AND t.parent_post_id IS NULL
      AND (p_before IS NULL OR t.created_at < p_before)
    ORDER BY t.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('posts', v_posts);
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_forum(UUID, TIMESTAMPTZ, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_forum(UUID, TIMESTAMPTZ, INTEGER, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. create_forum_post — DROP + CREATE with p_acting (post as the group)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_forum_post(UUID, TEXT);

CREATE FUNCTION public.create_forum_post(
  p_group_id UUID,
  p_content TEXT,
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
  v_author UUID;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Post content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_acting IS NULL THEN
    IF NOT public.has_permission(v_me, p_group_id, 'post_forum_messages') THEN
      RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019: the two-limb wielding gate — the group speaks where it
    -- belongs; the wielding person is recorded platform-side only (Open Q4).
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, p_group_id, 'post_forum_messages');
  END IF;
  v_author := COALESCE(p_acting, v_me);
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane). The subject is the
  -- actor of record — pure substitution: a wielded write is governed by the
  -- acting group's own standing.
  PERFORM public.assert_group_writable(p_group_id, v_author);

  INSERT INTO public.forum_posts (group_id, author_group_id, content)
  VALUES (p_group_id, v_author, p_content)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'parent_post_id', v_row.parent_post_id,
    'content', v_row.content,
    'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, p_group_id),
    'replies', '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_forum_post(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_forum_post(UUID, TEXT, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. reply_to_forum_post — DROP + CREATE with p_acting (reply as the group)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reply_to_forum_post(UUID, TEXT);

CREATE FUNCTION public.reply_to_forum_post(
  p_parent_post_id UUID,
  p_content TEXT,
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
  v_author UUID;
  v_parent RECORD;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Reply content must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT id, group_id INTO v_parent
  FROM public.forum_posts WHERE id = p_parent_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent post not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_acting IS NULL THEN
    IF NOT public.has_permission(v_me, v_parent.group_id, 'reply_to_messages') THEN
      RAISE EXCEPTION 'reply_to_messages required' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019: the two-limb wielding gate.
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, v_parent.group_id, 'reply_to_messages');
  END IF;
  v_author := COALESCE(p_acting, v_me);
  -- FEAT-PC023: the availability guard — subject is the actor of record
  -- (pure substitution, as in create_forum_post above).
  PERFORM public.assert_group_writable(v_parent.group_id, v_author);

  INSERT INTO public.forum_posts (group_id, author_group_id, parent_post_id, content)
  VALUES (v_parent.group_id, v_author, p_parent_post_id, p_content)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'parent_post_id', v_row.parent_post_id,
    'content', v_row.content,
    'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_parent.group_id),
    'replies', '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_forum_post(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_forum_post(UUID, TEXT, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Verification — old arities gone, ACLs clean
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad TEXT;
BEGIN
  SELECT string_agg(p.proname || '/' || p.pronargs, ', ') INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND ((p.proname = 'get_group_forum' AND p.pronargs <> 4)
      OR (p.proname = 'create_forum_post' AND p.pronargs <> 3)
      OR (p.proname = 'reply_to_forum_post' AND p.pronargs <> 3));
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'PD019-T1: stale forum-contract overloads survived the drop: %', v_bad;
  END IF;

  IF has_function_privilege('anon', 'public.get_group_forum(uuid, timestamptz, integer, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.create_forum_post(uuid, text, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.reply_to_forum_post(uuid, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PD019-T1: anon holds EXECUTE on a re-issued forum contract';
  END IF;
  IF has_function_privilege('anon', 'public.ds5_assert_wielded_content_gate(uuid, uuid, uuid, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.ds5_assert_wielded_content_gate(uuid, uuid, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PD019-T1: the wielding gate is client-executable';
  END IF;

  RAISE NOTICE 'PD019-T1 verified: three contracts re-issued with p_acting (old arities gone), wielding gate internal, ladder widened';
END $$;
