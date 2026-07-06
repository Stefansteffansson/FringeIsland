import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * Perf revision 2026-07-06 (unit) — the groups client caches the member's own
 * groups list for instant paint (stale-while-revalidate): `peekMyGroups` hands
 * back the last resolved list synchronously; `fetchMyGroups` ALWAYS
 * revalidates (freshness semantics unchanged — every mount still reads the
 * contract) and concurrent callers share one request (kills the measured
 * 3x GET /api/groups per /groups load). A FAILED read is never cached — the
 * next caller retries; sign-out drops the cache via `invalidateGroupsCache`
 * (AuthContext listener, profile-cache prior art).
 *
 * Red-first: fails until the cache lands in `lib/groups/client.ts`.
 */
import {
  fetchMyGroups,
  peekMyGroups,
  invalidateGroupsCache,
} from '@/lib/groups/client';

const GROUPS = [
  { id: 'g1', name: 'Dev Test Cohort', description: null, is_public: false, member_count: 1 },
];
const REFRESHED = [
  ...GROUPS,
  { id: 'g2', name: 'Nya gruppen', description: null, is_public: true, member_count: 2 },
];

const fetchMock = jest.fn<() => Promise<unknown>>();
global.fetch = fetchMock as unknown as typeof fetch;

const ok = (groups: unknown) => ({ ok: true, json: async () => ({ groups }) });
const fail = () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(ok(GROUPS));
  invalidateGroupsCache();
});

describe('groups client cache (stale-while-revalidate)', () => {
  it('shares one request across concurrent callers (kills the 3x /api/groups)', async () => {
    const [a, b, c] = await Promise.all([fetchMyGroups(), fetchMyGroups(), fetchMyGroups()]);
    expect(a).toHaveLength(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('always revalidates on a later fetch (freshness semantics unchanged)', async () => {
    await fetchMyGroups();
    fetchMock.mockResolvedValueOnce(ok(REFRESHED));
    await expect(fetchMyGroups()).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('peekMyGroups is null before the first resolve, then hands back the last list', async () => {
    expect(peekMyGroups()).toBeNull();
    await fetchMyGroups();
    expect(peekMyGroups()).toEqual(GROUPS);
  });

  it('does not cache a failed read — peek unchanged, the next caller retries', async () => {
    fetchMock.mockResolvedValueOnce(fail());
    await expect(fetchMyGroups()).rejects.toThrow();
    expect(peekMyGroups()).toBeNull();
    await expect(fetchMyGroups()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidateGroupsCache drops the peek (sign-out / session end)', async () => {
    await fetchMyGroups();
    expect(peekMyGroups()).not.toBeNull();
    invalidateGroupsCache();
    expect(peekMyGroups()).toBeNull();
  });
});
