-- ==========================================================================
-- D15 Universal Group Pattern — Complete Schema Rebuild
-- ==========================================================================
-- Replaces 71 incremental migrations with a single clean schema.
-- Key change: all user_id foreign keys become group_id references.
-- Personal groups ARE the user's identity in the group system.
-- ==========================================================================

-- ==========================================================================
-- PHASE 1: Utility Functions
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================================================
-- PHASE 2: Core Tables (No FK Dependencies)
-- ==========================================================================

-- 2a. Users — auth bridge table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_decommissioned BOOLEAN NOT NULL DEFAULT false,
  personal_group_id UUID,  -- FK added after groups table exists
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2b. Permissions catalog
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2c. Role templates
CREATE TABLE public.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2d. Group templates
CREATE TABLE public.group_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- PHASE 3: Tables With Dependencies
-- ==========================================================================

-- 3a. Groups (self-referencing created_by_group_id)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  label TEXT,
  created_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_from_group_template_id UUID REFERENCES public.group_templates(id) ON DELETE SET NULL,
  group_type TEXT NOT NULL DEFAULT 'engagement'
    CHECK (group_type IN ('system', 'personal', 'engagement')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  show_member_list BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3b. Add FK: users.personal_group_id → groups(id)
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_personal_group
  FOREIGN KEY (personal_group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- 3c. Group memberships (group-to-group only, no user_id)
CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  added_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'paused', 'removed')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, member_group_id)
);

-- 3d. Journeys
CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  journey_type TEXT NOT NULL DEFAULT 'predefined'
    CHECK (journey_type IN ('predefined', 'user_created', 'dynamic')),
  content JSONB,
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TRIGGER set_journeys_updated_at
  BEFORE UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3e. Journey enrollments (group_id is always set; personal group = individual enrollment)
CREATE TABLE public.journey_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  enrolled_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'frozen')),
  progress_data JSONB NOT NULL DEFAULT '{}',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);

-- ==========================================================================
-- PHASE 4: Authorization Tables
-- ==========================================================================

-- 4a. Role template ↔ permission junction
CREATE TABLE public.role_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(role_template_id, permission_id)
);

-- 4b. Group template ↔ role template junction
CREATE TABLE public.group_template_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_template_id UUID NOT NULL REFERENCES public.group_templates(id) ON DELETE CASCADE,
  role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(group_template_id, role_template_id)
);

-- 4c. Group-scoped roles
CREATE TABLE public.group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_from_role_template_id UUID REFERENCES public.role_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, name)
);

-- 4d. Group role ↔ permission junction
CREATE TABLE public.group_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_role_id UUID NOT NULL REFERENCES public.group_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_role_id, permission_id)
);

-- 4e. Role assignments (group-to-group)
CREATE TABLE public.user_group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  group_role_id UUID NOT NULL REFERENCES public.group_roles(id) ON DELETE CASCADE,
  assigned_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_group_id, group_id, group_role_id)
);

-- ==========================================================================
-- PHASE 5: Communication Tables
-- ==========================================================================

-- 5a. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5b. Forum posts
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  parent_post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5c. Conversations (participants are personal groups)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  participant_1_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  participant_2_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 < participant_2),
  CHECK (participant_1 != participant_2)
);

-- 5d. Direct messages
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- PHASE 6: Admin Tables
-- ==========================================================================

CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- PHASE 7: Identity & Helper Functions
-- ==========================================================================

-- 7a. get_current_user_profile_id() — returns public.users.id
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT id FROM public.users
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile_id() TO service_role;

-- 7b. get_current_personal_group_id() — THE primary identity function for D15
CREATE OR REPLACE FUNCTION public.get_current_personal_group_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT personal_group_id FROM public.users
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_personal_group_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_personal_group_id() TO service_role;

-- 7c. is_active_group_member() — quick membership check
CREATE OR REPLACE FUNCTION public.is_active_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = check_group_id
      AND member_group_id = public.get_current_personal_group_id()
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_group_member(UUID) TO authenticated;

-- 7d. is_invited_group_member() — invited check for group visibility
CREATE OR REPLACE FUNCTION public.is_invited_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = check_group_id
      AND member_group_id = public.get_current_personal_group_id()
      AND status = 'invited'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_invited_group_member(UUID) TO authenticated;

-- 7e. is_group_creator() — bootstrap check
CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id
      AND created_by_group_id = public.get_current_personal_group_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_creator(UUID) TO authenticated;

-- 7f. group_has_leader() — checks if group has any Steward (for bootstrap detection)
CREATE OR REPLACE FUNCTION public.group_has_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    JOIN public.role_templates rt ON gr.created_from_role_template_id = rt.id
    WHERE ugr.group_id = p_group_id
      AND rt.name = 'Steward Role Template'
  );
$$;

GRANT EXECUTE ON FUNCTION public.group_has_leader(UUID) TO authenticated;

