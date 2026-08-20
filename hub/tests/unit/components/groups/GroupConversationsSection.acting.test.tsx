import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HttpStatusError } from '@/lib/http/status-error';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H047 STORY-1 (unit, RED-FIRST) — the wielded conversations list door.
 *
 * With an `acting` context ({groupId, name, permissions}) from the group
 * page's hat state: the list reads through the acting path with a banner;
 * Join/Leave/Open reflect A's participation; join/leave/create confirm ONCE
 * with copy naming the wielding (the 2026-08-19 ruling — weighty one-time
 * acts confirm; messages don't); Open links carry `?acting=`; create gates
 * on the HAT's create_group_conversations; refusals name the hat.
 */

const mockMsgs = {
  fetchGroupConversations: jest.fn(),
  joinConversation: jest.fn(),
  leaveConversation: jest.fn(),
  createGroupConversation: jest.fn(),
};
jest.mock('@/lib/messages/client', () => ({
  __esModule: true,
  fetchGroupConversations: (...a: unknown[]) => mockMsgs.fetchGroupConversations(...a),
  joinConversation: (...a: unknown[]) => mockMsgs.joinConversation(...a),
  leaveConversation: (...a: unknown[]) => mockMsgs.leaveConversation(...a),
  createGroupConversation: (...a: unknown[]) => mockMsgs.createGroupConversation(...a),
}));

const mockPerms = jest.fn();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: unknown[]) => mockPerms(...a),
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

import { GroupConversationsSection } from '@/components/groups/GroupConversationsSection';

const ACTING = {
  groupId: 'ga',
  name: 'Alpha',
  permissions: ['create_group_conversations'],
};
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  title: 'Harbour talk',
  created_at: '2026-08-18T10:00:00Z',
  am_i_participant: false,
  ...overrides,
});

describe('GroupConversationsSection — wielded list door (FEAT-H047 STORY-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMsgs.fetchGroupConversations.mockResolvedValue({ conversations: [row()] });
    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
  });

  it('S1: the wielded read carries the acting group and a banner names the substitution', async () => {
    render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    expect(await screen.findByTestId('conversations-acting-banner')).toHaveTextContent(
      'Viewing as Alpha',
    );
    const lastCall = mockMsgs.fetchGroupConversations.mock.calls.at(-1) ?? [];
    expect(lastCall).toContain('ga');
  });

  it('S1 guard: without acting there is no banner and the read carries no acting group', async () => {
    render(<GroupConversationsSection groupId="g1" />);
    await screen.findByText('Harbour talk');
    expect(screen.queryByTestId('conversations-acting-banner')).toBeNull();
    expect(mockMsgs.fetchGroupConversations.mock.calls.at(-1) ?? []).not.toContain('ga');
  });

  it('S1: a refused wielded read names the hat — never the malfunction fallback', async () => {
    mockMsgs.fetchGroupConversations.mockRejectedValue(new HttpStatusError('Not allowed', 403));
    render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    const notice = await screen.findByTestId('group-conversations-hat-insufficient');
    expect(notice).toHaveTextContent('Alpha');
    expect(screen.queryByTestId('group-conversations-unavailable')).toBeNull();
  });

  it('S1: Join confirms once naming the wielding, then joins as the group and opens with the param', async () => {
    const user = userEvent.setup();
    mockMsgs.joinConversation.mockResolvedValue(undefined);
    render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    await user.click(await screen.findByTestId('conversation-join-c1'));

    expect(await screen.findByText(/You are joining as Alpha/)).toBeInTheDocument();
    expect(mockMsgs.joinConversation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Join as Alpha' }));
    await waitFor(() => expect(mockMsgs.joinConversation).toHaveBeenCalled());
    expect(mockMsgs.joinConversation.mock.calls.at(-1) ?? []).toContain('ga');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/messages/c1?acting=ga'));
  });

  it('S1: Leave confirms once naming the wielding and re-reads the list', async () => {
    const user = userEvent.setup();
    mockMsgs.fetchGroupConversations.mockResolvedValue({
      conversations: [row({ am_i_participant: true })],
    });
    mockMsgs.leaveConversation.mockResolvedValue(undefined);
    render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    await user.click(await screen.findByTestId('conversation-leave-c1'));

    expect(await screen.findByText(/You are leaving as Alpha/)).toBeInTheDocument();
    expect(mockMsgs.leaveConversation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Leave as Alpha' }));
    await waitFor(() => expect(mockMsgs.leaveConversation).toHaveBeenCalled());
    expect(mockMsgs.leaveConversation.mock.calls.at(-1) ?? []).toContain('ga');
    await waitFor(() => expect(mockMsgs.fetchGroupConversations.mock.calls.length).toBeGreaterThan(1));
  });

  it('S1: Open carries the param for a thread A participates in', async () => {
    const user = userEvent.setup();
    mockMsgs.fetchGroupConversations.mockResolvedValue({
      conversations: [row({ am_i_participant: true })],
    });
    render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    await user.click(await screen.findByTestId('conversation-open-c1'));
    expect(push).toHaveBeenCalledWith('/messages/c1?acting=ga');
  });

  it("S1: create gates on the HAT's permission — my own grant never mixes in — and confirms naming the wielding", async () => {
    const user = userEvent.setup();
    mockPerms.mockResolvedValue({
      permissions: ['create_group_conversations'],
      member_group_id: 'pg-me',
    });
    const { unmount } = render(
      <GroupConversationsSection groupId="g1" acting={{ ...ACTING, permissions: [] }} />,
    );
    await screen.findByText('Harbour talk');
    expect(screen.queryByTestId('conversation-create')).toBeNull();
    unmount();

    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
    mockMsgs.createGroupConversation.mockResolvedValue('c9');
    render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    await user.click(await screen.findByTestId('conversation-create'));
    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(await screen.findByText(/You are opening this conversation as Alpha/)).toBeInTheDocument();
    expect(mockMsgs.createGroupConversation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Open as Alpha' }));
    await waitFor(() => expect(mockMsgs.createGroupConversation).toHaveBeenCalled());
    expect(mockMsgs.createGroupConversation.mock.calls.at(-1) ?? []).toContain('ga');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/messages/c9?acting=ga'));
  });
});
