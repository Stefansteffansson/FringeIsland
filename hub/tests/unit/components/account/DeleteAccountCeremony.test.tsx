import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H029 — the delete ceremony (IDN-10; C-F board F-2/F-3).
 * STORY-2 (deliberate, informed, type-to-confirm), STORY-3 (farewell on
 * confirmed success only), STORY-5 (failure leaves me whole).
 *
 * COVERAGE LABELLED TEST-AFTER (C-F): written after the surface, from the
 * FEAT-H029 acceptance criteria; the cycle's demonstrated-red lives at the
 * integration tier. Not claimed as red-first TDD.
 */
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
}));

const requestDelete = jest.fn<() => Promise<void>>();
jest.mock('@/lib/account/lifecycleClient', () => ({
  requestPause: jest.fn(),
  requestDelete: () => requestDelete(),
  requestReactivate: jest.fn(),
}));

import {
  DeleteAccountCeremony,
  DELETE_CONFIRM_PHRASE,
} from '@/components/account/DeleteAccountCeremony';

beforeEach(() => {
  requestDelete.mockReset().mockResolvedValue(undefined);
  replace.mockClear();
});

describe('DeleteAccountCeremony (FEAT-H029)', () => {
  it('STORY-2: states the F-2 split honestly and offers the export before any destructive control', () => {
    render(<DeleteAccountCeremony onCancel={() => {}} />);
    const consequences = screen.getByTestId('delete-consequences');
    expect(consequences).toHaveTextContent(/erased/i);
    expect(consequences).toHaveTextContent(/Former member/i);
    expect(consequences).toHaveTextContent(/cannot be undone/i);
    // The export offer is a working path to the FEAT-H010 download.
    expect(screen.getByTestId('delete-export-offer')).toHaveAttribute(
      'href',
      '/api/account/export',
    );
  });

  it('STORY-2: the destructive control stays disabled until the exact phrase is typed', async () => {
    render(<DeleteAccountCeremony onCancel={() => {}} />);
    const confirm = screen.getByTestId('delete-account-confirm');
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByTestId('delete-confirm-input'), 'delete my acc');
    expect(confirm).toBeDisabled();

    await userEvent.clear(screen.getByTestId('delete-confirm-input'));
    await userEvent.type(screen.getByTestId('delete-confirm-input'), DELETE_CONFIRM_PHRASE);
    expect(confirm).toBeEnabled();
  });

  it('STORY-2/3: a matched phrase + click calls the contract exactly once, then lands on the farewell', async () => {
    render(<DeleteAccountCeremony onCancel={() => {}} />);
    await userEvent.type(screen.getByTestId('delete-confirm-input'), DELETE_CONFIRM_PHRASE);
    await userEvent.click(screen.getByTestId('delete-account-confirm'));
    expect(requestDelete).toHaveBeenCalledTimes(1);
    // Farewell only on confirmed success (never optimistic).
    expect(replace).toHaveBeenCalledWith('/farewell');
  });

  it('STORY-5: a refused delete shows the honest error, no farewell, retry possible', async () => {
    requestDelete.mockRejectedValue(new Error('this account is under an admin hold'));
    render(<DeleteAccountCeremony onCancel={() => {}} />);
    await userEvent.type(screen.getByTestId('delete-confirm-input'), DELETE_CONFIRM_PHRASE);
    await userEvent.click(screen.getByTestId('delete-account-confirm'));
    expect(await screen.findByTestId('delete-error')).toHaveTextContent('admin hold');
    expect(replace).not.toHaveBeenCalled();
    // The control is usable again — retry, not a stranded state.
    expect(screen.getByTestId('delete-account-confirm')).toBeEnabled();
  });

  it('cancel closes the ceremony without any call', async () => {
    const onCancel = jest.fn();
    render(<DeleteAccountCeremony onCancel={onCancel} />);
    await userEvent.click(screen.getByTestId('delete-account-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(requestDelete).not.toHaveBeenCalled();
  });
});
