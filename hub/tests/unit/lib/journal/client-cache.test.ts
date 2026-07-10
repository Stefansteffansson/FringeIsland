import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H011 revision 2026-07-10 (unit) — the journal client gains the
 * groups/journeys session cache (ADR-U043 B4: revisit paints instantly — the
 * RC-D retrofit riding Cycle J-E). `peekJournalEntries` hands back the last
 * resolved FIRST page synchronously; `fetchJournalEntries()` ALWAYS
 * revalidates and concurrent first-page callers share one request; a FAILED
 * read is never cached; keyset pages (`before`) bypass the cache without
 * clobbering the first-page peek; MUTATIONS drop the peek (a navigate-away
 * right after a write can never paint a stale list); sign-out drops it via
 * `invalidateJournalCache` (AuthContext listener, groups prior art).
 *
 * Red-first: fails until the cache lands in `lib/journal/client.ts`.
 */
import {
  fetchJournalEntries,
  postJournalEntry,
  patchJournalEntry,
  removeJournalEntry,
  peekJournalEntries,
  invalidateJournalCache,
} from '@/lib/journal/client';

const ENTRIES = [
  {
    id: 'e2',
    title: null,
    body: 'Second thoughts',
    created_at: '2026-07-09T10:00:00+00:00',
    updated_at: '2026-07-09T10:00:00+00:00',
  },
  {
    id: 'e1',
    title: 'First',
    body: 'First entry',
    created_at: '2026-07-08T10:00:00+00:00',
    updated_at: '2026-07-08T10:00:00+00:00',
  },
];
const OLDER = [
  {
    id: 'e0',
    title: null,
    body: 'Oldest',
    created_at: '2026-07-07T10:00:00+00:00',
    updated_at: '2026-07-07T10:00:00+00:00',
  },
];

const fetchMock = jest.fn<() => Promise<unknown>>();
global.fetch = fetchMock as unknown as typeof fetch;

const okList = (entries: unknown) => ({ ok: true, json: async () => ({ entries }) });
const okEntry = (entry: unknown) => ({ ok: true, json: async () => ({ entry }) });
const okEmpty = () => ({ ok: true, json: async () => ({}) });
const fail = () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(okList(ENTRIES));
  invalidateJournalCache();
});

describe('journal client cache (B4 retrofit — stale-while-revalidate)', () => {
  it('shares one request across concurrent first-page callers', async () => {
    const [a, b] = await Promise.all([fetchJournalEntries(), fetchJournalEntries()]);
    expect(a).toHaveLength(2);
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('always revalidates on a later fetch (freshness semantics unchanged)', async () => {
    await fetchJournalEntries();
    await fetchJournalEntries();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('peekJournalEntries is null before the first resolve, then hands back the last first page', async () => {
    expect(peekJournalEntries()).toBeNull();
    await fetchJournalEntries();
    expect(peekJournalEntries()).toEqual(ENTRIES);
  });

  it('does not cache a failed read — peek unchanged, the next caller retries', async () => {
    fetchMock.mockResolvedValueOnce(fail());
    await expect(fetchJournalEntries()).rejects.toThrow();
    expect(peekJournalEntries()).toBeNull();
    await expect(fetchJournalEntries()).resolves.toHaveLength(2);
  });

  it('keyset pages (`before`) bypass the cache and never clobber the first-page peek', async () => {
    await fetchJournalEntries();
    fetchMock.mockResolvedValueOnce(okList(OLDER));
    await expect(
      fetchJournalEntries({ before: ENTRIES[1].created_at }),
    ).resolves.toHaveLength(1);
    expect(peekJournalEntries()).toEqual(ENTRIES); // first page intact
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a successful POST drops the peek (mutations invalidate — no stale paint)', async () => {
    await fetchJournalEntries();
    fetchMock.mockResolvedValueOnce(okEntry(ENTRIES[0]));
    await postJournalEntry(null, 'new body');
    expect(peekJournalEntries()).toBeNull();
  });

  it('a successful PATCH drops the peek', async () => {
    await fetchJournalEntries();
    fetchMock.mockResolvedValueOnce(okEntry(ENTRIES[0]));
    await patchJournalEntry('e1', 'edited', 'edited body');
    expect(peekJournalEntries()).toBeNull();
  });

  it('a successful DELETE drops the peek', async () => {
    await fetchJournalEntries();
    fetchMock.mockResolvedValueOnce(okEmpty());
    await removeJournalEntry('e1');
    expect(peekJournalEntries()).toBeNull();
  });

  it('invalidateJournalCache drops the peek (sign-out / session end)', async () => {
    await fetchJournalEntries();
    expect(peekJournalEntries()).not.toBeNull();
    invalidateJournalCache();
    expect(peekJournalEntries()).toBeNull();
  });
});
