-- FEAT-PC031 — member email rectification (ADR-U054, ruled 2026-09-11).
--
-- The PC-4 member-operations family's TENTH contract, and the first in this
-- repository that WRITES the auth schema. Every prior auth-schema access is a
-- DELETE (`admin_hard_delete_user`, `erase_fim_account`, the force-logout
-- paths); no migration has ever performed `UPDATE auth.users`, and
-- `auth.identities` has had no migration touch it at all. ADR-U054 is the
-- decision that this is acceptable; this header is its trace.
--
-- WHY NOT THE AUTH ADMIN API: no service-role key exists on the Surface, by
-- design (ADR-U038). Every privileged admin mutation is the admin's own
-- session calling a SECURITY DEFINER contract. `supabase.auth.admin
-- .updateUserById()` would require breaching exactly the boundary ADR-U038
-- holds, so the correction is made from inside Postgres instead.
--
-- WHY THREE STORES IN ONE TRANSACTION: `public.users.email` is a mirror
-- populated once by `handle_new_user` on AFTER INSERT; there is no AFTER
-- UPDATE sync trigger on `auth.users` (only INSERT and DELETE exist). A
-- partial write is not cosmetic — `erase_fim_account` finds a member's
-- pending invitations by matching the CURRENT mirrored address, so a stale
-- mirror would leave invitations to the member's real address beyond the
-- reach of an Art. 17 request.
--
-- SIBLING-ASSERTION SWEEP (tier rule — a migration that changes shipped
-- semantics names the assertions it invalidates): swept `hub/tests/` for
-- assertions naming `admin_update_user_email`, `member.email_change`,
-- `account_email_changed`, and for existing assertions over `users.email`
-- write behaviour. **None found — this migration adds behaviour and changes
-- no shipped semantics.** No sibling adapted, none deliberately left.
--
-- Schema change — schema-review gate: lands at task status `review`, not
-- `done`. Idempotent (CREATE OR REPLACE + ON CONFLICT DO NOTHING).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. The notice kind. `notifications.type` carries a FK to this registry
--    (`notifications_type_fkey`), so an unregistered kind is structurally
--    un-insertable — the seed is mandatory, not decorative. Joins the
--    existing `account` category beside the two participation kinds and the
--    two DB-4 hold kinds.
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.notification_kinds (kind, category_key, label) values
  ('account_email_changed', 'account', 'Your sign-in email address was changed')
on conflict (kind) do nothing;

do $$
declare v_n integer;
begin
  select count(*) into v_n
    from public.notification_kinds
   where kind = 'account_email_changed' and category_key = 'account';
  if v_n <> 1 then
    raise exception 'FEAT-PC031: account_email_changed not seeded into the account category';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. admin_update_user_email — the contract.
