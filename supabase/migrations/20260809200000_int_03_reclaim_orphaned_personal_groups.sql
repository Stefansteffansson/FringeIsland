-- ============================================================================
-- TASK-INT-03 — reclaim the orphaned personal groups that attribute nothing
-- that survives their own deletion.
--
-- WHAT AN ORPHAN IS
-- A `group_type = 'personal'` group that no `users` row points at. It is
-- unreachable by construction: every read door resolves the caller through
-- get_current_personal_group_id(), and with no `users` row nothing can ever
-- resolve it. The cost is table bloat and a badly misleading denominator on
-- any count over `groups` or `notifications`.
--
-- WHY THERE ARE 2 688 OF THEM
-- Test teardown deleted the personal group BEFORE the auth user and discarded
-- the result. That delete can never succeed (`users` references the group, so
-- the FK's SET NULL fires an immutability trigger), and the auth delete on the
-- next line then CASCADEd `public.users` away, leaving the group unreferenced.
-- Fixed in four places: cleanupTestUser (2026-07-28), perf-measure.mjs and the
-- E2E tier's three helpers + 24 spec call sites (2026-08-09). The E2E janitor
-- `cleanupAnonymousUsers` swept EVERY anonymous user per run, which is why
-- 1 357 of these are named "Mist". An orphan leak instrument now fails any E2E
-- run that grows the count, so this is a one-time reclaim, not a recurring one.
--
-- THE DISCRIMINATOR — the 2026-07-28 lesson, applied again
-- NOT "does it attribute anything?" — every personal group is the
-- created_by/added_by/assigned_by of its own bootstrap rows, so that test is
-- self-referential and keeps everything (the first strict pass in July said
-- "zero are safe" and was wrong). The right test is:
--
--     does this orphan attribute anything that SURVIVES its own deletion?
--
-- Attribution to rows that cascade away with it is not attribution. So each
-- clause below excludes the referencing rows that this orphan's own delete
-- would take with it, and keeps only genuine, permanent loss.
--
-- Measured 2026-08-09 before writing this file:
--   orphans 2 688 · blocked by RESTRICT 0 · KEEP 954 · DELETE 1 734
--   keep reasons: audit actor 640 · message sender 220 · created a surviving
--   group 146 · enrolment 26 · authored content 26 · inviter 26 · member/role 5
--
-- The classification is RECOMPUTED here rather than pasted as an id list, so
-- the set deleted is the set that is true at apply time. Conservative by
-- design: a row attributed to orphan A but living inside orphan B counts as
-- surviving for A, so A is kept. Over-keeping is cheap; over-deleting is not.
--
-- AN AUDIT TRAIL THAT FORGETS WHO ACTED IS WORTH MORE THAN THE ROWS IT WOULD
-- RECLAIM. That is why 640 audit actors and 220 message senders stay.
--
-- APPLY (dev DB):
--   node scripts/apply-migration-temp.js 20260809200000_int_03_reclaim_orphaned_personal_groups.sql
--   bash supabase-cli.sh migration repair --status applied 20260809200000
-- ============================================================================

do $$
declare
  v_orphans        int;
  v_deletable      int;
  v_deleted        int;
  -- controls, captured BEFORE the delete
  v_msgs_before        int;  v_msgs_after        int;
  v_msg_senders_before int;  v_msg_senders_after int;
  v_audit_before       int;  v_audit_after       int;
  v_audit_actor_before int;  v_audit_actor_after int;
  v_live_pg_before     int;  v_live_pg_after     int;
  v_forum_before       int;  v_forum_after       int;
  v_journeys_before    int;  v_journeys_after    int;
  v_consent_before     int;  v_consent_after     int;
begin
  create temporary table _int03_orphans on commit drop as
  select g.id
    from public.groups g
   where g.group_type = 'personal'
     and not exists (select 1 from public.users u where u.personal_group_id = g.id);

  select count(*) into v_orphans from _int03_orphans;

  -- Refuse rather than half-act: a RESTRICT referrer would abort the delete
  -- partway. There were none at classification time; assert it still holds.
  if exists (select 1 from _int03_orphans o
              where exists (select 1 from public.consent_records c where c.subject_group_id = o.id)
                 or exists (select 1 from public.journeys j where j.created_by_group_id = o.id)) then
    raise exception 'INT-03: a RESTRICT referrer appeared since classification — refusing to delete';
  end if;

  create temporary table _int03_deletable on commit drop as
  select o.id
    from _int03_orphans o
   where not exists (select 1 from public.admin_audit_log l where l.actor_group_id = o.id)
     and not exists (select 1 from public.messages m
                      left join public.conversations c on c.id = m.conversation_id
                     where m.sender_group_id = o.id
                       and (c.group_id is null or c.group_id <> o.id))
     and not exists (select 1 from public.role_template_versions v where v.created_by = o.id)
     and not exists (select 1 from public.role_template_publications p
                      where p.published_by = o.id and (p.group_id is null or p.group_id <> o.id))
     and not exists (select 1 from public.groups g2
                      where g2.created_by_group_id = o.id and g2.id <> o.id)
     and not exists (select 1 from public.group_memberships m
                      where (m.added_by_group_id = o.id or m.status_changed_by_group_id = o.id)
                        and m.group_id <> o.id and m.member_group_id <> o.id)
     and not exists (select 1 from public.user_group_roles r
                      where r.assigned_by_group_id = o.id
                        and r.group_id <> o.id and r.member_group_id <> o.id)
     and not exists (select 1 from public.journey_enrollments e
                      where e.enrolled_by_group_id = o.id and e.group_id <> o.id)
     and not exists (select 1 from public.forum_posts f
                      where f.author_group_id = o.id and f.group_id <> o.id)
     and not exists (select 1 from public.announcements a
                      where (a.author_group_id = o.id or a.retracted_by_group_id = o.id)
                        and (a.scope_group_id is null or a.scope_group_id <> o.id))
     and not exists (select 1 from public.content_reports cr
                      where (cr.resolved_by_group_id = o.id or cr.target_group_id = o.id)
                        and cr.reporter_group_id <> o.id)
     and not exists (select 1 from public.pending_email_invitations pe
                      where pe.invited_by_group_id = o.id and pe.group_id <> o.id)
     and not exists (select 1 from public.notifications n
                      where n.group_id = o.id and n.recipient_group_id <> o.id);

  select count(*) into v_deletable from _int03_deletable;

  select count(*), count(sender_group_id) into v_msgs_before, v_msg_senders_before from public.messages;
  select count(*), count(actor_group_id)  into v_audit_before, v_audit_actor_before from public.admin_audit_log;
  select count(*) into v_live_pg_before from public.groups g
    where g.group_type = 'personal'
      and exists (select 1 from public.users u where u.personal_group_id = g.id);
  select count(*) into v_forum_before    from public.forum_posts where author_group_id is not null;
  select count(*) into v_journeys_before from public.journeys;
  select count(*) into v_consent_before  from public.consent_records;

  delete from public.groups g using _int03_deletable d where g.id = d.id;
  get diagnostics v_deleted = row_count;

  select count(*), count(sender_group_id) into v_msgs_after, v_msg_senders_after from public.messages;
  select count(*), count(actor_group_id)  into v_audit_after, v_audit_actor_after from public.admin_audit_log;
  select count(*) into v_live_pg_after from public.groups g
    where g.group_type = 'personal'
      and exists (select 1 from public.users u where u.personal_group_id = g.id);
  select count(*) into v_forum_after    from public.forum_posts where author_group_id is not null;
  select count(*) into v_journeys_after from public.journeys;
  select count(*) into v_consent_after  from public.consent_records;

  -- CONTROLS. Fail the migration rather than report a false green. The July
  -- pass's decisive control was "messages 420, all 420 still carrying a
  -- sender" — not one message lost its author. Same control, asserted here.
  if v_deleted <> v_deletable then
    raise exception 'INT-03: deleted % but classified % as deletable', v_deleted, v_deletable;
  end if;
  if v_msgs_after <> v_msgs_before or v_msg_senders_after <> v_msg_senders_before then
    raise exception 'INT-03: messages changed (% -> % rows, % -> % with a sender)',
      v_msgs_before, v_msgs_after, v_msg_senders_before, v_msg_senders_after;
  end if;
  if v_audit_after <> v_audit_before or v_audit_actor_after <> v_audit_actor_before then
    raise exception 'INT-03: audit log changed (% -> % rows, % -> % with an actor)',
      v_audit_before, v_audit_after, v_audit_actor_before, v_audit_actor_after;
  end if;
  if v_live_pg_after <> v_live_pg_before then
    raise exception 'INT-03: LIVE personal groups changed % -> % — a real member was hit',
      v_live_pg_before, v_live_pg_after;
  end if;
  if v_forum_after <> v_forum_before then
    raise exception 'INT-03: forum posts lost an author (% -> %)', v_forum_before, v_forum_after;
  end if;
  if v_journeys_after <> v_journeys_before or v_consent_after <> v_consent_before then
    raise exception 'INT-03: journeys or consent records changed';
  end if;

  raise notice 'INT-03 reclaim: % orphans, % deletable, % deleted, % kept for stated attribution',
    v_orphans, v_deletable, v_deleted, v_orphans - v_deletable;
  raise notice 'INT-03 controls held: messages % (senders %), audit % (actors %), live personal groups %',
    v_msgs_after, v_msg_senders_after, v_audit_after, v_audit_actor_after, v_live_pg_after;
end $$;
