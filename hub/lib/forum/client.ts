/**
 * FEAT-H026 — the Hub's API-first forum client (COM-5/6a/6b/7/14, Cycle C-B).
 *
 * The browser surface reaches the group forum ONLY through the BFF
 * (`/api/groups/[id]/forum`, `/api/forum/[postId]/reply|moderate`) — never a
 * direct table touch (ADR-U009 / the Hub narrow-exception rule). The forum
 * read rides a per-group session cache (ADR-U043): `peekForum` paints the last
 * resolved threads instantly on revisit, `fetchForum()` always revalidates and
 * concurrent callers share one in-flight request, a failed read is never
 * cached, and every mutation drops the peek for that group so a stale thread
 * list can never paint after a write. Session end drops the cache via the
 * auth-owned registry (COR-A W9). No sockets, no polling — C-C brings the
 * ADR-U039 live layer.
 */
import type { ForumPost, ForumPostRow } from '@/lib/forum/queries';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';

export type { ForumPost, ForumPostRow, AuthorDisplay } from '@/lib/forum/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

// --- per-group forum session cache (B4) --------------------------------------

const cachedForum = new Map<string, ForumPost[]>();
const forumInFlight = new Map<string, Promise<ForumPost[]>>();

async function requestForum(groupId: string, before?: string): Promise<ForumPost[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/forum${qs}`);
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { posts: ForumPost[] };
  return data.posts;
}

/** The last resolved first page of threads for this group — instant revisit. */
export function peekForum(groupId: string): ForumPost[] | null {
  return cachedForum.get(groupId) ?? null;
}

/** First page (cached). Pass `before` for load-earlier — never cached, since
 *  it is a keyset continuation, not the head the peek paints. */
export function fetchForum(groupId: string, before?: string): Promise<ForumPost[]> {
  if (before) return requestForum(groupId, before);
  const existing = forumInFlight.get(groupId);
  if (existing) return existing;
  const inFlight = requestForum(groupId)
    .then((rows) => {
      cachedForum.set(groupId, rows);
      return rows;
    })
    .finally(() => {
      if (forumInFlight.get(groupId) === inFlight) forumInFlight.delete(groupId);
    });
  inFlight.catch(() => {});
  forumInFlight.set(groupId, inFlight);
  return inFlight;
}

/** Drop the whole forum cache (sign-out / session end). */
export function invalidateForumCache(): void {
  cachedForum.clear();
  forumInFlight.clear();
}
registerCacheInvalidator(invalidateForumCache);

/** Drop one group's forum peek + in-flight (after a write, or a live hint —
 *  FEAT-H027 STORY-4). Exported for the page-scoped forum tenant. */
export function dropGroup(groupId: string): void {
  cachedForum.delete(groupId);
  forumInFlight.delete(groupId);
}

// --- transports (each drops the group's peek: the thread list changed) --------

export async function createForumPost(groupId: string, content: string): Promise<ForumPost> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/forum`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { post: ForumPost };
  dropGroup(groupId);
  return data.post;
}

export async function replyToForumPost(
  groupId: string,
  parentPostId: string,
  content: string,
): Promise<ForumPost> {
  const res = await fetch(`/api/forum/${encodeURIComponent(parentPostId)}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { post: ForumPost };
  dropGroup(groupId);
  return data.post;
}

export async function moderateForumPost(
  groupId: string,
  postId: string,
): Promise<{ id: string; is_deleted: boolean }> {
  const res = await fetch(`/api/forum/${encodeURIComponent(postId)}/moderate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { post: { id: string; is_deleted: boolean } };
  dropGroup(groupId);
  return data.post;
}

/** FEAT-H028 COM-12 — windowed own-edit. Returns the confirmed post row-doc
 *  (replies omitted); the section writes it through onto the matching node. A
 *  window-edge refusal throws with the server's honest message. */
export async function editForumPost(
  groupId: string,
  postId: string,
  content: string,
): Promise<ForumPostRow> {
  const res = await fetch(`/api/forum/${encodeURIComponent(postId)}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { post: ForumPostRow };
  dropGroup(groupId);
  return data.post;
}

/** FEAT-H028 COM-12 — windowed own-delete. Returns the confirmed tombstone
 *  row-doc (`is_deleted` true, content null). */
export async function deleteForumPost(
  groupId: string,
  postId: string,
): Promise<ForumPostRow> {
  const res = await fetch(`/api/forum/${encodeURIComponent(postId)}/delete`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { post: ForumPostRow };
  dropGroup(groupId);
  return data.post;
}
