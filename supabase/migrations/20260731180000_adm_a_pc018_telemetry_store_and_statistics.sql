-- FEAT-PC018 (Cycle ADM-A, ADR-U052 §1–§4) — telemetry event store & platform
-- statistics: the V4 sink and the ADM-1 read.
--
-- Schema change — schema-review gate: lands at task status `review`, not `done`.
-- Additive only (one table, four functions, one scheduled job). Re-runnable
-- (IF NOT EXISTS / CREATE OR REPLACE / cron.schedule upsert — the reaper idiom).
--
-- Sibling-assertion grep (the three-strikes rule): telemetry_events,
-- record_telemetry_event, prune_telemetry_events, get_platform_statistics,
-- ds3_stats_snapshot swept across hub/tests, hub/lib, hub/app 2026-07-31 —
-- zero pre-existing assertions; the only referencing file is this feature's
-- own red-first suite (tests/integration/observability/). Nothing adapted,
-- nothing deliberately left.
--
-- Adds:
--   1. public.telemetry_events — the durable sink (ADR-U052 §1). Deny-all
--      under RLS (enabled, zero policies — the ds5_config precedent, AC3-O2):
--      the recorder and the statistics read are the only doors.
--   2. public.record_telemetry_event() — SECURITY DEFINER fire-and-forget
--      recorder; NEVER raises (§2: an emit failure never fails the action).
--   3. public.prune_telemetry_events() + the 'telemetry-prune' pg_cron job —
--      90-day raw retention (§3).
--   4. public.ds3_stats_snapshot() — DS-3-owned platform-wide enrollment
--      counts, so the statistics document composes a published READ contract
--      instead of reaching into DS-3 tables (the get_own_data_export
--      precedent: "calls the domain's published READ contracts, never their
--      tables"). Internal: EXECUTE revoked from all client roles.
--   5. public.get_platform_statistics() — the admin-gated, computed-on-read
--      statistics document (typed 42501 refusal; no aggregate tables, §3).

-- 1. The sink -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE CASCADE is the Mist rule by construction (ADR-U052 §4): every
  -- erasure path's terminal act deletes the subject's personal group row, and
  -- this edge takes the subject's telemetry with it.
  actor_group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_name_time
  ON public.telemetry_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created
  ON public.telemetry_events (created_at);

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telemetry_events IS
  'FEAT-PC018 (ADR-U052): the V4 telemetry sink. RLS deliberately DENY-ALL — enabled with zero policies (the ds5_config precedent): no role reads or writes rows directly; record_telemetry_event() is the only writer and get_platform_statistics() the only reader. Content-free props by discipline; 90-day retention via the telemetry-prune job; actor cascade carries the Mist rule.';

-- 2. The recorder -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_telemetry_event(
  p_event_name text,
  p_props jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.telemetry_events (actor_group_id, event_name, props)
  VALUES (
    public.get_current_personal_group_id(),
    p_event_name,
    COALESCE(p_props, '{}'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  -- ADR-U052 §2: an emit failure never fails — or even surfaces to — the
  -- calling action. The operator sees sink failures in DB logs, not the member.
  NULL;
END;
$$;

COMMENT ON FUNCTION public.record_telemetry_event(text, jsonb) IS
  'FEAT-PC018 (ADR-U052 §2): fire-and-forget telemetry recorder. SECURITY DEFINER because the sink table is deny-all; never raises by construction. Actor self-resolved; content-free props are the caller''s obligation (review-enforced, deliberately not a sealed registry).';

REVOKE ALL ON FUNCTION public.record_telemetry_event(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_telemetry_event(text, jsonb) TO authenticated;

-- 3. Retention ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prune_telemetry_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_n integer;
BEGIN
  DELETE FROM public.telemetry_events
   WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.prune_telemetry_events() IS
  'FEAT-PC018 (ADR-U052 §3): 90-day raw-event retention. Invoked by the telemetry-prune pg_cron job; returns the pruned count so runs are observable in cron.job_run_details. Internal — no client role may execute.';

REVOKE ALL ON FUNCTION public.prune_telemetry_events() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('telemetry-prune', '30 3 * * *', 'SELECT public.prune_telemetry_events();');

-- 4. The DS-3 stats contract --------------------------------------------------

CREATE OR REPLACE FUNCTION public.ds3_stats_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'active_enrollments', count(*) FILTER (WHERE status = 'active'),
    'completions_30d',    count(*) FILTER (WHERE completed_at >= now() - interval '30 days')
  )
  FROM public.journey_enrollments;
$$;

COMMENT ON FUNCTION public.ds3_stats_snapshot() IS
  'FEAT-PC018 rider, DS-3-owned (manifest-registered): platform-wide enrollment counts published as a READ contract so core statistics composes it instead of reading DS-3 tables (the export-composite precedent — contracts, never tables). Counts only; no row egress. Internal — EXECUTE revoked from all client roles; composed by get_platform_statistics().';

REVOKE ALL ON FUNCTION public.ds3_stats_snapshot() FROM PUBLIC, anon, authenticated;

-- 5. The statistics read ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_platform_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_members  jsonb;
  v_groups   jsonb;
  v_activity jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total',  count(*) FILTER (WHERE NOT is_temporary AND NOT is_decommissioned),
    'active', count(*) FILTER (WHERE NOT is_temporary AND NOT is_decommissioned AND is_active),
    'mists',  count(*) FILTER (WHERE is_temporary AND NOT is_decommissioned)
  )
  INTO v_members
  FROM public.users;

  SELECT jsonb_build_object(
    'total',      count(*) FILTER (WHERE group_type <> 'personal'),
    'engagement', count(*) FILTER (WHERE group_type = 'engagement')
  )
  INTO v_groups
  FROM public.groups;

  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('day', d.day, 'count', d.n) ORDER BY d.day),
           '[]'::jsonb
         )
  INTO v_activity
  FROM (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS n
      FROM public.telemetry_events
     WHERE created_at >= now() - interval '30 days'
     GROUP BY 1
  ) d;

  RETURN jsonb_build_object(
    'version',        1,
    'generated_at',   now(),
    'members',        v_members,
    'groups',         v_groups,
    'journeys',       public.ds3_stats_snapshot(),
    'activity_daily', v_activity
  );
END;
$$;

COMMENT ON FUNCTION public.get_platform_statistics() IS
  'FEAT-PC018 (ADR-U052 §3): the ADM-1 statistics document — computed on read (no aggregate tables to drift), platform-admin-gated with a typed 42501 refusal. Aggregates are counts only; no per-member disclosure. Versioned payload: additive keys are non-breaking. Composes ds3_stats_snapshot() for the journeys block.';

REVOKE ALL ON FUNCTION public.get_platform_statistics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_statistics() TO authenticated;
