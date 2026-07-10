import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { JourneyCard, MyEnrollment } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-1 (unit) — the /journeys catalogue page.
 * FIM-only per the journal pattern: sessionless → sign-in with destination
 * preserved; Mist → entry (the Mist journey surface is J-E's). Cards render
 * catalogue fields in payload order (stable, non-ranking); the Enrolled badge
 * derives from the my-enrolments read (individual OR via-group); zero
 * published journeys is an honest empty state; loading is the deferred
 * skeleton grid, never a spinner-first screen (B6). Vocabulary-tolerant
 * difficulty rendering. Red-first for TASK-JA-06.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const replace = jest.fn();
const router = { replace, push: jest.fn() };

const fetchJourneyCatalog = jest.fn<() => Promise<JourneyCard[]>>();
const fetchMyJourneyEnrollments = jest.fn<() => Promise<MyEnrollment[]>>();
const peekJourneyCatalog = jest.fn<() => JourneyCard[] | null>();
const peekMyJourneyEnrollments = jest.fn<() => MyEnrollment[] | null>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
jest.mock('@/components/ui/SkeletonGrid', () => ({
  SkeletonGrid: () => <div data-testid="journeys-skeleton" />,
}));
jest.mock('@/lib/journeys/client', () => ({
  fetchJourneyCatalog: () => fetchJourneyCatalog(),
  fetchMyJourneyEnrollments: () => fetchMyJourneyEnrollments(),
  peekJourneyCatalog: () => peekJourneyCatalog(),
  peekMyJourneyEnrollments: () => peekMyJourneyEnrollments(),
}));

import JourneysPage from '@/app/journeys/page';

const CARD = (over: Partial<JourneyCard> = {}): JourneyCard => ({
  id: 'j1',
  title: 'Leadership Fundamentals',
  description: 'Learn to lead.',
  difficulty_level: 'beginner',
  estimated_duration_minutes: 120,
  tags: ['leadership'],
  step_count: 4,
  ...over,
});

describe('FEAT-H019 — /journeys catalogue page (STORY-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    peekJourneyCatalog.mockReturnValue(null);
    peekMyJourneyEnrollments.mockReturnValue(null);
    fetchJourneyCatalog.mockResolvedValue([CARD()]);
    fetchMyJourneyEnrollments.mockResolvedValue([]);
  });

  it('redirects a sessionless visitor to sign-in, destination preserved', async () => {
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<JourneysPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=/journeys'));
  });

  it('admits a Mist — their journeys list is where onboarding stays reachable (H023, ADR-U045)', async () => {
    // J-E flips the pre-U045 redirect: a Mist walks exactly one journey
    // (onboarding), and H023 STORY-3 requires it deliberately resumable from
    // the journeys list. The substrate reads (catalogue, my-enrolments) are
    // actor-gated, Mist-callable contracts.
    authState = { user: { id: 'm1' }, identity: 'mist', loading: false };
    render(<JourneysPage />);
    await waitFor(() => expect(fetchJourneyCatalog).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders the skeleton grid (never a spinner) while the first read is in flight', () => {
    fetchJourneyCatalog.mockReturnValue(new Promise(() => {}));
    render(<JourneysPage />);
    expect(screen.getByTestId('journeys-skeleton')).toBeTruthy();
  });

  it('renders cards with catalogue fields, linking to the detail', async () => {
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByTestId('journeys-list')).toBeTruthy());
    expect(screen.getByText('Leadership Fundamentals')).toBeTruthy();
    expect(screen.getByText('Learn to lead.')).toBeTruthy();
    expect(screen.getByText(/beginner/i)).toBeTruthy();
    expect(screen.getByText(/120 min/)).toBeTruthy();
    expect(screen.getByText('leadership')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Leadership Fundamentals' });
    expect(link.getAttribute('href')).toBe('/journeys/j1');
  });

  it('badges journeys the caller is enrolled in — individually or via a group', async () => {
    fetchJourneyCatalog.mockResolvedValue([CARD(), CARD({ id: 'j2', title: 'Second' }), CARD({ id: 'j3', title: 'Third' })]);
    fetchMyJourneyEnrollments.mockResolvedValue([
      { enrollment_id: 'e1', kind: 'individual', journey_id: 'j1', journey_title: 'Leadership Fundamentals', status: 'active', last_accessed_at: null },
      { enrollment_id: 'e2', kind: 'via_group', journey_id: 'j2', journey_title: 'Second', status: 'active', last_accessed_at: null, group_id: 'g1', group_name: 'Party' },
    ]);
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByTestId('journeys-list')).toBeTruthy());
    const badges = screen.getAllByTestId('enrolled-badge');
    expect(badges).toHaveLength(2);
    expect(screen.getByTestId('journey-card-j3').textContent).not.toContain('Enrolled');
  });

  it('shows an honest empty state (no error styling) for zero published journeys', async () => {
    fetchJourneyCatalog.mockResolvedValue([]);
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
    expect(screen.queryByTestId('inline-error')).toBeNull();
  });

  it('renders an unknown difficulty string plainly (vocabulary-tolerant)', async () => {
    fetchJourneyCatalog.mockResolvedValue([CARD({ difficulty_level: 'mythic' })]);
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByText(/mythic/i)).toBeTruthy());
  });
});

