import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountStateView } from '@/components/account/AccountStateView';
import type { AccountState } from '@/lib/account/queries';

/**
 * FEAT-H006 — render account state (IDN-9). `AccountStateView` is the pure
 * branching surface: given the resolved identity + account state, it renders
 * either the normal experience (children) or the right account-state surface.
 * Suspended → "contact an admin", NO reactivation affordance (IDN-12 deferred);
 * decommissioned → terminal; Mist → pass-through; unknown → safe default.
 */
function st(state: string): AccountState {
  return {
    is_active: state === 'active',
    is_decommissioned: state === 'decommissioned',
    state,
  };
}

const children = <div data-testid="app-children">the normal experience</div>;
const noop = () => {};

describe('AccountStateView (FEAT-H006 — render account state)', () => {
  it('STORY-5: a Mist sees no account-state surface — children pass through', () => {
    render(
      <AccountStateView identity="mist" loading={false} error={null} state={null} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('app-children')).toBeInTheDocument();
    expect(screen.queryByTestId('account-suspended-surface')).not.toBeInTheDocument();
  });

  it('STORY-1: an active FIM is not interrupted — children render', () => {
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('active')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('app-children')).toBeInTheDocument();
    expect(screen.queryByTestId('account-suspended-surface')).not.toBeInTheDocument();
  });

  it('STORY-4: while loading, a loading state shows (never a blank-but-interactive shell)', () => {
    render(
      <AccountStateView identity="fim" loading error={null} state={null} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
  });

  it('STORY-4: on error, a retry surface shows and the active experience is NOT rendered', async () => {
    const onRetry = jest.fn();
    render(
      <AccountStateView
        identity="fim"
        loading={false}
        error="We could not load your account status."
        state={null}
        onRetry={onRetry}
        onSignOut={noop}
      >
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-error-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('STORY-2: a suspended FIM sees the suspended surface with NO reactivation affordance', () => {
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('suspended')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-suspended-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
    // No way back offered this cycle — self-reactivation (IDN-12) is deferred.
    expect(screen.queryByRole('button', { name: /reactivate/i })).not.toBeInTheDocument();
    // Not stranded — a sign-out affordance is present.
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('STORY-3: a decommissioned FIM sees a terminal closed surface, distinct from suspended, no reactivation', () => {
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('decommissioned')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-closed-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('account-suspended-surface')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reactivate/i })).not.toBeInTheDocument();
  });

  it('extensibility: an unknown/future state renders a safe default, not the active experience', () => {
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('paused')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-unknown-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
  });

  it('a non-active surface offers sign-out so the member is never trapped', async () => {
    const onSignOut = jest.fn();
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('suspended')} onRetry={noop} onSignOut={onSignOut}>
        {children}
      </AccountStateView>,
    );
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
