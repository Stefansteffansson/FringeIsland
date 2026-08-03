import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccountState } from '@/lib/account/queries';

/**
 * FEAT-H038 STORY-2 (W-10, unit) — the wall's exit is explicit.
 * WRITTEN RED-FIRST against the walk finding: the suspended wall's Sign-out
 * button ends the session but never navigates — the member stays parked on the
 * wall's URL and the button reads as part of the error.
 *
 * The fix shape pinned here: the suspended wall's exit affordance reads
 * "Sign out to use another account", and activating it runs the
 * sign-out-then-navigate idiom (AccountMenu.tsx:84-95) landing on /login.
 */

const signOut = jest.fn<() => Promise<void>>();
const router = { push: jest.fn(), replace: jest.fn() };
let accountState: {
  state: AccountState | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-susp' }, identity: 'fim', signOut }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/lib/account/AccountStateContext', () => ({
  useAccountState: () => accountState,
}));

import { AccountStateGate } from '@/components/account/AccountStateGate';

beforeEach(() => {
  signOut.mockReset().mockResolvedValue();
  router.push.mockReset();
  router.replace.mockReset();
  accountState = {
    state: { state: 'suspended' } as AccountState,
    loading: false,
    error: null,
    reload: jest.fn(),
  };
});

describe('FEAT-H038 STORY-2 — the suspended wall exits explicitly', () => {
  it('the exit affordance reads as the way out, distinct from the error body', () => {
    render(
      <AccountStateGate>
        <div data-testid="app">the app</div>
      </AccountStateGate>,
    );
    expect(screen.getByTestId('account-suspended-surface')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign out to use another account/i }),
    ).toBeInTheDocument();
  });

  it('activating the exit ends the session AND lands on /login (sign-out-then-navigate)', async () => {
    render(
      <AccountStateGate>
        <div />
      </AccountStateGate>,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /sign out to use another account/i }),
    );
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    // The idiom: navigate first (optimistic), end the session, then replace to
    // make the landing deterministic even if a guard raced the flip.
    expect(router.push).toHaveBeenCalledWith('/login');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  it('the error wall keeps its retry and gains no navigation surprise (bare sign-out stays)', async () => {
    accountState = { state: null, loading: false, error: 'boom', reload: jest.fn() };
    render(
      <AccountStateGate>
        <div />
      </AccountStateGate>,
    );
    expect(screen.getByTestId('account-error-surface')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
