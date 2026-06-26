import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import MistPresencePage from '@/app/mist/page';

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
    signOut: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  jest.mocked(useRouter).mockReturnValue({ push, replace } as unknown as ReturnType<
    typeof useRouter
  >);
});

describe('FEAT-H003 STORY-2 (unit) — Mist-presence landing', () => {
  it('shows a real beginning and the become-a-FIM CTA routing to sign-up', () => {
    mockAuth('mist');
    render(<MistPresencePage />);

    expect(screen.getByTestId('mist-presence')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /become a fim/i })).toHaveAttribute('href', '/signup');
    expect(replace).not.toHaveBeenCalled();
  });

  it('frames durable continuity as a property of becoming a FIM (STORY-4)', () => {
    mockAuth('mist');
    render(<MistPresencePage />);

    // The conversion incentive: lasting memory is the FIM reward.
    expect(screen.getByTestId('mist-presence')).toHaveTextContent(/become a fim to keep your journey/i);
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
