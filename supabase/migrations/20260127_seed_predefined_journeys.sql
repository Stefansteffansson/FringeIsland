-- ============================================
-- Migration: Seed Predefined Journeys
-- Date: 2026-01-27
-- Description: Add 8 high-quality predefined journeys for Phase 1.4
-- ============================================

-- IMPORTANT: Before running this migration, you need to determine which user
-- will be the creator of these predefined journeys. 
--
-- Option 1: Use your existing user
-- Run this query first to find your user ID:
--   SELECT id, email, full_name FROM users WHERE is_active = true;
-- Then replace 'YOUR_USER_ID_HERE' below with the actual UUID
--
-- Option 2: Or, if you want to use the first active user automatically,
-- you can replace the placeholder with:
--   (SELECT id FROM users WHERE is_active = true ORDER BY created_at ASC LIMIT 1)

-- Replace this line with your actual user ID:
DO $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Try to get the first active user as the creator
  SELECT id INTO v_creator_id 
  FROM users 
  WHERE is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- If no user found, raise an error with helpful message
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'No active users found. Please create a user account first, then run this migration.';
  END IF;
  
  -- Insert journeys using the found user ID
  INSERT INTO journeys (
    title,
    description,
    created_by_user_id,
    is_published,
    is_public,
    journey_type,
    estimated_duration_minutes,
    difficulty_level,
    tags,
    content,
    published_at
  ) VALUES

  -- Journey 1: Leadership Fundamentals
  (
    'Leadership Fundamentals',
    'Discover the core principles of effective leadership. Learn to inspire, guide, and empower teams through authentic leadership practices. Perfect for emerging leaders and those looking to strengthen their foundation.',
    v_creator_id,
    true,
    true,
    'predefined',
    180,
    'beginner',
    ARRAY['leadership', 'fundamentals', 'team-building', 'communication'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "What is Leadership?",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Self-Assessment: Your Leadership Style",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Building Trust and Credibility",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Practical Application: Lead a Team Meeting",
          "type": "activity",
          "duration_minutes": 60,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Reflection and Next Steps",
          "type": "assessment",
          "duration_minutes": 15,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 2: Effective Communication Skills
  (
    'Effective Communication Skills',
    'Master the art of clear, empathetic communication. Learn active listening, non-verbal communication, and how to adapt your message to different audiences. Essential for all professionals.',
    v_creator_id,
    true,
    true,
    'predefined',
    240,
    'beginner',
    ARRAY['communication', 'listening', 'empathy', 'collaboration'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "The Foundation of Communication",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Active Listening Exercise",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Non-Verbal Communication",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Difficult Conversations",
          "type": "content",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Practice: Conduct a Feedback Session",
          "type": "activity",
          "duration_minutes": 60,
          "required": true
        },
        {
          "id": "step_6",
          "title": "Communication Skills Assessment",
          "type": "assessment",
          "duration_minutes": 30,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 3: Building High-Performance Teams
  (
    'Building High-Performance Teams',
    'Learn proven strategies for creating and leading high-performing teams. Explore team dynamics, conflict resolution, and how to foster a culture of collaboration and excellence.',
    v_creator_id,
    true,
    true,
    'predefined',
    300,
    'intermediate',
    ARRAY['team-building', 'leadership', 'collaboration', 'performance'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "Understanding Team Dynamics",
          "type": "content",
          "duration_minutes": 40,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Team Assessment Activity",
          "type": "activity",
          "duration_minutes": 60,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Setting Clear Goals and Expectations",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Navigating Conflict",
          "type": "content",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Building Trust Exercise",
          "type": "activity",
          "duration_minutes": 60,
          "required": true
        },
        {
          "id": "step_6",
          "title": "Creating Your Team Development Plan",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_7",
          "title": "Final Assessment and Reflection",
          "type": "assessment",
          "duration_minutes": 20,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 4: Personal Development Kickstart
  (
    'Personal Development Kickstart',
    'Begin your personal growth journey with clarity and purpose. Identify your values, set meaningful goals, and develop habits that support your vision for success and fulfillment.',
    v_creator_id,
    true,
    true,
    'predefined',
    150,
    'beginner',
    ARRAY['personal-development', 'goals', 'self-awareness', 'habits'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "Discovering Your Core Values",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Vision Crafting",
          "type": "activity",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_3",
          "title": "SMART Goal Setting",
          "type": "content",
          "duration_minutes": 20,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Create Your 90-Day Plan",
          "type": "activity",
          "duration_minutes": 40,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Building Supportive Habits",
          "type": "content",
          "duration_minutes": 15,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 5: Strategic Decision Making
  (
    'Strategic Decision Making',
    'Elevate your decision-making capabilities with frameworks and tools used by top leaders. Learn to analyze complex situations, manage risk, and make confident decisions under pressure.',
    v_creator_id,
    true,
    true,
    'predefined',
    270,
    'advanced',
    ARRAY['strategy', 'decision-making', 'leadership', 'critical-thinking'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "Decision-Making Frameworks",
          "type": "content",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Case Study Analysis",
          "type": "activity",
          "duration_minutes": 60,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Risk Assessment and Management",
          "type": "content",
          "duration_minutes": 40,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Decision Under Pressure Simulation",
          "type": "activity",
          "duration_minutes": 75,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Building Your Decision-Making Toolkit",
          "type": "activity",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_6",
          "title": "Strategic Assessment",
          "type": "assessment",
          "duration_minutes": 20,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 6: Emotional Intelligence at Work
  (
    'Emotional Intelligence at Work',
    'Develop your emotional intelligence to enhance workplace relationships and performance. Learn self-awareness, self-regulation, empathy, and social skills that drive professional success.',
    v_creator_id,
    true,
    true,
    'predefined',
    210,
    'intermediate',
    ARRAY['emotional-intelligence', 'self-awareness', 'empathy', 'relationships'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "Understanding Emotional Intelligence",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Self-Awareness Assessment",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Emotional Regulation Techniques",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Empathy in Practice",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Building Stronger Relationships",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_6",
          "title": "EQ Development Plan",
          "type": "activity",
          "duration_minutes": 30,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 7: Agile Team Collaboration
  (
    'Agile Team Collaboration',
    'Master agile principles and practices for modern team collaboration. Learn sprint planning, daily standups, retrospectives, and how to adapt quickly to changing priorities.',
    v_creator_id,
    true,
    true,
    'predefined',
    200,
    'intermediate',
    ARRAY['agile', 'collaboration', 'teamwork', 'productivity'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "Agile Fundamentals",
          "type": "content",
          "duration_minutes": 35,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Sprint Planning Workshop",
          "type": "activity",
          "duration_minutes": 50,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Effective Daily Standups",
          "type": "content",
          "duration_minutes": 20,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Retrospective Techniques",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Conduct Your First Retrospective",
          "type": "activity",
          "duration_minutes": 45,
          "required": true
        },
        {
          "id": "step_6",
          "title": "Agile Mastery Assessment",
          "type": "assessment",
          "duration_minutes": 20,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  ),

  -- Journey 8: Resilience and Stress Management
  (
    'Resilience and Stress Management',
    'Build mental and emotional resilience to thrive under pressure. Learn evidence-based techniques for managing stress, maintaining balance, and bouncing back from setbacks.',
    v_creator_id,
    true,
    true,
    'predefined',
    180,
    'beginner',
    ARRAY['resilience', 'wellness', 'stress-management', 'mindfulness'],
    '{
      "version": "1.0",
      "structure": "linear",
      "steps": [
        {
          "id": "step_1",
          "title": "Understanding Stress and Resilience",
          "type": "content",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_2",
          "title": "Stress Triggers Assessment",
          "type": "activity",
          "duration_minutes": 30,
          "required": true
        },
        {
          "id": "step_3",
          "title": "Mindfulness and Breathing Techniques",
          "type": "content",
          "duration_minutes": 25,
          "required": true
        },
        {
          "id": "step_4",
          "title": "Building Your Resilience Toolkit",
          "type": "activity",
          "duration_minutes": 40,
          "required": true
        },
        {
          "id": "step_5",
          "title": "Creating Healthy Boundaries",
          "type": "content",
          "duration_minutes": 25,
          "required": true
        },
        {
          "id": "step_6",
          "title": "30-Day Resilience Challenge",
          "type": "activity",
          "duration_minutes": 30,
          "required": true
        }
      ]
    }'::jsonb,
    NOW()
  );

  -- Success message
  RAISE NOTICE 'Successfully created 8 predefined journeys with creator: %', v_creator_id;

END $$;

-- ============================================
-- Migration complete!
-- Verify by running: SELECT id, title, difficulty_level FROM journeys;
-- ============================================