-- 7g. get_group_id_for_role() — RLS bypass helper for group_role_permissions policies
CREATE OR REPLACE FUNCTION public.get_group_id_for_role(p_group_role_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT group_id FROM public.group_roles WHERE id = p_group_role_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_id_for_role(UUID) TO authenticated;

-- 7h. get_permission_name() — RLS bypass helper for anti-escalation checks
CREATE OR REPLACE FUNCTION public.get_permission_name(p_permission_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT name FROM public.permissions WHERE id = p_permission_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_permission_name(UUID) TO authenticated;

-- ==========================================================================
-- PHASE 8: RBAC Functions
-- ==========================================================================

-- 8a. has_permission() — THE core RBAC check, now group-to-group
CREATE OR REPLACE FUNCTION public.has_permission(
  p_acting_group_id UUID,
  p_context_group_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  -- Fail closed on NULL
  IF p_acting_group_id IS NULL OR p_permission_name IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Tier 1: System group permissions (context-free)
  IF EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    JOIN public.user_group_roles ugr
      ON ugr.member_group_id = gm.member_group_id
      AND ugr.group_id = gm.group_id
    JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
    JOIN public.permissions p ON p.id = grp.permission_id
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.member_group_id = p_acting_group_id
      AND gm.status = 'active'
      AND g.group_type = 'system'
      AND grp.granted = true
      AND p.name = p_permission_name
  ) THEN
    RETURN TRUE;
  END IF;

  -- Tier 2: Context group permissions
  IF p_context_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    JOIN public.user_group_roles ugr
      ON ugr.member_group_id = gm.member_group_id
      AND ugr.group_id = gm.group_id
    JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
    JOIN public.permissions p ON p.id = grp.permission_id
    WHERE gm.member_group_id = p_acting_group_id
      AND gm.group_id = p_context_group_id
      AND gm.status = 'active'
      AND grp.granted = true
      AND p.name = p_permission_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, UUID, TEXT) TO service_role;

-- 8b. get_user_permissions() — returns all permissions for a group in a context
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_acting_group_id UUID,
  p_context_group_id UUID
)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT p.name), ARRAY[]::TEXT[])
  FROM public.group_memberships gm
  JOIN public.user_group_roles ugr
    ON ugr.member_group_id = gm.member_group_id
    AND ugr.group_id = gm.group_id
  JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
  JOIN public.permissions p ON p.id = grp.permission_id
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.member_group_id = p_acting_group_id
    AND gm.status = 'active'
    AND grp.granted = true
    AND (g.group_type = 'system' OR gm.group_id = p_context_group_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO service_role;

-- 8c. can_assign_role() — anti-escalation check for role assignment
CREATE OR REPLACE FUNCTION public.can_assign_role(
  p_acting_group_id UUID,
  p_group_id UUID,
  p_group_role_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    public.has_permission(p_acting_group_id, p_group_id, 'assign_roles')
    AND NOT EXISTS (
      SELECT 1 FROM public.group_role_permissions grp
      JOIN public.permissions p ON p.id = grp.permission_id
      WHERE grp.group_role_id = p_group_role_id
        AND grp.granted = true
        AND NOT public.has_permission(p_acting_group_id, p_group_id, p.name)
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_assign_role(UUID, UUID, UUID) TO authenticated;

-- ==========================================================================
-- PHASE 9: Trigger Functions
-- ==========================================================================

-- 9a. handle_new_user() — creates user profile + personal group + FI Members enrollment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_personal_group_id UUID;
  v_fi_members_group_id UUID;
  v_fi_member_role_id UUID;
BEGIN
  -- Step 1: Create user profile (personal_group_id = NULL initially)
  INSERT INTO public.users (auth_user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  RETURNING id INTO v_user_id;

  -- Step 2: Create personal group (created_by_group_id = NULL initially — bootstrap)
  INSERT INTO public.groups (name, group_type, is_public, show_member_list)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'personal',
    false,
    false
  )
  RETURNING id INTO v_personal_group_id;

  -- Step 3: Break circular dependency — link user ↔ personal group
  UPDATE public.users SET personal_group_id = v_personal_group_id WHERE id = v_user_id;
  UPDATE public.groups SET created_by_group_id = v_personal_group_id WHERE id = v_personal_group_id;

  -- Step 4: Enroll personal group in FringeIsland Members system group
  SELECT id INTO v_fi_members_group_id
  FROM public.groups
  WHERE name = 'FringeIsland Members' AND group_type = 'system';

  IF v_fi_members_group_id IS NOT NULL THEN
    INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
    VALUES (v_fi_members_group_id, v_personal_group_id, v_personal_group_id, 'active');

    -- Assign FI Members "Member" role
    SELECT id INTO v_fi_member_role_id
    FROM public.group_roles
    WHERE group_id = v_fi_members_group_id AND name = 'Member';

    IF v_fi_member_role_id IS NOT NULL THEN
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      VALUES (v_personal_group_id, v_fi_members_group_id, v_fi_member_role_id, v_personal_group_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 9b. handle_user_deletion() — soft delete on auth.users removal
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET is_active = false, updated_at = NOW()
  WHERE auth_user_id = OLD.id;
  RETURN OLD;
END;
$$;

-- 9c. validate_user_group_role() — ensures role belongs to the correct group
CREATE OR REPLACE FUNCTION public.validate_user_group_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_group_id UUID;
BEGIN
  SELECT group_id INTO v_role_group_id
  FROM public.group_roles WHERE id = NEW.group_role_id;

  IF v_role_group_id IS NULL THEN
    RAISE EXCEPTION 'Role does not exist';
  END IF;

  IF v_role_group_id != NEW.group_id THEN
    RAISE EXCEPTION 'Role does not belong to the specified group';
  END IF;

  RETURN NEW;
END;
$$;

-- 9d. prevent_last_leader_removal() — prevents removing the last Steward
CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_leader_count INTEGER;
  v_is_leader_role BOOLEAN;
  v_steward_template_id UUID;
BEGIN
  -- If parent group is gone (CASCADE), allow deletion
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  -- Get the Steward template ID
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  -- Check if the role being removed is based on the Steward template (or named Steward)
  SELECT EXISTS (
    SELECT 1 FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND (created_from_role_template_id = v_steward_template_id OR name = 'Steward')
  ) INTO v_is_leader_role;

  IF NOT v_is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Steward-template role holders (excluding the one being removed)
  SELECT COUNT(*) INTO v_leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND (gr.created_from_role_template_id = v_steward_template_id OR gr.name = 'Steward')
    AND ugr.id != OLD.id;

  IF v_leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Assign another Steward first.';
  END IF;

  RETURN OLD;
END;
$$;

-- 9e. prevent_last_deusex_role_removal()
CREATE OR REPLACE FUNCTION public.prevent_last_deusex_role_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_deusex_role_id UUID;
  v_remaining_count INTEGER;
BEGIN
  SELECT id INTO v_deusex_group_id
  FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';

  IF v_deusex_group_id IS NULL OR OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  SELECT id INTO v_deusex_role_id
  FROM public.group_roles WHERE group_id = v_deusex_group_id AND name = 'DeusEx';

  IF v_deusex_role_id IS NULL OR OLD.group_role_id != v_deusex_role_id THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*) INTO v_remaining_count
  FROM public.user_group_roles
  WHERE group_id = v_deusex_group_id
    AND group_role_id = v_deusex_role_id
    AND id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last DeusEx member. Assign another DeusEx member first.';
  END IF;

  RETURN OLD;
END;
$$;

-- 9f. prevent_last_deusex_membership_removal()
CREATE OR REPLACE FUNCTION public.prevent_last_deusex_membership_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_remaining_count INTEGER;
BEGIN
  SELECT id INTO v_deusex_group_id
  FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';

  IF v_deusex_group_id IS NULL OR OLD.group_id != v_deusex_group_id THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*) INTO v_remaining_count
  FROM public.group_memberships
  WHERE group_id = v_deusex_group_id
    AND status = 'active'
    AND id != OLD.id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last DeusEx member. Add another DeusEx member first.';
  END IF;

  RETURN OLD;
END;
$$;

-- 9g. auto_assign_member_role_on_accept() — assigns Member role when invitation accepted
CREATE OR REPLACE FUNCTION public.auto_assign_member_role_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_role_id UUID;
BEGIN
  IF OLD.status = 'invited' AND NEW.status = 'active' THEN
    SELECT id INTO v_member_role_id
    FROM public.group_roles
    WHERE group_id = NEW.group_id AND name = 'Member'
    LIMIT 1;

    IF v_member_role_id IS NOT NULL THEN
      INSERT INTO public.user_group_roles (
        member_group_id, group_id, group_role_id, assigned_by_group_id
      )
      VALUES (NEW.member_group_id, NEW.group_id, v_member_role_id, NEW.member_group_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 9h. auto_assign_deusex_role_on_accept() — assigns DeusEx role when DeusEx invitation accepted
CREATE OR REPLACE FUNCTION public.auto_assign_deusex_role_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_group_id UUID;
  v_deusex_role_id UUID;
BEGIN
  IF OLD.status = 'invited' AND NEW.status = 'active' THEN
    SELECT id INTO v_deusex_group_id
    FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system' LIMIT 1;

    IF v_deusex_group_id IS NOT NULL AND NEW.group_id = v_deusex_group_id THEN
      SELECT id INTO v_deusex_role_id
      FROM public.group_roles
      WHERE group_id = v_deusex_group_id AND name = 'DeusEx' LIMIT 1;

      IF v_deusex_role_id IS NOT NULL THEN
        INSERT INTO public.user_group_roles (
          member_group_id, group_id, group_role_id, assigned_by_group_id
        )
        VALUES (NEW.member_group_id, NEW.group_id, v_deusex_role_id, NEW.member_group_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 9i. copy_template_permissions_on_role_create() — copies template permissions to new roles
CREATE OR REPLACE FUNCTION public.copy_template_permissions_on_role_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.created_from_role_template_id IS NOT NULL THEN
    INSERT INTO public.group_role_permissions (group_role_id, permission_id)
    SELECT NEW.id, rtp.permission_id
    FROM public.role_template_permissions rtp
    WHERE rtp.role_template_id = NEW.created_from_role_template_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 9j. auto_grant_permission_to_deusex() — auto-grants new permissions to DeusEx role
CREATE OR REPLACE FUNCTION public.auto_grant_permission_to_deusex()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deusex_role_id UUID;
BEGIN
  SELECT gr.id INTO v_deusex_role_id
  FROM public.group_roles gr
  JOIN public.groups g ON gr.group_id = g.id
  WHERE g.name = 'DeusEx' AND g.group_type = 'system' AND gr.name = 'DeusEx'
  LIMIT 1;

  IF v_deusex_role_id IS NOT NULL THEN
    INSERT INTO public.group_role_permissions (group_role_id, permission_id)
    VALUES (v_deusex_role_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 9k. enforce_decommission_invariant() — decommissioned users are always inactive
CREATE OR REPLACE FUNCTION public.enforce_decommission_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_decommissioned = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

-- 9l. enforce_flat_threading() — max 2-level forum threading
CREATE OR REPLACE FUNCTION public.enforce_flat_threading()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_group_id UUID;
  v_parent_parent_id UUID;
BEGIN
  IF NEW.parent_post_id IS NOT NULL THEN
    SELECT group_id, parent_post_id INTO v_parent_group_id, v_parent_parent_id
    FROM public.forum_posts WHERE id = NEW.parent_post_id;

    IF v_parent_group_id IS NULL THEN
      RAISE EXCEPTION 'Parent post does not exist';
    END IF;

    IF v_parent_group_id != NEW.group_id THEN
      RAISE EXCEPTION 'Cannot reply to a post in a different group';
    END IF;

    IF v_parent_parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot reply to a reply. Maximum thread depth is 2 levels.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 9m. update_conversation_last_message_at()
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- 9n. is_conversation_participant() — checks if current user is a participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND (participant_1 = public.get_current_personal_group_id()
        OR participant_2 = public.get_current_personal_group_id())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;

-- 9o. can_update_conversation() — column-level restriction for last_read_at
CREATE OR REPLACE FUNCTION public.can_update_conversation(
  p_conversation_id UUID,
  p_p1_last_read_at TIMESTAMPTZ,
  p_p2_last_read_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_current_group UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_old_p1_last_read TIMESTAMPTZ;
  v_old_p2_last_read TIMESTAMPTZ;
BEGIN
  v_current_group := public.get_current_personal_group_id();

  SELECT participant_1, participant_2, participant_1_last_read_at, participant_2_last_read_at
  INTO v_p1, v_p2, v_old_p1_last_read, v_old_p2_last_read
  FROM public.conversations WHERE id = p_conversation_id;

  IF v_current_group = v_p1 THEN
    RETURN (p_p2_last_read_at IS NOT DISTINCT FROM v_old_p2_last_read);
  ELSIF v_current_group = v_p2 THEN
    RETURN (p_p1_last_read_at IS NOT DISTINCT FROM v_old_p1_last_read);
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_update_conversation(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ---- Notification Trigger Functions ----

-- 9p. notify_invitation_received()
CREATE OR REPLACE FUNCTION public.notify_invitation_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name TEXT;
  v_inviter_name TEXT;
BEGIN
  IF NEW.status != 'invited' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT name INTO v_inviter_name FROM public.groups WHERE id = NEW.added_by_group_id;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
  VALUES (
    NEW.member_group_id,
    'invitation_received',
    'Group Invitation',
    'You have been invited to join "' || COALESCE(v_group_name, 'Unknown Group') || '" by ' || COALESCE(v_inviter_name, 'someone') || '.',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', v_group_name,
      'inviter_group_id', NEW.added_by_group_id,
      'inviter_name', v_inviter_name
    ),
    NEW.group_id
  );

  RETURN NEW;
END;
$$;

-- 9q. notify_invitation_accepted()
CREATE OR REPLACE FUNCTION public.notify_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name TEXT;
  v_member_name TEXT;
  v_steward RECORD;
  v_steward_template_id UUID;
BEGIN
  IF OLD.status != 'invited' OR NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT name INTO v_member_name FROM public.groups WHERE id = NEW.member_group_id;
  SELECT id INTO v_steward_template_id FROM public.role_templates WHERE name = 'Steward Role Template';

  FOR v_steward IN
    SELECT ugr.member_group_id
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = NEW.group_id
      AND gr.created_from_role_template_id = v_steward_template_id
      AND ugr.member_group_id != NEW.member_group_id
  LOOP
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
    VALUES (
      v_steward.member_group_id,
      'invitation_accepted',
      'Invitation Accepted',
      COALESCE(v_member_name, 'A member') || ' has joined "' || COALESCE(v_group_name, 'your group') || '".',
      jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'member_group_id', NEW.member_group_id,
        'member_name', v_member_name
      ),
      NEW.group_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 9r. notify_invitation_declined_or_member_change()
CREATE OR REPLACE FUNCTION public.notify_invitation_declined_or_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name TEXT;
  v_member_name TEXT;
  v_actor_group_id UUID;
  v_steward RECORD;
  v_steward_template_id UUID;
BEGIN
  -- Skip on CASCADE group delete
  SELECT name INTO v_group_name FROM public.groups WHERE id = OLD.group_id;
  IF v_group_name IS NULL THEN RETURN OLD; END IF;

  v_actor_group_id := public.get_current_personal_group_id();
  SELECT name INTO v_member_name FROM public.groups WHERE id = OLD.member_group_id;
  SELECT id INTO v_steward_template_id FROM public.role_templates WHERE name = 'Steward Role Template';

  IF OLD.status = 'invited' THEN
    -- CASE 1: Invitation declined → notify Stewards
    FOR v_steward IN
      SELECT ugr.member_group_id FROM public.user_group_roles ugr
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.group_id = OLD.group_id
        AND gr.created_from_role_template_id = v_steward_template_id
    LOOP
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
      VALUES (v_steward.member_group_id, 'invitation_declined', 'Invitation Declined',
        COALESCE(v_member_name, 'A user') || ' declined the invitation to "' || v_group_name || '".',
        jsonb_build_object('group_id', OLD.group_id, 'group_name', v_group_name,
          'member_group_id', OLD.member_group_id, 'member_name', v_member_name),
        OLD.group_id);
    END LOOP;

  ELSIF OLD.status = 'active' AND v_actor_group_id = OLD.member_group_id THEN
    -- CASE 2: Member left → notify Stewards
    FOR v_steward IN
      SELECT ugr.member_group_id FROM public.user_group_roles ugr
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.group_id = OLD.group_id
        AND gr.created_from_role_template_id = v_steward_template_id
    LOOP
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
      VALUES (v_steward.member_group_id, 'member_left', 'Member Left',
        COALESCE(v_member_name, 'A member') || ' has left "' || v_group_name || '".',
        jsonb_build_object('group_id', OLD.group_id, 'group_name', v_group_name,
          'member_group_id', OLD.member_group_id, 'member_name', v_member_name),
        OLD.group_id);
    END LOOP;

  ELSIF OLD.status = 'active' AND (v_actor_group_id IS NULL OR v_actor_group_id != OLD.member_group_id) THEN
    -- CASE 3: Member removed → notify the removed member
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
    VALUES (OLD.member_group_id, 'member_removed', 'Removed from Group',
      'You have been removed from "' || v_group_name || '".',
      jsonb_build_object('group_id', OLD.group_id, 'group_name', v_group_name),
      OLD.group_id);
  END IF;

  RETURN OLD;
END;
$$;

-- 9s. notify_role_assigned()
CREATE OR REPLACE FUNCTION public.notify_role_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name TEXT;
  v_group_name TEXT;
  v_assigner_name TEXT;
BEGIN
  SELECT name INTO v_role_name FROM public.group_roles WHERE id = NEW.group_role_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT name INTO v_assigner_name FROM public.groups WHERE id = NEW.assigned_by_group_id;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
  VALUES (
    NEW.member_group_id,
    'role_assigned',
    'Role Assigned',
    'You have been assigned the "' || COALESCE(v_role_name, 'Unknown') || '" role in "' || COALESCE(v_group_name, 'a group') || '".',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', v_group_name,
      'role_name', v_role_name,
      'assigner_group_id', NEW.assigned_by_group_id,
      'assigner_name', v_assigner_name
    ),
    NEW.group_id
  );

  RETURN NEW;
END;
$$;

-- 9t. notify_role_removed()
CREATE OR REPLACE FUNCTION public.notify_role_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Skip if group was deleted (CASCADE)
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  SELECT name INTO v_role_name FROM public.group_roles WHERE id = OLD.group_role_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = OLD.group_id;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
  VALUES (
    OLD.member_group_id,
    'role_removed',
    'Role Removed',
    'Your "' || COALESCE(v_role_name, 'Unknown') || '" role has been removed in "' || COALESCE(v_group_name, 'a group') || '".',
    jsonb_build_object(
      'group_id', OLD.group_id,
      'group_name', v_group_name,
      'role_name', v_role_name
    ),
    OLD.group_id
  );

  RETURN OLD;
END;
$$;

-- 9u. notify_group_deleted() — BEFORE DELETE to capture members
CREATE OR REPLACE FUNCTION public.notify_group_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleter_group_id UUID;
  v_deleter_name TEXT;
  v_member RECORD;
BEGIN
  v_deleter_group_id := public.get_current_personal_group_id();
  SELECT name INTO v_deleter_name FROM public.groups WHERE id = v_deleter_group_id;

  FOR v_member IN
    SELECT gm.member_group_id
    FROM public.group_memberships gm
    WHERE gm.group_id = OLD.id
      AND gm.status = 'active'
      AND gm.member_group_id != COALESCE(v_deleter_group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
    VALUES (
      v_member.member_group_id,
      'group_deleted',
      'Group Deleted',
      'The group "' || OLD.name || '" has been deleted by ' || COALESCE(v_deleter_name, 'a group member') || '.',
      jsonb_build_object('group_name', OLD.name, 'deleter_group_id', v_deleter_group_id, 'deleter_name', v_deleter_name)
    );
  END LOOP;

  RETURN OLD;
END;
$$;

-- ---- Admin Audit Trigger Functions ----

-- 9v. audit_admin_membership_change()
CREATE OR REPLACE FUNCTION public.audit_admin_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_group_id UUID;
  v_action TEXT;
  v_group_name TEXT;
BEGIN
  v_actor_group_id := public.get_current_personal_group_id();

  -- Only audit if caller is a platform admin
  IF NOT public.has_permission(v_actor_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
    IF NEW.status = 'invited' THEN
      v_action := 'admin_invite_to_group';
    ELSE
      v_action := 'admin_join_group';
    END IF;
    INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
    VALUES (v_actor_group_id, v_action, v_group_name,
      jsonb_build_object('group_id', NEW.group_id, 'member_group_id', NEW.member_group_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_group_name FROM public.groups WHERE id = OLD.group_id;
    IF v_group_name IS NULL THEN RETURN OLD; END IF;
    INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
    VALUES (v_actor_group_id, 'admin_remove_from_group', v_group_name,
      jsonb_build_object('group_id', OLD.group_id, 'member_group_id', OLD.member_group_id));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 9w. audit_admin_message_send()
CREATE OR REPLACE FUNCTION public.audit_admin_message_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_group_id UUID;
BEGIN
  v_actor_group_id := public.get_current_personal_group_id();

  IF NOT public.has_permission(v_actor_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_actor_group_id, 'admin_message_sent', 'direct_message',
    jsonb_build_object('conversation_id', NEW.conversation_id));

  RETURN NEW;
END;
$$;

-- ==========================================================================
-- PHASE 10: Triggers
-- ==========================================================================

-- Auth triggers (on auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();

-- User triggers
CREATE TRIGGER enforce_decommission_invariant
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_decommission_invariant();

-- Group role triggers
CREATE TRIGGER validate_user_group_role
  BEFORE INSERT ON public.user_group_roles
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_group_role();

CREATE TRIGGER check_last_leader_removal
  BEFORE DELETE ON public.user_group_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_leader_removal();

CREATE TRIGGER check_last_deusex_role_removal
  BEFORE DELETE ON public.user_group_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_deusex_role_removal();

CREATE TRIGGER check_last_deusex_membership_removal
  BEFORE DELETE ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_deusex_membership_removal();

-- Group roles: auto-copy template permissions
CREATE TRIGGER copy_template_permissions
  AFTER INSERT ON public.group_roles
  FOR EACH ROW EXECUTE FUNCTION public.copy_template_permissions_on_role_create();

-- Permissions: auto-grant to DeusEx
CREATE TRIGGER auto_grant_to_deusex
  AFTER INSERT ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_permission_to_deusex();

-- Membership triggers
CREATE TRIGGER assign_member_role_on_accept
  AFTER UPDATE ON public.group_memberships
  FOR EACH ROW
  WHEN (OLD.status = 'invited' AND NEW.status = 'active')
  EXECUTE FUNCTION public.auto_assign_member_role_on_accept();

CREATE TRIGGER auto_assign_deusex_role
  AFTER UPDATE ON public.group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_deusex_role_on_accept();

-- Forum triggers
CREATE TRIGGER enforce_flat_threading
  BEFORE INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_flat_threading();

-- DM triggers
CREATE TRIGGER update_conversation_last_message
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message_at();

-- Notification triggers
CREATE TRIGGER notify_invitation_received
  AFTER INSERT ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.notify_invitation_received();

CREATE TRIGGER notify_invitation_accepted
  AFTER UPDATE ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.notify_invitation_accepted();

CREATE TRIGGER notify_invitation_declined_or_member_change
  AFTER DELETE ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.notify_invitation_declined_or_member_change();

CREATE TRIGGER notify_role_assigned
  AFTER INSERT ON public.user_group_roles
  FOR EACH ROW EXECUTE FUNCTION public.notify_role_assigned();

CREATE TRIGGER notify_role_removed
  AFTER DELETE ON public.user_group_roles
  FOR EACH ROW EXECUTE FUNCTION public.notify_role_removed();

CREATE TRIGGER notify_group_deleted
  BEFORE DELETE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_deleted();

-- Admin audit triggers
CREATE TRIGGER trg_audit_admin_membership_change
  AFTER INSERT OR DELETE ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_membership_change();

CREATE TRIGGER trg_audit_admin_message_send
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_message_send();

-- ==========================================================================
-- PHASE 11: Enable RLS + Policies
-- ==========================================================================

-- Enable RLS on ALL tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_template_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ---- 11a. Catalog tables (read-only for authenticated) ----

CREATE POLICY "auth_read_permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_role_templates"
  ON public.role_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_group_templates"
  ON public.group_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_role_template_permissions"
  ON public.role_template_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_group_template_roles"
  ON public.group_template_roles FOR SELECT TO authenticated USING (true);

-- ---- 11b. Users ----

CREATE POLICY "users_select_active"
  ON public.users FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "deusex_admin_update_users"
  ON public.users FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

-- ---- 11c. Groups ----

CREATE POLICY "groups_select"
  ON public.groups FOR SELECT TO authenticated
  USING (
    is_public = true
    OR public.is_active_group_member(id)
    OR public.is_invited_group_member(id)
    OR created_by_group_id = public.get_current_personal_group_id()
  );

CREATE POLICY "groups_insert"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (
    created_by_group_id = public.get_current_personal_group_id()
  );

CREATE POLICY "groups_update"
  ON public.groups FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      id,
      'edit_group_settings'
    )
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      id,
      'edit_group_settings'
    )
  );

CREATE POLICY "groups_delete"
  ON public.groups FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      id,
      'delete_group'
    )
  );

-- ---- 11d. Group Memberships ----

CREATE POLICY "memberships_select"
  ON public.group_memberships FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR member_group_id = public.get_current_personal_group_id()
  );

-- Invite: Steward/user with invite_members permission
CREATE POLICY "memberships_insert_invite"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    status = 'invited'
    AND added_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'invite_members'
    )
  );

-- Bootstrap: Creator self-adds during group creation
CREATE POLICY "memberships_insert_bootstrap"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    member_group_id = public.get_current_personal_group_id()
    AND added_by_group_id = public.get_current_personal_group_id()
    AND status = 'active'
    AND public.is_group_creator(group_id)
  );

-- Accept invitation: invited → active
CREATE POLICY "memberships_update_accept"
  ON public.group_memberships FOR UPDATE TO authenticated
  USING (
    member_group_id = public.get_current_personal_group_id()
    AND status = 'invited'
  )
  WITH CHECK (
    status = 'active'
  );

-- Leave: members can delete their own active membership
CREATE POLICY "memberships_delete_leave"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (
    member_group_id = public.get_current_personal_group_id()
  );

-- Remove: Steward can remove other members
CREATE POLICY "memberships_delete_remove"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'remove_members'
    )
    AND status = 'active'
  );

