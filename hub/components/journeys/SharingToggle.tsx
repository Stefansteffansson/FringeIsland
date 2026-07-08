'use client';

import { useState } from 'react';
import { setProgressSharing } from '@/lib/journeys/player';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H022 STORY-2 (JRN-17, traveller side) — the progress-sharing control on a
 * via-group walk. It boots from the player payload's `progress_sharing` (no extra
 * read), states EXACTLY what sharing exposes (step completion marks only — never
 * times, never anything written) with the revocation fact, and flips
 * OPTIMISTICALLY (B5): the paint is immediate, the write rides the BFF in the
 * background, and a failure rolls the flip back with a non-blocking retry. Every
 * flip emits telemetry. Consent is the traveller's own act (invariant 4).
 */
export function SharingToggle({
  enrollmentId,
  initialSharing,
}: {
  enrollmentId: string;
  initialSharing: boolean;
}) {
  const [sharing, setSharing] = useState(initialSharing);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const flip = async () => {
    const next = !sharing;
    setSharing(next); // optimistic paint (B5) — ≤ 200 ms, write in the background
    setBusy(true);
    setFailed(false);
    emitTelemetry('player.sharing_flipped', { enrollment: enrollmentId, sharing: next });
    try {
      await setProgressSharing(enrollmentId, next);
    } catch {
      setSharing(!next); // roll back to the pre-flip state
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
