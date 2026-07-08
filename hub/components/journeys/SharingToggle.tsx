'use client';

import { useState } from 'react';
import { setProgressSharing } from '@/lib/journeys/player';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H022 STORY-2 (JRN-17, traveller side) — the progress-sharing control on a
 * via-group walk. PROP-DRIVEN, never latched (the stale-toggle fix, 2026-07-08):
 * the display follows the page's player state — which the boot's background
 * revalidation keeps true — except while this mount holds a fresher fact (an
 * optimistic flip in flight, or the last server-confirmed value). It states
 * EXACTLY what sharing exposes (step completion marks only — never times, never
 * anything written) with the revocation fact, and flips OPTIMISTICALLY (B5):
 * paint immediate, write in the background, a failure rolls back to the page's
 * truth with a non-blocking retry. Every flip emits telemetry. Consent is the
 * traveller's own act (invariant 4).
 */
export function SharingToggle({
  enrollmentId,
  sharing: sharingProp,
}: {
  enrollmentId: string;
  sharing: boolean;
}) {
  // null = no local fact — the page's truth renders. Set optimistically on flip,
  // then to the server-confirmed value; cleared on failure (back to the prop).
  const [override, setOverride] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const sharing = override ?? sharingProp;

  const flip = async () => {
    const next = !sharing;
    setOverride(next); // optimistic paint (B5) — ≤ 200 ms, write in the background
    setBusy(true);
    setFailed(false);
    emitTelemetry('player.sharing_flipped', { enrollment: enrollmentId, sharing: next });
    try {
      const confirmed = await setProgressSharing(enrollmentId, next);
      setOverride(confirmed.sharing); // last-confirmed wins for this mount
    } catch {
      setOverride(null); // roll back to the page's truth
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      data-testid="sharing-toggle"
      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
    >
      <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          data-testid="sharing-checkbox"
          checked={sharing}
          disabled={busy}
          onChange={() => void flip()}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Share my progress with my group leads
      </label>
      <p className="mt-2 text-xs text-gray-500">
        Your Stewards and Guides see your step completion marks for this walk — never your
        times, and never anything you write. You can turn this off at any time.
      </p>

      {failed && (
        <div
          data-testid="sharing-error"
          role="status"
          className="mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
        >
          <span>That didn&rsquo;t save.</span>
          <button
            type="button"
            data-testid="sharing-retry"
            onClick={() => void flip()}
            className="font-medium text-amber-800 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
