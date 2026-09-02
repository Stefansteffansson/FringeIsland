import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H013 (unit) — the groups CRUD BFF routes: POST /api/groups (create),
 * GET /api/groups/[id] (detail) and PATCH /api/groups/[id] (settings).
 * Private BFF per ADR-U038 — the FEAT-PC010 contracts self-gate; these routes
 * only map session → 401 and SQLSTATE → HTTP (42501 → 403, P0002 → 404,
 * 22023 → 400, else 500). Telemetry is CONTENT-FREE: group names/descriptions
 * and member display data never appear in events (V2/V4 discipline) — only
 * the group id for correlation.
 *
 * Red-first: fails until the POST export and the [id] route module exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
// ADR-U037: the GET detail (hot read) resolves identity via local JWT
// verification; POST/PATCH (mutations) keep the per-request getUser round-trip.
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const createEngagementGroup = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const fetchGroupDetail = jest.fn<() => Promise<unknown>>();
const updateGroupSettings = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser, getClaims } }),
}));
jest.mock('@/lib/groups/queries', () => ({
  fetchMemberGroups: jest.fn(),
  createEngagementGroup: (...args: unknown[]) =>
    (createEngagementGroup as unknown as (...a: unknown[]) => unknown)(...args),
  fetchGroupDetail: (...args: unknown[]) =>
    (fetchGroupDetail as unknown as (...a: unknown[]) => unknown)(...args),
  updateGroupSettings: (...args: unknown[]) =>
    (updateGroupSettings as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { POST } from '@/app/api/groups/route';
import { GET as GET_DETAIL, PATCH } from '@/app/api/groups/[id]/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

/** No telemetry event may carry group content (names/descriptions) or member data. */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => {
    const s = JSON.stringify(e.props ?? {});
    return (
      !s.includes('Secret Society') && !s.includes('very private notes') && !s.includes('GA Stew')
    );
  });

const DETAIL = {
  id: 'grp-1',
  name: 'Secret Society',
  description: 'very private notes',
  label: null,
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 2,
  viewer: { is_member: true, joined_at: '2026-07-01T10:00:00+00:00', can_manage_settings: true },
  members: [{ display_name: 'GA Stew', joined_at: '2026-07-01T10:00:00+00:00' }],
};

const jsonRequest = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request;
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const fakeRequest = {} as unknown as Request;

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  createEngagementGroup.mockReset().mockResolvedValue('grp-new');
  fetchGroupDetail.mockReset().mockResolvedValue(DETAIL);
  updateGroupSettings.mockReset().mockResolvedValue(DETAIL);
});

describe('POST /api/groups', () => {
  it('returns 401 when sessionless, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await POST(jsonRequest({ name: 'X' }))) as { status: number };
    expect(res.status).toBe(401);
    expect(createEngagementGroup).not.toHaveBeenCalled();
    expect(emitted('groups.create_unauthenticated')).toBe(true);
  });

  it('creates and returns 201 { id }, telemetry id-only', async () => {
    const res = (await POST(
      jsonRequest({ name: 'Secret Society', description: 'very private notes' }),
    )) as unknown as { status: number; body: { id: string } };
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('grp-new');
    expect(createEngagementGroup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'Secret Society' }),
    );
    expect(emitted('groups.create', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps the FIM-only/suspended refusal (42501) to 403', async () => {
    createEngagementGroup.mockRejectedValue({ code: '42501' });
    const res = (await POST(jsonRequest({ name: 'X' }))) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('groups.create_refused', 'u1')).toBe(true);
  });

  it('maps the invalid-name refusal (22023) to 400', async () => {
    createEngagementGroup.mockRejectedValue({ code: '22023' });
    const res = (await POST(jsonRequest({ name: '   ' }))) as { status: number };
    expect(res.status).toBe(400);
    expect(emitted('groups.create_invalid', 'u1')).toBe(true);
  });

  it('maps other failures to 500, content-free', async () => {
    createEngagementGroup.mockRejectedValue({ code: 'XX000', message: 'Secret Society exploded' });
    const res = (await POST(jsonRequest({ name: 'Secret Society' }))) as unknown as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('Secret Society');
    expect(emitted('groups.create_failed', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });
});

describe('GET /api/groups/[id]', () => {
  it('returns 401 when sessionless via local claims (no Auth round-trip, ADR-U037)', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET_DETAIL(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchGroupDetail).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(emitted('groups.detail_unauthenticated')).toBe(true);
  });

  it('returns 200 with the detail pass-through incl. viewer capability flags', async () => {
    const res = (await GET_DETAIL(fakeRequest, idParams('grp-1'))) as unknown as {
      status: number;
      body: { group: typeof DETAIL };
    };
    expect(res.status).toBe(200);
    expect(res.body.group).toEqual(DETAIL);
    expect(res.body.group.viewer.can_manage_settings).toBe(true);
    expect(emitted('groups.detail', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps the no-existence-leak refusal (P0002) to 404', async () => {
    fetchGroupDetail.mockRejectedValue({ code: 'P0002' });
    const res = (await GET_DETAIL(fakeRequest, idParams('ghost'))) as { status: number };
    expect(res.status).toBe(404);
    expect(emitted('groups.detail_missing', 'u1')).toBe(true);
  });

  it('maps the FIM-only refusal (42501) to 403', async () => {
    fetchGroupDetail.mockRejectedValue({ code: '42501' });
    const res = (await GET_DETAIL(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('groups.detail_refused', 'u1')).toBe(true);
  });
});

describe('PATCH /api/groups/[id]', () => {
  it('returns 401 when sessionless, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await PATCH(jsonRequest({ name: 'Y' }), idParams('grp-1'))) as {
      status: number;
    };
    expect(res.status).toBe(401);
    expect(updateGroupSettings).not.toHaveBeenCalled();
    expect(emitted('groups.update_unauthenticated')).toBe(true);
  });

  it('updates and returns 200 with the fresh detail, telemetry id-only', async () => {
    const res = (await PATCH(
      jsonRequest({ name: 'Secret Society', is_public: true }),
      idParams('grp-1'),
    )) as unknown as { status: number; body: { group: typeof DETAIL } };
    expect(res.status).toBe(200);
    expect(res.body.group).toEqual(DETAIL);
    expect(updateGroupSettings).toHaveBeenCalledWith(
      expect.anything(),
      'grp-1',
      expect.objectContaining({ name: 'Secret Society', is_public: true }),
    );
    expect(emitted('groups.update', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps refusals: 42501 → 403, P0002 → 404, 22023 → 400', async () => {
    updateGroupSettings.mockRejectedValue({ code: '42501' });
    let res = (await PATCH(jsonRequest({ name: 'Y' }), idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('groups.update_refused', 'u1')).toBe(true);

    updateGroupSettings.mockRejectedValue({ code: 'P0002' });
    res = (await PATCH(jsonRequest({ name: 'Y' }), idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(404);
    expect(emitted('groups.update_missing', 'u1')).toBe(true);

    updateGroupSettings.mockRejectedValue({ code: '22023' });
    res = (await PATCH(jsonRequest({ name: '  ' }), idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(400);
    expect(emitted('groups.update_invalid', 'u1')).toBe(true);
  });

  it('maps other failures to 500, content-free', async () => {
    updateGroupSettings.mockRejectedValue({ code: 'XX000', message: 'very private notes leak' });
    const res = (await PATCH(jsonRequest({ description: 'very private notes' }), idParams('grp-1'))) as unknown as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('very private notes');
    expect(emitted('groups.update_failed', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });
});
