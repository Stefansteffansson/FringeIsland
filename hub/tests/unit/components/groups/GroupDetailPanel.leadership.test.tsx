import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H017 STORY-1/3/4/5 (unit) — the ways a group ends or changes hands, on
 * the detail panel. Four distinct intents, four distinct affordances: Leave
 * (H016), Remove (H016), Close (last member), Delete (`delete_group` holders,
 * danger-styled explicit confirm). The sole Steward's Leave refusal becomes a
 * door — the transfer choice (ordered nominate pick-list from the EXISTING
 * member list / hand to FringeIsland as the deliberate last resort). Every
 * refusal is relayed in place; visibility keys off the payload
 * (`delete_group`, `member_count`, `viewerMemberGroupId`) — never a role-name
 * check. Red-first for TASK-H017-02.
 */

const updateGroupSettings = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const assignMemberRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const removeMemberRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const pauseMember = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const activateMember = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const removeGroupMember = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const leaveGroup = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const nominateSteward = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const handGroupToDeusEx = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const closeGroup = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const deleteGroup = jest.fn<(...a: unknown[]) => Promise<unknown>>();

class MockGroupsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

jest.mock('@/lib/groups/client', () => ({
  updateGroupSettings: (...a: unknown[]) => updateGroupSettings(...a),
  assignMemberRole: (...a: unknown[]) => assignMemberRole(...a),
  removeMemberRole: (...a: unknown[]) => removeMemberRole(...a),
  pauseMember: (...a: unknown[]) => pauseMember(...a),
  activateMember: (...a: unknown[]) => activateMember(...a),
  removeGroupMember: (...a: unknown[]) => removeGroupMember(...a),
  leaveGroup: (...a: unknown[]) => leaveGroup(...a),
  nominateSteward: (...a: unknown[]) => nominateSteward(...a),
  handGroupToDeusEx: (...a: unknown[]) => handGroupToDeusEx(...a),
  closeGroup: (...a: unknown[]) => closeGroup(...a),
  deleteGroup: (...a: unknown[]) => deleteGroup(...a),
  GroupsApiError: MockGroupsApiError,
}));

import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';

const MULTI: GroupDetail = {
  id: 'grp-1',
  name: 'Book Circle',
  description: null,
  label: null,
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 3,
  viewer: { is_member: true, joined_at: '2026-07-01T10:00:00+00:00', can_manage_settings: true },
  members: [
    {
      display_name: 'Stefan',
      joined_at: '2026-07-01T10:00:00+00:00',
      member_group_id: 'pg-stefan',
      roles: ['Steward Role Template'],
    },
    {
      display_name: 'Ada',
      joined_at: '2026-07-02T10:00:00+00:00',
      member_group_id: 'pg-ada',
      roles: [],
    },
    {
      display_name: 'Cara',
      joined_at: '2026-07-03T10:00:00+00:00',
      member_group_id: 'pg-cara',
      roles: [],
      membership_status: 'paused',
    },
  ],
};

const SOLO: GroupDetail = {
  ...MULTI,
  member_count: 1,
  members: [MULTI.members![0]],
};

