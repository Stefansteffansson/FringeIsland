import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H020 (unit) — the player client lib per-enrolment session cache +
 * background-save transports (Cycle J-B). Cache semantics are the PR #102
 * groups pattern, keyed by enrollmentId: peekPlayerState paints the last
 * resolved payload instantly (B4 revisit), fetchPlayerState always revalidates
 * and concurrent callers on ONE enrolment share a single in-flight request, a
 * FAILED read is never cached, and invalidatePlayerCache() drops every entry
 * (the AuthContext sign-out block). enterStep/completeStep are thin POST
 * wrappers that write NO cache — the player page owns optimistic progress state
 * (the scoped optimistic-advance deviation, FEAT-H020 §Solution sketch).
 *
 * Red-first: fails until @/lib/journeys/player exists.
 */

type PlayerModule = typeof import('@/lib/journeys/player');

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const errJson = (status: number, body: unknown = { error: 'nope' }): Response =>
  ({ ok: false, status, json: async () => body }) as unknown as Response;

let fetchMock: jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>;
let player: PlayerModule;

beforeEach(() => {
  jest.resetModules();
  fetchMock = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  player = require('@/lib/journeys/player') as PlayerModule;
});

describe('per-enrolment player-state cache', () => {
  const stateA = {
    enrollment_id: 'eA',
    status: 'active',
    sequencing_mode: 'linear',
    journey: { id: 'jA', title: 'A', description: null },
    steps: [],
    instances: [],
    resume_step_id: null,
  };
  const stateB = { ...stateA, enrollment_id: 'eB', journey: { id: 'jB', title: 'B', description: null } };

  it('peek is null before any read; fetch caches per enrolment; peek then paints instantly', async () => {
    expect(player.peekPlayerState('eA')).toBeNull();
    fetchMock.mockResolvedValue(okJson({ player: stateA }));
    const got = await player.fetchPlayerState('eA');
    expect(got).toEqual(stateA);
    expect(fetchMock).toHaveBeenCalledWith('/api/journeys/enrollments/eA/player');
    expect(player.peekPlayerState('eA')).toEqual(stateA);
  });

  it('caches are keyed by enrolment — one enrolment never paints another', async () => {
    fetchMock.mockResolvedValue(okJson({ player: stateA }));
    await player.fetchPlayerState('eA');
    expect(player.peekPlayerState('eA')).toEqual(stateA);
    expect(player.peekPlayerState('eB')).toBeNull();
  });

  it('concurrent callers on ONE enrolment share a single in-flight request', async () => {
    fetchMock.mockResolvedValue(okJson({ player: stateA }));
    const [a, b] = await Promise.all([
      player.fetchPlayerState('eA'),
      player.fetchPlayerState('eA'),
    ]);
    expect(a).toEqual(stateA);
    expect(b).toEqual(stateA);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('different enrolments do NOT share an in-flight request', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ player: stateA }));
    fetchMock.mockResolvedValueOnce(okJson({ player: stateB }));
    const [a, b] = await Promise.all([
      player.fetchPlayerState('eA'),
      player.fetchPlayerState('eB'),
    ]);
    expect(a).toEqual(stateA);
    expect(b).toEqual(stateB);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a failed read is never cached and the next caller retries', async () => {
    fetchMock.mockResolvedValueOnce(errJson(500));
    await expect(player.fetchPlayerState('eA')).rejects.toThrow();
    expect(player.peekPlayerState('eA')).toBeNull();
    fetchMock.mockResolvedValueOnce(okJson({ player: stateA }));
    await expect(player.fetchPlayerState('eA')).resolves.toEqual(stateA);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a failed read rejects with the BFF status (404 stays recognisable for the honest redirect)', async () => {
    fetchMock.mockResolvedValue(errJson(404, { error: 'Journey not found' }));
    await expect(player.fetchPlayerState('ghost')).rejects.toMatchObject({ status: 404 });
  });

  it('invalidatePlayerCache drops every per-enrolment entry', async () => {
    fetchMock.mockResolvedValue(okJson({ player: stateA }));
    await player.fetchPlayerState('eA');
    player.invalidatePlayerCache();
    expect(player.peekPlayerState('eA')).toBeNull();
  });
});

describe('background-save transports (no cache writes; errors carry HTTP status)', () => {
  it('enterStep POSTs the enter route and returns the instance', async () => {
    const inst = { instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: null };
    fetchMock.mockResolvedValue(okJson(inst));
    await expect(player.enterStep('eA', 's1')).resolves.toEqual(inst);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/journeys/enrollments/eA/steps/s1/enter',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('enterStep writes NO cache (optimistic progress is the page owns)', async () => {
    fetchMock.mockResolvedValue(
      okJson({ instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: null }),
    );
    await player.enterStep('eA', 's1');
    expect(player.peekPlayerState('eA')).toBeNull();
  });

  it('completeStep POSTs the complete route; a P0001 gate surfaces as status 409 + message', async () => {
    fetchMock.mockResolvedValue(
      okJson({ instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: 't' }),
    );
    await player.completeStep('eA', 's1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/journeys/enrollments/eA/steps/s1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
    fetchMock.mockResolvedValue(errJson(409, { error: 'required predecessor incomplete' }));
    await expect(player.completeStep('eA', 's1')).rejects.toMatchObject({
      status: 409,
      message: 'required predecessor incomplete',
    });
  });
});
