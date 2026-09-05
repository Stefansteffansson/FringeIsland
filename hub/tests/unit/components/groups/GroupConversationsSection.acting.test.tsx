import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HttpStatusError } from '@/lib/http/status-error';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as MessagesClient from '@/lib/messages/client';
import type * as GroupsClient from '@/lib/groups/client';

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
  fetchGroupConversations: jest.fn<typeof MessagesClient.fetchGroupConversations>(),
  joinConversation: jest.fn<typeof MessagesClient.joinConversation>(),
  leaveConversation: jest.fn<typeof MessagesClient.leaveConversation>(),
  createGroupConversation: jest.fn<typeof MessagesClient.createGroupConversation>(),
};
jest.mock('@/lib/messages/client', () => ({
  __esModule: true,
  fetchGroupConversations: (...a: Parameters<typeof MessagesClient.fetchGroupConversations>) => mockMsgs.fetchGroupConversations(...a),
  joinConversation: (...a: Parameters<typeof MessagesClient.joinConversation>) => mockMsgs.joinConversation(...a),
  leaveConversation: (...a: Parameters<typeof MessagesClient.leaveConversation>) => mockMsgs.leaveConversation(...a),
  createGroupConversation: (...a: Parameters<typeof MessagesClient.createGroupConversation>) => mockMsgs.createGroupConversation(...a),
}));

const mockPerms = jest.fn<typeof GroupsClient.fetchMyPermissions>();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: Parameters<typeof GroupsClient.fetchMyPermissions>) => mockPerms(...a),
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

/**
 * 2026-09-05 (the Ferd-close E2E run, wielded-conversations.spec) — the
 * stale-response race. The personal read fired at mount was still in flight
 * when the hat went on; the wielded read returned first (200), then the
 * personal read resolved last as a 403 and flipped the section to "the hat
 * doesn't open this group's conversations". Timing-dependent: green three
 * times in the morning, red twice in the afternoon. The rule: a superseded
 * read never writes — only the latest read for the current view lands.
 */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('GroupConversationsSection — a superseded read never overwrites the current view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
  });

  it('the personal read in flight when the hat went on resolves last as a refusal — the wielded list stays, the hat is not called insufficient', async () => {
    const stale = deferred<{ conversations: ReturnType<typeof row>[] }>();
    mockMsgs.fetchGroupConversations.mockImplementation((_groupId, acting) =>
      acting ? Promise.resolve({ conversations: [row()] }) : stale.promise,
    );
    const view = render(<GroupConversationsSection groupId="g1" />);
    view.rerender(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    expect(await screen.findByTestId('conversation-join-c1')).toBeInTheDocument();

    await act(async () => {
      stale.reject(new HttpStatusError('Not allowed', 403));
      await Promise.resolve();
    });

    expect(screen.queryByTestId('group-conversations-hat-insufficient')).toBeNull();
    expect(screen.queryByTestId('group-conversations-members-only')).toBeNull();
    expect(screen.getByTestId('conversation-join-c1')).toBeInTheDocument();
  });

  it('the mirror: a wielded read still in flight when the hat came off never resurrects the wielded rows over the members-only view', async () => {
    const stale = deferred<{ conversations: ReturnType<typeof row>[] }>();
    mockMsgs.fetchGroupConversations.mockImplementation((_groupId, acting) =>
      acting ? stale.promise : Promise.reject(new HttpStatusError('Not allowed', 403)),
    );
    const view = render(<GroupConversationsSection groupId="g1" acting={ACTING} />);
    view.rerender(<GroupConversationsSection groupId="g1" />);
    expect(await screen.findByTestId('group-conversations-members-only')).toBeInTheDocument();

    await act(async () => {
      stale.resolve({ conversations: [row()] });
      await Promise.resolve();
    });

    expect(screen.getByTestId('group-conversations-members-only')).toBeInTheDocument();
    expect(screen.queryByTestId('conversation-join-c1')).toBeNull();
  });
});
