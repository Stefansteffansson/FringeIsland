'use client';

import { useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DeleteAccountCeremony } from '@/components/account/DeleteAccountCeremony';
import { useAccountState } from '@/lib/account/AccountStateContext';
import { requestPause } from '@/lib/account/lifecycleClient';

/**
 * FEAT-H029 — the account-area lifecycle section (IDN-10, C-F). Hosted on the
 * profile page alongside the H006/H010/H012 neighbourhood. Two affordances,
 * deliberately unequal in weight:
 *   - Pause: gentle — ConfirmModal, then the FEAT-PC017 pause contract; on
 *     success the re-read state flips to 'paused' and the H006 gate swaps the
 *     whole experience to the paused surface (with FEAT-H007's return path).
 *   - Delete: heavy — opens the DeleteAccountCeremony (consequence summary,
 *     export offer, type-to-confirm). Never pre-selected, never streamlined.
 * Renders for an ACTIVE account only (STORY-4): a suspended member never sees
 * these (H006's surface holds them); the gating switches on the open `state`
 * label, and the platform refuses regardless (defense-in-depth, ADR-U038).
 */
export function AccountLifecycleSection() {
  const { state, reload } = useAccountState();
  const [pauseConfirming, setPauseConfirming] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [ceremonyOpen, setCeremonyOpen] = useState(false);

  // Affordances know their place (STORY-4): active accounts only. A missing
  // state (read still in flight) also renders nothing — no flash of
  // destructive controls before the truth arrives.
  if (state?.state !== 'active') return null;

  const pause = async () => {
    setPauseBusy(true);
    setPauseError(null);
    try {
      await requestPause();
      // Re-read the truth (FEAT-PC004); the gate takes it from here.
      await reload();
      setPauseConfirming(false);
    } catch (err) {
      setPauseError((err as Error).message);
      setPauseConfirming(false);
    } finally {
      setPauseBusy(false);
    }
  };

  return (
    <section
      data-testid="account-lifecycle-section"
      aria-label="Account lifecycle"
      className="mt-8 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900">Stepping away</h2>
      <p className="mt-1 text-sm text-gray-600">
        Pause your account to take a break — everything stays where you left it, and only you can
        turn it back on. Or delete your account for good.
      </p>

      {pauseError && (
        <p role="alert" data-testid="pause-error" className="mt-3 text-sm text-red-600">
          {pauseError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="pause-account"
          onClick={() => setPauseConfirming(true)}
          disabled={pauseBusy}
          className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {pauseBusy ? 'Pausing…' : 'Pause my account'}
        </button>
        {!ceremonyOpen && (
          <button
            type="button"
            data-testid="open-delete-ceremony"
            onClick={() => setCeremonyOpen(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Delete my account…
          </button>
        )}
      </div>

      {ceremonyOpen && <DeleteAccountCeremony onCancel={() => setCeremonyOpen(false)} />}

      <ConfirmModal
        isOpen={pauseConfirming}
        title="Pause your account?"
        message="Your account goes quiet: nothing is lost, nobody loses what you shared, and you can return whenever you choose — only you can reactivate it."
        confirmText="Pause my account"
        variant="warning"
        onConfirm={pause}
        onCancel={() => setPauseConfirming(false)}
        busy={pauseBusy}
      />
    </section>
  );
}
