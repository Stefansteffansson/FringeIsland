-- FEAT-PC002 (IDN-2) — append-only consent substrate, STORY-5 (ADR-U034).
-- The durable, GDPR-auditable, multi-purpose-ready record of consent. PC-2 owns
-- the table; the Privacy vertical levies obligations; PC-4 consumes. IDN-2 captures
-- only the `transcendence` purpose, but the shape is open so future purposes are
-- data, not schema change.
--
-- Schema change — schema-review gate: lands at task status `review`, not `done`.
-- Additive (new table + RLS + trigger). Re-runnable.
--
-- Shape (ADR-U034): one row per consent event — subject (FIM, via the repo actor
-- chain: users.id + personal_group_id, ADR-U006/U007), open purpose identifier
-- (text, NOT a sealed enum), policy version, capture context, timestamp.
--
-- Append-only + retention (ADR-U034 §2/§5):
--   * INSERT only for clients — no UPDATE/DELETE outside the controlled erasure
--     path (a withdrawal is a NEW appended row, a later Privacy feature).
--   * Enforced by the enforce_consent_append_only trigger, which raises 42501 on
--     UPDATE/DELETE unless `app.consent_erasure_in_progress` = 'true' (set by the
--     FEAT-PC002 account-erasure path, TASK-05, and by controlled test teardown).
--   * FKs are ON DELETE RESTRICT, not CASCADE: a consented FIM cannot be
--     hard-deleted out from under its consent proof — account erasure must go
--     through the controlled anonymise-then-retain path (right-to-erasure vs. the
--     duty to retain proof-of-consent). The reaper never reaches here — it reaps
--     only pre-transcendence Mists, which hold no consent rows.
--
-- RLS (new table → RLS without exception): the subject reads only its own consent
-- rows, keyed by the actor chain (personal group). No client INSERT/UPDATE/DELETE
-- — those go through SECURITY DEFINER paths (transcendence finalisation, erasure)
-- and service_role; both bypass RLS.

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  subject_group_id uuid REFERENCES public.groups(id) ON DELETE RESTRICT,
  purpose text NOT NULL,            -- open identifier (e.g. 'transcendence'); never a sealed enum
  policy_version text NOT NULL,
  capture_context jsonb,            -- which surface/path captured it
  captured_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consent_records IS
  'FEAT-PC002/ADR-U034: append-only consent records. Subject = FIM via the actor chain (subject_group_id = personal group). Open purpose (text). Append-only (enforce_consent_append_only); FKs RESTRICT (retention). RLS: subject reads own.';

CREATE INDEX IF NOT EXISTS consent_records_subject_group_idx
  ON public.consent_records (subject_group_id);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- SELECT: the subject reads only its own consent rows (actor chain = personal group).
CREATE POLICY consent_records_select_own
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (subject_group_id = public.get_current_personal_group_id());

-- No INSERT/UPDATE/DELETE policies: consent is written only by the SECURITY DEFINER
-- transcendence finalisation (TASK-04) and mutated only by the controlled erasure
-- path (TASK-05) — both bypass RLS as definer/owner; service_role bypasses too.

-- Append-only enforcement. Raises 42501 on UPDATE/DELETE unless the controlled
-- erasure path has set app.consent_erasure_in_progress for the transaction.
CREATE OR REPLACE FUNCTION public.enforce_consent_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.consent_erasure_in_progress', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);  -- controlled erasure / anonymise path
  END IF;
  RAISE EXCEPTION
    'consent_records is append-only: % is not permitted outside the controlled erasure path', TG_OP
    USING ERRCODE = '42501';
END;
$$;

COMMENT ON FUNCTION public.enforce_consent_append_only() IS
  'FEAT-PC002/ADR-U034: append-only guard for consent_records. Blocks UPDATE/DELETE (42501) unless app.consent_erasure_in_progress is set by the controlled erasure path.';

DROP TRIGGER IF EXISTS enforce_consent_append_only ON public.consent_records;
CREATE TRIGGER enforce_consent_append_only
  BEFORE UPDATE OR DELETE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_consent_append_only();
