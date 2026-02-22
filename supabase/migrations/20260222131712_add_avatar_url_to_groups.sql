-- Add avatar_url to groups (for personal groups, this is the user's avatar)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Copy existing avatar data from users to their personal groups
UPDATE public.groups g
SET avatar_url = u.avatar_url
FROM public.users u
WHERE u.personal_group_id = g.id
  AND g.group_type = 'personal';

-- Update handle_new_user() to copy avatar_url to personal group on creation
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
  v_myself_role_id UUID;
  v_avatar_url TEXT;
BEGIN
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Step 1: Create user profile (personal_group_id = NULL initially)
  INSERT INTO public.users (auth_user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    v_avatar_url
  )
  RETURNING id INTO v_user_id;

  -- Step 2: Create personal group (created_by_group_id = NULL initially — bootstrap)
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, avatar_url)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'personal',
    false,
    false,
    v_avatar_url
  )
  RETURNING id INTO v_personal_group_id;

  -- Step 3: Break circular dependency — link user <-> personal group
  UPDATE public.users SET personal_group_id = v_personal_group_id WHERE id = v_user_id;
  UPDATE public.groups SET created_by_group_id = v_personal_group_id WHERE id = v_personal_group_id;

  -- Step 4: Self-membership — personal group is a member of itself
  INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
  VALUES (v_personal_group_id, v_personal_group_id, v_personal_group_id, 'active');

  -- Step 5: Create "Myself" role in the personal group
  INSERT INTO public.group_roles (group_id, name)
  VALUES (v_personal_group_id, 'Myself')
  RETURNING id INTO v_myself_role_id;

  -- Step 6: Assign "Myself" role to the personal group
  INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  VALUES (v_personal_group_id, v_personal_group_id, v_myself_role_id, v_personal_group_id);

  -- Step 7: Enroll personal group in FringeIsland Members system group
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
