-- Sprint 1: Foundation Schema
-- F1: Add groups.status column (active/closed/archived/suspended)
-- F2: Create "FringeIsland Journeys" engagement group + migrate predefined journey ownership
--
-- Depends on: Sprint 0 (v0.2.32) complete
-- TDD: Tests written in group-status.test.ts and platform-ownership.test.ts (RED → GREEN)

-- ═══════════════════════════════════════════════════════════════════════
-- F1: groups.status column
-- ═══════════════════════════════════════════════════════════════════════

-- Add status column with CHECK constraint
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add CHECK constraint (separate statement for IF NOT EXISTS safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_status_check'
  ) THEN
    ALTER TABLE public.groups
      ADD CONSTRAINT groups_status_check
      CHECK (status IN ('active', 'closed', 'archived', 'suspended'));
  END IF;
END
$$;

-- Partial index: covers the common query path (most groups are active)
CREATE INDEX IF NOT EXISTS idx_groups_status_active
  ON public.groups (id) WHERE status = 'active';

-- ─── Replace groups_select RLS policy ──────────────────────────────────
-- Previous policy (from 20260227110556_fix_personal_group_rls_visibility.sql):
--   USING (group_type = 'personal' OR is_public = true
--          OR is_active_group_member(id) OR is_invited_group_member(id)
--          OR created_by_group_id = get_current_personal_group_id()
--          OR is_platform_admin())
--
-- New policy adds status='active' filter for non-admin, non-personal arms.

DROP POLICY IF EXISTS "groups_select" ON public.groups;

