import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConsentState, ConsentEffectiveEntry } from '@/lib/consent/queries';

/**
 * FEAT-H009 — grant/withdraw orchestration (IDN-7 consent half). ConsentPanel
 * owns the decision-change flow: a control opens a ConfirmModal (never a browser
 * dialog); on confirm it POSTs (FEAT-PC007) and RE-READS effective state
 * (FEAT-PC006, the single source of truth — never an optimistic local flip); a
 * failure surfaces a clear error and leaves the decision as it was.
 */
const fetchConsentState = jest.fn<() => Promise<ConsentState>>();
const postConsentDecision = jest.fn<() => Promise<ConsentEffectiveEntry>>();

jest.mock('@/lib/consent/client', () => ({
  fetchConsentState: () => fetchConsentState(),
  postConsentDecision: (...args: unknown[]) =>
    (postConsentDecision as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { ConsentPanel } from '@/components/consent/ConsentPanel';

function analytics(decision: string | null): ConsentEffectiveEntry {
  return {
    purpose: 'product_analytics',
    label: 'Product analytics',
    description: 'Optional analytics.',
    decision,
    policy_version: decision ? 'v1' : null,
    decided_at: decision ? '2026-06-01T10:00:00Z' : null,
    withdrawable: true,
    current_policy_version: 'v1',
    needs_reconsent: false,
  };
}
const TRANSCENDENCE: ConsentEffectiveEntry = {
  purpose: 'transcendence',
  label: 'Becoming a member',
  description: null,
  decision: 'granted',
  policy_version: 'v1',
  decided_at: '2026-06-01T10:00:00Z',
  withdrawable: false,
  current_policy_version: 'v1',
  needs_reconsent: false,
};
const stateWith = (a: ConsentEffectiveEntry): ConsentState => ({
  effective: [TRANSCENDENCE, a],
  history: [],
});

const analyticsRow = () => screen.getByTestId('consent-effective-row-product_analytics');

beforeEach(() => {
  fetchConsentState.mockReset().mockResolvedValue(stateWith(analytics(null)));
  postConsentDecision.mockReset().mockResolvedValue(analytics('granted'));
});

describe('ConsentPanel (FEAT-H009 — grant/withdraw orchestration)', () => {
  it('STORY-4: choosing a control opens a ConfirmModal (never a browser dialog) and makes no call yet', async () => {
    render(<ConsentPanel />);
    await screen.findByTestId('consent-effective-row-product_analytics');

    await userEvent.click(within(analyticsRow()).getByRole('button', { name: /grant/i }));

    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/product analytics/i);
    expect(postConsentDecision).not.toHaveBeenCalled();
  });

  it('STORY-1: confirming a grant POSTs the decision and re-reads effective state (no optimistic flip)', async () => {
    fetchConsentState
      .mockResolvedValueOnce(stateWith(analytics(null))) // initial
      .mockResolvedValueOnce(stateWith(analytics('granted'))); // re-read after the write
    render(<ConsentPanel />);
    await screen.findByTestId('consent-effective-row-product_analytics');

    await userEvent.click(within(analyticsRow()).getByRole('button', { name: /grant/i }));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() =>
      expect(postConsentDecision).toHaveBeenCalledWith('product_analytics', 'granted'),
    );
    // Authoritative re-read drives the new state — fetch called twice (initial + re-read).
    await waitFor(() => expect(fetchConsentState).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(analyticsRow()).getByText(/granted/i)).toBeInTheDocument());
    // modal closed after success
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('STORY-2: confirming a withdraw POSTs withdrawn and the row reflects it after the re-read', async () => {
    fetchConsentState
      .mockResolvedValueOnce(stateWith(analytics('granted'))) // initial: granted
      .mockResolvedValueOnce(stateWith(analytics('withdrawn'))); // re-read
    postConsentDecision.mockResolvedValue(analytics('withdrawn'));
    render(<ConsentPanel />);
    await screen.findByTestId('consent-effective-row-product_analytics');

    await userEvent.click(within(analyticsRow()).getByRole('button', { name: /withdraw/i }));
    // withdrawal copy is explicit about re-granting later
    expect(screen.getByTestId('confirm-modal')).toHaveTextContent(/again later/i);
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() =>
      expect(postConsentDecision).toHaveBeenCalledWith('product_analytics', 'withdrawn'),
    );
    await waitFor(() => expect(within(analyticsRow()).getByText(/withdrawn/i)).toBeInTheDocument());
  });

  it('STORY-4: cancelling the ConfirmModal makes no call and leaves the decision unchanged', async () => {
    render(<ConsentPanel />);
    await screen.findByTestId('consent-effective-row-product_analytics');

    await userEvent.click(within(analyticsRow()).getByRole('button', { name: /grant/i }));
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));

    expect(postConsentDecision).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    // still undecided — no optimistic flip
    expect(within(analyticsRow()).getByText(/not yet decided/i)).toBeInTheDocument();
  });

  it('STORY-5: a failed write shows a clear error and does NOT flip the decision (no false success)', async () => {
    postConsentDecision.mockRejectedValue(new Error('This consent cannot be withdrawn'));
    render(<ConsentPanel />);
    await screen.findByTestId('consent-effective-row-product_analytics');

    await userEvent.click(within(analyticsRow()).getByRole('button', { name: /grant/i }));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(screen.getByTestId('consent-action-error')).toBeInTheDocument());
    // never re-read on failure; the decision visibly stays as it was
    expect(fetchConsentState).toHaveBeenCalledTimes(1);
    expect(within(analyticsRow()).getByText(/not yet decided/i)).toBeInTheDocument();
  });
});
