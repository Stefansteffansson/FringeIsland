'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdminUsersPage, BulkAction, BulkRowOutcome } from '@/lib/admin/users';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H039 STORY-1..5 — /admin/members, bounded: server keyset paging (page
 * size 50; Prev replays a client cursor stack), debounced SERVER search (the
 * FEAT-H036 client-side narrowing retired with the full-census fetch), the
 * As-of/Refresh affordance (RB-8 — the payload's server clock, never a client
 * stamp), explicit page-scoped selection (cleared on ANY view change; no
 * cross-page select-all exists), and the RB-2 bulk bar — Suspend / Reactivate
 * / Force sign-out as BFF-looped singles with per-row outcomes rendered
 * VERBATIM (partial success is honest). Fresh per mount and per view change —
 * admin reads are never session-cached (the H034 rule). The 404 shape on
 * refusal: the platform refused, so this page does not exist for this viewer.
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

const BULK_ACTIONS: Array<{ action: BulkAction; label: string; title: string; verb: string }> = [
  { action: 'suspend', label: 'Suspend', title: 'Bulk suspend', verb: 'Suspend' },
  { action: 'reactivate', label: 'Reactivate', title: 'Bulk reactivate', verb: 'Reactivate' },
  {
    action: 'force-logout',
    label: 'Force sign-out',
    title: 'Bulk force sign-out',
    verb: 'Sign out',
  },
];

// WA-1(b) (ADM-E walk rider): an action disables when NO selected member could
// accept it — the detail rail's payload-fact derivations (FEAT-H036), never a
// client-side re-decision of platform rules. Mixed selections stay enabled;
// per-row outcomes remain the honesty mechanism for them (RB-2).
const BULK_ELIGIBLE: Record<BulkAction, (accountState: string) => boolean> = {
  suspend: (s) => s === 'active',
  reactivate: (s) => s === 'paused' || s === 'suspended',
  'force-logout': (s) => s !== 'decommissioned',
};

type Cursor = { name: string; id: string } | null;

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; page: AdminUsersPage };

type OutcomeRow = BulkRowOutcome & { display_name: string; email: string | null };

const listUrl = (filter: FilterKey, search: string, cursor: Cursor): string => {
  let url = `/api/admin/users?filter=${filter}`;
  if (search !== '') url += `&search=${encodeURIComponent(search)}`;
  if (cursor) {
    url += `&after_name=${encodeURIComponent(cursor.name)}&after_id=${cursor.id}`;
  }
  return url;
};

