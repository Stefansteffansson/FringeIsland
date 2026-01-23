-- Migration: Complete user lifecycle management with soft delete
-- Date: 2026-01-23
-- Description: 
--   - Fixed trigger to use correct column name (full_name instead of display_name)
--   - Enabled Row Level Security on users table
--   - Added RLS policies for user data access
--   - Added soft delete trigger when auth user is deleted
--   - Changed CASCADE constraints to RESTRICT to enable soft delete
--   - Fixed users.auth_user_id constraint from CASCADE to SET NULL

-- ============================================================================
-- USER CREATION TRIGGER
-- ============================================================================

-- Drop the old incorrect trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the corrected function that matches the actual users table structure
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at, is_active, auth_user_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NOW(),
    NOW(),
    true,
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user profile record when a new auth user signs up. Extracts display_name from user metadata and stores it as full_name.';

-- ============================================================================
-- USER DELETION TRIGGER (SOFT DELETE)
-- ============================================================================

-- Create function to handle user deletion (soft delete)
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark user as inactive instead of deleting
  -- This preserves data integrity for groups, journeys, etc.
  UPDATE public.users 
  SET is_active = false, 
      updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_user_delete() IS 'Soft deletes user profile by marking as inactive when auth user is deleted. Preserves data integrity for foreign key relationships.';

-- ============================================================================
-- FIX CASCADE CONSTRAINTS (Enable Soft Delete)
-- ============================================================================

-- CRITICAL FIX: Change users.auth_user_id from CASCADE to SET NULL
-- This was the main blocker preventing soft delete from working
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_auth_user_id_fkey 
    FOREIGN KEY (auth_user_id) 
    REFERENCES auth.users(id) 
    ON DELETE SET NULL;

-- Change user_group_roles from CASCADE to RESTRICT
ALTER TABLE user_group_roles DROP CONSTRAINT IF EXISTS user_group_roles_user_id_fkey;
ALTER TABLE user_group_roles ADD CONSTRAINT user_group_roles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE RESTRICT;

-- Change group_memberships from CASCADE to RESTRICT
ALTER TABLE group_memberships DROP CONSTRAINT IF EXISTS group_memberships_user_id_fkey;
ALTER TABLE group_memberships ADD CONSTRAINT group_memberships_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE RESTRICT;

-- Change journey_enrollments from CASCADE to RESTRICT
ALTER TABLE journey_enrollments DROP CONSTRAINT IF EXISTS journey_enrollments_user_id_fkey;
ALTER TABLE journey_enrollments ADD CONSTRAINT journey_enrollments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE RESTRICT;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create RLS policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify triggers were created successfully
DO $$
DECLARE
  trigger_count INTEGER;
  auth_constraint_rule TEXT;
  restrict_count INTEGER;
BEGIN
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('on_auth_user_created', 'on_auth_user_deleted');
  
  IF trigger_count = 2 THEN
    RAISE NOTICE 'SUCCESS: Both triggers created successfully';
  ELSE
    RAISE WARNING 'WARNING: Expected 2 triggers, found %', trigger_count;
  END IF;
  
  -- Check auth_user_id constraint (most critical!)
  SELECT delete_rule INTO auth_constraint_rule
  FROM information_schema.referential_constraints
  WHERE constraint_name = 'users_auth_user_id_fkey';
  
  IF auth_constraint_rule = 'SET NULL' THEN
    RAISE NOTICE 'SUCCESS: users.auth_user_id constraint is SET NULL (soft delete enabled)';
  ELSE
    RAISE WARNING 'WARNING: users.auth_user_id constraint is %, expected SET NULL', auth_constraint_rule;
  END IF;
  
  -- Check other constraints
  SELECT COUNT(*) INTO restrict_count
  FROM information_schema.referential_constraints
  WHERE constraint_name IN (
    'user_group_roles_user_id_fkey',
    'group_memberships_user_id_fkey', 
    'journey_enrollments_user_id_fkey'
  )
  AND delete_rule = 'RESTRICT';
  
  IF restrict_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All 3 related table constraints are RESTRICT';
  ELSE
    RAISE WARNING 'WARNING: Expected 3 RESTRICT constraints, found %', restrict_count;
  END IF;
END $$;
