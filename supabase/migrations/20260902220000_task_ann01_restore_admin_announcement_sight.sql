-- TASK-ANN-01 — CORRECTIVE: restore the FEAT-PC026 admin sight arm on
-- get_group_announcements, dropped when FEAT-PD019 tranche 3 re-issued the
-- function on 2026-08-20 (migration 20260820150000).
--
-- WHAT BROKE. PC026 (ADM-G, 20260804230000) admitted a platform admin to a
-- SUSPENDED group's forum, announcements and conversations without membership
-- — "exactly where the admin plane has already acted". T3 re-issued
-- get_group_announcements to add the wielded (p_acting) limb and its personal
-- branch came back as a bare membership check: the arm
--   OR (public.is_platform_admin() AND <group is suspended>)
-- was lost. The PC023 STORY-8 quarantine two lines below still names
-- is_platform_admin(), so the file READS as if admins are handled — they are
-- refused first with 'Group membership required' (42501). Forum and
-- conversations kept their arms; announcements alone lost it.
--
-- BLAST RADIUS: /admin/groups/[id] for a suspended group — the H041 wing's
-- Announcements pane 404-collapses. Thirteen days on production, unnoticed:
-- the T3 sibling sweep named only the announcement suites, never
-- admin/suspended-group-admin-access.test.ts (whose cell "get_group_
-- announcements admits the admin" is exactly this) nor
-- admin-suspended-content.spec.ts (which asserts the pane). Found 2026-09-02
-- by the first full integration run since (TASK-INT-01's close).
--
-- THE FIX: the T3 body byte-identical, except the personal branch regains
-- the arm. The wielded limb is untouched — the admin plane does not wield.
--
-- SIBLING ASSERTIONS (named, all LEFT — this restores pinned behaviour):
--   * admin/suspended-group-admin-access.test.ts — the red cell flips green.
--   * tests/e2e/admin-suspended-content.spec.ts — the Announcements pane
--     assertion flips green.
--   * the announcement suites + wielded-announcements E2E — unchanged (the
--     personal path for members and the wielded limb are byte-identical).
--   * Q1: the affected E2E journeys (the two admin specs) join the post-apply
--     verification set.

CREATE OR REPLACE FUNCTION public.get_group_announcements(
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
    -- FEAT-PC026 (ADM-G): the suspended-scoped admin sight arm — a platform
    -- admin is admitted exactly where the admin plane has already acted
    -- (group-suspension); everywhere else the member-plane refusal is
    -- byte-identical (private and absent look identical below the admin
    -- plane). RESTORED by TASK-ANN-01 after the T3 re-issue dropped it.
    IF NOT public.is_active_group_member(p_group_id)
       AND NOT (public.is_platform_admin()
                AND (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended') THEN
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

-- The ACL is unchanged by CREATE OR REPLACE (same signature); re-stated so
-- the intent is in this file too (the house rule: revoke paired with grant).
REVOKE ALL ON FUNCTION public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER, UUID) TO authenticated, service_role;
