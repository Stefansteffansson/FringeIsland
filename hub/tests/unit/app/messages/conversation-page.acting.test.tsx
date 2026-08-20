import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConversationDetail } from '@/lib/messages/queries';

/**
 * FEAT-H047 STORY-2/3 (unit, RED-FIRST) — the param-carried wielded thread.
 *
 * `/messages/[id]?acting=A` (the 2026-08-19 ruling: the link carries the
 * hat; the server gate is the authority): the detail read and every act
 * carry the acting group; a banner names the substitution and the composer
 * wears the permanent "Sending as {A}" label (no per-message dialogs);
 * wielded sends show NO optimistic bubble (the confirmed row appends);
 * opening marks the GROUP's clock; a refusal names the hat and offers
 * "View as myself" (drops the param); group senders badge on the senders
 * map's `kind`; Report hides under the hat. No param = byte-identical.
 */

type AuthShape = { user: { id: string } | null; identity: string; loading: boolean };
let authState: AuthShape;
const replace = jest.fn();
let searchParams = new URLSearchParams();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  useSearchParams: () => searchParams,
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/lib/realtime/conversations-tenant', () => ({
  CONVERSATIONS_CHANGED_EVENT: 'conversationsChanged',
  conversationsTopic: () => null,
}));
jest.mock('@/lib/realtime/use-comm-channel', () => ({
  COMM_POLL_MS: 60000,
  useCommChannel: () => ({ reconnecting: false }),
}));
jest.mock('@/components/reports/ReportDialog', () => ({
  ReportDialog: () => <button data-testid="report-stub">Report</button>,
}));

const mockMsgs = {
  fetchConversationDetail: jest.fn(),
  markRead: jest.fn(),
  sendMessage: jest.fn(),
};
jest.mock('@/lib/messages/client', () => ({
  __esModule: true,
  fetchConversationDetail: (...a: unknown[]) => mockMsgs.fetchConversationDetail(...a),
  markRead: (...a: unknown[]) => mockMsgs.markRead(...a),
  sendMessage: (...a: unknown[]) => mockMsgs.sendMessage(...a),
}));

import ConversationPage from '@/app/messages/[id]/page';

const DETAIL: ConversationDetail = {
  id: 'c1',
  kind: 'group',
  title: 'Harbour talk',
  group_id: 'gb',
  group_name: 'Harbour',
  messages: [
    {
      id: 'm1',
      sender_group_id: 'ga',
      content: 'spoken for the group',
      is_deleted: false,
      created_at: '2026-08-19T10:00:00Z',
    },
    {
      id: 'm2',
      sender_group_id: 'pg-mona',
      content: 'a person speaks',
      is_deleted: false,
      created_at: '2026-08-19T10:01:00Z',
    },
  ],
  senders: {
    ga: { display_name: 'Alpha', attribution: 'active', kind: 'group' },
    'pg-mona': { display_name: 'Mona', attribution: 'active', kind: 'person' },
  },
  participants: [
    { participant_group_id: 'ga', name: 'Alpha', joined_at: '', left_at: null, is_me: false },
    { participant_group_id: 'pg-me', name: 'Me', joined_at: '', left_at: null, is_me: true },
  ],
  my_last_read_at: null,
} as unknown as ConversationDetail;

// `use(params)` suspends on first render; rendering inside an ASYNC act lets
// the already-resolved promise resume the tree under RTL (harness
// accommodation — React 19 requires the suspending render to be awaited).
const renderPage = async () => {
  await act(async () => {
    render(<ConversationPage params={Promise.resolve({ id: 'c1' })} />);
  });
};

describe('ConversationPage — the param-carried hat (FEAT-H047)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    searchParams = new URLSearchParams('acting=ga');
    mockMsgs.fetchConversationDetail.mockResolvedValue(DETAIL);
    mockMsgs.markRead.mockResolvedValue(undefined);
  });

  it('S2: the param drives the wielded read, the banner, the composer label, and the group clock', async () => {
    await renderPage();
    expect(await screen.findByTestId('thread-acting-banner')).toHaveTextContent(
      'Viewing as Alpha',
    );
    expect(screen.getByTestId('thread-acting-send-label')).toHaveTextContent('Sending as Alpha');
    expect(JSON.stringify(mockMsgs.fetchConversationDetail.mock.calls.at(-1))).toContain('ga');
    await waitFor(() => expect(mockMsgs.markRead).toHaveBeenCalled());
    expect(mockMsgs.markRead.mock.calls.at(-1) ?? []).toContain('ga');
  });

  it('S2: a wielded send carries the acting group, shows NO optimistic bubble, and RE-READS', async () => {
    const user = userEvent.setup();
    const DETAIL_AFTER = {
      ...DETAIL,
      messages: [
        ...DETAIL.messages,
        {
          id: 'm9',
          sender_group_id: 'ga',
          content: 'as the group',
          is_deleted: false,
          created_at: '2026-08-19T10:05:00Z',
        },
      ],
    } as unknown as ConversationDetail;
    mockMsgs.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            // the re-read after the send serves the confirmed row (and the
            // senders map — a first-time sender resolves on the re-read)
            mockMsgs.fetchConversationDetail.mockResolvedValue(DETAIL_AFTER);
            resolve({ id: 'm9' });
          }, 50),
        ),
    );
    await renderPage();
    await screen.findByText('spoken for the group');
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'as the group');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // No optimistic bubble while in flight (the wielded no-optimism rule).
    expect(screen.queryByTestId('pending-sending')).toBeNull();
    await waitFor(() => expect(screen.getByText('as the group')).toBeInTheDocument());
    expect(mockMsgs.sendMessage.mock.calls.at(-1) ?? []).toContain('ga');
    // The write re-read: the detail fetch ran again after the send.
    expect(mockMsgs.fetchConversationDetail.mock.calls.length).toBeGreaterThan(1);
    // ...and the re-served row carries the badge.
    expect(screen.getByTestId('message-sender-badge-m9')).toHaveTextContent('Group');
  });

  it("S3: group senders badge on the senders map's kind; person senders don't; Report hides under the hat", async () => {
    await renderPage();
    await screen.findByText('spoken for the group');
    expect(screen.getByTestId('message-sender-badge-m1')).toHaveTextContent('Group');
    expect(screen.queryByTestId('message-sender-badge-m2')).toBeNull();
    expect(screen.queryByTestId('report-stub')).toBeNull();
  });

  it('S3 guard: without the param the page is byte-identical — no banner, no label, Report renders, badges still payload-driven', async () => {
    searchParams = new URLSearchParams();
    await renderPage();
    await screen.findByText('spoken for the group');
    expect(screen.queryByTestId('thread-acting-banner')).toBeNull();
    expect(screen.queryByTestId('thread-acting-send-label')).toBeNull();
    expect(screen.getAllByTestId('report-stub').length).toBeGreaterThan(0);
    expect(screen.getByTestId('message-sender-badge-m1')).toHaveTextContent('Group');
    expect(JSON.stringify(mockMsgs.fetchConversationDetail.mock.calls.at(-1))).not.toContain('ga');
  });

  it('S2: a refused wielded read names the hat and "View as myself" drops the param', async () => {
    const user = userEvent.setup();
    mockMsgs.fetchConversationDetail.mockRejectedValue(
      new Error('the acting group is not an active member of this group'),
    );
    await renderPage();
    const notice = await screen.findByTestId('thread-acting-refused');
    expect(notice).toHaveTextContent(/the acting group is not an active member/);
    await user.click(screen.getByRole('button', { name: 'View as myself' }));
    expect(replace).toHaveBeenCalledWith('/messages/c1');
  });
});
