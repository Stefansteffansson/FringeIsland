-- Drop all triggers on auth.users first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Drop realtime publication tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP ALL TABLES';
  END IF;
END;
$$;

-- Drop all tables with CASCADE (reverse dependency order)
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

-- Drop all functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_profile_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_personal_group_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_active_group_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_invited_group_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.validate_user_group_role() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_last_leader_removal() CASCADE;
DROP FUNCTION IF EXISTS public.copy_role_template_permissions() CASCADE;
DROP FUNCTION IF EXISTS public.auto_assign_fi_members() CASCADE;
DROP FUNCTION IF EXISTS public.notify_invitation() CASCADE;
DROP FUNCTION IF EXISTS public.notify_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_member_removal() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.admin_hard_delete_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_decommission_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reactivate_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_send_notification(UUID, TEXT, TEXT, TEXT, JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_send_direct_message(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_invite_to_group(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_join_group(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_remove_from_group(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_force_logout(UUID) CASCADE;