CREATE POLICY "groups_select"
  ON public.groups FOR SELECT TO authenticated
  USING (
    -- Personal groups: always visible (identity containers, no status filter)
    group_type = 'personal'
    -- Active groups only for regular users
    OR (
      status = 'active'
      AND (
        is_public = true
        OR public.is_active_group_member(id)
        OR public.is_invited_group_member(id)
        OR created_by_group_id = public.get_current_personal_group_id()
      )
    )
    -- Platform admins: see ALL groups regardless of status
    OR public.is_platform_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════
-- F2: "FringeIsland Journeys" engagement group + journey ownership
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_fi_journeys_id UUID;
  v_deusex_id UUID;
  v_steward_role_id UUID;
BEGIN
  -- ─── Step 1: Look up DeusEx system group ───────────────────────────
  -- (Must happen before group creation so we can set created_by_group_id)
  SELECT id INTO v_deusex_id
    FROM public.groups
    WHERE name = 'DeusEx'
      AND group_type = 'system';

  IF v_deusex_id IS NULL THEN
    RAISE EXCEPTION 'DeusEx system group not found — cannot assign Steward';
  END IF;

  -- ─── Step 2: Create "FringeIsland Journeys" group (idempotent) ─────
  SELECT id INTO v_fi_journeys_id
    FROM public.groups
    WHERE name = 'FringeIsland Journeys'
      AND group_type = 'engagement';

  IF v_fi_journeys_id IS NULL THEN
    INSERT INTO public.groups (
      name, description, group_type, is_public, show_member_list, status,
      created_by_group_id
    ) VALUES (
      'FringeIsland Journeys',
      'Official FringeIsland predefined journeys',
      'engagement',
      true,   -- publicly visible
      false,  -- member list not relevant
      'active',
      v_deusex_id  -- owned by DeusEx (prevents globalTeardown orphan sweep)
    )
    RETURNING id INTO v_fi_journeys_id;

    RAISE NOTICE 'Created FringeIsland Journeys group: %', v_fi_journeys_id;
  ELSE
    -- Ensure created_by_group_id is set (fix for existing groups)
    UPDATE public.groups
      SET created_by_group_id = v_deusex_id
      WHERE id = v_fi_journeys_id
        AND created_by_group_id IS NULL;

    RAISE NOTICE 'FringeIsland Journeys group already exists: %', v_fi_journeys_id;
  END IF;

  -- ─── Step 3: Add DeusEx as member of FI Journeys group ────────────
  -- DeusEx group itself joins as a member (group-joins-group pattern)
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = v_fi_journeys_id
      AND member_group_id = v_deusex_id
  ) THEN
    INSERT INTO public.group_memberships (
      group_id, member_group_id, added_by_group_id, status
    ) VALUES (
      v_fi_journeys_id,
      v_deusex_id,
      v_deusex_id,  -- self-added (system bootstrap)
      'active'
    );

    RAISE NOTICE 'Added DeusEx as member of FringeIsland Journeys group';
  END IF;

  -- ─── Step 4: Create Steward role on FI Journeys group ─────────────
  SELECT id INTO v_steward_role_id
    FROM public.group_roles
    WHERE group_id = v_fi_journeys_id
      AND name = 'Steward';

  IF v_steward_role_id IS NULL THEN
    INSERT INTO public.group_roles (group_id, name, description)
    VALUES (
      v_fi_journeys_id,
      'Steward',
      'Group leader — manages journeys and group settings'
    )
    RETURNING id INTO v_steward_role_id;

    RAISE NOTICE 'Created Steward role on FI Journeys group: %', v_steward_role_id;
  END IF;

  -- ─── Step 5: Assign Steward role to DeusEx ─────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.user_group_roles
    WHERE member_group_id = v_deusex_id
      AND group_id = v_fi_journeys_id
      AND group_role_id = v_steward_role_id
  ) THEN
    INSERT INTO public.user_group_roles (
      member_group_id, group_id, group_role_id, assigned_by_group_id
    ) VALUES (
      v_deusex_id,
      v_fi_journeys_id,
      v_steward_role_id,
      v_deusex_id  -- self-assigned (system bootstrap)
    );

    RAISE NOTICE 'Assigned Steward role to DeusEx in FI Journeys group';
  END IF;

  -- ─── Step 6: Seed predefined journeys (if missing) ────────────────
  -- The 8 predefined journeys were lost during D15 rebuild (old migration
  -- referenced created_by_user_id). Re-seed with D15 schema using
  -- created_by_group_id pointing to FI Journeys group.
  IF NOT EXISTS (SELECT 1 FROM public.journeys LIMIT 1) THEN
    INSERT INTO public.journeys (
      title, description, created_by_group_id, is_published, is_public,
      journey_type, estimated_duration_minutes, difficulty_level, tags, content, published_at
    ) VALUES
    ('Leadership Fundamentals',
     'Discover the core principles of effective leadership. Learn to inspire, guide, and empower teams through authentic leadership practices.',
     v_fi_journeys_id, true, true, 'predefined', 180, 'beginner',
     ARRAY['leadership','fundamentals','team-building','communication'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"What is Leadership?","type":"content","duration_minutes":30,"required":true},{"id":"step_2","title":"Self-Assessment: Your Leadership Style","type":"activity","duration_minutes":45,"required":true},{"id":"step_3","title":"Building Trust and Credibility","type":"content","duration_minutes":30,"required":true},{"id":"step_4","title":"Practical Application: Lead a Team Meeting","type":"activity","duration_minutes":60,"required":true},{"id":"step_5","title":"Reflection and Next Steps","type":"assessment","duration_minutes":15,"required":true}]}'::jsonb, NOW()),

    ('Effective Communication Skills',
     'Master the art of clear, empathetic communication. Learn active listening, non-verbal communication, and how to adapt your message.',
     v_fi_journeys_id, true, true, 'predefined', 240, 'beginner',
     ARRAY['communication','listening','empathy','collaboration'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"The Foundation of Communication","type":"content","duration_minutes":30,"required":true},{"id":"step_2","title":"Active Listening Exercise","type":"activity","duration_minutes":45,"required":true},{"id":"step_3","title":"Non-Verbal Communication","type":"content","duration_minutes":30,"required":true},{"id":"step_4","title":"Difficult Conversations","type":"content","duration_minutes":45,"required":true},{"id":"step_5","title":"Practice: Conduct a Feedback Session","type":"activity","duration_minutes":60,"required":true},{"id":"step_6","title":"Communication Skills Assessment","type":"assessment","duration_minutes":30,"required":true}]}'::jsonb, NOW()),

    ('Building High-Performance Teams',
     'Learn proven strategies for creating and leading high-performing teams. Explore team dynamics, conflict resolution, and collaboration.',
     v_fi_journeys_id, true, true, 'predefined', 300, 'intermediate',
     ARRAY['team-building','leadership','collaboration','performance'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"Understanding Team Dynamics","type":"content","duration_minutes":40,"required":true},{"id":"step_2","title":"Team Assessment Activity","type":"activity","duration_minutes":60,"required":true},{"id":"step_3","title":"Setting Clear Goals and Expectations","type":"content","duration_minutes":30,"required":true},{"id":"step_4","title":"Navigating Conflict","type":"content","duration_minutes":45,"required":true},{"id":"step_5","title":"Building Trust Exercise","type":"activity","duration_minutes":60,"required":true},{"id":"step_6","title":"Creating Your Team Development Plan","type":"activity","duration_minutes":45,"required":true},{"id":"step_7","title":"Final Assessment and Reflection","type":"assessment","duration_minutes":20,"required":true}]}'::jsonb, NOW()),

    ('Personal Development Kickstart',
     'Begin your personal growth journey with clarity and purpose. Identify your values, set meaningful goals, and develop habits.',
     v_fi_journeys_id, true, true, 'predefined', 150, 'beginner',
     ARRAY['personal-development','goals','self-awareness','habits'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"Discovering Your Core Values","type":"activity","duration_minutes":45,"required":true},{"id":"step_2","title":"Vision Crafting","type":"activity","duration_minutes":30,"required":true},{"id":"step_3","title":"SMART Goal Setting","type":"content","duration_minutes":20,"required":true},{"id":"step_4","title":"Create Your 90-Day Plan","type":"activity","duration_minutes":40,"required":true},{"id":"step_5","title":"Building Supportive Habits","type":"content","duration_minutes":15,"required":true}]}'::jsonb, NOW()),

    ('Strategic Decision Making',
     'Elevate your decision-making capabilities with frameworks and tools used by top leaders.',
     v_fi_journeys_id, true, true, 'predefined', 270, 'advanced',
     ARRAY['strategy','decision-making','leadership','critical-thinking'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"Decision-Making Frameworks","type":"content","duration_minutes":45,"required":true},{"id":"step_2","title":"Case Study Analysis","type":"activity","duration_minutes":60,"required":true},{"id":"step_3","title":"Risk Assessment and Management","type":"content","duration_minutes":40,"required":true},{"id":"step_4","title":"Decision Under Pressure Simulation","type":"activity","duration_minutes":75,"required":true},{"id":"step_5","title":"Building Your Decision-Making Toolkit","type":"activity","duration_minutes":30,"required":true},{"id":"step_6","title":"Strategic Assessment","type":"assessment","duration_minutes":20,"required":true}]}'::jsonb, NOW()),

    ('Emotional Intelligence at Work',
     'Develop your emotional intelligence to enhance workplace relationships and performance.',
     v_fi_journeys_id, true, true, 'predefined', 210, 'intermediate',
     ARRAY['emotional-intelligence','self-awareness','empathy','relationships'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"Understanding Emotional Intelligence","type":"content","duration_minutes":30,"required":true},{"id":"step_2","title":"Self-Awareness Assessment","type":"activity","duration_minutes":45,"required":true},{"id":"step_3","title":"Emotional Regulation Techniques","type":"content","duration_minutes":30,"required":true},{"id":"step_4","title":"Empathy in Practice","type":"activity","duration_minutes":45,"required":true},{"id":"step_5","title":"Building Stronger Relationships","type":"content","duration_minutes":30,"required":true},{"id":"step_6","title":"EQ Development Plan","type":"activity","duration_minutes":30,"required":true}]}'::jsonb, NOW()),

    ('Agile Team Collaboration',
     'Master agile principles and practices for modern team collaboration.',
     v_fi_journeys_id, true, true, 'predefined', 200, 'intermediate',
     ARRAY['agile','collaboration','teamwork','productivity'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"Agile Fundamentals","type":"content","duration_minutes":35,"required":true},{"id":"step_2","title":"Sprint Planning Workshop","type":"activity","duration_minutes":50,"required":true},{"id":"step_3","title":"Effective Daily Standups","type":"content","duration_minutes":20,"required":true},{"id":"step_4","title":"Retrospective Techniques","type":"content","duration_minutes":30,"required":true},{"id":"step_5","title":"Conduct Your First Retrospective","type":"activity","duration_minutes":45,"required":true},{"id":"step_6","title":"Agile Mastery Assessment","type":"assessment","duration_minutes":20,"required":true}]}'::jsonb, NOW()),

    ('Resilience and Stress Management',
     'Build mental and emotional resilience to thrive under pressure.',
     v_fi_journeys_id, true, true, 'predefined', 180, 'beginner',
     ARRAY['resilience','wellness','stress-management','mindfulness'],
     '{"version":"1.0","structure":"linear","steps":[{"id":"step_1","title":"Understanding Stress and Resilience","type":"content","duration_minutes":30,"required":true},{"id":"step_2","title":"Stress Triggers Assessment","type":"activity","duration_minutes":30,"required":true},{"id":"step_3","title":"Mindfulness and Breathing Techniques","type":"content","duration_minutes":25,"required":true},{"id":"step_4","title":"Building Your Resilience Toolkit","type":"activity","duration_minutes":40,"required":true},{"id":"step_5","title":"Creating Healthy Boundaries","type":"content","duration_minutes":25,"required":true},{"id":"step_6","title":"30-Day Resilience Challenge","type":"activity","duration_minutes":30,"required":true}]}'::jsonb, NOW());

    RAISE NOTICE 'Seeded 8 predefined journeys owned by FI Journeys group: %', v_fi_journeys_id;
  ELSE
    -- Journeys exist — just update ownership to FI Journeys group
    UPDATE public.journeys
      SET created_by_group_id = v_fi_journeys_id,
          is_public = true
      WHERE title IN (
        'Leadership Fundamentals',
        'Effective Communication Skills',
        'Building High-Performance Teams',
        'Personal Development Kickstart',
        'Strategic Decision Making',
        'Emotional Intelligence at Work',
        'Agile Team Collaboration',
        'Resilience and Stress Management'
      );

    RAISE NOTICE 'Updated predefined journey ownership to FringeIsland Journeys group';
  END IF;
END
$$;