--    Family spine (20260801190000 / 20260903120000): is_platform_admin guard
--    -> reason gate -> target FOR UPDATE -> typed refusals -> mutation ->
--    audit -> notice -> jsonb.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.admin_update_user_email(
  target_user_id uuid,
  p_new_email text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
  v_new_email TEXT;
  v_previous_email TEXT;
  v_sessions_revoked INTEGER := 0;
  v_invitations_deleted INTEGER := 0;
  v_collision INTEGER;
BEGIN
  -- STORY-1: the gate.
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;

  -- STORY-2: the reason is required (the PC030 posture, same 22023).
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason required' USING ERRCODE = '22023';
  END IF;

  -- STORY-2: normalise BEFORE anything compares or writes. `auth.users`'
  -- unique index `users_email_partial_key` is case-SENSITIVE (only the
  -- non-unique `users_instance_id_email_idx` is on lower(email)), so writing
  -- an un-normalised address could seat two accounts differing only by case.
  v_new_email := lower(trim(coalesce(p_new_email, '')));

  IF v_new_email = '' OR v_new_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22023';
  END IF;

  v_caller_group_id := public.get_current_personal_group_id();

  -- STORY-1: FOR UPDATE serialises against the self-service contracts'
  -- own-row locks, as the rest of the family does.
  SELECT id, email, is_temporary, auth_user_id, personal_group_id
  INTO v_target
  FROM public.users WHERE id = target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- STORY-4: an anonymous account has no email identity to rectify.
  IF v_target.is_temporary THEN
    RAISE EXCEPTION 'An anonymous account has no email identity to rectify'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_target.email IS NULL THEN
    RAISE EXCEPTION 'This account has no email address on record to rectify'
      USING ERRCODE = 'P0001';
  END IF;

  v_previous_email := lower(v_target.email);

  -- STORY-2: the no-op guard — writes nothing at all, row or audit.
  IF v_previous_email = v_new_email THEN
    RAISE EXCEPTION 'That is already this member''s email address'
      USING ERRCODE = 'P0001';
  END IF;

  -- STORY-3: collision, checked case-insensitively against BOTH stores and
  -- BEFORE any mutation — never a caught unique-violation after the fact.
  SELECT count(*) INTO v_collision
  FROM auth.users au
  WHERE lower(au.email) = v_new_email
    AND au.id IS DISTINCT FROM v_target.auth_user_id;
  IF v_collision > 0 THEN
    RAISE EXCEPTION 'That email address is already in use' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_collision
  FROM public.users u
  WHERE lower(u.email) = v_new_email
    AND u.id IS DISTINCT FROM target_user_id;
  IF v_collision > 0 THEN
    RAISE EXCEPTION 'That email address is already in use' USING ERRCODE = 'P0001';
  END IF;

  -- STORY-5a: the auth row. `email_confirmed_at` is set because ADR-U054
  -- point 2 rules the administrator vouches for the address — the platform
  -- has no mailer to confirm it with, and requiring a confirmation it cannot
  -- deliver would lock the member out. The five change-flow columns are
  -- cleared so no half-open GoTrue email-change survives the correction
  -- (GoTrue's own resting values: empty strings, 0, NULL).
  IF v_target.auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = v_new_email,
        email_confirmed_at = now(),
        email_change = '',
        email_change_token_new = '',
        email_change_token_current = '',
        email_change_sent_at = NULL,
        email_change_confirm_status = 0,
        updated_at = now()
    WHERE id = v_target.auth_user_id;

    -- STORY-5b: the provider record. `auth.identities.email` is
    -- GENERATED ALWAYS AS (lower(identity_data ->> 'email')) STORED, so the
    -- jsonb is the only writable home — never the column.
    UPDATE auth.identities
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_new_email), true),
        updated_at = now()
    WHERE user_id = v_target.auth_user_id
      AND provider = 'email';

    -- STORY-6: a login-identity change is a credential event. If the address
    -- was changed because the old mailbox was compromised, live sessions are
    -- precisely what must be cut. Precedent: 20260801190000...:426-427.
    WITH deleted AS (
      DELETE FROM auth.sessions WHERE user_id = v_target.auth_user_id RETURNING 1
    )
    SELECT count(*) INTO v_sessions_revoked FROM deleted;

    DELETE FROM auth.refresh_tokens WHERE user_id = v_target.auth_user_id::text;
  END IF;

  -- STORY-5c: the mirror. Nothing syncs it automatically.
  UPDATE public.users
  SET email = v_new_email,
      updated_at = now()
  WHERE id = target_user_id;

  -- STORY-7: offers addressed to the superseded address. Deleted, not
  -- re-pointed (ADR-U054 point 5) and not left: after the change
  -- `erase_fim_account` matches on the CURRENT address, so a leftover row
  -- would outlive an Art. 17 request as orphaned PII. Rows addressed to the
  -- NEW address are deliberately untouched — they belong to this member now
  -- and erasure can reach them.
  WITH deleted AS (
    DELETE FROM public.pending_email_invitations
    WHERE lower(invited_email) = v_previous_email
    RETURNING 1
  )
  SELECT count(*) INTO v_invitations_deleted FROM deleted;

  -- STORY-8: the audit row. The previous address must survive here — it is
  -- the only record that the account was ever reachable there.
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'member.email_change',
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'previous_email', v_previous_email,
      'new_email', v_new_email,
      'reason', p_reason,
      'sessions_revoked', v_sessions_revoked,
      'invitations_deleted', v_invitations_deleted));

  -- STORY-9: the member is told. The title is a LITERAL — a Core contract
  -- must not read notification_kinds for a label
  -- (20260903130000_db4_pc030_notice_titles_are_core_literals.sql). A row
  -- without a personal group has no inbox and yields no notice.
  IF v_target.personal_group_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
    VALUES (
      v_target.personal_group_id,
      'account_email_changed',
      'Your sign-in email address was changed',
      p_reason,
      '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'previous_email', v_previous_email,
    'new_email', v_new_email,
    'sessions_revoked', v_sessions_revoked,
    'invitations_deleted', v_invitations_deleted);
END;
$$;

comment on function public.admin_update_user_email(uuid, text, text) is
  'FEAT-PC031 / ADR-U054: platform-admin-gated rectification of a member''s '
  'login email. Writes auth.users (address + email_confirmed_at, the five '
  'email_change* columns cleared), auth.identities.identity_data for the '
  'provider=''email'' row, and the public.users mirror in ONE transaction; '
  'revokes sessions + refresh tokens; deletes pending invitations addressed '
  'to the superseded address. Typed refusals: 42501 non-admin; P0002 '
  'not-found; 22023 blank reason / malformed address; P0001 no-op, collision '
  '(both stores, case-insensitive), Mist, or no address on record. Audits '
  'member.email_change with both addresses, the reason and both counts. '
  'Notice title is a contract literal, never a registry read. Refusals are '
  'NOT audited — the family raises in-transaction and Postgres discards the '
  'row. SECURITY DEFINER; the first contract here that mutates auth-schema '
  'rows, bounded to one target user.';

revoke all on function public.admin_update_user_email(uuid, text, text) from public, anon;
grant execute on function public.admin_update_user_email(uuid, text, text) to authenticated, service_role;
