-- ============================================================================
-- FEAT-PC023 — Group availability enforcement contracts (Cycle HYG-A)
-- The two-mode hold model: Active / Resting / Suspended
-- (RB-6/RB-7 amendment + the 2026-08-03 naming settle; spec:
-- docs/platform/core/features/FEAT-PC023-group-suspension-enforcement-contracts.md)
--
-- One schema gate, nine sections:
--   1. groups_status_check gains 'resting' (the one new value).
--   2. The rest_group permission seed (PC015 act_as_group idiom): catalog row
--      + Steward-template link + existing Steward-role backfill. The live
--      auto_grant_permission_to_deusex trigger carries it to platform admins
--      (Tier-1 context-free resolution).
--   3. assert_group_writable(p_group_id, p_actor_group_id) — the canonical
--      availability guard (PC-3, net-new). active -> silent; resting -> silent
--      iff the actor holds rest_group in the group (else P0001
--      'group is resting'); suspended -> P0001 'group is suspended' below the
--      admin plane. closed/archived pass through — terminal semantics stay at
--      their own doors. The refusal strings are CONTRACT SURFACE (FEAT-H038
--      copy keys on them).
--   4. 48 re-issues in place (COR-A pattern: latest definition, signature
--      byte-identical, ACL preserved by create-or-replace):
--      - 26 guard-frozen doors (growth-and-activity);
--      - 10 exit-family doors (open under resting; suspended-refusal added:
--        leave_group [the 20260719190205:300 trap sprung], leave_group_as_group,
--        remove_member, pause_member, withdraw_from_journey,
--        decline_group_invitation, cancel_member_invitation,
--        cancel_email_invitation, leave_group_conversation,
--        respond_to_group_invitation decline arm);
--      - 12 read doors (suspended arms below the admin plane: forum,
--        announcements, group conversations, group-kind conversation detail,
--        invitations, roles, journey progress, enrollment summary, player
--        state; get_my_conversations exclusion; get_my_enrollments
--        group_status key; get_group_detail minimal payload).
--      The seven already-guarded doors are UNTOUCHED (their own non-active
--      refusals stand): close_group, delete_group, hand_stewardship_to_deusex,
--      invite_group, enroll_group_in_journey, nominate_steward,
--      respond_to_stewardship_nomination.
--   5. get_member_groups: DROP + recreate with the additive `status` column
--      (RETURNS TABLE change forces the drop; grants re-issued below).
--   6. is_conversation_participant: the conversations-family chokepoint gains
--      the not-suspended arm (closes conversations / messages /
--      conversation_participants RLS in one place).
--   7. The transition contracts: rest_group()/wake_group() (member plane,
--      rest_group-gated, telemetry-mirror only — NO admin-audit row, the
--      close/delete precedent); admin_rest_group()/admin_wake_group() (thin
--      audited wrappers, ADM-18 compose-through-the-walls, audit actions
--      group.rest / group.wake); admin_suspend_group amended
--      (active|resting -> suspended). Every transition touching 'suspended'
--      is admin-only; there is no direct suspended -> resting move.
--   8. RLS amendments: groups_select labeled-visibility arm (members/public
--      see resting+suspended rows exactly where active rows show);
--      forum_select / announcements_select_community / enrollment_select_group
--      gain not-suspended arms (below the admin plane).
--   9. Legacy write-door closure: the 14 live write policies on
--      group_memberships / user_group_roles / group_roles /
--      group_role_permissions dropped by their live names (pg_policies
--      verified 2026-08-03) + INSERT/UPDATE/DELETE revoked from
--      authenticated/anon. SELECT stays (the C-series read-on-RLS posture).
--
-- SIBLING-ASSERTION SWEEP (run 2026-08-03 pre-gate, per the platform-tier
-- rule). Zero invalidated assertions; deliberately left, each verified:
--   - hub/tests/unit/components/admin/admin-group-detail.test.tsx:156,162 —
--     mock-driven 409 copy 'cannot suspend a group that is not active';
--     component-behavior test, substrate-independent (H038 owns admin copy).
--   - hub/tests/integration/groups/role-permission-contracts.test.ts:851 —
--     plain-member direct grp_insert refusal: green before AND after (the
--     policy drop sharpens the wall it pins).
--   - hub/tests/integration/admin/group-administration-contracts.test.ts —
--     suspend-matrix cells (re-suspend refuses; closed refuses; round-trip):
--     compatible with the widened active|resting arm; no message pins.
--   - hub/tests/integration/groups/group-closure-deletion.test.ts (house-map
--     cells) — non-active-group P0001 refusals on close/hand doors: those
--     doors are the untouched already-guarded family.
--   - hub/tests/integration/groups/member-groups-contract.test.ts — per-key
--     shape assertions; the additive status column leaves them green.
--   - E2E fixtures writing the four legacy tables all use the service-role
--     client — unaffected by the authenticated/anon closure.
--   - The B-RBAC catalogue-count pin (role-permission-contracts.test.ts:196)
--     derives the count from the live permissions table at runtime — it
--     self-adjusts for the rest_group seed.
--
-- SECURITY DEFINER justifications (new functions only; every re-issue keeps
-- its shipped posture):
--   - assert_group_writable: reads groups.status across RLS from inside
--     definer contracts; STABLE, minimal body, no mutation.
--   - rest_group / wake_group: member-plane mutation of groups.status across
--     RLS behind visibility + permission walls (the org-door idiom).
--   - admin_rest_group / admin_wake_group: admin-plane wrappers writing
--     admin_audit_log across RLS (the PC020 admin-family posture).
--
-- Red-first: gate suite
-- hub/tests/integration/groups/group-availability-enforcement.test.ts,
-- demonstrated at head 2026-08-03: 100 failed / 17 passed / 117 — the 17
-- passing cells are exactly the labelled-green set (the seven + invariant
-- pins). Apply precondition verified: zero relic held groups live.
-- ============================================================================
-- ============================================================================
-- 1. The check constraint: 'resting' joins the vocabulary
-- ============================================================================
alter table public.groups drop constraint groups_status_check;
alter table public.groups add constraint groups_status_check
  check (status in ('active', 'resting', 'suspended', 'closed', 'archived'));

-- ============================================================================
-- 2. The rest_group permission seed (the PC015 act_as_group idiom).
--    One key, both abilities: setting/unsetting the resting state AND acting
--    inside a resting group — the toggle strictly dominates the exemption.
--    The auto_grant_permission_to_deusex trigger fires on the catalog insert
--    and grants the key to the DeusEx role (platform admins, Tier-1).
-- ============================================================================
insert into public.permissions (name, description, category)
values ('rest_group',
        'Rest and wake this group, and act within it while it rests (FEAT-PC023 two-mode hold)',
        'group_management')
on conflict do nothing;

insert into public.role_template_permissions (role_template_id, permission_id)
select rt.id, p.id
  from public.role_templates rt, public.permissions p
 where rt.name = 'Steward Role Template' and p.name = 'rest_group'
on conflict do nothing;

-- Backfill: every existing Steward-template-derived role instance carries it.
insert into public.group_role_permissions (group_role_id, permission_id)
select gr.id, p.id
  from public.group_roles gr
  join public.role_templates rt on rt.id = gr.created_from_role_template_id
  cross join public.permissions p
 where rt.name = 'Steward Role Template' and p.name = 'rest_group'
on conflict do nothing;

-- ============================================================================
-- 3. The canonical availability guard (PC-3, net-new).
--    One indexed row read; on the resting arm only, one has_permission() call
--    (the ADR-U043 note in PC023 §Performance budget). The refusal strings
--    'group is resting' / 'group is suspended' are contract surface.
-- ============================================================================
create or replace function public.assert_group_writable(
  p_group_id uuid,
  p_actor_group_id uuid
) returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select g.status into v_status
    from public.groups g
   where g.id = p_group_id;

  -- active — the hot path — and nonexistent (existence is the caller's
  -- concern) both pass silently; closed/archived pass through untouched
  -- (terminal semantics live at their own doors).
  if v_status is null or v_status not in ('resting', 'suspended') then
    return;
  end if;

  -- the admin plane is never held
  if public.is_platform_admin() then
    return;
  end if;

  if v_status = 'resting' then
    if coalesce(public.has_permission(p_actor_group_id, p_group_id, 'rest_group'), false) then
      return;
    end if;
    raise exception 'group is resting' using errcode = 'P0001';
  end if;

  raise exception 'group is suspended' using errcode = 'P0001';
end;
$$;

comment on function public.assert_group_writable(uuid, uuid) is
  'FEAT-PC023: the canonical availability guard — active silent; resting silent for rest_group holders (else P0001 ''group is resting''); suspended P0001 ''group is suspended'' below the admin plane. SECURITY DEFINER: reads groups.status across RLS from inside definer contracts; STABLE, no mutation.';

revoke all on function public.assert_group_writable(uuid, uuid) from public, anon;
grant execute on function public.assert_group_writable(uuid, uuid) to authenticated, service_role;

