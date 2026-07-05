import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PendingNomination } from '@/lib/groups/leadership';

/**
 * FEAT-H017 STORY-2 (unit) — the nominee's pending-nomination affordance on
 * /groups. Sourced from the scoped own-notifications read (the A-NTF re-home
 * seam — NOT an inbox); shows the group and the 7-day window; Accept and
 * Decline are both ConfirmModal-gated; outcomes are relayed never predicted —
 * accept → "you are now the Steward", decline → "passed on" WITHOUT naming
 * next-nominee-vs-FringeIsland (the contract decides); the expired/answered
 * 409 renders and the affordance resolves. No pending nominations → no
 * section at all. Red-first for TASK-H017-02.
 */

const fetchMyNominations = jest.fn<() => Promise<PendingNomination[]>>();
const respondToNomination = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  fetchMyNominations: () => fetchMyNominations(),
  respondToNomination: (...a: unknown[]) => respondToNomination(...a),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { PendingNominations } from '@/components/groups/PendingNominations';

const NOMINATION: PendingNomination = {
  notification_id: 'ntf-1',
  group_id: 'grp-1',
  group_name: 'The Reading Circle',
  created_at: '2026-07-05T10:00:00+00:00',
  expires_at: '2026-07-12T10:00:00+00:00',
};

describe('FEAT-H017 — PendingNominations (STORY-2)', () => {
  const onAnswered = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMyNominations.mockResolvedValue([NOMINATION]);
    respondToNomination.mockResolvedValue({ outcome: 'accepted' });
  });

  it('shows the group and the response window', async () => {
    render(<PendingNominations onAnswered={onAnswered} />);
    expect(await screen.findByText(/The Reading Circle/)).toBeTruthy();
    // The window is shown (contract-enforced) — never a client countdown.
    expect(screen.getByText(/respond by/i)).toBeTruthy();
  });

  it('renders nothing at all when there is no pending nomination', async () => {
    fetchMyNominations.mockResolvedValue([]);
    const { container } = render(<PendingNominations onAnswered={onAnswered} />);
    await waitFor(() => expect(fetchMyNominations).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="pending-nominations"]')).toBeNull();
  });

  it('Accept is ConfirmModal-gated, relays the outcome, and hands the page its refresh', async () => {
    fetchMyNominations.mockResolvedValueOnce([NOMINATION]).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<PendingNominations onAnswered={onAnswered} />);
    await user.click(await screen.findByTestId('accept-nomination-ntf-1'));
    expect(respondToNomination).not.toHaveBeenCalled(); // modal first
    await user.click(screen.getByRole('button', { name: /accept stewardship/i }));
    await waitFor(() =>
      expect(respondToNomination).toHaveBeenCalledWith('ntf-1', true),
    );
    // The relayed outcome — the contract's guaranteed postcondition.
    expect(await screen.findByText(/you are now the steward/i)).toBeTruthy();
    expect(onAnswered).toHaveBeenCalled();
  });

  it('Decline relays "passed on" without naming next-nominee-vs-FringeIsland', async () => {
    fetchMyNominations.mockResolvedValueOnce([NOMINATION]).mockResolvedValueOnce([]);
    respondToNomination.mockResolvedValue({ outcome: 'passed_to_next' });
    const user = userEvent.setup();
    render(<PendingNominations onAnswered={onAnswered} />);
    await user.click(await screen.findByTestId('decline-nomination-ntf-1'));
    await user.click(screen.getByRole('button', { name: /decline nomination/i }));
    await waitFor(() =>
      expect(respondToNomination).toHaveBeenCalledWith('ntf-1', false),
    );
    const note = await screen.findByText(/passed on/i);
    // The contract decides the routing; the Surface never names it.
    expect(note.textContent).not.toMatch(/FringeIsland|next nominee|DeusEx/i);
  });

  it('an expired/answered nomination shows the mapped 409 and the affordance resolves', async () => {
    fetchMyNominations.mockResolvedValueOnce([NOMINATION]).mockResolvedValueOnce([]);
    const { GroupsApiError } = jest.requireMock('@/lib/groups/client') as {
      GroupsApiError: new (m: string, s: number) => Error;
    };
    respondToNomination.mockRejectedValue(
      new GroupsApiError('This nomination has expired.', 409),
    );
    const user = userEvent.setup();
    render(<PendingNominations onAnswered={onAnswered} />);
    await user.click(await screen.findByTestId('accept-nomination-ntf-1'));
    await user.click(screen.getByRole('button', { name: /accept stewardship/i }));
    expect(await screen.findByText(/expired/i)).toBeTruthy();
    // Resolved: the re-read drops the row.
    await waitFor(() =>
      expect(screen.queryByTestId('accept-nomination-ntf-1')).toBeNull(),
    );
  });
});