-- Admin: DeusEx can remove any membership
CREATE POLICY "memberships_delete_admin"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

-- Admin: DeusEx can insert memberships (for direct-add scenarios)
CREATE POLICY "memberships_insert_admin"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
    AND added_by_group_id = public.get_current_personal_group_id()
  );

-- ---- 11e. User Group Roles ----

CREATE POLICY "ugr_select"
  ON public.user_group_roles FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR member_group_id = public.get_current_personal_group_id()
  );

-- Assign: users with assign_roles + anti-escalation
CREATE POLICY "ugr_insert_assign"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.can_assign_role(
        public.get_current_personal_group_id(),
        group_id,
        group_role_id
      )
      AND assigned_by_group_id = public.get_current_personal_group_id()
    )
    OR
    -- Bootstrap: creator self-assigns when no Steward exists yet
    (
      member_group_id = public.get_current_personal_group_id()
      AND assigned_by_group_id = public.get_current_personal_group_id()
      AND NOT public.group_has_leader(group_id)
    )
  );

-- Remove: users with assign_roles
CREATE POLICY "ugr_delete"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'assign_roles'
    )
  );

-- Admin: DeusEx can insert role assignments
CREATE POLICY "ugr_insert_admin"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

-- Admin: DeusEx can delete role assignments
CREATE POLICY "ugr_delete_admin"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

