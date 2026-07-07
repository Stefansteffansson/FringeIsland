import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import type { PlayerState } from '@/lib/journeys/player';

/**
 * FEAT-H020 STORY-7 (Performance DoD, ADR-U043) — the player's first-paint
 * request behaviour and the B6 loading rule.
 *
 * TEST-AFTER verification of behaviour built under the STORY suites (the budgets
 * bind as DoD rows; the groups-page 3x-refire regression is what these guard):
 *  - a cold player boot issues exactly ONE player-state read (header seeds from
 *    cache, no waterfall);
 *  - auth-event churn (a NEW user object, SAME id — the INITIAL_SESSION /
 *    TOKEN_REFRESHED shape) fires ZERO additional reads;
 *  - B6: the player skeleton is deferred — nothing before ~300 ms, a skeleton
 *    (canvas + rail, never a spinner) after it.
 */

type AuthShape = { user: { id: string } | null; identity: 'sessionless' | 'mist' | 'fim'; loading: boolean };

let authState: AuthShape;
const router = { replace: jest.fn(), push: jest.fn() };
const fetchPlayerState = jest.fn<(id: string) => Promise<PlayerState>>();
const peekPlayerState = jest.fn<(id: string) => PlayerState | null>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ id: 'j1' }),
  useSearchParams: () => ({ get: (k: string) => (k === 'enrollment' ? 'e1' : null) }),
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/lib/observability/telemetry', () => ({ emitTelemetry: jest.fn() }));
jest.mock('@/lib/journeys/player', () => ({
  fetchPlayerState: (id: string) => fetchPlayerState(id),
  peekPlayerState: (id: string) => peekPlayerState(id),
  enterStep: jest.fn(),
}));
jest.mock('@/lib/journeys/client', () => ({
  peekJourneyCatalog: () => null,
  peekMyJourneyEnrollments: () => null,
  fetchMyJourneyEnrollments: jest.fn(),
  JourneysApiError: class JourneysApiError extends Error {},
}));

import JourneyPlayerPage from '@/app/journeys/[id]/play/page';
import { PlayerSkeleton } from '@/components/journeys/PlayerSkeleton';

const STATE: PlayerState = {
  enrollment_id: 'e1',
  status: 'active',
  sequencing_mode: 'linear',
  journey: { id: 'j1', title: 'Leadership Fundamentals', description: null },
  steps: [],
  instances: [],
  resume_step_id: null,
};

describe('FEAT-H020 — cold player boot request behaviour (ADR-U043)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    peekPlayerState.mockReturnValue(null);
    fetchPlayerState.mockResolvedValue(STATE);
  });

  it('cold boot issues exactly one player-state read (no waterfall)', async () => {
    render(<JourneyPlayerPage />);
    await act(async () => {});
    expect(fetchPlayerState).toHaveBeenCalledTimes(1);
    expect(fetchPlayerState).toHaveBeenCalledWith('e1');
  });

  it('auth-event churn (new user reference, same id) fires zero duplicate reads', async () => {
    const { rerender } = render(<JourneyPlayerPage />);
    await act(async () => {});
    // The auth listener hands out a NEW object per event — the effect must key
    // on the stable id + enrolment (the groups-page 3x-refire lesson, 2026-07-06).
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    rerender(<JourneyPlayerPage />);
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    rerender(<JourneyPlayerPage />);
    await act(async () => {});
    expect(fetchPlayerState).toHaveBeenCalledTimes(1);
  });
});

describe('FEAT-H020 — the B6 loading rule (deferred player skeleton, never spinner-first)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('PlayerSkeleton renders NOTHING before its 300 ms deferral', () => {
    render(<PlayerSkeleton />);
    expect(screen.queryByTestId('player-skeleton')).toBeNull();
  });

  it('after 300 ms it renders a canvas + rail skeleton — pulses, not a spinner', () => {
    render(<PlayerSkeleton />);
    act(() => jest.advanceTimersByTime(300));
    const sk = screen.getByTestId('player-skeleton');
    expect(sk.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(sk.querySelector('[data-testid="loading-state"]')).toBeNull();
  });
});
