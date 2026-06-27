import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestClient, createAdminClient, cleanupTestUser, withAnonRateLimitRetry } from '@/tests/helpers/supabase';
import { beginMistSession } from '@/lib/auth/mist';

/**
 * FEAT-H003 STORY-4 + STORY-5 (integration) — continuity posture + Mist privacy.
 *
 * BACKFILLED TEST-AFTER (not red-first): the continuity guarantee is a *negative*
 * property emergent from the already-applied FEAT-PC001 substrate + the existing
 * `beginMistSession` seam — a fresh (session-boundary) client mints a new anon
 * user, so there is no cross-session identifier to build or remove. The no-PII
 * minimisation is likewise enforced by the substrate; here the Hub asserts the
 * consumed contract from the consumer side. STORY-5's telemetry (mist.entered /
 * mist.enter_failed, incl. failures) is the red-first piece and is covered at the
 * unit tier (tests/unit/lib/auth/AuthContext.test.tsx).
 */

async function waitForProfile(admin: SupabaseClient, authUserId: string, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Mist profile did not materialise in time');
}

describe('FEAT-H003 STORY-4 — a Mist returning across a session boundary is a new Mist', () => {
  const createdUserIds: string[] = [];
  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('mints distinct, unlinkable Mists for two independent sessions (no cross-session identifier)', async () => {
    // First visit — one session boundary.
    const first = await withAnonRateLimitRetry(() => beginMistSession(createTestClient()));
    expect(first.error).toBeNull();
    expect(first.user).not.toBeNull();
    createdUserIds.push(first.user!.id);

    // A fresh client models a true session boundary (expired/reaped, or a
    // different device): no persisted session, so a brand-new Mist is born.
    const second = await withAnonRateLimitRetry(() => beginMistSession(createTestClient()));
    expect(second.error).toBeNull();
    expect(second.user).not.toBeNull();
    createdUserIds.push(second.user!.id);

    // The negative guarantee: the two Mists share no identity — there is no
    // anonymous re-identification across the boundary (ADR-U031 stage-3).
    expect(second.user!.id).not.toBe(first.user!.id);

    const admin = createAdminClient();
    const profileA = await waitForProfile(admin, first.user!.id);
    const profileB = await waitForProfile(admin, second.user!.id);
    expect(profileB.id).not.toBe(profileA.id);
    expect(profileB.personal_group_id).not.toBe(profileA.personal_group_id);
  });
});

describe('FEAT-H003 STORY-5 — Mist entry collects no PII (data minimisation)', () => {
  const createdUserIds: string[] = [];
  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('materialises a Mist with no email and no real name (the "Mist" default only)', async () => {
    const result = await withAnonRateLimitRetry(() => beginMistSession(createTestClient()));
    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    createdUserIds.push(result.user!.id);

    const admin = createAdminClient();
    const profile = await waitForProfile(admin, result.user!.id);

    // No PII at Mist creation: no email, and the nameless-Mist default — never a
    // real name carried in from anonymous sign-in (which passes no metadata).
    expect(profile.email).toBeNull();
    expect(profile.full_name).toBe('Mist');
  });
});
