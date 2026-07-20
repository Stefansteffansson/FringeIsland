import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import type { ConversationSummary } from '@/lib/messages/queries';

/**
 * FEAT-H027 STORY-2 (unit) — the `/messages` inbox goes live. Red-first for
 * TASK-CC-04: the page listens for `conversationsChanged` and re-reads in the
 * BACKGROUND — existing content stays on screen while the read runs (no
 * skeleton flash; skeletons are first-load only, B6).
 */

let authState: { user: { id: string } | null; identity: string; loading: boolean };
const replace = jest.fn();
const router = { replace, push: jest.fn() };
const fetchConversations = jest.fn<() => Promise<ConversationSummary[]>>();
const peekConversations = jest.fn<() => ConversationSummary[] | null>();
const invalidateMessagesCache = jest.fn();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/lib/messages/client', () => ({
  fetchConversations: () => fetchConversations(),
  peekConversations: () => peekConversations(),
  invalidateMessagesCache: () => invalidateMessagesCache(),
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

import { CONVERSATIONS_CHANGED_EVENT } from '@/lib/realtime/conversations-tenant';
import MessagesPage from '@/app/messages/page';

function conv(over: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: 'c1',
    kind: 'dm',
    title: null,
    group_name: null,
    other_participant_name: 'Ada',
    last_message_at: null,
    has_unread: false,
    ...over,
  } as ConversationSummary;
}

beforeEach(() => {
  jest.clearAllMocks();
  peekConversations.mockReturnValue(null);
  fetchConversations.mockResolvedValue([conv()]);
  mockComm.reconnecting = false;
  mockComm.onReconcile = null;
  authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
});

describe('FEAT-H027 — /messages inbox goes live', () => {
  it('renders the inbox through the courier for a FIM', async () => {
    render(<MessagesPage />);
    expect(await screen.findByTestId('inbox-row-c1')).toBeInTheDocument();
    expect(fetchConversations).toHaveBeenCalledTimes(1);
  });

  it('re-reads in the background on a hint, keeping existing content (no skeleton flash) (STORY-2)', async () => {
    let resolveSecond!: (rows: ConversationSummary[]) => void;
    fetchConversations
      .mockResolvedValueOnce([conv({ id: 'c1' })])
      .mockReturnValueOnce(new Promise<ConversationSummary[]>((r) => (resolveSecond = r)));

    render(<MessagesPage />);
    await screen.findByTestId('inbox-row-c1');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'c9' } }),
      );
    });

    // The re-read is in flight: the prior list is still on screen, no skeleton.
    expect(screen.getByTestId('inbox-row-c1')).toBeInTheDocument();
    expect(screen.queryByTestId('inbox-skeleton')).toBeNull();
    expect(fetchConversations).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond([conv({ id: 'c1' }), conv({ id: 'c2', other_participant_name: 'Bo' })]);
    });
    expect(await screen.findByTestId('inbox-row-c2')).toBeInTheDocument();
  });

  it('shows the quiet reconnecting affordance while the comm channel is degraded (STORY-6)', async () => {
    mockComm.reconnecting = true;
    render(<MessagesPage />);
    await screen.findByTestId('inbox-row-c1');
    expect(screen.getByTestId('comm-reconnecting')).toBeInTheDocument();
    // Quiet, not an error/toast.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reconciles (invalidate + re-read) when the hook signals recovery/visibility (STORY-6)', async () => {
    fetchConversations
      .mockResolvedValueOnce([conv({ id: 'c1' })])
      .mockResolvedValueOnce([conv({ id: 'c1' }), conv({ id: 'c2', other_participant_name: 'Bo' })]);
    render(<MessagesPage />);
    await screen.findByTestId('inbox-row-c1');

    await act(async () => {
      mockComm.onReconcile!();
    });

    expect(invalidateMessagesCache).toHaveBeenCalled();
    expect(await screen.findByTestId('inbox-row-c2')).toBeInTheDocument();
    expect(fetchConversations).toHaveBeenCalledTimes(2);
  });
});
