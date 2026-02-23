-- ==========================================================================
-- Migration: fix_test_regressions
-- Date: 2026-02-23
-- Purpose: Fix D15 rebuild residuals — missing RLS policies, RPC param names,
--          groups_select admin override, and realtime publication gaps.
-- Root Causes: RC2, RC3, RC4, RC8 from regression analysis
-- ==========================================================================

-- --------------------------------------------------------------------------
-- RC2: admin_audit_log — RLS enabled but zero policies
-- Add SELECT + INSERT policies gated by manage_all_groups permission.
-- Writes also occur via SECURITY DEFINER triggers, so this covers
-- authenticated client reads (e.g., DeusEx admin panel).
-- --------------------------------------------------------------------------

CREATE POLICY "audit_log_select_admin"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

CREATE POLICY "audit_log_insert_admin"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

-- --------------------------------------------------------------------------
-- RC3: groups_select — no DeusEx admin override
-- Replace the policy to add a manage_all_groups escape hatch so admins
-- can see private groups they're not members of.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "groups_select" ON public.groups;

CREATE POLICY "groups_select"
  ON public.groups FOR SELECT TO authenticated
  USING (
    is_public = true
    OR public.is_active_group_member(id)
    OR public.is_invited_group_member(id)
    OR created_by_group_id = public.get_current_personal_group_id()
    OR public.has_permission(
      public.get_current_personal_group_id(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'manage_all_groups'
    )
  );

-- --------------------------------------------------------------------------
-- RC4: admin_send_notification — param names mismatch
-- SQL uses p_title/p_message, tests/UI use title/message.
-- Must DROP first because PostgreSQL won't rename params via CREATE OR REPLACE.
-- --------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_send_notification(UUID[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  target_user_ids UUID[],
  title TEXT,
  message TEXT
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
        admin_send_notification.title,
        admin_send_notification.message,
        jsonb_build_object('sent_by_group_id', v_caller_group_id)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

-- Re-grant (CREATE OR REPLACE preserves grants, but be explicit)
GRANT EXECUTE ON FUNCTION public.admin_send_notification(UUID[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(UUID[], TEXT, TEXT) TO service_role;

-- --------------------------------------------------------------------------
-- RC8: Realtime CHANNEL_ERROR — ensure tables are in supabase_realtime
-- Idempotent: only add if not already present.
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
