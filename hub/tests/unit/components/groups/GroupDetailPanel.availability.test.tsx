import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H038 STORY-5/6 (unit) — the two-mode group surface: the resting group
 * renders honestly (label, read-only banner for non-holders, the normal
 * surface for `rest_group` holders) and the steward's Rest/Wake control lives
 * on the group management surface, capability-flag driven.
 * WRITTEN RED-FIRST (2026-08-03): no status label vocabulary, no banner, and
 * no Rest/Wake control exist in GroupDetailPanel at head — 6 of 8 cases red.
 * DESIGNED CONTROLS (green at head, vacuously — no banner exists at all yet):
 * "a rest_group holder gets the normal working surface" and "an active group
 * shows neither banner nor status label"; both are boundary pins that become
 * meaningful once the banner/label render.
 */

const restGroupClient = jest.fn<(id: string) => Promise<void>>();
const wakeGroupClient = jest.fn<(id: string) => Promise<void>>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/messages/client', () => ({
  openDm: jest.fn(),
}));
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
  restGroupClient: (id: string) => restGroupClient(id),
  wakeGroupClient: (id: string) => wakeGroupClient(id),
}));

import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';

const group = (status: string): GroupDetail => ({
  id: 'grp-1',
  name: 'Harbour Circle',
  description: null,
  label: null,
  status,
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

describe('STORY-5 — the resting group renders honestly', () => {
  it('a resting group carries the "Resting" label (never the raw token)', () => {
    render(<GroupDetailPanel group={group('resting')} permissions={[]} onRefresh={jest.fn()} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Resting');
  });

  it('a non-holder sees the read-only banner — state only, never the why', () => {
    render(<GroupDetailPanel group={group('resting')} permissions={[]} onRefresh={jest.fn()} />);
    const banner = screen.getByTestId('resting-banner');
    expect(banner).toHaveTextContent(/resting/i);
    expect(banner).toHaveTextContent(/read/i);
  });

  it('a rest_group holder gets the normal working surface — no read-only banner', () => {
    render(
      <GroupDetailPanel
        group={group('resting')}
        permissions={['rest_group']}
        onRefresh={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('resting-banner')).not.toBeInTheDocument();
  });

  it('an active group shows neither banner nor status label', () => {
    render(<GroupDetailPanel group={group('active')} permissions={[]} onRefresh={jest.fn()} />);
    expect(screen.queryByTestId('resting-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
  });
});

describe('STORY-6 — the steward Rest/Wake control (capability-flag driven)', () => {
  it('a rest_group holder sees "Rest this group" on an active group; a non-holder never does', () => {
    const { unmount } = render(
      <GroupDetailPanel group={group('active')} permissions={['rest_group']} onRefresh={jest.fn()} />,
    );
    expect(screen.getByTestId('rest-group')).toHaveTextContent(/rest this group/i);
    expect(screen.queryByTestId('wake-group')).not.toBeInTheDocument();
    unmount();

    render(<GroupDetailPanel group={group('active')} permissions={[]} onRefresh={jest.fn()} />);
    expect(screen.queryByTestId('rest-group')).not.toBeInTheDocument();
  });

  it('the rest ceremony: ConfirmModal names the group and the consequences; confirm calls the transport then refreshes', async () => {
    const onRefresh = jest.fn();
    render(
      <GroupDetailPanel group={group('active')} permissions={['rest_group']} onRefresh={onRefresh} />,
    );
    await userEvent.click(screen.getByTestId('rest-group'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent('Harbour Circle');
    expect(modal).toHaveTextContent(/read/i);
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(restGroupClient).toHaveBeenCalledWith('grp-1'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('a resting group offers "Wake this group" to the holder; confirm calls the transport then refreshes', async () => {
    const onRefresh = jest.fn();
    render(
      <GroupDetailPanel
        group={group('resting')}
        permissions={['rest_group']}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.queryByTestId('rest-group')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('wake-group'));
    expect(screen.getByTestId('confirm-modal')).toHaveTextContent('Harbour Circle');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(wakeGroupClient).toHaveBeenCalledWith('grp-1'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('a refusal surfaces in place — the state stays contract-reported', async () => {
    restGroupClient.mockRejectedValue(new Error('group is suspended'));
    render(
      <GroupDetailPanel group={group('active')} permissions={['rest_group']} onRefresh={jest.fn()} />,
    );
    await userEvent.click(screen.getByTestId('rest-group'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(await screen.findByText('group is suspended')).toBeInTheDocument();
  });
});
