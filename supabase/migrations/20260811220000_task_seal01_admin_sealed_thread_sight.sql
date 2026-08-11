-- TASK-SEAL-01 — sealed conversation threads become visible to the admin plane,
-- bounded. Realizes AB-6 ruling B1 (Stefan, 2026-08-10) as re-scoped by the
-- Phase-4 W7 contract walk and Stefan's ruling of 2026-08-11 ("go with A").
--
-- WHY THE SCOPE WORD CHANGED (this is the load-bearing part of this migration).
-- B1 as filed said "suspended-scope only", inheriting G-4's word. The DoR walk
-- found that scope can never match a row: `sealed_at` has exactly ONE writer in
-- the schema (`ds5_lifecycle_group_closed`), and all five of its callers seal
-- while setting the group to 'closed' — in `admin_remove_member_from_group` the
-- seal fires one line after `UPDATE groups SET status='closed'`. Statuses are
-- mutually exclusive, so a read gated on 'suspended' would have returned nothing
-- forever, and there are zero sealed rows on dev, so a green suite would have
-- proved nothing. Ruled A: scope is **closed**. Verified exhaustive — none of the
-- five paths hard-deletes the group row, so 'closed' is where every seal lands.
--
-- WHY THE EVIDENCE IS STILL THERE WHEN THE AUTHOR ISN'T (the point of B1).
-- Verified against the substrate rather than the spec text:
--   messages.sender_group_id -> groups(id) ON DELETE SET NULL
-- so a departed member's messages SURVIVE with authorship tombstoned;
-- conversations cascade only from the group, which is closed, never deleted.
-- D2's preserve rule is real in the substrate, not just on paper.
--
-- SHAPE — ADR-U047 Amendment 3 declared-composition class (COR-D W1). Every
-- `admin_*` function is PC-4-owned, and a PC-4 wrapper must not touch DS-5's
-- tables directly (that undeclared shape is exactly what Audit IV caught). So:
--   * `ds5_admin_group_conversations` — DS-5 body, SEALED (EXECUTE revoked from
--     client roles), touches only DS-5's own tables. No wall of its own.
--   * `admin_get_group_conversations` — PC-4 wrapper, owns the admin wall and
--     the scope rule. Client-callable.
-- Registered in `supabase/ownership.manifest.json` under both owners and as a
-- declaredCompositions entry, or the invocation-axis conformance gate fails.
--
-- BOUNDS PRESERVED FROM THE RULING (2, 3, 4 unchanged; 1 superseded by A):
--   * group-kind conversations only — direct conversations stay outside admin
--     sight (G-4's own line). Enforced in the DS-5 body's WHERE.
--   * the sealed state is returned EXPLICITLY (`sealed_at` + `is_sealed`) so the
--     surface can never present a sealed thread as live.
--   * `get_group_conversations`' own `sealed_at IS NULL` law is UNTOUCHED — no
--     member-plane leak. This migration adds contracts; it amends none.
--
-- Read-only: no table, no column, no policy, no trigger changes.

-- ── DS-5 body — sealed, owns the table read, no wall ───────────────────────────
create or replace function public.ds5_admin_group_conversations(p_group_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_rows jsonb;
begin
  -- The admin wall and the scope rule live at the PC-4 contract (the caller).
  -- This primitive serves the group's whole group-kind thread set, sealed rows
  -- INCLUDED and labelled — the one place in the schema where a sealed thread is
  -- readable. Direct ('dm') conversations are never returned (ruling bound 2).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'title', c.title,
           'created_at', c.created_at,
           'last_message_at', c.last_message_at,
           'sealed_at', c.sealed_at,
           'is_sealed', (c.sealed_at is not null),
           'message_count', (
             select count(*) from public.messages m where m.conversation_id = c.id
           ))
         order by c.created_at desc), '[]'::jsonb)
    into v_rows
    from public.conversations c
   where c.kind = 'group'
     and c.group_id = p_group_id;

  return v_rows;
end;
$function$;

revoke all on function public.ds5_admin_group_conversations(uuid) from public, anon, authenticated;
grant execute on function public.ds5_admin_group_conversations(uuid) to service_role;

comment on function public.ds5_admin_group_conversations(uuid) is
  'DS-5 sealed body for the admin plane''s group-thread read (TASK-SEAL-01, ADR-U047 A3 declared composition). Returns group-kind conversations INCLUDING sealed ones, each labelled. Carries no authorization of its own — the wall is admin_get_group_conversations. EXECUTE is revoked from client roles by design.';

-- ── PC-4 wrapper — owns the admin wall and the scope rule ─────────────────────
create or replace function public.admin_get_group_conversations(p_group_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_status text;
begin
  if not public.is_platform_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select g.status into v_status from public.groups g where g.id = p_group_id;
  if v_status is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  -- Ruling A: sealed-thread sight is scoped to CLOSED groups — the only state in
  -- which sealed threads exist. A group in good standing (or merely suspended)
  -- is refused here, which keeps this door as narrow as B1 intended.
  if v_status <> 'closed' then
    raise exception 'sealed-thread sight is scoped to closed groups (group is %)', v_status
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'group_id', p_group_id,
    'conversations', public.ds5_admin_group_conversations(p_group_id)
  );
end;
$function$;

revoke all on function public.admin_get_group_conversations(uuid) from public, anon;
grant execute on function public.admin_get_group_conversations(uuid) to authenticated, service_role;

comment on function public.admin_get_group_conversations(uuid) is
  'Admin-plane read of a CLOSED group''s group-kind conversations, sealed threads included and labelled (TASK-SEAL-01, AB-6 ruling B1 as re-scoped 2026-08-11). Owns the admin wall; the read itself is the sealed DS-5 body. Direct conversations are never returned; the member-plane sealed_at IS NULL law is untouched.';
