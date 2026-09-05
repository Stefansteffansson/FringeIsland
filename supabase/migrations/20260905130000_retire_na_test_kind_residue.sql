-- ==========================================================================
-- Retire the `na_test_kind_msug30be` residue from notification_kinds
-- ==========================================================================
-- Ownership: DS-5 Communication (notification_kinds — supabase/ownership.manifest.json).
-- Authority: ADR-U053 seed pre-flight, 2026-09-05 — building FringeIsland-test
-- from the chain and comparing canon showed production carrying ONE row a fresh
-- project does not: an N-A registry probe kind a suite registered and never
-- removed. Same class as 20260730200000_retire_na_registry_probe_kind.sql
-- (that one retired an earlier sibling). Residue, not canon.
--
-- Self-verifying (supabase/migrations/README.md §2), and honest about the two
-- projects it runs on: production holds exactly one such row; a project built
-- from the chain holds none. Anything else — more than one row, or a
-- notification referencing it — aborts loudly.
-- ==========================================================================

DO $$
DECLARE v_refs integer; v_n integer;
BEGIN
  SELECT count(*) INTO v_refs FROM public.notifications WHERE type = 'na_test_kind_msug30be';
  IF v_refs <> 0 THEN
    RAISE EXCEPTION 'na_test_kind_msug30be is referenced by % notification(s) — not deleting', v_refs;
  END IF;

  DELETE FROM public.notification_kinds WHERE kind = 'na_test_kind_msug30be';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 1 THEN
    RAISE EXCEPTION 'expected at most 1 na_test_kind_msug30be row, got %', v_n;
  END IF;
  RAISE NOTICE 'na_test_kind_msug30be: % row(s) retired (1 on production, 0 on a project built from the chain)', v_n;
END $$;
