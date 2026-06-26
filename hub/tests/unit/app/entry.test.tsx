import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import EntryPage from '@/app/page';

/**
 * FEAT-H003 STORY-1/2/3 (unit) — the sessionless FringeIsland entry.
 * Renders identity-aware doors; "Look around" is the deliberate enter-as-a-Mist
 * act (calls beginMist, routes to the Mist-presence landing on success). A FIM
 * sees no Mist chrome (no regression).
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
const beginMist = jest.fn(async () => ({ error: null as string | null }));

function mockAuth(identity: 'sessionless' | 'mist' | 'fim', beginMistImpl = beginMist) {
  jest.mocked(useAuth).mockReturnValue({
    user: null,
    session: null,
    loading: false,
    identity,
    signIn: jest.fn(),
    signUp: jest.fn(),
    beginMist: beginMistImpl,
    signOut: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  push.mockClear();
  beginMist.mockClear();
  jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
});

describe('FEAT-H003 STORY-1 (unit) — sessionless entry', () => {
  it('offers Sign in, Sign up, and Look around with no redirect', () => {
    mockAuth('sessionless');
    render(<EntryPage />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('button', { name: /look around/i })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe('FEAT-H003 STORY-2 (unit) — Look around materialises a Mist', () => {
  it('calls beginMist and routes to the Mist-presence landing on success', async () => {
    mockAuth('sessionless');
    render(<EntryPage />);

    await userEvent.click(screen.getByRole('button', { name: /look around/i }));

    expect(beginMist).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/mist'));
  });

  it('surfaces an inline error and does not route when entry fails', async () => {
    const failing = jest.fn(async () => ({ error: 'Anonymous sign-ins are disabled' }));
    mockAuth('sessionless', failing);
    render(<EntryPage />);

    await userEvent.click(screen.getByRole('button', { name: /look around/i }));

    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe('FEAT-H003 STORY-3 (unit) — a FIM sees no Mist chrome', () => {
  it('offers a continue-to-groups affordance and no Look around', () => {
    mockAuth('fim');
    render(<EntryPage />);

    expect(screen.getByRole('link', { name: /continue to your groups/i })).toHaveAttribute(
      'href',
      '/groups',
    );
    expect(screen.queryByRole('button', { name: /look around/i })).not.toBeInTheDocument();
  });
});
