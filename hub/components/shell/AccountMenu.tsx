'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchProfile, displayLabel } from '@/lib/profile/client';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H005 — the shell account menu (IDN-4 entry + the IDN-3 sign-out tail).
 * A **FIM-only** affordance: a Mist has no durable profile and leaves via the
 * FEAT-H004 farewell, not sign-out (gate on identity status, never a role
 * string). The menu offers **Profile** (the /profile surface) and **Sign out**
 * (the existing `AuthContext.signOut()`, returning the member to the sessionless
 * entry). The label is sourced from the FEAT-PC003 read contract (API-first) and
 * refreshes on `refreshNavigation` so a display-name edit shows here at once.
 * 'use client' — it reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export function AccountMenu() {
  const { user, identity, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (identity !== 'fim') return;

    let active = true;
    const load = async () => {
      try {
        const profile = await fetchProfile();
        if (active) setLabel(displayLabel(profile));
      } catch {
        // The label is best-effort shell chrome; fall back to email/'Account'.
      }
    };
    load();

    // STORY-2 coupling: a profile edit fires refreshNavigation; refresh the label.
    const onRefresh = () => load();
    window.addEventListener('refreshNavigation', onRefresh);
    return () => {
      active = false;
      window.removeEventListener('refreshNavigation', onRefresh);
    };
  }, [identity]);

  if (identity !== 'fim') return null;

  const shown = label ?? user?.email ?? 'Account';

  async function handleSignOut() {
    setOpen(false);
    // Navigate to the sessionless entry FIRST (optimistic — usually lands before
    // the guard), end the session, then replace('/') to GUARANTEE the entry even
    // if a protected-surface guard raced us to `/login?redirect=...` during the
    // auth flip. The account-state provider (FEAT-H006) re-renders the subtree on
    // that flip, which can tip the race; the final replace makes the landing
    // deterministic (STORY-4 AC1: return to `/`).
    router.push('/');
    await signOut();
    emitTelemetry('session.ended', { actor: user?.id, outcome: 'success' });
    router.replace('/');
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700"
        >
          {shown.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{shown}</span>
        <span aria-hidden="true" className="text-gray-400">
          ▼
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-xl">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              Profile
            </Link>
            <Link
              href="/consent"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              Privacy &amp; consent
            </Link>
            <Link
              href="/export"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              Download my data
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
