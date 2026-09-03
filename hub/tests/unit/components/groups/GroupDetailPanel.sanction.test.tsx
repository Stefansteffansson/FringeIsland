import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H049 STORY-2/3 (DB-4, GRP-10) — the Steward's Rest/Wake ceremony
 * carries an OPTIONAL note ("A note to your members — optional"; Confirm
 * enabled regardless; the note reaches the transport or is omitted when
 * blank), and the held-group label renders the FEAT-PC030 `hold_reason` as a
 * line beneath the status when the payload carries it (present for members
 * only — the platform decides; the surface never gates on a role string).
 * WRITTEN RED-FIRST (2026-09-03): no note field and no reason line at head;
 * the transports are called with the id alone.
 */
const restGroupClient = jest.fn<(id: string, note?: string) => Promise<void>>();
const wakeGroupClient = jest.fn<(id: string, note?: string) => Promise<void>>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/messages/client', () => ({ openDm: jest.fn() }));
jest.mock('@/lib/groups/client', () => ({
  activateMember: jest.fn(),
  assignMemberRole: jest.fn(),
  closeGroup: jest.fn(),
  deleteGroup: jest.fn(),
  handGroupToDeusEx: jest.fn(),
  leaveGroup: jest.fn(),
  nominateSteward: jest.fn(),
  pauseMember: jest.fn(),
  removeGroupMember: jest.fn(),
  removeMemberRole: jest.fn(),
  updateGroupSettings: jest.fn(),
  restGroupClient: (id: string, note?: string) => restGroupClient(id, note),
  wakeGroupClient: (id: string, note?: string) => wakeGroupClient(id, note),
}));

import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';

const group = (status: string, hold_reason?: string | null): GroupDetail => ({
  id: 'grp-1',
  name: 'Harbour Circle',
  description: null,
  label: null,
  status,
  ...(hold_reason === undefined ? {} : { hold_reason }),
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 2,
  non_system_member_count: 2,
  viewer: { is_member: true, joined_at: '2026-07-01T10:00:00+00:00', can_manage_settings: false },
});

beforeEach(() => {
  restGroupClient.mockReset().mockResolvedValue(undefined);
  wakeGroupClient.mockReset().mockResolvedValue(undefined);
});

describe("STORY-2 — the Steward's optional note", () => {
  it('Rest: the note field renders, Confirm is enabled without it, and an empty note is omitted', async () => {
    render(<GroupDetailPanel group={group('active')} permissions={['rest_group']} onRefresh={jest.fn()} />);
    await userEvent.click(screen.getByTestId('rest-group'));
    const modal = screen.getByTestId('confirm-modal');
    const field = within(modal).getByTestId('ceremony-note');
    expect(field).toHaveAccessibleName('A note to your members — optional');
    expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(restGroupClient).toHaveBeenCalledWith('grp-1', undefined));
  });

  it('Rest with a note sends it; Wake with a note sends it too', async () => {
    const onRefresh = jest.fn();
    const { unmount } = render(
      <GroupDetailPanel group={group('active')} permissions={['rest_group']} onRefresh={onRefresh} />,
    );
    await userEvent.click(screen.getByTestId('rest-group'));
    await userEvent.type(screen.getByTestId('ceremony-note'), 'Summer break');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(restGroupClient).toHaveBeenCalledWith('grp-1', 'Summer break'));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    unmount();

    render(<GroupDetailPanel group={group('resting')} permissions={['rest_group']} onRefresh={jest.fn()} />);
    await userEvent.click(screen.getByTestId('wake-group'));
    await userEvent.type(screen.getByTestId('ceremony-note'), 'Back from the break');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(wakeGroupClient).toHaveBeenCalledWith('grp-1', 'Back from the break'));
  });
});

describe('STORY-3 — the held-group label says why', () => {
  it('a resting group with hold_reason renders the reason line under the label', () => {
    render(<GroupDetailPanel group={group('resting', 'Summer break')} permissions={[]} onRefresh={jest.fn()} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Resting');
    expect(screen.getByTestId('hold-reason')).toHaveTextContent('Reason given: Summer break');
  });

  it('a resting group without a reason (null or absent — the non-member payload) renders no reason line', () => {
    const { unmount } = render(
      <GroupDetailPanel group={group('resting', null)} permissions={[]} onRefresh={jest.fn()} />,
    );
    expect(screen.queryByTestId('hold-reason')).not.toBeInTheDocument();
    unmount();
    render(<GroupDetailPanel group={group('resting')} permissions={[]} onRefresh={jest.fn()} />);
    expect(screen.queryByTestId('hold-reason')).not.toBeInTheDocument();
  });
});
