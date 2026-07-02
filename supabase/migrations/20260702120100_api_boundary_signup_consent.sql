-- ADR-U038 tranche 1 (S3) — credentialed FIM creation is consent-gated and durably
-- records consent, enforced at the substrate (not only in the Hub sign-up route).
--
-- The audit found (S3) that the FEAT-H002 consent gate lived ONLY in the Hub route:
--   (a) a direct GoTrue auth.signUp with the public anon key created a FIM with no
--       consent enforcement at all; and
--   (b) even Hub-created FIMs held no consent row in the now-shipped ledger (IDN-6/7) —
--       their catalogued purposes read "undecided". A deferred FEAT-H002 No-go became
--       load-bearing once the consent ledger shipped.
--
-- Fix: move the gate + the durable record into handle_new_user (PC-2 Identity, the one
-- trigger every account-creation path funnels through — SDK signUp, admin.createUser,
-- and any direct GoTrue call). A credentialed FIM (NOT is_anonymous) must arrive with
-- consent_accepted = 'true' in raw_user_meta_data or creation is refused (the trigger
-- raises → the auth.users insert rolls back → no account = fail-closed). On success the
-- trigger appends one `transcendence` consent row (the foundational membership
-- agreement, consent_purposes.key = 'transcendence'), policy_version stamped SERVER-SIDE
-- from the catalog, capture_context.flow = 'credentialed-signup'.
--
-- A Mist (is_anonymous = true) is NOT gated and records NO consent — a Mist gives no
-- consent; consent is captured later at transcendence by finalise_transcendence(). The
-- two FIM entry points (credentialed signup here / Mist transcendence there) each record
-- the same purpose exactly once; a user takes only one path, so there is no double count.
--
-- Blast radius (ADR-U016 cascade): handle_new_user is Platform Core (PC-2). Consumers:
--   * Hub sign-up route → lib/auth/signup.ts now passes consent_accepted (updated).
--   * Test helper createTestUser → passes consent_accepted; cleanupTestUser clears the
--     consent row (FK ON DELETE RESTRICT) via the controlled-erasure bypass (updated).
-- No other account-creation path exists in code.
--
-- Schema change (redefines a Core SECURITY DEFINER trigger) — schema-review gate +
-- platform/core carve-out: lands at status `review`, pauses for the merge nod.
-- CREATE OR REPLACE — re-runnable. Additive behaviour; no column/table change.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id UUID;
  v_personal_group_id UUID;
  v_fi_members_group_id UUID;
  v_fi_member_role_id UUID;
  v_myself_role_id UUID;
  v_avatar_url TEXT;
  v_full_name TEXT;
  v_nickname TEXT;
  v_pending RECORD;
  v_is_temporary BOOLEAN := COALESCE(NEW.is_anonymous, false);  -- [MIST] FEAT-PC001
  v_policy_version TEXT;                                        -- [ADR-U038 S3]
