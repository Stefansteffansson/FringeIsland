-- ============================================================================
-- FEAT-PD015 — Notification realtime hint, nudge policy & reconnect (A-NTF N-C)
--
-- Realizes: NTF-9's platform half. The ADR-U039 live-delivery layer for the
-- bell — the last fetch-only surface on the platform. Sessions (PC009) and
-- conversations/forum (C-C, PD010) already ping; notifications did not.
--
-- WHAT THIS DELIBERATELY DOES NOT BUILD: no emit helper (ds5_emit_hint already
-- exists from C-C and is reused UNCHANGED — the one-shared-thin-helper ruling,
-- 20260720153000:44), no new read contract (get_own_notifications and
-- get_own_unread_notification_count already suffice for reconnect
-- reconciliation; that is a CLIENT behaviour re-reading them at the right
-- moments, per ADR-U039:25), and no general per-category nudge switch or admin
-- UI (N-D owns category/channel suppression per board NB-5).
--
-- FOUR CHANGES:
--   1. public.ds5_config — key/value operational settings for DS-5, mirroring
--      pc2_config. RLS enabled with ZERO policies (deny-all): the blanket
--      schema grants to anon/authenticated are inert under RLS, and only
--      SECURITY DEFINER functions read it. Seeded with the nudge policy.
--   2. notify_notification_hint() + AFTER INSERT trigger on public.notifications
--      — ONE emit site. There was no trigger on this table, and
--      `INSERT INTO public.notifications` appears at ~38 sites across 11
--      migrations, with delivery triggers living on SOURCE tables. One trigger
--      catches every writer — legacy, current, and unwritten — by construction.
--   3. ds5_notifications_receive_own on realtime.messages — the fourth receive
--      policy, in the 20260704075549 initplan-wrapped form. NO send policy.
--   4. NB-7 override executed: notifications leaves supabase_realtime, which
--      ends EMPTY. Replace-then-remove — the broadcast hint is established in
--      this same migration, so the capability is never absent.
--
-- WHY SECURITY DEFINER (the elevation is required, and here is why):
--   ds5_emit_hint INSERTs into realtime.messages, which is revoked from
--   PUBLIC/anon/authenticated (20260720153000:111) — a caller-privileged
--   trigger could not emit. The function also reads public.users to resolve the
--   recipient's auth uid across a row the caller may not select. Body is small
--   and single-purpose; search_path is pinned to '' against injection.
--
-- DIRECT-CALLER QUESTION (ADR-U038): what can a direct PostgREST caller —
-- including an anonymous-session Mist holding `authenticated` — do here?
--   * ds5_config: RLS deny-all, so SELECT returns nothing and writes are
--     refused. A client cannot turn a headcount-sized hint burst back on.
--     Asserted adversarially for both a FIM and a Mist.
--   * notify_notification_hint: trigger-typed, so PostgREST cannot invoke it.
--   * ds5_emit_hint: already revoked from anon/authenticated (unchanged here).
--   * realtime.messages: SELECT-only, own-topic-only, no INSERT/ALL policy
--     exists for any role — signals stay server-originated.
--
-- FAN-OUT BUDGET (ADR-U039:46 requires this area to carry it, MEASURED not
-- assumed): a hint costs one realtime message per recipient. On the live dev DB
-- the largest single announcement send produced 857 delivery rows to 857
-- recipients (community-scoped); the reachable FIM population is 1,274, which is
-- what a platform-wide send hits. Against the plan allowance (2M/month free,
-- 5M Pro) ordinary one-to-one activity is negligible; the ONLY path that scales
-- with headcount rather than activity is the platform-wide announcement. That
-- path is therefore suppressed by default and governed by a data toggle
-- (Stefan's call, 2026-07-25). Row-level vs statement-level trigger granularity
-- is NOT the lever: each recipient needs their own private topic, so both emit
-- the same message count.
--
-- WRITE-PATH COST: ordinary notifications pay ONE indexed lookup
-- (users.personal_group_id -> auth_user_id) and nothing else — the config read
-- is inside the platform-announcement branch, so it is not paid per row on the
-- common path. A platform announcement inserting ~1,274 rows must not become
-- N table scans; TASK-NC-03 verifies this rather than trusting it.
--
-- NON-FATAL BY CONSTRUCTION: ds5_emit_hint already swallows its own failures,
-- and this function raises nothing on the emit path. A realtime failure can
-- never roll back the durable notification row — inverting that would break
-- ADR-U039:25 ("durable state first, push second"), the guarantee that makes a
-- dropped hint cost latency and never data.
--
-- Conformance lockstep (same PR, test-side): DS_TABLES += ds5_config;
-- `notifications` STAYS OUT of DS_TABLES (ADR-U048 — the delivery substrate is
-- the vertical's, not DS-5's).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DS-5 operational config — the pc2_config pattern
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ds5_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled, deliberately NO policies: deny-all to anon/authenticated.
-- Only SECURITY DEFINER functions (which bypass RLS) read this table. Ferd has
-- no client reader; the operator surface arrives with N-D's preferences work.
ALTER TABLE public.ds5_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ds5_config IS
  'DS-5 operational settings, changeable as data without a deploy (the pc2_config pattern). RLS-enabled with no policies: deny-all to clients, read by SECURITY DEFINER paths only.';

INSERT INTO public.ds5_config (key, value, description) VALUES
  ('realtime_hint_platform_announcements', 'false',
   'Whether a platform-wide announcement emits per-recipient ADR-U039 hints. Default false: a platform send reaches every FIM, so hints would scale with headcount rather than activity, and nobody waits on a platform announcement (N-C; the ADR-U039:46 fan-out budget). Community-scoped announcements always hint. Set to ''true'' to enable; changeable without altering notify_notification_hint().')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. The one emit site — AFTER INSERT on the delivery substrate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_notification_hint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid UUID;
  v_enabled  TEXT;
BEGIN
  -- Resolve the recipient to a FIM auth uid. A group-addressed row (an
  -- engagement group) or a Mist resolves to NULL -> no topic -> no hint. The
  -- insert still succeeds; delivery is durable regardless of the hint.
  SELECT u.auth_user_id INTO v_auth_uid
  FROM public.users u
  WHERE u.personal_group_id = NEW.recipient_group_id;

  IF v_auth_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- The one suppressed path: a platform-wide announcement. Checked BEFORE the
  -- config read so ordinary notifications never pay for it.
  IF NEW.type = 'announcement'
     AND NEW.payload->>'scope_kind' = 'platform' THEN
    SELECT c.value INTO v_enabled
    FROM public.ds5_config c
    WHERE c.key = 'realtime_hint_platform_announcements';

    -- Fail-quiet: absent row, NULL, or any value other than 'true' suppresses.
    -- An unreadable policy must never produce a headcount-sized burst.
    IF v_enabled IS DISTINCT FROM 'true' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ADR-U039:24 — the payload carries the row id and nothing else. No title,
  -- no body, no kind. The client verifies through its authorized read; a
  -- spoofed or misdelivered hint is harmless by construction.
  PERFORM public.ds5_emit_hint(
    jsonb_build_object('id', NEW.id),
    'notification',
    'account:' || v_auth_uid::text || ':notifications'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_notification_hint() IS
  'FEAT-PD015 (N-C): emits the ADR-U039 content-free hint on account:<auth_uid>:notifications after any notification insert. ONE emit site for all ~38 writers, legacy and future. Non-fatal (ds5_emit_hint swallows; nothing raised here) so a realtime failure never rolls back the durable row. Platform-wide announcements suppressed per ds5_config.realtime_hint_platform_announcements.';

REVOKE ALL ON FUNCTION public.notify_notification_hint() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_notification_hint ON public.notifications;
CREATE TRIGGER trg_notify_notification_hint
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_notification_hint();

-- ----------------------------------------------------------------------------
-- 3. The fourth receive policy — own notification topic only, no send
-- ----------------------------------------------------------------------------
-- Initplan-wrapped form per 20260704075549:39-45, NOT the original
-- 20260703154102 shape: (select realtime.topic()) / (select auth.uid()) keep
-- the policy from re-evaluating per row.
DROP POLICY IF EXISTS "ds5_notifications_receive_own" ON realtime.messages;
CREATE POLICY "ds5_notifications_receive_own" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND (select realtime.topic()) = ('account:' || (select auth.uid()::text) || ':notifications')
  );

-- No send policy is created on this or any topic. Clients never broadcast; the
-- sender of record is the platform (ADR-U039:23).

-- ----------------------------------------------------------------------------
-- 4. NB-7 — drop the legacy postgres_changes publication membership
-- ----------------------------------------------------------------------------
-- ADR-U039:31 kept public.notifications in supabase_realtime "for the legacy
-- app, until Phase-4 cutover". That rationale is void: nobody runs v1, and the
-- oracle is not websocket-tested. C-A already removed conversations, messages,
-- and direct_messages (20260719230500:180-189); notifications is the last
-- member, so this empties the publication. Replace-then-remove: the broadcast
-- hint above ships in the same migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
END $$;
