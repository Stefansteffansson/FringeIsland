'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ClosedGroupThreadRow, SealedThreadDetail } from '@/lib/admin/content';

/**
 * TASK-SEAL-01 (Hub half) — the preserved-threads section on
 * /admin/groups/[id], mounted by the parent for CLOSED engagement groups only.
 *
 * Realises AB-6 ruling B1 as re-scoped at the DoR walk: sealed conversation
 * threads (preserve-and-seal, FEAT-PD012 — where bullying evidence lands
 * when the author departs) become visible to the admin plane, bounded:
 *   1. closed groups only (the one state a sealed thread exists in);
 *   2. group-kind threads only — the contract never returns direct ones;
 *   3. LABELLED — a sealed thread says so, with when, and is never presented
 *      as live: no reply, no compose, no live chrome;
 *   4. an audited read (the BFF records the list read durably; the platform
 *      writes the audit row for every thread read).
 *
 * TASK-SEAL-02 (the rider, 2026-09-03): from "you can see it exists" to "you
 * can read it". Each row gains exactly ONE affordance — Open — leading to a
 * read-only thread view labelled "Sealed <date> — preserved when the group
 * closed; nothing here is live", over the SEAL-01-shaped platform door
 * (`admin_get_group_conversation_detail`: wall, closed scope, DM no-leak,
 * audit row). Senders arrive ladder-resolved: a departed author reads
 * "Former member". No composer, no reply, no reactions.
 *
 * Posture is the H041 wing's: fetch-on-mount, a 404 (no longer closed, or
 * no longer an admin) hands the drift to the parent, which re-reads the
 * detail and the section collapses.
 */

type Props = {
  groupId: string;
  groupName: string;
  onStateDrift: () => void;
};

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; threads: ClosedGroupThreadRow[] };

type OpenState =
  | { kind: 'loading'; id: string }
  | { kind: 'error'; id: string; message: string }
  | { kind: 'loaded'; id: string; detail: SealedThreadDetail };

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

const countLabel = (n: number) => (n === 1 ? '1 message' : `${n} messages`);

const FAILED = 'The preserved threads could not be loaded.';
const THREAD_FAILED = 'This thread could not be loaded.';

// COM-14: a non-active attribution renders quietly distinct (the wing's own class).
const authorClass = (attribution: string) => (attribution === 'active' ? '' : 'italic text-gray-500');

