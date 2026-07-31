/**
 * FEAT-H031 (N-B) — the typed-action dispatch client: routes a notification to
 * its dedicated BFF response route (NB-1 thin-dispatch — no generic
 * dispatcher), POSTs the accept boolean, and drops the unread cache on success.
 * Red-first: written before `respondToNotification` exists in the client.
 *
 * COR-C W3 (AC3-5): the route segment is PLATFORM data — the row carries
 * `dispatch_segment` from `notification_kinds`; the local kind map is gone.
 * A new answerable kind reaches these functions with zero client change.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { respondToNotification, notificationDispatchRoute } from '@/lib/notifications/client';

const row = (kind: string, id = 'n1', dispatch_segment: string | null = null) =>
  ({ id, kind, dispatch_segment }) as unknown as Parameters<typeof respondToNotification>[0];

describe('notificationDispatchRoute (platform dispatch_segment -> route)', () => {
  it('routes by the row-carried segment (acting-response)', () => {
    expect(notificationDispatchRoute({ id: 'n1', dispatch_segment: 'acting-response' })).toBe(
      '/api/notifications/n1/acting-response',
    );
  });
  it('routes by the row-carried segment (nomination-response)', () => {
    expect(
      notificationDispatchRoute({ id: 'abc', dispatch_segment: 'nomination-response' }),
    ).toBe('/api/notifications/abc/nomination-response');
  });
  it('a segment this client has never heard of still routes — registration is platform data, not a client map', () => {
    expect(notificationDispatchRoute({ id: 'n1', dispatch_segment: 'poll-response' })).toBe(
      '/api/notifications/n1/poll-response',
    );
  });
  it('returns null for a passive row (no platform dispatch target)', () => {
    expect(notificationDispatchRoute({ id: 'n1', dispatch_segment: null })).toBeNull();
  });
});

describe('respondToNotification', () => {
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('POSTs the accept boolean to the acting-response route for an acting_invitation', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ outcome: 'accepted', resolved_by_name: 'Bob', already: false }),
    });
    const result = await respondToNotification(row('acting_invitation', 'n1', 'acting-response'), true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/notifications/n1/acting-response');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ accept: true });
    expect(result).toEqual({ outcome: 'accepted', resolved_by_name: 'Bob', already: false });
  });

  it('routes a stewardship_nomination to its own route with accept:false on decline', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await respondToNotification(row('stewardship_nomination', 'x9', 'nomination-response'), false);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/notifications/x9/nomination-response');
    expect(JSON.parse(init.body as string)).toEqual({ accept: false });
  });

  // W-03 / W-07 (gate walk 2026-07-27) — the house `refreshNavigation` contract.
  // A notification response is the one mutation class whose whole purpose is to
  // change something ELSEWHERE in the app, and it was the only one that never
  // announced it: `messages/client.ts:83` fires on every messages mutation and
  // `ProfileEditForm.tsx:87` on a profile edit, but no notification response did.
  // The walk's observed consequence: after accepting a stewardship nomination,
  // the group page beneath the dropdown still listed a member the accept had
  // just removed, and withheld the role just granted.
  it('announces a successful response on refreshNavigation, so views showing the changed data can catch up', async () => {
    const seen: string[] = [];
    const listener = () => seen.push('refreshNavigation');
    window.addEventListener('refreshNavigation', listener);
    try {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ outcome: 'accepted' }) });
      await respondToNotification(row('stewardship_nomination', 'x9', 'nomination-response'), true);
      expect(seen).toEqual(['refreshNavigation']);
    } finally {
      window.removeEventListener('refreshNavigation', listener);
    }
  });

  it('stays silent when the response FAILED — a stale view is better than a view refreshed to assert a change that never happened', async () => {
    const seen: string[] = [];
    const listener = () => seen.push('refreshNavigation');
    window.addEventListener('refreshNavigation', listener);
    try {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'refused' }),
        text: async () => JSON.stringify({ error: 'refused' }),
      });
      await expect(
        respondToNotification(row('stewardship_nomination', 'x9', 'nomination-response'), true),
      ).rejects.toThrow();
      expect(seen).toEqual([]);
    } finally {
      window.removeEventListener('refreshNavigation', listener);
    }
  });

  it('throws with the server error message on a non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'already answered' }),
    });
    await expect(
      respondToNotification(row('acting_invitation', 'n1', 'acting-response'), true),
    ).rejects.toThrow('already answered');
  });

  it('rejects a passive row with no dispatch target (never silently no-ops)', async () => {
    await expect(respondToNotification(row('invitation_received'), true)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
