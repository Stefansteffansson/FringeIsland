'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConsentState } from '@/lib/consent/client';
import type { ConsentState } from '@/lib/consent/queries';
import { ConsentView } from '@/components/consent/ConsentView';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H008 — the consent surface container (IDN-6). Owns the API-first fetch of
 * the caller's own consent (the paired FEAT-PC006 contract at
 * `/api/account/consent`) and the loading/error lifecycle, then renders the pure
 * read-only `ConsentView`. A failed read is surfaced with a retry (never a silent
 * blank); V4 telemetry records the view + read failures. The grant/withdraw
 * controls (FEAT-H009) mount onto this surface later.
 */
export function ConsentPanel() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

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

  return <ConsentView loading={loading} error={error} state={state} onRetry={reload} />;
}
