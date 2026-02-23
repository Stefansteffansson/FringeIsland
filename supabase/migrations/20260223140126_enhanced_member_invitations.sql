-- Enhanced Member Invitations: Pending Email Invitations for Non-Users
-- Creates pending_email_invitations table and updates handle_new_user() trigger
-- to auto-claim pending invitations when a user signs up with a matching email.

-- ============================================================
-- 1. Create pending_email_invitations table
-- ============================================================

CREATE TABLE public.pending_email_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  claimed_at TIMESTAMPTZ,
  UNIQUE(group_id, invited_email)
);

-- ============================================================
-- 2. Indexes
-- ============================================================

-- Fast lookup by email for the signup trigger (only pending, non-expired)
CREATE INDEX idx_pending_invitations_email_status
  ON public.pending_email_invitations (invited_email)
  WHERE status = 'pending';

-- Fast lookup by group + status (for listing pending invitations in a group)
CREATE INDEX idx_pending_invitations_group_status
  ON public.pending_email_invitations (group_id, status);

-- ============================================================
-- 3. Enable RLS
-- ============================================================

ALTER TABLE public.pending_email_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Users with invite_members permission can view pending invitations for their group
CREATE POLICY "pending_invitations_select"
  ON public.pending_email_invitations FOR SELECT TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'invite_members'
    )
  );

-- INSERT: Users with invite_members permission can create pending invitations
CREATE POLICY "pending_invitations_insert"
  ON public.pending_email_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'invite_members'
    )
  );

-- DELETE: Users with invite_members permission can cancel pending invitations
CREATE POLICY "pending_invitations_delete"
  ON public.pending_email_invitations FOR DELETE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'invite_members'
    )
  );

-- ============================================================
-- 4. Grant service_role full access (for trigger and admin operations)
-- ============================================================

GRANT ALL ON public.pending_email_invitations TO service_role;
GRANT ALL ON public.pending_email_invitations TO authenticated;

-- ============================================================
-- 5. Update handle_new_user() — add Step 8: claim pending invitations
-- ============================================================

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
  v_pending RECORD;
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

  -- Step 8: Claim pending email invitations
  -- If this email has outstanding pending invitations, auto-create group_memberships
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
