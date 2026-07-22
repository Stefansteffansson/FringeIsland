import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountStateView } from '@/components/account/AccountStateView';
import type { AccountState } from '@/lib/account/queries';

/**
 * FEAT-H006 — render account state (IDN-9; paused branch added at C-F).
 * `AccountStateView` is the pure branching surface: given the resolved
 * identity + account state, it renders either the normal experience (children)
 * or the right account-state surface. Paused (member-origin, ADR-U050) → the
 * PausedAccountSurface hosting FEAT-H007's reactivation; suspended (admin
 * hold) → "contact an admin", NO reactivation affordance; decommissioned →
 * terminal; Mist → pass-through; unknown → safe default.
 */

// The paused branch renders PausedAccountSurface (client), which pulls the
// account-state provider + router; stub both — this file tests the VIEW's
// branching, PausedAccountSurface.test.tsx tests the surface's own flow.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/account/AccountStateContext', () => ({
  useAccountState: () => ({ state: null, loading: false, error: null, reload: jest.fn() }),
}));

function st(state: string): AccountState {
  return {
    is_active: state === 'active',
    is_decommissioned: state === 'decommissioned',
    // ADR-U050: paused is exactly the member-origin off state.
    deactivation_origin: state === 'paused' ? 'member' : state === 'active' ? null : 'admin',
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

  it('STORY-4 (revised 2026-07-01): while the read is in flight, the page renders optimistically — no blocking "Checking your account" gate', () => {
    // Non-blocking gate (perf Tier 1): in flight (loading, no state yet, no error)
    // the page renders immediately so the account-state read no longer serializes
    // the page's own fetches. The blocking "Checking your account…" loading screen
    // is gone.
    render(
      <AccountStateView identity="fim" loading error={null} state={null} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('app-children')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
  });

  it('STORY-4 (revised): a stale off-state does NOT flash while a reload is in flight — children render optimistically', () => {
    // During reload() the provider sets loading=true but a previous `state` may
    // linger; render optimistically until the fresh read settles rather than
    // flashing the old surface.
    render(
      <AccountStateView identity="fim" loading error={null} state={st('suspended')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('app-children')).toBeInTheDocument();
    expect(screen.queryByTestId('account-suspended-surface')).not.toBeInTheDocument();
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
    // Walk wording fix (A-COM 2026-07-22, Stefan's fix-now disposition): the
    // account is GONE — "Sign out" would contradict the card ("sign out of
    // what?"). The exit still ends the residual browser session (the tab is
    // never trapped), but the closed card names the outcome, not the plumbing.
    // Paused/suspended keep "Sign out", where a live account makes it accurate.
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to the front page/i })).toBeInTheDocument();
  });

  it('C-F (FEAT-H007 host): a paused FIM sees the paused surface WITH the reactivation affordance', () => {
    // ADAPTATION (C-F, labelled): 'paused' was this file's unknown-label probe;
    // it is now a real branch (ADR-U050) — the probe moved to 'hibernating'.
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('paused')} onRetry={noop} onSignOut={noop}>
        {children}
      </AccountStateView>,
    );
    expect(screen.getByTestId('account-paused-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
    expect(screen.getByTestId('reactivate-account')).toBeInTheDocument();
  });

  it('extensibility: an unknown/future state renders a safe default, not the active experience', () => {
    render(
      <AccountStateView identity="fim" loading={false} error={null} state={st('hibernating')} onRetry={noop} onSignOut={noop}>
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
