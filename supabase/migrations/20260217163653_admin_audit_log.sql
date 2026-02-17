-- Admin Audit Log
-- Migration D: B-ADMIN-007
--
-- Creates an immutable audit log table for admin actions.
-- Deusex members can SELECT and INSERT. No UPDATE or DELETE for anyone.

-- ============================================================================
-- 1. Create the admin_audit_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- ============================================================================
-- 2. Enable RLS
-- ============================================================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS Policies — SELECT and INSERT only (no UPDATE, no DELETE)
-- ============================================================================

-- Deusex members can read all audit log entries
CREATE POLICY "deusex_select_audit_log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- Deusex members can insert audit log entries
CREATE POLICY "deusex_insert_audit_log"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- No UPDATE policy → immutable
-- No DELETE policy → immutable
