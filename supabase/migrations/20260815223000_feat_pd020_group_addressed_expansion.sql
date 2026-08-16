-- ============================================================================
-- FEAT-PD020 — group-addressed notification delivery: dead letters stop being
-- written, by construction
--
-- A notification addressed to an engagement group is a letter no one can ever
-- read: get_own_notifications serves the caller's personal-group rows only
-- (N-A 20260723120000; the RLS law 20260726120000:129-137), and the hint
-- resolver answers no-topic for a non-personal recipient
-- (20260726120000:272-276 — its own comment names this). Yet writers write
-- them: the announcement fan-out addresses direct members one level with no
-- personal-only filter (20260720200000:237-248), and the role/participation
-- family (20260801190000) addresses whatever group the event concerns. Live
-- evidence at the 2026-08-15 walk: 6 rows addressed to a member-group,
-- unseeable, growing silently.
--
-- BOARD (Stefan, 2026-08-15): expand at write time to the people who answer
-- for the group — act_as_group holders ∪ Stewards, ONE level, deduplicated,
-- the triggering actor excluded, Stewards as the floor so a group whose
-- customized Steward role lost the key still cannot accumulate dead letters.
--
-- MECHANISM — a BEFORE INSERT trigger on public.notifications, NOT per-writer
-- fixes: the writers span owners (announcements are DS-5; the role/
-- participation family is Core/PC021) and a DS-5 helper called from Core
-- would invert the one-way dependency. Writing INTO public.notifications is
-- the sanctioned every-layer emission pattern (ADR-U002); a row-level trigger
-- on the table catches every writer BY CONSTRUCTION, present and future —
-- the same argument the N-D dispatcher's header makes for suppression
-- (20260726120000:216-231). Precedent for the recipient set: FEAT-PD014's
-- acting_invitation fan-out to act_as_group holders at send time (ADR-U049).
--
-- ORDERING: BEFORE INSERT triggers fire alphabetically.
--   trg_ds5_aa_expand_group_addressed   < trg_ds5_apply_notification_preference
-- so a group-addressed row is expanded first and NEVER fed to a preference
-- read that has no user behind it. Expanded rows are ordinary personal rows:
-- they re-enter the chain, so per-recipient suppression (N-D) and the
-- AFTER-INSERT hint (N-C) apply exactly as if each person had been addressed
-- directly. Recursion is bounded by shape: expanded rows have personal
-- recipients, which this trigger passes through untouched.
--
-- CONFORMANCE: ds5_expand_group_addressed_notification registers under DS-5
-- in supabase/ownership.manifest.json, and the mount carries a GC-8 license
-- in exceptions.triggerMounts (cross-owner: DS-5 function on the
-- vertical:notifications table — the N-D suppression mount's exact precedent,
-- ADR-U048 Amendment 1). Both edits ride this PR.
--
-- Sibling-assertion sweep (grepped 2026-08-15, per the tier rule):
--   - actionable-notifications "group-addressed invitation_received orphan is
--     NOT emitted" (count 0 on the group) — REINFORCED, not invalidated: the
--     writer already stopped at PD014; this trigger makes the assertion true
--     by construction for every writer.
--   - mist-posture GB-1 PAIR ("a real group assignment still notifies") —
--     both halves target PERSONAL groups; pass-through, unaffected.
--   - realtime-hint platform-announcement cells (7 hints / 7 recipients) —
--     personal recipients; unaffected.
--   - announcement-contracts / invitation suites — no cell pins a row landing
--     ON an engagement group (nobody asserted the dead letters).
--   FOUND BY THE POST-APPLY SLICE RUN, adapted (labelled) — the grep sweep
--   missed both because neither asserts on recipient rows:
--   - realtime-hint-and-policy "an unresolvable one does not [hint], and its
--     insert still succeeds" used an ENGAGEMENT-group recipient as its
--     unresolvable shape — exactly the dead letter this migration retires
--     (the insert now expands; PGRST116 on the returning read). Adapted to a
--     SYSTEM-group recipient, which passes the trigger and still no-hints.
--   - preference-and-dispatcher-contracts ran on jest's 30s default timeout
--     while every sibling sets 180s — the PR #543 rate-limit backoff can hold
--     one call past 30s, surfacing as a timeout wearing a genuine-failure
--     face. Timeout aligned to the sibling standard.
--   Red-first cells: tests/integration/notifications/group-addressed-expansion.test.ts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The expansion trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_expand_group_addressed_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_steward_template_id uuid;
BEGIN
  -- Personal and system recipients pass through untouched — the shape guard
  -- that both bounds recursion and keeps every existing personal writer
  -- (PD014's acting fan-out included) byte-identical.
  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = NEW.recipient_group_id AND g.group_type = 'engagement'
  ) THEN
    RETURN NEW;
  END IF;

  -- The triggering actor, excluded from the expansion (you don't hear about
  -- your own act twice). NULL-safe: service-role and pg_cron writers have no
  -- session actor and exclude no one.
  v_actor := public.get_current_personal_group_id();

  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  -- The answerers: active personal members of the recipient group holding
  -- act_as_group there (ADR-U041's key), ∪ Steward-role holders (the floor —
  -- the Steward template carries the key by default, so this limb exists for
  -- the customized-template case). DISTINCT dedupes a Steward who also holds
  -- a custom key. Each inserted row re-enters this chain as a personal row:
  -- the N-D dispatcher suppresses per recipient, the N-C hint fires per
  -- surviving row.
  INSERT INTO public.notifications
    (recipient_group_id, type, title, body, payload, group_id,
     action_type, action_data, expires_at)
  SELECT DISTINCT u.personal_group_id, NEW.type, NEW.title, NEW.body,
         NEW.payload, NEW.group_id, NEW.action_type, NEW.action_data,
         NEW.expires_at
  FROM public.group_memberships gm
  JOIN public.users u ON u.personal_group_id = gm.member_group_id
  WHERE gm.group_id = NEW.recipient_group_id
    AND gm.status = 'active'
    AND u.is_temporary = false
    AND u.is_active = true
    AND u.personal_group_id IS DISTINCT FROM v_actor
    AND (
      public.has_permission(u.personal_group_id, NEW.recipient_group_id, 'act_as_group')
      OR EXISTS (
        SELECT 1
        FROM public.user_group_roles ugr
        JOIN public.group_roles gr ON gr.id = ugr.group_role_id
        WHERE ugr.member_group_id = u.personal_group_id
          AND ugr.group_id = NEW.recipient_group_id
          AND (gr.created_from_role_template_id = v_steward_template_id
               OR gr.name = 'Steward')
      )
    );

  RETURN NULL;  -- the group-addressed row itself is never written
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_expand_group_addressed_notification() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ds5_expand_group_addressed_notification() IS
  'FEAT-PD020: BEFORE INSERT expansion on the delivery substrate — an engagement-group recipient becomes its answerers (act_as_group holders + Stewards, one level, deduplicated, actor excluded) so dead letters stop being written by construction, for every writer present and future. Personal/system recipients pass through byte-identical. SECURITY DEFINER: reads memberships/roles across RLS at the write edge. GC-8-licensed mount (ADR-U048 Amendment 1 precedent).';

