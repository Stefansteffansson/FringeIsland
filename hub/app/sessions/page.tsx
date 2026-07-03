'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { SessionsPanel } from '@/components/sessions/SessionsPanel';

/**
 * FEAT-H012 — the /sessions surface (IDN-11). Every device the FIM is signed
 * in on, with targeted remote sign-out (enforcement is substrate-side,
 * FEAT-PC009). Gated on FIM identity, matching /journal: a sessionless visitor
 * is sent to sign-in (destination preserved); a Mist is sent to the entry —
 * Mist sessions are unlinkable across devices by design, so there is nothing
 * coherent to list. A SUSPENDED FIM still gets the page: session control is
 * security-protective and the PC009 contracts deliberately survive suspension.
 * 'use client' — it reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export default function SessionsPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/sessions');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router]);

  return (
    <AppShell title="Sessions">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Where you&apos;re signed in</h1>
      <p className="mb-8 text-sm text-gray-600">
        Every device with an active session on your account. Sign out any you don&apos;t
        recognise or no longer use.
      </p>
      {authLoading || identity !== 'fim' ? (
        <LoadingState label="Loading your sessions..." />
      ) : (
        <SessionsPanel />
      )}
    </AppShell>
  );
}
