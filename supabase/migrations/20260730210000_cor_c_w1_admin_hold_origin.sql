-- ============================================================================
-- COR-C W1 — wire the admin half of ADR-U050
-- (Anatomy Audit III: AC3-1 CRITICAL · AC3-14 same re-issue · AC3-2/AC3-13
--  carried by the producer-driven suite account-lifecycle-admin-producer.test.ts)
--
-- The defect: admin_update_user_status() — the anatomy's sole producer of the
-- 'suspended' state — never wrote users.deactivation_origin. A hold imposed on
-- a member-paused row was a silent no-op ('member' origin untouched), so
-- get_own_account_state() kept answering 'paused' and reactivate_own_account()'s
-- origin gate (IS DISTINCT FROM 'member') passed: the member walked out of an
-- admin hold. A release likewise left a stale 'member' residue that re-armed
-- the escape on the next hold. admin_decommission_user was origin-blind too.
--
-- The fix (PC-4 side only, per ADR-U028/U050 — reactivate_own_account() is
-- untouched; its gate is correct):
--   1. admin_update_user_status(): the SAME UPDATE statement now writes
--      deactivation_origin = 'admin' on hold (a member pause is converted,
--      not preserved), NULL on release (no residue). The target read takes
--      FOR UPDATE (AC3-14), like the three self-service contracts.
--   2. admin_decommission_user(): stamps deactivation_origin = 'admin' —
--      the terminal record carries who closed it (record hygiene;
--      terminality itself stays trigger-enforced).
--   3. Terminal-record guard: a hold aimed at an already-decommissioned row
--      keeps that row's origin untouched (a self-deleted member's 'member'
--      origin is part of the terminal record; state derivation reads
--      is_decommissioned first, so origin is inert there — preserve it).
--      admin_decommission_user already refuses re-decommission, so the same
--      guarantee holds there by the existing wall.
--
-- Deliberately NOT here:
--   - No data migration. Off rows written during the defect window are
--     surfaced by the diagnostic query in the W1 PR body; their disposition
--     is the schema-gate reviewer's call.
--   - No FOR UPDATE on admin_decommission_user's target read: AC3-14 cites
--     only the status producer; decommission terminality is trigger-enforced,
--     so the race is harmless. Flagged in the PR for the reviewer.
--
-- Grants: unchanged — CREATE OR REPLACE preserves ACLs (authenticated +
-- service_role from 20260223171200); no REVOKE/GRANT issued, none needed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. admin_update_user_status() — re-issue (origin write + FOR UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
  target_user_id UUID,
  new_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
BEGIN
  -- Check permission
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  -- Get target user; FOR UPDATE serialises against the self-service
  -- contracts' own-row locks (AC3-14).
  SELECT id, is_active, is_decommissioned
  INTO v_target
  FROM public.users WHERE id = target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Decommission invariant: cannot reactivate a decommissioned user
  IF v_target.is_decommissioned = true AND new_is_active = true THEN
    RAISE EXCEPTION 'Cannot reactivate a decommissioned user';
  END IF;

  -- ADR-U050: the origin travels in the SAME statement as the flag —
  -- 'admin' on hold (a member pause converts to an un-escapable hold),
  -- NULL on release (no stale residue). A decommissioned row keeps its
  -- terminal origin.
  UPDATE public.users
  SET is_active = new_is_active,
      deactivation_origin = CASE
        WHEN is_decommissioned THEN deactivation_origin
        WHEN new_is_active THEN NULL
        ELSE 'admin'
      END,
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.admin_update_user_status(UUID, BOOLEAN) IS
  'PC-4 admin lifecycle (RC7; re-issued COR-C W1, ADR-U050): '
  'manage_all_groups-gated activate/deactivate of any account. The sole '
  'producer of the admin hold: writes deactivation_origin=''admin'' on hold '
  '(a member pause is converted, not preserved), NULL on release; an '
  'already-decommissioned row keeps its terminal origin. Decommissioned '
  'accounts cannot be reactivated (in-body + trigger). Target read FOR '
  'UPDATE. SECURITY DEFINER; escalation bounded to the one target row''s '
  'lifecycle flags.';

-- ----------------------------------------------------------------------------
-- 2. admin_decommission_user() — re-issue (origin stamp)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_decommission_user(
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
BEGIN
  -- Check permission
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  -- Get target user
  SELECT id, is_decommissioned
  INTO v_target
  FROM public.users WHERE id = target_user_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target.is_decommissioned = true THEN
    RAISE EXCEPTION 'User is already decommissioned';
  END IF;

  -- Decommission: set both flags (trigger also enforces is_active=false).
  -- ADR-U050 (COR-C W1): the terminal record carries who closed it.
  UPDATE public.users
  SET is_decommissioned = true,
      is_active = false,
      deactivation_origin = 'admin',
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.admin_decommission_user(UUID) IS
  'PC-4 admin lifecycle (RC7; re-issued COR-C W1, ADR-U050): '
  'manage_all_groups-gated terminal decommission. Stamps '
  'deactivation_origin=''admin'' — the terminal record carries who closed '
  'it. Refuses an already-decommissioned target (a terminal origin is never '
  'rewritten). SECURITY DEFINER; escalation bounded to the one target row''s '
  'lifecycle flags.';
