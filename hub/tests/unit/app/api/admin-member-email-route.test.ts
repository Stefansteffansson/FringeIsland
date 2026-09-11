/**
 * @jest-environment node
 *
 * FEAT-H050 STORY-4/5 (ADR-U054, TASK-EML-02) — the rectification BFF route.
 *
 * The route is presentation-only (ADR-U038): it authenticates, refuses a blank
 * reason up front as defense-in-depth, relays the three arguments, maps the
 * contract's typed refusals onto HTTP, and emits telemetry that never carries
 * the reason. Every rule is the contract's.
 *
 * WRITTEN RED-FIRST: `app/api/admin/users/[id]/email/route.ts` does not exist
 * at head — the import fails and every cell with it.
 */
const getUser = jest.fn();
const supabaseStub = { auth: { getUser } };
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => supabaseStub),
}));

const usersLib = { updateAdminUserEmail: jest.fn() };
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

const emitDurableTelemetry = jest.fn();
const emitTelemetry = jest.fn();
jest.mock('@/lib/observability/telemetry-server', () => ({
  emitDurableTelemetry: (...args: unknown[]) => emitDurableTelemetry(...args),
}));
jest.mock('@/lib/observability/telemetry', () => ({
  emitTelemetry: (...args: unknown[]) => emitTelemetry(...args),
}));

import { AdminUsersError } from '@/lib/admin/users';
import { POST as rectify } from '@/app/api/admin/users/[id]/email/route';

const USER_ID = 'ee222222-2222-4222-8222-222222222222';
const ACTOR = 'ad000000-0000-4000-8000-00000000000a';
const REASON = 'Member lost access to the old mailbox';

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body?: unknown) =>
  new Request('http://localhost/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const PAYLOAD = {
  success: true,
  previous_email: 'old@example.com',
  new_email: 'new@example.com',
  sessions_revoked: 2,
  invitations_deleted: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: ACTOR } } });
  usersLib.updateAdminUserEmail.mockResolvedValue(PAYLOAD);
});

describe('POST /api/admin/users/[id]/email — FEAT-H050', () => {
  it('401s an unauthenticated caller without touching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    expect(res.status).toBe(401);
    expect(usersLib.updateAdminUserEmail).not.toHaveBeenCalled();
  });

  it('relays the address and reason verbatim and returns the contract payload', async () => {
    const res = await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(PAYLOAD);
    expect(usersLib.updateAdminUserEmail).toHaveBeenCalledWith(
      supabaseStub,
      USER_ID,
      'new@example.com',
      REASON,
    );
  });

  it.each([[undefined], [{ email: 'new@example.com' }], [{ email: 'new@example.com', reason: '   ' }]])(
    'refuses a missing or blank reason with 400 and never calls the contract (%#)',
    async (body) => {
      const res = await rectify(post(body), params(USER_ID));
      expect(res.status).toBe(400);
      expect(usersLib.updateAdminUserEmail).not.toHaveBeenCalled();
    },
  );

  it('refuses a missing address with 400 and never calls the contract', async () => {
    const res = await rectify(post({ reason: REASON }), params(USER_ID));
    expect(res.status).toBe(400);
    expect(usersLib.updateAdminUserEmail).not.toHaveBeenCalled();
  });

  it.each([
    ['42501', 404, 'Not found'],
    ['P0002', 404, 'Not found'],
  ])('maps %s to %i with an existence-hiding message', async (code, status, message) => {
    usersLib.updateAdminUserEmail.mockRejectedValue(new AdminUsersError(code, 'internal detail'));
    const res = await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    expect(res.status).toBe(status);
    await expect(res.json()).resolves.toEqual({ error: message });
  });

  it('maps P0001 to 409 and passes the contract message through', async () => {
    usersLib.updateAdminUserEmail.mockRejectedValue(
      new AdminUsersError('P0001', 'That email address is already in use'),
    );
    const res = await rectify(post({ email: 'taken@example.com', reason: REASON }), params(USER_ID));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: 'That email address is already in use' });
  });

  it('maps 22023 to 400 and passes the contract message through', async () => {
    usersLib.updateAdminUserEmail.mockRejectedValue(
      new AdminUsersError('22023', 'A valid email address is required'),
    );
    const res = await rectify(post({ email: 'bad', reason: REASON }), params(USER_ID));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'A valid email address is required' });
  });

  it('500s an unmapped failure without leaking its message', async () => {
    usersLib.updateAdminUserEmail.mockRejectedValue(new Error('connection reset by peer'));
    const res = await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).not.toMatch(/connection reset/);
  });

  it('emits durable telemetry for the mutation, with ids only', async () => {
    await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    expect(emitDurableTelemetry).toHaveBeenCalled();
    const call = emitDurableTelemetry.mock.calls[0];
    expect(JSON.stringify(call)).toContain(ACTOR);
    expect(JSON.stringify(call)).toContain(USER_ID);
  });

  it('NEVER puts the reason or either address into telemetry', async () => {
    await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    usersLib.updateAdminUserEmail.mockRejectedValue(new AdminUsersError('P0001', 'taken'));
    await rectify(post({ email: 'new@example.com', reason: REASON }), params(USER_ID));
    const all = [...emitTelemetry.mock.calls, ...emitDurableTelemetry.mock.calls];
    for (const call of all) {
      const s = JSON.stringify(call);
      expect(s).not.toContain(REASON);
      expect(s).not.toContain('new@example.com');
    }
  });
});
