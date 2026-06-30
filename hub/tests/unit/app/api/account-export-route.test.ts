import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-PC008 (unit) — the GET /api/account/export route authenticates the
 * caller, delegates to the own-subject SECURITY DEFINER export contract lib, and
 * returns the assembled document as a downloadable file (Content-Disposition:
 * attachment) while emitting V4 telemetry on success AND failure. Sessionless
 * callers are gated with 401 before the contract is reached. Failures surface
 * (500, never a partial document).
 *
 * Red-first: this fails to import until `app/api/account/export/route.ts` exists.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const fetchOwnDataExport = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers ?? {},
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/account/export', () => ({
  fetchOwnDataExport: (...args: unknown[]) =>
    (fetchOwnDataExport as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { GET } from '@/app/api/account/export/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

const SAMPLE_DOC = {
  schema_version: 1,
  exported_at: '2026-06-30T00:00:00Z',
  subject: { user_id: 'u1', personal_group_id: 'pg1', email: 'a@b.c' },
  profile: { full_name: 'A', nickname: 'a', display_preference: 'nickname', show_real_name: false, avatar_url: null, bio: null, display_name: 'a', created_at: 'x', updated_at: 'x' },
  account_state: { is_active: true, is_decommissioned: false, state: 'active' },
  consent: [],
  memberships: [],
};

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  fetchOwnDataExport.mockReset().mockResolvedValue(SAMPLE_DOC);
});

describe('GET /api/account/export', () => {
  it('returns 401 when unauthenticated, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchOwnDataExport).not.toHaveBeenCalled();
    expect(emitted('account.export_unauthenticated')).toBe(true);
  });

  it('returns 200 with the document as a downloadable attachment and emits telemetry', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-exp' } } });
    const res = (await GET()) as {
      status: number;
      body: { schema_version: number };
      headers: Record<string, string>;
    };
    expect(res.status).toBe(200);
    // the body IS the document (a faithful copy the Hub couriers as a file)
    expect(res.body.schema_version).toBe(1);
    // delivered as a file download, not an inline JSON response
    expect(res.headers['Content-Disposition']).toMatch(/attachment/);
    expect(emitted('account.export', 'u-exp')).toBe(true);
  });

  it('maps a contract failure to 500 (surfaced, never a partial document)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-err' } } });
    fetchOwnDataExport.mockRejectedValue(new Error('rpc exploded'));
    const res = (await GET()) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('account.export_failed', 'u-err')).toBe(true);
  });
});
