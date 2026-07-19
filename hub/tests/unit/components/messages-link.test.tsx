/**
 * FEAT-H025 STORY-1 — the FIM-only Messages chrome + unread badge unit tier.
 * Red-first: written before the component exists (module-absent red).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

let identity: string | null = 'fim';
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ identity, user: { id: 'u1' } }),
}));

const fetchConversations = jest.fn<Promise<unknown>, []>();
const peekConversations = jest.fn<unknown, []>(() => null);
jest.mock('@/lib/messages/client', () => ({
  fetchConversations: () => fetchConversations(),
  peekConversations: () => peekConversations(),
  unreadConversationCount: (rows: Array<{ has_unread: boolean }> | null) =>
    (rows ?? []).filter((r) => r.has_unread).length,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MessagesLink } = require('@/components/messages/MessagesLink') as
  typeof import('@/components/messages/MessagesLink');

describe('MessagesLink', () => {
  beforeEach(() => {
    fetchConversations.mockReset();
    peekConversations.mockReset();
    peekConversations.mockReturnValue(null);
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
});
