'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchOnboardingStatus, markOnboardingArrived } from '@/lib/onboarding/client';
import { enrollSelf } from '@/lib/journeys/client';
import { emitTelemetry } from '@/lib/observability/telemetry';

// The landings where an arrival may auto-launch: the entry, sign-in
// (auth-ready arrives here before the redirect), the groups HOME the redirect
// lands on (exactly — never group detail pages, the PR #166 boot-scope
// lesson), and the Mist landing. A deep-linked traveller is never yanked out
// of their destination — an arrival is a landing, not a page view.
const ARRIVAL_PATHS = /^\/(?:$|login\/?$|groups\/?$|mist\/?$)/;

// Once per session: the enrolment itself flips has_enrollment for every later
// visit; this latch only guards the current session's auth-event churn.
let launchAttempted = false;

/** Test-only: re-arm the session latch. */
export function resetOnboardingArrivalLatch(): void {
  launchAttempted = false;
}

/**
 * FEAT-H023 STORY-1/2 — the uniform first-arrival auto-launch (JRN-15).
 *
 * Mounted in the shell right after OverviewBoot: for a FIM the status read
 * consumes the overview bundle's onboarding slice (zero extra round-trips,
 * B1); for a Mist it takes the standalone contract. The decision is one fact:
 * `has_enrollment === false` IS the first arrival (ADR-U045 Amendment 1 —
 * no first-sign-in state, no opt-out store). First arrival → enrol AT the
 * launch moment (a glance at the welcome still records "arrived once") and
 * route into the ordinary player at the welcome — post-paint by construction
 * (effects run after commit), so onboarding never delays the landing.
 * A failed arrival never breaks the landing: telemetry, no navigation, the
 * latch re-arms so a later landing may retry.
 */
export function OnboardingArrival() {
  const { identity, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (identity !== 'fim' && identity !== 'mist') return; // never an actorless call
    if (!ARRIVAL_PATHS.test(pathname ?? '')) return;
    if (launchAttempted) return;
    launchAttempted = true;

    void (async () => {
      try {
        const status = await fetchOnboardingStatus();
        if (!status.onboarding_journey_id || status.has_enrollment) return;
        const enrollment = (await enrollSelf(status.onboarding_journey_id)) as {
          enrollment_id?: string;
        };
        markOnboardingArrived();
        emitTelemetry('onboarding.arrived', { journey: status.onboarding_journey_id });
        const q = enrollment.enrollment_id ? `?enrollment=${enrollment.enrollment_id}` : '';
        router.push(`/journeys/${status.onboarding_journey_id}/play${q}`);
      } catch (err) {
        emitTelemetry('onboarding.arrival_failed', { message: (err as Error).message });
        launchAttempted = false; // a later landing may retry
      }
    })();
  }, [identity, loading, pathname, router]);

  return null;
}