-- ============================================================================
-- 4. The 48 re-issues (26 guard-frozen + 10 exit-family + 12 read doors)
-- ============================================================================
-- ---------------------------------------------------------------------------
-- create_forum_post — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_forum_post(
  p_group_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Post content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, p_group_id, 'post_forum_messages') THEN
    RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(p_group_id, v_me);

  INSERT INTO public.forum_posts (group_id, author_group_id, content)
  VALUES (p_group_id, v_me, p_content)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'parent_post_id', v_row.parent_post_id,
    'content', v_row.content,
    'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, p_group_id),
    'replies', '[]'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- reply_to_forum_post — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reply_to_forum_post(
  p_parent_post_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_parent RECORD;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Reply content must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT id, group_id INTO v_parent
  FROM public.forum_posts WHERE id = p_parent_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent post not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_permission(v_me, v_parent.group_id, 'reply_to_messages') THEN
    RAISE EXCEPTION 'reply_to_messages required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_parent.group_id, v_me);

  INSERT INTO public.forum_posts (group_id, author_group_id, parent_post_id, content)
  VALUES (v_parent.group_id, v_me, p_parent_post_id, p_content)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'parent_post_id', v_row.parent_post_id,
    'content', v_row.content,
    'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_parent.group_id),
    'replies', '[]'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- edit_own_forum_post — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_own_forum_post(
  p_post_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.forum_posts
  WHERE id = p_post_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.author_group_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'Only the author may edit their post' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_row.group_id, v_me);
  IF v_row.is_deleted THEN
    RAISE EXCEPTION 'A removed post cannot be edited' USING ERRCODE = '42501';
  END IF;
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Post content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, v_row.group_id, 'post_forum_messages') THEN
    RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
  END IF;
  IF v_row.created_at <= NOW() - interval '15 minutes' THEN
    RAISE EXCEPTION 'The edit window (15 minutes) has closed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.forum_posts
  SET content = p_content
  WHERE id = p_post_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id, 'parent_post_id', v_row.parent_post_id,
    'content', v_row.content, 'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at, 'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_row.group_id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- delete_own_forum_post — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_forum_post(
  p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.forum_posts
  WHERE id = p_post_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.author_group_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'Only the author may delete their post' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_row.group_id, v_me);

  IF NOT v_row.is_deleted THEN
    IF NOT public.has_permission(v_me, v_row.group_id, 'post_forum_messages') THEN
      RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
    END IF;
    IF v_row.created_at <= NOW() - interval '15 minutes' THEN
      RAISE EXCEPTION 'The delete window (15 minutes) has closed' USING ERRCODE = '42501';
    END IF;
    UPDATE public.forum_posts
    SET is_deleted = true
    WHERE id = p_post_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'parent_post_id', v_row.parent_post_id,
    'content', NULL, 'is_deleted', true,
    'created_at', v_row.created_at, 'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_row.group_id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- moderate_forum_post — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_forum_post(
  p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_post RECORD;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT id, group_id, is_deleted INTO v_post
  FROM public.forum_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_permission(v_me, v_post.group_id, 'moderate_forum') THEN
    RAISE EXCEPTION 'moderate_forum required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_post.group_id, v_me);

  -- idempotent: already-tombstoned is success, not an error
  IF NOT v_post.is_deleted THEN
    UPDATE public.forum_posts SET is_deleted = true WHERE id = p_post_id;
  END IF;

  RETURN jsonb_build_object('id', v_post.id, 'is_deleted', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- send_community_announcement — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_community_announcement(
  p_group_id UUID,
  p_title TEXT,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_title IS NULL OR length(trim(p_title)) = 0
     OR p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Title and body must not be empty' USING ERRCODE = '22023';
  END IF;
  IF length(p_title) > 200 OR length(p_body) > 10000 THEN
    RAISE EXCEPTION 'Title or body too long' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, p_group_id, 'send_announcements') THEN
    RAISE EXCEPTION 'send_announcements required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(p_group_id, v_me);

  INSERT INTO public.announcements
    (scope_kind, scope_group_id, author_group_id, title, body)
  VALUES ('community', p_group_id, v_me, p_title, p_body)
  RETURNING * INTO v_row;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  SELECT gm.member_group_id, 'announcement', p_title, p_body,
         jsonb_build_object(
           'announcement_id', v_row.id,
           'scope_kind', 'community',
           'scope_group_id', p_group_id,
           'sent_by_group_id', v_me
         )
  FROM public.group_memberships gm
  WHERE gm.group_id = p_group_id
    AND gm.status = 'active'
    AND gm.member_group_id <> v_me;

  RETURN jsonb_build_object(
    'id', v_row.id, 'title', v_row.title, 'body', v_row.body,
    'created_at', v_row.created_at, 'author_group_id', v_me,
    'author', public.ds5_resolve_author_display(v_me, p_group_id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- retract_announcement — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retract_announcement(
  p_announcement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.announcements
  WHERE id = p_announcement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.scope_kind = 'community' THEN
    IF NOT public.has_permission(v_me, v_row.scope_group_id, 'send_announcements') THEN
      RAISE EXCEPTION 'send_announcements required' USING ERRCODE = '42501';
    END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_row.scope_group_id, v_me);
  ELSE
    IF NOT public.has_permission(
      v_me, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
    ) THEN
      RAISE EXCEPTION 'manage_all_groups required' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_row.retracted_at IS NULL THEN
    UPDATE public.announcements
    SET retracted_at = NOW(), retracted_by_group_id = v_me
    WHERE id = p_announcement_id
    RETURNING * INTO v_row;

    IF v_row.scope_kind = 'platform' THEN
      INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
      VALUES (v_me, 'retract_platform_announcement', v_row.id::text,
              jsonb_build_object('title', v_row.title));
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'retracted_at', v_row.retracted_at);
END;
$$;

-- ---------------------------------------------------------------------------
-- create_group_conversation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_group_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_conv_id UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT public.has_permission(v_me, p_group_id, 'create_group_conversations') THEN
    RAISE EXCEPTION 'Missing permission: create_group_conversations' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(p_group_id, v_me);
  INSERT INTO public.conversations (kind, group_id, title)
  VALUES ('group', p_group_id, NULLIF(trim(COALESCE(p_title, '')), ''))
  RETURNING id INTO v_conv_id;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (v_conv_id, v_me);
  RETURN v_conv_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- join_group_conversation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_group_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_group_id UUID;
  v_sealed TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT group_id, sealed_at INTO v_group_id, v_sealed
  FROM public.conversations
  WHERE id = p_conversation_id AND kind = 'group';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group conversation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = v_group_id AND member_group_id = v_me AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_group_id, v_me);
  -- FEAT-PD012: no joining an ended thread (behind the membership wall).
  IF v_sealed IS NOT NULL THEN
    RAISE EXCEPTION 'Conversation is sealed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (p_conversation_id, v_me)
  ON CONFLICT (conversation_id, participant_group_id)
  DO UPDATE SET left_at = NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- send_message — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.messages%ROWTYPE;
  v_hold_group UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND participant_group_id = v_me AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: group-kind conversations freeze with their group; DMs are
  -- pair-grain and never held (the recorded verdict).
  SELECT c.group_id INTO v_hold_group
    FROM public.conversations c
   WHERE c.id = p_conversation_id AND c.kind = 'group';
  IF v_hold_group IS NOT NULL THEN
    PERFORM public.assert_group_writable(v_hold_group, v_me);
  END IF;
  -- FEAT-PD012: seal ends activity — behind the participant wall so refusal
  -- classes stay non-leaking (outsiders still see 42501, never the seal).
  IF EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND sealed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Conversation is sealed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.messages (conversation_id, sender_group_id, content)
  VALUES (p_conversation_id, v_me, p_content)
  RETURNING * INTO v_row;
  RETURN jsonb_build_object(
    'id', v_row.id, 'conversation_id', v_row.conversation_id,
    'sender_group_id', v_row.sender_group_id,
    'content', v_row.content, 'created_at', v_row.created_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- enroll_self_in_journey — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.enroll_self_in_journey(
  p_journey_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_is_mist_onboarding boolean := false;
  v_onboarding_id uuid;
  v_journey public.journeys%rowtype;
  v_withdrawn public.journey_enrollments%rowtype;
  v_enrollment_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null then
    raise exception 'self-enrolment requires a resolvable actor' using errcode = '42501';
  end if;
  if v_is_temporary is distinct from false then
    -- ADR-U045 realized (FEAT-PD006): a Mist may enrol iff p_journey_id is
    -- the designated onboarding journey. The designation IS the authorization
    -- on this branch — a Mist holds no permission in any owning group, so the
    -- has_permission gate below is bypassed for exactly this case and no
    -- other. Everywhere else the FIM-only refusal stands unchanged.
    select j.id into v_onboarding_id
      from public.journeys j
     where j.is_onboarding_designated
     limit 1;
    if v_onboarding_id is null or p_journey_id <> v_onboarding_id then
      raise exception 'self-enrolment is FIM-only outside the onboarding journey'
        using errcode = '42501';
    end if;
    v_is_mist_onboarding := true;
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Visibility: the designated onboarding journey is admitted for every
  -- resolvable actor (the unavoidable-but-unwalled front door, ADR-U045
  -- Amendment 1) — is_public=false keeps it out of the browse catalogue,
  -- never out of reach at the door itself.
  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or j.is_onboarding_designated
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023: enrolling is activity in the owning group's context. The
  -- designated onboarding branch stays unwalled (ADR-U045 Amendment 1).
  if not v_is_mist_onboarding then
    perform public.assert_group_writable(v_journey.created_by_group_id, v_actor);
  end if;

  -- The permission gate — bypassed ONLY on the Mist+designated branch above;
  -- a FIM keeps both gates on every journey, onboarding included (Tier-1
  -- system-group grant resolves it context-free for every FIM).
  if not v_is_mist_onboarding then
    if not coalesce(public.has_permission(v_actor, v_journey.created_by_group_id,
                                          'enroll_self_in_journey'), false) then
      raise exception 'not permitted to enroll in this journey' using errcode = '42501';
    end if;
  end if;

  if exists (select 1 from public.journey_enrollments e
              where e.journey_id = p_journey_id and e.group_id = v_actor
                and e.status <> 'withdrawn') then
    raise exception 'already enrolled in this journey' using errcode = 'P0001';
  end if;

  -- Oracle B-JRN-003 (Open Q2): one-directional dual-enrollment refusal —
  -- an active via-group enrolment blocks self-enrolment (reactivation included).
  if exists (select 1
               from public.journey_enrollments e
               join public.group_memberships gm
                 on gm.group_id = e.group_id
                and gm.member_group_id = v_actor
                and gm.status = 'active'
              where e.journey_id = p_journey_id
                and e.group_id <> v_actor
                and e.status <> 'withdrawn') then
    raise exception 'already enrolled in this journey via a group' using errcode = 'P0001';
  end if;

  -- Q1 addendum: a prior withdrawn walk reactivates — same row, same
  -- step-instances, the traveller resumes where they genuinely were.
  select * into v_withdrawn
    from public.journey_enrollments e
   where e.journey_id = p_journey_id and e.group_id = v_actor
     and e.status = 'withdrawn'
   order by e.status_changed_at desc, e.id desc
   limit 1;

  if v_withdrawn.id is not null then
    update public.journey_enrollments
       set status = 'active',
           status_changed_at = now(),
           enrolled_by_group_id = v_actor
     where id = v_withdrawn.id;

    return jsonb_build_object(
      'enrollment_id', v_withdrawn.id,
      'journey_id', p_journey_id,
      'group_id', v_actor,
      'status', 'active',
      'progress_data', v_withdrawn.progress_data);
  end if;

  insert into public.journey_enrollments
    (journey_id, group_id, enrolled_by_group_id, status, progress_data)
  values
    (p_journey_id, v_actor, v_actor, 'active', '{}'::jsonb)
  returning id into v_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'journey_id', p_journey_id,
    'group_id', v_actor,
    'status', 'active',
    'progress_data', '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- enter_journey_step — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.enter_journey_step(
  p_enrollment_id uuid,
  p_step_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_step public.journey_steps%rowtype;
  v_inst public.journey_step_instances%rowtype;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  -- FEAT-PD004 STORY-4 (labelled J-B delta): 'completed' admitted — the
  -- milestone is not a lock. All other states refuse as at J-B.
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_enr.group_id, v_actor);

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- The open instance IS the engagement — never duplicated.
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  if v_inst.id is null then
    if exists (select 1 from public.journey_step_instances i
                where i.enrollment_id = p_enrollment_id
                  and i.traveller_group_id = v_actor
                  and i.step_id = p_step_id
                  and i.completed_at is not null)
       and not v_step.repeatable then
      -- Review of a completed, non-repeatable step: no new lived record.
      select * into v_inst
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = p_step_id
       order by i.completed_at desc limit 1;
    else
      -- First engagement — or a repeat of a repeatable step (a NEW instance,
      -- never an update: ADR-U044 §4).
      insert into public.journey_step_instances
        (enrollment_id, traveller_group_id, step_id)
      values (p_enrollment_id, v_actor, p_step_id)
      returning * into v_inst;
    end if;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'created_at', v_inst.created_at,
    'completed_at', v_inst.completed_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_journey_step — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.complete_journey_step(
  p_enrollment_id uuid,
  p_step_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_step public.journey_steps%rowtype;
  v_journey public.journeys%rowtype;
  v_inst public.journey_step_instances%rowtype;
  v_blocking int;
  v_was_complete boolean;
  v_now_complete boolean;
  v_transition boolean := false;
  v_traveller_completed_at timestamptz;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  -- FEAT-PD004 STORY-4 (labelled J-B delta): 'completed' admitted.
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_enr.group_id, v_actor);

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- Q7 (J-B): via-group travellers complete under the party group's key (an
  -- Observer watches, never completes); solo walks carry no role distinction.
  if v_enr.group_id <> v_actor then
    if not coalesce(public.has_permission(v_actor, v_enr.group_id,
                                          'complete_journey_activities'), false) then
      raise exception 'not permitted to complete steps in this group''s journey'
        using errcode = '42501';
    end if;
  end if;

  -- JRN-8 gating (linear — the only exercised mode; other modes are forward
  -- shape and currently gate identically, deliberately conservative).
  select count(*) into v_blocking
    from public.journey_steps st
   where st.journey_id = v_enr.journey_id
     and st.required = true
     and st.step_order < v_step.step_order
     and not exists (select 1 from public.journey_step_instances i
                      where i.enrollment_id = p_enrollment_id
                        and i.traveller_group_id = v_actor
                        and i.step_id = st.id
                        and i.completed_at is not null);
  if v_blocking > 0 then
    raise exception 'required predecessor incomplete' using errcode = 'P0001';
  end if;

  -- FEAT-PD004 Q1: lock the enrolment row BEFORE the pre-stamp edge read —
  -- two racing finals serialize here, so exactly one call observes the
  -- incomplete→complete transition. Re-read + re-check under the lock so a
  -- racing withdraw/freeze can't slip between the standing check and the stamp.
  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id
   for update;
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  -- Pre-stamp traveller state (under the lock): complete means no required
  -- step lacks a completed instance. (A journey with zero required steps is
  -- vacuously complete from the start — no edge can ever fire for it.)
  select not exists (
           select 1 from public.journey_steps st
            where st.journey_id = v_enr.journey_id
              and st.required = true
              and not exists (select 1 from public.journey_step_instances i
                               where i.enrollment_id = p_enrollment_id
                                 and i.traveller_group_id = v_actor
                                 and i.step_id = st.id
                                 and i.completed_at is not null))
    into v_was_complete;

  -- Idempotent completion (oracle B-JRN completion idempotency) — unchanged.
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  if v_inst.id is not null then
    update public.journey_step_instances
       set completed_at = now()
     where id = v_inst.id
     returning * into v_inst;
  else
    select * into v_inst
      from public.journey_step_instances i
     where i.enrollment_id = p_enrollment_id
       and i.traveller_group_id = v_actor
       and i.step_id = p_step_id
       and i.completed_at is not null
     order by i.completed_at desc limit 1;

    if v_inst.id is null then
      -- No prior enter: create-and-complete in one call.
      insert into public.journey_step_instances
        (enrollment_id, traveller_group_id, step_id, completed_at)
      values (p_enrollment_id, v_actor, p_step_id, now())
      returning * into v_inst;
    end if;
    -- else: already completed — return the existing record unchanged.
  end if;

  -- Post-stamp traveller state + completion moment (the last required step's
  -- FIRST completion — deterministic under repeatable re-dos).
  select (count(*) filter (where done.first_completed_at is null)) = 0,
         max(done.first_completed_at)
    into v_now_complete, v_traveller_completed_at
    from public.journey_steps st
    left join lateral (
      select min(i.completed_at) as first_completed_at
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = st.id
         and i.completed_at is not null
    ) done on true
   where st.journey_id = v_enr.journey_id
     and st.required = true;
  v_now_complete := coalesce(v_now_complete, true);  -- zero required steps
  if not v_now_complete then
    v_traveller_completed_at := null;
  end if;

  -- FEAT-PD004 Q1/Q2/Q3/Q4: the transition edge — fires at most once per
  -- (enrolment x traveller) lifetime, because a re-walk can never make the
  -- pre-stamp state incomplete again (first completions are permanent).
  if v_now_complete and not v_was_complete then
    v_transition := true;

    select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

    -- Q4: the durable milestone (V3) — passive, traveller-addressed, never
    -- group-addressed (invariant 8; group aggregates are J-D).
    insert into public.notifications
      (recipient_group_id, type, title, body, payload, group_id)
    values
      (v_actor,
       'journey_completed',
       'Journey complete',
       'You completed the journey "' || v_journey.title || '".',
       jsonb_build_object(
         'journey_id', v_enr.journey_id,
         'enrollment_id', v_enr.id,
         'journey_title', v_journey.title),
       v_enr.group_id);

    -- Q2/Q3: the solo party (the walker IS the party — no group-type
    -- introspection, ADR-U018-safe) concludes the enrolment row; completed_at
    -- stamps once, ever (a reactivated re-walk never re-stamps).
    if v_enr.group_id = v_actor then
      update public.journey_enrollments
         set status = 'completed',
             completed_at = coalesce(completed_at, now()),
             status_changed_at = now()
       where id = p_enrollment_id
         and status = 'active';
      -- Re-read unconditionally: a legacy-completed row reaching a late edge
      -- matches no 'active' row, and RETURNING INTO would null v_enr.
      select * into v_enr
        from public.journey_enrollments e where e.id = p_enrollment_id;
    end if;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  -- FEAT-PD004 Q6: additive keys only — the four J-B keys are byte-identical.
  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'created_at', v_inst.created_at,
    'completed_at', v_inst.completed_at,
    'journey_completed', v_transition,
    'completion', jsonb_build_object(
      'traveller_completed', v_now_complete,
      'traveller_completed_at', v_traveller_completed_at,
      'enrollment_status', v_enr.status,
      'enrollment_completed_at', v_enr.completed_at));
