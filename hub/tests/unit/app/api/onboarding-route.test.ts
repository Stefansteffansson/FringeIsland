import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H023 — GET /api/me/onboarding (unit, BFF mapping). Added at TASK-MIST-01
 * (2026-09-02): a 42501 from `get_onboarding_status()` means the caller's JWT
 * names an actor the substrate can no longer resolve — a Mist erased
 * server-side while the browser kept its session (J-O3, the ghost window).
 * The route already mapped it to 403; it now also NAMES it with a code the
 * client can act on, because "no resolvable actor" is not a transient.
 *
 * Red at head: the 403 body carried `error` only.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
jest.mock('@/lib/supabase/auth', () => ({
  getVerifiedUserId: () => getVerifiedUserId(),
}));

const fetchOnboardingStatus = jest.fn<() => Promise<unknown>>();
jest.mock('@/lib/onboarding/queries', () => ({
  fetchOnboardingStatus: () => fetchOnboardingStatus(),
}));

import { GET } from '@/app/api/me/onboarding/route';

type RouteResponse = { status: number; body: { error?: string; code?: string } };

const sqlErr = (code: string, message = 'refused by the substrate') =>
  Object.assign(new Error(message), { code, message });

beforeEach(() => {
  getVerifiedUserId.mockReset().mockResolvedValue('u1');
  fetchOnboardingStatus.mockReset();
});

describe('GET /api/me/onboarding — the arrival read', () => {
  it('a 42501 (no resolvable actor) maps to 403 AND names the ghost with a code', async () => {
    fetchOnboardingStatus.mockRejectedValue(sqlErr('42501', 'no resolvable actor'));
    const res = (await GET()) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('no_resolvable_actor');
    expect(res.body.error).toBe('No resolvable actor');
  });

  // Labelled guard (green at head): the unauthenticated branch is unchanged.
  it('no session at all is 401, not a ghost', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await GET()) as unknown as RouteResponse;
    expect(res.status).toBe(401);
    expect(res.body.code).toBeUndefined();
  });
});
