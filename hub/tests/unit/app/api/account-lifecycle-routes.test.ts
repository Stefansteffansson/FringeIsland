import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-PC017 + FEAT-PC005 (unit) — the three lifecycle BFF routes
 * (POST /api/account/pause | delete | reactivate). Each authenticates with
 * `getUser()` (mutating verb, ADR-U037), delegates to the SECURITY DEFINER
 * contract lib, maps a substrate refusal (P0001) to 409 carrying the
 * contract's message, other failures to 500 (surfaced, never swallowed), and
 * emits V4 telemetry on success AND failure.
 *
 * COVERAGE LABELLED TEST-AFTER (C-F): the routes are thin proxies written
 * after the substrate's demonstrated-red integration suite. Not claimed as
 * red-first TDD.
 */
const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

const pauseOwnAccount = jest.fn<() => Promise<unknown>>();
const deleteOwnAccount = jest.fn<() => Promise<unknown>>();
const reactivateOwnAccount = jest.fn<() => Promise<unknown>>();
jest.mock('@/lib/account/lifecycle', () => ({
  pauseOwnAccount: () => pauseOwnAccount(),
  deleteOwnAccount: () => deleteOwnAccount(),
  reactivateOwnAccount: () => reactivateOwnAccount(),
}));

import { POST as pausePOST } from '@/app/api/account/pause/route';
import { POST as deletePOST } from '@/app/api/account/delete/route';
import { POST as reactivatePOST } from '@/app/api/account/reactivate/route';

type Res = { status: number; body: { error?: string } };

const p0001 = (message: string) => Object.assign(new Error(message), { code: 'P0001' });

const emitted = (name: string) => getTelemetrySink().some((e) => e.name === name);

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  pauseOwnAccount.mockReset().mockResolvedValue({ state: 'paused', idempotent: false });
  deleteOwnAccount
    .mockReset()
    .mockResolvedValue({ success: true, groups_exited: 1, decommissioned: true });
  reactivateOwnAccount.mockReset().mockResolvedValue({ state: 'active', idempotent: false });
});

describe.each([
  ['pause', () => pausePOST() as Promise<Res>, pauseOwnAccount, 'account.pause'],
  ['delete', () => deletePOST() as Promise<Res>, deleteOwnAccount, 'account.delete'],
  ['reactivate', () => reactivatePOST() as Promise<Res>, reactivateOwnAccount, 'account.reactivate'],
] as const)('POST /api/account/%s', (name, call, contract, telemetryName) => {
  it('returns 401 for a sessionless caller before the contract is reached', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call();
    expect(res.status).toBe(401);
    expect(contract).not.toHaveBeenCalled();
    expect(emitted(`${telemetryName}_unauthenticated`)).toBe(true);
  });

  it('delegates to the contract on success and emits telemetry', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(contract).toHaveBeenCalledTimes(1);
    expect(emitted(telemetryName)).toBe(true);
  });

  it("maps a substrate refusal (P0001) to 409 carrying the contract's message", async () => {
    contract.mockRejectedValue(p0001('this account is under an admin hold — contact an admin'));
    const res = await call();
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('admin hold');
    expect(emitted(`${telemetryName}_refused`)).toBe(true);
  });

  it('maps any other failure to 500, surfaced and telemetered — never swallowed', async () => {
    contract.mockRejectedValue(new Error('connection lost'));
    const res = await call();
    expect(res.status).toBe(500);
    expect(emitted(`${telemetryName}_failed`)).toBe(true);
  });
});
