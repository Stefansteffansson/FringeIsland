-- ==========================================================================
-- Seed 06: Starter journeys — the three founding questions
-- ==========================================================================
-- Authored 2026-08-12, after the dev-DB reset for the Hub v2 clean start.
--
-- WHY THESE THREE. FringeIsland is built around three questions — Who am I?
-- What do I want? How do I get there? — so the starter catalogue is one walk
-- per question, in that order. They are deliberately short (19-24 minutes),
-- beginner-weighted, and written to be finished rather than admired.
--
-- WHAT THEY DO NOT TOUCH. The onboarding walk ("Arrival on FringeIsland",
-- `is_onboarding_designated`) is seeded elsewhere and is NOT re-created here.
-- Exactly one journey may carry that designation; this seed never sets it.
--
-- STEP CONTENT keys are the ones the renderer registry actually reads
-- (hub/components/journeys/step-renderers/index.tsx): narrative -> body,
-- reflection/journal/checklist -> prompt, choice -> prompt + options,
-- activity -> instructions + steps, checklist -> prompt + items. Content whose
-- keys miss the registry still renders via the mandatory fallback (JRN-18), so
-- a typo degrades quietly rather than loudly — hence keys matter here.
--
-- Idempotent: re-running is a no-op once a journey of the same title exists.
-- Owned by the DeusEx system group, so no human account is required and the
-- rows survive any user purge.
-- ==========================================================================

