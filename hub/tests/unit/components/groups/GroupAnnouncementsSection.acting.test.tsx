import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HttpStatusError } from '@/lib/http/status-error';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Announcement } from '@/lib/announcements/queries';
import type * as AnnouncementsClient from '@/lib/announcements/client';
import type * as GroupsClient from '@/lib/groups/client';

/**
 * FEAT-H048 STORY-1/2/3 (unit, RED-FIRST) — the wielded announcements board.
 *
 * The section gains the `acting` prop its two siblings already carry
 * ({groupId, name, permissions}), passed by the group page when a hat with
 * standing is selected. Under a hat:
 *  - the read carries the acting group and a banner names the substitution
 *    ("Viewing as {A}");
 *  - compose and Retract gate on the HAT's `send_announcements` — pure
 *    substitution, the wielder's own grant never mixes in;
 *  - both acts CONFIRM with copy naming the wielding before firing (RULED: a
 *    board is not a cadence surface, so no H047-style composer label);
 *  - a hat-insufficiency 403 renders honest copy naming the hat — never the
 *    malfunction fallback and never the members-only copy;
 *  - the two views never share a cache entry (peek is view-keyed).
 * STORY-3's badge cells render the widened ladder's `kind` in BOTH views.
 */

const mockClient = {
  peekGroupAnnouncements: jest.fn<typeof AnnouncementsClient.peekGroupAnnouncements>(),
  fetchGroupAnnouncements: jest.fn<typeof AnnouncementsClient.fetchGroupAnnouncements>(),
  sendCommunityAnnouncement: jest.fn<typeof AnnouncementsClient.sendCommunityAnnouncement>(),
  retractAnnouncement: jest.fn<typeof AnnouncementsClient.retractAnnouncement>(),
  dropGroupAnnouncements: jest.fn<typeof AnnouncementsClient.dropGroupAnnouncements>(),
};
jest.mock('@/lib/announcements/client', () => ({
  __esModule: true,
  peekGroupAnnouncements: (...a: Parameters<typeof AnnouncementsClient.peekGroupAnnouncements>) => mockClient.peekGroupAnnouncements(...a),
  fetchGroupAnnouncements: (...a: Parameters<typeof AnnouncementsClient.fetchGroupAnnouncements>) => mockClient.fetchGroupAnnouncements(...a),
  sendCommunityAnnouncement: (...a: Parameters<typeof AnnouncementsClient.sendCommunityAnnouncement>) => mockClient.sendCommunityAnnouncement(...a),
  retractAnnouncement: (...a: Parameters<typeof AnnouncementsClient.retractAnnouncement>) => mockClient.retractAnnouncement(...a),
  dropGroupAnnouncements: (...a: Parameters<typeof AnnouncementsClient.dropGroupAnnouncements>) => mockClient.dropGroupAnnouncements(...a),
}));