-- ---- 11f. Group Roles ----

CREATE POLICY "group_roles_select"
  ON public.group_roles FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR public.is_invited_group_member(group_id)
    OR public.is_group_creator(group_id)
  );

-- Note: Admin reads group_roles via service_role bypass (no has_permission() in SELECT policies per MEMORY.md)

CREATE POLICY "group_roles_insert"
  ON public.group_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'manage_roles'
    )
    OR
    -- Bootstrap: group creator when no Steward exists yet
    (public.is_group_creator(group_id) AND NOT public.group_has_leader(group_id))
  );

CREATE POLICY "group_roles_update"
  ON public.group_roles FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'manage_roles'
    )
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'manage_roles'
    )
  );

CREATE POLICY "group_roles_delete"
  ON public.group_roles FOR DELETE TO authenticated
  USING (
    created_from_role_template_id IS NULL
    AND public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'manage_roles'
    )
  );

-- ---- 11g. Group Role Permissions ----

CREATE POLICY "grp_select"
  ON public.group_role_permissions FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(public.get_group_id_for_role(group_role_id))
    OR public.is_group_creator(public.get_group_id_for_role(group_role_id))
  );

CREATE POLICY "grp_insert"
  ON public.group_role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    -- Must have manage_roles
    public.has_permission(
      public.get_current_personal_group_id(),
      public.get_group_id_for_role(group_role_id),
      'manage_roles'
    )
    -- Anti-escalation: must hold the permission being granted
    AND public.has_permission(
      public.get_current_personal_group_id(),
      public.get_group_id_for_role(group_role_id),
      public.get_permission_name(permission_id)
    )
  );