end;
$$;

-- ---------------------------------------------------------------------------
-- save_step_response — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.save_step_response(
  p_enrollment_id uuid,
  p_step_id uuid,
  p_response jsonb
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_step public.journey_steps%rowtype;
  v_inst public.journey_step_instances%rowtype;
  v_clear boolean := false;
  v_body text;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  -- The enter/complete guard family verbatim (FEAT-PD004 wording): 'completed'
  -- admitted; frozen/withdrawn/paused refuse. JRN-14 extends with no new rule.
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_enr.group_id, v_actor);

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- Payload discipline (JF-5 + the malformed-clear rabbit hole). Only an
  -- EXPLICIT empty clears; anything malformed refuses before touching words.
  if p_response is null or jsonb_typeof(p_response) = 'null' then
    v_clear := true;
  elsif jsonb_typeof(p_response) <> 'object' then
    raise exception 'response must be a JSON object' using errcode = '22023';
  elsif not (p_response ? 'body') then
    raise exception 'response carries no body' using errcode = '22023';
  elsif jsonb_typeof(p_response -> 'body') = 'null' then
    v_clear := true;
  elsif jsonb_typeof(p_response -> 'body') <> 'string' then
    raise exception 'response body must be text' using errcode = '22023';
  else
    v_body := p_response ->> 'body';
    if btrim(v_body) = '' then
      v_clear := true;
    elsif char_length(v_body) > 100000 then
      raise exception 'response body exceeds 100000 characters' using errcode = '22001';
    elsif pg_column_size(p_response) > 262144 then
      raise exception 'response payload too large' using errcode = '22001';
    end if;
  end if;

  -- JF-4 targeting: the open instance if one exists...
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  -- ...else the most recent completed instance (editing revises the lived
  -- record; it never fabricates a new engagement)...
  if v_inst.id is null then
    select * into v_inst
      from public.journey_step_instances i
     where i.enrollment_id = p_enrollment_id
       and i.traveller_group_id = v_actor
       and i.step_id = p_step_id
       and i.completed_at is not null
     order by i.completed_at desc, i.created_at desc limit 1;
  end if;

  if v_inst.id is null then
    -- ...else one is created open (capture-before-complete; mirrors
    -- complete's create-and-complete). complete_journey_step will complete
    -- THIS instance — no duplicate ever appears.
    insert into public.journey_step_instances
      (enrollment_id, traveller_group_id, step_id, response, response_updated_at)
    values (p_enrollment_id, v_actor, p_step_id,
            case when v_clear then null else p_response end, now())
    returning * into v_inst;
  else
    update public.journey_step_instances
       set response = case when v_clear then null else p_response end,
           response_updated_at = now()
     where id = v_inst.id
     returning * into v_inst;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'response', v_inst.response,
    'response_updated_at', v_inst.response_updated_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- set_journey_progress_sharing — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.set_journey_progress_sharing(
  p_enrollment_id uuid,
  p_share boolean
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_user_id uuid;
  v_enr public.journey_enrollments%rowtype;
  v_purpose public.consent_purposes%rowtype;
  v_decision text;
  v_current text;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  -- Writes-grade traveller standing (own party or active member; P0002
  -- conceals otherwise — the unchanged shared gate).
  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  if v_enr.group_id = v_actor then
    raise exception 'sharing applies to group walks only' using errcode = 'P0001';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_enr.group_id, v_actor);

  select * into v_purpose
    from public.consent_purposes
   where key = 'journey_progress_visibility';
  if not found then
    raise exception 'consent purpose journey_progress_visibility is not catalogued'
      using errcode = '22023';
  end if;

  v_decision := case when p_share then 'granted' else 'withdrawn' end;

  select cr.decision into v_current
    from public.consent_records cr
   where cr.subject_group_id = v_actor
     and cr.purpose = v_purpose.key
     and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
   order by cr.captured_at desc, cr.id desc
   limit 1;

  if v_current is distinct from v_decision then
    select u.id into v_user_id
      from public.users u
     where u.personal_group_id = v_actor
       and u.is_active = true
     limit 1;

    insert into public.consent_records
      (subject_user_id, subject_group_id, purpose, decision, policy_version, capture_context)
    values
      (v_user_id, v_actor, v_purpose.key, v_decision, v_purpose.current_policy_version,
       jsonb_build_object(
         'enrollment_id', p_enrollment_id,
         'group_id', v_enr.group_id,
         'surface', 'journey_player'));
  end if;

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'sharing', p_share);
end;
$$;

