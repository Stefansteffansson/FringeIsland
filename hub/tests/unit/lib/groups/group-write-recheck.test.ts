import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H038 STORY-4 (W-7, unit) — the group-write mappers demand the truth.
 * WRITTEN RED-FIRST (2026-08-03): the groups client's write transports throw
 * GroupsApiError on refusal but never fire `requestAccountStateRecheck()` — a
 * member suspended mid-session keeps browsing on boot-time "active" after a
 * refused group write. The profile save path got the wiring in tranche 1
 * (lib/profile/client.ts); this pins the same idiom onto the groups writes:
 * a 401/403 on a WRITE fires the re-check; reads and non-auth refusals never do.
 *
 * Red evidence 2026-08-03: the two "fires" cases fail at head; the two "never
 * fires" cases are DESIGNED CONTROLS — green at head (nothing fires yet, so
 * they pass vacuously) and meaningful as boundary pins only post-implementation.
 */

const requestAccountStateRecheck = jest.fn();
jest.mock('@/lib/account/AccountStateContext', () => ({
  requestAccountStateRecheck: () => requestAccountStateRecheck(),
}));

import { fetchMyGroups, leaveGroup, updateGroupSettings } from '@/lib/groups/client';

const refusal = (status: number) =>
  ({
    ok: false,
    status,
    json: async () => ({ error: 'refused' }),
  }) as Response;

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  requestAccountStateRecheck.mockReset();
  fetchMock = jest.fn<typeof fetch>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('group-write refusal → account-state re-check (FEAT-H038 STORY-4)', () => {
  it('a 403 on a group write fires the re-check (suspension may be why)', async () => {
    fetchMock.mockResolvedValue(refusal(403));
    await expect(updateGroupSettings('g1', { name: 'x' })).rejects.toThrow();
    expect(requestAccountStateRecheck).toHaveBeenCalledTimes(1);
  });

  it('a 401 on a group write fires the re-check', async () => {
    fetchMock.mockResolvedValue(refusal(401));
    await expect(leaveGroup('g1')).rejects.toThrow();
    expect(requestAccountStateRecheck).toHaveBeenCalledTimes(1);
  });

  it('a 409 write refusal (availability / invariant) never fires it', async () => {
    fetchMock.mockResolvedValue(refusal(409));
    await expect(leaveGroup('g1')).rejects.toThrow();
    expect(requestAccountStateRecheck).not.toHaveBeenCalled();
  });

  it('a refused READ never fires it (the wiring is write-path only)', async () => {
    fetchMock.mockResolvedValue(refusal(403));
    await expect(fetchMyGroups()).rejects.toThrow();
    expect(requestAccountStateRecheck).not.toHaveBeenCalled();
  });
});
