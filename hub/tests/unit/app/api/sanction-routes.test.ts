/**
 * @jest-environment node
 *
 * FEAT-H049 STORY-1/2/5 (DB-4) — the ten hold-family BFF routes carry the
 * reason: the admin routes require a non-blank `reason` in the body
 * (defense-in-depth → 400; the contract owns the rule as 22023, which maps to
 * 400 with the message through), the bulk routes require ONE reason for the
 * batch, the Steward's rest/wake pass an OPTIONAL `note` (absent → the old
 * call shape). Telemetry stays ids-only — the reason never enters it.
 * WRITTEN RED-FIRST (2026-09-03): every route ignores the body at head and
 * calls the lib without a reason.
 */
const getUser = jest.fn();
const supabaseStub = { auth: { getUser } };
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => supabaseStub),
}));

const groupsLib = {
  suspendAdminGroup: jest.fn(),
  restAdminGroup: jest.fn(),
  wakeAdminGroup: jest.fn(),
  reactivateAdminGroup: jest.fn(),
};
jest.mock('@/lib/admin/groups', () => {
  class AdminGroupsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return { AdminGroupsError, ...groupsLib };
});

const usersLib = {
  suspendAdminUser: jest.fn(),
  reactivateAdminUser: jest.fn(),
  bulkAdminUserAction: jest.fn(),
};
jest.mock('@/lib/admin/users', () => {
  class AdminUsersError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return { AdminUsersError, ...usersLib };
});

const groupQueries = { restGroup: jest.fn(), wakeGroup: jest.fn() };
jest.mock('@/lib/groups/queries', () => groupQueries);
jest.mock('@/lib/groups/http', () => ({ availabilityRefusal: () => null }));

const emitDurableTelemetry = jest.fn();
const emitTelemetry = jest.fn();
jest.mock('@/lib/observability/telemetry-server', () => ({
  emitDurableTelemetry: (...args: unknown[]) => emitDurableTelemetry(...args),
}));
jest.mock('@/lib/observability/telemetry', () => ({
  emitTelemetry: (...args: unknown[]) => emitTelemetry(...args),
}));

import { AdminGroupsError } from '@/lib/admin/groups';
import { AdminUsersError } from '@/lib/admin/users';
import { POST as groupSuspend } from '@/app/api/admin/groups/[id]/suspend/route';
import { POST as groupRest } from '@/app/api/admin/groups/[id]/rest/route';
import { POST as groupWake } from '@/app/api/admin/groups/[id]/wake/route';
import { POST as groupReactivate } from '@/app/api/admin/groups/[id]/reactivate/route';
import { POST as userSuspend } from '@/app/api/admin/users/[id]/suspend/route';
import { POST as userReactivate } from '@/app/api/admin/users/[id]/reactivate/route';
import { POST as bulkSuspend } from '@/app/api/admin/users/bulk/suspend/route';
import { POST as bulkReactivate } from '@/app/api/admin/users/bulk/reactivate/route';
import { POST as stewardRest } from '@/app/api/groups/[id]/rest/route';
import { POST as stewardWake } from '@/app/api/groups/[id]/wake/route';

const GROUP_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = 'ee222222-2222-4222-8222-222222222222';
const USER_ID_2 = 'ee333333-3333-4333-8333-333333333333';
const ACTOR = 'ad000000-0000-4000-8000-00000000000a';

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body?: unknown) =>
  new Request('http://localhost/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: ACTOR } } });
  for (const fn of Object.values(groupsLib)) fn.mockResolvedValue(undefined);
  for (const fn of Object.values(usersLib)) fn.mockResolvedValue(undefined);
  usersLib.bulkAdminUserAction.mockResolvedValue([{ id: USER_ID, ok: true }]);
  for (const fn of Object.values(groupQueries)) fn.mockResolvedValue(undefined);
});

const telemetryNeverCarriesReason = () => {
  const all = [...emitTelemetry.mock.calls, ...emitDurableTelemetry.mock.calls];
  for (const call of all) {
    expect(JSON.stringify(call)).not.toMatch(/Repeated reports|Terms breach|Batch hold|Summer break/);
  }
};

