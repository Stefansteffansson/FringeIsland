'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AdminRolesPayload } from '@/lib/admin/roles';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H040 STORY-1 — /admin/roles: the template list + the read-only
 * permission catalogue, painted from ONE composed BFF read (B2/B3 justified
 * standalone read; ADR-U042 guardrail 3). The catalogue renders with ZERO
 * write affordances — atoms are code-owned (RB-4); the editor lives on the
 * template detail. As-of + Refresh per the H034 idiom.
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; payload: AdminRolesPayload };

export function AdminRolesView() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  // RD-A FEAT-H043 STORY-2: the retire ceremony's target and its outcome.
  const [ceremony, setCeremony] = useState<{
    template: AdminRolesPayload['templates'][number];
    // RD-C FEAT-H045 STORY-3: disposal joins the same ceremony door, because
    // it belongs where the disposed-of things are.
    verb: 'retire' | 'unretire' | 'delete';
  } | null>(null);
  const [ceremonyError, setCeremonyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // FEAT-H045 STORY-1: retired templates are one click away, never gone.
  const [retiredOpen, setRetiredOpen] = useState(false);
  /**
   * FEAT-H045 STORY-2: the delete happened on the detail page, which then sent
   * the admin here because the page they were standing on stopped describing
   * anything. The name travels in the URL — the row is gone, so there is
   * nothing left to look it up from.
   */
  const deletedName = useSearchParams()?.get('deleted') ?? null;

  const computeView = useCallback(async (): Promise<ViewState> => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return { kind: 'refused' };
      }
      if (!res.ok) {
        return { kind: 'error', message: 'The role templates could not be loaded.' };
      }
      const payload = (await res.json()) as AdminRolesPayload;
      return { kind: 'loaded', payload };
    } catch {
      return { kind: 'error', message: 'The role templates could not be loaded.' };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void computeView().then((next) => {
      if (!cancelled) setView(next);
    });
    return () => {
      cancelled = true;
    };
  }, [computeView]);

  const reload = () => {
    setView({ kind: 'loading' });
    void computeView().then(setView);
  };

  /**
   * RD-A FEAT-H043 STORY-2/3 — perform the ceremony, then repaint from a FRESH
   * read. Never a local mutation of the row: the list is server state, and the
   * template list any picker serves must be re-read rather than patched (W-9 —
   * no cache keyed by nothing). A refusal renders verbatim and changes nothing.
   */
  const confirmCeremony = async () => {
    if (!ceremony) return;
    setBusy(true);
    setCeremonyError(null);
    try {
      // Disposal is a different door on the same resource: DELETE the template
      // itself, not its retirement.
      const res =
        ceremony.verb === 'delete'
          ? await fetch(`/api/admin/roles/${ceremony.template.id}`, { method: 'DELETE' })
          : await fetch(`/api/admin/roles/${ceremony.template.id}/retire`, {
              method: ceremony.verb === 'retire' ? 'POST' : 'DELETE',
            });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        // Verbatim. A refusal here is the platform's own words (RD-C: the
        // publish-between-render-and-click race), never paraphrased.
        setCeremonyError(body.error ?? `The template could not be ${ceremony.verb}d.`);
        setCeremony(null);
        return;
      }
      setCeremony(null);
      const next = await computeView();
      setView(next);
    } catch {
      setCeremonyError(`The template could not be ${ceremony.verb}d.`);
      setCeremony(null);
    } finally {
      setBusy(false);
    }
  };

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
      <div role="status" aria-label="Loading role templates" className="space-y-2 p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="p-6">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{view.message}</p>
          <button
            onClick={reload}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-sm text-red-800"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { templates, catalog, generated_at } = view.payload;
  const categories = Array.from(new Set(catalog.map((p) => p.category)));

  /**
   * FEAT-H045 STORY-1 — the catalogue is a working surface, not an archive
   * (W-10). Retire already means "no longer offered"; the list was simply
   * failing to act on what it already knew. Both partitions come from the SAME
   * payload the rows come from, so the disclosure's count can never disagree
   * with what expanding it reveals.
   */
  const live = templates.filter((t) => t.retired_at === null);
  const retired = templates.filter((t) => t.retired_at !== null);

  /** ONE row renderer for both sections — a second one would drift. */
  const renderTemplateRow = (t: AdminRolesPayload['templates'][number]) => (
    <tr key={t.id} data-testid={`template-row-${t.id}`} className="border-t border-gray-100">
      <td className="py-2 pr-4">
        <span className="flex items-center gap-2">
          <Link href={`/admin/roles/${t.id}`} className="font-medium text-indigo-700">
            {t.name}
          </Link>
          {t.is_system && (
            <span
              data-testid={`seeded-badge-${t.id}`}
              className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700"
            >
              Seeded
            </span>
          )}
          {/* RD-A: a retired template stays listed, marked. Retirement is a
              state to see and reverse, never a disappearance. It now lives
              under the disclosure, so the badge marks it there. */}
          {t.retired_at && (
            <span
              data-testid={`retired-badge-${t.id}`}
              className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700"
            >
              Retired
            </span>
          )}
        </span>
        {t.description && <span className="block text-xs text-gray-500">{t.description}</span>}
      </td>
      <td className="py-2 pr-4">
        {t.default_version_number === null ? '—' : `v${t.default_version_number}`}
      </td>
      <td className="py-2 pr-4">
        {t.version_count} version{t.version_count === 1 ? '' : 's'}
      </td>
      <td className="py-2 pr-4 text-gray-600">
        {t.group_template_refs.length ? t.group_template_refs.join(', ') : '—'}
      </td>
      <td className="py-2">{t.instantiated_role_count}</td>
      <td className="py-2 pl-4 text-right">
        {/* The seeded four are the floor every group is built on — the contract
            refuses regardless, so no affordance renders. */}
        {!t.is_system &&
          (t.retired_at ? (
            <span className="inline-flex items-center gap-2">
              <button
                type="button"
                data-testid={`unretire-button-${t.id}`}
                onClick={() => setCeremony({ template: t, verb: 'unretire' })}
                className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Unretire
              </button>
              {/* RD-C FEAT-H045 STORY-3: disposal lives where the disposed-of
                  things are — reachable here without opening the detail first.
                  Offered ONLY on the server's `deletable`; where it is false we
                  say why in words, because a greyed-out control is still an
                  affordance for an impossible act. */}
              {t.deletable ? (
                <button
                  type="button"
                  data-testid={`delete-button-${t.id}`}
                  onClick={() => setCeremony({ template: t, verb: 'delete' })}
                  className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              ) : (
                t.undeletable_reason && (
                  <span
                    data-testid={`undeletable-reason-${t.id}`}
                    className="text-xs font-normal text-gray-500"
                  >
                    {t.undeletable_reason}
                  </span>
                )
              )}
            </span>
          ) : (
            <button
              type="button"
              data-testid={`retire-button-${t.id}`}
              onClick={() => setCeremony({ template: t, verb: 'retire' })}
              className="rounded border border-amber-200 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-50"
            >
              Retire
            </button>
          ))}
      </td>
    </tr>
  );

  const templateTable = (rows: AdminRolesPayload['templates'], testid: string) => (
    <table className="w-full text-sm" data-testid={testid}>
      <thead>
        <tr className="text-left text-xs text-gray-500">
          <th scope="col" className="py-1 pr-4 font-medium">
            Name
          </th>
          <th scope="col" className="py-1 pr-4 font-medium">
            Default
          </th>
          <th scope="col" className="py-1 pr-4 font-medium">
            Versions
          </th>
          <th scope="col" className="py-1 pr-4 font-medium">
            Carried by
          </th>
          <th scope="col" className="py-1 font-medium">
            Instantiated roles
          </th>
          <th scope="col" className="py-1 pl-4 text-right font-medium">
            Offer
          </th>
        </tr>
      </thead>
      <tbody>{rows.map(renderTemplateRow)}</tbody>
    </table>
  );

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Role templates</h1>
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <span data-testid="as-of">As of {new Date(generated_at).toLocaleString()}</span>
          <button onClick={reload} className="rounded border px-2 py-0.5 text-sm text-gray-700">
            Refresh
          </button>
        </span>
      </div>

      {deletedName && (
        <p
          data-testid="deleted-confirmation"
          role="status"
          className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          &ldquo;{deletedName}&rdquo; was deleted permanently. It is gone from the catalogue.
        </p>
      )}

      {ceremonyError && (
        <p role="alert" className="text-sm text-red-600">
          {ceremonyError}
        </p>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Templates</h2>

        {/* Every template retired is a real state, and it must SAY so. A region
            that renders as nothing is the W-3 defect one worse. */}
        {live.length === 0 ? (
          <p data-testid="templates-empty" className="text-sm text-gray-500">
            No templates are currently offered. Everything in the catalogue is retired — expand
            Retired below to offer one again.
          </p>
        ) : (
          templateTable(live, 'templates-table')
        )}

        {/* The disclosure is ABSENT when nothing is retired — a `Retired (0)`
            control is a permanent reminder of an empty drawer. */}
        {retired.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <button
              type="button"
              data-testid="retired-templates-toggle"
              aria-expanded={retiredOpen}
              onClick={() => setRetiredOpen((v) => !v)}
              className="text-sm font-medium text-indigo-700 hover:underline"
            >
              Retired ({retired.length})
            </button>

            {retiredOpen && (
              <div className="mt-3">
                <p data-testid="retired-templates-note" className="mb-2 text-xs text-gray-500">
                  These are not offered to any group. Copies already adopted are unaffected —
                  unretire puts a template back on offer.
                </p>
                {templateTable(retired, 'retired-templates-table')}
              </div>
            )}
          </div>
        )}
      </section>

      <section
        data-testid="catalogue-browser"
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-1 text-lg font-medium">Permission catalogue</h2>
        <p className="mb-3 text-sm text-gray-500">
          The platform&rsquo;s permission atoms — read-only. Protected permissions can never lose
          their last holder.
        </p>
        {categories.map((category) => (
          <div key={category} className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-700">{category}</h3>
            <ul className="space-y-1">
              {catalog
                .filter((p) => p.category === category)
                .map((p) => (
                  <li
                    key={p.name}
                    data-testid={`catalogue-row-${p.name}`}
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <span className="font-mono text-xs text-gray-900">{p.name}</span>
                    {p.is_protected && (
                      <span
                        data-testid={`protected-badge-${p.name}`}
                        className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800"
                      >
                        Protected
                      </span>
                    )}
                    {p.description && <span className="text-xs text-gray-500">{p.description}</span>}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      {/* RD-A FEAT-H043 STORY-2: the ceremony states the consequence
          ACCURATELY before the click — retiring stops the template being
          offered and changes nothing that already exists. The no-go is a copy
          that implies deletion or that adopted copies were disturbed. */}
      <ConfirmModal
        isOpen={ceremony !== null}
        title={
          ceremony?.verb === 'delete'
            ? 'Delete this template permanently'
            : ceremony?.verb === 'unretire'
              ? 'Offer this template again'
              : 'Stop offering this template'
        }
        message={ceremonyMessage(ceremony)}
        confirmText={
          ceremony?.verb === 'delete'
            ? 'Delete permanently'
            : ceremony?.verb === 'unretire'
              ? 'Unretire'
              : 'Retire'
        }
        variant={
          ceremony?.verb === 'delete'
            ? 'danger'
            : ceremony?.verb === 'unretire'
              ? 'info'
              : 'warning'
        }
        busy={busy}
        onConfirm={() => void confirmCeremony()}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
    </main>
  );
}

/**
 * The retire / unretire consequence copy. Retire is stated as what it is — an
 * end to being offered — and is explicit that nothing already adopted moves,
 * because that is the single thing an admin would otherwise fear (RD-2/RD-4).
 */
function ceremonyMessage(
  ceremony: {
    template: AdminRolesPayload['templates'][number];
    verb: 'retire' | 'unretire' | 'delete';
  } | null,
): string {
  if (!ceremony) return '';
  const { template, verb } = ceremony;
  // RD-C FEAT-H045 STORY-2/3: the irreversible one. Names the target, says it
  // is permanent, and says why that is safe — nobody was ever offered it.
  if (verb === 'delete') {
    return (
      `Delete "${template.name}" permanently? This cannot be undone. It was ` +
      `never offered to any group and has no copies anywhere, so nothing any ` +
      `member or group holds is affected — but the template itself, and its ` +
      `version history, are gone for good.`
    );
  }
  if (verb === 'unretire') {
    return (
      `Offer "${template.name}" again? It will reappear in the group-creation ` +
      `chooser and the add-from-template picker.`
    );
  }
  const adopted =
    template.instantiated_role_count > 0
      ? ` The ${template.instantiated_role_count} role${
          template.instantiated_role_count === 1 ? '' : 's'
        } already adopted from it stay exactly as they are.`
      : '';
  return (
    `Stop offering "${template.name}"? It will no longer appear in the ` +
    `group-creation chooser or the add-from-template picker. Existing copies ` +
    `in groups are unaffected — nothing is removed and no group changes.` +
    `${adopted} You can offer it again at any time.`
  );
}
