'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminReportRow } from '@/lib/admin/reports';

/**
 * FEAT-H037 STORY-1 — /admin/moderation: the report queue. The filter tabs
 * map 1:1 onto FEAT-PC022's open namespace (open default / resolved / all).
 * Rows are grouped by target client-side — N reports on one piece of content
 * read as one cluster; per-report resolution stays the platform's law. Fresh
 * per mount and per filter switch (the H034 rule); the 404 shape on refusal.
 */

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; reports: AdminReportRow[] };

const excerpt = (s: string | null, n = 140): string =>
  s === null ? '' : s.length > n ? `${s.slice(0, n)}…` : s;

type Cluster = { key: string; target_kind: string; target_id: string; rows: AdminReportRow[] };

const clusterByTarget = (rows: AdminReportRow[]): Cluster[] => {
  const map = new Map<string, Cluster>();
  for (const r of rows) {
    const key = `${r.target_kind}-${r.target_id}`;
    const existing = map.get(key);
    if (existing) existing.rows.push(r);
    else map.set(key, { key, target_kind: r.target_kind, target_id: r.target_id, rows: [r] });
  }
  return [...map.values()];
};

export function AdminModerationQueue() {
  const [filter, setFilter] = useState<FilterKey>('open');
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  // Pure fetch → next view; state application lives in .then callbacks (the
  // H035 shape — no setState reachable synchronously from the effect).
  const computeView = useCallback(async (f: FilterKey): Promise<ViewState> => {
    try {
      const res = await fetch(`/api/admin/reports?filter=${f}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        return { kind: 'refused' };
      }
      if (!res.ok) {
        return { kind: 'error' };
      }
      const body = (await res.json()) as { reports: AdminReportRow[] };
      return { kind: 'loaded', reports: body.reports };
    } catch {
      return { kind: 'error' };
    }
  }, []);

  useEffect(() => {
    let active = true;
    setView({ kind: 'loading' });
    void computeView(filter).then((next) => {
      if (active) setView(next);
    });
    return () => {
      active = false;
    };
  }, [computeView, filter]);

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
      <div role="status" aria-label="Loading the moderation queue" className="space-y-3 p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">Could not load the moderation queue.</p>
        <button
          type="button"
          onClick={() => {
            setView({ kind: 'loading' });
            void computeView(filter).then(setView);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </main>
    );
  }

  const clusters = clusterByTarget(view.reports);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Moderation queue</h1>
        <div role="tablist" aria-label="Report filters" className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              type="button"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === f.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {clusters.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
          {filter === 'open' ? 'No open reports — the queue is clear.' : 'No reports here.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {clusters.map((cluster) => (
            <li
              key={cluster.key}
              data-testid={`admin-report-cluster-${cluster.key}`}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              {cluster.rows.length > 1 && (
                <p className="border-b border-gray-100 px-4 py-2 text-sm text-gray-500">
                  {cluster.rows.length} reports on this content
                </p>
              )}
              <ul>
                {cluster.rows.map((r) => (
                  <li key={r.id} data-testid={`admin-report-row-${r.id}`}>
                    <Link
                      href={`/admin/moderation/${r.id}`}
                      className="block space-y-1 px-4 py-3 hover:bg-gray-50"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                          {r.target_kind}
                        </span>
                        {r.target_group_name && (
                          <span className="text-gray-500">in {r.target_group_name}</span>
                        )}
                        {r.status !== 'open' && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                            {r.resolution_kind ?? r.status}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </span>
                      <span className="block text-sm text-gray-900">
                        <span className="font-medium">{r.reporter_display_name ?? '—'}</span>
                        {': '}
                        {r.reason}
                      </span>
                      {r.content_snapshot && (
                        <span className="block text-sm text-gray-500">
                          &ldquo;{excerpt(r.content_snapshot)}&rdquo;
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
