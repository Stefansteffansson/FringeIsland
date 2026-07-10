import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * FEAT-H011 revision 2026-07-10 (unit) — B6 + B4 conformance for the journal
 * surface (the RC-D retrofit riding Cycle J-E):
 *
 * - B6: a cold journal load shows the DEFERRED SKELETON, never the spinner
 *   ("Opening your journal...") — under ~300 ms nothing shows at all.
 * - B4: a revisit paints the cached entries instantly (no skeleton, no
 *   spinner) while the read still revalidates in the background.
 *
 * Red-first: fails until JournalPanel seeds from `peekJournalEntries` and
 * renders `SkeletonList`, and the page gate swaps LoadingState for the
 * skeleton.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const router = { replace: jest.fn(), push: jest.fn() };

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { JournalPanel } from '@/components/journal/JournalPanel';
import { fetchJournalEntries, invalidateJournalCache } from '@/lib/journal/client';
import JournalPage from '@/app/journal/page';

const ENTRIES = [
  {
    id: 'e1',
    title: 'Warm',
    body: 'Cached entry',
    created_at: '2026-07-08T10:00:00+00:00',
    updated_at: '2026-07-08T10:00:00+00:00',
  },
];

const fetchMock = jest.fn<() => Promise<unknown>>();
global.fetch = fetchMock as unknown as typeof fetch;

const okList = (entries: unknown) => ({ ok: true, json: async () => ({ entries }) });

/** A fetch response the test resolves by hand — keeps the read pending. */
function pendingList() {
  let release!: (entries: unknown) => void;
  const promise = new Promise((resolve) => {
    release = (entries: unknown) => resolve(okList(entries));
  });
  return { promise, release };
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  invalidateJournalCache();
});

describe('FEAT-H011 retrofit — journal skeleton (B6) and instant revisit (B4)', () => {
  it('cold load: deferred skeleton, never the spinner', async () => {
    const pending = pendingList();
    fetchMock.mockReturnValue(pending.promise as never);

    render(<JournalPanel />);

    // The spinner era is over — the label must not appear while pending.
    expect(screen.queryByText('Opening your journal...')).not.toBeInTheDocument();

    // The deferred skeleton appears once the ~300 ms deferral elapses.
    await waitFor(
      () => {
        expect(screen.getByTestId('skeleton-list')).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    pending.release(ENTRIES);
    await waitFor(() => {
      expect(screen.getByTestId('journal-entry')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('skeleton-list')).not.toBeInTheDocument();
  });

  it('warm revisit: cached entries paint instantly while the read revalidates', async () => {
    // Seed the session cache (the "first visit").
    fetchMock.mockResolvedValueOnce(okList(ENTRIES) as never);
    await fetchJournalEntries();

    // Revisit: the revalidate stays pending — the paint must not wait for it.
    const pending = pendingList();
    fetchMock.mockReturnValue(pending.promise as never);
    render(<JournalPanel />);

    expect(screen.getByTestId('journal-entry')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-list')).not.toBeInTheDocument();
    expect(screen.queryByText('Opening your journal...')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2); // seed + background revalidate

    pending.release(ENTRIES);
    await waitFor(() => {
      expect(screen.getByTestId('journal-entry')).toBeInTheDocument();
    });
  });

  it('page gate while auth resolves: no spinner label (skeleton idiom, deferred)', () => {
    authState = { user: null, identity: 'sessionless', loading: true };
    render(<JournalPage />);
    expect(screen.queryByText('Opening your journal...')).not.toBeInTheDocument();
  });
});
