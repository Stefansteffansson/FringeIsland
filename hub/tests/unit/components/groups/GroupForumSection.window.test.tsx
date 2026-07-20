import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ForumPost } from '@/lib/forum/queries';

/**
 * FEAT-H028 STORY-4 (unit) — the forum's own-edit window affordances (COM-12,
 * Cycle C-D). On my own live post younger than 15 minutes: Edit (inline,
 * confirmed write-through) and Delete (ConfirmModal -> tombstone, rendered
 * exactly like moderation). Own-ness derives from payload facts —
 * `author_group_id` vs my personal-group id (the effective-permissions
 * `member_group_id`), `created_at` (window), `is_deleted` (no affordance on a
 * tombstone). "(edited)" renders when `updated_at > created_at`. A server
 * window refusal is surfaced honestly and the draft is preserved; affordances
 * are absent on others' posts, tombstones, and posts past the window.
 *
 * Red-first: Edit/Delete affordances and the edit/delete couriers do not exist
 * yet.
 */

const mockForum = {
  peekForum: jest.fn(),
  fetchForum: jest.fn(),
  createForumPost: jest.fn(),
  replyToForumPost: jest.fn(),
  moderateForumPost: jest.fn(),
  editForumPost: jest.fn(),
  deleteForumPost: jest.fn(),
  dropGroup: jest.fn(),
};
jest.mock('@/lib/forum/client', () => ({
  __esModule: true,
  peekForum: (...a: unknown[]) => mockForum.peekForum(...a),
  fetchForum: (...a: unknown[]) => mockForum.fetchForum(...a),
  createForumPost: (...a: unknown[]) => mockForum.createForumPost(...a),
  replyToForumPost: (...a: unknown[]) => mockForum.replyToForumPost(...a),
  moderateForumPost: (...a: unknown[]) => mockForum.moderateForumPost(...a),
  editForumPost: (...a: unknown[]) => mockForum.editForumPost(...a),
  deleteForumPost: (...a: unknown[]) => mockForum.deleteForumPost(...a),
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

const MINE = 'g-me';
const recent = () => new Date(Date.now() - 60_000).toISOString(); // 1 min ago
const stale = () => new Date(Date.now() - 20 * 60_000).toISOString(); // 20 min ago

function post(overrides: Partial<ForumPost> = {}): ForumPost {
  const created = recent();
  return {
    id: 'p1',
    parent_post_id: null,
    content: 'my fresh post',
    is_deleted: false,
    created_at: created,
    updated_at: created,
    author_group_id: MINE,
    author: { display_name: 'Me', attribution: 'active' },
    replies: [],
    ...overrides,
  };
}

// My personal-group id rides the effective-permissions payload (member_group_id).
const withMine = (...perms: string[]) =>
  mockPerms.mockResolvedValue({ permissions: perms, member_group_id: MINE });

describe('GroupForumSection — own-edit window (FEAT-H028 STORY-4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockForum.peekForum.mockReturnValue(null);
    mockForum.fetchForum.mockResolvedValue([post()]);
    withMine('post_forum_messages');
  });

  it('shows Edit and Delete on my own live post younger than 15 minutes', async () => {
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('my fresh post');
    expect(screen.getByTestId('forum-edit-p1')).toBeInTheDocument();
    expect(screen.getByTestId('forum-delete-p1')).toBeInTheDocument();
  });

  it('shows no Edit/Delete on another author\'s post', async () => {
    mockForum.fetchForum.mockResolvedValue([
      post({ id: 'other', author_group_id: 'g-ada', author: { display_name: 'Ada', attribution: 'active' } }),
    ]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('my fresh post');
    expect(screen.queryByTestId('forum-edit-other')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forum-delete-other')).not.toBeInTheDocument();
  });

  it('shows no Edit/Delete on my own post past the 15-minute window', async () => {
    const created = stale();
    mockForum.fetchForum.mockResolvedValue([post({ id: 'old', created_at: created, updated_at: created })]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('my fresh post');
    expect(screen.queryByTestId('forum-edit-old')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forum-delete-old')).not.toBeInTheDocument();
  });

  it('shows no Edit/Delete on a tombstone, even my own', async () => {
    mockForum.fetchForum.mockResolvedValue([post({ id: 'gone', is_deleted: true, content: null })]);
    render(<GroupForumSection groupId="g1" />);
    await waitFor(() => expect(screen.getByTestId('forum-tombstone-gone')).toBeInTheDocument());
    expect(screen.queryByTestId('forum-edit-gone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forum-delete-gone')).not.toBeInTheDocument();
  });

  it('edits inline and writes through the confirmed row, marking "(edited)"', async () => {
    const created = recent();
    mockForum.fetchForum.mockResolvedValue([post({ id: 'p1', content: 'typo here', created_at: created, updated_at: created })]);
    mockForum.editForumPost.mockResolvedValue({
      id: 'p1',
      parent_post_id: null,
      content: 'fixed now',
      is_deleted: false,
      created_at: created,
      updated_at: new Date(Date.now() - 30_000).toISOString(), // later than created
      author_group_id: MINE,
      author: { display_name: 'Me', attribution: 'active' },
    });
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('typo here');
    await userEvent.click(screen.getByTestId('forum-edit-p1'));
    const box = screen.getByTestId('forum-edit-input-p1');
    await userEvent.clear(box);
    await userEvent.type(box, 'fixed now');
    await userEvent.click(screen.getByTestId('forum-edit-save-p1'));
    expect(await screen.findByText('fixed now')).toBeInTheDocument();
    expect(mockForum.editForumPost).toHaveBeenCalledWith('g1', 'p1', 'fixed now');
    expect(screen.getByTestId('forum-edited-p1')).toBeInTheDocument();
  });

  it('surfaces a window refusal honestly and preserves the draft edit', async () => {
    mockForum.fetchForum.mockResolvedValue([post({ id: 'p1', content: 'original' })]);
    mockForum.editForumPost.mockRejectedValue(new Error('Your 15-minute edit window has closed.'));
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('original');
    await userEvent.click(screen.getByTestId('forum-edit-p1'));
    const box = screen.getByTestId('forum-edit-input-p1');
    await userEvent.clear(box);
    await userEvent.type(box, 'my draft edit');
    await userEvent.click(screen.getByTestId('forum-edit-save-p1'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/window/i);
    // draft not lost — the editor stays open with my text
    expect(screen.getByTestId('forum-edit-input-p1')).toHaveValue('my draft edit');
  });

  it('deletes behind a ConfirmModal and renders the tombstone in place from the confirmed response', async () => {
    mockForum.fetchForum.mockResolvedValue([post({ id: 'p1', content: 'delete me' })]);
    mockForum.deleteForumPost.mockResolvedValue({
      id: 'p1',
      parent_post_id: null,
      content: null,
      is_deleted: true,
      created_at: recent(),
      updated_at: recent(),
      author_group_id: MINE,
      author: { display_name: 'Me', attribution: 'active' },
    });
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('delete me');
    await userEvent.click(screen.getByTestId('forum-delete-p1'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(await screen.findByTestId('forum-tombstone-p1')).toBeInTheDocument();
    expect(mockForum.deleteForumPost).toHaveBeenCalledWith('g1', 'p1');
  });

  it('renders no "(edited)" marker on a post that has never been edited', async () => {
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('my fresh post');
    expect(screen.queryByTestId('forum-edited-p1')).not.toBeInTheDocument();
  });

  it("offers a Report affordance on another author's post (COM-13)", async () => {
    mockForum.fetchForum.mockResolvedValue([
      post({ id: 'other', content: 'someone else', author_group_id: 'g-ada', author: { display_name: 'Ada', attribution: 'active' } }),
    ]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('someone else');
    expect(screen.getByTestId('report-open-other')).toBeInTheDocument();
  });

  it('offers no Report affordance on my own post', async () => {
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('my fresh post');
    expect(screen.queryByTestId('report-open-p1')).not.toBeInTheDocument();
  });
});
