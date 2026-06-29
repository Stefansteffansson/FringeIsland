'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { InlineError } from '@/components/ui/InlineError';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { fetchProfile, displayLabel } from '@/lib/profile/client';
import { useAccountState } from '@/lib/account/AccountStateContext';
import type { Profile } from '@/lib/profile/queries';

/**
 * FEAT-H005 — the /profile surface (IDN-4). Reads the caller's own profile
 * through the paired FEAT-PC003 read contract (API-first, ADR-U009) and edits it
 * through the write contract via ProfileEditForm. Gated on FIM identity: a
 * sessionless visitor is sent to sign-in (preserving the destination); a Mist has
 * no durable profile and is sent to the entry (it leaves via the FEAT-H004
 * farewell, not here). 'use client' — it reads auth state (Hub gotcha: `useAuth`
 * no-ops in a server component).
 */
export default function ProfilePage() {
  const { user, identity, loading: authLoading } = useAuth();
  const { state: accountState } = useAccountState();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/profile');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
      return;
    }

    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchProfile();
        if (active) setProfile(fetched);
      } catch {
        if (active) setError('Failed to load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, identity, authLoading, router]);

  return (
    <AppShell title="Profile">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Your profile</h1>

      {authLoading || loading ? (
        <LoadingState label="Loading your profile..." />
      ) : error ? (
        <InlineError message={error} />
      ) : profile ? (
        <div className="space-y-6">
          {profile.avatar_url && (
            // Avatar is read-only this slice; upload (Supabase Storage) is a
            // forward seam (FEAT-H005 No-gos). A plain <img> suffices for display.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt="Your avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
          )}
          <p className="text-sm text-gray-600">
            You appear to others as <span className="font-semibold">{displayLabel(profile)}</span>
          </p>
          {/* FEAT-H006 STORY-1: a quiet account-state legibility line. Only an
              active FIM reaches /profile (a non-active FIM is intercepted by the
              account-state gate), so this reads "Account: active". */}
          <p className="text-xs text-gray-500" data-testid="account-state-line">
            Account: <span className="font-medium">{accountState?.state ?? 'active'}</span>
          </p>
          <ProfileEditForm initial={profile} onSaved={setProfile} />
        </div>
      ) : null}
    </AppShell>
  );
}
