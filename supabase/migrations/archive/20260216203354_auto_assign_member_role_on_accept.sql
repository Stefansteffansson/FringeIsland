-- Migration: Auto-assign Member role when invitation is accepted
-- Date: 2026-02-16
--
-- Problem: When a user accepts a group invitation, the client-side code
--   tries to INSERT into user_group_roles to assign the Member role.
--   But the RLS policy requires either assign_roles permission (the new
--   member doesn't have any permissions yet) or the bootstrap case (no
--   Steward exists). Neither applies, so the assignment silently fails.
--
-- Fix: Use a database trigger that fires AFTER UPDATE on group_memberships
--   when status changes from 'invited' to 'active'. The trigger function
--   is SECURITY DEFINER, bypassing RLS. This also means we can remove the
--   client-side role assignment code from the invitations page.

-- ============================================================================
-- 1. Create the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_member_role_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_role_id UUID;
BEGIN
  -- Only fire when status changes from 'invited' to 'active'
  IF OLD.status = 'invited' AND NEW.status = 'active' THEN
    -- Find the Member role for this group
    SELECT id INTO v_member_role_id
    FROM public.group_roles
    WHERE group_id = NEW.group_id
      AND name = 'Member'
    LIMIT 1;

    -- If a Member role exists and user doesn't already have it, assign it
    IF v_member_role_id IS NOT NULL THEN
      INSERT INTO public.user_group_roles (
        user_id,
        group_id,
        group_role_id,
        assigned_by_user_id
      )
      VALUES (
        NEW.user_id,
        NEW.group_id,
        v_member_role_id,
        NEW.user_id  -- self-assigned on acceptance
      )
      ON CONFLICT DO NOTHING;  -- Skip if already assigned
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_assign_member_role_on_accept IS
'Automatically assigns the Member role when a user accepts a group invitation
(status changes from invited to active). SECURITY DEFINER bypasses RLS so new
members can receive their initial role without needing assign_roles permission.';

-- ============================================================================
-- 2. Create the trigger
-- ============================================================================

DROP TRIGGER IF EXISTS assign_member_role_on_accept ON public.group_memberships;

CREATE TRIGGER assign_member_role_on_accept
  AFTER UPDATE ON public.group_memberships
  FOR EACH ROW
  WHEN (OLD.status = 'invited' AND NEW.status = 'active')
  EXECUTE FUNCTION public.auto_assign_member_role_on_accept();

-- ============================================================================
-- 3. Verify
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'auto_assign_member_role_on_accept'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assign_member_role_on_accept'
  ) INTO v_trigger_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'auto_assign_member_role_on_accept function not created!';
  END IF;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'assign_member_role_on_accept trigger not created!';
  END IF;

  RAISE NOTICE 'Auto-assign Member role trigger created successfully';
END $$;
