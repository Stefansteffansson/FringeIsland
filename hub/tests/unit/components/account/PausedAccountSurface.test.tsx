import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H007 — the paused surface's reactivation flow (IDN-12, built at C-F).
 * STORY-1 (reactivate from the paused surface), STORY-3 (confirmation before
 * reactivating), STORY-4 (failure handled cleanly), STORY-5 (re-read then land
 * in the active experience).
 *
 * COVERAGE LABELLED TEST-AFTER (C-F): written after the surface, from the
 * FEAT-H007 acceptance criteria; the platform half's demonstrated-red lives
 * at the integration tier (PC005 STORY-6). Not claimed as red-first TDD.
 */
const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const reload = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.mock('@/lib/account/AccountStateContext', () => ({
  useAccountState: () => ({ state: null, loading: false, error: null, reload }),
}));

const requestReactivate = jest.fn<() => Promise<void>>();
jest.mock('@/lib/account/lifecycleClient', () => ({
  requestPause: jest.fn(),
  requestDelete: jest.fn(),
  requestReactivate: () => requestReactivate(),
}));

const invalidateAllCaches = jest.fn();
jest.mock('@/lib/auth/cache-registry', () => ({
  registerCacheInvalidator: jest.fn(),
  invalidateAllCaches: () => invalidateAllCaches(),
}));

import { PausedAccountSurface } from '@/components/account/PausedAccountSurface';

beforeEach(() => {
  requestReactivate.mockReset().mockResolvedValue(undefined);
  reload.mockClear();
  push.mockClear();
  invalidateAllCaches.mockClear();
});

describe('PausedAccountSurface (FEAT-H007)', () => {
  it('STORY-1/3: reactivate asks through a ConfirmModal; confirm calls the contract, re-reads state, lands home', async () => {
    render(<PausedAccountSurface onSignOut={() => {}} />);
    expect(screen.getByTestId('account-paused-surface')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('reactivate-account'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(requestReactivate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(requestReactivate).toHaveBeenCalledTimes(1);
    // STORY-5: the state is re-resolved via FEAT-PC004 (never hand-rolled),
    // then the member lands on their groups/home.
    expect(reload).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/groups');
  });

  it('STORY-3: cancelling makes no call and stays on the paused surface', async () => {
    render(<PausedAccountSurface onSignOut={() => {}} />);
    await userEvent.click(screen.getByTestId('reactivate-account'));
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(requestReactivate).not.toHaveBeenCalled();
    expect(screen.getByTestId('account-paused-surface')).toBeInTheDocument();
  });

  it('STORY-4: a failed reactivation shows a clear error on the paused surface with retry — never a false active render', async () => {
    requestReactivate.mockRejectedValue(new Error('this account is under an admin hold'));
    render(<PausedAccountSurface onSignOut={() => {}} />);
    await userEvent.click(screen.getByTestId('reactivate-account'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(await screen.findByTestId('reactivate-error')).toHaveTextContent('admin hold');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('reactivate-account')).toBeEnabled();
  });

  /**
   * RIDER-4 (A-COM live walk, 2026-07-22) — red-first against the live defect.
   * Server-evidenced sequence (postgres log + audit log, 14:26:33-37 UTC): an
   * overview-bundle read fired while PAUSED adopted 42501-refusal slices into
   * the consume-once bootstrap cache; nothing consumed them under the gate;
   * the post-reactivate /groups mount then consumed a stale pause-era
   * rejection and painted "Failed to load your invitations." on a healthy
   * account (third instance of the stale-consume-once class — see
   * OverviewBoot's 2026-07-10 fix comment). The pause→active flip must be a
   * cache boundary: on reactivate success, drop every registered session
   * cache (adopted slices + the overview latch) BEFORE landing on /groups.
   */
  it('RIDER-4: reactivation is a cache boundary — session caches drop on success, before landing', async () => {
    const order: string[] = [];
    invalidateAllCaches.mockImplementation(() => order.push('invalidate'));
    push.mockImplementation(() => order.push('push'));
    render(<PausedAccountSurface onSignOut={() => {}} />);
    await userEvent.click(screen.getByTestId('reactivate-account'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(invalidateAllCaches).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['invalidate', 'push']);
  });

  it('RIDER-4: a failed reactivation drops nothing — pause-era caches stay consistent with the gate', async () => {
    requestReactivate.mockRejectedValue(new Error('nope'));
    render(<PausedAccountSurface onSignOut={() => {}} />);
    await userEvent.click(screen.getByTestId('reactivate-account'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await screen.findByTestId('reactivate-error');
    expect(invalidateAllCaches).not.toHaveBeenCalled();
  });

  it('the paused member is never stranded — sign-out is offered', async () => {
    const onSignOut = jest.fn();
    render(<PausedAccountSurface onSignOut={onSignOut} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
