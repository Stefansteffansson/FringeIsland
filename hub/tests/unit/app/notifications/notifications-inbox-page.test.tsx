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
  // The REAL routing rule, deliberately not a double (W-04) — see the same
  // note in tests/unit/components/notification-bell.test.tsx.
  notificationTarget: jest.requireActual<typeof import('@/lib/notifications/client')>(
    '@/lib/notifications/client',
  ).notificationTarget,
}));

// Isolate the page from the shell chrome (the bell + its own client deps) —
// the messages-inbox-page precedent.
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Isolate the page from the realtime module — the page needs only the event
// NAME from it, and pulling the tenant in would drag the socket manager along.
jest.mock('@/lib/realtime/notifications-tenant', () => ({
  NOTIFICATIONS_CHANGED_EVENT: 'notificationsChanged',
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
        action_type: 'accept_decline', responses: [{ key: 'accept', label: 'Accept', accept: true, intent: 'positive' }, { key: 'decline', label: 'Decline', accept: false, intent: 'danger' }], // W3 (#347): registry-carried response set — fixture adapted at ADM-A, found-not-caused
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

  // Gate walk 2026-07-30 — W-02's mirror image, and a new finding.
  //
  // The page DISPATCHES `notificationsChanged` (so the bell keeps up when you
  // mark-all here — the W-02 fix) but never LISTENED for it. The wiring was
  // one-directional: live arrivals updated the bell and left this page showing
  // a list that was missing them entirely.
  //
  // Observed: three notifications timestamped 9:35:35 PM sat in the bell while
  // the inbox began at 9:08:21 AM — not sorted differently, ABSENT. Both
  // surfaces read the same contract (`created_at DESC, id DESC`), so a sort
  // difference could not explain it; only a stale read could.
  it('re-reads when a live notification arrives, so the inbox stops going stale behind the bell', async () => {
    fetchNotifications.mockResolvedValueOnce([row({ id: 'old', title: 'Older row' })]);
    render(<NotificationsPage />);
    await screen.findByText('Older row');
    expect(fetchNotifications).toHaveBeenCalledTimes(1);

    // A live hint lands (the tenant dispatches this on the realtime signal).
    fetchNotifications.mockResolvedValueOnce([
      row({ id: 'fresh', title: 'Just arrived', created_at: '2026-07-23T11:00:00Z' }),
      row({ id: 'old', title: 'Older row' }),
    ]);
    await act(async () => {
      window.dispatchEvent(new Event('notificationsChanged'));
    });

    await waitFor(() => expect(screen.getByText('Just arrived')).toBeInTheDocument());
    // The row already on screen survives — a re-read must not blank the list.
    expect(screen.getByText('Older row')).toBeInTheDocument();
  });

  it('stops listening once unmounted — a dispatch after teardown must not set state', async () => {
    fetchNotifications.mockResolvedValueOnce([row({ id: 'old', title: 'Older row' })]);
    const { unmount } = render(<NotificationsPage />);
    await screen.findByText('Older row');
    const callsAtUnmount = fetchNotifications.mock.calls.length;
    unmount();

    await act(async () => {
      window.dispatchEvent(new Event('notificationsChanged'));
    });
    expect(fetchNotifications).toHaveBeenCalledTimes(callsAtUnmount);
  });

  it('a resolved actionable row shows no buttons (buttons gone once answered)', async () => {
    fetchNotifications.mockResolvedValue([
      row({
        id: 'done',
        kind: 'acting_invitation',
        title: 'Answered already',
        action_type: 'accept_decline', responses: [{ key: 'accept', label: 'Accept', accept: true, intent: 'positive' }, { key: 'decline', label: 'Decline', accept: false, intent: 'danger' }], // W3 (#347): registry-carried response set — fixture adapted at ADM-A, found-not-caused
        action_data: { resolved_by_name: 'Bob Smith' },
        action_taken: 'accepted',
        expires_at: null,
      }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Answered already');
    // LABELLED SIBLING ADAPTATION (W-03 #2, 2026-07-28): was /answered by bob/i.
    // The fixture's outcome is 'accepted', and the chip now says so — "Answered"
    // named the resolver while hiding what they resolved.
    expect(screen.getByText(/accepted by bob/i)).toBeInTheDocument();
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
        action_type: 'accept_decline', responses: [{ key: 'accept', label: 'Accept', accept: true, intent: 'positive' }, { key: 'decline', label: 'Decline', accept: false, intent: 'danger' }], // W3 (#347): registry-carried response set — fixture adapted at ADM-A, found-not-caused
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

  // ── W-01 / W-02 — the inbox is a surface, not a display case ─────────────
  //
  // The A-NTF live walk (2026-07-27) found the inbox page built as a *display*
  // over the shared row component, never wired to the bell's interaction
  // contract. Two written acceptance criteria went unmet:
  //   W-01 — FEAT-H030:88 "when I click it (dropdown or inbox)" — inbox rows
  //          were inert. The bell wraps NotificationItem in a button; the page
  //          rendered it bare. Stefan: "It's like there is nothing to click on."
  //   W-02 — FEAT-H030:72 "...and the badge clears" — page-side mark-all wrote
  //          correctly server-side but never dispatched the sync event, so the
  //          bell badge sat stale until a reload.
  //
  // The event is the house cross-component contract (the bell listens for it);
  // the page simply never spoke it. Every mutation the page performs must.

  const clickableRow = (id: string) =>
    screen.getByTestId(`notification-row-${id}`).querySelector('button');

  it('W-01: an inbox row is clickable and marks itself read via the contract', async () => {
    fetchNotifications.mockResolvedValue([row({ id: 'n1', title: 'Unread A', is_read: false })]);
    render(<NotificationsPage />);
    await screen.findByText('Unread A');

    const btn = clickableRow('n1');
    expect(btn).not.toBeNull();

    await act(async () => {
      fireEvent.click(btn!);
    });

    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    await waitFor(() =>
      expect(screen.getByTestId('notification-row-n1')).toHaveAttribute('data-read', 'true'),
    );
  });

  it('W-01: clicking a row that names a group navigates there', async () => {
    fetchNotifications.mockResolvedValue([
      // ADAPTED 2026-07-27 (W-04): this asserted the GENERAL "names a group →
      // goes there" rule while riding the base `invitation_received` kind,
      // which now deliberately routes to its answering surface instead. The
      // general rule is unchanged, so the fixture becomes a news kind; the
      // invitation case gets its own test below.
      row({ id: 'n1', kind: 'role_assigned', title: 'Role changed', is_read: false, group_id: 'g-42' }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Role changed');

    await act(async () => {
      fireEvent.click(clickableRow('n1')!);
    });

    expect(push).toHaveBeenCalledWith('/groups/g-42');
  });

  it('W-04: an invitation row goes to where it can be answered, not to the group page', async () => {
    // The walk's complaint, on the surface it was raised against: the letter
    // announced a decision, offered no buttons, and led to a page with no
    // answering affordance for an invited viewer. MyInvitations is on /groups.
    fetchNotifications.mockResolvedValue([
      row({ id: 'n1', title: 'Group Invitation', is_read: false, group_id: 'g-42' }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Group Invitation');

    await act(async () => {
      fireEvent.click(clickableRow('n1')!);
    });

    // FEAT-H042 (N-E, WS-4 rider): the answering-surface pointer now lands
    // focused — labelled sibling adaptation, flipped red-first.
    expect(push).toHaveBeenCalledWith('/groups?focus=invitations');
    expect(push).not.toHaveBeenCalledWith('/groups/g-42');
  });

  it('W-01: an already-read row still navigates but does not re-mark', async () => {
    fetchNotifications.mockResolvedValue([
      // ADAPTED 2026-07-27 (W-04): news kind, per the note above — this test is
      // about re-marking, not about where an invitation lands.
      row({ id: 'n1', kind: 'role_assigned', title: 'Old news', is_read: true, group_id: 'g-7' }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Old news');

    await act(async () => {
      fireEvent.click(clickableRow('n1')!);
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/groups/g-7');
  });

  it('W-01: a single-row read dispatches the sync event so the badge follows', async () => {
    const heard = jest.fn();
    window.addEventListener('notificationsChanged', heard);
    fetchNotifications.mockResolvedValue([row({ id: 'n1', title: 'Unread A', is_read: false })]);
    render(<NotificationsPage />);
    await screen.findByText('Unread A');

    await act(async () => {
      fireEvent.click(clickableRow('n1')!);
    });

    await waitFor(() => expect(heard).toHaveBeenCalled());
    window.removeEventListener('notificationsChanged', heard);
  });

  it('W-02: page-side "Mark all read" dispatches the sync event so the badge clears', async () => {
    const heard = jest.fn();
    window.addEventListener('notificationsChanged', heard);
    fetchNotifications.mockResolvedValue([
      row({ id: 'u1', title: 'Unread A', is_read: false }),
      row({ id: 'u2', title: 'Unread B', is_read: false }),
    ]);
    markAllNotificationsRead.mockResolvedValue(2);
    render(<NotificationsPage />);
    await screen.findByText('Unread A');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    });

    await waitFor(() => expect(heard).toHaveBeenCalled());
    window.removeEventListener('notificationsChanged', heard);
  });

  it('W-02 family: answering an actionable row also dispatches the sync event', async () => {
    const heard = jest.fn();
    window.addEventListener('notificationsChanged', heard);
    fetchNotifications.mockResolvedValue([
      row({
        id: 'a1',
        kind: 'acting_invitation',
        title: 'Stewardship nomination',
        is_read: false,
        action_type: 'accept_decline', responses: [{ key: 'accept', label: 'Accept', accept: true, intent: 'positive' }, { key: 'decline', label: 'Decline', accept: false, intent: 'danger' }], // W3 (#347): registry-carried response set — fixture adapted at ADM-A, found-not-caused
        action_data: { membership_id: 'm1' },
        action_taken: null,
        expires_at: null,
      }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText('Stewardship nomination');

    // Accept is ConfirmModal-gated (ADR-U051/U008) — the dispatch is the confirm.
    fireEvent.click(screen.getByTestId('notif-action-accept'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    });

    await waitFor(() => expect(heard).toHaveBeenCalled());
    window.removeEventListener('notificationsChanged', heard);
  });

  it('W-01: a failed single-row read still dispatches, so the badge reconciles', async () => {
    const heard = jest.fn();
    window.addEventListener('notificationsChanged', heard);
    markNotificationRead.mockRejectedValue(new Error('offline'));
    fetchNotifications.mockResolvedValue([row({ id: 'n1', title: 'Unread A', is_read: false })]);
    render(<NotificationsPage />);
    await screen.findByText('Unread A');

    await act(async () => {
      fireEvent.click(clickableRow('n1')!);
    });

    await waitFor(() => expect(heard).toHaveBeenCalled());
    window.removeEventListener('notificationsChanged', heard);
  });
});

// ---------------------------------------------------------------------------
// N-D corrective (2026-08-15, live walk): /notifications/preferences existed
// but nothing in the app linked to it — reachable by typed URL only. The inbox
// header is the door. TDD red-first.
// ---------------------------------------------------------------------------
describe('preferences door (post-6-done fix 2026-08-15)', () => {
  it('the inbox header links to notification preferences', async () => {
    render(<NotificationsPage />);
    const link = await screen.findByRole('link', { name: /preferences/i });
    expect(link).toHaveAttribute('href', '/notifications/preferences');
  });
});
