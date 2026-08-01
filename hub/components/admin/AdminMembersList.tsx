'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminUserRow } from '@/lib/admin/users';

/**
 * FEAT-H036 STORY-1 — /admin/members: the platform member list with honest
 * lifecycle filters. The toggles map 1:1 onto FEAT-PC021's open filter
 * namespace — the default's decommissioned-hiding is the contract's rule
 * carried through, never recomputed. Search narrows the FETCHED set
 * client-side (DS-6 recorded unconsumed; platform counts are small). Fresh
 * per mount and per filter switch — admin reads are never session-cached
 * (the H034 rule). The 404 shape on refusal: the platform refused, so this
 * page does not exist for this viewer.
 */

const FILTERS = [
  { key: 'default', label: 'Members' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'decommissioned', label: 'Decommissioned' },
  { key: 'platform_admins', label: 'Platform admins' },
  { key: 'all', label: 'All' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

// The OPEN account_state vocabulary (ADR-U050 derivation): unknown values
// render the raw string in the neutral style — the vocabulary can grow.
const STATE_STYLES: Record<string, string> = {
  paused: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-700',
  decommissioned: 'bg-gray-200 text-gray-700',
};

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; users: AdminUserRow[] };

export function AdminMembersList() {
  const [filter, setFilter] = useState<FilterKey>('default');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  // Pure fetch → next view; state application lives in .then callbacks so no
  // setState is reachable synchronously from the effect (the H035 shape).
  const computeView = useCallback(async (f: FilterKey): Promise<ViewState> => {
    try {
      const res = await fetch(`/api/admin/users?filter=${f}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        return { kind: 'refused' };
      }
      if (!res.ok) {
        return { kind: 'error' };
      }
      const body = (await res.json()) as { users: AdminUserRow[] };
      return { kind: 'loaded', users: body.users };
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

  const needle = query.trim().toLowerCase();
  const visible =
    view.kind === 'loaded'
      ? view.users.filter(
          (u) =>
            needle === '' ||
            u.display_name.toLowerCase().includes(needle) ||
            (u.email ?? '').toLowerCase().includes(needle),
        )
      : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Members</h1>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div role="tablist" aria-label="Member filters" className="flex flex-wrap gap-2">
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
        <input
          type="search"
          role="searchbox"
          aria-label="Search members"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64 rounded border px-3 py-1 text-sm"
        />
      </div>

      {view.kind === 'loading' && (
        <div role="status" aria-label="Loading members" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      )}

      {view.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-red-800">Could not load members.</p>
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

      {view.kind === 'loaded' && visible.length === 0 && (
        <p className="text-gray-600">
          {needle === '' ? 'No members under this filter.' : 'No members match the search.'}
        </p>
      )}

      {view.kind === 'loaded' && visible.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th scope="col" className="py-2 pr-4">
                Name
              </th>
              <th scope="col" className="py-2 pr-4">
                Email
              </th>
              <th scope="col" className="py-2">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr
                key={u.id}
                data-testid={`admin-member-row-${u.id}`}
                className="border-b last:border-b-0"
              >
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/admin/members/${u.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {u.display_name}
                    </Link>
                    {u.account_state !== 'active' && (
                      <span
                        data-testid="state-badge"
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          STATE_STYLES[u.account_state] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {u.account_state}
                      </span>
                    )}
                    {u.is_platform_admin && (
                      <span
                        data-testid="admin-chip"
                        className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                      >
                        Platform admin
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-600">{u.email ?? '—'}</td>
                <td className="py-3 text-gray-600">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
