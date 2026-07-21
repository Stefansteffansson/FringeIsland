import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H029 — the account-area lifecycle section (IDN-10, C-F).
 * STORY-1 (pause behind ConfirmModal), STORY-4 (affordances know their place),
 * STORY-5 (failure leaves me whole — pause half).
 *
 * COVERAGE LABELLED TEST-AFTER (C-F): the surface was written spec-first from
 * the FEAT-H029 acceptance criteria; this cycle's demonstrated-red lives at
 * the integration tier (the PC017 suite). Not claimed as red-first TDD.
 */
const reload = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
let mockState: { state: string } | null = { state: 'active' };
jest.mock('@/lib/account/AccountStateContext', () => ({
  useAccountState: () => ({ state: mockState, loading: false, error: null, reload }),
}));

const requestPause = jest.fn<() => Promise<void>>();
jest.mock('@/lib/account/lifecycleClient', () => ({
  requestPause: () => requestPause(),
  requestDelete: jest.fn(),
  requestReactivate: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

import { AccountLifecycleSection } from '@/components/account/AccountLifecycleSection';

beforeEach(() => {
  mockState = { state: 'active' };
  requestPause.mockReset().mockResolvedValue(undefined);
  reload.mockClear();
});

describe('AccountLifecycleSection (FEAT-H029)', () => {
  it('STORY-1: pause asks through a ConfirmModal, calls the contract on confirm, then re-reads state', async () => {
    render(<AccountLifecycleSection />);
    await userEvent.click(screen.getByTestId('pause-account'));
    // The ConfirmModal (never a browser dialog) opens; no call yet.
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(requestPause).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(requestPause).toHaveBeenCalledTimes(1);
    // The truth is re-read via FEAT-PC004 — never assumed.
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('STORY-1: cancelling the ConfirmModal makes no call and changes nothing', async () => {
    render(<AccountLifecycleSection />);
    await userEvent.click(screen.getByTestId('pause-account'));
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(requestPause).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('STORY-2: the delete ceremony opens only behind its own deliberate affordance', async () => {
    render(<AccountLifecycleSection />);
    expect(screen.queryByTestId('delete-account-ceremony')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('open-delete-ceremony'));
    expect(screen.getByTestId('delete-account-ceremony')).toBeInTheDocument();
  });

  it('STORY-4: renders nothing for a non-active account state', () => {
    mockState = { state: 'suspended' };
    render(<AccountLifecycleSection />);
    expect(screen.queryByTestId('account-lifecycle-section')).not.toBeInTheDocument();
  });

  it('STORY-4: renders nothing while the state read has not resolved', () => {
    mockState = null;
    render(<AccountLifecycleSection />);
    expect(screen.queryByTestId('account-lifecycle-section')).not.toBeInTheDocument();
  });

  it('STORY-5: a failed pause surfaces an honest error and stays put', async () => {
    requestPause.mockRejectedValue(new Error('this account is under an admin hold'));
    render(<AccountLifecycleSection />);
    await userEvent.click(screen.getByTestId('pause-account'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(await screen.findByTestId('pause-error')).toHaveTextContent('admin hold');
    // No false transition: the section is still here (state unchanged).
    expect(screen.getByTestId('account-lifecycle-section')).toBeInTheDocument();
  });
});
