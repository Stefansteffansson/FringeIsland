import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * PERF-PROBE (2026-07-09 cold-load analysis) — `updateSession` stamps a
 * content-free `x-proxy-timing` header on every response so the live
 * waterfall can split middleware cost from route-function cost (the ~4 s
 * pre-function cold term localized in
 * docs/planning/hub-v2/2026-07-09-cold-load-regression-analysis.md).
 * Payload is numbers only (invocation n, duration ms, instance age ms) —
 * observability §7 content-free rule; x-overview-timing precedent (PR #123).
 */
const getClaims = jest.fn<() => Promise<{ data: unknown; error: null }>>();

const mkResponse = () => {
  const headers = new Map<string, string>();
  return {
    headers: { set: (k: string, v: string) => headers.set(k, v), get: (k: string) => headers.get(k) },
    cookies: { set: jest.fn() },
    _headers: headers,
  };
};
let responses: ReturnType<typeof mkResponse>[] = [];

jest.mock('next/server', () => ({
  NextResponse: {
    next: () => {
      const r = mkResponse();
      responses.push(r);
      return r;
    },
  },
}));
jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims } }),
}));

import { updateSession } from '@/lib/supabase/middleware';

const mkRequest = () =>
  ({
    cookies: { getAll: () => [], set: jest.fn() },
  }) as never;

beforeEach(() => {
  responses = [];
  getClaims.mockReset().mockResolvedValue({ data: null, error: null });
});

describe('updateSession x-proxy-timing', () => {
  it('stamps x-proxy-timing on the returned response with n, ms and age', async () => {
    const res = (await updateSession(mkRequest())) as unknown as ReturnType<typeof mkResponse>;
    const raw = res.headers.get('x-proxy-timing');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string) as { n: number; ms: number; age: number };
    expect(parsed.n).toBeGreaterThanOrEqual(1);
    expect(parsed.ms).toBeGreaterThanOrEqual(0);
    expect(parsed.age).toBeGreaterThanOrEqual(0);
  });

  it('increments the per-instance invocation counter across calls', async () => {
    const r1 = (await updateSession(mkRequest())) as unknown as ReturnType<typeof mkResponse>;
    const r2 = (await updateSession(mkRequest())) as unknown as ReturnType<typeof mkResponse>;
    const n1 = (JSON.parse(r1.headers.get('x-proxy-timing') as string) as { n: number }).n;
    const n2 = (JSON.parse(r2.headers.get('x-proxy-timing') as string) as { n: number }).n;
    expect(n2).toBe(n1 + 1);
  });

  it('still stamps the header when getClaims throws (auth hiccup path)', async () => {
    getClaims.mockRejectedValue(new Error('transient JWKS failure'));
    const res = (await updateSession(mkRequest())) as unknown as ReturnType<typeof mkResponse>;
    expect(res.headers.get('x-proxy-timing')).toBeDefined();
  });
});
