import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ForumPost } from '@/lib/forum/queries';
import type * as ForumClient from '@/lib/forum/client';
import type * as GroupsClient from '@/lib/groups/client';

/**
 * FEAT-H028 STORY-4 (unit), amended by TASK-EDT-01 (RULED 2026-08-19 +
 * delete-ruling 2026-08-21) — own-post editing and deletion go UNLIMITED; the
 * 15-minute window is retired. Transparency replaces the clock: "(edited)"
 * renders whenever `updated_at − created_at > 3 minutes` — the 3-minute grace
 * lets a fresh typo repair stay silent (the Stack Overflow/Discourse pattern);
 * any later edit turns the note on, honestly reflecting the LAST state.
 * Own-ness still derives from payload facts (`author_group_id` vs my
 * personal-group id); tombstones still carry no affordances; the wielded
 * no-edit posture is untouched.
 *
 * Adapted from the windowed suite (labelled): the stale-post cell FLIPPED
 * (affordances now render regardless of age — red-first against the windowed
 * render), the in-grace silent cell is new (red-first: the old rule showed
 * the note for any updated_at > created_at), and the window-refusal cell
 * became a generic-refusal cell (the window refusal no longer exists; the
 * draft-preservation coverage it carried lives on).
 */

const mockForum = {
  peekForum: jest.fn<typeof ForumClient.peekForum>(),
  fetchForum: jest.fn<typeof ForumClient.fetchForum>(),
  createForumPost: jest.fn<typeof ForumClient.createForumPost>(),
  replyToForumPost: jest.fn<typeof ForumClient.replyToForumPost>(),
  moderateForumPost: jest.fn<typeof ForumClient.moderateForumPost>(),
  editForumPost: jest.fn<typeof ForumClient.editForumPost>(),
  deleteForumPost: jest.fn<typeof ForumClient.deleteForumPost>(),
  dropGroup: jest.fn<typeof ForumClient.dropGroup>(),
};
jest.mock('@/lib/forum/client', () => ({
  __esModule: true,
  peekForum: (...a: Parameters<typeof ForumClient.peekForum>) => mockForum.peekForum(...a),
  fetchForum: (...a: Parameters<typeof ForumClient.fetchForum>) => mockForum.fetchForum(...a),
  createForumPost: (...a: Parameters<typeof ForumClient.createForumPost>) => mockForum.createForumPost(...a),
  replyToForumPost: (...a: Parameters<typeof ForumClient.replyToForumPost>) => mockForum.replyToForumPost(...a),
  moderateForumPost: (...a: Parameters<typeof ForumClient.moderateForumPost>) => mockForum.moderateForumPost(...a),
  editForumPost: (...a: Parameters<typeof ForumClient.editForumPost>) => mockForum.editForumPost(...a),
  deleteForumPost: (...a: Parameters<typeof ForumClient.deleteForumPost>) => mockForum.deleteForumPost(...a),
  dropGroup: (...a: Parameters<typeof ForumClient.dropGroup>) => mockForum.dropGroup(...a),
}));

const mockPerms = jest.fn<typeof GroupsClient.fetchMyPermissions>();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: Parameters<typeof GroupsClient.fetchMyPermissions>) => mockPerms(...a),
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

  it('shows Edit and Delete on my own live post', async () => {
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

  it('TASK-EDT-01 (flipped): Edit and Delete render on my own old post — the window is retired', async () => {
    const created = stale();
    mockForum.fetchForum.mockResolvedValue([post({ id: 'old', created_at: created, updated_at: created })]);
    render(<GroupForumSection groupId="g1" />);
    await waitFor(() => expect(screen.getByTestId('forum-edit-old')).toBeInTheDocument());
    expect(screen.getByTestId('forum-delete-old')).toBeInTheDocument();
  });

  it('shows no Edit/Delete on a tombstone, even my own', async () => {
    mockForum.fetchForum.mockResolvedValue([post({ id: 'gone', is_deleted: true, content: null })]);
    render(<GroupForumSection groupId="g1" />);
    await waitFor(() => expect(screen.getByTestId('forum-tombstone-gone')).toBeInTheDocument());
    expect(screen.queryByTestId('forum-edit-gone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forum-delete-gone')).not.toBeInTheDocument();
  });

  it('edits an OLD post inline and writes through the confirmed row, marking "(edited)" (TASK-EDT-01: no clock)', async () => {
    const created = stale(); // 20 min old — editable now that the window is retired
    mockForum.fetchForum.mockResolvedValue([post({ id: 'p1', content: 'typo here', created_at: created, updated_at: created })]);
    mockForum.editForumPost.mockResolvedValue({
      id: 'p1',
      parent_post_id: null,
      content: 'fixed now',
      is_deleted: false,
      created_at: created,
      updated_at: new Date().toISOString(), // 20 min past created — well past the grace
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

  it('surfaces a server refusal honestly and preserves the draft edit (TASK-EDT-01: the window refusal is gone; the coverage stays)', async () => {
    mockForum.fetchForum.mockResolvedValue([post({ id: 'p1', content: 'original' })]);
    mockForum.editForumPost.mockRejectedValue(new Error('Not allowed'));
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('original');
    await userEvent.click(screen.getByTestId('forum-edit-p1'));
    const box = screen.getByTestId('forum-edit-input-p1');
    await userEvent.clear(box);
    await userEvent.type(box, 'my draft edit');
    await userEvent.click(screen.getByTestId('forum-edit-save-p1'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed');
    // draft not lost — the editor stays open with my text
    expect(screen.getByTestId('forum-edit-input-p1')).toHaveValue('my draft edit');
  });

  it('TASK-EDT-01: an edit inside the 3-minute grace stays silent — no "(edited)" note', async () => {
    const created = recent(); // 1 min ago
    mockForum.fetchForum.mockResolvedValue([post({ id: 'p1', content: 'typo here', created_at: created, updated_at: created })]);
    mockForum.editForumPost.mockResolvedValue({
      id: 'p1',
      parent_post_id: null,
      content: 'fixed quietly',
      is_deleted: false,
      created_at: created,
      updated_at: new Date(new Date(created).getTime() + 2 * 60_000).toISOString(), // 2 min after created — inside the grace
      author_group_id: MINE,
      author: { display_name: 'Me', attribution: 'active' },
    });
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('typo here');
    await userEvent.click(screen.getByTestId('forum-edit-p1'));
    const box = screen.getByTestId('forum-edit-input-p1');
    await userEvent.clear(box);
    await userEvent.type(box, 'fixed quietly');
    await userEvent.click(screen.getByTestId('forum-edit-save-p1'));
    expect(await screen.findByText('fixed quietly')).toBeInTheDocument();
    expect(screen.queryByTestId('forum-edited-p1')).not.toBeInTheDocument();
  });

  it('TASK-EDT-01 (guard): a fetched post edited past the grace renders the note payload-driven', async () => {
    const created = stale();
    mockForum.fetchForum.mockResolvedValue([
      post({
        id: 'p1',
        content: 'long since amended',
        created_at: created,
        updated_at: new Date(new Date(created).getTime() + 10 * 60_000).toISOString(), // 10 min after created
      }),
    ]);
    render(<GroupForumSection groupId="g1" />);
    await screen.findByText('long since amended');
    expect(screen.getByTestId('forum-edited-p1')).toBeInTheDocument();
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
