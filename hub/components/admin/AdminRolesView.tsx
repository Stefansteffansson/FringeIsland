'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminRolesPayload } from '@/lib/admin/roles';

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

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Templates</h2>
        <table className="w-full text-sm">
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
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr
                key={t.id}
                data-testid={`template-row-${t.id}`}
                className="border-t border-gray-100"
              >
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
                  </span>
                  {t.description && (
                    <span className="block text-xs text-gray-500">{t.description}</span>
                  )}
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
              </tr>
            ))}
          </tbody>
        </table>
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
    </main>
  );
}
