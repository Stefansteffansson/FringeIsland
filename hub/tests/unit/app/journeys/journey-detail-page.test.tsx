import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { JourneyDetail } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-2 (unit) — the /journeys/[id] detail page gate + honesty
 * states. Sessionless → sign-in with destination; Mist → entry; FIM → the
 * journey fields, the steps overview (title/kind/duration — no content), and
 * the enrolment block (its flows are tested in
 * journey-enrollment-panel.test.tsx); a 404 from the BFF renders the house
 * not-found (unpublished and absent indistinguishable); unknown step-kind
 * strings render plainly. Red-first for TASK-JA-07.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const replace = jest.fn();
const router = { replace, push: jest.fn() };

const fetchJourneyDetail = jest.fn<(id: string) => Promise<JourneyDetail>>();
const fetchMyJourneyEnrollments = jest.fn<() => Promise<unknown[]>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ id: 'j1' }),
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
jest.mock('@/components/journeys/JourneyEnrollmentPanel', () => ({
  JourneyEnrollmentPanel: ({ journey }: { journey: JourneyDetail }) => (
    <div data-testid="enrollment-panel" data-journey={journey.id} />
  ),
}));
jest.mock('@/lib/journeys/client', () => ({
  fetchJourneyDetail: (id: string) => fetchJourneyDetail(id),
  fetchMyJourneyEnrollments: () => fetchMyJourneyEnrollments(),
  JourneysApiError: class JourneysApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import JourneyDetailPage from '@/app/journeys/[id]/page';
import { JourneysApiError } from '@/lib/journeys/client';

const DETAIL: JourneyDetail = {
  id: 'j1',
  title: 'Leadership Fundamentals',
  description: 'Learn to lead.',
  difficulty_level: 'beginner',
  estimated_duration_minutes: 120,
  tags: ['leadership'],
  step_count: 2,
  steps: [
    { title: 'Orient', kind: 'content', duration_minutes: 10 },
    { title: 'Try it', kind: 'ritual-of-the-mist', duration_minutes: 30 },
  ],
  is_enrolled_individually: false,
  enrolled_via: [],
  enrollable_groups: [],
};

describe('FEAT-H019 — /journeys/[id] page (STORY-2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    fetchJourneyDetail.mockResolvedValue(DETAIL);
    fetchMyJourneyEnrollments.mockResolvedValue([]);
  });

  it('redirects a sessionless visitor to sign-in, destination preserved', async () => {
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<JourneyDetailPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=/journeys/j1'));
  });

  it('redirects a Mist to the entry', async () => {
    authState = { user: { id: 'm1' }, identity: 'mist', loading: false };
    render(<JourneyDetailPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('renders the journey fields, the steps overview, and the enrolment block', async () => {
    render(<JourneyDetailPage />);
    await waitFor(() => expect(screen.getByText('Leadership Fundamentals')).toBeTruthy());
    expect(screen.getByText('Learn to lead.')).toBeTruthy();
    const steps = screen.getByTestId('steps-overview');
    expect(steps.textContent).toContain('Orient');
    expect(steps.textContent).toContain('10 min');
    // Vocabulary-tolerant: an unknown step kind renders plainly, no crash.
    expect(steps.textContent).toContain('ritual-of-the-mist');
    expect(screen.getByTestId('enrollment-panel')).toBeTruthy();
  });

  it('never renders step content payloads (titles/kind/duration only)', async () => {
    render(<JourneyDetailPage />);
    await waitFor(() => expect(screen.getByTestId('steps-overview')).toBeTruthy());
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('renders the house not-found on a BFF 404 — unpublished and absent indistinguishable', async () => {
    fetchJourneyDetail.mockRejectedValue(new JourneysApiError('Journey not found', 404));
    render(<JourneyDetailPage />);
    await waitFor(() => expect(screen.getByTestId('journey-not-found')).toBeTruthy());
    expect(screen.queryByTestId('enrollment-panel')).toBeNull();
  });
});
