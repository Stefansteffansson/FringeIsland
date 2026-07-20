import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ForumPost } from '@/lib/forum/queries';

/**
 * FEAT-H026 (unit) — the group Forum section.
 *
 * Honest labelling (feature-development skill): TEST-AFTER pyramid coverage.
 * The section was built ahead of this suite; the red-first proof of C-B's
 * behaviour is the platform contract suite (forum-contracts.test.ts, 18-red)
 * and the E2E (red pre-apply until the schema gate merges). These unit tests
 * pin the component's own logic — permission-gated affordances, optimistic
 * post, tombstone rendering, attribution styling, failure isolation — which
 * neither of those tiers exercises directly.
 */

const mockForum = {
  peekForum: jest.fn(),
  fetchForum: jest.fn(),
  createForumPost: jest.fn(),
  replyToForumPost: jest.fn(),
  moderateForumPost: jest.fn(),
};
jest.mock('@/lib/forum/client', () => ({
  __esModule: true,
  peekForum: (...a: unknown[]) => mockForum.peekForum(...a),
  fetchForum: (...a: unknown[]) => mockForum.fetchForum(...a),
  createForumPost: (...a: unknown[]) => mockForum.createForumPost(...a),
  replyToForumPost: (...a: unknown[]) => mockForum.replyToForumPost(...a),
  moderateForumPost: (...a: unknown[]) => mockForum.moderateForumPost(...a),
}));

const mockPerms = jest.fn();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: unknown[]) => mockPerms(...a),
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

const withPerms = (...perms: string[]) => mockPerms.mockResolvedValue({ permissions: perms });

describe('GroupForumSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockForum.peekForum.mockReturnValue(null);
    mockForum.fetchForum.mockResolvedValue([post()]);
    withPerms();
  });

  it('renders threads and their author display', async () => {
    render(<GroupForumSection groupId="g1" />);
    expect(await screen.findByText('hello forum')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('shows the composer only with post_forum_messages', async () => {
    withPerms();
    const { unmount } = render(<GroupForumSection groupId="g1" />);
    await screen.findByText('hello forum');
    expect(screen.queryByLabelText('Forum post')).not.toBeInTheDocument();
    unmount();

    withPerms('post_forum_messages');
    render(<GroupForumSection groupId="g1" />);
    await waitFor(() => expect(screen.getByLabelText('Forum post')).toBeInTheDocument());
  });

  it('shows Reply only with reply_to_messages and only on top-level posts', async () => {
    mockForum.fetchForum.mockResolvedValue([
      post({ id: 'top', content: 'top', replies: [post({ id: 'r1', parent_post_id: 'top', content: 'a reply' })] }),
    ]);
    withPerms('reply_to_messages');
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('top');
    expect(screen.getByTestId('forum-reply-open-top')).toBeInTheDocument();
    expect(screen.queryByTestId('forum-reply-open-r1')).not.toBeInTheDocument();
  });

  it('shows Remove only with moderate_forum', async () => {
    withPerms('moderate_forum');
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('hello forum');
    expect(screen.getByTestId('forum-remove-p1')).toBeInTheDocument();
  });

  it('optimistically prepends a posted thread from the confirmed row', async () => {
    withPerms('post_forum_messages');
    mockForum.createForumPost.mockResolvedValue(
      post({ id: 'new', content: 'fresh thread', author: { display_name: 'Ada', attribution: 'active' } }),
    );
    render(<GroupForumSection groupId="g1" />);
    const box = await screen.findByLabelText('Forum post');
    await userEvent.type(box, 'fresh thread');
    await userEvent.click(screen.getByTestId('forum-post-submit'));
    expect(await screen.findByText('fresh thread')).toBeInTheDocument();
    expect(mockForum.createForumPost).toHaveBeenCalledWith('g1', 'fresh thread');
  });

  it('renders a tombstone in place for a removed post, with content withheld', async () => {
    mockForum.fetchForum.mockResolvedValue([
      post({ id: 'gone', is_deleted: true, content: null, author: { display_name: 'Ada', attribution: 'active' } }),
    ]);
    render(<GroupForumSection groupId="g1" />);
    expect(await screen.findByTestId('forum-tombstone-gone')).toHaveTextContent(/removed by a group moderator/i);
  });

  it('renders former-member attribution muted and never as a link', async () => {
    mockForum.fetchForum.mockResolvedValue([
      post({ id: 'fm', author: { display_name: 'Former member', attribution: 'former' } }),
    ]);
    render(<GroupForumSection groupId="g1" />);
    const label = await screen.findByTestId('forum-author-fm');
    expect(label).toHaveTextContent('Former member');
    expect(label.className).toContain('italic');
    expect(label.closest('a')).toBeNull();
  });

  it('is failure-isolated: an unavailable read renders honest absence, not a crash', async () => {
    mockForum.fetchForum.mockRejectedValue(new Error('boom'));
    render(<GroupForumSection groupId="g1" />);
    expect(await screen.findByTestId('group-forum-unavailable')).toBeInTheDocument();
  });
});
