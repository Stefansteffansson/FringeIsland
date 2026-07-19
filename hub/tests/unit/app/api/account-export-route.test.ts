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
 *
 * Amended 2026-07-03 (FEAT-H011 STORY-5) and 2026-07-18 (FEAT-H024 STORY-6):
 * the route composed the journal and walks exports as additive keys.
 *
 * Amended 2026-07-19 (COR-A W8, audit finding AC-4): that BFF composition
 * moved PLATFORM-side — `get_own_data_export()` now returns the complete
 * document (`journal` + `journeys` included), and the route is a thin proxy
 * again: ONE lib call, no merge, no journal/journeys imports (the export half
 * of AC-5). The route couriers the document faithfully — the platform-composed
 * sections ride through untouched — and has a single failure path.
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

/** The platform-composed document — `journal` and `journeys` arrive IN the
 *  document since COR-A W8; the route never assembles them. */
const SAMPLE_DOC = {
  schema_version: 1,
  exported_at: '2026-06-30T00:00:00Z',
  subject: { user_id: 'u1', personal_group_id: 'pg1', email: 'a@b.c' },
  profile: { full_name: 'A', nickname: 'a', display_preference: 'nickname', show_real_name: false, avatar_url: null, bio: null, display_name: 'a', created_at: 'x', updated_at: 'x' },
  account_state: { is_active: true, is_decommissioned: false, state: 'active' },
  consent: [],
  memberships: [],
  journal: { schema_version: 1, exported_at: '2026-07-03T00:00:00Z', entries: [] },
  journeys: [],
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

  it('couriers the platform-composed sections untouched — ONE call, no route-side merge', async () => {
    fetchOwnDataExport.mockResolvedValue({
      ...SAMPLE_DOC,
      journal: {
        schema_version: 1,
        exported_at: '2026-07-03T00:00:01Z',
        entries: [
          { id: 'j1', title: null, body: 'kept words', created_at: 'x', updated_at: 'x' },
        ],
      },
      journeys: [
        {
          enrollment_id: 'e1',
          journey_id: 'j1',
          journey_title: 'A walk',
          status: 'completed',
          enrolled_at: 'x',
          completed_at: 'x',
          steps: [
            {
              step_id: 's1',
              step_title: 'Turn inward',
              kind: 'reflection',
              created_at: 'x',
              completed_at: 'x',
              response: { body: 'my exported words' },
              response_updated_at: 'x',
            },
          ],
        },
      ],
    });
    const res = (await GET()) as {
      status: number;
      body: {
        schema_version: number;
        journal: { schema_version: number; entries: unknown[] };
        journeys: Array<{ enrollment_id: string; steps: unknown[] }>;
      };
    };
    expect(res.status).toBe(200);
    expect(fetchOwnDataExport).toHaveBeenCalledTimes(1);
    // the core document is intact AND the platform-composed sections ride along
    expect(res.body.schema_version).toBe(1);
    expect(res.body.journal.schema_version).toBe(1);
    expect(res.body.journal.entries).toHaveLength(1);
    expect(res.body.journeys).toHaveLength(1);
    expect(res.body.journeys[0].enrollment_id).toBe('e1');
    expect(res.body.journeys[0].steps).toHaveLength(1);
  });

  it('an entry-less, walk-less member gets both sections present-and-empty — never an omission', async () => {
    const res = (await GET()) as {
      body: { journal: { entries: unknown[] }; journeys: unknown[] };
    };
    // the platform guarantees present-and-empty; the courier must not drop them
    expect(Array.isArray(res.body.journal.entries)).toBe(true);
    expect(res.body.journal.entries).toHaveLength(0);
    expect(Array.isArray(res.body.journeys)).toBe(true);
    expect(res.body.journeys).toHaveLength(0);
  });

  it('maps a contract failure to 500 (surfaced, never a partial document)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-err' } } });
    fetchOwnDataExport.mockRejectedValue(new Error('rpc exploded'));
    const res = (await GET()) as { status: number; body: { error?: string } };
    expect(res.status).toBe(500);
    // content-free failure — never an echo of document content
    expect(res.body.error).toBe('Failed to assemble data export');
    expect(emitted('account.export_failed', 'u-err')).toBe(true);
  });
});
