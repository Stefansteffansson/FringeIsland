import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Suspense } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConversationDetail, ConversationMessage } from '@/lib/messages/queries';

/**
 * FEAT-H027 STORY-3/5 (unit) — the open `/messages/[id]` detail goes live.
 * Red-first for TASK-CC-04.
 *
 * A hint naming THIS conversation re-reads through the page's EXISTING load
 * path — same fetch + `markRead` sequence, so read-marking is byte-identical to
 * today. A hint naming a DIFFERENT conversation leaves the open detail
 * undisturbed. Verify-on-signal: a re-read that is refused leaves surface state
 * unchanged (no error rendered as content); an own-send hint converges on the
 * confirmed message with no duplicate.
 */

let authState: { user: { id: string } | null; identity: string; loading: boolean };
const router = { replace: jest.fn(), push: jest.fn() };
const fetchConversationDetail = jest.fn<() => Promise<ConversationDetail>>();
const markRead = jest.fn<() => Promise<void>>();
const sendMessage = jest.fn<(id: string, content: string) => Promise<ConversationMessage>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams() }));
jest.mock('@/lib/messages/client', () => ({
  fetchConversationDetail: () => fetchConversationDetail(),
  markRead: () => markRead(),
  sendMessage: (_id: string, content: string) => sendMessage(_id, content),
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
import ConversationPage from '@/app/messages/[id]/page';

function msg(id: string, content = 'hi'): ConversationMessage {
  return {
    id,
    sender_group_id: 'g-ada',
    content,
    created_at: '2026-07-20T10:00:00Z',
  } as ConversationMessage;
}
function detail(messages: ConversationMessage[]): ConversationDetail {
  return {
    id: 'c1',
    kind: 'dm',
    title: null,
    group_name: null,
    participants: [
      { is_me: true, name: 'Me' },
      { is_me: false, name: 'Ada' },
    ],
    senders: { 'g-ada': { display_name: 'Ada' } },
    messages,
  } as unknown as ConversationDetail;
}

async function renderPage(id = 'c1') {
  // `use(params)` suspends on the first render; flush the resolved promise +
  // React's retry inside act so the component is mounted before we assert.
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <ConversationPage params={Promise.resolve({ id })} />
      </Suspense>,
    );
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  markRead.mockResolvedValue();
  mockComm.reconnecting = false;
  mockComm.onReconcile = null;
  authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
});

describe('FEAT-H027 — /messages/[id] detail goes live', () => {
  it('a hint naming THIS conversation re-reads through the existing load path, marking included (STORY-3)', async () => {
    fetchConversationDetail
      .mockResolvedValueOnce(detail([msg('m1', 'hi')]))
      .mockResolvedValueOnce(detail([msg('m1', 'hi'), msg('m2', 'new one')]));
    await renderPage('c1');
    await screen.findByText('hi');
    expect(markRead).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'c1' } }),
      );
    });

    expect(await screen.findByText('new one')).toBeInTheDocument();
    expect(fetchConversationDetail).toHaveBeenCalledTimes(2);
    // Byte-identical marking path: the re-read marks read exactly as a load does.
    expect(markRead).toHaveBeenCalledTimes(2);
  });

  it('discriminates a foreign hint (no re-read) from a targeted one (re-read) (STORY-3)', async () => {
    fetchConversationDetail
      .mockResolvedValueOnce(detail([msg('m1', 'hi')]))
      .mockResolvedValueOnce(detail([msg('m1', 'hi'), msg('m2', 'fresh')]));
    await renderPage('c1');
    await screen.findByText('hi');

    // A different conversation's hint — the open detail must not re-read.
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'other' } }),
      );
    });
    expect(fetchConversationDetail).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('fresh')).toBeNull();

    // This conversation's hint — now it re-reads.
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'c1' } }),
      );
    });
    expect(await screen.findByText('fresh')).toBeInTheDocument();
    expect(fetchConversationDetail).toHaveBeenCalledTimes(2);
  });

  it('an own-send hint converges on the confirmed message — no duplicate (STORY-3)', async () => {
    fetchConversationDetail
      .mockResolvedValueOnce(detail([msg('m1', 'hi')]))
      .mockResolvedValueOnce(detail([msg('m1', 'hi'), msg('m2', 'sent')]));
    sendMessage.mockResolvedValue(msg('m2', 'sent'));
    await renderPage('c1');
    await screen.findByText('hi');

    await userEvent.type(screen.getByLabelText('Message'), 'sent');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByText('sent'); // optimistic + confirmed write-through

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'c1' } }),
      );
    });
    await waitFor(() => expect(fetchConversationDetail).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText('sent')).toHaveLength(1);
  });

  it('verify-on-signal: a refused re-read leaves the open conversation unchanged (no error as content) (STORY-5)', async () => {
    fetchConversationDetail
      .mockResolvedValueOnce(detail([msg('m1', 'hi')]))
      .mockRejectedValueOnce(new Error('forbidden'));
    await renderPage('c1');
    await screen.findByText('hi');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(CONVERSATIONS_CHANGED_EVENT, { detail: { conversationId: 'c1' } }),
      );
    });

    await waitFor(() => expect(fetchConversationDetail).toHaveBeenCalledTimes(2));
    // The conversation is still there; the refusal did not become a surface.
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the quiet reconnecting affordance while the comm channel is degraded (STORY-6)', async () => {
    mockComm.reconnecting = true;
    fetchConversationDetail.mockResolvedValue(detail([msg('m1', 'hi')]));
    await renderPage('c1');
    await screen.findByText('hi');
    expect(screen.getByTestId('comm-reconnecting')).toBeInTheDocument();
  });

  it('reconciles the open conversation on recovery/visibility via its load path (STORY-6)', async () => {
    fetchConversationDetail
      .mockResolvedValueOnce(detail([msg('m1', 'hi')]))
      .mockResolvedValueOnce(detail([msg('m1', 'hi'), msg('m2', 'caught up')]));
    await renderPage('c1');
    await screen.findByText('hi');

    await act(async () => {
      mockComm.onReconcile!();
    });

    expect(await screen.findByText('caught up')).toBeInTheDocument();
    expect(fetchConversationDetail).toHaveBeenCalledTimes(2);
  });
});