export function AdminMembersList() {
  const [filter, setFilter] = useState<FilterKey>('default');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<Cursor>(null);
  const [cursorStack, setCursorStack] = useState<Cursor[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<BulkAction | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<{ title: string; rows: OutcomeRow[] } | null>(null);

  // Debounced server search: the applied value resets paging and selection.
  const appliedSearchRef = useRef('');
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (appliedSearchRef.current === next) return;
      appliedSearchRef.current = next;
      setSearch(next);
      setCursor(null);
      setCursorStack([]);
      setSelected([]);
      setView({ kind: 'loading' });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Pure fetch → next view; state application lives in .then callbacks so no
  // setState is reachable synchronously from the effect (the H035 shape).
  const computeView = useCallback(
    async (f: FilterKey, s: string, c: Cursor): Promise<ViewState> => {
      try {
        const res = await fetch(listUrl(f, s, c));
        if (res.status === 404 || res.status === 403 || res.status === 401) {
          return { kind: 'refused' };
        }
        if (!res.ok) {
          return { kind: 'error' };
        }
        const page = (await res.json()) as AdminUsersPage;
        return { kind: 'loaded', page };
      } catch {
        return { kind: 'error' };
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void computeView(filter, search, cursor).then((next) => {
      if (active) setView(next);
    });
    return () => {
      active = false;
    };
  }, [computeView, filter, search, cursor, reloadTick]);

  if (view.kind === 'refused') {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="text-gray-600">This page could not be found.</p>
      </main>
    );
  }

  const rows = view.kind === 'loaded' ? view.page.users : [];
  const selectedRows = rows.filter((u) => selected.includes(u.id));
  const bulkSpec = BULK_ACTIONS.find((b) => b.action === bulk) ?? null;

  const resetToPageOne = () => {
    setCursor(null);
    setCursorStack([]);
    setSelected([]);
    setView({ kind: 'loading' });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePage = () => {
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((u) => u.id)));
  };

  const runBulk = async (spec: (typeof BULK_ACTIONS)[number]) => {
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch(`/api/admin/users/bulk/${spec.action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selected }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setBulkError(body.error ?? 'Bulk action failed');
        return;
      }
      const body = (await res.json()) as { results: BulkRowOutcome[] };
      const byId = new Map(rows.map((u) => [u.id, u]));
      setOutcomes({
        title: `${spec.title} — results`,
        rows: body.results.map((r) => ({
          ...r,
          display_name: byId.get(r.id)?.display_name ?? r.id,
          email: byId.get(r.id)?.email ?? null,
        })),
      });
      setSelected([]);
      setView({ kind: 'loading' });
      setReloadTick((t) => t + 1); // repaint from a fresh read, same page
    } finally {
      setBulkBusy(false);
      setBulk(null);
    }
  };

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
                resetToPageOne();
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64 rounded border px-3 py-1 text-sm"
        />
        {view.kind === 'loaded' && (
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <span data-testid="as-of">
              As of {new Date(view.page.generated_at).toLocaleString()}
            </span>
            <button
              onClick={() => {
                setSelected([]);
                setView({ kind: 'loading' });
                setReloadTick((t) => t + 1);
              }}
              className="rounded border px-2 py-0.5 text-sm text-gray-700"
            >
              Refresh
            </button>
          </span>
        )}
      </div>

      {bulkError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {bulkError}
        </div>
      )}

      {outcomes && (
        <section
          data-testid="bulk-outcomes"
          aria-label={outcomes.title}
          className="mb-4 rounded border border-gray-300 bg-gray-50 p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{outcomes.title}</h2>
            <button
              onClick={() => setOutcomes(null)}
              className="rounded border px-2 py-0.5 text-xs text-gray-600"
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {outcomes.rows.map((r) => (
              <li key={r.id} data-testid={`bulk-outcome-${r.id}`}>
                {r.display_name} ({r.email ?? 'no email on record'}) —{' '}
                {r.ok ? (
                  <span className="text-green-700">done</span>
                ) : (
                  <span className="text-red-700">{r.error ?? 'failed'}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected.length > 0 && (
        <div
          data-testid="bulk-bar"
          className="mb-4 flex flex-wrap items-center gap-3 rounded border border-gray-300 bg-gray-50 px-3 py-2"
        >
          <span data-testid="selection-count" className="text-sm text-gray-700">
            {selected.length} selected
          </span>
          {BULK_ACTIONS.map((b) => {
            const noneEligible = !selectedRows.some((u) => BULK_ELIGIBLE[b.action](u.account_state));
            return (
              <button
                key={b.action}
                data-testid={`bulk-${b.action}`}
                disabled={noneEligible}
                title={noneEligible ? 'No selected member can accept this action' : undefined}
                onClick={() => setBulk(b.action)}
                className="rounded border border-gray-400 px-3 py-1 text-sm text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {b.label}
              </button>
            );
          })}
        </div>
      )}

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
              setReloadTick((t) => t + 1);
            }}
            className="rounded bg-red-700 px-3 py-1 text-sm text-white"
          >
            Retry
          </button>
        </div>
      )}

      {view.kind === 'loaded' && rows.length === 0 && (
        <p className="text-gray-600">
          {search === '' ? 'No members under this filter.' : 'No members match the search.'}
        </p>
      )}

      {view.kind === 'loaded' && rows.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th scope="col" className="py-2 pr-2">
                <input
                  type="checkbox"
                  aria-label="Select page"
                  checked={rows.length > 0 && selected.length === rows.length}
                  onChange={togglePage}
                />
              </th>
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
            {rows.map((u) => (
              <tr
                key={u.id}
                data-testid={`admin-member-row-${u.id}`}
                className="border-b last:border-b-0"
              >
                <td className="py-3 pr-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${u.display_name}`}
                    checked={selected.includes(u.id)}
                    onChange={() => toggleRow(u.id)}
                  />
                </td>
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

      <div className="mt-4 flex items-center gap-2">
        <button
          data-testid="pager-prev"
          disabled={view.kind !== 'loaded' || cursorStack.length === 0}
          onClick={() => {
            const prevCursor = cursorStack.length ? cursorStack[cursorStack.length - 1] : null;
            setCursorStack(cursorStack.slice(0, -1));
            setCursor(prevCursor);
            setSelected([]);
            setView({ kind: 'loading' });
          }}
          className="rounded border px-3 py-1 text-sm text-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          data-testid="pager-next"
          disabled={view.kind !== 'loaded' || view.page.next_cursor === null}
          onClick={() => {
            if (view.kind !== 'loaded' || !view.page.next_cursor) return;
            setCursorStack((stack) => [...stack, cursor]);
            setCursor(view.page.next_cursor);
            setSelected([]);
            setView({ kind: 'loading' });
          }}
          className="rounded border px-3 py-1 text-sm text-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <ConfirmModal
        isOpen={bulkSpec !== null}
        title={bulkSpec?.title ?? ''}
        message={
          bulkSpec ? (
            <span>
              {bulkSpec.verb} {selectedRows.length} member{selectedRows.length === 1 ? '' : 's'}?
              <ul className="mt-2 max-h-48 overflow-y-auto text-left text-sm">
                {selectedRows.map((u) => (
                  <li key={u.id}>
                    {u.display_name} ({u.email ?? 'no email on record'})
                  </li>
                ))}
              </ul>
            </span>
          ) : (
            ''
          )
        }
        confirmText={bulkSpec?.label ?? 'Confirm'}
        variant="danger"
        busy={bulkBusy}
        onConfirm={() => {
          if (bulkSpec) void runBulk(bulkSpec);
        }}
        onCancel={() => {
          if (!bulkBusy) setBulk(null);
        }}
      />
    </main>
  );
}
