'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminGroupRow } from '@/lib/admin/groups';

/**
 * FEAT-H035 STORY-1 — /admin/groups: the cross-platform group list with the
 * Platform-stewarded (caretaker) tab. Fresh per mount and per tab switch —
 * admin reads are never session-cached (the H034 rule). The 404 shape on
 * refusal mirrors AdminDashboard: the platform refused, so this page does
 * not exist for this viewer.
 */

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'deusex_stewarded', label: 'Platform-stewarded' },
  { key: 'suspended', label: 'Suspended' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

// GRP-5 vocabulary (vocabulary-tolerant: unknown statuses render the raw
// string in the fallback style — the CHECK can grow).
const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-gray-200 text-gray-700',
  archived: 'bg-amber-100 text-amber-800',
  // FEAT-H038 STORY-6 (FEAT-PC023): the visible steward-fix hold.
  resting: 'bg-sky-100 text-sky-800',
  suspended: 'bg-red-100 text-red-700',
};

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; groups: AdminGroupRow[] };

export function AdminGroupsList() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  // Pure fetch → next view; state application lives in .then callbacks so no
  // setState is reachable synchronously from the effect
  // (react-hooks/set-state-in-effect). The loading reset on a filter switch
  // moved to the tab handler (event-handler sets are the sanctioned home).
  const computeView = useCallback(async (f: FilterKey): Promise<ViewState> => {
    try {
      const res = await fetch(`/api/admin/groups?filter=${f}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        return { kind: 'refused' };
      }
      if (!res.ok) {
        return { kind: 'error' };
      }
      const body = (await res.json()) as { groups: AdminGroupRow[] };
      return { kind: 'loaded', groups: body.groups };
    } catch {
      return { kind: 'error' };
    }
  }, []);

  useEffect(() => {
    let active = true;
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Groups</h1>
      <div role="tablist" aria-label="Group filters" className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => {
              setView({ kind: 'loading' });
              setFilter(f.key);
            }}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {view.kind === 'loading' && (
        <div role="status" aria-label="Loading groups" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      )}

      {view.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-red-800">Could not load groups.</p>
          <button
            onClick={() => {
              setView({ kind: 'loading' });
              void computeView(filter).then(setView);
            }}
            className="rounded bg-red-700 px-3 py-1 text-sm text-white"
          >
            Retry
          </button>
        </div>
      )}

      {view.kind === 'loaded' && view.groups.length === 0 && (
        <p className="text-gray-600">No groups under this filter.</p>
      )}

      {view.kind === 'loaded' && view.groups.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th scope="col" className="py-2 pr-4">
                Name
              </th>
              <th scope="col" className="py-2 pr-4">
                Type
              </th>
              <th scope="col" className="py-2 pr-4">
                Members
              </th>
              <th scope="col" className="py-2 pr-4">
                People
              </th>
              <th scope="col" className="py-2">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {view.groups.map((g) => (
              <tr
                key={g.id}
                data-testid={`admin-group-row-${g.id}`}
                className="border-b last:border-b-0"
              >
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/admin/groups/${g.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {g.name}
                    </Link>
                    {g.status !== 'active' && (
                      <span
                        data-testid="status-badge"
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          STATUS_STYLES[g.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {g.status}
                      </span>
                    )}
                    {g.deusex_stewarded && (
                      <span
                        data-testid="caretaker-flag"
                        className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                      >
                        Platform-stewarded
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-600">{g.group_type}</td>
                <td className="py-3 pr-4">{g.member_count}</td>
                <td className="py-3 pr-4">{g.non_system_member_count}</td>
                <td className="py-3 text-gray-600">
                  {new Date(g.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
