import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H019 (unit) — the journeys client lib session cache + transports
 * (the PR #102 groups-cache pattern: stale-while-revalidate, one shared
 * in-flight request, a FAILED read never cached, session-end invalidation).
 * Data-boot per ADR-U042: justified standalone reads + session cache — NOT
 * overview-bundle slices, so there is no adopt* path here.
 *
 * Red-first: fails until @/lib/journeys/client exists.
 */

type ClientModule = typeof import('@/lib/journeys/client');

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const errJson = (status: number, body: unknown = { error: 'nope' }): Response =>
  ({ ok: false, status, json: async () => body }) as unknown as Response;

let fetchMock: jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>;
let client: ClientModule;

beforeEach(() => {
  jest.resetModules();
  fetchMock = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  client = require('@/lib/journeys/client') as ClientModule;
});

describe('catalogue session cache', () => {
  const cards = [{ id: 'j1', title: 'A Journey', step_count: 3 }];

  it('peek is null before any read; fetch caches; peek then paints instantly', async () => {
    expect(client.peekJourneyCatalog()).toBeNull();
    fetchMock.mockResolvedValue(okJson({ journeys: cards }));
    const got = await client.fetchJourneyCatalog();
    expect(got).toEqual(cards);
    expect(fetchMock).toHaveBeenCalledWith('/api/journeys');
    expect(client.peekJourneyCatalog()).toEqual(cards);
  });

  it('concurrent callers share ONE in-flight request', async () => {
    fetchMock.mockResolvedValue(okJson({ journeys: cards }));
    const [a, b] = await Promise.all([client.fetchJourneyCatalog(), client.fetchJourneyCatalog()]);
    expect(a).toEqual(cards);
    expect(b).toEqual(cards);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a failed read is never cached and the next caller retries', async () => {
    fetchMock.mockResolvedValueOnce(errJson(500));
    await expect(client.fetchJourneyCatalog()).rejects.toThrow();
    expect(client.peekJourneyCatalog()).toBeNull();
    fetchMock.mockResolvedValueOnce(okJson({ journeys: cards }));
    await expect(client.fetchJourneyCatalog()).resolves.toEqual(cards);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidateJourneysCache drops the paint cache', async () => {
    fetchMock.mockResolvedValue(okJson({ journeys: cards }));
    await client.fetchJourneyCatalog();
    client.invalidateJourneysCache();
    expect(client.peekJourneyCatalog()).toBeNull();
  });
});

describe('my-enrolments session cache', () => {
  const mine = [{ enrollment_id: 'e1', kind: 'individual', journey_id: 'j1' }];

  it('mirrors the catalogue cache semantics on /api/me/journeys', async () => {
    expect(client.peekMyJourneyEnrollments()).toBeNull();
    fetchMock.mockResolvedValue(okJson({ enrollments: mine }));
    await expect(client.fetchMyJourneyEnrollments()).resolves.toEqual(mine);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/journeys');
    expect(client.peekMyJourneyEnrollments()).toEqual(mine);
    client.invalidateJourneysCache();
    expect(client.peekMyJourneyEnrollments()).toBeNull();
  });
});

describe('detail + mutation transports (no optimistic state, errors carry HTTP status)', () => {
  it('fetchJourneyDetail GETs the detail and returns the payload', async () => {
    const detail = { id: 'j1', enrollable_groups: [] };
    fetchMock.mockResolvedValue(okJson({ journey: detail }));
    await expect(client.fetchJourneyDetail('j1')).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith('/api/journeys/j1');
  });

  it('fetchJourneyDetail surfaces the BFF status (404 stays recognisable for the not-found page)', async () => {
    fetchMock.mockResolvedValue(errJson(404, { error: 'Journey not found' }));
    await expect(client.fetchJourneyDetail('ghost')).rejects.toMatchObject({ status: 404 });
  });

  it('enrollSelf POSTs an empty body; enrollGroup carries { group_id }', async () => {
    fetchMock.mockResolvedValue(okJson({ enrollment_id: 'e1' }));
    await client.enrollSelf('j1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/journeys/j1/enroll',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({}) }),
    );
    await client.enrollGroup('j1', 'g1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/journeys/j1/enroll',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ group_id: 'g1' }) }),
    );
  });

  it('withdraw POSTs { enrollment_id } and refusals reject with status + message', async () => {
    fetchMock.mockResolvedValue(okJson({ withdrawn: true }));
    await client.withdrawEnrollment('j1', 'e1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/journeys/j1/withdraw',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ enrollment_id: 'e1' }) }),
    );
    fetchMock.mockResolvedValue(errJson(409, { error: 'enrollment is frozen' }));
    await expect(client.withdrawEnrollment('j1', 'e1')).rejects.toMatchObject({
      status: 409,
      message: 'enrollment is frozen',
    });
  });
});
