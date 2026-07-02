import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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
import { fetchOwnConsentState } from '@/lib/consent/queries';

/**
 * FEAT-PC006 — member consent read (IDN-6). Integration tests against real
 * Postgres + RLS. The contract is the `get_own_consent_state()` SECURITY DEFINER
 * function, exercised through the lib (`fetchOwnConsentState`) run as the
 * authenticated caller — the `.rpc()` resolves `auth.uid()` inside the definer
 * and the subject is pinned to the caller's personal group.
 *
 * Red-first: until the migration lands the `decision` column + the
 * `consent_purposes` catalog + the function, the seed insert and the `.rpc()`
 * both error and every projection assertion fails (the headline red the schema
 * gate turns green).
 */

type SeedRow = {
  purpose: string;
  decision: string;
  policy_version: string;
  /** explicit captured_at controls latest-per-purpose + history ordering */
  captured_at?: string;
  capture_context?: Record<string, unknown>;
};

/**
 * Seed consent_records directly via the service-role client (the table has no
 * client INSERT policy by design — writes go through SECURITY DEFINER paths).
 * Resolves the subject's public.users.id so the seeded rows match real shape.
 */
async function seedConsent(
  admin: SupabaseClient,
  user: TestUser,
  rows: SeedRow[],
): Promise<void> {
  const { data: u, error: uErr } = await admin
    .from('users')
    .select('id')
    .eq('auth_user_id', user.user.id)
    .single();
  if (uErr) throw uErr;

  const payload = rows.map((r) => ({
    subject_user_id: u!.id as string,
    subject_group_id: user.personalGroupId,
    purpose: r.purpose,
    decision: r.decision,
    policy_version: r.policy_version,
    capture_context: r.capture_context ?? { surface: 'test' },
    ...(r.captured_at ? { captured_at: r.captured_at } : {}),
  }));

  const { error } = await admin.from('consent_records').insert(payload);
  if (error) throw error;
}

const entryFor = (
  effective: Array<{ purpose: string }>,
  purpose: string,
) => effective.find((e) => e.purpose === purpose);

/**
 * Teardown for seeded subjects. consent_records FKs are ON DELETE RESTRICT and
 * the append-only trigger blocks DELETE outside the controlled erasure path, so
 * the seeded rows must be purged under `app.consent_erasure_in_progress` BEFORE
 * the user/group can be deleted (the established FEAT-PC002 erasure-teardown
 * pattern). Then the normal cleanup chain runs.
 */
