'use client';

import { useEffect, useState } from 'react';

/**
 * Design-system primitive — loading state. UI convention: never present a
 * frozen UI; always show a loading state while data is in flight — but DEFER
 * the indicator (UX revision 2026-07-02): a spinner flashed for a fast
 * response draws the eye to the wait and makes the surface feel slower than
 * showing nothing (the delayed-spinner pattern; sub-second waits read faster
 * without an indicator). Nothing renders for the first `delay` ms (default
 * 300 — waits under the threshold complete spinner-free), then the spinner
 * fades in (see `hub-loading-fade-in` in globals.css) so a near-threshold
 * response reads as a soft blip, not a flash. `delay={0}` opts out for
 * contexts that need instant feedback. Action affordances (buttons, modals)
 * keep their own IMMEDIATE busy states — the deferral is for page/data loads.
 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent ${className}`}
    />
  );
}

export function LoadingState({ label = 'Loading...', delay = 300 }: { label?: string; delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      data-testid="loading-state"
      role="status"
      aria-live="polite"
      className="hub-loading-fade-in flex flex-col items-center justify-center py-12 text-center"
    >
      <Spinner />
      <p className="mt-4 text-gray-600">{label}</p>
    </div>
  );
}
