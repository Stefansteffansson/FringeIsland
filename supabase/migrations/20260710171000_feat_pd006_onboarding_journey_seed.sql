-- ============================================================================
-- FEAT-PD006 — the placeholder onboarding journey seed (ADR-U045 §5).
--
-- Cycle J-E, TASK-JE-02. One journey, seeded as NATIVE journey_steps rows —
-- deliberately NOT the legacy content.steps[] + _migrate_journey_content_steps()
-- path: this is a brand-new ADR-U044-native journey, and native inserts let
-- the seed carry per-step content payloads including the ADR-U046 takeaway
-- keys, which the legacy conversion cannot. journeys.content stays NULL, so
-- the conversion machinery never matches it (the migrate loop filters on
-- content ? 'steps') and the parity guard cannot half-run over it.
--
-- Owner: the DeusEx system group — the platform's journey custodian (the
-- PC014 closure-reassignment precedent). Deliberately NOT "FringeIsland
-- Members": every FIM is a member there, and the catalogue's member-visibility
-- disjunct would leak the journey into every FIM's browse view.
--
-- Posture: is_published=true (a valid enrollable published journey for the
-- FIM path) + is_public=false (not a discovery target — kept out of browse)
-- + is_onboarding_designated=true (the partial unique index admits this one).
--
-- Content is THROWAWAY; structure is real (ADR-U045 §5). RE-AUTHORING HOOK:
-- the real welcome — the traveller meeting FringeIsland and their Whisp —
-- arrives with the first-experience work (CQ-010); replace the step bodies
-- and takeaways there, keeping ids/structure stable if enrolments exist.
--
-- Takeaway seed (ADR-U046 §4, pending-DS-4): journey-level closing word in
-- journeys.takeaway; per-step takeaways as a `takeaway` key inside the
-- existing inline content JSONB. Rendered at J-F; seeded here only.
--
-- RLS impact: none (data only). Runs as the migration role; direct
-- authenticated writes to these tables remain impossible (ADR-U038 posture).
-- ============================================================================

do $$
declare
  v_owner uuid;
  v_journey_id uuid;
begin
  select g.id into v_owner
    from public.groups g
   where g.name = 'DeusEx' and g.group_type = 'system';
  if v_owner is null then
    raise exception 'FEAT-PD006 seed: DeusEx system group not found — seed 04_system_groups must have run';
  end if;

  insert into public.journeys
    (title, description, created_by_group_id,
     is_published, is_public, is_onboarding_designated,
     journey_type, sequencing_mode, difficulty_level,
     estimated_duration_minutes, tags, content, takeaway, published_at)
  values
    ('Arrival on FringeIsland',
     'The front door — a short welcome walk that meets every traveller at '
     'first arrival: who this place is, the three questions it turns on, and '
     'where to go next. Walk it at your own pace; leave whenever you like.',
     v_owner,
     true, false, true,
     'predefined', 'linear', 'beginner',
     15, array['onboarding'],
     null, -- native steps: the conversion machinery must never match this journey
     jsonb_build_object(
       'body', 'You have arrived. FringeIsland is yours to explore now — '
               'the journeys, the groups, the people. The three questions '
               'travel with you: Who am I? What do I want? How do I get there?'),
     now())
  returning id into v_journey_id;

  insert into public.journey_steps
    (journey_id, step_order, title, step_kind_key, content_family_key,
     required, repeatable, duration_minutes, content)
  values
    (v_journey_id, 1, 'Welcome to FringeIsland', 'narrative', 'witness',
     true, false, 3,
     jsonb_build_object(
       'body', 'Welcome, traveller. FringeIsland is a place for finding your '
               'way — alone or with others, one step at a time. This short '
               'walk shows you around. Nothing here is a gate: you can step '
               'off the path at any moment and come back whenever you choose.',
       'takeaway', jsonb_build_object(
         'body', 'You are free here — the island opens to you, it never closes around you.'))),
    (v_journey_id, 2, 'Three questions', 'reflection', 'reflect',
     true, false, 5,
     jsonb_build_object(
       'prompt', 'Everything on FringeIsland turns on three questions: '
                 'Who am I? What do I want? How do I get there? '
                 'Take a moment with whichever one pulls at you today.')),
    (v_journey_id, 3, 'Look around', 'narrative', 'witness',
     false, false, 4,
     jsonb_build_object(
       'body', 'The island holds journeys to walk, groups to travel with, and '
               'a private journal that is yours alone. The navigation above '
               'reaches all of it — this walk will still be here when you '
               'come back.')),
    (v_journey_id, 4, 'Your next step', 'reflection', 'reflect',
     true, false, 3,
     jsonb_build_object(
       'prompt', 'Where do you want to go first? Browse the journeys, find '
                 'your people, or simply wander — there is no wrong door.',
       'takeaway', jsonb_build_object(
         'body', 'Arrival is not a test. It is an invitation — and you have already accepted it by being here.')));
end $$;
