import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import { fetchOwnAccountState } from '@/lib/account/queries';

/**
 * FEAT-PC004 — account-state read (IDN-9). Integration tests against real
 * Postgres + RLS. The contract is the `get_own_account_state()` SECURITY DEFINER
 * function, exercised through the lib (`fetchOwnAccountState`) run as the
 * authenticated caller — the `.rpc()` resolves `auth.uid()` inside the definer.
 *
 * Red-first: until the migration is applied the function does not exist, so the
 * `.rpc()` errors and every state assertion fails (the headline red the schema
 * gate turns green).
 */
describe('FEAT-PC004 — own account-state read', () => {
  const admin = createAdminClient();

  describe('STORY-1: an active member reads their own state', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Active Member' });
    });
    afterAll(async () => {
      if (user) await cleanupTestUser(user.user.id);
    });

    it('returns state=active with the raw lifecycle facts and nothing else', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const state = await fetchOwnAccountState(supabase);

      expect(state).not.toBeNull();
      expect(state!.state).toBe('active');
      expect(state!.is_active).toBe(true);
      expect(state!.is_decommissioned).toBe(false);
      // Only the lifecycle facts + derived label — no profile fields, no other
      // user's data. ADAPTATION (C-F, labelled): deactivation_origin joined the
      // payload additively (ADR-U050 origin split — null while active).
      expect(Object.keys(state!).sort()).toEqual(
        // ADAPTATION (FEAT-PC030, DB-4, 2026-09-03, labelled): suspension_reason joined the
        // payload additively — null while active, the current hold's reason while suspended.
        ['is_active', 'is_decommissioned', 'deactivation_origin', 'state', 'suspension_reason'].sort(),
      );
    });
  });

  describe('STORY-2: a suspended member can still read their own state', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Suspended Member' });
      // Admin switches the account OFF (suspended = off, not closed). This is the
      // only way to reach the state today (no self-pause yet).
      const { error } = await admin
        .from('users')
        .update({ is_active: false })
        .eq('auth_user_id', user.user.id);
      if (error) throw error;
    });
    afterAll(async () => {
      if (user) await cleanupTestUser(user.user.id);
    });

    it('returns state=suspended even though users_select_active hides the row', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const state = await fetchOwnAccountState(supabase);

      expect(state!.state).toBe('suspended');
      expect(state!.is_active).toBe(false);
      expect(state!.is_decommissioned).toBe(false);
    });

    it('an ordinary SELECT on the suspended row still returns nothing (filter unchanged)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.user.id);

      // Only the SECURITY DEFINER primitive sees through the visibility filter;
      // an ordinary read is still blank for a switched-off member.
      expect(data ?? []).toHaveLength(0);
    });
  });

  describe('STORY-3: a decommissioned member reads the terminal state', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Decommissioned Member' });
      // enforce_decommission_invariant() forces is_active=false on decommission.
      const { error } = await admin
        .from('users')
        .update({ is_decommissioned: true })
        .eq('auth_user_id', user.user.id);
      if (error) throw error;
    });
    afterAll(async () => {
      if (user) await cleanupTestUser(user.user.id);
    });

    it('returns state=decommissioned, distinct from suspended', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const state = await fetchOwnAccountState(supabase);

      expect(state!.state).toBe('decommissioned');
      expect(state!.is_decommissioned).toBe(true);
    });
  });

  describe('STORY-4: own-row only, no cross-user exposure', () => {
    let alice: TestUser;
    let bob: TestUser;
    beforeAll(async () => {
      alice = await createTestUser({ displayName: 'Alice' });
      bob = await createTestUser({ displayName: 'Bob' });
      // Put Bob in a distinct state so a cross-read would be detectable.
      await admin.from('users').update({ is_active: false }).eq('auth_user_id', bob.user.id);
    });
    afterAll(async () => {
      if (alice) await cleanupTestUser(alice.user.id);
      if (bob) await cleanupTestUser(bob.user.id);
    });

    it("resolves the caller's own row only — Alice reads active, never Bob's suspended", async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, alice.email, alice.password);

      const state = await fetchOwnAccountState(supabase);

      // There is no parameter to target Bob; the contract is structurally
      // own-row, so Alice resolves to her own 'active', not Bob's 'suspended'.
      expect(state!.state).toBe('active');
    });
  });

  describe('STORY-5: clean empty case for a caller with no own row', () => {
    it('returns null (not an error) when auth.uid() resolves no users row', async () => {
      // The service-role client carries no auth.uid(), so the definer resolves
      // no own row — the clean empty case. (Truly sessionless callers are gated
      // with a 401 at the route; see the route unit test.)
      const state = await fetchOwnAccountState(admin);
      expect(state).toBeNull();
    });
  });
});