-- ---------------------------------------------------------------------------
-- invite_member — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.invite_member(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_target_is_temporary boolean;
  v_existing_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'inviting is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);

  -- Invitable target = a FIM's personal group. Anything else (ghost id,
  -- engagement group, a Mist's proto-group) is P0002, indistinguishably.
  select u.is_temporary into v_target_is_temporary
    from public.users u where u.personal_group_id = p_member_group_id;
  if v_target_is_temporary is distinct from false then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  -- FIX: a pre-existing membership row (any status) collides on the
  -- (group_id, member_group_id) unique key. Pre-check for a specific, human
  -- message; keep errcode 23505 (the BFF maps it to 409). The raw INSERT
  -- previously leaked the constraint name to the caller and the UI.
  select gm.status into v_existing_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_existing_status is not null then
    raise exception '%',
      case v_existing_status
        when 'active'  then 'this person is already a member of the group'
        when 'invited' then 'this person already has a pending invitation to the group'
        when 'paused'  then 'this person is a paused member of the group'
        else 'this person already has a membership record in the group'
      end
      using errcode = '23505';
  end if;

  -- notify_invitation_received writes the durable notification row (trigger).
  -- Concurrency backstop: a row inserted between the pre-check and here (a
  -- race) must not leak the raw constraint text either.
  begin
    insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
    values (p_group_id, p_member_group_id, 'invited', v_actor);
  exception when unique_violation then
    raise exception 'this person already has a membership record in the group'
      using errcode = '23505';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- invite_by_email — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.invite_by_email(
  p_group_id uuid,
  p_email text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_email text;
  v_existing_pg uuid;
  v_existing_is_temporary boolean;
  v_existing_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'inviting is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;

  -- Open Q2: an email already belonging to a FIM converts server-side to a
  -- membership invitation — a pending email row for an existing account would
  -- never auto-claim (sign-up is the only claim trigger). Mists hold no email
  -- by design (ADR-U031); a temporary match is treated as no-FIM.
  select u.personal_group_id, u.is_temporary
    into v_existing_pg, v_existing_is_temporary
    from public.users u where lower(u.email) = v_email;
  if v_existing_pg is not null and v_existing_is_temporary = false then
    -- FIX: same clean-conflict pre-check as invite_member (the conversion
    -- branch did the raw INSERT that leaked the constraint text).
    select gm.status into v_existing_status
      from public.group_memberships gm
     where gm.group_id = p_group_id and gm.member_group_id = v_existing_pg;
    if v_existing_status is not null then
      raise exception '%',
        case v_existing_status
          when 'active'  then 'this person is already a member of the group'
          when 'invited' then 'this person already has a pending invitation to the group'
          when 'paused'  then 'this person is a paused member of the group'
          else 'this person already has a membership record in the group'
        end
        using errcode = '23505';
    end if;
    begin
      insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
      values (p_group_id, v_existing_pg, 'invited', v_actor);
    exception when unique_violation then
      raise exception 'this person already has a membership record in the group'
        using errcode = '23505';
    end;
    return jsonb_build_object('kind', 'member_invitation');
  end if;

  -- Case-insensitive duplicate guard (the unique constraint is case-sensitive;
  -- one refusal shape for both — 23505). NO dispatch: the D4 / V3 seam — the
  -- invitation is durable and auto-claims at sign-up (handle_new_user Step 8).
  if exists (select 1 from public.pending_email_invitations pei
              where pei.group_id = p_group_id
                and lower(pei.invited_email) = v_email
                and pei.status = 'pending') then
    raise exception 'an invitation for this email is already pending' using errcode = '23505';
  end if;

  insert into public.pending_email_invitations (group_id, invited_email, invited_by_group_id)
  values (p_group_id, v_email, v_actor);
  return jsonb_build_object('kind', 'email_invitation');
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_group_invitation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.accept_group_invitation(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_updated integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'joining is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);

  -- Self-scoped: exactly the memberships_update_accept RLS semantics. The
  -- existing triggers do the rest (Member-role auto-bind, accepted-notification).
  update public.group_memberships
     set status = 'active', status_changed_at = now()
   where group_id = p_group_id
     and member_group_id = v_actor
     and status = 'invited';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'no pending invitation' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- assign_member_role — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.assign_member_role(
  p_group_id uuid,
  p_member_group_id uuid,
  p_group_role_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_target_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role assignment is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'assign_roles'), false) then
    raise exception 'not permitted to assign roles' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);
  -- Ghost and foreign role ids resolve identically (no-leak).
  if not exists (
    select 1 from public.group_roles gr
     where gr.id = p_group_role_id and gr.group_id = p_group_id
  ) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_target_status is distinct from 'active' then
    raise exception 'target is not an active member of the group' using errcode = '22023';
  end if;

  -- Assignment-time anti-escalation: the existing PC-3 primitive, surfaced.
  if not coalesce(public.can_assign_role(v_actor, p_group_id, p_group_role_id), false) then
    raise exception 'cannot assign a role granting permissions you do not hold'
      using errcode = '42501';
  end if;

  -- Duplicate binding surfaces 23505; notify_role_assigned writes the
  -- durable notification row (existing trigger — not duplicated here).
  insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (p_member_group_id, p_group_id, p_group_role_id, v_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_member_role — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.remove_member_role(
  p_group_id uuid,
  p_member_group_id uuid,
  p_group_role_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_binding_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role removal is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'remove_roles'), false) then
    raise exception 'not permitted to remove roles' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);

  select ugr.id into v_binding_id
    from public.user_group_roles ugr
   where ugr.group_id = p_group_id
     and ugr.member_group_id = p_member_group_id
     and ugr.group_role_id = p_group_role_id;
  if v_binding_id is null then
    raise exception 'role binding not found' using errcode = 'P0002';
  end if;

  -- prevent_last_leader_removal / prevent_last_deusex_role_removal refuse
  -- here with their own P0001 exceptions — surfaced verbatim, never
  -- pre-checked-and-hidden. notify_role_removed writes the durable row.
  delete from public.user_group_roles where id = v_binding_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_group_role — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.create_group_role(
  p_group_id uuid,
  p_name text,
  p_description text default null,
  p_role_template_id uuid default null,
  p_permissions text[] default null
) returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_name text;
  v_perm text;
  v_role_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);
  if p_name is null or btrim(p_name) = '' then
    raise exception 'role name required' using errcode = '22023';
  end if;
  v_name := btrim(p_name);

  if p_role_template_id is not null then
    -- Template path: grants are trigger-copied; an explicit list is a
    -- contradiction, not a merge.
    if p_permissions is not null then
      raise exception 'choose a template or an explicit permission list, not both'
        using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.role_templates rt where rt.id = p_role_template_id
    ) then
      raise exception 'role template not found' using errcode = 'P0002';
    end if;
    insert into public.group_roles (group_id, name, description, created_from_role_template_id)
    values (p_group_id, v_name, p_description, p_role_template_id)
    returning id into v_role_id;
    -- copy_template_permissions materialises the grants; never copy twice.
    return v_role_id;
  end if;

  -- Custom path. Refuse names the copy trigger would auto-link (see header):
  if exists (
    select 1 from public.role_templates rt where rt.name = v_name || ' Role Template'
  ) then
    raise exception 'role name is reserved by a role template — instantiate the template instead'
      using errcode = '22023';
  end if;

  -- Definition-time anti-escalation (the grp_insert predicate, Open Q4):
  -- every requested grant must exist in the catalog AND be held by the author.
  foreach v_perm in array coalesce(p_permissions, array[]::text[]) loop
    if not exists (select 1 from public.permissions p where p.name = v_perm) then
      raise exception 'unknown permission: %', v_perm using errcode = '22023';
    end if;
    if not coalesce(public.has_permission(v_actor, p_group_id, v_perm), false) then
      raise exception 'cannot grant a permission you do not hold: %', v_perm
        using errcode = '42501';
    end if;
  end loop;

  insert into public.group_roles (group_id, name, description)
  values (p_group_id, v_name, p_description)
  returning id into v_role_id;

  insert into public.group_role_permissions (group_role_id, permission_id)
  select v_role_id, p.id
    from public.permissions p
   where p.name = any(coalesce(p_permissions, array[]::text[]));

  return v_role_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_group_role — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.update_group_role(
  p_group_role_id uuid,
  p_name text default null,
  p_description text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is not null then
    select * into v_group
      from public.groups g
     where g.id = v_role.group_id and g.group_type = 'engagement';
    select (gm.status = 'active') into v_is_member
      from public.group_memberships gm
     where gm.group_id = v_role.group_id and gm.member_group_id = v_actor;
    v_is_member := coalesce(v_is_member, false);
  end if;
  -- Ghost role, foreign private group, or non-engagement scope: one P0002.
  if v_role.id is null or v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_role.group_id, v_actor);
  if p_name is not null and btrim(p_name) = '' then
    raise exception 'role name required' using errcode = '22023';
  end if;

  -- Partial update: null = leave unchanged. Duplicate names surface 23505.
  update public.group_roles set
    name        = coalesce(btrim(p_name), name),
    description = coalesce(p_description, description)
  where id = p_group_role_id;

  return public.role_fabric_entry(p_group_role_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_group_role — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.delete_group_role(p_group_role_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is not null then
    select * into v_group
      from public.groups g
     where g.id = v_role.group_id and g.group_type = 'engagement';
    select (gm.status = 'active') into v_is_member
      from public.group_memberships gm
     where gm.group_id = v_role.group_id and gm.member_group_id = v_actor;
    v_is_member := coalesce(v_is_member, false);
  end if;
  if v_role.id is null or v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_role.group_id, v_actor);
  -- The RLS delete rule (created_from_role_template_id IS NULL) carried into
  -- the contract as an explicit refusal rather than a silent zero-row delete.
  if v_role.created_from_role_template_id is not null then
    raise exception 'template-derived role instances cannot be deleted' using errcode = '42501';
  end if;
  -- Open Q3 default: refuse while held — unbinding is explicit, never cascade.
  if exists (
    select 1 from public.user_group_roles ugr where ugr.group_role_id = p_group_role_id
  ) then
    raise exception 'role is held by members — remove the role from all holders first'
      using errcode = 'P0001';
  end if;

  delete from public.group_roles where id = p_group_role_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_group_role_permission — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.set_group_role_permission(
  p_group_role_id uuid,
  p_permission_name text,
  p_granted boolean
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_perm_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is not null then
    select * into v_group
      from public.groups g
     where g.id = v_role.group_id and g.group_type = 'engagement';
    select (gm.status = 'active') into v_is_member
      from public.group_memberships gm
     where gm.group_id = v_role.group_id and gm.member_group_id = v_actor;
    v_is_member := coalesce(v_is_member, false);
  end if;
  if v_role.id is null or v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_role.group_id, v_actor);

  select p.id into v_perm_id from public.permissions p where p.name = p_permission_name;
  if v_perm_id is null then
    raise exception 'unknown permission: %', p_permission_name using errcode = '22023';
  end if;

  if p_granted then
    -- Definition-time anti-escalation (Open Q4 predicate) on the grant path.
    if not coalesce(public.has_permission(v_actor, v_role.group_id, p_permission_name), false) then
      raise exception 'cannot grant a permission you do not hold: %', p_permission_name
        using errcode = '42501';
    end if;
    -- The substrate's grant model is row-presence (grp_insert / grp_delete;
    -- no UPDATE policy) — mirror it: upsert on grant, delete on revoke.
    insert into public.group_role_permissions (group_role_id, permission_id)
    values (p_group_role_id, v_perm_id)
    on conflict (group_role_id, permission_id) do update set granted = true;
  else
    delete from public.group_role_permissions
     where group_role_id = p_group_role_id and permission_id = v_perm_id;
  end if;

  return public.role_fabric_entry(p_group_role_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- update_group_settings — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.update_group_settings(
  p_group_id uuid,
  p_name text default null,
  p_description text default null,
  p_label text default null,
  p_is_public boolean default null,
  p_show_member_list boolean default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group settings are FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if p_name is not null and btrim(p_name) = '' then
    raise exception 'group name required' using errcode = '22023';
  end if;

  -- Per-field permission keys from the catalog (GRP-2 vs GRP-3):
  if (p_name is not null or p_description is not null or p_label is not null)
     and not coalesce(public.has_permission(v_actor, p_group_id, 'edit_group_settings'), false) then
    raise exception 'not permitted to edit group settings' using errcode = '42501';
  end if;
  if p_is_public is not null
     and not coalesce(public.has_permission(v_actor, p_group_id, 'set_group_visibility'), false) then
    raise exception 'not permitted to set group visibility' using errcode = '42501';
  end if;
  if p_show_member_list is not null
     and not coalesce(public.has_permission(v_actor, p_group_id, 'control_member_list_visibility'), false) then
    raise exception 'not permitted to control member-list visibility' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);

  -- Partial update: null = leave unchanged (clear a text field by sending '').
  -- status / group_type / created_by_group_id are deliberately not parameters.
  update public.groups set
    name             = coalesce(btrim(p_name), name),
    description      = coalesce(p_description, description),
    label            = coalesce(p_label, label),
    is_public        = coalesce(p_is_public, is_public),
    show_member_list = coalesce(p_show_member_list, show_member_list),
    updated_at       = now()
  where id = p_group_id;

  return public.get_group_detail(p_group_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- activate_member — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.activate_member(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_target_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'reactivating members is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'activate_members'), false) then
    raise exception 'activate_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_target_status is null or v_target_status not in ('active', 'paused') then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_status = 'active' then
    raise exception 'member is not paused' using errcode = 'P0001';
  end if;

  -- paused -> active. The invited->active triggers
  -- (auto_assign_member_role_on_accept, notify_invitation_accepted,
  -- auto_assign_deusex_role_on_accept) all guard on OLD.status='invited'
  -- and stay silent here; the preserved roles simply resolve again.
  update public.group_memberships
     set status = 'active', status_changed_at = now()
   where group_id = p_group_id and member_group_id = p_member_group_id;

  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  values (
    p_member_group_id,
    'participation_activated',
    'Participation Reactivated',
    'Your participation in "' || v_group.name || '" is active again.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
    p_group_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_group — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.leave_group(p_group_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_active_members integer;
  v_is_steward boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'leaving a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if not v_is_member then
    -- reachable only for visible (public+active) groups: the caller can see
    -- the group but holds no active membership to leave
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-6: resting admits leaving (the trap is sprung); the
  -- hard hold refuses; closed/archived keep their terminal refusal.
  if v_group.status = 'suspended' and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  elsif v_group.status not in ('active', 'resting') then
    raise exception 'cannot leave a group that is not active' using errcode = 'P0001';
  end if;

  -- The two G-E exits, refused honestly (nothing mutates):
  select count(*) into v_active_members
    from public.group_memberships
   where group_id = p_group_id and status = 'active';
  if v_active_members = 1 then
    -- Copy updated post-PC014: close_group exists — point at it.
    raise exception 'cannot leave: you are the group''s last member — close the group instead'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = v_actor
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_is_steward;
  if v_is_steward and public.active_steward_count(p_group_id, v_actor) = 0 then
    raise exception 'cannot leave: you are the only active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- The regular exit, in the proven order. The DS-3 enrolment disposition is now
  -- DS-3's own (ADR-U047): Core emits the fact, DS-3 owns the freeze.
  perform public.ds3_lifecycle_member_departed(p_group_id, v_actor, 'left_group');

  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = v_actor;

  -- the existing notify trigger writes member_left to the Stewards
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;

  -- DS-5 former-member attribution: pending-DS-5, NOT built (D2) — the exit
  -- writes no authorship attribution; MEM-9's forward-seam (Communication gate).
  return jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name);
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_group_as_group — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.leave_group_as_group(
  p_group_id uuid,
  p_acting_group_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_membership_id uuid;
  v_remaining integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'acting for a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Wielding precedes existence: a keyless caller learns nothing (42501
  -- whether or not the membership exists — the S5 adversarial posture).
  if not public.has_permission(v_actor, p_acting_group_id, 'act_as_group') then
    raise exception 'you do not have permission to act as this group'
      using errcode = '42501';
  end if;

  select gm.id into v_membership_id
    from public.group_memberships gm
    join public.groups g on g.id = gm.member_group_id and g.group_type = 'engagement'
   where gm.group_id = p_group_id
     and gm.member_group_id = p_acting_group_id
     and gm.status = 'active';
  if v_membership_id is null then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  -- Last-active-Steward guard (PC013/PC014 semantics): if the acting group
  -- holds the context group''s only active Steward role, exit is refused
  -- honestly — transfer first.
  if exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = p_acting_group_id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) and public.active_steward_count(p_group_id, p_acting_group_id) = 0 then
    raise exception 'this group is the last active Steward — transfer stewardship first'
      using errcode = 'P0001';
  end if;

  -- Last-member guard: an exit that empties the group is Close''s business
  -- (MEM-8), and Close is a member-facing act — refused honestly here.
  select count(*) into v_remaining
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.status = 'active'
     and gm.member_group_id <> p_acting_group_id;
  if v_remaining = 0 then
    raise exception 'the last member cannot leave — close the group instead'
      using errcode = 'P0001';
  end if;

  -- Freeze the acting group's enrolments in the context group's non-public
  -- journeys. DS-3's own disposition now (ADR-U047): the 'left_as_group' fact
  -- carries the pc015 divergence (status <> 'frozen'; frozen_reason='left_group').
  perform public.ds3_lifecycle_member_departed(p_group_id, p_acting_group_id, 'left_as_group');

  delete from public.user_group_roles ugr
   where ugr.group_id = p_group_id and ugr.member_group_id = p_acting_group_id;

  delete from public.group_memberships gm
   where gm.id = v_membership_id;

  return jsonb_build_object('group_id', p_group_id, 'acting_group_id', p_acting_group_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_member — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.remove_member(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_target_status text;
  v_target_is_steward boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'removing members is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'remove_members'), false) then
    raise exception 'remove_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  if p_member_group_id = v_actor then
    raise exception 'cannot remove yourself — leaving is the self-exit path'
      using errcode = 'P0001';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  -- active OR paused rows are removable (the dropped RLS policy allowed only
  -- active); invited rows are invitation territory (cancel), absent is absent —
  -- both P0002, indistinguishably.
  if v_target_status is null or v_target_status not in ('active', 'paused') then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  -- Last-active-Steward guard: a paused Steward's surviving role row is NOT
  -- cover (the raw-role-count trigger would accept it; the contract refuses).
  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = p_member_group_id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_target_is_steward;
  if v_target_is_steward
     and public.active_steward_count(p_group_id, p_member_group_id) = 0 then
    raise exception 'cannot remove the last active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- Cascade, in the proven order (the sprint2 regular-leave shape):
  -- (a) freeze the target's active enrolments in this group's non-public
  --     journeys — the removal twin of 'left_group'. DS-3's own disposition now
  --     (ADR-U047): Core emits the fact, DS-3 owns the freeze.
  perform public.ds3_lifecycle_member_departed(p_group_id, p_member_group_id, 'removed_from_group');

  -- (b) roles — the raw RLS path orphaned these; the existing trigger walls
  --     (check_last_leader_removal + DeusEx siblings) fire beneath our guard
  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = p_member_group_id;

  -- (c) membership — the existing notify trigger writes the durable
  --     member_removed row to the target (actor != member branch)
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = p_member_group_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- pause_member — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.pause_member(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_target_status text;
  v_target_is_steward boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'pausing members is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'pause_members'), false) then
    raise exception 'pause_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  if p_member_group_id = v_actor then
    raise exception 'cannot pause yourself — leaving is the self-exit path'
      using errcode = 'P0001';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_target_status is null or v_target_status not in ('active', 'paused') then
    -- absent, invited, or vestigial states: indistinguishable (no leak)
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_status = 'paused' then
    raise exception 'member is already paused' using errcode = 'P0001';
  end if;

  -- Headless-group guard: the BEFORE DELETE trigger cannot catch a status
  -- flip — refuse pausing the last ACTIVE Steward here, contract-side.
  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = p_member_group_id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_target_is_steward;
  if v_target_is_steward
     and public.active_steward_count(p_group_id, p_member_group_id) = 0 then
    raise exception 'cannot pause the last active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- The flip. Roles rows are untouched: permission darkness is
  -- has_permission()'s existing status filter; reactivation restores them.
  update public.group_memberships
     set status = 'paused', status_changed_at = now()
   where group_id = p_group_id and member_group_id = p_member_group_id;

  -- Durable notification row (V3 — durable state; push rides A-NTF later).
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  values (
    p_member_group_id,
    'participation_paused',
    'Participation Paused',
    'Your participation in "' || v_group.name || '" has been paused.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
    p_group_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- withdraw_from_journey — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_from_journey(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_enr public.journey_enrollments%rowtype;
  v_visible boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'withdrawal is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is not null then
    v_visible := (v_enr.group_id = v_actor) or exists (
      select 1 from public.group_memberships gm
       where gm.group_id = v_enr.group_id
         and gm.member_group_id = v_actor
         and gm.status = 'active');
  end if;
  if v_enr.id is null or not v_visible then
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = v_enr.group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  if v_enr.status = 'frozen' then
    raise exception 'enrollment is frozen' using errcode = 'P0001';
  end if;
  -- FEAT-PD003 Q1: repeat withdrawal is a refusal, not a churned no-op.
  if v_enr.status = 'withdrawn' then
    raise exception 'already withdrawn' using errcode = 'P0001';
  end if;

  if v_enr.group_id <> v_actor then
    if not coalesce(public.has_permission(v_actor, v_enr.group_id,
                                          'unenroll_from_journey'), false) then
      raise exception 'not permitted to withdraw this group' using errcode = '42501';
    end if;
  end if;

  -- FEAT-PD003 Q1: terminal status instead of row deletion — step-instances
  -- (lived developmental history) survive; ADR-U031 erasure still deletes
  -- the row and cascades.
  update public.journey_enrollments
     set status = 'withdrawn',
         status_changed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'journey_id', v_enr.journey_id,
    'group_id', v_enr.group_id,
    'withdrawn', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- decline_group_invitation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.decline_group_invitation(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_deleted integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'declining is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  delete from public.group_memberships
   where group_id = p_group_id
     and member_group_id = v_actor
     and status = 'invited';
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'no pending invitation' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_member_invitation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_member_invitation(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_deleted integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'cancelling invitations is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  delete from public.group_memberships
   where group_id = p_group_id
     and member_group_id = p_member_group_id
     and status = 'invited';
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_email_invitation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_email_invitation(p_invitation_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group_id uuid;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'cancelling invitations is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select pei.group_id into v_group_id
    from public.pending_email_invitations pei
   where pei.id = p_invitation_id and pei.status = 'pending';
  if v_group_id is null then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  -- No-leak: a caller who cannot see the group (or lacks the permission) gets
  -- the same P0002 an absent invitation gets — an invitation id never oracles.
  select * into v_group
    from public.groups g
   where g.id = v_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = v_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active'))
     or not coalesce(public.has_permission(v_actor, v_group_id, 'invite_members'), false) then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-6: exits stay open under resting; the hard hold closes them.
  if (select g.status from public.groups g where g.id = v_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  delete from public.pending_email_invitations where id = p_invitation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_group_conversation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_group_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  -- FEAT-PC023 STORY-6: the hard hold closes even this exit.
  IF EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.groups g ON g.id = c.group_id
    WHERE c.id = p_conversation_id AND c.kind = 'group' AND g.status = 'suspended'
  ) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.conversation_participants cp
  SET left_at = NOW()
  FROM public.conversations c
  WHERE cp.conversation_id = p_conversation_id
    AND c.id = cp.conversation_id AND c.kind = 'group'
    AND cp.participant_group_id = v_me AND cp.left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant of a group conversation' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- respond_to_group_invitation — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.respond_to_group_invitation(
  p_membership_id uuid,
  p_accept boolean
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_gm public.group_memberships%rowtype;
  v_member_type text;
  v_context_status text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'answering for a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select gm.* into v_gm
    from public.group_memberships gm
   where gm.id = p_membership_id and gm.status = 'invited';
  if v_gm.id is null then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  select g.group_type into v_member_type
    from public.groups g where g.id = v_gm.member_group_id;
  -- Personal invitations answer through accept/decline_group_invitation —
  -- this contract wields GROUP invitations only (P0002: not yours to see).
  if v_member_type is distinct from 'engagement' then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  -- The ADR-U041 §1 wielding gate: the caller''s OWN standing in the invited
  -- group must carry the key. B''s Steward holds nothing here (42501).
  if not public.has_permission(v_actor, v_gm.member_group_id, 'act_as_group') then
    raise exception 'you do not have permission to act as this group'
      using errcode = '42501';
  end if;

  if p_accept then
    select g.status into v_context_status
      from public.groups g where g.id = v_gm.group_id;
    if v_context_status is distinct from 'active' then
      raise exception 'cannot join a group that is not active' using errcode = 'P0001';
    end if;
    update public.group_memberships
       set status = 'active',
           status_changed_at = now(),
           status_changed_by_group_id = v_actor
     where id = p_membership_id;
    return jsonb_build_object('membership_id', p_membership_id, 'status', 'active');
  else
    -- FEAT-PC023 STORY-6: declining is an exit — open under resting,
    -- refused under the hard hold.
    select g.status into v_context_status
      from public.groups g where g.id = v_gm.group_id;
    if v_context_status = 'suspended' and not public.is_platform_admin() then
      raise exception 'group is suspended' using errcode = 'P0001';
    end if;
    delete from public.group_memberships where id = p_membership_id;
    return jsonb_build_object('membership_id', p_membership_id, 'status', 'declined');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_group_forum — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_forum(
  p_group_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_posts JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT public.has_permission(v_me, p_group_id, 'view_forum') THEN
    RAISE EXCEPTION 'view_forum required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  IF (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_posts
  FROM (
    SELECT
      t.created_at AS sort_ts,
      jsonb_build_object(
        'id', t.id,
        'parent_post_id', NULL,
        'content', CASE WHEN t.is_deleted THEN NULL ELSE t.content END,
        'is_deleted', t.is_deleted,
        'created_at', t.created_at,
        'updated_at', t.updated_at,
        'author_group_id', t.author_group_id,
        'author', public.ds5_resolve_author_display(t.author_group_id, p_group_id),
        'replies', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', r.id,
            'parent_post_id', r.parent_post_id,
            'content', CASE WHEN r.is_deleted THEN NULL ELSE r.content END,
            'is_deleted', r.is_deleted,
            'created_at', r.created_at,
            'updated_at', r.updated_at,
            'author_group_id', r.author_group_id,
            'author', public.ds5_resolve_author_display(r.author_group_id, p_group_id),
            'replies', '[]'::jsonb
          ) ORDER BY r.created_at ASC), '[]'::jsonb)
          FROM public.forum_posts r
          WHERE r.parent_post_id = t.id
        )
      ) AS row_doc
    FROM public.forum_posts t
    WHERE t.group_id = p_group_id
      AND t.parent_post_id IS NULL
      AND (p_before IS NULL OR t.created_at < p_before)
    ORDER BY t.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('posts', v_posts);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_group_announcements — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_announcements(
  p_group_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_list JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT public.is_active_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Group membership required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  IF (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_list
  FROM (
    SELECT a.created_at AS sort_ts,
           jsonb_build_object(
             'id', a.id, 'title', a.title, 'body', a.body,
             'created_at', a.created_at, 'author_group_id', a.author_group_id,
             'author', public.ds5_resolve_author_display(a.author_group_id, p_group_id)
           ) AS row_doc
    FROM public.announcements a
    WHERE a.scope_kind = 'community'
      AND a.scope_group_id = p_group_id
      AND a.retracted_at IS NULL
      AND (p_before IS NULL OR a.created_at < p_before)
    ORDER BY a.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('announcements', v_list);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_group_conversations — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_conversations(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_me AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  IF (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'created_at', c.created_at,
    'am_i_participant', EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
        AND cp.participant_group_id = v_me AND cp.left_at IS NULL
    )
  ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.conversations c
  WHERE c.kind = 'group' AND c.group_id = p_group_id
    AND c.sealed_at IS NULL;  -- FEAT-PD012: sealed threads are not live
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_conversation_detail — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_conversation_detail(
  p_conversation_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_conv RECORD;
  v_messages JSONB;
  v_senders JSONB;
  v_participants JSONB;
  v_my_last_read TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT c.id, c.kind, c.title, c.group_id, g.name AS group_name
  INTO v_conv
  FROM public.conversations c
  LEFT JOIN public.groups g ON g.id = c.group_id
  WHERE c.id = p_conversation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT last_read_at INTO v_my_last_read
  FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_me AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023 STORY-8: group-kind conversations are quarantined with their
  -- group below the admin plane; DMs are never held.
  IF v_conv.kind = 'group'
     AND (SELECT g.status FROM public.groups g WHERE g.id = v_conv.group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  WITH page AS (
    SELECT m.id, m.sender_group_id, m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'sender_group_id', sender_group_id,
      'content', content, 'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_messages FROM page;

  -- Display resolution for every sender in the page — the COM-14 ladder
  -- (scope = the conversation's group; NULL scope for a dm).
  SELECT COALESCE(jsonb_object_agg(
    sid::text,
    public.ds5_resolve_author_display(sid, v_conv.group_id)
  ), '{}'::jsonb)
  INTO v_senders
  FROM (
    SELECT DISTINCT m.sender_group_id AS sid
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_group_id IS NOT NULL
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'participant_group_id', cp.participant_group_id,
    'name', g.name,
    'joined_at', cp.joined_at,
    'left_at', cp.left_at,
    'is_me', cp.participant_group_id = v_me
  )), '[]'::jsonb)
  INTO v_participants
  FROM public.conversation_participants cp
  LEFT JOIN public.groups g ON g.id = cp.participant_group_id
  WHERE cp.conversation_id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_conv.id, 'kind', v_conv.kind, 'title', v_conv.title,
    'group_id', v_conv.group_id, 'group_name', v_conv.group_name,
    'messages', v_messages, 'senders', v_senders,
    'participants', v_participants, 'my_last_read_at', v_my_last_read
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- get_group_invitations — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_group_invitations(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'the pending list is FIM-only' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  -- Open Q3: the list carries third-party email addresses — invite_members only.
  if not coalesce(public.has_permission(v_actor, p_group_id, 'invite_members'), false) then
    raise exception 'invite_members permission required' using errcode = '42501';
  end if;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'group_id', v_group.id,
    'member_invitations', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'member_group_id', gm.member_group_id,
                'display_name', pg.name,
                'invited_at', gm.added_at,
                'invited_by_display_name', ib.name)
              order by gm.added_at)
         from public.group_memberships gm
         join public.groups pg on pg.id = gm.member_group_id
         left join public.groups ib on ib.id = gm.added_by_group_id
        where gm.group_id = p_group_id and gm.status = 'invited'),
      '[]'::jsonb),
    'email_invitations', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', pei.id,
                'invited_email', pei.invited_email,
                'created_at', pei.created_at,
                'expires_at', pei.expires_at,
                'expired', (pei.expires_at <= now()))
              order by pei.created_at)
         from public.pending_email_invitations pei
        where pei.group_id = p_group_id and pei.status = 'pending'),
      '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- get_group_roles — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_group_roles(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role fabric is FIM-only' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'group_id', v_group.id,
    'roles', coalesce(
      (select jsonb_agg(public.role_fabric_entry(gr.id) order by gr.created_at, gr.name)
         from public.group_roles gr where gr.group_id = p_group_id),
      '[]'::jsonb),
    'viewer', jsonb_build_object(
      'can_manage_roles',
        coalesce(public.has_permission(v_actor, p_group_id, 'manage_roles'), false),
      'can_assign_roles',
        coalesce(public.has_permission(v_actor, p_group_id, 'assign_roles'), false),
      'can_remove_roles',
        coalesce(public.has_permission(v_actor, p_group_id, 'remove_roles'), false)),
    'available_permissions', coalesce(
      (select jsonb_agg(jsonb_build_object('name', p.name, 'category', p.category)
                        order by p.category, p.name)
         from public.permissions p),
      '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- get_group_journey_progress — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_group_journey_progress(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_journey public.journeys%rowtype;
  v_can_members boolean;
  v_steps jsonb;
  v_entries jsonb;
  v_total int;
  v_sharing_count int;
  v_aggregate jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is null or not exists (
    select 1 from public.group_memberships gm
     where gm.group_id = v_enr.group_id
       and gm.member_group_id = v_actor
       and gm.status = 'active') then
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_enr.group_id, 'view_group_progress'), false) then
    raise exception 'view_group_progress required' using errcode = '42501';
  end if;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  if (select g.status from public.groups g where g.id = v_enr.group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  v_can_members := coalesce(public.has_permission(v_actor, v_enr.group_id, 'view_others_progress'), false);

  select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

  -- Step skeleton only: order/title/required. No content, no duration, no
  -- timestamps (Q5).
  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'step_id', st.id,
              'step_order', st.step_order,
              'title', st.title,
              'required', st.required)
            order by st.step_order)
       from public.journey_steps st
      where st.journey_id = v_enr.journey_id),
    '[]'::jsonb);

  -- Roster + per-member (consent-shaped, permission-grained).
  with members as (
    select gm.member_group_id, pg.name as display_name
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = v_enr.group_id
       and gm.status = 'active'
  ), decided as (
    select m.member_group_id, m.display_name,
           coalesce(l.decision = 'granted', false) as sharing
      from members m
      left join lateral (
        select cr.decision
          from public.consent_records cr
         where cr.subject_group_id = m.member_group_id
           and cr.purpose = 'journey_progress_visibility'
           and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
         order by cr.captured_at desc, cr.id desc
         limit 1) l on true
  )
  select
    count(*)::int,
    (count(*) filter (where d.sharing))::int,
    coalesce(jsonb_agg(
      case
        when d.sharing and v_can_members then
          jsonb_build_object(
            'member_group_id', d.member_group_id,
            'display_name', d.display_name,
            'sharing', true,
            'traveller_completed', p.traveller_completed,
            'required_completed', p.required_completed,
            'required_total', p.required_total,
            'per_step', p.per_step)
        when d.sharing then
          jsonb_build_object(
            'member_group_id', d.member_group_id,
            'display_name', d.display_name,
            'sharing', true)
        else
          jsonb_build_object(
            'member_group_id', d.member_group_id,
            'display_name', d.display_name,
            'sharing', false)
      end
      order by d.display_name collate "C" asc, d.member_group_id asc), '[]'::jsonb)
    into v_total, v_sharing_count, v_entries
    from decided d
    left join lateral (
      select
        (count(*) filter (where st.required and done.completed))::int as required_completed,
        (count(*) filter (where st.required))::int as required_total,
        (count(*) filter (where st.required and not done.completed)) = 0 as traveller_completed,
        coalesce(jsonb_agg(jsonb_build_object(
                   'step_id', st.id,
                   'completed', done.completed)
                 order by st.step_order), '[]'::jsonb) as per_step
        from public.journey_steps st
        cross join lateral (
          select exists (
            select 1 from public.journey_step_instances i
             where i.enrollment_id = p_enrollment_id
               and i.traveller_group_id = d.member_group_id
               and i.step_id = st.id
               and i.completed_at is not null) as completed
        ) done
       where st.journey_id = v_enr.journey_id
    ) p on true;

  -- Aggregate: per-step completed counts over SHARING members only (Q4), the
  -- basis served alongside. (The sharing set is recomputed here — STABLE
  -- function, single snapshot, bounded by party size.)
  v_aggregate := jsonb_build_object(
    'per_step', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'step_id', st.id,
                'completed_count', cnt.n)
              order by st.step_order)
         from public.journey_steps st
         cross join lateral (
           select count(distinct i.traveller_group_id)::int as n
             from public.journey_step_instances i
            where i.enrollment_id = p_enrollment_id
              and i.step_id = st.id
              and i.completed_at is not null
              and i.traveller_group_id in (
                select d2.member_group_id
                  from (select gm.member_group_id,
                               coalesce(l2.decision = 'granted', false) as sharing
                          from public.group_memberships gm
                          left join lateral (
                            select cr.decision
                              from public.consent_records cr
                             where cr.subject_group_id = gm.member_group_id
                               and cr.purpose = 'journey_progress_visibility'
                               and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
                             order by cr.captured_at desc, cr.id desc
                             limit 1) l2 on true
                         where gm.group_id = v_enr.group_id
                           and gm.status = 'active') d2
                 where d2.sharing)
         ) cnt
        where st.journey_id = v_enr.journey_id),
      '[]'::jsonb),
    'basis', 'sharing-members');

  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'journey', jsonb_build_object('id', v_journey.id, 'title', v_journey.title),
    'status', v_enr.status,
    'steps', v_steps,
    'members', v_entries,
    'members_meta', jsonb_build_object('total', v_total, 'sharing', v_sharing_count),
    'aggregate', v_aggregate);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_group_enrollment_summary — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_group_enrollment_summary(
  p_group_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_items jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group enrollment summary is FIM-only' using errcode = '42501';
  end if;

  if not public._journey_party_visible(v_actor, p_group_id) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  if (select g.status from public.groups g where g.id = p_group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  v_items := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'enrollment_id', e.id,   -- FEAT-PD005 rider: the Progress panel's key
              'journey_id', e.journey_id,
              'title', j.title,
              'status', e.status)
            order by e.enrolled_at desc, e.id asc)
       from public.journey_enrollments e
       join public.journeys j on j.id = e.journey_id
      where e.group_id = p_group_id),
    '[]'::jsonb);

  return jsonb_build_object(
    'count', jsonb_array_length(v_items),
    'enrollments', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_player_state — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_player_state(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_journey public.journeys%rowtype;
  v_steps jsonb;
  v_instances jsonb;
  v_resume uuid;
  v_traveller_completed boolean;
  v_traveller_completed_at timestamptz;
  v_timing_per_step jsonb;
  v_total_seconds bigint;
  v_sharing boolean;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  -- FEAT-PD005 Q9: read standing (lived-record arm for frozen walks).
  v_enr := public._enrollment_traveller_read_standing(v_actor, p_enrollment_id);
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  if (select g.status from public.groups g where g.id = v_enr.group_id) = 'suspended'
     and not public.is_platform_admin() then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;

  select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

  -- Full step rows INCLUDING content payloads — the traveller is enrolled;
  -- this is the one read designed to boot the player in a single round trip.
  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'id', st.id,
              'step_order', st.step_order,
              'title', st.title,
              'kind', st.step_kind_key,
              'family', st.content_family_key,
              'ask_verb', k.ask_verb,
              -- FEAT-PD007 delta: the capture set, registry-served.
              'captures_response', k.captures_response,
              'required', st.required,
              'repeatable', st.repeatable,
              'duration_minutes', st.duration_minutes,
              'content', st.content)
            order by st.step_order)
       from public.journey_steps st
       join public.step_kinds k on k.key = st.step_kind_key
      where st.journey_id = v_enr.journey_id),
    '[]'::jsonb);

  -- The CALLER's instances only (invariant 4: traveller-own; the J-D
  -- consent-gated Steward/Guide read is get_group_journey_progress —
  -- a separate contract, as FEAT-PD004 promised).
  v_instances := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'instance_id', i.id,
              'step_id', i.step_id,
              'created_at', i.created_at,
              'completed_at', i.completed_at,
              -- FEAT-PD007 delta: the traveller's own words on their own read.
              'response', i.response,
              'response_updated_at', i.response_updated_at)
            order by i.created_at asc, i.id asc)
       from public.journey_step_instances i
      where i.enrollment_id = p_enrollment_id
        and i.traveller_group_id = v_actor),
    '[]'::jsonb);

  -- Q6 resume pointer: latest open engagement, else the first step lacking a
  -- completed instance, else the last step.
  select i.step_id into v_resume
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.completed_at is null
   order by i.created_at desc, i.id desc
   limit 1;
  if v_resume is null then
    select st.id into v_resume
      from public.journey_steps st
     where st.journey_id = v_enr.journey_id
       and not exists (select 1 from public.journey_step_instances i
                        where i.enrollment_id = p_enrollment_id
                          and i.traveller_group_id = v_actor
                          and i.step_id = st.id
                          and i.completed_at is not null)
     order by st.step_order asc
     limit 1;
  end if;
  if v_resume is null then
    select st.id into v_resume
      from public.journey_steps st
     where st.journey_id = v_enr.journey_id
     order by st.step_order desc
     limit 1;
  end if;

  -- FEAT-PD004 STORY-5/6: traveller-grain completion (derived; matches the
  -- complete_journey_step detection predicate; vacuously true for a journey
  -- with zero required steps) + the completion moment (last required step's
  -- first completion).
  select (count(*) filter (where done.first_completed_at is null)) = 0,
         max(done.first_completed_at)
    into v_traveller_completed, v_traveller_completed_at
    from public.journey_steps st
    left join lateral (
      select min(i.completed_at) as first_completed_at
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = st.id
         and i.completed_at is not null
    ) done on true
   where st.journey_id = v_enr.journey_id
     and st.required = true;
  v_traveller_completed := coalesce(v_traveller_completed, true);
  if not v_traveller_completed then
    v_traveller_completed_at := null;
  end if;

  -- FEAT-PD004 Q5: timing derives from completed engagements only (an open
  -- engagement is not time spent — walking away costs nothing); per-step sums
  -- across engagements (repeatables accrue); total = the per-step sum;
  -- wall-clock span served separately, never conflated.
  v_timing_per_step := coalesce(
    (select jsonb_agg(jsonb_build_object('step_id', t.step_id,
                                         'seconds', t.seconds)
                      order by t.step_order)
       from (select i.step_id, st.step_order,
                    floor(sum(extract(epoch from (i.completed_at - i.created_at))))::bigint
                      as seconds
               from public.journey_step_instances i
               join public.journey_steps st on st.id = i.step_id
              where i.enrollment_id = p_enrollment_id
                and i.traveller_group_id = v_actor
                and i.completed_at is not null
              group by i.step_id, st.step_order) t),
    '[]'::jsonb);
  select coalesce(floor(sum(extract(epoch from (i.completed_at - i.created_at)))), 0)::bigint
    into v_total_seconds
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.completed_at is not null;

  -- FEAT-PD005 STORY-5: the traveller's OWN latest sharing decision for THIS
  -- enrolment (latest-wins over the append-only ledger). Solo walks: nothing
  -- to share to — available = false, sharing = false.
  if v_enr.group_id <> v_actor then
    select (cr.decision = 'granted') into v_sharing
      from public.consent_records cr
     where cr.subject_group_id = v_actor
       and cr.purpose = 'journey_progress_visibility'
       and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
     order by cr.captured_at desc, cr.id desc
     limit 1;
  end if;
  v_sharing := coalesce(v_sharing, false);

  -- FEAT-PD004 Q6 / FEAT-PD005 Q7 / FEAT-PD007: additive keys only — every
  -- pre-existing key byte-identical (red-suite pinned each cycle).
  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'status', v_enr.status,
    'sequencing_mode', v_journey.sequencing_mode,
    'journey', jsonb_build_object(
      'id', v_journey.id,
      'title', v_journey.title,
      'description', v_journey.description,
      -- FEAT-PD007 delta: the journey-level authored closing word (the J-E
      -- seed finally served; ADR-U046 §4).
      'takeaway', v_journey.takeaway),
    'steps', v_steps,
    'instances', v_instances,
    'resume_step_id', v_resume,
    'completion', jsonb_build_object(
      'traveller_completed', v_traveller_completed,
      'traveller_completed_at', v_traveller_completed_at,
      'enrollment_status', v_enr.status,
      'enrollment_completed_at', v_enr.completed_at),
    'timing', jsonb_build_object(
      'per_step', v_timing_per_step,
      'total_seconds', v_total_seconds,
      'wall_clock', jsonb_build_object(
        'enrolled_at', v_enr.enrolled_at,
        'completed_at', v_enr.completed_at)),
    'freeze', case when v_enr.status = 'frozen'
                   then jsonb_build_object(
                          'reason', v_enr.progress_data->>'frozen_reason',
                          'frozen_at', v_enr.progress_data->>'frozen_at')
                   else null end,
    'progress_sharing', jsonb_build_object(
      'available', v_enr.group_id <> v_actor,
      'sharing', v_sharing));
