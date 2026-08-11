-- COR-D W6 (Audit IV AC4-6 / ruling R-8) — the withdrawable invariant moves to
-- the consent ledger's write edge.
--
-- Schema change — schema-review gate: lands on a NAMED approval. Additive (one
-- trigger function + mount). Re-runnable (CREATE OR REPLACE + DROP/CREATE
-- TRIGGER).
--
-- R-8 PREMISE CORRECTION (recorded honestly): the approved recommendation was
-- "relocate set_journey_progress_sharing's direct consent_records INSERT to
-- record_consent_decision". Execution falsified it:
-- record_consent_decision(p_purpose, p_decision) carries NO capture-context
-- parameter and dedups per-(subject, purpose) — while the DS-3 writer records
-- PER-ENROLLMENT consent (its current-decision lookup filters on
-- capture_context->>'enrollment_id'; 20260803190000:1300-1321). Routing it
-- through the PC-4 contract would dedup across enrolments and drop the scoping
-- context: a behavior change, not a relocation. What R-8 actually wants — ONE
-- home for the RULE (the ADR-U038 sole-home discipline) — is delivered at the
-- only home every writer shares: the table's write edge. The withdrawable gate,
-- until now enforced solely inside record_consent_decision, becomes a
-- BEFORE INSERT trigger binding every consent writer, present and future.
-- Writers keep their own capture semantics; AC4-6's "second write home" stops
-- being a rule-bypass by construction.
--
-- SCOPE, deliberate: the trigger enforces ONLY the withdrawable gate.
--   - Catalog PRESENCE stays a writer-level concern: the W3 shape of
--     finalise_transcendence relies on the consent NOT NULL abort when the
--     catalog row is absent (its atomicity test exercises exactly that path);
--     a presence check here would shadow that contract with a different error.
--   - decision is NOT NULL DEFAULT 'granted' (20260629211504:45), so writers
--     that never name the column (finalise_transcendence) read 'granted' and
--     pass untouched.
--
-- SIBLING-ASSERTION SWEEP (RDC-03 tier rule): record_consent_decision's own
-- refusal cells pin the same rule at the contract tier and stay green (the
-- contract raises before any INSERT reaches this trigger). Grep found no
-- existing test performing a direct non-granted INSERT on a non-withdrawable
-- purpose — the new consent-write-edge suite adds both cells red-first.

CREATE OR REPLACE FUNCTION public.enforce_consent_withdrawable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_withdrawable boolean;
BEGIN
  SELECT withdrawable INTO v_withdrawable
    FROM public.consent_purposes
    WHERE key = NEW.purpose;

  IF FOUND AND v_withdrawable = false AND NEW.decision IS DISTINCT FROM 'granted' THEN
    RAISE EXCEPTION
      'consent purpose % is not withdrawable', NEW.purpose
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_consent_withdrawable() IS
  'COR-D W6 (Audit IV AC4-6 / R-8): the withdrawable gate at the consent ledger''s write edge — a non-''granted'' decision on a withdrawable=false purpose is refused (42501) for EVERY writer, so no writer contract is the rule''s sole home. Catalog presence is deliberately NOT checked here (writer-level concern; the transcendence NOT NULL abort path depends on it). decision defaults to ''granted'', so column-less writers pass untouched.';

DROP TRIGGER IF EXISTS enforce_consent_withdrawable ON public.consent_records;
CREATE TRIGGER enforce_consent_withdrawable
  BEFORE INSERT ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_consent_withdrawable();