CREATE POLICY "grp_delete"
  ON public.group_role_permissions FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      public.get_group_id_for_role(group_role_id),
      'manage_roles'
    )
  );

-- ---- 11h. Journeys ----

CREATE POLICY "journeys_select_published"
  ON public.journeys FOR SELECT TO authenticated
  USING (is_published = true);

-- ---- 11i. Journey Enrollments ----

-- Own enrollments (personal group)
CREATE POLICY "enrollment_select_own"
  ON public.journey_enrollments FOR SELECT TO authenticated
  USING (
    group_id = public.get_current_personal_group_id()
  );

-- Group enrollments (member of the enrolled group)
CREATE POLICY "enrollment_select_group"
  ON public.journey_enrollments FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
  );

-- Self-enroll (individual — uses personal group as group_id)
CREATE POLICY "enrollment_insert_individual"
  ON public.journey_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    group_id = public.get_current_personal_group_id()
    AND enrolled_by_group_id = public.get_current_personal_group_id()
  );

-- Group enroll (requires enroll_group_in_journey permission)
CREATE POLICY "enrollment_insert_group"
  ON public.journey_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    group_id != public.get_current_personal_group_id()
    AND enrolled_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
  );

-- Update own enrollment
CREATE POLICY "enrollment_update_own"
  ON public.journey_enrollments FOR UPDATE TO authenticated
  USING (group_id = public.get_current_personal_group_id())
  WITH CHECK (group_id = public.get_current_personal_group_id());

