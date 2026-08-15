import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * TASK-IDN-01 — the decommissioned surface learns the grace window (red-first,
 * authored 2026-08-15 before the component exists).
 *
 * The old branch rendered one terminal card ("permanently closed — can't be
 * reopened"), which the grace ruling makes conditionally FALSE: a
 * member-origin deletion inside its 30-day window CAN be restored. The surface
 * now probes `get_own_restore_state` through the BFF and renders what the
 * substrate answers:
 *   - restorable      → the restore door, with the scheduled deletion date and
 *                       a "Sign out" exit (the account still exists — the
 *                       terminal label would lie)
 *   - not restorable  → the terminal closed card, exactly as before
 *   - probe pending   → a loading card (never a premature terminal claim)
 *   - probe failed    → the closed card WITH a retry — never a fake door,
 *                       never a trapped member
 * Origin logic stays platform-side (ADR-U038): the surface always probes; the
 * substrate answers restorable only for member-origin within the window.
 */

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const reload = jest.fn<() => Promise<void>>();
jest.mock('@/lib/account/AccountStateContext', () => ({
  useAccountState: () => ({ state: null, loading: false, error: null, reload: () => reload() }),
}));

const invalidateAllCaches = jest.fn();
jest.mock('@/lib/auth/cache-registry', () => ({
  invalidateAllCaches: () => invalidateAllCaches(),
}));

const fetchRestoreState = jest.fn<() => Promise<unknown>>();
const requestRestore = jest.fn<() => Promise<void>>();
jest.mock('@/lib/account/lifecycleClient', () => ({
  requestPause: jest.fn(),
  requestDelete: jest.fn(),
  requestReactivate: jest.fn(),
  fetchRestoreState: () => fetchRestoreState(),
  requestRestore: () => requestRestore(),
}));

import { DecommissionedAccountSurface } from '@/components/account/DecommissionedAccountSurface';

const restorable = {
  restorable: true,
  decommissioned_at: '2026-08-15T19:00:00Z',
  scheduled_deletion_at: '2026-09-14T19:00:00Z',
};
const closed = { restorable: false, scheduled_deletion_at: null };

beforeEach(() => {
  push.mockClear();
  reload.mockReset().mockResolvedValue(undefined);
  invalidateAllCaches.mockClear();
  fetchRestoreState.mockReset();
  requestRestore.mockReset().mockResolvedValue(undefined);
});

const noop = () => {};

describe('DecommissionedAccountSurface (TASK-IDN-01 — the restore door)', () => {
  it('a restorable account gets the door: the date, a restore affordance, and a Sign out exit', async () => {
    fetchRestoreState.mockResolvedValue(restorable);
    render(<DecommissionedAccountSurface onSignOut={noop} />);

    expect(await screen.findByTestId('account-restorable-surface')).toBeInTheDocument();
    // The date is named (exact formatting is locale-shaped; the year pins it).
    expect(screen.getByTestId('account-restorable-surface')).toHaveTextContent(/2026/);
    expect(screen.getByTestId('restore-account')).toBeInTheDocument();
    // The account still exists — the exit reads "Sign out", never the
    // terminal "Return to the front page".
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /return to the front page/i }),
    ).not.toBeInTheDocument();
  });

  it('the restore flow: confirm names the act, then restore → caches dropped → state re-read → home', async () => {
    fetchRestoreState.mockResolvedValue(restorable);
    render(<DecommissionedAccountSurface onSignOut={noop} />);

    await userEvent.click(await screen.findByTestId('restore-account'));
    // Never a browser dialog — the house ConfirmModal, naming the restore.
    await userEvent.click(screen.getByRole('button', { name: /^restore$/i }));

    expect(requestRestore).toHaveBeenCalledTimes(1);
    expect(invalidateAllCaches).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/groups');
  });

  it('a restore refusal keeps the member here with the honest reason — never a false success', async () => {
    fetchRestoreState.mockResolvedValue(restorable);
    requestRestore.mockRejectedValue(
      new Error('restore_own_account: the grace window has closed — this account is scheduled for permanent deletion'),
    );
    render(<DecommissionedAccountSurface onSignOut={noop} />);

    await userEvent.click(await screen.findByTestId('restore-account'));
    await userEvent.click(screen.getByRole('button', { name: /^restore$/i }));

    expect(await screen.findByTestId('restore-error')).toHaveTextContent(/grace window has closed/i);
    expect(push).not.toHaveBeenCalled();
  });

  it('a non-restorable account gets the terminal closed card, exactly as before', async () => {
    fetchRestoreState.mockResolvedValue(closed);
    render(<DecommissionedAccountSurface onSignOut={noop} />);

    expect(await screen.findByTestId('account-closed-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('restore-account')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to the front page/i })).toBeInTheDocument();
  });

  it('while the probe is in flight, a loading card — never a premature terminal claim', async () => {
    fetchRestoreState.mockReturnValue(new Promise(() => {}));
    render(<DecommissionedAccountSurface onSignOut={noop} />);

    expect(screen.getByTestId('account-restore-probe-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('account-closed-surface')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-restorable-surface')).not.toBeInTheDocument();
  });

  it('a failed probe falls back to the closed card with a retry — no fake door, no trap', async () => {
    fetchRestoreState.mockRejectedValueOnce(new Error('network')).mockResolvedValue(restorable);
    render(<DecommissionedAccountSurface onSignOut={noop} />);

    expect(await screen.findByTestId('account-closed-surface')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('account-restorable-surface')).toBeInTheDocument();
    expect(fetchRestoreState).toHaveBeenCalledTimes(2);
  });
});
