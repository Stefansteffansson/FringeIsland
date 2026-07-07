import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H020 (unit) — the player BFF routes (Cycle J-B):
 * GET  /api/journeys/enrollments/[enrollmentId]/player (boot → get_player_state),
 * POST /api/journeys/enrollments/[enrollmentId]/steps/[stepId]/enter (auto-save
 *      → enter_journey_step),
 * POST /api/journeys/enrollments/[enrollmentId]/steps/[stepId]/complete
 *      (completion + gating → complete_journey_step).
 *
 * Private BFF per ADR-U038 — the FEAT-PD003 contracts self-gate (traveller
 * standing, active-enrolment, JRN-8 gating); these routes only map session →
 * 401 and SQLSTATE → HTTP (42501 → 403, P0002 → 404 — non-traveller/absent
 * indistinguishable, P0001 → 409 with the refusal's message through, else 500
 * content-free). The boot read rides Edge + getVerifiedUserId; the mutations
 * ride Node + getUser (route-policy conformance walks the files). Telemetry
 * id-only — enrolment/step ids, never titles.
 *
 * Red-first: fails until the route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const getVerifiedUserId = jest.fn<() => Promise<string | null>>();
const fetchPlayerState = jest.fn<() => Promise<unknown>>();
const enterJourneyStep = jest.fn<() => Promise<unknown>>();
const completeJourneyStep = jest.fn<() => Promise<unknown>>();

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
jest.mock('@/lib/journeys/queries', () => ({
  fetchPlayerState: (...a: unknown[]) =>
    (fetchPlayerState as unknown as (...x: unknown[]) => unknown)(...a),
  enterJourneyStep: (...a: unknown[]) =>
    (enterJourneyStep as unknown as (...x: unknown[]) => unknown)(...a),
  completeJourneyStep: (...a: unknown[]) =>
    (completeJourneyStep as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET as PLAYER } from '@/app/api/journeys/enrollments/[enrollmentId]/player/route';
import { POST as ENTER } from '@/app/api/journeys/enrollments/[enrollmentId]/steps/[stepId]/enter/route';
import { POST as COMPLETE } from '@/app/api/journeys/enrollments/[enrollmentId]/steps/[stepId]/complete/route';

type RouteResponse = { status: number; body: { error?: string } & Record<string, unknown> };

const E1 = 'enrollment-1';
const S1 = 'step-1';
const sqlErr = (code: string, message = 'refused') => Object.assign(new Error(message), { code });
const playerParams = (enrollmentId: string) => ({ params: Promise.resolve({ enrollmentId }) });
const stepParams = (enrollmentId: string, stepId: string) => ({
  params: Promise.resolve({ enrollmentId, stepId }),
});

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

beforeEach(() => {
  jest.clearAllMocks();
  getTelemetrySink().length = 0;
  getUser.mockResolvedValue({ data: { user: { id: 'fim-1' } } });
  getVerifiedUserId.mockResolvedValue('fim-1');
});

describe('GET .../player — the player boot read', () => {
  it('401s a sessionless caller', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = (await PLAYER({} as Request, playerParams(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('returns { player } from get_player_state and emits player.state_loaded', async () => {
    fetchPlayerState.mockResolvedValue({ enrollment_id: E1, steps: [], instances: [] });
    const res = (await PLAYER({} as Request, playerParams(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body.player).toEqual({ enrollment_id: E1, steps: [], instances: [] });
    expect(fetchPlayerState).toHaveBeenCalledWith(expect.anything(), E1);
    expect(emitted('player.state_loaded', 'fim-1')).toBe(true);
  });

  it('maps P0002 → 404 (non-traveller and absent indistinguishable)', async () => {
    fetchPlayerState.mockRejectedValue(sqlErr('P0002'));
    const res = (await PLAYER({} as Request, playerParams(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
    expect(emitted('player.state_missing', 'fim-1')).toBe(true);
  });

  it('maps 42501 (no session actor) → 403', async () => {
    fetchPlayerState.mockRejectedValue(sqlErr('42501'));
    const res = (await PLAYER({} as Request, playerParams(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    expect(emitted('player.state_refused', 'fim-1')).toBe(true);
  });

  it('500s content-free on an unexpected failure and emits the failure variant', async () => {
    fetchPlayerState.mockRejectedValue(sqlErr('XX000'));
    const res = (await PLAYER({} as Request, playerParams(E1))) as unknown as RouteResponse;
    expect(res.status).toBe(500);
    expect(emitted('player.state_failed', 'fim-1')).toBe(true);
  });
});

describe('POST .../steps/[stepId]/enter — the auto-save write', () => {
  it('401s without a server-verified user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await ENTER({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('calls enter_journey_step with (enrollmentId, stepId), returns the instance, emits player.step_entered', async () => {
    enterJourneyStep.mockResolvedValue({ instance_id: 'i1', step_id: S1, completed_at: null });
    const res = (await ENTER({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ instance_id: 'i1', step_id: S1, completed_at: null });
    expect(enterJourneyStep).toHaveBeenCalledWith(expect.anything(), E1, S1);
    expect(emitted('player.step_entered', 'fim-1')).toBe(true);
  });

  it('maps 42501 → 403, P0002 → 404, P0001 → 409 with the refusal message through', async () => {
    enterJourneyStep.mockRejectedValue(sqlErr('42501'));
    let res = (await ENTER({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);

    enterJourneyStep.mockRejectedValue(sqlErr('P0002'));
    res = (await ENTER({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);

    enterJourneyStep.mockRejectedValue(sqlErr('P0001', 'enrollment is not active'));
    res = (await ENTER({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('enrollment is not active');
  });
});

describe('POST .../steps/[stepId]/complete — completion + gating', () => {
  it('401s without a server-verified user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await COMPLETE({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it('calls complete_journey_step with (enrollmentId, stepId), returns the instance, emits player.step_completed', async () => {
    completeJourneyStep.mockResolvedValue({ instance_id: 'i1', step_id: S1, completed_at: 't' });
    const res = (await COMPLETE({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ instance_id: 'i1', step_id: S1, completed_at: 't' });
    expect(completeJourneyStep).toHaveBeenCalledWith(expect.anything(), E1, S1);
    expect(emitted('player.step_completed', 'fim-1')).toBe(true);
  });

  it('maps the required-predecessor gate P0001 → 409 with the reason through', async () => {
    completeJourneyStep.mockRejectedValue(sqlErr('P0001', 'required predecessor incomplete'));
    const res = (await COMPLETE({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('required predecessor incomplete');
    expect(emitted('player.complete_conflict', 'fim-1')).toBe(true);
  });

  it('maps 42501 (an Observer may not complete) → 403 and P0002 → 404', async () => {
    completeJourneyStep.mockRejectedValue(sqlErr('42501'));
    let res = (await COMPLETE({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(403);

    completeJourneyStep.mockRejectedValue(sqlErr('P0002'));
    res = (await COMPLETE({} as Request, stepParams(E1, S1))) as unknown as RouteResponse;
    expect(res.status).toBe(404);
  });
});
