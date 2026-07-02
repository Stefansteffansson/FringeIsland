import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * Perf revision 2026-07-02 (unit) — the profile client caches the member's own
 * profile for the session so navigating between Hub surfaces does not re-fetch
 * (the measured Profile nav fetched /api/profile/me twice per visit: AccountMenu
 * + page). Semantics: concurrent callers share one request; a resolved profile
 * is reused until invalidated; a FAILED read is never cached (the next caller
 * retries); a successful update seeds the cache with the returned profile.
 *
 * Red-first: fails until the cache lands in `lib/profile/client.ts`.
 */
import {
  fetchProfile,
  updateProfile,
  invalidateProfileCache,
} from '@/lib/profile/client';

const PROFILE = { full_name: 'Ada Lovelace', nickname: 'Ada', display_preference: 'nickname' };
const UPDATED = { full_name: 'Ada Lovelace', nickname: 'Countess', display_preference: 'nickname' };

const fetchMock = jest.fn<() => Promise<unknown>>();
global.fetch = fetchMock as unknown as typeof fetch;

const ok = (profile: unknown) => ({ ok: true, json: async () => ({ profile }) });
const fail = () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(ok(PROFILE));
  invalidateProfileCache();
});

describe('profile client cache', () => {
  it('shares one request across concurrent callers (kills the duplicate nav fetch)', async () => {
    const [a, b] = await Promise.all([fetchProfile(), fetchProfile()]);
    expect(a).toMatchObject({ nickname: 'Ada' });
    expect(b).toMatchObject({ nickname: 'Ada' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the resolved profile on later calls (no re-fetch per navigation)', async () => {
    await fetchProfile();
    await fetchProfile();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed read — the next caller retries', async () => {
    fetchMock.mockResolvedValueOnce(fail());
    await expect(fetchProfile()).rejects.toThrow();
    await expect(fetchProfile()).resolves.toMatchObject({ nickname: 'Ada' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidateProfileCache forces a fresh read', async () => {
    await fetchProfile();
    invalidateProfileCache();
    await fetchProfile();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a successful update seeds the cache with the returned profile', async () => {
    await fetchProfile();
    fetchMock.mockResolvedValueOnce(ok(UPDATED));
    await updateProfile({ nickname: 'Countess' });
    await expect(fetchProfile()).resolves.toMatchObject({ nickname: 'Countess' });
    // read(1) + update(1) — the post-update read came from the seeded cache.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
