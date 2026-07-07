-- ============================================================================
-- FEAT-PD002 Amendment (J-A build finding, 2026-07-07): the viewer block
-- carries the withdraw handles.
--
-- FEAT-H019 STORY-5 binds the Surface to "affordance per the payload, never
-- client-guessed": Withdraw appears only for the caller's own ACTIVE
-- enrolment and for group enrolments the caller may actually withdraw; a
-- frozen enrolment renders a held state with no affordance. The v1 viewer
-- block (is_enrolled_individually / enrolled_via group refs / enrollable
-- groups) carried none of the handles that rule needs — the surface would
-- have had to guess withdrawability client-side (the ADR-U041 anti-pattern)
-- or offer affordances the contract then refuses.
--
-- Additive replacement-in-place of get_journey_detail (jsonb-additive per the
-- spec's extensibility posture; no signature change, no table change, no
-- policy change; CREATE OR REPLACE preserves the existing grants):
--   + individual_enrollment: null | { enrollment_id, status } — the caller's
--     own row (personal group as party).
--   + enrolled_via entries gain enrollment_id, status, and can_withdraw —
--     has_permission(actor, group, 'unenroll_from_journey') resolved
--     platform-side, exactly the gate withdraw_from_journey enforces.
-- ============================================================================

create or replace function public.get_journey_detail(
  p_journey_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_journey public.journeys%rowtype;
  v_steps jsonb;
  v_individual jsonb := null;
  v_enrolled_via jsonb := '[]'::jsonb;
  v_enrollable jsonb := '[]'::jsonb;
begin
  v_actor := public.get_current_personal_group_id();

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'title', t.s->>'title',
              'kind', t.s->>'type',
              'duration_minutes', nullif(t.s->>'duration_minutes', '')::integer)
            order by t.ord)
       from jsonb_array_elements(coalesce(v_journey.content->'steps', '[]'::jsonb))
            with ordinality as t(s, ord)),
    '[]'::jsonb);

  if v_actor is not null then
    select jsonb_build_object('enrollment_id', e.id, 'status', e.status)
      into v_individual
      from public.journey_enrollments e
     where e.journey_id = p_journey_id and e.group_id = v_actor;

    v_enrolled_via := coalesce(
      (select jsonb_agg(jsonb_build_object(
                'group_id', g.id,
                'group_name', g.name,
                'enrollment_id', e.id,
                'status', e.status,
                'can_withdraw', coalesce(
                  public.has_permission(v_actor, g.id, 'unenroll_from_journey'), false))
              order by g.name asc)
         from public.journey_enrollments e
         join public.groups g on g.id = e.group_id
         join public.group_memberships gm
           on gm.group_id = e.group_id
          and gm.member_group_id = v_actor
          and gm.status = 'active'
        where e.journey_id = p_journey_id
          and e.group_id <> v_actor),
      '[]'::jsonb);

    v_enrollable := coalesce(
      (select jsonb_agg(jsonb_build_object('group_id', g.id, 'group_name', g.name)
              order by g.name asc)
         from public.groups g
         join public.group_memberships gm
           on gm.group_id = g.id
          and gm.member_group_id = v_actor
          and gm.status = 'active'
        where g.group_type = 'engagement'
          and g.status = 'active'
          and coalesce(public.has_permission(v_actor, g.id, 'enroll_group_in_journey'), false)),
      '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'id', v_journey.id,
    'title', v_journey.title,
    'description', v_journey.description,
    'difficulty_level', v_journey.difficulty_level,
    'estimated_duration_minutes', v_journey.estimated_duration_minutes,
    'tags', to_jsonb(coalesce(v_journey.tags, '{}'::text[])),
    'step_count', jsonb_array_length(v_steps),
    'steps', v_steps,
    'is_enrolled_individually', v_individual is not null,
    'individual_enrollment', v_individual,
    'enrolled_via', v_enrolled_via,
    'enrollable_groups', v_enrollable);
end;
$$;

comment on function public.get_journey_detail(uuid) is
  'FEAT-PD002 STORY-2 (JRN-2 platform half; JRN-4 picker source; amended 2026-07-07): one journey whole, viewer-shaped incl. the withdraw handles (individual_enrollment; per-enrolled_via enrollment_id/status/can_withdraw). P0002 no-existence-leak on unpublished/absent. SECURITY DEFINER: viewer block joins memberships + permission resolution across RLS.';
