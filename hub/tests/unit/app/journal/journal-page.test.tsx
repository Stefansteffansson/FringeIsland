import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * FEAT-H011 STORY-4 (unit) — the /journal surface gate.
 * FIM-only: a sessionless visitor is sent to sign-in (destination preserved),
 * a Mist is sent to the entry (the FEAT-H004 transcendence-invitation pattern),
 * and only a FIM mounts the panel. Red-first for TASK-H011-02.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const replace = jest.fn();
const router = { replace, push: jest.fn() };

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="shell" data-title={title}>
      {children}
    </div>
  ),
}));
jest.mock('@/components/journal/JournalPanel', () => ({
  JournalPanel: () => <div data-testid="journal-panel" />,
}));

import JournalPage from '@/app/journal/page';

describe('FEAT-H011 — /journal page gate (STORY-4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects a sessionless visitor to sign-in, preserving the destination', async () => {
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<JournalPage />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login?redirect=/journal');
    });
    expect(screen.queryByTestId('journal-panel')).not.toBeInTheDocument();
  });

  it('redirects a Mist to the entry — the journal is FIM life', async () => {
    authState = { user: { id: 'mist-1' }, identity: 'mist', loading: false };
    render(<JournalPage />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/');
    });
    expect(screen.queryByTestId('journal-panel')).not.toBeInTheDocument();
  });

  it('shows a loading state while auth resolves — never a frozen or premature surface', () => {
    authState = { user: null, identity: 'sessionless', loading: true };
    render(<JournalPage />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('journal-panel')).not.toBeInTheDocument();
  });

  it('mounts the journal panel for a FIM', () => {
    authState = { user: { id: 'fim-1' }, identity: 'fim', loading: false };
    render(<JournalPage />);
    expect(screen.getByTestId('journal-panel')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
