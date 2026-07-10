import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * ADR-U042 (unit) — the overview client: one bundle fetch adopted by the
 * per-resource clients.
 *
 * `prefetchOverview()` fires GET /api/me/overview once per session (module
 * latch) and hands each slice to its resource client's in-flight slot — the
 * consumers (`fetchProfile`, `fetchAccountState`, `fetchMyGroups`,
 * `fetchMyInvitations`, `fetchMyNominations`) then resolve from the bundle
 * with ZERO additional network. Semantics under test:
 *   - adoption: five consumers, one network request total;
 *   - consume-once for the list reads (a second call revalidates via network —
 *     freshness semantics unchanged, mutation flows stay fresh);
 *   - a slice `{ error }` rejects its consumer (the section's own error
 *     affordance renders; the paint proceeds — ADR-U042 guardrail 2);
 *   - a bundle TRANSPORT failure falls every consumer back to its standalone
 *     read (the bundle is droppable transport — guardrail 3);
 *   - `invalidateOverview()` re-arms the latch (session end).
 *
 * Red-first: fails until `lib/me/overview-client.ts` and the adoption seams land.
 */
import { prefetchOverview, invalidateOverview } from '@/lib/me/overview-client';
import {
  fetchMyGroups,
  fetchMyInvitations,
  fetchMyNominations,
  peekMyGroups,
  invalidateGroupsCache,
} from '@/lib/groups/client';
import { fetchProfile, invalidateProfileCache } from '@/lib/profile/client';
import { fetchAccountState, invalidateAccountStateAdoption } from '@/lib/account/client';
// Labelled adaptation (FEAT-H023, Cycle J-E): the bundle gains an `onboarding`
// slice — the arrival read rides the sign-in landing with no extra round-trip.
import { fetchOnboardingStatus, invalidateOnboardingCache } from '@/lib/onboarding/client';

const PROFILE = { full_name: 'Ada Lovelace', nickname: 'Ada', display_preference: 'nickname' };
const STATE = { state: 'active' };
const GROUPS = [{ id: 'g1', name: 'Dev Test Cohort', is_public: false, member_count: 1 }];
const INVITATIONS = [{ group_id: 'g2', group_name: 'Nya gruppen' }];
const NOMINATIONS = [{ notification_id: 'n1', group_name: 'Dev Test Cohort' }];
const ONBOARDING = { onboarding_journey_id: 'jz-1', has_enrollment: true, has_completed: false };

const OVERVIEW_OK = {
  profile: { data: PROFILE },
  account_state: { data: STATE },
  groups: { data: GROUPS },
  invitations: { data: INVITATIONS },
  nominations: { data: NOMINATIONS },
  onboarding: { data: ONBOARDING },
};

const fetchMock = jest.fn<(url: string) => Promise<unknown>>();
global.fetch = fetchMock as unknown as typeof fetch;

const ok = (body: unknown) => ({ ok: true, json: async () => body });

/** Route standalone reads by URL so fallback paths are distinguishable. */
function routeStandalone(url: string) {
  if (url === '/api/me/onboarding') return ok({ onboarding: ONBOARDING });
  if (url === '/api/groups') return ok({ groups: GROUPS });
  if (url === '/api/me/invitations') return ok(INVITATIONS);
  if (url === '/api/me/nominations') return ok(NOMINATIONS);
  if (url === '/api/account/state') return ok({ state: STATE });
  if (url === '/api/profile/me') return ok({ profile: PROFILE });
  throw new Error(`Unexpected fetch: ${url}`);
}

const overviewCalls = () =>
  fetchMock.mock.calls.filter(([u]) => u === '/api/me/overview').length;

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async (url: string) => {
    if (url === '/api/me/overview') return ok(OVERVIEW_OK);
    return routeStandalone(url);
  });
  invalidateOverview();
  invalidateGroupsCache();
  invalidateProfileCache();
  invalidateAccountStateAdoption();
  invalidateOnboardingCache();
});

describe('ADR-U042 (unit) — overview adoption', () => {
  it('six consumers resolve from ONE network request', async () => {
    // Labelled adaptation (FEAT-H023): was five — the onboarding arrival read
    // joined the bundle at Cycle J-E (B1: no extra round-trip on the landing).
    prefetchOverview();
    await expect(fetchProfile()).resolves.toMatchObject({ nickname: 'Ada' });
    await expect(fetchAccountState()).resolves.toEqual(STATE);
    await expect(fetchMyGroups()).resolves.toEqual(GROUPS);
    await expect(fetchMyInvitations()).resolves.toEqual(INVITATIONS);
    await expect(fetchMyNominations()).resolves.toEqual(NOMINATIONS);
    await expect(fetchOnboardingStatus()).resolves.toEqual(ONBOARDING);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(overviewCalls()).toBe(1);
  });

  it('latches once per session — a second prefetch is a no-op', async () => {
    prefetchOverview();
    prefetchOverview();
    await fetchMyGroups();
    expect(overviewCalls()).toBe(1);
  });

  it('seeds the groups session cache (instant paint after adoption)', async () => {
    prefetchOverview();
    await fetchMyGroups();
    expect(peekMyGroups()).toEqual(GROUPS);
  });

  it('list reads are consume-once — the next call revalidates via network', async () => {
    prefetchOverview();
    await fetchMyInvitations();
    await fetchMyInvitations();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/invitations');
    expect(overviewCalls()).toBe(1);
  });

  it('a slice error rejects its consumer; sibling slices still resolve (guardrail 2)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/me/overview')
        return ok({ ...OVERVIEW_OK, groups: { error: 'Failed to load groups' } });
      return routeStandalone(url);
    });
    prefetchOverview();
    await expect(fetchMyGroups()).rejects.toThrow('Failed to load groups');
    await expect(fetchMyInvitations()).resolves.toEqual(INVITATIONS);
    expect(overviewCalls()).toBe(1);
  });

  it('a bundle transport failure falls every consumer back to its standalone read (guardrail 3)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/me/overview') return { ok: false, status: 500, json: async () => ({}) };
      return routeStandalone(url);
    });
    prefetchOverview();
    await expect(fetchMyGroups()).resolves.toEqual(GROUPS);
    await expect(fetchMyInvitations()).resolves.toEqual(INVITATIONS);
    await expect(fetchProfile()).resolves.toMatchObject({ nickname: 'Ada' });
    await expect(fetchAccountState()).resolves.toEqual(STATE);
    await expect(fetchOnboardingStatus()).resolves.toEqual(ONBOARDING);
    expect(fetchMock).toHaveBeenCalledWith('/api/groups');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/invitations');
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/me');
    expect(fetchMock).toHaveBeenCalledWith('/api/account/state');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/onboarding');
  });

  it('invalidateOverview re-arms the latch (session end / next sign-in)', async () => {
    prefetchOverview();
    await fetchMyGroups();
    invalidateOverview();
    invalidateGroupsCache();
    prefetchOverview();
    await fetchMyGroups();
    expect(overviewCalls()).toBe(2);
  });
});
