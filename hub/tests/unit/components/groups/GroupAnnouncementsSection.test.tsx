import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HttpStatusError } from '@/lib/http/status-error';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Announcement } from '@/lib/announcements/queries';

/**
 * FEAT-H028 STORY-1/2 (unit) — the group page Announcements section.
 * Failure-isolated panel (the H026 forum posture, no sockets): newest-first
 * list, honest empty, honest unavailable, keyset load-more, COM-14 attribution.
 * Compose + Retract render ONLY on the platform's `send_announcements` grant
 * (asked of the platform via fetchMyPermissions — the button is UX, the RPC is
 * the gate); the surface renders from the confirmed response and preserves a
 * composed draft on a refusal.
 *
 * Red-first: the component does not exist yet — import fails.
 */

const mockClient = {
  peekGroupAnnouncements: jest.fn(),
  fetchGroupAnnouncements: jest.fn(),
  sendCommunityAnnouncement: jest.fn(),
  retractAnnouncement: jest.fn(),
  dropGroupAnnouncements: jest.fn(),
};
jest.mock('@/lib/announcements/client', () => ({
  __esModule: true,
  peekGroupAnnouncements: (...a: unknown[]) => mockClient.peekGroupAnnouncements(...a),
  fetchGroupAnnouncements: (...a: unknown[]) => mockClient.fetchGroupAnnouncements(...a),
  sendCommunityAnnouncement: (...a: unknown[]) => mockClient.sendCommunityAnnouncement(...a),
  retractAnnouncement: (...a: unknown[]) => mockClient.retractAnnouncement(...a),
  dropGroupAnnouncements: (...a: unknown[]) => mockClient.dropGroupAnnouncements(...a),
}));

const mockPerms = jest.fn();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: unknown[]) => mockPerms(...a),
}));

import { GroupAnnouncementsSection } from '@/components/groups/GroupAnnouncementsSection';

function ann(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a1',
    title: 'Welcome',
    body: 'The board is open.',
    created_at: '2026-07-20T10:00:00Z',
    author_group_id: 'g-ada',
    author: { display_name: 'Ada', attribution: 'active' },
    ...overrides,
  };
}

const withPerms = (...perms: string[]) =>
  mockPerms.mockResolvedValue({ permissions: perms, member_group_id: 'g-me' });

