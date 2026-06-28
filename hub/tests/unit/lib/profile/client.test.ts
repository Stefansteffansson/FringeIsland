import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fetchProfile, updateProfile, displayLabel } from '@/lib/profile/client';
import type { Profile } from '@/lib/profile/queries';

/**
 * FEAT-H005 STORY-1/2 (unit) — the Hub's API-first profile client.
 * fetchProfile/updateProfile go through /api/profile/me (the paired FEAT-PC003
 * contract) — never a direct table call (ADR-U009). displayLabel derives the
 * member's shown name from display_preference.
 */

const baseProfile: Profile = {
  full_name: 'Ada Lovelace',
  nickname: 'Ada',
  display_preference: 'nickname',
  show_real_name: false,
  bio: 'Hello',
  avatar_url: null,
};

const fetchMock = jest.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('FEAT-H005 STORY-1/2 (unit) — displayLabel', () => {
  it('shows the nickname when display_preference is nickname', () => {
    expect(displayLabel({ ...baseProfile, display_preference: 'nickname' })).toBe('Ada');
  });

  it('shows the full name when display_preference is real_name', () => {
    expect(displayLabel({ ...baseProfile, display_preference: 'real_name' })).toBe('Ada Lovelace');
  });
});

describe('FEAT-H005 STORY-1 (unit) — fetchProfile (GET /api/profile/me)', () => {
  it('GETs /api/profile/me and returns the profile', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ profile: baseProfile }));
    const profile = await fetchProfile();
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/me');
    expect(profile).toEqual(baseProfile);
  });

  it('throws the contract error message on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Profile not found' }, false, 404));
    await expect(fetchProfile()).rejects.toThrow('Profile not found');
  });
});

describe('FEAT-H005 STORY-2 (unit) — updateProfile (PATCH /api/profile/me)', () => {
  it('PATCHes the patch as JSON and returns the updated profile', async () => {
    const updated = { ...baseProfile, nickname: 'Ada B' };
    fetchMock.mockResolvedValue(jsonResponse({ profile: updated }));
    const result = await updateProfile({ nickname: 'Ada B' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/me',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: 'Ada B' }),
      }),
    );
    expect(result).toEqual(updated);
  });

  it('throws the contract error message on a non-ok response (failure surfaced)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Bio must be at most 500 characters.' }, false, 400),
    );
    await expect(updateProfile({ bio: 'x'.repeat(501) })).rejects.toThrow(
      'Bio must be at most 500 characters.',
    );
  });
});
