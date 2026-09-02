import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * RD-B FEAT-H044 STORY-3 (unit) — the publish/unpublish BFF route.
 *
 * The route decides nothing: `admin_publish_role_template` and
 * `admin_unpublish_role_template` are SECURITY DEFINER behind
 * `is_platform_admin`, so this is session handling, SQLSTATE→HTTP mapping and
 * telemetry (ADR-U038).
 *
 * The cell that matters is the **reach-widening guard**. `group_ids: null`
 * means platform-wide — which is correct as an explicit instruction and
 * dangerous as a fallback. If a targeted unpublish's body were lost or
 * unparseable, defaulting to null would silently turn "stop offering this to
 * Willow Circle" into "stop offering this to everyone". The key must be
 * present; absence is refused rather than widened.
 *
 * Red-first for TASK-RDB-03.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const publishRoleTemplate = jest.fn<(...a: unknown[]) => Promise<{ refused: boolean }>>();
const unpublishRoleTemplate = jest.fn<(...a: unknown[]) => Promise<{ refused: boolean }>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
jest.mock('@/lib/observability/telemetry-server', () => ({
  emitDurableTelemetry: async () => undefined,
}));
jest.mock('@/lib/admin/roles', () => ({
  publishRoleTemplate: (...a: unknown[]) => publishRoleTemplate(...a),
  unpublishRoleTemplate: (...a: unknown[]) => unpublishRoleTemplate(...a),
  AdminRolesError: class AdminRolesError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { POST, DELETE } from '@/app/api/admin/roles/[id]/publish/route';
import { AdminRolesError } from '@/lib/admin/roles';

const params = Promise.resolve({ id: 'tmpl-1' });
const req = (body: unknown, broken = false) =>
  ({
    json: async () => {
      if (broken) throw new Error('unparseable');
      return body;
    },
  }) as unknown as Request;

beforeEach(() => {
  jest.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  publishRoleTemplate.mockResolvedValue({ refused: false });
  unpublishRoleTemplate.mockResolvedValue({ refused: false });
});

describe('FEAT-H044 STORY-3 — publish/unpublish route', () => {
  it('publishes platform-wide on an explicit null', async () => {
    const res = await POST(req({ group_ids: null }), { params });
    expect(res.status).toBe(200);
    expect(publishRoleTemplate).toHaveBeenCalledWith(expect.anything(), 'tmpl-1', null);
  });

  it('publishes to named groups', async () => {
    await POST(req({ group_ids: ['grp-1', 'grp-2'] }), { params });
    expect(publishRoleTemplate).toHaveBeenCalledWith(expect.anything(), 'tmpl-1', [
      'grp-1',
      'grp-2',
    ]);
  });

  it('unpublishes a named group without widening it', async () => {
    await DELETE(req({ group_ids: ['grp-1'] }), { params });
    expect(unpublishRoleTemplate).toHaveBeenCalledWith(expect.anything(), 'tmpl-1', ['grp-1']);
  });

  it('REFUSES an unparseable body rather than widening to platform-wide', async () => {
    // The guard that matters: a lost body must never become "unpublish from
    // everyone". Absence is refused, not defaulted.
    const res = await DELETE(req(null, true), { params });
    expect(res.status).toBe(400);
    expect(unpublishRoleTemplate).not.toHaveBeenCalled();
  });

  it('REFUSES a body with no group_ids key rather than widening', async () => {
    const res = await DELETE(req({}), { params });
    expect(res.status).toBe(400);
    expect(unpublishRoleTemplate).not.toHaveBeenCalled();
  });

  it('refuses an empty array rather than reading it as platform-wide', async () => {
    const res = await POST(req({ group_ids: [] }), { params });
    expect(res.status).toBe(400);
    expect(publishRoleTemplate).not.toHaveBeenCalled();
  });

  it('401s a sessionless caller before the contract is reached', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ group_ids: null }), { params });
    expect(res.status).toBe(401);
    expect(publishRoleTemplate).not.toHaveBeenCalled();
  });

  it('surfaces a platform refusal verbatim with its mapped status', async () => {
    publishRoleTemplate.mockRejectedValue(
      new AdminRolesError('P0001', 'cannot publish a retired role template'),
    );
    const res = await POST(req({ group_ids: null }), { params });
    expect(res.status).toBe(409);
    expect((res.body as unknown as { error: string }).error).toBe('cannot publish a retired role template');
  });

  it('does not leak existence on a 404-mapped refusal', async () => {
    publishRoleTemplate.mockRejectedValue(new AdminRolesError('P0002', 'Role template not found'));
    const res = await POST(req({ group_ids: null }), { params });
    expect(res.status).toBe(404);
    expect((res.body as unknown as { error: string }).error).toBe('Not found');
  });
});
