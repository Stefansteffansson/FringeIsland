-- Fix users SELECT policy: only active users should be visible
-- Inactive users (is_active=false) must be invisible to everyone,
-- including themselves. This ensures AuthContext.signIn() correctly
-- detects deactivated accounts.

DROP POLICY IF EXISTS "users_select_own_and_search" ON public.users;

CREATE POLICY "users_select_active"
  ON public.users FOR SELECT TO authenticated
  USING (is_active = true);
