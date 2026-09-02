import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H038 STORY-3 (W-8, unit) — the profile refusal speaks.
 * WRITTEN RED-FIRST against the walk finding: /api/profile/me PATCH collapses
 * everything non-validation to a generic 500 "Failed to update profile" — the
 * typed SQLSTATE from update_own_profile dies at the route.
 *
 * The fix shape pinned here (the announcements http.ts idiom): SQLSTATE→HTTP —
 * 42501→403, P0001→409, 22023→400, P0002→404 — with the substrate's honest
 * message carried through; only genuinely untyped failures stay 500.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchMyProfile = jest.fn<() => Promise<unknown>>();
const updateMyProfile = jest.fn<() => Promise<unknown>>();

class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser, getClaims } }),
}));
jest.mock('@/lib/profile/queries', () => ({
  ProfileValidationError,
  fetchMyProfile: (...args: unknown[]) =>
    (fetchMyProfile as unknown as (...a: unknown[]) => unknown)(...args),
  updateMyProfile: (...args: unknown[]) =>
    (updateMyProfile as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { PATCH } from '@/app/api/profile/me/route';

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

/** A PostgrestError-shaped typed refusal (code = SQLSTATE, message intact). */
const typedRefusal = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  fetchMyProfile.mockReset().mockResolvedValue({ full_name: 'Ada' });
  updateMyProfile.mockReset();
});

describe('FEAT-H038 STORY-3 — PATCH /api/profile/me maps typed refusals', () => {
  it('42501 (account suspended at the substrate) → 403 with the honest message', async () => {
    updateMyProfile.mockRejectedValue(typedRefusal('42501', 'account is suspended'));
    const res = (await PATCH(req({ nickname: 'x' }))) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('account is suspended');
  });

  it('P0001 (a state refusal) → 409 with the honest message', async () => {
    updateMyProfile.mockRejectedValue(typedRefusal('P0001', 'group is resting'));
    const res = (await PATCH(req({ nickname: 'x' }))) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('group is resting');
  });

  it('22023 (substrate validation) → 400 with the honest message', async () => {
    updateMyProfile.mockRejectedValue(typedRefusal('22023', 'nickname too long'));
    const res = (await PATCH(req({ nickname: 'x' }))) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('nickname too long');
  });

  it('P0002 (not found) → 404', async () => {
    updateMyProfile.mockRejectedValue(typedRefusal('P0002', 'profile not found'));
    const res = (await PATCH(req({ nickname: 'x' }))) as { status: number };
    expect(res.status).toBe(404);
  });

  it("28000 (the suspended actor's own row is invisible — users_select_active) → 401, and the recheck path owns the truth", async () => {
    // WRITTEN RED-FIRST at the STORY-7 E2E (2026-08-03): a suspended member's
    // save dies as PC003's NOT FOUND branch — the UPDATE ... RETURNING sees
    // zero rows under `users_select_active` (is_active = true) and raises
    // 28000 'Not authenticated.'. The route collapsed it to the generic 500,
    // so the W-7 refusal-triggered re-check never fired and the wall never
    // rendered. 28000 maps to 401 (the session cannot act as this identity);
    // the client's 401/403 recheck then confirms the state and walls honestly.
    updateMyProfile.mockRejectedValue(typedRefusal('28000', 'Not authenticated.'));
    const res = (await PATCH(req({ nickname: 'x' }))) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(401);
    expect(
      getTelemetrySink().some(
        (e) => e.name === 'profile.update_refused' && e.props?.code === '28000',
      ),
    ).toBe(true);
  });

  it('LABELLED GREEN — an untyped failure still collapses to a generic 500 (nothing internal leaks)', async () => {
    updateMyProfile.mockRejectedValue(new Error('connection reset'));
    const res = (await PATCH(req({ nickname: 'x' }))) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to update profile');
  });

  it('failure telemetry still fires on a typed refusal (V4 — refusals are events)', async () => {
    updateMyProfile.mockRejectedValue(typedRefusal('42501', 'account is suspended'));
    await PATCH(req({ nickname: 'x' }));
    expect(
      getTelemetrySink().some(
        (e) => e.name === 'profile.update_refused' && e.props?.code === '42501',
      ),
    ).toBe(true);
  });
});
