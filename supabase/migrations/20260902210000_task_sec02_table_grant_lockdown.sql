-- TASK-SEC-02 — the table-grant lockdown: no client role may write a public
-- table directly. The second lock, finally locked, and gated.
--
-- WHAT WAS MEASURED (2026-08-11, re-measured 2026-09-02, read-only): 42 public
-- tables, RLS on all 42; `authenticated` still held Supabase's default INSERT on
-- 30 and TRUNCATE on 33; `anon` held DML on 33. NOT a live exploit — no write
-- policy covers those tables, PostgREST exposes no TRUNCATE verb, and no
-- SECURITY INVOKER function issues one. Defense-in-depth debt: the grant is
-- the second lock behind RLS, left unlocked because the first one holds. A
-- future permissive policy or invoker-mode helper would have found it missing.
--
-- POSTURE (ADR-U038): every write goes through a SECURITY DEFINER contract, so
-- the client roles need NO table-level DML. RLS governs reads; SELECT is
-- untouched by this migration. Verified before writing this: app code
-- (`hub/app`, `hub/lib`) has ZERO direct `.from().insert|update|delete|upsert`
-- calls (the outer-ring gate keeps browser-reachable modules off tables, and
-- the BFF writes through RPC); exactly ONE SECURITY INVOKER function executable
-- by `authenticated` writes a table as the caller — `update_own_profile` on
-- `users` (FEAT-PC003, under the `users_update_own` policy) — and that grant is
-- kept, named, below. The write policies on `groups`, `journal_entries` and
-- `pending_email_invitations` are dormant (no direct caller); they stay as they
-- are — a policy without a grant permits nothing.
--
-- THE GATE IS THE DELIVERABLE (the 2026-07-06 retro's lesson, applied to
-- tables as it was to functions): `table-grant-lockdown.test.ts` asserts the
-- invariant — no DML/TRUNCATE/REFERENCES/TRIGGER for anon/authenticated on any
-- public table beyond the named exception — AND that the default privileges
-- for the migration role no longer hand the full set to new tables. Red
-- before this migration; green after; red again the day a migration re-grants.
--
-- SEQUENCES (default `rwU` to the client roles) are out of this task's scope
-- and recorded as such in the task file.
--
-- SIBLING ASSERTIONS (the platform tier's rule: name what this invalidates,
-- each marked adapted or deliberately left):
--   * `tests/integration/groups/group-closure-deletion.test.ts` STORY-6 — two
--     cells pinned "direct DELETE refused by RLS: 0 rows, error null"; the
--     grant now refuses first (42501). ADAPTED, labelled.
--   * `tests/integration/groups/group-crud-contracts.test.ts` — the regression
--     guard "still allows the permitted Steward to update a settable column
--     directly" pinned PC010's column grant. INVERTED, labelled (see 2b).
--   * `tests/integration/groups/invitation-contracts.test.ts:916` — the direct
--     `pending_email_invitations` INSERT already expected a refusal; it now
--     refuses at the grant layer. LEFT (assertion unchanged).
--   * `tests/integration/profile/profile-update-path.test.ts` and
--     `profile-bio-constraint.test.ts` — direct own-row `users` UPDATEs on the
--     six identity columns keep working (the named exception). LEFT.
--   * E2E: every admin-client write is service_role (untouched); the Hub has
--     no direct client-role write, so no journey walks through one (Q1: none
--     to run beyond the post-apply slices).
--   * `tests/integration/platform/table-grant-lockdown.test.ts` — the gate,
--     RED before this migration, GREEN after.

-- 1. Every existing public table: revoke the write set from the client roles.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon, authenticated',
      t.relname
    );
  END LOOP;
END $$;

-- 2. The one named exception: `update_own_profile` (SECURITY INVOKER) writes
--    `users` as the caller under `users_update_own`. The grant is the second
--    lock behind that policy — kept, on purpose, and pinned by the gate.
--    COLUMN-scoped, exactly as migration 20260702120000 narrowed it: the six
--    identity-scope fields the contract accepts, never the lifecycle flags
--    (is_active / is_decommissioned / email stay out of the member's reach).
--    The table-level REVOKE above dropped this column grant with the rest
--    (Postgres revokes the matching column privileges), so it is re-issued.
GRANT UPDATE (full_name, nickname, display_preference, show_real_name, bio, avatar_url)
  ON public.users TO authenticated;

-- 2b. Closed on purpose, stated: FEAT-PC010's column-scoped UPDATE on `groups`
--    (name, description, label, avatar_url, settings, is_public,
--    show_member_list, updated_at) let a permitted Steward write settable
--    columns directly under the `groups_update` policy. The Hub has never used
--    it — `PATCH /api/groups/[id]` goes through `update_group_settings()`
--    (SECURITY DEFINER), the one door — and it was pinned only by a
--    regression-guard cell in `group-crud-contracts.test.ts`, adapted with a
--    label in the same PR. No client-role DML on `groups` remains.

-- 3. Future tables: stop the migration role's default ACL from handing the
--    full write set to the client roles. (`supabase_admin`'s own defaults are
--    Supabase-internal and apply only to objects it creates.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

COMMENT ON TABLE public.users IS
  'FIM identity rows. Client-role grants: SELECT (RLS-governed) and UPDATE for authenticated — the latter is the named TASK-SEC-02 exception behind the users_update_own policy, consumed by the SECURITY INVOKER update_own_profile (FEAT-PC003). Every other public table grants the client roles no DML at all (migration 20260902210000).';
