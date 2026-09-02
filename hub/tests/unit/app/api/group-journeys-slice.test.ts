import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink, resetTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H019 STORY-6 (unit) — the GRP-4 enrolment-summary slice on
 * GET /api/groups/[id].
 *
 * The group read stays canonical and untouched in behaviour; the FEAT-PD002
 * `get_group_enrollment_summary` read composes ALONGSIDE it as an ADR-U042
 * failure-isolated slice: `{ group, enrollments: {data}|{error} }`. A failed
 * summary slice never fails the group response (logged content-free, never
 * swallowed); a refused group stays the house 404 regardless of the slice
 * (no new leak). Red-first for TASK-JA-08.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
const fetchGroupDetail = jest.fn<() => Promise<unknown>>();
const fetchGroupEnrollmentSummary = jest.fn<() => Promise<unknown>>();

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
  fetchGroupDetail: (...a: unknown[]) =>
    (fetchGroupDetail as unknown as (...x: unknown[]) => unknown)(...a),
  updateGroupSettings: jest.fn(),
}));
jest.mock('@/lib/groups/leadership', () => ({
  deleteGroup: jest.fn(),
}));
jest.mock('@/lib/journeys/queries', () => ({
  fetchGroupEnrollmentSummary: (...a: unknown[]) =>
    (fetchGroupEnrollmentSummary as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET } from '@/app/api/groups/[id]/route';

type RouteResponse = {
  status: number;
  body: {
    error?: string;
    group?: unknown;
    enrollments?: { data?: unknown; error?: string };
  };
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const sqlErr = (code: string, message = 'refused') => Object.assign(new Error(message), { code });
const GROUP = { id: 'grp-1', name: 'Book Circle' };
const SUMMARY = { count: 1, enrollments: [{ journey_id: 'j1', title: 'T', status: 'active' }] };

beforeEach(() => {
  jest.clearAllMocks();
  resetTelemetrySink();
  getVerifiedUserId.mockResolvedValue('fim-1');
  fetchGroupDetail.mockResolvedValue(GROUP);
  fetchGroupEnrollmentSummary.mockResolvedValue(SUMMARY);
});

describe('FEAT-H019 STORY-6 — the enrolment-summary slice on GET /api/groups/[id]', () => {
  it('composes the summary as a data slice beside the canonical group read', async () => {
    const res = (await GET({} as Request, params('grp-1'))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.group).toEqual(GROUP);
    expect(res.body.enrollments).toEqual({ data: SUMMARY });
  });

  it('a failed summary slice never breaks the group response — error envelope + content-free telemetry', async () => {
    fetchGroupEnrollmentSummary.mockRejectedValue(sqlErr('XX000', 'boom'));
    const res = (await GET({} as Request, params('grp-1'))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.group).toEqual(GROUP);
    expect(res.body.enrollments?.data).toBeUndefined();
    expect(typeof res.body.enrollments?.error).toBe('string');
    expect(
      getTelemetrySink().some((e) => e.name === 'groups.enrollment_slice_failed'),
    ).toBe(true);
  });

  it('a P0002 summary refusal rides the same error envelope (never a wider window than the group)', async () => {
    fetchGroupEnrollmentSummary.mockRejectedValue(sqlErr('P0002', 'group not found'));
    const res = (await GET({} as Request, params('grp-1'))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(typeof res.body.enrollments?.error).toBe('string');
  });

  it('a refused group stays the house 404 regardless of the slice (no new leak)', async () => {
    fetchGroupDetail.mockRejectedValue(sqlErr('P0002'));
    const res = (await GET({} as Request, params('grp-1'))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
    expect(res.body.enrollments).toBeUndefined();
  });
});