end;
$$;

-- ---------------------------------------------------------------------------
-- get_my_conversations — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC NULLS LAST), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      c.last_message_at AS sort_ts,
      jsonb_build_object(
        'id', c.id,
        'kind', c.kind,
        'title', c.title,
        'group_id', c.group_id,
        'group_name', gg.name,
        'other_participant_name', (
          SELECT g2.name
          FROM public.conversation_participants cp2
          JOIN public.groups g2 ON g2.id = cp2.participant_group_id
          WHERE cp2.conversation_id = c.id
            AND cp2.participant_group_id <> v_me
          LIMIT 1
        ),
        'last_message_at', c.last_message_at,
        'has_unread', EXISTS (
          SELECT 1 FROM public.messages m
          WHERE m.conversation_id = c.id
            AND m.created_at > cp.last_read_at
            AND m.sender_group_id IS DISTINCT FROM v_me
        )
      ) AS row_doc
    FROM public.conversation_participants cp
    JOIN public.conversations c ON c.id = cp.conversation_id
    LEFT JOIN public.groups gg ON gg.id = c.group_id
    WHERE cp.participant_group_id = v_me
      AND cp.left_at IS NULL
      AND c.sealed_at IS NULL  -- FEAT-PD012: sealed threads leave the live inbox
      -- FEAT-PC023 STORY-8: suspended group conversations leave the inbox
      -- below the admin plane (they return whole on restore).
      AND (public.is_platform_admin()
           OR NOT (c.kind = 'group' AND EXISTS (
                SELECT 1 FROM public.groups gx
                WHERE gx.id = c.group_id AND gx.status = 'suspended')))
  ) rows;
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_my_enrollments — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_enrollments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  return coalesce(
    (select jsonb_agg(t.entry order by t.enrolled_at desc, t.entry_id asc)
       from (
         select e.id as entry_id, e.enrolled_at,
                jsonb_build_object(
                  'enrollment_id', e.id,
                  'kind', 'individual',
                  'journey_id', e.journey_id,
                  'journey_title', j.title,
                  'status', e.status,
                  'last_accessed_at', e.last_accessed_at) as entry
           from public.journey_enrollments e
           join public.journeys j on j.id = e.journey_id
          where e.group_id = v_actor
            and e.status <> 'withdrawn'   -- FEAT-PD003 Q1 delta
         union all
         select e.id as entry_id, e.enrolled_at,
                jsonb_build_object(
                  'enrollment_id', e.id,
                  'kind', 'via_group',
                  'journey_id', e.journey_id,
                  'journey_title', j.title,
                  'status', e.status,
                  'last_accessed_at', e.last_accessed_at,
                  'group_id', g.id,
                  'group_name', g.name,
                  -- FEAT-PC023 STORY-8: the row carries the hold label
                  'group_status', g.status) as entry
           from public.journey_enrollments e
           join public.journeys j on j.id = e.journey_id
           join public.groups g on g.id = e.group_id
          where e.group_id <> v_actor
            and e.status <> 'withdrawn'   -- FEAT-PD003 Q1 delta
            and (
              exists (select 1 from public.group_memberships gm
                       where gm.group_id = e.group_id
                         and gm.member_group_id = v_actor
                         and gm.status = 'active')
              -- FEAT-PD005 Q9: lived-record arm — frozen walks only.
              or (e.status = 'frozen' and exists (
                    select 1 from public.journey_step_instances i
                     where i.enrollment_id = e.id
                       and i.traveller_group_id = v_actor))
            )
       ) t),
    '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_group_detail — re-issued in place (COR-A pattern: signature byte-identical,
-- ACL preserved by create-or-replace); FEAT-PC023 amendment inline.
-- ---------------------------------------------------------------------------
create or replace function public.get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_is_invited boolean := false;
  v_wields_member boolean := false;
  v_joined_at timestamptz;
  v_can_manage boolean;
  v_can_view_members boolean;
  v_can_manage_members boolean;
  v_members jsonb;
  v_result jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group detail is FIM-only' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';

  select (gm.status = 'active'), (gm.status = 'invited'), gm.added_at
    into v_is_member, v_is_invited, v_joined_at
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  v_is_invited := coalesce(v_is_invited, false);

  -- Revealed-visibility wielder case, checked only when the cheap doors
  -- refuse: does the caller wield an ACTIVE member-group of this group?
  if v_group.id is not null
     and not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    select exists (
      select 1
        from public.group_memberships host
        join public.group_memberships mine
          on mine.group_id = host.member_group_id
         and mine.member_group_id = v_actor
         and mine.status = 'active'
        join public.user_group_roles ugr
          on ugr.group_id = host.member_group_id
         and ugr.member_group_id = v_actor
        join public.group_role_permissions grp on grp.group_role_id = ugr.group_role_id
        join public.permissions p on p.id = grp.permission_id
       where host.group_id = p_group_id
         and host.status = 'active'
         and p.name = 'act_as_group'
    ) into v_wields_member;
  end if;

  -- Members see their group in any lifecycle state (GRP-5); non-members see
  -- public groups only while active; the revealed cases open the face —
  -- own-invited (active groups only) and wields-an-active-member (any state,
  -- a member's standing carried by substitution). Anything else is P0002 —
  -- private and absent stay indistinguishable (no leak).
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or (v_is_invited and v_group.status = 'active')
             or v_wields_member) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  -- FEAT-PC023 STORY-7: found, labeled, and that's it — the suspended
  -- minimal payload below the admin plane (id, name, status only).
  if v_group.status = 'suspended' and not public.is_platform_admin() then
    return jsonb_build_object(
      'id', v_group.id, 'name', v_group.name, 'status', v_group.status);
  end if;

  v_can_manage := coalesce(
    public.has_permission(v_actor, p_group_id, 'edit_group_settings'), false);
  -- FEAT-PC013 (Open Q3): paused rows render only for viewers holding a
  -- member-management key — membership state is FIM data (PC-3 Privacy note).
  v_can_manage_members :=
       coalesce(public.has_permission(v_actor, p_group_id, 'pause_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'activate_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'remove_members'), false);
  -- Management keys imply member-list visibility (you cannot manage what you
  -- cannot see) — surfaced by the minimal-permission pauser persona at build.
  v_can_view_members := coalesce(
      public.has_permission(v_actor, p_group_id, 'view_member_list'), false)
    or v_can_manage_members
    or (v_group.is_public and v_group.show_member_list and v_group.status = 'active');

  v_result := jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'status', v_group.status,
    'is_public', v_group.is_public,
    'show_member_list', v_group.show_member_list,
    'created_at', v_group.created_at,
    'member_count', (select count(*) from public.group_memberships gm2
                      where gm2.group_id = p_group_id and gm2.status = 'active'),
    -- FEAT-PC015 additive key (ADR-U041 §5): active members that are not
    -- system groups — the count affordances key on (Close for the last
    -- non-system member; the caretaker is never load-bearing in copy).
    'non_system_member_count', (select count(*)
                                  from public.group_memberships gm3
                                  join public.groups mg on mg.id = gm3.member_group_id
                                 where gm3.group_id = p_group_id
                                   and gm3.status = 'active'
                                   and mg.group_type <> 'system'),
    'viewer', jsonb_build_object(
      'is_member', v_is_member,
      'joined_at', v_joined_at,
      'can_manage_settings', v_can_manage)
  );

  if v_can_view_members then
    -- Display identity resolves from the member's (personal) group name —
    -- never full_name (B-DISP oracle). FEAT-PC011 additive keys:
    -- member_group_id + roles[]. FEAT-PC013 additive key: membership_status
    -- ('active' | 'paused'); paused rows appear only when v_can_manage_members.
    -- FEAT-PC015 additive key (ADR-U041 §5, Open Q5): member_group_type —
    -- the member group''s raw group_type (open set, no mapped enum).
    select coalesce(jsonb_agg(jsonb_build_object(
             'display_name', pg.name,
             'joined_at', gm.added_at,
             'member_group_id', gm.member_group_id,
             'membership_status', gm.status,
             'member_group_type', pg.group_type,
             'roles', coalesce(
               (select jsonb_agg(gr.name order by gr.name)
                  from public.user_group_roles ugr
                  join public.group_roles gr on gr.id = ugr.group_role_id
                 where ugr.group_id = p_group_id
                   and ugr.member_group_id = gm.member_group_id),
               '[]'::jsonb))
             order by gm.added_at), '[]'::jsonb)
      into v_members
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = p_group_id
       and (gm.status = 'active'
            or (gm.status = 'paused' and v_can_manage_members));
    v_result := v_result || jsonb_build_object('members', v_members);
  end if;

  return v_result;
