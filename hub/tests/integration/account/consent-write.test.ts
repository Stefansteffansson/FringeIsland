import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import { fetchOwnConsentState, recordConsentDecision } from '@/lib/consent/queries';

/**
 * FEAT-PC007 — consent decision write (IDN-7 consent half). Integration tests
 * against real Postgres + RLS. The contract is the `record_consent_decision()`
 * SECURITY DEFINER function, exercised as the authenticated caller — the subject
 * is resolved from auth.uid() inside the definer (own-subject, no target param).
 *
 * Red-first: until the migration adds the function, every `.rpc()` errors
 * (PGRST202 / function-missing) and the grant/withdraw/refusal/idempotency
 * assertions fail. The refusal tests assert the SPECIFIC SQLSTATE so a missing
 * function can never masquerade as a pass-at-red.
 */

/** Purge seeded consent + delete the user (append-only FK is ON DELETE RESTRICT). */
async function teardownUser(user: TestUser): Promise<void> {
  await runAdminSql(
    `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
      `DELETE FROM public.consent_records WHERE subject_group_id = '${user.personalGroupId}'; END $$;`,
  ).catch(() => undefined);
  await cleanupTestUser(user.user.id);
}

/** Count the caller's own history rows for a purpose (the append-only ledger). */
async function historyCount(supabase: SupabaseClient, purpose: string): Promise<number> {
  const { history } = await fetchOwnConsentState(supabase);
  return history.filter((h) => h.purpose === purpose).length;
}

/** Effective decision for a purpose (null = undecided). */
async function effectiveDecision(
  supabase: SupabaseClient,
  purpose: string,
): Promise<string | null> {
  const { effective } = await fetchOwnConsentState(supabase);
  return effective.find((e) => e.purpose === purpose)?.decision ?? null;
}

/** Seed one consent row directly (service-role bypasses RLS; no client INSERT policy). */
async function seedRow(
  admin: SupabaseClient,
  user: TestUser,
  purpose: string,
  decision: string,
): Promise<void> {
  const { data: u } = await admin
    .from('users')
    .select('id')
    .eq('auth_user_id', user.user.id)
    .single();
  const { error } = await admin.from('consent_records').insert({
    subject_user_id: u!.id as string,
    subject_group_id: user.personalGroupId,
    purpose,
    decision,
    policy_version: 'v1',
    capture_context: { surface: 'test' },
  });
  if (error) throw error;
}

describe('FEAT-PC007 — consent decision write', () => {
  const admin = createAdminClient();

  describe('STORY-1: grant an optional consent purpose', () => {
    let user: TestUser;
    beforeEach(async () => {
      user = await createTestUser({ displayName: 'Granter' });
    });
    afterEach(async () => {
      if (user) await teardownUser(user);
    });

    it('appends a granted row with a server-stamped policy version; effective reads granted', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const entry = await recordConsentDecision(supabase, 'product_analytics', 'granted');

      expect(entry.decision).toBe('granted');
      expect(entry.policy_version).toBe('v1'); // stamped from the catalog, not the client
      expect(await effectiveDecision(supabase, 'product_analytics')).toBe('granted');
      expect(await historyCount(supabase, 'product_analytics')).toBe(1);
    });
  });

  describe('STORY-2: withdraw a withdrawable purpose', () => {
    let user: TestUser;
    beforeEach(async () => {
      user = await createTestUser({ displayName: 'Withdrawer' });
      await seedRow(admin, user, 'product_analytics', 'granted');
    });
    afterEach(async () => {
      if (user) await teardownUser(user);
    });

    it('appends a NEW withdrawn row (history retained); effective reads withdrawn', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const entry = await recordConsentDecision(supabase, 'product_analytics', 'withdrawn');

      expect(entry.decision).toBe('withdrawn');
      // both the prior grant and the new withdrawal are retained (append-only)
      expect(await historyCount(supabase, 'product_analytics')).toBe(2);
      expect(await effectiveDecision(supabase, 'product_analytics')).toBe('withdrawn');
    });
  });

  describe('STORY-3: withdrawal of a non-withdrawable purpose is refused', () => {
    let user: TestUser;
    beforeEach(async () => {
      user = await createTestUser({ displayName: 'Foundational' });
      await seedRow(admin, user, 'transcendence', 'granted');
    });
    afterEach(async () => {
      if (user) await teardownUser(user);
    });

    it('refuses to withdraw transcendence (42501), appends nothing, leaves effective unchanged', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      await expect(
        recordConsentDecision(supabase, 'transcendence', 'withdrawn'),
      ).rejects.toMatchObject({ code: '42501' });

      // No row appended; the foundational grant stands.
      expect(await historyCount(supabase, 'transcendence')).toBe(1);
      expect(await effectiveDecision(supabase, 'transcendence')).toBe('granted');
    });

    it('re-granting an already-granted foundational purpose is an idempotent no-op', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const entry = await recordConsentDecision(supabase, 'transcendence', 'granted');
      expect(entry.decision).toBe('granted');
      // still exactly the one seeded row — no duplicate.
      expect(await historyCount(supabase, 'transcendence')).toBe(1);
    });
  });

  describe('STORY-4: unknown purpose is rejected', () => {
    let user: TestUser;
    beforeEach(async () => {
      user = await createTestUser({ displayName: 'Unknown Purpose' });
    });
    afterEach(async () => {
      if (user) await teardownUser(user);
    });

    it('rejects a non-catalogued purpose (22023) and appends nothing', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      await expect(
        recordConsentDecision(supabase, 'not_a_real_purpose', 'granted'),
      ).rejects.toMatchObject({ code: '22023' });

      const { history } = await fetchOwnConsentState(supabase);
      expect(history).toHaveLength(0);
    });
  });

  describe('STORY-5: idempotent re-submit', () => {
    let user: TestUser;
    beforeEach(async () => {
      user = await createTestUser({ displayName: 'Idempotent' });
      await seedRow(admin, user, 'product_analytics', 'withdrawn');
    });
    afterEach(async () => {
      if (user) await teardownUser(user);
    });

    it('an equal-to-current decision appends nothing; a differing decision appends exactly one', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      // equal-to-current (withdrawn) → no-op
      await recordConsentDecision(supabase, 'product_analytics', 'withdrawn');
      expect(await historyCount(supabase, 'product_analytics')).toBe(1);

      // differing (granted) → exactly one appended
      await recordConsentDecision(supabase, 'product_analytics', 'granted');
      expect(await historyCount(supabase, 'product_analytics')).toBe(2);
      expect(await effectiveDecision(supabase, 'product_analytics')).toBe('granted');
    });
  });

  describe('STORY-6: own-subject only — no cross-subject write', () => {
    let alice: TestUser;
    let bob: TestUser;
    beforeEach(async () => {
      alice = await createTestUser({ displayName: 'Alice Writer' });
      bob = await createTestUser({ displayName: 'Bob Writer' });
    });
    afterEach(async () => {
      if (alice) await teardownUser(alice);
      if (bob) await teardownUser(bob);
    });

    it("writes to the caller's own subject only — Bob's ledger is untouched", async () => {
      const aliceClient = createTestClient();
      await signInWithRetry(aliceClient, alice.email, alice.password);
      await recordConsentDecision(aliceClient, 'product_analytics', 'granted');

      // Bob (a different caller) has no row — there is no parameter to target him.
      const bobClient = createTestClient();
      await signInWithRetry(bobClient, bob.email, bob.password);
      expect(await historyCount(bobClient, 'product_analytics')).toBe(0);
      expect(await effectiveDecision(bobClient, 'product_analytics')).toBeNull();
    });
  });
});
