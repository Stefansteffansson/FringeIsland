-- Auto-link group_roles to role_templates by name convention
--
-- When a group_role is created without created_from_role_template_id,
-- the trigger now looks up the matching template by convention:
--   role name 'Steward' → template 'Steward Role Template'
--   role name 'Guide'   → template 'Guide Role Template'
--   role name 'Member'  → template 'Member Role Template'
--   etc.
--
-- If a match is found, the template reference is set and permissions
-- are copied automatically. Custom role names that don't match any
-- template are left without permissions (as before).

CREATE OR REPLACE FUNCTION public.copy_template_permissions_on_role_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  v_template_id := NEW.created_from_role_template_id;

  -- Auto-link to template by name convention if not explicitly set
  IF v_template_id IS NULL THEN
    SELECT id INTO v_template_id
    FROM public.role_templates
    WHERE name = NEW.name || ' Role Template';

    -- Persist the link so group_has_leader() and other functions work
    IF v_template_id IS NOT NULL THEN
      UPDATE public.group_roles
      SET created_from_role_template_id = v_template_id
      WHERE id = NEW.id;
    END IF;
  END IF;

  -- Copy permissions from the template
  IF v_template_id IS NOT NULL THEN
    INSERT INTO public.group_role_permissions (group_role_id, permission_id)
    SELECT NEW.id, rtp.permission_id
    FROM public.role_template_permissions rtp
    WHERE rtp.role_template_id = v_template_id
    ON CONFLICT (group_role_id, permission_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
