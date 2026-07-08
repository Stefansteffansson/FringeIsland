import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H022 (unit) — GET /api/groups/[id]/journeys/[enrollmentId]/progress
 * (JRN-16/17 → get_group_journey_progress). Edge + dub1 hot read (ADR-U036),
 * identity via getVerifiedUserId (ADR-U037). Private BFF per ADR-U038: the
 * contract self-gates (membership standing, view_group_progress, the
 * consent-shaped derivation); this route maps session → 401 and SQLSTATE → HTTP
 * (P0002 → 404 non-member/absent indistinguishable, 42501 → 403 permission
 * refused, else 500 content-free). Telemetry id-only. Red-first.
 */

const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
const fetchGroupJourneyProgress = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: {} }),
}));
jest.mock('@/lib/supabase/auth', () => ({
  getVerifiedUserId: (...a: unknown[]) =>
    (getVerifiedUserId as unknown as (...x: unknown[]) => unknown)(...a),
}));
jest.mock('@/lib/journeys/queries', () => ({
  fetchGroupJourneyProgress: (...a: unknown[]) =>
    (fetchGroupJourneyProgress as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET as PROGRESS } from '@/app/api/groups/[id]/journeys/[enrollmentId]/progress/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };
const G1 = 'group-1';
const E1 = 'enrollment-1';
const sqlErr = (code: string, message = 'refused') => Object.assign(new Error(message), { code });
const params = (id: string, enrollmentId: string) => ({ params: Promise.resolve({ id, enrollmentId }) });
const emitted = (name: string) => getTelemetrySink().some((e) => e.name === name);

beforeEach(() => {
  jest.clearAllMocks();
  getTelemetrySink().length = 0;
  getVerifiedUserId.mockResolvedValue('fim-1');
});

describe('GET .../journeys/[enrollmentId]/progress — the leader window', () => {
  it('401s a sessionless caller', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await PROGRESS({} as Request, params(G1, E1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('returns { progress } from get_group_journey_progress and emits the read event', async () => {
    fetchGroupJourneyProgress.mockResolvedValue({ enrollment_id: E1, members: [] });
    const res = (await PROGRESS({} as Request, params(G1, E1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.progress).toEqual({ enrollment_id: E1, members: [] });
    expect(fetchGroupJourneyProgress).toHaveBeenCalledWith(expect.anything(), E1);
    expect(emitted('group.progress_loaded')).toBe(true);
  });

  it('maps P0002 → 404 (non-member and absent indistinguishable)', async () => {
    fetchGroupJourneyProgress.mockRejectedValue(sqlErr('P0002'));
    const res = (await PROGRESS({} as Request, params(G1, E1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
  });

  it('maps 42501 (view_group_progress refused) → 403', async () => {
    fetchGroupJourneyProgress.mockRejectedValue(sqlErr('42501'));
    const res = (await PROGRESS({} as Request, params(G1, E1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);
  });

  it('500s content-free on an unexpected failure', async () => {
    fetchGroupJourneyProgress.mockRejectedValue(sqlErr('XX000'));
    const res = (await PROGRESS({} as Request, params(G1, E1))) as unknown as RouteResponse;
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('XX000');
  });
});
