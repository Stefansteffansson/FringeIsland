-- N-D corrective (2026-08-15, live walk) — role_assigned / role_removed move
-- from the `membership` category to `roles` ("Roles & permissions").
--
-- DATA-ONLY registry change (no DDL, no RLS, no grants): two UPDATE rows on
-- public.notification_kinds. Idempotent / re-runnable.
--
-- THE FINDING: a member assigned the Steward role looked under "Roles &
-- permissions", found it ticked, and got no bell — personal role news lived in
-- `membership` ("Group & membership updates"), while `roles` held only the
-- role-TEMPLATE catalog family (role_template_published/updated/retired).
-- Every member's first guess for "someone changed my role" is the switch that
-- says Roles & permissions; the registry filed it elsewhere. The dispatcher,
-- preference storage, and panel all behaved correctly — the FILING misled.
--
-- RULED (Stefan, 2026-08-15, option A of the board): personal role news joins
-- the roles category. `roles` now means ALL role news — personal assignment/
-- removal and catalog changes alike; `membership` keeps the joins/leaves/
-- removals family. Suppression semantics change accordingly: muting
-- "Group & membership updates" no longer silences role_assigned/role_removed;
-- muting "Roles & permissions" now does. Old delivered rows are untouched
-- (category resolves live through the kind join at read time).
--
-- SIBLING-ASSERTION SWEEP (tier rule — enumerated, each marked):
--   - preference-and-dispatcher-contracts.test.ts: MUTED_KIND is `member_left`
--     (re-pointed away from invitation_received at GB-3, 20260727180000 — the
--     same class of move as this one) -> unaffected, LEFT.
--   - notification-contracts.test.ts STORY-1 registry cells: assert shape, not
--     this mapping -> LEFT. NEW red-first cell (this change's own coverage)
--     pins role_assigned/role_removed -> roles: RED before, green after.
--   - notifications-inbox-page.test.tsx:64 `category: 'membership'`: renderer
--     fixture data, kind-agnostic -> LEFT.
--   - groups/admin suites referencing role_assigned assert the row EXISTS
--     after role ops, never its category -> LEFT.

UPDATE public.notification_kinds
   SET category_key = 'roles'
 WHERE kind IN ('role_assigned', 'role_removed')
   AND category_key IS DISTINCT FROM 'roles';