describe('the four admin group hold routes — reason required, relayed, 22023 → 400', () => {
  const cases = [
    ['suspend', groupSuspend, groupsLib.suspendAdminGroup],
    ['rest', groupRest, groupsLib.restAdminGroup],
    ['wake', groupWake, groupsLib.wakeAdminGroup],
    ['reactivate', groupReactivate, groupsLib.reactivateAdminGroup],
  ] as const;

  it.each(cases)('%s: relays the reason to the lib and keeps telemetry ids-only', async (_name, handler, lib) => {
    const res = await handler(post({ reason: 'Repeated reports' }), params(GROUP_ID));
    expect(res.status).toBe(200);
    expect(lib).toHaveBeenCalledWith(supabaseStub, GROUP_ID, 'Repeated reports');
    expect(emitDurableTelemetry).toHaveBeenCalled();
    telemetryNeverCarriesReason();
  });

  it.each(cases)('%s: a missing or blank reason is 400 before the lib is called', async (_name, handler, lib) => {
    for (const body of [undefined, {}, { reason: '   ' }]) {
      const res = await handler(post(body), params(GROUP_ID));
      expect(res.status).toBe(400);
    }
    expect(lib).not.toHaveBeenCalled();
  });

  it.each(cases)("%s: the contract's 22023 maps to 400 with the message through", async (_name, handler, lib) => {
    lib.mockRejectedValueOnce(new AdminGroupsError('22023', 'Reason required'));
    const res = await handler(post({ reason: 'x' }), params(GROUP_ID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Reason required' });
  });
});

describe('the two admin member hold routes — reason required, relayed, 22023 → 400', () => {
  const cases = [
    ['suspend', userSuspend, usersLib.suspendAdminUser],
    ['reactivate', userReactivate, usersLib.reactivateAdminUser],
  ] as const;

  it.each(cases)('%s: relays the reason; blank → 400 before the lib; 22023 → 400 through', async (_name, handler, lib) => {
    const ok = await handler(post({ reason: 'Terms breach' }), params(USER_ID));
    expect(ok.status).toBe(200);
    expect(lib).toHaveBeenCalledWith(supabaseStub, USER_ID, 'Terms breach');
    telemetryNeverCarriesReason();

    lib.mockClear();
    const blank = await handler(post({ reason: '' }), params(USER_ID));
    expect(blank.status).toBe(400);
    expect(lib).not.toHaveBeenCalled();

    lib.mockRejectedValueOnce(new AdminUsersError('22023', 'Reason required'));
    const refused = await handler(post({ reason: 'x' }), params(USER_ID));
    expect(refused.status).toBe(400);
    expect(await json(refused)).toEqual({ error: 'Reason required' });
  });
});

const json = (r: Response) => r.json();

describe('the two bulk routes — one reason for the batch', () => {
  it.each([
    ['suspend', bulkSuspend, 'suspend'],
    ['reactivate', bulkReactivate, 'reactivate'],
  ] as const)('%s: relays the reason to bulkAdminUserAction; missing → 400', async (_n, handler, action) => {
    const ok = await handler(post({ user_ids: [USER_ID, USER_ID_2], reason: 'Batch hold' }));
    expect(ok.status).toBe(200);
    expect(usersLib.bulkAdminUserAction).toHaveBeenCalledWith(supabaseStub, action, [USER_ID, USER_ID_2], 'Batch hold');
    telemetryNeverCarriesReason();

    usersLib.bulkAdminUserAction.mockClear();
    const missing = await handler(post({ user_ids: [USER_ID] }));
    expect(missing.status).toBe(400);
    expect(usersLib.bulkAdminUserAction).not.toHaveBeenCalled();
  });
});

describe("the Steward's rest/wake routes — an optional note", () => {
  it('rest: passes the note when given; omits it when the body is absent or blank', async () => {
    const withNote = await stewardRest(post({ note: 'Summer break' }), params(GROUP_ID));
    expect(withNote.status).toBe(200);
    expect(groupQueries.restGroup).toHaveBeenCalledWith(supabaseStub, GROUP_ID, 'Summer break');
    telemetryNeverCarriesReason();

    groupQueries.restGroup.mockClear();
    const noBody = await stewardRest(post(), params(GROUP_ID));
    expect(noBody.status).toBe(200);
    expect(groupQueries.restGroup).toHaveBeenCalledWith(supabaseStub, GROUP_ID, undefined);

    groupQueries.restGroup.mockClear();
    const blank = await stewardRest(post({ note: '  ' }), params(GROUP_ID));
    expect(blank.status).toBe(200);
    expect(groupQueries.restGroup).toHaveBeenCalledWith(supabaseStub, GROUP_ID, undefined);
  });

  it('wake: the same shape', async () => {
    await stewardWake(post({ note: 'Back' }), params(GROUP_ID));
    expect(groupQueries.wakeGroup).toHaveBeenCalledWith(supabaseStub, GROUP_ID, 'Back');
    await stewardWake(post(), params(GROUP_ID));
    expect(groupQueries.wakeGroup).toHaveBeenLastCalledWith(supabaseStub, GROUP_ID, undefined);
  });
});
