-- COR-D W6 corrective — revoke the default EXECUTE grant on the W6 trigger
-- function. Found by the anon-execute-lockdown gate on the first post-merge
-- run (the gate earning its keep): 20260811100000 created
-- enforce_consent_withdrawable() without a REVOKE, so it carried Postgres's
-- default PUBLIC EXECUTE (the known default-grant window, TASK-SEC-01).
-- EXECUTE on a trigger function is not directly callable, but the lockdown
-- invariant is deliberately a blanket ("no function in schema public is
-- executable by anon" — the invariant, not a list), and the fix is the same
-- one the rd_b_walk corrective applied: revoke, retest.
--
-- ACL tightening only on the object approved at PR #489's named nod
-- (2026-08-11); no behavior change.

REVOKE ALL ON FUNCTION public.enforce_consent_withdrawable() FROM PUBLIC, anon, authenticated;
