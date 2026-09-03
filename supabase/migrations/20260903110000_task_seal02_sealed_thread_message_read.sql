-- TASK-SEAL-02 — the SEAL-01 rider: a platform admin reads a sealed thread's
-- MESSAGES on a closed group, bounded exactly as SEAL-01. B1's motivation was
-- the messages (bullying evidence lives there); SEAL-01 armed the list and said
-- on the surface that contents were not readable. Stefan ruled the rider in at
-- the Ferd leftovers pass (2026-09-03, "seal-01 … now"; bridge 2026-09-03_02,
-- item 3 of four).
--
-- OWNERSHIP (ADR-U047 Amendment 3 declared composition — the SEAL-01 shape):
--   * `ds5_admin_conversation_detail` — DS-5 body, SEALED (EXECUTE revoked from
--     client roles; {postgres, service_role}); touches only DS-5's own tables;
--     no wall of its own. FEAT-PD012 amendment.
--   * `admin_get_group_conversation_detail` — PC-4 wrapper, owns the admin wall,
--     the closed-scope rule, and the AUDIT row; touches no DS-5 table (it
--     reads the body's reply — the gate refused a first draft that pre-read
--     `conversations`). Client-callable. FEAT-PC026 amendment. Registered under both owners + a declaredCompositions entry in
--     supabase/ownership.manifest.json (the invocation-axis gate).
--
-- BOUNDS (SEAL-01's, carried verbatim):
--   1. scope = CLOSED groups (ruling A) — P0001 for any other status;
--   2. group-kind conversations only — a direct conversation is P0002 in every
--      state (never a leak that it exists);
--   3. the sealed state is returned EXPLICITLY (`sealed_at`, `is_sealed`,
--      `group_status`) so the surface can never present the thread as live;
--   4. the member doors are UNTOUCHED: `get_group_conversations` keeps its
--      `sealed_at IS NULL` law and `get_conversation_detail` keeps its
--      participant wall + the PC026 suspended-only admin arm — on a closed
--      group the admin is still refused there (42501); this wrapper is the
--      only door, and it is AUDITED (`admin_audit_log`, action
--      'sealed_thread.read', target = the conversation id).
--
-- ATTRIBUTION: senders resolve through the COM-14 ladder
-- (`ds5_resolve_author_display`, scope = the conversation's group) — a departed
-- author renders "Former member", a decommissioned one "Unknown"; never
-- "[Deleted User]" (ADR-U021 display law). This is exactly why the evidence is
-- still readable when the author is gone: messages.sender_group_id is
-- ON DELETE SET NULL and the ladder handles the NULL.
--
-- PRIVACY (load-bearing, documented in FEAT-PC026's amendment): reading
-- departed members' preserved words is purpose-bound (closed groups only —
-- where the admin plane has already acted or the group has ended), audited,
-- and grants no new storage. Legitimate-interest basis per ADR-U052 §4.
--
-- SIBLING ASSERTIONS (grep: get_conversation_detail, admin_get_group_conversations,
-- ds5_admin_group_conversations, sealed_at — the whole hub/tests tree):
--   * admin/sealed-thread-admin-sight.test.ts — pins the SEAL-01 list door and
--     the member-plane law; this migration adds contracts, amends none. LEFT.
--   * admin/suspended-group-admin-access.test.ts — pins get_conversation_detail's
--     suspended-only admin arm; untouched. LEFT.
--   * communication/conversation-contracts, wielded-conversation-contracts,
--     lifecycle-dispositions, member-erasure-disposition, window-and-report-
--     contracts, forum-contracts; account/account-lifecycle-self-service;
--     groups/group-availability-enforcement — every one names a member door
--     this migration does not touch. LEFT.
--   * admin/moderation-and-audit-contracts.test.ts S8a — pins the `moderation.%`
--     action family as a closed set; the new action is 'sealed_thread.read',
--     outside that family by design. LEFT.
--   * unit: app/api/admin-closed-threads-route.test.ts, lib/admin/content-
--     closed-threads.test.ts — the SEAL-01 route + lib; LEFT. The section test
--     gains the open/view cells; the E2E admin-closed-threads.spec.ts's
--     "never a door" assertion on a sealed row is ADAPTED (labelled): the row
--     now carries exactly one affordance, Open — still no link, no live chrome.
--   * NEW: admin/sealed-thread-message-read.test.ts — RED at HEAD (PGRST202 on
--     both contracts; the client-role seal cell reads "not found", not
--     "permission denied", until the body exists).
--   * Q1 post-apply verification set (E2E, from hub/): admin-closed-threads.spec.ts
--     (extended), admin-suspended-content.spec.ts (the sibling wing, unchanged).
--
-- Read-mostly: no table, no column, no policy, no trigger changes; the one
-- write is the wrapper's audit row into PC-4's own admin_audit_log.

-- ── DS-5 body — sealed, owns the table read, no wall ──────────────────────────
create or replace function public.ds5_admin_conversation_detail(p_conversation_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_conv record;
  v_messages jsonb;
  v_senders jsonb;
  v_count integer;
begin
  select c.id, c.kind, c.title, c.group_id, c.created_at, c.sealed_at,
         g.name as group_name, g.status as group_status
    into v_conv
    from public.conversations c
    left join public.groups g on g.id = c.group_id
   where c.id = p_conversation_id;
  if not found or v_conv.kind <> 'group' then
    -- Bound 2: a direct conversation is indistinguishable from an absent one.
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count
    from public.messages m
   where m.conversation_id = p_conversation_id;

  -- The whole thread, oldest first (evidence reads in order), capped: a sealed
  -- thread is finite; the cap is a safety rail, reported honestly.
  with page as (
    select m.id, m.sender_group_id, m.content, m.is_deleted, m.created_at
      from public.messages m
     where m.conversation_id = p_conversation_id
     order by m.created_at asc, m.id asc
     limit 500
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'sender_group_id', sender_group_id,
           'content', content, 'is_deleted', is_deleted, 'created_at', created_at
         ) order by created_at asc, id asc), '[]'::jsonb)
    into v_messages
    from page;

  -- COM-14 ladder, scope = the conversation's group: a departed member reads
  -- "Former member", a decommissioned one "Unknown" (ADR-U021).
  select coalesce(jsonb_object_agg(
           sid::text, public.ds5_resolve_author_display(sid, v_conv.group_id)
         ), '{}'::jsonb)
    into v_senders
    from (
      select distinct m.sender_group_id as sid
        from public.messages m
       where m.conversation_id = p_conversation_id
         and m.sender_group_id is not null
    ) s;

  return jsonb_build_object(
    'id', v_conv.id,
    'kind', v_conv.kind,
    'title', v_conv.title,
    'group_id', v_conv.group_id,
    'group_name', v_conv.group_name,
    'group_status', v_conv.group_status,
    'created_at', v_conv.created_at,
    'sealed_at', v_conv.sealed_at,
    'is_sealed', (v_conv.sealed_at is not null),
    'message_count', v_count,
    'truncated', (v_count > 500),
    'messages', v_messages,
    'senders', v_senders
  );
end;
$function$;

revoke all on function public.ds5_admin_conversation_detail(uuid) from public, anon, authenticated;
grant execute on function public.ds5_admin_conversation_detail(uuid) to service_role;

comment on function public.ds5_admin_conversation_detail(uuid) is
  'DS-5 sealed body for the admin plane''s sealed-thread MESSAGE read (TASK-SEAL-02, ADR-U047 A3 declared composition). Serves one group-kind conversation''s messages, sealed or not, senders resolved through the COM-14 ladder; direct conversations are P0002. Carries no authorization of its own — the wall + the audit are admin_get_group_conversation_detail. EXECUTE is revoked from client roles by design.';

-- ── PC-4 wrapper — owns the admin wall, the closed-scope rule, the audit row ──
create or replace function public.admin_get_group_conversation_detail(p_conversation_id uuid)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  v_actor uuid;
  v_group uuid;
  v_status text;
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- The DS-5 body owns the conversation read entirely: absent or direct is its
  -- P0002 (bound 2), and its reply carries the group and the group's status.
  -- This wrapper touches NO DS-5 table — the invocation-axis gate refused the
  -- first draft of this function for pre-reading `conversations` here (ADR-U047
  -- rule 3, the exact shape Audit IV caught before SEAL-01). Nothing the body
  -- read leaves this function unless the scope rule below admits it.
  v_result := public.ds5_admin_conversation_detail(p_conversation_id);
  v_group := (v_result->>'group_id')::uuid;
  v_status := v_result->>'group_status';

  -- Ruling A: sealed-thread sight is scoped to CLOSED groups — the only state
  -- in which sealed threads exist. Active, resting, suspended: refused here.
  if v_status is distinct from 'closed' then
    raise exception 'sealed-thread sight is scoped to closed groups (group is %)', v_status
      using errcode = 'P0001';
  end if;

  -- Bound 4: the read is an admin-plane act — audited, ids only, never content.
  v_actor := public.get_current_personal_group_id();
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (
    v_actor,
    'sealed_thread.read',
    p_conversation_id::text,
    jsonb_build_object(
      'group_id', v_group,
      'sealed_at', v_result->'sealed_at',
      'message_count', v_result->'message_count'
    )
  );

  return v_result;
end;
$function$;

revoke all on function public.admin_get_group_conversation_detail(uuid) from public, anon;
grant execute on function public.admin_get_group_conversation_detail(uuid) to authenticated, service_role;

comment on function public.admin_get_group_conversation_detail(uuid) is
  'Admin-plane read of ONE group-kind conversation''s messages on a CLOSED group, sealed threads included and labelled (TASK-SEAL-02, the SEAL-01 rider — AB-6 ruling B1''s motivation). Owns the admin wall (42501), the closed-scope rule (P0001), the DM no-leak (P0002) and the audit row (admin_audit_log ''sealed_thread.read''); the read itself is the sealed DS-5 body. The member doors are untouched.';

-- ── Self-verification (review checklist row 2) ────────────────────────────────
do $$
declare
  v_n integer;
  v_acl text;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('ds5_admin_conversation_detail', 'admin_get_group_conversation_detail');
  if v_n <> 2 then
    raise exception 'TASK-SEAL-02: expected 2 contracts, found %', v_n;
  end if;
  -- The body must be sealed from client roles: no authenticated, no anon, no PUBLIC execute.
  select coalesce(array_to_string(p.proacl, ','), '') into v_acl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'ds5_admin_conversation_detail';
  -- PUBLIC shows as an element with an EMPTY grantee ('=X/postgres'); the owner's own
  -- 'postgres=X/postgres' entry is fine, so test the element start, not a substring.
  if v_acl like '%authenticated=%' or v_acl like '%anon=%' or (',' || v_acl) like '%,=X/%' then
    raise exception 'TASK-SEAL-02: ds5_admin_conversation_detail is reachable by a client role: %', v_acl;
  end if;
end $$;
