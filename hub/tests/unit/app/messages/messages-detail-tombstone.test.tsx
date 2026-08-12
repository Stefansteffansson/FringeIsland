import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import type { ConversationDetail, ConversationMessage } from '@/lib/messages/queries';

/**
 * FEAT-PD018 STORY-2 (unit) — the survivor keeps their record.
 *
 * The ruled disposition is CONTENT-level: the erased member's body is gone
 * (`content: null, is_deleted: true`) while the thread shape and the
 * survivor's own words stay. This suite pins the surface half of that:
 *
 *  - a tombstoned message renders the neutral marker, not an empty bubble
 *    (a null body with no marker is indistinguishable from a rendering bug);
 *  - the survivor's own message beside it is untouched;
 *  - attribution still resolves — the ruling erased the words, not the name,
 *    so the sender line keeps showing who the thread was with;
 *  - a tombstone offers no Report affordance (there is no longer content to
 *    report, and the existing snapshot already holds what was said).
 *
 * The integration tier proves the disposition; this proves the render. Written
 * because the existing detail-page fixtures cast with `as ConversationMessage`,
 * so a missing `is_deleted` never surfaced as a type error — `next build` is
 * the only real type gate in this repo and it does not cover test files.
 */

let authState: { user: { id: string } | null; identity: string; loading: boolean };
const router = { replace: jest.fn(), push: jest.fn() };
const fetchConversationDetail = jest.fn<() => Promise<ConversationDetail>>();
const markRead = jest.fn<() => Promise<void>>();
const sendMessage = jest.fn<(id: string, content: string) => Promise<ConversationMessage>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
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

import ConversationPage from '@/app/messages/[id]/page';

/** Typed WITHOUT a cast — this fixture is also the type-shape assertion. */
function liveMsg(id: string, content: string, sender = 'g-ada'): ConversationMessage {
  return {
    id,
    sender_group_id: sender,
    content,
    is_deleted: false,
    created_at: '2026-08-12T10:00:00Z',
  };
}

function tombstonedMsg(id: string, sender = 'g-ada'): ConversationMessage {
  return {
    id,
    sender_group_id: sender,
    content: null,
    is_deleted: true,
    created_at: '2026-08-12T10:00:00Z',
  };
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
    senders: { 'g-ada': { display_name: 'Ada', attribution: 'former' } },
    messages,
  } as unknown as ConversationDetail;
}

async function renderPage(id = 'c1') {
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
  authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
});

describe('FEAT-PD018 STORY-2 — the erased member’s words go, the survivor’s record stays', () => {
  it('renders the neutral marker for a tombstoned message and leaves my own words intact', async () => {
    fetchConversationDetail.mockResolvedValue(
      detail([tombstonedMsg('m1'), liveMsg('m2', 'my own words', 'g-me')]),
    );
    await renderPage();

    expect(await screen.findByTestId('message-tombstone-m1')).toHaveTextContent(
      'This message was removed',
    );
    // The survivor's side is untouched — erasure is one-sided by design.
    expect(screen.getByText('my own words')).toBeInTheDocument();
  });

  it('keeps attribution: the ruling erased the words, not the name', async () => {
    fetchConversationDetail.mockResolvedValue(detail([tombstonedMsg('m1')]));
    await renderPage();

    await screen.findByTestId('message-tombstone-m1');
    // Author-level tombstoning was explicitly NOT the ruling — in a two-party
    // thread it hides nothing from the one person who was there.
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('keeps the thread shape — a tombstone is still a message in the list', async () => {
    fetchConversationDetail.mockResolvedValue(
      detail([tombstonedMsg('m1'), liveMsg('m2', 'still here', 'g-me')]),
    );
    await renderPage();

    await screen.findByTestId('message-tombstone-m1');
    expect(screen.getByTestId('message-m1')).toBeInTheDocument();
    expect(screen.getByTestId('message-m2')).toBeInTheDocument();
  });

  it('offers no Report affordance on a tombstone', async () => {
    fetchConversationDetail.mockResolvedValue(detail([tombstonedMsg('m1')]));
    await renderPage();

    await screen.findByTestId('message-tombstone-m1');
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
  });
});