async function teardownUsers(users: TestUser[]): Promise<void> {
  const groups = users.map((u) => `'${u.personalGroupId}'`).join(',');
  if (groups) {
    await runAdminSql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id IN (${groups}); END $$;`,
    ).catch(() => undefined);
  }
  for (const u of users) {
    await cleanupTestUser(u.user.id);
  }
}

describe('FEAT-PC006 — own consent read', () => {
  const admin = createAdminClient();

  describe('STORY-1: read my own effective consent state', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Consent Reader' });
      // A real transcendence-style grant under the current policy version.
      await seedConsent(admin, user, [
        { purpose: 'transcendence', decision: 'granted', policy_version: 'v1' },
      ]);
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('returns the transcendence entry as granted, non-withdrawable, with its facts', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { effective } = await fetchOwnConsentState(supabase);
      const transcendence = entryFor(effective, 'transcendence');

      expect(transcendence).toBeDefined();
      expect(transcendence!.decision).toBe('granted');
      expect(transcendence!.withdrawable).toBe(false);
      expect(transcendence!.policy_version).toBe('v1');
      expect(transcendence!.decided_at).not.toBeNull();
    });

    it('presents a never-decided catalogued purpose as undecided (decision = null)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { effective } = await fetchOwnConsentState(supabase);
      const analytics = entryFor(effective, 'product_analytics');

      // product_analytics is catalogued + withdrawable, but this member never
      // decided it → present, decision null, so a Surface can offer opt-in.
      expect(analytics).toBeDefined();
      expect(analytics!.decision).toBeNull();
      expect(analytics!.withdrawable).toBe(true);
    });

    it('exposes only the consent projections — effective + history, nothing else', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const state = await fetchOwnConsentState(supabase);
      expect(Object.keys(state).sort()).toEqual(['effective', 'history'].sort());
    });
  });

  describe('STORY-2 + STORY-3: history is full + append-only; effective is latest-per-purpose', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'History Reader' });
      // product_analytics granted (older) then withdrawn (newer): two rows.
      await seedConsent(admin, user, [
        {
          purpose: 'transcendence',
          decision: 'granted',
          policy_version: 'v1',
          captured_at: '2026-06-01T10:00:00Z',
        },
        {
          purpose: 'product_analytics',
          decision: 'granted',
          policy_version: 'v1',
          captured_at: '2026-06-02T10:00:00Z',
        },
        {
          purpose: 'product_analytics',
          decision: 'withdrawn',
          policy_version: 'v1',
          captured_at: '2026-06-03T10:00:00Z',
        },
      ]);
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('history returns every event newest-first; the ledger is never collapsed', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { history } = await fetchOwnConsentState(supabase);

      // 3 seeded events + the foundational transcendence grant every credentialed FIM
      // now carries (ADR-U038 S3). The guarantee under test is that NO event is
      // collapsed away — asserted precisely by the product_analytics retention below.
      expect(history.length).toBeGreaterThanOrEqual(3);
      // newest first
      const times = history.map((h) => new Date(h.captured_at).getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
      // both product_analytics rows are retained (grant + withdraw)
      const analytics = history.filter((h) => h.purpose === 'product_analytics');
      expect(analytics.map((h) => h.decision).sort()).toEqual(['granted', 'withdrawn']);
    });

    it('effective reflects the LATEST decision per purpose (granted→withdrawn ⇒ withdrawn)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { effective } = await fetchOwnConsentState(supabase);
      expect(entryFor(effective, 'product_analytics')!.decision).toBe('withdrawn');
    });
  });

  describe('STORY-3: withdrawn→granted reads as granted', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Regrant Reader' });
      await seedConsent(admin, user, [
        {
          purpose: 'product_analytics',
          decision: 'withdrawn',
          policy_version: 'v1',
          captured_at: '2026-06-02T10:00:00Z',
        },
        {
          purpose: 'product_analytics',
          decision: 'granted',
          policy_version: 'v1',
          captured_at: '2026-06-04T10:00:00Z',
        },
      ]);
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('the newest decision wins', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { effective } = await fetchOwnConsentState(supabase);
      expect(entryFor(effective, 'product_analytics')!.decision).toBe('granted');
    });
  });

  describe('STORY-4: policy-version drift is surfaced, not acted on', () => {
    let stale: TestUser;
    let current: TestUser;
    beforeAll(async () => {
      stale = await createTestUser({ displayName: 'Stale Policy' });
      current = await createTestUser({ displayName: 'Current Policy' });
      // granted under an OLD policy version → drift.
      await seedConsent(admin, stale, [
        { purpose: 'product_analytics', decision: 'granted', policy_version: 'v0-old' },
      ]);
      // granted under the CURRENT policy version → no drift.
      await seedConsent(admin, current, [
        { purpose: 'product_analytics', decision: 'granted', policy_version: 'v1' },
      ]);
    });
    afterAll(async () => {
      await teardownUsers([stale, current].filter(Boolean));
    });

    it('a granted decision under an old policy version reads needs_reconsent = true', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, stale.email, stale.password);

      const { effective } = await fetchOwnConsentState(supabase);
      expect(entryFor(effective, 'product_analytics')!.needs_reconsent).toBe(true);
    });

    it('a granted decision under the current policy version reads needs_reconsent = false', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, current.email, current.password);

      const { effective } = await fetchOwnConsentState(supabase);
      expect(entryFor(effective, 'product_analytics')!.needs_reconsent).toBe(false);
    });
  });

  describe('STORY-5: own-row only — no cross-subject exposure', () => {
    let alice: TestUser;
    let bob: TestUser;
    beforeAll(async () => {
      alice = await createTestUser({ displayName: 'Alice Consent' });
      bob = await createTestUser({ displayName: 'Bob Consent' });
      await seedConsent(admin, alice, [
        { purpose: 'product_analytics', decision: 'granted', policy_version: 'v1' },
      ]);
      await seedConsent(admin, bob, [
        { purpose: 'product_analytics', decision: 'withdrawn', policy_version: 'v1' },
      ]);
    });
    afterAll(async () => {
      await teardownUsers([alice, bob].filter(Boolean));
    });

    it("the contract resolves the caller's own subject only — Alice never sees Bob's", async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, alice.email, alice.password);

      const state = await fetchOwnConsentState(supabase);
      // Alice's effective shows HER decision (granted), never Bob's (withdrawn);
      // there is no parameter to target Bob.
      expect(entryFor(state.effective, 'product_analytics')!.decision).toBe('granted');
      // Every history row belongs to Alice's own grant only.
      expect(state.history.every((h) => h.decision === 'granted')).toBe(true);
    });

    it('an ordinary SELECT still cannot read another subject (consent_records_select_own unchanged)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, bob.email, bob.password);

      // Bob attempts a plain read — RLS scopes him to his own rows only; Alice's
      // grant is never visible. (The SECURITY DEFINER projection is the only path
      // that crosses the catalog join, and it too is own-row.)
      const { data } = await supabase
        .from('consent_records')
        .select('decision')
        .eq('purpose', 'product_analytics');

      const decisions = (data ?? []).map((r) => (r as { decision: string }).decision);
      expect(decisions).not.toContain('granted'); // Alice's grant never leaks
      expect(decisions.every((d) => d === 'withdrawn')).toBe(true); // only Bob's own
    });
  });

  describe('STORY-6: the catalog drives the granular surface', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Catalog Reader' });
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('each effective entry carries label, withdrawable, and current_policy_version from the catalog', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { effective } = await fetchOwnConsentState(supabase);
      const transcendence = entryFor(effective, 'transcendence');

      expect(transcendence!.label).toBeTruthy();
      expect(typeof transcendence!.withdrawable).toBe('boolean');
      expect(transcendence!.current_policy_version).toBe('v1');
    });

    it('the seeded catalog yields at least the transcendence + product_analytics purposes', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const { effective } = await fetchOwnConsentState(supabase);
      const purposes = effective.map((e) => e.purpose);
      expect(purposes).toEqual(expect.arrayContaining(['transcendence', 'product_analytics']));
    });
  });
});
