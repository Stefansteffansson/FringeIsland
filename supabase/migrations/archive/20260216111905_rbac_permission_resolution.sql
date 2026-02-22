-- =====================================================
-- RBAC Sub-Sprint 2: Permission Resolution Functions
-- =====================================================
-- Creates has_permission() and get_user_permissions() for
-- two-tier permission resolution (system + context groups).

-- ─────────────────────────────────────────────────────
-- Function 1: has_permission (boolean check)
-- ─────────────────────────────────────────────────────
-- Used by: integration tests, future RLS policies
-- Signature matches test expectations: rpc('has_permission', { p_user_id, p_group_id, p_permission_name })

CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_group_id UUID,
  p_permission_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  -- NULL handling: fail closed
  IF p_user_id IS NULL OR p_group_id IS NULL OR p_permission_name IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Tier 1: System group permissions (always active)
  -- Check if user is an active member of ANY system group
  -- that has a role granting this permission
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    INNER JOIN public.groups g ON g.id = gm.group_id
    INNER JOIN public.user_group_roles ugr ON (
      ugr.user_id = gm.user_id
      AND ugr.group_id = gm.group_id
    )
    INNER JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
    INNER JOIN public.permissions p ON p.id = grp.permission_id
    WHERE gm.user_id = p_user_id
      AND gm.status = 'active'
      AND g.group_type = 'system'
      AND p.name = p_permission_name
  ) INTO v_found;

  -- Short-circuit: if found in system groups, return immediately
  IF v_found THEN
    RETURN TRUE;
  END IF;

  -- Tier 2: Context group permissions (specific group)
  -- Check if user is an active member of the target group
  -- AND has a role there that grants this permission
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    INNER JOIN public.user_group_roles ugr ON (
      ugr.user_id = gm.user_id
      AND ugr.group_id = gm.group_id
    )
    INNER JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
    INNER JOIN public.permissions p ON p.id = grp.permission_id
    WHERE gm.user_id = p_user_id
      AND gm.group_id = p_group_id
      AND gm.status = 'active'
      AND p.name = p_permission_name
  ) INTO v_found;

  RETURN v_found;
END;
$$;

-- ─────────────────────────────────────────────────────
-- Function 2: get_user_permissions (batch fetch)
-- ─────────────────────────────────────────────────────
-- Used by: usePermissions() React hook
-- Returns deduplicated array of all permission names

CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id UUID,
  p_group_id UUID
) RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_permissions TEXT[];
BEGIN
  -- NULL handling
  IF p_user_id IS NULL OR p_group_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Combine Tier 1 (system) + Tier 2 (context) in one query
  SELECT ARRAY_AGG(DISTINCT p.name)
  FROM public.group_memberships gm
  INNER JOIN public.groups g ON g.id = gm.group_id
  INNER JOIN public.user_group_roles ugr ON (
    ugr.user_id = gm.user_id
    AND ugr.group_id = gm.group_id
  )
  INNER JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
  INNER JOIN public.permissions p ON p.id = grp.permission_id
  WHERE gm.user_id = p_user_id
    AND gm.status = 'active'
    AND (
      g.group_type = 'system'   -- Tier 1: always active
      OR g.id = p_group_id      -- Tier 2: specific context
    )
  INTO v_permissions;

  RETURN COALESCE(v_permissions, ARRAY[]::TEXT[]);
END;
$$;

-- ─────────────────────────────────────────────────────
-- Permissions
-- ─────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.has_permission IS 'RBAC: Check if user has specific permission in group context. Two-tier: system groups (always active) + context group.';
COMMENT ON FUNCTION public.get_user_permissions IS 'RBAC: Get array of all permission names user has in group context. Combines system + context tiers.';
