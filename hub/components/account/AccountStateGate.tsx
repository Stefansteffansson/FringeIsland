'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
 *
 * FEAT-H038 STORY-2 (W-10): the suspended wall's exit is explicit — sign out,
 * then LAND on /login (the AccountMenu sign-out-then-navigate idiom), so the
 * member is never parked signed-out on the wall's URL.
 */
export function AccountStateGate({ children }: { children: ReactNode }) {
  const { identity, signOut } = useAuth();
  const { state, loading, error, reload } = useAccountState();
  const router = useRouter();

  async function signOutToLogin() {
    // Navigate first (optimistic — usually lands before the guard), end the
    // session, then replace to make the landing deterministic even if a
    // protected-surface guard raced the auth flip (the AccountMenu.tsx idiom).
    router.push('/login');
    await signOut();
    router.replace('/login');
  }

  return (
    <AccountStateView
      identity={identity}
      loading={loading}
      error={error}
      state={state}
      onRetry={reload}
      onSignOut={signOut}
      onWallExit={signOutToLogin}
    >
      {children}
    </AccountStateView>
  );
}
