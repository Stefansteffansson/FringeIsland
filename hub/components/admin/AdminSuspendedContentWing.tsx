'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { AdminGroupMember } from '@/lib/admin/groups';
import type { ForumPost } from '@/lib/forum/queries';
import type { Announcement } from '@/lib/announcements/queries';
import type { ConversationDetail, GroupConversationRow } from '@/lib/messages/queries';

/**
 * FEAT-H041 — the suspended-group content wing on /admin/groups/[id].
 * Renders ONLY for suspended engagement groups (the parent gates the mount;
 * the FEAT-PC026 contracts refuse everyone else anyway — two independent
 * honesties). Admin-plane posture throughout: fetch-on-mount per section,
 * no session cache, no realtime, per-section failure isolation, honest
 * repaint after every act. A section refusal (the reactivation race)
 * surfaces as `onStateDrift` — the parent re-reads the detail and the wing
 * collapses with the state instead of rendering zombie affordances.
 */

type PaneState<T> = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'loaded'; data: T };

type WingProps = {
  groupId: string;
  groupName: string;
  members: AdminGroupMember[];
  onStateDrift: () => void | Promise<void>;
};

/** Fetch a wing section; a 404 is the admin-plane refusal → state drift. */
function usePaneLoad<T>(url: string, pick: (body: unknown) => T, onStateDrift: WingProps['onStateDrift']) {
  const [state, setState] = useState<PaneState<T>>({ kind: 'loading' });
  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(url);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        // The admin-plane refusal: hand drift to the parent (whose re-read
        // collapses the wing if the status changed) AND settle into the
        // honest error state — never an eternal skeleton, never a retry loop.
        void onStateDrift();
        setState({ kind: 'error', message: 'This section could not be loaded.' });
        return;
      }
      if (!res.ok) {
        setState({ kind: 'error', message: 'This section could not be loaded.' });
        return;
      }
      const body = (await res.json()) as unknown;
      setState({ kind: 'loaded', data: pick(body) });
    } catch {
      setState({ kind: 'error', message: 'This section could not be loaded.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, onStateDrift]);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, load };
}

const PaneSkeleton = ({ label }: { label: string }) => (
  <div role="status" aria-label={label} className="space-y-2">
    <div className="h-6 w-1/3 animate-pulse rounded bg-gray-100" />
    <div className="h-16 animate-pulse rounded bg-gray-100" />
  </div>
);

const PaneError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
    <p>{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-medium hover:bg-red-100"
    >
      Retry
    </button>
  </div>
);

const RefreshButton = ({ testid, onClick }: { testid: string; onClick: () => void }) => (
  <button
    type="button"
    data-testid={testid}
    onClick={onClick}
    className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
  >
    Refresh
  </button>
);

/** The required-reason field every wing ceremony renders inside the modal. */
const ReasonField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <textarea
    data-testid="ceremony-reason"
    aria-label="Reason (required)"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={2}
    placeholder="Reason (required)"
    className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-ink"
  />
);

const authorClass = (attribution: string) => (attribution === 'active' ? '' : 'italic text-gray-500');

function MembersSection({ groupId, groupName, members, onStateDrift }: WingProps) {
  const [target, setTarget] = useState<AdminGroupMember | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!target?.user_id) return;
    setBusy(true);
    setActError(null);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/members/${target.user_id}/remove`, {
        method: 'POST',
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setActError(payload.error ?? 'The removal was refused.');
      }
    } catch {
      setActError('The removal could not be completed.');
    } finally {
      setTarget(null);
      setReason('');
      setBusy(false);
      // Honest repaint either way — the parent re-reads the detail (members
      // included); on the reactivation race the wing collapses with it.
      void onStateDrift();
    }
  };

  return (
    <section aria-label="Members" className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 font-semibold text-ink">Members</h3>
      {actError && (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {actError}
        </p>
      )}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.personal_group_id} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{m.display_name}</span>
            <span className="text-gray-600">{m.email ?? 'no email on record'}</span>
            {m.is_steward && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Steward</span>
            )}
            <button
              type="button"
              data-testid={`remove-member-${m.personal_group_id}`}
              onClick={() => {
                setReason('');
                setTarget(m);
              }}
              disabled={!m.user_id}
              className="ml-2 rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <ConfirmModal
        isOpen={target !== null}
        title="Remove from group"
        variant="danger"
        busy={busy}
        confirmDisabled={reason.trim().length === 0}
        confirmText="Remove"
        message={
          target ? (
            <span>
              {`Remove "${target.display_name}" (${target.email ?? 'no email on record'}) from "${groupName}"? `}
              The removal cascade runs, the member loses access to this group, and the act lands in
              the audit log.
              <ReasonField value={reason} onChange={setReason} />
            </span>
          ) : (
            ''
          )
        }
        onConfirm={() => void confirmRemove()}
        onCancel={() => {
          if (!busy) setTarget(null);
        }}
      />
    </section>
  );
}

function ForumPane({ groupId, groupName, onStateDrift }: Omit<WingProps, 'members'>) {
  const { state, load } = usePaneLoad<ForumPost[]>(
    `/api/admin/groups/${groupId}/forum`,
    (body) => (body as { posts?: ForumPost[] }).posts ?? [],
    onStateDrift,
  );
  const [target, setTarget] = useState<ForumPost | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  const confirmModerate = async () => {
    if (!target) return;
    setBusy(true);
    setActError(null);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/forum/${target.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.status === 404) {
        void onStateDrift();
        return;
      }
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setActError(payload.error ?? 'The moderation was refused.');
      }
    } catch {
      setActError('The moderation could not be completed.');
    } finally {
      setTarget(null);
      setReason('');
      setBusy(false);
      void load(); // honest repaint of the section from a fresh read
    }
  };

  const renderPost = (post: ForumPost, depth: number) => (
    <li key={post.id} className={depth > 0 ? 'ml-6' : ''}>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className={authorClass(post.author.attribution)}>{post.author.display_name}</span>
        <span>{new Date(post.created_at).toLocaleString()}</span>
        {!post.is_deleted && (
          <button
            type="button"
            data-testid={`moderate-post-${post.id}`}
            onClick={() => {
              setReason('');
              setTarget(post);
            }}
            className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
          >
            Moderate
          </button>
        )}
      </div>
      {post.is_deleted ? (
        <p className="mt-1 text-sm italic text-gray-400">This post was removed</p>
      ) : (
        <p className="mt-1 text-sm text-ink">{post.content}</p>
      )}
      {post.replies.length > 0 && (
        <ul className="mt-2 space-y-2">{post.replies.map((r) => renderPost(r, depth + 1))}</ul>
      )}
    </li>
  );

  return (
    <section aria-label="Forum" className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Forum</h3>
        <RefreshButton testid="refresh-forum" onClick={() => void load()} />
      </div>
      {actError && (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {actError}
        </p>
      )}
      {state.kind === 'loading' && <PaneSkeleton label="Loading the forum" />}
      {state.kind === 'error' && <PaneError message={state.message} onRetry={() => void load()} />}
      {state.kind === 'loaded' &&
        (state.data.length === 0 ? (
          <p className="text-sm text-gray-500">No forum posts.</p>
        ) : (
          <ul className="space-y-3">{state.data.map((p) => renderPost(p, 0))}</ul>
        ))}
      <ConfirmModal
        isOpen={target !== null}
        title="Moderate post"
        variant="danger"
        busy={busy}
        confirmDisabled={reason.trim().length === 0}
        confirmText="Moderate"
        message={
          target ? (
            <span>
              {`Moderate this post by "${target.author.display_name}" in "${groupName}"? `}
              The post will be removed for every member and the act lands in the audit log.
              <ReasonField value={reason} onChange={setReason} />
            </span>
          ) : (
            ''
          )
        }
        onConfirm={() => void confirmModerate()}
        onCancel={() => {
          if (!busy) setTarget(null);
        }}
      />
    </section>
  );
}

function AnnouncementsPane({ groupId, onStateDrift }: Omit<WingProps, 'members' | 'groupName'>) {
  const { state, load } = usePaneLoad<Announcement[]>(
    `/api/admin/groups/${groupId}/announcements`,
    (body) => (body as { announcements?: Announcement[] }).announcements ?? [],
    onStateDrift,
  );
  return (
    <section aria-label="Announcements" className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Announcements</h3>
        <RefreshButton testid="refresh-announcements" onClick={() => void load()} />
      </div>
      {state.kind === 'loading' && <PaneSkeleton label="Loading announcements" />}
      {state.kind === 'error' && <PaneError message={state.message} onRetry={() => void load()} />}
      {state.kind === 'loaded' &&
        (state.data.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements.</p>
        ) : (
          <ul className="space-y-3">
            {state.data.map((a) => (
              <li key={a.id}>
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="text-sm text-ink-muted">{a.body}</p>
                <p className="mt-1 text-xs text-gray-500">
                  <span className={authorClass(a.author.attribution)}>{a.author.display_name}</span>
                  {' · '}
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function ConversationsPane({ groupId, onStateDrift }: Omit<WingProps, 'members' | 'groupName'>) {
  const { state, load } = usePaneLoad<GroupConversationRow[]>(
    `/api/admin/groups/${groupId}/conversations`,
    (body) => (body as { conversations?: GroupConversationRow[] }).conversations ?? [],
    onStateDrift,
  );
  const [open, setOpen] = useState<PaneState<ConversationDetail> | null>(null);

  const openConversation = async (conversationId: string) => {
    setOpen({ kind: 'loading' });
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/conversations/${conversationId}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        setOpen(null);
        void onStateDrift();
        return;
      }
      if (!res.ok) {
        setOpen({ kind: 'error', message: 'This conversation could not be loaded.' });
        return;
      }
      const body = (await res.json()) as { detail: ConversationDetail };
      setOpen({ kind: 'loaded', data: body.detail });
    } catch {
      setOpen({ kind: 'error', message: 'This conversation could not be loaded.' });
    }
  };

  return (
    <section aria-label="Conversations" className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Conversations</h3>
        <RefreshButton
          testid="refresh-conversations"
          onClick={() => {
            setOpen(null);
            void load();
          }}
        />
      </div>
      {open === null ? (
        <>
          {state.kind === 'loading' && <PaneSkeleton label="Loading conversations" />}
          {state.kind === 'error' && <PaneError message={state.message} onRetry={() => void load()} />}
          {state.kind === 'loaded' &&
            (state.data.length === 0 ? (
              <p className="text-sm text-gray-500">No conversations.</p>
            ) : (
              <ul className="space-y-2">
                {state.data.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      data-testid={`open-conversation-${c.id}`}
                      onClick={() => void openConversation(c.id)}
                      className="text-left text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {c.title ?? 'Untitled conversation'}
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </>
      ) : (
        <div>
          <button
            type="button"
            data-testid="conversation-back"
            onClick={() => setOpen(null)}
            className="mb-2 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Back to conversations
          </button>
          {open.kind === 'loading' && <PaneSkeleton label="Loading the conversation" />}
          {open.kind === 'error' && (
            <PaneError message={open.message} onRetry={() => setOpen(null)} />
          )}
          {open.kind === 'loaded' && (
            <ul className="space-y-2">
              {open.data.messages.map((m) => {
                const sender = m.sender_group_id ? open.data.senders[m.sender_group_id] : undefined;
                return (
                  <li key={m.id} className="text-sm">
                    <span className={`mr-2 text-xs ${authorClass(sender?.attribution ?? 'unknown')}`}>
                      {sender?.display_name ?? 'Unknown'}
                    </span>
                    <span className="mr-2 text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    <span className="text-ink">{m.content}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function AdminSuspendedContentWing({ groupId, groupName, members, onStateDrift }: WingProps) {
  return (
    <div className="mt-8 space-y-4">
      <div
        data-testid="admin-content-plane-banner"
        className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
      >
        Admin view of a suspended group&apos;s content. Access is audited.
      </div>
      <MembersSection
        groupId={groupId}
        groupName={groupName}
        members={members}
        onStateDrift={onStateDrift}
      />
      <ForumPane groupId={groupId} groupName={groupName} onStateDrift={onStateDrift} />
      <AnnouncementsPane groupId={groupId} onStateDrift={onStateDrift} />
      <ConversationsPane groupId={groupId} onStateDrift={onStateDrift} />
    </div>
  );
}
