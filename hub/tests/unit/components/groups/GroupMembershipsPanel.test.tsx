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

const leaveGroupAsGroupClient = jest.fn<() => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
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
    // Post-6-done fix: the context group's name is a door, not a label —
    // the wielder can visit the group their group belongs to.
    const link = screen.getByRole('link', { name: 'Foreningen' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/groups/b2');
  });

  // FEAT-H031 (N-B): the acting-invitation RESPONSE folded to the bell/inbox
  // (fanned to the invited group's act_as_group holders). An invited membership
  // renders a read-only pointer here — no accept/decline buttons in the panel.
  it('an invited membership points to the bell — no accept/decline in the panel', () => {
    render(
      <GroupMembershipsPanel
        actingGroup={{ id: 'a1', name: 'Familjen' }}
        rows={rows}
        error={null}
        onMutated={onMutated}
      />,
    );
    expect(screen.getByTestId('respond-in-notifications-m1')).toHaveTextContent(/notifications/i);
    expect(screen.queryByTestId('accept-as-group-m1')).toBeNull();
    expect(screen.queryByTestId('decline-as-group-m1')).toBeNull();
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
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw' }));
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
