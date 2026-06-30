-- ============================================================
-- FEAT-PC006 — granular-consent substrate + member consent read  [IDN-6]
-- ============================================================
-- The platform half of IDN-6: the FIM's own EFFECTIVE consent state (current
-- decision per purpose) + full append-only HISTORY, consumed API-first by the
-- Hub (FEAT-H008) at GET /api/account/consent. PC-4 Governance owns the consent
-- contract + the purpose catalog; the underlying consent_records table is the
-- PC-2-owned ledger from FEAT-PC002 / ADR-U034.
--
-- Three additive pieces (ADR-U034 amendment — see the ADR's amendment note):
--   1. a `decision` column on public.consent_records (the grant/withdraw
--      dimension ADR-U034 §2 deferred to "a later Privacy feature");
--   2. a public.consent_purposes catalog (label / withdrawability / current
--      policy version per purpose — data, never a sealed enum);
--   3. get_own_consent_state(), a SECURITY DEFINER own-row read over the join.
--
-- Schema change — schema-review gate: lands at task status `review`, not `done`.
-- Additive only (one column with default backfill, one RLS-protected table +
-- seed, one read function). No existing column, RLS policy, or trigger changes;
-- the append-only guarantee (enforce_consent_append_only) is untouched.
-- Re-runnable.
--
-- WHY SECURITY DEFINER (privilege-escalation surface — documented per
-- docs/platform/CLAUDE.md "SECURITY DEFINER discipline"):
--   consent_records' only SELECT policy is `consent_records_select_own`
--   (`subject_group_id = get_current_personal_group_id()`), and there is no
--   member-facing contract over it. get_own_consent_state() runs as the definer
--   to PROJECT the caller's own consent across the catalog join (latest-per-
--   purpose + drift + history). Its elevation is bounded to exactly the caller's
--   OWN rows: it resolves the subject via get_current_personal_group_id()
--   (auth.uid()-pinned) and takes NO target parameter, so it can never read
--   another subject's consent. It does NOT relax consent_records_select_own —
--   every other surface still reads only its own rows. Read-only: it never
--   appends (recording a decision is FEAT-PC007).
-- ============================================================

