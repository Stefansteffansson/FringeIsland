import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MyInvitation } from '@/lib/groups/invitations';

/**
 * FEAT-H015 STORY-4 (unit) — my invitations on /groups.
 * The invitation CONTEXT only (group name/description, inviter, when — never
 * group detail); Accept joins and hands the page its re-read (one refresh);
 * Decline is ConfirmModal-gated; no pending invitations → no section at all
 * (no empty-state noise on the primary page). Auto-claimed invitations render
 * identically — the component cannot tell the difference, by design.
 * Red-first for TASK-H015-02.
 */

const fetchMyInvitations = jest.fn<() => Promise<MyInvitation[]>>();
const acceptInvitation = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const declineInvitation = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  fetchMyInvitations: () => fetchMyInvitations(),
  acceptInvitation: (...a: unknown[]) => acceptInvitation(...a),
  declineInvitation: (...a: unknown[]) => declineInvitation(...a),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { MyInvitations } from '@/components/groups/MyInvitations';

const MINE: MyInvitation[] = [
  {
    group_id: 'grp-1',
    group_name: 'The Reading Circle',
    group_description: 'slow books, fast friends',
    is_public: false,
    invited_at: '2026-07-04T10:00:00+00:00',
    invited_by_display_name: 'GCInviterPerson',
  },
];

describe('FEAT-H015 — MyInvitations (STORY-4)', () => {
  const onAnswered = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMyInvitations.mockResolvedValue(MINE);
    acceptInvitation.mockResolvedValue(undefined);
    declineInvitation.mockResolvedValue(undefined);
  });

  it('renders the invitation context: group name, description, inviter', async () => {
    render(<MyInvitations onAnswered={onAnswered} />);
    expect(await screen.findByText('The Reading Circle')).toBeTruthy();
    expect(screen.getByText(/slow books, fast friends/)).toBeTruthy();
    expect(screen.getByText(/GCInviterPerson/)).toBeTruthy();
  });

  it('renders nothing at all when there are no pending invitations', async () => {
    fetchMyInvitations.mockResolvedValue([]);
    const { container } = render(<MyInvitations onAnswered={onAnswered} />);
    await waitFor(() => expect(fetchMyInvitations).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="my-invitations"]')).toBeNull();
  });

  it('Accept joins: calls the transport, re-reads, and hands the page its refresh', async () => {
    fetchMyInvitations.mockResolvedValueOnce(MINE).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<MyInvitations onAnswered={onAnswered} />);
    await user.click(await screen.findByTestId('accept-invitation-grp-1'));
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith('grp-1'));
    expect(onAnswered).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('The Reading Circle')).toBeNull(),
    );
  });

  it('Decline is ConfirmModal-gated; the entry leaves, the groups list is untouched', async () => {
    fetchMyInvitations.mockResolvedValueOnce(MINE).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<MyInvitations onAnswered={onAnswered} />);
    await user.click(await screen.findByTestId('decline-invitation-grp-1'));
    const modal = screen.getByTestId('confirm-modal');
    await user.click(within(modal).getByText('Decline invitation'));
    await waitFor(() => expect(declineInvitation).toHaveBeenCalledWith('grp-1'));
    await waitFor(() => expect(screen.queryByText('The Reading Circle')).toBeNull());
    expect(onAnswered).not.toHaveBeenCalled();
  });

  it('a load failure shows a quiet inline error, never a broken section', async () => {
    fetchMyInvitations.mockRejectedValue(new Error('boom'));
    render(<MyInvitations onAnswered={onAnswered} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('the group name links to the group page (post-6-done fix — look before you answer)', async () => {
    render(<MyInvitations onAnswered={onAnswered} />);
    const link = (await screen.findByRole('link', { name: 'The Reading Circle' })) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/groups/grp-1');
  });
});
