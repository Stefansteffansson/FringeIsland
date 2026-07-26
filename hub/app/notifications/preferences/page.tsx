'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotificationPreferencesPanel } from '@/components/notifications/NotificationPreferencesPanel';
import { NudgePolicyPanel } from '@/components/notifications/NudgePolicyPanel';

/**
 * FEAT-H033 — the /notifications/preferences surface (NTF-10), the last unbuilt
 * A-NTF capability.
 *
 * It lives under /notifications rather than behind a new /settings tree because
 * that is where the member already goes to think about notifications (the inbox
 * is its sibling), and inventing an information architecture for a settings shell
 * is a separate decision this feature deliberately does not take.
 *
 * Gated on FIM identity, matching FEAT-H008's /consent surface: a sessionless
 * visitor goes to sign-in preserving the destination; a Mist holds no durable
 * address and therefore no durable preference, so it is sent to the entry — the
 * surface is never mounted for a non-FIM. The substrate agrees independently
 * (`ds5_require_fim_subject()` raises 28000), so this gate is UX, not the control.
 * 'use client' — it reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export default function NotificationPreferencesPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/notifications/preferences');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router]);

  return (
    <AppShell title="Notification preferences">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Notification preferences</h1>
      <p className="mb-8 text-sm text-gray-600">
        Choose which kinds of notification reach you. Changes take effect immediately.
      </p>
      {authLoading || identity !== 'fim' ? (
        <LoadingState label="Loading your preferences..." />
      ) : (
        <>
          <NotificationPreferencesPanel />
          {/* Renders nothing for a non-admin — the operator read returns 403 and
              the panel stays silent rather than showing an error to someone who
              simply isn't an operator. */}
          <NudgePolicyPanel />
        </>
      )}
    </AppShell>
  );
}