-- ------------------------------------------------------------
-- 1. decision dimension on the existing PC-2 ledger.
--    Open text + DEFAULT 'granted' (never a sealed enum / CHECK set — the
--    catalog's `withdrawable` flag, not the column type, carries policy).
--    Existing rows (transcendence captures) backfill to 'granted' via the
--    default — they were all positive captures.
-- ------------------------------------------------------------
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS decision text NOT NULL DEFAULT 'granted';

COMMENT ON COLUMN public.consent_records.decision IS
  'FEAT-PC006/ADR-U034 amendment: grant/withdraw dimension. Open text (e.g. '
  '''granted'' / ''withdrawn''), never a sealed enum — a withdrawal is a NEW '
  'appended row (ADR-U034 §2), never an UPDATE. Backfilled ''granted'' for the '
  'transcendence captures that predate this column.';

-- ------------------------------------------------------------
-- 2. consent_purposes — the governance-owned purpose catalog.
--    key joins consent_records.purpose (open identifier). label/description are
--    the member-facing copy; withdrawable carries the policy gate; current_
--    policy_version drives re-consent drift. New purposes are ROWS, not
--    migrations (extensibility, ADR-U034 open-purpose intent).
--    New table -> RLS WITHOUT EXCEPTION.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_purposes (
  key text PRIMARY KEY,                       -- joins consent_records.purpose
  label text NOT NULL,                        -- member-facing name
  description text,                           -- member-facing explanation
  withdrawable boolean NOT NULL,              -- the policy gate (FEAT-PC007)
  current_policy_version text NOT NULL,       -- drives needs_reconsent drift
  sort_order int NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.consent_purposes IS
  'FEAT-PC006/ADR-U034 amendment: PC-4 Governance catalog of consent purposes. '
  'key joins consent_records.purpose. withdrawable is the policy gate enforced '
  'by FEAT-PC007; current_policy_version drives re-consent drift. Data, not a '
  'sealed enum — new purposes are rows. RLS: any authenticated member reads the '
  'catalog; no client write (governance-managed via seed / service_role).';

ALTER TABLE public.consent_purposes ENABLE ROW LEVEL SECURITY;

-- SELECT: every authenticated member may read the catalog to render their
-- granular options. No INSERT/UPDATE/DELETE policy — the catalog is governance
-- reference data, written only by migrations / service_role (both bypass RLS).
CREATE POLICY consent_purposes_select_all
  ON public.consent_purposes
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed (decompose decisions #3): the foundational transcendence purpose
-- (non-withdrawable) + one optional, withdrawable purpose so IDN-7 has a real
-- toggleable target. current_policy_version 'v1' matches the live
-- TRANSCENDENCE_POLICY_VERSION, so existing transcendence captures read
-- needs_reconsent = false. `product_analytics` is SEED DATA, not canon — its
-- member-facing label is freely changeable.
INSERT INTO public.consent_purposes (key, label, description, withdrawable, current_policy_version, sort_order)
VALUES
  ('transcendence',
   'Becoming a member',
   'The foundational agreement you made when you became a member of FringeIsland. This is required to keep your account, so it cannot be withdrawn here.',
   false, 'v1', 0),
  ('product_analytics',
   'Product analytics',
   'Optional. Let us use your usage of FringeIsland to understand what works and improve the experience. You can grant or withdraw this at any time.',
   true, 'v1', 10)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 3. get_own_consent_state() — own-row read of effective state + history.
--    effective: one entry per CATALOGUED purpose (LEFT JOIN to the latest
--    decision per purpose) so an undecided optional purpose still appears
--    (decision = null) for the Surface to offer opt-in.
--    history: every row for the subject, newest first (the GDPR proof surface).
--    Subject = the caller's personal group (the consent_records_select_own key).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_own_consent_state()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH subject AS (
    SELECT public.get_current_personal_group_id() AS group_id
  ),
  latest AS (
    SELECT DISTINCT ON (cr.purpose)
      cr.purpose, cr.decision, cr.policy_version, cr.captured_at
    FROM public.consent_records cr, subject s
    WHERE cr.subject_group_id = s.group_id
    ORDER BY cr.purpose, cr.captured_at DESC
  )
  SELECT jsonb_build_object(
    'effective', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'purpose', cp.key,
          'label', cp.label,
          'description', cp.description,
          'decision', l.decision,
          'policy_version', l.policy_version,
          'decided_at', l.captured_at,
          'withdrawable', cp.withdrawable,
          'current_policy_version', cp.current_policy_version,
          'needs_reconsent',
            COALESCE(l.decision = 'granted'
                     AND l.policy_version IS DISTINCT FROM cp.current_policy_version,
                     false)
        )
        ORDER BY cp.sort_order, cp.key
      )
      FROM public.consent_purposes cp
      LEFT JOIN latest l ON l.purpose = cp.key
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'purpose', cr.purpose,
          'decision', cr.decision,
          'policy_version', cr.policy_version,
          'captured_at', cr.captured_at,
          'capture_context', cr.capture_context
        )
        ORDER BY cr.captured_at DESC
      )
      FROM public.consent_records cr, subject s
      WHERE cr.subject_group_id = s.group_id
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.get_own_consent_state() IS
  'FEAT-PC006 / IDN-6: SECURITY DEFINER own-row read of the caller''s consent. '
  'Returns jsonb { effective: latest-decision-per-catalogued-purpose (with '
  'label/withdrawable/current_policy_version/needs_reconsent drift), history: '
  'full append-only ledger newest-first }. Subject pinned to the caller''s '
  'personal group via get_current_personal_group_id(); no target parameter, '
  'never reads another subject. Read-only.';

-- authenticated: real + anonymous (Mist) sessions. service_role: server/admin.
-- NOT granted to anon (no-JWT) — the route gates sessionless callers with a 401
-- before the function is reached. Mirrors get_own_account_state()'s grant posture.
GRANT EXECUTE ON FUNCTION public.get_own_consent_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_consent_state() TO service_role;
