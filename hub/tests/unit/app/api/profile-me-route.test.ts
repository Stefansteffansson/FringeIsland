import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-PC003 STORY-1 / STORY-2 / STORY-4 (unit) — the /api/profile/me route
 * authenticates the caller, delegates to the own-row contract lib, maps
 * validation failures to 400 and other failures to 500 (failure surfaced, never
 * swallowed), and emits V4 telemetry on success AND failure.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
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
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/profile/queries', () => ({
  ProfileValidationError,
  fetchMyProfile: (...args: unknown[]) =>
    (fetchMyProfile as unknown as (...a: unknown[]) => unknown)(...args),
  updateMyProfile: (...args: unknown[]) =>
    (updateMyProfile as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET, PATCH } from '@/app/api/profile/me/route';

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

const emitted = (name: string, actor: string) =>
  getTelemetrySink().some((e) => e.name === name && e.props?.actor === actor);

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  fetchMyProfile.mockReset().mockResolvedValue({ full_name: 'Ada', nickname: 'Ada' });
  updateMyProfile.mockReset().mockResolvedValue({ full_name: 'Ada', nickname: 'Ada' });
});

describe('GET /api/profile/me', () => {
  it('returns 401 when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchMyProfile).not.toHaveBeenCalled();
  });

  it('returns 200 with the profile and emits read telemetry', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-read' } } });
    const res = (await GET()) as { status: number; body: { profile: unknown } };
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({ nickname: 'Ada' });
    expect(emitted('profile.read', 'u-read')).toBe(true);
  });

  it('returns 404 when the caller has no profile row', async () => {
    fetchMyProfile.mockResolvedValue(null);
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/profile/me', () => {
  it('returns 401 when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await PATCH(req({ nickname: 'Ada' }))) as { status: number };
    expect(res.status).toBe(401);
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it('returns 200 and emits profile.updated on success', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-upd' } } });
    const res = (await PATCH(req({ nickname: 'Ada' }))) as { status: number };
    expect(res.status).toBe(200);
    expect(emitted('profile.updated', 'u-upd')).toBe(true);
  });

  it('maps a ProfileValidationError to 400 and emits a rejection event', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-rej' } } });
    updateMyProfile.mockRejectedValue(new ProfileValidationError('Cannot update non-identity-scope field(s): is_temporary'));
    const res = (await PATCH(req({ is_temporary: true }))) as { status: number; body: { error: string } };
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/is_temporary/);
    expect(emitted('profile.update_rejected', 'u-rej')).toBe(true);
  });

  it('maps a generic failure to 500 (surfaced, not swallowed)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-err' } } });
    updateMyProfile.mockRejectedValue(new Error('db exploded'));
    const res = (await PATCH(req({ nickname: 'Ada' }))) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('profile.update_failed', 'u-err')).toBe(true);
  });
});
