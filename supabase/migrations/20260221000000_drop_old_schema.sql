-- ==========================================================================
-- Pre-D15: Drop all old schema objects
-- ==========================================================================
-- This migration drops everything from the old schema so the D15 rebuild
-- migration can create tables fresh with the new column names.
-- ==========================================================================

-- Drop triggers on auth.users first (they reference public schema functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Remove tables from realtime publication (PG15-compatible: drop individually)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I', r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- Drop all tables (reverse dependency order, CASCADE for safety)
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.journey_enrollments CASCADE;
DROP TABLE IF EXISTS public.journeys CASCADE;
DROP TABLE IF EXISTS public.user_group_roles CASCADE;
DROP TABLE IF EXISTS public.group_role_permissions CASCADE;
DROP TABLE IF EXISTS public.group_roles CASCADE;
DROP TABLE IF EXISTS public.group_template_roles CASCADE;
DROP TABLE IF EXISTS public.group_templates CASCADE;
DROP TABLE IF EXISTS public.role_template_permissions CASCADE;
DROP TABLE IF EXISTS public.role_templates CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.group_memberships CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop all known functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace ns ON p.pronamespace = ns.oid
    WHERE ns.nspname = 'public'
  ) LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', r.nspname, r.proname, r.args);
  END LOOP;
END;
$$;
