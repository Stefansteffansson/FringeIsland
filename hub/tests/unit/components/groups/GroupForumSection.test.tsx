import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
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

// Capture the section's realtime hint callback so a live hint can be simulated.
const mockForumTenant: { onHint: (() => void) | null } = { onHint: null };
jest.mock('@/lib/realtime/forum-tenant', () => ({
  __esModule: true,
  useForumTenant: (_groupId: string | null, onHint: () => void) => {
    mockForumTenant.onHint = onHint;
  },
  forumTopic: (groupId: string) => `group:${groupId}:forum`,
}));

// Control the reconciliation hook: flip `reconnecting`, capture `onReconcile`.
const mockComm: { reconnecting: boolean; onReconcile: (() => void) | null } = {
  reconnecting: false,
  onReconcile: null,
};
jest.mock('@/lib/realtime/use-comm-channel', () => ({
  COMM_POLL_MS: 60000,
  useCommChannel: (_topic: string | null, onReconcile: () => void) => {
    mockComm.onReconcile = onReconcile;
    return { reconnecting: mockComm.reconnecting };
  },
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
    mockForumTenant.onHint = null;
    mockComm.reconnecting = false;
    mockComm.onReconcile = null;
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

  it('a forum hint drops the group cache and re-reads — new content appears, drafts preserved (FEAT-H027 STORY-4)', async () => {
    withPerms('post_forum_messages');
    mockForum.fetchForum
      .mockResolvedValueOnce([post({ id: 'p1', content: 'hello forum' })])
      .mockResolvedValueOnce([
        post({ id: 'new', content: 'brand new thread' }),
        post({ id: 'p1', content: 'hello forum' }),
      ]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('hello forum');

    // A half-written draft that a live refresh must never eat.
    await userEvent.type(screen.getByLabelText('Forum post'), 'my unsent draft');

    await act(async () => {
      mockForumTenant.onHint!();
    });

    // dropGroup + re-read (refetch-don't-patch: the payload id is never spliced).
    expect(mockForum.dropGroup).toHaveBeenCalledWith('g1');
    expect(await screen.findByText('brand new thread')).toBeInTheDocument();
    expect(screen.getByLabelText('Forum post')).toHaveValue('my unsent draft');
  });

  it('a moderation hint materializes the standard tombstone in place (FEAT-H027 STORY-4)', async () => {
    mockForum.fetchForum
      .mockResolvedValueOnce([post({ id: 'p1', content: 'to be removed' })])
      .mockResolvedValueOnce([post({ id: 'p1', is_deleted: true, content: null })]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('to be removed');

    await act(async () => {
      mockForumTenant.onHint!();
    });

    expect(await screen.findByTestId('forum-tombstone-p1')).toHaveTextContent(
      /removed by a group moderator/i,
    );
  });

  it('shows the quiet reconnecting affordance while the forum channel is degraded (FEAT-H027 STORY-6)', async () => {
    mockComm.reconnecting = true;
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('hello forum');
    expect(screen.getByTestId('comm-reconnecting')).toBeInTheDocument();
  });

  it('reconciles the forum on recovery/visibility — dropGroup + re-read (FEAT-H027 STORY-6)', async () => {
    mockForum.fetchForum
      .mockResolvedValueOnce([post({ id: 'p1', content: 'hello forum' })])
      .mockResolvedValueOnce([
        post({ id: 'new2', content: 'caught up thread' }),
        post({ id: 'p1', content: 'hello forum' }),
      ]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('hello forum');

    await act(async () => {
      mockComm.onReconcile!();
    });

    expect(mockForum.dropGroup).toHaveBeenCalledWith('g1');
    expect(await screen.findByText('caught up thread')).toBeInTheDocument();
  });
});
