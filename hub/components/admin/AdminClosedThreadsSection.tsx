'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ClosedGroupThreadRow } from '@/lib/admin/content';

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
 *      as live: no open affordance, no reply, no live chrome;
 *   4. an audited read (the BFF records it durably).
 * What this door does NOT do, said on the surface: thread contents are not
 * readable from the admin plane — no message-level contract exists yet
 * (the named follow-on).
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

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

const countLabel = (n: number) => (n === 1 ? '1 message' : `${n} messages`);

const FAILED = 'The preserved threads could not be loaded.';

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
        thread is labelled below and is never live. Thread contents are not readable from the
        admin plane.
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

      {state.kind === 'loaded' && state.threads.length > 0 && (
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
              <span className="text-xs text-gray-500">
                {countLabel(t.message_count)}
                {t.last_message_at ? ` · last ${fmtDate(t.last_message_at)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
