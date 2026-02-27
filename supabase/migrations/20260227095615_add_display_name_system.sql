-- ============================================================
-- Display Name / Nickname System
-- ============================================================
--
-- Adds nickname, display_preference, and show_real_name columns to users.
-- Creates a sync trigger that keeps the personal group `name` in sync
-- with the user's chosen display preference.
-- Updates handle_new_user() to set nickname on signup.
--
-- Feature doc: docs/features/planned/display-name-system.md
-- Behaviors: B-DISP-001 through B-DISP-011
-- ============================================================

-- ============================================================
-- 1. Add new columns to users table
-- ============================================================

-- nickname added as nullable first (backfill, then NOT NULL)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS display_preference TEXT NOT NULL DEFAULT 'nickname'
    CHECK (display_preference IN ('real_name', 'nickname')),
  ADD COLUMN IF NOT EXISTS show_real_name BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Backfill nickname from existing full_name (first word)
-- ============================================================

UPDATE public.users
SET nickname = split_part(full_name, ' ', 1)
WHERE nickname IS NULL
  AND full_name IS NOT NULL
  AND char_length(full_name) > 0;

-- Safety net: if any users somehow have NULL/empty full_name, use email
UPDATE public.users
SET nickname = email
WHERE nickname IS NULL;

-- ============================================================
-- 3. Add NOT NULL constraint + length check
-- ============================================================

ALTER TABLE public.users
  ALTER COLUMN nickname SET NOT NULL;

ALTER TABLE public.users
  ADD CONSTRAINT nickname_not_empty CHECK (char_length(nickname) >= 1);

-- ============================================================
-- 4. Sync personal group names to nickname
--    (default preference is 'nickname', so all existing users
--     should show their nickname as their personal group name)
-- ============================================================

UPDATE public.groups g
SET name = u.nickname
FROM public.users u
WHERE u.personal_group_id = g.id
  AND g.group_type = 'personal';

-- ============================================================
-- 5. Create sync trigger function
-- ============================================================
-- Fires AFTER UPDATE on users when nickname, full_name, or
-- display_preference changes. Updates the personal group name
-- to match the user's current display preference.
--
-- AFTER UPDATE (not BEFORE) to avoid interference with existing
-- BEFORE UPDATE triggers:
--   - set_users_updated_at
--   - enforce_decommission_invariant
--   - enforce_personal_group_id_immutability

CREATE OR REPLACE FUNCTION public.sync_personal_group_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only sync if user has a personal group and a relevant column changed
  IF NEW.personal_group_id IS NOT NULL AND (
    OLD.nickname IS DISTINCT FROM NEW.nickname OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.display_preference IS DISTINCT FROM NEW.display_preference
  ) THEN
    UPDATE public.groups
    SET name = CASE
      WHEN NEW.display_preference = 'nickname' THEN NEW.nickname
      WHEN NEW.display_preference = 'real_name' THEN NEW.full_name
      ELSE NEW.nickname
    END
    WHERE id = NEW.personal_group_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_display_name_to_personal_group
  AFTER UPDATE OF nickname, full_name, display_preference ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_personal_group_display_name();

-- ============================================================
-- 6. Update handle_new_user() — add nickname + use it for
--    personal group name
-- ============================================================
-- This is CREATE OR REPLACE, overwriting the version from
-- 20260223140126_enhanced_member_invitations.sql.
-- All 8 existing steps are preserved; changes marked with
-- [DISPLAY NAME] comments.

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
  v_full_name TEXT;
  v_nickname TEXT;
  v_pending RECORD;
BEGIN
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  -- [DISPLAY NAME] Extract first word as nickname
  v_nickname := split_part(v_full_name, ' ', 1);

  -- Step 1: Create user profile (personal_group_id = NULL initially)
  -- [DISPLAY NAME] Added nickname column
  INSERT INTO public.users (auth_user_id, email, full_name, avatar_url, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    v_nickname
  )
  RETURNING id INTO v_user_id;

  -- Step 2: Create personal group (created_by_group_id = NULL initially — bootstrap)
  -- [DISPLAY NAME] Use nickname for personal group name, not full_name
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, avatar_url)
  VALUES (
    v_nickname,
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

  -- Step 8: Claim pending email invitations
  FOR v_pending IN
    SELECT id, group_id, invited_by_group_id
    FROM public.pending_email_invitations
    WHERE LOWER(invited_email) = LOWER(NEW.email)
      AND status = 'pending'
      AND expires_at > NOW()
  LOOP
    INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
    VALUES (v_pending.group_id, v_personal_group_id, v_pending.invited_by_group_id, 'invited')
    ON CONFLICT (group_id, member_group_id) DO NOTHING;

    UPDATE public.pending_email_invitations
    SET status = 'claimed', claimed_at = NOW()
    WHERE id = v_pending.id;
  END LOOP;

  RETURN NEW;
END;
$$;
