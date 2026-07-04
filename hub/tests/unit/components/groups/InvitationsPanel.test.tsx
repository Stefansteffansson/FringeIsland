import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PendingInvitations, SearchHit } from '@/lib/groups/invitations';

/**
 * FEAT-H015 STORY-1/2/3 (unit) — the invitations panel.
 * Renders ONLY for an invite_members holder (gated on the already-fetched
 * effective-permissions payload — STORY-1 AC-4); typeahead hits disable
 * already-member/already-invited rows from the payload's membership_status
 * (never client-side permission logic); the email path shows the HONEST
 * undispatched copy (no email is sent — D4); the pending list renders both
 * kinds distinctly with a payload-driven Expired badge; cancels are
 * ConfirmModal-gated; every mutation re-reads via onMutated. Refusals surface
 * in place and the form keeps its state.
 * Red-first for TASK-H015-02.
 */

const searchMembers = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const sendInvite = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const cancelMemberInvite = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const cancelEmailInvite = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  searchMembers: (...a: unknown[]) => searchMembers(...a),
  sendInvite: (...a: unknown[]) => sendInvite(...a),
  cancelMemberInvite: (...a: unknown[]) => cancelMemberInvite(...a),
  cancelEmailInvite: (...a: unknown[]) => cancelEmailInvite(...a),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { InvitationsPanel } from '@/components/groups/InvitationsPanel';
import { GroupsApiError } from '@/lib/groups/client';

const PENDING: PendingInvitations = {
  group_id: 'grp-1',
  member_invitations: [
    {
      member_group_id: 'pg-2',
      display_name: 'GCFindmeTarget',
      invited_at: '2026-07-04T10:00:00+00:00',
      invited_by_display_name: 'GCInviterPerson',
    },
  ],
  email_invitations: [
    {
      id: 'inv-fresh',
      invited_email: 'fresh@example.test',
      created_at: '2026-07-04T10:00:00+00:00',
      expires_at: '2026-08-03T10:00:00+00:00',
      expired: false,
    },
    {
      id: 'inv-stale',
      invited_email: 'stale@example.test',
      created_at: '2026-05-01T10:00:00+00:00',
      expires_at: '2026-05-31T10:00:00+00:00',
      expired: true,
    },
  ],
};

const HITS: SearchHit[] = [
  { member_group_id: 'pg-9', display_name: 'GCFresh', membership_status: null },
  { member_group_id: 'pg-3', display_name: 'GCAlreadyIn', membership_status: 'active' },
];

const INVITER = ['view_member_list', 'invite_members'];
const PLAIN = ['view_member_list'];

