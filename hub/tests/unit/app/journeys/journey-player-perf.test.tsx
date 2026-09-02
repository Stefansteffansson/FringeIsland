import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
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
const enterStep = jest.fn<(e: string, s: string) => Promise<unknown>>();
const completeStep = jest.fn<(e: string, s: string) => Promise<unknown>>();

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
  enterStep: (e: string, s: string) => enterStep(e, s),
  completeStep: (e: string, s: string) => completeStep(e, s),
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
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

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

describe('FEAT-H021 STORY-5 — review + completion ride the player budgets (ADR-U043)', () => {
  const TIMING = {
    per_step: [{ step_id: 's1', seconds: 600 }],
    total_seconds: 600,
    wall_clock: { enrolled_at: '2026-07-06T09:00:00+00:00', completed_at: '2026-07-08T10:00:00+00:00' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    peekPlayerState.mockReturnValue(null);
  });

  it('a review-mode boot is the SAME single player-state read (no extra request for timing/completion)', async () => {
    fetchPlayerState.mockResolvedValue({
      ...STATE,
      status: 'completed',
      timing: TIMING,
      completion: { traveller_completed: true, traveller_completed_at: 't', enrollment_status: 'completed', enrollment_completed_at: 't' },
    });
    render(<JourneyPlayerPage />);
    await act(async () => {});
    expect(fetchPlayerState).toHaveBeenCalledTimes(1);
    expect(fetchPlayerState).toHaveBeenCalledWith('e1');
  });

  it('the completion moment paints from the completing save response — no player-state read of its own (B5)', async () => {
    const stepped: PlayerState = {
      ...STATE,
      steps: [
        { id: 's1', step_order: 1, title: 'Orient', kind: 'content', family: 'text', ask_verb: 'Read', required: true, repeatable: false, duration_minutes: 10, content: { body: 'Welcome' } },
        { id: 's2', step_order: 2, title: 'Reflect', kind: 'reflection', family: 'prompt', ask_verb: 'Reflect', required: false, repeatable: false, duration_minutes: 15, content: { body: 'Consider' } },
      ],
      instances: [{ instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: 't' }],
      resume_step_id: 's2',
      timing: TIMING,
    };
    fetchPlayerState.mockResolvedValueOnce(stepped); // boot read
    fetchPlayerState.mockReturnValue(new Promise(() => {})); // the reconcile read hangs — the moment must not need it
    completeStep.mockResolvedValue({
      instance_id: 'c', step_id: 's2', created_at: 't', completed_at: 't',
      journey_completed: true,
      completion: { traveller_completed: true, traveller_completed_at: 't', enrollment_status: 'completed', enrollment_completed_at: 't' },
    });
    render(<JourneyPlayerPage />);
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByTestId('step-complete'));
    });
    // The milestone painted from the save response while the reconcile read is still in flight...
    await waitFor(() => expect(screen.getByTestId('journey-completion-panel')).toBeTruthy());
    // ...and only the boot + the (hanging) reconcile reads fired — the moment added none.
    expect(fetchPlayerState).toHaveBeenCalledTimes(2);
  });
});