describe('FEAT-H021 STORY-4 — Review where active offers Continue, on the cards', () => {
  it('offers Continue on an active enrolment and Review on a completed one — each deep-linked', async () => {
    fetchJourneyCatalog.mockResolvedValue([CARD({ id: 'j1' }), CARD({ id: 'j2', title: 'Second' })]);
    fetchMyJourneyEnrollments.mockResolvedValue([
      { enrollment_id: 'e1', kind: 'individual', journey_id: 'j1', journey_title: 'Leadership Fundamentals', status: 'active', last_accessed_at: null },
      { enrollment_id: 'e2', kind: 'individual', journey_id: 'j2', journey_title: 'Second', status: 'completed', last_accessed_at: null },
    ]);
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByTestId('journeys-list')).toBeTruthy());
    const cont = screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-continue"]');
    expect(cont?.getAttribute('href')).toBe('/journeys/j1/play?enrollment=e1');
    const review = screen.getByTestId('journey-card-j2').querySelector('[data-testid="card-review"]');
    expect(review?.getAttribute('href')).toBe('/journeys/j2/play?enrollment=e2');
    // The affordance swaps on status — never both on one enrolment.
    expect(screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-review"]')).toBeNull();
    expect(screen.getByTestId('journey-card-j2').querySelector('[data-testid="card-continue"]')).toBeNull();
  });

  it('offers neither Continue nor Review on a withdrawn enrolment (re-enrolment stays the only door)', async () => {
    fetchJourneyCatalog.mockResolvedValue([CARD({ id: 'j1' })]);
    fetchMyJourneyEnrollments.mockResolvedValue([
      { enrollment_id: 'e1', kind: 'individual', journey_id: 'j1', journey_title: 'Leadership Fundamentals', status: 'withdrawn', last_accessed_at: null },
    ]);
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByTestId('journeys-list')).toBeTruthy());
    expect(screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-continue"]')).toBeNull();
    expect(screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-review"]')).toBeNull();
  });
});

describe('FEAT-H022 STORY-1 — View opens the read-only frozen walk, on the cards', () => {
  it('offers View on a frozen enrolment, deep-linked — never Continue or Review', async () => {
    fetchJourneyCatalog.mockResolvedValue([CARD({ id: 'j1' })]);
    fetchMyJourneyEnrollments.mockResolvedValue([
      { enrollment_id: 'e1', kind: 'via_group', journey_id: 'j1', journey_title: 'Leadership Fundamentals', status: 'frozen', last_accessed_at: null, group_id: 'g1', group_name: 'Alpha Party' },
    ]);
    render(<JourneysPage />);
    await waitFor(() => expect(screen.getByTestId('journeys-list')).toBeTruthy());
    const view = screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-view"]');
    expect(view?.getAttribute('href')).toBe('/journeys/j1/play?enrollment=e1');
    expect(view?.textContent).toContain('Alpha Party');
    expect(screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-continue"]')).toBeNull();
    expect(screen.getByTestId('journey-card-j1').querySelector('[data-testid="card-review"]')).toBeNull();
  });
});
