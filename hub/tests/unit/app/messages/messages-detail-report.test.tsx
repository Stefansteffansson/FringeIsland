import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import type { ConversationDetail, ConversationMessage } from '@/lib/messages/queries';

/**
 * FEAT-H028 STORY-5 + STORY-4 (unit) — the conversation detail report affordance
 * and the DM-immutability regression. Report is offered on a participant's
 * message that isn't mine (own-check: sender_group_id vs the is_me participant's
 * group id) and never on my own. No edit or delete affordance exists on ANY DM
 * message, mine included — direct messages stay immutable (the oracle spine;
 * regression-asserted, not just omitted).
 *
 * Red-first: the report affordance is not mounted on the conversation yet.
 */

let authState: { user: { id: string } | null; identity: string; loading: boolean };
const router = { replace: jest.fn(), push: jest.fn() };
const fetchConversationDetail = jest.fn<() => Promise<ConversationDetail>>();
const markRead = jest.fn<() => Promise<void>>();
const sendMessage = jest.fn();

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
jest.mock('@/lib/realtime/use-comm-channel', () => ({
  COMM_POLL_MS: 60000,
  useCommChannel: () => ({ reconnecting: false }),
}));
jest.mock('@/components/reports/ReportDialog', () => ({
  __esModule: true,
  ReportDialog: ({ targetId }: { targetId: string }) => <div data-testid={`report-mount-${targetId}`} />,
}));

import ConversationPage from '@/app/messages/[id]/page';

function msg(id: string, senderGroupId: string | null): ConversationMessage {
  return { id, sender_group_id: senderGroupId, content: `msg ${id}`, created_at: '2026-07-20T10:00:00Z' } as ConversationMessage;
}
function detail(messages: ConversationMessage[]): ConversationDetail {
  return {
    id: 'c1',
    kind: 'dm',
    title: null,
    group_id: null,
    group_name: null,
    participants: [
      { participant_group_id: 'g-me', name: 'Me', is_me: true },
      { participant_group_id: 'g-ada', name: 'Ada', is_me: false },
    ],
    senders: {
      'g-me': { display_name: 'Me', attribution: 'active' },
      'g-ada': { display_name: 'Ada', attribution: 'active' },
    },
    messages,
    my_last_read_at: '2026-07-20T09:00:00Z',
  } as unknown as ConversationDetail;
}

async function renderPage(id = 'c1') {
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <ConversationPage params={Promise.resolve({ id })} />
      </Suspense>,
    );
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
  markRead.mockResolvedValue(undefined);
  fetchConversationDetail.mockResolvedValue(detail([msg('m-other', 'g-ada'), msg('m-mine', 'g-me')]));
});

describe('conversation detail — report + DM immutability (FEAT-H028)', () => {
  it("offers Report on another participant's message", async () => {
    await renderPage();
    expect(await screen.findByTestId('report-mount-m-other')).toBeInTheDocument();
  });

  it('offers no Report on my own message', async () => {
    await renderPage();
    await screen.findByTestId('report-mount-m-other');
    expect(screen.queryByTestId('report-mount-m-mine')).not.toBeInTheDocument();
  });

  it('renders no edit or delete affordance on any DM message, mine included (regression)', async () => {
    await renderPage();
    await screen.findByTestId('report-mount-m-other');
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByTestId('message-edit-m-mine')).not.toBeInTheDocument();
    expect(screen.queryByTestId('message-delete-m-mine')).not.toBeInTheDocument();
  });
});
