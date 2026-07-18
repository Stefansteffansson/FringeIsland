import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H024 STORY-1/2 (unit) — the response save transport + the J-D
 * session-cache write-through. `saveStepResponse(enrollmentId, stepId, body)`
 * POSTs the response to the BFF (an empty/whitespace body travels as the
 * platform's retraction `response: null`), and on confirm writes the CONFIRMED
 * payload through to the per-enrolment player cache in the same handler — a
 * later mount must show the words without a refetch (the stale sharing-toggle
 * lesson, PR #146). A save-created instance is appended; a failed save never
 * touches the cache and rejects with the BFF status.
 *
 * Red-first for TASK-JF-04 — fails until the transport exists.
 */

type PlayerModule = typeof import('@/lib/journeys/player');

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const errJson = (status: number, body: unknown = { error: 'nope' }): Response =>
  ({ ok: false, status, json: async () => body }) as unknown as Response;

let fetchMock: jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>;
let player: PlayerModule;

const PLAYER_STATE = {
  enrollment_id: 'e1',
  status: 'active',
  sequencing_mode: 'linear',
  journey: { id: 'j1', title: 'Walk', description: null, takeaway: null },
  steps: [],
  instances: [
    {
      instance_id: 'i1',
      step_id: 's1',
      created_at: '2026-07-18T09:00:00+00:00',
      completed_at: null,
      response: null,
      response_updated_at: null,
    },
  ],
  resume_step_id: 's1',
};

beforeEach(() => {
  jest.resetModules();
  fetchMock = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  player = require('@/lib/journeys/player') as PlayerModule;
});

describe('saveStepResponse — transport shape', () => {
  it('POSTs the body to the response endpoint and returns the confirmed body', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        instance_id: 'i1',
        step_id: 's1',
        response: { body: 'My words.' },
        response_updated_at: '2026-07-18T10:00:00+00:00',
      }),
    );
    const confirmed = await player.saveStepResponse('e1', 's1', 'My words.');
    expect(confirmed.body).toBe('My words.');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/journeys/enrollments/e1/steps/s1/response',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(init.body as string)).toEqual({ response: { body: 'My words.' } });
  });

  it('an empty or whitespace body travels as the retraction (response: null)', async () => {
    fetchMock.mockResolvedValue(
      okJson({ instance_id: 'i1', step_id: 's1', response: null, response_updated_at: 'T' }),
    );
    const confirmed = await player.saveStepResponse('e1', 's1', '   ');
    expect(confirmed.body).toBe('');
    const init = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(init.body as string)).toEqual({ response: null });
  });

  it('a failed save rejects with the BFF status and never touches the cache', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ player: PLAYER_STATE }));
    await player.fetchPlayerState('e1');
    fetchMock.mockResolvedValueOnce(errJson(409, { error: 'frozen' }));
    await expect(player.saveStepResponse('e1', 's1', 'Words.')).rejects.toMatchObject({
      status: 409,
    });
    const cached = player.peekPlayerState('e1')!;
    expect(cached.instances[0].response).toBeNull(); // untouched
  });
});

describe('saveStepResponse — the J-D session-cache write-through', () => {
  it('writes the confirmed words through to the cached instance in the same handler', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ player: PLAYER_STATE }));
    await player.fetchPlayerState('e1');
    fetchMock.mockResolvedValueOnce(
      okJson({
        instance_id: 'i1',
        step_id: 's1',
        response: { body: 'Confirmed words.' },
        response_updated_at: '2026-07-18T10:00:00+00:00',
      }),
    );
    await player.saveStepResponse('e1', 's1', 'Confirmed words.');
    const cached = player.peekPlayerState('e1')!;
    const inst = cached.instances.find((i) => i.instance_id === 'i1')!;
    expect(inst.response).toEqual({ body: 'Confirmed words.' });
    expect(inst.response_updated_at).toBe('2026-07-18T10:00:00+00:00');
  });

  it('appends a save-created instance the cache has never seen (capture-before-complete)', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ player: PLAYER_STATE }));
    await player.fetchPlayerState('e1');
    fetchMock.mockResolvedValueOnce(
      okJson({
        instance_id: 'i9',
        step_id: 's2',
        response: { body: 'First words on a fresh step.' },
        response_updated_at: '2026-07-18T10:05:00+00:00',
      }),
    );
    await player.saveStepResponse('e1', 's2', 'First words on a fresh step.');
    const cached = player.peekPlayerState('e1')!;
    const inst = cached.instances.find((i) => i.instance_id === 'i9')!;
    expect(inst.step_id).toBe('s2');
    expect(inst.completed_at).toBeNull(); // created open — responding never completes
    expect(inst.response).toEqual({ body: 'First words on a fresh step.' });
  });

  it('writes the retraction through — a later mount renders unanswered', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({
        player: {
          ...PLAYER_STATE,
          instances: [
            { ...PLAYER_STATE.instances[0], response: { body: 'Old words.' }, response_updated_at: 'T0' },
          ],
        },
      }),
    );
    await player.fetchPlayerState('e1');
    fetchMock.mockResolvedValueOnce(
      okJson({ instance_id: 'i1', step_id: 's1', response: null, response_updated_at: 'T1' }),
    );
    await player.saveStepResponse('e1', 's1', '');
    const cached = player.peekPlayerState('e1')!;
    expect(cached.instances[0].response).toBeNull();
  });
});
