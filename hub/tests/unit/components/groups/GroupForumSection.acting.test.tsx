import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HttpStatusError } from '@/lib/http/status-error';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ForumPost } from '@/lib/forum/queries';

/**
 * FEAT-H046 STORY-1/2/3 (unit, RED-FIRST) — the wielded forum render.
 *
 * The section gains an `acting` prop ({groupId, name, permissions}) passed by
 * the group page when a hat with standing is selected. Under a hat:
 *  - the read goes through the acting path and a banner names the substitution
 *    ("Viewing as {A}");
 *  - composer/reply gate on the HAT's permissions (pure substitution — the
 *    member's own grants never mix in), and each wielded act confirms with
 *    copy naming the wielding before it fires;
 *  - a hat-insufficiency 403 renders honest copy naming the hat — never the
 *    malfunction fallback;
 *  - edit/delete/moderate/report affordances hide (RULED 2026-08-16:
 *    read/post/reply only — a wielded post is editable by no one, the PD019
 *    v1 posture);
 *  - wielded writes re-read, never optimistic-prepend (the spec rabbit hole).
 * STORY-3's badge cells render `kind` wherever authors render.
 */

const mockForum = {
  peekForum: jest.fn(),
  fetchForum: jest.fn(),
  createForumPost: jest.fn(),
  replyToForumPost: jest.fn(),
  moderateForumPost: jest.fn(),
  dropGroup: jest.fn(),
};
jest.mock('@/lib/forum/client', () => ({
  __esModule: true,
  peekForum: (...a: unknown[]) => mockForum.peekForum(...a),
  fetchForum: (...a: unknown[]) => mockForum.fetchForum(...a),
  createForumPost: (...a: unknown[]) => mockForum.createForumPost(...a),
  replyToForumPost: (...a: unknown[]) => mockForum.replyToForumPost(...a),
  moderateForumPost: (...a: unknown[]) => mockForum.moderateForumPost(...a),
  dropGroup: (...a: unknown[]) => mockForum.dropGroup(...a),
}));

const mockPerms = jest.fn();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: unknown[]) => mockPerms(...a),
}));

jest.mock('@/lib/realtime/forum-tenant', () => ({
  __esModule: true,
  useForumTenant: () => {},
  forumTopic: (groupId: string) => `group:${groupId}:forum`,
}));
jest.mock('@/lib/realtime/use-comm-channel', () => ({
  COMM_POLL_MS: 60000,
  useCommChannel: () => ({ reconnecting: false }),
}));

import { GroupForumSection } from '@/components/groups/GroupForumSection';

function post(overrides: Partial<ForumPost> = {}): ForumPost {
  return {
    id: 'p1',
    parent_post_id: null,
    content: 'hello forum',
    is_deleted: false,
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-20T10:00:00Z',
    author_group_id: 'g-ada',
    author: { display_name: 'Ada', attribution: 'active' },
    replies: [],
    ...overrides,
  };
}

const ACTING = {
  groupId: 'ga',
  name: 'Alpha',
  permissions: ['view_forum', 'post_forum_messages', 'reply_to_messages'],
};

