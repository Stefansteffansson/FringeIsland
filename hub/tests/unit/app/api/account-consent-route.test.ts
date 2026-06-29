import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-PC006 (unit) — the GET /api/account/consent route authenticates the
 * caller, delegates to the own-subject SECURITY DEFINER read contract lib, and
 * surfaces failures (500, never swallowed) while emitting V4 telemetry on success
 * AND failure. Sessionless callers are gated with 401 before the contract is
 * reached (the read RPC is never granted to anon).
 *
 * Red-first: this fails to import until `app/api/account/consent/route.ts`
 * exists.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const fetchOwnConsentState = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/consent/queries', () => ({
  fetchOwnConsentState: (...args: unknown[]) =>
    (fetchOwnConsentState as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET } from '@/app/api/account/consent/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

const SAMPLE_STATE = {
  effective: [
    {
      purpose: 'transcendence',
      label: 'Becoming a member',
      decision: 'granted',
      withdrawable: false,
      current_policy_version: 'v1',
      needs_reconsent: false,
    },
  ],
  history: [
    { purpose: 'transcendence', decision: 'granted', policy_version: 'v1', captured_at: '2026-06-01T00:00:00Z' },
  ],
};

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  fetchOwnConsentState.mockReset().mockResolvedValue(SAMPLE_STATE);
});

describe('GET /api/account/consent', () => {
  it('returns 401 when unauthenticated, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchOwnConsentState).not.toHaveBeenCalled();
    expect(emitted('account.consent_read_unauthenticated')).toBe(true);
  });

  it('returns 200 with the consent projections and emits read telemetry', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-read' } } });
    const res = (await GET()) as {
      status: number;
      body: { consent: { effective: unknown[]; history: unknown[] } };
    };
    expect(res.status).toBe(200);
    expect(res.body.consent.effective).toHaveLength(1);
    expect(res.body.consent.history).toHaveLength(1);
    expect(emitted('account.consent_read', 'u-read')).toBe(true);
  });

  it('maps a contract failure to 500 (surfaced, not swallowed)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-err' } } });
    fetchOwnConsentState.mockRejectedValue(new Error('rpc exploded'));
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('account.consent_read_failed', 'u-err')).toBe(true);
  });
});