end;
$$;

-- ============================================================================
-- 5. get_member_groups — the additive status column (FEAT-PC023 STORY-7:
--    held groups stay listed, now labeled). RETURNS TABLE means the return
--    type changes: create-or-replace cannot alter it, so drop + recreate +
--    re-issue the grants explicitly (the ACL does NOT survive a drop).
-- ============================================================================
drop function public.get_member_groups();

create function public.get_member_groups()
returns table (
  id uuid,
  name text,
  description text,
  label text,
  is_public boolean,
  created_at timestamptz,
  member_count bigint,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_personal_group_id uuid;
begin
  v_personal_group_id := public.get_current_personal_group_id();
  if v_personal_group_id is null then
    return;
  end if;

  return query
    select
      g.id,
      g.name,
      g.description,
      g.label,
      g.is_public,
      g.created_at,
      (select count(*)
         from public.group_memberships gm2
        where gm2.group_id = g.id
          and gm2.status = 'active')::bigint as member_count,
      -- FEAT-PC023: the one additive key — resting and suspended rows stay
      -- present (memberships survive every hold) and carry their label.
      g.status
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where gm.member_group_id = v_personal_group_id
      and gm.status = 'active'
      and g.group_type = 'engagement'
    order by g.created_at;
end;
$$;

comment on function public.get_member_groups() is
  'GRP-4 contract, FEAT-PC023 amendment: + status (additive; labels the two holds). SECURITY DEFINER: own-scoped list composed across RLS.';

revoke all on function public.get_member_groups() from public, anon;
grant execute on function public.get_member_groups() to authenticated, service_role;

-- ============================================================================
-- 6. is_conversation_participant — the conversations-family chokepoint gains
--    the not-suspended arm (FEAT-PC023 STORY-8, finding 5: SELECT is live on
--    RLS for the family, so quarantine cannot be contract-only). One
--    amendment closes conversations / messages / conversation_participants.
--    An admin who IS a participant keeps reading; non-participant admins gain
--    nothing (admin reads ride the definer contracts, not this predicate).
-- ============================================================================
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and participant_group_id = public.get_current_personal_group_id()
      and left_at is null
  )
  and (
    public.is_platform_admin()
    or not exists (
      select 1
        from public.conversations c
        join public.groups g on g.id = c.group_id
       where c.id = p_conversation_id
         and c.kind = 'group'
         and g.status = 'suspended'
    )
  );