describe('FEAT-H015 — InvitationsPanel (STORY-1/2/3)', () => {
  const onMutated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    searchMembers.mockResolvedValue(HITS);
    sendInvite.mockResolvedValue({ kind: 'email_invitation' });
    cancelMemberInvite.mockResolvedValue(undefined);
    cancelEmailInvite.mockResolvedValue(undefined);
  });

  const panel = (permissions: string[] | null = INVITER, pending: PendingInvitations | null = PENDING, error: string | null = null) =>
    render(
      <InvitationsPanel
        groupId="grp-1"
        permissions={permissions}
        pending={pending}
        error={error}
        onMutated={onMutated}
      />,
    );

  it('does not render at all without invite_members in the permissions payload', () => {
    panel(PLAIN);
    expect(screen.queryByTestId('invitations-panel')).toBeNull();
    const { container } = render(
      <InvitationsPanel groupId="grp-1" permissions={null} pending={null} error={null} onMutated={onMutated} />,
    );
    expect(container.querySelector('[data-testid="invitations-panel"]')).toBeNull();
  });

  it('renders both pending kinds distinctly; the Expired badge is payload-driven', () => {
    panel();
    const list = screen.getByTestId('pending-invitations');
    expect(within(list).getByText('GCFindmeTarget')).toBeTruthy();
    expect(within(list).getByText(/GCInviterPerson/)).toBeTruthy();
    expect(within(list).getByText('fresh@example.test')).toBeTruthy();
    const staleRow = within(list).getByText('stale@example.test').closest('li')!;
    expect(within(staleRow as HTMLElement).getByText('Expired')).toBeTruthy();
    const freshRow = within(list).getByText('fresh@example.test').closest('li')!;
    expect(within(freshRow as HTMLElement).queryByText('Expired')).toBeNull();
  });

  it('typeahead searches (debounced) and disables already-member hits from membership_status', async () => {
    const user = userEvent.setup();
    panel();
    await user.type(screen.getByTestId('member-search-input'), 'GCF');
    await waitFor(() => expect(searchMembers).toHaveBeenCalledWith('grp-1', 'GCF'));
    const fresh = (await screen.findByText('GCFresh')).closest('button')!;
    expect((fresh as HTMLButtonElement).disabled).toBe(false);
    const alreadyIn = screen.getByText('GCAlreadyIn').closest('button')!;
    expect((alreadyIn as HTMLButtonElement).disabled).toBe(true);
  });

  it('picking a hit invites by member_group_id and re-reads', async () => {
    const user = userEvent.setup();
    panel();
    await user.type(screen.getByTestId('member-search-input'), 'GCF');
    const hit = await screen.findByText('GCFresh');
    await user.click(hit);
    await waitFor(() =>
      expect(sendInvite).toHaveBeenCalledWith('grp-1', { member_group_id: 'pg-9' }),
    );
    expect(onMutated).toHaveBeenCalled();
  });

  it('email invite sends and shows the honest undispatched copy', async () => {
    const user = userEvent.setup();
    panel();
    await user.type(screen.getByTestId('invite-email-input'), 'new@example.test');
    await user.click(screen.getByTestId('invite-email-button'));
    await waitFor(() =>
      expect(sendInvite).toHaveBeenCalledWith('grp-1', { email: 'new@example.test' }),
    );
    // D4 honesty: the invitation WAITS; no email is sent in v1. (Scoped to the
    // success note — the standing helper line under the input says it too.)
    const note = await screen.findByTestId('invite-sent-note');
    expect(note.textContent).toMatch(/no email is sent/i);
    expect(onMutated).toHaveBeenCalled();
  });

  it('a refusal surfaces in place and the email input keeps its value', async () => {
    sendInvite.mockRejectedValue(
      new GroupsApiError('an invitation for this email is already pending', 409),
    );
    const user = userEvent.setup();
    panel();
    const input = screen.getByTestId('invite-email-input') as HTMLInputElement;
    await user.type(input, 'dup@example.test');
    await user.click(screen.getByTestId('invite-email-button'));
    expect(
      await screen.findByText(/already pending/i),
    ).toBeTruthy();
    expect(input.value).toBe('dup@example.test');
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('cancelling a member invitation is ConfirmModal-gated and re-reads', async () => {
    const user = userEvent.setup();
    panel();
    await user.click(screen.getByTestId('cancel-member-invitation-pg-2'));
    const modal = screen.getByTestId('confirm-modal');
    await user.click(within(modal).getByText('Cancel invitation'));
    await waitFor(() => expect(cancelMemberInvite).toHaveBeenCalledWith('grp-1', 'pg-2'));
    expect(onMutated).toHaveBeenCalled();
  });

  it('cancelling an email invitation is ConfirmModal-gated and re-reads', async () => {
    const user = userEvent.setup();
    panel();
    await user.click(screen.getByTestId('cancel-email-invitation-inv-fresh'));
    const modal = screen.getByTestId('confirm-modal');
    await user.click(within(modal).getByText('Cancel invitation'));
    await waitFor(() => expect(cancelEmailInvite).toHaveBeenCalledWith('grp-1', 'inv-fresh'));
    expect(onMutated).toHaveBeenCalled();
  });

  it('a pending-read error stays panel-local (header stands, alert shown)', () => {
    panel(INVITER, null, 'Failed to load invitations.');
    expect(screen.getByTestId('invitations-panel')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/failed to load/i);
  });
});
