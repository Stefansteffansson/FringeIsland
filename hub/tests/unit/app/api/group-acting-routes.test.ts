import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink, resetTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H018 (unit) — the group-of-groups acting BFF routes (Cycle G-F):
 * GET  /api/me/acting-contexts,
 * POST /api/groups/[id]/invite-group,
 * GET  /api/groups/[id]/invitable-groups,
 * GET  /api/groups/[id]/acting/memberships,
 * POST /api/groups/[id]/acting/respond,
 * POST /api/groups/[id]/acting/leave,
 * plus the my-permissions `?acting=` substitution read (ADR-U041 §2a).
 *
 * Private BFF per ADR-U038 — the FEAT-PC015 contracts self-gate; these routes
 * map session → 401, validate body shape, and map SQLSTATE → HTTP (42501 →
 * 403, P0002 → 404, P0001/22023 with the contract's refusal copy passed
 * through verbatim — cycle/duplicate/last-Steward messages render in place).
 * Telemetry is id-only: group names and search queries never in events.
 *
 * Red-first for TASK-H018-01: fails until the route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
const fetchActingContexts = jest.fn<() => Promise<unknown[]>>();
const inviteGroup = jest.fn<() => Promise<unknown>>();
const searchInvitableGroups = jest.fn<() => Promise<unknown[]>>();
const fetchGroupMembershipsOf = jest.fn<() => Promise<unknown[]>>();
const respondToGroupInvitation = jest.fn<() => Promise<unknown>>();
const leaveGroupAsGroup = jest.fn<() => Promise<unknown>>();
const fetchPermissionsActingAs = jest.fn<() => Promise<string[]>>();

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
jest.mock('@/lib/supabase/auth', () => ({
  getVerifiedUserId: (...a: unknown[]) =>
    (getVerifiedUserId as unknown as (...x: unknown[]) => unknown)(...a),
}));
jest.mock('@/lib/groups/acting', () => ({
  fetchActingContexts: (...a: unknown[]) =>
    (fetchActingContexts as unknown as (...x: unknown[]) => unknown)(...a),
  inviteGroup: (...a: unknown[]) =>
    (inviteGroup as unknown as (...x: unknown[]) => unknown)(...a),
  searchInvitableGroups: (...a: unknown[]) =>
    (searchInvitableGroups as unknown as (...x: unknown[]) => unknown)(...a),
  fetchGroupMembershipsOf: (...a: unknown[]) =>
    (fetchGroupMembershipsOf as unknown as (...x: unknown[]) => unknown)(...a),
  respondToGroupInvitation: (...a: unknown[]) =>
    (respondToGroupInvitation as unknown as (...x: unknown[]) => unknown)(...a),
  leaveGroupAsGroup: (...a: unknown[]) =>
    (leaveGroupAsGroup as unknown as (...x: unknown[]) => unknown)(...a),
  fetchPermissionsActingAs: (...a: unknown[]) =>
    (fetchPermissionsActingAs as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET as ACTING_CONTEXTS } from '@/app/api/me/acting-contexts/route';
import { POST as INVITE_GROUP } from '@/app/api/groups/[id]/invite-group/route';
import { GET as INVITABLE_GROUPS } from '@/app/api/groups/[id]/invitable-groups/route';
import { GET as ACTING_MEMBERSHIPS } from '@/app/api/groups/[id]/acting/memberships/route';
import { POST as ACTING_RESPOND } from '@/app/api/groups/[id]/acting/respond/route';
import { POST as ACTING_LEAVE } from '@/app/api/groups/[id]/acting/leave/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };

const fakeRequest = (url = 'http://x/api') => ({ url }) as unknown as Request;
const jsonRequest = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const groupParams = { params: Promise.resolve({ id: 'group-b' }) };

const sqlstate = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

/** Group names and search queries are member content — never in events. */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => {
    const s = JSON.stringify(e.props ?? {});
    return !s.includes('GoGCanaryName') && !s.includes('GoGCanaryQuery');
  });

describe('FEAT-H018 — acting BFF routes (TASK-H018-01)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTelemetrySink();
    // GET reads verify identity locally (getClaims via getVerifiedUserId);
    // the POST mutations verify over the network (getUser) per ADR-U037.
    getVerifiedUserId.mockResolvedValue('user-1');
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('every route maps a missing session to 401', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    getUser.mockResolvedValue({ data: { user: null } });
    const results = (await Promise.all([
      ACTING_CONTEXTS(fakeRequest()),
      INVITE_GROUP(jsonRequest({ invited_group_id: 'a' }), groupParams),
      INVITABLE_GROUPS(fakeRequest('http://x/api?q=nya'), groupParams),
      ACTING_MEMBERSHIPS(fakeRequest(), groupParams),
      ACTING_RESPOND(jsonRequest({ membership_id: 'm', accept: true }), groupParams),
      ACTING_LEAVE(jsonRequest({ context_group_id: 'b' }), groupParams),
    ])) as unknown as RouteResponse[];
    for (const r of results) expect(r.status).toBe(401);
  });

  it('GET /api/me/acting-contexts relays the wieldable groups', async () => {
    fetchActingContexts.mockResolvedValue([{ group_id: 'a', name: 'GoGCanaryName' }]);
    const res = (await ACTING_CONTEXTS(fakeRequest())) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ group_id: 'a', name: 'GoGCanaryName' }]);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('GET /api/me/acting-contexts forwards ?context= to the scoped read (post-6-done fix)', async () => {
    fetchActingContexts.mockResolvedValue([]);
    const res = (await ACTING_CONTEXTS(
      fakeRequest('http://x/api/me/acting-contexts?context=ctx-1'),
    )) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    const args = (fetchActingContexts as jest.Mock).mock.calls[0] as unknown[];
    expect(args[1]).toBe('ctx-1');
  });

  it('POST invite-group relays success and passes 22023 refusal copy through as 409', async () => {
    inviteGroup.mockResolvedValue({ membership_id: 'm1' });
    const ok = (await INVITE_GROUP(
      jsonRequest({ invited_group_id: 'a' }),
      groupParams,
    )) as unknown as RouteResponse;
    expect(ok.status).toBe(200);

    inviteGroup.mockRejectedValue(
      sqlstate('22023', 'this group already belongs to the invited group — a membership cycle is not allowed'),
    );
    const cycle = (await INVITE_GROUP(
      jsonRequest({ invited_group_id: 'a' }),
      groupParams,
    )) as unknown as RouteResponse;
    expect(cycle.status).toBe(409);
    expect(cycle.body.error).toMatch(/membership cycle is not allowed/);
  });

  it('invite-group maps P0002 → 404 and 42501 → 403; body without invited_group_id is 400', async () => {
    inviteGroup.mockRejectedValue(sqlstate('P0002', 'group not found'));
    const missing = (await INVITE_GROUP(
      jsonRequest({ invited_group_id: 'ghost' }),
      groupParams,
    )) as unknown as RouteResponse;
    expect(missing.status).toBe(404);

    inviteGroup.mockRejectedValue(sqlstate('42501', 'you do not have permission to invite members'));
    const refused = (await INVITE_GROUP(
      jsonRequest({ invited_group_id: 'a' }),
      groupParams,
    )) as unknown as RouteResponse;
    expect(refused.status).toBe(403);

    const badBody = (await INVITE_GROUP(jsonRequest({}), groupParams)) as unknown as RouteResponse;
    expect(badBody.status).toBe(400);
    expect(inviteGroup).toHaveBeenCalledTimes(2);
  });

  it('GET invitable-groups requires q and never puts the query in telemetry', async () => {
    const empty = (await INVITABLE_GROUPS(fakeRequest('http://x/api'), groupParams)) as unknown as RouteResponse;
    expect(empty.status).toBe(400);

    searchInvitableGroups.mockResolvedValue([{ id: 'a', name: 'Nya' }]);
    const res = (await INVITABLE_GROUPS(
      fakeRequest('http://x/api?q=GoGCanaryQuery'),
      groupParams,
    )) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('GET acting/memberships relays rows; 42501 (keyless) → 403', async () => {
    fetchGroupMembershipsOf.mockResolvedValue([
      { membership_id: 'm1', group_id: 'b', name: 'B', status: 'invited' },
    ]);
    const res = (await ACTING_MEMBERSHIPS(fakeRequest(), groupParams)) as unknown as RouteResponse;
    expect(res.status).toBe(200);

    fetchGroupMembershipsOf.mockRejectedValue(
      sqlstate('42501', 'you do not have permission to act as this group'),
    );
    const keyless = (await ACTING_MEMBERSHIPS(fakeRequest(), groupParams)) as unknown as RouteResponse;
    expect(keyless.status).toBe(403);
    expect(keyless.body.error).toMatch(/act as this group/);
  });

  it('POST acting/respond validates the body and passes P0001 copy through as 409', async () => {
    const badBody = (await ACTING_RESPOND(jsonRequest({ accept: true }), groupParams)) as unknown as RouteResponse;
    expect(badBody.status).toBe(400);

    respondToGroupInvitation.mockRejectedValue(
      sqlstate('P0001', 'cannot join a group that is not active'),
    );
    const stale = (await ACTING_RESPOND(
      jsonRequest({ membership_id: 'm1', accept: true }),
      groupParams,
    )) as unknown as RouteResponse;
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatch(/not active/);
  });

  it('POST acting/leave passes the last-Steward refusal through as 409', async () => {
    leaveGroupAsGroup.mockRejectedValue(
      sqlstate('P0001', 'this group is the last active Steward — transfer stewardship first'),
    );
    const res = (await ACTING_LEAVE(
      jsonRequest({ context_group_id: 'b' }),
      groupParams,
    )) as unknown as RouteResponse;
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/transfer stewardship first/);
  });
});