$$;
-- ============================================================================
-- 7. The state-transition contracts.
--    Member plane: rest_group() / wake_group() — symmetric, permission-gated
--    by the rest_group key, telemetry-mirror only (NO admin-audit row: the
--    close/delete precedent). Admin plane: thin audited wrappers composing
--    the member contracts (the ADM-18 idiom) + the amended suspend ceremony.
--    Every transition touching 'suspended' is admin-only; there is no direct
--    suspended -> resting move (reactivate first, then rest).
-- ============================================================================

create or replace function public.rest_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'resting a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement'
     for update;
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or public.is_platform_admin()) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not (coalesce(public.has_permission(v_actor, p_group_id, 'rest_group'), false)
          or public.is_platform_admin()) then
    raise exception 'rest_group required' using errcode = '42501';
  end if;

  -- no steward path INTO the hard state's territory: suspended refuses first
  if v_group.status = 'suspended' then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  if v_group.status = 'resting' then
    raise exception 'group is already resting' using errcode = 'P0001';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot rest a group that is not active' using errcode = 'P0001';
  end if;

  update public.groups
     set status = 'resting', updated_at = now()
   where public.groups.id = p_group_id;
end;
$$;

comment on function public.rest_group(uuid) is
  'FEAT-PC023 STORY-2: active -> resting, member plane. Gated by the rest_group permission (the key and its door share a name deliberately). Telemetry mirror only — no admin-audit row (the close/delete precedent). SECURITY DEFINER: status mutation across RLS behind visibility + permission walls.';

