'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * The minimal-but-real Mist-presence landing (FEAT-H003 STORY-2) — where "Look
 * around" lands. Identity-level only: a real beginning + the become-a-FIM CTA.
 * NOT a fake placeholder, and NOT the pre-designed near-side town (fundamentals
 * before experience design). Gated by status, never a role string (STORY-3): a
 * FIM has no Mist chrome and is sent on; a sessionless visitor returns to the
 * entry. Continuity (STORY-4) is framed as the FIM reward, not promised here.
 */
export default function MistPresencePage() {
  const { identity, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Status-driven gating: only a Mist belongs on this surface.
    if (identity === 'fim') router.replace('/groups');
    else if (identity === 'sessionless') router.replace('/');
  }, [identity, loading, router]);

  if (loading || identity !== 'mist') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingState label="Finding your footing..." />
      </main>
    );
  }

  return (
    <AppShell title="FringeIsland">
      <div
        data-testid="mist-presence"
        className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm"
      >
        <h1 className="mb-3 text-3xl font-bold text-gray-900">You&rsquo;re here as a Mist</h1>
        <p className="mb-2 text-gray-600">
          This is your beginning. You can look around freely — you arrived without an account, and
          you owe nothing to be here.
        </p>
        <p className="mb-8 text-sm text-gray-500">
          A Mist&rsquo;s presence isn&rsquo;t kept between visits. Want FringeIsland to remember your
          path? That lasting memory is what becoming a FIM gives you.
        </p>
        <Link
          href="/signup"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Become a FIM to keep your journey
        </Link>
      </div>
    </AppShell>
  );
}
