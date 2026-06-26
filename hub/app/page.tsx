'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * The public FringeIsland entry (FEAT-H003 STORY-1) — reachable with no session
 * and no rows. Identity-aware doors: a sessionless visitor gets Sign in / Sign up
 * / "Look around" (the deliberate enter-as-a-Mist act, STORY-2); a FIM gets a
 * continue affordance and NO Mist chrome (STORY-3, no regression); a Mist that
 * lands back here can keep going. Perceiving the shared near-side world is not
 * part of this sessionless tier — that begins at "Look around" (ADR-U031 stage 1).
 */
export default function EntryPage() {
  const { identity, loading, beginMist } = useAuth();
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookAround() {
    setEntering(true);
    setError(null);
    const { error: mistError } = await beginMist();
    if (mistError) {
      setError(mistError);
      setEntering(false);
      return;
    }
    // STORY-2 — land on the minimal-but-real Mist-presence state.
    router.push('/mist');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">FringeIsland</h1>
          <p className="text-gray-600">Who am I? What do I want? How do I get there?</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {loading ? (
            <LoadingState label="Getting your bearings..." />
          ) : identity === 'fim' ? (
            <div className="flex flex-col gap-4">
              <p className="text-gray-600">Welcome back.</p>
              <Link
                href="/groups"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Continue to your groups
              </Link>
            </div>
          ) : identity === 'mist' ? (
            <div className="flex flex-col gap-4">
              <p className="text-gray-600">You&rsquo;re here as a Mist.</p>
              <Link
                href="/mist"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Keep looking around
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && <InlineError message={error} />}
              <Button onClick={handleLookAround} disabled={entering} className="w-full">
                {entering ? 'Stepping in...' : 'Look around'}
              </Button>
              <p className="text-xs text-gray-500">
                No account needed. Looking around leaves no trace.
              </p>
              <div className="mt-2 flex items-center justify-center gap-4 text-sm">
                <Link href="/login" className="text-indigo-600 hover:underline">
                  Sign in
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/signup" className="text-indigo-600 hover:underline">
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