revoke all on function public.rest_group(uuid) from public, anon;
grant execute on function public.rest_group(uuid) to authenticated, service_role;

create or replace function public.wake_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'waking a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement'
     for update;
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or public.is_platform_admin()) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not (coalesce(public.has_permission(v_actor, p_group_id, 'rest_group'), false)
          or public.is_platform_admin()) then
    raise exception 'rest_group required' using errcode = '42501';
  end if;

  -- no steward path OUT of the hard state
  if v_group.status = 'suspended' then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  if v_group.status <> 'resting' then
    raise exception 'cannot wake a group that is not resting' using errcode = 'P0001';
  end if;

  update public.groups
     set status = 'active', updated_at = now()
   where public.groups.id = p_group_id;
end;
$$;

comment on function public.wake_group(uuid) is
  'FEAT-PC023 STORY-2: resting -> active, member plane — the symmetric half (a steward who rested their group wakes it). Suspended refuses: no steward path out of the hard state. SECURITY DEFINER: as rest_group().';

revoke all on function public.wake_group(uuid) from public, anon;
grant execute on function public.wake_group(uuid) to authenticated, service_role;

-- The admin ceremonies: thin wrappers composing the member contracts
-- (admins hold rest_group via the DeusEx auto-grant, and the member
-- contracts' walls carry an is_platform_admin arm) + durable audit rows in
-- the dotted namespace.
create or replace function public.admin_rest_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  perform public.rest_group(p_group_id);

  select g.name into v_name from public.groups g where g.id = p_group_id;
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.rest', p_group_id::text,
          jsonb_build_object('group_name', v_name));
end;
$$;

comment on function public.admin_rest_group(uuid) is
  'FEAT-PC023 STORY-9: the admin rest ceremony — composes rest_group() through the member wall (ADM-18 idiom) and writes the group.rest audit row. SECURITY DEFINER: admin-plane audit write across RLS.';

revoke all on function public.admin_rest_group(uuid) from public, anon;
grant execute on function public.admin_rest_group(uuid) to authenticated;

create or replace function public.admin_wake_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  perform public.wake_group(p_group_id);

  select g.name into v_name from public.groups g where g.id = p_group_id;
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.wake', p_group_id::text,
          jsonb_build_object('group_name', v_name));
end;
$$;

comment on function public.admin_wake_group(uuid) is
  'FEAT-PC023 STORY-9: the admin wake ceremony — composes wake_group() and writes the group.wake audit row. resting -> active only; suspended -> active stays admin_reactivate_group''s. SECURITY DEFINER: as admin_rest_group.';

revoke all on function public.admin_wake_group(uuid) from public, anon;
grant execute on function public.admin_wake_group(uuid) to authenticated;

-- admin_suspend_group amended: the hard hold now lands from active OR resting
-- (FEAT-PC020 gains a dated amendment note). Body otherwise byte-identical to
-- the shipped 20260801120000 definition; previous_status metadata already
-- records the origin.
create or replace function public.admin_suspend_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be suspended' using errcode = '22023';
  end if;
  -- FEAT-PC023: active|resting -> suspended (the two-mode amendment)
  if v_group.status not in ('active', 'resting') then
    raise exception 'cannot suspend a group that is not active or resting';
  end if;

  update public.groups
     set status = 'suspended', updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.suspend', p_group_id::text,
          jsonb_build_object('group_name', v_group.name,
                             'previous_status', v_group.status));
end;
$$;

comment on function public.admin_suspend_group(uuid) is
  'FEAT-PC020 (ADM-9), amended by FEAT-PC023: active|resting -> suspended, the hard hold. Platform-admin-gated (42501); engagement only (22023); FOR UPDATE; audit action group.suspend with previous_status. SECURITY DEFINER required: admin-plane mutation across RLS.';
-- ============================================================================
-- 8. RLS amendments — the row layer agrees with the contracts.
--    Policy names verified against live pg_policies 2026-08-03 (plain DROP,
--    not IF EXISTS: a wrong name must ERROR, never silently succeed — the
--    documented drop-policy gotcha).
-- ============================================================================

-- 8a. groups_select: labeled visibility — resting and suspended rows show
--     exactly where active rows would (FEAT-PC023 STORY-7; the substrate was
--     the inverse: non-active hidden while content stayed open).
drop policy "groups_select" on public.groups;
create policy "groups_select"
  on public.groups for select to authenticated
  using (
    -- Personal groups: always visible (identity containers, no status filter)
    group_type = 'personal'
    -- Labeled visibility: the two holds are findable wherever active is
    or (
      status in ('active', 'resting', 'suspended')
      and (
        is_public = true
        or public.is_active_group_member(id)
        or public.is_invited_group_member(id)
        or created_by_group_id = public.get_current_personal_group_id()
      )
    )
    -- Platform admins: see ALL groups regardless of status
    or public.is_platform_admin()
  );

-- 8b. forum_select: the not-suspended arm (below the admin plane).
drop policy "forum_select" on public.forum_posts;
create policy "forum_select"
  on public.forum_posts for select to authenticated
  using (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'view_forum'
    )
    and (
      public.is_platform_admin()
      or not exists (
        select 1 from public.groups g
        where g.id = group_id and g.status = 'suspended'
      )
    )
  );

-- 8c. announcements_select_community: the not-suspended arm.
drop policy "announcements_select_community" on public.announcements;
create policy "announcements_select_community"
  on public.announcements for select to authenticated
  using (
    scope_kind = 'community'
    and retracted_at is null
    and public.is_active_group_member(scope_group_id)
    and (
      public.is_platform_admin()
      or not exists (
        select 1 from public.groups g
        where g.id = scope_group_id and g.status = 'suspended'
      )
    )
  );

-- 8d. journey_enrollments group arm: the not-suspended arm (the personal arm
--     enrollment_select_own is untouched — personal groups are never
--     suspendable, admin_suspend_group is engagement-only).
drop policy "enrollment_select_group" on public.journey_enrollments;
create policy "enrollment_select_group"
  on public.journey_enrollments for select to authenticated
  using (
    public.is_active_group_member(group_id)
    and (
      public.is_platform_admin()
      or not exists (
        select 1 from public.groups g
        where g.id = group_id and g.status = 'suspended'
      )
    )
  );

-- ============================================================================
-- 9. The legacy direct write doors close (FEAT-PC023 STORY-10, finding 3).
--    All 14 live write policies on the four membership/role tables, dropped
--    by their live names; INSERT/UPDATE/DELETE revoked from authenticated and
--    anon (the 20260222000000 blanket grants, never revoked until now).
--    SELECT policies and grants stay — the C-series read-on-RLS posture.
--    Bootstrap and invitation-accept ride SECURITY DEFINER contracts and
--    triggers (the Q1 verification set proves them vestigial post-apply).
-- ============================================================================
drop policy "gm_delete_admin" on public.group_memberships;
drop policy "gm_insert_admin" on public.group_memberships;
drop policy "memberships_insert_bootstrap" on public.group_memberships;
drop policy "memberships_insert_invite" on public.group_memberships;
drop policy "memberships_update_accept" on public.group_memberships;
drop policy "group_roles_delete" on public.group_roles;
drop policy "group_roles_insert" on public.group_roles;
drop policy "group_roles_update" on public.group_roles;
drop policy "ugr_delete" on public.user_group_roles;
drop policy "ugr_delete_admin" on public.user_group_roles;
drop policy "ugr_insert_admin" on public.user_group_roles;
drop policy "ugr_insert_assign" on public.user_group_roles;
drop policy "grp_delete" on public.group_role_permissions;
drop policy "grp_insert" on public.group_role_permissions;

revoke insert, update, delete on public.group_memberships from authenticated, anon;
revoke insert, update, delete on public.user_group_roles from authenticated, anon;
revoke insert, update, delete on public.group_roles from authenticated, anon;
revoke insert, update, delete on public.group_role_permissions from authenticated, anon;
