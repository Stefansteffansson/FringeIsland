'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { prefetchOverview } from '@/lib/me/overview-client';

// The post-login flow's surfaces: the landing page, sign-in (auth-ready
// arrives here, before the redirect), and the groups home the redirect lands
// on. A FIM deep-linking elsewhere keeps today's per-resource reads — the
// bundle never over-fetches for a surface that doesn't render it (privacy §7).
const BOOT_PATHS = /^\/(?:$|login(?:\/|$)|groups(?:\/|$))/;

/**
 * ADR-U042 guardrail 6 — the bootstrap trigger.
 *
 * Mounted FIRST inside AuthProvider: React runs same-commit effects in
 * traversal order, so this effect arms the overview adoption before
 * AccountMenu / AccountStateProvider fire their own reads in the same commit.
 * The once-per-session latch lives in `prefetchOverview` itself.
 */
export function OverviewBoot() {
  const { identity, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || identity !== 'fim') return;
    if (!BOOT_PATHS.test(pathname ?? '')) return;
    prefetchOverview();
  }, [identity, loading, pathname]);

  return null;
}
