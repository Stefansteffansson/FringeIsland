-- RBAC Sub-Sprint 4: Role Management
-- Migration: manage_roles permission, RLS policy updates, trigger fix, description column
--
-- Addresses failing tests in B-RBAC-018 through B-RBAC-025

-- ============================================================================
-- 1. Add manage_roles permission to catalog
-- ============================================================================

INSERT INTO public.permissions (name, description, category)
VALUES ('manage_roles', 'Create, edit, and delete custom roles and configure their permissions', 'group_management');

-- ============================================================================
-- 2. Add description column to group_roles
-- ============================================================================

ALTER TABLE public.group_roles ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- 3. Add manage_roles to Steward role template
-- ============================================================================

INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name = 'Steward Role Template'
  AND p.name = 'manage_roles'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Backfill manage_roles to ALL existing Steward role instances
-- ============================================================================

INSERT INTO public.group_role_permissions (group_role_id, permission_id)
SELECT gr.id, p.id
FROM public.group_roles gr
JOIN public.role_templates rt ON gr.created_from_role_template_id = rt.id
CROSS JOIN public.permissions p
WHERE rt.name = 'Steward Role Template'
  AND p.name = 'manage_roles'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Add manage_roles to Deusex system role
-- ============================================================================

INSERT INTO public.group_role_permissions (group_role_id, permission_id)
SELECT gr.id, p.id
FROM public.group_roles gr
JOIN public.groups g ON gr.group_id = g.id
CROSS JOIN public.permissions p
WHERE g.name = 'Deusex'
  AND g.group_type = 'system'
  AND gr.name = 'Deusex'
  AND p.name = 'manage_roles'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Fix prevent_last_leader_removal trigger — check template ID, not name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
  is_leader_role BOOLEAN;
  steward_template_id UUID;
BEGIN
  -- Get the Steward template ID
  SELECT id INTO steward_template_id
  FROM public.role_templates
  WHERE name = 'Steward Role Template';

  -- Check if the role being removed is based on the Steward template
  SELECT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND created_from_role_template_id = steward_template_id
  ) INTO is_leader_role;

  -- If not a steward-template role, allow deletion
  IF NOT is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Steward-template role holders in the group
  SELECT COUNT(*)
  INTO leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND gr.created_from_role_template_id = steward_template_id
    AND ugr.id != OLD.id;

  -- If this is the last steward, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Assign another Steward first.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================================================
-- 7. Replace RLS policies on group_roles
-- ============================================================================

-- Drop old INSERT policy (uses created_by_user_id)
DROP POLICY IF EXISTS "Users can create roles for their groups" ON public.group_roles;

-- New INSERT policy: requires manage_roles permission
CREATE POLICY "manage_roles_insert"
ON public.group_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    group_id,
    'manage_roles'
  )
);

-- New UPDATE policy: requires manage_roles permission
CREATE POLICY "manage_roles_update"
ON public.group_roles
FOR UPDATE
TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    group_id,
    'manage_roles'
  )
)
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    group_id,
    'manage_roles'
  )
);

-- New DELETE policy: requires manage_roles permission AND role must be custom (not from template)
CREATE POLICY "manage_roles_delete"
ON public.group_roles
FOR DELETE
TO authenticated
USING (
  created_from_role_template_id IS NULL
  AND public.has_permission(
    public.get_current_user_profile_id(),
    group_id,
    'manage_roles'
  )
);

-- ============================================================================
-- 8. Replace RLS policies on group_role_permissions
-- ============================================================================

-- Drop old INSERT policy (uses created_by_user_id)
DROP POLICY IF EXISTS "Users can set permissions for roles in their groups" ON public.group_role_permissions;

-- New INSERT policy: requires manage_roles + anti-escalation (must hold the permission being granted)
CREATE POLICY "manage_role_perms_insert"
ON public.group_role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User has manage_roles in the role's group
  public.has_permission(
    public.get_current_user_profile_id(),
    (SELECT group_id FROM public.group_roles WHERE id = group_role_id),
    'manage_roles'
  )
  -- Anti-escalation: user must hold the permission they're granting
  AND public.has_permission(
    public.get_current_user_profile_id(),
    (SELECT group_id FROM public.group_roles WHERE id = group_role_id),
    (SELECT name FROM public.permissions WHERE id = permission_id)
  )
);

-- New DELETE policy: requires manage_roles permission
CREATE POLICY "manage_role_perms_delete"
ON public.group_role_permissions
FOR DELETE
TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    (SELECT group_id FROM public.group_roles WHERE id = group_role_id),
    'manage_roles'
  )
);
