'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchAccountState } from '@/lib/account/client';
import type { AccountState } from '@/lib/account/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H006 — account-state resolution (IDN-9). Resolves the caller's own account
 * lifecycle state ONCE per session via the paired FEAT-PC004 contract
 * (`/api/account/state`), and shares it so navigating between Hub surfaces does
 * not re-fetch (no per-page flash). Only a FIM has a durable account-lifecycle
 * state — a Mist/sessionless identity passes through with no state. Failures are
 * surfaced (never swallowed); V4 telemetry records the rendered state and read
 * failures (Hub products-tier observability).
 */
type AccountStateValue = {
  state: AccountState | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const AccountStateContext = createContext<AccountStateValue | undefined>(undefined);

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const { identity, loading: authLoading } = useAuth();
  const [state, setState] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    // Mist/sessionless: no durable account-lifecycle state — pass through.
    if (identity !== 'fim') {
      setState(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const resolved = await fetchAccountState();
        if (!active) return;
        setState(resolved);
        emitTelemetry('account.state_rendered', { state: resolved.state });
      } catch (err) {
        if (!active) return;
        setState(null);
        setError('We could not load your account status.');
        emitTelemetry('account.state_render_failed', { message: (err as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [identity, authLoading, nonce]);

  return (
    <AccountStateContext.Provider value={{ state, loading, error, reload }}>
      {children}
    </AccountStateContext.Provider>
  );
}

const DEFAULT_ACCOUNT_STATE: AccountStateValue = {
  state: null,
  loading: false,
  error: null,
  reload: () => {},
};

/**
 * Reads the resolved account state. Outside an `AccountStateProvider` (a
 * component rendered in isolation, or before the provider mounts) it degrades to
 * a transparent default — `loading: false`, `state: null` — so the gate passes
 * through to the normal experience rather than throwing. The provider is always
 * present in the root layout in the running app.
 */
export function useAccountState(): AccountStateValue {
  return useContext(AccountStateContext) ?? DEFAULT_ACCOUNT_STATE;
}