const mockPerms = jest.fn<typeof GroupsClient.fetchMyPermissions>();
jest.mock('@/lib/groups/client', () => ({
  __esModule: true,
  fetchMyPermissions: (...a: Parameters<typeof GroupsClient.fetchMyPermissions>) => mockPerms(...a),
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

const ACTING = {
  groupId: 'ga',
  name: 'Alpha',
  permissions: ['send_announcements'],
};

describe('GroupAnnouncementsSection — wielded render (FEAT-H048)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.peekGroupAnnouncements.mockReturnValue(null);
    mockClient.fetchGroupAnnouncements.mockResolvedValue([ann()]);
    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'g-me' });
  });

  // ---------------------------------------------------------------- STORY-1
  it('S1: the wielded read carries the acting group and a banner names the substitution', async () => {
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    expect(await screen.findByTestId('announcements-acting-banner')).toHaveTextContent(
      'Viewing as Alpha',
    );
    expect(mockClient.fetchGroupAnnouncements.mock.calls.at(-1) ?? []).toContain('ga');
  });

  it('S1: without acting there is no banner and the read carries no acting group (guard)', async () => {
    render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');
    expect(screen.queryByTestId('announcements-acting-banner')).toBeNull();
    expect(mockClient.fetchGroupAnnouncements.mock.calls.at(-1) ?? []).not.toContain('ga');
  });

  it('S1: a hat-insufficiency 403 names the hat — never the malfunction or members-only copy', async () => {
    mockClient.fetchGroupAnnouncements.mockRejectedValue(new HttpStatusError('Not allowed', 403));
    render(<GroupAnnouncementsSection groupId="g1" acting={{ ...ACTING, permissions: [] }} />);
    const notice = await screen.findByTestId('group-announcements-hat-insufficient');
    expect(notice).toHaveTextContent('Alpha');
    expect(screen.queryByTestId('group-announcements-unavailable')).toBeNull();
    expect(screen.queryByTestId('group-announcements-members-only')).toBeNull();
  });

  it('S1: each view peeks its own cache entry — the two never share (view-keyed)', async () => {
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await screen.findByText('Welcome');
    expect(mockClient.peekGroupAnnouncements.mock.calls.at(-1) ?? []).toContain('ga');
  });

  // ---------------------------------------------------------------- STORY-2
  it("S2: compose gates on the HAT's send_announcements — my own grant never mixes in", async () => {
    mockPerms.mockResolvedValue({ permissions: ['send_announcements'], member_group_id: 'g-me' });
    const { unmount } = render(
      <GroupAnnouncementsSection groupId="g1" acting={{ ...ACTING, permissions: [] }} />,
    );
    await screen.findByText('Welcome');
    expect(screen.queryByTestId('announcement-compose-title')).toBeNull();
    expect(screen.queryByTestId('announcement-retract-a1')).toBeNull();
    unmount();

    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'g-me' });
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await waitFor(() =>
      expect(screen.getByTestId('announcement-compose-title')).toBeInTheDocument(),
    );
    await screen.findByText('Welcome');
    expect(screen.getByTestId('announcement-retract-a1')).toBeInTheDocument();
  });

  it('S2: a wielded announce confirms naming the wielding, then sends with the acting group', async () => {
    const user = userEvent.setup();
    mockClient.sendCommunityAnnouncement.mockResolvedValue(
      ann({ id: 'w1', title: 'From Alpha', body: 'Hello all.' }),
    );
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await screen.findByText('Welcome');

    await user.type(screen.getByTestId('announcement-compose-title'), 'From Alpha');
    await user.type(screen.getByTestId('announcement-compose-body'), 'Hello all.');
    await user.click(screen.getByTestId('announcement-send'));

    expect(await screen.findByText(/You are announcing as Alpha/)).toBeInTheDocument();
    expect(mockClient.sendCommunityAnnouncement).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Announce as Alpha' }));
    await waitFor(() => expect(mockClient.sendCommunityAnnouncement).toHaveBeenCalled());
    expect(mockClient.sendCommunityAnnouncement.mock.calls.at(-1) ?? []).toContain('ga');
    expect(await screen.findByText('From Alpha')).toBeInTheDocument();
  });

  it('S2: cancelling the announce confirm fires nothing and keeps the composed draft', async () => {
    const user = userEvent.setup();
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await screen.findByText('Welcome');

    await user.type(screen.getByTestId('announcement-compose-title'), 'Draft title');
    await user.type(screen.getByTestId('announcement-compose-body'), 'Draft body');
    await user.click(screen.getByTestId('announcement-send'));
    await screen.findByText(/You are announcing as Alpha/);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockClient.sendCommunityAnnouncement).not.toHaveBeenCalled();
    expect(screen.getByTestId('announcement-compose-title')).toHaveValue('Draft title');
    expect(screen.getByTestId('announcement-compose-body')).toHaveValue('Draft body');
  });

  it('S2: a wielded retract confirms naming the wielding, then retracts with the acting group', async () => {
    const user = userEvent.setup();
    mockClient.retractAnnouncement.mockResolvedValue({
      id: 'a1',
      retracted_at: '2026-07-21T10:00:00Z',
    });
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await screen.findByText('Welcome');

    await user.click(screen.getByTestId('announcement-retract-a1'));
    expect(await screen.findByText(/You are retracting as Alpha/)).toBeInTheDocument();
    expect(mockClient.retractAnnouncement).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Retract as Alpha' }));
    await waitFor(() => expect(mockClient.retractAnnouncement).toHaveBeenCalled());
    expect(mockClient.retractAnnouncement.mock.calls.at(-1) ?? []).toContain('ga');
    await waitFor(() => expect(screen.queryByText('Welcome')).toBeNull());
  });

  it("S2: the contract's 42501 limb copy renders verbatim-faithful", async () => {
    const user = userEvent.setup();
    mockClient.sendCommunityAnnouncement.mockRejectedValue(
      new Error('the acting group does not hold send_announcements in this group'),
    );
    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await screen.findByText('Welcome');

    await user.type(screen.getByTestId('announcement-compose-title'), 'Stale hat');
    await user.type(screen.getByTestId('announcement-compose-body'), 'Body');
    await user.click(screen.getByTestId('announcement-send'));
    await user.click(await screen.findByRole('button', { name: 'Announce as Alpha' }));

    expect(
      await screen.findByText('the acting group does not hold send_announcements in this group'),
    ).toBeInTheDocument();
  });

  it('S2 guard: without a hat, announce and retract fire on the personal grant with no wielding confirm', async () => {
    const user = userEvent.setup();
    mockPerms.mockResolvedValue({ permissions: ['send_announcements'], member_group_id: 'g-me' });
    mockClient.sendCommunityAnnouncement.mockResolvedValue(ann({ id: 'p1', title: 'Mine' }));
    render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Welcome');

    await user.type(screen.getByTestId('announcement-compose-title'), 'Mine');
    await user.type(screen.getByTestId('announcement-compose-body'), 'Body');
    await user.click(screen.getByTestId('announcement-send'));

    await waitFor(() => expect(mockClient.sendCommunityAnnouncement).toHaveBeenCalled());
    expect(mockClient.sendCommunityAnnouncement.mock.calls.at(-1) ?? []).not.toContain('ga');
    expect(screen.queryByText(/You are announcing as/)).toBeNull();
  });

  // ---------------------------------------------------------------- STORY-3
  it("S3: kind 'group' badges the byline in both views; person/absent render as today; the ladder is never overridden", async () => {
    mockClient.fetchGroupAnnouncements.mockResolvedValue([
      ann({
        id: 'ag',
        title: 'Group announced',
        author_group_id: 'ga',
        author: { display_name: 'Alpha', attribution: 'active', kind: 'group' },
      }),
      ann({
        id: 'af',
        title: 'Former announced',
        author_group_id: 'gx',
        author: { display_name: 'Former member', attribution: 'former', kind: 'group' },
      }),
      ann({
        id: 'ap',
        title: 'Person announced',
        author: { display_name: 'Ada', attribution: 'active', kind: 'person' },
      }),
      ann({ id: 'al', title: 'Legacy shape' }),
    ]);

    const { unmount } = render(<GroupAnnouncementsSection groupId="g1" />);
    await screen.findByText('Group announced');
    expect(screen.getByTestId('announcement-author-badge-ag')).toHaveTextContent('Group');
    // The badge never overrides the ladder: former stays muted 'Former member'.
    expect(screen.getByTestId('announcement-author-badge-af')).toHaveTextContent('Group');
    expect(screen.getByTestId('announcement-author-af')).toHaveTextContent('Former member');
    expect(screen.queryByTestId('announcement-author-badge-ap')).toBeNull();
    expect(screen.queryByTestId('announcement-author-badge-al')).toBeNull();
    unmount();

    render(<GroupAnnouncementsSection groupId="g1" acting={ACTING} />);
    await screen.findByText('Group announced');
    expect(screen.getByTestId('announcement-author-badge-ag')).toHaveTextContent('Group');
  });
});

