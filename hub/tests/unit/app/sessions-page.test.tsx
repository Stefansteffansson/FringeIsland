import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * FEAT-H012 STORY-1 (unit) — the /sessions page gate.
 *
 * HONESTY LABEL: **test-after** coverage (the page was authored from the
 * /journal gate pattern before this test existed — never claimed as TDD).
 * Asserts the three identity branches: sessionless → login with destination,
 * Mist → the entry, FIM → the panel mounts.
 */

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

let authState: {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => authState,
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/sessions/SessionsPanel', () => ({
  SessionsPanel: () => <div data-testid="sessions-panel" />,
}));

import SessionsPage from '@/app/sessions/page';

describe('FEAT-H012 — /sessions page gate (test-after)', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it('sends a sessionless visitor to login with the destination preserved', async () => {
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<SessionsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=/sessions'));
  });

  it('sends a Mist to the entry — no sessions surface for a Mist', async () => {
    authState = { user: { id: 'mist-1' }, identity: 'mist', loading: false };
    render(<SessionsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByTestId('sessions-panel')).not.toBeInTheDocument();
  });

  it('mounts the panel for a FIM and redirects nowhere', async () => {
    authState = { user: { id: 'fim-1' }, identity: 'fim', loading: false };
    render(<SessionsPage />);
    expect(await screen.findByTestId('sessions-panel')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