describe('GroupForumSection — wielded render (FEAT-H046)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockForum.peekForum.mockReturnValue(null);
    mockForum.fetchForum.mockResolvedValue([post()]);
    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
  });

  // ---------------------------------------------------------------- STORY-1
  it('S1: the wielded read carries the acting group and a banner names the substitution', async () => {
    render(<GroupForumSection groupId="g1" acting={ACTING} />);
    expect(await screen.findByTestId('forum-acting-banner')).toHaveTextContent(
      'Viewing as Alpha',
    );
    const lastCall = mockForum.fetchForum.mock.calls.at(-1) ?? [];
    expect(lastCall).toContain('ga');
  });

  it('S1: without acting there is no banner and the read carries no acting group (guard)', async () => {
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('hello forum');
    expect(screen.queryByTestId('forum-acting-banner')).toBeNull();
    const lastCall = mockForum.fetchForum.mock.calls.at(-1) ?? [];
    expect(lastCall).not.toContain('ga');
  });

  it("S1: a hat-insufficiency 403 renders honest copy naming the hat — never the malfunction fallback", async () => {
    mockForum.peekForum.mockReturnValue(null);
    mockForum.fetchForum.mockRejectedValue(new HttpStatusError('Not allowed', 403));
    render(<GroupForumSection groupId="g1" acting={{ ...ACTING, permissions: [] }} />);
    const notice = await screen.findByTestId('group-forum-hat-insufficient');
    expect(notice).toHaveTextContent('Alpha');
    expect(screen.queryByTestId('group-forum-unavailable')).toBeNull();
  });

  // ---------------------------------------------------------------- STORY-2
  it("S2: the composer gates on the HAT's permissions — my own grants never mix in", async () => {
    mockPerms.mockResolvedValue({
      permissions: ['post_forum_messages'],
      member_group_id: 'pg-me',
    });
    const { unmount } = render(
      <GroupForumSection groupId="g1" acting={{ ...ACTING, permissions: ['view_forum'] }} />,
    );
    await screen.findByText('hello forum');
    expect(screen.queryByLabelText('Forum post')).toBeNull();
    unmount();

    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
    render(<GroupForumSection groupId="g1" acting={ACTING} />);
    await waitFor(() => expect(screen.getByLabelText('Forum post')).toBeInTheDocument());
  });

  it('S2: a wielded post confirms with copy naming the wielding, then submits with the acting group and re-reads', async () => {
    const user = userEvent.setup();
    mockForum.createForumPost.mockResolvedValue(post({ id: 'w1' }));
    render(<GroupForumSection groupId="g1" acting={ACTING} />);
    await screen.findByText('hello forum');

    await user.type(screen.getByLabelText('Forum post'), 'as the group');
    await user.click(screen.getByTestId('forum-post-submit'));

    expect(await screen.findByText(/You are posting as Alpha/)).toBeInTheDocument();
    expect(mockForum.createForumPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Post as Alpha' }));
    await waitFor(() => expect(mockForum.createForumPost).toHaveBeenCalled());
    const call = mockForum.createForumPost.mock.calls.at(-1) ?? [];
    expect(call).toContain('ga');
    // Re-read, never optimistic-prepend: the forum was fetched again after the write.
    await waitFor(() => expect(mockForum.fetchForum.mock.calls.length).toBeGreaterThan(1));
  });

  it('S2: a wielded reply confirms naming the wielding and submits with the acting group', async () => {
    const user = userEvent.setup();
    mockForum.replyToForumPost.mockResolvedValue(post({ id: 'r9', parent_post_id: 'p1' }));
    render(<GroupForumSection groupId="g1" acting={ACTING} />);
    await screen.findByText('hello forum');

    await user.click(screen.getByTestId('forum-reply-open-p1'));
    await user.type(screen.getByLabelText('Reply'), 'group reply');
    await user.click(screen.getByTestId('forum-reply-submit-p1'));

    expect(await screen.findByText(/You are replying as Alpha/)).toBeInTheDocument();
    expect(mockForum.replyToForumPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reply as Alpha' }));
    await waitFor(() => expect(mockForum.replyToForumPost).toHaveBeenCalled());
    expect(mockForum.replyToForumPost.mock.calls.at(-1) ?? []).toContain('ga');
  });

  it("S2: the contract's 42501 limb copy renders verbatim-faithful", async () => {
    const user = userEvent.setup();
    mockForum.createForumPost.mockRejectedValue(
      new Error('the acting group does not hold post_forum_messages in this group'),
    );
    render(<GroupForumSection groupId="g1" acting={ACTING} />);
    await screen.findByText('hello forum');
    await user.type(screen.getByLabelText('Forum post'), 'stale hat');
    await user.click(screen.getByTestId('forum-post-submit'));
    await user.click(await screen.findByRole('button', { name: 'Post as Alpha' }));
    expect(
      await screen.findByText('the acting group does not hold post_forum_messages in this group'),
    ).toBeInTheDocument();
  });

  it('S2 (ruled): under a hat, edit/moderate/report affordances hide — read/post/reply only', async () => {
    mockPerms.mockResolvedValue({
      permissions: ['moderate_forum', 'post_forum_messages', 'reply_to_messages'],
      member_group_id: 'g-ada', // the rendered post is "mine" personally
    });
    mockForum.fetchForum.mockResolvedValue([
      post({ created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    ]);
    render(<GroupForumSection groupId="g1" acting={ACTING} />);
    await screen.findByText('hello forum');
    expect(screen.queryByTestId('forum-remove-p1')).toBeNull();
    expect(screen.queryByTestId('forum-edit-p1')).toBeNull();
    expect(screen.queryByTestId('forum-delete-p1')).toBeNull();
    expect(screen.queryByText('Report')).toBeNull();
  });

  // ---------------------------------------------------------------- STORY-3
  it("S3: kind 'group' badges the author chip; person/absent render as today; the ladder is never overridden", async () => {
    mockForum.fetchForum.mockResolvedValue([
      post({
        id: 'pg',
        content: 'group-authored',
        author_group_id: 'ga',
        author: { display_name: 'Alpha', attribution: 'active', kind: 'group' },
      }),
      post({
        id: 'pf',
        content: 'former group',
        author_group_id: 'gx',
        author: { display_name: 'Former member', attribution: 'former', kind: 'group' },
      }),
      post({
        id: 'pp',
        content: 'person-authored',
        author: { display_name: 'Ada', attribution: 'active', kind: 'person' },
      }),
      post({ id: 'pl', content: 'legacy shape' }),
    ]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('group-authored');
    expect(screen.getByTestId('forum-author-badge-pg')).toHaveTextContent('Group');
    // The badge does not override the ladder: former stays muted 'Former member'.
    expect(screen.getByTestId('forum-author-badge-pf')).toHaveTextContent('Group');
    expect(screen.getByTestId('forum-author-pf')).toHaveTextContent('Former member');
    expect(screen.queryByTestId('forum-author-badge-pp')).toBeNull();
    expect(screen.queryByTestId('forum-author-badge-pl')).toBeNull();
  });
});
