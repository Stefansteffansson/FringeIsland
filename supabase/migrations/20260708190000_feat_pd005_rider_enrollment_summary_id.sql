-- ============================================================
-- FEAT-PD005 rider — get_group_enrollment_summary carries enrollment_id
-- (Cycle J-D, found at the Hub build: the group detail's Progress panel keys
-- its expander on the enrolment, but the FEAT-PD002 summary read serves
-- {journey_id, title, status} only — the panel is dark without the id.
-- A payload-meets-consumer miss at the J-D decomposition walk; flagged by the
-- Hub session, held for the gate nod like any function re-issue.)
--
-- ONE additive key on ONE existing read. No new tables, columns, indexes,
-- RLS policies, or triggers; gates, ordering, and every pre-existing key
-- byte-identical (the PD002 suite pins values, not an exact key set —
-- verified before authoring). Direct-caller posture unchanged (ADR-U038):
-- same FIM-only + _journey_party_visible gates; the id was already readable
-- to these callers via enrollment_select_group RLS — nothing widens.
-- ============================================================

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

comment on function public.get_group_enrollment_summary(uuid) is
  'FEAT-PD002 STORY-6 (the G-A seam), rider-amended by FEAT-PD005 (J-D): the group detail''s journey summary — count + entries, now carrying enrollment_id (additive) so the JRN-16/17 Progress panel can key its expander. FIM-only; party visibility via _journey_party_visible; P0002 conceals.';

do $$
begin
  assert to_regprocedure('public.get_group_enrollment_summary(uuid)') is not null,
    'PD005 rider: summary read missing';
end $$;
