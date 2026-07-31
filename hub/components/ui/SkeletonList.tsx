'use client';

import { useEffect, useState } from 'react';

/**
 * Deferred skeleton list (ADR-U043 B6): the stacked-entries sibling of
 * `SkeletonGrid` — under ~300 ms nothing shows; from there pulsing entry
 * rows — never a spinner-first screen for a 1–3 s wait. `delay={0}` opts
 * out for tests or instant-skeleton contexts.
 */
export function SkeletonList({ rows = 3, delay = 300 }: { rows?: number; delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  return (
    <div data-testid="skeleton-list" role="status" aria-label="Loading" className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-edge-faint bg-surface p-4 shadow-sm"
        >
          <div className="h-5 w-1/3 rounded bg-skeleton" />
          <div className="mt-3 h-4 w-full rounded bg-skeleton-soft" />
          <div className="mt-2 h-4 w-5/6 rounded bg-skeleton-soft" />
          <div className="mt-4 h-3 w-1/4 rounded bg-skeleton-soft" />
        </div>
      ))}
    </div>
  );
}
