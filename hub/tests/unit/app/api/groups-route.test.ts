import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * GET /api/groups (unit) — the route authenticates the caller via local JWT
 * verification (getClaims, ADR-U037 — never a per-request Auth round-trip),
 * delegates to the RLS-scoped groups read, surfaces failures (500, never
 * swallowed), and emits V4 telemetry on success AND failure.
 *
 * Red-first for ADR-U037: fails while the route still calls getUser().
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchMemberGroups = jest.fn<() => Promise<unknown[]>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser, getClaims } }),
}));
jest.mock('@/lib/groups/queries', () => ({
  fetchMemberGroups: (...args: unknown[]) =>
    (fetchMemberGroups as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET } from '@/app/api/groups/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

beforeEach(() => {
  getUser.mockReset();
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  fetchMemberGroups.mockReset().mockResolvedValue([{ id: 'g1', name: 'Dev Test Cohort' }]);
});

describe('GET /api/groups', () => {
  it('returns 401 when unauthenticated, without an Auth-server round-trip (ADR-U037)', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchMemberGroups).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(emitted('groups.load_unauthenticated')).toBe(true);
  });

  it('returns 200 with the member groups and emits load telemetry', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u-read' } }, error: null });
    const res = (await GET()) as { status: number; body: { groups: unknown[] } };
    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);
    expect(emitted('groups.loaded', 'u-read')).toBe(true);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('maps a read failure to 500 (surfaced, not swallowed)', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u-err' } }, error: null });
    fetchMemberGroups.mockRejectedValue(new Error('db exploded'));
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('groups.load_failed', 'u-err')).toBe(true);
  });
});
