import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H006 — the account-state data resolution (IDN-9). `AccountStateProvider`
 * resolves the caller's own account state ONCE per session via the FEAT-PC004
 * client contract — but only for a FIM (a Mist/sessionless identity has no
 * durable account-lifecycle state). Failures are surfaced (never swallowed) and
 * V4 telemetry is emitted for both the rendered state and read failures.
 */
const useAuthMock = jest.fn<() => unknown>();
const fetchAccountStateMock = jest.fn<() => Promise<unknown>>();

jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: (...args: unknown[]) => (useAuthMock as unknown as (...a: unknown[]) => unknown)(...args),
}));
jest.mock('@/lib/account/client', () => ({
  fetchAccountState: (...args: unknown[]) =>
    (fetchAccountStateMock as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { AccountStateProvider, useAccountState } from '@/lib/account/AccountStateContext';

function Probe() {
  const { state, loading, error } = useAccountState();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="state">{state?.state ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  useAuthMock.mockReset();
  fetchAccountStateMock.mockReset();
});

describe('AccountStateProvider (FEAT-H006 data resolution)', () => {
  it('fetches account state for a FIM and exposes it (+ telemetry)', async () => {
    useAuthMock.mockReturnValue({ identity: 'fim', loading: false, signOut: jest.fn() });
    fetchAccountStateMock.mockResolvedValue({ is_active: false, is_decommissioned: false, state: 'suspended' });

    render(
      <AccountStateProvider>
        <Probe />
      </AccountStateProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('suspended'));
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(
      getTelemetrySink().some((e) => e.name === 'account.state_rendered' && e.props?.state === 'suspended'),
    ).toBe(true);
  });

  it('does NOT fetch for a Mist — passes through with no state', async () => {
    useAuthMock.mockReturnValue({ identity: 'mist', loading: false, signOut: jest.fn() });

    render(
      <AccountStateProvider>
        <Probe />
      </AccountStateProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('state')).toHaveTextContent('none');
    expect(fetchAccountStateMock).not.toHaveBeenCalled();
  });

  it('surfaces an error (and emits failure telemetry) when the read fails', async () => {
    useAuthMock.mockReturnValue({ identity: 'fim', loading: false, signOut: jest.fn() });
    fetchAccountStateMock.mockRejectedValue(new Error('boom'));

    render(
      <AccountStateProvider>
        <Probe />
      </AccountStateProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/could not load/i));
    expect(screen.getByTestId('state')).toHaveTextContent('none');
    expect(getTelemetrySink().some((e) => e.name === 'account.state_render_failed')).toBe(true);
  });
});
