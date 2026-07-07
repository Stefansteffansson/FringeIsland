'use client';

import { useEffect, useState } from 'react';

/**
 * FEAT-H020 B6 (ADR-U043) — the deferred player skeleton. Under ~300 ms nothing
 * shows; from there a pulsing canvas + rail — never a spinner-first screen for a
 * 1-3 s boot. The deferral idiom mirrors `SkeletonGrid` / `LoadingState` (the
 * house 300 ms primitive); `delay={0}` opts out for tests or instant contexts.
 */
export function PlayerSkeleton({ delay = 300 }: { delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      data-testid="player-skeleton"
      role="status"
      aria-label="Loading the player"
      className="grid gap-6 lg:grid-cols-[2fr_1fr]"
    >
      {/* Canvas */}
      <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-2/3 rounded bg-gray-200" />
        <div className="mt-4 h-4 w-full rounded bg-gray-100" />
        <div className="mt-2 h-4 w-5/6 rounded bg-gray-100" />
        <div className="mt-2 h-4 w-4/6 rounded bg-gray-100" />
        <div className="mt-6 h-9 w-28 rounded bg-gray-100" />
      </div>
      {/* Rail */}
      <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="mb-3 h-4 w-full rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
