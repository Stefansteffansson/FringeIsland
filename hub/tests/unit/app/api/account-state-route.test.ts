import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-PC004 (unit) — the GET /api/account/state route authenticates the caller,
 * delegates to the own-row SECURITY DEFINER contract lib, maps no-row to 404 and
 * other failures to 500 (surfaced, never swallowed), and emits V4 telemetry on
 * success AND failure. STORY-5 (no account state for a caller with no own row) is
 * covered here by the 401 (sessionless) and 404 (no row) paths.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const fetchOwnAccountState = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/account/queries', () => ({
  fetchOwnAccountState: (...args: unknown[]) =>
    (fetchOwnAccountState as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET } from '@/app/api/account/state/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  fetchOwnAccountState
    .mockReset()
    .mockResolvedValue({ is_active: true, is_decommissioned: false, state: 'active' });
});

describe('GET /api/account/state', () => {
  it('returns 401 when unauthenticated (STORY-5)', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchOwnAccountState).not.toHaveBeenCalled();
  });

  it('returns 200 with the state and emits read telemetry (STORY-1)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-read' } } });
    const res = (await GET()) as { status: number; body: { state: { state: string; is_active: boolean } } };
    expect(res.status).toBe(200);
    expect(res.body.state).toMatchObject({ state: 'active', is_active: true });
    expect(emitted('account.state_read', 'u-read')).toBe(true);
  });

  it('surfaces the suspended label verbatim without interpreting it (STORY-2)', async () => {
    fetchOwnAccountState.mockResolvedValue({
      is_active: false,
      is_decommissioned: false,
      state: 'suspended',
    });
    const res = (await GET()) as { status: number; body: { state: { state: string } } };
    expect(res.status).toBe(200);
    expect(res.body.state.state).toBe('suspended');
  });

  it('returns 404 when the caller has no mapped account row (STORY-5)', async () => {
    fetchOwnAccountState.mockResolvedValue(null);
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(404);
    expect(emitted('account.state_read_not_found')).toBe(true);
  });

  it('maps a contract failure to 500 (surfaced, not swallowed)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-err' } } });
    fetchOwnAccountState.mockRejectedValue(new Error('rpc exploded'));
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('account.state_read_failed', 'u-err')).toBe(true);
  });
});