/**
 * 2026-09-05 (the Ferd-close E2E run) — the stale-response race, the same
 * shape the conversations section failed on: the personal read fired at
 * mount was still in flight when the hat went on; the wielded read landed
 * first, the personal read resolved last as a 403 and flipped the section
 * to the hat-insufficient copy. A superseded read never writes.
 */
function deferredRace<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const RACE_ACTING = { groupId: 'ga', name: 'Alpha', permissions: ['view_announcements'] };

describe('GroupAnnouncementsSection — a superseded read never overwrites the current view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.peekGroupAnnouncements.mockReturnValue(null);
    mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
  });

  it('the personal read in flight when the hat went on resolves last as a refusal — the wielded announcements stay, the hat is not called insufficient', async () => {
    const stale = deferredRace<Announcement[]>();
    mockClient.fetchGroupAnnouncements.mockImplementation((_groupId, _before, acting) =>
      acting ? Promise.resolve([ann()]) : stale.promise,
    );
    const view = render(<GroupAnnouncementsSection groupId="g1" />);
    view.rerender(<GroupAnnouncementsSection groupId="g1" acting={RACE_ACTING} />);
    expect(await screen.findByTestId(`announcement-${ann().id}`)).toBeInTheDocument();

    await act(async () => {
      stale.reject(new HttpStatusError('Not allowed', 403));
      await Promise.resolve();
    });

    expect(screen.queryByTestId('group-announcements-hat-insufficient')).toBeNull();
    expect(screen.queryByTestId('group-announcements-members-only')).toBeNull();
    expect(screen.getByTestId(`announcement-${ann().id}`)).toBeInTheDocument();
  });
});
