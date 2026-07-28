-- ===========================================================================
-- A-NTF area-gate remediation — board GB-1 (Mist posture) + GB-3 (asks split)
-- Settled 2026-07-27 by Stefan. Decision board:
--   docs/planning/hub-v2/2026-07-27-antf-gate-decision-board.md
--   docs/planning/hub-v2/2026-07-27-antf-nb8-mist-posture-proof.md
--
-- WHY. NB-8 asked for an adversarial proof that the delivery path structurally
-- excludes Mist durable rows. The proof was run and REFUTED its own premise:
-- every Mist held one `role_assigned` row from its own personal-group
-- bootstrap, could read / mark-read / export it, and was refused only at the
-- preference doors — a notification it could see and could not silence. This
-- migration makes the written rule true by construction instead of by hope.
--
-- Separately, W-09's ruling (`asks are not news`) is realised: the three
-- questions only the recipient can answer move to a category that cannot be
-- muted. Note this widens W-09 as filed — the finding named `membership`, but
-- `stewardship_nomination` (802 live rows, the LARGEST ask population) sits in
-- the equally-suppressible `stewardship` category with the identical defect.
-- The ruled principle does not depend on which category an ask sits in.
--
-- ---------------------------------------------------------------------------
-- SIBLING ASSERTIONS THIS MIGRATION INVALIDATES (platform CLAUDE.md rule — the
-- class that has bitten three times: A-NTF N-A, N-B, A-COM RIDER-3). Grepped
-- 2026-07-27 across hub/tests for every object whose behaviour changes here.
--
--   ADAPTED (would have gone red):
--   1. tests/integration/notifications/preference-and-dispatcher-contracts.test.ts:86
--      `MUTED_KIND = 'invitation_received'` — that kind leaves `membership` for
--      a non-suppressible home, so muting `membership` can no longer silence
--      it. Re-pointed at `member_left`, which stays news and stays mutable.
--   2. same file, `member_suppressible is false for account only` — `asks` is
--      now also false. Assertion widened to the pair.
--   3. tests/unit/components/notification-bell.test.tsx — the `invitation_received`
--      fixture carried `category: 'membership'` and asserted navigation to
--      `/groups/g9`. Re-pointed at the asks category and the W-04 target.
--   4. tests/unit/components/notifications/notification-preferences-panel.test.tsx
--      — `category_label: 'Group membership & invitations'` fixtures. Local
--      fixtures (they would still pass) but they would assert a label that no
--      longer exists, so they are corrected rather than left as a false green.
--
--   DELIBERATELY LEFT (verified unaffected):
--   - Every `invitation_received` / `acting_invitation` / `stewardship_nomination`
--     EMISSION assertion (actionable-notifications, notification-contracts,
--     realtime-hint-and-policy, invitation-contracts, groups/*, e2e/notifications):
--     re-keying a kind's category does not change whether it is emitted. These
--     rows are now MORE reliably delivered, never less.
--   - integration/groups/role-permission-contracts.test.ts:604 — asserts
--     `role_assigned` for a role in a REAL group (member_group_id <> group_id),
--     which the self-assignment guard does not touch.
--   - integration/notifications/notification-contracts.test.ts:303 — the
--     fresh-member organic-emission test is baseline-relative and asserts no
--     absolute count, so losing the self-assignment row cannot break it.
--   - realtime-hint-and-policy.test.ts:249 — seeds `role_assigned` directly,
--     never through the trigger.
--   - Notification-row display fixtures pairing `invitation_received` with
--     `category: 'membership'` (notification-format, notification-actions*,
--     notifications-inbox-page): fixture-local strings, no DB read, no
--     behavioural coupling. Left; noted here so the next sweep need not re-derive.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. GB-1a — the personal-group bootstrap stops notifying you about yourself.
--
--    `notify_role_assigned` is an unconditional AFTER INSERT trigger on
--    user_group_roles. handle_new_user Step 6 assigns "Myself" in the new
--    account's OWN personal group, so every account ever created was told it
--    had been given a role in itself, by itself: 1516 of 1548 FIMs carry that
--    row, and it was also the entirety of the Mist durability leak.
--
--    A personal group granting itself a role is plumbing, not news. Guard on
--    the structural shape (recipient = context group), not on the role name —
--    "Myself" is a seeded string and a rename must not silently re-open this.
--    Re-created in full per the append-only-migrations rule; the body is
--    otherwise byte-identical to 20260222000000:1134.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_role_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name TEXT;
  v_group_name TEXT;
  v_assigner_name TEXT;
BEGIN
  -- [A-NTF GB-1a] Self-assignment inside one's own personal group is account
  -- bootstrap. The role row is still written; only the telling is skipped.
  IF NEW.member_group_id = NEW.group_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_role_name FROM public.group_roles WHERE id = NEW.group_role_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT name INTO v_assigner_name FROM public.groups WHERE id = NEW.assigned_by_group_id;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
  VALUES (
    NEW.member_group_id,
    'role_assigned',
    'Role Assigned',
    'You have been assigned the "' || COALESCE(v_role_name, 'Unknown') || '" role in "' || COALESCE(v_group_name, 'a group') || '".',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', v_group_name,
      'role_name', v_role_name,
      'assigner_group_id', NEW.assigned_by_group_id,
      'assigner_name', v_assigner_name
    ),
    NEW.group_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_role_assigned() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.notify_role_assigned() IS
  'Emits role_assigned on a real role grant. [A-NTF GB-1a, 2026-07-27] Skips self-assignment (member_group_id = group_id) — a personal group giving itself a role is account bootstrap, not news. That row was the whole of the NB-8 Mist durability leak and 1516 FIMs carried it too.';

-- ---------------------------------------------------------------------------
-- 2. GB-1b — no durable notification row may exist for a Mist.
--
--    V3 §6: "no email, no durable state; in-app in-session only." The rule was
--    written and never enforced. Enforcing it at the BEFORE INSERT dispatcher
--    (rather than at the ~38 emitters) is the NC-1 precedent: one predicate
--    catches every writer by construction, legacy and future, including
--    admin_send_notification and anything a later wave adds.
--
--    A group-addressed row (an engagement group) has no `users` row pointing at
--    it, so the lookup yields NULL and the row is delivered — the exact
--    distinction notify_notification_hint's comment got wrong by conflating
--    "Mist" with "no users row".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_apply_notification_preference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_temporary BOOLEAN;
BEGIN
  -- [A-NTF GB-1b] The Mist rule, enforced rather than asserted.
  SELECT u.is_temporary INTO v_is_temporary
    FROM public.users u
   WHERE u.personal_group_id = NEW.recipient_group_id;

  IF COALESCE(v_is_temporary, false) THEN
    RETURN NULL;                       -- no durable row, and so no hint either
  END IF;

  IF NOT public.ds5_may_deliver(NEW.recipient_group_id, NEW.type, 'in_app') THEN
    RETURN NULL;                       -- suppressed: no row, and so no hint
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ds5_apply_notification_preference() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ds5_apply_notification_preference() IS
  'The shared dispatcher (FEAT-PD016), BEFORE INSERT on public.notifications. [A-NTF GB-1b, 2026-07-27] Now also enforces the V3 Mist rule: a recipient resolving to is_temporary holds no durable row. A group-addressed row resolves to no users row and delivers normally.';

-- ---------------------------------------------------------------------------
-- 3. GB-3 — asks are not news.
--
--    One switch silenced both "Alice joined" (nothing owed by you) and "you
--    have been invited" (a decision only you can make). For acting_invitation
--    and stewardship_nomination the notification is the ONLY answering surface
--    — N-B deliberately moved Accept/Decline into it — so muting the category
--    meant the question arrived nowhere and could never be answered.
--
--    The surgical `action_type IS NOT NULL` exemption was considered and
--    REJECTED at W-09, and the live data is why: invitation_received carries no
--    action_type across all 910 rows, and it is the commonest ask of the three.
--
--    Shape: a category whose member_suppressible is false — reusing the axis
--    `account` already proves works, rather than inventing a per-kind one.
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_categories (key, label, lawful_basis, member_suppressible, nudge)
VALUES (
  'asks',
  'Questions waiting for your answer',
  'transactional',
  false,   -- a question only you can answer always reaches you
  true
)
ON CONFLICT (key) DO UPDATE
  SET label               = EXCLUDED.label,
      member_suppressible = EXCLUDED.member_suppressible;

-- The three asks, verified live 2026-07-27 (rows: 910 / 36 / 802).
UPDATE public.notification_kinds
   SET category_key = 'asks'
 WHERE kind IN ('invitation_received', 'acting_invitation', 'stewardship_nomination');

-- Name the telling, not the thing — and stop advertising what they no longer
-- carry. Both categories keep their switch; they are now genuinely news-only.
UPDATE public.notification_categories
   SET label = 'Group & membership updates'
 WHERE key = 'membership';

UPDATE public.notification_categories
   SET label = 'Stewardship updates'
 WHERE key = 'stewardship';

-- A preference row muting `asks` may still exist from before this migration
-- (or be written behind the contract's back). ds5_may_deliver already outranks
-- it via member_suppressible = false, exactly as it does for `account`; this
-- clears the dead rows so the preferences surface never renders a switch whose
-- state means nothing.
DELETE FROM public.notification_preferences WHERE category_key = 'asks';
