'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountStateSurface } from '@/components/account/AccountStateSurface';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAccountState } from '@/lib/account/AccountStateContext';
import { fetchRestoreState, requestRestore, type RestoreState } from '@/lib/account/lifecycleClient';
import { invalidateAllCaches } from '@/lib/auth/cache-registry';

/**
 * TASK-IDN-01 — the decommissioned surface learns the grace window. Hosted by
 * FEAT-H006's gate for `state='decommissioned'`.
 *
 * The old single terminal card ("permanently closed — can't be reopened") is
 * conditionally FALSE under the grace ruling: a member-origin deletion inside
 * its window CAN be restored. This surface probes `get_own_restore_state`
 * through the BFF (origin logic and window arithmetic stay platform-side,
 * ADR-U038) and renders what the substrate answers:
 *   - restorable      → the restore door, naming the scheduled deletion date;
 *                       the exit reads "Sign out" (the account still exists —
 *                       the terminal label would lie here)
 *   - not restorable  → the terminal closed card, byte-for-byte the old copy
 *   - probe pending   → a quiet loading card (house rule: never a frozen or
 *                       premature claim)
 *   - probe failed    → the closed card WITH a retry — never a fake door,
 *                       never a trapped member
 *
 * Restore flow mirrors PausedAccountSurface: ConfirmModal (never a browser
 * dialog) → the contract via the BFF → drop every registered session cache
 * (the decommission→active flip is a cache boundary, the RIDER-4 lesson) →
 * re-read account state → land on /groups. Failure keeps the member here with
 * the honest reason.
 */
export function DecommissionedAccountSurface({ onSignOut }: { onSignOut: () => void }) {
  const router = useRouter();
  const { reload } = useAccountState();
  const [probe, setProbe] = useState<{ status: 'loading' | 'done' | 'failed'; state?: RestoreState }>(
    { status: 'loading' },
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runProbe = useCallback(() => {
    setProbe({ status: 'loading' });
    fetchRestoreState()
      .then((state) => setProbe({ status: 'done', state }))
      .catch(() => setProbe({ status: 'failed' }));
  }, []);

  useEffect(() => {
    runProbe();
  }, [runProbe]);

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestRestore();
      // The decommission→active flip is a CACHE BOUNDARY (the RIDER-4
      // lesson): any slice adopted under the wall would replay a stale
      // refusal on the restored landing. Drop everything, then re-resolve.
      invalidateAllCaches();
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

  if (probe.status === 'loading') {
    return (
      <AccountStateSurface
        testId="account-restore-probe-loading"
        title="One moment"
        message="Checking this account's status…"
      />
    );
  }

  if (probe.status === 'done' && probe.state?.restorable) {
    const scheduled = probe.state.scheduled_deletion_at;
    const dateText = scheduled
      ? new Date(scheduled).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;
    return (
      <>
        <AccountStateSurface
          testId="account-restorable-surface"
          title="Your account is scheduled for deletion"
          message={
            dateText
              ? `You deleted this account. It will be permanently deleted on ${dateText} — until then, you can restore it. Your name and profile come back; the groups you left and anything erased stay as they are.`
              : 'You deleted this account. It is scheduled for permanent deletion — until then, you can restore it. Your name and profile come back; the groups you left and anything erased stay as they are.'
          }
          onSignOut={onSignOut}
        >
          <div className="mt-4">
            {error && (
              <p role="alert" data-testid="restore-error" className="mb-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="button"
              data-testid="restore-account"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Restoring…' : 'Restore my account'}
            </button>
          </div>
        </AccountStateSurface>
        <ConfirmModal
          isOpen={confirming}
          title="Restore your account?"
          message="Your account returns to active with your name and profile. The groups you left and anything erased when you deleted stay as they are."
          confirmText="Restore"
          onConfirm={restore}
          onCancel={() => setConfirming(false)}
          busy={busy}
        />
      </>
    );
  }

  // Not restorable (past the window, admin-origin, or any probe failure): the
  // terminal card — the pre-IDN-01 copy, still true of exactly these cases.
  return (
    <AccountStateSurface
      testId="account-closed-surface"
      title="This account is closed"
      message="This account has been permanently closed. It can't be reopened."
      onSignOut={onSignOut}
      signOutLabel="Return to the front page"
      onRetry={probe.status === 'failed' ? runProbe : undefined}
    />
  );
}
