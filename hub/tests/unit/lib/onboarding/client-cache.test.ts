import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H023 (unit) — the onboarding status client: session cache + overview-
 * bundle adoption (ADR-U042/U043 B1/B4).
 *
 * The arrival read rides the sign-in overview bundle for a FIM (adoption —
 * zero extra round-trips) and the standalone `/api/me/onboarding` for a Mist
 * (no bundle fires for a Mist; one small post-paint read). Semantics under
 * test: peek/instant-paint, one shared in-flight, failure never cached,
 * consume-once adoption, transport fallback, `markOnboardingArrived` flips
 * the cached fact at the auto-enrol moment (no refetch), invalidation.
 *
 * Red-first: fails until `lib/onboarding/client.ts` lands.
 */
import { OverviewTransportError } from '@/lib/me/overview-shared';
import {
  fetchOnboardingStatus,
  peekOnboardingStatus,
  adoptOnboardingRead,
  markOnboardingArrived,
  invalidateOnboardingCache,
  type OnboardingStatus,
} from '@/lib/onboarding/client';

const STATUS: OnboardingStatus = {
  onboarding_journey_id: 'jz-1',
  has_enrollment: false,
  has_completed: false,
};

const fetchMock = jest.fn<() => Promise<unknown>>();
global.fetch = fetchMock as unknown as typeof fetch;

const ok = (onboarding: unknown) => ({ ok: true, json: async () => ({ onboarding }) });
const fail = () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(ok(STATUS));
  invalidateOnboardingCache();
});

describe('FEAT-H023 — onboarding client (cache + adoption)', () => {
  it('shares one request across concurrent callers; peek paints after resolve', async () => {
    expect(peekOnboardingStatus()).toBeNull();
    const [a, b] = await Promise.all([fetchOnboardingStatus(), fetchOnboardingStatus()]);
    expect(a).toEqual(STATUS);
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(peekOnboardingStatus()).toEqual(STATUS);
  });

  it('a failed read is never cached — the next caller retries', async () => {
    fetchMock.mockResolvedValueOnce(fail());
    await expect(fetchOnboardingStatus()).rejects.toThrow();
    expect(peekOnboardingStatus()).toBeNull();
    await expect(fetchOnboardingStatus()).resolves.toEqual(STATUS);
  });

  it('adopts the bundle slice consume-once — zero standalone fetches, then revalidates', async () => {
    adoptOnboardingRead(Promise.resolve(STATUS));
    await expect(fetchOnboardingStatus()).resolves.toEqual(STATUS);
    expect(fetchMock).toHaveBeenCalledTimes(0); // the bundle read WAS the read
    await fetchOnboardingStatus();
    expect(fetchMock).toHaveBeenCalledTimes(1); // later reads revalidate standalone
  });

  it('a bundle TRANSPORT failure falls back to the standalone read (droppable transport)', async () => {
    adoptOnboardingRead(Promise.reject(new OverviewTransportError('bundle down')));
    await expect(fetchOnboardingStatus()).resolves.toEqual(STATUS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a slice ERROR rejects the consumer exactly as the standalone read would', async () => {
    adoptOnboardingRead(Promise.reject(new Error('Failed to load onboarding')));
    await expect(fetchOnboardingStatus()).rejects.toThrow('Failed to load onboarding');
    expect(peekOnboardingStatus()).toBeNull();
  });

  it('markOnboardingArrived flips the cached fact — no refetch, no re-launch this session', async () => {
    await fetchOnboardingStatus();
    markOnboardingArrived();
    expect(peekOnboardingStatus()!.has_enrollment).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('invalidateOnboardingCache drops peek and any adopted read (session end)', async () => {
    adoptOnboardingRead(Promise.resolve(STATUS));
    await fetchOnboardingStatus();
    expect(peekOnboardingStatus()).not.toBeNull();
    invalidateOnboardingCache();
    expect(peekOnboardingStatus()).toBeNull();
    await fetchOnboardingStatus(); // adopted slot dropped too — standalone fires
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
