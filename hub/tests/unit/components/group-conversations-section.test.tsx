/**
 * FEAT-H025 STORY-6 — GroupConversationsSection unit tier.
 * Red-first: written before the component exists (module-absent red).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const fetchGroupConversations = jest.fn<Promise<unknown>, [string]>();
const fetchMyPermissions = jest.fn<Promise<unknown>, [string]>();
jest.mock('@/lib/messages/client', () => ({
  fetchGroupConversations: (g: string) => fetchGroupConversations(g),
  joinConversation: jest.fn(),
  leaveConversation: jest.fn(),
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

  it('a failed listing renders the honest unavailable state — the group page stays whole', async () => {
    fetchGroupConversations.mockRejectedValue(new Error('boom'));
    fetchMyPermissions.mockResolvedValue({ permissions: [], member_group_id: 'me' });
    render(<GroupConversationsSection groupId="g1" />);
    await waitFor(() =>
      expect(screen.getByTestId('group-conversations-unavailable')).toBeInTheDocument(),
    );
  });
});