-- Update group enrollment (Steward/Guide)
CREATE POLICY "enrollment_update_group"
  ON public.journey_enrollments FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
  );

-- ---- 11j. Notifications ----

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_group_id = public.get_current_personal_group_id());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_group_id = public.get_current_personal_group_id())
  WITH CHECK (recipient_group_id = public.get_current_personal_group_id());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (recipient_group_id = public.get_current_personal_group_id());

-- ---- 11k. Forum Posts ----

CREATE POLICY "forum_select"
  ON public.forum_posts FOR SELECT TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'view_forum'
    )
  );

-- Insert top-level post
CREATE POLICY "forum_insert_post"
  ON public.forum_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_group_id = public.get_current_personal_group_id()
    AND (
      (parent_post_id IS NULL AND public.has_permission(
        public.get_current_personal_group_id(), group_id, 'post_forum_messages'))
      OR
      (parent_post_id IS NOT NULL AND public.has_permission(
        public.get_current_personal_group_id(), group_id, 'reply_to_messages'))
    )
  );

-- Edit own post
CREATE POLICY "forum_update_own"
  ON public.forum_posts FOR UPDATE TO authenticated
  USING (
    author_group_id = public.get_current_personal_group_id()
    AND is_deleted = false
  )
  WITH CHECK (
    author_group_id = public.get_current_personal_group_id()
  );

