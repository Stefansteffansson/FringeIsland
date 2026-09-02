import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H004 STORY-2 (unit) — the `/api/auth/transcend` route enforces the consent
 * gate SERVER-SIDE (independent of the client gate) and authenticates the caller
 * before reaching the FEAT-PC002 finalisation RPC. No consent or no session =>
 * no finalisation (transcendence is impossible without consent — ADR-U031).
 */

const getUser = jest.fn(async () => ({ data: { user: { id: 'u1' } as { id: string } | null } }));
// Outcome shape mirrors the substrate contract: finalise_transcendence returns
// policy_version stamped server-side (COR-D W3 migration; the lib maps it to
// policyVersion) — a mock of a contract boundary cites the substrate that
// produces it (the RDC-03 rule).
const finaliseTranscendence = jest.fn<
  typeof import('@/lib/auth/transcendence').finaliseTranscendence
>(async () => ({
  outcome: { userId: 'u1', personalGroupId: 'g1', consentId: 'c1', policyVersion: 'v1' },
  error: null as string | null,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/auth/transcendence', () => ({
  finaliseTranscendence: (...args: unknown[]) =>
    (finaliseTranscendence as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { POST } from '@/app/api/auth/transcend/route';

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  finaliseTranscendence.mockReset();
  finaliseTranscendence.mockResolvedValue({
    outcome: { userId: 'u1', personalGroupId: 'g1', consentId: 'c1', policyVersion: 'v1' },
    error: null,
  });
});

describe('POST /api/auth/transcend — server consent gate', () => {
  it('rejects with 400 and never finalises when consent is missing', async () => {
    const res = (await POST(req({ consentAccepted: false }))) as { status: number };
    expect(res.status).toBe(400);
    expect(finaliseTranscendence).not.toHaveBeenCalled();
  });

  it('rejects with 401 and never finalises when there is no session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await POST(req({ consentAccepted: true }))) as { status: number };
    expect(res.status).toBe(401);
    expect(finaliseTranscendence).not.toHaveBeenCalled();
  });

  it('finalises when authenticated and consent is given', async () => {
    const res = (await POST(req({ consentAccepted: true }))) as { status: number };
    expect(res.status).toBe(200);
    expect(finaliseTranscendence).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when finalisation fails (failure surfaced, not swallowed)', async () => {
    finaliseTranscendence.mockResolvedValue({ outcome: null, error: 'boom' });
    const res = (await POST(req({ consentAccepted: true }))) as { status: number; body: unknown };
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'boom' });
  });
});