DO $$
DECLARE v_dx uuid; j uuid;
BEGIN
  SELECT id INTO v_dx FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';
  IF v_dx IS NULL THEN
    RAISE EXCEPTION 'Seed 06 requires the DeusEx system group (seed 04) to exist first';
  END IF;

  ---------------------------------------------------------------- Who am I?
  IF NOT EXISTS (SELECT 1 FROM public.journeys WHERE title = 'Who am I?') THEN
    INSERT INTO public.journeys (title, description, created_by_group_id, is_published, is_public,
      journey_type, estimated_duration_minutes, difficulty_level, tags, sequencing_mode, published_at, takeaway)
    VALUES ('Who am I?',
      'A first, unhurried look at yourself — what you carry, what you have outgrown, and what is actually yours.',
      v_dx, true, true, 'predefined', 21, 'beginner',
      ARRAY['self-knowledge','reflection','foundations'], 'linear', now(),
      jsonb_build_object('body','You are not a fixed thing to be solved. You are someone worth getting to know.'))
    RETURNING id INTO j;

    INSERT INTO public.journey_steps (journey_id, step_order, title, step_kind_key, content_family_key, required, duration_minutes, content) VALUES
     (j,1,'Starting where you are','narrative','witness',true,3, jsonb_build_object('body',
       'Most of us describe ourselves in borrowed words — a job title, a role in a family, something someone once said that stuck. This walk sets those aside for a while. Not because they are false, but because they are not the whole of it. There is nothing to get right here.')),
     (j,2,'What you would keep','reflection','reflect',true,5, jsonb_build_object('prompt',
       'If you could keep only three things about how you are today — a habit, a way of treating people, something you are quietly proud of — what would survive the cut?')),
     (j,3,'The private page','journal','reflect',true,6, jsonb_build_object('prompt',
       'Write freely for a few minutes about a moment you felt most like yourself. Where were you, who was there, and what were you doing? This page is yours alone — nobody else can read it.')),
     (j,4,'What you have outgrown','checklist','act',false,4, jsonb_build_object(
       'prompt','Some things fit us once and no longer do. Tick anything that feels more like an old coat than a current shape.',
       'items', jsonb_build_array('A story about what I am bad at','A role I took on to keep the peace','An ambition that was never really mine','A grudge I am tired of carrying','A rule about myself I never chose'))),
     (j,5,'Naming it plainly','reflection','reflect',true,3, jsonb_build_object(
       'prompt','In one sentence, without hedging: who are you today?',
       'takeaway', jsonb_build_object('body','The answer will change. That is not failure — it is the point of asking again.')));
  END IF;

  ---------------------------------------------------------- What do I want?
  IF NOT EXISTS (SELECT 1 FROM public.journeys WHERE title = 'What do I want?') THEN
    INSERT INTO public.journeys (title, description, created_by_group_id, is_published, is_public,
      journey_type, estimated_duration_minutes, difficulty_level, tags, sequencing_mode, published_at, takeaway)
    VALUES ('What do I want?',
      'Separating what you actually want from what you have been told to want — and daring to say one of them out loud.',
      v_dx, true, true, 'predefined', 19, 'beginner',
      ARRAY['direction','desire','clarity'], 'linear', now(),
      jsonb_build_object('body','Wanting something is not selfish. Not knowing what you want is what keeps you stuck.'))
    RETURNING id INTO j;

    INSERT INTO public.journey_steps (journey_id, step_order, title, step_kind_key, content_family_key, required, duration_minutes, content) VALUES
     (j,1,'Borrowed wants','narrative','witness',true,4, jsonb_build_object('body',
       'Plenty of what we chase was handed to us — by parents, by school, by whoever we were trying to impress at twenty. Those wants are not villains. They are just not always ours. The work is telling them apart.')),
     (j,2,'Which pull is loudest','choice','decide',true,4, jsonb_build_object(
       'prompt','When you imagine next year going well, which of these has changed most?',
       'options', jsonb_build_array('How I spend my days','Who I spend them with','What I am building','How I feel when I wake up','How much room I have to breathe'))),
     (j,3,'The honest version','reflection','reflect',true,6, jsonb_build_object('prompt',
       'Take the one you chose. Now say the wanting plainly, with no justification attached — no "it would be sensible to", no "I probably should". Just: I want ___.')),
     (j,4,'Say it once','journal','reflect',true,5, jsonb_build_object(
       'prompt','Write the sentence down, and then write what it would cost you to admit it publicly. Both halves matter.',
       'takeaway', jsonb_build_object('body','You do not have to act on it yet. Naming it is already a move.')));
  END IF;

  ------------------------------------------------------- How do I get there?
  IF NOT EXISTS (SELECT 1 FROM public.journeys WHERE title = 'How do I get there?') THEN
    INSERT INTO public.journeys (title, description, created_by_group_id, is_published, is_public,
      journey_type, estimated_duration_minutes, difficulty_level, tags, sequencing_mode, published_at, takeaway)
    VALUES ('How do I get there?',
      'Turning a want into a first step small enough that you will actually take it this week.',
      v_dx, true, true, 'predefined', 24, 'intermediate',
      ARRAY['action','planning','momentum'], 'linear', now(),
      jsonb_build_object('body','Direction beats speed. A small step you take beats a large one you plan.'))
    RETURNING id INTO j;

    INSERT INTO public.journey_steps (journey_id, step_order, title, step_kind_key, content_family_key, required, duration_minutes, content) VALUES
     (j,1,'Why plans stall','narrative','witness',true,4, jsonb_build_object('body',
       'Most plans do not fail because the goal was wrong. They fail because the first step was too big to start on a tired Tuesday. This walk shrinks the step until starting is easier than not starting.')),
     (j,2,'Cut it down','activity','act',true,7, jsonb_build_object(
       'instructions','Take the want you named. Halve it. Then halve it again. Keep going until what is left could be done in twenty minutes without asking anyone permission.',
       'steps', jsonb_build_array('Write the want as it stands','Halve the scope — what is the smaller version','Halve the time — what fits in one sitting','Strip anything needing another person''s approval','Write what remains as a single action'))),
     (j,3,'What is actually in the way','checklist','act',true,5, jsonb_build_object(
       'prompt','Be honest about the obstacle. Tick whatever is true for you.',
       'items', jsonb_build_array('I do not know the first move','I know it and it frightens me','I have no time carved out','I need someone else to say yes','I have started before and stopped'))),
     (j,4,'The week ahead','reflection','decide',true,5, jsonb_build_object('prompt',
       'When this week will you take that twenty-minute step? Name the day and the hour. Vagueness is where good intentions go to die.')),
     (j,5,'Travelling on','narrative','rest',false,3, jsonb_build_object(
       'body','That is the loop: ask who you are, name what you want, take one honest step. It runs again whenever you need it — alone, or with a group walking beside you.',
       'takeaway', jsonb_build_object('body','You do not need the whole staircase. You need the next stair.')));
  END IF;
END $$;