-- Moderate (soft-delete any post)
CREATE POLICY "forum_update_moderate"
  ON public.forum_posts FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'moderate_forum'
    )
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'moderate_forum'
    )
  );

-- ---- 11l. Conversations ----

CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    participant_1 = public.get_current_personal_group_id()
    OR participant_2 = public.get_current_personal_group_id()
  );

CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    participant_1 = public.get_current_personal_group_id()
    OR participant_2 = public.get_current_personal_group_id()
  );

CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    participant_1 = public.get_current_personal_group_id()
    OR participant_2 = public.get_current_personal_group_id()
  )
  WITH CHECK (
    public.can_update_conversation(id, participant_1_last_read_at, participant_2_last_read_at)
  );

-- ---- 11m. Direct Messages ----

CREATE POLICY "dm_select"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "dm_insert"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_group_id = public.get_current_personal_group_id()
    AND public.is_conversation_participant(conversation_id)
  );

-- ---- 11n. Admin Audit Log (no user-facing policies — service_role only + SECURITY DEFINER functions) ----
-- Admin reads via service_role API route, writes via SECURITY DEFINER trigger/RPC.
-- No RLS policies needed.

-- ==========================================================================
-- PHASE 12: Indexes
-- ==========================================================================

-- Users
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_personal_group_id ON public.users(personal_group_id);
CREATE INDEX idx_users_email ON public.users(email);

-- Groups
CREATE INDEX idx_groups_group_type ON public.groups(group_type);
CREATE INDEX idx_groups_created_by ON public.groups(created_by_group_id);
CREATE INDEX idx_groups_is_public ON public.groups(is_public) WHERE is_public = true;

-- Group Memberships (critical for has_permission() and membership checks)
CREATE INDEX idx_memberships_member_group_status
  ON public.group_memberships(member_group_id, group_id, status);
CREATE INDEX idx_memberships_group_status
  ON public.group_memberships(group_id, status);

-- User Group Roles (critical for has_permission() JOIN chain)
CREATE INDEX idx_ugr_member_group_role
  ON public.user_group_roles(member_group_id, group_id, group_role_id);

-- Group Roles
CREATE INDEX idx_group_roles_group ON public.group_roles(group_id);

-- Group Role Permissions
CREATE INDEX idx_grp_role ON public.group_role_permissions(group_role_id);

-- Journeys
CREATE INDEX idx_journeys_published ON public.journeys(is_published, is_public);

-- Journey Enrollments
CREATE INDEX idx_enrollments_group ON public.journey_enrollments(group_id);
CREATE INDEX idx_enrollments_journey ON public.journey_enrollments(journey_id);

-- Notifications
CREATE INDEX idx_notifications_recipient_unread
  ON public.notifications(recipient_group_id, created_at DESC)
  WHERE is_read = false;
CREATE INDEX idx_notifications_recipient
  ON public.notifications(recipient_group_id, created_at DESC);
CREATE INDEX idx_notifications_group
  ON public.notifications(group_id) WHERE group_id IS NOT NULL;

-- Forum Posts
CREATE INDEX idx_forum_posts_group_created
  ON public.forum_posts(group_id, created_at DESC);
