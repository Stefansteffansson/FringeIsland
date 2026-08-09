-- ============================================================================
-- RD-B walk fix W-6 — CORRECTIVE: revoke the default PUBLIC execute grant.
--
-- WHAT WENT WRONG
--
-- 20260809100000 created admin_preview_publication_reach and granted EXECUTE to
-- `authenticated` — but never revoked the grant Postgres gives to PUBLIC by
-- default on CREATE FUNCTION. So `anon` could execute it.
--
-- Caught by verifying the live catalogue after the apply rather than trusting
-- the migration: of the eight role-distribution functions, this was the ONLY
-- one `anon` could execute. Every sibling denies it.
--
-- The house pattern, which 20260807090000:987-997 follows for all five of its
-- new contracts and which this file restores:
--
--     revoke all  on function public.X(...) from public, anon;
--     grant execute on function public.X(...) to authenticated, service_role;
--
-- NO DATA WAS EXPOSED. The function is SECURITY DEFINER behind
-- is_platform_admin(), so an anonymous caller reached the gate and was refused
-- 42501 — the ADR-U038 direct-caller question answers safely either way. This
-- is defence in depth being restored, not a leak being closed. It is recorded
-- as a real miss regardless: "the gate caught it" is not a reason to leave an
-- unintended grant standing, and the next function created by copying that one
-- would inherit the omission.
--
-- 20260809100000 also omitted `service_role` from its grant, which mattered
-- only once the PUBLIC grant went away — service_role had been reaching it
-- through PUBLIC. Both are corrected here in one statement pair.
--
-- SIBLING ASSERTIONS INVALIDATED: NONE. No behaviour changes for any caller
-- that could legitimately call it. Integration cell W6g is ADDED by this change
-- and pins the posture directly, so the omission cannot recur silently.
-- ============================================================================

revoke all on function public.admin_preview_publication_reach(uuid, uuid[])
  from public, anon;

grant execute on function public.admin_preview_publication_reach(uuid, uuid[])
  to authenticated, service_role;
