import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H017 (unit) — the leadership-transfer + closure BFF routes (Cycle G-E):
 * POST /api/groups/[id]/nominate-steward,
 * POST /api/groups/[id]/hand-to-deusex,
 * POST /api/notifications/[id]/nomination-response,
 * POST /api/groups/[id]/close,
 * DELETE /api/groups/[id] (deliberate deletion — never member removal),
 * GET /api/me/nominations (the scoped pending-nomination read — A-NTF seam).
 *
 * Private BFF per ADR-U038 — the FEAT-PC014 contracts self-gate; these routes
 * only map session → 401, validate body shape, and map SQLSTATE → HTTP
 * (42501 → 403, P0002 → 404, P0001 → 409 with the refusal's message passed
 * through — it carries the honest outcome copy the Surface renders in place —
 * 22023 → 400 with the nominee-refusal message through, else 500 content-free).
 * Telemetry is id-only: member/group names and nominee id lists never in
 * events (STORY-6).
 *
 * Red-first: fails until the route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
const nominateSteward = jest.fn<() => Promise<unknown>>();
const respondToNomination = jest.fn<() => Promise<unknown>>();
const handToDeusEx = jest.fn<() => Promise<unknown>>();
const closeGroup = jest.fn<() => Promise<unknown>>();
const deleteGroup = jest.fn<() => Promise<unknown>>();
const fetchPendingNominations = jest.fn<() => Promise<unknown[]>>();

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
jest.mock('@/lib/groups/queries', () => ({
  fetchGroupDetail: jest.fn(),
  updateGroupSettings: jest.fn(),
}));
jest.mock('@/lib/groups/leadership', () => ({
  nominateSteward: (...a: unknown[]) =>
    (nominateSteward as unknown as (...x: unknown[]) => unknown)(...a),
  respondToNomination: (...a: unknown[]) =>
    (respondToNomination as unknown as (...x: unknown[]) => unknown)(...a),
  handToDeusEx: (...a: unknown[]) =>
    (handToDeusEx as unknown as (...x: unknown[]) => unknown)(...a),
  closeGroup: (...a: unknown[]) =>
    (closeGroup as unknown as (...x: unknown[]) => unknown)(...a),
  deleteGroup: (...a: unknown[]) =>
    (deleteGroup as unknown as (...x: unknown[]) => unknown)(...a),
  fetchPendingNominations: (...a: unknown[]) =>
    (fetchPendingNominations as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { POST as NOMINATE } from '@/app/api/groups/[id]/nominate-steward/route';
import { POST as HANDOVER } from '@/app/api/groups/[id]/hand-to-deusex/route';
import { POST as RESPOND } from '@/app/api/notifications/[id]/nomination-response/route';
import { POST as CLOSE } from '@/app/api/groups/[id]/close/route';
import { DELETE as DELETE_GROUP } from '@/app/api/groups/[id]/route';
import { GET as MY_NOMINATIONS } from '@/app/api/me/nominations/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

/** Names and nominee id lists are member content — never in events (STORY-6). */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => {
    const s = JSON.stringify(e.props ?? {});
    return !s.includes('GDCanaryName') && !s.includes('GDCanaryNominee');
  });

const fakeRequest = {} as unknown as Request;
const jsonRequest = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request;
const badJsonRequest = () =>
  ({
    json: async () => {
      throw new Error('no body');
    },
  }) as unknown as Request;
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

const sqlErr = (code: string, message: string) => {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return Promise.reject(err);
};

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  getVerifiedUserId.mockReset().mockResolvedValue('u1');
  nominateSteward
    .mockReset()
    .mockResolvedValue({ group_id: 'grp-1', nominees_count: 2 });
  respondToNomination
    .mockReset()
    .mockResolvedValue({ outcome: 'accepted', group_id: 'grp-1' });
  handToDeusEx
    .mockReset()
    .mockResolvedValue({ group_id: 'grp-1', steward: 'deusex' });
  closeGroup.mockReset().mockResolvedValue({ group_id: 'grp-1', status: 'closed' });
  deleteGroup
    .mockReset()
    .mockResolvedValue({ group_id: 'grp-1', status: 'archived' });
  fetchPendingNominations.mockReset().mockResolvedValue([]);
  getTelemetrySink().length = 0;
});

describe('FEAT-H017 — leadership transfer + closure BFF routes', () => {
  describe('session gate', () => {
    it('401s every mutation handler without a session, with the telemetry variant', async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      const calls: Array<[string, () => Promise<unknown>]> = [
        [
          'leadership.nominate_unauthenticated',
          () => NOMINATE(jsonRequest({ nominee_group_ids: ['n1'] }), idParams('grp-1')),
        ],
        [
          'leadership.hand_to_deusex_unauthenticated',
          () => HANDOVER(fakeRequest, idParams('grp-1')),
        ],
        [
          'leadership.respond_unauthenticated',
          () => RESPOND(jsonRequest({ accept: true }), idParams('ntf-1')),
        ],
        ['groups.close_unauthenticated', () => CLOSE(fakeRequest, idParams('grp-1'))],
        ['groups.delete_unauthenticated', () => DELETE_GROUP(fakeRequest, idParams('grp-1'))],
      ];
      for (const [event, call] of calls) {
        const res = (await call()) as RouteResponse;
        expect(res.status).toBe(401);
        expect(emitted(event)).toBe(true);
      }
      expect(nominateSteward).not.toHaveBeenCalled();
      expect(deleteGroup).not.toHaveBeenCalled();
    });

    it('401s the pending-nomination read without a session', async () => {
      getVerifiedUserId.mockResolvedValue(null);
      const res = (await MY_NOMINATIONS()) as RouteResponse;
      expect(res.status).toBe(401);
      expect(emitted('nominations.mine_unauthenticated')).toBe(true);
      expect(fetchPendingNominations).not.toHaveBeenCalled();
    });
  });

  describe('POST .../nominate-steward (STORY-1)', () => {
    it('relays the ordered nominee ids to the contract and returns its result', async () => {
      const res = (await NOMINATE(
        jsonRequest({ nominee_group_ids: ['n1', 'n2'] }),
        idParams('grp-1'),
      )) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ group_id: 'grp-1', nominees_count: 2 });
      expect(nominateSteward).toHaveBeenCalledWith(expect.anything(), 'grp-1', ['n1', 'n2']);
      expect(emitted('leadership.nominate', 'u1')).toBe(true);
    });

    it('400s a missing, empty, or non-array body without calling the contract', async () => {
      for (const body of [{}, { nominee_group_ids: [] }, { nominee_group_ids: 'n1' }]) {
        const res = (await NOMINATE(jsonRequest(body), idParams('grp-1'))) as RouteResponse;
        expect(res.status).toBe(400);
      }
      const res = (await NOMINATE(badJsonRequest(), idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(400);
      expect(nominateSteward).not.toHaveBeenCalled();
      expect(emitted('leadership.nominate_invalid', 'u1')).toBe(true);
    });

    it('maps refusals: 42501→403, P0001→409 (message through), P0002→404, 22023→400 (message through), else 500', async () => {
      nominateSteward.mockImplementation(() => sqlErr('42501', 'not permitted'));
      let res = (await NOMINATE(
        jsonRequest({ nominee_group_ids: ['n1'] }),
        idParams('grp-1'),
      )) as RouteResponse;
      expect(res.status).toBe(403);

      nominateSteward.mockImplementation(() =>
        sqlErr('P0001', 'a nomination is already in flight for this group'),
      );
      res = (await NOMINATE(
        jsonRequest({ nominee_group_ids: ['n1'] }),
        idParams('grp-1'),
      )) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already in flight');
      expect(emitted('leadership.nominate_conflict', 'u1')).toBe(true);

      nominateSteward.mockImplementation(() => sqlErr('P0002', 'group not found'));
      res = (await NOMINATE(
        jsonRequest({ nominee_group_ids: ['n1'] }),
        idParams('grp-1'),
      )) as RouteResponse;
      expect(res.status).toBe(404);

      nominateSteward.mockImplementation(() =>
        sqlErr('22023', 'nominee is not an active member of this group'),
      );
      res = (await NOMINATE(
        jsonRequest({ nominee_group_ids: ['n1'] }),
        idParams('grp-1'),
      )) as RouteResponse;
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not an active member');

      nominateSteward.mockImplementation(() => sqlErr('XX000', 'boom'));
      res = (await NOMINATE(
        jsonRequest({ nominee_group_ids: ['n1'] }),
        idParams('grp-1'),
      )) as RouteResponse;
      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('boom');
      expect(emitted('leadership.nominate_failed', 'u1')).toBe(true);
    });

    it('never puts nominee id lists in telemetry (STORY-6 canary)', async () => {
      await NOMINATE(
        jsonRequest({ nominee_group_ids: ['GDCanaryNominee', 'n2'] }),
        idParams('grp-1'),
      );
      expect(telemetryIsContentFree()).toBe(true);
    });
  });

  describe('POST .../hand-to-deusex (STORY-3)', () => {
    it('relays the hand-over and its result', async () => {
      const res = (await HANDOVER(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ group_id: 'grp-1', steward: 'deusex' });
      expect(handToDeusEx).toHaveBeenCalledWith(expect.anything(), 'grp-1');
      expect(emitted('leadership.hand_to_deusex', 'u1')).toBe(true);
    });

    it('passes the last-member 409 (pointing at Close) through verbatim', async () => {
      handToDeusEx.mockImplementation(() =>
        sqlErr('P0001', 'you are the last member — close the group instead'),
      );
      const res = (await HANDOVER(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('close the group instead');
      expect(emitted('leadership.hand_to_deusex_conflict', 'u1')).toBe(true);
    });

    it('maps 42501→403, P0002→404, else 500', async () => {
      handToDeusEx.mockImplementation(() => sqlErr('42501', 'not permitted'));
      let res = (await HANDOVER(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(403);

      handToDeusEx.mockImplementation(() => sqlErr('P0002', 'group not found'));
      res = (await HANDOVER(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(404);

      handToDeusEx.mockImplementation(() => sqlErr('XX000', 'boom'));
      res = (await HANDOVER(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('boom');
    });
  });

  describe('POST /api/notifications/[id]/nomination-response (STORY-2)', () => {
    it('relays accept to the contract and returns its outcome', async () => {
      const res = (await RESPOND(
        jsonRequest({ accept: true }),
        idParams('ntf-1'),
      )) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ outcome: 'accepted', group_id: 'grp-1' });
      expect(respondToNomination).toHaveBeenCalledWith(expect.anything(), 'ntf-1', true);
      expect(emitted('leadership.respond', 'u1')).toBe(true);
    });

    it('relays decline (the contract decides the routing; the route does not name it)', async () => {
      respondToNomination.mockResolvedValue({ outcome: 'passed_on' });
      const res = (await RESPOND(
        jsonRequest({ accept: false }),
        idParams('ntf-1'),
      )) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ outcome: 'passed_on' });
      expect(respondToNomination).toHaveBeenCalledWith(expect.anything(), 'ntf-1', false);
    });

    it('400s a missing or non-boolean accept without calling the contract', async () => {
      for (const body of [{}, { accept: 'yes' }, { accept: 1 }]) {
        const res = (await RESPOND(jsonRequest(body), idParams('ntf-1'))) as RouteResponse;
        expect(res.status).toBe(400);
      }
      expect(respondToNomination).not.toHaveBeenCalled();
      expect(emitted('leadership.respond_invalid', 'u1')).toBe(true);
    });

    it('maps the expired/answered 409 with the message through, P0002→404, 42501→403', async () => {
      respondToNomination.mockImplementation(() =>
        sqlErr('P0001', 'this nomination has expired'),
      );
      let res = (await RESPOND(
        jsonRequest({ accept: true }),
        idParams('ntf-1'),
      )) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('expired');

      respondToNomination.mockImplementation(() => sqlErr('P0002', 'notification not found'));
      res = (await RESPOND(jsonRequest({ accept: true }), idParams('ntf-1'))) as RouteResponse;
      expect(res.status).toBe(404);

      respondToNomination.mockImplementation(() => sqlErr('42501', 'not yours'));
      res = (await RESPOND(jsonRequest({ accept: true }), idParams('ntf-1'))) as RouteResponse;
      expect(res.status).toBe(403);
    });
  });

  describe('POST .../close (STORY-4)', () => {
    it('relays the close and its result', async () => {
      const res = (await CLOSE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ group_id: 'grp-1', status: 'closed' });
      expect(closeGroup).toHaveBeenCalledWith(expect.anything(), 'grp-1');
      expect(emitted('groups.close', 'u1')).toBe(true);
    });

    it('passes the not-last-member 409 through verbatim; maps 403/404/500', async () => {
      closeGroup.mockImplementation(() =>
        sqlErr('P0001', 'only the last active member can close a group'),
      );
      let res = (await CLOSE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('last active member');
      expect(emitted('groups.close_conflict', 'u1')).toBe(true);

      closeGroup.mockImplementation(() => sqlErr('42501', 'not permitted'));
      res = (await CLOSE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(403);

      closeGroup.mockImplementation(() => sqlErr('P0002', 'group not found'));
      res = (await CLOSE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(404);

      closeGroup.mockImplementation(() => sqlErr('XX000', 'boom'));
      res = (await CLOSE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('boom');
    });
  });

  describe('DELETE /api/groups/[id] (STORY-5 — deliberate deletion, never member removal)', () => {
    it('relays the deletion and its result', async () => {
      const res = (await DELETE_GROUP(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ group_id: 'grp-1', status: 'archived' });
      expect(deleteGroup).toHaveBeenCalledWith(expect.anything(), 'grp-1');
      expect(emitted('groups.delete', 'u1')).toBe(true);
    });

    it('maps refusals: 42501→403, P0002→404, P0001→409 (message through), else 500', async () => {
      deleteGroup.mockImplementation(() => sqlErr('42501', 'delete_group permission required'));
      let res = (await DELETE_GROUP(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(403);
      expect(emitted('groups.delete_refused', 'u1')).toBe(true);

      deleteGroup.mockImplementation(() => sqlErr('P0002', 'group not found'));
      res = (await DELETE_GROUP(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(404);

      deleteGroup.mockImplementation(() => sqlErr('P0001', 'this group cannot be deleted'));
      res = (await DELETE_GROUP(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('cannot be deleted');

      deleteGroup.mockImplementation(() => sqlErr('XX000', 'boom'));
      res = (await DELETE_GROUP(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('boom');
    });
  });

  describe('GET /api/me/nominations (STORY-2 read — the A-NTF seam)', () => {
    it('relays the scoped read', async () => {
      fetchPendingNominations.mockResolvedValue([
        {
          notification_id: 'ntf-1',
          group_id: 'grp-1',
          group_name: 'GDCanaryName',
          created_at: '2026-07-05T00:00:00Z',
          expires_at: '2026-07-12T00:00:00Z',
        },
      ]);
      const res = (await MY_NOMINATIONS()) as RouteResponse;
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown as unknown[]).length).toBe(1);
      expect(emitted('nominations.mine', 'u1')).toBe(true);
      expect(telemetryIsContentFree()).toBe(true);
    });

    it('500s content-free on failure', async () => {
      fetchPendingNominations.mockImplementation(() => sqlErr('XX000', 'boom'));
      const res = (await MY_NOMINATIONS()) as RouteResponse;
      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('boom');
      expect(emitted('nominations.mine_failed', 'u1')).toBe(true);
    });
  });

  it('keeps success telemetry content-free across all six handlers (STORY-6 canary)', async () => {
    nominateSteward.mockResolvedValue({ group_id: 'grp-1', group_name: 'GDCanaryName' });
    handToDeusEx.mockResolvedValue({ group_name: 'GDCanaryName' });
    closeGroup.mockResolvedValue({ group_name: 'GDCanaryName' });
    deleteGroup.mockResolvedValue({ group_name: 'GDCanaryName' });
    respondToNomination.mockResolvedValue({ group_name: 'GDCanaryName' });
    await NOMINATE(jsonRequest({ nominee_group_ids: ['GDCanaryNominee'] }), idParams('grp-1'));
    await HANDOVER(fakeRequest, idParams('grp-1'));
    await RESPOND(jsonRequest({ accept: true }), idParams('ntf-1'));
    await CLOSE(fakeRequest, idParams('grp-1'));
    await DELETE_GROUP(fakeRequest, idParams('grp-1'));
    await MY_NOMINATIONS();
    expect(telemetryIsContentFree()).toBe(true);
  });
});
