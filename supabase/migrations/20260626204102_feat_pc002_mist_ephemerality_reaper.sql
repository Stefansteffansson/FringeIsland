-- FEAT-PC002 (IDN-2) — Mist ephemerality reaper, STORY-1 + the reaper-run event
-- half of STORY-4 (ADR-U033). Closes the FEAT-PC001/H003 accumulation gap:
-- un-transcended Mists are erased after an inactivity TTL, on a pg_cron schedule.
-- Departure slice of the §9 Mist lifecycle (ADR-U031 stage 3).
--
-- Schema change — schema-review gate: lands at task status `review`, not `done`.
-- Additive (new tables + function + extension + scheduled job). Re-runnable
-- (IF NOT EXISTS / CREATE OR REPLACE / cron.schedule upsert).
--
-- Adds:
--   1. public.pc2_config — PC-2 internal key/value config; holds mist_inactivity_ttl
--      so the TTL is NOT hardcoded in the function (ADR-U033 / ADR-U031: "PC-2
--      configuration"). Changeable without altering the reaper.
--   2. public.reaper_runs — V4 observability sink for sweep runs (counts +
--      outcome). pg_cron runs server-side with no Hub, so the event lands in the DB.
--   3. public.reap_expired_mists() — the SECURITY DEFINER sweep: selects
--      un-transcended Mists past the inactivity TTL and erases them via the
--      _erase_mist primitive (FEAT-PC002 TASK-01); logs a reaper_runs event.
--   4. pg_cron enabled + the 'mist-reaper' job scheduled (cadence << TTL).
--
-- PRIVILEGE / SAFETY (platform gotchas):
--   * reap_expired_mists is SECURITY DEFINER + SET search_path = '' — it reads
--     auth.users + mutates the proto-group/auth substrate via _erase_mist, which a
--     client cannot. REVOKEd from PUBLIC; GRANTed to service_role (ops) + invoked
--     by pg_cron (runs as owner). Privilege-escalation surface documented here.
--   * FOR UPDATE ... SKIP LOCKED honours ADR-U031 "no erase mid-migration": a Mist
--     being transcended is row-locked by that single-txn migration, so the sweep
--     skips it (the inactivity guard also excludes a just-active transcender).
--   * One per-row erasure failure is caught + counted (skipped) so it cannot abort
--     the whole sweep; a sweep-level failure logs an error run then re-raises.
--   * pc2_config / reaper_runs: RLS enabled, deny-by-default (no client reader);
--     service_role + SECURITY DEFINER owner bypass RLS.
--
-- OUT OF SCOPE (later FEAT-PC002 tasks): consent substrate (STORY-5), atomic
-- transcendence (STORY-3), FIM account-erasure anonymise-vs-retain (STORY-5 crit-4).
-- The Hub `mist.entered` telemetry `reaperRealised` flag flips true alongside this
-- (the reaper is now realised) — a Hub-side constant, updated with this slice.

-- 1. PC-2 configuration store. TTL lives here, not in the function body.
CREATE TABLE IF NOT EXISTS public.pc2_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pc2_config ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: internal config, no client reader. service_role + SECURITY
-- DEFINER functions bypass RLS; no policies == no anon/authenticated access.

COMMENT ON TABLE public.pc2_config IS
  'FEAT-PC002/ADR-U033: PC-2 internal key/value config (e.g. mist_inactivity_ttl). RLS deny-by-default; service-role/definer only.';

INSERT INTO public.pc2_config (key, value, description)
VALUES (
  'mist_inactivity_ttl',
  '72 hours',
  'Mist ephemerality TTL (ADR-U033), measured from inactivity (auth.users.last_sign_in_at). Changeable without altering reap_expired_mists().'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Reaper-run event sink (V4; DB-side because pg_cron has no Hub).
CREATE TABLE IF NOT EXISTS public.reaper_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  swept_count integer NOT NULL DEFAULT 0,
  erased_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  outcome text NOT NULL,          -- 'success' | 'error'
  error_detail text
);

ALTER TABLE public.reaper_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.reaper_runs IS
  'FEAT-PC002/ADR-U033 (V4): reaper sweep run log (counts swept/erased/skipped + outcome). RLS deny-by-default; service-role/definer only. Admin surfaces consume later.';

-- 3. The sweep.
CREATE OR REPLACE FUNCTION public.reap_expired_mists()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ttl interval;
  v_swept integer := 0;
  v_erased integer := 0;
  v_skipped integer := 0;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  SELECT (value)::interval INTO v_ttl
  FROM public.pc2_config WHERE key = 'mist_inactivity_ttl';
  IF v_ttl IS NULL THEN
    v_ttl := interval '72 hours';  -- safe fallback if the config row is missing
  END IF;

  -- Un-transcended Mists whose inactivity exceeds the TTL. SKIP LOCKED skips any
  -- row a concurrent transcendence holds (no erase mid-migration).
  FOR v_user_id IN
    SELECT u.id
    FROM public.users u
    JOIN auth.users au ON au.id = u.auth_user_id
    WHERE u.is_temporary = true
      AND COALESCE(au.last_sign_in_at, au.created_at) < (now() - v_ttl)
    FOR UPDATE OF u SKIP LOCKED
  LOOP
    v_swept := v_swept + 1;
    BEGIN
      PERFORM public._erase_mist(v_user_id);
      v_erased := v_erased + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;  -- one failure must not abort the whole sweep
    END;
  END LOOP;

  INSERT INTO public.reaper_runs (swept_count, erased_count, skipped_count, outcome)
  VALUES (v_swept, v_erased, v_skipped, 'success')
  RETURNING jsonb_build_object(
    'swept', swept_count, 'erased', erased_count, 'skipped', skipped_count
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.reaper_runs (swept_count, erased_count, skipped_count, outcome, error_detail)
  VALUES (v_swept, v_erased, v_skipped, 'error', SQLERRM);
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.reap_expired_mists() IS
  'FEAT-PC002 STORY-1 (ADR-U033): scheduled SECURITY DEFINER reaper. Erases un-transcended Mists whose inactivity (auth.users.last_sign_in_at) exceeds pc2_config.mist_inactivity_ttl, via _erase_mist; FOR UPDATE SKIP LOCKED honours "no erase mid-migration"; logs a reaper_runs event. Invoked by pg_cron; callable by service_role for ops.';

REVOKE ALL ON FUNCTION public.reap_expired_mists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reap_expired_mists() TO service_role;

-- 4. Enable pg_cron + schedule the sweep. Cadence (15 min) << TTL (72h) so expiry
--    is bounded by the TTL, not the cadence. pg_cron becomes the canonical
--    FringeIsland scheduling substrate (ADR-U033) — a standing platform commitment.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('mist-reaper', '*/15 * * * *', 'SELECT public.reap_expired_mists();');
