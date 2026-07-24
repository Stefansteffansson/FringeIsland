/**
 * FEAT-H030 STORY-3 — the `/notifications` inbox/history page (NTF-3).
 * Red-first: written before the page exists. FIM-only, keyset "load more",
 * read/unread distinct, actionable status chip, safe unknown-kind render.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// Stable auth object (mutated per test) — a fresh object each render would
// re-fire the page's load effect (deps include `user`). The messages-inbox
// precedent uses the same stable-reference shape.
const authState: { identity: string | null; user: { id: string } | null; loading: boolean } = {
  identity: 'fim',
  user: { id: 'u1' },
  loading: false,
};
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => authState,
}));

const replace = jest.fn();
const push = jest.fn();
const router = { replace, push }; // stable ref — a fresh router each render re-fires the effect
jest.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const fetchNotifications = jest.fn<Promise<unknown>, [unknown?]>();
const markNotificationRead = jest.fn<Promise<void>, [string]>();
const markAllNotificationsRead = jest.fn<Promise<number>, []>();
const invalidateNotificationsCache = jest.fn();
const respondToNotification = jest.fn<Promise<unknown>, [unknown, boolean]>();
jest.mock('@/lib/notifications/client', () => ({
  fetchNotifications: (opts?: unknown) => fetchNotifications(opts),
  markNotificationRead: (id: string) => markNotificationRead(id),
  markAllNotificationsRead: () => markAllNotificationsRead(),
  invalidateNotificationsCache: () => invalidateNotificationsCache(),
  respondToNotification: (row: unknown, accept: boolean) => respondToNotification(row, accept),
}));

// Isolate the page from the shell chrome (the bell + its own client deps) —
// the messages-inbox-page precedent.
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NotificationsPage = require('@/app/notifications/page').default as React.ComponentType;

const row = (over: Partial<Record<string, unknown>>) => ({
  id: 'n1',
  kind: 'invitation_received',
  category: 'membership',
  title: 'Row title',
  body: 'Row body',
  group_id: null,
  created_at: '2026-07-23T10:00:00Z',
  is_read: false,
  read_at: null,
  action_type: null,
  action_taken: null,
  expires_at: null,
  ...over,
});

describe('NotificationsPage (/notifications)', () => {
  beforeEach(() => {
    authState.identity = 'fim';
    authState.user = { id: 'u1' };
    authState.loading = false;
    replace.mockReset();
    push.mockReset();
    fetchNotifications.mockReset();
    fetchNotifications.mockResolvedValue([]);
    markNotificationRead.mockReset();
    markNotificationRead.mockResolvedValue();
    markAllNotificationsRead.mockReset();
    markAllNotificationsRead.mockResolvedValue(0);
    invalidateNotificationsCache.mockReset();
    respondToNotification.mockReset();
    respondToNotification.mockResolvedValue({ outcome: 'accepted' });
  });

  it('a sessionless visitor is sent to login', async () => {
    authState.identity = 'sessionless';
    render(<NotificationsPage />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(expect.stringContaining('/login')),
    );
  });

  it('a Mist is sent home (notifications are FIM-only, NB-8)', async () => {
    authState.identity = 'mist';
    render(<NotificationsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('renders the first page newest-first', async () => {
    fetchNotifications.mockResolvedValue([
      row({ id: 'a', title: 'Newest' }),
      row({ id: 'b', title: 'Older', created_at: '2026-07-22T10:00:00Z' }),
    ]);
    render(<NotificationsPage />);
    expect(await screen.findByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Older')).toBeInTheDocument();
  });

  it('"load more" fetches the next keyset page and appends', async () => {
    const first = Array.from({ length: 20 }, (_, i) =>
      row({ id: `p1-${i}`, title: `First ${i}`, created_at: `2026-07-23T10:${String(i).padStart(2, '0')}:00Z` }),
    );
    fetchNotifications.mockResolvedValueOnce(first).mockResolvedValueOnce([
      row({ id: 'p2-0', title: 'Second page row' }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('First 0');
    const loadMore = screen.getByRole('button', { name: /load more|older/i });
    await act(async () => {
      fireEvent.click(loadMore);
    });
    // second call carries a keyset cursor from the last row of page 1
    const secondArg = fetchNotifications.mock.calls[1][0] as { before?: unknown };
    expect(secondArg.before).toBeTruthy();
    expect(await screen.findByText('Second page row')).toBeInTheDocument();
  });

  it('renders read and unread rows distinctly', async () => {
    fetchNotifications.mockResolvedValue([
      row({ id: 'u', title: 'Unread one', is_read: false }),
      row({ id: 'r', title: 'Read one', is_read: true, read_at: '2026-07-23T11:00:00Z' }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Unread one');
    const unread = screen.getByTestId('notification-row-u');
    const read = screen.getByTestId('notification-row-r');
    expect(unread).toHaveAttribute('data-read', 'false');
    expect(read).toHaveAttribute('data-read', 'true');
  });

  // Adapted for N-B (FEAT-H031): N-A asserted actionable rows render NO action
  // buttons (the UI was deferred). N-B adds the typed-action affordance — an
  // unresolved actionable row now shows the "Awaiting response" chip AND the
  // data-driven Accept/Decline buttons.
  it('an actionable, unresolved row shows the status chip AND the typed-action buttons (N-B)', async () => {
    fetchNotifications.mockResolvedValue([
      row({
        id: 'act',
        kind: 'acting_invitation',
        title: 'Nominate',
        action_type: 'accept_decline',
        action_data: { membership_id: 'm1' },
        action_taken: null,
        expires_at: null,
      }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Nominate');
    expect(screen.getByText(/awaiting response/i)).toBeInTheDocument();
    expect(screen.getByTestId('notif-action-accept')).toBeInTheDocument();
    expect(screen.getByTestId('notif-action-decline')).toBeInTheDocument();
  });

  it('a resolved actionable row shows no buttons (buttons gone once answered)', async () => {
    fetchNotifications.mockResolvedValue([
      row({
        id: 'done',
        kind: 'acting_invitation',
        title: 'Answered already',
        action_type: 'accept_decline',
        action_data: { resolved_by_name: 'Bob Smith' },
        action_taken: 'accepted',
        expires_at: null,
      }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Answered already');
    expect(screen.getByText(/answered by bob/i)).toBeInTheDocument();
    expect(screen.queryByTestId('notif-action-accept')).toBeNull();
  });

  // FEAT-H031 STORY-1 AC3 — the inbox owes the same honesty as the bell: a
  // failed dispatch rolls back AND names the reason.
  it('a failed response rolls back the row and surfaces the reason (STORY-1)', async () => {
    fetchNotifications.mockResolvedValue([
      row({
        id: 'err',
        kind: 'acting_invitation',
        title: 'Group Invitation',
        action_type: 'accept_decline',
        action_data: { membership_id: 'm1' },
      }),
    ]);
    respondToNotification.mockRejectedValue(new Error('That invitation was already answered.'));

    render(<NotificationsPage />);
    await screen.findByText('Group Invitation');
    fireEvent.click(screen.getByTestId('notif-action-accept'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    });

    expect(await screen.findByTestId('notification-action-error-err')).toHaveTextContent(
      /already answered/i,
    );
    expect(screen.getByTestId('notif-action-accept')).toBeInTheDocument();
  });

  it('renders an unrecognised kind with the generic renderer', async () => {
    fetchNotifications.mockResolvedValue([
      row({ id: 'x', kind: 'totally_new_kind', category: 'mystery', title: 'Unknown kind row' }),
    ]);
    render(<NotificationsPage />);
    expect(await screen.findByText('Unknown kind row')).toBeInTheDocument();
  });

  it('"Mark all read" flips the visible rows and calls the contract', async () => {
    fetchNotifications.mockResolvedValue([
      row({ id: 'u1', title: 'Unread A', is_read: false }),
      row({ id: 'u2', title: 'Unread B', is_read: false }),
    ]);
    markAllNotificationsRead.mockResolvedValue(2);
    render(<NotificationsPage />);
    await screen.findByText('Unread A');
    const markAll = screen.getByRole('button', { name: /mark all read/i });
    await act(async () => {
      fireEvent.click(markAll);
    });
    expect(markAllNotificationsRead).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('notification-row-u1')).toHaveAttribute('data-read', 'true'),
    );
  });
});
