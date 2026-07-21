'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * FEAT-H029 — the farewell (IDN-10, STORY-3). Shown once after a confirmed
 * self-deletion. The platform has already ended every session; this page's
 * only job is to clear the browser's local auth state (local scope — no
 * server round-trip against already-dead sessions, no error-toast fallout)
 * and say goodbye plainly. Public: it renders identically with or without
 * stale local state, and never flashes authenticated chrome.
 */
export default function FarewellPage() {
  useEffect(() => {
    const supabase = createClient();
    // Local scope: the server-side sessions are gone (the delete contract
    // removed them); this only drops the stale cookies/storage.
    void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div
        data-testid="farewell-surface"
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Your account has been deleted</h1>
        <p className="mt-3 text-sm text-gray-600">
          It&rsquo;s done, as you asked — your private record is erased, and what you gave to
          others stays with them. Thank you for travelling with us. FringeIsland will be here if
          you ever want to begin again.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            To the shore
          </Link>
        </div>
      </div>
    </div>
  );
}
