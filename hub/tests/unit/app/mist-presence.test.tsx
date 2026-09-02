import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import MistPresencePage from '@/app/mist/page';

const dropGhostSession = jest.fn<() => Promise<void>>();

/**
 * FEAT-H003 STORY-2/3/4 (unit) — the minimal-but-real Mist-presence landing.
 * Identity-level only (no town, no accretion visuals): a real beginning + the
 * become-a-FIM CTA framing durable continuity as a FIM property. Gated by status,
 * not a role string: a FIM is sent to /groups (no Mist chrome), a sessionless
 * visitor back to the entry.
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const fetchMyJourneyEnrollments = jest.fn<() => Promise<unknown[]>>();
const peekMyJourneyEnrollments = jest.fn<() => unknown[] | null>();
jest.mock('@/lib/journeys/client', () => ({
  fetchMyJourneyEnrollments: () => fetchMyJourneyEnrollments(),
  peekMyJourneyEnrollments: () => peekMyJourneyEnrollments(),
}));

const push = jest.fn();
const replace = jest.fn();

function mockAuth(identity: 'sessionless' | 'mist' | 'fim') {
  jest.mocked(useAuth).mockReturnValue({
    user: identity === 'sessionless' ? null : ({ is_anonymous: identity === 'mist' } as never),
    session: null,
    loading: false,
    identity,
    signIn: jest.fn(),
    signUp: jest.fn(),
    beginMist: jest.fn(),
    transcend: jest.fn(),
    sayGoodbye: jest.fn(),
    signOut: jest.fn(),
    dropGhostSession,
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  peekMyJourneyEnrollments.mockReturnValue(null);
  fetchMyJourneyEnrollments.mockReset().mockResolvedValue([]);
  jest.mocked(useRouter).mockReturnValue({ push, replace } as unknown as ReturnType<
    typeof useRouter
  >);
});

describe('FEAT-H003 STORY-2 (unit) — Mist-presence landing', () => {
  // TASK-MIST-01 — the ghost window: the walk resolution refuses with "no
  // resolvable actor" because the Mist behind this JWT no longer exists.
  // The door must not merely fall back to the catalogue; the session is
  // broken for good and is dropped. Red at head: the catch kept the fallback.
  it('a ghost Mist — the walk resolution refuses with no resolvable actor — drops the local session', async () => {
    mockAuth('mist');
    dropGhostSession.mockReset().mockResolvedValue(undefined);
    fetchMyJourneyEnrollments.mockRejectedValue(
      Object.assign(new Error('Not permitted'), { status: 403, code: 'no_resolvable_actor' }),
    );
    render(<MistPresencePage />);
    await waitFor(() => expect(dropGhostSession).toHaveBeenCalledTimes(1));
  });

  it('shows a real beginning and the become-a-FIM CTA opening the in-place flow', () => {
    mockAuth('mist');
    render(<MistPresencePage />);

    expect(screen.getByTestId('mist-presence')).toBeInTheDocument();
    // FEAT-H004 STORY-4: the CTA now opens the in-place transcendence flow, not a
    // bare /signup redirect.
    expect(screen.getByRole('link', { name: /become a fim/i })).toHaveAttribute(
      'href',
      '/become-a-fim',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('frames durable continuity as a property of becoming a FIM (STORY-4)', () => {
    mockAuth('mist');
    render(<MistPresencePage />);

    // The conversion incentive: lasting memory is the FIM reward.
    expect(screen.getByTestId('mist-presence')).toHaveTextContent(/become a fim to keep your journey/i);
  });
});

describe('J-O3 gate rider R4 (2026-07-19) — the continue-your-walk door', () => {
  // Stefan's felt-walk finding: "Your journeys" dropped a returning Mist into
  // the browse catalogue (their walk buried; every other card gated). The link
  // now resolves the Mist's one walk (a Mist can hold exactly one enrolment —
  // substrate-enforced) and goes straight into the player at their position;
  // the catalogue stays the honest fallback when no walk exists yet.
  it("'Your journeys' goes straight into the Mist's walk when one exists", async () => {
    mockAuth('mist');
    fetchMyJourneyEnrollments.mockResolvedValue([
      {
        enrollment_id: 'e1',
        kind: 'individual',
        journey_id: 'j-onboarding',
        journey_title: 'Arrival on FringeIsland',
        status: 'active',
        last_accessed_at: null,
      },
    ]);
    render(<MistPresencePage />);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /your journeys/i })).toHaveAttribute(
        'href',
        '/journeys/j-onboarding/play?enrollment=e1',
      ),
    );
  });

  it('a completed walk still opens (review posture rides the enrolment param)', async () => {
    mockAuth('mist');
    fetchMyJourneyEnrollments.mockResolvedValue([
      {
        enrollment_id: 'e2',
        kind: 'individual',
        journey_id: 'j-onboarding',
        journey_title: 'Arrival on FringeIsland',
        status: 'completed',
        last_accessed_at: null,
      },
    ]);
    render(<MistPresencePage />);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /your journeys/i })).toHaveAttribute(
        'href',
        '/journeys/j-onboarding/play?enrollment=e2',
      ),
    );
  });

  it('falls back to the catalogue when the Mist has no walk yet', async () => {
    mockAuth('mist');
    render(<MistPresencePage />);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /your journeys/i })).toHaveAttribute(
        'href',
        '/journeys',
      ),
    );
  });
});

describe('FEAT-H003 STORY-3 (unit) — status gating (no role strings)', () => {
  it('sends a FIM to /groups with no Mist chrome', async () => {
    mockAuth('fim');
    render(<MistPresencePage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/groups'));
    expect(screen.queryByTestId('mist-presence')).not.toBeInTheDocument();
  });

  it('sends a sessionless visitor back to the entry', async () => {
    mockAuth('sessionless');
    render(<MistPresencePage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByTestId('mist-presence')).not.toBeInTheDocument();
  });
});
