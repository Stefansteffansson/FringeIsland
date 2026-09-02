/**
 * FEAT-H025 STORY-6 — GroupConversationsSection unit tier.
 * Red-first: written before the component exists (module-absent red).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const fetchGroupConversations = jest.fn<(g: string) => Promise<unknown>>();
const fetchMyPermissions = jest.fn<(g: string) => Promise<unknown>>();
const leaveConversation = jest.fn<(c: string) => Promise<void>>();
jest.mock('@/lib/messages/client', () => ({
  fetchGroupConversations: (g: string) => fetchGroupConversations(g),
  joinConversation: jest.fn(),
  leaveConversation: (c: string) => leaveConversation(c),
  createGroupConversation: jest.fn(),
}));
jest.mock('@/lib/groups/client', () => ({
  fetchMyPermissions: (g: string) => fetchMyPermissions(g),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GroupConversationsSection } = require('@/components/groups/GroupConversationsSection') as
  typeof import('@/components/groups/GroupConversationsSection');

const LISTING = {
  conversations: [
    { id: 'gc1', title: 'Fireside', created_at: '2026-07-20T00:00:00Z', am_i_participant: true },
    { id: 'gc2', title: null, created_at: '2026-07-19T00:00:00Z', am_i_participant: false },
  ],
};

describe('GroupConversationsSection', () => {
  beforeEach(() => {
    fetchGroupConversations.mockReset();
    fetchMyPermissions.mockReset();
    leaveConversation.mockReset();
  });

  it('lists the group conversations with open (participant) and join (non-participant) affordances', async () => {
    fetchGroupConversations.mockResolvedValue(LISTING);
    fetchMyPermissions.mockResolvedValue({ permissions: [], member_group_id: 'me' });
    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() => expect(screen.getByText('Fireside')).toBeInTheDocument());
    expect(screen.getByTestId('conversation-open-gc1')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-join-gc2')).toBeInTheDocument();
  });

  it('renders the create affordance ONLY when the platform grants create_group_conversations', async () => {
    fetchGroupConversations.mockResolvedValue({ conversations: [] });
    fetchMyPermissions.mockResolvedValue({
      permissions: ['create_group_conversations'],
      member_group_id: 'me',
    });
    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() =>
      expect(screen.getByTestId('conversation-create')).toBeInTheDocument(),
    );
  });

  it('hides the create affordance without the permission (asked of the platform, never computed)', async () => {
    fetchGroupConversations.mockResolvedValue({ conversations: [] });
    fetchMyPermissions.mockResolvedValue({ permissions: ['view_forum'], member_group_id: 'me' });
    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() => expect(screen.getByTestId('group-conversations-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('conversation-create')).toBeNull();
  });

  /**
   * RIDER-2 (A-COM live walk, 2026-07-22). FEAT-H025 STORY-6 acceptance:
   * "Given I join, open, leave, and rejoin, then each transition renders from
   * the confirmed response". The contract (`leave_group_conversation`), the
   * BFF route and the client function all shipped — no surface ever rendered
   * the affordance, so the leave/rejoin half of the criterion had no user
   * path. Red-first against the missing button.
   */
  it('a participant row offers leave; leaving re-lists from the confirmed response (rejoin available)', async () => {
    fetchGroupConversations
      .mockResolvedValueOnce(LISTING)
      .mockResolvedValue({
        conversations: [
          { ...LISTING.conversations[0], am_i_participant: false },
          LISTING.conversations[1],
        ],
      });
    fetchMyPermissions.mockResolvedValue({ permissions: [], member_group_id: 'me' });
    leaveConversation.mockResolvedValue(undefined);

    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() => expect(screen.getByTestId('conversation-leave-gc1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('conversation-leave-gc1'));

    await waitFor(() => expect(leaveConversation).toHaveBeenCalledWith('gc1'));
    // Renders from the confirmed response: the row flips to the rejoin affordance.
    await waitFor(() => expect(screen.getByTestId('conversation-join-gc1')).toBeInTheDocument());
    expect(screen.queryByTestId('conversation-leave-gc1')).toBeNull();
  });

  it('a non-participant row offers no leave affordance', async () => {
    fetchGroupConversations.mockResolvedValue(LISTING);
    fetchMyPermissions.mockResolvedValue({ permissions: [], member_group_id: 'me' });
    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() => expect(screen.getByTestId('conversation-join-gc2')).toBeInTheDocument());
    expect(screen.queryByTestId('conversation-leave-gc2')).toBeNull();
  });

  it('a failed listing renders the honest unavailable state — the group page stays whole', async () => {
    fetchGroupConversations.mockRejectedValue(new Error('boom'));
    fetchMyPermissions.mockResolvedValue({ permissions: [], member_group_id: 'me' });
    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() =>
      expect(screen.getByTestId('group-conversations-unavailable')).toBeInTheDocument(),
    );
  });
});
