/**
 * FEAT-H025 — messages client cache semantics (STORY-1/2 unit tier).
 * Red-first: written before lib/messages/client.ts exists (module-absent red).
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const registerCacheInvalidator = jest.fn();
jest.mock('@/lib/auth/cache-registry', () => ({
  registerCacheInvalidator: (fn: () => void) => registerCacheInvalidator(fn),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientModule = () => require('@/lib/messages/client') as typeof import('@/lib/messages/client');

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}
function failJson(status = 500): Response {
  return { ok: false, status, json: async () => ({ error: 'nope' }) } as unknown as Response;
}

const INBOX = {
  conversations: [
    { id: 'c1', kind: 'dm', title: null, group_id: null, group_name: null, other_participant_name: 'Ada', last_message_at: '2026-07-20T00:00:00Z', has_unread: true },
    { id: 'c2', kind: 'group', title: 'Fireside', group_id: 'g1', group_name: 'G', other_participant_name: null, last_message_at: null, has_unread: false },
  ],
};

describe('messages client — inbox session cache (B4) + W9', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    jest.resetModules();
    registerCacheInvalidator.mockClear();
    fetchMock = jest.fn() as unknown as FetchMock;
    (globalThis as { fetch: unknown }).fetch = fetchMock;
  });

  it('registers its invalidator with the auth-owned registry (COR-A W9)', () => {
    clientModule();
    expect(registerCacheInvalidator).toHaveBeenCalledTimes(1);
  });

  it('caches the resolved inbox for peek; concurrent readers share one request', async () => {
    const m = clientModule();
    fetchMock.mockResolvedValue(okJson(INBOX));
    expect(m.peekConversations()).toBeNull();
    const [a, b] = await Promise.all([m.fetchConversations(), m.fetchConversations()]);
    expect(a).toEqual(INBOX.conversations);
    expect(b).toEqual(INBOX.conversations);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(m.peekConversations()).toEqual(INBOX.conversations);
  });

  it('never caches a failed read', async () => {
    const m = clientModule();
    fetchMock.mockResolvedValueOnce(failJson());
    await expect(m.fetchConversations()).rejects.toThrow();
    expect(m.peekConversations()).toBeNull();
  });

  it('a send drops the inbox peek (confirmed-write-through doctrine: no stale paint)', async () => {
    const m = clientModule();
    fetchMock.mockResolvedValue(okJson(INBOX));
    await m.fetchConversations();
    expect(m.peekConversations()).not.toBeNull();
    fetchMock.mockResolvedValue(okJson({ message: { id: 'm1', sender_group_id: 'me', content: 'x', created_at: 'now' } }));
    await m.sendMessage('c1', 'hello');
    expect(m.peekConversations()).toBeNull();
  });

  it('mark-read drops the peek so the badge recomputes from fresh state', async () => {
    const m = clientModule();
    fetchMock.mockResolvedValue(okJson(INBOX));
    await m.fetchConversations();
    fetchMock.mockResolvedValue(okJson({}));
    await m.markRead('c1');
    expect(m.peekConversations()).toBeNull();
  });

  it('unreadConversationCount counts conversations, not messages', () => {
    const m = clientModule();
    expect(m.unreadConversationCount(INBOX.conversations)).toBe(1);
    expect(m.unreadConversationCount([])).toBe(0);
    expect(m.unreadConversationCount(null)).toBe(0);
  });
});
