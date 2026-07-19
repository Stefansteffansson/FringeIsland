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
import { fetchOwnDataExport } from '@/lib/account/export';

/**
 * FEAT-PC008 — member data export (IDN-8). Integration tests against real
 * Postgres + RLS. The contract is the `get_own_data_export()` SECURITY DEFINER
 * function, exercised through the lib (`fetchOwnDataExport`) run as the
 * authenticated caller — the `.rpc()` resolves `auth.uid()` inside the definer
 * and the document is assembled from the caller's OWN rows only.
 *
 * Red-first: until the migration lands `get_own_data_export()`, the `.rpc()`
 * errors and every assertion fails (the headline red the schema gate turns
 * green).
 *
 * Heavy remote-DB suite (cross-substrate reads + an audit write per export).
 * Under the full-account `runInBand` sweep it runs last, when cumulative
 * remote-DB contention slows every round-trip — these legitimately-passing tests
 * (≈19s in isolation) can brush the default 30s ceiling, so raise it here.
 */

jest.setTimeout(60000);

type SeedRow = {
  purpose: string;
  decision: string;
  policy_version: string;
  captured_at?: string;
  capture_context?: Record<string, unknown>;
};

/** Seed consent_records directly via service-role (no client INSERT policy). */
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

/**
 * Teardown. consent_records FKs are ON DELETE RESTRICT + append-only, so seeded
 * rows are purged under `app.consent_erasure_in_progress` BEFORE the user/group
 * is deleted (the FEAT-PC002 erasure-teardown pattern). The data_export
 * audit rows this feature writes are cleaned too (actor_group_id is ON DELETE
 * SET NULL, so they don't block deletion — but we keep the table tidy between
 * runs).
 */
async function teardownUsers(users: TestUser[]): Promise<void> {
  const groups = users.map((u) => `'${u.personalGroupId}'`).join(',');
  if (groups) {
    await runAdminSql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id IN (${groups}); END $$;`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.admin_audit_log ` +
        `WHERE action = 'data_export' AND actor_group_id IN (${groups});`,
    ).catch(() => undefined);
  }
  for (const u of users) {
    await cleanupTestUser(u.user.id);
  }
}

describe('FEAT-PC008 — own data export', () => {
  const admin = createAdminClient();

  describe('STORY-1: assemble my complete data into one document', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Export Reader' });
      await seedConsent(admin, user, [
        { purpose: 'transcendence', decision: 'granted', policy_version: 'v1' },
      ]);
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('returns one document with schema_version, exported_at, and the caller as subject', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const doc = await fetchOwnDataExport(supabase);

      expect(doc.schema_version).toBe(1);
      expect(doc.exported_at).not.toBeNull();
      expect(doc.subject.personal_group_id).toBe(user.personalGroupId);
      expect(doc.subject.email).toBe(user.email);
    });

    it('carries the Core-owned sections — profile, account_state, consent, memberships', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const doc = await fetchOwnDataExport(supabase);

      // profile reflects the real identity-scope substrate
      expect(doc.profile.full_name).toBeTruthy();
      expect(typeof doc.profile.nickname).toBe('string');
      expect(typeof doc.profile.show_real_name).toBe('boolean');
      // account_state matches the live lifecycle flags (a fresh FIM is active)
      expect(doc.account_state.state).toBe('active');
      expect(doc.account_state.is_active).toBe(true);
      // consent carries the seeded transcendence grant
      expect(doc.consent.some((c) => c.purpose === 'transcendence' && c.decision === 'granted')).toBe(true);
      // memberships carries the FringeIsland Members auto-enrolment from sign-up
      expect(Array.isArray(doc.memberships)).toBe(true);
      expect(doc.memberships.length).toBeGreaterThanOrEqual(1);
    });

  });

  describe('STORY-1: sections are present and array-shaped (not omitted)', () => {
    let user: TestUser;
    beforeAll(async () => {
      // A fresh credentialed member carries exactly the foundational transcendence
      // grant (ADR-U038 S3) and no OTHER consent. The section is present + array-shaped
      // (the "present, not an omission" guarantee) carrying that single grant.
      user = await createTestUser({ displayName: 'Baseline Export' });
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('presents the consent area as a present array carrying the foundational grant, not an omission', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const doc = await fetchOwnDataExport(supabase);
      expect(Array.isArray(doc.consent)).toBe(true);
      expect(doc.consent).toHaveLength(1);
      expect(doc.consent[0].purpose).toBe('transcendence');
      expect(doc.consent[0].decision).toBe('granted');
    });
  });

  describe('STORY-2: the export is complete and faithful to the ledgers', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Faithful Export' });
      await seedConsent(admin, user, [
        { purpose: 'product_analytics', decision: 'granted', policy_version: 'v1', captured_at: '2026-06-02T10:00:00Z' },
        { purpose: 'product_analytics', decision: 'withdrawn', policy_version: 'v1', captured_at: '2026-06-03T10:00:00Z' },
      ]);
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('consent contains EVERY ledger row (grant + withdraw), the ledger is not collapsed', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const doc = await fetchOwnDataExport(supabase);
      const analytics = doc.consent.filter((c) => c.purpose === 'product_analytics');
      expect(analytics.map((c) => c.decision).sort()).toEqual(['granted', 'withdrawn']);
      // newest-first ordering for the consent section
      const times = doc.consent.map((c) => new Date(c.captured_at).getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    });
  });

  describe('STORY-3: own-subject only — no cross-member exposure', () => {
    let alice: TestUser;
    let bob: TestUser;
    beforeAll(async () => {
      alice = await createTestUser({ displayName: 'Alice Export' });
      bob = await createTestUser({ displayName: 'Bob Export' });
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

    it("Alice's export contains only Alice's data — never Bob's", async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, alice.email, alice.password);

      const doc = await fetchOwnDataExport(supabase);
      expect(doc.subject.personal_group_id).toBe(alice.personalGroupId);
      // Alice's own grant is present; Bob's withdrawn row never appears.
      expect(doc.consent.every((c) => c.decision === 'granted')).toBe(true);
      expect(doc.consent.some((c) => c.decision === 'withdrawn')).toBe(false);
    });
  });

  describe('STORY-4: a durable record that the export happened', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Audited Export' });
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('writes a data_export audit row for the caller on a successful export', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      await fetchOwnDataExport(supabase);

      // read via service-role (admin_audit_log is admin-RLS protected)
      const { data, error } = await admin
        .from('admin_audit_log')
        .select('action, actor_group_id')
        .eq('action', 'data_export')
        .eq('actor_group_id', user.personalGroupId);

      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('STORY-5: the document shape is versioned and extensible', () => {
    let user: TestUser;
    beforeAll(async () => {
      user = await createTestUser({ displayName: 'Versioned Export' });
    });
    afterAll(async () => {
      if (user) await teardownUsers([user]);
    });

    it('carries schema_version 1 with the platform-composed sections present (COR-A W8)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, user.email, user.password);

      const doc = (await fetchOwnDataExport(supabase)) as unknown as Record<string, unknown>;
      expect(doc.schema_version).toBe(1);
      // COR-A W8 (AC-4): the former forward-seam sections are composed
      // platform-side — additive keys, no version bump (the delivered download
      // already carried them; the composer moved, the shape did not). Full
      // composite behaviour is covered in export-composite.test.ts.
      expect(doc).toHaveProperty('journal');
      expect(doc).toHaveProperty('journeys');
    });
  });
});
