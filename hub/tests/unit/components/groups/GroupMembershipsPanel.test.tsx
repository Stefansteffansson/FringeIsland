import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H018 STORY-3 (unit) — the wielded group's memberships panel.
 * Visible only to act_as_group holders (the page gates on the acting-contexts
 * read — no fake doors); pending invitations answer as the group behind a
 * ConfirmModal that NAMES THE WIELDING; Withdraw likewise; refusal copy
 * renders verbatim in place. Red-first for TASK-H018-02.
 */

const respondToGroupInvitationClient = jest.fn<() => Promise<unknown>>();
const leaveGroupAsGroupClient = jest.fn<() => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  respondToGroupInvitationClient: (...a: unknown[]) =>
    (respondToGroupInvitationClient as unknown as (...x: unknown[]) => unknown)(...a),
  leaveGroupAsGroupClient: (...a: unknown[]) =>
    (leaveGroupAsGroupClient as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GroupMembershipsPanel } from '@/components/groups/GroupMembershipsPanel';

const rows = [
  { membership_id: 'm1', group_id: 'b1', name: 'Byalaget', status: 'invited' },
  { membership_id: 'm2', group_id: 'b2', name: 'Foreningen', status: 'active' },
];

describe('FEAT-H018 — GroupMembershipsPanel (STORY-3)', () => {
  const onMutated = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('lists where the group belongs and its pending invitations', () => {
    render(
      <GroupMembershipsPanel
        actingGroup={{ id: 'a1', name: 'Familjen' }}
        rows={rows}
        error={null}
        onMutated={onMutated}
      />,
    );
    expect(screen.getByText('Byalaget')).toBeInTheDocument();
    expect(screen.getByText('Foreningen')).toBeInTheDocument();
    expect(screen.getByTestId('membership-status-m1')).toHaveTextContent(/invited/i);
  });

  it('accepting names the wielding in the confirm and re-reads on success', async () => {
    const user = userEvent.setup();
    respondToGroupInvitationClient.mockResolvedValue({});
    render(
      <GroupMembershipsPanel
        actingGroup={{ id: 'a1', name: 'Familjen' }}
        rows={rows}
        error={null}
        onMutated={onMutated}
      />,
    );
    await user.click(screen.getByTestId('accept-as-group-m1'));
    // The confirm NAMES the wielding — "answering for" the acting group.
    expect(screen.getByText(/answering for/i)).toHaveTextContent(/Familjen/);
    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(respondToGroupInvitationClient).toHaveBeenCalledWith('a1', 'm1', true);
    expect(onMutated).toHaveBeenCalled();
  });

  it('withdraw renders the contract refusal verbatim in place', async () => {
    const user = userEvent.setup();
    leaveGroupAsGroupClient.mockRejectedValue(
      new Error('this group is the last active Steward — transfer stewardship first'),
    );
    render(
      <GroupMembershipsPanel
        actingGroup={{ id: 'a1', name: 'Familjen' }}
        rows={rows}
        error={null}
        onMutated={onMutated}
      />,
    );
    await user.click(screen.getByTestId('withdraw-as-group-m2'));
    await user.click(screen.getByRole('button', { name: /withdraw/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/transfer stewardship first/);
  });

  it('shows a panel-local error without taking the page down', () => {
    render(
      <GroupMembershipsPanel
        actingGroup={{ id: 'a1', name: 'Familjen' }}
        rows={null}
        error="Failed to load memberships."
        onMutated={onMutated}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load memberships/i);
  });
});
