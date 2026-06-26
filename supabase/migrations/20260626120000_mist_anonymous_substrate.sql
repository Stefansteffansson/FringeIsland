-- FEAT-PC001 — Mist anonymous-identity substrate (arrival).
-- Schema change, reviewed/approved (Stefan, 2026-06-26: Q1 shape + email-nullable (a)).
--
-- Platform half of IDN-1 (ADR-U004 / ADR-U031 §9, stages 1-2 Entry + Access):
--   1. users.is_temporary identity-state flag (existing FIM rows backfill false).
--   2. users.email made nullable — a Mist has no PII; the UNIQUE constraint still
--      holds for FIMs (Postgres treats NULLs as distinct, so many Mists share
--      "no email").
--   3. handle_new_user — additive anonymous branch over the LIVE (display-name)
--      definition from 20260227095615: is_temporary single-sourced from
--      auth.users.is_anonymous, a 'Mist' name fallback (a Mist has no display_name
--      and no email), and FringeIsland Members enrolment skipped for a Mist
--      (status-driven access — Q2 / ADR-U031 "intrinsic, not a fence"). The FIM
--      path is unchanged (steps 1-8 preserved; the FI-Members step is gated, not
--      removed; the pending-invite claim no-ops for a null email).
--   4. Rename the vestigial pre-canon 'Visitor' system group / 'Guest' role to
--      'Mist' (ADR-U031 rename target). seeds/04_system_groups.sql updated to match.
--
-- OUT OF SCOPE (FEAT-PC002): TTL/inactivity erasure, pg_cron reaper, explicit-erase,
-- consent capture, and Mist->FIM transcendence.

-- 1. Mist identity-state flag.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN NOT NULL DEFAULT false;

-- 2. A Mist has no email — make it optional (UNIQUE still enforced for FIMs).
ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;

-- 3. handle_new_user — anonymous branch (additive; FIM path unchanged).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
BEGIN
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
$$;

-- 4. Rename vestigial 'Visitor' -> 'Mist' (ADR-U031). Role first (while the group
--    join still matches 'Visitor'), then the group itself.
UPDATE public.group_roles r
SET name = 'Mist'
FROM public.groups g
WHERE r.group_id = g.id
  AND g.group_type = 'system'
  AND g.name = 'Visitor'
  AND r.name = 'Guest';

UPDATE public.groups
SET name = 'Mist'
WHERE group_type = 'system' AND name = 'Visitor';
