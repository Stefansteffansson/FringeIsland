import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H018 STORY-2 (unit) — "Invite a group" (the Steward's admission door).
 * Gated by the page on the already-fetched invite_members key; the typeahead
 * relays `search_invitable_groups` hits (cap 8 contract-side); refusal copy
 * (cycle / duplicate / self) renders verbatim in place. Red-first for
 * TASK-H018-02.
 */

const searchInvitableGroupsClient = jest.fn<() => Promise<Array<{ id: string; name: string }>>>();
const inviteGroupClient = jest.fn<() => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  searchInvitableGroupsClient: (...a: unknown[]) =>
    (searchInvitableGroupsClient as unknown as (...x: unknown[]) => unknown)(...a),
  inviteGroupClient: (...a: unknown[]) =>
    (inviteGroupClient as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { InviteGroupPanel } from '@/components/groups/InviteGroupPanel';

describe('FEAT-H018 — InviteGroupPanel (STORY-2)', () => {
  const onMutated = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('searches and invites a hit, then re-reads', async () => {
    const user = userEvent.setup();
    searchInvitableGroupsClient.mockResolvedValue([{ id: 'a1', name: 'Familjen' }]);
    inviteGroupClient.mockResolvedValue({ membership_id: 'm1' });
    render(<InviteGroupPanel groupId="b1" onMutated={onMutated} />);

    await user.type(screen.getByTestId('invite-group-query'), 'Fam');
    await user.click(screen.getByTestId('invite-group-search'));
    await user.click(await screen.findByTestId('invite-group-hit-a1'));

    expect(inviteGroupClient).toHaveBeenCalledWith('b1', 'a1');
    expect(onMutated).toHaveBeenCalled();
  });

  it('renders the cycle refusal verbatim in place', async () => {
    const user = userEvent.setup();
    searchInvitableGroupsClient.mockResolvedValue([{ id: 'a1', name: 'Familjen' }]);
    inviteGroupClient.mockRejectedValue(
      new Error('this group already belongs to the invited group — a membership cycle is not allowed'),
    );
    render(<InviteGroupPanel groupId="b1" onMutated={onMutated} />);

    await user.type(screen.getByTestId('invite-group-query'), 'Fam');
    await user.click(screen.getByTestId('invite-group-search'));
    await user.click(await screen.findByTestId('invite-group-hit-a1'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/membership cycle is not allowed/);
  });

  it('shows the honest empty result', async () => {
    const user = userEvent.setup();
    searchInvitableGroupsClient.mockResolvedValue([]);
    render(<InviteGroupPanel groupId="b1" onMutated={onMutated} />);
    await user.type(screen.getByTestId('invite-group-query'), 'zzz');
    await user.click(screen.getByTestId('invite-group-search'));
    expect(await screen.findByText(/no groups match/i)).toBeInTheDocument();
  });
});
