import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import type { JourneyCard, MyEnrollment } from '@/lib/journeys/queries';

/**
 * FEAT-H019 Performance DoD rows (ADR-U043) — first-paint request behaviour
 * for the /journeys pages, and the B6 loading-state rule.
 *
 * Labelled honestly: TEST-AFTER verification of behaviour built under the
 * STORY suites (the budgets bind as DoD rows; the groups-page 3x-refire
 * regression is what these guard against):
 *  - first paint issues exactly ONE catalogue read + ONE my-enrolments read;
 *  - auth-event churn (a NEW user object reference, SAME id — the
 *    INITIAL_SESSION / TOKEN_REFRESHED shape) fires ZERO additional reads;
 *  - B6: the loading state is the deferred SkeletonGrid — nothing renders
 *    before ~300 ms, a skeleton (never a spinner) after it.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const router = { replace: jest.fn(), push: jest.fn() };

const fetchJourneyCatalog = jest.fn<() => Promise<JourneyCard[]>>();
const fetchMyJourneyEnrollments = jest.fn<() => Promise<MyEnrollment[]>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/lib/journeys/client', () => ({
  fetchJourneyCatalog: () => fetchJourneyCatalog(),
  fetchMyJourneyEnrollments: () => fetchMyJourneyEnrollments(),
  peekJourneyCatalog: () => null,
  peekMyJourneyEnrollments: () => null,
}));

import JourneysPage from '@/app/journeys/page';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';

describe('FEAT-H019 — /journeys first-paint request behaviour (ADR-U043)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    fetchJourneyCatalog.mockResolvedValue([]);
    fetchMyJourneyEnrollments.mockResolvedValue([]);
  });

  it('first paint issues exactly one catalogue read and one my-enrolments read (N = 2)', async () => {
    render(<JourneysPage />);
    await act(async () => {});
    expect(fetchJourneyCatalog).toHaveBeenCalledTimes(1);
    expect(fetchMyJourneyEnrollments).toHaveBeenCalledTimes(1);
  });

  it('auth-event churn (new user reference, same id) fires zero duplicate reads', async () => {
    const { rerender } = render(<JourneysPage />);
    await act(async () => {});
    // The auth listener hands out a NEW object per event — the effect must
    // key on the stable id (the groups-page 3x-refire lesson, 2026-07-06).
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    rerender(<JourneysPage />);
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    rerender(<JourneysPage />);
    await act(async () => {});
    expect(fetchJourneyCatalog).toHaveBeenCalledTimes(1);
    expect(fetchMyJourneyEnrollments).toHaveBeenCalledTimes(1);
  });
});

describe('FEAT-H019 — the B6 loading-state rule (deferred skeleton, never spinner-first)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('SkeletonGrid renders NOTHING before its 300 ms deferral', () => {
    render(<SkeletonGrid />);
    expect(screen.queryByTestId('skeleton-grid')).toBeNull();
  });

  it('after 300 ms it renders a skeleton grid — cards, not a spinner', () => {
    render(<SkeletonGrid />);
    act(() => jest.advanceTimersByTime(300));
    const grid = screen.getByTestId('skeleton-grid');
    expect(grid.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(grid.querySelector('[data-testid="loading-state"]')).toBeNull();
  });
});