describe('FEAT-H017 — GroupDetailPanel endings & transfer', () => {
  const onRefresh = jest.fn();
  const onLeft = jest.fn();

  // Default caller is Steward-grade: the transfer affordance keys off the
  // my-permissions payload's `assign_roles` (transfer = a Steward-role grant).
  const renderPanel = (group: GroupDetail, permissions: string[] | null = ['assign_roles']) =>
    render(
      <GroupDetailPanel
        group={group}
        permissions={permissions}
        viewerMemberGroupId="pg-stefan"
        onRefresh={onRefresh}
        onLeft={onLeft}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    nominateSteward.mockResolvedValue({ group_id: 'grp-1', nominees_count: 1 });
    handGroupToDeusEx.mockResolvedValue({ group_id: 'grp-1' });
    closeGroup.mockResolvedValue({ group_id: 'grp-1', status: 'closed' });
    deleteGroup.mockResolvedValue({ group_id: 'grp-1', status: 'archived' });
  });

  describe('the transfer choice (STORY-1/3)', () => {
    it('offers "Hand over leadership" to a member who is not alone — and not to the last member', () => {
      renderPanel(MULTI);
      expect(screen.getByTestId('hand-over-leadership')).toBeTruthy();
      renderPanel(SOLO);
      expect(screen.getAllByTestId('hand-over-leadership').length).toBe(1); // only the MULTI render's
    });

    it('offers the transfer door only to assign_roles holders — the payload key, never a role name', () => {
      // A plain member is not offered a door that always refuses (live-testing
      // finding, 2026-07-05: Gracy saw the affordance); the substrate still
      // guards — this is noise reduction, not the rule's home.
      renderPanel(MULTI, []);
      expect(screen.queryByTestId('hand-over-leadership')).toBeNull();
      renderPanel(MULTI, ['invite_members']);
      expect(screen.queryByTestId('hand-over-leadership')).toBeNull();
      renderPanel(MULTI, ['assign_roles']);
      expect(screen.getByTestId('hand-over-leadership')).toBeTruthy();
    });

    it('opens both paths: the ordered nominate pick-list and the deliberate DeusEx hand-over', async () => {
      const user = userEvent.setup();
      renderPanel(MULTI);
      await user.click(screen.getByTestId('hand-over-leadership'));
      const section = screen.getByTestId('transfer-leadership');
      expect(within(section).getByTestId('hand-to-deusex')).toBeTruthy();
      // Pick-list: ACTIVE members other than the viewer — Ada yes, the viewer
      // (Stefan) no, paused Cara no. Sourced from the existing member list.
      expect(within(section).getByTestId('nominate-candidate-pg-ada')).toBeTruthy();
      expect(within(section).queryByTestId('nominate-candidate-pg-stefan')).toBeNull();
      expect(within(section).queryByTestId('nominate-candidate-pg-cara')).toBeNull();
    });

    it('nominates in the picked order through a ConfirmModal and confirms the offer is out — the Steward stays', async () => {
      const richer: GroupDetail = {
        ...MULTI,
        members: [
          ...MULTI.members!,
          {
            display_name: 'Ben',
            joined_at: '2026-07-04T10:00:00+00:00',
            member_group_id: 'pg-ben',
            roles: [],
          },
        ],
      };
      const user = userEvent.setup();
      renderPanel(richer);
      await user.click(screen.getByTestId('hand-over-leadership'));
      // Pick Ben first, then Ada — the order is the ranking.
      await user.click(screen.getByTestId('nominate-candidate-pg-ben'));
      await user.click(screen.getByTestId('nominate-candidate-pg-ada'));
      await user.click(screen.getByTestId('send-nomination'));
      expect(nominateSteward).not.toHaveBeenCalled(); // modal first
      // The confirm copy is honest about BOTH resolutions (live-testing
      // finding, 2026-07-05): acceptance succession AND the all-decline
      // FringeIsland fallback in which the nominator leaves.
      expect(screen.getByText(/if every nominee declines/i)).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /send nomination/i }));
      await waitFor(() =>
        expect(nominateSteward).toHaveBeenCalledWith('grp-1', ['pg-ben', 'pg-ada']),
      );
      const notice = await screen.findByText(/offer is out/i);
      expect(notice.textContent).toMatch(/FringeIsland/i); // the fallback named
      expect(onRefresh).toHaveBeenCalled();
      expect(onLeft).not.toHaveBeenCalled(); // no pre-empted departure
    });

    it('relays a nomination refusal in place', async () => {
      nominateSteward.mockRejectedValue(
        new MockGroupsApiError('A nomination is already in flight for this group.', 409),
      );
      const user = userEvent.setup();
      renderPanel(MULTI);
      await user.click(screen.getByTestId('hand-over-leadership'));
      await user.click(screen.getByTestId('nominate-candidate-pg-ada'));
      await user.click(screen.getByTestId('send-nomination'));
      await user.click(screen.getByRole('button', { name: /send nomination/i }));
      expect(await screen.findByText(/already in flight/i)).toBeTruthy();
      expect(onLeft).not.toHaveBeenCalled();
    });

    it('hands to FringeIsland through a ConfirmModal and navigates away on success', async () => {
      const user = userEvent.setup();
      renderPanel(MULTI);
      await user.click(screen.getByTestId('hand-over-leadership'));
      await user.click(screen.getByTestId('hand-to-deusex'));
      expect(handGroupToDeusEx).not.toHaveBeenCalled(); // modal first
      await user.click(screen.getByRole('button', { name: /hand over and leave/i }));
      await waitFor(() => expect(handGroupToDeusEx).toHaveBeenCalledWith('grp-1'));
      await waitFor(() => expect(onLeft).toHaveBeenCalled());
    });

    it('relays the last-member 409 (pointing at Close) in place', async () => {
      handGroupToDeusEx.mockRejectedValue(
        new MockGroupsApiError('You are the last member — close the group instead.', 409),
      );
      const user = userEvent.setup();
      renderPanel(MULTI);
      await user.click(screen.getByTestId('hand-over-leadership'));
      await user.click(screen.getByTestId('hand-to-deusex'));
      await user.click(screen.getByRole('button', { name: /hand over and leave/i }));
      expect(await screen.findByText(/close the group instead/i)).toBeTruthy();
      expect(onLeft).not.toHaveBeenCalled();
    });

    it('a sole-Steward Leave refusal opens the transfer choice — the wall becomes a door', async () => {
      leaveGroup.mockRejectedValue(
        new MockGroupsApiError(
          'You are the only active Steward — assign another Steward first.',
          409,
        ),
      );
      const user = userEvent.setup();
      renderPanel(MULTI);
      await user.click(screen.getByTestId('leave-group'));
      await user.click(screen.getByRole('button', { name: 'Leave' }));
      // The refusal renders verbatim…
      expect(await screen.findByText(/only active Steward/i)).toBeTruthy();
      // …and the transfer choice opens alongside it.
      expect(screen.getByTestId('transfer-leadership')).toBeTruthy();
    });
  });

  describe('Close — the last member ends the group (STORY-4)', () => {
    it('renders only for the last member, with the honest preserve copy in its confirm', async () => {
      renderPanel(MULTI);
      expect(screen.queryByTestId('close-group')).toBeNull();

      const user = userEvent.setup();
      renderPanel(SOLO);
      await user.click(screen.getByTestId('close-group'));
      expect(closeGroup).not.toHaveBeenCalled(); // modal first
      expect(screen.getByText(/Its work is preserved/i)).toBeTruthy(); // the confirm's copy
      await user.click(screen.getByRole('button', { name: /close group/i }));
      await waitFor(() => expect(closeGroup).toHaveBeenCalledWith('grp-1'));
      await waitFor(() => expect(onLeft).toHaveBeenCalled());
    });

    it('relays a close refusal in place', async () => {
      closeGroup.mockRejectedValue(
        new MockGroupsApiError('Only the last active member can close a group.', 409),
      );
      const user = userEvent.setup();
      renderPanel(SOLO);
      await user.click(screen.getByTestId('close-group'));
      await user.click(screen.getByRole('button', { name: /close group/i }));
      expect(await screen.findByText(/last active member/i)).toBeTruthy();
      expect(onLeft).not.toHaveBeenCalled();
    });
  });

  describe('Delete — the Steward ends the group deliberately (STORY-5)', () => {
    it('renders only for delete_group holders — the payload key, never a role name', () => {
      renderPanel(MULTI, ['invite_members']);
      expect(screen.queryByTestId('delete-group')).toBeNull();
      renderPanel(MULTI, ['delete_group']);
      expect(screen.getByTestId('delete-group')).toBeTruthy();
    });

    it('deletes through a danger-styled explicit ConfirmModal naming the group, then navigates away', async () => {
      const user = userEvent.setup();
      renderPanel(MULTI, ['delete_group']);
      // Distinct intents coexist distinctly: Leave and Delete are separate
      // affordances (Remove rows exist too; Close does not offer itself here).
      expect(screen.getByTestId('leave-group')).toBeTruthy();
      expect(screen.queryByTestId('close-group')).toBeNull();
      await user.click(screen.getByTestId('delete-group'));
      expect(deleteGroup).not.toHaveBeenCalled(); // modal first
      expect(screen.getByText(/"Book Circle"/)).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /delete group/i }));
      await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('grp-1'));
      await waitFor(() => expect(onLeft).toHaveBeenCalled());
    });

    it('relays a delete refusal in place', async () => {
      deleteGroup.mockRejectedValue(
        new MockGroupsApiError('This group cannot be deleted.', 409),
      );
      const user = userEvent.setup();
      renderPanel(MULTI, ['delete_group']);
      await user.click(screen.getByTestId('delete-group'));
      await user.click(screen.getByRole('button', { name: /delete group/i }));
      expect(await screen.findByText(/cannot be deleted/i)).toBeTruthy();
      expect(onLeft).not.toHaveBeenCalled();
    });
  });
});
