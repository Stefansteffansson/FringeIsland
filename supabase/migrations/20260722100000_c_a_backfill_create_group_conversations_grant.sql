-- ---------------------------------------------------------------------------
-- C-A repair: backfill create_group_conversations to EXISTING template-derived
-- Steward/Guide role instances.
--
-- Provenance (A-COM area-gate live walk, RIDER-1, Stefan 2026-07-22):
--   The C-A migration (20260719230500 §10) seeded the permission catalog row
--   and the Steward/Guide TEMPLATE grants, but never backfilled instantiated
--   group_role_permissions — and has_permission() resolves through role
--   INSTANCES only. Every group created before C-A (160 role instances across
--   84 groups at time of discovery, incl. all real manual groups) therefore
--   silently lacked the permission: the "New conversation" affordance hid and
--   create_group_conversation() would raise 42501 for stewards.
--   C-D (20260720200000 §send_announcements) established the ratified backfill
--   pattern one day later (gate Q2: template-derived only; custom roles opt in
--   via the roles panel). This migration applies that exact pattern to C-A's
--   permission. Guarded test: conversation-contracts.test.ts "RIDER-1 …"
--   (red until this applies).
-- ---------------------------------------------------------------------------

INSERT INTO public.group_role_permissions (group_role_id, permission_id)
SELECT gr.id, p.id
FROM public.group_roles gr
JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
CROSS JOIN public.permissions p
WHERE rt.name IN ('Steward Role Template', 'Guide Role Template')
  AND p.name = 'create_group_conversations'
ON CONFLICT DO NOTHING;
