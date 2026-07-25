import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * ADR-U042 (unit) — GET /api/me/overview, the first-paint bootstrap bundle.
 *
 * One Edge invocation, one ADR-U037 identity verification, five concurrent
 * substrate reads — the SAME lib query functions the standalone routes call
 * (slice equivalence by construction, asserted here). Per-slice envelopes:
 * one failed slice never fails the paint (HTTP 200 with `{ error }` in that
 * slice, the standalone route's message preserved); failures are logged
 * content-free (observability §7). The route aggregates — it never decides
 * (ADR-U042 guardrail 1).
 *
 * Red-first: fails until the route module exists.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchMyProfile = jest.fn<() => Promise<unknown>>();
const fetchOwnAccountState = jest.fn<() => Promise<unknown>>();
const fetchMemberGroups = jest.fn<() => Promise<unknown>>();
const fetchMyInvitations = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers ?? {},
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser, getClaims } }),
}));
jest.mock('@/lib/profile/queries', () => ({
  fetchMyProfile: (...a: unknown[]) =>
    (fetchMyProfile as unknown as (...x: unknown[]) => unknown)(...a),
}));
jest.mock('@/lib/account/queries', () => ({
  fetchOwnAccountState: (...a: unknown[]) =>
    (fetchOwnAccountState as unknown as (...x: unknown[]) => unknown)(...a),
}));
jest.mock('@/lib/groups/queries', () => ({
  fetchMemberGroups: (...a: unknown[]) =>
    (fetchMemberGroups as unknown as (...x: unknown[]) => unknown)(...a),
}));
jest.mock('@/lib/groups/invitations', () => ({
  fetchMyInvitations: (...a: unknown[]) =>
    (fetchMyInvitations as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET } from '@/app/api/me/overview/route';

type RouteResult = {
  status: number;
  body: Record<string, { data?: unknown; error?: string }>;
  headers: Record<string, string>;
};

const PROFILE = { full_name: 'Ada Lovelace', nickname: 'Ada', display_preference: 'nickname' };
const STATE = { state: 'active' };
const GROUPS = [{ id: 'g1', name: 'Dev Test Cohort', is_public: false, member_count: 1 }];
const INVITATIONS = [{ group_id: 'g2', group_name: 'Nya gruppen' }];

const authed = () =>
  getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });

beforeEach(() => {
  getUser.mockReset();
  getClaims.mockReset();
  fetchMyProfile.mockReset().mockResolvedValue(PROFILE);
  fetchOwnAccountState.mockReset().mockResolvedValue(STATE);
  fetchMemberGroups.mockReset().mockResolvedValue(GROUPS);
  fetchMyInvitations.mockReset().mockResolvedValue(INVITATIONS);
});

describe('ADR-U042 (unit) — GET /api/me/overview', () => {
  it('401s a sessionless caller before any substrate read', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET()) as unknown as RouteResult;
    expect(res.status).toBe(401);
    expect(fetchMemberGroups).not.toHaveBeenCalled();
    expect(fetchMyProfile).not.toHaveBeenCalled();
  });

  it('returns all five slices payload-equivalent to the standalone reads (guardrail 1)', async () => {
    authed();
    const res = (await GET()) as unknown as RouteResult;
    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({ data: PROFILE });
    expect(res.body.account_state).toEqual({ data: STATE });
    expect(res.body.groups).toEqual({ data: GROUPS });
    expect(res.body.invitations).toEqual({ data: INVITATIONS });

    // N-C parity (FEAT-H032 STORY-4): the bundle must serve EXACTLY the slices
    // that have consumers — an orphan in either direction is the defect this
    // assertion exists to catch. `nominations` was served with no consumer from
    // the moment N-B deleted PendingNominations until N-C removed it, costing a
    // discarded substrate read on every /groups first paint. Exact-set equality
    // rather than a contains-check, so a future slice cannot be added without a
    // consumer, nor a consumer left without its slice.
    expect(Object.keys(res.body).sort()).toEqual(
      ['account_state', 'groups', 'invitations', 'onboarding', 'profile'].sort(),
    );
    // Each substrate read called exactly once — aggregation, no decisions.
    for (const f of [
      fetchMyProfile,
      fetchOwnAccountState,
      fetchMemberGroups,
      fetchMyInvitations,
    ]) {
      expect(f).toHaveBeenCalledTimes(1);
    }
  });

  it('carries the P1-residual timing breakdown in x-overview-timing — durations only, content-free', async () => {
    authed();
    const res = (await GET()) as unknown as RouteResult;
    expect(res.status).toBe(200);
    const raw = res.headers['x-overview-timing'];
    expect(typeof raw).toBe('string');
    const timing = JSON.parse(raw) as Record<string, number>;
    // invocation index + auth + all five slices + total — names and
    // millisecond numbers only (never payload content).
    for (const key of ['n', 'auth', 'profile', 'account_state', 'groups', 'invitations', 'onboarding', 'total']) {
      expect(typeof timing[key]).toBe('number');
    }
    // N-C parity: the timings must not carry a slice the bundle no longer
    // serves. `nominations` was removed with its consumer (FEAT-H032 STORY-4).
    expect(timing.nominations).toBeUndefined();
    expect(Object.values(timing).every((v) => typeof v === 'number')).toBe(true);
  });

  it('isolates a failed slice — the paint proceeds with the standalone message (guardrail 2)', async () => {
    authed();
    fetchMemberGroups.mockRejectedValue(new Error('boom'));
    const res = (await GET()) as unknown as RouteResult;
    expect(res.status).toBe(200);
    expect(res.body.groups).toEqual({ error: 'Failed to load groups' });
    expect(res.body.profile).toEqual({ data: PROFILE });
    expect(res.body.invitations).toEqual({ data: INVITATIONS });
    // The failure is an event, never silently swallowed (observability §7).
    const failed = getTelemetrySink().filter((e) => e.name === 'overview.slice_failed');
    expect(failed.some((e) => e.props?.slice === 'groups')).toBe(true);
  });

  it('maps the standalone null-cases into slice errors (profile / account state)', async () => {
    authed();
    fetchMyProfile.mockResolvedValue(null);
    fetchOwnAccountState.mockResolvedValue(null);
    const res = (await GET()) as unknown as RouteResult;
    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({ error: 'Profile not found' });
    expect(res.body.account_state).toEqual({ error: 'No account state' });
    expect(res.body.groups).toEqual({ data: GROUPS });
  });

  it('preserves the invitations 42501 mapping in the slice envelope', async () => {
    authed();
    fetchMyInvitations.mockRejectedValue(Object.assign(new Error('denied'), { code: '42501' }));
    const res = (await GET()) as unknown as RouteResult;
    expect(res.status).toBe(200);
    expect(res.body.invitations).toEqual({ error: 'Invitations are for members' });
  });
});
