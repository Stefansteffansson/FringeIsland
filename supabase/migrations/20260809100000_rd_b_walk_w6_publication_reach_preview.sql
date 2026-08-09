-- ============================================================================
-- RD-B walk fix W-6 — the publish ceremony can state its blast radius.
--
-- WHY THIS EXISTS
--
-- Found at the RD-B live walk (2026-08-08) and ruled 2026-08-09.
--
-- RD-B's whole discipline is CONSEQUENCE STATED BEFORE THE CLICK, and the
-- Steward's diff ceremony honours it precisely: it names the holder count and
-- says those members keep the role while their permissions change.
--
-- The admin's publish ceremony said nothing of the kind. It stated, truthfully,
-- that publishing only offers a template and never adds a role to a group --
-- and omitted that clicking notifies every manage_roles holder on the platform
-- (measured 2026-08-08: 427 notices to 223 recipients across 425 groups), with
-- no way to take those notices back. Unpublish withdraws the OFFER; the notices
-- correctly stand, because they recorded something that was true.
--
-- So the act with the larger, irreversible reach was held to the LOWER
-- standard. This read is what lets the surface close that gap.
--
-- WHAT THIS DOES
--
-- One new read. No table, no column, no policy, no grant beyond the function's
-- own EXECUTE, and no change to any existing contract.
--
--   admin_preview_publication_reach(p_role_template_id uuid,
--                                   p_group_ids uuid[] default null)
--     -> { group_count, recipient_count, notice_count }
--
-- p_group_ids semantics are IDENTICAL to admin_publish_role_template's: NULL
-- means platform-wide, a list names its targets. The surface calls this with
-- exactly what it is about to publish with, so the preview describes the act
-- the admin is looking at rather than a related one.
--
-- THE CORRECTNESS RISK, NAMED
--
-- A preview whose predicate drifts from the act it previews is worse than no
-- preview: it states a confident number that is wrong. The recipient predicate
-- below is therefore a DELIBERATE MIRROR of the recipient SELECT inside
-- admin_publish_role_template (20260807090000, re-issued 20260808120000):
--
--     from public.groups g
--     join public.group_memberships gm
--       on gm.group_id = g.id and gm.status = 'active'
--    where g.status = 'active'
--      and g.group_type = 'engagement'
--      and (p_group_ids is null or g.id = any(p_group_ids))
--      and public.has_permission(gm.member_group_id, g.id, 'manage_roles')
--
-- The two must be changed together, and the integration suite enforces that
-- rather than trusting this comment: cell W6c PREVIEWS, then PUBLISHES, then
-- asserts the preview's counts equal the rows the publish actually created.
-- If anyone edits one predicate and not the other, that cell fails.
--
-- notice_count is the (recipient x group) pair count -- the true row volume,
-- since a Steward of five groups receives five notices. recipient_count is the
-- distinct people. group_count is the distinct groups. The surface states the
-- last two; notice_count exists because the volume is the thing that actually
-- lands in the table, and a caller reasoning about load wants it.
--
-- Admin-plane only: is_platform_admin() gates it exactly as every sibling
-- admin_* contract does. STABLE -- it writes nothing, which is the point.
--
-- SIBLING ASSERTIONS INVALIDATED: NONE. Purely additive; a new function name
-- with no existing callers (grepped: zero hits for the name outside this
-- migration and the cells written against it).
-- ============================================================================

create or replace function public.admin_preview_publication_reach(
  p_role_template_id uuid,
  p_group_ids uuid[] default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_groups integer;
  v_recipients integer;
  v_notices integer;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  -- An empty array is refused here for the same reason the write door refuses
  -- it: it is not "everyone", and silently reading it as platform-wide would
  -- preview a far larger act than the caller asked about.
  if p_group_ids is not null and cardinality(p_group_ids) = 0 then
    raise exception 'p_group_ids must be null (all groups) or a non-empty list'
      using errcode = '22023';
  end if;

  -- THE MIRROR. Kept identical to admin_publish_role_template's recipient
  -- SELECT; W6c fails if they diverge.
  with pairs as (
    select distinct gm.member_group_id, g.id as group_id
      from public.groups g
      join public.group_memberships gm
        on gm.group_id = g.id and gm.status = 'active'
     where g.status = 'active'
       and g.group_type = 'engagement'
       and (p_group_ids is null or g.id = any(p_group_ids))
       and public.has_permission(gm.member_group_id, g.id, 'manage_roles')
  )
  select count(distinct group_id), count(distinct member_group_id), count(*)
    into v_groups, v_recipients, v_notices
    from pairs;

  return jsonb_build_object(
    'group_count', coalesce(v_groups, 0),
    'recipient_count', coalesce(v_recipients, 0),
    'notice_count', coalesce(v_notices, 0));
end;
$$;

comment on function public.admin_preview_publication_reach(uuid, uuid[]) is
  'RD-B walk fix W-6 (2026-08-09): how far a publish would reach, BEFORE it is '
  'made — distinct groups, distinct recipients, and the notice-row volume. '
  'Read-only and admin-gated. Its recipient predicate is a deliberate mirror '
  'of admin_publish_role_template''s; integration cell W6c publishes and '
  'compares, so a drift between the preview and the act fails loudly rather '
  'than quietly stating a wrong number. Exists so the admin ceremony can state '
  'its blast radius before the click, as the Steward''s diff ceremony already '
  'does with its holder count.';

grant execute on function public.admin_preview_publication_reach(uuid, uuid[]) to authenticated;