CREATE INDEX idx_forum_posts_parent
  ON public.forum_posts(parent_post_id) WHERE parent_post_id IS NOT NULL;
CREATE INDEX idx_forum_posts_author
  ON public.forum_posts(author_group_id);
CREATE INDEX idx_forum_posts_group_toplevel
  ON public.forum_posts(group_id, created_at DESC)
  WHERE parent_post_id IS NULL AND is_deleted = false;

-- Conversations
CREATE INDEX idx_conversations_p1
  ON public.conversations(participant_1, last_message_at DESC);
CREATE INDEX idx_conversations_p2
  ON public.conversations(participant_2, last_message_at DESC);

-- Direct Messages
CREATE INDEX idx_dm_conversation_asc
  ON public.direct_messages(conversation_id, created_at ASC);
CREATE INDEX idx_dm_conversation_desc
  ON public.direct_messages(conversation_id, created_at DESC);

-- Admin Audit Log
CREATE INDEX idx_audit_log_actor ON public.admin_audit_log(actor_group_id);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- ==========================================================================
-- PHASE 13: Realtime Publication
-- ==========================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==========================================================================
-- PHASE 14: Admin RPCs
-- ==========================================================================

-- 14a. admin_hard_delete_user() — basic version (SS-6 adds review flow)
CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target_personal_group_id UUID;
  v_target_auth_user_id UUID;
  v_deleted_user_group_id UUID;
BEGIN
  -- Verify caller has manage_all_groups permission
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  -- Get target's personal group and auth user ID
  SELECT personal_group_id, auth_user_id
  INTO v_target_personal_group_id, v_target_auth_user_id
  FROM public.users WHERE id = target_user_id;

  IF v_target_personal_group_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no personal group';
  END IF;

  -- Get [Deleted User] sentinel group
  SELECT id INTO v_deleted_user_group_id
  FROM public.groups WHERE name = '[Deleted User]' AND group_type = 'system';

  -- Write audit log BEFORE deletion
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_caller_group_id, 'admin_hard_delete_user', target_user_id::text,
    jsonb_build_object('target_user_id', target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- Reassign content to [Deleted User] sentinel (or caller if sentinel doesn't exist)
  UPDATE public.forum_posts
  SET author_group_id = COALESCE(v_deleted_user_group_id, v_caller_group_id)
  WHERE author_group_id = v_target_personal_group_id;

  UPDATE public.journeys
  SET created_by_group_id = COALESCE(v_deleted_user_group_id, v_caller_group_id)
  WHERE created_by_group_id = v_target_personal_group_id;

  UPDATE public.groups
  SET created_by_group_id = COALESCE(v_deleted_user_group_id, v_caller_group_id)
  WHERE created_by_group_id = v_target_personal_group_id
    AND id != v_target_personal_group_id;

  UPDATE public.admin_audit_log
  SET actor_group_id = v_deleted_user_group_id
  WHERE actor_group_id = v_target_personal_group_id;

  -- Reassign actor FKs in membership/role tables
  UPDATE public.group_memberships
  SET added_by_group_id = v_deleted_user_group_id
  WHERE added_by_group_id = v_target_personal_group_id;

  UPDATE public.user_group_roles
  SET assigned_by_group_id = v_deleted_user_group_id
  WHERE assigned_by_group_id = v_target_personal_group_id;

  UPDATE public.journey_enrollments
  SET enrolled_by_group_id = v_deleted_user_group_id
  WHERE enrolled_by_group_id = v_target_personal_group_id;

  -- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)
  DELETE FROM public.groups WHERE id = v_target_personal_group_id;

  -- Delete user record
  DELETE FROM public.users WHERE id = target_user_id;

  -- Delete auth user
  IF v_target_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_target_auth_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hard_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_user(UUID) TO service_role;

-- 14b. admin_send_notification()
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  target_user_ids UUID[],
  p_title TEXT,
  p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_count INTEGER := 0;
  v_target_id UUID;
  v_target_personal_group_id UUID;
BEGIN
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  FOREACH v_target_id IN ARRAY target_user_ids
  LOOP
    SELECT personal_group_id INTO v_target_personal_group_id
    FROM public.users WHERE id = v_target_id;

    IF v_target_personal_group_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
      VALUES (
        v_target_personal_group_id,
        'admin_notification',
        p_title,
        p_message,
        jsonb_build_object('sent_by_group_id', v_caller_group_id)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_send_notification(UUID[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(UUID[], TEXT, TEXT) TO service_role;

-- 14c. admin_force_logout()
CREATE OR REPLACE FUNCTION public.admin_force_logout(target_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_count INTEGER := 0;
  v_target_id UUID;
  v_target_auth_id UUID;
BEGIN
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  FOREACH v_target_id IN ARRAY target_user_ids
  LOOP
    SELECT auth_user_id INTO v_target_auth_id
    FROM public.users WHERE id = v_target_id;

    IF v_target_auth_id IS NOT NULL THEN
      DELETE FROM auth.refresh_tokens WHERE user_id = v_target_auth_id::text;
      DELETE FROM auth.sessions WHERE user_id = v_target_auth_id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Audit log
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_caller_group_id, 'admin_force_logout', 'users',
    jsonb_build_object('count', v_count, 'target_user_ids', to_jsonb(target_user_ids)));

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_logout(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_logout(UUID[]) TO service_role;

-- 14d. get_group_member_counts() — performance RPC
CREATE OR REPLACE FUNCTION public.get_group_member_counts(p_group_ids UUID[])
RETURNS TABLE(group_id UUID, member_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT gm.group_id, COUNT(*) AS member_count
  FROM public.group_memberships gm
  WHERE gm.group_id = ANY(p_group_ids)
    AND gm.status = 'active'
  GROUP BY gm.group_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_member_counts(UUID[]) TO authenticated;

-- ==========================================================================
-- END OF MIGRATION
-- ==========================================================================
