-- ---------------------------------------------------------------------------
-- FEAT-PD016 (A-NTF Cycle N-D) — notification preferences + the shared
-- suppression dispatcher. NTF-10, the area's last capability.
--
-- PREFERENCE HOME (board row ND-1, adjudicated 2026-07-26). Four document lines
-- disagreed: V3 section 6 said Platform Core (PC-2), Hub section L3 said PC-4,
-- and communication.md claimed DS-5 tables in one section while naming PC-2 in
-- another. Ruled DS-5 for both the table and the contract, because a preference
-- row must FK-enforce against notification_categories -- a DS-5-owned registry
-- -- and a Core-homed table points that FK Core -> Domain, which the platform
-- tier rule forbids ("creates circular dependencies in SQL functions that PG17
-- silently miscompiles"). Domain -> Core stays legal, so this table can still
-- consult Core for consent; the reverse cannot. CONSENT IS UNMOVED: PC-2
-- substrate, PC-4 contract, ADR-U034 + G-35. Preference is a different,
-- current-state grain (G-34) -- deliberately NOT the append-only ledger shape.
--
-- THE DIRECT-CALLER QUESTION (ADR-U038), answered per object below. Summary:
-- notification_channels is world-readable reference data with no client write
-- door; notification_preferences is own-rows-only for SELECT and has NO client
-- INSERT/UPDATE/DELETE policy at all, so the only write path is the gated
-- contract -- a direct PostgREST caller (including an anonymous-session Mist
-- holding `authenticated`) can read its own rows and write none. ds5_may_deliver
-- and every operator contract are REVOKEd from anon/authenticated.
--
-- Guarded tests (red pre-apply, 21 red-first / 3 labelled green):
--   hub/tests/integration/notifications/preference-and-dispatcher-contracts.test.ts
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. notification_channels -- an OPEN REGISTRY, not an enum.
--    Ferd non-closure (ADR-U008/U018 discipline): a new channel (push, when the
--    Gimbal's equipment frame gains it per ADR-U025) arrives as DATA, not DDL.
--    `delivers` is the honesty flag: V3 section 3 records lib/email/send.ts as
--    abstraction-realized / delivery-simulated with zero email vendor in
--    package.json, so email is STORED (preferences bind the day it ships) and
--    flagged non-delivering (no surface may promise what it cannot do).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.notification_channels (
  channel     TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  delivers    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- Reference-data posture (the notification_kinds / conversation_kinds precedent,
-- N-A / C-A): readable by authenticated, NO user-facing write policy --
-- service_role and migrations only. Direct-caller answer: a Mist can read the
-- channel list (harmless reference data: two rows naming delivery mechanisms)
-- and can write nothing.
DROP POLICY IF EXISTS "notification_channels_select" ON public.notification_channels;
CREATE POLICY "notification_channels_select"
  ON public.notification_channels FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.notification_channels (channel, label, delivers) VALUES
  ('in_app', 'In the Hub',  true),
  ('email',  'Email',       false)
ON CONFLICT (channel) DO NOTHING;

COMMENT ON TABLE public.notification_channels IS
  'Open registry of notification delivery channels (FEAT-PD016). `delivers` is false for a channel whose transport is not live yet -- email is abstraction-only in Ferd, so its preference is stored but no surface renders a toggle for it.';

-- ===========================================================================
-- 2. Two columns on notification_categories.
--
--    member_suppressible (board row ND-2) -- THE row that decided whether N-D
--    ships a feature or a dead page. All six seeded categories are
--    lawful_basis = 'transactional'. V3 section 7's checklist reads "member
--    preference can suppress this notification (unless its category is lawfully
--    compelled)"; if "transactional" were read as "compelled", every switch on
--    the preferences page would be inoperable. lawful_basis is a GDPR
--    PROCESSING-BASIS field and stays exactly as N-A wrote it (its CHECK is
--    untouched); suppressibility is a SEPARATE axis carried here. Re-labelling a
--    category to 'consent' to unlock a UI toggle would move a legal field for a
--    cosmetic reason -- explicitly rejected.
--
--    Seeded false for 'account' ONLY: those are the member's own participation
--    and access-state notices, and muting them harms the member. This column is
--    also the seat V3 section 5 Q6's lawfully-compelled breach-notice bypass
--    will use when its category exists.
--
--    nudge (board row ND-5) -- the general per-category nudge switch N-C cut as
--    gold-plating. Near-free here because this migration already opens the table
--    and N-D already builds the operator surface. Changes LOUDNESS, never reach.
-- ===========================================================================
ALTER TABLE public.notification_categories
  ADD COLUMN IF NOT EXISTS member_suppressible BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_categories
  ADD COLUMN IF NOT EXISTS nudge BOOLEAN NOT NULL DEFAULT true;

UPDATE public.notification_categories
   SET member_suppressible = false
 WHERE key = 'account';

COMMENT ON COLUMN public.notification_categories.member_suppressible IS
  'Whether a member may mute this category. A SEPARATE axis from lawful_basis (which is the GDPR processing basis): all Ferd categories are transactional, so reading lawful_basis as suppressibility would make every preference inoperable. False for account -- the member''s own access-state notices.';

COMMENT ON COLUMN public.notification_categories.nudge IS
  'Whether a delivered notification in this category also emits an ADR-U039 realtime hint. Operator-controlled; affects loudness only, never delivery.';

-- ===========================================================================
-- 3. notification_preferences -- current-state, own-rows-only.
--
--    ABSENCE MEANS ALLOWED. The table stores only DEPARTURES from default, so a
--    fresh member has zero rows and receives everything, and adding a category
--    later needs no per-member backfill. This is why it is not the append-only
--    consent-ledger shape (G-34's grain distinction): a mutable toggle does not
--    want an immutable history, and every read would otherwise be a
--    DISTINCT ON ... ORDER BY created_at DESC for no benefit.
--
--    recipient_group_id is a PERSONAL GROUP id -- the P-O1 repo actor primitive,
--    and the same column name public.notifications already uses.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  recipient_group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  category_key        TEXT NOT NULL REFERENCES public.notification_categories(key),
  channel             TEXT NOT NULL REFERENCES public.notification_channels(channel),
  allowed             BOOLEAN NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (recipient_group_id, category_key, channel)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Own-rows-only SELECT. Direct-caller answer: a PostgREST caller sees only rows
-- whose recipient_group_id is their own personal group, and there is
-- deliberately NO INSERT / UPDATE / DELETE policy -- the gated contract is the
-- only write door, so a Mist or a curious member cannot set a preference for
-- somebody else, nor mute a non-suppressible category by writing the row
-- directly (the dispatcher outranks a stored row anyway -- see section 4).
DROP POLICY IF EXISTS "notification_preferences_select_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select_own"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (recipient_group_id = (SELECT public.get_current_personal_group_id()));

COMMENT ON TABLE public.notification_preferences IS
  'Per-member x per-category x per-channel notification preferences (FEAT-PD016, DS-5-owned per the 2026-07-26 adjudication). Absence of a row means ALLOWED -- only departures from default are stored. Own-rows-only SELECT; no client write policy (the contract is the only door).';

-- ===========================================================================
-- 4. ds5_may_deliver -- THE single central decision point.
--
--    V3 section 6 levies "a shared notification dispatcher ... applies
--    preference/consent/suppression checks CENTRALLY", and section 5 names the
--    mechanism as "dispatcher-side preference enforcement (central, not
--    per-emitter)". This is that point.
--
--    IT FAILS OPEN -- and that is deliberately the OPPOSITE of N-C's
--    notify_notification_hint, which fails QUIET. The asymmetry is a decision,
--    not an inconsistency: N-C's failure mode was COST (a misconfiguration
--    producing a headcount-sized realtime burst), so suppressing on doubt was
--    right. Here the failure mode is a MISSED NOTIFICATION, which is strictly
--    worse than an unwanted one -- an unwanted notification is visible,
--    reportable and recoverable, while a swallowed one is invisible to the
--    member and leaves no trace. So an unknown kind, an unregistered channel, an
--    unreadable row, or a recipient that owns no preferences all resolve to
--    DELIVER.
--
--    Direct-caller answer: REVOKEd from PUBLIC/anon/authenticated. A client
--    cannot ask the dispatcher anything; it only ever runs inside the trigger.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ds5_may_deliver(
  p_recipient_group_id UUID,
  p_kind               TEXT,
  p_channel            TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_category_key   TEXT;
  v_suppressible   BOOLEAN;
  v_allowed        BOOLEAN;
BEGIN
  -- An unregistered kind has no category, so no preference can bind it.
  SELECT k.category_key, c.member_suppressible
    INTO v_category_key, v_suppressible
    FROM public.notification_kinds k
    JOIN public.notification_categories c ON c.key = k.category_key
   WHERE k.kind = p_kind;

  IF v_category_key IS NULL THEN
    RETURN true;                       -- fail open: unknown kind
  END IF;

  -- A lawfully-compelled / access-critical category always delivers, and
  -- outranks any stored row (including one written behind the contract's back).
  IF NOT COALESCE(v_suppressible, true) THEN
    RETURN true;
  END IF;

  SELECT p.allowed
    INTO v_allowed
    FROM public.notification_preferences p
   WHERE p.recipient_group_id = p_recipient_group_id
     AND p.category_key       = v_category_key
     AND p.channel            = p_channel;

  -- Absence means allowed; so does an unregistered channel (no row can exist
  -- for it, because the column is FK-enforced).
  RETURN COALESCE(v_allowed, true);
END;
$$;

REVOKE ALL ON FUNCTION public.ds5_may_deliver(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ds5_may_deliver(UUID, TEXT, TEXT) IS
  'The shared dispatcher''s single decision point (FEAT-PD016). FAILS OPEN on unknown kind / channel / recipient: a swallowed notification is invisible to the member, an unwanted one is recoverable. Deliberately opposite to notify_notification_hint''s fail-quiet, whose failure mode is cost rather than silence.';

-- ===========================================================================
-- 5. The dispatcher trigger -- BEFORE INSERT on public.notifications.
--
--    This is the NC-1 precedent applied to the write side. There are ~38
--    `INSERT INTO public.notifications` sites across 11 migrations, and delivery
--    triggers live on SOURCE tables -- so per-emitter enforcement would mean 38
--    edits and a standing invitation to forget the 39th. One row-level trigger
--    on the table itself catches every writer BY CONSTRUCTION, including the
--    PC-4-audited admin_send_notification, and every future contract inherits
--    suppression for free.
--
--    For the in-app channel the notification row IS the delivery, so suppression
--    means the row is never written -- which also means N-C's AFTER INSERT hint
--    trigger never fires, so a suppressed notification costs no realtime message
--    either. No second mechanism needed.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ds5_apply_notification_preference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.ds5_may_deliver(NEW.recipient_group_id, NEW.type, 'in_app') THEN
    RETURN NULL;                       -- suppressed: no row, and so no hint
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ds5_apply_notification_preference() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ds5_apply_notification_preference ON public.notifications;
CREATE TRIGGER trg_ds5_apply_notification_preference
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.ds5_apply_notification_preference();

-- ===========================================================================
-- 6. notify_notification_hint -- amended for the per-category nudge (ND-5).
--    Re-created in full (the append-only-migrations rule: this supersedes the
--    N-C body rather than editing 20260725120000). The platform-announcement
--    ds5_config branch is carried forward UNCHANGED, including its fail-quiet
--    posture and its comment.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.notify_notification_hint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid UUID;
  v_enabled  TEXT;
  v_nudge    BOOLEAN;
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

  -- N-D (ND-5): the operator's per-category nudge switch. Loudness only -- the
  -- row is already written by the time we get here, so delivery is never at
  -- stake. Fail-quiet like the policy below: an unreadable category suppresses
  -- the hint rather than risking a burst.
  SELECT c.nudge INTO v_nudge
  FROM public.notification_kinds k
  JOIN public.notification_categories c ON c.key = k.category_key
  WHERE k.kind = NEW.type;

  IF v_nudge IS DISTINCT FROM true THEN
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

-- ===========================================================================
-- 7. Member contracts -- own-subject, the IDN-7 CONTRACT idiom (not its storage).
--
--    WHY A NEW ACTOR HELPER. The existing ds5_require_fim_actor() raises 42501
--    for BOTH "no actor" and "Mist, not FIM". That is fine where 42501 is the
--    only refusal a contract can make, but set_own_notification_preference also
--    raises 42501 for "this category cannot be muted" -- and those two mean
--    different things to a caller: the Hub maps a policy refusal to 409 and an
--    identity refusal to 403 (the FEAT-PC006/PC007 route precedent). Collapsing
--    them would make the surface unable to tell the member which of the two
--    happened. So the identity refusal gets 28000 ("no active subject"), the
--    IDN-7 code for exactly this case, and 42501 stays the policy refusal.
--    Narrow helper, one purpose, no behaviour change to the existing one.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ds5_require_fim_subject()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me           UUID;
  v_is_temporary BOOLEAN;
BEGIN
  v_me := public.get_current_personal_group_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'no active subject' USING ERRCODE = '28000';
  END IF;

  SELECT u.is_temporary INTO v_is_temporary
    FROM public.users u WHERE u.auth_user_id = auth.uid();

  -- A Mist holds no durable address, so it can hold no durable preference.
  IF COALESCE(v_is_temporary, true) THEN
    RAISE EXCEPTION 'no active subject' USING ERRCODE = '28000';
  END IF;

  RETURN v_me;
END;
$$;

REVOKE ALL ON FUNCTION public.ds5_require_fim_subject() FROM PUBLIC, anon;

COMMENT ON FUNCTION public.ds5_require_fim_subject() IS
  'FEAT-PD016 actor primitive (P-O1 chain): the caller''s personal group, or 28000. Distinct from ds5_require_fim_actor() only in its SQLSTATE -- preference contracts need 42501 free for the "category cannot be muted" policy refusal, so the identity refusal uses 28000 (the IDN-7 code) and the surface can map the two to different HTTP statuses.';

-- The full categories x channels MATRIX with effective values resolved
-- server-side, so no surface has to know that absence means allowed. Every key
-- here is consumed by FEAT-H033 (the payload walk is recorded in the spec);
-- channel_delivers exists solely to tell the surface whether to render a column.
CREATE OR REPLACE FUNCTION public.get_own_notification_preferences()
RETURNS TABLE (
  category_key        TEXT,
  category_label      TEXT,
  interruption_grade  TEXT,
  member_suppressible BOOLEAN,
  channel             TEXT,
  channel_label       TEXT,
  channel_delivers    BOOLEAN,
  allowed             BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
BEGIN
  v_me := public.ds5_require_fim_subject();
  RETURN QUERY
  SELECT c.key,
         c.label,
         c.interruption_grade,
         c.member_suppressible,
         ch.channel,
         ch.label,
         ch.delivers,
         COALESCE(p.allowed, true)
    FROM public.notification_categories c
   CROSS JOIN public.notification_channels ch
    LEFT JOIN public.notification_preferences p
           ON p.recipient_group_id = v_me
          AND p.category_key       = c.key
          AND p.channel            = ch.channel
   ORDER BY c.key, ch.channel;
END;
$$;

-- Own-subject upsert. Typed refusals so the Hub can surface an honest message:
--   22023 unknown category or channel
--   42501 the category is not member_suppressible
--   28000 no FIM actor (a Mist holds no durable preferences)
--
-- Dropped first: `CREATE OR REPLACE` cannot change a function's return type
-- (42P13), so the migration would not be re-runnable without this.
DROP FUNCTION IF EXISTS public.set_own_notification_preference(TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.set_own_notification_preference(
  p_category_key TEXT,
  p_channel      TEXT,
  p_allowed      BOOLEAN
)
-- Returns jsonb rather than TABLE deliberately: plpgsql OUT parameters share the
-- namespace with column references, so `RETURNS TABLE (category_key ...)` makes
-- `ON CONFLICT (category_key, ...)` ambiguous (42702). jsonb keeps the payload
-- names the surface consumes without the collision, and matches the operator
-- contracts' shape below.
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me           UUID;
  v_suppressible BOOLEAN;
  v_row          public.notification_preferences;
BEGIN
  v_me := public.ds5_require_fim_subject();

  SELECT c.member_suppressible INTO v_suppressible
    FROM public.notification_categories c
   WHERE c.key = p_category_key;

  IF v_suppressible IS NULL THEN
    RAISE EXCEPTION 'unknown notification category: %', p_category_key
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.notification_channels ch WHERE ch.channel = p_channel) THEN
    RAISE EXCEPTION 'unknown notification channel: %', p_channel
      USING ERRCODE = '22023';
  END IF;

  -- Refused with a reason, never silently ignored. The dispatcher would outrank
  -- the row anyway, but storing it would tell the member a lie.
  IF NOT v_suppressible AND NOT p_allowed THEN
    RAISE EXCEPTION 'category % cannot be muted', p_category_key
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notification_preferences
    (recipient_group_id, category_key, channel, allowed, updated_at)
  VALUES (v_me, p_category_key, p_channel, p_allowed, now())
  ON CONFLICT (recipient_group_id, category_key, channel)
  DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'category_key', v_row.category_key,
    'channel',      v_row.channel,
    'allowed',      v_row.allowed,
    'updated_at',   v_row.updated_at
  );
END;
$$;

-- ADDITIVE export contract (right of access). Deliberately its OWN function
-- rather than a new key inside get_own_notifications_export(), which is a
-- shipped jsonb ARRAY composed into get_own_data_export() under `notifications`
-- -- reshaping it would have broken PC008's composite and FEAT-H010's download,
-- the exact sibling-breakage class TASK-INT-02 diagnosed three times.
CREATE OR REPLACE FUNCTION public.get_own_notification_preferences_export()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg UUID;
BEGIN
  SELECT u.personal_group_id INTO v_pg
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'no subject for caller' USING ERRCODE = '28000';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'category_key', p.category_key,
      'channel',      p.channel,
      'allowed',      p.allowed,
      'updated_at',   p.updated_at
    ) ORDER BY p.category_key, p.channel)
    FROM public.notification_preferences p
    WHERE p.recipient_group_id = v_pg
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_own_notification_preferences()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_notification_preference(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_notification_preferences_export()      TO authenticated;
REVOKE ALL ON FUNCTION public.get_own_notification_preferences()               FROM anon;
REVOKE ALL ON FUNCTION public.set_own_notification_preference(TEXT, TEXT, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.get_own_notification_preferences_export()        FROM anon;

-- ===========================================================================
-- 8. Operator contracts (board row ND-4 / ND-5) -- is_platform_admin()-gated.
--    is_platform_admin() rather than has_permission(): the minimal-body
--    SECURITY DEFINER helper, per the PG17 RLS complexity ceiling noted in the
--    platform tier gotchas.
--    ds5_config has RLS with NO policies, so these contracts are the only door.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_notification_nudge_policy()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform admin required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'config', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'key', c.key, 'value', c.value,
        'description', c.description, 'updated_at', c.updated_at
      ) ORDER BY c.key)
      FROM public.ds5_config c
    ), '[]'::jsonb),
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'key', c.key, 'label', c.label, 'nudge', c.nudge,
        'member_suppressible', c.member_suppressible
      ) ORDER BY c.key)
      FROM public.notification_categories c
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_notification_nudge_policy(
  p_key   TEXT,
  p_value TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform admin required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ds5_config c WHERE c.key = p_key) THEN
    RAISE EXCEPTION 'unknown policy key: %', p_key USING ERRCODE = '22023';
  END IF;

  UPDATE public.ds5_config
     SET value = p_value, updated_at = now()
   WHERE key = p_key;

  RETURN jsonb_build_object('key', p_key, 'value', p_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_notification_category_nudge(
  p_category_key TEXT,
  p_nudge        BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform admin required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notification_categories c WHERE c.key = p_category_key
  ) THEN
    RAISE EXCEPTION 'unknown notification category: %', p_category_key
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.notification_categories
     SET nudge = p_nudge
   WHERE key = p_category_key;

  RETURN jsonb_build_object('key', p_category_key, 'nudge', p_nudge);
END;
$$;

-- The number that turns board row ND-4's cost line from a warning into a
-- measurement. N-C measured 857 delivery rows against a reachable FIM
-- population of 1,274, and proved the send is billed PER RECIPIENT whether or
-- not anyone is listening -- so the dominant cost tracks headcount, not
-- concurrency, and "hardly anyone is online" is not a mitigation. Showing this
-- at the moment an operator flips the toggle is the cheapest guardrail there is.
CREATE OR REPLACE FUNCTION public.get_platform_announcement_reach()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform admin required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::int INTO v_count
    FROM public.users u
   WHERE u.auth_user_id IS NOT NULL
     AND COALESCE(u.is_temporary, false) = false
     AND COALESCE(u.is_active, true) = true;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_nudge_policy()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_nudge_policy(TEXT, TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_category_nudge(TEXT, BOOLEAN)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_announcement_reach()                   TO authenticated;
REVOKE ALL ON FUNCTION public.get_notification_nudge_policy()               FROM anon;
REVOKE ALL ON FUNCTION public.set_notification_nudge_policy(TEXT, TEXT)      FROM anon;
REVOKE ALL ON FUNCTION public.set_notification_category_nudge(TEXT, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.get_platform_announcement_reach()              FROM anon;
