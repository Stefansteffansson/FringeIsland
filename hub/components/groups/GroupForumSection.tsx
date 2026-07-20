'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchForum,
  peekForum,
  createForumPost,
  replyToForumPost,
  moderateForumPost,
  type ForumPost,
} from '@/lib/forum/client';
import { authorClassName } from '@/lib/forum/attribution';
import { fetchMyPermissions } from '@/lib/groups/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H026 — the group page's Forum section (COM-5/6a/6b/7/14, Cycle C-B).
 * A failure-isolated slice on the ADR-U042 envelope posture (like
 * GroupConversationsSection): list / honest empty / honest unavailable — the
 * group page always renders whole. Composer, reply, and remove affordances
 * render ONLY on the platform's effective-permissions grants
 * (`post_forum_messages` / `reply_to_messages` / `moderate_forum`) — asked of
 * the platform, never computed locally; the RPC is the gate, the button is UX.
 * Attribution (COM-14) renders exactly the platform's `{display_name,
 * attribution}` — 'former'/'unknown' muted, never linked. No sockets (C-C).
 */
const PAGE = 20;

export function GroupForumSection({ groupId }: { groupId: string }) {
  const [posts, setPosts] = useState<ForumPost[] | null>(() => peekForum(groupId));
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [perms, setPerms] = useState<Set<string>>(new Set());

  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const can = (p: string) => perms.has(p);

  const load = useCallback(async () => {
    try {
      const rows = await fetchForum(groupId);
      setPosts(rows);
      setHasMore(rows.length >= PAGE);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [groupId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      try {
        const p = await fetchMyPermissions(groupId);
        if (active) setPerms(new Set(p.permissions));
      } catch {
        if (active) setPerms(new Set());
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, load]);

  async function loadEarlier() {
    if (!posts || posts.length === 0) return;
    const oldest = posts[posts.length - 1].created_at;
    try {
      const older = await fetchForum(groupId, oldest);
      setPosts([...posts, ...older]);
      setHasMore(older.length >= PAGE);
    } catch {
      setHasMore(false);
    }
  }

  async function handlePost() {
    const content = composer.trim();
    if (!content) return;
    setPosting(true);
    setPostError(null);
    try {
      const created = await createForumPost(groupId, content); // confirmed row
      setPosts((prev) => [created, ...(prev ?? [])]);
      setComposer('');
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Your post could not be saved');
    } finally {
      setPosting(false);
    }
  }

  async function handleReply(parentId: string) {
    const content = replyText.trim();
    if (!content) return;
    setReplyBusy(true);
    try {
      const created = await replyToForumPost(groupId, parentId, content);
      setPosts(
        (prev) =>
          prev?.map((p) =>
            p.id === parentId ? { ...p, replies: [...p.replies, created] } : p,
          ) ?? null,
      );
      setReplyTo(null);
      setReplyText('');
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Your reply could not be saved');
    } finally {
      setReplyBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirmRemove) return;
    setRemoveBusy(true);
    try {
      await moderateForumPost(groupId, confirmRemove);
      const tombstone = (p: ForumPost): ForumPost =>
        p.id === confirmRemove ? { ...p, is_deleted: true, content: null } : p;
      setPosts(
        (prev) =>
          prev?.map((p) => ({
            ...tombstone(p),
            replies: p.replies.map(tombstone),
          })) ?? null,
      );
      setConfirmRemove(null);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'The post could not be removed');
    } finally {
      setRemoveBusy(false);
    }
  }

  function renderPost(post: ForumPost, isReply: boolean) {
    return (
      <li key={post.id} data-testid={`forum-post-${post.id}`} className={isReply ? 'ml-6 mt-2' : ''}>
        <div className="rounded-lg border border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span data-testid={`forum-author-${post.id}`} className={`text-sm ${authorClassName(post.author)}`}>
              {post.author.display_name}
            </span>
            {!post.is_deleted && can('moderate_forum') && (
              <button
                type="button"
                data-testid={`forum-remove-${post.id}`}
                onClick={() => setConfirmRemove(post.id)}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>
          {post.is_deleted ? (
            <p data-testid={`forum-tombstone-${post.id}`} className="mt-1 text-sm italic text-gray-400">
              Removed by a group moderator
            </p>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{post.content}</p>
          )}
          {!isReply && can('reply_to_messages') && (
            <button
              type="button"
              data-testid={`forum-reply-open-${post.id}`}
              onClick={() => {
                setReplyTo(post.id);
                setReplyText('');
              }}
              className="mt-2 text-xs font-medium text-indigo-700 hover:underline"
            >
              Reply
            </button>
          )}
          {replyTo === post.id && (
            <div className="mt-2 flex items-start gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                aria-label="Reply"
                placeholder="Write a reply…"
                rows={2}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleReply(post.id)}
                disabled={replyBusy || replyText.trim() === ''}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          )}
        </div>
        {post.replies.length > 0 && (
          <ul>{post.replies.map((r) => renderPost(r, true))}</ul>
        )}
      </li>
    );
  }

  return (
    <section
      data-testid="group-forum"
      className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-800">Forum</h2>

      {can('post_forum_messages') && (
        <div className="mt-3">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            aria-label="Forum post"
            placeholder="Start a thread…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              data-testid="forum-post-submit"
              onClick={handlePost}
              disabled={posting || composer.trim() === ''}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      )}

      {postError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {postError}
        </p>
      )}

      {failed ? (
        <p data-testid="group-forum-unavailable" className="mt-3 text-sm text-gray-500">
          The forum can&apos;t be shown right now.
        </p>
      ) : posts === null ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
      ) : posts.length === 0 ? (
        <p data-testid="group-forum-empty" className="mt-3 text-sm text-gray-500">
          No posts in this group&apos;s forum yet.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">{posts.map((p) => renderPost(p, false))}</ul>
          {hasMore && (
            <button
              type="button"
              data-testid="forum-load-earlier"
              onClick={loadEarlier}
              className="mt-3 text-sm font-medium text-indigo-700 hover:underline"
            >
              Load earlier
            </button>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmRemove !== null}
        title="Remove this post?"
        message="It will show as removed in the thread. This can’t be undone."
        confirmText="Remove"
        variant="danger"
        busy={removeBusy}
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </section>
  );
}
