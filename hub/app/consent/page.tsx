'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConsentPanel } from '@/components/consent/ConsentPanel';

/**
 * FEAT-H008 — the /consent surface (IDN-6). The member's own consent record:
 * effective decisions + full history, read-only (grant/withdraw is FEAT-H009).
 * Gated on FIM identity, matching FEAT-H005/H006: a sessionless visitor is sent
 * to sign-in (preserving the destination); a Mist has no consent record and is
 * sent to the entry — so the surface is never mounted for a non-FIM (STORY-5).
 * 'use client' — it reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export default function ConsentPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/consent');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router]);

  return (
    <AppShell title="Privacy & consent">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy &amp; consent</h1>
      <p className="mb-8 text-sm text-gray-600">
        See what you have consented to and your full consent history.
      </p>
      {authLoading || identity !== 'fim' ? (
        <LoadingState label="Loading your consent..." />
      ) : (
        <ConsentPanel />
      )}
    </AppShell>
  );
}
