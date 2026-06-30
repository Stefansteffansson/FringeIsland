'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConsentState, postConsentDecision } from '@/lib/consent/client';
import type { ConsentState } from '@/lib/consent/queries';
import { ConsentView } from '@/components/consent/ConsentView';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineError } from '@/components/ui/InlineError';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H008 + FEAT-H009 — the consent surface container (IDN-6 read + IDN-7
 * grant/withdraw). Owns the API-first fetch (FEAT-PC006) + the decision-change
 * flow (FEAT-PC007): a withdrawable purpose's control opens a ConfirmModal (never
 * a browser dialog — Hub convention); on confirm it POSTs and then RE-READS
 * effective state (the single source of truth — never an optimistic local flip),
 * updating all rows together. A failure surfaces a clear error and leaves the
 * decision visibly as it was. V4 telemetry records views + change outcomes.
 */
type Pending = { purpose: string; label: string; nextDecision: string };

export function ConsentPanel() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // FEAT-H009 change-flow state.
  const [pending, setPending] = useState<Pending | null>(null);
  const [busyPurpose, setBusyPurpose] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const resolved = await fetchConsentState();
        if (!active) return;
        setState(resolved);
        emitTelemetry('consent.viewed', {
          purposes: resolved.effective.length,
          events: resolved.history.length,
        });
      } catch (err) {
        if (!active) return;
        setState(null);
        setError('We could not load your consent. Please try again.');
        emitTelemetry('consent.view_failed', { message: (err as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [nonce]);

  // A control was chosen — open the confirmation (no call yet).
  const requestChange = useCallback(
    (purpose: string, nextDecision: string) => {
      const entry = state?.effective.find((e) => e.purpose === purpose);
      if (!entry) return;
      setActionError(null);
      setPending({ purpose, label: entry.label, nextDecision });
    },
    [state],
  );

  // Confirmed — POST, then re-read effective state (single source of truth).
  async function confirmChange() {
    if (!pending) return;
    const { purpose, nextDecision } = pending;
    setBusyPurpose(purpose);
    setActionError(null);
    try {
      await postConsentDecision(purpose, nextDecision);
      // Re-resolve from the authoritative read — never hand-roll the new state.
      const resolved = await fetchConsentState();
      setState(resolved);
      emitTelemetry('consent.changed', { purpose, decision: nextDecision, outcome: 'success' });
      setPending(null);
    } catch (err) {
      // No optimistic flip — the decision visibly stays as it was.
      setActionError((err as Error).message || 'We could not save your change. Please try again.');
      emitTelemetry('consent.changed', { purpose, decision: nextDecision, outcome: 'failed' });
      setPending(null);
    } finally {
      setBusyPurpose(null);
    }
  }

  const isWithdrawal = pending?.nextDecision !== 'granted';

  return (
    <div className="space-y-4">
      {actionError && (
        <div data-testid="consent-action-error">
          <InlineError message={actionError} />
        </div>
      )}

      <ConsentView
        loading={loading}
        error={error}
        state={state}
        onRetry={reload}
        onRequestChange={requestChange}
        busyPurpose={busyPurpose}
      />

      <ConfirmModal
        isOpen={pending !== null}
        variant={isWithdrawal ? 'warning' : 'info'}
        title={isWithdrawal ? 'Withdraw consent?' : 'Grant consent?'}
        message={
          pending
            ? isWithdrawal
              ? `You're about to withdraw "${pending.label}". You can grant this again later.`
              : `You're about to grant "${pending.label}". This lets us use it as described.`
            : ''
        }
        confirmText={isWithdrawal ? 'Yes, withdraw' : 'Yes, grant'}
        cancelText="Cancel"
        busy={busyPurpose !== null}
        onConfirm={confirmChange}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
