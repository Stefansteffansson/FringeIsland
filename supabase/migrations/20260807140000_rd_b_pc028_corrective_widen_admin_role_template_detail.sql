-- ============================================================================
-- RD-B FEAT-PC028 — CORRECTIVE: widen admin_get_role_template_detail.
--
-- WHY THIS EXISTS
--
-- FEAT-PC028's payload walk recorded, and its spec still states, finding 2:
--
--   "The admin reach display had NO server key at all —
--    admin_get_role_template_detail knows nothing about publications.
--    PC028 widens it rather than adding a fourth read."
--
-- The widening was never carried into 20260807090000. PC028 shipped 6-done
-- with that commitment unfulfilled, and the miss was found at the start of the
-- Hub half (FEAT-H044) when STORY-3's reach section had nothing to read.
-- Verified three ways before this file was written: the PC028 migration does
-- not mention the function; no later migration re-issues it; and the LIVE
-- catalogue's definition contains neither 'role_template_publications' nor
-- 'retired_at' (pg_get_functiondef, 2026-08-07).
--
-- TWO keys are missing, not one. STORY-3 also needs retirement state — "a
-- retired template's publish action is unavailable and the surface says why"
-- — and the detail read never carried `retired_at` either. RD-A added it to
-- the LIST read (admin_get_role_templates) but not to the detail read, so the
-- Hub's detail page could only learn retirement by holding a list row.
--
-- WHAT THIS DOES
--
-- Re-issues the function with a BYTE-IDENTICAL signature (the COR-A pattern:
-- create-or-replace preserves the ACL, so no grant is re-stated here) and adds
-- exactly two keys. Nothing else about the payload moves — `template`,
-- `versions` and `generated_at` keep their existing shapes and their existing
-- consumers.
--
-- NO new table, NO new grant, NO RLS change. role_template_publications
-- already exists with RLS enabled, zero write grants, and a select policy
-- (20260807090000); this function is SECURITY DEFINER behind is_platform_admin
-- exactly as before, so the reach data is admin-plane only and no caller
-- gains a read they did not already have through the admin gate.
--
-- ADR-U038: the rule stays below the Platform API. The Hub renders reach; it
-- never computes it, and a sibling Surface calling the same RPC gets the same
-- payload.
--
-- SIBLING ASSERTIONS INVALIDATED: NONE — and this was grepped, not assumed.
--
-- The change is purely ADDITIVE: two keys appear, none moves, none is renamed,
-- none is removed, and no user-facing copy is driven by either. Every existing
-- consumer of this function reads `template.*` / `versions[]` / `generated_at`
-- and is untouched.
--
-- Greps run across the whole suite and both surfaces:
--   admin_get_role_template_detail  — 1 contract test file + 1 lib wrapper +
--                                     1 BFF route; all read existing keys only
--   role_template_publications      — PC028's own cells (unchanged semantics)
--   'retired_at'                    — asserted against admin_get_role_templates
--                                     (the LIST read), which this does not touch
--
-- ADAPTED: none. DELIBERATELY LEFT: none. The two new integration cell groups
-- (C1-C5) are NEW coverage, red until this file is applied; C6 pins the
-- pre-existing admin gate and is green on both sides by design.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_role_template_detail(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_template jsonb;
  v_versions jsonb;
  v_publications jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
           'id', rt.id, 'name', rt.name, 'description', rt.description,
           'is_system', rt.is_system,
           -- ADDED (corrective): STORY-3 renders "publish unavailable, and
           -- here is why" from this. Present unconditionally — retired or not
           -- — so the admin render reads it without branching on absence,
           -- matching how RD-A put it on the LIST read.
           'retired_at', rt.retired_at)
    INTO v_template
    FROM public.role_templates rt
   WHERE rt.id = p_template_id;
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Role template not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(jsonb_agg(v.doc ORDER BY v.vn), '[]'::jsonb)
    INTO v_versions
    FROM (
      SELECT ver.version_number AS vn,
             jsonb_build_object(
               'id', ver.id,
               'version_number', ver.version_number,
               'name', ver.name,
               'description', ver.description,
               'created_at', ver.created_at,
               'created_by_display_name', g.name,
               'permission_names',
                 COALESCE((SELECT jsonb_agg(p.name ORDER BY p.name)
                             FROM public.role_template_version_permissions vp
                             JOIN public.permissions p ON p.id = vp.permission_id
                            WHERE vp.role_template_version_id = ver.id), '[]'::jsonb),
               'is_default', (ver.id = rt.default_version_id)
             ) AS doc
        FROM public.role_template_versions ver
        JOIN public.role_templates rt ON rt.id = ver.role_template_id
        LEFT JOIN public.groups g ON g.id = ver.created_by
       WHERE ver.role_template_id = p_template_id
    ) v;

  -- ADDED (corrective): reach as data (RD-8). A NULL group_id is the
  -- platform-wide row, and it sorts FIRST so the surface reads the broadest
  -- reach before the named ones. group_name is NULL for that row by
  -- construction — the Hub says "all groups" rather than naming a group,
  -- which is why the key is nullable rather than defaulted to a label here
  -- (copy belongs to the surface; reach belongs to the platform).
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'group_id', pub.group_id,
             'group_name', g.name,
             'published_at', pub.published_at)
           ORDER BY (pub.group_id IS NOT NULL), g.name), '[]'::jsonb)
    INTO v_publications
    FROM public.role_template_publications pub
    LEFT JOIN public.groups g ON g.id = pub.group_id
   WHERE pub.role_template_id = p_template_id;

  RETURN jsonb_build_object(
    'template', v_template,
    'versions', v_versions,
    -- ADDED (corrective): the key FEAT-H044 STORY-3 reads. Named
    -- `publications` (not `reach`) to match the table it comes from, so a
    -- reader tracing the payload lands on role_template_publications.
    'publications', v_publications,
    'generated_at', now());
END;
$$;

COMMENT ON FUNCTION public.admin_get_role_template_detail(uuid) IS
  'ADM-F FEAT-PC025: one template''s version ledger with per-version '
  'permission sets (both sides of the Hub diff preview — the client only '
  'presents). P0002 unknown id; 42501 non-admin. '
  'RD-B FEAT-PC028 corrective (2026-08-07): widened with template.retired_at '
  'and publications[] (group_id NULL = platform-wide, sorted first) — the '
  'widening PC028''s payload walk committed to and its migration omitted. '
  'Signature byte-identical, so the ACL is preserved by create-or-replace.';
