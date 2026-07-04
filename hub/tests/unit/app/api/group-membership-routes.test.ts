import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H016 (unit) — the membership lifecycle BFF routes (Cycle G-D):
 * POST /api/groups/[id]/members/[memberGroupId]/pause,
 * POST /api/groups/[id]/members/[memberGroupId]/activate,
 * DELETE /api/groups/[id]/members/[memberGroupId],
 * POST /api/groups/[id]/leave.
 *
 * Private BFF per ADR-U038 — the FEAT-PC013 contracts self-gate; these routes
 * only map session → 401 and SQLSTATE → HTTP (42501 → 403, P0002 → 404,
 * P0001 → 409 with the refusal's message passed through — it carries the
 * honest G-E copy the Surface renders — else 500 content-free). Telemetry is
 * id-only: member display names never appear in events (STORY-5).
 *
 * Red-first: fails until the three route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const pauseMember = jest.fn<() => Promise<unknown>>();
const activateMember = jest.fn<() => Promise<unknown>>();
const removeGroupMember = jest.fn<() => Promise<unknown>>();
const leaveGroup = jest.fn<() => Promise<unknown>>();

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
jest.mock('@/lib/groups/queries', () => ({
  pauseMember: (...a: unknown[]) =>
    (pauseMember as unknown as (...x: unknown[]) => unknown)(...a),
  activateMember: (...a: unknown[]) =>
    (activateMember as unknown as (...x: unknown[]) => unknown)(...a),
  removeGroupMember: (...a: unknown[]) =>
    (removeGroupMember as unknown as (...x: unknown[]) => unknown)(...a),
  leaveGroup: (...a: unknown[]) =>
    (leaveGroup as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { POST as PAUSE } from '@/app/api/groups/[id]/members/[memberGroupId]/pause/route';
import { POST as ACTIVATE } from '@/app/api/groups/[id]/members/[memberGroupId]/activate/route';
import { DELETE as REMOVE } from '@/app/api/groups/[id]/members/[memberGroupId]/route';
import { POST as LEAVE } from '@/app/api/groups/[id]/leave/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

/** Member display names are member content — never in events. */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => !JSON.stringify(e.props ?? {}).includes('GDCanaryName'));

const fakeRequest = {} as unknown as Request;
const memberParams = (id: string, memberGroupId: string) => ({
  params: Promise.resolve({ id, memberGroupId }),
});
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

const sqlErr = (code: string, message: string) => {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return Promise.reject(err);
};

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  pauseMember.mockReset().mockResolvedValue(undefined);
  activateMember.mockReset().mockResolvedValue(undefined);
  removeGroupMember.mockReset().mockResolvedValue(undefined);
  leaveGroup.mockReset().mockResolvedValue({ group_id: 'grp-1', group_name: 'GDCanaryName' });
  getTelemetrySink().length = 0;
});

describe('FEAT-H016 — membership lifecycle BFF routes', () => {
  describe('session gate', () => {
    it('401s every handler without a session, with the telemetry variant', async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      const calls: Array<[string, () => Promise<unknown>]> = [
        ['membership.pause_unauthenticated', () => PAUSE(fakeRequest, memberParams('grp-1', 'm1'))],
        ['membership.activate_unauthenticated', () => ACTIVATE(fakeRequest, memberParams('grp-1', 'm1'))],
        ['membership.remove_unauthenticated', () => REMOVE(fakeRequest, memberParams('grp-1', 'm1'))],
        ['membership.leave_unauthenticated', () => LEAVE(fakeRequest, idParams('grp-1'))],
      ];
      for (const [event, call] of calls) {
        const res = (await call()) as RouteResponse;
        expect(res.status).toBe(401);
        expect(emitted(event)).toBe(true);
      }
      expect(pauseMember).not.toHaveBeenCalled();
      expect(leaveGroup).not.toHaveBeenCalled();
    });
  });

  describe('POST .../members/[memberGroupId]/pause (STORY-1)', () => {
    it('pauses and emits id-only telemetry', async () => {
      const res = (await PAUSE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(pauseMember).toHaveBeenCalledWith(expect.anything(), 'grp-1', 'm1');
      expect(emitted('membership.pause', 'u1')).toBe(true);
    });

    it('maps refusals: 42501→403, P0001→409 (message through), P0002→404, else 500', async () => {
      pauseMember.mockImplementation(() => sqlErr('42501', 'pause_members permission required'));
      let res = (await PAUSE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(403);

      pauseMember.mockImplementation(() =>
        sqlErr('P0001', 'cannot pause the last active Steward — assign another Steward first'),
      );
      res = (await PAUSE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('assign another Steward first');
      expect(emitted('membership.pause_conflict', 'u1')).toBe(true);

      pauseMember.mockImplementation(() => sqlErr('P0002', 'member not found'));
      res = (await PAUSE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(404);

      pauseMember.mockImplementation(() => sqlErr('XX000', 'boom'));
      res = (await PAUSE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('boom');
    });
  });

  describe('POST .../members/[memberGroupId]/activate (STORY-1)', () => {
    it('reactivates and emits id-only telemetry', async () => {
      const res = (await ACTIVATE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(activateMember).toHaveBeenCalledWith(expect.anything(), 'grp-1', 'm1');
      expect(emitted('membership.activate', 'u1')).toBe(true);
    });

    it('maps refusals: not-paused P0001→409, wrong key 42501→403', async () => {
      activateMember.mockImplementation(() => sqlErr('P0001', 'member is not paused'));
      let res = (await ACTIVATE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('member is not paused');

      activateMember.mockImplementation(() => sqlErr('42501', 'activate_members permission required'));
      res = (await ACTIVATE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(403);
      expect(emitted('membership.activate_refused', 'u1')).toBe(true);
    });
  });

  describe('DELETE .../members/[memberGroupId] (STORY-2)', () => {
    it('removes and emits id-only telemetry', async () => {
      const res = (await REMOVE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(removeGroupMember).toHaveBeenCalledWith(expect.anything(), 'grp-1', 'm1');
      expect(emitted('membership.remove', 'u1')).toBe(true);
    });

    it('passes the last-active-Steward refusal through as 409', async () => {
      removeGroupMember.mockImplementation(() =>
        sqlErr('P0001', 'cannot remove the last active Steward — assign another Steward first'),
      );
      const res = (await REMOVE(fakeRequest, memberParams('grp-1', 'm1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('last active Steward');
      expect(emitted('membership.remove_conflict', 'u1')).toBe(true);
    });
  });

  describe('POST /api/groups/[id]/leave (STORY-3)', () => {
    it('leaves and relays the contract payload', async () => {
      const res = (await LEAVE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ group_id: 'grp-1', group_name: 'GDCanaryName' });
      expect(leaveGroup).toHaveBeenCalledWith(expect.anything(), 'grp-1');
      expect(emitted('membership.leave', 'u1')).toBe(true);
    });

    it('passes the honest G-E refusal copy through as 409', async () => {
      leaveGroup.mockImplementation(() =>
        sqlErr('P0001', 'cannot leave: you are the only active Steward — assign another Steward first'),
      );
      const res = (await LEAVE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        'cannot leave: you are the only active Steward — assign another Steward first',
      );
      expect(emitted('membership.leave_conflict', 'u1')).toBe(true);
    });

    it('maps the no-leak refusal: P0002→404', async () => {
      leaveGroup.mockImplementation(() => sqlErr('P0002', 'group not found'));
      const res = (await LEAVE(fakeRequest, idParams('grp-1'))) as RouteResponse;
      expect(res.status).toBe(404);
      expect(emitted('membership.leave_missing', 'u1')).toBe(true);
    });
  });

  describe('telemetry hygiene (STORY-5)', () => {
    it('member display data never enters events across success and refusal paths', async () => {
      await LEAVE(fakeRequest, idParams('grp-1')); // payload carries the canary group name
      pauseMember.mockImplementation(() => sqlErr('P0001', 'GDCanaryName is already paused'));
      await PAUSE(fakeRequest, memberParams('grp-1', 'm1'));
      expect(telemetryIsContentFree()).toBe(true);
    });
  });
});
