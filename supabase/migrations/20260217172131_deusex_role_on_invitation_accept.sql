-- Migration: Auto-assign Deusex role when invitation to Deusex group is accepted
-- Date: 2026-02-17
--
-- Problem: The existing auto_assign_member_role_on_accept trigger only assigns
--   the "Member" role, but the Deusex system group has a "Deusex" role instead.
--   When a user accepts an invitation to the Deusex group, they need the Deusex
--   role auto-assigned so they receive all platform admin permissions.
--
-- Fix: Create a trigger that fires AFTER UPDATE on group_memberships. When the
--   status changes from 'invited' to 'active' in the Deusex system group, it
--   auto-assigns the Deusex role.
--
-- Also: Drop the "Platform admins can add members" INSERT policy from the
--   previous migration — we use the invitation flow instead, which already
--   passes the existing INSERT policy (status='invited').

-- ============================================================================
-- 1. Drop the direct-add INSERT policy (invitation flow replaces it)
-- ============================================================================

DROP POLICY IF EXISTS "Platform admins can add members" ON group_memberships;

-- ============================================================================
-- 2. Create trigger function for Deusex role auto-assignment
-- ============================================================================

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
  -- Only fire when status changes from 'invited' to 'active'
  IF OLD.status = 'invited' AND NEW.status = 'active' THEN
    -- Check if this is the Deusex system group
    SELECT id INTO v_deusex_group_id
    FROM public.groups
    WHERE name = 'Deusex'
      AND group_type = 'system'
    LIMIT 1;

    IF NEW.group_id = v_deusex_group_id THEN
      -- Find the Deusex role
      SELECT id INTO v_deusex_role_id
      FROM public.group_roles
      WHERE group_id = v_deusex_group_id
        AND name = 'Deusex'
      LIMIT 1;

      IF v_deusex_role_id IS NOT NULL THEN
        INSERT INTO public.user_group_roles (
          user_id,
          group_id,
          group_role_id,
          assigned_by_user_id
        )
        VALUES (
          NEW.user_id,
          NEW.group_id,
          v_deusex_role_id,
          NEW.user_id  -- self-assigned on acceptance
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Create the trigger
-- ============================================================================

DROP TRIGGER IF EXISTS auto_assign_deusex_role ON public.group_memberships;

CREATE TRIGGER auto_assign_deusex_role
AFTER UPDATE ON public.group_memberships
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_deusex_role_on_accept();

COMMENT ON TRIGGER auto_assign_deusex_role ON public.group_memberships IS
'Auto-assigns the Deusex role when a user accepts an invitation to the Deusex system group.
Complements auto_assign_member_role_on_accept which handles the Member role for regular groups.';

-- ============================================================================
-- 4. Verify
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_insert_policy_dropped BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'auto_assign_deusex_role_on_accept'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'auto_assign_deusex_role'
      AND c.relname = 'group_memberships'
  ) INTO v_trigger_exists;

  SELECT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'group_memberships'
      AND policyname = 'Platform admins can add members'
  ) INTO v_insert_policy_dropped;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'auto_assign_deusex_role_on_accept function not created!';
  END IF;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'auto_assign_deusex_role trigger not created!';
  END IF;

  IF NOT v_insert_policy_dropped THEN
    RAISE EXCEPTION '"Platform admins can add members" INSERT policy was not dropped!';
  END IF;

  RAISE NOTICE 'Deusex invitation-accept trigger created, INSERT policy dropped';
END $$;
