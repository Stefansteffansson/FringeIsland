-- ADR-U038 tranche 2 (F2) — relocate the member-groups read-model into the platform
-- substrate as a single RPC, so a sibling Surface inherits the composition instead of
-- cloning the 4-step pipeline (actor resolution -> memberships -> groups -> counts) in
-- client code (as hub/lib/groups/queries.ts did).
--
--   get_member_groups() — SECURITY DEFINER, self-scoped by the caller's personal group
--   (public.get_current_personal_group_id(), same DEFINER pattern as its sibling
--   composition helpers). Returns the caller's ACTIVE engagement groups with a live
--   active-member count. Empty when the caller has no personal group or no memberships.
--
-- RLS note: DEFINER by design (composition helper, mirrors get_group_member_counts /
-- get_current_personal_group_id). It only ever returns groups the caller is an active
-- member of (WHERE member_group_id = the caller's own personal group), so there is no
-- cross-subject exposure; the member_count is the group's true active-member total.
--
-- Schema change (new Core RPC, PC-3 Organisation) — schema-review gate + platform/core
-- carve-out: lands at status `review`. CREATE OR REPLACE, re-runnable. Additive.

CREATE OR REPLACE FUNCTION public.get_member_groups()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  label text,
  is_public boolean,
  created_at timestamptz,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_personal_group_id uuid;
BEGIN
  v_personal_group_id := public.get_current_personal_group_id();
  IF v_personal_group_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      g.id,
      g.name,
      g.description,
      g.label,
      g.is_public,
      g.created_at,
      (SELECT count(*)
         FROM public.group_memberships gm2
        WHERE gm2.group_id = g.id
          AND gm2.status = 'active')::bigint AS member_count
    FROM public.group_memberships gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.member_group_id = v_personal_group_id
      AND gm.status = 'active'
      AND g.group_type = 'engagement'
    ORDER BY g.created_at;
END;
$$;

COMMENT ON FUNCTION public.get_member_groups() IS
  'GRP-4 / ADR-U038 F2: the member''s active engagement groups + live active-member count, '
  'self-scoped by the caller''s personal group. SECURITY DEFINER composition helper.';

REVOKE ALL ON FUNCTION public.get_member_groups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_groups() TO authenticated;
