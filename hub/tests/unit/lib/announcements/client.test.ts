import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H028 (unit) — the announcements client session cache + W9 registration.
 * Mirrors the forum client's ADR-U043 posture: peek paints instantly on
 * revisit, the first page is deduped + cached, a failed read is never cached,
 * every write drops the group peek, and the module registers a session-end
 * invalidator. Group scope and platform scope keep separate caches.
 *
 * Red-first: fails to import until `@/lib/announcements/client` exists.
 */

const mockRegister = jest.fn();
jest.mock('@/lib/auth/cache-registry', () => ({
  registerCacheInvalidator: (fn: () => void) => mockRegister(fn),
}));

import {
  peekGroupAnnouncements,
  fetchGroupAnnouncements,
  peekPlatformAnnouncements,
  fetchPlatformAnnouncements,
  sendCommunityAnnouncement,
  retractAnnouncement,
  invalidateAnnouncementsCache,
} from '@/lib/announcements/client';
import type { Announcement } from '@/lib/announcements/queries';

function ann(o: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a1',
    title: 'Notice',
    body: 'Body',
    created_at: '2026-07-20T10:00:00Z',
    author_group_id: 'g-ada',
    author: { display_name: 'Ada', attribution: 'active' },
    ...o,
  };
}

const okJson = (payload: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(payload) } as Response);

const mockFetch = jest.fn();

beforeEach(() => {
  invalidateAnnouncementsCache();
  mockFetch.mockReset();
  (global as unknown as { fetch: unknown }).fetch = mockFetch;
});

describe('announcements client cache', () => {
  it('peek is null before any read and paints after the fetch resolves', async () => {
    expect(peekGroupAnnouncements('g1')).toBeNull();
    mockFetch.mockReturnValue(okJson({ announcements: [ann()] }));
    const rows = await fetchGroupAnnouncements('g1');
    expect(rows).toHaveLength(1);
    expect(peekGroupAnnouncements('g1')).toEqual([ann()]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('concurrent first-page callers share one in-flight request', async () => {
    mockFetch.mockReturnValue(okJson({ announcements: [ann()] }));
    await Promise.all([fetchGroupAnnouncements('g1'), fetchGroupAnnouncements('g1')]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('a failed read is never cached', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    await expect(fetchGroupAnnouncements('g1')).rejects.toThrow();
    expect(peekGroupAnnouncements('g1')).toBeNull();
  });

  it('sending an announcement drops the group peek so a stale list never paints', async () => {
    mockFetch
      .mockReturnValueOnce(okJson({ announcements: [ann()] }))
      .mockReturnValueOnce(okJson({ announcement: ann({ id: 'new' }) }));
    await fetchGroupAnnouncements('g1');
    expect(peekGroupAnnouncements('g1')).not.toBeNull();
    const created = await sendCommunityAnnouncement('g1', 'Title', 'Body');
    expect(created.id).toBe('new');
    expect(peekGroupAnnouncements('g1')).toBeNull();
  });

  it('retracting an announcement drops the group peek', async () => {
    mockFetch
      .mockReturnValueOnce(okJson({ announcements: [ann()] }))
      .mockReturnValueOnce(okJson({ retracted: { id: 'a1', retracted_at: '2026-07-20T11:00:00Z' } }));
    await fetchGroupAnnouncements('g1');
    const retracted = await retractAnnouncement('g1', 'a1');
    expect(retracted.id).toBe('a1');
    expect(peekGroupAnnouncements('g1')).toBeNull();
  });

  it('platform scope keeps its own cache, separate from any group', async () => {
    mockFetch.mockReturnValue(okJson({ announcements: [ann({ id: 'p1' })] }));
    expect(peekPlatformAnnouncements()).toBeNull();
    await fetchPlatformAnnouncements();
    expect(peekPlatformAnnouncements()).toEqual([ann({ id: 'p1' })]);
    expect(peekGroupAnnouncements('g1')).toBeNull();
  });

  it('registers a session-end cache invalidator (COR-A W9)', () => {
    expect(mockRegister).toHaveBeenCalled();
  });
});
