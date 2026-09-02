import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H012 (unit) — the sessions BFF routes: GET /api/sessions (inventory)
 * and DELETE /api/sessions/[id] (targeted revoke). Private BFF per ADR-U038 —
 * the FEAT-PC009 contracts self-gate; these routes only map session → 401 and
 * SQLSTATE → HTTP (42501 → 403, P0002 → 404, else 500). Telemetry is
 * CONTENT-FREE: user_agent / ip values never appear in events (V2 discipline).
 *
 * Red-first: fails to import until the route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
// ADR-U037: GET resolves identity via local JWT verification (getClaims);
// DELETE (a mutation) keeps the per-request getUser round-trip.
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchOwnSessions = jest.fn<() => Promise<unknown>>();
const revokeOwnSession = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser, getClaims } }),
}));
jest.mock('@/lib/sessions/queries', () => ({
  fetchOwnSessions: (...args: unknown[]) =>
    (fetchOwnSessions as unknown as (...a: unknown[]) => unknown)(...args),
  revokeOwnSession: (...args: unknown[]) =>
    (revokeOwnSession as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET } from '@/app/api/sessions/route';
import { DELETE } from '@/app/api/sessions/[id]/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

/** No telemetry event may carry session PII (raw UA strings / IPs). */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => {
    const s = JSON.stringify(e.props ?? {});
    return !s.includes('TestBrowser/9.9') && !s.includes('203.0.113.7');
  });

const SESSIONS = [
  {
    id: 'sess-current',
    created_at: '2026-07-01T10:00:00+00:00',
    last_active: '2026-07-03T09:00:00+00:00',
    user_agent: 'TestBrowser/9.9 (Windows)',
    ip: '203.0.113.7',
    is_current: true,
  },
  {
    id: 'sess-other',
    created_at: '2026-06-28T08:00:00+00:00',
    last_active: '2026-07-02T20:00:00+00:00',
    user_agent: 'TestBrowser/9.9 (Android)',
    ip: '203.0.113.7',
    is_current: false,
  },
];

const deleteParams = (id: string) => ({ params: Promise.resolve({ id }) });
// The DELETE handler never reads its request argument; jsdom has no Request global.
const fakeRequest = {} as unknown as Request;

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  fetchOwnSessions.mockReset().mockResolvedValue(SESSIONS);
  revokeOwnSession.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/sessions', () => {
  it('returns 401 when sessionless, never reaching the contract (no Auth round-trip, ADR-U037)', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchOwnSessions).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(emitted('sessions.list_unauthenticated')).toBe(true);
  });

  it('returns 200 with the inventory pass-through; telemetry carries actor + count, never UA/IP', async () => {
    const res = (await GET()) as unknown as { status: number; body: { sessions: typeof SESSIONS } };
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual(SESSIONS);
    expect(emitted('sessions.list', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps the substrate FIM-only refusal (42501) to 403', async () => {
    fetchOwnSessions.mockRejectedValue({ code: '42501' });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('sessions.list_refused', 'u1')).toBe(true);
  });

  it('maps other failures to 500, content-free', async () => {
    fetchOwnSessions.mockRejectedValue({ code: 'XX000', message: 'boom 203.0.113.7' });
    const res = (await GET()) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('203.0.113.7');
    expect(emitted('sessions.list_failed', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });
});

describe('DELETE /api/sessions/[id]', () => {
  it('returns 401 when sessionless, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await DELETE(fakeRequest, deleteParams('sess-other'))) as { status: number };
    expect(res.status).toBe(401);
    expect(revokeOwnSession).not.toHaveBeenCalled();
    expect(emitted('sessions.revoke_unauthenticated')).toBe(true);
  });

  it('revokes the named session and returns 200 { revoked }', async () => {
    const res = (await DELETE(fakeRequest, deleteParams('sess-other'))) as unknown as {
      status: number;
      body: { revoked: string };
    };
    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe('sess-other');
    expect(revokeOwnSession).toHaveBeenCalledWith(expect.anything(), 'sess-other');
    expect(emitted('sessions.revoke', 'u1')).toBe(true);
  });

  it('maps the no-existence-leak refusal (P0002) to 404', async () => {
    revokeOwnSession.mockRejectedValue({ code: 'P0002' });
    const res = (await DELETE(fakeRequest, deleteParams('ghost'))) as { status: number };
    expect(res.status).toBe(404);
    expect(emitted('sessions.revoke_missing', 'u1')).toBe(true);
  });

  it('maps the FIM-only refusal (42501) to 403', async () => {
    revokeOwnSession.mockRejectedValue({ code: '42501' });
    const res = (await DELETE(fakeRequest, deleteParams('sess-other'))) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('sessions.revoke_refused', 'u1')).toBe(true);
  });

  it('maps other failures to 500, content-free', async () => {
    revokeOwnSession.mockRejectedValue({ code: 'XX000', message: 'TestBrowser/9.9 (Windows) exploded' });
    const res = (await DELETE(fakeRequest, deleteParams('sess-other'))) as unknown as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('TestBrowser');
    expect(emitted('sessions.revoke_failed', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });
});
