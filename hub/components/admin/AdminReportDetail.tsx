'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminReportDetail as Detail } from '@/lib/admin/reports';

/**
 * FEAT-H037 STORY-2/3 — /admin/moderation/[id]: report detail with drift
 * honesty and the resolve ceremony.
 *
 * The snapshot is the record ("what the content said when reported" — the
 * C-D drift rule); live_target_exists=false renders the drift-honesty line
 * while the snapshot stands. Escalation links render only what the platform
 * resolved (a NULL author offers nothing). The resolve panel is a bespoke
 * inline panel (ConfirmModal carries no children — the DeleteAccountCeremony
 * class, without type-to-confirm weight: one-shot, not destructive); its
 * consequence copy names exactly what the reporter will and will not learn.
 * Success repaints from the fresh read (the H035 rule); a stale second
 * resolve renders the platform's 409 message VERBATIM. The resolution note
 * renders here — to admins — and nowhere else.
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; report: Detail };

export function AdminReportDetail({ reportId }: { reportId: string }) {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const computeView = useCallback(async (): Promise<ViewState> => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        return { kind: 'refused' };
      }
      if (!res.ok) {
        return { kind: 'error' };
      }
      const body = (await res.json()) as { report: Detail };
      return { kind: 'loaded', report: body.report };
    } catch {
      return { kind: 'error' };
    }
  }, [reportId]);

  useEffect(() => {
    let active = true;
    void computeView().then((next) => {
      if (active) setView(next);
    });
    return () => {
      active = false;
    };
  }, [computeView]);

  const resolve = useCallback(async () => {
    if (!outcome) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_kind: outcome,
          resolution_note: note.trim() === '' ? null : note.trim(),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        // The platform's message VERBATIM — incl. the stale-second-resolve 409.
        setActionError(payload.error ?? 'The action was refused.');
        return;
      }
      // Repaint from the fresh read — never optimistic (the H035 rule).
      setView(await computeView());
    } catch {
      setActionError('The action failed. Nothing may have changed — reload to see.');
    } finally {
      setBusy(false);
    }
  }, [computeView, note, outcome, reportId]);

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
      <div role="status" aria-label="Loading the report" className="space-y-3 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">Could not load the report.</p>
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

  const { report } = view;
  const open = report.resolved_at === null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/moderation" className="text-sm text-gray-500 hover:text-gray-800">
          ← Moderation queue
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-gray-900">
          Report
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-normal text-gray-700">
            {report.target_kind}
          </span>
          {!open && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-normal text-emerald-800">
              resolved
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-600">
          Reported by <span className="font-medium">{report.reporter_display_name ?? '—'}</span>{' '}
          on {new Date(report.created_at).toLocaleString()}
        </p>
      </header>

      <section className="space-y-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-500">Reason</h2>
        <p className="text-sm text-gray-900">{report.reason}</p>
        {report.details && <p className="text-sm text-gray-600">{report.details}</p>}
      </section>

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-500">
          What the content said when reported
        </h2>
        {!report.live_target_exists && (
          <p
            data-testid="report-drift-line"
            className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-800"
          >
            This content is no longer present — the snapshot below is the record.
          </p>
        )}
        <blockquote className="border-l-2 border-gray-300 pl-3 text-sm text-gray-800">
          {report.content_snapshot ?? '—'}
        </blockquote>
      </section>

      <section className="flex flex-wrap gap-3 text-sm">
        {report.author_user_id && (
          <Link
            data-testid="report-author-link"
            href={`/admin/members/${report.author_user_id}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Author: {report.author_display_name ?? 'member'}
          </Link>
        )}
        {report.target_group_id && (
          <Link
            data-testid="report-group-link"
            href={`/admin/groups/${report.target_group_id}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Group: {report.target_group_name ?? 'group'}
          </Link>
        )}
      </section>

      {actionError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </p>
      )}

      {open ? (
        <section
          data-testid="resolve-panel"
          className="space-y-3 rounded-lg border border-gray-300 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-gray-900">Resolve this report</h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Outcome</legend>
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="outcome"
                value="actioned"
                checked={outcome === 'actioned'}
                onChange={() => setOutcome('actioned')}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Actioned</span> — something was done about this
                (use the links above to act on the member or the group).
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="outcome"
                value="dismissed"
                checked={outcome === 'dismissed'}
                onChange={() => setOutcome('dismissed')}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Dismissed</span> — no action needed.
              </span>
            </label>
          </fieldset>
          <label className="block text-sm text-gray-700">
            Internal note (optional)
            <textarea
              aria-label="Internal note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </label>
          <p className="text-sm text-gray-600">
            The reporter will be told the outcome — not your name, and not this note.
          </p>
          <button
            type="button"
            disabled={!outcome || busy}
            onClick={() => void resolve()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {busy ? 'Resolving…' : 'Resolve report'}
          </button>
        </section>
      ) : (
        <section
          data-testid="report-provenance"
          className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <p className="text-sm text-gray-800">
            Resolved <span className="font-medium">{report.resolution_kind ?? '—'}</span> by{' '}
            <span className="font-medium">{report.resolved_by_display_name ?? '—'}</span>
            {report.resolved_at && <> on {new Date(report.resolved_at).toLocaleString()}</>}
          </p>
          {report.resolution_note && (
            <p className="text-sm text-gray-600">{report.resolution_note}</p>
          )}
        </section>
      )}
    </main>
  );
}
