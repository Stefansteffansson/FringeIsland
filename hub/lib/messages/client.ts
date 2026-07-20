/**
 * FEAT-H025 — the Hub's API-first messages client (COM-1/2/3/4/15, Cycle C-A).
 *
 * The browser surface reaches conversations ONLY through the `/api/messages`
 * BFF (ADR-U009 / the Hub narrow-exception rule). Inbox first page rides the
 * session cache (ADR-U043 B4): `peekConversations` paints the last resolved
 * inbox instantly on revisit, `fetchConversations()` always revalidates and
 * concurrent callers share one in-flight request, a failed read is never
 * cached, and every MUTATION drops the peek so a stale list (or badge) can
 * never paint after a write. Session end drops the cache via the auth-owned
 * registry (COR-A W9). No sockets, no polling — C-C brings the ADR-U039 live
 * layer; until then the badge refreshes on navigation and after own actions.
 */
import type {
  ConversationSummary,
  ConversationDetail,
  ConversationMessage,
  GroupConversationRow,
} from '@/lib/messages/queries';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';

export type {
  ConversationSummary,
  ConversationDetail,
  ConversationMessage,
  GroupConversationRow,
} from '@/lib/messages/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

// --- inbox session cache (B4) ------------------------------------------------

let cachedInbox: ConversationSummary[] | null = null;
let inboxInFlight: Promise<ConversationSummary[]> | null = null;

async function requestInbox(): Promise<ConversationSummary[]> {
  const res = await fetch('/api/messages');
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { conversations: ConversationSummary[] };
  return data.conversations;
}

/** The last resolved inbox this session — instant revisit paint (B4). */
export function peekConversations(): ConversationSummary[] | null {
  return cachedInbox;
}

export function fetchConversations(): Promise<ConversationSummary[]> {
  if (inboxInFlight) return inboxInFlight;
  const inFlight: Promise<ConversationSummary[]> = requestInbox()
    .then((rows) => {
      cachedInbox = rows;
      return rows;
    })
    .finally(() => {
      if (inboxInFlight === inFlight) inboxInFlight = null;
    });
  inFlight.catch(() => {}); // never unhandled if a caller drops it
  inboxInFlight = inFlight;
  return inFlight;
}

/** Drop the session messages cache (sign-out / session end / after a write). */
export function invalidateMessagesCache(): void {
  cachedInbox = null;
  inboxInFlight = null;
}
registerCacheInvalidator(invalidateMessagesCache);

/** The nav badge counts conversations with unread — never message tallies. */
export function unreadConversationCount(
  rows: Array<Pick<ConversationSummary, 'has_unread'>> | null,
): number {
  return (rows ?? []).filter((r) => r.has_unread).length;
}

function badgeRefresh(): void {
  invalidateMessagesCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('refreshNavigation'));
  }
}

// --- transports ---------------------------------------------------------------

export async function fetchConversationDetail(
  conversationId: string,
  options?: { before?: string },
): Promise<ConversationDetail> {
  const qs = options?.before ? `?before=${encodeURIComponent(options.before)}` : '';
  const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}${qs}`);
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  return (await res.json()) as ConversationDetail;
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ConversationMessage> {
  const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { message: ConversationMessage };
  badgeRefresh(); // the inbox ordering/unread changed — never paint a stale peek
  return data.message;
}

export async function markRead(conversationId: string): Promise<void> {
  const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}/read`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  badgeRefresh();
}

/** Open (or land in) the one DM with a fellow member — recipient keyed by
 *  their personal group id (the identity the roster payload carries). */
export async function openDm(otherGroupId: string): Promise<string> {
  const res = await fetch('/api/messages/dm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ other_group_id: otherGroupId }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { conversation_id: string };
  badgeRefresh();
  return data.conversation_id;
}

export async function createGroupConversation(
  groupId: string,
  title: string | null,
): Promise<string> {
  const res = await fetch('/api/messages/group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId, title }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { conversation_id: string };
  badgeRefresh();
  return data.conversation_id;
}

export async function fetchGroupConversations(
  groupId: string,
): Promise<{ conversations: GroupConversationRow[] }> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/conversations`);
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  return (await res.json()) as { conversations: GroupConversationRow[] };
}

export async function joinConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}/join`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  badgeRefresh();
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}/leave`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  badgeRefresh();
}
