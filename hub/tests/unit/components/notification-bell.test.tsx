/**
 * FEAT-H030 — the notification bell + unread badge + dropdown (NTF-2/3/7).
 * Red-first: written before the component exists (module-absent red).
 * Mirrors the MessagesLink chrome idiom (FIM-only, best-effort, badge).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

let identity: string | null = 'fim';
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ identity, user: { id: 'u1' } }),
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const fetchNotifications = jest.fn<Promise<unknown>, [unknown?]>();
const fetchUnreadCount = jest.fn<Promise<number>, []>();
const peekUnreadCount = jest.fn<number | null, []>(() => null);
const markNotificationRead = jest.fn<Promise<void>, [string]>();
const markAllNotificationsRead = jest.fn<Promise<number>, []>();
const invalidateNotificationsCache = jest.fn();
const respondToNotification = jest.fn<Promise<unknown>, [unknown, boolean]>();
jest.mock('@/lib/notifications/client', () => ({
  fetchNotifications: (opts?: unknown) => fetchNotifications(opts),
  fetchUnreadCount: () => fetchUnreadCount(),
  peekUnreadCount: () => peekUnreadCount(),
  markNotificationRead: (id: string) => markNotificationRead(id),
  markAllNotificationsRead: () => markAllNotificationsRead(),
  invalidateNotificationsCache: () => invalidateNotificationsCache(),
  respondToNotification: (row: unknown, accept: boolean) => respondToNotification(row, accept),
  // The REAL routing rule, deliberately not a double: `notificationTarget` is
  // pure (no I/O), and W-04 is a claim about where a member lands. A stubbed
  // target would assert only that the component calls a function.
  notificationTarget: jest.requireActual<typeof import('@/lib/notifications/client')>(
    '@/lib/notifications/client',
  ).notificationTarget,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NotificationBell } = require('@/components/notifications/NotificationBell') as
  typeof import('@/components/notifications/NotificationBell');

const row = (over: Partial<Record<string, unknown>>) => ({
  id: 'n1',
  kind: 'invitation_received',
  category: 'membership',
  title: 'You were invited',
  body: 'Come join us',
  group_id: null,
  created_at: '2026-07-23T10:00:00Z',
  is_read: false,
  read_at: null,
  action_type: null,
  action_taken: null,
  expires_at: null,
  ...over,
});

describe('NotificationBell', () => {
  beforeEach(() => {
    identity = 'fim';
    push.mockReset();
    fetchNotifications.mockReset();
    fetchUnreadCount.mockReset();
    fetchUnreadCount.mockResolvedValue(0);
    peekUnreadCount.mockReset();
    peekUnreadCount.mockReturnValue(null);
    markNotificationRead.mockReset();
    markNotificationRead.mockResolvedValue();
    markAllNotificationsRead.mockReset();
    markAllNotificationsRead.mockResolvedValue(0);
    invalidateNotificationsCache.mockReset();
    respondToNotification.mockReset();
    respondToNotification.mockResolvedValue({ outcome: 'accepted' });
    fetchNotifications.mockResolvedValue([]);
  });

  it('a Mist gets no bell at all (NB-8: notifications are FIM-only)', () => {
    identity = 'mist';
    render(<NotificationBell />);
    expect(screen.queryByTestId('notification-bell')).toBeNull();
  });

  it('a FIM with 3 unread shows the badge "3"', async () => {
    fetchUnreadCount.mockResolvedValue(3);
    render(<NotificationBell />);
    await waitFor(() =>
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('3'),
    );
  });

  it('caps the badge at "9+"', async () => {
    fetchUnreadCount.mockResolvedValue(42);
    render(<NotificationBell />);
    await waitFor(() =>
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('9+'),
    );
  });

  it('shows no badge at zero unread', async () => {
    fetchUnreadCount.mockResolvedValue(0);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    expect(screen.queryByTestId('notification-unread-badge')).toBeNull();
  });

  it('a failed count read degrades to a plain bell (chrome is best-effort)', async () => {
    fetchUnreadCount.mockRejectedValue(new Error('boom'));
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-unread-badge')).toBeNull();
  });

  it('opening the bell fetches and renders the recent list (limit 15)', async () => {
    fetchUnreadCount.mockResolvedValue(1);
    fetchNotifications.mockResolvedValue([row({ id: 'n1', title: 'You were invited' })]);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));
    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());
    expect(fetchNotifications).toHaveBeenCalledWith(expect.objectContaining({ limit: 15 }));
    expect(await screen.findByText('You were invited')).toBeInTheDocument();
  });

  it('clicking an unread item with a group marks it read and navigates to the group', async () => {
    fetchUnreadCount.mockResolvedValue(1);
    fetchNotifications.mockResolvedValue([
      // ADAPTED 2026-07-27 (W-04): the base fixture's kind is
      // `invitation_received`, which now routes to its answering surface rather
      // than to the group. This row is titled "Role changed" and always meant a
      // news kind — it was riding the wrong fixture kind and passing by luck.
      row({ id: 'n7', kind: 'role_assigned', title: 'Role changed', group_id: 'g9' }),
    ]);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));
    const item = await screen.findByText('Role changed');
    await act(async () => {
      fireEvent.click(item);
    });
    expect(markNotificationRead).toHaveBeenCalledWith('n7');
    expect(push).toHaveBeenCalledWith('/groups/g9');
    // optimistic badge decrement 1 -> 0
    await waitFor(() =>
      expect(screen.queryByTestId('notification-unread-badge')).toBeNull(),
    );
  });

  it('W-04: an invitation goes to where it can be ANSWERED, not to the group page that cannot answer it', async () => {
    // The walk found `invitation_received` arriving with no Accept/Decline and
    // no directions. Navigating to /groups/<id> made it worse: the group detail
    // page offers an invited viewer no answering affordance at all, so the
    // letter led to a dead end. MyInvitations is mounted on /groups.
    fetchUnreadCount.mockResolvedValue(1);
    fetchNotifications.mockResolvedValue([
      row({ id: 'n9', title: 'Group Invitation', group_id: 'g9' }),
    ]);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));
    const item = await screen.findByText('Group Invitation');
    await act(async () => {
      fireEvent.click(item);
    });
    expect(markNotificationRead).toHaveBeenCalledWith('n9');
    expect(push).toHaveBeenCalledWith('/groups');
    expect(push).not.toHaveBeenCalledWith('/groups/g9');
  });

  it('clicking an item with no group marks it read but does not navigate (no dead link)', async () => {
    fetchUnreadCount.mockResolvedValue(1);
    fetchNotifications.mockResolvedValue([
      // ADAPTED 2026-07-27 (W-04): was riding the base `invitation_received`
      // kind, which now always routes to its answering surface — an invitation
      // is answerable whether or not the row names a group. This test is about
      // a genuinely passive, group-less row, so it now uses one.
      row({ id: 'n8', kind: 'announcement', title: 'Welcome', group_id: null }),
    ]);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));
    const item = await screen.findByText('Welcome');
    await act(async () => {
      fireEvent.click(item);
    });
    expect(markNotificationRead).toHaveBeenCalledWith('n8');
    expect(push).not.toHaveBeenCalled();
  });

  it('"Mark all read" clears the badge and calls the contract', async () => {
    fetchUnreadCount.mockResolvedValue(4);
    markAllNotificationsRead.mockResolvedValue(4);
    fetchNotifications.mockResolvedValue([row({ id: 'n1' }), row({ id: 'n2' })]);
    render(<NotificationBell />);
    await waitFor(() =>
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('4'),
    );
    fireEvent.click(screen.getByTestId('notification-bell'));
    const markAll = await screen.findByRole('button', { name: /mark all read/i });
    await act(async () => {
      fireEvent.click(markAll);
    });
    expect(markAllNotificationsRead).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId('notification-unread-badge')).toBeNull(),
    );
  });

  // FEAT-H031 STORY-1 AC3 — a failed dispatch must roll back AND say why.
  // A silent rollback looks identical to "nothing happened", which is exactly
  // the divergence the criterion forbids.
  it('a failed response rolls back the row and surfaces the reason (STORY-1)', async () => {
    fetchUnreadCount.mockResolvedValue(1);
    fetchNotifications.mockResolvedValue([
      row({
        id: 'nErr',
        kind: 'acting_invitation',
        title: 'Group Invitation',
        action_type: 'accept_decline', responses: [{ key: 'accept', label: 'Accept', accept: true, intent: 'positive' }, { key: 'decline', label: 'Decline', accept: false, intent: 'danger' }], // W3 (#347): registry-carried response set — fixture adapted at ADM-A, found-not-caused
      }),
    ]);
    respondToNotification.mockRejectedValue(new Error('That invitation was already answered.'));

    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));

    fireEvent.click(await screen.findByTestId('notif-action-accept'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    });

    // The reason is on screen…
    expect(await screen.findByTestId('notification-action-error-nErr')).toHaveTextContent(
      /already answered/i,
    );
    // …and the affordance is back (rolled back to actionable, not stuck resolved).
    expect(screen.getByTestId('notif-action-accept')).toBeInTheDocument();
  });

  it('renders an unrecognised kind safely (generic title/body, no crash)', async () => {
    fetchUnreadCount.mockResolvedValue(1);
    fetchNotifications.mockResolvedValue([
      row({ id: 'nX', kind: 'brand_new_future_kind', category: 'unknowncat', title: 'Fresh kind' }),
    ]);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));
    expect(await screen.findByText('Fresh kind')).toBeInTheDocument();
  });

  it('a "View all" affordance links to the inbox', async () => {
    fetchUnreadCount.mockResolvedValue(0);
    fetchNotifications.mockResolvedValue([]);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('notification-bell'));
    const viewAll = await screen.findByRole('link', { name: /view all|all notifications/i });
    expect(viewAll).toHaveAttribute('href', '/notifications');
  });
});
