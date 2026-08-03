'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchAccountState } from '@/lib/account/client';
import type { AccountState } from '@/lib/account/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H006 — account-state resolution (IDN-9). Resolves the caller's own account
 * lifecycle state via the paired FEAT-PC004 contract (`/api/account/state`) and
 * shares it so navigating between Hub surfaces does not re-fetch per page. Only a
 * FIM has a durable account-lifecycle state — a Mist/sessionless identity passes
 * through with no state. Failures are surfaced (never swallowed); V4 telemetry
 * records the rendered state and read failures (Hub products-tier observability).
 *
 * FEAT-H038 STORY-4 (W-7): the session LEARNS of suspension. A throttled
 * (≥30 s) background revalidation runs on soft-nav (pathname change) and on
 * focus/visibility return, and `requestAccountStateRecheck()` lets a mapped
 * 401/403 refusal demand the truth immediately. Background checks are
 * stale-while-revalidate: they never flip `loading` and never block navigation
 * — the wall renders only on a CONFIRMED off-state (the AccountStateView
 * optimistic-render revision stands).
 */
type AccountStateValue = {
  state: AccountState | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const AccountStateContext = createContext<AccountStateValue | undefined>(undefined);

const RECHECK_THROTTLE_MS = 30_000;

// Module-scope so non-component callers (BFF client mappers) can request a
// re-check without a fetch-wrapper refactor (the named rabbit hole).
const recheckHandlers = new Set<() => void>();

/**
 * FEAT-H038 STORY-4 (W-7): fire the account-state re-check now — wired at write
 * paths whose mapped refusal (401/403) suggests the session's state is stale.
 * Bypasses the throttle (an explicit signal beats a cadence); a no-op when no
 * provider is mounted or the session has no durable state (Mist/sessionless).
 */
export function requestAccountStateRecheck(): void {
  for (const handler of recheckHandlers) handler();
}

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const { identity, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Refs so the background revalidator reads current values without
  // re-subscribing listeners every render.
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const stateRef = useRef<AccountState | null>(null);
  stateRef.current = state;
  const lastCheckRef = useRef(0);
  const inFlightRef = useRef(false);

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
        lastCheckRef.current = Date.now();
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

  // W-7: the background revalidator — stale-while-revalidate, never touches
  // `loading`/`error` (no flash, no blocked navigation). A failed background
  // check keeps the last confirmed state; the wall renders on confirmed
  // off-state only.
  const revalidate = useCallback(async (force = false) => {
    if (identityRef.current !== 'fim') return;
    const now = Date.now();
    if (!force && now - lastCheckRef.current < RECHECK_THROTTLE_MS) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    lastCheckRef.current = now;
    try {
      const resolved = await fetchAccountState();
      if (stateRef.current?.state !== resolved.state) {
        emitTelemetry('account.state_rendered', { state: resolved.state });
      }
      setState(resolved);
    } catch {
      // Background check: keep the last confirmed state, stay silent — the
      // boot path and manual reload() own visible failure surfacing.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Focus / visibility return + the exported refusal-triggered re-check.
  useEffect(() => {
    if (identity !== 'fim') return;
    const onFocus = () => void revalidate();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void revalidate();
    };
    const onDemand = () => void revalidate(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    recheckHandlers.add(onDemand);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      recheckHandlers.delete(onDemand);
    };
  }, [identity, revalidate]);

  // Soft-nav: a pathname change is a moment the member expects fresh truth.
  // Skip the mount pathname — the boot read owns first resolution.
  const navSeenRef = useRef(false);
  useEffect(() => {
    if (!navSeenRef.current) {
      navSeenRef.current = true;
      return;
    }
    void revalidate();
  }, [pathname, revalidate]);

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
