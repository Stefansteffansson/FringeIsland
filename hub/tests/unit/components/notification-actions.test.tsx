/**
 * FEAT-H031 (N-B) — the generic typed-action affordance. Response buttons are
 * data-driven from action_type (Accept/Decline in Ferd); each is ConfirmModal-
 * gated; an unrecognised action_type renders nothing (safe passive fallback).
 * Red-first: written before the component exists.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationActions } from '@/components/notifications/NotificationActions';
import type { NotificationRow } from '@/lib/notifications/queries';

const actingRow: NotificationRow = {
  id: 'n1',
  kind: 'acting_invitation',
  category: 'membership',
  title: 'Group Invitation',
  body: 'Your group has been invited to join Council.',
  group_id: null,
  created_at: '2026-07-24T10:00:00Z',
  is_read: false,
  read_at: null,
  dispatch_segment: 'acting-response',
  action_type: 'accept_decline', responses: [{ key: 'accept', label: 'Accept', accept: true, intent: 'primary' }, { key: 'decline', label: 'Decline', accept: false, intent: 'danger' }], // W3 (#347): registry-carried response set — fixture adapted at ADM-A, found-not-caused
  action_data: { membership_id: 'm1', context_group_name: 'Council' },
  action_taken: null,
  expires_at: null,
};

describe('NotificationActions', () => {
  it('renders Accept + Decline for an accept_decline row', () => {
    render(<NotificationActions row={actingRow} onRespond={jest.fn() as never} />);
    expect(screen.getByTestId('notif-action-accept')).toHaveTextContent('Accept');
    expect(screen.getByTestId('notif-action-decline')).toHaveTextContent('Decline');
    expect(screen.queryByTestId('confirm-modal')).toBeNull();
  });

  it('confirms via ConfirmModal, then calls onRespond with the chosen response', async () => {
    const onRespond = jest
      .fn<(row: NotificationRow, resp: { key: string; accept: boolean }) => Promise<void>>()
      .mockResolvedValue(undefined);
    render(<NotificationActions row={actingRow} onRespond={onRespond as never} />);
    fireEvent.click(screen.getByTestId('notif-action-accept'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(onRespond).toHaveBeenCalledTimes(1));
    const [rowArg, respArg] = onRespond.mock.calls[0];
    expect(rowArg.id).toBe('n1');
    expect(respArg.key).toBe('accept');
    expect(respArg.accept).toBe(true);
  });

  it('cancelling the modal does not dispatch', () => {
    const onRespond = jest.fn();
    render(<NotificationActions row={actingRow} onRespond={onRespond as never} />);
    fireEvent.click(screen.getByTestId('notif-action-decline'));
    fireEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onRespond).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-modal')).toBeNull();
  });

  it('renders nothing for a kind whose action_type has no responses (safe fallback)', () => {
    const { container } = render(
      <NotificationActions
        row={{ ...actingRow, action_type: 'some_future_type', responses: null }}
        onRespond={jest.fn() as never}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
