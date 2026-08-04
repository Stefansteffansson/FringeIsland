-- ============================================================================
-- FEAT-PC026 (Cycle ADM-G) — suspended-group admin access contracts.
-- WF-2 per the settled G-board (2026-08-04 substrate dossier): G-1 dedicated
-- admin content view (member-plane visibility law untouched) · G-3 journeys
-- OUT (dated deferral) · G-4 message bodies IN, group-kind conversations only.
-- Suspended-only, purpose-bound, both layers (contracts AND RLS).
--
-- TERMINOLOGY: "suspended" here is GROUP-suspension (groups.status =
-- 'suspended') throughout — never the account-state family (users.is_active
-- derived). Greps must not conflate the two (spec Problem 9).
--
-- WHAT THIS MIGRATION CARRIES
--  1. get_group_announcements — membership gate gains the suspended-scoped
--     admin disjunct (the PC023 downstream arm at 20260803190000:3052-3056
--     already exempts admins and becomes reachable-consistent).
--  2. get_group_conversations — same arm on the inline membership EXISTS gate.
--  3. get_conversation_detail — participation gate gains the admin disjunct
--     scoped GROUP-KIND AND SUSPENDED (the G-4 verdict). Direct (non-group)
--     conversations stay outside admin sight in every status.
--  4. is_conversation_participant — the conversations-family RLS chokepoint:
--     from  P AND (A OR NOT S)
--     to    (P OR (A AND K AND S)) AND (A OR NOT S)
--     where P = participant, A = is_platform_admin(), K = conversation is
--     group-kind, S = that group is suspended. Closes conversations /
--     messages / conversation_participants SELECT (their policies delegate,
--     20260719230500:159-172) + realtime deltas, which respect RLS.
--     Truth table (pinned in the gate suite):
--       participant / non-admin / active            -> true   (unchanged)
--       participant / non-admin / suspended         -> false  (quarantine holds)
--       admin / participant / any                   -> true   (unchanged)
--       admin / non-participant / suspended group   -> TRUE   (the new arm)
--       admin / non-participant / active            -> false  (suspended-only)
--       admin / non-participant / DM                -> false  in every status
--  5. get_group_forum — NO CHANGE, deliberately. The door already passes a
--     non-member admin: has_permission()'s Tier-1 arm is context-free
--     (20260222000000:436-453) and auto_grant_to_deusex (:1352-1354) grants
--     DeusEx every permission, so the view_forum gate admits admins and the
--     PC023 suspension arm exempts them (same at RLS: forum_select,
--     20260803190000:4467-4483). PC026 STORY-3 pins this as LAW via
--     characterization cells; the Tier-1 mechanism is recorded as AB-6 audit
--     material (any door gated purely by has_permission passes admins today).
--  6. admin_get_group_detail — members rows gain `email`
--     ({personal_group_id, display_name, email, is_steward}) — the W-4 echo
--     law for the Hub's remove ceremony (RB-8 doppelganger rule). Everything
--     else in the payload byte-stable.
--  7. NEW ds5_moderation_moderate_group_post (DS-5-owned, sealed) +
--     admin_moderate_group_forum_post (PC-4 wrapper) — the "clean forums"
--     act. ADR-U047 rule 3: only DS-5 may touch its own tables, so the
--     post resolution + purpose-bound suspension refusal + the composed
--     tombstone live in the sealed DS-5 body, which REUSES the existing
--     moderation law (moderate_forum_post — idempotent tombstone; never a
--     second table-touching body); the PC-4 wrapper owns the admin wall,
--     the required-reason vocabulary, and the admin_audit_log write
--     (the ADM-D admin_resolve_content_report shape).
--  8. admin_remove_member_from_group — ** GATE FINDING, named scope **.
--     The spec (Problem 7) carried the dossier premise "PC023's exits family
--     passes admins through the availability guard — no re-issue expected;
--     any defect found is a gate finding, not silent scope." Build-time
--     verification refutes the premise for this door: 20260801190000:786-788
--     refuses ALL non-active groups (`IF v_group.status <> 'active' THEN
--     RAISE 'group is not active'`) — its own COMMENT documents "non-active
--     group P0001" — and PC023 never re-issued it. STORY-5's remove-on-
--     suspended (the WF-2 "remove members" mandate) is unbuildable without
--     amending this guard. Re-issued byte-identical EXCEPT the guard now
--     admits 'suspended' (only); resting/closed/archived keep the
--     byte-identical refusal. Note: removing the LAST member of a suspended
--     group takes the group_closure leg (suspended -> closed) — an
--     admin-plane act, consistent with PC023's "every transition touching
--     'suspended' is admin-only".
--
-- DIRECT-CALLER QUESTION (ADR-U038): what can a direct PostgREST caller do
-- that the product route would not allow?
--  - The re-issued read doors self-gate exactly as before for every caller
--    below the admin plane; the new disjuncts key on is_platform_admin()
--    (SECURITY DEFINER, minimal body) — a non-admin authenticated caller
--    (including an anonymous-session Mist holding `authenticated`) hits the
--    byte-identical 42501 refusals; refusal SQLSTATEs are unchanged, so no
--    new existence leak (private and absent still look identical below the
--    admin plane).
--  - The RLS chokepoint change grants SELECT only to is_platform_admin()
--    callers on suspended group-kind conversations; anon stays at zero rows
--    (policies bind TO authenticated).
--  - The new wrapper refuses non-admins 42501 'platform administrator
--    required' before any read; EXECUTE is revoked from PUBLIC/anon; the
--    sealed DS-5 body is EXECUTE-revoked from ALL client roles
--    (owner-execution only, the ADM-D seal).
--  - admin_get_group_detail already self-gates is_platform_admin(); `email`
--    exposes an existing admin-plane fact (the member console shows email)
--    in a second admin-gated read. No column grants change anywhere.
--
-- SIBLING-ASSERTION SWEEP (the three-times-bitten rule) — every live
-- assertion naming a changed object, each marked ADAPTED or DELIBERATELY
-- LEFT:
--  - hub/tests/integration/groups/group-availability-enforcement.test.ts
--    (the PC023 gate suite): the member-plane quarantine cells on the four
--    doors (mona/member refusals, 'group is suspended'; admin full-detail
--    read) — DELIBERATELY LEFT: member behaviour is byte-identical by
--    design; no cell asserts a NON-MEMBER ADMIN refusal on these doors.
--    The direct-RLS zero-row cells assert the MEMBER (non-admin) verdict on
--    the suspended family — DELIBERATELY LEFT (unchanged row of the truth
--    table).
--  - hub/tests/integration/communication/* (C-series contract suites):
--    assert member/participant behaviour on ACTIVE groups + the
--    non-member/non-participant refusals ('Not a member of this group',
--    'Not a participant') for NON-ADMIN callers — DELIBERATELY LEFT
--    (non-admin refusals byte-identical; the arms are admin-scoped).
--  - hub/tests/integration/admin/group-administration-contracts.test.ts
--    (ADM-B): the admin_get_group_detail cells assert named keys, never an
--    exact member-row key set (the 20260801130000 header records the same
--    custom) — DELIBERATELY LEFT; the members-email cells in the PC026 gate
--    suite are this migration's own red-first coverage.
--  - hub/tests/integration/admin/member-administration-operations.test.ts
--    (ADM-C): admin_remove_member_from_group cells run against ACTIVE
--    groups — DELIBERATELY LEFT (active-path behaviour byte-identical); any
--    cell asserting the non-active refusal is adapted only if it names
--    'suspended' (none found; resting/closed keep refusing).
--  - hub/types AdminGroupMember: gains optional email at the Hub half
--    (TASK-ADMG-02) — consumer-side, enumerated here for the record.
--  [Enumeration lead-session-verified against the live test trees at build
--   (per-file name grep + direct inspection of every 'group is not active'
--   and remove-door site); the delegated sweep report reconciles in the PR
--   thread before the gate merge.]
--
-- POST-APPLY VERIFICATION SET: the PC026 gate suite green; the PC023 gate
-- suite green (member quarantine unregressed); C-series communication suites
-- green; platform conformance suites green (ownership manifest updated in
-- this PR); npm run test:integration full sweep.
--
-- SECURITY DEFINER justification: every touched function already runs
-- SECURITY DEFINER (admin-plane / cross-RLS reads); the two new functions
-- follow the ADM-D wrapper+sealed-body shape — the wrapper needs the
-- admin-plane read across RLS, the body needs its own service's tables.
-- All bodies SET search_path = ''.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_group_announcements — re-issued in place (COR-A pattern: signature
--    byte-identical, ACL preserved by create-or-replace); FEAT-PC026 sight
--    arm on the membership gate.
-- ----------------------------------------------------------------------------
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
  -- FEAT-PC026 (ADM-G): the suspended-scoped admin sight arm — a platform
  -- admin is admitted exactly where the admin plane has already acted
  -- (group-suspension); everywhere else the member-plane refusal is
  -- byte-identical (private and absent look identical below the admin plane).
  IF NOT (
    public.is_active_group_member(p_group_id)
    OR (public.is_platform_admin()
        AND (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended')
  ) THEN
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

-- ----------------------------------------------------------------------------
-- 2. get_group_conversations — re-issued in place; FEAT-PC026 sight arm on
--    the inline membership EXISTS gate.
-- ----------------------------------------------------------------------------
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
  -- FEAT-PC026 (ADM-G): the suspended-scoped admin sight arm (see 1.).
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = p_group_id AND member_group_id = v_me AND status = 'active'
    )
    OR (public.is_platform_admin()
        AND (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended')
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

-- ----------------------------------------------------------------------------
-- 3. get_conversation_detail — re-issued in place; FEAT-PC026 sight arm on
--    the participation gate, scoped GROUP-KIND AND SUSPENDED (G-4). DMs stay
--    outside admin sight in every status. For an admitted non-participant
--    admin, v_my_last_read stays NULL (my_last_read_at: null in the payload).
-- ----------------------------------------------------------------------------
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
    -- FEAT-PC026 (ADM-G): the admin sight arm — group-kind AND suspended
    -- only (the G-4 verdict). Every other non-participant keeps the
    -- byte-identical refusal.
    IF NOT (public.is_platform_admin()
            AND v_conv.kind = 'group'
            AND (SELECT g.status FROM public.groups g WHERE g.id = v_conv.group_id) = 'suspended') THEN
      RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
    END IF;
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

-- ----------------------------------------------------------------------------
-- 4. is_conversation_participant — the conversations-family RLS chokepoint
--    re-issued: (P OR (A AND K AND S)) AND (A OR NOT S). The admin arm is a
--    suspended-scoped, group-kind-scoped DISJUNCT OF THE PARTICIPATION
--    CONJUNCT — a bare top-level is_platform_admin() OR would grant admins
--    sight of ALL conversations in every status (the conjunct trap, spec
--    Problem 8). The PC023 quarantine conjunct (A OR NOT S) is unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = p_conversation_id
        and participant_group_id = public.get_current_personal_group_id()
        and left_at is null
    )
    or (
      public.is_platform_admin()
      and exists (
        select 1
          from public.conversations c
          join public.groups g on g.id = c.group_id
         where c.id = p_conversation_id
           and c.kind = 'group'
           and g.status = 'suspended'
      )
    )
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

-- ----------------------------------------------------------------------------
-- 5. admin_get_group_detail — re-issued in place (STRICTLY ADDITIVE payload
--    key, the 20260801130000 pattern): members rows gain `email` — the W-4
--    echo law's requirement for the Hub's remove ceremony (RB-8 doppelganger
--    rule). LEFT JOIN so a personal group without a users row never drops a
--    member. Everything else byte-stable; grants preserved by
--    create-or-replace.
-- ----------------------------------------------------------------------------
create or replace function public.admin_get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
  v_deusex uuid;
  v_member_count integer;
  v_non_system_count integer;
  v_deusex_stewarded boolean;
  v_stewards jsonb;
  v_members jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type <> 'personal';
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  select g.id into v_deusex
    from public.groups g
   where g.name = 'DeusEx' and g.group_type = 'system';

  select count(*)::integer into v_member_count
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.status = 'active';

  select count(*)::integer into v_non_system_count
    from public.group_memberships gm
    join public.groups mg on mg.id = gm.member_group_id
   where gm.group_id = p_group_id and gm.status = 'active'
     and mg.group_type <> 'system';

  v_deusex_stewarded := exists (
    select 1 from public.group_memberships gm
     where gm.group_id = p_group_id and gm.member_group_id = v_deusex
       and gm.status = 'active');

  select coalesce(jsonb_agg(jsonb_build_object(
           'display_name', pg.name,
           'personal_group_id', pg.id
         ) order by pg.name), '[]'::jsonb)
    into v_stewards
    from public.user_group_roles ugr
    join public.group_roles gr on gr.id = ugr.group_role_id
    join public.group_memberships gm
      on gm.group_id = ugr.group_id
     and gm.member_group_id = ugr.member_group_id
     and gm.status = 'active'
    join public.groups pg on pg.id = ugr.member_group_id
   where ugr.group_id = p_group_id
     and pg.group_type <> 'system'
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt
              where rt.name = 'Steward Role Template')
          or gr.name = 'Steward');

  -- The members array (20260801130000): active HUMAN members — personal
  -- groups only. Display identity = the personal group's name (B-DISP).
  -- FEAT-PC026 (ADM-G): + email — the W-4 echo law for the remove ceremony.
  select coalesce(jsonb_agg(jsonb_build_object(
           'personal_group_id', pg.id,
           'display_name', pg.name,
           'email', u.email,
           'is_steward', exists (
              select 1
                from public.user_group_roles ugr
                join public.group_roles gr on gr.id = ugr.group_role_id
               where ugr.group_id = p_group_id
                 and ugr.member_group_id = pg.id
                 and (gr.created_from_role_template_id =
                        (select rt.id from public.role_templates rt
                          where rt.name = 'Steward Role Template')
                      or gr.name = 'Steward'))
         ) order by pg.name), '[]'::jsonb)
    into v_members
    from public.group_memberships gm
    join public.groups pg on pg.id = gm.member_group_id
    left join public.users u on u.personal_group_id = pg.id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and pg.group_type = 'personal';

  return jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'group_type', v_group.group_type,
    'status', v_group.status,
    'is_public', v_group.is_public,
    'avatar_url', v_group.avatar_url,
    'member_count', v_member_count,
    'non_system_member_count', v_non_system_count,
    'deusex_stewarded', v_deusex_stewarded,
    'stewards', v_stewards,
    'members', v_members,
    'created_at', v_group.created_at,
    'updated_at', v_group.updated_at
  );
end;
$$;

comment on function public.admin_get_group_detail(uuid) is
  'FEAT-PC020 (ADM-8): admin group detail — the row, the member_count/non_system_member_count pair (the caretaker is never load-bearing in copy, ADR-U041 §5), human stewards only (display identity = the personal group''s name, the B-DISP oracle; the caretaker is carried by deusex_stewarded), status timestamps via the row''s created_at/updated_at, and (20260801130000, the TASK-ADMB-02 adjudication) `members`: active human members with is_steward flags — the reassign picker''s candidate source. FEAT-PC026 (20260804230000): members rows carry `email` — the W-4 echo law for the admin remove ceremony. Personal or unknown ids refuse P0002. SECURITY DEFINER required: admin-plane read across RLS.';

-- ----------------------------------------------------------------------------
-- 6. The audited moderate act — sealed DS-5 body + PC-4 wrapper (the ADM-D
--    shape, ADR-U047 rule 3: the report store''s sibling — only DS-5 touches
--    DS-5 tables; the wrapper owns the wall, the reason vocabulary, and the
--    audit write).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_moderation_moderate_group_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_post RECORD;
  v_status TEXT;
BEGIN
  SELECT id, group_id, author_group_id INTO v_post
  FROM public.forum_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  -- Purpose-binding (FEAT-PC026 / WS-2): the admin-plane act operates only
  -- under the hard hold — GROUP-suspension. Raised domain-side because only
  -- DS-5 may resolve the post''s group (ADR-U047 rule 3); the admin wall
  -- lives at the PC-4 wrapper.
  SELECT g.status INTO v_status
  FROM public.groups g WHERE g.id = v_post.group_id;
  IF v_status IS DISTINCT FROM 'suspended' THEN
    RAISE EXCEPTION 'group is not suspended' USING ERRCODE = 'P0001';
  END IF;

  -- REUSE of the existing moderation law (never a second table-touching
  -- body): moderate_forum_post owns the idempotent tombstone + the
  -- moderation hint trigger path. Its has_permission gate admits the calling
  -- admin via the Tier-1 mechanism PC026 STORY-3 pins as law, and its
  -- availability guard passes admins on suspended groups (PC023). If AB-6
  -- ever narrows Tier-1, this composition fails loudly at the gate suite.
  PERFORM public.moderate_forum_post(p_post_id);

  RETURN jsonb_build_object(
    'post_id', v_post.id,
    'group_id', v_post.group_id,
    'author_group_id', v_post.author_group_id,
    'is_deleted', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moderate_group_forum_post(
  p_post_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason required' USING ERRCODE = '22023';
  END IF;

  v_actor := public.get_current_personal_group_id();
  v_result := public.ds5_moderation_moderate_group_post(p_post_id);

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_actor,
    'moderation.forum_post_moderated',
    p_post_id::text,
    jsonb_build_object(
      'group_id', v_result->>'group_id',
      'post_id', v_result->>'post_id',
      'author_group_id', v_result->>'author_group_id',
      'reason', p_reason
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.ds5_moderation_moderate_group_post(UUID) IS
  'ADM-G FEAT-PC026 (ADR-U047 rule 3): the DS-5-owned moderate body — post '
  'resolution (P0002), the purpose-bound group-suspension refusal (P0001 '
  '''group is not suspended''), and the composed tombstone REUSING '
  'moderate_forum_post (idempotent; the hint trigger path rides along). '
  'Reached only through admin_moderate_group_forum_post (EXECUTE revoked '
  'from all client roles); the admin wall and the audit write live at that '
  'PC-4 contract.';
COMMENT ON FUNCTION public.admin_moderate_group_forum_post(UUID, TEXT) IS
  'ADM-G FEAT-PC026 (WF-2 "clean forums"): the PC-4 wall (is_platform_admin, '
  '42501 ''platform administrator required''), the required-reason vocabulary '
  '(22023), and the moderation.forum_post_moderated audit write '
  '({group_id, post_id, author_group_id, reason}), over the sealed DS-5 body '
  'ds5_moderation_moderate_group_post (which owns P0002/P0001 and the '
  'composed tombstone). Purpose-bound: refuses off group-suspension.';

REVOKE ALL ON FUNCTION public.ds5_moderation_moderate_group_post(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_moderate_group_forum_post(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_group_forum_post(UUID, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. admin_remove_member_from_group — re-issued in place; ** the gate
--    finding ** (header item 8): byte-identical EXCEPT the status guard now
--    admits ''suspended'' (WF-2 STORY-5). Grants preserved by
--    create-or-replace (authenticated + service_role; PUBLIC/anon revoked
--    at 20260801190000).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_member_from_group(
  p_group_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id uuid;
  v_target record;
  v_group record;
  v_pgid uuid;
  v_deusex_group_id uuid;
  v_steward_template_id uuid;
  v_member_count integer;
  v_steward_role_id uuid;
  v_is_steward boolean;
  v_steward_count integer;
  v_scenario text;
  v_non_public_journey_count integer;
  v_member record;
BEGIN
  -- ─── Gate + resolve ─────────────────────────────────────────────────────
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  SELECT id, personal_group_id, is_temporary
    INTO v_target
    FROM public.users
   WHERE id = p_target_user_id
     FOR UPDATE;
  IF v_target.id IS NULL OR v_target.is_temporary THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  v_pgid := v_target.personal_group_id;

  SELECT g.id, g.name, g.status
    INTO v_group
    FROM public.groups g
   WHERE g.id = p_group_id AND g.group_type = 'engagement';
  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'group not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is not an active member of this group' USING ERRCODE = 'P0002';
  END IF;

  -- FEAT-PC026 (ADM-G) gate finding: WF-2 requires this door on a
  -- GROUP-suspended group (the admin removes members exactly where the admin
  -- plane has already acted). Amended from the 20260801190000 `<> 'active'`
  -- refusal; resting/closed/archived keep the byte-identical refusal.
  IF v_group.status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'group is not active';
  END IF;

  SELECT id INTO v_deusex_group_id
    FROM public.groups
   WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_deusex_group_id IS NULL THEN
    RAISE EXCEPTION 'admin_remove_member_from_group: DeusEx system group not found';
  END IF;

  SELECT id INTO v_steward_template_id
    FROM public.role_templates
   WHERE name = 'Steward Role Template';

  -- ─── Classify — the same classifier the walk and the detail read use ────
  SELECT count(*) INTO v_member_count
    FROM public.group_memberships
   WHERE group_id = p_group_id AND status = 'active';

  SELECT gr.id INTO v_steward_role_id
    FROM public.group_roles gr
   WHERE gr.group_id = p_group_id
     AND (gr.created_from_role_template_id = v_steward_template_id
          OR gr.name = 'Steward')
   LIMIT 1;

  v_is_steward := false;
  v_steward_count := 0;
  IF v_steward_role_id IS NOT NULL THEN
    SELECT count(*) INTO v_steward_count
      FROM public.user_group_roles
     WHERE group_id = p_group_id
       AND group_role_id = v_steward_role_id;
    v_is_steward := EXISTS (
      SELECT 1 FROM public.user_group_roles
       WHERE group_id = p_group_id
         AND member_group_id = v_pgid
         AND group_role_id = v_steward_role_id
    );
  END IF;

  IF v_member_count = 1 THEN
    v_scenario := 'group_closure';
  ELSIF v_is_steward AND v_steward_count = 1 THEN
    v_scenario := 'steward_handover';
  ELSE
    v_scenario := 'regular_leave';
  END IF;

  -- ─── Execute the one leg — same composition, admin-removal copy ─────────
  IF v_scenario = 'group_closure' THEN
    UPDATE public.groups SET status = 'closed'
     WHERE id = p_group_id;

    v_non_public_journey_count :=
      (public.ds3_lifecycle_group_closed(p_group_id, 'group_closed') ->> 'journey_count')::integer;

    PERFORM public.ds5_lifecycle_group_closed(p_group_id, 'group_closed');

    IF v_non_public_journey_count > 0 THEN
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_deusex_group_id,
        'group_closed',
        'Group Closed — Member Removal',
        v_group.name || ' has been closed (admin removal of its last member). ' ||
          v_non_public_journey_count || ' non-public journey(s) require review.',
        jsonb_build_object(
          'group_id', p_group_id,
          'journey_count', v_non_public_journey_count,
          'exit_reason', 'admin_removal'
        ),
        p_group_id
      );
    END IF;

    DELETE FROM public.user_group_roles
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
    DELETE FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid;

  ELSIF v_scenario = 'steward_handover' THEN
    INSERT INTO public.group_memberships
      (group_id, member_group_id, added_by_group_id, status)
    VALUES
      (p_group_id, v_deusex_group_id, v_pgid, 'active')
    ON CONFLICT (group_id, member_group_id)
      DO UPDATE SET status = 'active', status_changed_at = now();

    INSERT INTO public.user_group_roles
      (member_group_id, group_id, group_role_id, assigned_by_group_id)
    VALUES
      (v_deusex_group_id, p_group_id, v_steward_role_id, v_pgid)
    ON CONFLICT (member_group_id, group_id, group_role_id) DO NOTHING;

    UPDATE public.group_memberships
       SET added_by_group_id = v_deusex_group_id
     WHERE group_id = p_group_id
       AND status = 'invited'
       AND added_by_group_id = v_pgid;

    UPDATE public.pending_email_invitations
       SET invited_by_group_id = v_deusex_group_id
     WHERE group_id = p_group_id
       AND invited_by_group_id = v_pgid
       AND status = 'pending';

    PERFORM public.ds3_lifecycle_member_departed(p_group_id, v_pgid, 'left_group');

    DELETE FROM public.user_group_roles
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
    DELETE FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid;

    FOR v_member IN
      SELECT gm.member_group_id
        FROM public.group_memberships gm
       WHERE gm.group_id = p_group_id
         AND gm.status = 'active'
         AND gm.member_group_id != v_deusex_group_id
    LOOP
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_member.member_group_id,
        'stewardship_transferred',
        'Stewardship Change',
        'FringeIsland has temporarily assumed stewardship of ' || v_group.name || '.',
        jsonb_build_object(
          'group_id', p_group_id,
          'exit_reason', 'admin_removal'
        ),
        p_group_id
      );
    END LOOP;

    INSERT INTO public.notifications
      (recipient_group_id, type, title, body, payload, group_id)
    VALUES (
      v_deusex_group_id,
      'stewardship_required',
      'Stewardship Required',
      v_group.name || ' requires a permanent Steward. The previous Steward was removed by an administrator.',
      jsonb_build_object(
        'group_id', p_group_id,
        'exit_reason', 'admin_removal'
      ),
      p_group_id
    );

  ELSE -- regular_leave
    PERFORM public.ds3_lifecycle_member_departed(p_group_id, v_pgid, 'left_group');

    DELETE FROM public.user_group_roles
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
    DELETE FROM public.group_memberships
     WHERE group_id = p_group_id AND member_group_id = v_pgid;
  END IF;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    'member.remove_from_group',
    v_target.id::text,
    jsonb_build_object(
      'target_user_id', v_target.id,
      'group_id', p_group_id,
      'group_name', v_group.name,
      'scenario', v_scenario
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'group_name', v_group.name,
    'scenario', v_scenario
  );
END;
$$;

COMMENT ON FUNCTION public.admin_remove_member_from_group(UUID, UUID) IS
  'FEAT-PC021 gate 2 (ADM-18): platform-admin-gated (42501) targeted removal '
  '— the walk classifier applied to exactly one active engagement membership '
  '(regular_leave / steward_handover / group_closure), same composed legs, '
  'notification copy naming the admin removal. Unknown user/group or '
  'non-member P0002; non-active group P0001 — amended by FEAT-PC026 '
  '(20260804230000, the ADM-G gate finding): a GROUP-suspended group is '
  'admitted (WF-2 — the admin removes members where the admin plane has '
  'already acted; last-member removal takes the closure leg, suspended -> '
  'closed, an admin-plane transition). Audits member.remove_from_group '
  'with group + scenario. SECURITY DEFINER; escalation bounded to the one '
  'membership''s fabric.';
