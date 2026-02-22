-- ==========================================================================
-- Pre-D15 Schema Reset: Drop everything in public schema
-- ==========================================================================
-- Run BEFORE the new consolidated migration.
-- This drops all tables, functions, triggers, types, and policies.
-- ==========================================================================

-- 1. Drop triggers on auth.users (these reference public schema functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- 2. Drop all realtime publications
DO $$
BEGIN
  -- Remove tables from realtime publication if it exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP ALL TABLES';
  END IF;
END;
$$;

-- 3. Nuke public schema (CASCADE drops all tables, functions, triggers, policies, types)
DROP SCHEMA public CASCADE;

-- 4. Recreate public schema with proper grants
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;

-- 5. Clear migration history so the new migration can be tracked
DELETE FROM supabase_migrations.schema_migrations;
