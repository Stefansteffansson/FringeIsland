'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import {
  fetchConversationDetail,
  markRead,
  sendMessage,
  type ConversationDetail,
  type ConversationMessage,
} from '@/lib/messages/client';

type PendingMessage = {
  localId: string;
  content: string;
  state: 'sending' | 'failed';
};

/**
 * FEAT-H025 STORY-3/4 — the conversation detail (COM-1/3/4). Chronological
 * with load-earlier keyset paging; opening marks read (badge follows via
 * refreshNavigation); the composer appends optimistically within the B5
 * window and the CONFIRMED row replaces it (write-through doctrine) — a
 * failed send stays visible with a retry, never silently swallowed. Sender
 * display comes from the payload's per-page resolution; an unresolved
 * sender renders 'Unknown' (the COM-14 fallback until C-B). FIM-only (CB-1).
 */
export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [earlier, setEarlier] = useState<ConversationMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const localSeq = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || identity === 'sessionless') {
      router.replace(`/login?redirect=/messages/${id}`);
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router, id]);

  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    let active = true;
    fetchConversationDetail(id)
      .then((doc) => {
        if (!active) return;
        setDetail(doc);
        setFailed(null);
        markRead(id).catch(() => {}); // best-effort; the badge self-heals on next read
      })
      .catch((err: Error) => {
        if (active) setFailed(err.message);
      });
    return () => {
      active = false;
    };
  }, [authLoading, identity, id]);

  const senderName = useCallback(
    (senderGroupId: string | null): string => {
      if (!senderGroupId) return 'Unknown';
      return detail?.senders[senderGroupId]?.display_name ?? 'Unknown';
    },
    [detail],
  );

  async function handleLoadEarlier() {
    if (!detail) return;
    const oldest = [...earlier, ...detail.messages][0];
    if (!oldest) return;
    setLoadingEarlier(true);
    try {
      const page = await fetchConversationDetail(id, { before: oldest.created_at });
      setEarlier((prev) => [...page.messages, ...prev]);
    } catch {
      // load-earlier is retryable; the button stays
    } finally {
      setLoadingEarlier(false);
    }
  }

  async function deliver(localId: string, content: string) {
    try {
      const confirmed = await sendMessage(id, content);
      setPending((prev) => prev.filter((p) => p.localId !== localId));
      setDetail((prev) =>
        prev ? { ...prev, messages: [...prev.messages, confirmed] } : prev,
      );
    } catch {
      setPending((prev) =>
        prev.map((p) => (p.localId === localId ? { ...p, state: 'failed' } : p)),
      );
    }
  }

  function handleSend() {
    const content = draft.trim();
    if (!content) return;
    const localId = `local-${localSeq.current++}`;
    setPending((prev) => [...prev, { localId, content, state: 'sending' }]);
    setDraft('');
    deliver(localId, content);
  }

  function handleRetry(p: PendingMessage) {
    setPending((prev) =>
      prev.map((x) => (x.localId === p.localId ? { ...x, state: 'sending' } : x)),
    );
    deliver(p.localId, p.content);
  }

  const title =
    detail === null
      ? 'Conversation'
      : detail.kind === 'dm'
        ? detail.participants.find((p) => !p.is_me)?.name ?? 'Unknown'
        : detail.title ?? detail.group_name ?? 'Conversation';

  return (
    <AppShell title={title}>
      {authLoading || identity !== 'fim' || (detail === null && failed === null) ? (
        <div className="space-y-3" aria-hidden="true" data-testid="thread-skeleton">
          <div className="h-12 w-2/3 animate-pulse rounded-xl bg-gray-100" />
          <div className="ml-auto h-12 w-2/3 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-12 w-1/2 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : failed !== null ? (
        <p role="alert" className="text-sm text-red-600">
          This conversation can&apos;t be shown. {failed}
        </p>
      ) : detail !== null ? (
        <div className="flex flex-col gap-4">
          <div>
            <button
              type="button"
              onClick={handleLoadEarlier}
              disabled={loadingEarlier}
              className="mb-3 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              {loadingEarlier ? 'Loading…' : 'Load earlier'}
            </button>
            <ul className="space-y-2">
              {[...earlier, ...detail.messages].map((m) => (
                <li
                  key={m.id}
                  data-testid={`message-${m.id}`}
                  className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-xs font-medium text-gray-500">{senderName(m.sender_group_id)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{m.content}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
              {pending.map((p) => (
                <li
                  key={p.localId}
                  data-testid={`pending-${p.state}`}
                  className={`rounded-xl border px-4 py-3 shadow-sm ${
                    p.state === 'failed'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-100 bg-white opacity-70'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm text-gray-900">{p.content}</p>
                  {p.state === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => handleRetry(p)}
                      className="mt-1 text-xs font-medium text-red-700 hover:underline"
                    >
                      Send failed — retry
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">Sending…</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Write a message…"
              aria-label="Message"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={draft.trim() === ''}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
