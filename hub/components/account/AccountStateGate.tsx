'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAccountState } from '@/lib/account/AccountStateContext';
import { AccountStateView } from '@/components/account/AccountStateView';

/**
 * FEAT-H006 — the account-state gate (IDN-9). Wraps the authenticated Hub chrome:
 * for an active FIM (and any non-FIM) it renders the normal experience; for a
 * suspended / decommissioned / unknown-state FIM it renders the honest standalone
 * surface INSTEAD of the chrome (so a switched-off member never hits the
 * profile-dependent account menu). Reads the once-resolved state from the
 * provider; the affordances (retry / sign-out) are wired from the auth context.
 */
export function AccountStateGate({ children }: { children: ReactNode }) {
  const { identity, signOut } = useAuth();
  const { state, loading, error, reload } = useAccountState();

  return (
    <AccountStateView
      identity={identity}
      loading={loading}
      error={error}
      state={state}
      onRetry={reload}
      onSignOut={signOut}
    >
      {children}
    </AccountStateView>
  );
}
