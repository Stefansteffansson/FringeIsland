-- ============================================================
-- FEAT-PC003 — bio length backstop (TASK-PC003-02)
-- ============================================================
-- Adds a DB-level CHECK on public.users.bio so an over-long bio is rejected at
-- the substrate, not only by the contract's validation. The own-row UPDATE
-- policy (users_update_own: auth_user_id = auth.uid()) lets an authenticated
-- caller write their own bio directly, so the DB must be the backstop; the
-- contract-layer length check (lib/profile/queries.ts) is defense-in-depth.
-- This gives `bio` parity with the existing DB-enforced identity-scope
-- constraints `nickname_not_empty` and `users_display_preference_check`.
--
-- SOURCE OF TRUTH for the bound is the TS constant PROFILE_BIO_MAX_LENGTH (500)
-- in lib/profile/queries.ts; this literal mirrors it. A future tweak updates the
-- constant AND adds a NEW additive migration — this file is never rewritten
-- (migrations run in timestamp order; rewriting an applied migration diverges
-- environments).
--
-- Additive + non-breaking: ADD CONSTRAINT … NOT VALID lands the constraint
-- without an up-front full-table re-check, then VALIDATE checks existing rows in
-- a non-blocking pass. Existing bios are null/short, so VALIDATE succeeds.
-- No RLS change (the own-row UPDATE policy already exists). No trigger needed —
-- a length bound requires no subquery, so a plain CHECK is the correct tool.
-- ============================================================

ALTER TABLE public.users
  ADD CONSTRAINT bio_max_length CHECK (bio IS NULL OR char_length(bio) <= 500) NOT VALID;

ALTER TABLE public.users
  VALIDATE CONSTRAINT bio_max_length;
