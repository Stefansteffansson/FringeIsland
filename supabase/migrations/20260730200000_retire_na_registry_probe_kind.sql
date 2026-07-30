-- ============================================================================
-- Retire `na_test_kind_mrzenort` — an N-A test probe left in the live registry.
--
-- Found on the 2026-07-30 gate walk while listing what each preference switch
-- actually controls: `notification_kinds` carried a row labelled "N-A
-- open-registry probe", categorised under `membership`, alongside the real
-- kinds. It was created to prove the registry is an OPEN set (a new kind needs
-- no Hub change — FEAT-PD013 STORY-1) and was never cleaned up.
--
-- Why it is worth a migration rather than a shrug: `notification_kinds` is a
-- CATALOGUE, not scratch space. Every category listing, every "what does this
-- switch control" answer, and any future preference or digest grouping reads
-- it. A test row there is a wrong answer to a question the platform will keep
-- being asked.
--
-- ORDER MATTERS. `notifications.type` is FK-enforced against this table
-- (`notifications_type_fkey`, N-A), so the kind cannot go while a row still
-- points at it. Exactly ONE notification carries it — "NA-testkind-mrzenort",
-- 2026-07-24, held by the N-A test account `NAn`, which still exists. That row
-- is the probe's own artefact, not something a member was told; it goes first,
-- then the kind.
--
-- Deliberately narrow: this retires ONE named kind. It does not pattern-match
-- for `test`/`probe`-looking names, because a sweep like that is exactly how a
-- real kind gets deleted by a regex someone trusted.
-- ============================================================================

DO $probe$
DECLARE
  v_rows int;
  v_kind_gone int;
  v_kinds_before int;
  v_kinds_after int;
BEGIN
  SELECT count(*) INTO v_kinds_before FROM public.notification_kinds;

  -- The probe's own delivery row, and only that kind's rows.
  DELETE FROM public.notifications WHERE type = 'na_test_kind_mrzenort';
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.notification_kinds WHERE kind = 'na_test_kind_mrzenort';
  GET DIAGNOSTICS v_kind_gone = ROW_COUNT;

  SELECT count(*) INTO v_kinds_after FROM public.notification_kinds;

  -- Controls. Idempotent by design: re-running finds nothing and asserts
  -- nothing, so a replay on a clean database is a no-op rather than a failure.
  IF v_kind_gone > 0 AND v_kinds_after <> v_kinds_before - 1 THEN
    RAISE EXCEPTION 'expected exactly one kind retired, registry went % -> %',
      v_kinds_before, v_kinds_after;
  END IF;

  IF EXISTS (SELECT 1 FROM public.notification_kinds WHERE kind = 'na_test_kind_mrzenort') THEN
    RAISE EXCEPTION 'the probe kind is still registered';
  END IF;

  -- Every surviving kind must still be categorised — the FK to
  -- notification_categories is what makes the switches meaningful.
  IF EXISTS (
    SELECT 1 FROM public.notification_kinds k
     WHERE NOT EXISTS (SELECT 1 FROM public.notification_categories c WHERE c.key = k.category_key)
  ) THEN
    RAISE EXCEPTION 'a surviving kind lost its category';
  END IF;

  RAISE NOTICE 'retired the N-A probe kind (% notification row(s), % registry row); kinds % -> %',
    v_rows, v_kind_gone, v_kinds_before, v_kinds_after;
END $probe$;
