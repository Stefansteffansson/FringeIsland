/**
 * FEAT-H025 STORY-1 — the FIM-only Messages chrome + unread badge unit tier.
 * Red-first: written before the component exists (module-absent red).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CONVERSATIONS_CHANGED_EVENT } from '@/lib/realtime/conversations-tenant';

let identity: string | null = 'fim';
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ identity, user: { id: 'u1' } }),
}));

const fetchConversations = jest.fn<() => Promise<unknown>>();
const peekConversations = jest.fn<() => unknown>(() => null);
const invalidateMessagesCache = jest.fn();
jest.mock('@/lib/messages/client', () => ({
  fetchConversations: () => fetchConversations(),
  peekConversations: () => peekConversations(),
  invalidateMessagesCache: () => invalidateMessagesCache(),
  unreadConversationCount: (rows: Array<{ has_unread: boolean }> | null) =>
    (rows ?? []).filter((r) => r.has_unread).length,
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MessagesLink } = require('@/components/messages/MessagesLink') as
  typeof import('@/components/messages/MessagesLink');

describe('MessagesLink', () => {
  beforeEach(() => {
    fetchConversations.mockReset();
    peekConversations.mockReset();
    peekConversations.mockReturnValue(null);
    invalidateMessagesCache.mockReset();
    mockComm.reconnecting = false;
    mockComm.onReconcile = null;
  });

  it('a Mist gets no Messages chrome at all (CB-1)', () => {
    identity = 'mist';
    render(<MessagesLink />);
    expect(screen.queryByRole('link', { name: /messages/i })).toBeNull();
    identity = 'fim';
  });

  it('a FIM with unread conversations sees the badge with the conversation count', async () => {
    fetchConversations.mockResolvedValue([
      { id: 'c1', has_unread: true },
      { id: 'c2', has_unread: true },
      { id: 'c3', has_unread: false },
    ]);
    render(<MessagesLink />);
    await waitFor(() => expect(screen.getByTestId('messages-unread-badge')).toHaveTextContent('2'));
  });

  it('a FIM with nothing unread sees the link without a badge', async () => {
    fetchConversations.mockResolvedValue([{ id: 'c1', has_unread: false }]);
    render(<MessagesLink />);
    await waitFor(() => expect(fetchConversations).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /messages/i })).toBeInTheDocument();
    expect(screen.queryByTestId('messages-unread-badge')).toBeNull();
  });

  it('a failed badge read degrades to the plain link (chrome is best-effort, never an error surface)', async () => {
    fetchConversations.mockRejectedValue(new Error('boom'));
    render(<MessagesLink />);
    await waitFor(() => expect(fetchConversations).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /messages/i })).toBeInTheDocument();
    expect(screen.queryByTestId('messages-unread-badge')).toBeNull();
  });

  it('moves the badge on a conversationsChanged hint, without navigation (FEAT-H027 STORY-2)', async () => {
    fetchConversations
      .mockResolvedValueOnce([{ id: 'c1', has_unread: false }])
      .mockResolvedValueOnce([
        { id: 'c1', has_unread: true },
        { id: 'c2', has_unread: true },
      ]);
    render(<MessagesLink />);
    await waitFor(() => expect(fetchConversations).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('messages-unread-badge')).toBeNull();

    // A live hint arrives (the tenant already invalidated the cache) — the
    // badge re-fetches and recomputes without the member navigating.
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'c2' } }),
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('messages-unread-badge')).toHaveTextContent('2'),
    );
  });

  it('reconciles the badge (invalidate + re-fetch) on recovery/visibility (FEAT-H027 STORY-6)', async () => {
    fetchConversations
      .mockResolvedValueOnce([{ id: 'c1', has_unread: false }])
      .mockResolvedValueOnce([{ id: 'c1', has_unread: true }]);
    render(<MessagesLink />);
    await waitFor(() => expect(fetchConversations).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('messages-unread-badge')).toBeNull();

    await act(async () => {
      mockComm.onReconcile!();
    });

    expect(invalidateMessagesCache).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('messages-unread-badge')).toHaveTextContent('1'),
    );
  });

  it('the badge chrome never renders the reconnecting affordance (FEAT-H027 STORY-6)', async () => {
    mockComm.reconnecting = true;
    fetchConversations.mockResolvedValue([{ id: 'c1', has_unread: false }]);
    render(<MessagesLink />);
    await waitFor(() => expect(fetchConversations).toHaveBeenCalled());
    expect(screen.queryByTestId('comm-reconnecting')).toBeNull();
  });
});
