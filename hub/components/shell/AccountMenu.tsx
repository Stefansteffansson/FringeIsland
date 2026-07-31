'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchProfile, displayLabel } from '@/lib/profile/client';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { Menu } from '@/components/ui/Menu';

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
  const [label, setLabel] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // FEAT-H034 STORY-1 — the gated admin entry. Permission-DERIVED: the
  // platform's own refusal on the admin read decides (never a role string);
  // probed lazily once per browser session and cached, so the shell costs
  // every member at most one extra request per session.
  useEffect(() => {
    if (identity !== 'fim') return;
    try {
      const cached = window.sessionStorage.getItem('hub.adminEntry');
      if (cached !== null) {
        setIsAdmin(cached === 'yes');
        return;
      }
      let active = true;
      fetch('/api/admin/statistics')
        .then((res) => {
          if (!active) return;
          const yes = res.ok;
          window.sessionStorage.setItem('hub.adminEntry', yes ? 'yes' : 'no');
          setIsAdmin(yes);
        })
        .catch(() => {
          // Best-effort shell chrome: an unreachable probe means no entry.
        });
      return () => {
        active = false;
      };
    } catch {
      // sessionStorage unavailable — fall through with no entry.
    }
  }, [identity]);

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

  // COR-C W5 (AC3-17): the dropdown is the shared Menu primitive — real
  // role="menu"/menuitem semantics, roving tabindex, Escape + focus return —
  // replacing the hand-rolled popup that promised a menu (aria-haspopup) and
  // never rendered one.
  return (
    <Menu
      buttonAriaLabel="Account menu"
      menuLabel="Account menu"
      buttonContent={
        <>
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
        </>
      }
      items={[
        { key: 'journeys', label: 'Journeys', href: '/journeys' },
        { key: 'groups', label: 'My groups', href: '/groups' },
        { key: 'messages', label: 'Messages', href: '/messages' },
        { key: 'profile', label: 'Profile', href: '/profile' },
        { key: 'journal', label: 'Journal', href: '/journal' },
        { key: 'sessions', label: 'Sessions', href: '/sessions' },
        { key: 'consent', label: 'Privacy & consent', href: '/consent' },
        { key: 'export', label: 'Download my data', href: '/export' },
        ...(isAdmin ? [{ key: 'admin', label: 'Platform admin', href: '/admin' }] : []),
        {
          key: 'sign-out',
          label: 'Sign out',
          onSelect: handleSignOut,
          className: 'text-danger hover:bg-danger-soft focus:bg-danger-soft',
        },
      ]}
    />
  );
}
