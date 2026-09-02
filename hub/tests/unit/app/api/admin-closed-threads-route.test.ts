import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * TASK-SEAL-01, Hub half — GET /api/admin/groups/[id]/closed-threads (unit,
 * BFF mapping). The platform half (#514, migration 20260811220000) armed
 * `admin_get_group_conversations(p_group_id)`: a CLOSED group's group-kind
 * threads, sealed rows INCLUDED and labelled (`sealed_at`, `is_sealed`) —
 * ruling B1 as re-scoped to `closed` (the only state a sealed thread exists
 * in). This route is its private BFF: read-path identity, the admin-plane
 * 404 collapse on any refusal, durable telemetry (an admin-plane event —
 * Q2's criteria), and the rows passed through with their sealed state intact
 * so the surface can never present a sealed thread as live.
 *
 * Red at head: the route does not exist.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
jest.mock('@/lib/supabase/auth', () => ({
  getVerifiedUserId: () => getVerifiedUserId(),
}));

type Flags = { data: unknown; refused: boolean; notFound: boolean };
const fetchAdminClosedGroupThreads = jest.fn<(groupId: string) => Promise<Flags>>();
jest.mock('@/lib/admin/content', () => ({
  fetchAdminClosedGroupThreads: (_c: unknown, groupId: string) =>
    fetchAdminClosedGroupThreads(groupId),
}));

const emitDurableTelemetry = jest.fn<(name: string, props: unknown) => Promise<void>>();
jest.mock('@/lib/observability/telemetry-server', () => ({
  emitDurableTelemetry: (_c: unknown, name: string, props: unknown) =>
    emitDurableTelemetry(name, props),
}));
jest.mock('@/lib/observability/telemetry', () => ({ emitTelemetry: () => undefined }));

import { GET } from '@/app/api/admin/groups/[id]/closed-threads/route';

type RouteResponse = {
  status: number;
  body: { error?: string; threads?: Array<Record<string, unknown>> };
};

const SEALED = {
  id: 'c1',
  title: 'The thread',
  created_at: '2026-08-01T10:00:00+00:00',
  last_message_at: '2026-08-02T10:00:00+00:00',
  sealed_at: '2026-08-03T10:00:00+00:00',
  is_sealed: true,
  message_count: 4,
};
const LIVE = { ...SEALED, id: 'c2', sealed_at: null, is_sealed: false, message_count: 1 };

const params = Promise.resolve({ id: 'grp-closed' });

beforeEach(() => {
  getVerifiedUserId.mockReset().mockResolvedValue('u-admin');
  fetchAdminClosedGroupThreads.mockReset();
  emitDurableTelemetry.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/admin/groups/[id]/closed-threads — the closed group\'s preserved thread set', () => {
  it('passes the rows through with their sealed state intact, and records the admin-plane read durably', async () => {
    fetchAdminClosedGroupThreads.mockResolvedValue({
      data: [SEALED, LIVE],
      refused: false,
      notFound: false,
    });
    const res = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.threads).toEqual([SEALED, LIVE]);
    expect(fetchAdminClosedGroupThreads).toHaveBeenCalledWith('grp-closed');
    expect(emitDurableTelemetry).toHaveBeenCalledWith(
      'admin.closed_group_threads_read',
      expect.objectContaining({ actor: 'u-admin', group: 'grp-closed' }),
    );
  });

  it('collapses a refusal (not closed / not an admin) and an unknown group to 404, the admin-plane shape', async () => {
    fetchAdminClosedGroupThreads.mockResolvedValue({ data: null, refused: true, notFound: false });
    const refused = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(refused.status).toBe(404);

    fetchAdminClosedGroupThreads.mockResolvedValue({ data: null, refused: false, notFound: true });
    const missing = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(missing.status).toBe(404);
    expect(emitDurableTelemetry).not.toHaveBeenCalled();
  });

  it('401s a sessionless caller before touching the contract', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(res.status).toBe(401);
    expect(fetchAdminClosedGroupThreads).not.toHaveBeenCalled();
  });
});
