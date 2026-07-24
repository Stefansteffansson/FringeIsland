/**
 * FEAT-H031 STORY-2 — the response window on an actionable notification row.
 *
 * The retired `PendingNominations` section showed the nominee a concrete
 * "Respond by <date>" derived from `expires_at`. N-B folded nominations into
 * the bell/inbox, and the window came with them: STORY-2 AC1 names `expires_at`
 * as the source of the shown window, so the shared row body owes it. Without
 * this the fold silently costs the nominee the deadline.
 *
 * Written red-first against `NotificationItem` (the row body shared by the bell
 * dropdown and the inbox), keeping the assertion at the unit tier.
 */
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import type { NotificationRow } from '@/lib/notifications/queries';

const now = new Date('2026-07-24T12:00:00Z');

const row = (over: Partial<NotificationRow>): NotificationRow =>
  ({
    id: 'n1',
    kind: 'stewardship_nomination',
    category: 'stewardship',
    title: 'Stewardship Nomination',
    body: 'You have been nominated as Steward of Byalaget.',
    group_id: null,
    created_at: '2026-07-24T10:00:00Z',
    is_read: false,
    read_at: null,
    action_type: 'accept_decline',
    action_taken: null,
    expires_at: null,
    action_data: null,
    ...over,
  }) as NotificationRow;

describe('NotificationItem — the response window (STORY-2)', () => {
  it('shows "Respond by <date>" for an actionable row with a deadline', () => {
    const expires = '2026-07-31T12:00:00Z';
    render(<NotificationItem row={row({ expires_at: expires })} now={now} />);
    const el = screen.getByTestId('notification-respond-by');
    expect(el).toHaveTextContent(/respond by/i);
    expect(el).toHaveTextContent(new Date(expires).toLocaleDateString());
  });

  it('shows no window for a passive row (no action_type — nothing to respond to)', () => {
    render(
      <NotificationItem
        row={row({ action_type: null, expires_at: '2026-07-31T12:00:00Z' })}
        now={now}
      />,
    );
    expect(screen.queryByTestId('notification-respond-by')).toBeNull();
  });

  it('shows no window once the row is answered (the deadline stopped mattering)', () => {
    render(
      <NotificationItem
        row={row({ action_taken: 'accepted', expires_at: '2026-07-31T12:00:00Z' })}
        now={now}
      />,
    );
    expect(screen.queryByTestId('notification-respond-by')).toBeNull();
  });

  it('shows no window once the deadline has passed (the chip already reads Expired)', () => {
    render(
      <NotificationItem
        row={row({ expires_at: '2026-07-01T12:00:00Z' })}
        now={now}
      />,
    );
    expect(screen.queryByTestId('notification-respond-by')).toBeNull();
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });
});
