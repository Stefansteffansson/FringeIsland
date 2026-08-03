import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';

/**
 * FEAT-H038 STORY-4 (W-7, unit) — the session learns of suspension.
 * WRITTEN RED-FIRST against the walk finding: AccountStateContext reads account
 * state once per session; no soft-nav, focus, cadence, or refusal-triggered
 * re-check exists — a suspended member browses on boot-time "active" until a
 * hard load.
 *
 * The fix shape pinned here: throttled (≥30 s) background revalidation on
 * soft-nav (pathname change) and focus/visibility return, plus an exported
 * `requestAccountStateRecheck()` the write paths fire on a mapped 401/403.
 * Background checks never flip `loading` (no flash; the wall renders on
 * confirmed state only).
 */
const useAuthMock = jest.fn<() => unknown>();
const fetchAccountStateMock = jest.fn<() => Promise<unknown>>();
let pathname = '/groups';

jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: (...args: unknown[]) => (useAuthMock as unknown as (...a: unknown[]) => unknown)(...args),
}));
jest.mock('@/lib/account/client', () => ({
  fetchAccountState: (...args: unknown[]) =>
    (fetchAccountStateMock as unknown as (...a: unknown[]) => unknown)(...args),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import {
  AccountStateProvider,
  useAccountState,
  requestAccountStateRecheck,
} from '@/lib/account/AccountStateContext';

function Probe() {
  const { state, loading } = useAccountState();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="state">{state?.state ?? 'none'}</span>
    </div>
  );
}

const active = { is_active: true, is_decommissioned: false, state: 'active' };
const suspended = { is_active: false, is_decommissioned: false, state: 'suspended' };

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-08-03T12:00:00Z'));
  pathname = '/groups';
  useAuthMock.mockReset().mockReturnValue({ identity: 'fim', loading: false, signOut: jest.fn() });
  fetchAccountStateMock.mockReset().mockResolvedValue(active);
});

afterEach(() => {
  jest.useRealTimers();
});

const bootAndSettle = async () => {
  render(
    <AccountStateProvider>
      <Probe />
    </AccountStateProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId('state')).toHaveTextContent('active');
  expect(fetchAccountStateMock).toHaveBeenCalledTimes(1);
};

describe('FEAT-H038 STORY-4 — in-session account-state revalidation', () => {
  it('focus return after the throttle window triggers a background re-check that can wall the session', async () => {
    await bootAndSettle();

    fetchAccountStateMock.mockResolvedValue(suspended);
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchAccountStateMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('suspended'));
  });

  it('the throttle holds — a focus return inside 30 s re-checks nothing', async () => {
    await bootAndSettle();

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchAccountStateMock).toHaveBeenCalledTimes(1);
  });

  it('a soft-nav (pathname change) after the window triggers the background re-check', async () => {
    const view = render(
      <AccountStateProvider>
        <Probe />
      </AccountStateProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchAccountStateMock).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    pathname = '/journeys';
    view.rerender(
      <AccountStateProvider>
        <Probe />
      </AccountStateProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchAccountStateMock).toHaveBeenCalledTimes(2);
  });

  it('a background re-check never flips loading (no flash — the page stays rendered)', async () => {
    await bootAndSettle();

    let resolveFetch: (v: unknown) => void = () => {};
    fetchAccountStateMock.mockImplementation(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Mid-flight: the re-check is in the background — loading must stay false.
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('state')).toHaveTextContent('active');

    await act(async () => {
      resolveFetch(suspended);
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('suspended'));
  });

  it('requestAccountStateRecheck() fires immediately — the refusal-triggered path bypasses the throttle', async () => {
    await bootAndSettle();

    fetchAccountStateMock.mockResolvedValue(suspended);
    // No time has passed — a mapped 401/403 refusal demands the truth now.
    act(() => {
      requestAccountStateRecheck();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchAccountStateMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('suspended'));
  });

  it('a Mist session never revalidates (no durable account state to check)', async () => {
    useAuthMock.mockReturnValue({ identity: 'mist', loading: false, signOut: jest.fn() });
    render(
      <AccountStateProvider>
        <Probe />
      </AccountStateProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    act(() => {
      window.dispatchEvent(new Event('focus'));
      requestAccountStateRecheck();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchAccountStateMock).not.toHaveBeenCalled();
  });
});