DROP TRIGGER IF EXISTS trg_ds5_aa_expand_group_addressed ON public.notifications;
CREATE TRIGGER trg_ds5_aa_expand_group_addressed
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.ds5_expand_group_addressed_notification();

-- ----------------------------------------------------------------------------
-- 2. The disposition — the class closed retroactively (STORY-3)
-- ----------------------------------------------------------------------------
-- Re-address every stranded group-addressed row to its expansion set as of
-- now, created_at preserved (late is honest; unseeable is not), then delete
-- the originals. Dev carries 0 such rows (probed 2026-08-15); the 6 live prod
-- rows are the real work — the NOTICE counts are the gate's verification at
-- prod apply. The INSERT's personal rows re-enter the trigger chain, so
-- per-recipient preferences and hints apply to the re-delivery too.
DO $$
DECLARE
  v_dead integer;
  v_expanded integer;
  v_steward_template_id uuid;
BEGIN
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  SELECT count(*) INTO v_dead
  FROM public.notifications n
  JOIN public.groups g ON g.id = n.recipient_group_id
  WHERE g.group_type = 'engagement';

  WITH dead AS (
    SELECT n.*
    FROM public.notifications n
    JOIN public.groups g ON g.id = n.recipient_group_id
    WHERE g.group_type = 'engagement'
  )
  INSERT INTO public.notifications
    (recipient_group_id, type, title, body, payload, group_id,
     action_type, action_data, expires_at, created_at)
  SELECT DISTINCT u.personal_group_id, d.type, d.title, d.body, d.payload,
         d.group_id, d.action_type, d.action_data, d.expires_at, d.created_at
  FROM dead d
  JOIN public.group_memberships gm
    ON gm.group_id = d.recipient_group_id AND gm.status = 'active'
  JOIN public.users u
    ON u.personal_group_id = gm.member_group_id
   AND u.is_temporary = false
   AND u.is_active = true
  WHERE public.has_permission(u.personal_group_id, d.recipient_group_id, 'act_as_group')
     OR EXISTS (
       SELECT 1
       FROM public.user_group_roles ugr
       JOIN public.group_roles gr ON gr.id = ugr.group_role_id
       WHERE ugr.member_group_id = u.personal_group_id
         AND ugr.group_id = d.recipient_group_id
         AND (gr.created_from_role_template_id = v_steward_template_id
              OR gr.name = 'Steward')
     );
  GET DIAGNOSTICS v_expanded = ROW_COUNT;

  DELETE FROM public.notifications n
  USING public.groups g
  WHERE g.id = n.recipient_group_id AND g.group_type = 'engagement';

  RAISE NOTICE 'FEAT-PD020 disposition: % dead letters re-addressed into % personal rows, originals deleted',
    v_dead, v_expanded;
END $$;
