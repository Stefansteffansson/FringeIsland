import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink, resetTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H019 (unit) — the Journeys BFF routes (Cycle J-A):
 * GET /api/journeys (catalogue), GET /api/journeys/[id] (detail),
 * GET /api/me/journeys (my enrolments),
 * POST /api/journeys/[id]/enroll (body { group_id? } — absent = self),
 * POST /api/journeys/[id]/withdraw (body { enrollment_id }).
 *
 * Private BFF per ADR-U038 — the FEAT-PD002 contracts self-gate; these routes
 * only map session → 401, validate body shape (400), and map SQLSTATE → HTTP
 * (42501 → 403, P0002 → 404 — unpublished/absent indistinguishable,
 * P0001 → 409 with the refusal's message passed through, else 500
 * content-free). Reads ride Edge + getVerifiedUserId; mutations ride Node +
 * getUser (route-policy conformance walks the files). Telemetry id-only —
 * journey/group ids, never titles (STORY-7).
 *
 * Red-first: fails until the route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
const fetchJourneyCatalog = jest.fn<() => Promise<unknown[]>>();
const fetchJourneyDetail = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const fetchMyEnrollments = jest.fn<() => Promise<unknown[]>>();
const enrollSelfInJourney = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const enrollGroupInJourney = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const withdrawFromJourney = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const pauseJourneyEnrollment = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const resumeJourneyEnrollment = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const emitDurableTelemetry = jest.fn<(...a: unknown[]) => Promise<unknown>>();

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
jest.mock('@/lib/observability/telemetry-server', () => ({
  // The real durable leg mirrors first, then records (ADR-U052 §2) — the mock
  // keeps the mirror (so the sink assertions hold) and captures the durable call.
  emitDurableTelemetry: (c: unknown, name: string, props?: Record<string, unknown>) => {
    (jest.requireActual('@/lib/observability/telemetry') as {
      emitTelemetry: (n: string, p?: Record<string, unknown>) => void;
    }).emitTelemetry(name, props);
    return (emitDurableTelemetry as unknown as (...x: unknown[]) => unknown)(c, name, props);
  },
}));
jest.mock('@/lib/journeys/queries', () => ({
  fetchJourneyCatalog: (...a: unknown[]) =>
    (fetchJourneyCatalog as unknown as (...x: unknown[]) => unknown)(...a),
  fetchJourneyDetail: (...a: unknown[]) =>
    (fetchJourneyDetail as unknown as (...x: unknown[]) => unknown)(...a),
  fetchMyEnrollments: (...a: unknown[]) =>
    (fetchMyEnrollments as unknown as (...x: unknown[]) => unknown)(...a),
  enrollSelfInJourney: (...a: unknown[]) =>
    (enrollSelfInJourney as unknown as (...x: unknown[]) => unknown)(...a),
  enrollGroupInJourney: (...a: unknown[]) =>
    (enrollGroupInJourney as unknown as (...x: unknown[]) => unknown)(...a),
  withdrawFromJourney: (...a: unknown[]) =>
    (withdrawFromJourney as unknown as (...x: unknown[]) => unknown)(...a),
  pauseJourneyEnrollment: (...a: unknown[]) =>
    (pauseJourneyEnrollment as unknown as (...x: unknown[]) => unknown)(...a),
  resumeJourneyEnrollment: (...a: unknown[]) =>
    (resumeJourneyEnrollment as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET as CATALOG } from '@/app/api/journeys/route';
import { GET as DETAIL } from '@/app/api/journeys/[id]/route';
import { GET as MY_JOURNEYS } from '@/app/api/me/journeys/route';
import { POST as ENROLL } from '@/app/api/journeys/[id]/enroll/route';
import { POST as WITHDRAW } from '@/app/api/journeys/[id]/withdraw/route';
import { POST as PAUSE } from '@/app/api/journeys/[id]/pause/route';
import { POST as RESUME } from '@/app/api/journeys/[id]/resume/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };

const J1 = 'journey-1';
const sqlErr = (code: string, message = 'refused') => Object.assign(new Error(message), { code });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request;

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

beforeEach(() => {
  jest.clearAllMocks();
  resetTelemetrySink();
  getUser.mockResolvedValue({ data: { user: { id: 'fim-1' } } });
  getVerifiedUserId.mockResolvedValue('fim-1');
});

describe('GET /api/journeys — the catalogue read', () => {
  it('401s a sessionless caller', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await CATALOG()) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('returns { journeys } and emits journey.catalog_loaded', async () => {
    fetchJourneyCatalog.mockResolvedValue([{ id: J1, title: 'T' }]);
    const res = (await CATALOG()) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.journeys).toEqual([{ id: J1, title: 'T' }]);
    expect(emitted('journey.catalog_loaded', 'fim-1')).toBe(true);
  });

  it('500s content-free on an unexpected failure and emits the failure variant', async () => {
    fetchJourneyCatalog.mockRejectedValue(sqlErr('XX000'));
    const res = (await CATALOG()) as unknown as RouteResponse;
    expect(res.status).toBe(500);
    expect(emitted('journey.catalog_failed', 'fim-1')).toBe(true);
  });
});

describe('GET /api/journeys/[id] — the detail read', () => {
  it('401s a sessionless caller', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await DETAIL({} as Request, params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('returns { journey } and emits journey.detail_loaded', async () => {
    fetchJourneyDetail.mockResolvedValue({ id: J1, enrollable_groups: [] });
    const res = (await DETAIL({} as Request, params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.journey).toEqual({ id: J1, enrollable_groups: [] });
    expect(fetchJourneyDetail).toHaveBeenCalledWith(expect.anything(), J1);
    expect(emitted('journey.detail_loaded', 'fim-1')).toBe(true);
  });

  it('maps P0002 to 404 (unpublished and absent indistinguishable)', async () => {
    fetchJourneyDetail.mockRejectedValue(sqlErr('P0002'));
    const res = (await DETAIL({} as Request, params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
    expect(emitted('journey.detail_missing', 'fim-1')).toBe(true);
  });
});

describe('GET /api/me/journeys — my enrolments', () => {
  it('401s a sessionless caller', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await MY_JOURNEYS()) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('returns { enrollments } and emits journey.my_enrollments_loaded', async () => {
    fetchMyEnrollments.mockResolvedValue([{ enrollment_id: 'e1', kind: 'individual' }]);
    const res = (await MY_JOURNEYS()) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.enrollments).toEqual([{ enrollment_id: 'e1', kind: 'individual' }]);
    expect(emitted('journey.my_enrollments_loaded', 'fim-1')).toBe(true);
  });

  it('maps 42501 (no session actor) to 403 — and names the ghost with a code (TASK-MIST-01)', async () => {
    fetchMyEnrollments.mockRejectedValue(sqlErr('42501'));
    const res = (await MY_JOURNEYS()) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    // Red at head: the body carried `error` only. A 42501 on an own-enrolments
    // read means the JWT's actor cannot be resolved — a Mist erased server-side
    // while the browser kept its session — and the Mist page must be able to
    // tell that from a transient.
    expect(res.body.code).toBe('no_resolvable_actor');
  });
});

describe('POST /api/journeys/[id]/enroll — self and group', () => {
  it('401s without a server-verified user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await ENROLL(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('no group_id → self-enrol contract, emits journey.enrolled_self', async () => {
    enrollSelfInJourney.mockResolvedValue({ enrollment_id: 'e1', journey_id: J1 });
    const res = (await ENROLL(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(enrollSelfInJourney).toHaveBeenCalledWith(expect.anything(), J1);
    expect(enrollGroupInJourney).not.toHaveBeenCalled();
    expect(emitted('journey.enrolled_self', 'fim-1')).toBe(true);
  });

  it('group_id present → group-enrol contract, emits journey.enrolled_group', async () => {
    enrollGroupInJourney.mockResolvedValue({ enrollment_id: 'e2', journey_id: J1 });
    const res = (await ENROLL(jsonRequest({ group_id: 'g1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(enrollGroupInJourney).toHaveBeenCalledWith(expect.anything(), 'g1', J1);
    expect(enrollSelfInJourney).not.toHaveBeenCalled();
    expect(emitted('journey.enrolled_group', 'fim-1')).toBe(true);
  });

  it('maps 42501 → 403, P0002 → 404, P0001 → 409 with the refusal message through', async () => {
    enrollSelfInJourney.mockRejectedValue(sqlErr('42501'));
    let res = (await ENROLL(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    expect(emitted('journey.enroll_refused', 'fim-1')).toBe(true);

    enrollSelfInJourney.mockRejectedValue(sqlErr('P0002'));
    res = (await ENROLL(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);

    enrollSelfInJourney.mockRejectedValue(sqlErr('P0001', 'already enrolled in this journey'));
    res = (await ENROLL(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('already enrolled in this journey');
  });
});

describe('POST /api/journeys/[id]/withdraw', () => {
  it('401s without a server-verified user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await WITHDRAW(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('400s a body without enrollment_id (presentation-side shape check only)', async () => {
    const res = (await WITHDRAW(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(400);
    expect(withdrawFromJourney).not.toHaveBeenCalled();
  });

  it('withdraws and emits journey.withdrawn', async () => {
    withdrawFromJourney.mockResolvedValue({ enrollment_id: 'e1', withdrawn: true });
    const res = (await WITHDRAW(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(withdrawFromJourney).toHaveBeenCalledWith(expect.anything(), 'e1');
    expect(emitted('journey.withdrawn', 'fim-1')).toBe(true);
  });

  it('maps the frozen refusal P0001 → 409 with the message through', async () => {
    withdrawFromJourney.mockRejectedValue(sqlErr('P0001', 'enrollment is frozen'));
    const res = (await WITHDRAW(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('enrollment is frozen');
    expect(emitted('journey.withdraw_conflict', 'fim-1')).toBe(true);
  });

  it('maps P0002 → 404 (invisible and absent indistinguishable)', async () => {
    withdrawFromJourney.mockRejectedValue(sqlErr('P0002'));
    const res = (await WITHDRAW(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
  });
});

describe('POST /api/journeys/[id]/pause + /resume — FEAT-H019 STORY-8 (TASK-JRN-PAUSE-01)', () => {
  const PAUSED = { enrollment_id: 'e1', journey_id: J1, status: 'paused' };
  const ACTIVE = { enrollment_id: 'e1', journey_id: J1, status: 'active' };

  it('401s without a session — no contract call, the unauthenticated event only', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const p = (await PAUSE(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    const r = (await RESUME(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(p.status).toBe(401);
    expect(r.status).toBe(401);
    expect(pauseJourneyEnrollment).not.toHaveBeenCalled();
    expect(resumeJourneyEnrollment).not.toHaveBeenCalled();
    expect(emitted('journey.pause_unauthenticated')).toBe(true);
    expect(emitted('journey.resume_unauthenticated')).toBe(true);
  });

  it('400s a missing enrollment_id (presentation-only shape check)', async () => {
    const p = (await PAUSE(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    const r = (await RESUME(jsonRequest({}), params(J1))) as unknown as RouteResponse;
    expect(p.status).toBe(400);
    expect(r.status).toBe(400);
    expect(pauseJourneyEnrollment).not.toHaveBeenCalled();
    expect(resumeJourneyEnrollment).not.toHaveBeenCalled();
  });

  it('pauses: relays the contract reply; journey.paused mirrors AND lands durably (a mutation — Q2), ids only', async () => {
    pauseJourneyEnrollment.mockResolvedValue(PAUSED);
    const res = (await PAUSE(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body).toEqual(PAUSED);
    expect(pauseJourneyEnrollment).toHaveBeenCalledWith(expect.anything(), 'e1');
    expect(emitted('journey.paused', 'fim-1')).toBe(true);
    expect(emitDurableTelemetry).toHaveBeenCalledWith(
      expect.anything(),
      'journey.paused',
      expect.objectContaining({ actor: 'fim-1', journey: J1, enrollment: 'e1' }),
    );
  });

  it('resumes: relays the contract reply; journey.resumed mirrors AND lands durably', async () => {
    resumeJourneyEnrollment.mockResolvedValue(ACTIVE);
    const res = (await RESUME(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body).toEqual(ACTIVE);
    expect(resumeJourneyEnrollment).toHaveBeenCalledWith(expect.anything(), 'e1');
    expect(emitted('journey.resumed', 'fim-1')).toBe(true);
    expect(emitDurableTelemetry).toHaveBeenCalledWith(
      expect.anything(),
      'journey.resumed',
      expect.objectContaining({ actor: 'fim-1', journey: J1, enrollment: 'e1' }),
    );
  });

  it('maps P0001 -> 409 with the contract message through (the state named)', async () => {
    pauseJourneyEnrollment.mockRejectedValue(sqlErr('P0001', 'enrollment is frozen'));
    const p = (await PAUSE(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(p.status).toBe(409);
    expect(p.body.error).toBe('enrollment is frozen');
    expect(emitted('journey.pause_conflict', 'fim-1')).toBe(true);
    resumeJourneyEnrollment.mockRejectedValue(sqlErr('P0001', 'enrollment is not paused'));
    const r = (await RESUME(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('enrollment is not paused');
    expect(emitted('journey.resume_conflict', 'fim-1')).toBe(true);
    expect(emitDurableTelemetry).not.toHaveBeenCalled();
  });

  it('maps 42501 -> 403 and P0002 -> 404 content-free, anything else -> 500 content-free', async () => {
    pauseJourneyEnrollment.mockRejectedValue(sqlErr('42501', 'only the traveller may pause their own walk'));
    let res = (await PAUSE(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    expect(res.body.error).not.toContain('traveller');
    expect(emitted('journey.pause_refused', 'fim-1')).toBe(true);

    resumeJourneyEnrollment.mockRejectedValue(sqlErr('P0002', 'enrollment not found'));
    res = (await RESUME(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
    expect(emitted('journey.resume_missing', 'fim-1')).toBe(true);

    pauseJourneyEnrollment.mockRejectedValue(sqlErr('XX000', 'boom'));
    res = (await PAUSE(jsonRequest({ enrollment_id: 'e1' }), params(J1))) as unknown as RouteResponse;
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('boom');
    expect(emitted('journey.pause_failed', 'fim-1')).toBe(true);
  });
});
