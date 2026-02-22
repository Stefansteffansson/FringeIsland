-- ==========================================================================
-- Seed 03: Group Templates + Group Template Roles
-- ==========================================================================
-- Depends on: 02_role_templates.sql
-- Four engagement group templates with default role assignments.
-- ==========================================================================

-- Group Templates
INSERT INTO public.group_templates (name, description, is_system) VALUES
  ('Small Team', 'Ideal for teams of 2-8 members working closely together', false),
  ('Large Group', 'For groups of 10-50 members with structured roles', false),
  ('Organization', 'For large organizations with multiple teams', false),
  ('Learning Cohort', 'For groups following a learning journey together', false);

-- ==========================================================================
-- Group Template Roles
-- Each template gets Steward, Guide, Member, Observer roles.
-- Member is the default role (auto-assigned on invitation accept).
-- ==========================================================================

-- Small Team
INSERT INTO public.group_template_roles (group_template_id, role_template_id, is_default)
SELECT gt.id, rt.id,
  CASE WHEN rt.name = 'Member Role Template' THEN true ELSE false END
FROM public.group_templates gt, public.role_templates rt
WHERE gt.name = 'Small Team'
  AND rt.name IN ('Steward Role Template', 'Guide Role Template', 'Member Role Template', 'Observer Role Template');

-- Large Group
INSERT INTO public.group_template_roles (group_template_id, role_template_id, is_default)
SELECT gt.id, rt.id,
  CASE WHEN rt.name = 'Member Role Template' THEN true ELSE false END
FROM public.group_templates gt, public.role_templates rt
WHERE gt.name = 'Large Group'
  AND rt.name IN ('Steward Role Template', 'Guide Role Template', 'Member Role Template', 'Observer Role Template');

-- Organization
INSERT INTO public.group_template_roles (group_template_id, role_template_id, is_default)
SELECT gt.id, rt.id,
  CASE WHEN rt.name = 'Member Role Template' THEN true ELSE false END
FROM public.group_templates gt, public.role_templates rt
WHERE gt.name = 'Organization'
  AND rt.name IN ('Steward Role Template', 'Guide Role Template', 'Member Role Template', 'Observer Role Template');

-- Learning Cohort
INSERT INTO public.group_template_roles (group_template_id, role_template_id, is_default)
SELECT gt.id, rt.id,
  CASE WHEN rt.name = 'Member Role Template' THEN true ELSE false END
FROM public.group_templates gt, public.role_templates rt
WHERE gt.name = 'Learning Cohort'
  AND rt.name IN ('Steward Role Template', 'Guide Role Template', 'Member Role Template', 'Observer Role Template');
