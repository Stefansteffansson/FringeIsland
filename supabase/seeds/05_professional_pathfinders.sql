-- ==========================================================================
-- Seed 05: Professional Pathfinders Engagement Group + 8 Predefined Journeys
-- ==========================================================================
-- Depends on: 01_permissions.sql, 02_role_templates.sql
-- Creates the "Professional Pathfinders" engagement group to own
-- the 8 predefined journeys (previously owned by first user).
-- ==========================================================================

DO $$
DECLARE
  v_pp_group_id UUID;
  v_steward_template_id UUID;
  v_member_template_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  SELECT id INTO v_member_template_id
  FROM public.role_templates WHERE name = 'Member Role Template';

  -- ========================================================================
  -- 1. Create the Professional Pathfinders engagement group
  -- ========================================================================
  INSERT INTO public.groups (
    name, description, group_type, is_public, show_member_list
  ) VALUES (
    'Professional Pathfinders',
    'The official FringeIsland content team. Creates and maintains predefined learning journeys.',
    'engagement',
    true,
    false
  )
  RETURNING id INTO v_pp_group_id;

  -- Create Steward and Member roles (trigger copies template permissions)
  INSERT INTO public.group_roles (group_id, name, description, created_from_role_template_id)
  VALUES
    (v_pp_group_id, 'Steward', 'Group owner and administrator', v_steward_template_id),
    (v_pp_group_id, 'Member', 'Active group member', v_member_template_id);

  -- ========================================================================
  -- 2. Seed 8 predefined journeys owned by Professional Pathfinders
  -- ========================================================================

  -- Journey 1: Leadership Fundamentals
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Leadership Fundamentals',
    'Master the core principles of effective leadership. This journey covers essential leadership concepts including vision-setting, team motivation, and leading by example. Perfect for new leaders or those looking to strengthen their foundation.',
    v_pp_group_id, true, true, 'predefined', 180, 'beginner',
    ARRAY['leadership', 'fundamentals', 'team-building', 'communication'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "lf_1", "title": "Understanding Leadership Styles", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "lf_2", "title": "Self-Assessment: Your Leadership Profile", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "lf_3", "title": "Building Trust and Credibility", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "lf_4", "title": "Vision Setting Workshop", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "lf_5", "title": "Leadership Fundamentals Assessment", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 2: Effective Communication Skills
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Effective Communication Skills',
    'Transform your communication abilities with practical techniques for clear, empathetic, and impactful exchanges. Learn active listening, non-verbal communication, and how to handle difficult conversations.',
    v_pp_group_id, true, true, 'predefined', 240, 'beginner',
    ARRAY['communication', 'listening', 'empathy', 'collaboration'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "ec_1", "title": "The Communication Framework", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "ec_2", "title": "Active Listening Exercises", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "ec_3", "title": "Non-Verbal Communication", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "ec_4", "title": "Difficult Conversations Practice", "type": "activity", "duration_minutes": 60, "required": true},
        {"id": "ec_5", "title": "Feedback Giving and Receiving", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "ec_6", "title": "Communication Skills Assessment", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 3: Building High-Performance Teams
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Building High-Performance Teams',
    'Learn proven strategies for creating and maintaining high-performance teams. From team formation to sustained excellence, this journey covers team dynamics, conflict resolution, and performance optimization.',
    v_pp_group_id, true, true, 'predefined', 300, 'intermediate',
    ARRAY['team-building', 'leadership', 'collaboration', 'performance'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "hp_1", "title": "Team Formation Theory", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "hp_2", "title": "Assessing Team Dynamics", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "hp_3", "title": "Psychological Safety", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "hp_4", "title": "Conflict Resolution Workshop", "type": "activity", "duration_minutes": 60, "required": true},
        {"id": "hp_5", "title": "Goal Alignment Exercise", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "hp_6", "title": "Performance Metrics Design", "type": "content", "duration_minutes": 45, "required": true},
        {"id": "hp_7", "title": "Team Performance Assessment", "type": "assessment", "duration_minutes": 45, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 4: Personal Development Kickstart
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Personal Development Kickstart',
    'Begin your personal growth journey with this introductory program. Set meaningful goals, develop self-awareness, and build habits that drive continuous improvement.',
    v_pp_group_id, true, true, 'predefined', 150, 'beginner',
    ARRAY['personal-development', 'goals', 'self-awareness', 'habits'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "pd_1", "title": "Self-Discovery Assessment", "type": "activity", "duration_minutes": 30, "required": true},
        {"id": "pd_2", "title": "Values and Purpose Exploration", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "pd_3", "title": "Goal Setting Workshop", "type": "activity", "duration_minutes": 30, "required": true},
        {"id": "pd_4", "title": "Building Effective Habits", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "pd_5", "title": "Personal Development Plan", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 5: Strategic Decision Making
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Strategic Decision Making',
    'Develop advanced decision-making skills using proven frameworks and models. Learn to analyze complex situations, evaluate options systematically, and make confident decisions under uncertainty.',
    v_pp_group_id, true, true, 'predefined', 270, 'advanced',
    ARRAY['strategy', 'decision-making', 'leadership', 'critical-thinking'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "sd_1", "title": "Decision-Making Frameworks", "type": "content", "duration_minutes": 45, "required": true},
        {"id": "sd_2", "title": "Cognitive Biases Workshop", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "sd_3", "title": "Risk Assessment Methods", "type": "content", "duration_minutes": 45, "required": true},
        {"id": "sd_4", "title": "Case Study: Strategic Decisions", "type": "activity", "duration_minutes": 60, "required": true},
        {"id": "sd_5", "title": "Group Decision Making", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "sd_6", "title": "Strategic Decision Assessment", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 6: Emotional Intelligence at Work
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Emotional Intelligence at Work',
    'Enhance your emotional intelligence to build stronger relationships and navigate workplace dynamics. Covers self-awareness, self-regulation, empathy, and social skills.',
    v_pp_group_id, true, true, 'predefined', 210, 'intermediate',
    ARRAY['emotional-intelligence', 'self-awareness', 'empathy', 'relationships'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "ei_1", "title": "Understanding Emotional Intelligence", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "ei_2", "title": "Emotional Self-Assessment", "type": "activity", "duration_minutes": 30, "required": true},
        {"id": "ei_3", "title": "Self-Regulation Techniques", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "ei_4", "title": "Empathy Building Exercises", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "ei_5", "title": "Social Skills Workshop", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "ei_6", "title": "EQ Application Assessment", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 7: Agile Team Collaboration
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Agile Team Collaboration',
    'Learn agile principles and practices for effective team collaboration. From daily standups to retrospectives, master the tools and mindsets that make agile teams successful.',
    v_pp_group_id, true, true, 'predefined', 200, 'intermediate',
    ARRAY['agile', 'collaboration', 'teamwork', 'productivity'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "ac_1", "title": "Agile Principles and Values", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "ac_2", "title": "Sprint Planning Simulation", "type": "activity", "duration_minutes": 45, "required": true},
        {"id": "ac_3", "title": "Effective Daily Standups", "type": "content", "duration_minutes": 20, "required": true},
        {"id": "ac_4", "title": "Collaboration Tools Workshop", "type": "activity", "duration_minutes": 40, "required": true},
        {"id": "ac_5", "title": "Retrospective Facilitation", "type": "activity", "duration_minutes": 35, "required": true},
        {"id": "ac_6", "title": "Agile Collaboration Assessment", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  -- Journey 8: Resilience and Stress Management
  INSERT INTO public.journeys (
    title, description, created_by_group_id, is_published, is_public,
    journey_type, estimated_duration_minutes, difficulty_level, tags,
    published_at, content
  ) VALUES (
    'Resilience and Stress Management',
    'Build mental resilience and develop effective stress management strategies. Learn to thrive under pressure, bounce back from setbacks, and maintain well-being in demanding environments.',
    v_pp_group_id, true, true, 'predefined', 180, 'beginner',
    ARRAY['resilience', 'wellness', 'stress-management', 'mindfulness'],
    NOW(),
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {"id": "rs_1", "title": "Understanding Stress and Resilience", "type": "content", "duration_minutes": 25, "required": true},
        {"id": "rs_2", "title": "Stress Response Assessment", "type": "activity", "duration_minutes": 25, "required": true},
        {"id": "rs_3", "title": "Mindfulness and Relaxation", "type": "content", "duration_minutes": 30, "required": true},
        {"id": "rs_4", "title": "Cognitive Reframing Workshop", "type": "activity", "duration_minutes": 35, "required": true},
        {"id": "rs_5", "title": "Building a Resilience Plan", "type": "activity", "duration_minutes": 35, "required": true},
        {"id": "rs_6", "title": "Resilience Skills Assessment", "type": "assessment", "duration_minutes": 30, "required": true}
      ]
    }'::jsonb
  );

  RAISE NOTICE 'Professional Pathfinders group created: %. 8 predefined journeys seeded.', v_pp_group_id;
END;
$$;
