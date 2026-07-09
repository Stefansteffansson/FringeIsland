import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * PERF-PROBE (unit, 2026-07-09 cold-load analysis) — the two temporary A/B
 * probe routes are identical except for their declared runtime: both
 * authenticate via ADR-U037 local JWT verification (401 sessionless, no
 * substrate read), both perform the same single cheap substrate read
 * (`fetchOwnAccountState`), and both stamp a content-free `x-probe-timing`
 * header (runtime label + invocation n + in-function ms + instance age) so
 * the live A/B can attribute cold TTFB to middleware / provisioning /
 * in-function work. Removal is part of the ADR-U036 revisit close-out.
 */
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchOwnAccountState = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      body,
      headers: { get: (k: string) => init?.headers?.[k] },
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getClaims } }),
}));
jest.mock('@/lib/account/queries', () => ({
  fetchOwnAccountState: (...args: unknown[]) =>
    (fetchOwnAccountState as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET as getEdge, runtime as edgeRuntime } from '@/app/api/perf/probe-edge/route';
import { GET as getNode, runtime as nodeRuntime } from '@/app/api/perf/probe-node/route';

type ProbeResponse = {
  status: number;
  body: { runtime?: string; n?: number };
  headers: { get: (k: string) => string | undefined };
};

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  fetchOwnAccountState
    .mockReset()
    .mockResolvedValue({ is_active: true, is_decommissioned: false, state: 'active' });
});

describe.each([
  ['probe-edge', () => getEdge(), 'edge'],
  ['probe-node', () => getNode(), 'nodejs'],
])('GET /api/perf/%s', (_name, call, label) => {
  it('returns 401 sessionless without touching the substrate (ADR-U037 gate)', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await call()) as ProbeResponse;
    expect(res.status).toBe(401);
    expect(fetchOwnAccountState).not.toHaveBeenCalled();
  });

  it('returns 200 with the runtime label and an x-probe-timing header', async () => {
    const res = (await call()) as ProbeResponse;
    expect(res.status).toBe(200);
    expect(res.body.runtime).toBe(label);
    const raw = res.headers.get('x-probe-timing');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string) as {
      runtime: string;
      n: number;
      auth: number;
      read: number;
      total: number;
      age: number;
    };
    expect(parsed.runtime).toBe(label);
    expect(parsed.n).toBeGreaterThanOrEqual(1);
    expect(parsed.total).toBeGreaterThanOrEqual(0);
  });
});

describe('runtime declarations', () => {
  it('probe-edge declares the edge runtime and probe-node declares nodejs', () => {
    expect(edgeRuntime).toBe('edge');
    expect(nodeRuntime).toBe('nodejs');
  });
});