// The loader is an effect that synchronises with the BFF and sets state only
// from the response callbacks (the react-hooks rule's own shape — never
// synchronously in the effect body). A retry bumps the nonce; a refusal
// hands the drift to the parent, whose re-read collapses this section.
function useClosedThreadsLoad(groupId: string, onStateDrift: Props['onStateDrift']) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/groups/${groupId}/closed-threads`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 404 || res.status === 403 || res.status === 401) {
          onStateDrift();
          setState({ kind: 'error', message: FAILED });
          return;
        }
        if (!res.ok) {
          setState({ kind: 'error', message: FAILED });
          return;
        }
        const body = (await res.json()) as { threads?: ClosedGroupThreadRow[] };
        if (active) setState({ kind: 'loaded', threads: body.threads ?? [] });
      })
      .catch(() => {
        if (active) setState({ kind: 'error', message: FAILED });
      });
    return () => {
      active = false;
    };
  }, [groupId, onStateDrift, nonce]);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  return { state, load };
}

export function AdminClosedThreadsSection({ groupId, groupName, onStateDrift }: Props) {
  const { state, load } = useClosedThreadsLoad(groupId, onStateDrift);
  const [open, setOpen] = useState<OpenState | null>(null);

  // TASK-SEAL-02: the thread read — a click, one fetch, the read-only view.
  // Memoised (a plain async closure here bails the React Compiler lint out of
  // the component silently — the 2026-09-03 finding on /journeys).
  const openThread = useCallback(
    async (conversationId: string) => {
      setOpen({ kind: 'loading', id: conversationId });
      try {
        const res = await fetch(`/api/admin/groups/${groupId}/closed-threads/${conversationId}`);
        if (res.status === 404 || res.status === 403 || res.status === 401) {
          setOpen(null);
          onStateDrift();
          return;
        }
        if (!res.ok) {
          setOpen({ kind: 'error', id: conversationId, message: THREAD_FAILED });
          return;
        }
        const body = (await res.json()) as { detail: SealedThreadDetail };
        setOpen({ kind: 'loaded', id: conversationId, detail: body.detail });
      } catch {
        setOpen({ kind: 'error', id: conversationId, message: THREAD_FAILED });
      }
    },
    [groupId, onStateDrift],
  );

  return (
    <section
      data-testid="closed-threads-section"
      aria-labelledby="closed-threads-heading"
      className="mt-8 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h2 id="closed-threads-heading" className="text-base font-semibold text-gray-900">
        Preserved threads
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        {groupName} is closed. Its group threads were preserved when the group closed. A sealed
        thread is labelled below and is never live. Open a thread to read it — read-only and
        audited; nothing in it is live.
      </p>

      {state.kind === 'loading' && (
        <div role="status" aria-label="Loading preserved threads" className="mt-3 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mt-3 text-sm text-red-700" role="alert">
          {state.message}{' '}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {state.kind === 'loaded' && state.threads.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">No group threads were preserved for this group.</p>
      )}

      {state.kind === 'loaded' && state.threads.length > 0 && open === null && (
        <ul className="mt-3 divide-y divide-gray-100">
          {state.threads.map((t) => (
            <li
              key={t.id}
              data-testid="closed-thread-row"
              className="flex flex-wrap items-baseline justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{t.title ?? 'Untitled thread'}</span>
                {t.is_sealed && (
                  <span
                    data-testid="sealed-badge"
                    className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-700"
                    title={t.sealed_at ? `Sealed ${fmtDate(t.sealed_at)}` : 'Sealed'}
                  >
                    Sealed{t.sealed_at ? ` ${fmtDate(t.sealed_at)}` : ''}
                  </span>
                )}
              </div>
              <span className="flex items-baseline gap-3 text-xs text-gray-500">
                <span>
                  {countLabel(t.message_count)}
                  {t.last_message_at ? ` · last ${fmtDate(t.last_message_at)}` : ''}
                </span>
                {/* TASK-SEAL-02: the one affordance — Open. Read-only, audited platform-side. */}
                <button
                  type="button"
                  data-testid={`open-closed-thread-${t.id}`}
                  onClick={() => void openThread(t.id)}
                  className="font-medium text-blue-600 underline-offset-2 hover:underline"
                >
                  Open
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open !== null && (
        <div data-testid="closed-thread-view" className="mt-3">
          <button
            type="button"
            data-testid="closed-thread-back"
            onClick={() => setOpen(null)}
            className="mb-2 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Back to preserved threads
          </button>

          {open.kind === 'loading' && (
            <div role="status" aria-label="Loading the thread" className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
          )}

          {open.kind === 'error' && (
            <div className="text-sm text-red-700" role="alert">
              {open.message}{' '}
              <button type="button" className="underline" onClick={() => void openThread(open.id)}>
                Retry
              </button>
            </div>
          )}

          {open.kind === 'loaded' && (
            <>
              <p className="text-sm font-medium text-gray-900">
                {open.detail.title ?? 'Untitled thread'}
              </p>
              {/* Bound 3, said in words: the sealed state is explicit and never live. */}
              <p
                data-testid="sealed-thread-label"
                className="mt-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
              >
                {open.detail.is_sealed
                  ? `Sealed ${fmtDate(open.detail.sealed_at) ?? ''} — preserved when the group closed; nothing here is live.`
                  : 'Preserved when the group closed; nothing here is live.'}
                {open.detail.truncated ? ' Showing the first 500 messages.' : ''}
              </p>
              {open.detail.messages.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No messages were preserved in this thread.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {open.detail.messages.map((m) => {
                    const sender = m.sender_group_id
                      ? open.detail.senders[m.sender_group_id]
                      : undefined;
                    return (
                      <li key={m.id} data-testid="closed-thread-message" className="text-sm">
                        <span className={`mr-2 text-xs ${authorClass(sender?.attribution ?? 'unknown')}`}>
                          {sender?.display_name ?? 'Unknown'}
                        </span>
                        <span className="mr-2 text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                        {m.is_deleted ? (
                          <span className="italic text-gray-500">(removed by its author before the seal)</span>
                        ) : (
                          <span className="text-gray-900">{m.content}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
