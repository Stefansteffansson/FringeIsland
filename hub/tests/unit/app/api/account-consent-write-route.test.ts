import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-PC007 (unit) — the POST /api/account/consent route authenticates the
 * caller, validates the body, delegates to the own-subject SECURITY DEFINER write
 * contract, and maps the typed governance refusals to HTTP (22023→422 unknown
 * purpose, 42501→409 refused withdrawal, 28000→403 no subject), surfacing every
 * outcome via V4 telemetry (refusals recorded, never swallowed).
 *
 * Red-first: this fails until the POST handler is added to
 * `app/api/account/consent/route.ts`.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const recordConsentDecision = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/consent/queries', () => ({
  recordConsentDecision: (...args: unknown[]) =>
    (recordConsentDecision as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { POST } from '@/app/api/account/consent/route';

const req = (body: unknown): Request =>
  ({ json: async () => body }) as unknown as Request;

const emitted = (name: string) => getTelemetrySink().some((e) => e.name === name);

const GRANTED_ENTRY = {
  purpose: 'product_analytics',
  label: 'Product analytics',
  decision: 'granted',
  withdrawable: true,
  current_policy_version: 'v1',
  needs_reconsent: false,
};

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  recordConsentDecision.mockReset().mockResolvedValue(GRANTED_ENTRY);
});

describe('POST /api/account/consent', () => {
  it('returns 401 when unauthenticated, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await POST(req({ purpose: 'product_analytics', decision: 'granted' }))) as { status: number };
    expect(res.status).toBe(401);
    expect(recordConsentDecision).not.toHaveBeenCalled();
  });

  it('returns 400 when purpose or decision is missing, never reaching the contract', async () => {
    const res = (await POST(req({ purpose: 'product_analytics' }))) as { status: number };
    expect(res.status).toBe(400);
    expect(recordConsentDecision).not.toHaveBeenCalled();
  });

  it('returns 200 with the updated effective entry and emits write telemetry', async () => {
    const res = (await POST(req({ purpose: 'product_analytics', decision: 'granted' }))) as {
      status: number;
      body: { entry: { decision: string } };
    };
    expect(res.status).toBe(200);
    expect(res.body.entry.decision).toBe('granted');
    expect(recordConsentDecision).toHaveBeenCalledWith(expect.anything(), 'product_analytics', 'granted');
    expect(emitted('account.consent_write')).toBe(true);
  });

  it('maps an unknown purpose (22023) to 422', async () => {
    recordConsentDecision.mockRejectedValue(Object.assign(new Error('unknown'), { code: '22023' }));
    const res = (await POST(req({ purpose: 'nope', decision: 'granted' }))) as { status: number };
    expect(res.status).toBe(422);
    expect(emitted('account.consent_write_refused')).toBe(true);
  });

  it('maps a refused withdrawal of a non-withdrawable purpose (42501) to 409', async () => {
    recordConsentDecision.mockRejectedValue(Object.assign(new Error('not withdrawable'), { code: '42501' }));
    const res = (await POST(req({ purpose: 'transcendence', decision: 'withdrawn' }))) as { status: number };
    expect(res.status).toBe(409);
    expect(emitted('account.consent_write_refused')).toBe(true);
  });

  it('maps no-active-subject (28000) to 403', async () => {
    recordConsentDecision.mockRejectedValue(Object.assign(new Error('no subject'), { code: '28000' }));
    const res = (await POST(req({ purpose: 'product_analytics', decision: 'granted' }))) as { status: number };
    expect(res.status).toBe(403);
  });

  it('maps an unexpected failure to 500 (surfaced, not swallowed)', async () => {
    recordConsentDecision.mockRejectedValue(new Error('rpc exploded'));
    const res = (await POST(req({ purpose: 'product_analytics', decision: 'granted' }))) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('account.consent_write_failed')).toBe(true);
  });
});
