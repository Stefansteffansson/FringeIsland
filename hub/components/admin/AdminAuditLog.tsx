'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AdminAuditRow } from '@/lib/admin/audit';

/**
 * FEAT-H037 STORY-5 — /admin/audit: the platform audit trail (ADM-16).
 *
 * Newest-first rows with null-safe actor identity (erased actors and the
 * PC019 pre-session signup rows render '—', never crash). The family chips
 * are CONVENIENCES over the open dotted namespace — a free prefix input sits
 * beside them and any prefix is honest (an unmatched one renders the empty
 * state, the contract's own behaviour). Metadata renders generically for any
 * action — no per-action renderer zoo (a new action must degrade to honest
 * render, never a crash). Load more pages on the created_at keyset cursor,
 * appending — accumulation is pagination, not caching.
 */

const FAMILY_CHIPS = [
  'member.',
  'platform_admin.',
  'moderation.',
  'group.',
  'data_export',
  'auth.',
] as const;

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; rows: AdminAuditRow[]; exhausted: boolean; loadingMore: boolean };

const PAGE = 50;

export function AdminAuditLog() {
  const [prefix, setPrefix] = useState<string | null>(null);
  const [prefixInput, setPrefixInput] = useState('');
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  const fetchPage = useCallback(
    async (before: string | null, p: string | null): Promise<AdminAuditRow[] | 'refused' | 'error'> => {
      try {
        const params = new URLSearchParams({ limit: String(PAGE) });
        if (before) params.set('before', before);
        if (p) params.set('prefix', p);
        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        if (res.status === 404 || res.status === 403 || res.status === 401) return 'refused';
        if (!res.ok) return 'error';
        const body = (await res.json()) as { rows: AdminAuditRow[] };
        return body.rows;
      } catch {
        return 'error';
      }
    },
    [],
  );

  const computeView = useCallback(
    async (p: string | null): Promise<ViewState> => {
      const rows = await fetchPage(null, p);
      if (rows === 'refused') return { kind: 'refused' };
      if (rows === 'error') return { kind: 'error' };
      return { kind: 'loaded', rows, exhausted: rows.length < PAGE, loadingMore: false };
    },
    [fetchPage],
  );

  useEffect(() => {
    let active = true;
    // Both state sets live in the promise chain, never synchronously in the
    // effect body (react-hooks/set-state-in-effect — the AccountMenu idiom).
    // Found-not-caused hygiene, HYG-A: pre-existing on main.
    void Promise.resolve()
      .then(() => {
        if (active) setView({ kind: 'loading' });
        return computeView(prefix);
      })
      .then((next) => {
        if (active) setView(next);
      });
    return () => {
      active = false;
    };
  }, [computeView, prefix]);

  const loadMore = useCallback(
    async (current: AdminAuditRow[]) => {
      const cursor = current[current.length - 1]?.created_at ?? null;
      setView({ kind: 'loaded', rows: current, exhausted: false, loadingMore: true });
      const more = await fetchPage(cursor, prefix);
      if (more === 'refused') {
        setView({ kind: 'refused' });
        return;
      }
      if (more === 'error') {
        setView({ kind: 'loaded', rows: current, exhausted: false, loadingMore: false });
        return;
      }
      setView({
        kind: 'loaded',
        rows: [...current, ...more],
        exhausted: more.length < PAGE,
        loadingMore: false,
      });
    },
    [fetchPage, prefix],
  );

  if (view.kind === 'refused') {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="text-gray-600">This page could not be found.</p>
      </main>
    );
  }

  if (view.kind === 'loading') {
    return (
      <div role="status" aria-label="Loading the audit log" className="space-y-2 p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">Could not load the audit log.</p>
        <button
          type="button"
          onClick={() => {
            setView({ kind: 'loading' });
            void computeView(prefix).then(setView);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </main>
    );
  }

  const { rows, exhausted, loadingMore } = view;

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold text-gray-900">Audit log</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Action families" className="flex flex-wrap gap-1">
          <button
            role="tab"
            type="button"
            aria-selected={prefix === null}
            onClick={() => {
              setPrefixInput('');
              setPrefix(null);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              prefix === null ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {FAMILY_CHIPS.map((c) => (
            <button
              key={c}
              role="tab"
              type="button"
              aria-selected={prefix === c}
              onClick={() => {
                setPrefixInput('');
                setPrefix(c);
              }}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium ${
                prefix === c ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPrefix(prefixInput.trim() === '' ? null : prefixInput.trim());
          }}
        >
          <input
            type="text"
            aria-label="Action prefix"
            placeholder="any prefix…"
            value={prefixInput}
            onChange={(e) => setPrefixInput(e.target.value)}
            className="w-36 rounded-md border border-gray-300 px-2 py-1 font-mono text-xs"
          />
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Apply
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
          No audit entries match.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
          {rows.map((r) => (
            <li key={r.id} data-testid={`admin-audit-row-${r.id}`} className="px-4 py-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="whitespace-nowrap text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <span className="font-mono text-xs text-gray-900">{r.action}</span>
                <span className="text-gray-700">{r.actor_display_name ?? '—'}</span>
                <span className="truncate font-mono text-xs text-gray-500">{r.target}</span>
              </div>
              {Object.keys(r.metadata ?? {}).length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-gray-500">detail</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                    {JSON.stringify(r.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {!exhausted && rows.length > 0 && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore(rows)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </main>
  );
}
