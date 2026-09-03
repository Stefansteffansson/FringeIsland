import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AccountStateView } from '@/components/account/AccountStateView';
import type { AccountState } from '@/lib/account/queries';

/**
 * FEAT-H049 STORY-3 (DB-4, IDN-13) — the suspended-account surface says why.
 * The FEAT-PC030 `suspension_reason` from the account-state read renders as
 * "The reason given: …" above the sign-out exit; "contact support" stays the
 * way out; null renders the surface exactly as before.
 * WRITTEN RED-FIRST (2026-09-03): the view ignores `suspension_reason` at head.
 */
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/account/AccountStateContext', () => ({
  useAccountState: () => ({ state: null, loading: false, error: null, reload: jest.fn() }),
}));
jest.mock('@/lib/account/lifecycleClient', () => ({
  requestPause: jest.fn(),
  requestDelete: jest.fn(),
  requestReactivate: jest.fn(),
  requestRestore: jest.fn(),
  fetchRestoreState: jest.fn(() => Promise.resolve({ restorable: false, scheduled_deletion_at: null })),
}));

const suspended = (reason: string | null | undefined): AccountState => ({
  is_active: false,
  is_decommissioned: false,
  deactivation_origin: 'admin',
  state: 'suspended',
  ...(reason === undefined ? {} : { suspension_reason: reason }),
});

const children = <div data-testid="app-children">the normal experience</div>;
const noop = () => {};

describe('AccountStateView — the suspended surface says why (FEAT-H049 STORY-3)', () => {
  it('renders "The reason given: …" with the reason, and keeps the contact-support exit', () => {
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={suspended('Terms breach')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-suspended-surface')).toBeInTheDocument();
    expect(screen.getByTestId('suspension-reason')).toHaveTextContent('The reason given: Terms breach');
    expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
  });

  it('renders no reason line when suspension_reason is null or absent — the surface as it was', () => {
    const { unmount } = render(
      <AccountStateView identity="fim" loading={false} error={null} state={suspended(null)} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-suspended-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('suspension-reason')).not.toBeInTheDocument();
    unmount();
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={suspended(undefined)} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.queryByTestId('suspension-reason')).not.toBeInTheDocument();
  });
});
