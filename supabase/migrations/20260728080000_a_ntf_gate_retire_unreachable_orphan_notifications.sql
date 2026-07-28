-- ===========================================================================
-- A-NTF area-gate hygiene — retire notification rows nobody can ever read.
-- Authorised by Stefan 2026-07-28 ("do the orphan based on your new number").
--
-- WHAT IS BEING DELETED. Notification rows addressed to a PERSONAL group that
-- no `users` row points at. Such a row is structurally unreachable: every read
-- door resolves the caller through `get_current_personal_group_id()`
-- (auth.uid() -> users.personal_group_id), so with no `users` row there is no
-- caller who can ever resolve that recipient. The rows are dead weight, not
-- private data being withheld from someone.
--
-- SCOPED BEFORE DELETING (live, 2026-07-28): 11 150 orphaned personal groups
-- holding 36 961 notification rows.
--
-- CORRECTION TO THE BRIEF: this was reported as 47 866 rows. That count was
-- taken BEFORE migration 20260728060000 retired the bootstrap self-rows, which
-- overlapped this set heavily. 36 961 is the remainder. Recorded rather than
-- silently restated.
--
-- WHAT IS **NOT** BEING DELETED, deliberately: the orphaned GROUPS themselves.
-- They are not inert. Measured live:
--     8 690 are active members of NON-personal (real) groups
--       577 hold journey enrolments
--       401 authored messages
-- Deleting them would cascade into real group member lists and would destroy
-- message attribution — which ADR-U021 forbids in spirit (stored communication
-- data is never mutated for anonymisation; posts are not deleted for member
-- exit). That is a separate decision with a separate blast radius, and it is
-- not this migration's.
--
-- THE SOURCE OF THE ORPHANS IS FIXED IN THE SAME COMMIT, not just their
-- symptom. `cleanupTestUser` (hub/tests/helpers/supabase.ts) deleted the
-- personal group without checking the result, then deleted the auth user; when
-- the group delete failed the CASCADE removed `public.users` anyway and the
-- group was orphaned forever. 2 248 orphans were created in the last 7 days
-- alone, the newest during this session's own measurement runs — so cleaning
-- the rows without closing that hole would simply let the population regrow.
-- ===========================================================================

DELETE FROM public.notifications n
 WHERE EXISTS (
   SELECT 1
     FROM public.groups g
    WHERE g.id = n.recipient_group_id
      AND g.group_type = 'personal'
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id
      )
 );
