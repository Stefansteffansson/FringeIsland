import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import type { PlayerState } from '@/lib/journeys/player';
import type { MyEnrollment } from '@/lib/journeys/queries';

/**
 * FEAT-H020 STORY-1/2/4/5 (unit) — the /journeys/[id]/play page (JRN-6/7/9/10).
 *
 * FIM-gated like the catalogue/detail: sessionless -> sign-in with destination;
 * Mist -> entry. Enrolment resolution: `?enrollment=` pre-selects; else exactly
 * one active enrolment goes straight in, several raise a named chooser, none
 * routes honestly back to the detail. Boot is ONE fetchPlayerState read with the
 * header seeded from cache; the canvas opens at the resume pointer; the rail
 * shows order/required/ticks. Prev/next paints from the in-memory payload
 * (optimistic advance, B5) while `enter` fires as a background auto-save whose
 * failure surfaces a non-blocking retry and never blocks the paint. A non-active
 * enrolment renders one honest state, no step affordances. Red-first for
 * TASK-JB-04 (fails until @/app/journeys/[id]/play/page exists).
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
let searchParams: { get: (key: string) => string | null };
const replace = jest.fn();
const router = { replace, push: jest.fn() };

const fetchPlayerState = jest.fn<(id: string) => Promise<PlayerState>>();
const peekPlayerState = jest.fn<(id: string) => PlayerState | null>();
const enterStep = jest.fn<(e: string, s: string) => Promise<unknown>>();
const completeStep = jest.fn<(e: string, s: string) => Promise<unknown>>();

const peekJourneyCatalog = jest.fn<() => unknown[] | null>();
const peekMyJourneyEnrollments = jest.fn<() => MyEnrollment[] | null>();
const fetchMyJourneyEnrollments = jest.fn<() => Promise<MyEnrollment[]>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ id: 'j1' }),
  useSearchParams: () => searchParams,
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
jest.mock('@/lib/observability/telemetry', () => ({ emitTelemetry: jest.fn() }));
jest.mock('@/lib/journeys/player', () => ({
  fetchPlayerState: (id: string) => fetchPlayerState(id),
  peekPlayerState: (id: string) => peekPlayerState(id),
  enterStep: (e: string, s: string) => enterStep(e, s),
  completeStep: (e: string, s: string) => completeStep(e, s),
}));
jest.mock('@/lib/journeys/client', () => ({
  peekJourneyCatalog: () => peekJourneyCatalog(),
  peekMyJourneyEnrollments: () => peekMyJourneyEnrollments(),
  fetchMyJourneyEnrollments: () => fetchMyJourneyEnrollments(),
  JourneysApiError: class JourneysApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import JourneyPlayerPage from '@/app/journeys/[id]/play/page';

const STATE = (over: Partial<PlayerState> = {}): PlayerState => ({
  enrollment_id: 'e1',
  status: 'active',
  sequencing_mode: 'linear',
  journey: { id: 'j1', title: 'Leadership Fundamentals', description: 'Lead.' },
  steps: [
    { id: 's1', step_order: 1, title: 'Orient', kind: 'content', family: 'text', ask_verb: 'Read', required: true, repeatable: false, duration_minutes: 10, content: { body: 'Welcome' } },
    { id: 's2', step_order: 2, title: 'Reflect', kind: 'reflection', family: 'prompt', ask_verb: 'Reflect', required: false, repeatable: false, duration_minutes: 15, content: { body: 'Consider' } },
    { id: 's3', step_order: 3, title: 'Act', kind: 'activity', family: 'task', ask_verb: 'Do', required: true, repeatable: false, duration_minutes: 20, content: null },
  ],
  instances: [{ instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: 't' }],
  resume_step_id: 's2',
  ...over,
});

const withParam = () => {
  searchParams = { get: (k) => (k === 'enrollment' ? 'e1' : null) };
};

beforeEach(() => {
  jest.clearAllMocks();
  authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
  searchParams = { get: () => null };
  peekPlayerState.mockReturnValue(null);
  peekJourneyCatalog.mockReturnValue(null);
  peekMyJourneyEnrollments.mockReturnValue(null);
  fetchPlayerState.mockResolvedValue(STATE());
  fetchMyJourneyEnrollments.mockResolvedValue([]);
  enterStep.mockResolvedValue({ instance_id: 'x', step_id: 's', created_at: 't', completed_at: null });
  completeStep.mockResolvedValue({ instance_id: 'c', step_id: 's', created_at: 't', completed_at: 't' });
});

describe('STORY-1 — the FIM gate', () => {
  it('redirects a sessionless visitor to sign-in, destination (with enrolment) preserved', async () => {
    withParam();
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<JourneyPlayerPage />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/login?redirect=/journeys/j1/play?enrollment=e1'),
    );
  });

  it('redirects a Mist to the entry', async () => {
    withParam();
    authState = { user: { id: 'm1' }, identity: 'mist', loading: false };
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});

describe('STORY-1/5 — boot, one read, resume, cache-seeded header', () => {
  it('boots at the resume pointer with the rail (order/required/ticks) from a single read', async () => {
    withParam();
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // Resume pointer is s2 -> the canvas opens on "Reflect".
    expect(screen.getByTestId('step-canvas').textContent).toContain('Reflect');
    // Rail: all three steps, s1 ticked (completed instance), required marks present.
    const rail = screen.getByTestId('step-rail');
    expect(rail.querySelectorAll('[data-testid^="rail-step-"]')).toHaveLength(3);
    expect(rail.querySelector('[data-testid="rail-step-s1"] [data-testid="rail-tick"]')).toBeTruthy();
    expect(rail.querySelector('[data-testid="rail-step-s2"] [data-testid="rail-tick"]')).toBeNull();
    expect(fetchPlayerState).toHaveBeenCalledTimes(1);
    expect(fetchPlayerState).toHaveBeenCalledWith('e1');
  });

  it('seeds the header title from the cached catalogue card before the payload lands (B3)', () => {
    withParam();
    peekJourneyCatalog.mockReturnValue([
      { id: 'j1', title: 'Leadership Fundamentals', description: null, difficulty_level: null, estimated_duration_minutes: null, tags: [], step_count: 3 },
    ]);
    fetchPlayerState.mockReturnValue(new Promise(() => {})); // payload never lands
    render(<JourneyPlayerPage />);
    expect(screen.getAllByText('Leadership Fundamentals').length).toBeGreaterThan(0);
    // The canvas waits for the real payload — no step affordances before it.
    expect(screen.queryByTestId('journey-player')).toBeNull();
  });

  it('paints the canvas instantly from the per-enrolment cache on a revisit (B4)', () => {
    withParam();
    peekPlayerState.mockReturnValue(STATE());
    fetchPlayerState.mockReturnValue(new Promise(() => {})); // revalidation still in flight
    render(<JourneyPlayerPage />);
    expect(screen.getByTestId('journey-player')).toBeTruthy();
    expect(screen.getByTestId('step-canvas').textContent).toContain('Reflect');
  });

  it('opens the player at the first step when there is no prior progress (resume falls to step one)', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(STATE({ resume_step_id: 's1', instances: [] }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    expect(screen.getByTestId('step-canvas').textContent).toContain('Orient');
    // First step -> no previous affordance (no wrap-around).
    expect(screen.queryByTestId('player-prev')).toBeNull();
    expect(screen.getByTestId('player-next')).toBeTruthy();
  });
});

describe('STORY-1 — enrolment disambiguation (no ?enrollment)', () => {
  const active = (over: Partial<MyEnrollment> = {}): MyEnrollment => ({
    enrollment_id: 'e1',
    kind: 'individual',
    journey_id: 'j1',
    journey_title: 'Leadership Fundamentals',
    status: 'active',
    last_accessed_at: null,
    ...over,
  });

  it('one active enrolment -> straight in (boots that enrolment)', async () => {
    fetchMyJourneyEnrollments.mockResolvedValue([active({ enrollment_id: 'eX' })]);
    fetchPlayerState.mockResolvedValue(STATE({ enrollment_id: 'eX' }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    expect(fetchPlayerState).toHaveBeenCalledWith('eX');
  });

  it('several active enrolments -> a named chooser; no player-state read until one is picked', async () => {
    fetchMyJourneyEnrollments.mockResolvedValue([
      active({ enrollment_id: 'e1', kind: 'individual' }),
      active({ enrollment_id: 'e2', kind: 'via_group', group_id: 'g1', group_name: 'Alpha Party' }),
    ]);
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('player-enrollment-chooser')).toBeTruthy());
    const options = screen.getAllByTestId('player-enrollment-option');
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.textContent)).toEqual(['Your own travel', 'Alpha Party']);
    expect(fetchPlayerState).not.toHaveBeenCalled();
    // Picking the via-group enrolment boots exactly it.
    fetchPlayerState.mockResolvedValue(STATE({ enrollment_id: 'e2' }));
    await act(async () => {
      fireEvent.click(options[1]);
    });
    await waitFor(() => expect(fetchPlayerState).toHaveBeenCalledWith('e2'));
  });

  it('no active enrolment -> honest redirect to the journey detail (never a broken shell)', async () => {
    fetchMyJourneyEnrollments.mockResolvedValue([active({ status: 'withdrawn' })]);
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/journeys/j1'));
    expect(fetchPlayerState).not.toHaveBeenCalled();
  });
});

describe('STORY-2/4 — linear walk with optimistic advance + background auto-save', () => {
  it('next paints the adjacent step from memory and fires enter in the background', async () => {
    withParam();
    enterStep.mockReturnValue(new Promise(() => {})); // background save still in flight
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // Boot at s2; next -> s3 paints immediately (no await), enter fires for s3.
    fireEvent.click(screen.getByTestId('player-next'));
    expect(screen.getByTestId('step-canvas').textContent).toContain('Act');
    expect(enterStep).toHaveBeenCalledWith('e1', 's3');
    // Previous -> back to s2, enter fires for s2.
    fireEvent.click(screen.getByTestId('player-prev'));
    expect(screen.getByTestId('step-canvas').textContent).toContain('Reflect');
    expect(enterStep).toHaveBeenCalledWith('e1', 's2');
  });

  it('the last step offers no next (no wrap-around)', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(STATE({ resume_step_id: 's3' }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    expect(screen.queryByTestId('player-next')).toBeNull();
    expect(screen.getByTestId('player-prev')).toBeTruthy();
  });

  it('a background-save failure raises a non-blocking retry; a later success clears it', async () => {
    withParam();
    enterStep.mockRejectedValueOnce(Object.assign(new Error('save failed'), { status: 500 }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // Navigate -> the step still painted (never blocked), then the save fails.
    fireEvent.click(screen.getByTestId('player-next'));
    expect(screen.getByTestId('step-canvas').textContent).toContain('Act'); // paint not blocked
    await waitFor(() => expect(screen.getByTestId('autosave-error')).toBeTruthy());
    // Retry succeeds -> the indicator clears.
    enterStep.mockResolvedValue({ instance_id: 'x', step_id: 's3', created_at: 't', completed_at: null });
    fireEvent.click(screen.getByTestId('autosave-retry'));
    await waitFor(() => expect(screen.queryByTestId('autosave-error')).toBeNull());
    expect(enterStep).toHaveBeenLastCalledWith('e1', 's3');
  });
});

describe('STORY-1 — non-active enrolment', () => {
  it('renders one honest state naming the status, with no step affordances', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(STATE({ status: 'frozen' }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('player-nonactive')).toBeTruthy());
    expect(screen.getByTestId('player-nonactive').textContent).toContain('frozen');
    expect(screen.queryByTestId('journey-player')).toBeNull();
    expect(screen.queryByTestId('player-next')).toBeNull();
  });
});

describe('STORY-3 — completion wiring (optimistic tick, gating, rollback)', () => {
  it('paints the tick optimistically before the completion contract resolves', async () => {
    withParam();
    completeStep.mockReturnValue(new Promise(() => {})); // never resolves -> pre-response paint
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // Boot at s2 (Reflect); s1 is required + completed so s2 is unlocked.
    fireEvent.click(screen.getByTestId('step-complete'));
    expect(screen.getByTestId('step-completed')).toBeTruthy(); // optimistic, pre-response
    expect(completeStep).toHaveBeenCalledWith('e1', 's2');
  });

  it('rolls the tick back with a retry surface when the completion contract fails', async () => {
    withParam();
    completeStep.mockRejectedValueOnce(Object.assign(new Error('save failed'), { status: 500 }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    fireEvent.click(screen.getByTestId('step-complete'));
    await waitFor(() => expect(screen.getByTestId('complete-error')).toBeTruthy());
    expect(screen.getByTestId('step-complete')).toBeTruthy(); // rolled back to completable
  });

  it('locks the current step and names the blocking required predecessor', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(STATE({ resume_step_id: 's3', instances: [] }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // s3 is required; s1 (required) is earlier and incomplete -> locked, naming "Orient".
    expect((screen.getByTestId('step-complete') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('step-lock-reason').textContent).toContain('Orient');
  });

  it('reconciles from a fresh read after a successful completion (the rail tick follows)', async () => {
    withParam();
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // After the write lands, the page re-reads: instances now include s2.
    fetchPlayerState.mockResolvedValue(
      STATE({
        instances: [
          { instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: 't' },
          { instance_id: 'i2', step_id: 's2', created_at: 't', completed_at: 't' },
        ],
      }),
    );
    fireEvent.click(screen.getByTestId('step-complete'));
    await waitFor(() =>
      expect(
        screen
          .getByTestId('step-rail')
          .querySelector('[data-testid="rail-step-s2"] [data-testid="rail-tick"]'),
      ).toBeTruthy(),
    );
    expect(completeStep).toHaveBeenCalledWith('e1', 's2');
  });
});

// --- FEAT-H021 (Cycle J-C) additions ----------------------------------------

const TIMING = {
  per_step: [{ step_id: 's1', seconds: 600 }],
  total_seconds: 1500,
  wall_clock: { enrolled_at: '2026-07-06T09:00:00+00:00', completed_at: '2026-07-08T10:00:00+00:00' },
};
const COMPLETE = {
  traveller_completed: true,
  traveller_completed_at: '2026-07-08T10:00:00+00:00',
  enrollment_status: 'completed',
  enrollment_completed_at: '2026-07-08T10:00:00+00:00',
};
const INCOMPLETE = {
  traveller_completed: false,
  traveller_completed_at: null,
  enrollment_status: 'active',
  enrollment_completed_at: null,
};

describe('FEAT-H021 STORY-1 — the completion moment renders on server confirm (JRN-12)', () => {
  it('renders the completion panel (total elapsed) only after journey_completed: true lands', async () => {
    withParam();
    fetchPlayerState.mockReset();
    // Boot: an active walk with timing, no completion yet -> no milestone.
    fetchPlayerState.mockResolvedValueOnce(STATE({ timing: TIMING }));
    // Reconcile after the completing save: the payload now reads complete.
    fetchPlayerState.mockResolvedValue(STATE({ status: 'completed', timing: TIMING, completion: COMPLETE }));
    completeStep.mockResolvedValue({
      instance_id: 'c', step_id: 's2', created_at: 't', completed_at: 't',
      journey_completed: true, completion: COMPLETE,
    });
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // The milestone is server-confirmed only — nothing before the save returns.
    expect(screen.queryByTestId('journey-completion-panel')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId('step-complete'));
    });
    await waitFor(() => expect(screen.getByTestId('journey-completion-panel')).toBeTruthy());
    expect(screen.getByTestId('journey-completion-panel').textContent).toContain('25 min');
    expect(screen.getByTestId('player-complete-header')).toBeTruthy();
  });

  it('shows no milestone when the completing save fails (server-confirmed only; the tick rolls back)', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(STATE({ timing: TIMING }));
    completeStep.mockRejectedValueOnce(Object.assign(new Error('save failed'), { status: 500 }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByTestId('step-complete'));
    });
    await waitFor(() => expect(screen.getByTestId('complete-error')).toBeTruthy());
    expect(screen.queryByTestId('journey-completion-panel')).toBeNull();
  });

  it('fires no moment on a non-final completion (journey_completed: false — the platform decides)', async () => {
    withParam();
    fetchPlayerState.mockReset();
    fetchPlayerState.mockResolvedValueOnce(STATE({ timing: TIMING }));
    fetchPlayerState.mockResolvedValue(STATE({ timing: TIMING, completion: INCOMPLETE }));
    completeStep.mockResolvedValue({
      instance_id: 'c', step_id: 's2', created_at: 't', completed_at: 't',
      journey_completed: false, completion: INCOMPLETE,
    });
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByTestId('step-complete'));
    });
    await waitFor(() => expect(completeStep).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-completion-panel')).toBeNull();
  });
});

const DONE_INSTANCES = [
  { instance_id: 'i1', step_id: 's1', created_at: 't', completed_at: 't' },
  { instance_id: 'i2', step_id: 's2', created_at: 't', completed_at: 't' },
  { instance_id: 'i3', step_id: 's3', created_at: 't', completed_at: 't' },
];

describe('FEAT-H021 STORY-2 — completed walks open in review (JRN-13)', () => {
  it('boots a completed enrolment into review posture — the bare status panel is gone', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({ status: 'completed', resume_step_id: 's3', timing: TIMING, completion: COMPLETE, instances: DONE_INSTANCES }),
    );
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // Review, not the H020 "not active" card.
    expect(screen.queryByTestId('player-nonactive')).toBeNull();
    expect(screen.getByTestId('journey-completion-panel')).toBeTruthy();
    // Every step navigable via the rail; content via the same renderer registry.
    expect(screen.getByTestId('step-rail').querySelectorAll('[data-testid^="rail-step-"]')).toHaveLength(3);
    expect(screen.getByTestId('player-prev')).toBeTruthy();
  });

  it('review navigation records NOTHING — the background enter is suppressed (asserted)', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({ status: 'completed', resume_step_id: 's3', timing: TIMING, completion: COMPLETE, instances: DONE_INSTANCES }),
    );
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // Boot at s3; navigating back to s2 paints, but records no engagement.
    fireEvent.click(screen.getByTestId('player-prev'));
    expect(screen.getByTestId('step-canvas').textContent).toContain('Reflect');
    expect(enterStep).not.toHaveBeenCalled();
  });

  it('the review-entry button never renders inert — absent when the canvas already sits on the first step', async () => {
    // Post-6-done fix (Stefan's live walk, 2026-07-08): a completed enrolment with no
    // step-instance record (the legacy-completed shape) boots at step one — the old
    // button rendered anyway and clicking it did nothing. No fake doors.
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({ status: 'completed', resume_step_id: 's1', timing: TIMING, completion: COMPLETE, instances: [] }),
    );
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-completion-panel')).toBeTruthy());
    expect(screen.queryByTestId('review-enter')).toBeNull();
  });

  it('the review entry returns the canvas to the first step, brings it into view, and retires itself', async () => {
    const scrollSpy = jest.fn();
    Element.prototype.scrollIntoView = scrollSpy; // jsdom has no implementation
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({ status: 'completed', resume_step_id: 's3', timing: TIMING, completion: COMPLETE, instances: DONE_INSTANCES }),
    );
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    fireEvent.click(screen.getByTestId('review-enter'));
    expect(screen.getByTestId('step-canvas').textContent).toContain('Orient');
    expect(scrollSpy).toHaveBeenCalled();
    // On the first step the affordance would be inert — it retires instead.
    expect(screen.queryByTestId('review-enter')).toBeNull();
    expect(enterStep).not.toHaveBeenCalled(); // review entry records nothing
  });

  it('an explicit re-engagement verb on a repeatable step still rides the normal complete path', async () => {
    withParam();
    const repeatable = STATE({
      status: 'completed',
      resume_step_id: 's2',
      timing: TIMING,
      completion: COMPLETE,
      instances: DONE_INSTANCES,
      steps: [
        { id: 's1', step_order: 1, title: 'Orient', kind: 'content', family: 'text', ask_verb: 'Read', required: true, repeatable: false, duration_minutes: 10, content: { body: 'Welcome' } },
        { id: 's2', step_order: 2, title: 'Reflect', kind: 'reflection', family: 'prompt', ask_verb: 'Reflect', required: false, repeatable: true, duration_minutes: 15, content: { body: 'Consider' } },
        { id: 's3', step_order: 3, title: 'Act', kind: 'activity', family: 'task', ask_verb: 'Do', required: true, repeatable: false, duration_minutes: 20, content: null },
      ],
    });
    fetchPlayerState.mockResolvedValue(repeatable);
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    // s2 is repeatable + already complete -> the verb is offered again; pressing it
    // rides enter-then-complete (the substrate admits it post-completion).
    fireEvent.click(screen.getByTestId('step-complete'));
    await waitFor(() => expect(completeStep).toHaveBeenCalledWith('e1', 's2'));
    expect(enterStep).toHaveBeenCalledWith('e1', 's2');
  });

  it('renders review from the completion block for a via-group walk though the row stays active', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({
        status: 'active',
        resume_step_id: 's3',
        timing: TIMING,
        completion: { traveller_completed: true, traveller_completed_at: 't', enrollment_status: 'active', enrollment_completed_at: null },
        instances: DONE_INSTANCES,
      }),
    );
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    expect(screen.getByTestId('journey-completion-panel')).toBeTruthy();
    expect(screen.queryByTestId('player-nonactive')).toBeNull();
  });

  it('keeps the honest status panel for frozen (even after completion) and withdrawn — review admits completed only', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({ status: 'frozen', timing: TIMING, completion: { ...COMPLETE, enrollment_status: 'frozen' }, instances: DONE_INSTANCES }),
    );
    const { unmount } = render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('player-nonactive')).toBeTruthy());
    expect(screen.queryByTestId('journey-completion-panel')).toBeNull();
    unmount();

    fetchPlayerState.mockResolvedValue(STATE({ status: 'withdrawn' }));
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('player-nonactive')).toBeTruthy());
    expect(screen.queryByTestId('journey-completion-panel')).toBeNull();
  });
});

describe('FEAT-H021 STORY-3 — per-step time on the rail in review (JRN-11)', () => {
  it('renders per-step engagement time from the timing block; an em-dash where none accrued', async () => {
    withParam();
    fetchPlayerState.mockResolvedValue(
      STATE({
        status: 'completed',
        resume_step_id: 's3',
        completion: COMPLETE,
        instances: DONE_INSTANCES,
        timing: {
          per_step: [{ step_id: 's1', seconds: 600 }, { step_id: 's3', seconds: 0 }],
          total_seconds: 600,
          wall_clock: { enrolled_at: '2026-07-06T09:00:00+00:00', completed_at: '2026-07-08T10:00:00+00:00' },
        },
      }),
    );
    render(<JourneyPlayerPage />);
    await waitFor(() => expect(screen.getByTestId('journey-player')).toBeTruthy());
    const rail = screen.getByTestId('step-rail');
    // s1 accrued 10 min; s2 has no entry -> em-dash; s3 has a zero-second entry -> em-dash (never "0 min").
    expect(rail.querySelector('[data-testid="rail-time-s1"]')?.textContent).toContain('10 min');
    expect(rail.querySelector('[data-testid="rail-time-s2"]')?.textContent).toContain('—');
    expect(rail.querySelector('[data-testid="rail-time-s3"]')?.textContent).toContain('—');
    expect(rail.querySelector('[data-testid="rail-time-s3"]')?.textContent).not.toContain('0 min');
  });
});
