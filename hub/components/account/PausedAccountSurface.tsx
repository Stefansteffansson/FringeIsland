'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountStateSurface } from '@/components/account/AccountStateSurface';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAccountState } from '@/lib/account/AccountStateContext';
import { requestReactivate } from '@/lib/account/lifecycleClient';

/**
 * FEAT-H007 — the paused-account surface with the reactivation affordance
 * (IDN-12, built at C-F). Hosted by FEAT-H006's gate: after the ADR-U050
 * origin split, `state='paused'` is only ever member-origin, so this surface's
 * presence IS the legitimacy gate — and the platform's origin gate
 * (FEAT-PC005 STORY-6) enforces regardless.
 *
 * Flow: Reactivate → ConfirmModal (never a browser dialog) → the FEAT-PC005
 * contract via the BFF → on success re-read account state (FEAT-PC004, the
 * single source of truth — STORY-5) and land on groups/home. Failure keeps the
 * member here with an honest error + retry (STORY-4) — never a false success.
 */
export function PausedAccountSurface({ onSignOut }: { onSignOut: () => void }) {
  const router = useRouter();
  const { reload } = useAccountState();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reactivate = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestReactivate();
      // Re-resolve state from the contract — the gate flips back to the
      // active experience; land the member on their groups/home (STORY-5).
      await reload();
      setConfirming(false);
      router.push('/groups');
    } catch (err) {
      setError((err as Error).message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AccountStateSurface
        testId="account-paused-surface"
        title="Your account is paused"
        message="You chose to step away. Nothing was lost — your groups, journeys, and words are all where you left them. Come back whenever you're ready."
        onSignOut={onSignOut}
      >
        <div className="mt-4">
          {error && (
            <p role="alert" data-testid="reactivate-error" className="mb-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            data-testid="reactivate-account"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Reactivating…' : 'Reactivate my account'}
          </button>
        </div>
      </AccountStateSurface>
      <ConfirmModal
        isOpen={confirming}
        title="Reactivate your account?"
        message="Your account will return to active and you'll pick up right where you left off."
        confirmText="Reactivate"
        onConfirm={reactivate}
        onCancel={() => setConfirming(false)}
        busy={busy}
      />
    </>
  );
}
