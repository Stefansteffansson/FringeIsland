-- ADR-U053 §2, first drift-check run (2026-09-05): production's applied history
-- recorded TASK-EDT-01's migration as 20260821132432 (the `migration new`
-- timestamp at authoring) while the committed file is
-- 20260821150000_task_edt01_unlimited_own_edit_delete.sql (commit d184c0c5,
-- #575, 2026-08-21; the SQL ran on production and was walked green).
-- Moves the RECORD only — no schema change. Self-verifying (migrations README §2).
-- Run: ALLOW_PRODUCTION=1 node scripts/run-sql.js --production docs/planning/hub-v2/sql/2026-09-05-repair-edt01-version-record.sql
DO $$
DECLARE v_n integer;
BEGIN
  UPDATE supabase_migrations.schema_migrations
     SET version = '20260821150000', name = 'task_edt01_unlimited_own_edit_delete'
   WHERE version = '20260821132432';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 row for version 20260821132432, got %', v_n;
  END IF;
END $$;
SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations WHERE version = '20260821150000';
