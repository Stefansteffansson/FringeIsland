import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * TASK-SEAL-02, Hub half — GET /api/admin/groups/[id]/closed-threads/[conversationId]
 * (unit, BFF mapping). The platform half (migration 20260903110000) armed
 * `admin_get_group_conversation_detail(p_conversation_id)`: ONE group-kind
 * thread's messages on a CLOSED group, sealed rows INCLUDED and labelled,
 * senders ladder-resolved, the read audited platform-side. This route is its
 * private BFF: read-path identity, the admin-plane 404 collapse on any
 * refusal (42501 / P0001 scope / P0002 DM-or-absent), durable telemetry ids
 * only — never content — and the detail passed through with its sealed state
 * intact so the surface can never present the thread as live.
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
const fetchAdminSealedThreadDetail = jest.fn<(conversationId: string) => Promise<Flags>>();
jest.mock('@/lib/admin/content', () => ({
  fetchAdminSealedThreadDetail: (_c: unknown, conversationId: string) =>
    fetchAdminSealedThreadDetail(conversationId),
}));

const emitDurableTelemetry = jest.fn<(name: string, props: unknown) => Promise<void>>();
jest.mock('@/lib/observability/telemetry-server', () => ({
  emitDurableTelemetry: (_c: unknown, name: string, props: unknown) =>
    emitDurableTelemetry(name, props),
}));
jest.mock('@/lib/observability/telemetry', () => ({ emitTelemetry: () => undefined }));

import { GET } from '@/app/api/admin/groups/[id]/closed-threads/[conversationId]/route';

type RouteResponse = {
  status: number;
  body: { error?: string; detail?: Record<string, unknown> };
};

const DETAIL = {
  id: 'c1',
  kind: 'group',
  title: 'The thread',
  group_id: 'grp-closed',
  group_name: 'The Cohort',
  group_status: 'closed',
  created_at: '2026-08-01T10:00:00+00:00',
  sealed_at: '2026-08-03T10:00:00+00:00',
  is_sealed: true,
  message_count: 2,
  truncated: false,
  messages: [
    { id: 'm1', sender_group_id: 'pg1', content: 'the evidence', is_deleted: false, created_at: '2026-08-01T11:00:00+00:00' },
    { id: 'm2', sender_group_id: 'pg2', content: 'the answer', is_deleted: false, created_at: '2026-08-01T12:00:00+00:00' },
  ],
  senders: {
    pg1: { display_name: 'Former member', attribution: 'former' },
    pg2: { display_name: 'Stella', attribution: 'active' },
  },
};

const params = Promise.resolve({ id: 'grp-closed', conversationId: 'c1' });

beforeEach(() => {
  getVerifiedUserId.mockReset().mockResolvedValue('u-admin');
  fetchAdminSealedThreadDetail.mockReset();
  emitDurableTelemetry.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/admin/groups/[id]/closed-threads/[conversationId] — one preserved thread, read-only', () => {
  it('passes the detail through with its sealed state and ladder-resolved senders intact, and records the read durably — ids only', async () => {
    fetchAdminSealedThreadDetail.mockResolvedValue({ data: DETAIL, refused: false, notFound: false });
    const res = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.detail).toEqual(DETAIL);
    expect(fetchAdminSealedThreadDetail).toHaveBeenCalledWith('c1');
    expect(emitDurableTelemetry).toHaveBeenCalledWith(
      'admin.sealed_thread_read',
      expect.objectContaining({ actor: 'u-admin', group: 'grp-closed', conversation: 'c1', sealed: true, messages: 2 }),
    );
    const props = JSON.stringify(emitDurableTelemetry.mock.calls[0][1]);
    expect(props).not.toContain('the evidence');
  });

  it('collapses a refusal (not closed / not an admin) and a DM-or-absent thread to 404, the admin-plane shape', async () => {
    fetchAdminSealedThreadDetail.mockResolvedValue({ data: null, refused: true, notFound: false });
    const refused = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(refused.status).toBe(404);

    fetchAdminSealedThreadDetail.mockResolvedValue({ data: null, refused: false, notFound: true });
    const missing = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(missing.status).toBe(404);
    expect(emitDurableTelemetry).not.toHaveBeenCalled();
  });

  it('401s a sessionless caller before touching the contract', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await GET({} as Request, { params })) as unknown as RouteResponse;
    expect(res.status).toBe(401);
    expect(fetchAdminSealedThreadDetail).not.toHaveBeenCalled();
  });
});
