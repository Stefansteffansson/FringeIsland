'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PlatformStatistics } from '@/lib/admin/queries';
import { StatTile } from '@/components/admin/StatTile';

/**
 * FEAT-H034 STORY-1/2 — the /admin dashboard (ADM-1).
 *
 * Read-only by design: the tiles and trend render from exactly the walked
 * FEAT-PC018 payload keys; no admin actions live here (ADM-B/C/D). A refused
 * probe renders the 404 shape — no admin chrome, no distinct forbidden signal
 * (existence-hiding, STORY-1). A failed load is a visible error with Retry —
 * never a frozen or empty-zero dashboard (B6); Refresh re-reads on demand
 * with immediate feedback (B5). The trend is deliberately a semantic table,
 * not a chart — v1 needs legible numbers, not visualization.
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; stats: PlatformStatistics; refreshing: boolean };

export function AdminDashboard() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  // FEAT-H037: the Moderation card's open-report count — a non-blocking side
  // read; null renders the card without a badge (never a fake zero).
  const [openReports, setOpenReports] = useState<number | null>(null);

  // Pure fetch → next view; state application lives in the callers' .then
  // callbacks so no setState is reachable synchronously from the mount effect
  // (react-hooks/set-state-in-effect).
  const computeView = useCallback(async (): Promise<ViewState> => {
    try {
      const res = await fetch('/api/admin/statistics');
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        return { kind: 'refused' };
      }
      if (!res.ok) {
        return { kind: 'error' };
      }
      const body = (await res.json()) as { stats: PlatformStatistics };
      return { kind: 'loaded', stats: body.stats, refreshing: false };
    } catch {
      return { kind: 'error' };
    }
  }, []);

  useEffect(() => {
    void computeView().then(setView);
  }, [computeView]);

  // FEAT-H037: the open-report count for the Moderation card. Failure or
  // refusal simply leaves the badge off — the stats fetch owns the page shape.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/admin/reports?filter=open');
        if (!res.ok) return;
        const body = (await res.json()) as { reports?: unknown[] };
        if (active && Array.isArray(body.reports)) setOpenReports(body.reports.length);
      } catch {
        /* badge stays off */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // The synchronous refreshing paint is event-handler-only.
  const refresh = useCallback(
    (from: PlatformStatistics) => {
      setView({ kind: 'loaded', stats: from, refreshing: true });
      void computeView().then(setView);
    },
    [computeView]
  );

  if (view.kind === 'loading') {
    return (
      <div role="status" aria-label="Loading platform statistics" className="space-y-4 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  if (view.kind === 'refused') {
    // The 404 shape — indistinguishable from any unknown route.
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-2xl font-semibold text-gray-900">404</h1>
        <p className="text-gray-600">This page could not be found.</p>
      </main>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">Could not load platform statistics.</p>
        <button
          type="button"
          onClick={() => {
            setView({ kind: 'loading' });
            void computeView().then(setView);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </main>
    );
  }

  const { stats, refreshing } = view;
  return (
    <main className="space-y-6 p-6" aria-busy={refreshing}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Platform dashboard</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            As of {new Date(stats.generated_at).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={() => refresh(stats)}
            disabled={refreshing}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          title="Members"
          primary={stats.members.total}
          primaryLabel="total"
          subs={[
            { label: 'active', value: stats.members.active },
            { label: 'mists', value: stats.members.mists },
          ]}
        />
        <StatTile
          title="Groups"
          primary={stats.groups.total}
          primaryLabel="total"
          subs={[{ label: 'engagement', value: stats.groups.engagement }]}
        />
        <StatTile
          title="Journeys"
          primary={stats.journeys.active_enrollments}
          primaryLabel="active enrollments"
          subs={[{ label: 'completed, 30 days', value: stats.journeys.completions_30d }]}
        />
      </div>

      {/* FEAT-H035/H036: administration areas — the Groups (ADM-8) and
          Members (ADM-2) entries. */}
      <nav aria-label="Administration areas" className="flex flex-wrap gap-4">
        <Link
          href="/admin/groups"
          data-testid="admin-nav-groups"
          className="block max-w-xs rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-400"
        >
          <span className="block text-sm font-medium text-gray-900">Group administration</span>
          <span className="block text-sm text-gray-500">
            Every group on the platform — including the ones FringeIsland caretakes.
          </span>
        </Link>
        <Link
          href="/admin/members"
          data-testid="admin-nav-members"
          className="block max-w-xs rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-400"
        >
          <span className="block text-sm font-medium text-gray-900">Member administration</span>
          <span className="block text-sm text-gray-500">
            Every member at platform scope — lifecycle, sessions, and platform administrators.
          </span>
        </Link>
        {/* FEAT-H037: the Moderation (ADM-10/11) and Audit log (ADM-16)
            entries — the last A-ADM console rows. */}
        <Link
          href="/admin/moderation"
          data-testid="admin-nav-moderation"
          className="block max-w-xs rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-400"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
            Moderation
            {openReports !== null && openReports > 0 && (
              <span
                data-testid="admin-nav-moderation-count"
                className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
              >
                {openReports}
              </span>
            )}
          </span>
          <span className="block text-sm text-gray-500">
            Content reports across the platform — triage, resolve, and tell the reporter.
          </span>
        </Link>
        <Link
          href="/admin/audit"
          data-testid="admin-nav-audit"
          className="block max-w-xs rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-400"
        >
          <span className="block text-sm font-medium text-gray-900">Audit log</span>
          <span className="block text-sm text-gray-500">
            Every admin action and auth moment, newest first — the platform&rsquo;s own trail.
          </span>
        </Link>
      </nav>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <caption className="mb-2 text-left text-sm font-medium text-gray-500">
            Activity — last 30 days
          </caption>
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th scope="col" className="py-1 pr-4 font-medium">
                Day
              </th>
              <th scope="col" className="py-1 font-medium">
                Events
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.activity_daily.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-2 text-gray-500">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              stats.activity_daily.map((d) => (
                <tr key={d.day} className="border-t border-gray-100">
                  <td className="py-1 pr-4 text-gray-700">{d.day}</td>
                  <td className="py-1 text-gray-900">{d.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
