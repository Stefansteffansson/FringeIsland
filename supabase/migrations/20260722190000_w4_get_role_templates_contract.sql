-- =============================================================================
-- COR-B W4 (anatomy audit II, finding AC2-4)
-- Relocate the role-template catalogue read from a BFF table read to a
-- platform contract.
-- =============================================================================
--
-- WHY
-- Audit II (2026-07-22) found one surviving direct table read in the server
-- lib: `fetchRoleTemplates` in hub/lib/groups/queries.ts calling
-- `.from('role_templates')`, while every one of its ~90 siblings goes through
-- an RPC. ADR-U038 tranche 2 relocated `get_member_groups()` for exactly this
-- shape; this site was not swept up with it.
--
-- This is a UNIFORMITY fix, not a security fix. `role_templates` already
-- carries its rule in the substrate — policy `auth_read_role_templates`
-- (SELECT, TO authenticated, qual TRUE) — so ADR-U038 clause 1 ("a Surface
-- route may never be the sole home of a platform rule") was satisfied before
-- this migration and is satisfied after it. What changes is that a sibling
-- Surface (the Gimbal) now inherits a named contract instead of having to know
-- the table name and column list.
--
-- SECURITY INVOKER, deliberately.
-- Every nearby contract is SECURITY DEFINER, so the departure is worth
-- stating: the existing RLS policy remains the enforcement point. A DEFINER
-- function would take enforcement over from RLS and hand this function the
-- power to read the table regardless of policy — a change of security posture
-- that a uniformity fix has no business making. INVOKER keeps the relocation
-- behaviour-preserving in the strict sense: same rows, same reader, same
-- enforcement, different door.
--
-- BEHAVIOUR PRESERVED
--   - any authenticated member reads the whole catalogue (qual TRUE today);
--   - anon cannot execute (EXECUTE revoked — the ADR-U038 L27 anon posture);
--   - ordered by name; exactly id / name / description, as the picker expects.
--
-- Pinned by hub/tests/integration/groups/role-templates-contract.test.ts,
-- written red-first (PGRST202 before this migration).
--
-- NOT IN SCOPE (observed while writing this, reported separately): the default
-- Supabase table grants give anon and authenticated INSERT/UPDATE/DELETE on
-- public.role_templates. RLS denies all of them (the table has a SELECT policy
-- only, and no policy means deny), so nothing is reachable — but the grant
-- surface is wider than the intent, the same class the anon-execute lockdown
-- closed for functions. Tightening it is a security-posture change and needs
-- its own gated migration, not a rider on a uniformity fix.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_role_templates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_list JSONB;
BEGIN
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id',          t.id,
               'name',        t.name,
               'description', t.description
             )
             ORDER BY t.name
           ),
           '[]'::jsonb
         )
    INTO v_list
    FROM public.role_templates t;

  RETURN v_list;
END;
$$;

COMMENT ON FUNCTION public.get_role_templates() IS
  'COR-B W4 / audit AC2-4: the foundational role-template catalogue as a platform contract. SECURITY INVOKER — the auth_read_role_templates RLS policy stays the enforcement point. Replaces the direct .from(''role_templates'') read in the Hub BFF.';

REVOKE ALL ON FUNCTION public.get_role_templates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_role_templates() TO authenticated;
