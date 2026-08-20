'use client';

import { Suspense, use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import {
  fetchConversationDetail,
  markRead,
  sendMessage,
  type ConversationDetail,
  type ConversationMessage,
} from '@/lib/messages/client';
import { authorKindBadge } from '@/lib/forum/attribution';
import {
  CONVERSATIONS_CHANGED_EVENT,
  conversationsTopic,
} from '@/lib/realtime/conversations-tenant';
import { useCommChannel } from '@/lib/realtime/use-comm-channel';
import { ReconnectingNotice } from '@/components/ui/ReconnectingNotice';
import { ReportDialog } from '@/components/reports/ReportDialog';

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
 *
 * FEAT-H047 (over FEAT-PD019 T2): the param-carried hat. `?acting=A` (the
 * 2026-08-19 ruling — the link carries the hat; the server gate is the
 * authority; never a session-wide mode): the detail read, sends, and the
 * read-marking carry the acting group; a banner names the substitution; the
 * composer wears the permanent "Sending as {A}" label (no per-message
 * dialogs); wielded sends show NO optimistic bubble (the confirmed row
 * appends — no optimistic wielded state); opening marks the GROUP's shared
 * clock; a refusal names itself with a "View as myself" fallback that drops
 * the param. Group senders badge on the senders map's `kind` in BOTH views;
 * Report hides under the hat (the ruled wielded surface). The param is read
 * behind Suspense (the W-1 useSearchParams CSR-bailout rule).
 */
function ConversationView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const acting = searchParams.get('acting') ?? undefined;
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [earlier, setEarlier] = useState<ConversationMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
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

  // The one load path — a first load and a live re-read take the SAME fetch +
  // markRead sequence, so read-marking behaviour is byte-identical either way
  // (FEAT-H027 STORY-3). Only the failure posture differs: a first load
  // surfaces the error; a background re-read swallows it and leaves the open
  // conversation on screen (verify-on-signal — a refused hint is never content).
  // FEAT-H047: with the hat, the same path reads and marks as the group.
  const loadDetail = useCallback(
    (opts: { background: boolean; active: () => boolean }) =>
      fetchConversationDetail(id, acting ? { acting } : undefined)
        .then((doc) => {
          if (!opts.active()) return;
          setDetail(doc);
          setFailed(null);
          markRead(id, acting).catch(() => {}); // best-effort; the badge self-heals on next read
        })
        .catch((err: Error) => {
          if (opts.active() && !opts.background) setFailed(err.message);
        }),
    [id, acting],
  );

  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    let active = true;
    // FEAT-H047: a view switch (param appears/disappears) repaints clean.
    setDetail(null);
    setEarlier([]);
    setFailed(null);
    loadDetail({ background: false, active: () => active });
    return () => {
      active = false;
    };
  }, [authLoading, identity, loadDetail]);

  // FEAT-H027 STORY-3: a hint naming THIS conversation re-reads through the
  // load path above; a hint naming another conversation leaves it undisturbed
  // (only the inbox/badge move). The re-read runs in the background — existing
  // content stays on screen while it resolves.
  useEffect(() => {
    if (identity !== 'fim') return;
    let active = true;
    const onChanged = (e: Event) => {
      const targeted = (e as CustomEvent<{ conversationId: string | null }>).detail?.conversationId;
      if (targeted === id) void loadDetail({ background: true, active: () => active });
    };
    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, onChanged);
    return () => {
      active = false;
      window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, onChanged);
    };
  }, [identity, id, loadDetail]);

  // FEAT-H027 STORY-6: reconcile the open conversation on recovery / visibility
  // regain / degraded poll — the same background load path (the hook won't fire
  // after unmount, so no active guard is needed here). The hook also drives the
  // quiet reconnecting affordance rendered below. (FEAT-H047 note: this poll is
  // also the wielded thread's liveness — group participants emit no hints, the
  // ruled v1 silence.)
  const reconcile = useCallback(
    () => loadDetail({ background: true, active: () => true }),
    [loadDetail],
  );
  const { reconnecting } = useCommChannel(
    identity === 'fim' ? conversationsTopic(user?.id ?? null) : null,
    reconcile,
  );

  const senderName = useCallback(
    (senderGroupId: string | null): string => {
      if (!senderGroupId) return 'Unknown';
      return detail?.senders[senderGroupId]?.display_name ?? 'Unknown';
    },
    [detail],
  );

  // FEAT-H047 STORY-3 (ADR-U041 §5): the kind badge, payload-driven from the
  // senders map — the byline is the badge's one home (participants[] carry
  // name only; the spec's payload-walk correction).
  const senderBadge = useCallback(
    (senderGroupId: string | null): string | null => {
      if (!senderGroupId) return null;
      const display = detail?.senders[senderGroupId];
      return display ? authorKindBadge(display) : null;
    },
    [detail],
  );

  // FEAT-H047: A's name for the banner/label comes from the payload's own
  // participants row — no extra fetch (the spec's payload walk).
  const actingName = acting
    ? detail?.participants.find((p) => p.participant_group_id === acting)?.name ?? 'the group'
    : null;

  // FEAT-H028 STORY-5 (COM-13): the report own-check — my personal-group id is
  // the is_me participant's group id in the payload. A message is mine when its
  // sender matches; Report is offered only on messages that aren't. DMs remain
  // immutable — no edit/delete affordance is ever rendered here (STORY-4).
  const myParticipantGroupId =
    detail?.participants.find((p) => p.is_me)?.participant_group_id ?? null;
  const isMyMessage = (m: ConversationMessage): boolean =>
    m.sender_group_id !== null && m.sender_group_id === myParticipantGroupId;

  async function handleLoadEarlier() {
    if (!detail) return;
    const oldest = [...earlier, ...detail.messages][0];
    if (!oldest) return;
    setLoadingEarlier(true);
    try {
      const page = await fetchConversationDetail(id, {
        before: oldest.created_at,
        ...(acting ? { acting } : {}),
      });
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

  // FEAT-H047: the wielded send — NO optimistic bubble and no raw append:
  // the write RE-READS (the wielded rabbit hole), which also serves A's
  // senders-map entry for a first-time sender (an appended raw row would
  // render 'Unknown' until the next read — the map is per-page). A refusal
  // restores the draft and surfaces the substrate's copy verbatim.
  async function wieldedDeliver(content: string) {
    try {
      await sendMessage(id, content, acting);
      await loadDetail({ background: true, active: () => true });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'The message could not be sent');
      setDraft(content);
    }
  }

  function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setSendError(null);
    if (acting) {
      setDraft('');
      void wieldedDeliver(content);
      return;
    }
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
      {reconnecting && <ReconnectingNotice className="mb-3" />}
      {authLoading || identity !== 'fim' || (detail === null && failed === null) ? (
        <div className="space-y-3" aria-hidden="true" data-testid="thread-skeleton">
          <div className="h-12 w-2/3 animate-pulse rounded-xl bg-gray-100" />
          <div className="ml-auto h-12 w-2/3 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-12 w-1/2 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : failed !== null ? (
        acting ? (
          // FEAT-H047 STORY-2: the wielded refusal named honestly, with the
          // way back to my own view (drops the param; the server refused, so
          // nothing was shown that the hat doesn't open).
          <div data-testid="thread-acting-refused">
            <p role="alert" className="text-sm text-red-600">
              This conversation can&apos;t be shown as the group. {failed}
            </p>
            <button
              type="button"
              onClick={() => router.replace(`/messages/${id}`)}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              View as myself
            </button>
          </div>
        ) : (
          <p role="alert" className="text-sm text-red-600">
            This conversation can&apos;t be shown. {failed}
          </p>
        )
      ) : detail !== null ? (
        <div className="flex flex-col gap-4">
          {acting && (
            // FEAT-H047 STORY-2: the substitution named per-page (never a
            // global mode — the param is this page's whole acting state).
            <p
              data-testid="thread-acting-banner"
              className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800"
            >
              Viewing as {actingName}
            </p>
          )}
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
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    {senderName(m.sender_group_id)}
                    {senderBadge(m.sender_group_id) && (
                      <span
                        data-testid={`message-sender-badge-${m.id}`}
                        className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800"
                      >
                        {senderBadge(m.sender_group_id)}
                      </span>
                    )}
                  </p>
                  {m.is_deleted ? (
                    <p
                      data-testid={`message-tombstone-${m.id}`}
                      className="mt-1 text-sm italic text-gray-400"
                    >
                      {/* FEAT-PD018 content-level tombstone. Worded like the
                          forum's for one register across the product, and
                          neutral for the same reason: it does not say who
                          removed it or why. The thread shape survives so the
                          other participant keeps their own record. */}
                      This message was removed
                    </p>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{m.content}</p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</p>
                    {/* FEAT-H047 (ruled): reporting is a personal act — hidden
                        under the hat (read/send/join/leave only). */}
                    {!acting && !m.is_deleted && !isMyMessage(m) && (
                      <ReportDialog targetKind="direct_message" targetId={m.id} />
                    )}
                  </div>
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

          {sendError && (
            <p role="alert" className="text-sm text-red-600">
              {sendError}
            </p>
          )}

          <div>
            {acting && (
              // FEAT-H047 STORY-2 (the 2026-08-19 ruling): the permanent label
              // at the composer instead of per-message dialogs.
              <p
                data-testid="thread-acting-send-label"
                className="mb-1 text-xs font-medium text-violet-700"
              >
                Sending as {actingName}
              </p>
            )}
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
        </div>
      ) : null}
    </AppShell>
  );
}

/** The `useSearchParams` reader sits behind Suspense so the param read can't
 *  bail the page out of static rendering (the W-1 CSR-bailout precedent). */
export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <AppShell title="Conversation">
          <div className="space-y-3" aria-hidden="true" data-testid="thread-skeleton">
            <div className="h-12 w-2/3 animate-pulse rounded-xl bg-gray-100" />
            <div className="ml-auto h-12 w-2/3 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-12 w-1/2 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </AppShell>
      }
    >
      <ConversationView params={params} />
    </Suspense>
  );
}
