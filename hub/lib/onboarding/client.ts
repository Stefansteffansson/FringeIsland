/**
 * FEAT-H023 — the onboarding status client (browser half): session cache +
 * overview-bundle adoption.
 *
 * Data-boot per ADR-U042/U043: for a FIM the arrival read RIDES the sign-in
 * overview bundle (adoption — zero extra round-trips on the B1 landing); for
 * a Mist no bundle fires, so `fetchOnboardingStatus()` takes the standalone
 * `/api/me/onboarding` contract — one small post-paint read. Cache semantics
 * are the groups/journeys pattern: peek paints instantly, fetch always
 * revalidates with one shared in-flight, a FAILED read is never cached, and
 * AuthContext drops everything at session end via `invalidateOnboardingCache`.
 * `markOnboardingArrived()` flips the cached fact at the auto-enrol moment so
 * this session never re-launches without a refetch.
 */
import { OverviewTransportError } from '@/lib/me/overview-shared';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';
import type { OnboardingStatus } from '@/lib/onboarding/queries';

export type { OnboardingStatus };

let cachedStatus: OnboardingStatus | null = null;
let statusInFlight: Promise<OnboardingStatus> | null = null;
let adoptedStatus: Promise<OnboardingStatus> | null = null;

async function requestStatus(): Promise<OnboardingStatus> {
  const res = await fetch('/api/me/onboarding');
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  const data = (await res.json()) as { onboarding: OnboardingStatus };
  return data.onboarding;
}

/** The last resolved status this session — instant decisions on revisit. */
export function peekOnboardingStatus(): OnboardingStatus | null {
  return cachedStatus;
}

function trackStatusRead(read: Promise<OnboardingStatus>): Promise<OnboardingStatus> {
  const inFlight: Promise<OnboardingStatus> = read
    .then((status) => {
      cachedStatus = status;
      return status;
    })
    .finally(() => {
      if (statusInFlight === inFlight) statusInFlight = null;
    });
  inFlight.catch(() => {}); // an adopted read may go unconsumed; never unhandled
  statusInFlight = inFlight;
  return inFlight;
}

/** The arrival read: adopted bundle slice consume-once, else the standalone
 *  contract; always revalidates on later calls; failures never stick. */
export function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  if (adoptedStatus) {
    const adopted = adoptedStatus;
    adoptedStatus = null;
    return adopted;
  }
  return statusInFlight ?? trackStatusRead(requestStatus());
}

/** ADR-U042: adopt the bootstrap bundle's onboarding slice; a bundle
 *  TRANSPORT failure falls back to the standalone read (droppable transport). */
export function adoptOnboardingRead(read: Promise<OnboardingStatus>): void {
  adoptedStatus = trackStatusRead(
    read.catch((err) => {
      if (err instanceof OverviewTransportError) return requestStatus();
      throw err;
    }),
  );
}

/** The arrival just recorded itself (auto-enrol at launch) — reflect the fact
 *  locally so this session never re-launches; no refetch needed. */
export function markOnboardingArrived(): void {
  if (cachedStatus) cachedStatus = { ...cachedStatus, has_enrollment: true };
}

/** Drop the session onboarding cache + adopted slice (sign-out / session end). */
export function invalidateOnboardingCache(): void {
  cachedStatus = null;
  statusInFlight = null;
  adoptedStatus = null;
}
// COR-A W9 (AC-5): session-end drop via the auth-owned registry — auth never
// imports this module. Semantics in `lib/auth/cache-registry.ts`.
registerCacheInvalidator(invalidateOnboardingCache);