BEGIN
  -- [ADR-U038 S3] Consent gate — a credentialed FIM must arrive consented, or no
  -- account is created (fail-closed; the raise rolls back the auth.users insert).
  -- Mists (is_anonymous) are exempt: consent is captured later at transcendence.
  IF NOT v_is_temporary
     AND COALESCE(NEW.raw_user_meta_data->>'consent_accepted', '') <> 'true' THEN
    RAISE EXCEPTION 'Consent is required to create a credentialed account'
      USING ERRCODE = '23514';
  END IF;

  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  -- [MIST] FEAT-PC001 — a Mist has no display_name and no email; fall back to 'Mist'.
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'Mist');
  -- [DISPLAY NAME] Extract first word as nickname
  v_nickname := split_part(v_full_name, ' ', 1);

  -- Step 1: Create user profile (personal_group_id = NULL initially)
  -- [MIST] FEAT-PC001 — is_temporary single-sourced from auth.users.is_anonymous.
  INSERT INTO public.users (auth_user_id, email, full_name, avatar_url, nickname, is_temporary)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    v_nickname,
    v_is_temporary
  )
  RETURNING id INTO v_user_id;

  -- Step 2: Create personal group (proto group for a Mist; created_by_group_id = NULL — bootstrap)
  INSERT INTO public.groups (name, group_type, is_public, show_member_list, avatar_url)
  VALUES (
    v_nickname,
    'personal',
    false,
    false,
    v_avatar_url
  )
  RETURNING id INTO v_personal_group_id;

  -- Step 3: Break circular dependency — link user <-> personal group
  UPDATE public.users SET personal_group_id = v_personal_group_id WHERE id = v_user_id;
  UPDATE public.groups SET created_by_group_id = v_personal_group_id WHERE id = v_personal_group_id;

  -- Step 4: Self-membership — personal group is a member of itself
  INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
  VALUES (v_personal_group_id, v_personal_group_id, v_personal_group_id, 'active');

  -- Step 5: Create "Myself" role in the personal group (zero permissions)
  INSERT INTO public.group_roles (group_id, name)
  VALUES (v_personal_group_id, 'Myself')
  RETURNING id INTO v_myself_role_id;

  -- Step 6: Assign "Myself" role to the personal group
  INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  VALUES (v_personal_group_id, v_personal_group_id, v_myself_role_id, v_personal_group_id);

  -- Step 7: Enroll personal group in FringeIsland Members system group
  -- [MIST] FEAT-PC001 — FIMs only. A Mist is not a Member (status-driven access, Q2).
  IF NOT v_is_temporary THEN
    SELECT id INTO v_fi_members_group_id
    FROM public.groups
    WHERE name = 'FringeIsland Members' AND group_type = 'system';

    IF v_fi_members_group_id IS NOT NULL THEN
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES (v_fi_members_group_id, v_personal_group_id, v_personal_group_id, 'active');

      -- Assign FI Members "Member" role
      SELECT id INTO v_fi_member_role_id
      FROM public.group_roles
      WHERE group_id = v_fi_members_group_id AND name = 'Member';

      IF v_fi_member_role_id IS NOT NULL THEN
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES (v_personal_group_id, v_fi_members_group_id, v_fi_member_role_id, v_personal_group_id);
      END IF;
    END IF;

    -- [ADR-U038 S3] Durable consent record for the foundational membership agreement.
    -- policy_version stamped server-side from the governance catalog (COALESCE guards
    -- a missing catalog row; the seed guarantees 'transcendence' exists).
    SELECT current_policy_version INTO v_policy_version
    FROM public.consent_purposes WHERE key = 'transcendence';

    INSERT INTO public.consent_records
      (subject_user_id, subject_group_id, purpose, decision, policy_version, capture_context)
    VALUES (
      v_user_id,
      v_personal_group_id,
      'transcendence',
      'granted',
      COALESCE(v_policy_version, 'v1'),
      jsonb_build_object('surface', 'hub', 'flow', 'credentialed-signup')
    );
  END IF;

  -- Step 8: Claim pending email invitations (no-op for a Mist — NEW.email IS NULL)
  FOR v_pending IN
    SELECT id, group_id, invited_by_group_id
    FROM public.pending_email_invitations
    WHERE LOWER(invited_email) = LOWER(NEW.email)
      AND status = 'pending'
      AND expires_at > NOW()
  LOOP
    INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
    VALUES (v_pending.group_id, v_personal_group_id, v_pending.invited_by_group_id, 'invited')
    ON CONFLICT (group_id, member_group_id) DO NOTHING;

    UPDATE public.pending_email_invitations
    SET status = 'claimed', claimed_at = NOW()
    WHERE id = v_pending.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'PC-2 account-creation trigger. ADR-U038 S3: credentialed FIM creation is consent-gated '
  '(raw_user_meta_data.consent_accepted = true or the insert rolls back) and writes one '
  'durable transcendence consent row (policy_version stamped from consent_purposes). Mists '
  '(is_anonymous) are exempt — consent is captured at transcendence. SECURITY DEFINER.';
