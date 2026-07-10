'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { SkeletonList } from '@/components/ui/SkeletonList';
import { JournalPanel } from '@/components/journal/JournalPanel';

/**
 * FEAT-H011 — the /journal surface (IDN-5). A FIM's private journal: write,
 * read, edit, delete — nothing else, and nobody else (enforcement is
 * substrate-side, FEAT-PD001). Gated on FIM identity, matching FEAT-H008: a
 * sessionless visitor is sent to sign-in (destination preserved); a Mist is
 * sent to the entry — journaling is FIM life (ADR-U031 keeps Mist ephemerality
 * out of v1), so the surface never mounts for a non-FIM (STORY-4).
 * 'use client' — it reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export default function JournalPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/journal');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router]);

  return (
    <AppShell title="Journal">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Journal</h1>
      <p className="mb-8 text-sm text-gray-600">
        A private place to reflect. Only you can read what you write here.
      </p>
      {authLoading || identity !== 'fim' ? (
        <SkeletonList /> // deferred skeleton, never a spinner (B6)
      ) : (
        <JournalPanel />
      )}
    </AppShell>
  );
}
