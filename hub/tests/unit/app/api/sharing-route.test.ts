import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink, resetTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H022 (unit) — POST /api/journeys/enrollments/[enrollmentId]/sharing
 * (JRN-17 traveller side → set_journey_progress_sharing). Private BFF per
 * ADR-U038: the contract self-gates (self-only, append-only, solo refusal);
 * this route maps session → 401 and SQLSTATE → HTTP (42501 → 403, P0002 → 404,
 * P0001 → 422 sharing on a solo walk, else 500 content-free). Mutation → getUser
 * (Node). Telemetry id-only. Red-first: fails until the route module exists.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const setJourneyProgressSharing = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
jest.mock('@/lib/journeys/queries', () => ({
  setJourneyProgressSharing: (...a: unknown[]) =>
    (setJourneyProgressSharing as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { POST as SHARING } from '@/app/api/journeys/enrollments/[enrollmentId]/sharing/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };
const E1 = 'enrollment-1';
const sqlErr = (code: string, message = 'refused') => Object.assign(new Error(message), { code });
const params = (enrollmentId: string) => ({ params: Promise.resolve({ enrollmentId }) });
const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const emitted = (name: string) => getTelemetrySink().some((e) => e.name === name);

beforeEach(() => {
  jest.clearAllMocks();
  resetTelemetrySink();
  getUser.mockResolvedValue({ data: { user: { id: 'fim-1' } } });
});

describe('POST .../sharing — the consent write', () => {
  it('401s without a server-verified user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await SHARING(req({ share: true }), params(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('passes (enrollmentId, share) through and returns the server-confirmed state', async () => {
    setJourneyProgressSharing.mockResolvedValue({ enrollment_id: E1, sharing: true });
    const res = (await SHARING(req({ share: true }), params(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enrollment_id: E1, sharing: true });
    expect(setJourneyProgressSharing).toHaveBeenCalledWith(expect.anything(), E1, true);
    expect(emitted('player.sharing_set')).toBe(true);
  });

  it('carries a false share through (withdraw)', async () => {
    setJourneyProgressSharing.mockResolvedValue({ enrollment_id: E1, sharing: false });
    await SHARING(req({ share: false }), params(E1));
    expect(setJourneyProgressSharing).toHaveBeenCalledWith(expect.anything(), E1, false);
  });

  it('maps P0001 (sharing on a solo walk) → 422', async () => {
    setJourneyProgressSharing.mockRejectedValue(sqlErr('P0001', 'sharing applies to group walks only'));
    const res = (await SHARING(req({ share: true }), params(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(422);
  });

  it('maps 42501 → 403 and P0002 → 404', async () => {
    setJourneyProgressSharing.mockRejectedValue(sqlErr('42501'));
    let res = (await SHARING(req({ share: true }), params(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    setJourneyProgressSharing.mockRejectedValue(sqlErr('P0002'));
    res = (await SHARING(req({ share: true }), params(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
  });

  it('500s content-free on an unexpected failure', async () => {
    setJourneyProgressSharing.mockRejectedValue(sqlErr('XX000'));
    const res = (await SHARING(req({ share: true }), params(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('XX000');
  });
});