describe('GroupAnnouncementsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.peekGroupAnnouncements.mockReturnValue(null);
    mockClient.fetchGroupAnnouncements.mockResolvedValue([ann()]);
    withPerms();
  });

  it('renders announcements with title, body, and attribution', async () => {
    render(<GroupAnnouncementsSection groupId="g1" />);
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('The board is open.')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('shows an empty state when the group has no announcements', async () => {
    mockClient.fetchGroupAnnouncements.mockResolvedValue([]);
    render(<GroupAnnouncementsSection groupId="g1" />);
    expect(await screen.findByTestId('group-announcements-empty')).toBeInTheDocument();
  });

  it('is failure-isolated: an unavailable read renders honest absence, not a crash', async () => {
    mockClient.fetchGroupAnnouncements.mockRejectedValue(new Error('boom'));
    render(<GroupAnnouncementsSection groupId="g1" />);
    expect(await screen.findByTestId('group-announcements-unavailable')).toBeInTheDocument();
  });

  it('renders former-member attribution muted and never as a link', async () => {
    mockClient.fetchGroupAnnouncements.mockResolvedValue([
      ann({ id: 'fm', author: { display_name: 'Former member', attribution: 'former' } }),
    ]);
    render(<GroupAnnouncementsSection groupId="g1" />);
    const label = await screen.findByTestId('announcement-author-fm');
    expect(label).toHaveTextContent('Former member');
    expect(label.className).toContain('italic');
    expect(label.closest('a')).toBeNull();
  });

  it('shows the compose affordance only with send_announcements', async () => {
    withPerms();
    const { unmount } = render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');
    expect(screen.queryByTestId('announcement-compose-title')).not.toBeInTheDocument();
    unmount();

    withPerms('send_announcements');
    render(<GroupAnnouncementsSection groupId="g1" />);
    await waitFor(() =>
      expect(screen.getByTestId('announcement-compose-title')).toBeInTheDocument(),
    );
  });

  it('sends and prepends the announcement from the confirmed response', async () => {
    withPerms('send_announcements');
    mockClient.sendCommunityAnnouncement.mockResolvedValue(
      ann({ id: 'new', title: 'Fresh word', body: 'Just now.' }),
    );
    render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');
    await userEvent.type(screen.getByTestId('announcement-compose-title'), 'Fresh word');
    await userEvent.type(screen.getByTestId('announcement-compose-body'), 'Just now.');
    await userEvent.click(screen.getByTestId('announcement-send'));
    expect(await screen.findByText('Fresh word')).toBeInTheDocument();
    expect(mockClient.sendCommunityAnnouncement).toHaveBeenCalledWith('g1', 'Fresh word', 'Just now.');
  });

  it('preserves the composed draft when a send is refused', async () => {
    withPerms('send_announcements');
    mockClient.sendCommunityAnnouncement.mockRejectedValue(new Error('Not allowed'));
    render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');
    await userEvent.type(screen.getByTestId('announcement-compose-title'), 'Kept title');
    await userEvent.type(screen.getByTestId('announcement-compose-body'), 'Kept body');
    await userEvent.click(screen.getByTestId('announcement-send'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('announcement-compose-title')).toHaveValue('Kept title');
    expect(screen.getByTestId('announcement-compose-body')).toHaveValue('Kept body');
  });

  it('shows Retract only with send_announcements', async () => {
    withPerms();
    const { unmount } = render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');
    expect(screen.queryByTestId('announcement-retract-a1')).not.toBeInTheDocument();
    unmount();

    withPerms('send_announcements');
    render(<GroupAnnouncementsSection groupId="g1" />);
    await waitFor(() =>
      expect(screen.getByTestId('announcement-retract-a1')).toBeInTheDocument(),
    );
  });

  it('retracts behind a ConfirmModal and removes the row from the confirmed response', async () => {
    withPerms('send_announcements');
    mockClient.retractAnnouncement.mockResolvedValue({
      id: 'a1',
      retracted_at: '2026-07-20T11:00:00Z',
    });
    render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');
    await userEvent.click(screen.getByTestId('announcement-retract-a1'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(screen.queryByText('Welcome')).not.toBeInTheDocument());
    expect(mockClient.retractAnnouncement).toHaveBeenCalledWith('g1', 'a1');
  });

  it('continues keyset pagination without duplication on load-more', async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      ann({ id: `a${i}`, title: `Notice ${i}`, created_at: `2026-07-20T10:${String(i).padStart(2, '0')}:00Z` }),
    );
    mockClient.fetchGroupAnnouncements
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([ann({ id: 'older', title: 'Older notice' })]);
    render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Notice 0');
    await userEvent.click(screen.getByTestId('announcements-load-earlier'));
    expect(await screen.findByText('Older notice')).toBeInTheDocument();
    // keyset continuation is called with the oldest loaded created_at
    expect(mockClient.fetchGroupAnnouncements).toHaveBeenLastCalledWith('g1', '2026-07-20T10:19:00Z');
  });
});

// ---------------------------------------------------------------------------
// Post-6-done fix (2026-08-14, live walk): same-page sibling of the forum's
// members-only honesty — a 403 is a refusal, not a failure. Red-first.
// ---------------------------------------------------------------------------
describe('members-only honesty (post-6-done fix 2026-08-14)', () => {
  it('renders members-only copy when the read is refused (403), never the failure fallback', async () => {
    mockClient.fetchGroupAnnouncements.mockRejectedValue(new HttpStatusError('Not allowed', 403));
    render(<GroupAnnouncementsSection groupId="g1" />);
    expect(await screen.findByTestId('group-announcements-members-only')).toBeInTheDocument();
    expect(screen.getByTestId('group-announcements-members-only')).toHaveTextContent(
      'Announcements are for members of this group.',
    );
    expect(screen.queryByTestId('group-announcements-unavailable')).toBeNull();
  });
});
