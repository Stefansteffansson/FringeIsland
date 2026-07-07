'use client';

import { useEffect, useState } from 'react';

/**
 * Deferred skeleton grid (ADR-U043 B6): under ~300 ms nothing shows; from
 * there a pulsing card grid — never a spinner-first screen for a 1–3 s wait.
 * The delay idiom mirrors `LoadingState` (the deferred 300 ms primitive);
 * `delay={0}` opts out for tests or instant-skeleton contexts.
 */
export function SkeletonGrid({ cards = 6, delay = 300 }: { cards?: number; delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      data-testid="skeleton-grid"
      role="status"
      aria-label="Loading"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="h-5 w-2/3 rounded bg-gray-200" />
          <div className="mt-3 h-4 w-full rounded bg-gray-100" />
          <div className="mt-2 h-4 w-5/6 rounded bg-gray-100" />
          <div className="mt-4 h-3 w-1/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
