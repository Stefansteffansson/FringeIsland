-- ============================================================
-- D15 Hardening: Protect personal_group_id Immutability
-- ============================================================
--
-- personal_group_id is the user's identity in the universal group pattern.
-- Once set by handle_new_user(), it must NEVER be changed or NULLed.
--
-- Safe because:
-- - handle_new_user() sets from NULL → UUID (OLD.personal_group_id IS NULL, so trigger allows it)
-- - admin_hard_delete_user() uses DELETE, not UPDATE (trigger never fires)
-- - enforce_decommission_invariant() is the existing sibling trigger on users

CREATE OR REPLACE FUNCTION public.enforce_personal_group_id_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.personal_group_id IS NOT NULL
     AND NEW.personal_group_id IS DISTINCT FROM OLD.personal_group_id THEN
    RAISE EXCEPTION
      'personal_group_id cannot be changed after it has been set (old: %, new: %)',
      OLD.personal_group_id, NEW.personal_group_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_personal_group_id_immutability
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_personal_group_id_immutability();
