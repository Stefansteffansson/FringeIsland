'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { DataExportPanel } from '@/components/account/DataExportPanel';

/**
 * FEAT-H010 — the /export surface (IDN-8). The member requests + receives a
 * complete copy of their own data as a file. Gated on FIM identity, matching
 * FEAT-H005/H006/H008: a sessionless visitor is sent to sign-in (preserving the
 * destination); a Mist is ephemeral and has nothing to export, so it is sent to
 * the entry — the surface is never mounted for a non-FIM (STORY-3). Read-only —
 * it exports, it never deletes (erasure is the later IDN-10 seam).
 * 'use client' — it reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export default function ExportPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/export');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router]);

  return (
    <AppShell title="Download my data">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Download my data</h1>
      <p className="mb-8 text-sm text-gray-600">
        Get a copy of your own FringeIsland data.
      </p>
      {authLoading || identity !== 'fim' ? (
        <LoadingState label="Loading..." />
      ) : (
        <DataExportPanel />
      )}
    </AppShell>
  );
}
